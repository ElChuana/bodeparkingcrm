/**
 * Estado de una cuota — fuente única de verdad.
 *
 * Antes esta regla estaba escrita seis veces con criterios distintos
 * (pagosController, reportesController, alertasController, dashboardController y dos
 * componentes del frontend), y encima el estado ATRASADO se PERSISTÍA como efecto
 * secundario de abrir la pantalla de Pagos. Eso causaba dos bugs reales:
 *
 *   1. `GET /pagos/atrasados` filtraba solo PENDIENTE y de paso marcaba ATRASADO,
 *      así que la segunda llamada devolvía [] y la pantalla se vaciaba sola.
 *   2. La alerta CUOTA_VENCIDA también filtraba solo PENDIENTE, así que una cuota ya
 *      marcada no volvía a avisar nunca.
 *
 * Por eso ATRASADO deja de escribirse: es un estado DERIVADO de la fecha, igual que
 * "está pagada" en el ERP. Un estado que se puede calcular no se guarda, porque el día
 * que alguien olvide actualizarlo el sistema miente sobre plata.
 *
 * El valor ATRASADO se mantiene en el enum porque PagoArriendo lo usa y porque puede
 * quedar en filas antiguas; por eso todo lo de acá lo trata como equivalente a PENDIENTE.
 */

// Una cuota "abierta" es la que todavía se espera cobrar. ATRASADO entra por
// compatibilidad con las filas que quedaron marcadas antes de este cambio.
const ESTADOS_ABIERTOS = ['PENDIENTE', 'ATRASADO']

/** `where` de Prisma para cuotas que siguen por cobrar. */
const WHERE_ABIERTA = { estado: { in: ESTADOS_ABIERTOS } }

/**
 * `where` de Prisma para cuotas vencidas. Es función y no constante porque el corte
 * es "ahora": una constante evaluada al importar el módulo congelaría la fecha en el
 * arranque del servidor y las cuotas dejarían de vencer hasta el próximo despliegue.
 */
const whereVencida = (ahora = new Date()) => ({
  estado: { in: ESTADOS_ABIERTOS },
  fechaVencimiento: { lt: ahora },
})

/** ¿Esta cuota está vencida? Sirve para objetos ya cargados. */
function estaVencida(cuota, ahora = new Date()) {
  if (!cuota || !cuota.fechaVencimiento) return false
  if (!ESTADOS_ABIERTOS.includes(cuota.estado)) return false
  return new Date(cuota.fechaVencimiento) < ahora
}

/**
 * El estado que hay que mostrar, calculado. Nunca se persiste: se manda al frontend
 * para que las pantallas no tengan que repetir la regla.
 */
function estadoEfectivo(cuota, ahora = new Date()) {
  if (!cuota) return null
  if (cuota.estado === 'PAGADO' || cuota.estado === 'CONDONADO') return cuota.estado
  return estaVencida(cuota, ahora) ? 'ATRASADO' : 'PENDIENTE'
}

/** Días de atraso (0 si no está vencida). Útil para priorizar la cobranza. */
function diasDeAtraso(cuota, ahora = new Date()) {
  if (!estaVencida(cuota, ahora)) return 0
  return Math.floor((ahora - new Date(cuota.fechaVencimiento)) / 86400000)
}

/** Agrega el estado calculado a una cuota, sin tocar el guardado. */
const conEstadoEfectivo = (cuota, ahora = new Date()) => ({
  ...cuota,
  estadoEfectivo: estadoEfectivo(cuota, ahora),
  diasAtraso: diasDeAtraso(cuota, ahora),
})

module.exports = {
  ESTADOS_ABIERTOS,
  WHERE_ABIERTA,
  whereVencida,
  estaVencida,
  estadoEfectivo,
  diasDeAtraso,
  conEstadoEfectivo,
}
