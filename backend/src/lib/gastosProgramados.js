/**
 * Gastos programados → ocurrencias en el tiempo.
 *
 * Un gasto programado es una PLANTILLA ("arriendo de la oficina, 16 UF, el 5 de cada
 * mes"). El cron mensual la materializa en un DocumentoInterno PROVISION por período
 * (ver lib/documentos.js); para el flujo de caja además hay que poder expandirla en las
 * veces concretas que va a caer dentro de la ventana que se está mirando.
 *
 * Acá viven las trampas de calendario: un gasto que se paga el 31 en un mes de 30 días, un
 * gasto que empieza a mitad de la ventana, uno que ya terminó.
 */

const MESES_POR_PERIODICIDAD = {
  MENSUAL: 1,
  BIMESTRAL: 2,
  TRIMESTRAL: 3,
  SEMESTRAL: 6,
  ANUAL: 12,
}

/** Clave 'YYYY-MM' leída en UTC — los campos @db.Date llegan a medianoche UTC. */
const claveMes = (d) => {
  const f = new Date(d)
  return `${f.getUTCFullYear()}-${String(f.getUTCMonth() + 1).padStart(2, '0')}`
}

/**
 * Fecha de vencimiento dentro de un mes, sin desbordar.
 * Un gasto que se paga el 31 cae el 28 en febrero, no el 3 de marzo.
 */
function fechaEnMes(anio, mes, dia) {
  const ultimoDia = new Date(Date.UTC(anio, mes + 1, 0)).getUTCDate()
  return new Date(Date.UTC(anio, mes, Math.min(dia || 1, ultimoDia)))
}

/**
 * Expande un gasto programado en las ocurrencias que caen entre dos fechas.
 *
 * @param {object} gasto  con fechaInicio, fechaFin?, periodicidad, diaVencimiento?
 * @param {Date} desde
 * @param {Date} hasta
 * @returns {Array<{periodo, fecha, montoUF, montoCLP}>}
 */
function ocurrencias(gasto, desde, hasta) {
  if (!gasto?.activo) return []

  const inicio = new Date(gasto.fechaInicio)
  const fin = gasto.fechaFin ? new Date(gasto.fechaFin) : null
  const dia = gasto.diaVencimiento || inicio.getUTCDate()

  // Un gasto de una sola vez cae en su fecha de inicio y nada más.
  if (gasto.periodicidad === 'UNICO') {
    if (inicio < desde || inicio > hasta) return []
    return [{ periodo: claveMes(inicio), fecha: inicio, montoUF: gasto.montoUF, montoCLP: gasto.montoCLP }]
  }

  const paso = MESES_POR_PERIODICIDAD[gasto.periodicidad]
  if (!paso) return []

  const salida = []
  // Se avanza desde el inicio del gasto en saltos de su periodicidad, para que un gasto
  // trimestral caiga en los meses correctos y no en cualquier trimestre del calendario.
  let anio = inicio.getUTCFullYear()
  let mes = inicio.getUTCMonth()

  // Un tope duro evita un bucle infinito si llegan fechas absurdas.
  for (let i = 0; i < 600; i++) {
    const fecha = fechaEnMes(anio, mes, dia)

    if (fecha > hasta) break
    if (fin && fecha > fin) break
    if (fecha >= desde) {
      salida.push({ periodo: claveMes(fecha), fecha, montoUF: gasto.montoUF, montoCLP: gasto.montoCLP })
    }

    mes += paso
    anio += Math.floor(mes / 12)
    mes %= 12
  }

  return salida
}

/**
 * Expande varios gastos y devuelve las ocurrencias con su monto en pesos, descartando las
 * que ya están cubiertas por algo más concreto (una provisión generada, que a su vez puede
 * tener factura o pago).
 *
 * @param {Array} gastos  con cuenta y proveedor incluidos si se quieren en la salida
 * @param {Date} desde
 * @param {Date} hasta
 * @param {number} valorUF
 * @param {Set<string>} cubiertas  claves `${gastoId}|${periodo}` que ya tienen documento
 */
function proyectar(gastos, desde, hasta, valorUF, cubiertas = new Set()) {
  const salida = []
  for (const g of gastos) {
    for (const o of ocurrencias(g, desde, hasta)) {
      if (cubiertas.has(`${g.id}|${o.periodo}`)) continue // ya hay una provisión ocupando ese lugar
      const montoCLP = Number(o.montoCLP) > 0
        ? Number(o.montoCLP)
        : Math.round(Number(o.montoUF || 0) * (Number(valorUF) || 0))
      if (!(montoCLP > 0)) continue
      salida.push({
        gastoId: g.id,
        nombre: g.nombre,
        proveedor: g.proveedor?.razonSocial || g.proveedorTexto || null,
        cuenta: g.cuenta?.nombre || null,
        cuentaId: g.cuentaId ?? null,
        periodo: o.periodo,
        fecha: o.fecha,
        montoUF: o.montoUF,
        montoCLP,
      })
    }
  }
  return salida
}

module.exports = { ocurrencias, proyectar, fechaEnMes, claveMes, MESES_POR_PERIODICIDAD }
