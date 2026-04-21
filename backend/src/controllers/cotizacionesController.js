const prisma = require('../lib/prisma')

const INCLUDE_COMPLETO = {
  lead: {
    select: {
      id: true,
      contacto: { select: { id: true, nombre: true, apellido: true, email: true, telefono: true } },
      vendedor: { select: { id: true, nombre: true, apellido: true } },
      broker:   { select: { id: true, nombre: true, apellido: true } },
      ventas:   { select: { id: true, estado: true } },
    }
  },
  creadoPor: { select: { id: true, nombre: true, apellido: true } },
  items: {
    include: {
      unidad: {
        include: {
          edificio: { select: { id: true, nombre: true, region: true } }
        }
      }
    }
  },
  packs: {
    include: {
      pack: {
        include: { unidades: { select: { unidadId: true } } }
      }
    }
  },
  beneficios: {
    include: { beneficio: true }
  },
  solicitudesDescuento: {
    orderBy: { creadoEn: 'desc' },
    include: {
      solicitadoPor: { select: { id: true, nombre: true, apellido: true } },
      revisadoPor:   { select: { id: true, nombre: true, apellido: true } }
    }
  }
}

function calcularTotales(cotizacion) {
  const precioListaUF = (cotizacion.items || []).reduce((s, i) => s + (i.precioListaUF || 0), 0)
  const descuentoPacksUF = (cotizacion.packs || []).reduce((s, p) => s + (p.descuentoAplicadoUF || 0), 0)
  const descuentoAprobadoUF = cotizacion.descuentoAprobadoUF || 0
  const precioFinalUF = Math.max(precioListaUF - descuentoPacksUF - descuentoAprobadoUF, 0)
  return { precioListaUF, descuentoPacksUF, descuentoAprobadoUF, precioFinalUF }
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
          select: { id: true, contacto: { select: { nombre: true, apellido: true } } }
        },
        creadoPor: { select: { nombre: true, apellido: true } },
        items: { select: { precioListaUF: true } },
        packs: { select: { descuentoAplicadoUF: true } },
        _count: { select: { items: true, packs: true, beneficios: true } }
      },
      orderBy: { creadoEn: 'desc' }
    })
    const result = cotizaciones.map(c => ({ ...c, ...calcularTotales(c) }))
    res.json(result)
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
    res.json({ ...cotizacion, ...calcularTotales(cotizacion) })
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener cotización.' })
  }
}

const crear = async (req, res) => {
  const { leadId, items, notas, validezDias } = req.body

  if (!leadId || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Se requiere lead y al menos una unidad.' })
  }

  try {
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
          }))
        }
      },
      include: INCLUDE_COMPLETO
    })
    res.status(201).json({ ...cotizacion, ...calcularTotales(cotizacion) })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al crear cotización.' })
  }
}

const actualizar = async (req, res) => {
  const { id } = req.params
  const { items, notas, validezDias } = req.body

  try {
    if (Array.isArray(items)) {
      await prisma.cotizacionItem.deleteMany({ where: { cotizacionId: Number(id) } })
    }

    const cotizacion = await prisma.cotizacion.update({
      where: { id: Number(id) },
      data: {
        ...(notas !== undefined && { notas }),
        ...(validezDias !== undefined && { validezDias }),
        ...(Array.isArray(items) && {
          items: {
            create: items.map(i => ({
              unidadId: Number(i.unidadId),
              precioListaUF: Number(i.precioListaUF),
            }))
          }
        })
      },
      include: INCLUDE_COMPLETO
    })

    res.json({ ...cotizacion, ...calcularTotales(cotizacion) })
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
    res.json({ ...cotizacion, ...calcularTotales(cotizacion) })
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

const unidadesDisponibles = async (req, res) => {
  const { search, edificioId, tipo } = req.query
  try {
    const unidades = await prisma.unidad.findMany({
      where: {
        estado: 'DISPONIBLE',
        NOT: { ventaId: { not: null } },
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
        packs: {
          include: { pack: true },
          where: {
            pack: {
              activa: true,
              OR: [{ fechaFin: null }, { fechaFin: { gte: new Date() } }]
            }
          }
        },
        beneficios: {
          include: { beneficio: true },
          where: {
            beneficio: {
              activa: true,
              OR: [{ fechaFin: null }, { fechaFin: { gte: new Date() } }]
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

const agregarPack = async (req, res) => {
  const { id } = req.params
  const { packId } = req.body
  if (!packId) return res.status(400).json({ error: 'packId requerido.' })

  try {
    const cotizacion = await prisma.cotizacion.findUnique({
      where: { id: Number(id) },
      include: { items: true, packs: true, ventaOrigen: true }
    })
    if (!cotizacion) return res.status(404).json({ error: 'Cotización no encontrada.' })
    if (cotizacion.ventaOrigen) return res.status(400).json({ error: 'Cotización ya fue convertida.' })

    const pack = await prisma.pack.findUnique({
      where: { id: Number(packId) },
      include: { unidades: { select: { unidadId: true } } }
    })
    if (!pack || !pack.activa) return res.status(404).json({ error: 'Pack no encontrado o inactivo.' })

    if (pack.tipo === 'COMBO_ESPECIFICO') {
      const unidadesEnPack = pack.unidades.map(u => u.unidadId)
      const unidadesEnCot = cotizacion.items.map(i => i.unidadId)
      const faltantes = unidadesEnPack.filter(uid => !unidadesEnCot.includes(uid))
      if (faltantes.length > 0) {
        return res.status(400).json({ error: 'La cotización no contiene todas las unidades requeridas por este pack.' })
      }
    } else if (pack.tipo === 'POR_CANTIDAD') {
      if (cotizacion.items.length < pack.minUnidades) {
        return res.status(400).json({ error: `Este pack requiere al menos ${pack.minUnidades} unidades en la cotización.` })
      }
    }

    if (cotizacion.packs.find(p => p.packId === Number(packId))) {
      return res.status(400).json({ error: 'Pack ya aplicado a esta cotización.' })
    }

    await prisma.cotizacionPack.create({
      data: {
        cotizacionId: Number(id),
        packId: Number(packId),
        descuentoAplicadoUF: pack.descuentoUF
      }
    })

    const actualizada = await prisma.cotizacion.findUnique({ where: { id: Number(id) }, include: INCLUDE_COMPLETO })
    res.json({ ...actualizada, ...calcularTotales(actualizada) })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al agregar pack.' })
  }
}

const quitarPack = async (req, res) => {
  const { id, packId } = req.params
  try {
    await prisma.cotizacionPack.deleteMany({
      where: { cotizacionId: Number(id), packId: Number(packId) }
    })
    const actualizada = await prisma.cotizacion.findUnique({ where: { id: Number(id) }, include: INCLUDE_COMPLETO })
    if (!actualizada) return res.status(404).json({ error: 'Cotización no encontrada.' })
    res.json({ ...actualizada, ...calcularTotales(actualizada) })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al quitar pack.' })
  }
}

const agregarBeneficio = async (req, res) => {
  const { id } = req.params
  const { beneficioId } = req.body
  if (!beneficioId) return res.status(400).json({ error: 'beneficioId requerido.' })

  try {
    const cotizacion = await prisma.cotizacion.findUnique({
      where: { id: Number(id) },
      include: { beneficios: true }
    })
    if (!cotizacion) return res.status(404).json({ error: 'Cotización no encontrada.' })
    if (cotizacion.beneficios.find(b => b.beneficioId === Number(beneficioId))) {
      return res.status(400).json({ error: 'Beneficio ya aplicado a esta cotización.' })
    }

    await prisma.cotizacionBeneficio.create({
      data: { cotizacionId: Number(id), beneficioId: Number(beneficioId) }
    })

    const actualizada = await prisma.cotizacion.findUnique({ where: { id: Number(id) }, include: INCLUDE_COMPLETO })
    res.json({ ...actualizada, ...calcularTotales(actualizada) })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al agregar beneficio.' })
  }
}

const quitarBeneficio = async (req, res) => {
  const { id, beneficioId } = req.params
  try {
    await prisma.cotizacionBeneficio.deleteMany({
      where: { cotizacionId: Number(id), beneficioId: Number(beneficioId) }
    })
    const actualizada = await prisma.cotizacion.findUnique({ where: { id: Number(id) }, include: INCLUDE_COMPLETO })
    if (!actualizada) return res.status(404).json({ error: 'Cotización no encontrada.' })
    res.json({ ...actualizada, ...calcularTotales(actualizada) })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al quitar beneficio.' })
  }
}

const convertir = async (req, res) => {
  const { id } = req.params

  try {
    const cotizacion = await prisma.cotizacion.findUnique({
      where: { id: Number(id) },
      include: {
        items: { include: { unidad: true } },
        packs: true,
        beneficios: true,
        lead: { select: { id: true, vendedorId: true, brokerId: true, contactoId: true } },
        ventaOrigen: true
      }
    })

    if (!cotizacion) return res.status(404).json({ error: 'Cotización no encontrada.' })
    if (cotizacion.ventaOrigen) return res.status(400).json({ error: 'Esta cotización ya fue convertida en venta.' })
    if (cotizacion.estado === 'RECHAZADA') return res.status(400).json({ error: 'No se puede convertir una cotización rechazada.' })
    if (cotizacion.items.length === 0) return res.status(400).json({ error: 'La cotización no tiene unidades.' })

    const unidadesNoDisponibles = cotizacion.items.filter(i => i.unidad.estado !== 'DISPONIBLE' || i.unidad.ventaId !== null)
    if (unidadesNoDisponibles.length > 0) {
      const nums = unidadesNoDisponibles.map(i => i.unidad.numero).join(', ')
      return res.status(400).json({ error: `Las siguientes unidades ya no están disponibles: ${nums}` })
    }

    const precioListaUF = cotizacion.items.reduce((s, i) => s + i.precioListaUF, 0)
    const descuentoPacksUF = cotizacion.packs.reduce((s, p) => s + p.descuentoAplicadoUF, 0)
    const descuentoAprobadoUF = cotizacion.descuentoAprobadoUF || 0
    const precioFinalUF = Math.max(precioListaUF - descuentoPacksUF - descuentoAprobadoUF, 0)

    const gerentes = await prisma.usuario.findMany({ where: { rol: 'GERENTE', activo: true }, select: { id: true } })
    const gerenteId = gerentes[0]?.id || null

    const venta = await prisma.$transaction(async (tx) => {
      const nuevaVenta = await tx.venta.create({
        data: {
          leadId: cotizacion.lead.id,
          compradorId: cotizacion.lead.contactoId,
          vendedorId: cotizacion.lead.vendedorId || null,
          brokerId: cotizacion.lead.brokerId || null,
          gerenteId,
          cotizacionOrigenId: cotizacion.id,
          precioListaUF,
          descuentoPacksUF,
          descuentoAprobadoUF,
          precioFinalUF,
          estado: 'RESERVA',
          fechaReserva: new Date()
        }
      })

      for (const item of cotizacion.items) {
        await tx.unidad.update({
          where: { id: item.unidadId },
          data: { ventaId: nuevaVenta.id, estado: 'RESERVADO' }
        })
      }

      for (const cb of cotizacion.beneficios) {
        await tx.ventaBeneficio.create({
          data: { ventaId: nuevaVenta.id, beneficioId: cb.beneficioId }
        })
      }

      await tx.cotizacion.update({ where: { id: cotizacion.id }, data: { estado: 'ACEPTADA' } })
      await tx.lead.update({ where: { id: cotizacion.lead.id }, data: { etapa: 'RESERVA' } })

      const hoy = new Date()
      await tx.procesoLegal.create({
        data: {
          ventaId: nuevaVenta.id,
          tienePromesa: false,
          estadoActual: 'ESCRITURA_LISTA',
          fechaLimiteEscritura: hoy,
          fechaLimiteFirmaNot: hoy,
          fechaLimiteCBR: hoy,
          fechaLimiteEntrega: hoy
        }
      })

      return nuevaVenta
    })

    await calcularComisiones(venta.id, precioFinalUF, cotizacion.lead)

    const ventaCompleta = await prisma.venta.findUnique({
      where: { id: venta.id },
      include: {
        comprador: true,
        unidades: { include: { edificio: true } },
        beneficios: { include: { beneficio: true } },
        procesoLegal: true,
        comisiones: true
      }
    })

    res.status(201).json(ventaCompleta)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al convertir cotización.' })
  }
}

async function calcularComisiones(ventaId, precioFinalUF, lead) {
  const venta = await prisma.venta.findUnique({
    where: { id: ventaId },
    select: { vendedorId: true, brokerId: true, gerenteId: true }
  })

  const comisionesACrear = []

  if (venta.vendedorId) {
    const vendedor = await prisma.usuario.findUnique({ where: { id: venta.vendedorId }, select: { comisionPorcentaje: true } })
    if (vendedor?.comisionPorcentaje) {
      const total = (precioFinalUF * vendedor.comisionPorcentaje) / 100
      comisionesACrear.push({ ventaId, usuarioId: venta.vendedorId, concepto: 'Vendedor', porcentaje: vendedor.comisionPorcentaje, montoCalculadoUF: total, montoPrimera: total / 2, montoSegunda: total / 2 })
    }
  }

  if (venta.brokerId) {
    const broker = await prisma.usuario.findUnique({ where: { id: venta.brokerId }, select: { comisionPorcentaje: true } })
    if (broker?.comisionPorcentaje) {
      const total = (precioFinalUF * broker.comisionPorcentaje) / 100
      comisionesACrear.push({ ventaId, usuarioId: venta.brokerId, concepto: 'Broker', porcentaje: broker.comisionPorcentaje, montoCalculadoUF: total, montoPrimera: total / 2, montoSegunda: total / 2 })
    }
  }

  const jefes = await prisma.usuario.findMany({ where: { rol: 'JEFE_VENTAS', activo: true }, select: { id: true, comisionPorcentaje: true } })
  for (const jefe of jefes) {
    const pct = jefe.id === venta.vendedorId ? (jefe.comisionPorcentaje || 4) : 1
    const total = (precioFinalUF * pct) / 100
    comisionesACrear.push({ ventaId, usuarioId: jefe.id, concepto: 'Jefe de Ventas', porcentaje: pct, montoCalculadoUF: total, montoPrimera: total / 2, montoSegunda: total / 2 })
  }

  if (comisionesACrear.length > 0) {
    await prisma.comision.createMany({ data: comisionesACrear })
  }
}

module.exports = { listar, obtener, crear, actualizar, cambiarEstado, eliminar, unidadesDisponibles, agregarPack, quitarPack, agregarBeneficio, quitarBeneficio, convertir }
