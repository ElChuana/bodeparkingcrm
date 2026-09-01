/**
 * El documento interno — el "documento ficticio" que sostiene la conciliación.
 *
 * Dos tipos, dos historias:
 *
 *   · PROVISION — "sé que me van a facturar tal fecha tal cosa". Nace de un gasto
 *     programado (el cron la genera cada período) o a mano, con monto aproximado
 *     (usualmente en UF) y fecha esperada. Cuando llega la factura real se ASOCIA
 *     (facturaCompraId) y cuando el banco muestra el pago se concilia. Si la fecha pasó
 *     y no hay factura, el sistema avisa: "no te han facturado".
 *
 *   · RESPALDO — plata que ya se movió y nunca tendrá DTE: la notaría, una comisión
 *     bancaria, un pago entre particulares. Se crea desde el movimiento y se concilia
 *     al tiro. No es un documento tributario: no entra a ningún libro del SII.
 *
 * El ESTADO nunca se guarda: se calcula acá, con una sola regla para todo el ERP.
 */

const { ocurrencias, claveMes, fechaEnMes } = require('./gastosProgramados')

const num = (v) => Number(v ?? 0)

/** El monto del documento en pesos, con la UF entregada si está pactado en UF. */
function montoCLPDocumento(doc, valorUF) {
  if (num(doc.montoCLP) > 0) return num(doc.montoCLP)
  return Math.round(num(doc.montoUF) * (Number(valorUF) || 0))
}

/**
 * Cuánto de este documento ya está respaldado por plata del banco.
 * Cuenta las conciliaciones propias Y las de su factura asociada: cuando la factura
 * llegó, el pago se imputa a ella — es el mismo gasto, no dos.
 */
function pagadoDocumento(doc) {
  const propio = (doc.conciliaciones || []).reduce((a, c) => a + Math.abs(num(c.monto)), 0)
  const porFactura = (doc.facturaCompra?.conciliaciones || []).reduce((a, c) => a + Math.abs(num(c.monto)), 0)
  return propio + porFactura
}

/** Lo que le falta por pagar, en pesos (0 si está en UF y no se entregó valorUF). */
function saldoDocumento(doc, valorUF) {
  return montoCLPDocumento(doc, valorUF) - pagadoDocumento(doc)
}

const TOLERANCIA = 1000

/**
 * El estado calculado. Necesita el doc con `conciliaciones` y, si tiene factura
 * asociada, `facturaCompra.conciliaciones`.
 *
 *   ESPERADO            — sin factura y sin pago, fecha aún no llega (o RESPALDO sin pago)
 *   VENCIDO_SIN_FACTURA — provisión cuya fecha pasó sin factura asociada → "no te han facturado"
 *   FACTURADO_SIN_PAGO  — la factura llegó, el banco todavía no muestra el pago
 *   PAGADO_SIN_FACTURA  — el banco ya pagó, la factura no ha llegado
 *   CERRADO             — factura y pago (una PROVISION), o pago completo (un RESPALDO)
 */
function estadoDocumento(doc, { valorUF = 0, ahora = new Date() } = {}) {
  const total = montoCLPDocumento(doc, valorUF)
  const pagado = pagadoDocumento(doc)
  const estaPagado = total > 0 ? pagado >= total - TOLERANCIA : pagado > 0
  const tieneFactura = Boolean(doc.facturaCompraId || doc.facturaCompra)

  if (doc.tipo === 'RESPALDO') return estaPagado ? 'CERRADO' : 'ESPERADO'

  if (tieneFactura && estaPagado) return 'CERRADO'
  if (tieneFactura) return 'FACTURADO_SIN_PAGO'
  if (estaPagado) return 'PAGADO_SIN_FACTURA'
  if (doc.fechaEsperada && new Date(doc.fechaEsperada) < ahora) return 'VENCIDO_SIN_FACTURA'
  return 'ESPERADO'
}

/** Días desde la fecha esperada (0 si aún no llega). */
function diasVencido(doc, ahora = new Date()) {
  if (!doc.fechaEsperada) return 0
  return Math.max(0, Math.floor((ahora - new Date(doc.fechaEsperada)) / 86400000))
}

const conEstado = (doc, opts) => ({
  ...doc,
  estado: estadoDocumento(doc, opts),
  pagado: pagadoDocumento(doc),
  diasVencido: diasVencido(doc, opts?.ahora),
})

/**
 * Qué provisiones FALTA generar para una lista de gastos programados, dentro de una
 * ventana. Es la parte pura del cron: recibe las claves que ya existen y devuelve los
 * datos de los DocumentoInterno por crear. El `@@unique([gastoProgramadoId, periodo])`
 * de la base es la segunda línea de defensa contra duplicados.
 *
 * @param {Array} gastos  activos, con cuentaId/proveedorId
 * @param {Date} desde
 * @param {Date} hasta
 * @param {Set<string>} existentes  claves `${gastoId}|${periodo}` ya generadas
 */
function provisionesFaltantes(gastos, desde, hasta, existentes = new Set()) {
  const salida = []
  for (const g of gastos) {
    for (const o of ocurrencias(g, desde, hasta)) {
      if (existentes.has(`${g.id}|${o.periodo}`)) continue
      salida.push({
        tipo: 'PROVISION',
        lado: 'GASTO',
        descripcion: g.nombre,
        fechaEsperada: o.fecha,
        montoUF: g.montoUF ?? null,
        montoCLP: g.montoCLP ?? null,
        cuentaId: g.cuentaId ?? null,
        proveedorId: g.proveedorId ?? null,
        gastoProgramadoId: g.id,
        periodo: o.periodo,
      })
    }
  }
  return salida
}

module.exports = {
  montoCLPDocumento,
  pagadoDocumento,
  saldoDocumento,
  estadoDocumento,
  diasVencido,
  conEstado,
  provisionesFaltantes,
  claveMes,
  fechaEnMes,
}
