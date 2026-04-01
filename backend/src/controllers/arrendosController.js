const prisma = require('../lib/prisma')

const listar = async (req, res) => {
  const { estado, edificioId } = req.query
  try {
    const arriendos = await prisma.arriendo.findMany({
      where: {
        ...(estado && { estado }),
        ...(edificioId && { unidad: { edificioId: Number(edificioId) } })
      },
      include: {
        unidad: {
          select: {
            numero: true, tipo: true, piso: true,
            edificio: { select: { nombre: true, region: true, comuna: true } }
          }
        },
        contacto: { select: { nombre: true, apellido: true, email: true, telefono: true } },
        _count: { select: { pagos: true } }
      },
      orderBy: { creadoEn: 'desc' }
    })
    res.json(arriendos)
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener arriendos.' })
  }
}

const obtener = async (req, res) => {
  const { id } = req.params
  try {
    const arriendo = await prisma.arriendo.findUnique({
      where: { id: Number(id) },
      include: {
        unidad: { include: { edificio: true } },
        contacto: true,
        pagos: { orderBy: { mes: 'desc' } }
      }
    })
    if (!arriendo) return res.status(404).json({ error: 'Arriendo no encontrado.' })
    res.json(arriendo)
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener arriendo.' })
  }
}

const crear = async (req, res) => {
  const { unidadId, contactoId, gestorNombre, montoMensualUF, fechaInicio, fechaFin, notas } = req.body

  if (!unidadId || !contactoId || !fechaInicio) {
    return res.status(400).json({ error: 'Unidad, contacto y fecha de inicio son requeridos.' })
  }

  try {
    // Verificar que la unidad esté disponible o en estado válido para arrendar
    const unidad = await prisma.unidad.findUnique({ where: { id: Number(unidadId) } })
    if (!unidad) return res.status(404).json({ error: 'Unidad no encontrada.' })

    const arriendo = await prisma.arriendo.create({
      data: {
        unidadId: Number(unidadId),
        contactoId: Number(contactoId),
        gestorNombre,
        montoMensualUF: montoMensualUF ? Number(montoMensualUF) : null,
        fechaInicio: new Date(fechaInicio),
        fechaFin: fechaFin ? new Date(fechaFin) : null,
        notas,
        ...(req.file && { contratoUrl: `/uploads/${req.file.filename}` })
      },
      include: {
        unidad: { select: { numero: true, tipo: true, edificio: { select: { nombre: true } } } },
        contacto: { select: { nombre: true, apellido: true } }
      }
    })

    // Actualizar estado de la unidad
    await prisma.unidad.update({ where: { id: Number(unidadId) }, data: { estado: 'ARRENDADO' } })

    res.status(201).json(arriendo)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al crear arriendo.' })
  }
}

const actualizar = async (req, res) => {
  const { id } = req.params
  const { gestorNombre, montoMensualUF, fechaFin, estado, notas } = req.body

  try {
    const arriendo = await prisma.arriendo.update({
      where: { id: Number(id) },
      data: {
        gestorNombre,
        montoMensualUF: montoMensualUF ? Number(montoMensualUF) : undefined,
        fechaFin: fechaFin ? new Date(fechaFin) : undefined,
        estado,
        notas,
        ...(req.file && { contratoUrl: `/uploads/${req.file.filename}` })
      }
    })

    // Si se termina el arriendo, liberar la unidad
    if (estado === 'TERMINADO') {
      await prisma.unidad.update({ where: { id: arriendo.unidadId }, data: { estado: 'DISPONIBLE' } })
    }

    res.json(arriendo)
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Arriendo no encontrado.' })
    res.status(500).json({ error: 'Error al actualizar arriendo.' })
  }
}

module.exports = { listar, obtener, crear, actualizar }
