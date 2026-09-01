/**
 * Conciliación banco ⇄ documentos.
 *
 * Las dos preguntas que tiene que contestar el ERP son:
 *   - ¿qué plata entró al banco que no está imputada a nada? (cuotas, arriendos, a cuenta)
 *   - ¿qué cargos salieron sin documento que los explique? (facturas de compra, provisiones,
 *     documentos internos)
 *
 * Y para no revisar eso a mano, un matcher que propone los cruces probables.
 * El matcher NUNCA concilia solo: propone con un score y una persona confirma.
 * Es plata: un match errado ensucia las cifras y cuesta más desarmarlo que
 * hacerlo a mano.
 *
 * Señales que usa, en orden de peso:
 *   1. el monto (una transferencia por el saldo exacto del documento es casi
 *      siempre ese documento);
 *   2. quién está al otro lado: si la contraparte ya fue identificada en una
 *      conciliación anterior es una IGUALDAD y no un parecido; si no, el nombre
 *      dentro de la glosa;
 *   3. el RUT, cuando la glosa o el documento lo traen;
 *   4. la cercanía de fechas.
 *
 * El matcher trabaja sobre un vocabulario único —el "objetivo": { id, total,
 * razonSocialReceptor, rutReceptor, fechaEmision, contactoId/proveedorId,
 * conciliaciones }— y cada tipo de documento se traduce a él con su adaptador
 * (`cuotaComoObjetivo`, `compraComoObjetivo`, `documentoComoObjetivo`,
 * `pagoArriendoComoObjetivo`). Un solo criterio, muchos destinos.
 */

const { normalizarNombre } = require('./deduplication')

const UMBRAL_SUGERENCIA = 45 // bajo esto no se muestra: es ruido

const num = (v) => Number(v ?? 0)

/** Cuánto de un movimiento (o documento) ya está imputado. */
function montoImputado(conciliaciones = []) {
  return conciliaciones.reduce((a, c) => a + Math.abs(num(c.monto)), 0)
}

/** Lo que queda por conciliar de un movimiento (siempre en positivo). */
function saldoMovimiento(mov) {
  return Math.abs(num(mov.monto)) - montoImputado(mov.conciliaciones)
}

/** Lo que queda por pagar/cobrar de un objetivo { total, conciliaciones }. */
function saldoObjetivo(o) {
  if (!o) return 0
  return num(o.total) - montoImputado(o.conciliaciones)
}

/** Lo que queda por pagar de una factura de compra, en pesos. */
const saldoFacturaCompra = saldoObjetivo

/** Un movimiento/documento se da por cuadrado si le quedan menos de $1000 sueltos. */
const TOLERANCIA_PESOS = 1000
const estaCuadrado = (saldo) => Math.abs(saldo) < TOLERANCIA_PESOS

/** Días de diferencia entre dos fechas (absoluto). */
function diasEntre(a, b) {
  if (!a || !b) return null
  return Math.abs(new Date(a) - new Date(b)) / 86400000
}

/** Normaliza un RUT a "12345678-9" para poder compararlos. */
function normalizarRut(rut) {
  if (!rut) return null
  const limpio = String(rut).replace(/[^0-9kK]/g, '').toUpperCase()
  if (limpio.length < 7) return null
  return `${limpio.slice(0, -1)}-${limpio.slice(-1)}`
}

/**
 * ¿Aparece el RUT en el texto? El banco lo escribe de mil formas
 * (con puntos, sin puntos, sin dígito verificador), así que se compara el
 * cuerpo numérico.
 */
function rutEnTexto(rut, texto) {
  const n = normalizarRut(rut)
  if (!n) return false
  const cuerpo = n.split('-')[0]
  if (cuerpo.length < 7) return false
  const soloDigitos = String(texto || '').replace(/[^0-9kK]/g, '')
  return soloDigitos.includes(cuerpo)
}

/**
 * Cuántas palabras del nombre aparecen en la glosa, como fracción.
 * Se ignoran las partículas ("de", "la", "spa"…) y las palabras de menos de
 * 3 letras, que matchean con cualquier cosa.
 */
const RUIDO = new Set(['de', 'la', 'el', 'los', 'las', 'del', 'y', 'spa', 'ltda', 'limitada', 'sa', 'eirl', 'inversiones'])

function similitudNombre(nombre, glosa) {
  const tokens = normalizarNombre(nombre).split(/\s+/).filter((t) => t.length >= 3 && !RUIDO.has(t))
  if (!tokens.length) return 0
  const texto = normalizarNombre(glosa)
  const encontrados = tokens.filter((t) => texto.includes(t)).length
  return encontrados / tokens.length
}

/**
 * Puntúa un cruce candidato movimiento ⇄ objetivo. 0-100.
 * Devuelve también los motivos, para que la UI explique POR QUÉ lo propone —
 * sin eso nadie confía en la sugerencia y termina revisando todo igual.
 */
function puntuar(mov, objetivo) {
  const motivos = []
  let score = 0

  const saldoMov = saldoMovimiento(mov)
  const saldoObj = saldoObjetivo(objetivo)
  if (saldoMov <= 0 || saldoObj <= 0) return { score: 0, motivos: [] }

  // 1. Monto
  const dif = Math.abs(saldoMov - saldoObj)
  const relativo = saldoObj > 0 ? dif / saldoObj : 1
  if (dif < TOLERANCIA_PESOS) {
    score += 50
    motivos.push('monto exacto')
  } else if (relativo <= 0.01) {
    score += 38
    motivos.push('monto casi exacto (±1%)')
  } else if (relativo <= 0.05) {
    score += 22
    motivos.push('monto cercano (±5%)')
  } else if (saldoMov < saldoObj) {
    // Un abono parcial es normal (pie, cuotas): no descalifica, pero pesa poco.
    score += 8
    motivos.push('abono parcial')
  }

  // 2. Quién está al otro lado.
  //
  // Si la contraparte del movimiento ya fue identificada —porque alguien confirmó una
  // conciliación de este mismo pagador antes— esto es una igualdad, no un parecido, y vale
  // más que cualquier similitud de texto. Con seis cuotas por venta, el mismo comprador
  // aparece seis veces y sin esto las seis se resolvían desde cero.
  //
  // Cuando no hay contraparte identificada se cae al fuzzy. La escala es generosa sobre
  // 0,65 a propósito: el banco recorta la glosa y casi siempre omite el apellido materno,
  // así que un nombre chileno de tres palabras que pierde una queda exactamente en 0,667.
  const objetivoContactoId = objetivo.contactoId ?? null
  const mismoProveedor = mov.proveedorId && objetivo.proveedorId && mov.proveedorId === objetivo.proveedorId
  if (mismoProveedor) {
    score += 34
    motivos.push('proveedor identificado en el movimiento')
  } else if (mov.contactoId && objetivoContactoId && mov.contactoId === objetivoContactoId) {
    score += 34
    motivos.push('contraparte identificada en pagos anteriores')
  } else {
    // El nombre que dejó el lector de glosas (lib/glosaIA.js) es texto limpio; la glosa
    // cruda trae la basura del banco. Se prueban los dos y gana el mejor.
    const sim = Math.max(
      similitudNombre(objetivo.razonSocialReceptor, mov.glosa),
      similitudNombre(objetivo.razonSocialReceptor, mov.nombreDetectado)
    )
    if (sim >= 0.99) {
      score += 30
      motivos.push('nombre en la glosa')
    } else if (sim >= 0.65) {
      score += 26
      motivos.push('nombre en la glosa (parcial)')
    } else if (sim >= 0.5) {
      score += 18
      motivos.push('nombre parcial en la glosa')
    }
  }

  // 3. RUT
  if (rutEnTexto(objetivo.rutReceptor, `${mov.glosa} ${mov.documento || ''} ${mov.contraparteRut || ''} ${mov.rutDetectado || ''}`)) {
    score += 25
    motivos.push('RUT en el movimiento')
  }

  // 4. El folio, cuando el movimiento lo nombra ("Pago factura #37"). No es una señal más:
  // es el documento diciendo su propio nombre, y por eso pesa como el monto.
  if (mov.referenciaDetectada && objetivo.folio &&
      String(mov.referenciaDetectada) === String(objetivo.folio)) {
    score += 40
    motivos.push(`el movimiento nombra el documento #${objetivo.folio}`)
  }

  // 5. Fechas
  const dias = diasEntre(mov.fecha, objetivo.fechaEmision)
  if (dias != null) {
    if (dias <= 3) { score += 15; motivos.push('mismos días') }
    else if (dias <= 10) { score += 10; motivos.push('dentro de 10 días') }
    else if (dias <= 45) { score += 4 }
    else { score -= 10; motivos.push('fechas lejanas') }
  }

  return { score: Math.max(0, Math.min(100, Math.round(score))), motivos }
}

/**
 * Propone objetivos para un movimiento, de mejor a peor.
 * Solo devuelve los que pasan el umbral, y como máximo 5: una lista larga de
 * candidatos malos es peor que ninguna.
 */
function sugerirObjetivos(mov, objetivos, { umbral = UMBRAL_SUGERENCIA, limite = 5 } = {}) {
  return objetivos
    .map((o) => ({ objetivo: o, ...puntuar(mov, o) }))
    .filter((s) => s.score >= umbral)
    .sort((a, b) => b.score - a.score)
    .slice(0, limite)
}

/** El mismo cruce, mirado desde el documento: qué movimientos podrían pagarlo. */
function sugerirMovimientos(objetivo, movimientos, { umbral = UMBRAL_SUGERENCIA, limite = 5 } = {}) {
  return movimientos
    .map((m) => ({ movimiento: m, ...puntuar(m, objetivo) }))
    .filter((s) => s.score >= umbral)
    .sort((a, b) => b.score - a.score)
    .slice(0, limite)
}

/** Cuánto se ha cobrado a través de las cuotas de un plan de pago. */
function cobradoEnCuotas(cuotas = []) {
  return cuotas.reduce((a, c) => a + montoImputado(c.conciliaciones), 0)
}

// ─── ADAPTADORES AL VOCABULARIO DEL MATCHER ───────────────────

/**
 * Adapta una cuota del plan de pago. La cuota está en UF y el banco en pesos,
 * así que se convierte con la UF del día que corresponda.
 *
 * @param {object} cuota  con planPago.venta.comprador incluido
 * @param {number} valorUF
 */
function cuotaComoObjetivo(cuota, valorUF) {
  const comprador = cuota.planPago?.venta?.comprador
  const total = num(cuota.montoCLP) > 0
    ? num(cuota.montoCLP)
    : Math.round(num(cuota.montoUF) * (Number(valorUF) || 0))

  return {
    id: cuota.id,
    total,
    // El contacto viaja junto al nombre: es lo que permite que el matcher use una igualdad
    // en vez de un parecido cuando la contraparte del movimiento ya está identificada.
    contactoId: comprador?.id ?? null,
    razonSocialReceptor: comprador ? `${comprador.nombre || ''} ${comprador.apellido || ''}`.trim() : '',
    rutReceptor: comprador?.rut || null,
    // El vencimiento hace de "fecha de emisión": es la fecha contra la que se espera el pago.
    fechaEmision: cuota.fechaVencimiento,
    conciliaciones: cuota.conciliaciones || [],
  }
}

/** Adapta una factura de compra (con proveedor incluido). */
function compraComoObjetivo(f) {
  const p = f.proveedor || {}
  return {
    id: f.id,
    folio: f.folio,
    total: num(f.total),
    proveedorId: f.proveedorId ?? p.id ?? null,
    razonSocialReceptor: p.razonSocial || '',
    rutReceptor: p.rut || null,
    // El vencimiento manda sobre la emisión: es la fecha contra la que se espera el pago.
    fechaEmision: f.fechaVencimiento || f.fechaEmision,
    conciliaciones: f.conciliaciones || [],
  }
}

/**
 * Adapta un documento interno (provisión o respaldo pendiente), con proveedor o
 * contacto incluidos. El total en pesos sale del montoCLP, o del montoUF con la
 * UF entregada.
 */
function documentoComoObjetivo(d, valorUF) {
  const total = num(d.montoCLP) > 0
    ? num(d.montoCLP)
    : Math.round(num(d.montoUF) * (Number(valorUF) || 0))
  const nombre = d.proveedor?.razonSocial
    || (d.contacto ? `${d.contacto.nombre || ''} ${d.contacto.apellido || ''}`.trim() : '')
  return {
    id: d.id,
    total,
    proveedorId: d.proveedorId ?? null,
    contactoId: d.contactoId ?? null,
    razonSocialReceptor: nombre || d.descripcion || '',
    rutReceptor: d.proveedor?.rut || d.contacto?.rut || null,
    fechaEmision: d.fechaEsperada,
    conciliaciones: d.conciliaciones || [],
  }
}

/** Adapta un pago de arriendo (con arriendo.contacto incluido). */
function pagoArriendoComoObjetivo(p, valorUF) {
  const contacto = p.arriendo?.contacto
  const total = num(p.montoCLP) > 0
    ? num(p.montoCLP)
    : Math.round(num(p.montoUF ?? p.arriendo?.montoMensualUF) * (Number(valorUF) || 0))
  return {
    id: p.id,
    total,
    contactoId: contacto?.id ?? null,
    razonSocialReceptor: contacto ? `${contacto.nombre || ''} ${contacto.apellido || ''}`.trim() : '',
    rutReceptor: contacto?.rut || null,
    fechaEmision: p.mes,
    conciliaciones: p.conciliaciones || [],
  }
}

/** Lo que queda por cobrar de una cuota, en pesos. */
function saldoCuota(cuota, valorUF) {
  return saldoObjetivo(cuotaComoObjetivo(cuota, valorUF))
}

module.exports = {
  cobradoEnCuotas,
  cuotaComoObjetivo,
  compraComoObjetivo,
  documentoComoObjetivo,
  pagoArriendoComoObjetivo,
  saldoCuota,
  UMBRAL_SUGERENCIA,
  TOLERANCIA_PESOS,
  montoImputado,
  saldoMovimiento,
  saldoObjetivo,
  saldoFacturaCompra,
  estaCuadrado,
  normalizarRut,
  rutEnTexto,
  similitudNombre,
  diasEntre,
  puntuar,
  sugerirObjetivos,
  sugerirMovimientos,
}
