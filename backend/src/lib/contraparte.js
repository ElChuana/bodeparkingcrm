/**
 * Quién está al otro lado de un movimiento del banco.
 *
 * El matcher de conciliación compara el nombre del cliente contra la glosa cruda, cada vez,
 * desde cero. Eso significa que una conciliación que una persona ya confirmó —"esta glosa es
 * este cliente"— se tira a la basura apenas se guarda. Con seis cuotas por venta, el mismo
 * comprador aparece seis veces y las seis cuestan lo mismo.
 *
 * Acá se extrae el NÚCLEO de la glosa: lo que queda cuando le sacas todo lo que cambia entre
 * una transferencia y la siguiente del mismo pagador. El banco escribe
 *
 *     TRANSFERENCIA DESDE Chile  DE Patricia Munoz
 *     TRANSFERENCIA DESDE Estado DE Patricia Muñoz
 *
 * y esas dos son la misma señora pagando desde dos bancos distintos. Las dos tienen que
 * colapsar a la misma clave, o el aprendizaje no sirve de nada.
 *
 * Una vez que existe la clave, el siguiente pago de esa persona calza por IGUALDAD en vez de
 * por parecido — que es exactamente lo que hace ERPNext guardando la contraparte en el
 * movimiento, y es más barato y más confiable que cualquier modelo de lenguaje.
 */

/** Quita tildes y pasa a mayúsculas. "Muñoz" y "Munoz" tienen que ser lo mismo. */
function sinTildes(texto) {
  return String(texto || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
}

/**
 * Preámbulos que escribe el banco y que no dicen nada sobre quién pagó.
 *
 * El orden importa: el primero que calza gana, así que los más específicos van arriba.
 * `TRANSFERENCIA DESDE <banco> DE <nombre>` tiene que probarse antes que
 * `TRANSFERENCIA DE <nombre>`, o el nombre del banco se cuela en la clave y Patricia deja
 * de ser la misma Patricia según desde dónde transfirió.
 */
const PREAMBULOS = [
  /^TRANSFERENCIA\s+DESDE\s+.+?\s+DE\s+/,
  // El banco a veces PEGA su nombre a la preposición: "ScotiabankDE PEREZ CORREA",
  // "BICEDE INVERSIONES". Sin esta variante, el banco queda dentro del nombre del pagador.
  /^TRANSFERENCIA\s+DESDE\s+[A-ZÑ]+DE\s+/,
  /^TRANSFERENCIA\s+DESDE\s+/,
  // El lado de los cargos: "TRANSFERENCIA A Santander PARA <destinatario>". Faltaba, y por
  // eso ningún cargo de cartola se identificaba: el banco entero quedaba en la clave.
  /^TRANSFERENCIA\s+A\s+.+?\s+PARA\s+/,
  /^TRANSFERENCIA\s+A\s+[A-ZÑ]+PARA\s+/,
  /^(?:ABONO|CARGO)\s+POR\s+TRANSFERENCIA\s+(?:DE|A)\s+/,
  /^TRANSFERENCIA\s+(?:A|DE)\s+(?:TERCEROS\s+|PROVEEDOR\s+)?/,
  /^TEF\s+(?:DE|A)\s+/,
  /^(?:PAGO|ABONO|CARGO)\s+(?:DE|A)\s+/,
  /^DEPOSITO\s+(?:DE|EN\s+EFECTIVO\s+DE)\s+/,
]

/** Palabras que sobran al final y solo agregan ruido. */
const SUFIJOS = /\s+(?:LTDA|SPA|S\.?A\.?|EIRL|LIMITADA|E\s*I\s*R\s*L)\.?$/

/**
 * El núcleo estable de una glosa.
 *
 * Saca el preámbulo del banco, los números (folios, montos y fechas cambian en cada
 * transferencia) y la puntuación. Lo que queda es el pagador.
 *
 * @returns {string|null} null si no queda nada aprovechable
 */
function nucleoGlosa(glosa) {
  // Los números salen ANTES de buscar el preámbulo, no después: el banco intercala el folio
  // en medio de la frase ("TEF 001234 DE J. PEREZ") y con el folio ahí el preámbulo no calza.
  let t = sinTildes(glosa)
    .replace(/[0-9]+/g, ' ')
    .replace(/[^A-ZÑ ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (!t) return null

  for (const re of PREAMBULOS) {
    if (re.test(t)) {
      t = t.replace(re, '')
      break
    }
  }

  t = t.replace(/\s+/g, ' ').trim().replace(SUFIJOS, '')

  // Menos de cuatro letras no identifica a nadie; mejor no aprender nada que aprender basura.
  if (t.replace(/ /g, '').length < 4) return null
  return t
}

/**
 * Índice de alias listo para consultar, a partir de las filas de AliasContraparte.
 * @returns {Map<string, object>}
 */
function indexar(alias = []) {
  const mapa = new Map()
  for (const a of alias) {
    if (a?.clave) mapa.set(a.clave, a)
  }
  return mapa
}

/** El alias que corresponde a una glosa, si ya lo aprendimos. */
function resolver(glosa, mapa) {
  const clave = nucleoGlosa(glosa)
  if (!clave || !mapa) return null
  return mapa.get(clave) || null
}

/**
 * Qué habría que guardar después de conciliar un movimiento contra algo de un cliente.
 *
 * Devuelve null cuando no hay nada que aprender: sin núcleo aprovechable, o sin cliente al
 * otro lado. No aprender es siempre preferible a aprender mal — un alias errado contamina
 * todos los pagos siguientes de esa persona.
 */
function loQueSeAprende({ glosa, contactoId = null, rut = null }) {
  const clave = nucleoGlosa(glosa)
  if (!clave) return null
  if (!contactoId && !rut) return null
  return { clave, etiqueta: String(glosa || '').trim().slice(0, 180), contactoId, rut }
}

// ─── EMPAREJAR UN NOMBRE LIMPIO CONTRA EL CATÁLOGO ────────────

/**
 * Lo de arriba resuelve glosas del banco, que vienen sucias. El libro banco del contador es
 * otro problema: ahí el nombre ya viene escrito bien ("Alberto Fernández R.") y lo que hay
 * que hacer es encontrarlo en el catálogo de clientes o de proveedores.
 *
 * Tres formas en que la misma persona aparece escrita distinto, y las tres pasan en el libro
 * real, así que se resuelven en ese orden:
 *
 *   1. igual — "SSH RENT SPA" / "SSH Rent SpA"
 *   2. mismas palabras en otro orden — "MENDOZA GARRIDO RICHARD" / "Richard Mendoza Garrido"
 *   3. abreviada — "Juan Valdivieso R." / "Juan Valdivieso Reyes"
 *
 * La regla que sostiene todo esto es que un empate NO se resuelve. Si "Carolina Muñoz" calza
 * con dos Carolinas del catálogo, no devuelve ninguna: imputarle el pago a la equivocada es
 * peor que dejarlo sin identificar, porque nadie vuelve a mirar lo que ya parece resuelto.
 */

/**
 * Formas jurídicas, que no son parte del nombre: "Renta Corta SpA" y "RENTA CORTA S.A." son
 * la misma empresa escrita por dos personas distintas.
 *
 * Se sacan DESPUÉS de convertir la puntuación en espacios, porque "S.A." llega como "S A".
 * Y solo formas jurídicas: "Inversiones" e "Inmobiliaria" parecen relleno pero son parte del
 * nombre, y sacarlas dejaría "Inversiones Cata SpA" en una sola palabra —que ya no
 * identifica a nadie.
 */
const FORMAS_JURIDICAS = /\b(?:SPA|S\s?A|LTDA|LIMITADA|EIRL|E\s?I\s?R\s?L|CIA|COMPANIA)\b/g

function tokens(nombre) {
  const base = sinTildes(nombre).toUpperCase().replace(/[^A-Z0-9 ]+/g, ' ')
  return base.split(/\s+/).filter(Boolean)
}

/** Forma canónica para comparar por igualdad, sin forma jurídica ni puntuación. */
function claveNombre(nombre) {
  const limpio = sinTildes(nombre).toUpperCase().replace(/[^A-Z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim()
  return limpio.replace(FORMAS_JURIDICAS, ' ').split(/\s+/).filter(Boolean).join(' ')
}

/** ¿El nombre corto es el largo abreviado? "JUAN VALDIVIESO R" ⊂ "JUAN VALDIVIESO REYES". */
function esAbreviatura(corto, largo) {
  if (corto.length < 2 || corto.length > largo.length) return false
  let i = 0
  for (const t of largo) {
    if (i < corto.length && t.startsWith(corto[i])) i++
  }
  // Además del prefijo, la primera palabra tiene que ser la misma completa: sin eso
  // "M. Rojas" calzaría con cualquiera cuyo apellido empiece con M.
  return i === corto.length && corto[0] === largo[0]
}

/**
 * Busca `nombre` en `catalogo`.
 *
 * @param {string} nombre
 * @param {Array<{id: number, nombre: string}>} catalogo
 * @returns {{id: number, nombre: string, como: 'igual'|'mismas palabras'|'abreviatura'}|null}
 *   null cuando no hay ninguno o cuando hay más de uno y no se puede desempatar.
 */
function emparejarNombre(nombre, catalogo) {
  const clave = claveNombre(nombre)
  if (!clave || clave.length < 4) return null
  const propios = tokens(clave)
  if (propios.length < 2) return null // un solo apellido no identifica a nadie

  const preparado = catalogo
    .map((c) => ({ ...c, clave: claveNombre(c.nombre), tokens: tokens(claveNombre(c.nombre)) }))
    .filter((c) => c.tokens.length >= 2)

  const iguales = preparado.filter((c) => c.clave === clave)
  if (iguales.length) return iguales.length === 1 ? { ...iguales[0], como: 'igual' } : null

  const ordenado = [...propios].sort().join(' ')
  const mismas = preparado.filter((c) => [...c.tokens].sort().join(' ') === ordenado)
  if (mismas.length) return mismas.length === 1 ? { ...mismas[0], como: 'mismas palabras' } : null

  const abreviados = preparado.filter((c) => esAbreviatura(propios, c.tokens) || esAbreviatura(c.tokens, propios))
  if (abreviados.length === 1) return { ...abreviados[0], como: 'abreviatura' }
  if (abreviados.length > 1) return null

  // 4. subconjunto en cualquier orden — el formato real de la cartola chilena. El banco
  // escribe "CHAVEZ LAFFERTI JORGE RICARDO" (apellidos primero, nombre completo) y el
  // catálogo dice "Jorge Chávez": todas las palabras del nombre CORTO están en el largo,
  // en cualquier orden. Es el nivel más débil y por eso va último; el empate, como
  // siempre, no se resuelve — dos candidatos posibles es lo mismo que ninguno.
  const contiene = (corto, largo) => {
    if (corto.length < 2 || corto.length > largo.length) return false
    if (corto.join('').length < 7) return false // "ANA LI" no identifica a nadie
    const bolsa = new Set(largo)
    return corto.every((t) => bolsa.has(t))
  }
  const subconjunto = preparado.filter((c) => contiene(c.tokens, propios) || contiene(propios, c.tokens))
  if (subconjunto.length === 1) return { ...subconjunto[0], como: 'contiene el nombre' }

  return null
}

module.exports = {
  sinTildes, nucleoGlosa, indexar, resolver, loQueSeAprende, PREAMBULOS,
  claveNombre, emparejarNombre, esAbreviatura,
}
