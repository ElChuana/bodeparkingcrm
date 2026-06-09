const express = require('express')
const router = express.Router()
const crypto = require('crypto')
const prisma = require('../lib/prisma')
const { mismoNombre: _mismoNombre } = require('../lib/deduplication')
const { notificarLead } = require('../lib/notifications')

// Wrapper para compatibilidad: public.js llama con (nombre, apellido, nombre2, apellido2)
const mismoNombre = (n1, a1, n2, a2) => _mismoNombre(`${n1} ${a1}`, `${n2} ${a2}`)

const FELIX_ID = 8 // vendedor fallback (Jefe de Ventas)

// "María González Pérez" → { nombre: "María", apellido: "González Pérez" }
function splitNombre(completo) {
  const partes = (completo || '').trim().split(/\s+/)
  if (partes.length === 0) return { nombre: '', apellido: '' }
  if (partes.length === 1) return { nombre: partes[0], apellido: '' }
  return { nombre: partes[0], apellido: partes.slice(1).join(' ') }
}

// Fecha/hora de la cita. Acepta ISO 8601 (inicio/fechaHora/start_time, estilo Calendly)
// o fecha "DD/MM/YYYY" + hora "HH:MM" por separado. Devuelve Date válido o null.
function parsearFechaHoraCita(body) {
  const iso = body.inicio || body.fechaHora || body.start_time || body.startTime
  if (iso) {
    const dt = new Date(iso)
    if (!isNaN(dt.getTime())) return dt
  }
  if (body.fecha && body.hora) {
    const m = String(body.fecha).match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
    if (m) {
      const [, dia, mes, anio] = m
      const dt = new Date(`${anio}-${mes}-${dia}T${body.hora}:00`)
      if (!isNaN(dt.getTime())) return dt
    }
  }
  return null
}

// Busca un contacto existente por correo (match seguro) o teléfono + nombre similar
async function buscarContactoDuplicado({ correo, telefono, nombre, apellido }) {
  if (!correo && !telefono) return null
  const candidatos = await prisma.contacto.findMany({
    where: {
      OR: [
        ...(correo   ? [{ email:    { equals: correo, mode: 'insensitive' } }] : []),
        ...(telefono ? [{ telefono: telefono }] : []),
      ]
    }
  })
  for (const c of candidatos) {
    const matchEmail = correo && c.email && c.email.toLowerCase() === correo.toLowerCase()
    const matchTel   = telefono && c.telefono === telefono
    if (matchEmail || (matchTel && mismoNombre(nombre, apellido, c.nombre, c.apellido))) return c
  }
  return null
}

// ─── Middleware: autenticar por API Key ───────────────────────────
async function autenticarApiKey(req, res, next) {
  const key = req.headers['x-api-key']
  if (!key) return res.status(401).json({ error: 'Se requiere API Key (header X-Api-Key).' })

  const apiKey = await prisma.apiKey.findUnique({ where: { key } })
  if (!apiKey || !apiKey.activa) return res.status(401).json({ error: 'API Key inválida o desactivada.' })

  req.apiKey = apiKey
  next()
}

// ─── POST /api/public/leads ───────────────────────────────────────
// Crea un lead desde un sistema externo (formulario web, CRM externo, etc.)
router.post('/leads', autenticarApiKey, async (req, res) => {
  const {
    // Datos del contacto
    nombre, apellido, email, telefono, rut, empresa, tipoPersona,
    // Datos del lead
    origen, campana, presupuestoAprox, notas,
    // Asignación opcional
    vendedorId,
    // Unidad de interés (por edificio + número de unidad)
    edificioNombre, unidadNumero, tipoUnidad,
  } = req.body

  if (!nombre || !apellido) {
    return res.status(400).json({
      error: 'nombre y apellido son requeridos.',
      campos_requeridos: ['nombre', 'apellido'],
      campos_opcionales: [
        'email', 'telefono', 'rut', 'empresa', 'tipoPersona',
        'origen', 'campana', 'presupuestoAprox', 'notas',
        'vendedorId', 'edificioNombre', 'unidadNumero', 'tipoUnidad'
      ]
    })
  }

  const origenesValidos = ['INSTAGRAM', 'GOOGLE', 'REFERIDO', 'BROKER', 'VISITA_DIRECTA', 'WEB', 'OTRO']
  const origenNorm = origen?.toUpperCase().trim()
  const ALIASES_ORIGEN = {
    META: 'INSTAGRAM', FACEBOOK: 'INSTAGRAM', FB: 'INSTAGRAM',
    'INSTAGRAM ADS': 'INSTAGRAM', 'META ADS': 'INSTAGRAM', 'FACEBOOK ADS': 'INSTAGRAM',
    'GOOGLE ADS': 'GOOGLE', 'GOOGLE ADWORDS': 'GOOGLE',
  }
  const origenFinal = origenesValidos.includes(origenNorm)
    ? origenNorm
    : (ALIASES_ORIGEN[origenNorm] || 'WEB')

  try {
    // ── 1. Deduplicar contacto por email o teléfono + similitud de nombre ──
    let contacto = null

    if (email || telefono) {
      const candidatos = await prisma.contacto.findMany({
        where: {
          OR: [
            ...(email    ? [{ email:    { equals: email,    mode: 'insensitive' } }] : []),
            ...(telefono ? [{ telefono: telefono }] : []),
          ]
        }
      })
      // Email siempre es match seguro; teléfono requiere nombre similar
      for (const c of candidatos) {
        const matchEmail = email && c.email && c.email.toLowerCase() === email.toLowerCase()
        const matchTel   = telefono && c.telefono === telefono
        if (matchEmail || (matchTel && mismoNombre(nombre, apellido, c.nombre, c.apellido))) {
          contacto = c
          break
        }
      }
    }

    if (!contacto) {
      contacto = await prisma.contacto.create({
        data: {
          nombre:      nombre.trim(),
          apellido:    apellido.trim(),
          email:       email?.trim()    || null,
          telefono:    telefono?.trim() || null,
          rut:         rut?.trim()      || null,
          empresa:     empresa?.trim()  || null,
          tipoPersona: ['NATURAL', 'EMPRESA', 'SOCIEDAD'].includes(tipoPersona) ? tipoPersona : 'NATURAL',
          origen:      origenFinal,
        }
      })
    }

    // ── 2. Resolver unidad de interés (opcional) ──────────────────
    let unidadInteresId = null

    if (edificioNombre && unidadNumero) {
      const unidad = await prisma.unidad.findFirst({
        where: {
          numero:   unidadNumero,
          estado:   'DISPONIBLE',
          edificio: { nombre: { contains: edificioNombre, mode: 'insensitive' } },
          ...(tipoUnidad && { tipo: tipoUnidad }),
        }
      })
      if (unidad) unidadInteresId = unidad.id
    }

    // ── 3. Si el contacto ya existe, actualizar con campos nuevos no nulos ──
    if (contacto) {
      const actualizarContacto = {}
      if (email    && !contacto.email)    actualizarContacto.email    = email.trim()
      if (telefono && !contacto.telefono) actualizarContacto.telefono = telefono.trim()
      if (rut      && !contacto.rut)      actualizarContacto.rut      = rut.trim()
      if (empresa  && !contacto.empresa)  actualizarContacto.empresa  = empresa.trim()
      // Actualizar origen si el contacto tiene uno genérico y llega uno específico
      if (origenFinal !== 'WEB' && ['WEB', 'OTRO'].includes(contacto.origen)) {
        actualizarContacto.origen = origenFinal
      }
      if (Object.keys(actualizarContacto).length > 0) {
        contacto = await prisma.contacto.update({
          where: { id: contacto.id },
          data: actualizarContacto
        })
      }
    }

    // ── 4. Verificar si el contacto YA tiene CUALQUIER lead (incluido PERDIDO) ──
    // Si ya existe (en cualquier etapa), no creamos otro — solo dejamos registro
    // de que se intentó reingresar y actualizamos datos nuevos si hay
    const leadExistente = await prisma.lead.findFirst({
      where: { contactoId: contacto.id },
      orderBy: { creadoEn: 'desc' }, // el más reciente
      include: {
        contacto:      { select: { nombre: true, apellido: true, email: true, telefono: true } },
        unidadInteres: { select: { numero: true, tipo: true, edificio: { select: { nombre: true } } } },
      }
    })

    if (leadExistente) {
      // Actualizar el lead existente con datos nuevos no nulos
      const actualizarLead = {}
      if (campana          && !leadExistente.campana)          actualizarLead.campana          = campana.trim()
      if (presupuestoAprox && !leadExistente.presupuestoAprox) actualizarLead.presupuestoAprox = Number(presupuestoAprox)
      if (notas)                                               actualizarLead.notas            = [leadExistente.notas, notas.trim()].filter(Boolean).join('\n---\n')
      if (unidadInteresId  && !leadExistente.unidadInteresId)  actualizarLead.unidadInteresId  = unidadInteresId
      if (vendedorId       && !leadExistente.vendedorId)       actualizarLead.vendedorId       = Number(vendedorId)

      if (Object.keys(actualizarLead).length > 0) {
        await prisma.lead.update({ where: { id: leadExistente.id }, data: actualizarLead })
      }

      // Siempre dejar registro del intento de reingreso para visibilidad
      await prisma.interaccion.create({
        data: {
          leadId:      leadExistente.id,
          tipo:        'NOTA',
          descripcion: `Reingreso vía API (${req.apiKey.nombre}) — etapa actual: ${leadExistente.etapa}${campana ? ` · Campaña nueva: ${campana}` : ''}. No se creó lead duplicado.`,
        }
      })

      return res.status(200).json({
        ok: true,
        duplicado: true,
        mensaje: `El contacto ya tiene un lead en el sistema (etapa: ${leadExistente.etapa}). No se creó duplicado.`,
        leadId:    leadExistente.id,
        contactoId: contacto.id,
        etapaActual: leadExistente.etapa,
      })
    }

    // ── 5. Crear el lead ──────────────────────────────────────────
    const vendedorIdFinal = vendedorId ? Number(vendedorId) : null

    const lead = await prisma.lead.create({
      data: {
        contactoId:      contacto.id,
        unidadInteresId: unidadInteresId,
        vendedorId:      vendedorIdFinal,
        campana:         campana?.trim() || null,
        presupuestoAprox: presupuestoAprox ? Number(presupuestoAprox) : null,
        notas:           notas?.trim()   || null,
        etapa:           'NUEVO',
      },
      include: {
        contacto:      { select: { nombre: true, apellido: true, email: true, telefono: true } },
        unidadInteres: { select: { numero: true, tipo: true, edificio: { select: { nombre: true } } } },
      }
    })

    // Log automático
    await prisma.interaccion.create({
      data: {
        leadId:      lead.id,
        tipo:        'NOTA',
        descripcion: `Lead ingresado vía API (${req.apiKey.nombre})${campana ? ` · Campaña: ${campana}` : ''}`,
      }
    })

    return res.status(201).json({
      ok: true,
      duplicado: false,
      leadId:     lead.id,
      contactoId: contacto.id,
      lead: {
        id:       lead.id,
        etapa:    lead.etapa,
        campana:  lead.campana,
        contacto: lead.contacto,
        unidadInteres: lead.unidadInteres,
      }
    })

  } catch (err) {
    console.error('[API Pública]', err)
    res.status(500).json({ error: 'Error interno al procesar el lead.' })
  }
})

// ─── GET /api/public/leads/:id ────────────────────────────────────
// Consultar estado de un lead creado vía API
router.get('/leads/:id', autenticarApiKey, async (req, res) => {
  try {
    const lead = await prisma.lead.findUnique({
      where: { id: Number(req.params.id) },
      select: {
        id: true, etapa: true, campana: true, creadoEn: true,
        contacto: { select: { nombre: true, apellido: true, email: true } },
        venta:    { select: { id: true, estado: true } },
      }
    })
    if (!lead) return res.status(404).json({ error: 'Lead no encontrado.' })
    res.json(lead)
  } catch {
    res.status(500).json({ error: 'Error al consultar lead.' })
  }
})

// ─── POST /api/public/webhooks/agenda ─────────────────────────────
// Cita agendada (tipo Calendly): crea/dedup el lead, agenda la reunión en el
// calendario (modelo Visita), mueve el lead a VISITA_AGENDADA y notifica al
// vendedor — igual que una visita normal. Si no llega fecha/hora, igual deja
// el lead agendado y notifica para coordinar.
//
// Payload (formato propio):
//   nombre   (req)  "María González"  — nombre completo
//   correo / email
//   telefono
//   inicio / fechaHora  ISO 8601  (o)  fecha "DD/MM/YYYY" + hora "HH:MM"
//   vendedorId, edificioNombre, tipo, notas  (opcionales)
router.post('/webhooks/agenda', autenticarApiKey, async (req, res) => {
  const body = req.body || {}
  const correo   = (body.correo || body.email)?.trim() || null
  const telefono = body.telefono?.trim() || null
  const { nombre, apellido } = splitNombre(body.nombre)

  if (!nombre) {
    return res.status(400).json({
      error: 'nombre es requerido.',
      campos_requeridos: ['nombre'],
      campos_opcionales: ['correo', 'telefono', 'inicio (ISO) o fecha+hora', 'vendedorId', 'edificioNombre', 'tipo', 'notas'],
    })
  }

  try {
    const fechaHora = parsearFechaHoraCita(body)

    // 1. Contacto (dedup o crear)
    let contacto = await buscarContactoDuplicado({ correo, telefono, nombre, apellido })
    if (!contacto) {
      contacto = await prisma.contacto.create({
        data: { nombre, apellido, email: correo, telefono, origen: 'WEB' },
      })
    } else {
      // completar datos faltantes
      const upd = {}
      if (correo   && !contacto.email)    upd.email    = correo
      if (telefono && !contacto.telefono) upd.telefono = telefono
      if (Object.keys(upd).length) contacto = await prisma.contacto.update({ where: { id: contacto.id }, data: upd })
    }

    // 2. Lead (reusar el más reciente del contacto o crear)
    let lead = await prisma.lead.findFirst({
      where: { contactoId: contacto.id },
      orderBy: { creadoEn: 'desc' },
    })
    if (!lead) {
      lead = await prisma.lead.create({
        data: {
          contactoId: contacto.id,
          vendedorId: body.vendedorId ? Number(body.vendedorId) : null,
          etapa: 'VISITA_AGENDADA',
          campana: body.campana?.trim() || 'Webinar',
        },
      })
    }

    // 3. Vendedor responsable (del payload, del lead, o Felix de fallback)
    const vendedorId = body.vendedorId ? Number(body.vendedorId) : (lead.vendedorId || FELIX_ID)

    // 4. Edificio opcional
    let edificioId = null
    if (body.edificioNombre) {
      const ed = await prisma.edificio.findFirst({ where: { nombre: { contains: body.edificioNombre, mode: 'insensitive' } } })
      if (ed) edificioId = ed.id
    }

    // 5. Agendar la reunión en el calendario (si hay fecha/hora)
    let visita = null
    if (fechaHora) {
      // deduplicar: misma reunión (lead + fechaHora) no se duplica
      visita = await prisma.visita.findFirst({ where: { leadId: lead.id, fechaHora } })
      if (!visita) {
        visita = await prisma.visita.create({
          data: {
            leadId: lead.id,
            vendedorId,
            edificioId,
            fechaHora,
            tipo: body.tipo?.trim() || 'Reunión comercial',
            notas: body.notas?.trim() || 'Agendada vía webhook (lanzamiento)',
          },
        })
      }
    }

    // 6. Actualizar lead: etapa + asegurar vendedor asignado (para recordatorios)
    await prisma.lead.update({
      where: { id: lead.id },
      data: {
        etapa: 'VISITA_AGENDADA',
        ...(lead.vendedorId ? {} : { vendedorId }),
      },
    })

    // 7. Interacción REUNION en la bitácora
    const cuandoTxt = fechaHora
      ? `el ${fechaHora.toLocaleDateString('es-CL')} a las ${fechaHora.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}`
      : '(fecha por coordinar)'
    await prisma.interaccion.create({
      data: {
        leadId: lead.id,
        usuarioId: vendedorId,
        tipo: 'REUNION',
        descripcion: `Cita agendada vía ${req.apiKey.nombre} ${cuandoTxt}`,
        ...(fechaHora ? { fecha: fechaHora } : {}),
      },
    })

    // 8. Notificar al vendedor + gerencia (como las visitas)
    await notificarLead({
      leadId: lead.id,
      tipo: 'ACTIVIDAD_EN_LEAD',
      mensaje: `Nueva cita agendada con ${contacto.nombre} ${contacto.apellido} ${cuandoTxt}`,
    })

    return res.status(201).json({
      ok: true,
      leadId: lead.id,
      contactoId: contacto.id,
      visitaId: visita?.id || null,
      agendadaEnCalendario: !!visita,
      fechaHora: fechaHora ? fechaHora.toISOString() : null,
      mensaje: fechaHora
        ? 'Cita agendada en el calendario y vendedor notificado.'
        : 'Lead marcado como VISITA_AGENDADA. Falta fecha/hora para el calendario; vendedor notificado para coordinar.',
    })
  } catch (err) {
    console.error('[Webhook agenda]', err)
    res.status(500).json({ error: 'Error interno al procesar la cita.' })
  }
})

// ─── Gestión de API Keys (requiere JWT normal) ────────────────────
const { autenticar, autorizar } = require('../middleware/auth')

router.get('/keys', autenticar, autorizar('GERENTE'), async (req, res) => {
  const keys = await prisma.apiKey.findMany({ orderBy: { creadoEn: 'desc' } })
  res.json(keys)
})

router.post('/keys', autenticar, autorizar('GERENTE'), async (req, res) => {
  const { nombre } = req.body
  if (!nombre) return res.status(400).json({ error: 'Nombre requerido.' })

  const key = 'bp_' + crypto.randomBytes(24).toString('hex')
  const apiKey = await prisma.apiKey.create({ data: { nombre, key } })
  res.status(201).json(apiKey)
})

router.put('/keys/:id/desactivar', autenticar, autorizar('GERENTE'), async (req, res) => {
  try {
    const apiKey = await prisma.apiKey.update({
      where: { id: Number(req.params.id) },
      data: { activa: false }
    })
    res.json(apiKey)
  } catch {
    res.status(404).json({ error: 'API Key no encontrada.' })
  }
})

router.delete('/keys/:id', autenticar, autorizar('GERENTE'), async (req, res) => {
  try {
    await prisma.apiKey.delete({ where: { id: Number(req.params.id) } })
    res.json({ ok: true })
  } catch {
    res.status(404).json({ error: 'API Key no encontrada.' })
  }
})

module.exports = router
