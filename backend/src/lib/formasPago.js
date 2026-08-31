// Formas de pago de una venta, puras y testeables.
//
// Una venta puede combinar varias formas (ej: pie por transferencia + saldo en
// cuotas). Cada forma lleva su monto en UF y la suma no puede pasar el precio
// final de la venta. Sin ninguna forma registrada, la venta es AL CONTADO.
//
// La cantidad de cuotas sale del beneficio "cuotas sin interés" de la venta;
// solo se guarda en la forma cuando se pacta una cantidad distinta.

const { num } = require('./precios')

const FORMAS_VALIDAS = ['TRANSFERENCIA', 'VALE_VISTA', 'TARJETA', 'CUOTAS']

const FORMA_LABEL = {
  TRANSFERENCIA: 'Transferencia',
  VALE_VISTA: 'Vale vista',
  TARJETA: 'Tarjeta',
  CUOTAS: 'Cuotas',
}

// Tolerancia en UF para el redondeo de los montos.
const TOLERANCIA = 0.01

/**
 * Valida y normaliza el set completo de formas de pago de una venta.
 * Devuelve { ok, error, formas, asignadoUF, faltanteUF }.
 * Se acepta un set incompleto (queda saldo por asignar); lo que se rechaza es
 * pasarse del precio final, repetir una forma o mandar datos inválidos.
 */
function normalizarFormasPago(entrada = [], precioFinalUF = 0) {
  if (entrada == null) entrada = []
  if (!Array.isArray(entrada)) {
    return { ok: false, error: 'formasPago debe ser una lista.' }
  }

  const formas = []
  const vistas = new Set()

  for (const item of entrada) {
    const forma = typeof item === 'string' ? item : item?.forma
    if (!FORMAS_VALIDAS.includes(forma)) {
      return { ok: false, error: `Forma de pago inválida: ${forma}.` }
    }
    if (vistas.has(forma)) {
      return { ok: false, error: `La forma de pago ${FORMA_LABEL[forma]} está repetida.` }
    }
    vistas.add(forma)

    const montoBruto = typeof item === 'string' ? null : item?.montoUF
    let montoUF = null
    if (montoBruto !== null && montoBruto !== undefined && montoBruto !== '') {
      montoUF = Number(montoBruto)
      if (!Number.isFinite(montoUF) || montoUF < 0) {
        return { ok: false, error: `Monto inválido en ${FORMA_LABEL[forma]}.` }
      }
      montoUF = +montoUF.toFixed(6)
    }

    const cuotasBruto = typeof item === 'string' ? null : item?.cuotas
    let cuotas = null
    if (cuotasBruto !== null && cuotasBruto !== undefined && cuotasBruto !== '') {
      cuotas = Number(cuotasBruto)
      if (!Number.isInteger(cuotas) || cuotas < 1) {
        return { ok: false, error: 'La cantidad de cuotas debe ser un número entero mayor a cero.' }
      }
      if (forma !== 'CUOTAS') {
        return { ok: false, error: `Solo la forma Cuotas puede llevar cantidad de cuotas.` }
      }
    }

    const notas = typeof item === 'string' ? null : (item?.notas || null)

    formas.push({ forma, montoUF, cuotas, notas })
  }

  const asignadoUF = +formas.reduce((s, f) => s + num(f.montoUF), 0).toFixed(6)
  const total = num(precioFinalUF)
  if (asignadoUF - total > TOLERANCIA) {
    return {
      ok: false,
      error: `Las formas de pago suman ${asignadoUF.toFixed(2)} UF y la venta es de ${total.toFixed(2)} UF.`,
    }
  }

  return {
    ok: true,
    formas,
    asignadoUF,
    faltanteUF: +Math.max(total - asignadoUF, 0).toFixed(6),
  }
}

// Hay beneficios de cuotas cargados sin `meses`, con el número solo en el
// nombre ("Crédito directo 6 cuotas"): se lee de ahí como último recurso.
const cuotasDe = (b) => {
  if (!b) return null
  if (b.meses) return Number(b.meses)
  const m = /(\d+)\s*cuotas/i.exec(b.nombre || '')
  return m ? Number(m[1]) : null
}

/**
 * Cantidad de cuotas pactada en la venta: la que se guardó en la forma CUOTAS
 * y, si no hay, la del beneficio de cuotas sin interés (promoción o beneficio).
 */
function cuotasPactadas({ formasPago = [], promociones = [], beneficios = [] } = {}) {
  const enForma = formasPago.find(f => f.forma === 'CUOTAS')?.cuotas
  if (enForma) return Number(enForma)

  const promo = promociones.find(p => p.promocion?.tipo === 'CUOTAS_SIN_INTERES')
  const dePromo = cuotasDe(promo?.promocion)
  if (dePromo) return dePromo

  const beneficio = beneficios.find(b => b.beneficio?.tipo === 'CUOTAS_SIN_INTERES')
  return cuotasDe(beneficio?.beneficio)
}

/**
 * Texto corto para listados y reportes: "Al contado", "Transferencia + 12 cuotas".
 */
function resumenFormasPago(venta = {}) {
  const formas = venta.formasPago || []
  if (formas.length === 0) return 'Al contado'
  const n = cuotasPactadas(venta)
  return formas
    .map(f => (f.forma === 'CUOTAS' && n ? `${n} cuotas` : FORMA_LABEL[f.forma]))
    .join(' + ')
}

module.exports = {
  FORMAS_VALIDAS,
  FORMA_LABEL,
  normalizarFormasPago,
  cuotasPactadas,
  resumenFormasPago,
}
