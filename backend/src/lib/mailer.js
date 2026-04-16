const { Resend } = require('resend')

const resend = new Resend(process.env.RESEND_API_KEY)

/**
 * Envía un email usando Resend.
 * @param {object} opts
 * @param {string} opts.para
 * @param {string} [opts.cc]
 * @param {string} opts.asunto
 * @param {string} [opts.html]
 * @param {string} [opts.texto]
 * @param {array}  [opts.adjuntos]  [{ filename, content (Buffer|base64), contentType }]
 * @param {string} [opts.smtpEmail]  dirección "from" del usuario
 */
async function enviarEmail({ para, cc, asunto, html, texto, adjuntos = [], smtpEmail }) {
  const from = smtpEmail || process.env.SMTP_FROM || 'BodeParking CRM <noreply@bodeparking.cl>'

  // Convertir adjuntos al formato de Resend: { filename, content (base64 string) }
  const attachments = adjuntos.map(a => {
    if (a.path) {
      const fs = require('fs')
      return {
        filename: a.filename,
        content: fs.readFileSync(a.path).toString('base64'),
      }
    }
    return { filename: a.filename, content: a.content }
  })

  const payload = {
    from,
    to: [para],
    cc: cc ? [cc] : undefined,
    subject: asunto,
    html: html || undefined,
    text: texto || undefined,
    attachments: attachments.length ? attachments : undefined,
  }

  const { data, error } = await resend.emails.send(payload)
  if (error) throw new Error(error.message || JSON.stringify(error))
  return data
}

module.exports = { enviarEmail }
