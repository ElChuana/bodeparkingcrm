// Armado automático del plan de pago de una venta, puro y testeable.
//
// Un plan es: reserva (opcional) + pie (opcional) + N cuotas + escritura (opcional).
// Las CUOTAS SIEMPRE QUEDAN IGUALES entre sí: el residuo del redondeo se absorbe
// en el pie (o en la reserva si no hay pie, o en la escritura). Esa es la razón
// de ser de este módulo — si el residuo cayera en la última cuota, el cliente
// vería una cuota distinta a las demás en su calendario de pagos.

const num = (v) => Number(v || 0)
const r2 = (n) => Math.round(n * 100) / 100

/**
 * Suma `meses` a una fecha 'YYYY-MM-DD' manteniendo el día.
 * Si el día no existe en el mes destino (31 de enero + 1 mes), cae al último
 * día de ese mes, que es como se pactan los vencimientos en la práctica.
 */
function sumarMeses(fechaISO, meses) {
  const [y, m, d] = fechaISO.split('-').map(Number)
  const base = new Date(Date.UTC(y, m - 1 + meses, 1))
  const ultimoDia = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + 1, 0)).getUTCDate()
  const dia = Math.min(d, ultimoDia)
  const mm = String(base.getUTCMonth() + 1).padStart(2, '0')
  return `${base.getUTCFullYear()}-${mm}-${String(dia).padStart(2, '0')}`
}

/**
 * Genera las cuotas de un plan repartiendo el saldo en partes iguales.
 *
 * @param {object}  p
 * @param {number}  p.precioUF            Precio pactado de la venta.
 * @param {number} [p.reservaUF=0]        Abono de reserva ya pagado o por pagar.
 * @param {string} [p.fechaReserva]       Vencimiento de la reserva.
 * @param {number} [p.pieUF=0]            Pie. Si se pasa `piePorcentaje` se calcula sobre el precio.
 * @param {number} [p.piePorcentaje]      Pie como % del precio (0-100). Tiene prioridad sobre pieUF.
 * @param {string} [p.fechaPie]           Vencimiento del pie.
 * @param {number} [p.numCuotas=0]        Cantidad de cuotas iguales.
 * @param {string} [p.fechaPrimeraCuota]  Vencimiento de la primera cuota; las demás van mes a mes.
 * @param {number} [p.escrituraUF=0]      Saldo contra escritura.
 * @param {string} [p.fechaEscritura]     Vencimiento del saldo de escritura.
 *
 * @returns {{ ok, error?, cuotas, cuotaUF, saldoCuotasUF, ajusteUF, ajustadoEn, totalUF }}
 *   `cuotas` viene lista para POST /pagos/plan: [{ tipo, montoUF, fechaVencimiento }]
 *   `ajusteUF` es el residuo del redondeo y `ajustadoEn` dice qué partida lo absorbió.
 */
function generarPlanPago({
  precioUF,
  reservaUF = 0, fechaReserva,
  pieUF = 0, piePorcentaje, fechaPie,
  numCuotas = 0, fechaPrimeraCuota,
  escrituraUF = 0, fechaEscritura,
} = {}) {
  const precio = r2(num(precioUF))
  if (!(precio > 0)) return { ok: false, error: 'El precio de la venta debe ser mayor que 0.', cuotas: [] }

  const reserva = r2(num(reservaUF))
  const escritura = r2(num(escrituraUF))
  let pie = piePorcentaje != null && piePorcentaje !== ''
    ? r2(precio * (num(piePorcentaje) / 100))
    : r2(num(pieUF))

  if (reserva < 0 || pie < 0 || escritura < 0) {
    return { ok: false, error: 'Los montos no pueden ser negativos.', cuotas: [] }
  }

  const n = Math.trunc(num(numCuotas))
  if (n < 0) return { ok: false, error: 'El número de cuotas no puede ser negativo.', cuotas: [] }

  const saldo = r2(precio - reserva - pie - escritura)
  if (saldo < 0) {
    return { ok: false, error: `La reserva, el pie y la escritura suman ${r2(reserva + pie + escritura)} UF y superan el precio de ${precio} UF.`, cuotas: [] }
  }
  if (n === 0 && saldo > 0) {
    return { ok: false, error: `Quedan ${saldo} UF sin repartir: indica cuántas cuotas o súbelo al pie.`, cuotas: [] }
  }
  if (n > 0 && saldo === 0) {
    return { ok: false, error: 'No queda saldo para repartir en cuotas.', cuotas: [] }
  }
  if (n > 0 && !fechaPrimeraCuota) {
    return { ok: false, error: 'Falta la fecha de la primera cuota.', cuotas: [] }
  }

  // Todas las cuotas iguales; el residuo se absorbe fuera de ellas.
  const cuotaUF = n > 0 ? r2(saldo / n) : 0
  const ajuste = n > 0 ? r2(saldo - cuotaUF * n) : 0

  let ajustadoEn = null
  if (ajuste !== 0) {
    if (pie > 0) { pie = r2(pie + ajuste); ajustadoEn = 'PIE' }
    else if (reserva > 0) { ajustadoEn = 'RESERVA' }
    else if (escritura > 0) { ajustadoEn = 'ESCRITURA' }
    else ajustadoEn = 'ULTIMA_CUOTA'
  }

  const cuotas = []
  if (reserva > 0) {
    const monto = ajustadoEn === 'RESERVA' ? r2(reserva + ajuste) : reserva
    cuotas.push({ tipo: 'RESERVA', montoUF: monto, fechaVencimiento: fechaReserva || fechaPrimeraCuota })
  }
  if (pie > 0) {
    cuotas.push({ tipo: 'PIE', montoUF: pie, fechaVencimiento: fechaPie || fechaPrimeraCuota })
  }
  for (let i = 0; i < n; i++) {
    const esUltima = i === n - 1
    const monto = esUltima && ajustadoEn === 'ULTIMA_CUOTA' ? r2(cuotaUF + ajuste) : cuotaUF
    cuotas.push({ tipo: 'CUOTA', montoUF: monto, fechaVencimiento: sumarMeses(fechaPrimeraCuota, i) })
  }
  if (escritura > 0) {
    const monto = ajustadoEn === 'ESCRITURA' ? r2(escritura + ajuste) : escritura
    cuotas.push({ tipo: 'ESCRITURA', montoUF: monto, fechaVencimiento: fechaEscritura || sumarMeses(fechaPrimeraCuota || '', Math.max(n - 1, 0)) })
  }

  if (!cuotas.length) return { ok: false, error: 'El plan quedó sin cuotas.', cuotas: [] }

  const faltaFecha = cuotas.find(c => !c.fechaVencimiento)
  if (faltaFecha) return { ok: false, error: `Falta la fecha de vencimiento de ${faltaFecha.tipo.toLowerCase()}.`, cuotas: [] }

  const totalUF = r2(cuotas.reduce((s, c) => s + c.montoUF, 0))
  return { ok: true, cuotas, cuotaUF, saldoCuotasUF: saldo, ajusteUF: ajuste, ajustadoEn, totalUF }
}

/**
 * Deriva los parámetros del plan desde las formas de pago ya pactadas en la venta.
 *
 * El criterio: todo lo que NO es la forma CUOTAS se paga de una (transferencia,
 * vale vista, tarjeta) y por lo tanto es el PIE; lo pactado en la forma CUOTAS
 * es el saldo que se difiere y se reparte en cuotas iguales.
 *
 * @param {Array}  formasPago       [{ forma, montoUF, cuotas }]
 * @param {number} precioFinalUF    Precio pactado de la venta.
 * @param {number} [cuotasBeneficio] Nº de cuotas del beneficio, si la forma no lo trae.
 * @returns {{ pieUF, numCuotas, saldoCuotasUF, calza, aviso }}
 *   `calza` es false cuando las formas no cubren el precio: el plan igual se puede
 *   armar, pero el saldo a repartir no va a ser el pactado en la forma CUOTAS.
 */
function parametrosDesdeFormasPago(formasPago = [], precioFinalUF = 0, cuotasBeneficio = null) {
  const precio = r2(num(precioFinalUF))
  const formaCuotas = formasPago.find(f => f.forma === 'CUOTAS')
  const pieUF = r2(formasPago
    .filter(f => f.forma !== 'CUOTAS')
    .reduce((s, f) => s + num(f.montoUF), 0))

  const saldoPactado = r2(num(formaCuotas?.montoUF))
  const saldoReal = r2(precio - pieUF)
  const numCuotas = Number(formaCuotas?.cuotas) || Number(cuotasBeneficio) || 0

  const diferencia = r2(saldoReal - saldoPactado)
  const calza = !formaCuotas || Math.abs(diferencia) <= 0.01

  const uf = (n) => `${Number(n).toLocaleString('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} UF`

  let aviso = null
  if (formaCuotas && !calza) {
    if (diferencia < 0) {
      aviso = `Las formas de pago se pasan por ${uf(Math.abs(diferencia))} del precio de la venta.`
    } else if (saldoPactado === 0) {
      aviso = `La forma Cuotas no tiene monto pactado: las cuotas van a repartir los ${uf(saldoReal)} que quedan después del pie.`
    } else {
      aviso = `Las formas de pago dejan ${uf(diferencia)} sin asignar: las cuotas van a repartir ${uf(saldoReal)} y no los ${uf(saldoPactado)} pactados en la forma Cuotas.`
    }
  }

  return { pieUF, numCuotas, saldoCuotasUF: saldoReal, saldoPactadoUF: saldoPactado, calza, aviso }
}

module.exports = { generarPlanPago, sumarMeses, parametrosDesdeFormasPago }
