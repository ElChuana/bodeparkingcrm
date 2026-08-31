const { test } = require('node:test')
const assert = require('node:assert')
const { normalizarFormasPago, cuotasPactadas, resumenFormasPago } = require('../src/lib/formasPago')

test('sin formas la venta queda al contado', () => {
  const r = normalizarFormasPago([], 146.61)
  assert.strictEqual(r.ok, true)
  assert.deepStrictEqual(r.formas, [])
  assert.strictEqual(r.faltanteUF, 146.61)
  assert.strictEqual(resumenFormasPago({ formasPago: [] }), 'Al contado')
  assert.strictEqual(resumenFormasPago({}), 'Al contado')
})

test('acepta varias formas combinadas que calzan con el total', () => {
  const r = normalizarFormasPago([
    { forma: 'TRANSFERENCIA', montoUF: 50 },
    { forma: 'VALE_VISTA', montoUF: 96.61 },
  ], 146.61)
  assert.strictEqual(r.ok, true)
  assert.strictEqual(r.asignadoUF, 146.61)
  assert.strictEqual(r.faltanteUF, 0)
})

test('deja asignar de a poco: lo que falta no es error', () => {
  const r = normalizarFormasPago([{ forma: 'TARJETA', montoUF: 20 }], 100)
  assert.strictEqual(r.ok, true)
  assert.strictEqual(r.faltanteUF, 80)
})

test('rechaza que las formas sumen más que la venta', () => {
  const r = normalizarFormasPago([
    { forma: 'TRANSFERENCIA', montoUF: 100 },
    { forma: 'CUOTAS', montoUF: 60 },
  ], 146.61)
  assert.strictEqual(r.ok, false)
  assert.match(r.error, /suman 160,?\.00 UF|suman 160.00 UF/)
})

test('tolera el redondeo de 0,01 UF', () => {
  const r = normalizarFormasPago([{ forma: 'TRANSFERENCIA', montoUF: 146.615 }], 146.61)
  assert.strictEqual(r.ok, true)
})

test('rechaza formas repetidas, inválidas y montos negativos', () => {
  assert.strictEqual(normalizarFormasPago([{ forma: 'TARJETA' }, { forma: 'TARJETA' }], 100).ok, false)
  assert.strictEqual(normalizarFormasPago([{ forma: 'CRIPTO' }], 100).ok, false)
  assert.strictEqual(normalizarFormasPago([{ forma: 'TARJETA', montoUF: -1 }], 100).ok, false)
  assert.strictEqual(normalizarFormasPago('transferencia', 100).ok, false)
})

test('la cantidad de cuotas solo aplica a la forma CUOTAS', () => {
  assert.strictEqual(normalizarFormasPago([{ forma: 'CUOTAS', cuotas: 12 }], 100).ok, true)
  assert.strictEqual(normalizarFormasPago([{ forma: 'TARJETA', cuotas: 12 }], 100).ok, false)
  assert.strictEqual(normalizarFormasPago([{ forma: 'CUOTAS', cuotas: 0 }], 100).ok, false)
  assert.strictEqual(normalizarFormasPago([{ forma: 'CUOTAS', cuotas: 1.5 }], 100).ok, false)
})

test('acepta el formato corto (solo el nombre de la forma)', () => {
  const r = normalizarFormasPago(['TRANSFERENCIA', 'CUOTAS'], 100)
  assert.strictEqual(r.ok, true)
  assert.deepStrictEqual(r.formas.map(f => f.forma), ['TRANSFERENCIA', 'CUOTAS'])
  assert.strictEqual(r.asignadoUF, 0)
})

test('las cuotas salen del beneficio salvo que se pacte otra cantidad', () => {
  const venta = {
    formasPago: [{ forma: 'CUOTAS' }],
    promociones: [{ promocion: { tipo: 'CUOTAS_SIN_INTERES', meses: 12 } }],
  }
  assert.strictEqual(cuotasPactadas(venta), 12)
  assert.strictEqual(resumenFormasPago(venta), '12 cuotas')

  const conOverride = { ...venta, formasPago: [{ forma: 'CUOTAS', cuotas: 6 }] }
  assert.strictEqual(cuotasPactadas(conOverride), 6)

  const beneficioLegacy = {
    formasPago: [{ forma: 'CUOTAS' }],
    beneficios: [{ beneficio: { tipo: 'CUOTAS_SIN_INTERES', meses: 24 } }],
  }
  assert.strictEqual(cuotasPactadas(beneficioLegacy), 24)
})

test('si el beneficio no trae meses, la cantidad se lee del nombre', () => {
  const venta = {
    formasPago: [{ forma: 'CUOTAS' }],
    promociones: [{ promocion: { tipo: 'CUOTAS_SIN_INTERES', nombre: 'Crédito directo 6 cuotas ', meses: null } }],
  }
  assert.strictEqual(cuotasPactadas(venta), 6)
  assert.strictEqual(resumenFormasPago(venta), '6 cuotas')
})

test('resumen combina formas legibles', () => {
  const venta = {
    formasPago: [{ forma: 'TRANSFERENCIA' }, { forma: 'CUOTAS' }],
    promociones: [{ promocion: { tipo: 'CUOTAS_SIN_INTERES', meses: 12 } }],
  }
  assert.strictEqual(resumenFormasPago(venta), 'Transferencia + 12 cuotas')
  assert.strictEqual(
    resumenFormasPago({ formasPago: [{ forma: 'VALE_VISTA' }, { forma: 'TARJETA' }] }),
    'Vale vista + Tarjeta'
  )
  // Cuotas sin beneficio ni cantidad pactada: se nombra la forma igual
  assert.strictEqual(resumenFormasPago({ formasPago: [{ forma: 'CUOTAS' }] }), 'Cuotas')
})
