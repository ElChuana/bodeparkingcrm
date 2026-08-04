const prisma = require('../lib/prisma')
const { prorratearPrecioVenta } = require('../lib/precios')
const { aplicarReglasComision } = require('../lib/comisiones')

const listar = async (req, res) => {
  const { estado, vendedorId, edificioId, tipoUnidad, precioMin, precioMax, search, desde, hasta } = req.query
  const { rol, id: usuarioId } = req.usuario
  const esGerenciaOJV = ['GERENTE', 'JEFE_VENTAS'].includes(rol)

  // Broker y vendedor solo ven sus propias ventas
  const filtroRol = !esGerenciaOJV && rol !== 'ABOGADO'
    ? { OR: [{ vendedorId: usuarioId }, { brokerId: usuarioId }] }
    : {}

  try {
    const ventas = await prisma.venta.findMany({
      where: {
        ...filtroRol,
        ...(estado && { estado }),
        ...(esGerenciaOJV && vendedorId && { vendedorId: Number(vendedorId) }),
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
        // Último resumen legal (IA) para el semáforo de la lista Legal
        resumenesLegales: {
          take: 1, orderBy: { creadoEn: 'desc' },
          select: { resumen: true, semaforo: true, proximaAccion: true, creadoEn: true }
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
  const { rol, id: usuarioId } = req.usuario
  const esGerenciaOJV = ['GERENTE', 'JEFE_VENTAS'].includes(rol)
  // Vendedor/broker solo acceden a sus propias ventas (evita IDOR)
  const filtroRol = !esGerenciaOJV && rol !== 'ABOGADO'
    ? { OR: [{ vendedorId: usuarioId }, { brokerId: usuarioId }] }
    : {}
  try {
    const venta = await prisma.venta.findFirst({
      where: { id: Number(id), ...filtroRol },
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
        procesoLegal: {
          include: {
            documentos: { orderBy: { creadoEn: 'desc' } },
            historial: {
              include: { usuario: { select: { nombre: true, apellido: true } } },
              orderBy: { creadoEn: 'desc' }
            }
          }
        },
        // Historial completo de resúmenes legales (IA), más reciente primero
        resumenesLegales: { orderBy: { creadoEn: 'desc' } },
        comisiones: { include: { usuario: { select: { nombre: true, apellido: true, rol: true } } } },
        beneficios: { include: { beneficio: true } },
        // Promociones aplicadas (vienen de la cotización); las de categoría BENEFICIO se muestran como beneficios
        promociones: { include: { promocion: true } },
        postventa: { orderBy: { fechaApertura: 'desc' } }
      }
    })
    if (!venta) return res.status(404).json({ error: 'Venta no encontrada.' })

    // Ocultar precios sensibles de las unidades a roles sin permiso
    if (!esGerenciaOJV && venta.unidades) {
      venta.unidades = venta.unidades.map(({ precioMinimoUF, precioCostoUF, precioVentaUF, ...u }) => u)
    }
    // Vendedor/broker solo ven sus propias comisiones, no las de terceros
    if (!esGerenciaOJV && rol !== 'ABOGADO' && venta.comisiones) {
      venta.comisiones = venta.comisiones.filter(c => c.usuarioId === usuarioId)
    }
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
    const actual = await prisma.venta.findUnique({
      where: { id: Number(id) },
      select: { fechaPromesa: true, fechaEscritura: true, fechaEntrega: true }
    })
    if (!actual) return res.status(404).json({ error: 'Venta no encontrada.' })

    // Todos los cambios de estado (venta + unidades + lead + comisiones) van en
    // una transacción para no dejar estados parciales si algo falla.
    const venta = await prisma.$transaction(async (tx) => {
      const v = await tx.venta.update({
        where: { id: Number(id) },
        data: {
          estado,
          ...(fechaPromesa
            ? { fechaPromesa: new Date(fechaPromesa) }
            : (estado === 'PROMESA' && !actual.fechaPromesa ? { fechaPromesa: new Date() } : {})),
          ...(fechaEscritura
            ? { fechaEscritura: new Date(fechaEscritura) }
            : (estado === 'ESCRITURA' && !actual.fechaEscritura ? { fechaEscritura: new Date() } : {})),
          ...(fechaEntrega
            ? { fechaEntrega: new Date(fechaEntrega) }
            : (estado === 'ENTREGADO' && !actual.fechaEntrega ? { fechaEntrega: new Date() } : {})),
          ...(notas && { notas })
        }
      })

      if (estado === 'ENTREGADO') {
        await tx.unidad.updateMany({ where: { ventaId: Number(id) }, data: { estado: 'VENDIDO' } })
        await tx.lead.update({ where: { id: v.leadId }, data: { etapa: 'ENTREGA' } })
      } else if (estado === 'ANULADO') {
        await tx.unidad.updateMany({ where: { ventaId: Number(id) }, data: { estado: 'DISPONIBLE', ventaId: null, precioVentaUF: null } })
        // Una venta anulada no genera comisiones → eliminarlas (evita comisiones fantasma)
        await tx.comision.deleteMany({ where: { ventaId: Number(id) } })
        await tx.lead.update({ where: { id: v.leadId }, data: { etapa: 'PERDIDO', motivoPerdida: 'Venta anulada' } })
      } else if (estado === 'PROMESA') {
        // No pisar tramos ya PAGADOS al volver/entrar a PROMESA
        await tx.comision.updateMany({ where: { ventaId: Number(id), estadoPrimera: { not: 'PAGADO' } }, data: { estadoPrimera: 'PENDIENTE' } })
        await tx.lead.update({ where: { id: v.leadId }, data: { etapa: 'PROMESA' } })
      } else if (estado === 'ESCRITURA') {
        await tx.lead.update({ where: { id: v.leadId }, data: { etapa: 'ESCRITURA' } })
      }
      return v
    })

    if (estado === 'ESCRITURA') {
      // Notificar comisiones pendientes de escritura (efecto secundario, fuera de la transacción)
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

    // Si cambió el precio final, mantener la cuadratura: re-prorratear el precio
    // pactado de cada unidad y recalcular comisiones (salvo que ya haya pagos).
    if (precioFinalUF !== undefined) {
      const unidades = await prisma.unidad.findMany({ where: { ventaId: Number(id) }, select: { id: true, precioUF: true } })
      if (unidades.length > 0) {
        const reparto = prorratearPrecioVenta(unidades.map(u => ({ unidadId: u.id, precioListaUF: u.precioUF })), Number(precioFinalUF))
        await prisma.$transaction(reparto.map(r =>
          prisma.unidad.update({ where: { id: r.unidadId }, data: { precioVentaUF: r.precioVentaUF } })
        ))
      }
      // No pisar comisiones si algún tramo ya fue pagado
      const pagadas = await prisma.comision.count({
        where: { ventaId: Number(id), OR: [{ estadoPrimera: 'PAGADO' }, { estadoSegunda: 'PAGADO' }] }
      })
      if (pagadas === 0) {
        await prisma.comision.deleteMany({ where: { ventaId: Number(id) } })
        await aplicarReglasComision(Number(id))
      }
    }
    res.json(actualizada)
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Venta no encontrada.' })
    res.status(500).json({ error: 'Error al editar venta.' })
  }
}

module.exports = { listar, obtener, actualizarEstado, editar }
