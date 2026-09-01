/**
 * Lector de glosas: la IA como PARSER, nunca como juez.
 *
 * Esta distinción es toda la arquitectura de este archivo.
 *
 * El que decide si un movimiento calza con una cuota sigue siendo `lib/conciliacion.js`: un
 * puntaje determinista que se puede auditar ("monto exacto + nombre en la glosa"), que da lo
 * mismo hoy y en dos meses, y que no cuesta nada. Sobre plata, cambiar eso por un modelo de
 * lenguaje que no sabe explicarse y que mañana contesta distinto sería un retroceso.
 *
 * Lo que el determinismo NO puede hacer es leer. Hoy `similitudNombre()` compara el nombre
 * del cliente contra el string crudo del banco, con toda la basura adentro. Un modelo lee la
 * glosa UNA vez al cargar la cartola y devuelve campos limpios; después el matcher trabaja
 * sobre datos estructurados en vez de sopa de texto. Mejora la señal sin ceder la decisión.
 *
 * Todo lo que sale de acá es una SUGERENCIA guardada en columnas aparte
 * (`nombreDetectado`, `referenciaDetectada`). Nada pisa un dato del banco.
 */

const PROVEEDORES = {
  groq: {
    url: 'https://api.groq.com/openai/v1/chat/completions',
    // NO es el llama-3.3-70b que usa lib/groq.js para los reportes: ese modelo en Groq solo
    // acepta `json_object` y devuelve 400 con `json_schema`. Acá hace falta el esquema.
    modelo: 'openai/gpt-oss-120b',
    env: 'GROQ_API_KEY',
  },
  xai: {
    url: 'https://api.x.ai/v1/chat/completions',
    modelo: 'grok-4.6',
    env: 'XAI_API_KEY',
  },
}

/** Cuántas glosas van en una llamada. Suficiente para una cartola mensual entera. */
const LOTE = 40

function proveedor() {
  const nombre = (process.env.IA_PROVIDER || 'groq').toLowerCase()
  const cfg = PROVEEDORES[nombre]
  if (!cfg) return null
  const apiKey = process.env[cfg.env]
  if (!apiKey) return null
  return { ...cfg, nombre, apiKey, modelo: process.env.IA_MODELO || cfg.modelo }
}

/** Si no hay credencial, el ERP funciona igual: esto es una mejora, no un requisito. */
const disponible = () => Boolean(proveedor())

const PROMPT = `Eres un lector de glosas de cartolas bancarias chilenas. Recibes una lista numerada de glosas y devuelves, para cada una, los datos que aparecen EXPLÍCITAMENTE en el texto.

Reglas:
- "nombre": el nombre de la persona o empresa que está al otro lado (quien paga o a quien se le paga). NO incluyas el nombre del banco emisor: en "TRANSFERENCIA DESDE Chile DE Juan Perez", el banco es Chile y el nombre es "Juan Perez". Si no hay nombre de contraparte, null.
- "rut": solo si aparece un RUT en el texto, formato 12345678-9. Si no, null.
- "referencia": número de operación, folio o documento citado. Si no, null.
- "tipo": una de TRANSFERENCIA, PAGO_SERVICIO, IMPUESTO, COMISION_BANCARIA, REMUNERACION, OTRO.
- No inventes NADA. Si un dato no está en el texto, es null. Es preferible un null a un dato inventado.
- Devuelve exactamente un objeto por glosa, con el mismo "indice" que recibiste.`

/** Arma el mensaje del usuario: glosas numeradas, una por línea. */
function construirPrompt(glosas = []) {
  return glosas.map((g, i) => `${i}. ${String(g ?? '').trim()}`).join('\n')
}

const ESQUEMA = {
  name: 'glosas',
  schema: {
    type: 'object',
    properties: {
      glosas: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            indice: { type: 'integer' },
            nombre: { type: ['string', 'null'] },
            rut: { type: ['string', 'null'] },
            referencia: { type: ['string', 'null'] },
            tipo: { type: ['string', 'null'] },
          },
          required: ['indice', 'nombre', 'rut', 'referencia', 'tipo'],
        },
      },
    },
    required: ['glosas'],
  },
}

const TIPOS = ['TRANSFERENCIA', 'PAGO_SERVICIO', 'IMPUESTO', 'COMISION_BANCARIA', 'REMUNERACION', 'OTRO']

const limpiar = (v) => {
  if (v == null) return null
  const t = String(v).trim()
  if (!t || t.toLowerCase() === 'null' || t === '-') return null
  return t.slice(0, 180)
}

/**
 * Convierte lo que respondió el modelo en filas alineadas con las glosas que se mandaron.
 *
 * Es defensiva a propósito: descarta índices fuera de rango, tipos inventados y strings
 * vacíos. Un modelo que alucina no puede romper una carga de cartola — en el peor caso
 * devuelve menos datos, nunca datos falsos en el lugar equivocado.
 */
function normalizarRespuesta(json, glosas = []) {
  const filas = Array.isArray(json?.glosas) ? json.glosas : []
  const salida = new Map()

  for (const f of filas) {
    const i = Number(f?.indice)
    if (!Number.isInteger(i) || i < 0 || i >= glosas.length) continue
    if (salida.has(i)) continue // el primero gana; un índice repetido es señal de ruido
    const tipo = limpiar(f?.tipo)
    salida.set(i, {
      indice: i,
      glosa: glosas[i],
      nombre: limpiar(f?.nombre),
      rut: limpiar(f?.rut),
      referencia: limpiar(f?.referencia),
      tipo: tipo && TIPOS.includes(tipo.toUpperCase()) ? tipo.toUpperCase() : null,
    })
  }

  return [...salida.values()].sort((a, b) => a.indice - b.indice)
}

/** Parte una lista en lotes de `tam`. */
function lotes(arr, tam = LOTE) {
  const salida = []
  for (let i = 0; i < arr.length; i += tam) salida.push(arr.slice(i, i + tam))
  return salida
}

/** El cuerpo de la petición, con el formato de respuesta que se esté intentando. */
const cuerpo = (cfg, glosas, formato) => ({
  model: cfg.modelo,
  temperature: 0,
  messages: [
    { role: 'system', content: PROMPT },
    { role: 'user', content: construirPrompt(glosas) },
  ],
  response_format: formato === 'json_schema'
    ? { type: 'json_schema', json_schema: ESQUEMA }
    : { type: 'json_object' },
})

/**
 * ¿El 400 se debe a que el modelo no soporta esquemas?
 *
 * El catálogo de modelos que aceptan `json_schema` cambia seguido y además `IA_MODELO` deja
 * elegir cualquiera, así que no sirve una lista blanca: se intenta con esquema y, si el
 * proveedor lo rechaza por eso, se reintenta en modo JSON suelto. El prompt ya describe la
 * forma esperada y `normalizarRespuesta` valida igual, así que el modo suelto es correcto,
 * solo menos garantizado.
 */
const esRechazoDeEsquema = (estado, detalle) =>
  estado === 400 && /json_schema|response_format|structured output/i.test(detalle)

async function pedir(cfg, glosas, formato) {
  const res = await fetch(cfg.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg.apiKey}` },
    body: JSON.stringify(cuerpo(cfg, glosas, formato)),
  })
  return { res, detalle: res.ok ? null : await res.text() }
}

async function llamar(cfg, glosas) {
  let { res, detalle } = await pedir(cfg, glosas, 'json_schema')

  if (!res.ok && esRechazoDeEsquema(res.status, detalle)) {
    ;({ res, detalle } = await pedir(cfg, glosas, 'json_object'))
  }

  if (!res.ok) throw new Error(`${cfg.nombre} ${res.status}: ${String(detalle).slice(0, 300)}`)

  const data = await res.json()
  const texto = data?.choices?.[0]?.message?.content
  if (!texto) throw new Error(`${cfg.nombre} respondió sin contenido`)
  return normalizarRespuesta(JSON.parse(texto), glosas)
}

/**
 * Lee una lista de glosas y devuelve los campos que logró extraer.
 *
 * Un lote que falla no bota a los demás: se registra y se sigue. Media cartola analizada es
 * mejor que ninguna, y lo que no se analiza queda igual que antes.
 */
async function analizarGlosas(glosas = []) {
  const cfg = proveedor()
  if (!cfg) throw new Error('No hay proveedor de IA configurado (falta GROQ_API_KEY o XAI_API_KEY).')
  if (!glosas.length) return { filas: [], errores: [] }

  const filas = []
  const errores = []
  let base = 0

  for (const lote of lotes(glosas)) {
    try {
      const parcial = await llamar(cfg, lote)
      // Los índices vienen relativos al lote; hay que devolverlos al espacio original.
      for (const f of parcial) filas.push({ ...f, indice: f.indice + base })
    } catch (err) {
      errores.push(err.message)
    }
    base += lote.length
  }

  return { filas, errores, proveedor: cfg.nombre, modelo: cfg.modelo }
}

module.exports = { disponible, analizarGlosas, construirPrompt, normalizarRespuesta, lotes, cuerpo, esRechazoDeEsquema, PROVEEDORES, LOTE }
