/**
 * La guarda de capacidad: cada peso se imputa una sola vez, verificado contra la base.
 *
 * Los invariantes del diseño (Σ conciliaciones ≤ |movimiento| y ≤ total del documento)
 * se cumplían "por construcción" en cada camino que crea una conciliación… hasta que uno
 * los rompió: una corrida automática calculaba el monto contra un saldo en memoria que no
 * se actualizaba, y un documento terminó con más pagado que su total. Un invariante que
 * depende de que todos los callers se porten bien no es un invariante: es una esperanza.
 *
 * `crearConciliacionSegura` es un reemplazo directo de `prisma.conciliacion.create` que
 * primero lee lo ya imputado y rechaza lo que sobrepase. Todo camino que crea una
 * conciliación pasa por acá.
 *
 * El tope del lado del documento aplica a la factura de compra (total en pesos) y al
 * documento interno (montoCLP; si está solo en UF se convierte con `valorUF` cuando se
 * entrega — sin UF no hay tope de documento, pero el tope del movimiento sigue en pie).
 * Cuotas, pagos de arriendo y "a cuenta" no tienen tope propio acá: sus montos viven en UF
 * y sus reglas las valida el controlador con la UF del día.
 */

const TOLERANCIA_PESOS = 1

class ImputacionExcedida extends Error {
  constructor(motivo, detalle = {}) {
    super(motivo)
    this.name = 'ImputacionExcedida'
    this.status = 400
    this.detalle = detalle
  }
}

const num = (v) => Number(v ?? 0)
const abs = (v) => Math.abs(num(v))

/** Cuánto cabe todavía en un movimiento y en el documento destino. Lee la base, no memoria. */
async function capacidad(cliente, { movimientoId, facturaCompraId = null, documentoInternoId = null }, { valorUF = null } = {}) {
  const [mov, imputadoMov] = await Promise.all([
    cliente.movimientoBanco.findUnique({ where: { id: movimientoId }, select: { monto: true } }),
    cliente.conciliacion.findMany({ where: { movimientoId }, select: { monto: true } }),
  ])
  if (!mov) throw new ImputacionExcedida('El movimiento no existe.', { movimientoId })
  const restaMovimiento = abs(mov.monto) - imputadoMov.reduce((a, c) => a + abs(c.monto), 0)

  let restaDocumento = Infinity
  let documento = null
  if (facturaCompraId) {
    const [f, cs] = await Promise.all([
      cliente.facturaCompra.findUnique({ where: { id: facturaCompraId }, select: { total: true } }),
      cliente.conciliacion.findMany({ where: { facturaCompraId }, select: { monto: true } }),
    ])
    if (!f) throw new ImputacionExcedida('La factura de compra no existe.', { facturaCompraId })
    restaDocumento = num(f.total) - cs.reduce((a, c) => a + abs(c.monto), 0)
    documento = { tipo: 'facturaCompra', id: facturaCompraId }
  } else if (documentoInternoId) {
    const [d, cs] = await Promise.all([
      cliente.documentoInterno.findUnique({ where: { id: documentoInternoId }, select: { montoCLP: true, montoUF: true } }),
      cliente.conciliacion.findMany({ where: { documentoInternoId }, select: { monto: true } }),
    ])
    if (!d) throw new ImputacionExcedida('El documento interno no existe.', { documentoInternoId })
    const totalCLP = num(d.montoCLP) > 0
      ? num(d.montoCLP)
      : (num(d.montoUF) > 0 && num(valorUF) > 0 ? Math.round(num(d.montoUF) * num(valorUF)) : null)
    if (totalCLP != null) {
      restaDocumento = totalCLP - cs.reduce((a, c) => a + abs(c.monto), 0)
      documento = { tipo: 'documentoInterno', id: documentoInternoId }
    }
  }
  return { restaMovimiento, restaDocumento, documento }
}

/**
 * Drop-in de `cliente.conciliacion.create({ data })`, con la verificación antes de escribir.
 * Con un `tx` de Prisma la lectura y la escritura quedan en la misma transacción.
 * `opciones.valorUF` habilita el tope de un documento interno pactado en UF.
 */
async function crearConciliacionSegura(cliente, { data, ...resto }, opciones = {}) {
  const monto = abs(data.monto)
  if (!(monto > 0)) throw new ImputacionExcedida('El monto a imputar tiene que ser mayor que cero.')

  const cap = await capacidad(cliente, data, opciones)
  if (monto > cap.restaMovimiento + TOLERANCIA_PESOS) {
    throw new ImputacionExcedida(
      `Al movimiento le quedan $${Math.round(Math.max(0, cap.restaMovimiento)).toLocaleString('es-CL')} sin imputar y se intentó imputar $${Math.round(monto).toLocaleString('es-CL')}.`,
      { movimientoId: data.movimientoId, resta: cap.restaMovimiento, monto },
    )
  }
  if (monto > cap.restaDocumento + TOLERANCIA_PESOS) {
    throw new ImputacionExcedida(
      `Al documento le quedan $${Math.round(Math.max(0, cap.restaDocumento)).toLocaleString('es-CL')} por pagar y se intentó imputar $${Math.round(monto).toLocaleString('es-CL')}.`,
      { ...cap.documento, resta: cap.restaDocumento, monto },
    )
  }
  return cliente.conciliacion.create({ data, ...resto })
}

module.exports = { crearConciliacionSegura, capacidad, ImputacionExcedida, TOLERANCIA_PESOS }
