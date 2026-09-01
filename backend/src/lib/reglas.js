/**
 * Reglas de conciliación: a qué documento corresponde un cargo antes de mirarlo.
 *
 * La idea es de Odoo (Reconciliation Models). El arriendo llega todos los meses con la misma
 * glosa y por el mismo monto; no tiene sentido que alguien lo impute a mano doce veces al
 * año. Una regla dice "si la glosa trae esto y el monto anda por acá, es este gasto".
 *
 * Una regla NO clasifica el movimiento: lo imputa a un gasto programado, y la categoría sale
 * de ahí. La clasificación es del documento, nunca del movimiento del banco — si viviera en
 * los dos lados habría dos respuestas para la misma pregunta.
 *
 * `autoValidar` es la única parte peligrosa, y por eso el criterio es más estricto que en
 * Odoo: no basta con que la regla calce, la conciliación resultante tiene que ser ÚNICA. Si
 * hay dos ocurrencias posibles del gasto, la regla propone y se queda callada. Automatizar
 * una decisión ambigua sobre plata cuesta más de desarmar que de hacer a mano.
 */

const { sinTildes } = require('./contraparte')

const num = (v) => Number(v ?? 0)

/** CARGO si sale plata, ABONO si entra. */
const tipoDeMovimiento = (mov) => (num(mov?.monto) < 0 ? 'CARGO' : 'ABONO')

/**
 * ¿Esta regla aplica a este movimiento?
 *
 * Las tres condiciones son AND y todas son opcionales salvo la glosa: una regla sin patrón
 * calzaría con todo, que es justo lo que no queremos.
 */
function calza(regla, mov) {
  if (!regla?.activa) return false
  if (!regla.patronGlosa) return false

  const patron = sinTildes(regla.patronGlosa).trim()
  if (!patron) return false
  if (!sinTildes(mov?.glosa).includes(patron)) return false

  if (regla.tipoMovimiento && regla.tipoMovimiento !== 'AMBOS') {
    if (tipoDeMovimiento(mov) !== regla.tipoMovimiento) return false
  }

  // Los rangos se comparan en valor absoluto: un cargo viene negativo y nadie escribe
  // "entre -700.000 y -650.000" en una regla.
  const monto = Math.abs(num(mov?.monto))
  if (regla.montoMin != null && monto < num(regla.montoMin)) return false
  if (regla.montoMax != null && monto > num(regla.montoMax)) return false

  return true
}

/**
 * La primera regla que calza, respetando `orden`.
 *
 * Gana la primera y no la mejor a propósito: el orden lo decide una persona, y una lista
 * ordenada se entiende leyéndola de arriba a abajo. Un puntaje escondido no.
 */
function primeraQueCalza(reglas = [], mov) {
  const ordenadas = [...reglas].sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0) || a.id - b.id)
  return ordenadas.find((r) => calza(r, mov)) || null
}

/**
 * Qué hay que hacer con un movimiento según las reglas.
 *
 * Devuelve siempre la misma forma, con `regla: null` cuando no calzó ninguna, para que quien
 * lo llame no tenga que preguntar dos veces.
 */
function aplicar(reglas = [], mov) {
  const regla = primeraQueCalza(reglas, mov)
  if (!regla) return { regla: null, gastoProgramadoId: null, autoValidar: false }
  return {
    regla,
    gastoProgramadoId: regla.gastoProgramadoId ?? null,
    autoValidar: Boolean(regla.autoValidar && regla.gastoProgramadoId),
  }
}

module.exports = { calza, primeraQueCalza, aplicar, tipoDeMovimiento }
