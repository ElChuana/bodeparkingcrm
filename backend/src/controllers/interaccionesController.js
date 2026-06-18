const prisma = require('../lib/prisma')

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
  const { leadId, descripcion, fecha } = req.body

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

    // Notificar al vendedor si fue otro usuario quien dejó la nota
    const lead = await prisma.lead.findUnique({ where: { id: Number(leadId) }, select: { vendedorId: true } })
    if (lead?.vendedorId && lead.vendedorId !== req.usuario.id) {
      await prisma.notificacion.create({
        data: {
          usuarioId: lead.vendedorId,
          tipo: 'ACTIVIDAD_EN_LEAD',
          mensaje: `${req.usuario.nombre} dejó una nota en tu lead: "${descripcion.substring(0, 80)}"`,
          referenciaId: Number(leadId),
          referenciaTipo: 'lead'
        }
      }).catch(() => {})
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
