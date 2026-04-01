const prisma = require('../lib/prisma')

const listar = async (req, res) => {
  const { search, origen, tipoPersona } = req.query
  try {
    const contactos = await prisma.contacto.findMany({
      where: {
        ...(origen && { origen }),
        ...(tipoPersona && { tipoPersona }),
        ...(search && {
          OR: [
            { nombre: { contains: search, mode: 'insensitive' } },
            { apellido: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { telefono: { contains: search } },
            { rut: { contains: search } }
          ]
        })
      },
      include: { _count: { select: { leads: true } } },
      orderBy: { creadoEn: 'desc' }
    })
    res.json(contactos)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al obtener contactos.' })
  }
}

const obtener = async (req, res) => {
  const { id } = req.params
  try {
    const contacto = await prisma.contacto.findUnique({
      where: { id: Number(id) },
      include: {
        leads: {
          include: {
            vendedor: { select: { nombre: true, apellido: true } },
            unidadInteres: { select: { numero: true, tipo: true, edificio: { select: { nombre: true } } } }
          },
          orderBy: { creadoEn: 'desc' }
        },
        compras: { include: { unidad: { select: { numero: true, tipo: true } } } }
      }
    })
    if (!contacto) return res.status(404).json({ error: 'Contacto no encontrado.' })
    res.json(contacto)
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener contacto.' })
  }
}

const crear = async (req, res) => {
  const { nombre, apellido, rut, email, telefono, empresa, tipoPersona, origen, notas } = req.body
  if (!nombre || !apellido) {
    return res.status(400).json({ error: 'Nombre y apellido son requeridos.' })
  }
  try {
    const contacto = await prisma.contacto.create({
      data: { nombre, apellido, rut, email, telefono, empresa, tipoPersona, origen, notas }
    })
    res.status(201).json(contacto)
  } catch (err) {
    res.status(500).json({ error: 'Error al crear contacto.' })
  }
}

const actualizar = async (req, res) => {
  const { id } = req.params
  const { nombre, apellido, rut, email, telefono, empresa, tipoPersona, origen, notas } = req.body
  try {
    const contacto = await prisma.contacto.update({
      where: { id: Number(id) },
      data: { nombre, apellido, rut, email, telefono, empresa, tipoPersona, origen, notas }
    })
    res.json(contacto)
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Contacto no encontrado.' })
    res.status(500).json({ error: 'Error al actualizar contacto.' })
  }
}

module.exports = { listar, obtener, crear, actualizar }
