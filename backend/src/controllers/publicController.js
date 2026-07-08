const crypto = require('crypto')
const prisma = require('../lib/prisma')
const { mismoNombre: _mismoNombre } = require('../lib/deduplication')
const { vincularCampana } = require('../lib/campanas')
const { notificarLead } = require('../lib/notifications')
const { VENDEDOR_FALLBACK_ID } = require('../config')

// Wrapper para compatibilidad: aquí se llama con (nombre, apellido, nombre2, apellido2)
const mismoNombre = (n1, a1, n2, a2) => _mismoNombre(`${n1} ${a1}`, `${n2} ${a2}`)

// Número válido o null — evita que un payload externo malformado meta NaN a la BD
const numOrNull = (v) => {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

// "María González Pérez" → { nombre: "María", apellido: "González Pérez" }
function splitNombre(completo) {
  const partes = (completo || '').trim().split(/\s+/)
  if (partes.length === 0) return { nombre: '', apellido: '' }
  if (partes.length === 1) return { nombre: partes[0], apellido: '' }
  return { nombre: partes[0], apellido: partes.slice(1).join(' ') }
}

// Offset de America/Santiago (en minutos) para una fecha UTC dada — maneja horario de verano.
function offsetSantiagoMin(utcDate) {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Santiago', hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
  const p = dtf.formatToParts(utcDate).reduce((a, x) => (a[x.type] = x.value, a), {})
  const asUTC = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second)
  return (asUTC - utcDate.getTime()) / 60000
}

// Interpreta componentes de hora LOCAL de Chile → Date (UTC correcto, con DST)
function desdeHoraChile(y, mo, d, h, mi) {
  const guess = Date.UTC(y, mo - 1, d, h, mi)
  const off = offsetSantiagoMin(new Date(guess))
  return new Date(guess - off * 60000)
}

// Fecha/hora de la cita. El proveedor (Calendly) envía la hora YA en horario chileno
// (el número que ve el cliente), aunque la marque con "Z" o un offset. Por eso se toman
// los componentes de fecha/hora TAL CUAL y se interpretan como hora de Chile, ignorando
// la etiqueta de zona. Acepta ISO 8601 o fecha "DD/MM/YYYY" + hora "HH:MM".
function parsearFechaHoraCita(body) {
  const iso = body.inicio || body.fechaHora || body.start_time || body.startTime
  if (iso) {
    const s = String(iso).trim()
    // 1) Tomar los dígitos de fecha/hora del texto (en cualquier parte) → hora de Chile
    const m = s.match(/(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/)
    if (m) return desdeHoraChile(+m[1], +m[2], +m[3], +m[4], +m[5])
    // 2) Fallback: si es parseable, usar los componentes "de pared" (UTC) como hora de Chile
    const dt = new Date(s)
    if (!isNaN(dt.getTime())) {
      return desdeHoraChile(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate(), dt.getUTCHours(), dt.getUTCMinutes())
    }
  }
  if (body.fecha && body.hora) {
    const m = String(body.fecha).match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
    const hm = String(body.hora).match(/^(\d{1,2}):(\d{2})$/)
    if (m && hm) {
      const [, dia, mes, anio] = m
      return desdeHoraChile(+anio, +mes, +dia, +hm[1], +hm[2])
    }
  }
  return null
}

// Recolecta todas las URLs http(s) presentes en el payload (búsqueda recursiva).
function urlsEnPayload(obj, depth = 0, acc = []) {
  if (depth > 5 || obj == null) return acc
  if (typeof obj === 'string') {
    const s = obj.trim()
    if (/^https?:\/\/\S+/i.test(s)) acc.push(s)
    return acc
  }
  if (typeof obj === 'object') for (const v of Object.values(obj)) urlsEnPayload(v, depth + 1, acc)
  return acc
}

// Link de la reunión: primero campos conocidos; si no, cualquier URL de videollamada en el payload.
function detectarEnlaceReunion(body) {
  const conocido = (body.enlace || body.meetUrl || body.linkMeet || body.link || body.url ||
    body.join_url || body.meeting_url || body.location)?.trim()
  if (conocido && /^https?:\/\//i.test(conocido)) return conocido
  const urls = urlsEnPayload(body)
  return urls.find(u => /(meet\.google|zoom\.us|teams\.microsoft|whereby|jit\.si|hangouts|meet\.)/i.test(u)) || null
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

// ─── POST /api/public/leads ───────────────────────────────────────
// Crea un lead desde un sistema externo (formulario web, CRM externo, etc.)
const crearLead = async (req, res) => {
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
      // Un lead frío (dado por perdido o que nunca contestó) que vuelve a dejar
      // sus datos = REACTIVADO: mostró interés de nuevo y ventas debe retomarlo.
      const ETAPAS_FRIAS = ['PERDIDO', 'NO_CONTESTA']
      const reactivar = ETAPAS_FRIAS.includes(leadExistente.etapa)

      // Actualizar el lead existente con datos nuevos no nulos
      const actualizarLead = {}
      const presupuestoNum = numOrNull(presupuestoAprox)
      const vendedorNum = numOrNull(vendedorId)
      if (campana       && !leadExistente.campana) {
        actualizarLead.campana   = campana.trim()
        actualizarLead.campanaId = await vincularCampana(campana)
      }
      if (presupuestoNum && !leadExistente.presupuestoAprox) actualizarLead.presupuestoAprox = presupuestoNum
      if (notas)                                             actualizarLead.notas            = [leadExistente.notas, notas.trim()].filter(Boolean).join('\n---\n')
      if (unidadInteresId && !leadExistente.unidadInteresId) actualizarLead.unidadInteresId  = unidadInteresId
      if (vendedorNum    && !leadExistente.vendedorId)       actualizarLead.vendedorId       = vendedorNum
      if (reactivar)                                         actualizarLead.etapa            = 'REACTIVADO'

      if (Object.keys(actualizarLead).length > 0) {
        await prisma.lead.update({ where: { id: leadExistente.id }, data: actualizarLead })
      }

      // Registro en el timeline del lead
      await prisma.interaccion.create({
        data: {
          leadId:      leadExistente.id,
          tipo:        'NOTA',
          descripcion: reactivar
            ? `🔥 Lead REACTIVADO — volvió a dejar sus datos vía ${req.apiKey.nombre} (estaba en ${leadExistente.etapa})${campana ? ` · Campaña: ${campana}` : ''}.`
            : `Reingreso vía API (${req.apiKey.nombre}) — etapa actual: ${leadExistente.etapa}${campana ? ` · Campaña nueva: ${campana}` : ''}. No se creó lead duplicado.`,
        }
      })

      // Avisar a ventas (vendedor asignado + gerencia/JV; email al vendedor)
      const nombreLead = `${contacto.nombre || ''} ${contacto.apellido || ''}`.trim() || 'Un lead'
      await notificarLead({
        leadId: leadExistente.id,
        tipo:   'LEAD_NUEVO',
        mensaje: reactivar
          ? `🔥 ${nombreLead} respondió la campaña — REACTIVAR (estaba ${leadExistente.etapa})`
          : `${nombreLead} volvió a dejar sus datos${campana ? ` (${campana})` : ''}`,
      })

      return res.status(200).json({
        ok: true,
        duplicado: true,
        reactivado: reactivar,
        mensaje: reactivar
          ? `Lead reactivado (estaba en ${leadExistente.etapa}).`
          : `El contacto ya tiene un lead en el sistema (etapa: ${leadExistente.etapa}). No se creó duplicado.`,
        leadId:    leadExistente.id,
        contactoId: contacto.id,
        etapaActual: reactivar ? 'REACTIVADO' : leadExistente.etapa,
      })
    }

    // ── 5. Crear el lead ──────────────────────────────────────────
    const lead = await prisma.lead.create({
      data: {
        contactoId:      contacto.id,
        unidadInteresId: unidadInteresId,
        vendedorId:      numOrNull(vendedorId),
        campana:         campana?.trim() || null,
        campanaId:       await vincularCampana(campana),
        presupuestoAprox: numOrNull(presupuestoAprox),
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
}

// ─── GET /api/public/leads/:id ────────────────────────────────────
// Consultar estado de un lead creado vía API
const obtenerLead = async (req, res) => {
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
}

// ─── POST /api/public/webhooks/webinar ────────────────────────────
// Webhook único del lanzamiento (tipo Calendly). Enruta según `estado`:
//   - "agenda"                  → busca/crea el lead + agenda la reunión
//                                 (Interaccion tipo REUNION con fecha → aparece en
//                                 el calendario, igual que Comuro) + etapa VISITA_AGENDADA
//   - cualquier otro / formulario → solo crea el lead nuevo (etapa NUEVO)
// En ambos casos deduplica contacto/lead y notifica al vendedor + gerencia.
//
// Payload (lo definimos nosotros):
//   nombre  (req) "María González" — completo
//   correo/email, telefono, estado
//   inicio/fechaHora ISO 8601  (o)  fecha "DD/MM/YYYY" + hora "HH:MM"   (solo agenda)
//   vendedorId, campana, notas  (opcionales)
const webhookWebinar = async (req, res) => {
  const body = req.body || {}
  console.log('[Webhook webinar] payload:', JSON.stringify(body))
  const correo   = (body.correo || body.email)?.trim() || null
  const telefono = body.telefono?.trim() || null
  const { nombre, apellido } = splitNombre(body.nombre)
  const esAgenda = String(body.estado || '').toLowerCase() === 'agenda'

  if (!nombre) {
    return res.status(400).json({
      error: 'nombre es requerido.',
      campos_requeridos: ['nombre'],
      campos_opcionales: ['correo', 'telefono', 'estado', 'inicio (ISO) o fecha+hora', 'vendedorId', 'campana', 'notas'],
    })
  }

  try {
    // 1. Contacto (dedup o crear)
    let contacto = await buscarContactoDuplicado({ correo, telefono, nombre, apellido })
    if (!contacto) {
      contacto = await prisma.contacto.create({ data: { nombre, apellido, email: correo, telefono, origen: 'WEB' } })
    } else {
      const upd = {}
      if (correo   && !contacto.email)    upd.email    = correo
      if (telefono && !contacto.telefono) upd.telefono = telefono
      if (Object.keys(upd).length) contacto = await prisma.contacto.update({ where: { id: contacto.id }, data: upd })
    }

    // 2. Lead (reusar el del contacto o crear como cualquier lead nuevo del webinar)
    const campana = body.campana?.trim() || 'Webinar'
    let lead = await prisma.lead.findFirst({ where: { contactoId: contacto.id }, orderBy: { creadoEn: 'desc' } })
    const leadNuevo = !lead
    if (!lead) {
      lead = await prisma.lead.create({
        data: {
          contactoId: contacto.id,
          vendedorId: numOrNull(body.vendedorId),
          etapa: esAgenda ? 'VISITA_AGENDADA' : 'NUEVO',
          campana,
          campanaId: await vincularCampana(campana),
          notas: body.notas?.trim() || null,
        },
      })
    }

    const vendedorId = numOrNull(body.vendedorId) || lead.vendedorId || VENDEDOR_FALLBACK_ID

    // ── Caso A: formulario rellenado → lead nuevo, sin agendar ──
    if (!esAgenda) {
      await prisma.interaccion.create({
        data: { leadId: lead.id, tipo: 'NOTA', descripcion: `${leadNuevo ? 'Lead ingresado' : 'Reingreso'} vía ${req.apiKey.nombre} (formulario webinar)` },
      })
      if (leadNuevo) {
        await notificarLead({ leadId: lead.id, tipo: 'LEAD_NUEVO', mensaje: `Nuevo lead del webinar: ${contacto.nombre} ${contacto.apellido}` })
      }
      return res.status(leadNuevo ? 201 : 200).json({
        ok: true, evento: 'formulario', duplicado: !leadNuevo,
        leadId: lead.id, contactoId: contacto.id, etapa: lead.etapa,
      })
    }

    // ── Caso B: cita agendada → reunión en el calendario ──
    const fechaHora = parsearFechaHoraCita(body)
    // El servidor corre en UTC: formatear el texto en hora de Chile para que el mensaje sea correcto
    const TZ = 'America/Santiago'
    const cuandoTxt = fechaHora
      ? `el ${fechaHora.toLocaleDateString('es-CL', { timeZone: TZ })} a las ${fechaHora.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', timeZone: TZ })}`
      : '(fecha por coordinar)'

    // Link de la reunión online (Meet/Zoom): campos conocidos o cualquier URL de videollamada en el payload
    const enlace = detectarEnlaceReunion(body)

    // La reunión se agenda como VISITA (modelo Visita) → aparece destacada en el
    // calendario y en la lista de Visitas, con recordatorio 24h nativo (igual que las visitas).
    let visita = null
    let reunionNueva = true
    if (fechaHora) {
      visita = await prisma.visita.findFirst({ where: { leadId: lead.id, fechaHora } })
      if (visita) {
        reunionNueva = false // reenvío del mismo evento → no duplicar
        // si el reenvío trae enlace y no había, completarlo
        if (enlace && !visita.enlace) visita = await prisma.visita.update({ where: { id: visita.id }, data: { enlace } })
      } else {
        visita = await prisma.visita.create({
          data: {
            leadId: lead.id,
            vendedorId,
            fechaHora,
            tipo: body.tipo?.trim() || 'Reunión comercial',
            notas: body.notas?.trim() || `Cita agendada vía ${req.apiKey.nombre} (webinar)`,
            enlace,
          },
        })
      }
    }

    // Registrar en la bitácora del lead (timeline) como NOTA — sin fecha futura, para
    // no duplicar el evento en el calendario (que ya muestra la Visita). Sin duplicar en reenvíos.
    if (reunionNueva) {
      await prisma.interaccion.create({
        data: {
          leadId: lead.id,
          usuarioId: vendedorId,
          tipo: 'NOTA',
          descripcion: `Cita agendada vía ${req.apiKey.nombre} ${cuandoTxt}`,
        },
      })
    }

    // Etapa + asegurar vendedor asignado (para los recordatorios)
    await prisma.lead.update({
      where: { id: lead.id },
      data: { etapa: 'VISITA_AGENDADA', ...(lead.vendedorId ? {} : { vendedorId }) },
    })

    await notificarLead({
      leadId: lead.id,
      tipo: 'ACTIVIDAD_EN_LEAD',
      mensaje: `Nueva cita agendada con ${contacto.nombre} ${contacto.apellido} ${cuandoTxt}`,
    })

    return res.status(201).json({
      ok: true, evento: 'agenda',
      leadId: lead.id, contactoId: contacto.id, visitaId: visita?.id || null,
      enCalendario: !!visita,
      fechaHora: fechaHora ? fechaHora.toISOString() : null,          // UTC (estándar)
      fechaHoraChile: fechaHora ? cuandoTxt.replace(/^el /, '') : null, // legible, hora de Chile
      enlace: enlace || null,
      mensaje: fechaHora
        ? 'Cita agendada como visita en el calendario y vendedor notificado.'
        : 'Lead en VISITA_AGENDADA; falta fecha/hora, vendedor notificado para coordinar.',
    })
  } catch (err) {
    console.error('[Webhook webinar]', err)
    res.status(500).json({ error: 'Error interno al procesar el evento.' })
  }
}

// ─── GET /api/public/disponibilidad ───────────────────────────────
// Devuelve RANGOS AGREGADOS de unidades disponibles (para el bot de WhatsApp).
// NO expone unidades individuales, ni número de unidad, ni precioCostoUF/precioMinimoUF.
// Solo: por edificio+tipo → cantidad disponible + rango de m2 + rango de precioUF de venta.
// Accesible por cualquier API Key válida (incl. soloEscritura): no hay datos sensibles.
// Filtros opcionales: ?tipo=BODEGA|ESTACIONAMIENTO  ?comuna=<texto>  ?edificio=<texto>
const disponibilidad = async (req, res) => {
  try {
    const { tipo, comuna, edificio } = req.query
    const tipoNorm = typeof tipo === 'string' ? tipo.toUpperCase().trim() : null
    const tipoFiltro = ['BODEGA', 'ESTACIONAMIENTO'].includes(tipoNorm) ? tipoNorm : null

    const grupos = await prisma.unidad.groupBy({
      by: ['edificioId', 'tipo'],
      where: {
        estado: 'DISPONIBLE',
        ...(tipoFiltro && { tipo: tipoFiltro }),
        edificio: {
          activo: true,
          ...(comuna   && { comuna: { contains: String(comuna),   mode: 'insensitive' } }),
          ...(edificio && { nombre: { contains: String(edificio), mode: 'insensitive' } }),
        },
      },
      _count: { _all: true },
      _min: { m2: true, precioUF: true },
      _max: { m2: true, precioUF: true },
    })

    // Nombres/comunas de los edificios involucrados
    const ids = [...new Set(grupos.map(g => g.edificioId))]
    const edifs = await prisma.edificio.findMany({
      where: { id: { in: ids } },
      select: { id: true, nombre: true, comuna: true },
    })
    const edifById = Object.fromEntries(edifs.map(e => [e.id, e]))

    // helpers de rango (redondeo hacia afuera; toleran null)
    const rango = (min, max, roundOut) => {
      if (min == null && max == null) return null
      const lo = min == null ? null : (roundOut ? Math.floor(Number(min)) : Math.round(Number(min)))
      const hi = max == null ? null : (roundOut ? Math.ceil(Number(max))  : Math.round(Number(max)))
      return { min: lo, max: hi }
    }

    // Agrupar por edificio
    const porEdificio = {}
    for (const g of grupos) {
      const e = edifById[g.edificioId]
      if (!e) continue
      if (!porEdificio[e.id]) porEdificio[e.id] = { edificio: e.nombre, comuna: e.comuna, unidades: [] }
      porEdificio[e.id].unidades.push({
        tipo: g.tipo,
        disponibles: g._count._all,
        m2: rango(g._min.m2, g._max.m2, false),
        precioUF: rango(g._min.precioUF, g._max.precioUF, true),
      })
    }

    // Resumen global por tipo (agregando entre edificios)
    const resumenMap = {}
    for (const g of grupos) {
      const r = resumenMap[g.tipo] || { tipo: g.tipo, disponibles: 0, m2Min: null, m2Max: null, pMin: null, pMax: null }
      r.disponibles += g._count._all
      const upd = (cur, val, fn) => (val == null ? cur : (cur == null ? Number(val) : fn(cur, Number(val))))
      r.m2Min = upd(r.m2Min, g._min.m2, Math.min)
      r.m2Max = upd(r.m2Max, g._max.m2, Math.max)
      r.pMin  = upd(r.pMin,  g._min.precioUF, Math.min)
      r.pMax  = upd(r.pMax,  g._max.precioUF, Math.max)
      resumenMap[g.tipo] = r
    }
    const resumen = Object.values(resumenMap).map(r => ({
      tipo: r.tipo,
      disponibles: r.disponibles,
      m2: rango(r.m2Min, r.m2Max, false),
      precioUF: rango(r.pMin, r.pMax, true),
    }))

    res.json({ ok: true, resumen, edificios: Object.values(porEdificio) })
  } catch (err) {
    console.error('[API Pública disponibilidad]', err)
    res.status(500).json({ error: 'Error al consultar disponibilidad.' })
  }
}

// ─── Gestión de API Keys (requiere JWT normal) ────────────────────
const listarKeys = async (req, res) => {
  const keys = await prisma.apiKey.findMany({ orderBy: { creadoEn: 'desc' } })
  res.json(keys)
}

const crearKey = async (req, res) => {
  const { nombre, soloEscritura } = req.body
  if (!nombre) return res.status(400).json({ error: 'Nombre requerido.' })

  const key = 'bp_' + crypto.randomBytes(24).toString('hex')
  const apiKey = await prisma.apiKey.create({
    data: { nombre, key, soloEscritura: soloEscritura === true },
  })
  res.status(201).json(apiKey)
}

const desactivarKey = async (req, res) => {
  try {
    const apiKey = await prisma.apiKey.update({
      where: { id: Number(req.params.id) },
      data: { activa: false }
    })
    res.json(apiKey)
  } catch {
    res.status(404).json({ error: 'API Key no encontrada.' })
  }
}

const eliminarKey = async (req, res) => {
  try {
    await prisma.apiKey.delete({ where: { id: Number(req.params.id) } })
    res.json({ ok: true })
  } catch {
    res.status(404).json({ error: 'API Key no encontrada.' })
  }
}

module.exports = { crearLead, obtenerLead, disponibilidad, webhookWebinar, listarKeys, crearKey, desactivarKey, eliminarKey }
