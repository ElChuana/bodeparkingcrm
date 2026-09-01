const { test } = require('node:test')
const assert = require('node:assert')
const { crearConciliacionSegura, ImputacionExcedida } = require('../src/lib/imputacion')

/** Un Prisma de mentira con un movimiento, una factura de compra, un documento y las conciliaciones que ya existen. */
function base({ montoMov = -794920, totalFac = 794920, doc = null, existentes = [] } = {}) {
  const creadas = []
  return {
    creadas,
    movimientoBanco: { findUnique: async () => ({ monto: montoMov }) },
    facturaCompra: { findUnique: async () => ({ total: totalFac }) },
    documentoInterno: { findUnique: async () => doc },
    conciliacion: {
      findMany: async ({ where }) => existentes.filter((c) =>
        (where.movimientoId ? c.movimientoId === where.movimientoId : true)
        && (where.facturaCompraId ? c.facturaCompraId === where.facturaCompraId : true)
        && (where.documentoInternoId ? c.documentoInternoId === where.documentoInternoId : true)),
      create: async ({ data }) => { creadas.push(data); return { id: creadas.length, ...data } },
    },
  }
}

// El caso real que motivó la guarda: un documento de $794.920 con $992.347 imputados en tres pagos.
test('rechaza el tercer pago que sobrepasa el total del documento', async () => {
  const db = base({
    existentes: [
      { movimientoId: 1, facturaCompraId: 47, monto: 500000 },
      { movimientoId: 2, facturaCompraId: 47, monto: 294920 },
    ],
  })
  await assert.rejects(
    () => crearConciliacionSegura(db, { data: { movimientoId: 3, facturaCompraId: 47, monto: 197427 } }),
    (e) => e instanceof ImputacionExcedida && /documento le quedan \$0/.test(e.message),
  )
  assert.strictEqual(db.creadas.length, 0)
})

test('rechaza imputar más que el monto del movimiento', async () => {
  const db = base({ montoMov: -100000, totalFac: 5000000 })
  await assert.rejects(
    () => crearConciliacionSegura(db, { data: { movimientoId: 9, facturaCompraId: 47, monto: 150000 } }),
    (e) => e instanceof ImputacionExcedida && /movimiento le quedan/.test(e.message),
  )
})

test('un documento interno en pesos limita lo que cabe', async () => {
  const db = base({ montoMov: -600000, doc: { montoCLP: 400000, montoUF: null } })
  await assert.rejects(
    () => crearConciliacionSegura(db, { data: { movimientoId: 1, documentoInternoId: 8, monto: 500000 } }),
    ImputacionExcedida,
  )
  await crearConciliacionSegura(db, { data: { movimientoId: 1, documentoInternoId: 8, monto: 400000 } })
  assert.strictEqual(db.creadas.length, 1)
})

test('un documento en UF limita con la UF entregada, y sin UF solo limita el movimiento', async () => {
  // 10 UF × $40.000 = $400.000: con la UF, imputar $500.000 se rechaza.
  const conUF = base({ montoMov: -600000, doc: { montoCLP: null, montoUF: 10 } })
  await assert.rejects(
    () => crearConciliacionSegura(conUF, { data: { movimientoId: 1, documentoInternoId: 8, monto: 500000 } }, { valorUF: 40000 }),
    ImputacionExcedida,
  )
  // Sin UF disponible no hay tope de documento (el del movimiento sigue en pie).
  const sinUF = base({ montoMov: -600000, doc: { montoCLP: null, montoUF: 10 } })
  await crearConciliacionSegura(sinUF, { data: { movimientoId: 1, documentoInternoId: 8, monto: 500000 } })
  assert.strictEqual(sinUF.creadas.length, 1)
})

test('un monto cero o negativo no se imputa', async () => {
  await assert.rejects(() => crearConciliacionSegura(base(), { data: { movimientoId: 1, facturaCompraId: 47, monto: 0 } }), ImputacionExcedida)
})

test('a cuenta de un cliente (sin documento) solo se limita por el movimiento', async () => {
  const db = base({ montoMov: 250000 })
  await crearConciliacionSegura(db, { data: { movimientoId: 1, contactoId: 5, monto: 250000 } })
  assert.strictEqual(db.creadas.length, 1)
})
