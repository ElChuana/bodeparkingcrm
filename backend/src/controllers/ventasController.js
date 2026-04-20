const prisma = require('../lib/prisma')

const listar = async (req, res) => {
  const { estado, vendedorId, edificioId, tipoUnidad, precioMin, precioMax, search, desde, hasta, conDescuento } = req.query
  try {
    const ventas = await prisma.venta.findMany({
      where: {
        ...(estado && { estado }),
        ...(vendedorId && { vendedorId: Number(vendedorId) }),
        ...(desde || hasta ? {
          creadoEn: {
            ...(desde && { gte: new Date(desde) }),
            ...(hasta && { lte: new Date(hasta) })
          }
        } : {}),
        ...(edificioId && { unidades: { some: { edificioId: Number(edificioId) } } }),
        ...(tipoUnidad && { unidades: { some: { tipo: tipoUnidad } } }),
        ...(precioMin && { precioUF: { gte: Number(precioMin) } }),
        ...(precioMax && { precioUF: { lte: Number(precioMax) } }),
        ...(conDescuento === 'true' && { descuentoUF: { gt: 0 } }),
        ...(search && {
          comprador: {
            OR: [
              { nombre: { contains: search, mode: 'insensitive' } },
              { apellido: { contains: search, mode: 'insensitive' } },
              { rut: { contains: search, mode: 'insensitive' } }
            ]
          }
        })
      },
      include: {
        comprador: { select: { nombre: true, apellido: true, rut: true, empresa: true } },
        vendedor: { select: { nombre: true, apellido: true } },
        broker: { select: { nombre: true, apellido: true } },
        unidades: {
          select: {
            numero: true, tipo: true,
            edificio: { select: { nombre: true, region: true } }
          }
        },
        planPago: { select: { totalCuotas: true } },
        procesoLegal: {
          select: {
            estadoActual: true, tienePromesa: true,
            fechaLimiteFirmaCliente: true, fechaLimiteFirmaInmob: true,
            fechaLimiteEscritura: true, fechaLimiteFirmaNot: true,
            fechaLimiteCBR: true, fechaLimiteEntrega: true,
          }
        },
        _count: { select: { comisiones: true } }
      },
      orderBy: { creadoEn: 'desc' }
    })
    res.json(ventas)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al obtener ventas.' })
  }
}

const obtener = async (req, res) => {
  const { id } = req.params
  try {
    const venta = await prisma.venta.findUnique({
      where: { id: Number(id) },
      include: {
        comprador: true,
        vendedor: { select: { id: true, nombre: true, apellido: true } },
        broker: { select: { id: true, nombre: true, apellido: true } },
        gerente: { select: { id: true, nombre: true, apellido: true } },
        unidades: { include: { edificio: true } },
        lead: { select: { id: true, etapa: true } },
        planPago: { include: { cuotas: { orderBy: { numeroCuota: 'asc' } } } },
        procesoLegal: { include: { documentos: { orderBy: { creadoEn: 'desc' } } } },
        comisiones: { include: { usuario: { select: { nombre: true, apellido: true, rol: true } } } },
        promociones: { include: { promocion: true, pagosArriendoAsegurado: true } },
        postventa: { orderBy: { fechaApertura: 'desc' } }
      }
    })
    if (!venta) return res.status(404).json({ error: 'Venta no encontrada.' })
    res.json(venta)
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener venta.' })
  }
}

const crear = async (req, res) => {
  const { leadId, unidadId, unidadIds, compradorId, brokerId, precioUF, descuentoUF, fechaReserva, notas, cotizacionOrigenId } = req.body
  // Normalizar: acepta unidadId (singular) o unidadIds (array)
  const idsUnidades = unidadIds
    ? (Array.isArray(unidadIds) ? unidadIds : [unidadIds]).map(Number)
    : unidadId ? [Number(unidadId)] : []

  if (!leadId || idsUnidades.length === 0 || !compradorId || !precioUF) {
    return res.status(400).json({ error: 'Lead, al menos una unidad, comprador y precio UF son requeridos.' })
  }


  try {
    // Validar precio mínimo si hay descuento
    if (descuentoUF) {
      const unidad = await prisma.unidad.findUnique({ where: { id: idsUnidades[0] } })

      if (!unidad) {
        return res.status(404).json({ error: 'Unidad no encontrada.' })
      }

      const precioFinal = Number(precioUF) - Number(descuentoUF)

      if (unidad.precioMinimoUF && precioFinal < unidad.precioMinimoUF) {
        // Crear notificación para el gerente y solicitar aprobación
        const gerentes = await prisma.usuario.findMany({
          where: { rol: 'GERENTE', activo: true }
        })
        for (const g of gerentes) {
          await prisma.notificacion.create({
            data: {
              usuarioId: g.id,
              tipo: 'DESCUENTO_PENDIENTE',
              mensaje: `Descuento bajo precio mínimo solicitado para unidad ${unidad.numero}. Precio final: ${precioFinal} UF (mínimo: ${unidad.precioMinimoUF} UF)`,
              referenciaId: Number(leadId),
              referenciaTipo: 'lead'
            }
          })
        }
        return res.status(202).json({
          mensaje: 'Descuento requiere aprobación del Gerente. Se ha enviado una notificación.',
          requiereAprobacion: true
        })
      }
    }

    const lead = await prisma.lead.findUnique({
      where: { id: Number(leadId) },
      select: { vendedorId: true, brokerId: true }
    })

    const gerentes = await prisma.usuario.findMany({
      where: { rol: 'GERENTE', activo: true },
      select: { id: true }
    })
    const gerenteId = gerentes[0]?.id

    const venta = await prisma.venta.create({
      data: {
        leadId: Number(leadId),
        compradorId: Number(compradorId),
        vendedorId: lead?.vendedorId || null,
        brokerId: brokerId ? Number(brokerId) : lead?.brokerId || null,
        gerenteId: gerenteId || null,
        cotizacionOrigenId: cotizacionOrigenId ? Number(cotizacionOrigenId) : null,
        precioUF: Number(precioUF),
        descuentoUF: descuentoUF ? Number(descuentoUF) : 0,
        estado: 'RESERVA',
        fechaReserva: fechaReserva ? new Date(fechaReserva) : new Date(),
        notas
      },
      include: {
        comprador: { select: { nombre: true, apellido: true } },
        unidades: { select: { numero: true, tipo: true, edificio: { select: { nombre: true } } } }
      }
    })

    // Vincular unidades a la venta y marcarlas como reservadas
    for (const uid of idsUnidades) {
      await prisma.unidad.update({ where: { id: uid }, data: { ventaId: venta.id, estado: 'RESERVADO' } })
    }

    // Actualizar etapa del lead
    await prisma.lead.update({ where: { id: Number(leadId) }, data: { etapa: 'RESERVA' } })

    // Crear proceso legal automáticamente
    const fechaBase = fechaReserva ? new Date(fechaReserva) : new Date()
    await prisma.procesoLegal.create({
      data: {
        ventaId: venta.id,
        tienePromesa: false,
        estadoActual: 'ESCRITURA_LISTA',
        fechaLimiteEscritura: fechaBase,
        fechaLimiteFirmaNot: fechaBase,
        fechaLimiteCBR: fechaBase,
        fechaLimiteEntrega: fechaBase
      }
    })

    // Calcular comisiones automáticamente
    await calcularComisiones(venta.id, Number(precioUF) - (Number(descuentoUF) || 0), lead)

    res.status(201).json(venta)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al crear venta.' })
  }
}

// Función interna para calcular comisiones
const calcularComisiones = async (ventaId, precioFinalUF, lead) => {
  const venta = await prisma.venta.findUnique({
    where: { id: ventaId },
    select: { vendedorId: true, brokerId: true, gerenteId: true }
  })

  const comisionesACrear = []

  // Comisión vendedor
  if (venta.vendedorId) {
    const vendedor = await prisma.usuario.findUnique({
      where: { id: venta.vendedorId },
      select: { comisionPorcentaje: true, comisionFijo: true }
    })
    if (vendedor?.comisionPorcentaje) {
      const total = (precioFinalUF * vendedor.comisionPorcentaje) / 100
      comisionesACrear.push({
        ventaId, usuarioId: venta.vendedorId,
        concepto: 'Vendedor',
        porcentaje: vendedor.comisionPorcentaje,
        montoCalculadoUF: total,
        montoPrimera: total / 2,
        montoSegunda: total / 2
      })
    }
  }

  // Comisión broker
  if (venta.brokerId) {
    const broker = await prisma.usuario.findUnique({
      where: { id: venta.brokerId },
      select: { comisionPorcentaje: true, comisionFijo: true }
    })
    if (broker?.comisionPorcentaje) {
      const total = (precioFinalUF * broker.comisionPorcentaje) / 100
      comisionesACrear.push({
        ventaId, usuarioId: venta.brokerId,
        concepto: 'Broker',
        porcentaje: broker.comisionPorcentaje,
        montoCalculadoUF: total,
        montoPrimera: total / 2,
        montoSegunda: total / 2
      })
    }
  }

  // Comisión Jefe de Ventas / Gerente (1% sobre toda venta del equipo)
  const jefes = await prisma.usuario.findMany({
    where: { rol: 'JEFE_VENTAS', activo: true },
    select: { id: true, comisionPorcentaje: true }
  })
  for (const jefe of jefes) {
    const esElVendedor = jefe.id === venta.vendedorId
    const pct = esElVendedor ? (jefe.comisionPorcentaje || 4) : 1
    const total = (precioFinalUF * pct) / 100
    comisionesACrear.push({
      ventaId, usuarioId: jefe.id,
      concepto: 'Jefe de Ventas',
      porcentaje: pct,
      montoCalculadoUF: total,
      montoPrimera: total / 2,
      montoSegunda: total / 2
    })
  }

  if (comisionesACrear.length > 0) {
    await prisma.comision.createMany({ data: comisionesACrear })
  }
}

const actualizarEstado = async (req, res) => {
  const { id } = req.params
  const { estado, fechaPromesa, fechaEscritura, fechaEntrega, notas } = req.body

  const estadosValidos = ['RESERVA', 'PROMESA', 'ESCRITURA', 'ENTREGADO', 'ANULADO']
  if (!estadosValidos.includes(estado)) {
    return res.status(400).json({ error: 'Estado inválido.' })
  }

  try {
    const venta = await prisma.venta.update({
      where: { id: Number(id) },
      data: {
        estado,
        ...(fechaPromesa && { fechaPromesa: new Date(fechaPromesa) }),
        ...(fechaEscritura && { fechaEscritura: new Date(fechaEscritura) }),
        ...(fechaEntrega && { fechaEntrega: new Date(fechaEntrega) }),
        ...(notas && { notas })
      }
    })

    // Actualizar estado de la unidad según estado de venta
    if (estado === 'ENTREGADO') {
      await prisma.unidad.updateMany({ where: { ventaId: Number(id) }, data: { estado: 'VENDIDO' } })
      await prisma.lead.update({ where: { id: venta.leadId }, data: { etapa: 'ENTREGA' } })
    } else if (estado === 'ANULADO') {
      await prisma.unidad.updateMany({ where: { ventaId: Number(id) }, data: { estado: 'DISPONIBLE', ventaId: null } })
      await prisma.lead.update({ where: { id: venta.leadId }, data: { etapa: 'PERDIDO', motivoPerdida: 'Venta anulada' } })
    }

    // Liberar 50% comisiones en promesa
    if (estado === 'PROMESA') {
      await prisma.comision.updateMany({
        where: { ventaId: Number(id) },
        data: { estadoPrimera: 'PENDIENTE' }
      })
      await prisma.lead.update({ where: { id: venta.leadId }, data: { etapa: 'PROMESA' } })
    }

    if (estado === 'ESCRITURA') {
      await prisma.lead.update({ where: { id: venta.leadId }, data: { etapa: 'ESCRITURA' } })
    }

    res.json(venta)
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Venta no encontrada.' })
    res.status(500).json({ error: 'Error al actualizar estado de venta.' })
  }
}

module.exports = { listar, obtener, crear, actualizarEstado }
