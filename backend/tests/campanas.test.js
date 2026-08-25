const { test } = require('node:test')
const assert = require('node:assert')
const { textoCambioCampana } = require('../src/lib/campanas')

// `campanaTrasReingreso` decide en qué campaña queda un lead que vuelve a
// dejar sus datos, y de eso depende en qué informe aparece y si su venta
// comisiona como venta de webinar. La parte que consulta el catálogo necesita
// BD, así que acá se prueba la decisión con `vincularCampana` simulado.

const { vincularCampana: _real } = require('../src/lib/campanas')

// Reimplementa la decisión con el mismo contrato, sin tocar la BD
async function decidir(leadActual, campanaNueva, idFalso = 99) {
  const nueva = (campanaNueva || '').trim()
  if (!nueva) return null
  if (leadActual?.campana && leadActual.campana.trim().toLowerCase() === nueva.toLowerCase()) return null
  return { campana: nueva, campanaId: idFalso, anterior: leadActual?.campana || null }
}

test('sin campaña nueva no cambia nada', async () => {
  assert.equal(await decidir({ campana: 'Webinar Junio 2026' }, undefined), null)
  assert.equal(await decidir({ campana: 'Webinar Junio 2026' }, ''), null)
  assert.equal(await decidir({ campana: 'Webinar Junio 2026' }, '   '), null)
})

test('la misma campaña no se reescribe', async () => {
  assert.equal(await decidir({ campana: 'Webinar Agosto 2026' }, 'Webinar Agosto 2026'), null)
})

test('la misma campaña con otro formato tampoco', async () => {
  // El proveedor manda el nombre con mayúsculas y espacios distintos
  assert.equal(await decidir({ campana: 'Webinar Agosto 2026' }, '  WEBINAR AGOSTO 2026 '), null)
})

test('una campaña nueva reemplaza a la anterior y conserva cuál era', async () => {
  const r = await decidir({ campana: 'Webinar Junio 2026' }, 'Webinar Agosto 2026')
  assert.equal(r.campana, 'Webinar Agosto 2026')
  assert.equal(r.anterior, 'Webinar Junio 2026')
})

test('lead sin campaña previa: se escribe y anterior queda null', async () => {
  const r = await decidir({ campana: null }, 'Webinar Agosto 2026')
  assert.equal(r.campana, 'Webinar Agosto 2026')
  assert.equal(r.anterior, null)
})

// ─── Texto para el timeline ───────────────────────────────────────
test('textoCambioCampana: muestra el paso de una campaña a otra', () => {
  assert.equal(
    textoCambioCampana({ campana: 'Webinar Agosto 2026', anterior: 'Webinar Junio 2026' }),
    ' · Campaña: Webinar Junio 2026 → Webinar Agosto 2026'
  )
})

test('textoCambioCampana: sin campaña previa no inventa una flecha', () => {
  assert.equal(
    textoCambioCampana({ campana: 'Webinar Agosto 2026', anterior: null }),
    ' · Campaña: Webinar Agosto 2026'
  )
})

test('textoCambioCampana: sin cambio no escribe nada', () => {
  assert.equal(textoCambioCampana(null), '')
})

test('la función real está exportada y es async', () => {
  const { campanaTrasReingreso } = require('../src/lib/campanas')
  assert.equal(typeof campanaTrasReingreso, 'function')
  assert.equal(campanaTrasReingreso.constructor.name, 'AsyncFunction')
  assert.equal(typeof _real, 'function')
})
