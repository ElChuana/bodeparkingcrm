const prisma = require('../lib/prisma')

const INCLUDE_BENEFICIO = {
  unidades: {
    include: {
      unidad: { select: { id: true, numero: true, tipo: true, edificio: { select: { nombre: true } } } }
    }
  }
}

const listar = async (req, res) => {
  const { activa } = req.query
  try {
    const beneficios = await prisma.beneficio.findMany({
      where: { ...(activa !== undefined && { activa: activa === 'true' }) },
      include: INCLUDE_BENEFICIO,
      orderBy: { creadoEn: 'desc' }
    })
    res.json(beneficios)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al obtener beneficios.' })
  }
}

const crear = async (req, res) => {
  const { nombre, descripcion, tipo, meses, montoMensualUF, detalle, fechaInicio, fechaFin, unidadIds } = req.body
  if (!nombre || !tipo) {
    return res.status(400).json({ error: 'nombre y tipo son requeridos.' })
  }
  try {
    const beneficio = await prisma.beneficio.create({
      data: {
        nombre, descripcion: descripcion || null, tipo,
        meses: meses ? Number(meses) : null,
        montoMensualUF: montoMensualUF ? Number(montoMensualUF) : null,
        detalle: detalle || null,
        fechaInicio: fechaInicio ? new Date(fechaInicio) : null,
        fechaFin: fechaFin ? new Date(fechaFin) : null,
        unidades: Array.isArray(unidadIds) && unidadIds.length > 0
          ? { create: unidadIds.map(id => ({ unidadId: Number(id) })) }
          : undefined
      },
      include: INCLUDE_BENEFICIO
    })
    res.status(201).json(beneficio)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al crear beneficio.' })
  }
}

const actualizar = async (req, res) => {
  const { id } = req.params
  const { nombre, descripcion, tipo, meses, montoMensualUF, detalle, fechaInicio, fechaFin, activa, unidadIds } = req.body
  try {
    if (Array.isArray(unidadIds)) {
      await prisma.unidadBeneficio.deleteMany({ where: { beneficioId: Number(id) } })
    }
    const beneficio = await prisma.beneficio.update({
      where: { id: Number(id) },
      data: {
        ...(nombre !== undefined && { nombre }),
        ...(descripcion !== undefined && { descripcion }),
        ...(tipo !== undefined && { tipo }),
        ...(meses !== undefined && { meses: meses ? Number(meses) : null }),
        ...(montoMensualUF !== undefined && { montoMensualUF: montoMensualUF ? Number(montoMensualUF) : null }),
        ...(detalle !== undefined && { detalle }),
        ...(fechaInicio !== undefined && { fechaInicio: fechaInicio ? new Date(fechaInicio) : null }),
        ...(fechaFin !== undefined && { fechaFin: fechaFin ? new Date(fechaFin) : null }),
        ...(activa !== undefined && { activa: Boolean(activa) }),
        ...(Array.isArray(unidadIds) && {
          unidades: { create: unidadIds.map(uid => ({ unidadId: Number(uid) })) }
        })
      },
      include: INCLUDE_BENEFICIO
    })
    res.json(beneficio)
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Beneficio no encontrado.' })
    console.error(err)
    res.status(500).json({ error: 'Error al actualizar beneficio.' })
  }
}

const desactivar = async (req, res) => {
  const { id } = req.params
  try {
    const beneficio = await prisma.beneficio.update({
      where: { id: Number(id) },
      data: { activa: false }
    })
    res.json(beneficio)
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Beneficio no encontrado.' })
    res.status(500).json({ error: 'Error al desactivar beneficio.' })
  }
}

module.exports = { listar, crear, actualizar, desactivar }
