const crypto = require('crypto')
const prisma = require('../lib/prisma')
const { mismoNombre: _mismoNombre } = require('../lib/deduplication')
const { vincularCampana } = require('../lib/campanas')
const { notificarLead } = require('../lib/notifications')
const { VENDEDOR_FALLBACK_ID } = require('../config')
const {
  splitNombre, normalizarTelefono, parsearFechaHoraCita, detectarEnlaceReunion,
  tipoVisita, clasificarEstado, etapaTrasAgendar, esFrio,
} = require('../lib/webinar')

// Wrapper para compatibilidad: aquí se llama con (nombre, apellido, nombre2, apellido2)
const mismoNombre = (n1, a1, n2, a2) => _mismoNombre(`${n1} ${a1}`, `${n2} ${a2}`)

// Número válido o null — evita que un payload externo malformado meta NaN a la BD
const numOrNull = (v) => {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

// splitNombre, parsearFechaHoraCita, detectarEnlaceReunion, tipoVisita, etc. viven
// en lib/webinar.js (funciones puras, con tests en tests/webinar.test.js).
// offsetSantiagoMin y desdeHoraChile viven en lib/fechaChile (reutilizados por comuroController)

// El servidor corre en UTC: formatear siempre en hora de Chile para que los mensajes
// (notificaciones, timeline, respuesta del webhook) muestren la hora que ve el cliente.
const TZ_CHILE = 'America/Santiago'
const textoFechaChile = (d) =>
  `${d.toLocaleDateString('es-CL', { timeZone: TZ_CHILE })} a las ` +
  `${d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', timeZone: TZ_CHILE })}`

// Busca un contacto existente por correo (match seguro) o teléfono + nombre similar.
// El teléfono se compara normalizado ("9 7641 7336" == "+56976417336"): el proveedor
// manda el mismo número con distinto formato según el evento.
async function buscarContactoDuplicado({ correo, telefono, nombre, apellido }) {
  if (!correo && !telefono) return null
  const telNorm = normalizarTelefono(telefono)

  // El teléfono guardado puede traer espacios/prefijo ("9 7641 7336" vs "+56976417336"),
  // así que se compara contra la versión sin separadores directamente en Postgres.
  let idsPorTelefono = []
  if (telNorm) {
    const filas = await prisma.$queryRaw`
      SELECT id FROM contactos
      WHERE regexp_replace(coalesce(telefono, ''), '[^0-9]', '', 'g') LIKE '%' || ${telNorm}
      LIMIT 20`
    idsPorTelefono = filas.map(f => f.id)
  }

  const candidatos = await prisma.contacto.findMany({
    where: {
      OR: [
        ...(correo               ? [{ email: { equals: correo, mode: 'insensitive' } }] : []),
        ...(idsPorTelefono.length ? [{ id: { in: idsPorTelefono } }] : []),
      ]
    }
  })
  if (candidatos.length === 0) return null

  // Email siempre es match seguro; teléfono requiere además nombre similar
  for (const c of candidatos) {
    if (correo && c.email && c.email.toLowerCase() === correo.toLowerCase()) return c
  }
  for (const c of candidatos) {
    const matchTel = telNorm && normalizarTelefono(c.telefono) === telNorm
    if (matchTel && mismoNombre(nombre, apellido, c.nombre, c.apellido)) return c
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

      // Avisar solo al vendedor asignado (gerencia pidió no recibir estas
      // notificaciones de reactivación/reingreso; el estado REACTIVADO del
      // Kanban queda como señal visible para todos)
      const nombreLead = `${contacto.nombre || ''} ${contacto.apellido || ''}`.trim() || 'Un lead'
      await notificarLead({
        leadId: leadExistente.id,
        tipo:   'LEAD_NUEVO',
        soloAVendedor: true,
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

// ─── GET /api/public/leads/:id — ELIMINADO (2026-07-30) ───────────
//
// Se quitó por IDOR: cualquier API Key de lectura podía recorrer id=1..N y
// extraer nombre, apellido, email y estado de venta de TODA la base de leads.
// No había forma de acotar la consulta al dueño de la key (no existe vínculo
// Lead↔ApiKey en el schema), y el endpoint registraba 0 llamadas en 90 días.
//
// Si alguna integración necesita consultar el estado de un lead, NO restaurar
// esto tal cual: agregar primero `creadoPorApiKeyId` en Lead y filtrar por esa
// key en el where, para que cada integración solo vea lo que ella creó.

// ─── POST /api/public/webhooks/webinar ────────────────────────────
// Webhook único del lanzamiento (tipo Calendly). Enruta según `estado`:
//   - "agenda"                    → busca/crea el lead + agenda la reunión como
//                                   Visita (aparece en el calendario) + etapa VISITA_AGENDADA
//   - "cancela"                   → borra la cita futura del calendario y avisa
//   - cualquier otro / formulario → solo crea/reactiva el lead (etapa NUEVO)
// En todos los casos deduplica contacto/lead y notifica al vendedor + gerencia.
//
// Payload (lo definimos nosotros):
//   nombre  (req) "María González" — completo (acepta "González, María")
//   correo/email, telefono, estado
//   inicio/fechaHora ISO 8601  (o)  fecha "DD/MM/YYYY" + hora "HH:MM"   (solo agenda)
//   vendedorId, campana, notas, tipo  (opcionales)
const webhookWebinar = async (req, res) => {
  const body = req.body || {}
  // Sin datos personales en stdout: el payload completo queda en logs_integraciones
  console.log('[Webhook webinar] estado:', body.estado, '· campos:', Object.keys(body).join(','))
  const correo   = (body.correo || body.email)?.trim() || null
  const telefono = body.telefono?.trim() || null
  const { nombre, apellido } = splitNombre(body.nombre)
  const accion = clasificarEstado(body.estado)

  if (!nombre) {
    return res.status(400).json({
      error: 'nombre es requerido.',
      campos_requeridos: ['nombre'],
      campos_opcionales: ['correo', 'telefono', 'estado', 'inicio (ISO) o fecha+hora', 'vendedorId', 'campana', 'notas', 'tipo'],
    })
  }

  // Un vendedorId inexistente reventaba con error de FK (500). Se valida antes.
  const vendedorPedido = numOrNull(body.vendedorId)
  if (vendedorPedido) {
    const existe = await prisma.usuario.findUnique({ where: { id: vendedorPedido }, select: { id: true } })
    if (!existe) {
      return res.status(400).json({ error: `vendedorId ${vendedorPedido} no existe.` })
    }
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

    const nombreLead = `${contacto.nombre || ''} ${contacto.apellido || ''}`.trim() || 'Un lead'

    // 2. Lead (reusar el del contacto o crear como cualquier lead nuevo del webinar)
    const campana = body.campana?.trim() || 'Webinar'
    let lead = await prisma.lead.findFirst({ where: { contactoId: contacto.id }, orderBy: { creadoEn: 'desc' } })
    const leadNuevo = !lead
    if (!lead) {
      lead = await prisma.lead.create({
        data: {
          contactoId: contacto.id,
          vendedorId: vendedorPedido,
          etapa: accion === 'agenda' ? 'VISITA_AGENDADA' : 'NUEVO',
          campana,
          campanaId: await vincularCampana(campana),
          notas: body.notas?.trim() || null,
        },
      })
    }

    const vendedorId = vendedorPedido || lead.vendedorId || VENDEDOR_FALLBACK_ID

    // ── Caso C: cita cancelada → sacarla del calendario ──────────
    // Antes caía en la rama "formulario": la Visita quedaba viva y el cron
    // seguía mandando el recordatorio de 24h de una reunión que ya no existe.
    if (accion === 'cancela') {
      const fechaPedida = parsearFechaHoraCita(body)
      const canceladas = await prisma.visita.findMany({
        where: {
          leadId: lead.id,
          resultado: null,
          ...(fechaPedida ? { fechaHora: fechaPedida } : { fechaHora: { gte: new Date() } }),
        },
      })
      if (canceladas.length) {
        await prisma.visita.deleteMany({ where: { id: { in: canceladas.map(v => v.id) } } })
      }

      // La etapa vuelve a SEGUIMIENTO solo si estaba esperando esta cita
      if (lead.etapa === 'VISITA_AGENDADA') {
        await prisma.lead.update({ where: { id: lead.id }, data: { etapa: 'SEGUIMIENTO' } })
      }

      const cuandoTxt = canceladas.length ? ` (era ${textoFechaChile(canceladas[0].fechaHora)})` : ''
      await prisma.interaccion.create({
        data: {
          leadId: lead.id,
          usuarioId: vendedorId,
          tipo: 'NOTA',
          descripcion: `❌ Cita CANCELADA vía ${req.apiKey.nombre}${cuandoTxt} — retomar contacto.`,
        },
      })
      await notificarLead({
        leadId: lead.id,
        tipo: 'ACTIVIDAD_EN_LEAD',
        mensaje: `❌ ${nombreLead} canceló su cita${cuandoTxt}`,
      })

      return res.json({
        ok: true, evento: 'cancela',
        leadId: lead.id, contactoId: contacto.id,
        visitasCanceladas: canceladas.length,
        etapa: lead.etapa === 'VISITA_AGENDADA' ? 'SEGUIMIENTO' : lead.etapa,
      })
    }

    // ── Caso A: formulario rellenado → lead nuevo, sin agendar ──
    if (accion === 'formulario') {
      // Un lead frío que vuelve a dejar sus datos = REACTIVADO (misma regla que
      // POST /leads). Antes se quedaba en PERDIDO y nadie lo retomaba.
      const reactivar = !leadNuevo && esFrio(lead.etapa)
      const etapaPrevia = lead.etapa

      // Datos nuevos que traiga el reingreso (antes se perdían)
      if (!leadNuevo) {
        const upd = {}
        if (body.campana?.trim() && !lead.campana) {
          upd.campana   = campana
          upd.campanaId = await vincularCampana(campana)
        }
        if (body.notas?.trim()) upd.notas = [lead.notas, body.notas.trim()].filter(Boolean).join('\n---\n')
        if (reactivar)          upd.etapa = 'REACTIVADO'
        if (Object.keys(upd).length) lead = await prisma.lead.update({ where: { id: lead.id }, data: upd })
      }

      await prisma.interaccion.create({
        data: {
          leadId: lead.id,
          tipo: 'NOTA',
          descripcion: reactivar
            ? `🔥 Lead REACTIVADO — volvió a dejar sus datos vía ${req.apiKey.nombre} (formulario webinar, estaba en ${etapaPrevia}).`
            : `${leadNuevo ? 'Lead ingresado' : 'Reingreso'} vía ${req.apiKey.nombre} (formulario webinar)`,
        },
      })
      if (leadNuevo) {
        await notificarLead({ leadId: lead.id, tipo: 'LEAD_NUEVO', mensaje: `Nuevo lead del webinar: ${nombreLead}` })
      } else if (reactivar) {
        await notificarLead({
          leadId: lead.id, tipo: 'LEAD_NUEVO', soloAVendedor: true,
          mensaje: `🔥 ${nombreLead} respondió el webinar — REACTIVAR (estaba ${etapaPrevia})`,
        })
      }
      return res.status(leadNuevo ? 201 : 200).json({
        ok: true, evento: 'formulario', duplicado: !leadNuevo, reactivado: reactivar,
        leadId: lead.id, contactoId: contacto.id, etapa: lead.etapa,
      })
    }

    // ── Caso B: cita agendada → reunión en el calendario ──
    const fechaHora = parsearFechaHoraCita(body)
    const cuandoTxt = fechaHora ? `el ${textoFechaChile(fechaHora)}` : '(fecha por coordinar)'

    // Link de la reunión online (Meet/Zoom): campos conocidos o cualquier URL de videollamada en el payload
    const enlace = detectarEnlaceReunion(body)

    // La reunión se agenda como VISITA (modelo Visita) → aparece destacada en el
    // calendario y en la lista de Visitas, con recordatorio 24h nativo (igual que las visitas).
    let visita = null
    let reunionNueva = true
    let reagendada = false
    if (fechaHora) {
      visita = await prisma.visita.findFirst({ where: { leadId: lead.id, fechaHora } })
      if (visita) {
        reunionNueva = false // reenvío del mismo evento → no duplicar
        // si el reenvío trae enlace y no había, completarlo
        if (enlace && !visita.enlace) visita = await prisma.visita.update({ where: { id: visita.id }, data: { enlace } })
      } else {
        // ¿Reagendamiento? Si ya hay una cita futura sin resultado creada por este
        // webhook, se MUEVE en vez de crear otra (antes quedaban las dos en el calendario).
        const previa = await prisma.visita.findFirst({
          where: { leadId: lead.id, tipo: 'reunion_comercial', resultado: null, fechaHora: { gte: new Date() } },
          orderBy: { fechaHora: 'asc' },
        })
        if (previa) {
          reagendada = true
          visita = await prisma.visita.update({
            where: { id: previa.id },
            data: { fechaHora, ...(enlace ? { enlace } : {}) },
          })
        } else {
          visita = await prisma.visita.create({
            data: {
              leadId: lead.id,
              vendedorId,
              fechaHora,
              // El enum de Prisma es reunion_comercial (el @map "Reunión comercial" es
              // el valor en la BD): mandar el texto mapeado tiraba 500 en cada agenda.
              tipo: tipoVisita(body.tipo),
              notas: body.notas?.trim() || `Cita agendada vía ${req.apiKey.nombre} (webinar)`,
              enlace,
            },
          })
        }
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
          descripcion: `${reagendada ? 'Cita REAGENDADA' : 'Cita agendada'} vía ${req.apiKey.nombre} ${cuandoTxt}`,
        },
      })
    }

    // Etapa + asegurar vendedor asignado (para los recordatorios). Un lead ya avanzado
    // (NEGOCIACION, RESERVA, PROMESA…) no retrocede a VISITA_AGENDADA por agendar otra reunión.
    const etapaNueva = etapaTrasAgendar(lead.etapa)
    if (etapaNueva !== lead.etapa || !lead.vendedorId) {
      await prisma.lead.update({
        where: { id: lead.id },
        data: { etapa: etapaNueva, ...(lead.vendedorId ? {} : { vendedorId }) },
      })
    }

    if (reunionNueva) {
      await notificarLead({
        leadId: lead.id,
        tipo: 'ACTIVIDAD_EN_LEAD',
        mensaje: `${reagendada ? 'Cita reagendada' : 'Nueva cita agendada'} con ${nombreLead} ${cuandoTxt}`,
      })
    }

    return res.status(reunionNueva ? 201 : 200).json({
      ok: true, evento: 'agenda', reagendada,
      leadId: lead.id, contactoId: contacto.id, visitaId: visita?.id || null,
      enCalendario: !!visita,
      fechaHora: fechaHora ? fechaHora.toISOString() : null,      // UTC (estándar)
      fechaHoraChile: fechaHora ? textoFechaChile(fechaHora) : null, // legible, hora de Chile
      enlace: enlace || null,
      etapa: etapaNueva,
      mensaje: fechaHora
        ? `Cita ${reagendada ? 'reagendada' : 'agendada'} como visita en el calendario y vendedor notificado.`
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

module.exports = { crearLead, disponibilidad, webhookWebinar, listarKeys, crearKey, desactivarKey, eliminarKey }
