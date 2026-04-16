const nodemailer = require('nodemailer')

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '465'),
  secure: parseInt(process.env.SMTP_PORT || '465') === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    rejectUnauthorized: false, // cPanel a veces usa cert autofirmado
  },
})

async function enviarEmail({ para, cc, asunto, html, texto, adjuntos = [] }) {
  const info = await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: para,
    cc: cc || undefined,
    subject: asunto,
    text: texto || undefined,
    html: html || undefined,
    attachments: adjuntos, // [{ filename, path | content, contentType }]
  })
  return info
}

module.exports = { transporter, enviarEmail }
