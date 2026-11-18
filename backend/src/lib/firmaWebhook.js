// Verifica la firma de los webhooks de Resend (formato Svix).
// Resend manda tres headers: svix-id, svix-timestamp y svix-signature.
// La firma es HMAC-SHA256 de `${id}.${timestamp}.${cuerpoCrudo}` con el
// signing secret del webhook (whsec_<base64>), en base64, como "v1,<firma>".
// Puede venir más de una firma separada por espacio (rotación de secretos).
const crypto = require('crypto')

const TOLERANCIA_SEG = 5 * 60

function firmasEsperadas(secretos, contenido) {
  return secretos.map(s => {
    const clave = Buffer.from(s.replace(/^whsec_/, ''), 'base64')
    return crypto.createHmac('sha256', clave).update(contenido).digest('base64')
  })
}

function iguales(a, b) {
  const x = Buffer.from(a)
  const y = Buffer.from(b)
  return x.length === y.length && crypto.timingSafeEqual(x, y)
}

/**
 * @param {object} p
 * @param {string[]} p.secretos  signing secrets aceptados (uno por webhook)
 * @param {object}   p.headers   headers de la request (minúsculas, como Express)
 * @param {string|Buffer} p.cuerpo cuerpo crudo, sin parsear
 * @param {number}  [p.ahora]    segundos unix (para tests)
 * @returns {{ ok: true } | { ok: false, motivo: string }}
 */
function verificarFirmaResend({ secretos, headers, cuerpo, ahora = Math.floor(Date.now() / 1000) }) {
  const id = headers['svix-id']
  const ts = headers['svix-timestamp']
  const firma = headers['svix-signature']
  if (!id || !ts || !firma) return { ok: false, motivo: 'faltan headers svix' }
  if (!/^\d+$/.test(ts) || Math.abs(ahora - Number(ts)) > TOLERANCIA_SEG) {
    return { ok: false, motivo: 'timestamp fuera de rango' }
  }
  if (cuerpo === undefined || cuerpo === null) return { ok: false, motivo: 'sin cuerpo crudo' }

  const contenido = `${id}.${ts}.${Buffer.isBuffer(cuerpo) ? cuerpo.toString('utf8') : cuerpo}`
  const esperadas = firmasEsperadas(secretos, contenido)
  const recibidas = String(firma).split(' ').map(p => p.split(',')[1]).filter(Boolean)

  const valida = recibidas.some(r => esperadas.some(e => iguales(r, e)))
  return valida ? { ok: true } : { ok: false, motivo: 'firma inválida' }
}

function secretosConfigurados() {
  return (process.env.RESEND_WEBHOOK_SECRETS || '')
    .split(',').map(s => s.trim()).filter(Boolean)
}

module.exports = { verificarFirmaResend, secretosConfigurados }
