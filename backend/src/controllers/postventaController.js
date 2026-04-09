const prisma = require('../lib/prisma')

const listar = async (req, res) => {
  const { estado, ventaId, prioridad } = req.query
  try {
    const postventas = await prisma.postventa.findMany({
      where: {
        ...(estado && { estado }),
        ...(ventaId && { ventaId: Number(ventaId) }),
        ...(prioridad && { prioridad })
      },
      include: {
        venta: {
          select: {
            id: true,
            comprador: { select: { nombre: true, apellido: true } },
            unidades: { select: { numero: true, tipo: true, edificio: { select: { nombre: true } } } }
          }
        },
        responsable: { select: { nombre: true, apellido: true } }
      },
      orderBy: { fechaApertura: 'desc' }
    })
    res.json(postventas)
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener postventas.' })
  }
}

const crear = async (req, res) => {
  const { ventaId, tipo, descripcion, prioridad } = req.body

  if (!ventaId || !tipo || !descripcion) {
    return res.status(400).json({ error: 'Venta, tipo y descripción son requeridos.' })
  }

  try {
    const pv = await prisma.postventa.create({
      data: {
        ventaId: Number(ventaId),
        responsableId: req.usuario.id,
        tipo,
        descripcion,
        prioridad: prioridad || 'media'
      }
    })
    res.status(201).json(pv)
  } catch (err) {
    res.status(500).json({ error: 'Error al crear postventa.' })
  }
}

const actualizar = async (req, res) => {
  const { id } = req.params
  const { estado, prioridad, resolucion, responsableId } = req.body

  try {
    const pv = await prisma.postventa.update({
      where: { id: Number(id) },
      data: {
        estado,
        prioridad,
        resolucion,
        responsableId: responsableId ? Number(responsableId) : undefined,
        ...(estado === 'CERRADO' && { fechaCierre: new Date() })
      }
    })
    res.json(pv)
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Postventa no encontrada.' })
    res.status(500).json({ error: 'Error al actualizar postventa.' })
  }
}

module.exports = { listar, crear, actualizar }
