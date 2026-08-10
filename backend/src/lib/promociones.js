// Motor de descuentos de promociones, puro y testeable (sin Prisma).
//
// Reglas por tipo (solo aplican a categoría DESCUENTO; BENEFICIO nunca afecta el precio):
//   - DESCUENTO_UF con unidades asociadas  → POR UNIDAD sobre las unidades de la promo
//     presentes en la cotización. Si la promo trae `precioObjetivoPesos`, el descuento
//     se calcula con la UF vigente para que el precio final en $ caiga EXACTO
//     (así el "precio webinar" no se corre cuando la UF cambia).
//   - DESCUENTO_UF sin unidades             → monto fijo por volumen si items >= minUnidades
//   - DESCUENTO_PORCENTAJE                  → % sobre la base (unidades de la promo, o todas)
//   - PAQUETE                               → suma de precios de las unidades del pack − valorUF
//
// El detalle por unidad alimenta CotizacionItem.descuentoUF, que es lo que habilita
// el precio tachado por unidad en el PDF de la cotización.

const { num } = require('./precios')

/**
 * @param {object} promo        Promocion (con `unidades: [{unidadId}]`)
 * @param {Array}  items        CotizacionItem[] ({ unidadId, precioListaUF })
 * @param {number} valorUF      UF vigente en pesos (null si no hay)
 * @returns {{ descuento: number, porUnidad: Object<number, number> }} UF, 6 decimales
 */
function calcularDescuentoPromocion(promo, items = [], valorUF = null) {
  const porUnidad = {}
  if (!promo || promo.categoria !== 'DESCUENTO') return { descuento: 0, porUnidad }

  const promoUnidadIds = (promo.unidades || []).map(u => u.unidadId)
  const tieneUnidades = promoUnidadIds.length > 0
  const itemUnidadIds = items.map(i => i.unidadId)
  const sumaDe = (lista) => lista.reduce((s, i) => s + num(i.precioListaUF), 0)
  const cumpleMinimo = !promo.minUnidades || items.length >= promo.minUnidades

  let descuento = 0

  if (promo.tipo === 'PAQUETE') {
    const todas = tieneUnidades && promoUnidadIds.every(id => itemUnidadIds.includes(id))
    if (todas) {
      const suma = sumaDe(items.filter(i => promoUnidadIds.includes(i.unidadId)))
      descuento = Math.max(suma - num(promo.valorUF), 0)
    }
  } else if (promo.tipo === 'DESCUENTO_UF') {
    if (tieneUnidades) {
      const usarObjetivo = promo.precioObjetivoPesos != null && num(valorUF) > 0
      for (const it of items.filter(i => promoUnidadIds.includes(i.unidadId))) {
        const d = usarObjetivo
          ? Math.max(num(it.precioListaUF) - (num(promo.precioObjetivoPesos) / num(valorUF)), 0)
          : num(promo.valorUF)
        porUnidad[it.unidadId] = (porUnidad[it.unidadId] || 0) + d
        descuento += d
      }
    } else if (cumpleMinimo) {
      descuento = num(promo.valorUF)
    }
  } else if (promo.tipo === 'DESCUENTO_PORCENTAJE') {
    const base = tieneUnidades
      ? sumaDe(items.filter(i => promoUnidadIds.includes(i.unidadId)))
      : sumaDe(items)
    if (cumpleMinimo) descuento = base * ((promo.valorPorcentaje || 0) / 100)
  }

  // 6 decimales: con precio objetivo en pesos el peso final debe caer exacto.
  const redondear = (n) => Number(n.toFixed(6))
  for (const k of Object.keys(porUnidad)) porUnidad[k] = redondear(porUnidad[k])
  return { descuento: redondear(descuento), porUnidad }
}

module.exports = { calcularDescuentoPromocion }
