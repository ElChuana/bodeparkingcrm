const express = require('express')
const router = express.Router()
const crypto = require('crypto')
const prisma = require('../lib/prisma')

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
  const origenFinal = origenesValidos.includes(origen) ? origen : 'WEB'

  try {
    // ── 1. Deduplicar contacto por email o teléfono ───────────────
    let contacto = null

    if (email || telefono) {
      contacto = await prisma.contacto.findFirst({
        where: {
          OR: [
            ...(email    ? [{ email:    { equals: email,    mode: 'insensitive' } }] : []),
            ...(telefono ? [{ telefono: telefono }] : []),
          ]
        }
      })
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

    // ── 3. Verificar que no exista ya un lead activo del mismo contacto ──
    const leadExistente = await prisma.lead.findFirst({
      where: {
        contactoId: contacto.id,
        etapa: { notIn: ['PERDIDO'] }
      }
    })

    if (leadExistente) {
      return res.status(200).json({
        ok: true,
        duplicado: true,
        mensaje: 'El contacto ya tiene un lead activo en el sistema.',
        leadId: leadExistente.id,
        contactoId: contacto.id,
      })
    }

    // ── 4. Crear el lead ──────────────────────────────────────────
    const lead = await prisma.lead.create({
      data: {
        contactoId:      contacto.id,
        unidadInteresId: unidadInteresId,
        vendedorId:      vendedorId ? Number(vendedorId) : null,
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
