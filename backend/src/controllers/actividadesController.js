const prisma = require('../lib/prisma')
const { notificarLead } = require('../lib/notifications')

const TIPOS_VALIDOS = ['REUNION_COMERCIAL', 'LLAMADA', 'WHATSAPP', 'EMAIL', 'OTRO']

const listarPorLead = async (req, res) => {
  const { leadId } = req.params
  try {
    const actividades = await prisma.actividad.findMany({
      where: { leadId: Number(leadId) },
      include: { usuario: { select: { nombre: true, apellido: true, rol: true } } },
      orderBy: { fecha: 'desc' }
    })
    res.json(actividades)
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener actividades.' })
  }
}

const crear = async (req, res) => {
  const { leadId, tipo, descripcion, fecha, resultado } = req.body

  if (!leadId || !tipo || !descripcion) {
    return res.status(400).json({ error: 'Lead, tipo y descripción son requeridos.' })
  }
  if (!TIPOS_VALIDOS.includes(tipo)) {
    return res.status(400).json({ error: 'Tipo de actividad inválido.' })
  }

  try {
    const actividad = await prisma.actividad.create({
      data: {
        leadId: Number(leadId),
        usuarioId: req.usuario.id,
        tipo,
        descripcion,
        ...(resultado !== undefined && { resultado }),
        ...(fecha && { fecha: new Date(fecha) })
      },
      include: { usuario: { select: { nombre: true, apellido: true } } }
    })

    // Notificar al vendedor si fue otro usuario quien registró la actividad
    const lead = await prisma.lead.findUnique({ where: { id: Number(leadId) }, select: { vendedorId: true } })
    if (lead?.vendedorId && lead.vendedorId !== req.usuario.id) {
      await notificarLead({
        leadId: Number(leadId),
        tipo: 'ACTIVIDAD_EN_LEAD',
        mensaje: `${req.usuario.nombre} registró una actividad en tu lead: ${tipo.toLowerCase().replace('_', ' ')} — "${descripcion.substring(0, 80)}"`,
        excluirUsuarioId: req.usuario.id,
        soloAVendedor: true
      }).catch(() => {})
    }

    res.status(201).json(actividad)
  } catch (err) {
    res.status(500).json({ error: 'Error al crear actividad.' })
  }
}

const actualizar = async (req, res) => {
  const { id } = req.params
  const { tipo, descripcion, fecha, resultado } = req.body
  if (tipo && !TIPOS_VALIDOS.includes(tipo)) {
    return res.status(400).json({ error: 'Tipo de actividad inválido.' })
  }
  try {
    const actividad = await prisma.actividad.update({
      where: { id: Number(id) },
      data: {
        ...(tipo && { tipo }),
        ...(descripcion !== undefined && { descripcion }),
        ...(fecha && { fecha: new Date(fecha) }),
        ...(resultado !== undefined && { resultado })
      },
      include: { usuario: { select: { nombre: true, apellido: true } } }
    })
    res.json(actividad)
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar actividad.' })
  }
}

const eliminar = async (req, res) => {
  const { id } = req.params
  try {
    await prisma.actividad.delete({ where: { id: Number(id) } })
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar actividad.' })
  }
}

const listarTodas = async (req, res) => {
  const esGerenciaOJV = ['GERENTE', 'JEFE_VENTAS'].includes(req.usuario.rol)
  const { desde, hasta, usuarioId } = req.query
  const filtroUsuario = esGerenciaOJV
    ? (usuarioId ? { usuarioId: Number(usuarioId) } : {})
    : { usuarioId: req.usuario.id }
  try {
    const actividades = await prisma.actividad.findMany({
      where: {
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
    res.json(actividades)
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener actividades.' })
  }
}

module.exports = { listarPorLead, listarTodas, crear, actualizar, eliminar }
