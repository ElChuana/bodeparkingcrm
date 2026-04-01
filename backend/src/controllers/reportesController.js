const prisma = require('../lib/prisma')

const leads = async (req, res) => {
  const { vendedorId, desde, hasta } = req.query
  try {
    const data = await prisma.lead.findMany({
      where: {
        ...(vendedorId && { vendedorId: Number(vendedorId) }),
        ...(desde || hasta ? {
          creadoEn: {
            ...(desde && { gte: new Date(desde) }),
            ...(hasta && { lte: new Date(hasta) })
          }
        } : {})
      },
      include: {
        contacto: { select: { nombre: true, apellido: true, email: true, telefono: true, origen: true } },
        vendedor: { select: { nombre: true, apellido: true } },
        broker: { select: { nombre: true, apellido: true } }
      },
      orderBy: { creadoEn: 'desc' }
    })

    // Agrupar estadísticas
    const porEtapa = {}
    const porOrigen = {}
    const porVendedor = {}

    data.forEach(lead => {
      porEtapa[lead.etapa] = (porEtapa[lead.etapa] || 0) + 1
      if (lead.contacto?.origen) porOrigen[lead.contacto.origen] = (porOrigen[lead.contacto.origen] || 0) + 1
      if (lead.vendedor) {
        const k = `${lead.vendedor.nombre} ${lead.vendedor.apellido}`
        porVendedor[k] = (porVendedor[k] || 0) + 1
      }
    })

    res.json({ total: data.length, porEtapa, porOrigen, porVendedor, detalle: data })
  } catch (err) {
    res.status(500).json({ error: 'Error al generar reporte de leads.' })
  }
}

const ventas = async (req, res) => {
  const { vendedorId, edificioId, desde, hasta } = req.query
  try {
    const data = await prisma.venta.findMany({
      where: {
        ...(vendedorId && { vendedorId: Number(vendedorId) }),
        ...(edificioId && { unidad: { edificioId: Number(edificioId) } }),
        ...(desde || hasta ? {
          creadoEn: {
            ...(desde && { gte: new Date(desde) }),
            ...(hasta && { lte: new Date(hasta) })
          }
        } : {})
      },
      include: {
        comprador: { select: { nombre: true, apellido: true, rut: true } },
        vendedor: { select: { nombre: true, apellido: true } },
        broker: { select: { nombre: true, apellido: true } },
        unidad: {
          include: { edificio: { select: { nombre: true, region: true } } }
        },
        comisiones: { include: { usuario: { select: { nombre: true, apellido: true } } } }
      },
      orderBy: { creadoEn: 'desc' }
    })

    const totalUF = data.reduce((s, v) => s + (v.precioUF - (v.descuentoUF || 0)), 0)
    const porEstado = {}
    data.forEach(v => { porEstado[v.estado] = (porEstado[v.estado] || 0) + 1 })

    res.json({ total: data.length, totalUF: Math.round(totalUF * 100) / 100, porEstado, detalle: data })
  } catch (err) {
    res.status(500).json({ error: 'Error al generar reporte de ventas.' })
  }
}

const inventario = async (req, res) => {
  const { edificioId, tipo, estado } = req.query
  try {
    const data = await prisma.unidad.findMany({
      where: {
        ...(edificioId && { edificioId: Number(edificioId) }),
        ...(tipo && { tipo }),
        ...(estado && { estado })
      },
      include: {
        edificio: { select: { nombre: true, region: true, comuna: true } },
        promociones: { include: { promocion: { select: { nombre: true, tipo: true } } } }
      },
      orderBy: [{ edificioId: 'asc' }, { tipo: 'asc' }]
    })

    const porEstado = {}
    const porTipo = {}
    data.forEach(u => {
      porEstado[u.estado] = (porEstado[u.estado] || 0) + 1
      porTipo[u.tipo] = (porTipo[u.tipo] || 0) + 1
    })

    res.json({ total: data.length, porEstado, porTipo, detalle: data })
  } catch (err) {
    res.status(500).json({ error: 'Error al generar reporte de inventario.' })
  }
}

const pagosAtrasados = async (req, res) => {
  try {
    const cuotas = await prisma.cuota.findMany({
      where: {
        estado: { in: ['PENDIENTE', 'ATRASADO'] },
        fechaVencimiento: { lt: new Date() }
      },
      include: {
        planPago: {
          include: {
            venta: {
              include: {
                comprador: { select: { nombre: true, apellido: true, telefono: true, email: true } },
                unidad: { select: { numero: true, tipo: true, edificio: { select: { nombre: true } } } },
                vendedor: { select: { nombre: true, apellido: true } }
              }
            }
          }
        }
      },
      orderBy: { fechaVencimiento: 'asc' }
    })

    const totalUF = cuotas.reduce((s, c) => s + (c.montoUF || 0), 0)
    res.json({ total: cuotas.length, totalUF: Math.round(totalUF * 100) / 100, detalle: cuotas })
  } catch (err) {
    res.status(500).json({ error: 'Error al generar reporte de pagos atrasados.' })
  }
}

const comisiones = async (req, res) => {
  const { usuarioId, desde, hasta } = req.query
  try {
    const data = await prisma.comision.findMany({
      where: {
        ...(usuarioId && { usuarioId: Number(usuarioId) }),
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
          include: {
            unidad: { select: { numero: true, tipo: true, edificio: { select: { nombre: true } } } },
            comprador: { select: { nombre: true, apellido: true } }
          }
        }
      },
      orderBy: { creadoEn: 'desc' }
    })

    const totalUF = data.reduce((s, c) => s + c.montoCalculadoUF, 0)
    const pendienteUF = data.reduce((s, c) => {
      let p = 0
      if (c.estadoPrimera === 'PENDIENTE') p += c.montoPrimera
      if (c.estadoSegunda === 'PENDIENTE') p += c.montoSegunda
      return s + p
    }, 0)

    res.json({
      total: data.length,
      totalUF: Math.round(totalUF * 100) / 100,
      pendienteUF: Math.round(pendienteUF * 100) / 100,
      pagadoUF: Math.round((totalUF - pendienteUF) * 100) / 100,
      detalle: data
    })
  } catch (err) {
    res.status(500).json({ error: 'Error al generar reporte de comisiones.' })
  }
}

module.exports = { leads, ventas, inventario, pagosAtrasados, comisiones }
