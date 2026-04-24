const prisma = require('../lib/prisma')

const listar = async (req, res) => {
  const { estado, vendedorId, edificioId, tipoUnidad, precioMin, precioMax, search, desde, hasta } = req.query
  try {
    const ventas = await prisma.venta.findMany({
      where: {
        ...(estado && { estado }),
        ...(vendedorId && { vendedorId: Number(vendedorId) }),
        ...(desde || hasta ? { creadoEn: { ...(desde && { gte: new Date(desde) }), ...(hasta && { lte: new Date(hasta) }) } } : {}),
        ...(edificioId && { unidades: { some: { edificioId: Number(edificioId) } } }),
        ...(tipoUnidad && { unidades: { some: { tipo: tipoUnidad } } }),
        ...(precioMin && { precioFinalUF: { gte: Number(precioMin) } }),
        ...(precioMax && { precioFinalUF: { lte: Number(precioMax) } }),
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
          select: { numero: true, tipo: true, edificio: { select: { nombre: true, region: true } } }
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
        cotizacionOrigen: {
          select: {
            id: true,
            estado: true,
            descuentoAprobadoUF: true,
            packs: {
              select: {
                descuentoAplicadoUF: true,
                pack: { select: { nombre: true, descripcion: true } }
              }
            }
          }
        },
        planPago: { include: { cuotas: { orderBy: { numeroCuota: 'asc' } } } },
        procesoLegal: { include: { documentos: { orderBy: { creadoEn: 'desc' } } } },
        comisiones: { include: { usuario: { select: { nombre: true, apellido: true, rol: true } } } },
        beneficios: { include: { beneficio: true } },
        postventa: { orderBy: { fechaApertura: 'desc' } }
      }
    })
    if (!venta) return res.status(404).json({ error: 'Venta no encontrada.' })
    res.json(venta)
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener venta.' })
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

    if (estado === 'ENTREGADO') {
      await prisma.unidad.updateMany({ where: { ventaId: Number(id) }, data: { estado: 'VENDIDO' } })
      await prisma.lead.update({ where: { id: venta.leadId }, data: { etapa: 'ENTREGA' } })
    } else if (estado === 'ANULADO') {
      await prisma.unidad.updateMany({ where: { ventaId: Number(id) }, data: { estado: 'DISPONIBLE', ventaId: null } })
      await prisma.lead.update({ where: { id: venta.leadId }, data: { etapa: 'PERDIDO', motivoPerdida: 'Venta anulada' } })
    } else if (estado === 'PROMESA') {
      await prisma.comision.updateMany({ where: { ventaId: Number(id) }, data: { estadoPrimera: 'PENDIENTE' } })
      await prisma.lead.update({ where: { id: venta.leadId }, data: { etapa: 'PROMESA' } })
    } else if (estado === 'ESCRITURA') {
      await prisma.lead.update({ where: { id: venta.leadId }, data: { etapa: 'ESCRITURA' } })

      // Notificar comisiones pendientes de escritura
      const comisionesPendientes = await prisma.comision.findMany({
        where: { ventaId: Number(id), estadoSegunda: { not: 'PAGADO' } },
        select: { id: true }
      })
      if (comisionesPendientes.length > 0) {
        const destinatarios = await prisma.usuario.findMany({
          where: { activo: true, rol: { in: ['GERENTE', 'JEFE_VENTAS'] } },
          select: { id: true }
        })
        if (destinatarios.length > 0) {
          await prisma.notificacion.createMany({
            data: destinatarios.map(u => ({
              usuarioId: u.id,
              tipo: 'COMISION_ESCRITURA',
              mensaje: `Venta #${id} llegó a escritura. ${comisionesPendientes.length} comisión(es) pendiente(s) de pago.`,
              referenciaId: Number(id),
              referenciaTipo: 'venta'
            })),
            skipDuplicates: true
          })
        }
      }
    }

    res.json(venta)
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Venta no encontrada.' })
    res.status(500).json({ error: 'Error al actualizar estado de venta.' })
  }
}

const editar = async (req, res) => {
  const { id } = req.params
  const { precioListaUF, descuentoPacksUF, descuentoAprobadoUF, precioFinalUF, fechaReserva, notas } = req.body

  try {
    const venta = await prisma.venta.findUnique({
      where: { id: Number(id) },
      select: { estado: true }
    })
    if (!venta) return res.status(404).json({ error: 'Venta no encontrada.' })
    if (venta.estado === 'ENTREGADO') {
      return res.status(400).json({ error: 'No se puede editar una venta ya entregada.' })
    }

    const actualizada = await prisma.venta.update({
      where: { id: Number(id) },
      data: {
        ...(precioListaUF !== undefined && { precioListaUF: Number(precioListaUF) }),
        ...(descuentoPacksUF !== undefined && { descuentoPacksUF: Number(descuentoPacksUF) }),
        ...(descuentoAprobadoUF !== undefined && { descuentoAprobadoUF: Number(descuentoAprobadoUF) }),
        ...(precioFinalUF !== undefined && { precioFinalUF: Number(precioFinalUF) }),
        ...(fechaReserva !== undefined && { fechaReserva: fechaReserva ? new Date(fechaReserva) : null }),
        ...(notas !== undefined && { notas }),
      }
    })
    res.json(actualizada)
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Venta no encontrada.' })
    res.status(500).json({ error: 'Error al editar venta.' })
  }
}

module.exports = { listar, obtener, actualizarEstado, editar }
