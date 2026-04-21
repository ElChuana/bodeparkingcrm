const prisma = require('../lib/prisma')

const INCLUDE_PACK = {
  unidades: {
    include: {
      unidad: { select: { id: true, numero: true, tipo: true, edificio: { select: { nombre: true } } } }
    }
  }
}

const listar = async (req, res) => {
  const { activa } = req.query
  try {
    const packs = await prisma.pack.findMany({
      where: { ...(activa !== undefined && { activa: activa === 'true' }) },
      include: INCLUDE_PACK,
      orderBy: { creadoEn: 'desc' }
    })
    res.json(packs)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al obtener packs.' })
  }
}

const crear = async (req, res) => {
  const { nombre, descripcion, tipo, descuentoUF, minUnidades, fechaInicio, fechaFin, unidadIds } = req.body
  if (!nombre || !tipo || !descuentoUF) {
    return res.status(400).json({ error: 'nombre, tipo y descuentoUF son requeridos.' })
  }
  try {
    const pack = await prisma.pack.create({
      data: {
        nombre, descripcion: descripcion || null, tipo,
        descuentoUF: Number(descuentoUF),
        minUnidades: minUnidades ? Number(minUnidades) : 2,
        fechaInicio: fechaInicio ? new Date(fechaInicio) : null,
        fechaFin: fechaFin ? new Date(fechaFin) : null,
        unidades: tipo === 'COMBO_ESPECIFICO' && Array.isArray(unidadIds) && unidadIds.length > 0
          ? { create: unidadIds.map(id => ({ unidadId: Number(id) })) }
          : undefined
      },
      include: INCLUDE_PACK
    })
    res.status(201).json(pack)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al crear pack.' })
  }
}

const actualizar = async (req, res) => {
  const { id } = req.params
  const { nombre, descripcion, tipo, descuentoUF, minUnidades, fechaInicio, fechaFin, activa, unidadIds } = req.body
  try {
    if (tipo === 'COMBO_ESPECIFICO' && Array.isArray(unidadIds)) {
      await prisma.unidadPack.deleteMany({ where: { packId: Number(id) } })
    }
    const pack = await prisma.pack.update({
      where: { id: Number(id) },
      data: {
        ...(nombre !== undefined && { nombre }),
        ...(descripcion !== undefined && { descripcion }),
        ...(tipo !== undefined && { tipo }),
        ...(descuentoUF !== undefined && { descuentoUF: Number(descuentoUF) }),
        ...(minUnidades !== undefined && { minUnidades: Number(minUnidades) }),
        ...(fechaInicio !== undefined && { fechaInicio: fechaInicio ? new Date(fechaInicio) : null }),
        ...(fechaFin !== undefined && { fechaFin: fechaFin ? new Date(fechaFin) : null }),
        ...(activa !== undefined && { activa: Boolean(activa) }),
        ...(tipo === 'COMBO_ESPECIFICO' && Array.isArray(unidadIds) && {
          unidades: { create: unidadIds.map(uid => ({ unidadId: Number(uid) })) }
        })
      },
      include: INCLUDE_PACK
    })
    res.json(pack)
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Pack no encontrado.' })
    console.error(err)
    res.status(500).json({ error: 'Error al actualizar pack.' })
  }
}

const desactivar = async (req, res) => {
  const { id } = req.params
  try {
    const pack = await prisma.pack.update({
      where: { id: Number(id) },
      data: { activa: false }
    })
    res.json(pack)
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Pack no encontrado.' })
    res.status(500).json({ error: 'Error al desactivar pack.' })
  }
}

module.exports = { listar, crear, actualizar, desactivar }
