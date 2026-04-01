const prisma = require('../lib/prisma')

const listarPorLead = async (req, res) => {
  const { leadId } = req.params
  try {
    const interacciones = await prisma.interaccion.findMany({
      where: { leadId: Number(leadId) },
      include: { usuario: { select: { nombre: true, apellido: true, rol: true } } },
      orderBy: { fecha: 'desc' }
    })
    res.json(interacciones)
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener interacciones.' })
  }
}

const crear = async (req, res) => {
  const { leadId, tipo, descripcion, fecha } = req.body

  if (!leadId || !tipo || !descripcion) {
    return res.status(400).json({ error: 'Lead, tipo y descripción son requeridos.' })
  }

  const tiposValidos = ['LLAMADA', 'EMAIL', 'WHATSAPP', 'REUNION', 'NOTA']
  if (!tiposValidos.includes(tipo)) {
    return res.status(400).json({ error: 'Tipo de interacción inválido.' })
  }

  try {
    const interaccion = await prisma.interaccion.create({
      data: {
        leadId: Number(leadId),
        usuarioId: req.usuario.id,
        tipo,
        descripcion,
        ...(fecha && { fecha: new Date(fecha) })
      },
      include: { usuario: { select: { nombre: true, apellido: true } } }
    })
    res.status(201).json(interaccion)
  } catch (err) {
    res.status(500).json({ error: 'Error al crear interacción.' })
  }
}

const listarTodas = async (req, res) => {
  const rolesPermitidos = ['GERENTE', 'JEFE_VENTAS']
  if (!rolesPermitidos.includes(req.usuario.rol)) {
    return res.status(403).json({ error: 'Acceso denegado.' })
  }

  const { desde, hasta, usuarioId } = req.query
  try {
    const interacciones = await prisma.interaccion.findMany({
      where: {
        ...(desde || hasta ? {
          fecha: {
            ...(desde && { gte: new Date(desde) }),
            ...(hasta && { lte: new Date(hasta) })
          }
        } : {}),
        ...(usuarioId && { usuarioId: Number(usuarioId) })
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
