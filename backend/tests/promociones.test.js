const { test } = require('node:test')
const assert = require('node:assert')
const { Decimal } = require('@prisma/client/runtime/library')
const { calcularDescuentoPromocion } = require('../src/lib/promociones')
const { calcularTotalesVenta } = require('../src/lib/precios')

const cerca = (a, b, tol = 0.01) => Math.abs(a - b) <= tol

// ── Datos reales del Webinar Agosto 2026 (scripts/seed-webinar-ago2026.js) ──
const UF = 40846.11

// Promo por-unidad con precio objetivo en pesos: Obispo Salas ENTRY.
// Lista (ancla) 95,24 UF ≈ $3.890.000 → precio webinar $2.990.000.
const ENTRY = {
  categoria: 'DESCUENTO', tipo: 'DESCUENTO_UF',
  valorUF: new Decimal('22.04'), precioObjetivoPesos: new Decimal('2990000'),
  minUnidades: null,
  unidades: [{ unidadId: 105 }, { unidadId: 106 }, { unidadId: 41 }],
}
// Segunda unidad: −$200.000 (fijados en UF con la UF del seed) + Gastos
// Operacionales de regalo. Monto fijo por volumen, sin unidades asociadas.
const DTO_SEGUNDA_UF = 4.896427 // = $200.000 / 40.846,11
const SEGUNDA_UNIDAD = {
  categoria: 'DESCUENTO', tipo: 'DESCUENTO_UF',
  valorUF: new Decimal(String(DTO_SEGUNDA_UF)), precioObjetivoPesos: null, minUnidades: 2, unidades: [],
}
const item = (unidadId, precio) => ({ unidadId, precioListaUF: new Decimal(String(precio)) })

test('precio webinar: el descuento por unidad deja el precio final EXACTO en pesos', () => {
  const items = [item(105, 95.24)]
  const { descuento, porUnidad } = calcularDescuentoPromocion(ENTRY, items, UF)

  const finalUF = 95.24 - descuento
  assert.ok(cerca(finalUF * UF, 2990000, 1), `el precio final fue $${Math.round(finalUF * UF)}`)
  assert.ok(cerca(porUnidad[105], descuento), 'el detalle por unidad debe cuadrar con el total')
})

test('precio webinar: el precio en $ no se corre cuando cambia la UF', () => {
  // Misma unidad, UF de junio vs UF de agosto: el descuento cambia, el precio en $ no.
  for (const uf of [40784.98, 40846.11, 41500]) {
    const { descuento } = calcularDescuentoPromocion(ENTRY, [item(105, 95.24)], uf)
    assert.ok(cerca((95.24 - descuento) * uf, 2990000, 1), `con UF ${uf} el precio final se corrió`)
  }
})

test('precio webinar: solo descuenta las unidades asociadas a la promo', () => {
  // 105 es ENTRY; 999 (una Aldunate cualquiera) no está en la promo y no se toca.
  const items = [item(105, 95.24), item(999, 122.17)]
  const { descuento, porUnidad } = calcularDescuentoPromocion(ENTRY, items, UF)

  assert.ok(porUnidad[105] > 0)
  assert.strictEqual(porUnidad[999], undefined, 'descontó una unidad que no es de la promo')
  assert.ok(cerca(descuento, porUnidad[105]))
})

test('precio webinar: el descuento se aplica a CADA unidad de la promo presente', () => {
  const { descuento, porUnidad } = calcularDescuentoPromocion(ENTRY, [item(105, 95.24), item(106, 95.24)], UF)
  assert.ok(cerca(descuento, porUnidad[105] + porUnidad[106]))
  assert.ok(cerca(descuento, 44.076830), `descuento total ${descuento}`)
})

test('segunda unidad: no aplica con 1 unidad y aplica desde 2', () => {
  assert.strictEqual(calcularDescuentoPromocion(SEGUNDA_UNIDAD, [item(105, 95.24)], UF).descuento, 0)
  const dos = calcularDescuentoPromocion(SEGUNDA_UNIDAD, [item(105, 95.24), item(106, 95.24)], UF)
  assert.ok(cerca(dos.descuento * UF, 200000, 1), `el descuento fue $${Math.round(dos.descuento * UF)}`)
  // Es un monto fijo, no por unidad: con 4 unidades sigue siendo −$200.000.
  const cuatro = [item(105, 95.24), item(106, 95.24), item(41, 95.24), item(42, 95.24)]
  assert.strictEqual(calcularDescuentoPromocion(SEGUNDA_UNIDAD, cuatro, UF).descuento, dos.descuento)
})

test('segunda unidad no ensucia el tachado por unidad (es descuento de volumen)', () => {
  const { porUnidad } = calcularDescuentoPromocion(SEGUNDA_UNIDAD, [item(105, 95.24), item(106, 95.24)], UF)
  assert.deepStrictEqual(porUnidad, {})
})

test('escenario completo del webinar: 2 bodegas ENTRY + segunda unidad = $5.780.000', () => {
  const items = [item(105, 95.24), item(106, 95.24)]
  const entry = calcularDescuentoPromocion(ENTRY, items, UF)
  const segunda = calcularDescuentoPromocion(SEGUNDA_UNIDAD, items, UF)

  const t = calcularTotalesVenta({
    items,
    promociones: [{ descuentoAplicadoUF: entry.descuento }, { descuentoAplicadoUF: segunda.descuento }],
  })

  assert.ok(cerca(t.precioListaUF, 190.48))
  assert.ok(cerca(t.precioFinalUF, 141.506743), `precioFinalUF ${t.precioFinalUF}`)
  // 2 × $2.990.000 − $200.000
  assert.ok(cerca(t.precioFinalUF * UF, 5780000, 2), `total $${Math.round(t.precioFinalUF * UF)} ≠ $5.780.000`)
})

test('beneficios (categoría BENEFICIO) nunca bajan el precio', () => {
  const go = { categoria: 'BENEFICIO', tipo: 'OTRO', valorUF: new Decimal('99'), unidades: [] }
  assert.deepStrictEqual(calcularDescuentoPromocion(go, [item(105, 95.24)], UF), { descuento: 0, porUnidad: {} })
})

test('sin UF vigente cae al valorUF de la promo (no rompe ni descuenta de más)', () => {
  const { descuento } = calcularDescuentoPromocion(ENTRY, [item(105, 95.24)], null)
  assert.strictEqual(descuento, 22.04, 'debe usar el valorUF fijo como fallback')
})

test('el descuento nunca deja el precio bajo cero', () => {
  // Unidad más barata que el objetivo: el descuento se corta en 0, no queda negativo.
  const { descuento } = calcularDescuentoPromocion(ENTRY, [item(105, 50)], UF)
  assert.strictEqual(descuento, 0)
})

test('DESCUENTO_PORCENTAJE: aplica sobre la base y respeta minUnidades', () => {
  const promo = { categoria: 'DESCUENTO', tipo: 'DESCUENTO_PORCENTAJE', valorPorcentaje: 10, minUnidades: 2, unidades: [] }
  assert.strictEqual(calcularDescuentoPromocion(promo, [item(105, 100)], UF).descuento, 0)
  assert.strictEqual(calcularDescuentoPromocion(promo, [item(105, 100), item(106, 100)], UF).descuento, 20)
})

test('PAQUETE: precio cerrado solo si están TODAS las unidades del pack', () => {
  const promo = {
    categoria: 'DESCUENTO', tipo: 'PAQUETE', valorUF: new Decimal('150'),
    unidades: [{ unidadId: 105 }, { unidadId: 106 }],
  }
  assert.strictEqual(calcularDescuentoPromocion(promo, [item(105, 95.24)], UF).descuento, 0)
  // 190,48 lista − 150 de precio cerrado
  const completo = calcularDescuentoPromocion(promo, [item(105, 95.24), item(106, 95.24)], UF)
  assert.ok(cerca(completo.descuento, 40.48))
})
