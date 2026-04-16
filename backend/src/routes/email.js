const express = require('express')
const router = express.Router()
const { body, validationResult } = require('express-validator')
const { enviarEmail } = require('../lib/mailer')
const { autenticar } = require('../middleware/auth')
const prisma = require('../lib/prisma')
const path = require('path')

// ─── POST /api/email/enviar ───────────────────────────────────────────────────
router.post('/enviar',
  autenticar,
  [
    body('para').isEmail().withMessage('Email destinatario inválido'),
    body('asunto').notEmpty().withMessage('Asunto requerido'),
    body('cuerpo').notEmpty().withMessage('Cuerpo requerido'),
  ],
  async (req, res) => {
    const errores = validationResult(req)
    if (!errores.isEmpty()) return res.status(400).json({ errores: errores.array() })

    const { para, cc, asunto, cuerpo, cotizacionId } = req.body

    // Obtener el email del usuario para usarlo como "from"
    const usuario = await prisma.usuario.findUnique({
      where: { id: req.usuario.id },
      select: { smtpEmail: true, nombre: true, apellido: true },
    })

    if (!usuario?.smtpEmail) {
      return res.status(400).json({
        error: 'No tienes configurado tu email. Ve a tu perfil y agrega tu dirección de correo.',
      })
    }

    try {
      const adjuntos = []

      if (cotizacionId) {
        const cot = await prisma.cotizacion.findUnique({
          where: { id: parseInt(cotizacionId) },
          select: { id: true },
        })
        if (cot) {
          const pdfPath = path.join(__dirname, '../../uploads/cotizaciones', `cotizacion_${cotizacionId}.pdf`)
          const fs = require('fs')
          if (fs.existsSync(pdfPath)) {
            adjuntos.push({
              filename: `Cotizacion_BodeParking_${cotizacionId}.pdf`,
              path: pdfPath,
            })
          }
        }
      }

      const htmlCuerpo = cuerpo.includes('<') ? cuerpo : cuerpo.replace(/\n/g, '<br>')

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          ${htmlCuerpo}
          <hr style="margin-top: 32px; border: none; border-top: 1px solid #eee;">
          <p style="color: #999; font-size: 12px;">
            Enviado desde BodeParking CRM · <a href="https://bodeparking.cl">bodeparking.cl</a>
          </p>
        </div>
      `

      const fromLabel = `${usuario.nombre} ${usuario.apellido} <${usuario.smtpEmail}>`
      await enviarEmail({ para, cc, asunto, html, adjuntos, smtpEmail: fromLabel })

      if (req.body.leadId) {
        await prisma.interaccion.create({
          data: {
            leadId: parseInt(req.body.leadId),
            usuarioId: req.usuario.id,
            tipo: 'EMAIL',
            descripcion: `Email enviado: "${asunto}" → ${para}`,
          }
        }).catch(() => {})
      }

      res.json({ ok: true, mensaje: `Email enviado a ${para}` })
    } catch (err) {
      console.error('[Email] Error:', err.message)
      res.status(500).json({ error: 'No se pudo enviar el email.', detalle: err.message })
    }
  }
)

// ─── GET /api/email/verificar ─────────────────────────────────────────────────
router.get('/verificar', autenticar, async (req, res) => {
  const usuario = await prisma.usuario.findUnique({
    where: { id: req.usuario.id },
    select: { smtpEmail: true },
  })

  if (!usuario?.smtpEmail) {
    return res.status(400).json({
      ok: false,
      error: 'No tienes configurado tu email. Ve a tu perfil.',
    })
  }

  // Con Resend no hay conexión SMTP que verificar — solo confirmamos que la API key existe
  if (!process.env.RESEND_API_KEY) {
    return res.status(500).json({ ok: false, error: 'RESEND_API_KEY no configurada en el servidor.' })
  }

  res.json({ ok: true, mensaje: `Email configurado: ${usuario.smtpEmail}` })
})

// ─── GET /api/email/config ────────────────────────────────────────────────────
router.get('/config', autenticar, async (req, res) => {
  const usuario = await prisma.usuario.findUnique({
    where: { id: req.usuario.id },
    select: { smtpEmail: true },
  })
  res.json({ smtpEmail: usuario?.smtpEmail || null })
})

// ─── PUT /api/email/config ────────────────────────────────────────────────────
router.put('/config',
  autenticar,
  [
    body('smtpEmail').isEmail().withMessage('Email inválido'),
  ],
  async (req, res) => {
    const errores = validationResult(req)
    if (!errores.isEmpty()) return res.status(400).json({ errores: errores.array() })

    const { smtpEmail } = req.body

    await prisma.usuario.update({
      where: { id: req.usuario.id },
      data: { smtpEmail },
    })

    res.json({ ok: true, mensaje: 'Email configurado correctamente.' })
  }
)

module.exports = router
