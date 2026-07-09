const prisma = require('../lib/prisma')

// Registra en BD cada request a los endpoints de integración externa (Comuro,
// formulario web, webinar): status, key usada, payload y error devuelto.
// Va ANTES de autenticarApiKey para capturar también los 401 (key mala/ausente).
const logIntegracion = (req, res, next) => {
  const inicio = Date.now()

  // Capturar el body de respuesta solo cuando es error
  const jsonOriginal = res.json.bind(res)
  res.json = (data) => {
    if (res.statusCode >= 400) {
      try { res.locals.cuerpoError = JSON.stringify(data).slice(0, 500) } catch { /* ignorar */ }
    }
    return jsonOriginal(data)
  }

  res.on('finish', () => {
    let payload = null
    try {
      if (req.body && Object.keys(req.body).length > 0) {
        const str = JSON.stringify(req.body)
        payload = str.length > 20000 ? { _truncado: true, inicio: str.slice(0, 2000) } : req.body
      }
    } catch { payload = null }

    prisma.logIntegracion.create({
      data: {
        endpoint: req.originalUrl.slice(0, 200),
        metodo: req.method,
        status: res.statusCode,
        apiKey: req.apiKey?.nombre || null,
        ip: (req.headers['x-forwarded-for'] || req.ip || '').toString().split(',')[0].slice(0, 60) || null,
        error: res.locals.cuerpoError || null,
        payload,
        duracionMs: Date.now() - inicio,
      }
    }).catch(err => console.error('logIntegracion:', err.message))
  })

  next()
}

module.exports = { logIntegracion }
