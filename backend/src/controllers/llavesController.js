const prisma = require('../lib/prisma')

const listar = async (req, res) => {
  const { unidadId, edificioId, estado } = req.query
  try {
    const llaves = await prisma.llave.findMany({
      where: {
        ...(unidadId && { unidadId: Number(unidadId) }),
        ...(estado && { estado }),
        ...(edificioId && { unidad: { edificioId: Number(edificioId) } })
      },
      include: {
        unidad: {
          select: {
            numero: true, tipo: true, piso: true,
            edificio: { select: { nombre: true } }
          }
        },
        movimientos: {
          where: { tipo: 'prestamo', fechaDevolucionReal: null },
          include: { responsable: { select: { nombre: true, apellido: true } } },
          take: 1
        }
      },
      orderBy: { unidadId: 'asc' }
    })
    res.json(llaves)
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener llaves.' })
  }
}

const crear = async (req, res) => {
  const { unidadId, codigo, notas } = req.body

  if (!unidadId || !codigo) {
    return res.status(400).json({ error: 'Unidad y código son requeridos.' })
  }

  try {
    const llave = await prisma.llave.create({
      data: { unidadId: Number(unidadId), codigo, notas }
    })
    res.status(201).json(llave)
  } catch (err) {
    res.status(500).json({ error: 'Error al crear llave.' })
  }
}

const prestar = async (req, res) => {
  const { id } = req.params
  const { personaNombre, personaContacto, motivo, fechaDevolucionEsperada } = req.body

  if (!personaNombre) return res.status(400).json({ error: 'Nombre de la persona es requerido.' })

  try {
    const llave = await prisma.llave.findUnique({ where: { id: Number(id) } })
    if (!llave) return res.status(404).json({ error: 'Llave no encontrada.' })
    if (llave.estado === 'PRESTADA') return res.status(400).json({ error: 'Esta llave ya está prestada.' })

    await prisma.llave.update({ where: { id: Number(id) }, data: { estado: 'PRESTADA' } })

    const movimiento = await prisma.movimientoLlave.create({
      data: {
        llaveId: Number(id),
        responsableId: req.usuario.id,
        tipo: 'prestamo',
        personaNombre,
        personaContacto,
        motivo,
        fechaDevolucionEsperada: fechaDevolucionEsperada ? new Date(fechaDevolucionEsperada) : null
      },
      include: { responsable: { select: { nombre: true, apellido: true } } }
    })

    res.status(201).json({ llave: { ...llave, estado: 'PRESTADA' }, movimiento })
  } catch (err) {
    res.status(500).json({ error: 'Error al prestar llave.' })
  }
}

const devolver = async (req, res) => {
  const { id } = req.params

  try {
    const llave = await prisma.llave.findUnique({ where: { id: Number(id) } })
    if (!llave) return res.status(404).json({ error: 'Llave no encontrada.' })
    if (llave.estado !== 'PRESTADA') return res.status(400).json({ error: 'Esta llave no está prestada.' })

    // Cerrar el movimiento de préstamo activo
    const movimientoActivo = await prisma.movimientoLlave.findFirst({
      where: { llaveId: Number(id), tipo: 'prestamo', fechaDevolucionReal: null }
    })

    if (movimientoActivo) {
      await prisma.movimientoLlave.update({
        where: { id: movimientoActivo.id },
        data: { fechaDevolucionReal: new Date() }
      })
      await prisma.movimientoLlave.create({
        data: {
          llaveId: Number(id),
          responsableId: req.usuario.id,
          tipo: 'devolucion',
          personaNombre: movimientoActivo.personaNombre,
          fechaPrestamo: new Date()
        }
      })
    }

    const llaveActualizada = await prisma.llave.update({
      where: { id: Number(id) },
      data: { estado: 'EN_OFICINA' }
    })

    res.json(llaveActualizada)
  } catch (err) {
    res.status(500).json({ error: 'Error al devolver llave.' })
  }
}

const historial = async (req, res) => {
  const { id } = req.params
  try {
    const movimientos = await prisma.movimientoLlave.findMany({
      where: { llaveId: Number(id) },
      include: { responsable: { select: { nombre: true, apellido: true } } },
      orderBy: { creadoEn: 'desc' }
    })
    res.json(movimientos)
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener historial.' })
  }
}

// Llaves prestadas hace más de X días sin devolver
const llavesVencidas = async (req, res) => {
  try {
    const config = await prisma.alertaConfig.findUnique({ where: { tipo: 'LLAVE_NO_DEVUELTA' } })
    const umbral = config?.umbralDias || 3

    const fechaLimite = new Date()
    fechaLimite.setDate(fechaLimite.getDate() - umbral)

    const movimientos = await prisma.movimientoLlave.findMany({
      where: {
        tipo: 'prestamo',
        fechaDevolucionReal: null,
        fechaPrestamo: { lte: fechaLimite }
      },
      include: {
        llave: {
          include: {
            unidad: { select: { numero: true, tipo: true, edificio: { select: { nombre: true } } } }
          }
        },
        responsable: { select: { nombre: true, apellido: true } }
      }
    })
    res.json(movimientos)
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener llaves vencidas.' })
  }
}

module.exports = { listar, crear, prestar, devolver, historial, llavesVencidas }
