const prisma = require('../lib/prisma')

const obtener = async (req, res) => {
  const { desde, hasta } = req.query

  const hayFecha = desde || hasta

  // Filtro por creadoEn del lead
  const filtroLead = hayFecha ? {
    creadoEn: {
      ...(desde && { gte: new Date(desde) }),
      ...(hasta && { lte: new Date(hasta) })
    }
  } : {}

  // Filtro por fechaReserva de la venta
  const filtroReserva = hayFecha ? {
    fechaReserva: {
      ...(desde && { gte: new Date(desde) }),
      ...(hasta && { lte: new Date(hasta) })
    }
  } : {}

  // Filtro por fechaEscritura de la venta
  const filtroEscritura = hayFecha ? {
    fechaEscritura: {
      ...(desde && { gte: new Date(desde) }),
      ...(hasta && { lte: new Date(hasta) })
    }
  } : {}

  try {
    const [
      totalLeads,
      notificacionesSinLeer,
      unidadesPorEstado,
      ventasRecientes,
      ventasActivas,
      recibidos,
      contactados,
      visitaAgendada,
      reservas,
      escriturados
    ] = await Promise.all([
      // Leads ingresados en el período
      prisma.lead.count({ where: { ...filtroLead } }),

      // Notificaciones sin leer — siempre sin filtro de fecha
      prisma.notificacion.count({ where: { usuarioId: req.usuario.id, leida: false } }),

      // Inventario — sin filtro de fecha
      prisma.unidad.groupBy({ by: ['estado'], _count: { id: true } }),

      // Ventas (reservas) en el período — filtradas por fechaReserva
      prisma.venta.findMany({
        where: { ...filtroReserva, estado: { not: 'ANULADO' } },
        orderBy: { fechaReserva: 'desc' },
        include: {
          comprador: { select: { nombre: true, apellido: true } },
          broker:    { select: { nombre: true, apellido: true } },
          unidades: {
            select: {
              numero: true, tipo: true, precioCostoUF: true,
              edificio: { select: { nombre: true } }
            }
          },
          planPago: {
            include: {
              cuotas: {
                where: { tipo: 'RESERVA' },
                orderBy: { numeroCuota: 'asc' },
                take: 1
              }
            }
          }
        }
      }),

      // Ventas activas (sin filtro de fecha — estado actual)
      prisma.venta.findMany({
        where: { estado: { in: ['RESERVA', 'PROMESA', 'ESCRITURA'] } },
        orderBy: { fechaReserva: 'desc' },
        include: {
          comprador: { select: { nombre: true, apellido: true } },
          vendedor:  { select: { nombre: true, apellido: true } },
          unidades: {
            select: {
              numero: true, tipo: true,
              edificio: { select: { nombre: true } }
            }
          },
          procesoLegal: {
            select: {
              estadoActual: true, tienePromesa: true,
              fechaLimiteFirmaCliente: true, fechaLimiteFirmaInmob: true,
              fechaLimiteEscritura: true, fechaLimiteFirmaNot: true,
              fechaLimiteCBR: true, fechaLimiteEntrega: true,
            }
          },
          planPago: {
            include: { cuotas: { orderBy: { numeroCuota: 'asc' } } }
          }
        }
      }),

      // Embudo paso 1: leads recibidos en el período
      prisma.lead.count({ where: { ...filtroLead } }),

      // Embudo paso 2: leads contactados (etapa >= SEGUIMIENTO)
      prisma.lead.count({
        where: {
          ...filtroLead,
          etapa: { in: ['SEGUIMIENTO', 'COTIZACION_ENVIADA', 'VISITA_AGENDADA', 'VISITA_REALIZADA',
            'SEGUIMIENTO_POST_VISITA', 'NEGOCIACION', 'RESERVA', 'PROMESA', 'ESCRITURA', 'ENTREGA', 'POSTVENTA'] }
        }
      }),

      // Embudo paso 3: visita agendada o más
      prisma.lead.count({
        where: {
          ...filtroLead,
          etapa: { in: ['VISITA_AGENDADA', 'VISITA_REALIZADA', 'SEGUIMIENTO_POST_VISITA',
            'NEGOCIACION', 'RESERVA', 'PROMESA', 'ESCRITURA', 'ENTREGA', 'POSTVENTA'] }
        }
      }),

      // Embudo paso 4: reservas en el período (por fechaReserva)
      prisma.venta.count({
        where: { ...filtroReserva, estado: { not: 'ANULADO' } }
      }),

      // Embudo paso 5: escriturados en el período (por fechaEscritura)
      prisma.venta.count({
        where: hayFecha
          ? { ...filtroEscritura, estado: { not: 'ANULADO' } }
          : { fechaEscritura: { not: null }, estado: { not: 'ANULADO' } }
      })
    ])

    res.json({
      resumen: { totalLeads, notificacionesSinLeer },
      embudo: [
        { paso: 'Leads recibidos',  cantidad: recibidos },
        { paso: 'Contactados',      cantidad: contactados },
        { paso: 'Visita agendada',  cantidad: visitaAgendada },
        { paso: 'Reservas',         cantidad: reservas },
        { paso: 'Escriturados',     cantidad: escriturados },
      ],
      unidadesPorEstado,
      ventasRecientes,
      ventasActivas
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al obtener dashboard.' })
  }
}

module.exports = { obtener }
