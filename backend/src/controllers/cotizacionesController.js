const prisma = require('../lib/prisma')

const INCLUDE_COMPLETO = {
  lead: {
    select: {
      id: true,
      contacto: { select: { id: true, nombre: true, apellido: true, email: true, telefono: true } },
      vendedor: { select: { id: true, nombre: true, apellido: true } },
      broker:   { select: { id: true, nombre: true, apellido: true } },
      venta:    { select: { id: true } },
    }
  },
  creadoPor: { select: { id: true, nombre: true, apellido: true } },
  items: {
    include: {
      unidad: {
        include: {
          edificio: { select: { id: true, nombre: true, region: true } },
          promociones: {
            include: { promocion: true }
          }
        }
      }
    }
  },
  promociones: {
    include: {
      promocion: {
        include: {
          unidades: { select: { unidadId: true } }
        }
      }
    }
  }
}

// Calcula ahorroUF de una promo dado el contexto de items
function calcularAhorro(promo, items, totalBase) {
  switch (promo.tipo) {
    case 'DESCUENTO_PORCENTAJE': {
      // Si tiene minUnidades, solo aplica si hay suficientes unidades en la cotización
      if (promo.minUnidades && items.length < promo.minUnidades) return 0
      return totalBase * ((promo.valorPorcentaje || 0) / 100)
    }
    case 'DESCUENTO_UF': {
      if (promo.minUnidades && items.length < promo.minUnidades) return 0
      return promo.valorUF || 0
    }
    case 'PAQUETE': {
      // Ahorro = suma de precios individuales de las unidades del paquete - precio paquete
      const idsEnPaquete = (promo.unidades || []).map(u => u.unidadId)
      const itemsDelPaquete = items.filter(i => idsEnPaquete.includes(i.unidadId))
      if (itemsDelPaquete.length < idsEnPaquete.length) return 0 // no están todas
      const sumaIndividual = itemsDelPaquete.reduce((s, i) => s + i.precioListaUF, 0)
      return Math.max(sumaIndividual - (promo.valorUF || 0), 0)
    }
    default:
      return 0 // BENEFICIO, ARRIENDO_ASEGURADO, etc. → no descuento monetario
  }
}

const listar = async (req, res) => {
  const { leadId, estado } = req.query
  const esGerenciaOJV = ['GERENTE', 'JEFE_VENTAS'].includes(req.usuario.rol)

  try {
    const cotizaciones = await prisma.cotizacion.findMany({
      where: {
        ...(leadId && { leadId: Number(leadId) }),
        ...(estado && { estado }),
        ...(!esGerenciaOJV && { creadoPorId: req.usuario.id }),
      },
      include: {
        lead: {
          select: {
            id: true,
            contacto: { select: { nombre: true, apellido: true } }
          }
        },
        creadoPor: { select: { nombre: true, apellido: true } },
        items: {
          include: {
            unidad: {
              select: { numero: true, tipo: true, edificio: { select: { nombre: true } } }
            }
          }
        },
        _count: { select: { items: true, promociones: true } }
      },
      orderBy: { creadoEn: 'desc' }
    })
    res.json(cotizaciones)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al obtener cotizaciones.' })
  }
}

const obtener = async (req, res) => {
  const { id } = req.params
  try {
    const cotizacion = await prisma.cotizacion.findUnique({
      where: { id: Number(id) },
      include: INCLUDE_COMPLETO
    })
    if (!cotizacion) return res.status(404).json({ error: 'Cotización no encontrada.' })
    res.json(cotizacion)
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener cotización.' })
  }
}

const crear = async (req, res) => {
  const { leadId, items, promociones, notas, validezDias } = req.body

  if (!leadId || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Se requiere lead y al menos una unidad.' })
  }

  try {
    const totalBase = items.reduce((s, i) => s + (i.precioListaUF || 0), 0)

    // Calcular ahorro de cada promo
    const promosConAhorro = (promociones || []).map(cp => {
      // Need full promo data to calculate
      return { promocionId: cp.promocionId, aplicada: cp.aplicada ?? true, ahorroUF: cp.ahorroUF ?? 0 }
    })

    const cotizacion = await prisma.cotizacion.create({
      data: {
        leadId: Number(leadId),
        creadoPorId: req.usuario.id,
        notas: notas || null,
        validezDias: validezDias || 30,
        items: {
          create: items.map(i => ({
            unidadId: Number(i.unidadId),
            precioListaUF: Number(i.precioListaUF),
            descuentoUF: Number(i.descuentoUF || 0),
          }))
        },
        promociones: {
          create: promosConAhorro.map(cp => ({
            promocionId: Number(cp.promocionId),
            aplicada: cp.aplicada,
            ahorroUF: Number(cp.ahorroUF || 0),
          }))
        }
      },
      include: INCLUDE_COMPLETO
    })

    res.status(201).json(cotizacion)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al crear cotización.' })
  }
}

const actualizar = async (req, res) => {
  const { id } = req.params
  const { items, promociones, notas, validezDias } = req.body

  try {
    // Reemplazar items y promociones
    await prisma.$transaction([
      prisma.cotizacionItem.deleteMany({ where: { cotizacionId: Number(id) } }),
      prisma.cotizacionPromocion.deleteMany({ where: { cotizacionId: Number(id) } }),
    ])

    const cotizacion = await prisma.cotizacion.update({
      where: { id: Number(id) },
      data: {
        notas: notas ?? undefined,
        validezDias: validezDias ?? undefined,
        items: {
          create: (items || []).map(i => ({
            unidadId: Number(i.unidadId),
            precioListaUF: Number(i.precioListaUF),
            descuentoUF: Number(i.descuentoUF || 0),
          }))
        },
        promociones: {
          create: (promociones || []).map(cp => ({
            promocionId: Number(cp.promocionId),
            aplicada: cp.aplicada ?? true,
            ahorroUF: Number(cp.ahorroUF || 0),
          }))
        }
      },
      include: INCLUDE_COMPLETO
    })

    res.json(cotizacion)
  } catch (err) {
    console.error(err)
    if (err.code === 'P2025') return res.status(404).json({ error: 'Cotización no encontrada.' })
    res.status(500).json({ error: 'Error al actualizar cotización.' })
  }
}

const cambiarEstado = async (req, res) => {
  const { id } = req.params
  const { estado } = req.body
  const validos = ['BORRADOR', 'ENVIADA', 'ACEPTADA', 'RECHAZADA']
  if (!validos.includes(estado)) return res.status(400).json({ error: 'Estado inválido.' })

  try {
    const cotizacion = await prisma.cotizacion.update({
      where: { id: Number(id) },
      data: { estado },
      include: INCLUDE_COMPLETO
    })
    res.json(cotizacion)
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Cotización no encontrada.' })
    res.status(500).json({ error: 'Error al cambiar estado.' })
  }
}

const eliminar = async (req, res) => {
  const { id } = req.params
  try {
    await prisma.cotizacion.delete({ where: { id: Number(id) } })
    res.json({ ok: true })
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Cotización no encontrada.' })
    res.status(500).json({ error: 'Error al eliminar cotización.' })
  }
}

// Endpoint para obtener unidades disponibles con sus promociones activas
const unidadesDisponibles = async (req, res) => {
  const { search, edificioId, tipo } = req.query
  try {
    const unidades = await prisma.unidad.findMany({
      where: {
        estado: 'DISPONIBLE',
        // Excluir unidades con venta activa (reservada, promesada o escriturada)
        NOT: {
          venta: { estado: { in: ['RESERVA', 'PROMESA', 'ESCRITURA', 'ENTREGADO'] } }
        },
        ...(edificioId && { edificioId: Number(edificioId) }),
        ...(tipo && { tipo }),
        ...(search && {
          OR: [
            { numero: { contains: search, mode: 'insensitive' } },
            { edificio: { nombre: { contains: search, mode: 'insensitive' } } }
          ]
        })
      },
      include: {
        edificio: { select: { id: true, nombre: true, region: true, comuna: true } },
        promociones: {
          include: {
            promocion: {
              include: { unidades: { select: { unidadId: true } } }
            }
          },
          where: {
            promocion: {
              activa: true,
              OR: [
                { fechaFin: null },
                { fechaFin: { gte: new Date() } }
              ]
            }
          }
        }
      },
      orderBy: [{ edificio: { nombre: 'asc' } }, { numero: 'asc' }]
    })
    res.json(unidades)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al obtener unidades.' })
  }
}

module.exports = { listar, obtener, crear, actualizar, cambiarEstado, eliminar, unidadesDisponibles }
