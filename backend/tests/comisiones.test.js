const { test } = require('node:test')
const assert = require('node:assert')
const { esVentaWebinar, montoComision } = require('../src/lib/comisiones')

// ─── Cálculo del monto y reparto por tramos ──────────────────────
test('montoComision: con promesa reparte según pctPromesa/pctEscritura', () => {
  // 1000 UF al 3% = 30 UF; 60/40
  const m = montoComision(1000, 3, true, 60, 40)
  assert.strictEqual(m.total, 30)
  assert.strictEqual(m.primera, 18)
  assert.strictEqual(m.segunda, 12)
})

test('montoComision: sin promesa (directo a escritura) todo al segundo tramo', () => {
  const m = montoComision(1000, 3, false, 60, 40)
  assert.strictEqual(m.total, 30)
  assert.strictEqual(m.primera, 0)
  assert.strictEqual(m.segunda, 30)
})

test('montoComision: reparto por defecto 50/50 (broker)', () => {
  const m = montoComision(2000, 1, true)
  assert.strictEqual(m.total, 20)
  assert.strictEqual(m.primera, 10)
  assert.strictEqual(m.segunda, 10)
})

test('montoComision: acepta precio como string (Decimal de Prisma)', () => {
  const m = montoComision('1500', 2, true)
  assert.strictEqual(m.total, 30)
  assert.strictEqual(m.primera + m.segunda, 30)
})

// esVentaWebinar decide si una venta es "de webinar" para el matcheo de reglas
// de comisión (SOLO_WEBINAR / NO_WEBINAR). El catálogo de campañas manda; si el
// lead no está vinculado al catálogo, cae al texto libre del campo `campana`.

test('esVentaWebinar: el catálogo de campañas manda (esWebinar = true)', () => {
  assert.strictEqual(esVentaWebinar({ campanaRef: { esWebinar: true }, campana: 'lo que sea' }), true)
})

test('esVentaWebinar: el catálogo manda aunque el texto diga webinar (esWebinar = false)', () => {
  // Si está vinculado al catálogo y el catálogo dice que NO es webinar, gana el catálogo
  assert.strictEqual(esVentaWebinar({ campanaRef: { esWebinar: false }, campana: 'Webinar Premium' }), false)
})

test('esVentaWebinar: sin catálogo, fallback al texto que contiene "webinar" (case-insensitive)', () => {
  assert.strictEqual(esVentaWebinar({ campana: 'Webinar Junio 2026' }), true)
  assert.strictEqual(esVentaWebinar({ campana: 'WEBINAR premium' }), true)
})

test('esVentaWebinar: sin catálogo y texto sin "webinar" → false', () => {
  assert.strictEqual(esVentaWebinar({ campana: 'Instagram' }), false)
})

test('esVentaWebinar: lead nulo o sin campaña no rompe y da false', () => {
  assert.strictEqual(esVentaWebinar(null), false)
  assert.strictEqual(esVentaWebinar(undefined), false)
  assert.strictEqual(esVentaWebinar({}), false)
  assert.strictEqual(esVentaWebinar({ campana: null }), false)
})
