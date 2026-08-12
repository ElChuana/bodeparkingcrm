// Adapta la cotización que devuelve el backend al formato que espera
// CotizacionDocumento: unifica promociones nuevas con los packs y beneficios
// antiguos en una sola lista.
//
// Estaba copiada en CotizacionEditor y EmailCard; ahora vive acá y la usan los
// tres (el tercero es el modo reunión).

// ¿Descuento por-unidad? Ya va tachado en la tabla del PDF, así que no se
// vuelve a listar como descuento global.
export const esDescuentoPorUnidad = (promo) =>
  promo?.tipo === 'DESCUENTO_UF' && (promo?.unidades?.length > 0)

export function cotizacionParaPDF(cot) {
  const promociones = [
    ...(cot.promociones || [])
      .filter(cp => !esDescuentoPorUnidad(cp.promocion))
      .map(cp => ({
        aplicada: true,
        ahorroUF: cp.descuentoAplicadoUF,
        promocion: {
          nombre: cp.promocion?.nombre,
          tipo: cp.promocion?.tipo,
          valorUF: cp.promocion?.valorUF,
          valorPorcentaje: cp.promocion?.valorPorcentaje,
          minUnidades: cp.promocion?.minUnidades,
          detalle: cp.promocion?.detalle,
        },
      })),
    // Compat: cotizaciones antiguas con packs/beneficios
    ...(cot.packs || []).map(cp => ({
      aplicada: true,
      ahorroUF: cp.descuentoAplicadoUF,
      promocion: { nombre: cp.pack?.nombre || 'Pack', tipo: 'DESCUENTO_UF', valorUF: cp.descuentoAplicadoUF },
    })),
    ...(cot.beneficios || []).map(cb => ({
      aplicada: true,
      ahorroUF: 0,
      promocion: { nombre: cb.beneficio?.nombre || 'Beneficio', tipo: cb.beneficio?.tipo || 'OTRO' },
    })),
  ]
  return { ...cot, promociones }
}
