const { test } = require('node:test')
const assert = require('node:assert')
const { validarReserva, seSolapan } = require('../src/lib/sala')

// La página /sala es pública (sin login), así que validarReserva es la única
// barrera del servidor: conviene fijar sus reglas con tests.

const base = { fecha: '2026-10-06', inicio: '09:00', fin: '10:00', nombre: 'Juan' }

test('validarReserva: acepta una reserva normal', () => {
  assert.strictEqual(validarReserva(base), null)
})

test('validarReserva: rechaza fechas y horas malformadas', () => {
  assert.ok(validarReserva({ ...base, fecha: '06-10-2026' }))
  assert.ok(validarReserva({ ...base, fecha: '2026-02-30' })) // día inexistente
  assert.ok(validarReserva({ ...base, inicio: '09:15' }))     // fuera de la grilla de 30 min
  assert.ok(validarReserva({ ...base, fin: '25:00' }))
})

test('validarReserva: exige inicio < fin y horario 08:00-19:00', () => {
  assert.ok(validarReserva({ ...base, inicio: '10:00', fin: '10:00' }))
  assert.ok(validarReserva({ ...base, inicio: '10:00', fin: '09:00' }))
  assert.ok(validarReserva({ ...base, inicio: '07:30', fin: '09:00' }))
  assert.ok(validarReserva({ ...base, inicio: '18:30', fin: '19:30' }))
  assert.strictEqual(validarReserva({ ...base, inicio: '08:00', fin: '19:00' }), null)
})

test('validarReserva: exige nombre', () => {
  assert.ok(validarReserva({ ...base, nombre: '' }))
  assert.ok(validarReserva({ ...base, nombre: '   ' }))
  assert.ok(validarReserva({ ...base, nombre: 'x'.repeat(61) }))
})

test('seSolapan: el fin es exclusivo (reuniones pegadas no topan)', () => {
  const a = { inicio: '09:00', fin: '10:00' }
  assert.strictEqual(seSolapan(a, { inicio: '10:00', fin: '11:00' }), false)
  assert.strictEqual(seSolapan(a, { inicio: '08:00', fin: '09:00' }), false)
  assert.strictEqual(seSolapan(a, { inicio: '09:30', fin: '10:30' }), true)
  assert.strictEqual(seSolapan(a, { inicio: '08:30', fin: '09:30' }), true)
  assert.strictEqual(seSolapan(a, { inicio: '08:00', fin: '12:00' }), true) // la contiene
})
