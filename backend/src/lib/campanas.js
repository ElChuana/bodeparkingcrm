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

// Reingreso: la campaña del lead pasa a ser la ÚLTIMA que lo trajo.
//
// Antes solo se escribía si el lead no tenía ninguna, así que alguien que entró
// por el webinar de junio y volvía a inscribirse en el de agosto seguía contando
// como lead de junio: no aparecía en el informe de la campaña nueva y su venta
// no comisionaba como venta de esa campaña.
//
// Devuelve `{ campana, campanaId, anterior }` para mezclar en el update, o
// `null` si no hay nada que cambiar (sin campaña nueva, o es la misma).
// La campaña anterior se devuelve para dejarla escrita en el timeline: el dato
// se sobrescribe, pero no se pierde.
async function campanaTrasReingreso(leadActual, campanaNueva) {
  const nueva = (campanaNueva || '').trim()
  if (!nueva) return null
  if (leadActual?.campana && leadActual.campana.trim().toLowerCase() === nueva.toLowerCase()) return null

  return {
    campana: nueva,
    campanaId: await vincularCampana(nueva),
    anterior: leadActual?.campana || null,
  }
}

// Frase para el timeline: "Campaña: Webinar Junio 2026 → Webinar Agosto 2026"
const textoCambioCampana = (cambio) =>
  !cambio ? '' : ` · Campaña: ${cambio.anterior ? `${cambio.anterior} → ` : ''}${cambio.campana}`

module.exports = { vincularCampana, campanaTrasReingreso, textoCambioCampana }
