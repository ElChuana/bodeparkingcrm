const prisma = require('../lib/prisma')

// Acepta null/'' → null, y cualquier fecha parseable (ISO o Date) → Date.
const fechaOrNull = (v) => {
  if (v === null || v === undefined || v === '') return null
  const d = new Date(v)
  return isNaN(d.getTime()) ? null : d
}

const listar = async (req, res) => {
  try {
    const edificios = await prisma.edificio.findMany({
      where: { activo: true },
      include: {
        _count: { select: { unidades: true } }
      },
      orderBy: { nombre: 'asc' }
    })
    res.json(edificios)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al obtener edificios.' })
  }
}

const obtener = async (req, res) => {
  const { id } = req.params
  try {
    const edificio = await prisma.edificio.findUnique({
      where: { id: Number(id) },
      include: {
        unidades: {
          orderBy: [{ tipo: 'asc' }, { numero: 'asc' }]
        }
      }
    })
    if (!edificio) return res.status(404).json({ error: 'Edificio no encontrado.' })
    res.json(edificio)
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener edificio.' })
  }
}

const crear = async (req, res) => {
  const { nombre, direccion, region, comuna, inmobiliaria, contactoInmobiliaria, descripcion, fechaEscritura } = req.body
  if (!nombre || !direccion || !region || !comuna) {
    return res.status(400).json({ error: 'Nombre, dirección, región y comuna son requeridos.' })
  }
  try {
    const edificio = await prisma.edificio.create({
      data: { nombre, direccion, region, comuna, inmobiliaria, contactoInmobiliaria, descripcion, fechaEscritura: fechaOrNull(fechaEscritura) }
    })
    res.status(201).json(edificio)
  } catch (err) {
    res.status(500).json({ error: 'Error al crear edificio.' })
  }
}

const actualizar = async (req, res) => {
  const { id } = req.params
  const { nombre, direccion, region, comuna, inmobiliaria, contactoInmobiliaria, descripcion, activo, fechaEscritura } = req.body
  try {
    const edificio = await prisma.edificio.update({
      where: { id: Number(id) },
      data: { nombre, direccion, region, comuna, inmobiliaria, contactoInmobiliaria, descripcion, activo, fechaEscritura: fechaOrNull(fechaEscritura) }
    })
    res.json(edificio)
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Edificio no encontrado.' })
    res.status(500).json({ error: 'Error al actualizar edificio.' })
  }
}

module.exports = { listar, obtener, crear, actualizar }
