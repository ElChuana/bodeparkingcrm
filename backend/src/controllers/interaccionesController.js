const prisma = require('../lib/prisma')
const { notificarUsuario } = require('../lib/notifications')

// Interacciones = NOTAS (comentarios libres). Las acciones con fecha (llamada,
// email, whatsapp, reunión) viven en el modelo Actividad → actividadesController.
const listarPorLead = async (req, res) => {
  const { leadId } = req.params
  try {
    const interacciones = await prisma.interaccion.findMany({
      where: { leadId: Number(leadId), tipo: 'NOTA' },
      include: { usuario: { select: { nombre: true, apellido: true, rol: true } } },
      orderBy: { fecha: 'desc' }
    })
    res.json(interacciones)
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener notas.' })
  }
}

const crear = async (req, res) => {
  const { leadId, descripcion, fecha, mencionados } = req.body

  if (!leadId || !descripcion) {
    return res.status(400).json({ error: 'Lead y descripción son requeridos.' })
  }

  try {
    const interaccion = await prisma.interaccion.create({
      data: {
        leadId: Number(leadId),
        usuarioId: req.usuario.id,
        tipo: 'NOTA',
        descripcion,
        ...(fecha && { fecha: new Date(fecha) })
      },
      include: { usuario: { select: { nombre: true, apellido: true } } }
    })

    const lead = await prisma.lead.findUnique({
      where: { id: Number(leadId) },
      select: { vendedorId: true, contacto: { select: { nombre: true, apellido: true } } }
    })
    const nombreLead = `${lead?.contacto?.nombre || ''} ${lead?.contacto?.apellido || ''}`.trim() || 'un lead'
    const autor = req.usuario.nombre
    const yaNotificados = new Set([req.usuario.id]) // nunca notificar al autor

    // 1) Usuarios etiquetados con @ en la nota → notificación + email
    const ids = Array.isArray(mencionados)
      ? [...new Set(mencionados.map(Number).filter(n => n && !yaNotificados.has(n)))]
      : []
    if (ids.length) {
      // Validar que sean usuarios activos reales
      const validos = await prisma.usuario.findMany({ where: { id: { in: ids }, activo: true }, select: { id: true } })
      for (const u of validos) {
        yaNotificados.add(u.id)
        await notificarUsuario({
          usuarioId: u.id,
          tipo: 'MENCION_NOTA',
          mensaje: `${autor} te mencionó en una nota de ${nombreLead}: "${descripcion.substring(0, 80)}"`,
          referenciaId: Number(leadId),
          referenciaTipo: 'lead'
        })
      }
    }

    // 2) Notificar al vendedor asignado si no es el autor ni ya fue mencionado
    if (lead?.vendedorId && !yaNotificados.has(lead.vendedorId)) {
      await notificarUsuario({
        usuarioId: lead.vendedorId,
        tipo: 'ACTIVIDAD_EN_LEAD',
        mensaje: `${autor} dejó una nota en tu lead ${nombreLead}: "${descripcion.substring(0, 80)}"`,
        referenciaId: Number(leadId),
        referenciaTipo: 'lead'
      })
    }

    res.status(201).json(interaccion)
  } catch (err) {
    res.status(500).json({ error: 'Error al crear nota.' })
  }
}

const listarTodas = async (req, res) => {
  const esGerenciaOJV = ['GERENTE', 'JEFE_VENTAS'].includes(req.usuario.rol)
  const { desde, hasta, usuarioId } = req.query
  // Gerencia/JV ven todo (o filtran por vendedor); el resto solo sus propias actividades
  const filtroUsuario = esGerenciaOJV
    ? (usuarioId ? { usuarioId: Number(usuarioId) } : {})
    : { usuarioId: req.usuario.id }
  try {
    const interacciones = await prisma.interaccion.findMany({
      where: {
        tipo: 'NOTA',
        ...(desde || hasta ? {
          fecha: {
            ...(desde && { gte: new Date(desde) }),
            ...(hasta && { lte: new Date(hasta) })
          }
        } : {}),
        ...filtroUsuario
      },
      include: {
        lead: {
          select: {
            id: true,
            contacto: { select: { nombre: true, apellido: true } }
          }
        },
        usuario: { select: { id: true, nombre: true, apellido: true } }
      },
      orderBy: { fecha: 'desc' }
    })
    res.json(interacciones)
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener interacciones.' })
  }
}

module.exports = { listarPorLead, listarTodas, crear }
