const prisma = require('../lib/prisma')

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
    }
  },
  solicitadoPor: { select: { id: true, nombre: true, apellido: true, rol: true } },
  revisadoPor:   { select: { id: true, nombre: true, apellido: true } },
}

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
  if (!['UF', 'PORCENTAJE'].includes(tipo))
    return res.status(400).json({ error: 'tipo debe ser UF o PORCENTAJE.' })

  try {
    // Solo puede haber una solicitud PENDIENTE por cotización
    const pendiente = await prisma.solicitudDescuento.findFirst({
      where: { cotizacionId: Number(cotizacionId), estado: 'PENDIENTE' }
    })
    if (pendiente)
      return res.status(400).json({ error: 'Ya existe una solicitud pendiente para esta cotización.' })

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
      include: { cotizacion: { include: { items: true } } }
    })
    if (!solicitud) return res.status(404).json({ error: 'Solicitud no encontrada.' })
    if (solicitud.estado !== 'PENDIENTE')
      return res.status(400).json({ error: 'La solicitud ya fue revisada.' })

    // Si se aprueba, calcular y aplicar el descuento a la cotización
    let descuentoAplicadoUF = null
    if (decision === 'APROBADA') {
      if (solicitud.tipo === 'UF') {
        descuentoAplicadoUF = solicitud.valor
      } else {
        // Porcentaje → calcular sobre la suma de precios de lista
        const base = solicitud.cotizacion.items.reduce((s, i) => s + i.precioListaUF, 0)
        descuentoAplicadoUF = +(base * (solicitud.valor / 100)).toFixed(2)
      }

      await prisma.cotizacion.update({
        where: { id: solicitud.cotizacionId },
        data: { descuentoAprobadoUF: (solicitud.cotizacion.descuentoAprobadoUF || 0) + descuentoAplicadoUF },
      })
    }

    const actualizada = await prisma.solicitudDescuento.update({
      where: { id: Number(req.params.id) },
      data: {
        estado: decision,
        comentario: comentario || null,
        revisadoPorId: req.usuario.id,
        revisadoEn: new Date(),
      },
      include: INCLUDE_SOLICITUD,
    })

    res.json({ solicitud: actualizada, descuentoAplicadoUF })
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
  if (!['UF', 'PORCENTAJE'].includes(tipo) || valor == null)
    return res.status(400).json({ error: 'tipo (UF|PORCENTAJE) y valor son requeridos.' })

  try {
    const cotizacion = await prisma.cotizacion.findUnique({
      where: { id: Number(req.params.cotizacionId) },
      include: { items: true }
    })
    if (!cotizacion) return res.status(404).json({ error: 'Cotización no encontrada.' })

    let descuentoUF
    if (tipo === 'UF') {
      descuentoUF = Number(valor)
    } else {
      const base = cotizacion.items.reduce((s, i) => s + i.precioListaUF, 0)
      descuentoUF = +(base * (Number(valor) / 100)).toFixed(2)
    }

    // Crear solicitud auto-aprobada para tener historial
    const solicitud = await prisma.solicitudDescuento.create({
      data: {
        cotizacionId: cotizacion.id,
        solicitadoPorId: req.usuario.id,
        revisadoPorId: req.usuario.id,
        tipo,
        valor: Number(valor),
        motivo: motivo || 'Descuento directo aplicado por gerente',
        estado: 'APROBADA',
        revisadoEn: new Date(),
      },
      include: INCLUDE_SOLICITUD,
    })

    // Sumar al descuento existente (no reemplazar)
    const actualizada = await prisma.cotizacion.update({
      where: { id: cotizacion.id },
      data: { descuentoAprobadoUF: (cotizacion.descuentoAprobadoUF || 0) + descuentoUF },
    })

    res.json({ solicitud, descuentoAprobadoUF: actualizada.descuentoAprobadoUF })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al aplicar descuento.' })
  }
}

module.exports = { listar, porCotizacion, crear, revisar, aplicarDirecto }
