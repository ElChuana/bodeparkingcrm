const prisma = require('../lib/prisma')

// Tipos que afectan el precio (categoría DESCUENTO). El resto son BENEFICIO.
const TIPOS_DESCUENTO = ['DESCUENTO_UF', 'DESCUENTO_PORCENTAJE', 'PAQUETE']
const categoriaDeTipo = (tipo) => (TIPOS_DESCUENTO.includes(tipo) ? 'DESCUENTO' : 'BENEFICIO')

// El frontend usa alias mesesArriendo / cuotasSinInteres → en el modelo es `meses`
const conAlias = (p) => (p ? { ...p, mesesArriendo: p.meses, cuotasSinInteres: p.meses } : p)

function construirData(body) {
  const {
    nombre, descripcion, tipo, valorUF, valorPorcentaje, precioObjetivoPesos, minUnidades,
    meses, mesesArriendo, cuotasSinInteres, montoMensualUF, detalle,
    fechaInicio, fechaFin, activa, campanaId,
  } = body
  const mesesFinal = meses ?? mesesArriendo ?? cuotasSinInteres
  return {
    nombre,
    descripcion: descripcion ?? null,
    categoria: categoriaDeTipo(tipo),
    tipo,
    valorUF: valorUF != null && valorUF !== '' ? Number(valorUF) : null,
    valorPorcentaje: valorPorcentaje != null && valorPorcentaje !== '' ? Number(valorPorcentaje) : null,
    precioObjetivoPesos: precioObjetivoPesos != null && precioObjetivoPesos !== '' ? Number(precioObjetivoPesos) : null,
    minUnidades: minUnidades != null && minUnidades !== '' ? Number(minUnidades) : null,
    meses: mesesFinal != null && mesesFinal !== '' ? Number(mesesFinal) : null,
    montoMensualUF: montoMensualUF != null && montoMensualUF !== '' ? Number(montoMensualUF) : null,
    detalle: detalle ?? null,
    fechaInicio: fechaInicio ? new Date(fechaInicio) : null,
    fechaFin: fechaFin ? new Date(fechaFin) : null,
    campanaId: campanaId != null && campanaId !== '' ? Number(campanaId) : null,
  }
}

const listar = async (req, res) => {
  const { categoria, campanaId, activa } = req.query
  try {
    const promos = await prisma.promocion.findMany({
      where: {
        ...(categoria && { categoria }),
        ...(campanaId !== undefined && { campanaId: campanaId === 'null' ? null : Number(campanaId) }),
        ...(activa !== undefined && { activa: activa === 'true' }),
      },
      include: {
        campana: { select: { id: true, nombre: true } },
        unidades: { select: { unidadId: true } },
        _count: { select: { unidades: true, ventas: true } },
      },
      orderBy: { creadoEn: 'desc' },
    })
    res.json(promos.map(conAlias))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al obtener promociones.' })
  }
}

const obtener = async (req, res) => {
  try {
    const promo = await prisma.promocion.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        campana: true,
        unidades: {
          include: {
            unidad: {
              select: {
                id: true, numero: true, tipo: true, precioUF: true, estado: true,
                edificio: { select: { nombre: true } },
              },
            },
          },
        },
        _count: { select: { unidades: true, ventas: true } },
      },
    })
    if (!promo) return res.status(404).json({ error: 'Promoción no encontrada.' })
    res.json(conAlias(promo))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al obtener promoción.' })
  }
}

const crear = async (req, res) => {
  if (!req.body.nombre || !req.body.tipo) {
    return res.status(400).json({ error: 'nombre y tipo son requeridos.' })
  }
  try {
    const data = construirData(req.body)
    data.activa = req.body.activa !== undefined ? Boolean(req.body.activa) : true
    const promo = await prisma.promocion.create({ data })
    res.status(201).json(conAlias(promo))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al crear promoción.' })
  }
}

const actualizar = async (req, res) => {
  try {
    const data = construirData(req.body)
    if (req.body.activa !== undefined) data.activa = Boolean(req.body.activa)
    const promo = await prisma.promocion.update({ where: { id: Number(req.params.id) }, data })
    res.json(conAlias(promo))
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Promoción no encontrada.' })
    console.error(err)
    res.status(500).json({ error: 'Error al actualizar promoción.' })
  }
}

const desactivar = async (req, res) => {
  try {
    const promo = await prisma.promocion.update({
      where: { id: Number(req.params.id) },
      data: { activa: false },
    })
    res.json(conAlias(promo))
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Promoción no encontrada.' })
    res.status(500).json({ error: 'Error al desactivar promoción.' })
  }
}

const agregarUnidad = async (req, res) => {
  const { unidadId } = req.body
  if (!unidadId) return res.status(400).json({ error: 'unidadId requerido.' })
  try {
    await prisma.unidadPromocion.create({
      data: { promocionId: Number(req.params.id), unidadId: Number(unidadId) },
    })
    res.status(201).json({ ok: true })
  } catch (err) {
    if (err.code === 'P2002') return res.json({ ok: true, yaExistia: true })
    console.error(err)
    res.status(500).json({ error: 'Error al agregar unidad.' })
  }
}

const quitarUnidad = async (req, res) => {
  try {
    await prisma.unidadPromocion.deleteMany({
      where: { promocionId: Number(req.params.id), unidadId: Number(req.params.unidadId) },
    })
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: 'Error al quitar unidad.' })
  }
}

module.exports = { listar, obtener, crear, actualizar, desactivar, agregarUnidad, quitarUnidad }
