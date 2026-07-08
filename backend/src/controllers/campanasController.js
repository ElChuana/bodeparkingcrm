const prisma = require('../lib/prisma')

const listar = async (req, res) => {
  try {
    const campanas = await prisma.campana.findMany({
      include: { _count: { select: { promociones: true } } },
      orderBy: { creadoEn: 'desc' },
    })
    res.json(campanas)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al obtener campañas.' })
  }
}

const obtener = async (req, res) => {
  try {
    const campana = await prisma.campana.findUnique({
      where: { id: Number(req.params.id) },
      include: { promociones: { include: { _count: { select: { unidades: true } } } } },
    })
    if (!campana) return res.status(404).json({ error: 'Campaña no encontrada.' })
    res.json(campana)
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener campaña.' })
  }
}

function construirData(body) {
  const { nombre, descripcion, fechaInicio, fechaFin, esWebinar } = body
  return {
    nombre,
    descripcion: descripcion ?? null,
    ...(esWebinar !== undefined && { esWebinar: Boolean(esWebinar) }),
    fechaInicio: fechaInicio ? new Date(fechaInicio) : null,
    fechaFin: fechaFin ? new Date(fechaFin) : null,
  }
}

const crear = async (req, res) => {
  if (!req.body.nombre) return res.status(400).json({ error: 'nombre requerido.' })
  try {
    const data = construirData(req.body)
    data.activa = req.body.activa !== undefined ? Boolean(req.body.activa) : true
    const campana = await prisma.campana.create({ data })
    res.status(201).json(campana)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al crear campaña.' })
  }
}

const actualizar = async (req, res) => {
  try {
    const data = construirData(req.body)
    if (req.body.activa !== undefined) data.activa = Boolean(req.body.activa)
    const campana = await prisma.campana.update({ where: { id: Number(req.params.id) }, data })
    res.json(campana)
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Campaña no encontrada.' })
    res.status(500).json({ error: 'Error al actualizar campaña.' })
  }
}

module.exports = { listar, obtener, crear, actualizar }
