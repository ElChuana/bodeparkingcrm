// Wrapper para Groq API (OpenAI-compatible). Sin SDK, fetch nativo.
// Maneja rate limit 429 con reintento automático.

const MODEL_DEFAULT = 'llama-3.3-70b-versatile'
const API_URL = 'https://api.groq.com/openai/v1/chat/completions'

const sleep = ms => new Promise(r => setTimeout(r, ms))

async function _llamar(body, apiKey) {
  return fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(body)
  })
}

async function generarContenido(prompt, { model = MODEL_DEFAULT, jsonMode = false, temperature = 0.4 } = {}) {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) throw new Error('GROQ_API_KEY no configurada')

  const body = {
    model,
    messages: [{ role: 'user', content: prompt }],
    temperature,
    max_tokens: 4096,
    ...(jsonMode ? { response_format: { type: 'json_object' } } : {})
  }

  let res = await _llamar(body, apiKey)

  // Reintento automático si es 429 (rate limit)
  if (res.status === 429) {
    const errText = await res.text()
    // Buscar "try again in Xs" en el mensaje
    const m = errText.match(/try again in ([\d.]+)s/)
    const espera = m ? Math.ceil(parseFloat(m[1])) + 2 : 30 // +2s de margen
    console.log(`[Groq] Rate limit alcanzado, esperando ${espera}s antes de reintentar...`)
    await sleep(espera * 1000)
    res = await _llamar(body, apiKey)
  }

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Groq API ${res.status}: ${errText.slice(0, 300)}`)
  }

  const data = await res.json()
  const text = data?.choices?.[0]?.message?.content
  if (!text) throw new Error('Groq respondió sin contenido')

  if (jsonMode) {
    try { return JSON.parse(text) }
    catch (e) { throw new Error(`Groq devolvió JSON inválido: ${text.slice(0, 200)}`) }
  }
  return text
}

module.exports = { generarContenido }
