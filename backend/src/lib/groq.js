// Wrapper para Groq API (OpenAI-compatible). Sin SDK, fetch nativo.
// Usa GROQ_API_KEY del entorno.

const MODEL_DEFAULT = 'llama-3.3-70b-versatile'
const API_URL = 'https://api.groq.com/openai/v1/chat/completions'

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

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify(body)
  })

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
