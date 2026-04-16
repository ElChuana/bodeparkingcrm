const express = require('express')
const router = express.Router()
const { body, validationResult } = require('express-validator')
const { enviarEmail } = require('../lib/mailer')
const { verificarToken } = require('../middleware/auth')
const prisma = require('../lib/prisma')
const path = require('path')

// ─── POST /api/email/enviar ───────────────────────────────────────────────────
// Enviar email libre (con o sin adjunto de cotización)
router.post('/enviar',
  verificarToken,
  [
    body('para').isEmail().withMessage('Email destinatario inválido'),
    body('asunto').notEmpty().withMessage('Asunto requerido'),
    body('cuerpo').notEmpty().withMessage('Cuerpo requerido'),
  ],
  async (req, res) => {
    const errores = validationResult(req)
    if (!errores.isEmpty()) return res.status(400).json({ errores: errores.array() })

    const { para, cc, asunto, cuerpo, cotizacionId } = req.body

    try {
      const adjuntos = []

      // Si viene cotizacionId, adjuntar PDF si existe
      if (cotizacionId) {
        const cot = await prisma.cotizacion.findUnique({
          where: { id: parseInt(cotizacionId) },
          select: { id: true, lead: { select: { contacto: { select: { nombre: true, apellido: true } } } } }
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

      // Convertir saltos de línea a HTML si el cuerpo es texto plano
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

      await enviarEmail({ para, cc, asunto, html, adjuntos })

      // Registrar como interacción si viene leadId
      if (req.body.leadId) {
        await prisma.interaccion.create({
          data: {
            leadId: parseInt(req.body.leadId),
            usuarioId: req.usuario.id,
            tipo: 'EMAIL',
            descripcion: `Email enviado: "${asunto}" → ${para}`,
          }
        }).catch(() => {}) // no fallar si no se puede registrar
      }

      res.json({ ok: true, mensaje: `Email enviado a ${para}` })
    } catch (err) {
      console.error('[Email] Error:', err.message)
      res.status(500).json({ error: 'No se pudo enviar el email.', detalle: err.message })
    }
  }
)

// ─── POST /api/email/verificar ────────────────────────────────────────────────
// Verificar conexión SMTP (solo GERENTE/JEFE_VENTAS)
router.get('/verificar', verificarToken, async (req, res) => {
  try {
    const { transporter } = require('../lib/mailer')
    await transporter.verify()
    res.json({ ok: true, mensaje: 'Conexión SMTP verificada correctamente.' })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

module.exports = router
