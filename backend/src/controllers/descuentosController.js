const prisma = require('../lib/prisma')

// El vendedor puede pedir: un monto de descuento (UF, pesos o %) o un precio
// final (UF o pesos). Los pesos se convierten con la UF vigente al momento de
// aprobar; el precio final se compara contra el total actual de la cotización.
const TIPOS_SOLICITUD = ['UF', 'PESOS', 'PORCENTAJE', 'TOTAL_UF', 'TOTAL_PESOS']

const INCLUDE_SOLICITUD = {
  cotizacion: {
    select: {
      id: true, estado: true, descuentoAprobadoUF: true,
      lead: { select: { id: true, contacto: { select: { nombre: true, apellido: true } } } },
      items: {
        select: {
          precioListaUF: true,
          unidad: {
            select: {
              numero: true, tipo: true,
              edificio: { select: { nombre: true } }
            }
          }
        }
      },
      packs:       { select: { descuentoAplicadoUF: true } },
      promociones: { select: { descuentoAplicadoUF: true } },
    }
  },
  solicitadoPor: { select: { id: true, nombre: true, apellido: true, rol: true } },
  revisadoPor:   { select: { id: true, nombre: true, apellido: true } },
}

const INCLUDE_COTIZACION_CALC = { items: true, packs: true, promociones: true }

async function ufVigente() {
  const row = await prisma.uFDiaria.findFirst({ orderBy: { fecha: 'desc' } })
  return row ? Number(row.valorPesos) : null
}

// Totales de la cotización: base (suma de lista) y total actual
// (descontando packs, promociones y descuentos ya aprobados)
function totalesCotizacion(cot) {
  const base = cot.items.reduce((s, i) => s + Number(i.precioListaUF), 0)
  const packs = (cot.packs || []).reduce((s, p) => s + Number(p.descuentoAplicadoUF || 0), 0)
  const promos = (cot.promociones || []).reduce((s, p) => s + Number(p.descuentoAplicadoUF || 0), 0)
  const totalActual = Math.max(base - packs - promos - Number(cot.descuentoAprobadoUF || 0), 0)
  return { base, totalActual }
}

// Convierte una solicitud (tipo + valor) al descuento en UF que corresponde.
// Lanza { status, mensaje } si la solicitud no procede.
async function calcularDescuentoUF(tipo, valor, cot) {
  const { base, totalActual } = totalesCotizacion(cot)
  const v = Number(valor)
  if (!(v > 0)) throw { status: 400, mensaje: 'El valor debe ser mayor que 0.' }

  if (tipo === 'UF') return +v.toFixed(2)
  if (tipo === 'PORCENTAJE') return +(base * v / 100).toFixed(2)

  const uf = await ufVigente()
  if (!uf) throw { status: 500, mensaje: 'No hay valor UF del día para convertir pesos.' }

  if (tipo === 'PESOS') return +(v / uf).toFixed(2)

  // TOTAL_UF / TOTAL_PESOS: el valor es el precio final deseado
  const totalPedidoUF = tipo === 'TOTAL_UF' ? v : v / uf
  const descuento = +(totalActual - totalPedidoUF).toFixed(2)
  if (descuento <= 0) {
    throw {
      status: 400,
      mensaje: `El precio final pedido (${totalPedidoUF.toFixed(2)} UF) no es menor que el total actual de la cotización (${totalActual.toFixed(2)} UF).`
    }
  }
  return descuento
}

const fmtSolicitud = (tipo, valor) => ({
  UF: `${valor} UF de descuento`,
  PESOS: `$${Number(valor).toLocaleString('es-CL')} de descuento`,
  PORCENTAJE: `${valor}% de descuento`,
  TOTAL_UF: `precio final ${valor} UF`,
  TOTAL_PESOS: `precio final $${Number(valor).toLocaleString('es-CL')}`,
}[tipo] || `${valor}`)

// GET /api/descuentos
// Gerente: ve todas las pendientes (o con filtro)
// Otros: solo las propias
const listar = async (req, res) => {
  const { estado } = req.query
  const esGerente = req.usuario.rol === 'GERENTE'
  try {
    const solicitudes = await prisma.solicitudDescuento.findMany({
      where: {
        ...(!esGerente && { solicitadoPorId: req.usuario.id }),
        ...(estado && { estado }),
      },
      include: INCLUDE_SOLICITUD,
      orderBy: { creadoEn: 'desc' },
    })
    res.json(solicitudes)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al obtener solicitudes.' })
  }
}

// GET /api/descuentos/cotizacion/:cotizacionId
const porCotizacion = async (req, res) => {
  try {
    const solicitudes = await prisma.solicitudDescuento.findMany({
      where: { cotizacionId: Number(req.params.cotizacionId) },
      include: INCLUDE_SOLICITUD,
      orderBy: { creadoEn: 'desc' },
    })
    res.json(solicitudes)
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener solicitudes.' })
  }
}

// POST /api/descuentos
const crear = async (req, res) => {
  if (req.usuario.rol === 'GERENTE')
    return res.status(403).json({ error: 'El gerente no necesita solicitar descuentos.' })

  const { cotizacionId, tipo, valor, motivo } = req.body
  if (!cotizacionId || !tipo || valor == null || !motivo)
    return res.status(400).json({ error: 'cotizacionId, tipo, valor y motivo son requeridos.' })
  if (!TIPOS_SOLICITUD.includes(tipo))
    return res.status(400).json({ error: `tipo debe ser uno de: ${TIPOS_SOLICITUD.join(', ')}.` })

  try {
    // Solo puede haber una solicitud PENDIENTE por cotización
    const pendiente = await prisma.solicitudDescuento.findFirst({
      where: { cotizacionId: Number(cotizacionId), estado: 'PENDIENTE' }
    })
    if (pendiente)
      return res.status(400).json({ error: 'Ya existe una solicitud pendiente para esta cotización.' })

    // Validar de inmediato que la solicitud tenga sentido (ej: precio final < total actual)
    const cotizacion = await prisma.cotizacion.findUnique({
      where: { id: Number(cotizacionId) },
      include: INCLUDE_COTIZACION_CALC,
    })
    if (!cotizacion) return res.status(404).json({ error: 'Cotización no encontrada.' })
    try {
      await calcularDescuentoUF(tipo, valor, cotizacion)
    } catch (e) {
      if (e.status) return res.status(e.status).json({ error: e.mensaje })
      throw e
    }

    const solicitud = await prisma.solicitudDescuento.create({
      data: {
        cotizacionId: Number(cotizacionId),
        solicitadoPorId: req.usuario.id,
        tipo,
        valor: Number(valor),
        motivo,
      },
      include: INCLUDE_SOLICITUD,
    })
    res.status(201).json(solicitud)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al crear solicitud.' })
  }
}

// PUT /api/descuentos/:id/revisar
// Solo gerente
const revisar = async (req, res) => {
  if (req.usuario.rol !== 'GERENTE')
    return res.status(403).json({ error: 'Solo el gerente puede aprobar o rechazar solicitudes.' })

  const { decision, comentario } = req.body // decision: 'APROBADA' | 'RECHAZADA'
  if (!['APROBADA', 'RECHAZADA'].includes(decision))
    return res.status(400).json({ error: 'decision debe ser APROBADA o RECHAZADA.' })

  try {
    const solicitud = await prisma.solicitudDescuento.findUnique({
      where: { id: Number(req.params.id) },
      include: { cotizacion: { include: INCLUDE_COTIZACION_CALC } }
    })
    if (!solicitud) return res.status(404).json({ error: 'Solicitud no encontrada.' })
    if (solicitud.estado !== 'PENDIENTE')
      return res.status(400).json({ error: 'La solicitud ya fue revisada.' })

    // Si se aprueba, calcular (con la UF vigente hoy) y aplicar a la cotización
    let descuentoAplicadoUF = null
    if (decision === 'APROBADA') {
      try {
        descuentoAplicadoUF = await calcularDescuentoUF(solicitud.tipo, solicitud.valor, solicitud.cotizacion)
      } catch (e) {
        if (e.status) return res.status(e.status).json({ error: e.mensaje })
        throw e
      }

      await prisma.cotizacion.update({
        where: { id: solicitud.cotizacionId },
        data: { descuentoAprobadoUF: Number(solicitud.cotizacion.descuentoAprobadoUF || 0) + descuentoAplicadoUF },
      })
    }

    const actualizada = await prisma.solicitudDescuento.update({
      where: { id: Number(req.params.id) },
      data: {
        estado: decision,
        comentario: comentario || null,
        descuentoAplicadoUF,
        revisadoPorId: req.usuario.id,
        revisadoEn: new Date(),
      },
      include: INCLUDE_SOLICITUD,
    })

    res.json({ solicitud: actualizada, descuentoAplicadoUF })

    // Notificar al vendedor que solicitó el descuento
    await prisma.notificacion.create({
      data: {
        usuarioId: solicitud.solicitadoPorId,
        tipo: 'DESCUENTO_RESUELTO',
        mensaje: decision === 'APROBADA'
          ? `Aprobado: ${fmtSolicitud(solicitud.tipo, solicitud.valor)} → ${descuentoAplicadoUF} UF de descuento — cotización #${solicitud.cotizacionId}`
          : `Descuento rechazado — cotización #${solicitud.cotizacionId}${comentario ? `: ${comentario}` : ''}`,
        referenciaId: solicitud.cotizacionId,
        referenciaTipo: 'cotizacion'
      }
    }).catch(() => {})
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al revisar solicitud.' })
  }
}

// PUT /api/descuentos/cotizacion/:cotizacionId/directo
// Solo gerente — aplica descuento directo, crea solicitud auto-aprobada y suma al descuento existente
const aplicarDirecto = async (req, res) => {
  if (req.usuario.rol !== 'GERENTE')
    return res.status(403).json({ error: 'Solo el gerente puede aplicar descuentos directos.' })

  const { tipo, valor, motivo } = req.body
  if (!TIPOS_SOLICITUD.includes(tipo) || valor == null)
    return res.status(400).json({ error: `tipo (${TIPOS_SOLICITUD.join('|')}) y valor son requeridos.` })

  try {
    const cotizacion = await prisma.cotizacion.findUnique({
      where: { id: Number(req.params.cotizacionId) },
      include: INCLUDE_COTIZACION_CALC
    })
    if (!cotizacion) return res.status(404).json({ error: 'Cotización no encontrada.' })

    let descuentoUF
    try {
      descuentoUF = await calcularDescuentoUF(tipo, valor, cotizacion)
    } catch (e) {
      if (e.status) return res.status(e.status).json({ error: e.mensaje })
      throw e
    }

    // Crear solicitud auto-aprobada para tener historial
    const solicitud = await prisma.solicitudDescuento.create({
      data: {
        cotizacionId: cotizacion.id,
        solicitadoPorId: req.usuario.id,
        revisadoPorId: req.usuario.id,
        tipo,
        valor: Number(valor),
        descuentoAplicadoUF: descuentoUF,
        motivo: motivo || 'Descuento directo aplicado por gerente',
        estado: 'APROBADA',
        revisadoEn: new Date(),
      },
      include: INCLUDE_SOLICITUD,
    })

    // Sumar al descuento existente (no reemplazar)
    const actualizada = await prisma.cotizacion.update({
      where: { id: cotizacion.id },
      data: { descuentoAprobadoUF: Number(cotizacion.descuentoAprobadoUF || 0) + descuentoUF },
    })

    res.json({ solicitud, descuentoAprobadoUF: actualizada.descuentoAprobadoUF })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al aplicar descuento.' })
  }
}

module.exports = { listar, porCotizacion, crear, revisar, aplicarDirecto }
