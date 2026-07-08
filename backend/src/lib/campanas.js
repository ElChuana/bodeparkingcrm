const prisma = require('./prisma')

// Vincula un nombre de campaña (texto libre) al catálogo `campanas`.
// Busca por nombre exacto sin distinguir mayúsculas; si no existe la crea,
// marcando esWebinar automáticamente cuando el nombre contiene "webinar".
// Devuelve el id de la campaña, o null si el nombre viene vacío.
async function vincularCampana(nombre) {
  const limpio = (nombre || '').trim()
  if (!limpio) return null

  const existente = await prisma.campana.findFirst({
    where: { nombre: { equals: limpio, mode: 'insensitive' } },
    select: { id: true },
  })
  if (existente) return existente.id

  const creada = await prisma.campana.create({
    data: { nombre: limpio, esWebinar: /webinar/i.test(limpio) },
    select: { id: true },
  })
  return creada.id
}

module.exports = { vincularCampana }
