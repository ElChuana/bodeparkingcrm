const { test } = require('node:test')
const assert = require('node:assert')
const { calcularTotalesVenta, prorratearPrecioVenta, verificarCuadratura } = require('../src/lib/precios')

// Tolerancia para el redondeo a 6 decimales del prorrateo.
const TOL = 0.01
const cerca = (a, b, tol = TOL) => Math.abs(a - b) <= tol

test('calcularTotalesVenta: suma lista y resta descuentos', () => {
  const t = calcularTotalesVenta({
    items: [{ precioListaUF: 109 }, { precioListaUF: 102 }],
    packs: [{ descuentoAplicadoUF: 20 }],
    promociones: [{ descuentoAplicadoUF: 12.586963 }],
    descuentoAprobadoUF: 0,
  })
  assert.strictEqual(t.precioListaUF, 211)
  // packs y promos se consolidan en descuentoPacksUF
  assert.strictEqual(t.descuentoPacksUF, 32.586963)
  assert.ok(cerca(t.precioFinalUF, 178.413037))
})

test('calcularTotalesVenta: sin items ni descuentos da todo en cero', () => {
  const t = calcularTotalesVenta()
  assert.deepStrictEqual(t, { precioListaUF: 0, descuentoPacksUF: 0, descuentoAprobadoUF: 0, precioFinalUF: 0 })
})

test('calcularTotalesVenta: el precio final nunca queda negativo', () => {
  const t = calcularTotalesVenta({
    items: [{ precioListaUF: 100 }],
    descuentoAprobadoUF: 500,
  })
  assert.strictEqual(t.precioFinalUF, 0)
})

test('prorrateo: la suma de precioVentaUF reconstruye el precio final', () => {
  // Invariante central: es el descuadre que rompió la venta 123.
  const items = [
    { unidadId: 1, precioListaUF: 109 },
    { unidadId: 2, precioListaUF: 102 },
  ]
  const { precioFinalUF } = calcularTotalesVenta({ items, packs: [{ descuentoAplicadoUF: 32.586963 }] })
  const rep = prorratearPrecioVenta(items, precioFinalUF)
  const suma = rep.reduce((s, r) => s + r.precioVentaUF, 0)
  assert.ok(cerca(suma, precioFinalUF), `suma ${suma} != final ${precioFinalUF}`)
})

test('prorrateo: todas las unidades quedan con el mismo % de descuento', () => {
  const items = [
    { unidadId: 1, precioListaUF: 149 },
    { unidadId: 2, precioListaUF: 139 },
  ]
  const precioFinalUF = 278 // 288 lista - 10 de descuento
  const rep = prorratearPrecioVenta(items, precioFinalUF)
  const ratios = rep.map((r, k) => r.precioVentaUF / items[k].precioListaUF)
  assert.ok(cerca(ratios[0], ratios[1], 1e-6), `ratios distintos: ${ratios}`)
})

test('prorrateo: una sola unidad se lleva todo el precio final', () => {
  const items = [{ unidadId: 39, precioListaUF: 109 }]
  const rep = prorratearPrecioVenta(items, 85.445414)
  assert.strictEqual(rep.length, 1)
  assert.ok(cerca(rep[0].precioVentaUF, 85.445414))
})

test('prorrateo: sin precio de lista cae al lista de cada unidad (no divide por cero)', () => {
  const items = [{ unidadId: 1, precioListaUF: 0 }, { unidadId: 2, precioListaUF: 0 }]
  const rep = prorratearPrecioVenta(items, 100)
  assert.deepStrictEqual(rep.map(r => r.precioVentaUF), [0, 0])
})

test('prorrateo: descuento del 100% deja todas las unidades en cero', () => {
  const items = [{ unidadId: 1, precioListaUF: 50 }, { unidadId: 2, precioListaUF: 70 }]
  const rep = prorratearPrecioVenta(items, 0)
  assert.deepStrictEqual(rep.map(r => r.precioVentaUF), [0, 0])
})

test('prorrateo: sirve para 3+ unidades', () => {
  const items = [
    { unidadId: 1, precioListaUF: 92 },
    { unidadId: 2, precioListaUF: 93 },
    { unidadId: 3, precioListaUF: 95 },
  ]
  const precioFinalUF = 250
  const rep = prorratearPrecioVenta(items, precioFinalUF)
  const suma = rep.reduce((s, r) => s + r.precioVentaUF, 0)
  assert.ok(cerca(suma, precioFinalUF), `suma ${suma}`)
})

test('verificarCuadratura: detecta una venta sana', () => {
  const r = verificarCuadratura({
    precioListaUF: 288,
    precioFinalUF: 278,
    unidades: [
      { precioUF: 149, precioVentaUF: 143.826389 },
      { precioUF: 139, precioVentaUF: 134.173611 },
    ],
  })
  assert.strictEqual(r.ok, true)
})

test('verificarCuadratura: detecta el descuadre de la venta 123 (falta una unidad)', () => {
  // Cabecera con el precio de 2 bodegas pero solo 1 unidad vinculada.
  const r = verificarCuadratura({
    precioListaUF: 211,
    precioFinalUF: 178.413037,
    unidades: [{ precioUF: 109, precioVentaUF: 109 }],
  })
  assert.strictEqual(r.ok, false)
  assert.ok(Math.abs(r.diffLista - 102) < 1e-6, `diffLista=${r.diffLista}`)
})

test('verificarCuadratura: detecta el descuadre de la venta 100 (catálogo editado)', () => {
  // El descuento se aplicó bajando el precioUF del catálogo (149 → 139).
  const r = verificarCuadratura({
    precioListaUF: 298,
    precioFinalUF: 288,
    unidades: [
      { precioUF: 149, precioVentaUF: 149 },
      { precioUF: 139, precioVentaUF: 139 },
    ],
  })
  assert.strictEqual(r.ok, false)
  assert.ok(Math.abs(r.diffLista - 10) < 1e-6, `diffLista=${r.diffLista}`)
})

test('flujo completo: cotización → venta queda cuadrada', () => {
  const items = [
    { unidadId: 1, precioListaUF: 109 },
    { unidadId: 2, precioListaUF: 102 },
  ]
  const totales = calcularTotalesVenta({ items, packs: [{ descuentoAplicadoUF: 32.586963 }] })
  const rep = prorratearPrecioVenta(items, totales.precioFinalUF)
  const unidades = items.map((i, k) => ({ precioUF: i.precioListaUF, precioVentaUF: rep[k].precioVentaUF }))
  const chk = verificarCuadratura({ ...totales, unidades })
  assert.strictEqual(chk.ok, true, `diffLista=${chk.diffLista} diffVenta=${chk.diffVenta}`)
})

// Regresión (ago-2026): Prisma devuelve los campos @db.Decimal como objetos, no
// como number. Sumarlos con `+` los concatenaba como texto y el total de una
// cotización de 2+ unidades salía absurdo (5 bodegas → "78.889.511.869 UF").
test('calcularTotalesVenta: suma bien objetos Decimal de Prisma', () => {
  const { Decimal } = require('@prisma/client/runtime/library')
  const t = calcularTotalesVenta({
    items: [{ precioListaUF: new Decimal('95.24') }, { precioListaUF: new Decimal('95.24') }],
    promociones: [{ descuentoAplicadoUF: new Decimal('44.07683') }, { descuentoAplicadoUF: new Decimal('5') }],
    descuentoAprobadoUF: new Decimal('0'),
  })
  assert.ok(cerca(t.precioListaUF, 190.48), `precioListaUF concatenado: ${t.precioListaUF}`)
  assert.ok(cerca(t.precioFinalUF, 141.40317), `precioFinalUF erróneo: ${t.precioFinalUF}`)
})

test('num(): convierte Decimal, string, null y undefined a number', () => {
  const { num } = require('../src/lib/precios')
  const { Decimal } = require('@prisma/client/runtime/library')
  assert.strictEqual(num(new Decimal('12.5')), 12.5)
  assert.strictEqual(num('12.5'), 12.5)
  assert.strictEqual(num(null), 0)
  assert.strictEqual(num(undefined), 0)
})
