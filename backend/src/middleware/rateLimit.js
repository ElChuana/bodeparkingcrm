// Rate limiting en memoria para los endpoints de integración externa.
// El backend corre como un solo proceso en Railway, así que un contador en
// memoria alcanza; si algún día hay varias instancias, esto pasa a Redis.
//
// Objetivo: que una key filtrada no pueda inflar la base de contactos ni
// martillar la BD. Los volúmenes reales son de decenas de requests por hora.

// clave → { conteo, expira }
const ventanas = new Map()

// Limpieza periódica de ventanas vencidas (evita que el Map crezca sin control)
const LIMPIEZA_MS = 10 * 60 * 1000
setInterval(() => {
  const ahora = Date.now()
  for (const [k, v] of ventanas) if (v.expira <= ahora) ventanas.delete(k)
}, LIMPIEZA_MS).unref()

// Identidad del cliente: la API Key si ya se autenticó, si no la IP.
function identificar(req) {
  if (req.apiKey?.id) return `key:${req.apiKey.id}`
  const ip = (req.headers['x-forwarded-for'] || req.ip || '').toString().split(',')[0].trim()
  return `ip:${ip || 'desconocida'}`
}

/**
 * @param {object} opts
 * @param {number} opts.max        requests permitidos por ventana
 * @param {number} opts.ventanaMs  largo de la ventana
 * @param {string} opts.nombre     etiqueta para el log
 */
function rateLimit({ max = 60, ventanaMs = 60_000, nombre = 'api' } = {}) {
  return (req, res, next) => {
    const clave = `${nombre}:${identificar(req)}`
    const ahora = Date.now()
    const actual = ventanas.get(clave)

    if (!actual || actual.expira <= ahora) {
      ventanas.set(clave, { conteo: 1, expira: ahora + ventanaMs })
      return next()
    }

    actual.conteo++
    if (actual.conteo > max) {
      const esperaSeg = Math.ceil((actual.expira - ahora) / 1000)
      res.set('Retry-After', String(esperaSeg))
      console.warn(`[rateLimit] ${clave} bloqueado (${actual.conteo} en la ventana)`)
      return res.status(429).json({
        error: 'Demasiadas solicitudes. Reintenta más tarde.',
        reintentar_en_segundos: esperaSeg,
      })
    }
    next()
  }
}

// Solo para tests
const _resetear = () => ventanas.clear()

module.exports = { rateLimit, _resetear }
