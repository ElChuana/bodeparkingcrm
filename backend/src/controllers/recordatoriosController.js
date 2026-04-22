const prisma = require('../lib/prisma')

// GET /leads/:id/recordatorios
const listar = async (req, res) => {
  const leadId = Number(req.params.id)
  try {
    const recordatorios = await prisma.recordatorio.findMany({
      where: { leadId },
      include: { creadoPor: { select: { nombre: true, apellido: true } } },
      orderBy: { fechaHora: 'asc' }
    })
    res.json(recordatorios)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al obtener recordatorios.' })
  }
}

// POST /leads/:id/recordatorios
const crear = async (req, res) => {
  const leadId = Number(req.params.id)
  const { descripcion, fechaHora } = req.body

  if (!descripcion || !fechaHora) {
    return res.status(400).json({ error: 'descripcion y fechaHora son requeridos.' })
  }

  try {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: { vendedorId: true }
    })
    if (!lead) return res.status(404).json({ error: 'Lead no encontrado.' })

    const { rol, id: usuarioId } = req.usuario
    const tieneAcceso = ['GERENTE', 'JEFE_VENTAS'].includes(rol) || lead.vendedorId === usuarioId
    if (!tieneAcceso) return res.status(403).json({ error: 'No tienes acceso a este lead.' })

    const recordatorio = await prisma.recordatorio.create({
      data: {
        leadId,
        creadoPorId: usuarioId,
        descripcion: descripcion.trim(),
        fechaHora:   new Date(fechaHora),
      },
      include: { creadoPor: { select: { nombre: true, apellido: true } } }
    })
    res.status(201).json(recordatorio)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al crear recordatorio.' })
  }
}

// PATCH /recordatorios/:id/completar
const completar = async (req, res) => {
  const id = Number(req.params.id)
  try {
    const recordatorio = await prisma.recordatorio.findUnique({
      where: { id },
      include: { lead: { select: { vendedorId: true } } }
    })
    if (!recordatorio) return res.status(404).json({ error: 'Recordatorio no encontrado.' })

    const { rol, id: usuarioId } = req.usuario
    const tieneAcceso = ['GERENTE', 'JEFE_VENTAS'].includes(rol) || recordatorio.lead.vendedorId === usuarioId
    if (!tieneAcceso) return res.status(403).json({ error: 'No tienes acceso.' })

    const actualizado = await prisma.recordatorio.update({
      where: { id },
      data: { completado: true },
      include: { creadoPor: { select: { nombre: true, apellido: true } } }
    })
    res.json(actualizado)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al completar recordatorio.' })
  }
}

module.exports = { listar, crear, completar }
