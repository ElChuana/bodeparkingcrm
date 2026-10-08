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

test('una forma se puede pactar en pesos: se congela el equivalente en UF', () => {
  const r = normalizarFormasPago([
    { forma: 'TRANSFERENCIA', moneda: 'CLP', montoCLP: 5000000 },
    { forma: 'CUOTAS', montoUF: 20, cuotas: 12 },
  ], 200, 40000)
  assert.strictEqual(r.ok, true)
  const [pesos, uf] = r.formas
  assert.strictEqual(pesos.moneda, 'CLP')
  assert.strictEqual(pesos.montoCLP, 5000000)
  assert.strictEqual(pesos.valorUF, 40000)
  assert.strictEqual(pesos.montoUF, 125)   // 5.000.000 / 40.000
  assert.strictEqual(uf.moneda, 'UF')
  assert.strictEqual(uf.montoCLP, null)
  assert.strictEqual(r.asignadoUF, 145)
  assert.strictEqual(r.faltanteUF, 55)
})

test('lo pactado en pesos también cuadra contra el total de la venta', () => {
  const r = normalizarFormasPago([{ forma: 'VALE_VISTA', moneda: 'CLP', montoCLP: 9000000 }], 200, 40000)
  assert.strictEqual(r.ok, false)  // 225 UF > 200 UF
  assert.match(r.error, /225\.00 UF/)
})

test('sin UF cargada no se puede pactar en pesos', () => {
  const r = normalizarFormasPago([{ forma: 'TARJETA', moneda: 'CLP', montoCLP: 100000 }], 200, null)
  assert.strictEqual(r.ok, false)
  assert.match(r.error, /valor de la UF/i)
  // Sin monto todavía no hace falta la UF: se puede marcar la forma y llenar después
  assert.strictEqual(normalizarFormasPago([{ forma: 'TARJETA', moneda: 'CLP' }], 200, null).ok, true)
})

test('rechaza monedas inválidas y montos en pesos negativos', () => {
  assert.strictEqual(normalizarFormasPago([{ forma: 'TARJETA', moneda: 'USD', montoCLP: 10 }], 200, 40000).ok, false)
  assert.strictEqual(normalizarFormasPago([{ forma: 'TARJETA', moneda: 'CLP', montoCLP: -5 }], 200, 40000).ok, false)
})

test('por defecto la forma sigue siendo en UF', () => {
  const r = normalizarFormasPago([{ forma: 'TRANSFERENCIA', montoUF: 50 }], 200)
  assert.strictEqual(r.formas[0].moneda, 'UF')
  assert.strictEqual(r.formas[0].montoUF, 50)
  assert.strictEqual(normalizarFormasPago(['CUOTAS'], 200).formas[0].moneda, 'UF')
})

// ─── destino: qué parte del precio cubre cada forma ──────────────
test('la forma Cuotas siempre queda como saldo, aunque manden otra cosa', () => {
  const r = normalizarFormasPago([
    { forma: 'CUOTAS', destino: 'PIE', montoUF: 50, cuotas: 5 },
  ], 50)
  assert.strictEqual(r.ok, true)
  assert.strictEqual(r.formas[0].destino, 'SALDO')
})

test('sin destino explícito la forma queda al contado', () => {
  const r = normalizarFormasPago([{ forma: 'TRANSFERENCIA', montoUF: 100 }], 100)
  assert.strictEqual(r.formas[0].destino, 'CONTADO')
  assert.strictEqual(r.contadoUF, 100)
  assert.strictEqual(r.pieUF, 0)
})

test('separa pie, contado y saldo en el total', () => {
  const r = normalizarFormasPago([
    { forma: 'TRANSFERENCIA', destino: 'PIE', montoUF: 20 },
    { forma: 'VALE_VISTA', destino: 'CONTADO', montoUF: 30 },
    { forma: 'CUOTAS', montoUF: 50, cuotas: 5 },
  ], 100)
  assert.strictEqual(r.ok, true)
  assert.strictEqual(r.pieUF, 20)
  assert.strictEqual(r.contadoUF, 30)
  assert.strictEqual(r.saldoUF, 50)
})

test('rechaza un destino que no existe', () => {
  const r = normalizarFormasPago([{ forma: 'TRANSFERENCIA', destino: 'ANTICIPO', montoUF: 10 }], 100)
  assert.strictEqual(r.ok, false)
  assert.match(r.error, /Destino inválido/)
})

test('el resumen nombra el pie como pie', () => {
  assert.strictEqual(resumenFormasPago({
    formasPago: [
      { forma: 'TRANSFERENCIA', destino: 'PIE' },
      { forma: 'CUOTAS', destino: 'SALDO', cuotas: 6 },
    ],
  }), 'Pie por transferencia + 6 cuotas')
  assert.strictEqual(resumenFormasPago({
    formasPago: [{ forma: 'TRANSFERENCIA', destino: 'CONTADO' }],
  }), 'Transferencia')
})
