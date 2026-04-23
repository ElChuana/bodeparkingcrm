const express = require('express')
const router = express.Router()
const crypto = require('crypto')
const prisma = require('../lib/prisma')
const { mismoNombre: _mismoNombre } = require('../lib/deduplication')

// Wrapper para compatibilidad: public.js llama con (nombre, apellido, nombre2, apellido2)
const mismoNombre = (n1, a1, n2, a2) => _mismoNombre(`${n1} ${a1}`, `${n2} ${a2}`)

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
  const origenFinal = origenesValidos.includes(origenNorm) ? origenNorm : 'WEB'

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

    // ── 4. Verificar que no exista ya un lead activo del mismo contacto ──
    const leadExistente = await prisma.lead.findFirst({
      where: {
        contactoId: contacto.id,
        etapa: { notIn: ['PERDIDO'] }
      },
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
        await prisma.interaccion.create({
          data: {
            leadId:      leadExistente.id,
            tipo:        'NOTA',
            descripcion: `Lead actualizado vía API (${req.apiKey.nombre}) — contacto ya existía en el sistema.`,
          }
        })
      }

      return res.status(200).json({
        ok: true,
        duplicado: true,
        mensaje: 'El contacto ya tiene un lead activo en el sistema. Se actualizaron los datos disponibles.',
        leadId:    leadExistente.id,
        contactoId: contacto.id,
      })
    }

    // ── 5. Crear el lead ──────────────────────────────────────────
    // Auto-asignar al JEFE_VENTAS activo si no se especificó vendedorId
    let vendedorIdFinal = vendedorId ? Number(vendedorId) : null
    if (!vendedorIdFinal) {
      const jefeVentas = await prisma.usuario.findFirst({
        where: { rol: 'JEFE_VENTAS', activo: true }
      })
      if (jefeVentas) vendedorIdFinal = jefeVentas.id
    }

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
