const { test } = require('node:test')
const assert = require('node:assert')
const { desdeHoraChile } = require('../src/lib/fechaChile')

// desdeHoraChile interpreta componentes de hora LOCAL de Chile y devuelve el
// instante UTC correcto, respetando el horario de verano (America/Santiago).

test('desdeHoraChile: invierno chileno (julio, UTC-4)', () => {
  // 15 jul 2026 10:00 en Chile = 14:00 UTC
  const d = desdeHoraChile(2026, 7, 15, 10, 0)
  assert.strictEqual(d.toISOString(), '2026-07-15T14:00:00.000Z')
})

test('desdeHoraChile: verano chileno (enero, UTC-3)', () => {
  // 15 ene 2026 10:00 en Chile = 13:00 UTC
  const d = desdeHoraChile(2026, 1, 15, 10, 0)
  assert.strictEqual(d.toISOString(), '2026-01-15T13:00:00.000Z')
})

test('desdeHoraChile: la conversión no depende de la zona del servidor', () => {
  // El resultado es un instante absoluto: su hora UTC es fija
  const d = desdeHoraChile(2026, 7, 1, 0, 0)
  assert.strictEqual(d.getUTCHours(), 4) // medianoche en Chile (UTC-4) = 04:00 UTC
})
