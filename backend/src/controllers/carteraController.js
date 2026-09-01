/**
 * Cartera: quién me debe, cuánto y desde cuándo.
 *
 * El reporte más usado de cualquier ERP. Nadie persigue cuotas sueltas: uno persigue
 * personas. Esta pantalla contesta una sola pregunta — a quién hay que llamar hoy — y por
 * eso ordena por gravedad y no por monto.
 */

const prisma = require('../lib/prisma')
const { saldoCuota, cuotaComoObjetivo } = require('../lib/conciliacion')
const { valorUFEn } = require('../lib/uf')
const { WHERE_ABIERTA } = require('../lib/cuotas')
const { agrupar, estadoCuenta, TRAMOS } = require('../lib/cartera')

const INCLUDE = {
  conciliaciones: { include: { movimiento: { select: { id: true, fecha: true, glosa: true, monto: true } } } },
  planPago: {
    select: {
      venta: {
        select: {
          id: true, estado: true,
          comprador: { select: { id: true, nombre: true, apellido: true, rut: true, email: true, telefono: true } },
          vendedor: { select: { id: true, nombre: true } },
          unidades: { select: { numero: true, tipo: true, edificio: { select: { id: true, nombre: true } } } },
        },
      },
    },
  },
}

/**
 * Aplana una cuota a la forma que espera `lib/cartera.js`.
 *
 * A diferencia de la conciliación, acá SÍ entran las cuotas migradas: representan deuda
 * real y hay que cobrarlas. Van marcadas para que quien mire sepa que el monto y la fecha
 * son reconstruidos y no pactados.
 */
const aFila = (c, valorUF) => {
  const venta = c.planPago?.venta
  const comprador = venta?.comprador
  const objetivo = cuotaComoObjetivo(c, valorUF)
  return {
    id: c.id,
    numeroCuota: c.numeroCuota,
    tipo: c.tipo,
    estado: c.estado,
    montoUF: c.montoUF,
    montoCLP: objetivo.total,
    fechaVencimiento: c.fechaVencimiento,
    saldoPorCobrar: saldoCuota(c, valorUF),
    origenMigracion: c.origenMigracion,
    ventaId: venta?.id ?? null,
    contactoId: comprador?.id ?? null,
    comprador: comprador ? `${comprador.nombre || ''} ${comprador.apellido || ''}`.trim() : 'Sin cliente',
    rut: comprador?.rut || null,
    email: comprador?.email || null,
    telefono: comprador?.telefono || null,
    vendedor: venta?.vendedor?.nombre || null,
    unidades: venta?.unidades || [],
    edificio: venta?.unidades?.[0]?.edificio?.nombre || null,
    pagos: (c.conciliaciones || []).map((k) => ({
      fecha: k.movimiento?.fecha || k.creadoEn,
      monto: Number(k.monto),
      glosa: k.movimiento?.glosa || 'Pago registrado a mano',
    })),
  }
}

async function leer(where = {}) {
  const [cuotas, uf] = await Promise.all([
    prisma.cuota.findMany({ where: { ...WHERE_ABIERTA, ...where }, include: INCLUDE, orderBy: { fechaVencimiento: 'asc' } }),
    valorUFEn().catch(() => null),
  ])
  const valorUF = uf?.valor || 0
  return { filas: cuotas.map((c) => aFila(c, valorUF)), valorUF }
}

/** El reporte de antigüedad, agrupado por cliente. */
const resumen = async (req, res) => {
  try {
    // La fecha de corte es un parámetro: el mismo reporte pedido dos veces con el mismo
    // corte tiene que dar lo mismo, aunque se pida en días distintos.
    const corte = req.query.corte ? new Date(req.query.corte) : new Date()
    const { filas, valorUF } = await leer()
    const r = agrupar(filas, corte)

    res.json({
      ...r,
      valorUF,
      corte,
      migradas: filas.filter((f) => f.origenMigracion).length,
      tramos: TRAMOS,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al armar la cartera.' })
  }
}

/**
 * La matriz Cliente × Mes: el excel de ventas en cuotas, ahora vivo.
 * Cada celda es lo que ese cliente debía/debe ese mes, con su estado derivado.
 */
const matriz = async (req, res) => {
  try {
    const uf = await valorUFEn().catch(() => null)
    const valorUF = uf?.valor || 0
    const cuotas = await prisma.cuota.findMany({
      where: { planPago: { venta: { estado: { not: 'ANULADO' } } } },
      include: INCLUDE,
      orderBy: { fechaVencimiento: 'asc' },
    })

    const claveMes = (d) => new Date(d).toISOString().slice(0, 7)
    const meses = [...new Set(cuotas.map((c) => claveMes(c.fechaVencimiento)))].sort()

    const porCliente = new Map()
    for (const c of cuotas) {
      const fila = aFila(c, valorUF)
      const id = fila.contactoId ?? `s/c-${fila.ventaId ?? 'x'}`
      if (!porCliente.has(id)) {
        porCliente.set(id, {
          contactoId: fila.contactoId,
          nombre: fila.comprador,
          rut: fila.rut,
          telefono: fila.telefono,
          edificio: fila.edificio,
          total: 0, pagado: 0, saldo: 0,
          meses: {},
        })
      }
      const cli = porCliente.get(id)
      const mes = claveMes(c.fechaVencimiento)
      const pagado = fila.pagos.reduce((a, p) => a + Math.abs(p.monto), 0)
      if (!cli.meses[mes]) cli.meses[mes] = { monto: 0, pagado: 0, saldo: 0, cuotas: [] }
      cli.meses[mes].monto += fila.montoCLP
      cli.meses[mes].pagado += pagado
      cli.meses[mes].saldo += Math.max(0, fila.saldoPorCobrar)
      cli.meses[mes].cuotas.push({ id: c.id, tipo: c.tipo, numeroCuota: c.numeroCuota, montoUF: c.montoUF, montoCLP: fila.montoCLP, estado: c.estado, saldo: fila.saldoPorCobrar, migrada: fila.origenMigracion })
      cli.total += fila.montoCLP
      cli.pagado += pagado
      cli.saldo += Math.max(0, fila.saldoPorCobrar)
    }

    res.json({
      valorUF,
      meses,
      clientes: [...porCliente.values()].sort((a, b) => b.saldo - a.saldo),
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al armar la matriz de cuotas.' })
  }
}

/** Estado de cuenta de un cliente: sus cargos y abonos en orden, con saldo corriente. */
const detalleCliente = async (req, res) => {
  try {
    const contactoId = Number(req.params.contactoId)
    const contacto = await prisma.contacto.findUnique({
      where: { id: contactoId },
      select: { id: true, nombre: true, apellido: true, rut: true, email: true, telefono: true },
    })
    if (!contacto) return res.status(404).json({ error: 'Cliente no encontrado.' })

    const corte = req.query.corte ? new Date(req.query.corte) : new Date()
    const { filas, valorUF } = await leer({ planPago: { venta: { compradorId: contactoId } } })

    // El estado de cuenta se arma con TODAS las cuotas del cliente, pagadas incluidas: el
    // saldo corriente no se entiende si faltan los abonos que lo bajaron.
    const todas = await prisma.cuota.findMany({
      where: { planPago: { venta: { compradorId: contactoId } } },
      include: INCLUDE,
      orderBy: { fechaVencimiento: 'asc' },
    })

    const cuenta = estadoCuenta(todas.map((c) => aFila(c, valorUF)), corte)
    const antiguedad = agrupar(filas, corte)

    res.json({
      contacto,
      valorUF,
      corte,
      ...cuenta,
      porCobrar: antiguedad.total,
      vencido: antiguedad.vencido,
      tramos: antiguedad.clientes[0]?.tramos || null,
      cuotas: filas,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al armar el estado de cuenta.' })
  }
}

module.exports = { resumen, matriz, detalleCliente, leerCartera: leer }
