const { Resend } = require('resend')

function getResend() {
  if (!process.env.RESEND_API_KEY) throw new Error('RESEND_API_KEY no configurada en el servidor.')
  return new Resend(process.env.RESEND_API_KEY)
}

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
async function enviarEmail({ para, cc, asunto, html, texto, adjuntos = [], smtpEmail, replyTo }) {
  const from = smtpEmail || process.env.SMTP_FROM || 'BodeParking CRM <noreply@bodeparking.cl>'

  // Convertir adjuntos al formato de Resend: { filename, content (Buffer) }
  const attachments = adjuntos.map(a => {
    if (a.path) {
      const fs = require('fs')
      return {
        filename: a.filename,
        content: fs.readFileSync(a.path),
      }
    }
    // a.content es base64 string desde el frontend
    return {
      filename: a.filename,
      content: Buffer.from(a.content, 'base64'),
    }
  })

  const payload = {
    from,
    to: [para],
    cc: cc ? [cc] : undefined,
    replyTo: replyTo || undefined,
    subject: asunto,
    html: html || undefined,
    text: texto || undefined,
    attachments: attachments.length ? attachments : undefined,
  }

  const { data, error } = await getResend().emails.send(payload)
  if (error) throw new Error(error.message || JSON.stringify(error))
  return data
}

module.exports = { enviarEmail }
