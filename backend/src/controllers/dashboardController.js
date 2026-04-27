const prisma = require('../lib/prisma')

// Calcula el período anterior con la misma duración
function calcPeriodoAnterior(desde, hasta) {
  if (!desde || !hasta) return { desdeAnt: null, hastaAnt: null }
  const d = new Date(desde), h = new Date(hasta)
  const dur = h - d
  return { desdeAnt: new Date(d - dur), hastaAnt: new Date(d) }
}

// Agrupa leads por semana dentro del período
function agruparLeadsPorSemana(leads, desde, hasta) {
  if (!leads.length && !desde) return []
  const inicio = desde ? new Date(desde) : new Date(leads[0]?.creadoEn || Date.now())
  const fin    = hasta ? new Date(hasta)  : new Date()
  const semanas = []
  let cursor = new Date(inicio)
  let i = 1
  while (cursor < fin && semanas.length < 52) {
    const finSemana = new Date(Math.min(cursor.getTime() + 7 * 86400000, fin.getTime()))
    semanas.push({ label: `S${i}`, desde: new Date(cursor), hasta: finSemana })
    cursor = finSemana
    i++
  }
  return semanas.map(s => ({
    semana: s.label,
    leads: leads.filter(l => l.creadoEn && new Date(l.creadoEn) >= s.desde && new Date(l.creadoEn) < s.hasta).length
  }))
}

// Agrupa ventas por semana dentro del período
function agruparPorSemana(ventasPeriodo, todasVentas, desde, hasta) {
  const inicio = desde ? new Date(desde) : new Date(ventasPeriodo[0]?.fechaReserva || Date.now())
  const fin    = hasta ? new Date(hasta)  : new Date()
  const semanas = []
  let cursor = new Date(inicio)
  let i = 1
  while (cursor < fin) {
    const finSemana = new Date(Math.min(cursor.getTime() + 7 * 86400000, fin.getTime()))
    semanas.push({ label: `S${i}`, desde: new Date(cursor), hasta: finSemana })
    cursor = finSemana
    i++
  }
  return semanas.map(s => {
    const vendidoUF = ventasPeriodo
      .filter(v => v.fechaReserva && new Date(v.fechaReserva) >= s.desde && new Date(v.fechaReserva) < s.hasta)
      .reduce((sum, v) => sum + (v.precioFinalUF || 0), 0)
    const recolectadoUF = todasVentas
      .flatMap(v => v.planPago?.cuotas || [])
      .filter(c => c.estado === 'PAGADO' && c.fechaPagoReal && new Date(c.fechaPagoReal) >= s.desde && new Date(c.fechaPagoReal) < s.hasta)
      .reduce((sum, c) => sum + (c.montoUF || 0), 0)
    return { semana: s.label, vendidoUF: +vendidoUF.toFixed(2), recolectadoUF: +recolectadoUF.toFixed(2) }
  })
}

const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

const obtener = async (req, res) => {
  const { desde, hasta } = req.query
  const hayFecha = desde || hasta
  const { desdeAnt, hastaAnt } = calcPeriodoAnterior(desde, hasta)

  const filtroLead     = hayFecha ? { creadoEn:     { ...(desde && { gte: new Date(desde) }), ...(hasta && { lte: new Date(hasta) }) } } : {}
  const filtroReserva  = hayFecha ? { fechaReserva: { ...(desde && { gte: new Date(desde) }), ...(hasta && { lte: new Date(hasta) }) } } : {}
  const filtroEscritura= hayFecha ? { fechaEscritura:{ ...(desde && { gte: new Date(desde) }), ...(hasta && { lte: new Date(hasta) }) } } : {}
  const filtroLeadAnt  = desdeAnt ? { creadoEn:     { gte: desdeAnt, lte: hastaAnt } } : {}
  const filtroReservaAnt = desdeAnt ? { fechaReserva:{ gte: desdeAnt, lte: hastaAnt } } : {}

  const anioActual = new Date().getFullYear()

  try {
    const [
      // KPIs actuales
      leadsIngresados,
      ventasRecientes,
      // KPIs período anterior
      leadsIngresadosAnt,
      ventasAnt,
      // Inventario por edificio
      unidadesPorEdificio,
      // Ventas activas para legal y cuotas
      ventasActivas,
      // Ventas año completo para gráfico por mes
      ventasAnio,
      // Leads del período con fechas para gráfico semanal
      leadsPeriodo,
      // Leads para embudo
      contactados,
      visitasEmbudo,
      reservas,
      promesas,
      escrituras,
      // Notificaciones
      notificacionesSinLeer,
      // Unidades vendidas período anterior
      unidadesVendidasAnt,
      // Visitas del período
      visitasDelPeriodo,
      // Visitas próximas
      visitasProximas,
    ] = await Promise.all([
      // Leads ingresados en el período
      prisma.lead.count({ where: filtroLead }),

      // Ventas del período con planPago para ingresos por semana
      prisma.venta.findMany({
        where: { ...filtroReserva, estado: { not: 'ANULADO' } },
        orderBy: { fechaReserva: 'desc' },
        select: {
          id: true, estado: true, precioFinalUF: true,
          fechaReserva: true,
          comprador: { select: { nombre: true, apellido: true } },
          vendedor:  { select: { nombre: true, apellido: true } },
          broker:    { select: { nombre: true, apellido: true } },
          unidades: {
            select: {
              numero: true, tipo: true, precioCostoUF: true,
              edificio: { select: { nombre: true } }
            }
          },
          planPago: {
            select: {
              cuotas: {
                select: { montoUF: true, estado: true, fechaPagoReal: true, fechaVencimiento: true, tipo: true, numeroCuota: true, metodoPago: true },
                orderBy: { numeroCuota: 'asc' }
              }
            }
          }
        }
      }),

      // Leads período anterior
      prisma.lead.count({ where: filtroLeadAnt }),

      // Ventas período anterior
      prisma.venta.count({ where: { ...filtroReservaAnt, estado: { not: 'ANULADO' } } }),

      // Inventario por edificio — groupBy edificioId + estado
      prisma.unidad.groupBy({
        by: ['edificioId', 'estado'],
        _count: { id: true },
        orderBy: { edificioId: 'asc' }
      }).then(async rows => {
        const edificioIds = [...new Set(rows.map(r => r.edificioId))]
        const edificios = await prisma.edificio.findMany({
          where: { id: { in: edificioIds } },
          select: { id: true, nombre: true }
        })
        const edMap = Object.fromEntries(edificios.map(e => [e.id, e.nombre]))
        const result = {}
        for (const r of rows) {
          const eid = r.edificioId
          if (!result[eid]) result[eid] = { edificio: edMap[eid] || `Edificio ${eid}`, disponible: 0, reservado: 0, vendido: 0, otro: 0 }
          if (r.estado === 'DISPONIBLE')  result[eid].disponible  += r._count.id
          else if (r.estado === 'RESERVADO') result[eid].reservado += r._count.id
          else if (r.estado === 'VENDIDO')   result[eid].vendido   += r._count.id
          else result[eid].otro += r._count.id
        }
        return Object.values(result).map(({ otro: _otro, ...e }) => ({ ...e, total: e.disponible + e.reservado + e.vendido + (_otro || 0) }))
          .sort((a, b) => a.edificio.localeCompare(b.edificio))
      }),

      // Ventas activas para legal y cuotas (sin filtro de fecha)
      prisma.venta.findMany({
        where: { estado: { in: ['RESERVA', 'PROMESA', 'ESCRITURA', 'ENTREGADO'] } },
        orderBy: { fechaReserva: 'desc' },
        include: {
          comprador: { select: { nombre: true, apellido: true } },
          vendedor:  { select: { nombre: true, apellido: true } },
          unidades:  { select: { numero: true, tipo: true, edificio: { select: { nombre: true } } } },
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

      // Ventas año completo para gráfico mensual
      prisma.venta.findMany({
        where: {
          estado: { not: 'ANULADO' },
          fechaReserva: {
            gte: new Date(anioActual, 0, 1),
            lt: new Date(anioActual + 1, 0, 1)
          }
        },
        select: { fechaReserva: true, unidades: { select: { id: true } } }
      }),

      // Leads del período con fechas
      prisma.lead.findMany({
        where: filtroLead,
        select: { creadoEn: true }
      }),

      // Embudo: contactados — leads del período que salieron de NUEVO
      prisma.lead.count({
        where: { ...filtroLead, etapa: { not: 'NUEVO' } }
      }),

      // Embudo: visitas — por fechaHora en el período
      prisma.visita.count({
        where: hayFecha ? { fechaHora: { gte: new Date(desde), lte: new Date(hasta) } } : {}
      }),

      // Embudo: reservas — por fechaReserva en el período
      prisma.venta.count({
        where: { ...filtroReserva, estado: { not: 'ANULADO' } }
      }),

      // Embudo: promesas — por fechaPromesa en el período
      prisma.venta.count({
        where: {
          ...(hayFecha ? { fechaPromesa: { gte: new Date(desde), lte: new Date(hasta) } } : {}),
          estado: { not: 'ANULADO' }
        }
      }),

      // Embudo: escrituras — por fechaEscritura en el período
      prisma.venta.count({
        where: { ...filtroEscritura, estado: { not: 'ANULADO' } }
      }),

      // Notificaciones sin leer
      prisma.notificacion.count({ where: { usuarioId: req.usuario.id, leida: false } }),

      // Unidades vendidas período anterior
      desdeAnt ? prisma.unidad.count({
        where: { ventaId: { not: null }, venta: { ...filtroReservaAnt, estado: { not: 'ANULADO' } } }
      }) : Promise.resolve(0),

      // Visitas del período
      prisma.visita.findMany({
        where: hayFecha ? { fechaHora: { gte: new Date(desde), lte: new Date(hasta) } } : {},
        orderBy: { fechaHora: 'desc' },
        take: 200,
        include: {
          lead: {
            select: {
              contacto: { select: { nombre: true, apellido: true } },
              unidadInteres: { select: { numero: true, tipo: true, edificio: { select: { nombre: true } } } }
            }
          },
          vendedor: { select: { nombre: true, apellido: true } }
        }
      }),

      // Visitas próximas (después de ahora, máx 10)
      prisma.visita.findMany({
        where: { fechaHora: { gt: new Date() } },
        orderBy: { fechaHora: 'asc' },
        take: 10,
        include: {
          lead: {
            select: {
              contacto: { select: { nombre: true, apellido: true } },
              unidadInteres: { select: { numero: true, tipo: true, edificio: { select: { nombre: true } } } }
            }
          },
          vendedor: { select: { nombre: true, apellido: true } }
        }
      }),
    ])

    // Leads por campaña: actual vs anterior
    const leadsActualRaw = await prisma.lead.groupBy({
      by: ['campana'],
      where: filtroLead,
      _count: { id: true }
    })
    const leadsAntRaw = desdeAnt ? await prisma.lead.groupBy({
      by: ['campana'],
      where: filtroLeadAnt,
      _count: { id: true }
    }) : []

    const antMap = Object.fromEntries(leadsAntRaw.map(r => [r.campana ?? '__sin_campana__', r._count.id]))
    const todasCampanas = new Set([
      ...leadsActualRaw.map(r => r.campana ?? '__sin_campana__'),
      ...leadsAntRaw.map(r => r.campana ?? '__sin_campana__'),
    ])
    const actualMap = Object.fromEntries(leadsActualRaw.map(r => [r.campana ?? '__sin_campana__', r._count.id]))
    const leadsPorCampana = [...todasCampanas]
      .map(key => ({
        campana: key === '__sin_campana__' ? 'Sin campaña' : key,
        actual:   actualMap[key] || 0,
        anterior: antMap[key] || 0,
      }))
      .sort((a, b) => b.actual - a.actual)

    // Ingresos por semana
    const ingresosPorSemana = agruparPorSemana(ventasRecientes, ventasActivas, desde, hasta)

    // Ventas por mes (año completo)
    const ventasPorMes = MESES.map((nombre, i) => {
      const delMes = ventasAnio.filter(v => v.fechaReserva && new Date(v.fechaReserva).getMonth() === i)
      return {
        mes: i + 1,
        nombre,
        cantidad: delMes.length,
        cantidadUnidades: delMes.reduce((s, v) => s + (v.unidades?.length || 0), 0)
      }
    })

    // Leads por semana del período
    const leadsPorSemana = agruparLeadsPorSemana(leadsPeriodo, desde, hasta)

    // KPIs
    const montoUF = ventasRecientes.reduce((s, v) => s + (v.precioFinalUF || 0), 0)
    const unidadesVendidas = ventasRecientes.reduce((s, v) => s + (v.unidades?.length || 0), 0)
    const montoUFAnt = 0
    const ventasAntCount = ventasAnt

    // Cuotas pendientes de ventas activas
    const cuotasPendientes = ventasActivas
      .flatMap(v => (v.planPago?.cuotas || [])
        .filter(c => c.estado !== 'PAGADO' && c.estado !== 'CONDONADO')
        .map(c => ({
          compradorNombre: `${v.comprador?.nombre || ''} ${v.comprador?.apellido || ''}`.trim(),
          ventaId: v.id,
          numeroCuota: c.numeroCuota,
          totalCuotas: v.planPago.cuotas.length,
          fechaVencimiento: c.fechaVencimiento,
          montoUF: c.montoUF,
          estado: c.estado,
          vencida: new Date(c.fechaVencimiento) < new Date()
        }))
      )
      .sort((a, b) => {
        if (a.vencida && !b.vencida) return -1
        if (!a.vencida && b.vencida) return 1
        return new Date(a.fechaVencimiento) - new Date(b.fechaVencimiento)
      })

    // Proceso legal — solo ventas con pasos incompletos
    const PASOS_CON_PROMESA  = ['FIRMA_CLIENTE_PROMESA','FIRMA_INMOBILIARIA_PROMESA','ESCRITURA_LISTA','FIRMADA_NOTARIA','INSCRIPCION_CBR','ENTREGADO']
    const procesoLegalPendiente = ventasActivas.filter(v => {
      if (!v.procesoLegal) return false
      const pasos = v.procesoLegal.tienePromesa === false
        ? ['ESCRITURA_LISTA','FIRMADA_NOTARIA','INSCRIPCION_CBR','ENTREGADO']
        : PASOS_CON_PROMESA
      const idx = pasos.indexOf(v.procesoLegal.estadoActual)
      return idx < pasos.length - 1
    })

    res.json({
      kpis: {
        leadsIngresados,
        leadsIngresadosAnterior: leadsIngresadosAnt,
        ventas: ventasRecientes.length,
        ventasAnterior: ventasAntCount,
        unidadesVendidas,
        unidadesVendidasAnterior: unidadesVendidasAnt,
        montoUF: +montoUF.toFixed(2),
        montoUFAnterior: montoUFAnt,
      },
      ingresosPorSemana,
      ventasPorMes,
      leadsPorSemana,
      leadsPorCampana,
      inventarioPorEdificio: unidadesPorEdificio,
      visitasDelPeriodo,
      visitasProximas,
      cuotasPendientes,
      ventasRecientes,
      procesoLegalPendiente,
      ventasActivas,
      embudo: [
        { paso: 'Leads recibidos', cantidad: leadsIngresados },
        { paso: 'Contactados',     cantidad: contactados },
        { paso: 'Visitas',         cantidad: visitasEmbudo },
        { paso: 'Reservas',        cantidad: reservas },
        { paso: 'Promesas',        cantidad: promesas },
        { paso: 'Escrituras',      cantidad: escrituras },
      ],
      resumen: { totalLeads: leadsIngresados, notificacionesSinLeer },
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al obtener dashboard.' })
  }
}

module.exports = { obtener }
