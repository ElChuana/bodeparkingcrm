const prisma = require('../lib/prisma')

// Autenticación por API Key para integraciones externas (Comuro, formularios, webhooks).
// Acepta la key en: header X-Api-Key, o header Authorization (Bearer o directo).
//
// La key por query param (?api_key=) se quitó el 2026-08-10: quedaba escrita en
// texto plano en logs_integraciones.endpoint (y en cualquier log de proxy o
// historial intermedio). Ninguna integración la usaba así (0 de 509 llamadas
// registradas) — si alguna la necesita, debe migrar al header.
const autenticarApiKey = async (req, res, next) => {
  const authHeader = req.headers['authorization'] || ''
  const key =
    req.headers['x-api-key'] ||
    (authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader) ||
    null
  if (!key) return res.status(401).json({ error: 'API Key requerida (header X-Api-Key).' })

  const apiKey = await prisma.apiKey.findUnique({ where: { key } })
  if (!apiKey || !apiKey.activa) return res.status(401).json({ error: 'API Key inválida o desactivada.' })

  req.apiKey = apiKey
  next()
}

// Guard para endpoints de LECTURA: rechaza keys marcadas soloEscritura.
// Las keys existentes tienen soloEscritura=false (default) → pasan igual que siempre.
// Debe ir DESPUÉS de autenticarApiKey en la cadena de la ruta.
const bloquearSoloEscritura = (req, res, next) => {
  if (req.apiKey?.soloEscritura) {
    return res.status(403).json({ error: 'Esta API Key es de solo escritura; no puede consultar datos.' })
  }
  next()
}

module.exports = { autenticarApiKey, bloquearSoloEscritura }
