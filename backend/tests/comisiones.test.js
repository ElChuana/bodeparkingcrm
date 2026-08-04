const { test } = require('node:test')
const assert = require('node:assert')
const { esVentaWebinar } = require('../src/lib/comisiones')

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
