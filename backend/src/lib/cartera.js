/**
 * Antigüedad de la cartera: el reporte que dice a quién hay que llamar hoy.
 *
 * Es el reporte más usado de cualquier ERP y el que nos faltaba. Teníamos días de atraso
 * cuota por cuota, que sirve para conciliar pero no para cobrar: nadie persigue cuotas
 * sueltas, uno persigue personas. La pregunta real es "¿cuánto me debe fulano y desde
 * cuándo?", y la respuesta se arma agrupando por cliente y repartiendo cada saldo en tramos
 * de antigüedad.
 *
 * Los tramos 30/60/90 son el estándar contable y no son arbitrarios: cada uno marca un
 * escalón distinto de riesgo de incobrable, y por eso importa el saldo del PEOR tramo, no
 * el total. Un cliente que debe 3 millones con 100 días es un problema más grande que uno
 * que debe 8 millones que todavía no vencen.
 */

const TRAMOS = [
  { clave: 'POR_VENCER', etiqueta: 'Por vencer', desde: null, hasta: 0 },
  { clave: 'D1_30', etiqueta: '1 a 30 días', desde: 1, hasta: 30 },
  { clave: 'D31_60', etiqueta: '31 a 60 días', desde: 31, hasta: 60 },
  { clave: 'D61_90', etiqueta: '61 a 90 días', desde: 61, hasta: 90 },
  { clave: 'D90_MAS', etiqueta: 'Más de 90 días', desde: 91, hasta: null },
]

/** Gravedad de cada tramo, para poder ordenar por "quién está peor". */
const PESO = { POR_VENCER: 0, D1_30: 1, D31_60: 2, D61_90: 3, D90_MAS: 4 }

const num = (v) => Number(v ?? 0)

/** Días de atraso a una fecha de corte. Negativo o cero = todavía no vence. */
function diasAtraso(fechaVencimiento, ahora = new Date()) {
  if (!fechaVencimiento) return 0
  const ms = new Date(ahora) - new Date(fechaVencimiento)
  return Math.floor(ms / 86400000)
}

/** En qué tramo cae un atraso. */
function tramo(dias) {
  const d = Number(dias) || 0
  if (d <= 0) return 'POR_VENCER'
  if (d <= 30) return 'D1_30'
  if (d <= 60) return 'D31_60'
  if (d <= 90) return 'D61_90'
  return 'D90_MAS'
}

const tramosEnCero = () => Object.fromEntries(TRAMOS.map((t) => [t.clave, 0]))

/**
 * Agrupa cuotas por cliente y las reparte en tramos de antigüedad.
 *
 * @param {Array} cuotas  filas con { saldoPorCobrar, fechaVencimiento, contactoId, comprador }
 * @param {Date} ahora    fecha de corte (parámetro, no `new Date()` adentro: así el reporte
 *                        es reproducible y los tests no dependen del día en que corren)
 */
function agrupar(cuotas = [], ahora = new Date()) {
  const porCliente = new Map()
  const totales = tramosEnCero()
  let total = 0

  for (const c of cuotas) {
    const saldo = num(c.saldoPorCobrar)
    if (saldo <= 0) continue

    const dias = diasAtraso(c.fechaVencimiento, ahora)
    const t = tramo(dias)
    const id = c.contactoId ?? `s/c-${c.ventaId ?? 'x'}`

    if (!porCliente.has(id)) {
      porCliente.set(id, {
        contactoId: c.contactoId ?? null,
        nombre: c.comprador || 'Sin cliente',
        rut: c.rut || null,
        total: 0,
        vencido: 0,
        tramos: tramosEnCero(),
        peorTramo: 'POR_VENCER',
        diasMax: 0,
        cuotas: [],
      })
    }

    const cli = porCliente.get(id)
    cli.total += saldo
    cli.tramos[t] += saldo
    if (dias > 0) cli.vencido += saldo
    if (PESO[t] > PESO[cli.peorTramo]) cli.peorTramo = t
    if (dias > cli.diasMax) cli.diasMax = dias
    cli.cuotas.push({ ...c, diasAtraso: dias, tramo: t, saldoPorCobrar: saldo })

    totales[t] += saldo
    total += saldo
  }

  const clientes = [...porCliente.values()]
    // Primero el que está peor, y dentro del mismo tramo el que debe más: así la pantalla
    // se lee de arriba hacia abajo como una lista de llamados por hacer.
    .sort((a, b) => PESO[b.peorTramo] - PESO[a.peorTramo] || b.total - a.total)

  for (const cli of clientes) {
    cli.cuotas.sort((a, b) => new Date(a.fechaVencimiento) - new Date(b.fechaVencimiento))
  }

  return {
    clientes,
    totales,
    total,
    vencido: total - totales.POR_VENCER,
    tramos: TRAMOS,
  }
}

/**
 * Estado de cuenta de un cliente: sus movimientos ordenados en el tiempo con saldo corriente.
 *
 * Cada cuota SUMA a lo que debe y cada pago RESTA. El saldo corriente es lo que uno recita
 * por teléfono, así que el orden cronológico no es cosmético: es el argumento.
 */
function estadoCuenta(cuotas = [], ahora = new Date()) {
  const lineas = []

  for (const c of cuotas) {
    // Un monto negativo es un documento que RESTA (una nota de crédito): en el estado de
    // cuenta se lee como abono, aunque no haya pasado plata por el banco.
    const monto = num(c.montoCLP)
    lineas.push({
      fecha: c.fechaVencimiento,
      tipo: monto < 0 ? 'ABONO' : 'CARGO',
      glosa: c.glosa || `Cuota ${c.numeroCuota}${c.tipo ? ` · ${c.tipo}` : ''}`,
      ventaId: c.ventaId ?? null,
      cuotaId: c.id ?? null,
      monto,
    })
    for (const p of c.pagos || []) {
      lineas.push({
        fecha: p.fecha,
        tipo: 'ABONO',
        glosa: p.glosa || 'Pago',
        ventaId: c.ventaId ?? null,
        cuotaId: c.id ?? null,
        monto: -Math.abs(num(p.monto)),
      })
    }
  }

  lineas.sort((a, b) => new Date(a.fecha) - new Date(b.fecha) || (a.tipo === 'CARGO' ? -1 : 1))

  let saldo = 0
  for (const l of lineas) {
    saldo += l.monto
    l.saldo = saldo
  }

  return { lineas, saldoFinal: saldo, corteEn: ahora }
}

module.exports = { TRAMOS, PESO, tramo, diasAtraso, agrupar, estadoCuenta }
