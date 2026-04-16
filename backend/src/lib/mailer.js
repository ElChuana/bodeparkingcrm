const nodemailer = require('nodemailer')

// Transporter global (usa variables de entorno) — para compatibilidad hacia atrás
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'mail.bodeparking.cl',
  port: parseInt(process.env.SMTP_PORT || '465'),
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: { rejectUnauthorized: false },
})

/**
 * Crea un transporter con credenciales específicas de usuario.
 * @param {string} smtpEmail
 * @param {string} smtpPassword
 */
function crearTransporter(smtpEmail, smtpPassword) {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'mail.bodeparking.cl',
    port: parseInt(process.env.SMTP_PORT || '465'),
    secure: true,
    auth: { user: smtpEmail, pass: smtpPassword },
    tls: { rejectUnauthorized: false },
  })
}

/**
 * Envía un email.
 * @param {object} opts
 * @param {string} opts.para
 * @param {string} [opts.cc]
 * @param {string} opts.asunto
 * @param {string} [opts.html]
 * @param {string} [opts.texto]
 * @param {array}  [opts.adjuntos]
 * @param {string} [opts.smtpEmail]   - si se provee, usa estas credenciales
 * @param {string} [opts.smtpPassword]
 */
async function enviarEmail({ para, cc, asunto, html, texto, adjuntos = [], smtpEmail, smtpPassword }) {
  const t = smtpEmail && smtpPassword
    ? crearTransporter(smtpEmail, smtpPassword)
    : transporter

  const from = smtpEmail || process.env.SMTP_FROM || process.env.SMTP_USER

  const info = await t.sendMail({
    from,
    to: para,
    cc: cc || undefined,
    subject: asunto,
    text: texto || undefined,
    html: html || undefined,
    attachments: adjuntos,
  })
  return info
}

module.exports = { transporter, crearTransporter, enviarEmail }
