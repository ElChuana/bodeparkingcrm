const prisma = require('../lib/prisma')

const TIPOS_PACK = ['PAQUETE', 'DESCUENTO_PORCENTAJE', 'DESCUENTO_UF', 'COMBO']

function categoriaDesdeTipo(tipo) {
  return TIPOS_PACK.includes(tipo) ? 'PACK' : 'PROMOCION'
}

const listar = async (req, res) => {
  const { activa, tipo, categoria } = req.query
  try {
    const promociones = await prisma.promocion.findMany({
      where: {
        ...(activa !== undefined && { activa: activa === 'true' }),
        ...(tipo && { tipo }),
        ...(categoria && { categoria })
      },
      include: {
        _count: { select: { unidades: true, ventas: true } },
        unidades: {
          include: {
            unidad: {
              select: { id: true, numero: true, tipo: true, estado: true, precioUF: true, edificio: { select: { nombre: true } } }
            }
          }
        }
      },
      orderBy: { creadoEn: 'desc' }
    })
    res.json(promociones)
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener promociones.' })
  }
}

const obtener = async (req, res) => {
  const { id } = req.params
  try {
    const promo = await prisma.promocion.findUnique({
      where: { id: Number(id) },
      include: {
        unidades: { include: { unidad: { include: { edificio: { select: { nombre: true } } } } } },
        ventas: {
          include: {
            venta: { select: { id: true, estado: true, comprador: { select: { nombre: true, apellido: true } } } },
            pagosArriendoAsegurado: true
          }
        }
      }
    })
    if (!promo) return res.status(404).json({ error: 'Promoción no encontrada.' })
    res.json(promo)
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener promoción.' })
  }
}

const crear = async (req, res) => {
  const {
    nombre, descripcion, detalle, tipo, valorPorcentaje, valorUF,
    minUnidades, mesesArriendo, montoMensualUF, cuotasSinInteres,
    fechaInicio, fechaFin
  } = req.body

  if (!nombre || !tipo) return res.status(400).json({ error: 'Nombre y tipo son requeridos.' })

  try {
    const promo = await prisma.promocion.create({
      data: {
        nombre, descripcion, detalle, tipo,
        categoria: categoriaDesdeTipo(tipo),
        valorPorcentaje: valorPorcentaje ? Number(valorPorcentaje) : null,
        valorUF: valorUF ? Number(valorUF) : null,
        minUnidades: minUnidades ? Number(minUnidades) : null,
        mesesArriendo: mesesArriendo ? Number(mesesArriendo) : null,
        montoMensualUF: montoMensualUF ? Number(montoMensualUF) : null,
        cuotasSinInteres: cuotasSinInteres ? Number(cuotasSinInteres) : null,
        fechaInicio: fechaInicio ? new Date(fechaInicio) : null,
        fechaFin: fechaFin ? new Date(fechaFin) : null
      }
    })
    res.status(201).json(promo)
  } catch (err) {
    res.status(500).json({ error: 'Error al crear promoción.' })
  }
}

const actualizar = async (req, res) => {
  const { id } = req.params
  const {
    nombre, descripcion, detalle, tipo, valorPorcentaje, valorUF,
    minUnidades, mesesArriendo, montoMensualUF, cuotasSinInteres,
    fechaInicio, fechaFin, activa
  } = req.body

  try {
    const promo = await prisma.promocion.update({
      where: { id: Number(id) },
      data: {
        nombre, descripcion, detalle, tipo, activa,
        ...(tipo && { categoria: categoriaDesdeTipo(tipo) }),
        valorPorcentaje: valorPorcentaje !== undefined ? Number(valorPorcentaje) : undefined,
        valorUF: valorUF !== undefined ? Number(valorUF) : undefined,
        minUnidades: minUnidades !== undefined ? Number(minUnidades) : undefined,
        mesesArriendo: mesesArriendo !== undefined ? Number(mesesArriendo) : undefined,
        montoMensualUF: montoMensualUF !== undefined ? Number(montoMensualUF) : undefined,
        cuotasSinInteres: cuotasSinInteres !== undefined ? Number(cuotasSinInteres) : undefined,
        fechaInicio: fechaInicio ? new Date(fechaInicio) : undefined,
        fechaFin: fechaFin ? new Date(fechaFin) : undefined
      }
    })
    res.json(promo)
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Promoción no encontrada.' })
    res.status(500).json({ error: 'Error al actualizar promoción.' })
  }
}

const asignarUnidad = async (req, res) => {
  const { id } = req.params
  const { unidadId } = req.body

  try {
    await prisma.unidadPromocion.create({
      data: { unidadId: Number(unidadId), promocionId: Number(id) }
    })
    res.status(201).json({ mensaje: 'Promoción asignada a unidad.' })
  } catch (err) {
    if (err.code === 'P2002') return res.status(400).json({ error: 'Esta unidad ya tiene esta promoción.' })
    res.status(500).json({ error: 'Error al asignar promoción.' })
  }
}

const desasignarUnidad = async (req, res) => {
  const { id, unidadId } = req.params
  try {
    await prisma.unidadPromocion.delete({
      where: { unidadId_promocionId: { unidadId: Number(unidadId), promocionId: Number(id) } }
    })
    res.json({ mensaje: 'Promoción removida de la unidad.' })
  } catch (err) {
    res.status(500).json({ error: 'Error al remover promoción.' })
  }
}

// Aplicar promoción a una venta
const aplicarAVenta = async (req, res) => {
  const { id } = req.params
  const { ventaId } = req.body

  try {
    const promo = await prisma.promocion.findUnique({ where: { id: Number(id) } })
    if (!promo) return res.status(404).json({ error: 'Promoción no encontrada.' })

    const ventaPromo = await prisma.ventaPromocion.create({
      data: { ventaId: Number(ventaId), promocionId: Number(id) }
    })

    // Si es arriendo asegurado, crear registros de pagos mes a mes
    if (promo.tipo === 'ARRIENDO_ASEGURADO' && promo.mesesArriendo) {
      const pagos = Array.from({ length: promo.mesesArriendo }, (_, i) => ({
        ventaPromocionId: ventaPromo.id,
        mes: i + 1,
        montoUF: promo.montoMensualUF || 0,
        estado: 'PENDIENTE'
      }))
      await prisma.pagoArriendoAsegurado.createMany({ data: pagos })
    }

    res.status(201).json(ventaPromo)
  } catch (err) {
    console.error(err)
    if (err.code === 'P2002') return res.status(400).json({ error: 'Esta promoción ya está aplicada a esta venta.' })
    res.status(500).json({ error: 'Error al aplicar promoción a venta.' })
  }
}

const quitarDeVenta = async (req, res) => {
  const { ventaPromoId } = req.params
  try {
    await prisma.pagoArriendoAsegurado.deleteMany({ where: { ventaPromocionId: Number(ventaPromoId) } })
    await prisma.ventaPromocion.delete({ where: { id: Number(ventaPromoId) } })
    res.json({ mensaje: 'Promoción quitada de la venta.' })
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'No encontrado.' })
    res.status(500).json({ error: 'Error al quitar promoción.' })
  }
}

module.exports = { listar, obtener, crear, actualizar, asignarUnidad, desasignarUnidad, aplicarAVenta, quitarDeVenta }
