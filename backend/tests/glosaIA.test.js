const { test } = require('node:test')
const assert = require('node:assert')
const {
  construirPrompt, normalizarRespuesta, lotes, disponible, cuerpo, esRechazoDeEsquema, PROVEEDORES,
} = require('../src/lib/glosaIA')

// El principio de este módulo es que la IA es un PARSER, no un juez: todo lo que devuelve es
// una sugerencia en columnas aparte. Por eso lo que se testea es que un modelo que alucina
// no pueda ensuciar una carga de cartola.

const GLOSAS = ['TRANSFERENCIA DESDE Chile DE Juan Perez', 'PAGO EN LINEA SII']

test('construirPrompt: numera las glosas para poder devolverlas alineadas', () => {
  assert.strictEqual(construirPrompt(GLOSAS), '0. TRANSFERENCIA DESDE Chile DE Juan Perez\n1. PAGO EN LINEA SII')
})

test('normalizarRespuesta: caso feliz', () => {
  const r = normalizarRespuesta({
    glosas: [{ indice: 0, nombre: 'Juan Perez', rut: '11111111-1', referencia: '998', tipo: 'TRANSFERENCIA' }],
  }, GLOSAS)
  assert.strictEqual(r.length, 1)
  assert.deepStrictEqual(r[0], {
    indice: 0, glosa: GLOSAS[0], nombre: 'Juan Perez', rut: '11111111-1', referencia: '998', tipo: 'TRANSFERENCIA',
  })
})

test('normalizarRespuesta: descarta índices fuera de rango', () => {
  // Un modelo que inventa una fila 47 no puede escribir en el movimiento equivocado.
  const r = normalizarRespuesta({ glosas: [{ indice: 47, nombre: 'X' }, { indice: -1, nombre: 'Y' }] }, GLOSAS)
  assert.strictEqual(r.length, 0)
})

test('normalizarRespuesta: con un índice repetido gana el primero', () => {
  const r = normalizarRespuesta({ glosas: [{ indice: 0, nombre: 'A' }, { indice: 0, nombre: 'B' }] }, GLOSAS)
  assert.strictEqual(r.length, 1)
  assert.strictEqual(r[0].nombre, 'A')
})

test('normalizarRespuesta: un tipo inventado se descarta, la fila sobrevive', () => {
  const r = normalizarRespuesta({ glosas: [{ indice: 0, nombre: 'Juan', tipo: 'CRIPTOMONEDA' }] }, GLOSAS)
  assert.strictEqual(r[0].tipo, null)
  assert.strictEqual(r[0].nombre, 'Juan')
})

test('normalizarRespuesta: "null" como texto y vacíos quedan en null', () => {
  const r = normalizarRespuesta({ glosas: [{ indice: 0, nombre: '  ', rut: 'null', referencia: '-' }] }, GLOSAS)
  assert.strictEqual(r[0].nombre, null)
  assert.strictEqual(r[0].rut, null)
  assert.strictEqual(r[0].referencia, null)
})

test('normalizarRespuesta: una respuesta rota devuelve lista vacía, no explota', () => {
  assert.deepStrictEqual(normalizarRespuesta(null, GLOSAS), [])
  assert.deepStrictEqual(normalizarRespuesta({}, GLOSAS), [])
  assert.deepStrictEqual(normalizarRespuesta({ glosas: 'qué' }, GLOSAS), [])
})

test('normalizarRespuesta: devuelve ordenado por índice aunque llegue desordenado', () => {
  const r = normalizarRespuesta({ glosas: [{ indice: 1, nombre: 'B' }, { indice: 0, nombre: 'A' }] }, GLOSAS)
  assert.deepStrictEqual(r.map((f) => f.indice), [0, 1])
})

test('lotes: parte la cartola en tandas y no pierde filas', () => {
  const arr = Array.from({ length: 95 }, (_, i) => i)
  const l = lotes(arr, 40)
  assert.deepStrictEqual(l.map((x) => x.length), [40, 40, 15])
  assert.strictEqual(l.flat().length, 95)
})

test('disponible: sin credencial el ERP sigue funcionando', () => {
  // Esto es una mejora, no un requisito: sin key nada se rompe.
  const previo = { p: process.env.IA_PROVIDER, g: process.env.GROQ_API_KEY, x: process.env.XAI_API_KEY }
  delete process.env.GROQ_API_KEY
  delete process.env.XAI_API_KEY
  process.env.IA_PROVIDER = 'groq'
  assert.strictEqual(disponible(), false)
  process.env.GROQ_API_KEY = 'x'
  assert.strictEqual(disponible(), true)
  if (previo.g == null) delete process.env.GROQ_API_KEY; else process.env.GROQ_API_KEY = previo.g
  if (previo.x != null) process.env.XAI_API_KEY = previo.x
  if (previo.p == null) delete process.env.IA_PROVIDER; else process.env.IA_PROVIDER = previo.p
})

// ─── Formato de respuesta ─────────────────────────────────────────────────────
// El catálogo de modelos que aceptan `json_schema` cambia seguido (en Groq, el
// llama-3.3-70b que usa lib/groq.js para los reportes NO lo acepta) y además IA_MODELO deja
// elegir cualquiera. Por eso se intenta con esquema y se cae a JSON suelto si lo rechazan.

test('cuerpo: con esquema manda json_schema; sin esquema, json_object', () => {
  const cfg = { modelo: 'x' }
  assert.strictEqual(cuerpo(cfg, GLOSAS, 'json_schema').response_format.type, 'json_schema')
  assert.deepStrictEqual(cuerpo(cfg, GLOSAS, 'json_object').response_format, { type: 'json_object' })
})

test('cuerpo: temperatura 0 — leer una glosa no es una tarea creativa', () => {
  assert.strictEqual(cuerpo({ modelo: 'x' }, GLOSAS, 'json_object').temperature, 0)
})

test('esRechazoDeEsquema: reconoce el 400 del modelo que no soporta esquemas', () => {
  assert.ok(esRechazoDeEsquema(400, "'response_format.type' : value is not one of the allowed values ['json_object']"))
  assert.ok(esRechazoDeEsquema(400, 'json_schema is not supported for this model'))
})

test('esRechazoDeEsquema: no confunde otros errores', () => {
  // Reintentar sin esquema una credencial mala o un rate limit solo gasta otra llamada.
  assert.strictEqual(esRechazoDeEsquema(401, 'invalid api key'), false)
  assert.strictEqual(esRechazoDeEsquema(429, 'rate limit'), false)
  assert.strictEqual(esRechazoDeEsquema(400, 'messages: too many tokens'), false)
})

test('el modelo por defecto de Groq acepta esquemas', () => {
  // llama-3.3-70b (el de lib/groq.js) devolvería 400: acá haría falta el fallback en cada
  // llamada. Mejor partir de un modelo que sí los soporta.
  assert.notStrictEqual(PROVEEDORES.groq.modelo, 'llama-3.3-70b-versatile')
})
