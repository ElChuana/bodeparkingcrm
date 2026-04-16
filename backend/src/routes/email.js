const express = require('express')
const router = express.Router()
const { body, validationResult } = require('express-validator')
const { enviarEmail, crearTransporter } = require('../lib/mailer')
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

    // Obtener credenciales SMTP del usuario logueado
    const usuario = await prisma.usuario.findUnique({
      where: { id: req.usuario.id },
      select: { smtpEmail: true, smtpPassword: true },
    })

    if (!usuario?.smtpEmail || !usuario?.smtpPassword) {
      return res.status(400).json({
        error: 'No tienes configurado tu email. Ve a tu perfil y agrega tus credenciales de correo.',
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
              contentType: 'application/pdf',
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

      await enviarEmail({
        para, cc, asunto, html, adjuntos,
        smtpEmail: usuario.smtpEmail,
        smtpPassword: usuario.smtpPassword,
      })

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
// Verifica la conexión SMTP del usuario logueado
router.get('/verificar', autenticar, async (req, res) => {
  const usuario = await prisma.usuario.findUnique({
    where: { id: req.usuario.id },
    select: { smtpEmail: true, smtpPassword: true },
  })

  if (!usuario?.smtpEmail || !usuario?.smtpPassword) {
    return res.status(400).json({
      ok: false,
      error: 'No tienes configurado tu email. Ve a tu perfil y agrega tus credenciales.',
    })
  }

  try {
    const t = crearTransporter(usuario.smtpEmail, usuario.smtpPassword)
    await t.verify()
    res.json({ ok: true, mensaje: `Conexión SMTP verificada para ${usuario.smtpEmail}` })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

// ─── GET /api/email/config ────────────────────────────────────────────────────
// Obtener configuración SMTP del usuario (sin exponer la contraseña)
router.get('/config', autenticar, async (req, res) => {
  const usuario = await prisma.usuario.findUnique({
    where: { id: req.usuario.id },
    select: { smtpEmail: true, smtpPassword: true },
  })
  res.json({
    smtpEmail: usuario?.smtpEmail || null,
    tienePassword: !!usuario?.smtpPassword,
  })
})

// ─── PUT /api/email/config ────────────────────────────────────────────────────
// Guardar credenciales SMTP del usuario
router.put('/config',
  autenticar,
  [
    body('smtpEmail').isEmail().withMessage('Email inválido'),
    body('smtpPassword').notEmpty().withMessage('Contraseña requerida'),
  ],
  async (req, res) => {
    const errores = validationResult(req)
    if (!errores.isEmpty()) return res.status(400).json({ errores: errores.array() })

    const { smtpEmail, smtpPassword } = req.body

    // Verificar que las credenciales funcionan antes de guardar
    try {
      const t = crearTransporter(smtpEmail, smtpPassword)
      await t.verify()
    } catch (err) {
      return res.status(400).json({
        error: 'No se pudo conectar con esas credenciales. Verifica tu email y contraseña.',
        detalle: err.message,
      })
    }

    await prisma.usuario.update({
      where: { id: req.usuario.id },
      data: { smtpEmail, smtpPassword },
    })

    res.json({ ok: true, mensaje: 'Credenciales de correo guardadas correctamente.' })
  }
)

module.exports = router
