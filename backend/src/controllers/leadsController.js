const prisma = require('../lib/prisma')

// Búsqueda por nombre, apellido, email o teléfono (case-insensitive)
const buscarContactoIds = async (search) => {
  const term = `%${search}%`
  const rows = await prisma.$queryRaw`
    SELECT id FROM "contactos"
    WHERE lower(nombre)  LIKE lower(${term})
       OR lower(apellido) LIKE lower(${term})
       OR lower(email) LIKE lower(${term})
       OR telefono LIKE ${term}
  `
  return rows.map(r => r.id)
}

// Etapas en orden para el pipeline
const ORDEN_ETAPAS = [
  'NUEVO', 'NO_CONTESTA', 'SEGUIMIENTO', 'COTIZACION_ENVIADA',
  'VISITA_AGENDADA', 'VISITA_REALIZADA', 'SEGUIMIENTO_POST_VISITA',
  'NEGOCIACION', 'RESERVA', 'PROMESA', 'ESCRITURA', 'ENTREGA', 'POSTVENTA', 'PERDIDO'
]

const ETAPA_LABEL = {
  NUEVO: 'Nuevo', NO_CONTESTA: 'No contesta', SEGUIMIENTO: 'Seguimiento',
  COTIZACION_ENVIADA: 'Cotización enviada', VISITA_AGENDADA: 'Visita agendada',
  VISITA_REALIZADA: 'Visita realizada', SEGUIMIENTO_POST_VISITA: 'Seguimiento post visita',
  NEGOCIACION: 'Negociación', RESERVA: 'Reserva', PROMESA: 'Promesa',
  ESCRITURA: 'Escritura', ENTREGA: 'Entrega', POSTVENTA: 'Postventa', PERDIDO: 'Perdido'
}

async function notificarLead({ leadId, mensaje, tipo, excluirUsuarioId }) {
  try {
    const destinatarios = await prisma.usuario.findMany({
      where: {
        notificacionesActivas: true,
        activo: true,
        OR: [
          { rol: 'GERENTE' },
          { rol: 'JEFE_VENTAS' },
          { leadsAsignados: { some: { id: leadId } } }
        ],
        ...(excluirUsuarioId ? { id: { not: excluirUsuarioId } } : {})
      },
      select: { id: true }
    })
    if (!destinatarios.length) return
    await prisma.notificacion.createMany({
      data: destinatarios.map(u => ({
        usuarioId: u.id,
        tipo,
        mensaje,
        referenciaId: leadId,
        referenciaTipo: 'lead'
      })),
      skipDuplicates: true
    })
  } catch (err) {
    console.error('[notificarLead]', err.message)
  }
}

// Filtro de acceso según rol
const filtroAcceso = (usuario) => {
  if (['GERENTE', 'JEFE_VENTAS', 'ABOGADO'].includes(usuario.rol)) return {}
  // Vendedor y Broker solo ven sus propios leads
  return {
    OR: [
      { vendedorId: usuario.id },
      { brokerId: usuario.id }
    ]
  }
}

const listar = async (req, res) => {
  const { etapa, vendedorId, brokerId, edificioId, origen, tipoUnidad, search, desde, hasta, sinActividad, campana } = req.query
  try {
    const contactoIds = search ? await buscarContactoIds(search) : null

    const leads = await prisma.lead.findMany({
      where: {
        ...filtroAcceso(req.usuario),
        ...(etapa && { etapa }),
        ...(vendedorId && { vendedorId: Number(vendedorId) }),
        ...(brokerId && { brokerId: Number(brokerId) }),
        ...(desde || hasta ? {
          creadoEn: {
            ...(desde && { gte: new Date(desde) }),
            ...(hasta && { lte: new Date(hasta) })
          }
        } : {}),
        ...(edificioId && { unidadInteres: { edificioId: Number(edificioId) } }),
        ...(tipoUnidad && { unidadInteres: { tipo: tipoUnidad } }),
        ...(origen && { contacto: { origen } }),
        ...(sinActividad && {
          actualizadoEn: { lt: new Date(Date.now() - Number(sinActividad) * 86400000) }
        }),
        ...(campana && { campana: { contains: campana, mode: 'insensitive' } }),
        ...(contactoIds && { contactoId: { in: contactoIds } }),
      },
      include: {
        contacto: { select: { id: true, nombre: true, apellido: true, email: true, telefono: true, origen: true } },
        vendedor: { select: { id: true, nombre: true, apellido: true } },
        broker: { select: { id: true, nombre: true, apellido: true } },
        unidadInteres: {
          select: {
            id: true, numero: true, tipo: true,
            edificio: { select: { nombre: true, region: true } }
          }
        },
        _count: { select: { visitas: true, interacciones: true } }
      },
      orderBy: { actualizadoEn: 'desc' }
    })
    res.json(leads)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al obtener leads.' })
  }
}

// Vista Kanban: leads agrupados por etapa
const kanban = async (req, res) => {
  const { vendedorId, brokerId, edificioId, origen, tipoUnidad, search, desde, hasta, modificadoDesde, modificadoHasta, campana } = req.query
  try {
    const contactoIds = search ? await buscarContactoIds(search) : null

    const leads = await prisma.lead.findMany({
      where: {
        ...filtroAcceso(req.usuario),
        etapa: { notIn: ['PERDIDO'] },
        ...(vendedorId && { vendedorId: Number(vendedorId) }),
        ...(brokerId && { brokerId: Number(brokerId) }),
        ...(edificioId && { unidadInteres: { edificioId: Number(edificioId) } }),
        ...(tipoUnidad && { unidadInteres: { tipo: tipoUnidad } }),
        ...(origen && { contacto: { origen } }),
        ...(desde || hasta ? { creadoEn: { ...(desde && { gte: new Date(desde) }), ...(hasta && { lte: new Date(hasta) }) } } : {}),
        ...(modificadoDesde || modificadoHasta ? {
          actualizadoEn: {
            ...(modificadoDesde && { gte: new Date(modificadoDesde) }),
            ...(modificadoHasta && { lte: new Date(modificadoHasta) })
          }
        } : {}),
        ...(campana && { campana: { contains: campana, mode: 'insensitive' } }),
        ...(contactoIds && { contactoId: { in: contactoIds } }),
      },
      include: {
        contacto: { select: { nombre: true, apellido: true, telefono: true } },
        vendedor: { select: { nombre: true, apellido: true } },
        unidadInteres: {
          select: { numero: true, tipo: true, edificio: { select: { nombre: true } } }
        }
      },
      orderBy: { actualizadoEn: 'desc' }
    })

    // Agrupar por etapa
    const agrupado = {}
    ORDEN_ETAPAS.filter(e => e !== 'PERDIDO').forEach(etapa => { agrupado[etapa] = [] })
    leads.forEach(lead => {
      if (agrupado[lead.etapa]) agrupado[lead.etapa].push(lead)
    })

    // Limitar a 100 por columna y devolver total real
    const resultado = {}
    for (const [etapa, col] of Object.entries(agrupado)) {
      resultado[etapa] = { leads: col.slice(0, 100), total: col.length }
    }

    res.json(resultado)
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener kanban.' })
  }
}

// Vista Kanban por vendedor
const kanbanPorVendedor = async (req, res) => {
  if (!['GERENTE', 'JEFE_VENTAS'].includes(req.usuario.rol)) {
    return res.status(403).json({ error: 'Sin permiso.' })
  }
  try {
    const vendedores = await prisma.usuario.findMany({
      where: { activo: true, rol: { in: ['VENDEDOR', 'BROKER_EXTERNO', 'JEFE_VENTAS'] } },
      select: { id: true, nombre: true, apellido: true, rol: true }
    })

    const resultado = await Promise.all(vendedores.map(async (v) => {
      const leads = await prisma.lead.findMany({
        where: { vendedorId: v.id, etapa: { notIn: ['PERDIDO'] } },
        include: {
          contacto: { select: { nombre: true, apellido: true } },
          unidadInteres: {
            select: { numero: true, tipo: true, edificio: { select: { nombre: true } } }
          }
        },
        orderBy: { actualizadoEn: 'desc' }
      })
      return { vendedor: v, leads, total: leads.length }
    }))

    res.json(resultado)
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener kanban por vendedor.' })
  }
}

const obtener = async (req, res) => {
  const { id } = req.params
  try {
    const lead = await prisma.lead.findFirst({
      where: { id: Number(id), ...filtroAcceso(req.usuario) },
      include: {
        contacto: true,
        vendedor: { select: { id: true, nombre: true, apellido: true, email: true } },
        broker: { select: { id: true, nombre: true, apellido: true } },
        unidadInteres: { include: { edificio: true } },
        visitas: {
          orderBy: { fechaHora: 'desc' },
          include: { vendedor: { select: { id: true, nombre: true, apellido: true } }, edificio: { select: { nombre: true } } }
        },
        interacciones: {
          orderBy: { fecha: 'desc' },
          include: { usuario: { select: { id: true, nombre: true, apellido: true } } }
        },
        venta: { select: { id: true, estado: true } }
      }
    })
    if (!lead) return res.status(404).json({ error: 'Lead no encontrado.' })
    res.json(lead)
  } catch (err) {
    console.error('[obtener lead]', err)
    res.status(500).json({ error: 'Error al obtener lead.' })
  }
}

const crear = async (req, res) => {
  const { contactoId, unidadInteresId, vendedorId, brokerId, presupuestoAprox, notas, campana } = req.body

  // Si es vendedor o broker, se asigna a sí mismo automáticamente
  let asignadoVendedorId = vendedorId
  if (['VENDEDOR', 'BROKER_EXTERNO'].includes(req.usuario.rol)) {
    asignadoVendedorId = req.usuario.id
  }

  if (!contactoId) return res.status(400).json({ error: 'El contacto es requerido.' })

  try {
    const lead = await prisma.lead.create({
      data: {
        contactoId: Number(contactoId),
        unidadInteresId: unidadInteresId ? Number(unidadInteresId) : null,
        vendedorId: asignadoVendedorId ? Number(asignadoVendedorId) : null,
        brokerId: brokerId ? Number(brokerId) : null,
        presupuestoAprox: presupuestoAprox ? Number(presupuestoAprox) : null,
        notas,
        campana: campana || null,
        etapa: 'NUEVO'
      },
      include: {
        contacto: { select: { nombre: true, apellido: true, email: true, telefono: true } },
        vendedor: { select: { nombre: true, apellido: true } }
      }
    })

    // Log de creación
    await prisma.interaccion.create({
      data: {
        leadId: lead.id,
        usuarioId: req.usuario.id,
        tipo: 'NOTA',
        descripcion: 'Lead creado en el sistema.'
      }
    })

    res.status(201).json(lead)
    notificarLead({
      leadId: lead.id,
      mensaje: `Nuevo lead: ${lead.contacto.nombre} ${lead.contacto.apellido}`,
      tipo: 'LEAD_NUEVO',
      excluirUsuarioId: req.usuario.id
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al crear lead.' })
  }
}

const actualizar = async (req, res) => {
  const { id } = req.params
  const { unidadInteresId, vendedorId, brokerId, presupuestoAprox, notas, campana } = req.body

  try {
    const lead = await prisma.lead.update({
      where: { id: Number(id) },
      data: {
        unidadInteresId: unidadInteresId ? Number(unidadInteresId) : undefined,
        vendedorId: vendedorId ? Number(vendedorId) : undefined,
        brokerId: brokerId !== undefined ? (brokerId ? Number(brokerId) : null) : undefined,
        presupuestoAprox: presupuestoAprox ? Number(presupuestoAprox) : undefined,
        notas,
        campana: campana !== undefined ? (campana || null) : undefined,
      }
    })
    res.json(lead)
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Lead no encontrado.' })
    res.status(500).json({ error: 'Error al actualizar lead.' })
  }
}

const cambiarEtapa = async (req, res) => {
  const { id } = req.params
  const { etapa, motivoPerdida } = req.body

  if (!ORDEN_ETAPAS.includes(etapa)) {
    return res.status(400).json({ error: 'Etapa inválida.' })
  }

  if (etapa === 'PERDIDO' && !motivoPerdida) {
    return res.status(400).json({ error: 'Debe indicar el motivo de pérdida.' })
  }

  try {
    const lead = await prisma.lead.findFirst({
      where: { id: Number(id), ...filtroAcceso(req.usuario) },
      include: { contacto: { select: { nombre: true, apellido: true } } }
    })
    if (!lead) return res.status(404).json({ error: 'Lead no encontrado.' })

    const etapaAnterior = lead.etapa

    const actualizado = await prisma.lead.update({
      where: { id: Number(id) },
      data: { etapa, ...(motivoPerdida && { motivoPerdida }) }
    })

    // Log del cambio de etapa
    await prisma.interaccion.create({
      data: {
        leadId: Number(id),
        usuarioId: req.usuario.id,
        tipo: 'NOTA',
        descripcion: `Etapa cambiada: ${etapaAnterior} → ${etapa}${motivoPerdida ? `. Motivo: ${motivoPerdida}` : ''}`
      }
    })

    res.json(actualizado)
    notificarLead({
      leadId: Number(id),
      mensaje: `Lead ${lead.contacto ? lead.contacto.nombre + ' ' + lead.contacto.apellido : '#' + id} → ${ETAPA_LABEL[etapa] || etapa}`,
      tipo: 'LEAD_ETAPA_CAMBIO',
      excluirUsuarioId: req.usuario.id
    })
  } catch (err) {
    res.status(500).json({ error: 'Error al cambiar etapa.' })
  }
}

const asignarMasivo = async (req, res) => {
  const rolesPermitidos = ['GERENTE', 'JEFE_VENTAS']
  if (!rolesPermitidos.includes(req.usuario.rol)) {
    return res.status(403).json({ error: 'Acceso denegado.' })
  }

  const { leadIds, vendedorId, brokerId } = req.body

  if (!Array.isArray(leadIds) || leadIds.length === 0) {
    return res.status(400).json({ error: 'Se requiere al menos un lead.' })
  }
  if (!vendedorId && brokerId === undefined) {
    return res.status(400).json({ error: 'Debe asignar vendedor y/o broker.' })
  }

  try {
    const data = {}
    if (vendedorId) data.vendedorId = Number(vendedorId)
    if (brokerId !== undefined) data.brokerId = brokerId ? Number(brokerId) : null

    const { count } = await prisma.lead.updateMany({
      where: { id: { in: leadIds.map(Number) } },
      data
    })

    res.json({ actualizados: count })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al asignar leads.' })
  }
}

const eliminar = async (req, res) => {
  if (req.usuario.rol !== 'GERENTE') {
    return res.status(403).json({ error: 'Solo el gerente puede eliminar leads.' })
  }

  const { id } = req.params

  try {
    await prisma.$transaction(async (tx) => {
      // Eliminar en orden para respetar FKs
      await tx.interaccion.deleteMany({ where: { leadId: Number(id) } })
      await tx.visita.deleteMany({ where: { leadId: Number(id) } })

      const cotizaciones = await tx.cotizacion.findMany({ where: { leadId: Number(id) }, select: { id: true } })
      const cotizacionIds = cotizaciones.map(c => c.id)

      if (cotizacionIds.length > 0) {
        await tx.solicitudDescuento.deleteMany({ where: { cotizacionId: { in: cotizacionIds } } })
        await tx.cotizacionPromocion.deleteMany({ where: { cotizacionId: { in: cotizacionIds } } })
        await tx.cotizacionItem.deleteMany({ where: { cotizacionId: { in: cotizacionIds } } })
        await tx.cotizacion.deleteMany({ where: { leadId: Number(id) } })
      }

      await tx.lead.delete({ where: { id: Number(id) } })
    })

    res.json({ ok: true })
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Lead no encontrado.' })
    if (err.code === 'P2003') return res.status(409).json({ error: 'No se puede eliminar: el lead tiene una venta asociada.' })
    console.error('[eliminar lead]', err)
    res.status(500).json({ error: 'Error al eliminar lead.' })
  }
}

module.exports = { listar, kanban, kanbanPorVendedor, obtener, crear, actualizar, cambiarEtapa, asignarMasivo, eliminar }
