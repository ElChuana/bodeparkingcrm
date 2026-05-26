// Wrapper minimalista para Gemini API (REST). Sin SDK para evitar dependencias.
// Usa GEMINI_API_KEY del entorno.

const MODEL_DEFAULT = 'gemini-2.0-flash'
const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models'

async function generarContenido(prompt, { model = MODEL_DEFAULT, jsonMode = false, temperature = 0.4 } = {}) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY no configurada')

  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature,
      maxOutputTokens: 4096,
      ...(jsonMode ? { responseMimeType: 'application/json' } : {})
    }
  }

  const res = await fetch(`${API_URL}/${model}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Gemini API ${res.status}: ${errText.slice(0, 300)}`)
  }

  const data = await res.json()
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('Gemini respondió sin texto')

  if (jsonMode) {
    try { return JSON.parse(text) }
    catch (e) { throw new Error(`Gemini devolvió JSON inválido: ${text.slice(0, 200)}`) }
  }
  return text
}

module.exports = { generarContenido }
