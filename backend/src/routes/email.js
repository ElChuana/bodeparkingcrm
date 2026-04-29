const express = require('express')
const router = express.Router()
const { body, validationResult } = require('express-validator')
const { enviarEmail } = require('../lib/mailer')
const { autenticar } = require('../middleware/auth')
const prisma = require('../lib/prisma')
const { Resend } = require('resend')

// Quita texto citado del HTML de un reply — corta en el primer marcador de cita
function limpiarReply(html) {
  if (!html) return ''
  const lower = html.toLowerCase()

  // 1) Marcadores de contenedor de cita
  const marcadores = [
    'class="gmail_quote"',
    "class='gmail_quote'",
    'id="divrplyfwdmsg"',
    'id="stopspelling"',
    'class="yahoo_quoted"',
    '<blockquote type="cite"',
    '<blockquote',
  ]

  let corte = html.length
  for (const m of marcadores) {
    const idx = lower.indexOf(m)
    if (idx === -1) continue
    // Retroceder hasta el < que abre el tag
    let inicio = idx
    while (inicio > 0 && html[inicio] !== '<') inicio--
    if (inicio < corte) corte = inicio
  }

  // 2) Si hay cita, buscar la línea de atribución ANTES del marcador
  // Patrón específico: "El lun/mar/mié/jue/vie/sáb/dom," o "On Mon/Tue/Wed..."
  // Nunca matchea texto normal que empiece con "El" o "On"
  if (corte < html.length) {
    const antes = html.substring(0, corte)
    const DIAS_ES = 'lun|mar|mi[eé]|jue|vie|s[aá]b|dom|lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo'
    const DIAS_EN = 'Mon|Tue|Wed|Thu|Fri|Sat|Sun|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday'
    const patronAtribucion = new RegExp(`<[^>]*>\\s*(?:El|On)\\s+(?:${DIAS_ES}|${DIAS_EN})[,\\s]`, 'i')
    const attrIdx = antes.search(patronAtribucion)
    if (attrIdx !== -1) corte = attrIdx
  }

  let clean = html.substring(0, corte).replace(/(\s*<br\s*\/?>\s*)+$/gi, '').trim()
  return clean || html
}

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

    const { para, cc, asunto, cuerpo, cotizacionId, pdfBase64, pdfNombre } = req.body

    // Obtener el email del usuario para usarlo como "from"
    const usuario = await prisma.usuario.findUnique({
      where: { id: req.usuario.id },
      select: { smtpEmail: true, nombre: true, apellido: true, firma: true },
    })

    if (!usuario?.smtpEmail) {
      return res.status(400).json({
        error: 'No tienes configurado tu email. Ve a tu perfil y agrega tu dirección de correo.',
      })
    }

    try {
      const adjuntos = []

      if (pdfBase64 && pdfNombre) {
        adjuntos.push({
          filename: pdfNombre,
          content: pdfBase64,
        })
      }

      const htmlCuerpo = cuerpo.includes('<') ? cuerpo : cuerpo.replace(/\n/g, '<br>')

      const firmaHtml = usuario.firma
        ? `<hr style="margin-top: 32px; border: none; border-top: 1px solid #eee;">${usuario.firma}`
        : `<hr style="margin-top: 32px; border: none; border-top: 1px solid #eee;"><p style="color: #999; font-size: 12px;">Enviado desde BodeParking CRM · <a href="https://bodeparking.cl">bodeparking.cl</a></p>`

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          ${htmlCuerpo}
          ${firmaHtml}
        </div>
      `

      const fromLabel = `${usuario.nombre} ${usuario.apellido} <${usuario.smtpEmail}>`
      const leadId = req.body.leadId ? parseInt(req.body.leadId) : null

      // Reply-To apunta a dirección inbound codificada con leadId
      const inboundDomain = process.env.INBOUND_DOMAIN
      const replyTo = (leadId && inboundDomain)
        ? `lead-${leadId}@${inboundDomain}`
        : undefined

      console.log('[Email] leadId:', leadId, '| INBOUND_DOMAIN:', inboundDomain, '| replyTo:', replyTo)

      const result = await enviarEmail({ para, cc, asunto, html, adjuntos, smtpEmail: fromLabel, replyTo })

      if (leadId) {
        const mensajeId = result?.id || null
        await Promise.all([
          prisma.emailConversacion.create({
            data: {
              leadId,
              messageId: mensajeId,
              direction: 'ENVIADO',
              asunto,
              cuerpo: html,
              de: fromLabel,
              para,
              usuarioId: req.usuario.id,
            }
          }),
          prisma.interaccion.create({
            data: {
              leadId,
              usuarioId: req.usuario.id,
              tipo: 'EMAIL',
              descripcion: `Email enviado: "${asunto}" → ${para}`,
            }
          }),
        ]).catch(e => console.error('[Email] Error guardando conversación:', e))
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
    select: { smtpEmail: true, plantillaEmail: true, plantillaCotizacion: true },
  })
  res.json({
    smtpEmail: usuario?.smtpEmail || null,
    plantillaEmail: usuario?.plantillaEmail || null,
    plantillaCotizacion: usuario?.plantillaCotizacion || null,
  })
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

    const { smtpEmail, plantillaEmail, plantillaCotizacion } = req.body

    await prisma.usuario.update({
      where: { id: req.usuario.id },
      data: {
        smtpEmail,
        ...(plantillaEmail !== undefined && { plantillaEmail: plantillaEmail || null }),
        ...(plantillaCotizacion !== undefined && { plantillaCotizacion: plantillaCotizacion || null }),
      },
    })

    res.json({ ok: true, mensaje: 'Configuración guardada correctamente.' })
  }
)

// ─── GET /api/email/firma ─────────────────────────────────────────────────────
router.get('/firma', autenticar, async (req, res) => {
  const usuario = await prisma.usuario.findUnique({
    where: { id: req.usuario.id },
    select: { firma: true },
  })
  res.json({ firma: usuario?.firma || null })
})

// ─── PUT /api/email/firma ─────────────────────────────────────────────────────
router.put('/firma', autenticar, async (req, res) => {
  const { firma } = req.body
  await prisma.usuario.update({
    where: { id: req.usuario.id },
    data: { firma: firma || null },
  })
  res.json({ ok: true })
})

// ─── POST /api/email/respuesta — webhook inbound Resend ───────────────────────
// El payload de Resend solo trae metadatos (sin body). Se llama al API para obtener HTML.
// Evento: { type: "email.received", data: { email_id, from, to, subject, ... } }
router.post('/respuesta', async (req, res) => {
  // Responder 200 rápido — Resend reintenta si no recibe 2xx en tiempo
  res.json({ ok: true })

  try {
    const { type, data } = req.body
    console.log('[Inbound] payload recibido:', JSON.stringify({ type, data }))

    if (type !== 'email.received' || !data?.email_id) {
      console.warn('[Inbound] tipo inesperado o sin email_id:', type, data?.email_id)
      return
    }

    const toList = Array.isArray(data.to) ? data.to : [data.to]
    const toEmail = toList[0] || ''
    console.log('[Inbound] to:', toEmail)

    // Extraer leadId del patrón lead-{id}@...
    const match = toEmail.match(/lead-(\d+)@/)
    if (!match) {
      console.warn('[Inbound] To sin patrón lead-{id}@:', toEmail)
      return
    }
    const leadId = parseInt(match[1])
    console.log('[Inbound] leadId extraído:', leadId)

    const lead = await prisma.lead.findUnique({ where: { id: leadId }, select: { id: true } })
    if (!lead) { console.warn('[Inbound] lead no existe:', leadId); return }

    // Intentar obtener body desde el webhook directo, o vía API de Resend
    let asunto    = data.subject || '(sin asunto)'
    let cuerpo    = data.html || data.text || ''
    let deEmail   = data.from || ''
    let msgId     = data.message_id || data.email_id
    let inReplyTo = null

    if (!cuerpo) {
      // Webhook no incluye body — obtener via API /emails/receiving/{id}
      try {
        const axios = require('axios')
        const { data: email } = await axios.get(
          `https://api.resend.com/emails/receiving/${data.email_id}`,
          { headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` } }
        )
        console.log('[Inbound] email obtenido — subject:', email?.subject, '| html length:', email?.html?.length)
        asunto    = email.subject || asunto
        cuerpo    = limpiarReply(email.html) || email.text || ''
        deEmail   = email.from || deEmail
        msgId     = email.message_id || msgId
      } catch (apiErr) {
        console.warn('[Inbound] No se pudo obtener body:', apiErr.message, apiErr.response?.data)
      }
    }

    await prisma.emailConversacion.create({
      data: { leadId, messageId: msgId, inReplyTo, direction: 'RECIBIDO', asunto, cuerpo, de: deEmail, para: toEmail }
    })
    console.log('[Inbound] guardado en BD ✓')

    await prisma.interaccion.create({
      data: { leadId, tipo: 'EMAIL', descripcion: `Email recibido: "${asunto}" de ${deEmail}` }
    }).catch(() => {})

  } catch (err) {
    console.error('[Inbound] Error procesando webhook:', err.message, err.response?.data)
  }
})

// ─── GET /api/email/conversacion/:leadId ──────────────────────────────────────
router.get('/conversacion/:leadId', autenticar, async (req, res) => {
  const { leadId } = req.params
  try {
    const emails = await prisma.emailConversacion.findMany({
      where: { leadId: parseInt(leadId) },
      include: { usuario: { select: { nombre: true, apellido: true } } },
      orderBy: { creadoEn: 'asc' },
    })
    res.json(emails)
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener conversación.' })
  }
})

module.exports = router
