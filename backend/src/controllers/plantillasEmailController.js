const prisma = require('../lib/prisma')

// Plantillas de email personales — cada usuario gestiona solo las suyas.

const listar = async (req, res) => {
  try {
    const plantillas = await prisma.plantillaEmail.findMany({
      where: { usuarioId: req.usuario.id },
      orderBy: [{ orden: 'asc' }, { creadoEn: 'asc' }]
    })
    res.json(plantillas)
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener plantillas.' })
  }
}

const crear = async (req, res) => {
  const { nombre, asunto, cuerpo, orden } = req.body
  if (!nombre?.trim() || !asunto?.trim() || !cuerpo?.trim()) {
    return res.status(400).json({ error: 'Nombre, asunto y cuerpo son requeridos.' })
  }
  try {
    const plantilla = await prisma.plantillaEmail.create({
      data: {
        usuarioId: req.usuario.id,
        nombre: nombre.trim(),
        asunto: asunto.trim(),
        cuerpo,
        ...(orden !== undefined && { orden: Number(orden) })
      }
    })
    res.status(201).json(plantilla)
  } catch (err) {
    res.status(500).json({ error: 'Error al crear plantilla.' })
  }
}

const actualizar = async (req, res) => {
  const { id } = req.params
  const { nombre, asunto, cuerpo, orden } = req.body
  try {
    // Solo puede editar las propias
    const existente = await prisma.plantillaEmail.findUnique({ where: { id: Number(id) } })
    if (!existente || existente.usuarioId !== req.usuario.id) {
      return res.status(404).json({ error: 'Plantilla no encontrada.' })
    }
    const plantilla = await prisma.plantillaEmail.update({
      where: { id: Number(id) },
      data: {
        ...(nombre !== undefined && { nombre: nombre.trim() }),
        ...(asunto !== undefined && { asunto: asunto.trim() }),
        ...(cuerpo !== undefined && { cuerpo }),
        ...(orden !== undefined && { orden: Number(orden) })
      }
    })
    res.json(plantilla)
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar plantilla.' })
  }
}

const eliminar = async (req, res) => {
  const { id } = req.params
  try {
    const existente = await prisma.plantillaEmail.findUnique({ where: { id: Number(id) } })
    if (!existente || existente.usuarioId !== req.usuario.id) {
      return res.status(404).json({ error: 'Plantilla no encontrada.' })
    }
    await prisma.plantillaEmail.delete({ where: { id: Number(id) } })
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar plantilla.' })
  }
}

// Sembrar plantillas base para el usuario (solo si no tiene ninguna).
const PLANTILLAS_BASE = [
  { nombre: 'Seguimiento', asunto: 'Seguimiento — BodeParking', cuerpo: 'Estimado/a {nombre},\n\nMe comunico desde BodeParking para hacer seguimiento sobre su consulta. ¿Tuvo oportunidad de revisar la información que le enviamos?\n\nQuedo atento a sus comentarios.\n\nSaludos cordiales,' },
  { nombre: 'Presentación', asunto: 'Presentación de Bodega — BodeParking', cuerpo: 'Estimado/a {nombre},\n\nJunto a este mensaje le comparto información detallada sobre la bodega disponible. Quedamos disponibles para coordinar una visita cuando lo estime conveniente.\n\nSaludos cordiales,' },
  { nombre: 'Cotización', asunto: 'Cotización BodeParking', cuerpo: 'Estimado/a {nombre},\n\nAdjunto encontrará la cotización solicitada para nuestras bodegas. Quedo a su disposición para cualquier consulta.\n\nSaludos cordiales,' },
  { nombre: 'Reunión', asunto: 'Confirmación de reunión — BodeParking', cuerpo: 'Estimado/a {nombre},\n\nConfirmo nuestra reunión para el [FECHA] a las [HORA] en [LUGAR].\n\nSi necesita reagendar, no dude en escribirme.\n\nSaludos cordiales,' },
  { nombre: 'Sin contacto', asunto: 'Contacto pendiente — BodeParking', cuerpo: 'Estimado/a {nombre},\n\nJunto con saludar, esperamos que se encuentre muy bien.\n\nLe comentamos que hemos intentado comunicarnos telefónicamente con usted durante el día, pero no nos ha sido posible tomar contacto.\n\nAgradeceríamos, por favor, si nos pudiera indicar un horario que le acomode o bien contactarnos directamente cuando tenga disponibilidad, para así poder conversar, resolver sus dudas y orientarlo/a de la mejor manera en su proceso de inversión.\n\nQuedamos atentos a sus comentarios.\n\nSaludos cordiales,' },
]

const sembrarBase = async (req, res) => {
  try {
    const count = await prisma.plantillaEmail.count({ where: { usuarioId: req.usuario.id } })
    if (count > 0) return res.status(400).json({ error: 'Ya tienes plantillas creadas.' })
    await prisma.plantillaEmail.createMany({
      data: PLANTILLAS_BASE.map((p, i) => ({ ...p, usuarioId: req.usuario.id, orden: i }))
    })
    const plantillas = await prisma.plantillaEmail.findMany({
      where: { usuarioId: req.usuario.id },
      orderBy: [{ orden: 'asc' }, { creadoEn: 'asc' }]
    })
    res.status(201).json(plantillas)
  } catch (err) {
    res.status(500).json({ error: 'Error al cargar plantillas base.' })
  }
}

module.exports = { listar, crear, actualizar, eliminar, sembrarBase }
