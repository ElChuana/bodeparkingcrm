const prisma = require('../lib/prisma')
const { notificarLead } = require('../lib/notifications')
const { vincularCampana } = require('../lib/campanas')
const { filtroAcceso } = require('../lib/acceso')

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
  'NUEVO', 'REACTIVADO', 'NO_CONTESTA', 'CONTACTO_INICIAL', 'RECONTACTO_2', 'RECONTACTO_3', 'RECONTACTO_4', 'COTIZACION_ENVIADA', 'INTERESADO',
  'VISITA_AGENDADA', 'VISITA_REALIZADA', 'SEGUIMIENTO_POST_VISITA',
  'NEGOCIACION', 'RESERVA', 'PROMESA', 'ESCRITURA', 'ENTREGA', 'POSTVENTA', 'PERDIDO'
]

const ETAPA_LABEL = {
  NUEVO: 'Nuevo', REACTIVADO: 'Reactivado', NO_CONTESTA: 'No contesta',
  CONTACTO_INICIAL: 'Contacto inicial', RECONTACTO_2: 'Recontacto 2', RECONTACTO_3: 'Recontacto 3', RECONTACTO_4: 'Recontacto 4',
  COTIZACION_ENVIADA: 'Cotización enviada', INTERESADO: 'Interesado',
  VISITA_AGENDADA: 'Visita agendada',
  VISITA_REALIZADA: 'Visita realizada', SEGUIMIENTO_POST_VISITA: 'Seguimiento post visita',
  NEGOCIACION: 'Negociación', RESERVA: 'Reserva', PROMESA: 'Promesa',
  ESCRITURA: 'Escritura', ENTREGA: 'Entrega', POSTVENTA: 'Postventa', PERDIDO: 'Perdido'
}

// Filtro de acceso según rol
const listar = async (req, res) => {
  const { etapa, vendedorId, edificioId, origen, tipoUnidad, search, desde, hasta, sinActividad, campana, sinAsignar } = req.query
  try {
    const contactoIds = search ? await buscarContactoIds(search) : null

    const leads = await prisma.lead.findMany({
      where: {
        ...filtroAcceso(req.usuario),
        ...(etapa && { etapa }),
        ...(vendedorId && { vendedorId: Number(vendedorId) }),
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
        ...(sinAsignar === 'true' && { vendedorId: null }),
      },
      include: {
        contacto: { select: { id: true, nombre: true, apellido: true, email: true, telefono: true, origen: true } },
        vendedor: { select: { id: true, nombre: true, apellido: true } },
        unidadInteres: {
          select: {
            id: true, numero: true, tipo: true,
            edificio: { select: { nombre: true, region: true } }
          }
        },
        // Última actividad registrada (ej. "qué dijo" del llamado rápido) para mostrarla en la lista
        actividades: {
          orderBy: { fecha: 'desc' }, take: 1,
          select: { tipo: true, resultado: true, descripcion: true, fecha: true }
        },
        _count: { select: { visitas: true, interacciones: true, actividades: true } }
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
  const { vendedorId, edificioId, origen, tipoUnidad, search, desde, hasta, modificadoDesde, modificadoHasta, campana } = req.query
  try {
    const contactoIds = search ? await buscarContactoIds(search) : null

    const leads = await prisma.lead.findMany({
      where: {
        ...filtroAcceso(req.usuario),
        etapa: { notIn: ['PERDIDO'] },
        ...(vendedorId && { vendedorId: Number(vendedorId) }),
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
        },
        _count: {
          select: {
            emailConversaciones: { where: { direction: 'RECIBIDO', leido: false } }
          }
        }
      },
      orderBy: { actualizadoEn: 'desc' }
    })

    // Agregar campo emailsNoLeidos para destacar cards en el kanban
    leads.forEach(l => {
      l.emailsNoLeidos = l._count?.emailConversaciones || 0
      delete l._count
    })

    // Agrupar por etapa
    const agrupado = {}
    ORDEN_ETAPAS.filter(e => e !== 'PERDIDO').forEach(etapa => { agrupado[etapa] = [] })
    leads.forEach(lead => {
      if (agrupado[lead.etapa]) agrupado[lead.etapa].push(lead)
    })

    // Los leads con email sin leer suben al tope de su columna (el sort de JS es
    // estable, así que dentro de cada grupo se mantiene el orden por actividad).
    // Va antes del corte a 100 para que nunca queden fuera por la cola.
    for (const col of Object.values(agrupado)) {
      col.sort((a, b) => (b.emailsNoLeidos > 0) - (a.emailsNoLeidos > 0))
    }

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
        unidadInteres: { include: { edificio: true } },
        visitas: {
          orderBy: { fechaHora: 'desc' },
          include: { vendedor: { select: { id: true, nombre: true, apellido: true } }, edificio: { select: { nombre: true } } }
        },
        interacciones: {
          where: { tipo: 'NOTA' },
          orderBy: { fecha: 'desc' },
          include: {
            usuario: { select: { id: true, nombre: true, apellido: true } },
            reacciones: { include: { usuario: { select: { id: true, nombre: true, apellido: true } } }, orderBy: { creadoEn: 'asc' } },
            respuestas: { include: { usuario: { select: { id: true, nombre: true, apellido: true } } }, orderBy: { fecha: 'asc' } }
          }
        },
        actividades: {
          orderBy: { fecha: 'desc' },
          include: { usuario: { select: { id: true, nombre: true, apellido: true } } }
        },
        ventas: { select: { id: true, estado: true, unidades: { select: { numero: true, edificio: { select: { nombre: true } } } } } },
        _count: {
          select: {
            emailConversaciones: { where: { direction: 'RECIBIDO', leido: false } }
          }
        }
      }
    })
    if (!lead) return res.status(404).json({ error: 'Lead no encontrado.' })
    lead.emailsNoLeidos = lead._count?.emailConversaciones || 0
    delete lead._count
    res.json(lead)
  } catch (err) {
    console.error('[obtener lead]', err)
    res.status(500).json({ error: 'Error al obtener lead.' })
  }
}

const crear = async (req, res) => {
  const { contactoId, unidadInteresId, vendedorId, presupuestoAprox, notas, campana } = req.body

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
        presupuestoAprox: presupuestoAprox ? Number(presupuestoAprox) : null,
        notas,
        campana: campana || null,
        campanaId: await vincularCampana(campana),
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
  const { unidadInteresId, vendedorId, presupuestoAprox, notas, campana } = req.body
  const puedeReasignar = ['GERENTE', 'JEFE_VENTAS'].includes(req.usuario.rol)

  try {
    // Verificar acceso al lead antes de editar (evita IDOR de escritura)
    const existente = await prisma.lead.findFirst({
      where: { id: Number(id), ...filtroAcceso(req.usuario) },
      select: { id: true }
    })
    if (!existente) return res.status(404).json({ error: 'Lead no encontrado.' })

    const lead = await prisma.lead.update({
      where: { id: Number(id) },
      data: {
        unidadInteresId: unidadInteresId ? Number(unidadInteresId) : undefined,
        // Solo gerencia/JV puede reasignar el vendedor (evita que un vendedor se robe leads)
        vendedorId: (puedeReasignar && vendedorId !== undefined) ? (vendedorId ? Number(vendedorId) : null) : undefined,
        presupuestoAprox: presupuestoAprox ? Number(presupuestoAprox) : undefined,
        notas,
        campana: campana !== undefined ? (campana || null) : undefined,
        campanaId: campana !== undefined ? await vincularCampana(campana) : undefined,
      }
    })
    res.json(lead)
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Lead no encontrado.' })
    res.status(500).json({ error: 'Error al actualizar lead.' })
  }
}

const MOTIVOS_VALIDOS = ['NO_CONTESTA','PRECIO_ALTO','ELIGIO_COMPETENCIA','NO_CALIFICA_FINANC','NO_GUSTO_PRODUCTO','PERDIO_INTERES','OTRO']

// Valida el payload de un cambio de etapa (individual o masivo). Devuelve mensaje de error o null.
const validarCambioEtapa = ({ etapa, motivoPerdidaCat }) => {
  if (!ORDEN_ETAPAS.includes(etapa)) return 'Etapa inválida.'
  if (etapa === 'PERDIDO' && !motivoPerdidaCat) return 'Debe indicar el motivo de pérdida (motivoPerdidaCat).'
  if (etapa === 'PERDIDO' && !MOTIVOS_VALIDOS.includes(motivoPerdidaCat)) {
    return `motivoPerdidaCat inválido. Válidos: ${MOTIVOS_VALIDOS.join(', ')}`
  }
  return null
}

// Aplica el cambio de etapa a UN lead ya cargado (con contacto): update + nota en el historial + notificación.
// `motivo` es el texto libre que explica el movimiento (obligatorio en el masivo, opcional en el individual).
const aplicarCambioEtapa = async (lead, { etapa, motivo, motivoPerdida, motivoPerdidaCat, motivoPerdidaNota }, usuario) => {
  const etapaAnterior = lead.etapa

  const dataUpdate = {
    etapa,
    ...(etapa === 'PERDIDO' && {
      etapaAntesDePerdido: etapaAnterior,
      motivoPerdidaCat,
      motivoPerdidaNota: motivoPerdidaNota || null,
      motivoPerdida: motivoPerdida || motivoPerdidaCat,
      perdidaAutomatica: false,
    })
  }

  const actualizado = await prisma.lead.update({ where: { id: lead.id }, data: dataUpdate })

  const partes = [`Etapa cambiada: ${etapaAnterior} → ${etapa}`]
  if (motivoPerdidaCat) partes.push(`Motivo: ${motivoPerdidaCat}`)
  if (motivoPerdidaNota) partes.push(motivoPerdidaNota)
  if (motivo) partes.push(`Motivo: ${motivo}`)

  await prisma.interaccion.create({
    data: {
      leadId: lead.id,
      usuarioId: usuario.id,
      tipo: 'NOTA',
      descripcion: partes.join('. ')
    }
  })

  notificarLead({
    leadId: lead.id,
    mensaje: `Lead ${lead.contacto?.nombre || ''} ${lead.contacto?.apellido || ''}`.trim() + ` → ${ETAPA_LABEL[etapa] || etapa}`,
    tipo: 'LEAD_ETAPA_CAMBIO',
    excluirUsuarioId: usuario.id,
    soloAVendedor: true // no spamear gerentes con cada cambio menor — ven todo en el reporte
  })

  return actualizado
}

const cambiarEtapa = async (req, res) => {
  const { id } = req.params
  const error = validarCambioEtapa(req.body)
  if (error) return res.status(400).json({ error })

  try {
    const lead = await prisma.lead.findFirst({
      where: { id: Number(id), ...filtroAcceso(req.usuario) },
      include: { contacto: { select: { nombre: true, apellido: true } } }
    })
    if (!lead) return res.status(404).json({ error: 'Lead no encontrado.' })

    const actualizado = await aplicarCambioEtapa(lead, req.body, req.usuario)
    res.json(actualizado)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al cambiar etapa.' })
  }
}

// POST /leads/cambiar-etapa-masivo — mueve varios leads a una etapa con motivo obligatorio (Kanban: selección múltiple).
// Respeta el acceso del usuario (un vendedor solo mueve sus leads); los que no pueda ver se reportan en `omitidos`.
const cambiarEtapaMasivo = async (req, res) => {
  const { leadIds, etapa, motivo } = req.body

  if (!Array.isArray(leadIds) || leadIds.length === 0) {
    return res.status(400).json({ error: 'Se requiere al menos un lead.' })
  }
  if (!motivo || !String(motivo).trim()) {
    return res.status(400).json({ error: 'Debe indicar el motivo del cambio.' })
  }
  const error = validarCambioEtapa(req.body)
  if (error) return res.status(400).json({ error })

  try {
    const ids = [...new Set(leadIds.map(Number).filter(Boolean))]
    const leads = await prisma.lead.findMany({
      where: { id: { in: ids }, ...filtroAcceso(req.usuario) },
      include: { contacto: { select: { nombre: true, apellido: true } } }
    })

    const payload = { ...req.body, motivo: String(motivo).trim() }
    let actualizados = 0
    let sinCambio = 0
    for (const lead of leads) {
      if (lead.etapa === etapa) { sinCambio++; continue }
      await aplicarCambioEtapa(lead, payload, req.usuario)
      actualizados++
    }

    res.json({ actualizados, sinCambio, omitidos: ids.length - leads.length })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al cambiar etapa de los leads.' })
  }
}

const asignarMasivo = async (req, res) => {
  const rolesPermitidos = ['GERENTE', 'JEFE_VENTAS']
  if (!rolesPermitidos.includes(req.usuario.rol)) {
    return res.status(403).json({ error: 'Acceso denegado.' })
  }

  const { leadIds, vendedorId } = req.body

  if (!Array.isArray(leadIds) || leadIds.length === 0) {
    return res.status(400).json({ error: 'Se requiere al menos un lead.' })
  }
  if (!vendedorId) {
    return res.status(400).json({ error: 'Debe asignar un vendedor.' })
  }

  try {
    const data = { vendedorId: Number(vendedorId) }

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
      // Hijos efímeros (interacciones, actividades, visitas, recordatorios,
      // emails) caen por onDelete: Cascade. Las cotizaciones se limpian a mano
      // porque tienen solicitudes de descuento asociadas.
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

module.exports = { listar, kanban, kanbanPorVendedor, obtener, crear, actualizar, cambiarEtapa, cambiarEtapaMasivo, asignarMasivo, eliminar, listarCampanas, fusionarDuplicados }
