const { test } = require('node:test')
const assert = require('node:assert')
const {
  ESTADOS_ABIERTOS, whereVencida, estaVencida, estadoEfectivo, diasDeAtraso,
} = require('../src/lib/cuotas')

// La regla de "cuota vencida" estaba escrita seis veces con criterios distintos y el
// estado ATRASADO se persistía desde un GET. Estos tests fijan el criterio único.

const AHORA = new Date('2026-08-27T12:00:00Z')
const cuota = (o = {}) => ({ estado: 'PENDIENTE', fechaVencimiento: new Date('2026-08-01'), ...o })

test('estaVencida: pendiente con vencimiento pasado', () => {
  assert.strictEqual(estaVencida(cuota(), AHORA), true)
})

test('estaVencida: pendiente con vencimiento futuro no está vencida', () => {
  assert.strictEqual(estaVencida(cuota({ fechaVencimiento: new Date('2026-09-15') }), AHORA), false)
})

test('estaVencida: lo pagado o condonado nunca está vencido', () => {
  assert.strictEqual(estaVencida(cuota({ estado: 'PAGADO' }), AHORA), false)
  assert.strictEqual(estaVencida(cuota({ estado: 'CONDONADO' }), AHORA), false)
})

test('estaVencida: ATRASADO se trata igual que PENDIENTE', () => {
  // Es el bug que se está arreglando: las filas marcadas ATRASADO por el GET viejo
  // dejaban de contar como abiertas y la alerta no volvía a dispararse nunca.
  assert.strictEqual(estaVencida(cuota({ estado: 'ATRASADO' }), AHORA), true)
  assert.ok(ESTADOS_ABIERTOS.includes('ATRASADO'))
})

test('estaVencida: tolera datos incompletos', () => {
  assert.strictEqual(estaVencida(null, AHORA), false)
  assert.strictEqual(estaVencida(cuota({ fechaVencimiento: null }), AHORA), false)
})

test('estadoEfectivo: deriva ATRASADO sin tocar lo guardado', () => {
  assert.strictEqual(estadoEfectivo(cuota(), AHORA), 'ATRASADO')
  assert.strictEqual(estadoEfectivo(cuota({ fechaVencimiento: new Date('2026-09-15') }), AHORA), 'PENDIENTE')
  assert.strictEqual(estadoEfectivo(cuota({ estado: 'PAGADO' }), AHORA), 'PAGADO')
  assert.strictEqual(estadoEfectivo(cuota({ estado: 'CONDONADO' }), AHORA), 'CONDONADO')
})

test('estadoEfectivo: una cuota marcada ATRASADO que aún no vence vuelve a PENDIENTE', () => {
  // Puede pasar con las filas que el GET viejo marcó de más, o si se corrige la fecha.
  const c = cuota({ estado: 'ATRASADO', fechaVencimiento: new Date('2026-12-01') })
  assert.strictEqual(estadoEfectivo(c, AHORA), 'PENDIENTE')
})

test('whereVencida: es función, no constante congelada al importar', () => {
  // Si fuera constante, el corte quedaría fijo en el arranque del servidor y las
  // cuotas dejarían de vencer hasta el próximo despliegue.
  const a = whereVencida(new Date('2026-01-01')).fechaVencimiento.lt
  const b = whereVencida(new Date('2026-06-01')).fechaVencimiento.lt
  assert.notDeepStrictEqual(a, b)
  assert.deepStrictEqual(whereVencida(AHORA).estado, { in: ESTADOS_ABIERTOS })
})

test('diasDeAtraso: cuenta días completos, 0 si no está vencida', () => {
  assert.strictEqual(diasDeAtraso(cuota({ fechaVencimiento: new Date('2026-08-20T12:00:00Z') }), AHORA), 7)
  assert.strictEqual(diasDeAtraso(cuota({ fechaVencimiento: new Date('2026-09-15') }), AHORA), 0)
  assert.strictEqual(diasDeAtraso(cuota({ estado: 'PAGADO' }), AHORA), 0)
})
