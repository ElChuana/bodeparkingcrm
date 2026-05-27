const { Resend } = require('resend')

function getResend() {
  if (!process.env.RESEND_API_KEY) throw new Error('RESEND_API_KEY no configurada en el servidor.')
  return new Resend(process.env.RESEND_API_KEY)
}

// Normaliza string|string[]|undefined a array de emails limpios (sin duplicados ni vacíos)
function toEmailArray(v) {
  if (!v) return []
  if (Array.isArray(v)) return [...new Set(v.map(s => String(s).trim()).filter(Boolean))]
  return [...new Set(String(v).split(/[,;]/).map(s => s.trim()).filter(Boolean))]
}

/**
 * Envía un email usando Resend.
 * @param {object} opts
 * @param {string} opts.para
 * @param {string|string[]} [opts.cc]
 * @param {string|string[]} [opts.bcc]
 * @param {string} opts.asunto
 * @param {string} [opts.html]
 * @param {string} [opts.texto]
 * @param {array}  [opts.adjuntos]
 * @param {string} [opts.smtpEmail]
 */
async function enviarEmail({ para, cc, bcc, asunto, html, texto, adjuntos = [], smtpEmail, replyTo }) {
  const from = smtpEmail || process.env.SMTP_FROM || 'BodeParking CRM <noreply@bodeparking.cl>'

  const attachments = adjuntos.map(a => {
    if (a.path) {
      const fs = require('fs')
      return { filename: a.filename, content: fs.readFileSync(a.path) }
    }
    return { filename: a.filename, content: Buffer.from(a.content, 'base64') }
  })

  const ccArr = toEmailArray(cc)
  const bccArr = toEmailArray(bcc)

  const payload = {
    from,
    to: [para],
    cc: ccArr.length ? ccArr : undefined,
    bcc: bccArr.length ? bccArr : undefined,
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
