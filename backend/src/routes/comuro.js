const express = require('express')
const router = express.Router()
const prisma = require('../lib/prisma')

// ─── Similitud de nombres (Levenshtein normalizado) ───────────────
function normalizarNombre(s) {
  return (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]/g, '').trim()
}
function levenshtein(a, b) {
  const m = a.length, n = b.length
  const dp = Array.from({ length: m + 1 }, (_, i) => Array.from({ length: n + 1 }, (_, j) => i === 0 ? j : j === 0 ? i : 0))
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1] : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1])
  return dp[m][n]
}
function mismoNombre(nombreCompleto1, nombreCompleto2) {
  const s1 = normalizarNombre(nombreCompleto1)
  const s2 = normalizarNombre(nombreCompleto2)
  if (!s1 || !s2) return true
  const maxLen = Math.max(s1.length, s2.length)
  if (maxLen === 0) return true
  return (1 - levenshtein(s1, s2) / maxLen) >= 0.6
}

// Helper: notificar a gerentes y jefes de ventas sobre nuevo lead
async function notificarLead({ leadId, mensaje, tipo }) {
  try {
    const destinatarios = await prisma.usuario.findMany({
      where: {
        notificacionesActivas: true,
        activo: true,
        OR: [{ rol: 'GERENTE' }, { rol: 'JEFE_VENTAS' }]
      },
      select: { id: true }
    })
    if (!destinatarios.length) return
    await prisma.notificacion.createMany({
      data: destinatarios.map(u => ({
        usuarioId: u.id, tipo, mensaje, referenciaId: leadId, referenciaTipo: 'lead'
      })),
      skipDuplicates: true
    })
  } catch (err) {
    console.error(`[comuro notificarLead lead=${leadId}]`, err.message)
  }
}

// Middleware: autenticar por API Key (header Authorization, X-API-Key, o query param)
const autenticarApiKey = async (req, res, next) => {
  const authHeader = req.headers['authorization'] || ''
  const key =
    req.headers['x-api-key'] ||
    req.query.api_key ||
    (authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader) ||
    null
  if (!key) return res.status(401).json({ error: 'API Key requerida.' })

  const apiKey = await prisma.apiKey.findUnique({ where: { key } })
  if (!apiKey || !apiKey.activa) return res.status(401).json({ error: 'API Key inválida o desactivada.' })

  next()
}

// POST /api/leads/upsert
router.post('/upsert', autenticarApiKey, async (req, res) => {
  const body = req.body
  const { phone, name, internal_uuid, external_id, project, email } = body

  try {
    let lead = null

    // 1. Buscar por internal_uuid (comuroUuid)
    if (internal_uuid) {
      lead = await prisma.lead.findUnique({ where: { comuroUuid: internal_uuid } })
    }

    // 2. Buscar por phone + nombre similar
    if (!lead && phone) {
      const telefonoNormalizado = phone.replace(/\D/g, '')
      const nombreEntrante = name || body.nombre_whatsapp || ''
      const candidatos = await prisma.contacto.findMany({
        where: { telefono: { contains: telefonoNormalizado } },
        select: { id: true, nombre: true, apellido: true }
      })
      // Filtrar por similitud de nombre
      const contacto = candidatos.find(c =>
        mismoNombre(nombreEntrante, `${c.nombre} ${c.apellido}`)
      ) || null

      if (contacto) {
        // Intentar coincidir por campaña primero
        if (project) {
          lead = await prisma.lead.findFirst({
            where: { contactoId: contacto.id, campana: { contains: project, mode: 'insensitive' } }
          })
        }
        // Si no hay coincidencia por campaña, tomar cualquier lead activo del mismo contacto
        if (!lead) {
          lead = await prisma.lead.findFirst({
            where: { contactoId: contacto.id, etapa: { notIn: ['PERDIDO'] } },
            orderBy: { creadoEn: 'desc' }
          })
        }
      }
    }

    // 3. Buscar por email (email es identificador seguro, no requiere validar nombre)
    if (!lead && body.email) {
      const contactoPorEmail = await prisma.contacto.findFirst({
        where: { email: { equals: body.email, mode: 'insensitive' } }
      })
      if (contactoPorEmail) {
        lead = await prisma.lead.findFirst({
          where: { contactoId: contactoPorEmail.id, etapa: { notIn: ['PERDIDO'] } },
          orderBy: { creadoEn: 'desc' }
        })
      }
    }

    // 4. Buscar por external_id (comuroThreadId como fallback)
    if (!lead && external_id) {
      lead = await prisma.lead.findFirst({ where: { comuroThreadId: external_id } })
    }

    // Construir comuroData: merge con data existente, no sobrescribir con null
    const comuroDataActual = (lead?.comuroData && typeof lead.comuroData === 'object') ? lead.comuroData : {}
    const nuevosValores = {}
    for (const [k, v] of Object.entries(body)) {
      if (v !== null && v !== undefined && v !== '') {
        nuevosValores[k] = v
      }
    }
    const comuroDataFinal = { ...comuroDataActual, ...nuevosValores }

    if (lead) {
      // UPDATE
      await prisma.lead.update({
        where: { id: lead.id },
        data: {
          comuroData: comuroDataFinal,
          ...(internal_uuid && { comuroUuid: internal_uuid }),
          ...(body.thread_id && { comuroThreadId: body.thread_id }),
        }
      })
      return res.status(200).json({ lead_id: String(lead.id), status: 'updated' })
    }

    // CREATE: crear contacto + lead
    const nombreCompleto = name || body.nombre_whatsapp || 'Sin nombre'
    const partes = nombreCompleto.trim().split(' ')
    const nombreContacto = partes[0]
    const apellidoContacto = partes.slice(1).join(' ') || '-'
    const telefonoContacto = phone ? phone.replace(/\D/g, '') : null

    const contactoNuevo = await prisma.contacto.create({
      data: {
        nombre: nombreContacto,
        apellido: apellidoContacto,
        email: email || body.correo || null,
        telefono: telefonoContacto,
        origen: 'WEB',
      }
    })

    const leadNuevo = await prisma.lead.create({
      data: {
        contactoId: contactoNuevo.id,
        campana: project || null,
        etapa: 'NUEVO',
        comuroData: comuroDataFinal,
        ...(internal_uuid && { comuroUuid: internal_uuid }),
        ...(body.thread_id && { comuroThreadId: body.thread_id }),
      }
    })

    notificarLead({
      leadId: leadNuevo.id,
      mensaje: `Nuevo lead de Comuro: ${nombreContacto} ${apellidoContacto}`,
      tipo: 'LEAD_NUEVO'
    })

    return res.status(201).json({ lead_id: String(leadNuevo.id), status: 'created' })
  } catch (err) {
    console.error('[Comuro upsert]', err)
    res.status(500).json({ error: 'Error al procesar el lead.' })
  }
})

module.exports = router
