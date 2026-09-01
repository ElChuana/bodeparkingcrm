/**
 * El lado con base de datos del aprendizaje de contrapartes.
 *
 * `lib/contraparte.js` es puro: sabe extraer el núcleo de una glosa y nada más. Acá vive lo
 * que toca la base, para que aquello se pueda testear sin levantar Postgres.
 *
 * Se aprende en dos momentos, y los dos son el MISMO acto: una persona afirmó quién está al
 * otro lado de un movimiento. Da lo mismo si lo hizo conciliando una cuota o identificando
 * la contraparte a mano en la pantalla de Banco.
 */

const prisma = require('./prisma')
const { loQueSeAprende, nucleoGlosa, claveNombre } = require('./contraparte')

/**
 * La clave con la que se archiva una contraparte.
 *
 * Es la misma para las dos vías de entrada, y eso es a propósito: `nucleoGlosa` le saca a
 * "TRANSFERENCIA DESDE Chile DE Patricia Munoz" todo lo que sobra y deja "PATRICIA MUNOZ";
 * `claveNombre` toma el "Patricia Muñoz" que escribió el contador en el libro y deja lo
 * mismo. Al compartir clave, identificar a alguien una vez sirve para las dos fuentes.
 */
function claveDe(movimiento) {
  return claveNombre(movimiento?.nombreDetectado || '') || nucleoGlosa(movimiento?.glosa || '')
}

/**
 * Guarda (o refresca) el alias de una contraparte.
 *
 * `vecesVisto` no se usa para decidir nada todavía: está para poder responder "¿de dónde
 * sacaste que este es Juan?" mirando cuántas veces se confirmó.
 *
 * @returns {Promise<object|null>} null cuando no había nada que aprender
 */
async function aprenderContraparte(glosa, contactoId, rut = null, cliente = prisma) {
  const dato = loQueSeAprende({ glosa, contactoId, rut })
  if (!dato) return null

  return cliente.aliasContraparte.upsert({
    where: { clave: dato.clave },
    create: { clave: dato.clave, etiqueta: dato.etiqueta, contactoId: dato.contactoId, rut: dato.rut },
    update: {
      contactoId: dato.contactoId,
      // Un RUT que ya conocíamos no se pisa con null: el dato viejo puede ser mejor.
      ...(dato.rut ? { rut: dato.rut } : {}),
      vecesVisto: { increment: 1 },
      ultimaVez: new Date(),
    },
  })
}

/**
 * Aprende a partir de un NOMBRE ya limpio, no de una glosa: es lo que trae el libro banco y
 * lo que escribe una persona cuando identifica una contraparte a mano en la pantalla.
 *
 * Acepta cliente o proveedor, nunca los dos: "SSH RENT SPA" es una cosa o la otra, y dejar
 * que sea ambas convierte el alias en una respuesta ambigua justo donde se necesita una sola.
 */
async function aprenderNombre(nombre, { contactoId = null, proveedorId = null, rut = null, interno = false }, cliente = prisma) {
  const clave = claveNombre(nombre)
  if (!clave || (!contactoId && !proveedorId && !interno)) return null
  if (contactoId && proveedorId) throw new Error('Una contraparte es cliente o proveedor, no las dos.')

  return cliente.aliasContraparte.upsert({
    where: { clave },
    create: { clave, etiqueta: String(nombre).trim().slice(0, 180), contactoId, proveedorId, rut, interno },
    update: {
      contactoId,
      proveedorId,
      interno,
      ...(rut ? { rut } : {}),
      vecesVisto: { increment: 1 },
      ultimaVez: new Date(),
    },
  })
}

/**
 * Etiqueta los movimientos que ya estaban en la base y son de esta misma contraparte.
 *
 * Sin esto, aprender quién es alguien solo sirve para el futuro. Con esto, el día que
 * identificas a un comprador se etiquetan de una vez sus otros cinco pagos — que es
 * exactamente el caso: seis cuotas por venta, seis transferencias de la misma persona.
 *
 * Solo toca movimientos SIN contraparte: nunca reescribe una identificación existente.
 */
async function propagarContraparte(clave, contactoId, cliente = prisma) {
  return propagar(clave, { contactoId }, cliente)
}

/**
 * El caso general: propaga un cliente o un proveedor.
 *
 * Compara por las DOS claves posibles —el nombre que trae el libro y el núcleo de la glosa
 * del banco— porque el mismo pagador llega escrito de las dos formas según de dónde vino el
 * movimiento, y quien lo identificó lo identificó una sola vez.
 *
 * Solo toca movimientos sin contraparte: nunca reescribe una identificación existente.
 */
async function propagar(clave, { contactoId = null, proveedorId = null, interno = false }, cliente = prisma) {
  if (!clave || (!contactoId && !proveedorId && !interno)) return 0

  const sinIdentificar = await cliente.movimientoBanco.findMany({
    where: { contactoId: null, proveedorId: null },
    select: { id: true, glosa: true, nombreDetectado: true },
  })
  const ids = sinIdentificar.filter((m) => claveDe(m) === clave).map((m) => m.id)
  if (!ids.length) return 0

  await cliente.movimientoBanco.updateMany({
    where: { id: { in: ids } },
    data: interno
      ? { ignorado: true }
      : { ...(contactoId ? { contactoId } : {}), ...(proveedorId ? { proveedorId } : {}) },
  })
  return ids.length
}

/**
 * Deshace una identificación: borra el alias y suelta los movimientos que se etiquetaron
 * por él. Es el DELETE que faltaba (§6.6): sin esto, decir "SSH RENT SPA es el proveedor X"
 * y equivocarse obligaba a ir a la base.
 *
 * Solo suelta movimientos SIN conciliación: uno ya imputado a una factura de ese proveedor
 * tiene una afirmación más fuerte encima (el pago), y quitarle la contraparte lo dejaría
 * contradictorio. Esos se informan para que alguien decida.
 */
async function olvidar(aliasId, cliente = prisma) {
  const alias = await cliente.aliasContraparte.findUnique({ where: { id: aliasId } })
  if (!alias) return null

  const etiquetados = await cliente.movimientoBanco.findMany({
    where: {
      ...(alias.interno
        ? { ignorado: true }
        : alias.contactoId ? { contactoId: alias.contactoId } : { proveedorId: alias.proveedorId }),
    },
    select: { id: true, glosa: true, nombreDetectado: true, conciliaciones: { select: { id: true } } },
  })
  const propios = etiquetados.filter((m) => claveDe(m) === alias.clave)
  const sueltos = propios.filter((m) => !m.conciliaciones.length).map((m) => m.id)
  const conPago = propios.length - sueltos.length

  if (sueltos.length) {
    await cliente.movimientoBanco.updateMany({
      where: { id: { in: sueltos } },
      data: alias.interno ? { ignorado: false } : { contactoId: null, proveedorId: null },
    })
  }
  await cliente.aliasContraparte.delete({ where: { id: aliasId } })
  return { alias, liberados: sueltos.length, conPago }
}

/** Aprender y propagar de una sola vez, que es como se usa siempre. */
async function registrarContraparte(glosa, contactoId, rut = null, cliente = prisma) {
  const alias = await aprenderContraparte(glosa, contactoId, rut, cliente)
  if (!alias) return { alias: null, propagados: 0 }
  const propagados = await propagarContraparte(alias.clave, contactoId, cliente)
  return { alias, propagados }
}

module.exports = { aprenderContraparte, aprenderNombre, propagarContraparte, propagar, registrarContraparte, claveDe, olvidar }
