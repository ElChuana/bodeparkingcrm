const { test } = require('node:test')
const assert = require('node:assert')
const { nucleoGlosa, indexar, resolver, loQueSeAprende, sinTildes } = require('../src/lib/contraparte')

// El caso que motivó todo: en la cartola real, la misma señora aparece pagando desde dos
// bancos distintos y con el apellido escrito de dos formas. Si esas dos glosas no colapsan
// a la misma clave, el aprendizaje no sirve para nada.

test('nucleoGlosa: mismo pagador desde dos bancos da la misma clave', () => {
  const a = nucleoGlosa('TRANSFERENCIA DESDE Chile DE Patricia Munoz')
  const b = nucleoGlosa('TRANSFERENCIA DESDE Estado  DE Patricia Muñoz')
  assert.strictEqual(a, 'PATRICIA MUNOZ')
  assert.strictEqual(a, b)
})

test('nucleoGlosa: el nombre del banco nunca entra en la clave', () => {
  // Es el error fácil: dejar "CHILE" adentro y que Patricia sea dos personas distintas.
  assert.ok(!nucleoGlosa('TRANSFERENCIA DESDE Santander  DE Ana Maria Soto').includes('SANTANDER'))
  assert.strictEqual(nucleoGlosa('TRANSFERENCIA DESDE Bci  DE Carolina Sandoval'), 'CAROLINA SANDOVAL')
})

test('nucleoGlosa: el folio intercalado no rompe el preámbulo', () => {
  // Los números se sacan ANTES de buscar el preámbulo justamente por este caso.
  assert.strictEqual(nucleoGlosa('TEF 001234 DE J. PEREZ SOTO'), 'J PEREZ SOTO')
})

test('nucleoGlosa: dos pagos del mismo pagador con folios distintos son la misma clave', () => {
  assert.strictEqual(
    nucleoGlosa('TEF 000111 DE INMOBILIARIA LOS ANDES'),
    nucleoGlosa('TEF 999888 DE INMOBILIARIA LOS ANDES')
  )
})

test('nucleoGlosa: los sufijos societarios se descartan', () => {
  assert.strictEqual(nucleoGlosa('TRANSFERENCIA A PROVEEDOR CONSTRUCTORA LTDA'), 'CONSTRUCTORA')
})

test('nucleoGlosa: una glosa sin contraparte igual da una clave estable', () => {
  // No es un cliente, pero sí es una glosa recurrente: sirve para las reglas de gasto.
  assert.strictEqual(nucleoGlosa('PAGO EN LINEA SII'), 'PAGO EN LINEA SII')
  assert.strictEqual(nucleoGlosa('COMISION MANTENCION CUENTA'), 'COMISION MANTENCION CUENTA')
})

test('nucleoGlosa: lo que no identifica a nadie devuelve null', () => {
  assert.strictEqual(nucleoGlosa('x'), null)
  assert.strictEqual(nucleoGlosa('  '), null)
  assert.strictEqual(nucleoGlosa(null), null)
  assert.strictEqual(nucleoGlosa('123456'), null)
})

test('sinTildes: normaliza mayúsculas y acentos', () => {
  assert.strictEqual(sinTildes('Muñoz Iñíguez'), 'MUNOZ INIGUEZ')
})

test('resolver: encuentra el alias aprendido', () => {
  const mapa = indexar([{ clave: 'PATRICIA MUNOZ', contactoId: 7, rut: '11111111-1' }])
  const a = resolver('TRANSFERENCIA DESDE Estado DE Patricia Muñoz', mapa)
  assert.strictEqual(a.contactoId, 7)
  assert.strictEqual(resolver('TRANSFERENCIA DESDE Chile DE Otro Señor', mapa), null)
})

test('loQueSeAprende: no aprende sin cliente al otro lado', () => {
  // No aprender es siempre preferible a aprender mal: un alias errado contamina todos los
  // pagos siguientes de esa persona.
  assert.strictEqual(loQueSeAprende({ glosa: 'TEF DE JUAN PEREZ' }), null)
  assert.strictEqual(loQueSeAprende({ glosa: 'x', contactoId: 3 }), null)
})

test('loQueSeAprende: guarda la clave y la etiqueta original', () => {
  const a = loQueSeAprende({ glosa: 'TRANSFERENCIA DESDE Chile  DE Marcos Rene Vera', contactoId: 3 })
  assert.strictEqual(a.clave, 'MARCOS RENE VERA')
  assert.strictEqual(a.etiqueta, 'TRANSFERENCIA DESDE Chile  DE Marcos Rene Vera')
  assert.strictEqual(a.contactoId, 3)
})

// ─── EMPAREJAR UN NOMBRE LIMPIO CONTRA EL CATÁLOGO ────────────
// El libro banco del contador escribe el nombre bien; lo que hay que hacer es encontrarlo.

const { emparejarNombre, claveNombre, esAbreviatura } = require('../src/lib/contraparte')

const CATALOGO = [
  { id: 1, nombre: 'Alberto Fernández Reyes' },
  { id: 2, nombre: 'Richard Mendoza Garrido' },
  { id: 3, nombre: 'SSH Rent SpA' },
  { id: 4, nombre: 'Carolina Raquel Muñoz Rebolledo' },
  { id: 5, nombre: 'Carolina Andrea Muñoz Silva' },
]

test('emparejarNombre: calza igual aunque cambien tildes, mayúsculas y el sufijo societario', () => {
  assert.strictEqual(emparejarNombre('SSH RENT SPA', CATALOGO).id, 3)
  assert.strictEqual(emparejarNombre('SSH RENT SPA', CATALOGO).como, 'igual')
})

test('emparejarNombre: las mismas palabras en otro orden son la misma persona', () => {
  const r = emparejarNombre('MENDOZA GARRIDO RICHARD', CATALOGO)
  assert.strictEqual(r.id, 2)
  assert.strictEqual(r.como, 'mismas palabras')
})

test('emparejarNombre: resuelve la abreviatura que usa el libro', () => {
  const r = emparejarNombre('Alberto Fernández R.', CATALOGO)
  assert.strictEqual(r.id, 1)
  assert.strictEqual(r.como, 'abreviatura')
})

test('emparejarNombre: un empate no se resuelve', () => {
  // Dos Carolina Muñoz. Imputarle el pago a la equivocada es peor que dejarlo sin
  // identificar: nadie vuelve a mirar lo que ya parece resuelto.
  assert.strictEqual(emparejarNombre('Carolina Muñoz', CATALOGO), null)
})

test('emparejarNombre: un solo apellido no identifica a nadie', () => {
  assert.strictEqual(emparejarNombre('Fernández', CATALOGO), null)
  assert.strictEqual(emparejarNombre('Muñoz', CATALOGO), null)
})

test('emparejarNombre: no inventa cuando el nombre no está', () => {
  assert.strictEqual(emparejarNombre('Verónica Núñez Fernández', CATALOGO), null)
})

test('esAbreviatura: la primera palabra tiene que estar completa', () => {
  // Sin esa condición, "A. Fernández" calzaría con cualquier Fernández.
  assert.strictEqual(esAbreviatura(['A', 'FERNANDEZ'], ['ALBERTO', 'FERNANDEZ', 'REYES']), false)
  assert.strictEqual(esAbreviatura(['ALBERTO', 'F'], ['ALBERTO', 'FERNANDEZ', 'REYES']), true)
})

test('claveNombre: saca los sufijos societarios que el libro escribe de cualquier forma', () => {
  assert.strictEqual(claveNombre('Renta Corta SpA'), claveNombre('RENTA CORTA S.A.'))
})

// ── El formato real de la cartola: apellidos primero, banco pegado, cargos con PARA ──

test('nucleoGlosa: el banco pegado a la preposición no entra en la clave', () => {
  const { nucleoGlosa } = require('../src/lib/contraparte')
  assert.strictEqual(nucleoGlosa('TRANSFERENCIA DESDE ScotiabankDE PEREZ CORREA GONZALO EDUARDO'), 'PEREZ CORREA GONZALO EDUARDO')
  assert.strictEqual(nucleoGlosa('TRANSFERENCIA DESDE BICEDE INVERSIONES CATA SPA'), 'INVERSIONES CATA')
})

test('nucleoGlosa: los cargos "TRANSFERENCIA A <banco> PARA <nombre>" dejan solo el nombre', () => {
  const { nucleoGlosa } = require('../src/lib/contraparte')
  assert.strictEqual(nucleoGlosa('TRANSFERENCIA A BCI PARA ChileParadise SpA'), 'CHILEPARADISE')
  assert.strictEqual(nucleoGlosa('TRANSFERENCIA A ChilePARA Juan Valdivieso'), 'JUAN VALDIVIESO')
  assert.strictEqual(nucleoGlosa('TRANSFERENCIA A Itau PARA Karina Vejares'), 'KARINA VEJARES')
})

test('emparejarNombre: el catálogo corto está contenido en el nombre largo del banco', () => {
  const catalogo = [{ id: 1, nombre: 'Jorge Chavez' }, { id: 2, nombre: 'Pabla Pizarro' }]
  const r = emparejarNombre('CHAVEZ LAFFERTI JORGE RICARDO', catalogo)
  assert.strictEqual(r.id, 1)
  assert.strictEqual(r.como, 'contiene el nombre')
})

test('emparejarNombre: también al revés — glosa corta, catálogo con nombre completo', () => {
  const catalogo = [{ id: 5, nombre: 'Estephanie Paola Salas Ramirez' }]
  assert.strictEqual(emparejarNombre('ESTEPHANIE SALAS', catalogo).id, 5)
})

test('emparejarNombre: el subconjunto con empate no se resuelve', () => {
  const catalogo = [{ id: 1, nombre: 'Jorge Chavez' }, { id: 2, nombre: 'Jorge Ricardo' }]
  assert.strictEqual(emparejarNombre('CHAVEZ LAFFERTI JORGE RICARDO', catalogo), null)
})

test('emparejarNombre: un subconjunto demasiado corto no identifica a nadie', () => {
  // "Ana Li" en orden de prefijo calza por el nivel abreviatura (correcto); desordenado y
  // con menos de 7 letras, el subconjunto no debe atreverse.
  const catalogo = [{ id: 1, nombre: 'Ana Li' }]
  assert.strictEqual(emparejarNombre('PEREZ SOTO ANA LI', catalogo), null)
})
