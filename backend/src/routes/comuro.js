const express = require('express')
const router = express.Router()
const prisma = require('../lib/prisma')
const { mismoNombre } = require('../lib/deduplication')
const { notificarLead } = require('../lib/notifications')

function limpiarContextComuro(context) {
  if (!context) return ''
  return context.replace(/\|\s*Fecha Reuni[oó]n:.*$/s, '').trim()
}

function parsearReunionComuro(context) {
  const match = context?.match(/Fecha Reuni[oó]n:\s*(\d{2}\/\d{2}\/\d{4})\|Hora Reunion:\s*(\d{2}:\d{2})/)
  if (!match) return null
  const [, fecha, hora] = match
  const [dia, mes, anio] = fecha.split('/')
  const dt = new Date(`${anio}-${mes}-${dia}T${hora}:00`)
  return isNaN(dt.getTime()) ? null : { dt, fecha, hora }
}

const FELIX_ID = 8

async function crearReunionComuro({ leadId, vendedorId, context, reunion, nombreContacto }) {
  const yaExiste = await prisma.interaccion.findFirst({
    where: { leadId, tipo: 'REUNION', fecha: reunion.dt }
  })
  if (yaExiste) return

  await prisma.interaccion.create({
    data: {
      leadId,
      usuarioId: vendedorId ?? FELIX_ID,
      tipo: 'REUNION',
      descripcion: limpiarContextComuro(context) || 'Reunión agendada por Comuro.',
      fecha: reunion.dt,
    }
  })

  await notificarLead({
    leadId,
    mensaje: `Comuro agendó reunión con ${nombreContacto} el ${reunion.fecha} a las ${reunion.hora}`,
    tipo: 'ACTIVIDAD',
  })
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
      const leadActualizado = await prisma.lead.update({
        where: { id: lead.id },
        data: {
          comuroData: comuroDataFinal,
          actualizadoEn: new Date(),
          ...(internal_uuid && { comuroUuid: internal_uuid }),
          ...(body.thread_id && { comuroThreadId: body.thread_id }),
        },
        select: { id: true, vendedorId: true }
      })

      const reunion = parsearReunionComuro(body.context)
      if (reunion) {
        const nombreContacto = name || body.nombre_whatsapp || 'cliente'
        await crearReunionComuro({
          leadId: lead.id,
          vendedorId: leadActualizado.vendedorId,
          context: body.context,
          reunion,
          nombreContacto,
        })
      }

      return res.status(200).json({ lead_id: String(lead.id), status: 'updated' })
    }

    // CREATE: crear contacto + lead
    const nombreCompleto = name || body.nombre_whatsapp || 'Sin nombre'
    const partes = nombreCompleto.trim().split(' ')
    const nombreContacto = partes[0]
    const apellidoContacto = partes.slice(1).join(' ') || '-'
    const telefonoContacto = phone ? phone.replace(/\D/g, '') : null

    // Inferir origen desde nombre de campaña
    const proyectoLower = (project || '').toLowerCase()
    const origenComuro = proyectoLower.includes('google') ? 'GOOGLE'
      : (proyectoLower.includes('instagram') || proyectoLower.includes('meta') || proyectoLower.includes('facebook')) ? 'INSTAGRAM'
      : 'OTRO'

    const contactoNuevo = await prisma.contacto.create({
      data: {
        nombre: nombreContacto,
        apellido: apellidoContacto,
        email: email || body.correo || null,
        telefono: telefonoContacto,
        origen: origenComuro,
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

    const reunionNuevo = parsearReunionComuro(body.context)
    if (reunionNuevo) {
      await crearReunionComuro({
        leadId: leadNuevo.id,
        vendedorId: null,
        context: body.context,
        reunion: reunionNuevo,
        nombreContacto: `${nombreContacto} ${apellidoContacto}`.trim(),
      })
    }

    return res.status(201).json({ lead_id: String(leadNuevo.id), status: 'created' })
  } catch (err) {
    console.error('[Comuro upsert]', err)
    res.status(500).json({ error: 'Error al procesar el lead.' })
  }
})

module.exports = router
