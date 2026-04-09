const prisma = require('../lib/prisma')

const listar = async (req, res) => {
  const { usuarioId, estado, desde, hasta } = req.query
  const esGerenciaOJV = ['GERENTE', 'JEFE_VENTAS'].includes(req.usuario.rol)

  // Solo Gerente y JV ven todas las comisiones
  const filtroUsuario = esGerenciaOJV
    ? (usuarioId ? { usuarioId: Number(usuarioId) } : {})
    : { usuarioId: req.usuario.id }

  try {
    const comisiones = await prisma.comision.findMany({
      where: {
        ...filtroUsuario,
        ...(desde || hasta ? {
          creadoEn: {
            ...(desde && { gte: new Date(desde) }),
            ...(hasta && { lte: new Date(hasta) })
          }
        } : {})
      },
      include: {
        usuario: { select: { nombre: true, apellido: true, rol: true } },
        venta: {
          select: {
            id: true, estado: true, precioUF: true,
            unidades: { select: { numero: true, tipo: true, edificio: { select: { nombre: true } } } },
            comprador: { select: { nombre: true, apellido: true } }
          }
        }
      },
      orderBy: { creadoEn: 'desc' }
    })
    res.json(comisiones)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al obtener comisiones.' })
  }
}

// Calcular montos a partir de precio venta + configuración de comisión
const calcularMontos = (precioVentaUF, porcentaje, montoFijo) => {
  if (porcentaje != null) return (precioVentaUF * porcentaje) / 100
  if (montoFijo != null) return montoFijo
  return 0
}

const crear = async (req, res) => {
  if (!['GERENTE', 'JEFE_VENTAS'].includes(req.usuario.rol)) {
    return res.status(403).json({ error: 'Acceso denegado.' })
  }
  const { ventaId, usuarioId, concepto, porcentaje, montoFijo, montoPrimera, montoSegunda } = req.body

  if (!ventaId || !usuarioId) {
    return res.status(400).json({ error: 'Se requiere ventaId y usuarioId.' })
  }
  if (porcentaje == null && montoFijo == null) {
    return res.status(400).json({ error: 'Debe indicar porcentaje o monto fijo.' })
  }

  try {
    const venta = await prisma.venta.findUnique({
      where: { id: Number(ventaId) },
      select: { precioUF: true, descuentoUF: true, estado: true }
    })
    if (!venta) return res.status(404).json({ error: 'Venta no encontrada.' })
    if (venta.estado === 'ANULADO') return res.status(400).json({ error: 'No se pueden crear comisiones para ventas anuladas.' })

    const precioFinal = venta.precioUF - (venta.descuentoUF || 0)
    const total = calcularMontos(precioFinal, porcentaje != null ? Number(porcentaje) : null, montoFijo != null ? Number(montoFijo) : null)
    const primera = montoPrimera != null ? Number(montoPrimera) : total / 2
    const segunda = montoSegunda != null ? Number(montoSegunda) : total / 2

    const comision = await prisma.comision.create({
      data: {
        ventaId: Number(ventaId),
        usuarioId: Number(usuarioId),
        concepto: concepto || null,
        porcentaje: porcentaje != null ? Number(porcentaje) : null,
        montoFijo: montoFijo != null ? Number(montoFijo) : null,
        montoCalculadoUF: total,
        montoPrimera: primera,
        montoSegunda: segunda,
      },
      include: { usuario: { select: { nombre: true, apellido: true, rol: true } } }
    })
    res.status(201).json(comision)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al crear comisión.' })
  }
}

const editar = async (req, res) => {
  if (!['GERENTE', 'JEFE_VENTAS'].includes(req.usuario.rol)) {
    return res.status(403).json({ error: 'Acceso denegado.' })
  }
  const { id } = req.params
  const { concepto, porcentaje, montoFijo, montoPrimera, montoSegunda } = req.body

  try {
    const comision = await prisma.comision.findUnique({
      where: { id: Number(id) },
      include: { venta: { select: { precioUF: true, descuentoUF: true } } }
    })
    if (!comision) return res.status(404).json({ error: 'Comisión no encontrada.' })

    const precioFinal = comision.venta.precioUF - (comision.venta.descuentoUF || 0)
    const newPct = porcentaje != null ? Number(porcentaje) : null
    const newFijo = montoFijo != null ? Number(montoFijo) : null

    // Recalcular total si cambiaron porcentaje o montoFijo
    const total = (newPct != null || newFijo != null)
      ? calcularMontos(precioFinal, newPct, newFijo)
      : comision.montoCalculadoUF

    // Split: si el usuario no envió valores explícitos, mantener proporcional
    const primera = montoPrimera != null ? Number(montoPrimera) : total / 2
    const segunda = montoSegunda != null ? Number(montoSegunda) : total / 2

    const actualizado = await prisma.comision.update({
      where: { id: Number(id) },
      data: {
        concepto: concepto !== undefined ? (concepto || null) : undefined,
        porcentaje: newPct !== null ? newPct : (newFijo != null ? null : undefined),
        montoFijo: newFijo !== null ? newFijo : (newPct != null ? null : undefined),
        montoCalculadoUF: total,
        montoPrimera: primera,
        montoSegunda: segunda,
      },
      include: { usuario: { select: { nombre: true, apellido: true, rol: true } } }
    })
    res.json(actualizado)
  } catch (err) {
    console.error(err)
    if (err.code === 'P2025') return res.status(404).json({ error: 'Comisión no encontrada.' })
    res.status(500).json({ error: 'Error al editar comisión.' })
  }
}

const eliminar = async (req, res) => {
  if (!['GERENTE', 'JEFE_VENTAS'].includes(req.usuario.rol)) {
    return res.status(403).json({ error: 'Acceso denegado.' })
  }
  const { id } = req.params
  try {
    await prisma.comision.delete({ where: { id: Number(id) } })
    res.json({ ok: true })
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Comisión no encontrada.' })
    res.status(500).json({ error: 'Error al eliminar comisión.' })
  }
}

const marcarPrimeraPagada = async (req, res) => {
  const { id } = req.params
  const { fechaPago } = req.body
  try {
    const comision = await prisma.comision.update({
      where: { id: Number(id) },
      data: {
        estadoPrimera: 'PAGADO',
        fechaPagoPrimera: fechaPago ? new Date(fechaPago) : new Date()
      }
    })
    res.json(comision)
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Comisión no encontrada.' })
    res.status(500).json({ error: 'Error al actualizar comisión.' })
  }
}

const marcarSegundaPagada = async (req, res) => {
  const { id } = req.params
  const { fechaPago } = req.body
  try {
    const comision = await prisma.comision.update({
      where: { id: Number(id) },
      data: {
        estadoSegunda: 'PAGADO',
        fechaPagoSegunda: fechaPago ? new Date(fechaPago) : new Date()
      }
    })
    res.json(comision)
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Comisión no encontrada.' })
    res.status(500).json({ error: 'Error al actualizar comisión.' })
  }
}

// Resumen de comisiones por vendedor (para reportes)
const resumen = async (req, res) => {
  const { desde, hasta } = req.query
  try {
    const comisiones = await prisma.comision.findMany({
      where: {
        ...(desde || hasta ? {
          creadoEn: {
            ...(desde && { gte: new Date(desde) }),
            ...(hasta && { lte: new Date(hasta) })
          }
        } : {})
      },
      include: {
        usuario: { select: { id: true, nombre: true, apellido: true, rol: true } }
      }
    })

    // Agrupar por usuario
    const agrupado = {}
    comisiones.forEach(c => {
      const uid = c.usuarioId
      if (!agrupado[uid]) {
        agrupado[uid] = {
          usuario: c.usuario,
          totalUF: 0,
          pendienteUF: 0,
          pagadoUF: 0,
          cantidad: 0
        }
      }
      agrupado[uid].totalUF += c.montoCalculadoUF
      agrupado[uid].cantidad += 1

      if (c.estadoPrimera === 'PENDIENTE') agrupado[uid].pendienteUF += c.montoPrimera
      else agrupado[uid].pagadoUF += c.montoPrimera

      if (c.estadoSegunda === 'PENDIENTE') agrupado[uid].pendienteUF += c.montoSegunda
      else agrupado[uid].pagadoUF += c.montoSegunda
    })

    res.json(Object.values(agrupado))
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener resumen.' })
  }
}

module.exports = { listar, crear, editar, eliminar, marcarPrimeraPagada, marcarSegundaPagada, resumen }
