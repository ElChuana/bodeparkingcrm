const prisma = require('../lib/prisma')
const XLSX = require('xlsx')

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
        venta: { estado: { not: 'ANULADO' } }, // no contar comisiones de ventas anuladas
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
            id: true, estado: true, precioFinalUF: true,
            unidades: { select: { numero: true, tipo: true, edificio: { select: { nombre: true } } } },
            comprador: { select: { nombre: true, apellido: true } }
          }
        },
        arriendo: {
          select: {
            id: true, estado: true, montoMensualUF: true, fechaInicio: true,
            unidad: { select: { numero: true, tipo: true, edificio: { select: { nombre: true } } } },
            contacto: { select: { nombre: true, apellido: true } }
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
      select: { precioFinalUF: true, estado: true, conPromesa: true }
    })
    if (!venta) return res.status(404).json({ error: 'Venta no encontrada.' })
    if (venta.estado === 'ANULADO') return res.status(400).json({ error: 'No se pueden crear comisiones para ventas anuladas.' })

    const total = calcularMontos(venta.precioFinalUF, porcentaje != null ? Number(porcentaje) : null, montoFijo != null ? Number(montoFijo) : null)

    let primera, segunda
    if (montoPrimera != null && montoSegunda != null) {
      // usuario pasó valores manuales explícitos
      primera = Number(montoPrimera)
      segunda = Number(montoSegunda)
    } else if (!venta.conPromesa) {
      // directo a escritura: 100% en segunda
      primera = 0
      segunda = total
    } else {
      // con promesa: 50/50 default
      primera = montoPrimera != null ? Number(montoPrimera) : total / 2
      segunda = montoSegunda != null ? Number(montoSegunda) : total / 2
    }

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
  const { id } = req.params
  const { concepto, porcentaje, montoFijo, montoPrimera, montoSegunda } = req.body

  try {
    const comision = await prisma.comision.findUnique({
      where: { id: Number(id) },
      include: { venta: { select: { precioFinalUF: true, conPromesa: true } } }
    })
    if (!comision) return res.status(404).json({ error: 'Comisión no encontrada.' })

    const newPct = porcentaje != null ? Number(porcentaje) : null
    const newFijo = montoFijo != null ? Number(montoFijo) : null

    // Recalcular total si cambiaron porcentaje o montoFijo
    const total = (newPct != null || newFijo != null)
      ? calcularMontos(comision.venta.precioFinalUF, newPct, newFijo)
      : comision.montoCalculadoUF

    let primera, segunda
    if (montoPrimera != null && montoSegunda != null) {
      primera = Number(montoPrimera)
      segunda = Number(montoSegunda)
    } else if (!comision.venta.conPromesa) {
      primera = 0
      segunda = total
    } else {
      primera = montoPrimera != null ? Number(montoPrimera) : total / 2
      segunda = montoSegunda != null ? Number(montoSegunda) : total / 2
    }

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
        venta: { estado: { not: 'ANULADO' } }, // excluir comisiones de ventas anuladas
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
    let totalPendienteUF = 0
    let totalPagadoUF = 0
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
      agrupado[uid].totalUF += Number(c.montoCalculadoUF)
      agrupado[uid].cantidad += 1

      if (c.estadoPrimera === 'PENDIENTE') agrupado[uid].pendienteUF += Number(c.montoPrimera)
      else agrupado[uid].pagadoUF += Number(c.montoPrimera)

      if (c.estadoSegunda === 'PENDIENTE') agrupado[uid].pendienteUF += Number(c.montoSegunda)
      else agrupado[uid].pagadoUF += Number(c.montoSegunda)

      totalPendienteUF += Number(c.estadoPrimera === 'PENDIENTE' ? c.montoPrimera : 0) + Number(c.estadoSegunda === 'PENDIENTE' ? c.montoSegunda : 0)
      totalPagadoUF += Number(c.estadoPrimera === 'PAGADO' ? c.montoPrimera : 0) + Number(c.estadoSegunda === 'PAGADO' ? c.montoSegunda : 0)
    })

    res.json({ totalPendienteUF, totalPagadoUF, porUsuario: Object.values(agrupado) })
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener resumen.' })
  }
}

// ─── Vista mensual + export ───────────────────────────────────────
// Cada comisión tiene dos tramos: promesa (montoPrimera) y escritura (montoSegunda).
// Un tramo se "devenga" cuando la venta alcanza ese hito; el mes del tramo es el
// mes de venta.fechaPromesa / venta.fechaEscritura.

const ESTADOS_CON_PROMESA = ['PROMESA', 'ESCRITURA', 'ENTREGADO']
const ESTADOS_CON_ESCRITURA = ['ESCRITURA', 'ENTREGADO']

const fechaDevengoPrimera = (venta) =>
  venta.fechaPromesa || (ESTADOS_CON_PROMESA.includes(venta.estado) ? venta.creadoEn : null)

const fechaDevengoSegunda = (venta) =>
  venta.fechaEscritura || (ESTADOS_CON_ESCRITURA.includes(venta.estado) ? venta.creadoEn : null)

const mismoMes = (fecha, anio, mes) => {
  if (!fecha) return false
  const d = new Date(fecha)
  return d.getFullYear() === anio && d.getMonth() + 1 === mes
}

// Construye las filas (tramos devengados) de un mes dado
const filasDelMes = async (anio, mes, filtroUsuario) => {
  const comisiones = await prisma.comision.findMany({
    where: {
      ...filtroUsuario,
      OR: [
        { venta: { estado: { not: 'ANULADO' } } },
        { arriendoId: { not: null } },
      ]
    },
    include: {
      usuario: { select: { id: true, nombre: true, apellido: true, rol: true } },
      venta: {
        select: {
          id: true, estado: true, precioFinalUF: true,
          fechaPromesa: true, fechaEscritura: true, creadoEn: true,
          unidades: { select: { numero: true, tipo: true, edificio: { select: { nombre: true } } } },
          comprador: { select: { nombre: true, apellido: true } }
        }
      },
      arriendo: {
        select: {
          id: true, estado: true, montoMensualUF: true, fechaInicio: true, creadoEn: true,
          unidad: { select: { numero: true, tipo: true, edificio: { select: { nombre: true } } } },
          contacto: { select: { nombre: true, apellido: true } }
        }
      }
    },
    orderBy: { creadoEn: 'asc' }
  })

  const filas = []
  for (const c of comisiones) {
    // Comisión de arriendo: un solo tramo, devengado en el mes de inicio del arriendo
    if (c.arriendo) {
      const a = c.arriendo
      const monto = Number(c.montoPrimera)
      if (monto <= 0 || !mismoMes(a.fechaInicio, anio, mes)) continue
      filas.push({
        comisionId: c.id,
        tramo: 'ARRIENDO',
        usuario: c.usuario,
        concepto: c.concepto,
        porcentaje: c.porcentaje,
        arriendoId: a.id,
        estadoVenta: a.estado,
        comprador: `${a.contacto?.nombre || ''} ${a.contacto?.apellido || ''}`.trim(),
        unidades: `${a.unidad?.edificio?.nombre || ''} ${a.unidad?.numero || ''}`.trim(),
        precioVentaUF: Number(a.montoMensualUF || 0),
        montoUF: monto,
        estadoPago: c.estadoPrimera,
        fechaDevengo: a.fechaInicio,
        fechaPago: c.fechaPagoPrimera,
      })
      continue
    }
    if (!c.venta) continue
    const tramos = [
      { tramo: 'PROMESA', monto: Number(c.montoPrimera), estadoPago: c.estadoPrimera, fechaPago: c.fechaPagoPrimera, fechaDevengo: fechaDevengoPrimera(c.venta) },
      { tramo: 'ESCRITURA', monto: Number(c.montoSegunda), estadoPago: c.estadoSegunda, fechaPago: c.fechaPagoSegunda, fechaDevengo: fechaDevengoSegunda(c.venta) },
    ]
    for (const t of tramos) {
      if (t.monto <= 0) continue
      if (!mismoMes(t.fechaDevengo, anio, mes)) continue
      filas.push({
        comisionId: c.id,
        tramo: t.tramo,
        usuario: c.usuario,
        concepto: c.concepto,
        porcentaje: c.porcentaje,
        ventaId: c.venta.id,
        estadoVenta: c.venta.estado,
        comprador: `${c.venta.comprador?.nombre || ''} ${c.venta.comprador?.apellido || ''}`.trim(),
        unidades: c.venta.unidades.map(u => `${u.edificio?.nombre || ''} ${u.numero}`.trim()).join(' + '),
        precioVentaUF: Number(c.venta.precioFinalUF),
        montoUF: t.monto,
        estadoPago: t.estadoPago,
        fechaDevengo: t.fechaDevengo,
        fechaPago: t.fechaPago,
      })
    }
  }
  return filas
}

const parseMes = (mesParam) => {
  const m = /^(\d{4})-(\d{2})$/.exec(String(mesParam || ''))
  if (!m) return null
  return { anio: Number(m[1]), mes: Number(m[2]) }
}

// GET /comisiones/mensual?mes=YYYY-MM — tramos devengados del mes + resumen por usuario
const mensual = async (req, res) => {
  const parsed = parseMes(req.query.mes)
  if (!parsed) return res.status(400).json({ error: 'Parámetro mes requerido (formato YYYY-MM).' })

  const esGerenciaOJV = ['GERENTE', 'JEFE_VENTAS'].includes(req.usuario.rol)
  const filtroUsuario = esGerenciaOJV
    ? (req.query.usuarioId ? { usuarioId: Number(req.query.usuarioId) } : {})
    : { usuarioId: req.usuario.id }

  try {
    const filas = await filasDelMes(parsed.anio, parsed.mes, filtroUsuario)

    const porUsuario = {}
    let totalUF = 0, pagadoUF = 0, pendienteUF = 0
    for (const f of filas) {
      const uid = f.usuario.id
      if (!porUsuario[uid]) porUsuario[uid] = { usuario: f.usuario, totalUF: 0, pagadoUF: 0, pendienteUF: 0, tramos: 0 }
      porUsuario[uid].totalUF += f.montoUF
      porUsuario[uid].tramos += 1
      if (f.estadoPago === 'PAGADO') porUsuario[uid].pagadoUF += f.montoUF
      else porUsuario[uid].pendienteUF += f.montoUF
      totalUF += f.montoUF
      if (f.estadoPago === 'PAGADO') pagadoUF += f.montoUF
      else pendienteUF += f.montoUF
    }

    res.json({ mes: req.query.mes, filas, porUsuario: Object.values(porUsuario), totalUF, pagadoUF, pendienteUF })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al obtener comisiones del mes.' })
  }
}

// GET /comisiones/export?mes=YYYY-MM — Excel (.xlsx) del mes: hoja Resumen + hoja Detalle
const exportar = async (req, res) => {
  const parsed = parseMes(req.query.mes)
  if (!parsed) return res.status(400).json({ error: 'Parámetro mes requerido (formato YYYY-MM).' })

  try {
    const filtroUsuario = req.query.usuarioId ? { usuarioId: Number(req.query.usuarioId) } : {}
    const filas = await filasDelMes(parsed.anio, parsed.mes, filtroUsuario)

    const fmtFecha = (f) => f ? new Date(f).toISOString().slice(0, 10) : ''
    const redondear = (n) => Math.round(n * 100) / 100

    // Hoja Resumen: totales por usuario + fila TOTAL
    const porUsuario = {}
    for (const f of filas) {
      const uid = f.usuario.id
      if (!porUsuario[uid]) porUsuario[uid] = { usuario: f.usuario, totalUF: 0, pagadoUF: 0, pendienteUF: 0, tramos: 0 }
      porUsuario[uid].totalUF += f.montoUF
      porUsuario[uid].tramos += 1
      if (f.estadoPago === 'PAGADO') porUsuario[uid].pagadoUF += f.montoUF
      else porUsuario[uid].pendienteUF += f.montoUF
    }
    const resumenRows = Object.values(porUsuario).map(r => ({
      'Usuario': `${r.usuario.nombre} ${r.usuario.apellido}`,
      'Rol': r.usuario.rol,
      'Tramos': r.tramos,
      'Total UF': redondear(r.totalUF),
      'Pagado UF': redondear(r.pagadoUF),
      'Pendiente UF': redondear(r.pendienteUF),
    }))
    resumenRows.push({
      'Usuario': 'TOTAL',
      'Rol': '',
      'Tramos': filas.length,
      'Total UF': redondear(filas.reduce((s, f) => s + f.montoUF, 0)),
      'Pagado UF': redondear(filas.filter(f => f.estadoPago === 'PAGADO').reduce((s, f) => s + f.montoUF, 0)),
      'Pendiente UF': redondear(filas.filter(f => f.estadoPago !== 'PAGADO').reduce((s, f) => s + f.montoUF, 0)),
    })

    // Hoja Detalle: cada tramo devengado del mes
    const detalleRows = filas.map(f => ({
      'Usuario': `${f.usuario.nombre} ${f.usuario.apellido}`,
      'Rol': f.usuario.rol,
      'Concepto': f.concepto || '',
      '%': f.porcentaje != null ? f.porcentaje : '',
      'Tramo': f.tramo,
      'Operación': f.ventaId ? `Venta #${f.ventaId}` : `Arriendo #${f.arriendoId}`,
      'Estado': f.estadoVenta,
      'Cliente': f.comprador,
      'Unidades': f.unidades,
      'Precio/Canon UF': redondear(f.precioVentaUF),
      'Monto UF': redondear(f.montoUF),
      'Estado pago': f.estadoPago,
      'Fecha devengo': fmtFecha(f.fechaDevengo),
      'Fecha pago': fmtFecha(f.fechaPago),
    }))

    const anchos = (rows) => {
      if (!rows.length) return []
      return Object.keys(rows[0]).map(k => ({
        wch: Math.min(40, Math.max(k.length, ...rows.map(r => String(r[k] ?? '').length)) + 2)
      }))
    }

    const wb = XLSX.utils.book_new()
    const wsResumen = XLSX.utils.json_to_sheet(resumenRows)
    wsResumen['!cols'] = anchos(resumenRows)
    XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen')
    const wsDetalle = XLSX.utils.json_to_sheet(detalleRows)
    wsDetalle['!cols'] = anchos(detalleRows)
    XLSX.utils.book_append_sheet(wb, wsDetalle, 'Detalle')

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', `attachment; filename="comisiones-${req.query.mes}.xlsx"`)
    res.send(buffer)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al exportar comisiones.' })
  }
}

module.exports = { listar, crear, editar, eliminar, marcarPrimeraPagada, marcarSegundaPagada, resumen, mensual, exportar }
