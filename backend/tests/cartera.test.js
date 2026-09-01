const { test } = require('node:test')
const assert = require('node:assert')
const { tramo, diasAtraso, agrupar, estadoCuenta, TRAMOS } = require('../src/lib/cartera')

const AHORA = new Date('2026-08-27T12:00:00Z')
const dias = (n) => new Date(AHORA.getTime() - n * 86400000)

const cuota = (o = {}) => ({
  id: 1, contactoId: 1, comprador: 'Patricia Muñoz', ventaId: 10,
  fechaVencimiento: dias(45), saldoPorCobrar: 1000000, montoCLP: 1000000, ...o,
})

test('tramo: los cortes son 30/60/90 y los bordes caen donde deben', () => {
  assert.strictEqual(tramo(0), 'POR_VENCER')
  assert.strictEqual(tramo(-5), 'POR_VENCER')
  assert.strictEqual(tramo(1), 'D1_30')
  assert.strictEqual(tramo(30), 'D1_30')
  assert.strictEqual(tramo(31), 'D31_60')
  assert.strictEqual(tramo(60), 'D31_60')
  assert.strictEqual(tramo(61), 'D61_90')
  assert.strictEqual(tramo(90), 'D61_90')
  assert.strictEqual(tramo(91), 'D90_MAS')
})

test('diasAtraso: lo que no ha vencido da negativo', () => {
  assert.strictEqual(diasAtraso(dias(10), AHORA), 10)
  assert.ok(diasAtraso(new Date('2026-09-30'), AHORA) < 0)
})

test('agrupar: junta las cuotas del mismo cliente y suma por tramo', () => {
  const r = agrupar([
    cuota({ id: 1, fechaVencimiento: dias(10), saldoPorCobrar: 500000 }),
    cuota({ id: 2, fechaVencimiento: dias(45), saldoPorCobrar: 300000 }),
    cuota({ id: 3, fechaVencimiento: dias(-20), saldoPorCobrar: 200000 }),
  ], AHORA)

  assert.strictEqual(r.clientes.length, 1)
  const c = r.clientes[0]
  assert.strictEqual(c.total, 1000000)
  assert.strictEqual(c.tramos.D1_30, 500000)
  assert.strictEqual(c.tramos.D31_60, 300000)
  assert.strictEqual(c.tramos.POR_VENCER, 200000)
  // Lo vencido excluye lo que todavía no vence: es el número que se persigue.
  assert.strictEqual(c.vencido, 800000)
  assert.strictEqual(r.total, 1000000)
  assert.strictEqual(r.vencido, 800000)
})

test('agrupar: la suma de los tramos siempre cuadra con el total', () => {
  const r = agrupar([
    cuota({ id: 1, contactoId: 1, fechaVencimiento: dias(5), saldoPorCobrar: 111111 }),
    cuota({ id: 2, contactoId: 2, comprador: 'Otro', fechaVencimiento: dias(200), saldoPorCobrar: 222222 }),
    cuota({ id: 3, contactoId: 3, comprador: 'Tercero', fechaVencimiento: dias(70), saldoPorCobrar: 333333 }),
  ], AHORA)
  const suma = TRAMOS.reduce((a, t) => a + r.totales[t.clave], 0)
  assert.strictEqual(suma, r.total)
  assert.strictEqual(r.total, 666666)
})

test('agrupar: ordena por quién está peor, no por quién debe más', () => {
  // El punto del reporte: 3 millones con 100 días importan más que 8 que no han vencido.
  const r = agrupar([
    cuota({ id: 1, contactoId: 1, comprador: 'Debe mucho al día', fechaVencimiento: dias(-30), saldoPorCobrar: 8000000 }),
    cuota({ id: 2, contactoId: 2, comprador: 'Debe poco y podrido', fechaVencimiento: dias(100), saldoPorCobrar: 3000000 }),
  ], AHORA)
  assert.strictEqual(r.clientes[0].nombre, 'Debe poco y podrido')
  assert.strictEqual(r.clientes[0].peorTramo, 'D90_MAS')
  assert.strictEqual(r.clientes[0].diasMax, 100)
})

test('agrupar: lo que ya está cobrado no aparece', () => {
  const r = agrupar([cuota({ saldoPorCobrar: 0 }), cuota({ id: 2, saldoPorCobrar: -5 })], AHORA)
  assert.strictEqual(r.clientes.length, 0)
  assert.strictEqual(r.total, 0)
})

test('agrupar: mismo cliente con dos ventas queda en una sola fila', () => {
  const r = agrupar([
    cuota({ id: 1, ventaId: 10 }),
    cuota({ id: 2, ventaId: 22 }),
  ], AHORA)
  assert.strictEqual(r.clientes.length, 1)
  assert.strictEqual(r.clientes[0].cuotas.length, 2)
})

test('agrupar: la fecha de corte es un parámetro, no el reloj', () => {
  // Reproducibilidad: el mismo reporte pedido dos veces con el mismo corte da lo mismo.
  const filas = [cuota({ fechaVencimiento: new Date('2026-06-01'), saldoPorCobrar: 100 })]
  assert.strictEqual(agrupar(filas, new Date('2026-06-15')).clientes[0].peorTramo, 'D1_30')
  assert.strictEqual(agrupar(filas, new Date('2026-10-15')).clientes[0].peorTramo, 'D90_MAS')
})

test('estadoCuenta: el saldo corriente sube con la cuota y baja con el pago', () => {
  const r = estadoCuenta([
    { id: 1, numeroCuota: 1, ventaId: 10, fechaVencimiento: new Date('2026-01-05'), montoCLP: 1000000,
      pagos: [{ fecha: new Date('2026-01-07'), monto: 400000, glosa: 'TEF' }] },
    { id: 2, numeroCuota: 2, ventaId: 10, fechaVencimiento: new Date('2026-02-05'), montoCLP: 1000000, pagos: [] },
  ])
  assert.deepStrictEqual(r.lineas.map((l) => l.saldo), [1000000, 600000, 1600000])
  assert.strictEqual(r.saldoFinal, 1600000)
})

test('estadoCuenta: un cargo y un abono del mismo día dejan primero el cargo', () => {
  const r = estadoCuenta([
    { id: 1, numeroCuota: 1, fechaVencimiento: new Date('2026-03-01'), montoCLP: 500000,
      pagos: [{ fecha: new Date('2026-03-01'), monto: 500000 }] },
  ])
  assert.strictEqual(r.lineas[0].tipo, 'CARGO')
  assert.strictEqual(r.saldoFinal, 0)
})
