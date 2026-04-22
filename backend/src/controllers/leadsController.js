const prisma = require('../lib/prisma')
const { notificarLead } = require('../lib/notifications')

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

// Filtro de acceso según rol
const filtroAcceso = (usuario) => {
  if (['GERENTE', 'JEFE_VENTAS', 'ABOGADO'].includes(usuario.rol)) return {}

  const condiciones = [
    { vendedorId: usuario.id },
    { brokerId: usuario.id }
  ]

  if (usuario.campanasFiltro?.length > 0)
    condiciones.push({ campana: { in: usuario.campanasFiltro } })

  if (usuario.edificiosFiltro?.length > 0)
    condiciones.push({ unidadInteres: { edificioId: { in: usuario.edificiosFiltro } } })

  if (usuario.leadsIndividualesFiltro?.length > 0)
    condiciones.push({ id: { in: usuario.leadsIndividualesFiltro } })

  return { OR: condiciones }
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
        ventas: { select: { id: true, estado: true, unidades: { select: { numero: true, edificio: { select: { nombre: true } } } } } }
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
      mensaje: `Lead ${lead.contacto?.nombre || ''} ${lead.contacto?.apellido || ''}`.trim() + ` → ${ETAPA_LABEL[etapa] || etapa}`,
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
    if (err.code === 'P2003') return res.status(409).json({ error: 'No se puede eliminar: el lead tiene ventas o datos asociados que deben eliminarse primero.' })
    console.error('[eliminar lead]', err)
    res.status(500).json({ error: 'Error al eliminar lead.' })
  }
}

const listarCampanas = async (req, res) => {
  try {
    const leads = await prisma.lead.findMany({
      where: { campana: { not: null } },
      select: { campana: true },
      distinct: ['campana'],
      orderBy: { campana: 'asc' }
    })
    res.json(leads.map(l => l.campana))
  } catch (err) {
    console.error('[listarCampanas]', err)
    res.status(500).json({ error: 'Error al obtener campañas.' })
  }
}

// POST /api/leads/fusionar-duplicados — solo GERENTE
// Fusiona contactos y leads duplicados por número de teléfono
const fusionarDuplicados = async (req, res) => {
  if (req.usuario.rol !== 'GERENTE')
    return res.status(403).json({ error: 'Solo el gerente puede fusionar duplicados.' })

  const { confirmar = false } = req.body

  try {
    // 1. Encontrar teléfonos que aparecen en más de un contacto
    const contactosConTelefono = await prisma.contacto.findMany({
      where: { telefono: { not: null } },
      select: { id: true, nombre: true, apellido: true, email: true, telefono: true, creadoEn: true },
      orderBy: { creadoEn: 'asc' }
    })

    // Agrupar por teléfono normalizado
    const grupos = {}
    for (const c of contactosConTelefono) {
      const tel = c.telefono.replace(/\D/g, '')
      if (!tel) continue
      if (!grupos[tel]) grupos[tel] = []
      grupos[tel].push(c)
    }

    // Solo grupos con duplicados
    const duplicados = Object.entries(grupos)
      .filter(([, grupo]) => grupo.length > 1)
      .map(([tel, grupo]) => ({ telefono: tel, contactos: grupo }))

    if (duplicados.length === 0) {
      return res.json({ ok: true, mensaje: 'No se encontraron duplicados por teléfono.', fusionados: 0 })
    }

    if (!confirmar) {
      // Modo preview: describir qué se fusionaría
      const preview = await Promise.all(duplicados.map(async ({ telefono, contactos }) => {
        const ids = contactos.map(c => c.id)
        const leads = await prisma.lead.findMany({
          where: { contactoId: { in: ids } },
          select: { id: true, contactoId: true, etapa: true, campana: true, creadoEn: true,
            ventas: { select: { id: true } }, cotizaciones: { select: { id: true } } }
        })
        return { telefono, contactos, leads }
      }))
      return res.json({ ok: true, preview, mensaje: `${duplicados.length} grupo(s) de duplicados encontrados. Envía confirmar:true para fusionar.` })
    }

    // Modo fusión real
    let totalFusionados = 0
    const errores = []

    for (const { contactos } of duplicados) {
      // Primario: el que tiene email, o el más antiguo
      const primario = contactos.find(c => c.email) || contactos[0]
      const secundarios = contactos.filter(c => c.id !== primario.id)

      try {
        await prisma.$transaction(async (tx) => {
          for (const sec of secundarios) {
            // Mover leads del secundario al primario
            const leadsSecundario = await tx.lead.findMany({
              where: { contactoId: sec.id },
              include: { ventas: true, cotizaciones: true, interacciones: true, visitas: true }
            })

            for (const leadSec of leadsSecundario) {
              // Ver si el primario ya tiene un lead activo
              const leadPrimario = await tx.lead.findFirst({
                where: { contactoId: primario.id, etapa: { notIn: ['PERDIDO'] } },
                include: { ventas: true }
              })

              if (leadPrimario) {
                // Fusionar: mover interacciones y cotizaciones al lead primario
                await tx.interaccion.updateMany({
                  where: { leadId: leadSec.id },
                  data: { leadId: leadPrimario.id }
                })
                await tx.visita.updateMany({
                  where: { leadId: leadSec.id },
                  data: { leadId: leadPrimario.id }
                })
                // Cotizaciones solo si el lead primario no tiene venta (para evitar conflictos)
                if (!leadPrimario.ventas?.length) {
                  await tx.cotizacion.updateMany({
                    where: { leadId: leadSec.id },
                    data: { leadId: leadPrimario.id }
                  })
                }
                // Fusionar comuroData
                if (leadSec.comuroData) {
                  const dataActual = (leadPrimario.comuroData && typeof leadPrimario.comuroData === 'object') ? leadPrimario.comuroData : {}
                  await tx.lead.update({
                    where: { id: leadPrimario.id },
                    data: {
                      comuroData: { ...leadSec.comuroData, ...dataActual },
                      ...(leadSec.comuroUuid && !leadPrimario.comuroUuid && { comuroUuid: leadSec.comuroUuid }),
                      ...(leadSec.comuroThreadId && !leadPrimario.comuroThreadId && { comuroThreadId: leadSec.comuroThreadId }),
                    }
                  })
                }
                // Marcar el lead secundario como perdido
                await tx.lead.update({
                  where: { id: leadSec.id },
                  data: { etapa: 'PERDIDO', motivoPerdida: `Fusionado con lead #${leadPrimario.id} por duplicado de teléfono` }
                })
              } else {
                // No hay lead activo en primario: reasignar este lead
                await tx.lead.update({
                  where: { id: leadSec.id },
                  data: { contactoId: primario.id }
                })
              }
            }

            // Mover ventas (comprador) del contacto secundario al primario
            await tx.venta.updateMany({
              where: { compradorId: sec.id },
              data: { compradorId: primario.id }
            })
            // Mover arriendos
            await tx.arriendo.updateMany({
              where: { contactoId: sec.id },
              data: { contactoId: primario.id }
            })

            // Actualizar datos del primario si le falta info
            const update = {}
            if (!primario.email    && sec.email)    update.email    = sec.email
            if (!primario.rut      && sec.rut)      update.rut      = sec.rut
            if (!primario.empresa  && sec.empresa)  update.empresa  = sec.empresa
            if (Object.keys(update).length > 0) {
              await tx.contacto.update({ where: { id: primario.id }, data: update })
              Object.assign(primario, update) // actualizar referencia local
            }

            // Eliminar contacto secundario
            await tx.contacto.delete({ where: { id: sec.id } })
          }
        })
        totalFusionados++
      } catch (err) {
        errores.push({ telefono: primario.telefono, error: err.message })
      }
    }

    res.json({
      ok: true,
      fusionados: totalFusionados,
      errores,
      mensaje: `${totalFusionados} grupo(s) fusionados.${errores.length > 0 ? ` ${errores.length} error(es).` : ''}`
    })
  } catch (err) {
    console.error('[fusionarDuplicados]', err)
    res.status(500).json({ error: 'Error al fusionar duplicados.' })
  }
}

module.exports = { listar, kanban, kanbanPorVendedor, obtener, crear, actualizar, cambiarEtapa, asignarMasivo, eliminar, listarCampanas, fusionarDuplicados }
