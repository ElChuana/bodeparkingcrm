/**
 * Saldo a favor: la plata del cliente que todavía no es mía.
 *
 * Tres situaciones que antes dejaban plata pegada en el sistema:
 *
 *   1. **Paga de más.** La transferencia cubre la cuota y sobra. El excedente quedaba como
 *      movimiento "sin conciliar" para siempre, molestando en la pantalla de conciliación
 *      sin que nadie pudiera cerrarlo.
 *   2. **Paga alguien distinto del que aparece en la factura.** El papá transfiere por el
 *      hijo. Se puede imputar igual, pero hay que registrar QUIÉN pagó: si después hay que
 *      devolver, se le devuelve al que puso la plata, no al titular de la venta.
 *   3. **Hay que devolverle.** Se cae la reserva, se cobró de más, se pagó dos veces. Un
 *      cargo así no tenía destino posible y se contaba como gasto, que es falso.
 *
 * El modelo es un **estacionamiento**: la plata sin destino se imputa "a cuenta" del cliente
 * y queda trazada a su movimiento del banco. Después se aplica a una cuota —que es MOVER la
 * imputación, no crear plata nueva— o se devuelve.
 *
 * ⚠️ Lo que está a cuenta **no es ingreso ni egreso** para el resultado: es plata que pasa,
 * no plata que es mía. Entra y sale de la caja (por eso sí aparece en el flujo), pero no
 * puede sumar al margen de ningún edificio.
 */

const num = (v) => Number(v ?? 0)

/**
 * Saldo a favor de un cliente a partir de sus conciliaciones "a cuenta".
 *
 * Un abono suma (entró plata suya sin destino) y un cargo resta (se le devolvió). El signo
 * lo pone el movimiento del banco, no la conciliación: así el saldo no puede quedar al revés
 * por un error de digitación.
 */
function saldoAFavor(aCuenta = []) {
  let saldo = 0
  for (const c of aCuenta) {
    const signo = num(c.movimiento?.monto) < 0 ? -1 : 1
    saldo += signo * Math.abs(num(c.monto))
  }
  return saldo
}

/** Agrupa las conciliaciones "a cuenta" por cliente y devuelve solo los que tienen saldo. */
function porCliente(aCuenta = []) {
  const mapa = new Map()

  for (const c of aCuenta) {
    const id = c.contactoId
    if (!id) continue
    if (!mapa.has(id)) {
      const p = c.contacto || {}
      mapa.set(id, {
        contactoId: id,
        nombre: `${p.nombre || ''} ${p.apellido || ''}`.trim() || 'Cliente',
        rut: p.rut || null,
        email: p.email || null,
        telefono: p.telefono || null,
        saldo: 0,
        lineas: [],
      })
    }
    const cli = mapa.get(id)
    const esDevolucion = num(c.movimiento?.monto) < 0
    cli.saldo += (esDevolucion ? -1 : 1) * Math.abs(num(c.monto))
    cli.lineas.push({
      conciliacionId: c.id,
      movimientoId: c.movimientoId,
      fecha: c.movimiento?.fecha || c.creadoEn,
      glosa: c.movimiento?.glosa || '',
      monto: Math.abs(num(c.monto)),
      tipo: esDevolucion ? 'DEVOLUCION' : 'ABONO',
      notas: c.notas || null,
    })
  }

  for (const cli of mapa.values()) {
    cli.lineas.sort((a, b) => new Date(a.fecha) - new Date(b.fecha))
  }

  return [...mapa.values()]
    .filter((c) => Math.abs(c.saldo) >= 1)
    .sort((a, b) => b.saldo - a.saldo)
}

/**
 * Cuánto de un cargo es devolución de saldo a favor.
 *
 * Sirve para descontarlo del gasto: devolverle plata a un cliente no es un costo del
 * negocio, es la salida de algo que nunca fue mío. Si se contara como gasto, el margen del
 * edificio bajaría por plata que tampoco había sumado al entrar.
 */
function devueltoAClientes(conciliaciones = []) {
  return conciliaciones
    .filter((c) => c.contactoId)
    .reduce((a, c) => a + Math.abs(num(c.monto)), 0)
}

module.exports = { saldoAFavor, porCliente, devueltoAClientes }
