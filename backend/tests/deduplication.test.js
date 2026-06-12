const { test } = require('node:test')
const assert = require('node:assert')
const { normalizarNombre, levenshtein, mismoNombre } = require('../src/lib/deduplication')

test('normalizarNombre: minúsculas, sin tildes ni símbolos', () => {
  assert.strictEqual(normalizarNombre('María José Núñez'), 'maria jose nunez')
  assert.strictEqual(normalizarNombre('  Juan-Pablo  '), 'juanpablo')
  assert.strictEqual(normalizarNombre(null), '')
  assert.strictEqual(normalizarNombre(undefined), '')
})

test('levenshtein: distancias básicas', () => {
  assert.strictEqual(levenshtein('', ''), 0)
  assert.strictEqual(levenshtein('abc', 'abc'), 0)
  assert.strictEqual(levenshtein('abc', 'abd'), 1)
  assert.strictEqual(levenshtein('abc', ''), 3)
  assert.strictEqual(levenshtein('kitten', 'sitting'), 3)
})

test('mismoNombre: nombres iguales o con typos leves matchean', () => {
  assert.strictEqual(mismoNombre('Juan Pérez', 'Juan Perez'), true)
  assert.strictEqual(mismoNombre('Juan Pérez', 'Juan Peres'), true)
  assert.strictEqual(mismoNombre('JOSÉ SOTO', 'jose soto'), true)
})

test('mismoNombre: nombres distintos no matchean', () => {
  assert.strictEqual(mismoNombre('María González', 'Pedro Soto'), false)
  assert.strictEqual(mismoNombre('Carolina Muñoz', 'Felipe Aravena'), false)
})

test('mismoNombre: sin nombre se considera match (comportamiento documentado)', () => {
  // Si uno de los dos viene vacío no hay forma de descartar — se asume match
  // para que la deduplicación por teléfono/email no falle por falta de nombre.
  assert.strictEqual(mismoNombre('', 'Juan Pérez'), true)
  assert.strictEqual(mismoNombre(null, null), true)
})
