// Sesiones del modo reunión: dejan registro de qué se le mostró al cliente,
// qué quedó en la propuesta y si terminó en cotización.
const prisma = require('../lib/prisma')
const { puedeAccederLead, filtroAcceso } = require('../lib/acceso')

const unicos = (xs) => [...new Set((xs || []).map(Number).filter(Number.isInteger))]

// POST /api/reuniones  { leadId }
// Si el vendedor ya tenía una reunión abierta con ese cliente, se retoma en vez
// de abrir otra: pasa seguido que se recargue la página en plena reunión.
const iniciar = async (req, res) => {
  const leadId = Number(req.body.leadId)
  if (!Number.isInteger(leadId)) return res.status(400).json({ error: 'Falta el cliente (leadId).' })
  if (!(await puedeAccederLead(req.usuario, leadId))) {
    return res.status(403).json({ error: 'No tienes acceso a este cliente.' })
  }

  try {
    const abierta = await prisma.sesionReunion.findFirst({
      where: { leadId, vendedorId: req.usuario.id, fin: null },
      orderBy: { inicio: 'desc' },
    })
    if (abierta) return res.json(abierta)

    const sesion = await prisma.sesionReunion.create({
      data: { leadId, vendedorId: req.usuario.id, unidadesVistas: [], unidadesPropuestas: [] },
    })
    res.status(201).json(sesion)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'No se pudo iniciar la reunión.' })
  }
}

// PATCH /api/reuniones/:id  { unidadesVistas?, unidadesPropuestas?, cotizacionId? }
// Las vistas se acumulan (lo que se mostró no se "desmuestra"); la propuesta se
// reemplaza, porque refleja cómo quedó en ese momento.
const actualizar = async (req, res) => {
  const id = Number(req.params.id)
  try {
    const sesion = await prisma.sesionReunion.findUnique({ where: { id } })
    if (!sesion) return res.status(404).json({ error: 'Reunión no encontrada.' })
    if (sesion.vendedorId !== req.usuario.id && !(await puedeAccederLead(req.usuario, sesion.leadId))) {
      return res.status(403).json({ error: 'No tienes acceso a esta reunión.' })
    }

    const { unidadesVistas, unidadesPropuestas, cotizacionId } = req.body
    const actualizada = await prisma.sesionReunion.update({
      where: { id },
      data: {
        ...(unidadesVistas && { unidadesVistas: unicos([...sesion.unidadesVistas, ...unidadesVistas]) }),
        ...(unidadesPropuestas && { unidadesPropuestas: unicos(unidadesPropuestas) }),
        ...(cotizacionId !== undefined && { cotizacionId: cotizacionId ? Number(cotizacionId) : null }),
      },
    })
    res.json(actualizada)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'No se pudo guardar la reunión.' })
  }
}

// POST /api/reuniones/:id/cerrar
// Cierra la sesión y deja la huella en el historial del lead.
const cerrar = async (req, res) => {
  const id = Number(req.params.id)
  try {
    const sesion = await prisma.sesionReunion.findUnique({ where: { id } })
    if (!sesion) return res.status(404).json({ error: 'Reunión no encontrada.' })
    if (sesion.vendedorId !== req.usuario.id && !(await puedeAccederLead(req.usuario, sesion.leadId))) {
      return res.status(403).json({ error: 'No tienes acceso a esta reunión.' })
    }
    if (sesion.fin) return res.json(sesion) // ya estaba cerrada

    const { unidadesVistas, unidadesPropuestas, cotizacionId } = req.body
    const vistas = unicos([...sesion.unidadesVistas, ...(unidadesVistas || [])])
    const propuestas = unidadesPropuestas ? unicos(unidadesPropuestas) : sesion.unidadesPropuestas
    const cotiz = cotizacionId ? Number(cotizacionId) : sesion.cotizacionId

    const cerrada = await prisma.sesionReunion.update({
      where: { id },
      data: { fin: new Date(), unidadesVistas: vistas, unidadesPropuestas: propuestas, cotizacionId: cotiz },
    })

    // Una reunión en la que no se mostró nada no ensucia el historial del lead
    if (vistas.length || propuestas.length || cotiz) {
      const minutos = Math.max(1, Math.round((cerrada.fin - cerrada.inicio) / 60000))
      const detalle = await detalleUnidades(propuestas.length ? propuestas : vistas)
      const partes = [`Reunión de ${minutos} min`]
      if (vistas.length) partes.push(`${vistas.length} ${vistas.length === 1 ? 'unidad mostrada' : 'unidades mostradas'}`)
      if (propuestas.length) partes.push(`${propuestas.length} en la propuesta`)
      if (cotiz) partes.push(`cotización #${cotiz}`)

      await prisma.actividad.create({
        data: {
          leadId: sesion.leadId,
          usuarioId: sesion.vendedorId,
          tipo: 'REUNION_COMERCIAL',
          descripcion: partes.join(' · '),
          resultado: detalle || null,
        },
      })
    }

    res.json(cerrada)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'No se pudo cerrar la reunión.' })
  }
}

// "Bodega 209 (Plus) · Estac. E2-E4 (Brasil)" — para leerlo de un vistazo en el
// historial sin tener que abrir la sesión.
async function detalleUnidades(ids) {
  if (!ids?.length) return ''
  const unidades = await prisma.unidad.findMany({
    where: { id: { in: ids } },
    select: { numero: true, tipo: true, edificio: { select: { nombre: true } } },
    orderBy: { id: 'asc' },
  })
  return unidades
    .map(u => `${u.tipo === 'BODEGA' ? 'Bodega' : 'Estac.'} ${u.numero} (${u.edificio.nombre})`)
    .join(' · ')
}

// GET /api/reuniones?leadId=
const listar = async (req, res) => {
  const { leadId } = req.query
  try {
    if (leadId && !(await puedeAccederLead(req.usuario, Number(leadId)))) {
      return res.status(403).json({ error: 'No tienes acceso a este cliente.' })
    }
    const sesiones = await prisma.sesionReunion.findMany({
      where: {
        ...(leadId ? { leadId: Number(leadId) } : { lead: filtroAcceso(req.usuario) }),
      },
      include: {
        vendedor: { select: { id: true, nombre: true, apellido: true } },
        lead: { select: { id: true, contacto: { select: { nombre: true, apellido: true } } } },
      },
      orderBy: { inicio: 'desc' },
      take: 100,
    })
    res.json(sesiones)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al obtener las reuniones.' })
  }
}

module.exports = { iniciar, actualizar, cerrar, listar }
