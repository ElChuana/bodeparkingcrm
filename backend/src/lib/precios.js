// Lógica de precios de una venta, pura y testeable.
//
// Dos conceptos distintos que NO deben mezclarse (ver bug de descuadre jul-2026):
//   - unidad.precioUF      → precio de CATÁLOGO. Se bloquea al vender.
//   - unidad.precioVentaUF → precio PACTADO en la venta. Se congela al convertir
//                            la cotización y es independiente del catálogo.
//
// Los descuentos van SIEMPRE en la cabecera de la venta, nunca bajando el
// precio de catálogo de la unidad.

const num = (v) => Number(v || 0)

/**
 * Totales de la cabecera de la venta a partir de la cotización.
 * Los descuentos de packs y promociones se consolidan en descuentoPacksUF.
 */
function calcularTotalesVenta({ items = [], packs = [], promociones = [], descuentoAprobadoUF = 0 } = {}) {
  const precioListaUF = items.reduce((s, i) => s + num(i.precioListaUF), 0)
  const descuentoPacksLegacyUF = packs.reduce((s, p) => s + num(p.descuentoAplicadoUF), 0)
  const descuentoPromosUF = promociones.reduce((s, p) => s + num(p.descuentoAplicadoUF), 0)
  const descuentoPacksUF = descuentoPacksLegacyUF + descuentoPromosUF
  const dtoAprobado = num(descuentoAprobadoUF)
  const precioFinalUF = Math.max(precioListaUF - descuentoPacksUF - dtoAprobado, 0)
  return { precioListaUF, descuentoPacksUF, descuentoAprobadoUF: dtoAprobado, precioFinalUF }
}

/**
 * Reparte el precio final de la venta entre sus unidades, proporcional al
 * precio de lista de cada una (todas quedan con el mismo % de descuento).
 *
 * Invariante: la suma de los precioVentaUF debe reconstruir precioFinalUF.
 * Devuelve [{ unidadId, precioVentaUF }].
 */
function prorratearPrecioVenta(items = [], precioFinalUF = 0) {
  const sumaLista = items.reduce((s, i) => s + num(i.precioListaUF), 0)
  return items.map((item) => ({
    unidadId: item.unidadId,
    // Sin precio de lista no hay proporción posible: se deja el lista tal cual.
    precioVentaUF: sumaLista > 0
      ? +(num(item.precioListaUF) * (num(precioFinalUF) / sumaLista)).toFixed(6)
      : num(item.precioListaUF),
  }))
}

/**
 * Verifica que la cabecera de la venta cuadre con sus unidades.
 * `tolerancia` absorbe el redondeo a 6 decimales del prorrateo.
 * Devuelve { ok, diffLista, diffVenta }.
 */
function verificarCuadratura({ precioListaUF, precioFinalUF, unidades = [] }, tolerancia = 0.01) {
  const sumaCatalogo = unidades.reduce((s, u) => s + num(u.precioUF), 0)
  const sumaVenta = unidades.reduce((s, u) => s + num(u.precioVentaUF), 0)
  const diffLista = +(num(precioListaUF) - sumaCatalogo).toFixed(6)
  const diffVenta = +(num(precioFinalUF) - sumaVenta).toFixed(6)
  return {
    ok: Math.abs(diffLista) <= tolerancia && Math.abs(diffVenta) <= tolerancia,
    diffLista,
    diffVenta,
  }
}

module.exports = { num, calcularTotalesVenta, prorratearPrecioVenta, verificarCuadratura }
