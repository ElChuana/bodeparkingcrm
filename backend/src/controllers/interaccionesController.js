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
    const autor = `${req.usuario.nombre} ${req.usuario.apellido || ''}`.trim()
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

// ─── Reacciones (emoji) a una nota ────────────────────────────────
// Toggle: si el usuario ya reaccionó con ese emoji, lo quita; si no, lo agrega.
const toggleReaccion = async (req, res) => {
  const { id } = req.params // interaccionId
  const { emoji } = req.body
  if (!emoji) return res.status(400).json({ error: 'Falta el emoji.' })

  try {
    const nota = await prisma.interaccion.findUnique({
      where: { id: Number(id) },
      select: { id: true, leadId: true, usuarioId: true, descripcion: true }
    })
    if (!nota) return res.status(404).json({ error: 'Nota no encontrada.' })

    const existente = await prisma.reaccionNota.findUnique({
      where: { interaccionId_usuarioId_emoji: { interaccionId: nota.id, usuarioId: req.usuario.id, emoji } }
    })

    if (existente) {
      await prisma.reaccionNota.delete({ where: { id: existente.id } })
    } else {
      await prisma.reaccionNota.create({
        data: { interaccionId: nota.id, usuarioId: req.usuario.id, emoji }
      })
      // Avisar al autor de la nota (solo in-app), si no es uno mismo
      if (nota.usuarioId && nota.usuarioId !== req.usuario.id) {
        const autor = `${req.usuario.nombre} ${req.usuario.apellido || ''}`.trim()
        await notificarUsuario({
          usuarioId: nota.usuarioId,
          tipo: 'REACCION_NOTA',
          mensaje: `${autor} reaccionó ${emoji} a tu nota: "${nota.descripcion.substring(0, 60)}"`,
          referenciaId: nota.leadId,
          referenciaTipo: 'lead'
        })
      }
    }

    const reacciones = await prisma.reaccionNota.findMany({
      where: { interaccionId: nota.id },
      include: { usuario: { select: { id: true, nombre: true, apellido: true } } },
      orderBy: { creadoEn: 'asc' }
    })
    res.json(reacciones)
  } catch (err) {
    res.status(500).json({ error: 'Error al reaccionar.' })
  }
}

// ─── Respuestas a una nota (comentarios anidados, con @menciones) ──
const crearRespuesta = async (req, res) => {
  const { id } = req.params // interaccionId
  const { descripcion, mencionados } = req.body
  if (!descripcion) return res.status(400).json({ error: 'La respuesta no puede estar vacía.' })

  try {
    const nota = await prisma.interaccion.findUnique({
      where: { id: Number(id) },
      select: { id: true, leadId: true, usuarioId: true }
    })
    if (!nota) return res.status(404).json({ error: 'Nota no encontrada.' })

    const respuesta = await prisma.respuestaNota.create({
      data: { interaccionId: nota.id, usuarioId: req.usuario.id, descripcion },
      include: { usuario: { select: { id: true, nombre: true, apellido: true } } }
    })

    const lead = await prisma.lead.findUnique({
      where: { id: nota.leadId },
      select: { contacto: { select: { nombre: true, apellido: true } } }
    })
    const nombreLead = `${lead?.contacto?.nombre || ''} ${lead?.contacto?.apellido || ''}`.trim() || 'un lead'
    const autor = `${req.usuario.nombre} ${req.usuario.apellido || ''}`.trim()
    const yaNotificados = new Set([req.usuario.id])

    // 1) @menciones dentro de la respuesta
    const ids = Array.isArray(mencionados)
      ? [...new Set(mencionados.map(Number).filter(n => n && !yaNotificados.has(n)))]
      : []
    if (ids.length) {
      const validos = await prisma.usuario.findMany({ where: { id: { in: ids }, activo: true }, select: { id: true } })
      for (const u of validos) {
        yaNotificados.add(u.id)
        await notificarUsuario({
          usuarioId: u.id,
          tipo: 'MENCION_NOTA',
          mensaje: `${autor} te mencionó en una respuesta de ${nombreLead}: "${descripcion.substring(0, 80)}"`,
          referenciaId: nota.leadId,
          referenciaTipo: 'lead'
        })
      }
    }

    // 2) Avisar al autor de la nota original (si no es uno mismo ni ya fue mencionado)
    if (nota.usuarioId && !yaNotificados.has(nota.usuarioId)) {
      await notificarUsuario({
        usuarioId: nota.usuarioId,
        tipo: 'RESPUESTA_NOTA',
        mensaje: `${autor} respondió tu nota en ${nombreLead}: "${descripcion.substring(0, 80)}"`,
        referenciaId: nota.leadId,
        referenciaTipo: 'lead'
      })
    }

    res.status(201).json(respuesta)
  } catch (err) {
    res.status(500).json({ error: 'Error al responder.' })
  }
}

const eliminarRespuesta = async (req, res) => {
  const { respuestaId } = req.params
  try {
    const r = await prisma.respuestaNota.findUnique({ where: { id: Number(respuestaId) }, select: { usuarioId: true } })
    if (!r) return res.status(404).json({ error: 'Respuesta no encontrada.' })
    const esDueño = r.usuarioId === req.usuario.id
    const esGerencia = ['GERENTE', 'JEFE_VENTAS'].includes(req.usuario.rol)
    if (!esDueño && !esGerencia) return res.status(403).json({ error: 'No autorizado.' })
    await prisma.respuestaNota.delete({ where: { id: Number(respuestaId) } })
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar respuesta.' })
  }
}

module.exports = { listarPorLead, listarTodas, crear, toggleReaccion, crearRespuesta, eliminarRespuesta }
