/**
 * Parser de las cartolas que exporta Banco Security.
 *
 * Vive en el backend a propósito: lo usan las DOS vías de entrada de movimientos
 * (la subida manual del .txt desde el ERP y el POST del scraper), así que hay un
 * solo lugar donde arreglar el formato cuando el banco lo cambie.
 *
 * El formato real de la cartola de cuenta corriente empresa (verificado sobre
 * archivos reales) es CSV con ";" en latin1, pese a la extensión .txt:
 *
 *   Nombre;Dirección;...;Cuenta;Moneda;Cartola;Desde;Hasta;...
 *   INMOBILIARIA ... ;ROSARIO NORTE ...;...
 *   Fecha;Descripción;N de documento;Cargos;Abonos;Saldo
 *   05/08;PAGO EN LINEA SII ;123456789012;21,000.00;0.00;12,345,678.90
 *
 * Tres trampas ya resueltas acá:
 *   - los montos vienen en formato ANGLOSAJÓN (coma miles, punto decimal),
 *     no chileno, pese a ser un banco chileno operando en pesos;
 *   - Cargos y Abonos son columnas separadas, ambas presentes con "0.00";
 *   - las filas traen la fecha sin año (dd/mm) — el año sale de la cabecera.
 *
 * Salida normalizada: { fecha, glosa, monto, saldo, documento, origen }
 *   monto > 0 = abono   |   monto < 0 = cargo
 */

const crypto = require('crypto')

/**
 * Convierte un monto a número detectando el formato.
 *   "21,000.00"    → 21000       (anglosajón)
 *   "1.234.567,89" → 1234567.89  (chileno)
 *   "16588418"     → 16588418
 * La regla: el último separador es decimal solo si le siguen 1 o 2 dígitos.
 */
function parsearMonto(txt) {
  if (txt == null) return 0
  const limpio = String(txt).replace(/[^\d.,-]/g, '').trim()
  if (!limpio) return 0

  const negativo = limpio.startsWith('-')
  const num = limpio.replace(/-/g, '')
  const corte = Math.max(num.lastIndexOf(','), num.lastIndexOf('.'))

  let entero = num
  let dec = ''
  if (corte !== -1) {
    const cola = num.slice(corte + 1)
    if (cola.length >= 1 && cola.length <= 2) {
      entero = num.slice(0, corte)
      dec = cola
    }
  }
  entero = entero.replace(/[.,]/g, '')
  const n = Number(`${entero || '0'}.${dec || '0'}`)
  if (!Number.isFinite(n)) return 0
  return negativo ? -n : n
}

/** "05/08/2026" | "5-8-26" | "05/08" → "2026-08-05" */
function fechaISO(txt, anioPorDefecto) {
  if (!txt) return null
  // Anclado: el campo debe SER una fecha, no contenerla. Sin esto un monto como
  // "16,217,452.00" matcheaba "52.00" y producía un día 52 de mes 00.
  const m = String(txt).trim().match(/^(\d{1,2})[/\-.](\d{1,2})(?:[/\-.](\d{2,4}))?$/)
  if (!m) return null
  const [, d, mes, a] = m
  const dia = Number(d), nmes = Number(mes)
  if (dia < 1 || dia > 31 || nmes < 1 || nmes > 12) return null
  let anio = a ?? String(anioPorDefecto ?? new Date().getFullYear())
  if (anio.length === 2) anio = `20${anio}`
  return `${anio}-${mes.padStart(2, '0')}-${d.padStart(2, '0')}`
}

const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()

/** Saca el año de la cabecera de la cartola (columna "Desde"), que las filas no traen. */
function anioDeCabecera(lineas) {
  if (lineas.length < 2) return null
  const campos = lineas[0].split(';').map(norm)
  const valores = lineas[1].split(';')
  for (const clave of ['desde', 'hasta', 'fecha cartola anterior']) {
    const i = campos.indexOf(clave)
    if (i >= 0 && valores[i]) {
      const m = valores[i].match(/(\d{4})/)
      if (m) return Number(m[1])
      const iso = fechaISO(valores[i])
      if (iso) return Number(iso.slice(0, 4))
    }
  }
  return null
}

/** Rango que cubre la cartola, según su cabecera. Sirve para el registro de la carga. */
function rangoDeCabecera(texto) {
  const lineas = texto.split(/\r?\n/)
  if (lineas.length < 2) return { desde: null, hasta: null }
  const campos = lineas[0].split(';').map(norm)
  const valores = lineas[1].split(';')
  const leer = (clave) => {
    const i = campos.indexOf(clave)
    if (i < 0 || !valores[i]) return null
    const v = valores[i].trim()
    // El banco escribe el rango como "20260803" (yyyymmdd) o como "03/08/2026"
    const compacto = v.match(/^(\d{4})(\d{2})(\d{2})$/)
    if (compacto) return `${compacto[1]}-${compacto[2]}-${compacto[3]}`
    return fechaISO(v)
  }
  return { desde: leer('desde'), hasta: leer('hasta') }
}

/**
 * Cartola de cuenta corriente en CSV ";" — el formato real del portal empresas.
 * Localiza la fila de encabezados y mapea las columnas por nombre, así que
 * aguanta que el banco reordene o agregue columnas.
 */
function parsearCartolaCsv(texto, { anio } = {}) {
  const lineas = texto.split(/\r?\n/)

  let iCab = -1
  let cols = null
  for (let i = 0; i < Math.min(lineas.length, 15); i++) {
    const c = lineas[i].split(';').map(norm)
    if (c.some((x) => x === 'fecha') && c.some((x) => x.startsWith('descrip'))) {
      iCab = i
      cols = c
      break
    }
  }
  if (iCab === -1) return []

  const idx = (...nombres) => {
    for (const n of nombres) {
      const i = cols.findIndex((c) => c === n || c.startsWith(n))
      if (i >= 0) return i
    }
    return -1
  }

  const iFecha = idx('fecha')
  const iGlosa = idx('descrip', 'detalle', 'glosa')
  const iDoc = idx('n de documento', 'n documento', 'documento', 'nro documento')
  const iCargo = idx('cargo', 'debito')
  const iAbono = idx('abono', 'credito')
  const iSaldo = idx('saldo')

  const anioFinal = anio ?? anioDeCabecera(lineas) ?? new Date().getFullYear()

  const movs = []
  for (const linea of lineas.slice(iCab + 1)) {
    const p = linea.split(';')
    if (p.length < 4) continue

    const fecha = fechaISO(p[iFecha], anioFinal)
    if (!fecha) continue

    const cargo = iCargo >= 0 ? Math.abs(parsearMonto(p[iCargo])) : 0
    const abono = iAbono >= 0 ? Math.abs(parsearMonto(p[iAbono])) : 0

    // Una de las dos columnas trae "0.00"; si ambas son cero no es un movimiento.
    let monto = 0
    if (abono > 0) monto = abono
    else if (cargo > 0) monto = -cargo
    else continue

    movs.push({
      fecha,
      glosa: (p[iGlosa] ?? '').trim(),
      monto,
      saldo: iSaldo >= 0 ? parsearMonto(p[iSaldo]) : null,
      documento: (p[iDoc] ?? '').trim() || null,
      origen: 'cartola-csv',
    })
  }
  return movs
}

/**
 * Cartola histórica en TXT de ancho fijo (el botón TXT de la cartola histórica).
 *   "2" + fecha(10) + glosa(50) + documento(9) + tipo(C|A) + "+" + monto + saldo
 */
function parsearAnchoFijo(texto) {
  const movs = []
  for (const cruda of texto.split('\n')) {
    const linea = cruda.replace(/\r$/, '')
    if (!linea.startsWith('2')) continue

    const fecha = fechaISO(linea.slice(1, 11))
    if (!fecha) continue

    const glosa = linea.slice(11, 61).trim()
    const documento = linea.slice(61, 70).trim()
    const tipo = linea.slice(70, 71) // C = cargo, A = abono
    const resto = linea.slice(72).trim().split(/\s+/)

    let monto = parsearMonto(resto[0])
    if (!monto) continue
    monto = tipo === 'C' ? -Math.abs(monto) : Math.abs(monto)

    movs.push({
      fecha,
      glosa,
      monto,
      saldo: resto[1] ? parsearMonto(resto[1]) : null,
      documento: documento || null,
      origen: 'cartola-txt',
    })
  }
  return movs
}

/** Transferencias recibidas, TXT con "|": fecha|cliente|rut|?|?|monto */
function parsearPipe(texto) {
  const movs = []
  for (const linea of texto.split(/\r?\n/).slice(1)) {
    const p = linea.split('|')
    if (p.length < 6) continue
    const fecha = fechaISO(p[0])
    if (!fecha) continue
    const monto = parsearMonto(p[5])
    if (!monto) continue
    movs.push({
      fecha,
      glosa: (p[1] || '').trim(),
      monto: Math.abs(monto), // las recibidas siempre son abonos
      saldo: null,
      documento: (p[2] || '').trim() || null,
      contraparteRut: (p[2] || '').trim() || null,
      origen: 'transferencias-recibidas',
    })
  }
  return movs
}

/** Elige el parser según cómo se ve el contenido. */
function parsearAuto(texto, opciones = {}) {
  const muestra = texto.split(/\r?\n/).slice(0, 15)
  const hayCabeceraCartola = muestra.some((l) => {
    const c = l.split(';').map(norm)
    return c.some((x) => x === 'fecha') && c.some((x) => x.startsWith('descrip'))
  })
  if (hayCabeceraCartola) return parsearCartolaCsv(texto, opciones)
  if (muestra.join('\n').includes('|')) return parsearPipe(texto)
  return parsearAnchoFijo(texto)
}

/**
 * La cartola trae al final una fila de totales:
 *   Saldo inicial;Total cargos;Total abonos;Saldo final
 *   16,217,452.00;13,908,296.00;9,372,760.00;11,681,916.00
 * Sirve para verificar que no se perdió ningún movimiento al parsear.
 */
function totalesDeCartola(texto) {
  const lineas = texto.split(/\r?\n/)
  for (let i = 0; i < lineas.length; i++) {
    const c = lineas[i].split(';').map(norm)
    if (c.some((x) => x.startsWith('saldo inicial')) && c.some((x) => x.startsWith('total cargo'))) {
      const v = (lineas[i + 1] || '').split(';')
      const en = (nombre) => {
        const j = c.findIndex((x) => x.startsWith(nombre))
        return j >= 0 ? parsearMonto(v[j]) : null
      }
      return {
        saldoInicial: en('saldo inicial'),
        totalCargos: en('total cargo'),
        totalAbonos: en('total abono'),
        saldoFinal: en('saldo final'),
      }
    }
  }
  return null
}

/**
 * Comprueba que los movimientos parseados reproducen los totales del banco.
 *
 * La validación fuerte son los totales de cargos y abonos: si cuadran, no se
 * perdió ni se duplicó ninguna fila. El saldo se contrasta contra el saldo del
 * último movimiento, NO contra la columna "Saldo final" de la fila de totales:
 * en las cartolas provisorias el banco repite ahí el saldo inicial, así que ese
 * campo no es confiable.
 */
function verificarCuadre(movs, totales) {
  if (!totales) return { cuadra: null, motivo: 'la cartola no trae fila de totales' }

  const abonos = movs.filter((m) => m.monto > 0).reduce((a, m) => a + m.monto, 0)
  const cargos = movs.filter((m) => m.monto < 0).reduce((a, m) => a - m.monto, 0)
  const calculado = (totales.saldoInicial ?? 0) + abonos - cargos

  // El archivo puede venir en orden cronológico o invertido (el portal lo manda
  // con el movimiento más reciente primero), así que el "saldo final" es el del
  // movimiento de fecha más nueva, no el de la última línea.
  let saldoUltimo = null
  if (movs.length) {
    const primero = movs[0], ultimo = movs[movs.length - 1]
    saldoUltimo = primero.fecha > ultimo.fecha ? primero.saldo : ultimo.saldo
  }

  const cerca = (a, b) => a != null && b != null && Math.abs(a - b) < 1

  const totalesOk = cerca(abonos, totales.totalAbonos) && cerca(cargos, totales.totalCargos)
  const saldoOk = saldoUltimo == null ? true : cerca(calculado, saldoUltimo)

  return {
    cuadra: totalesOk && saldoOk,
    abonos,
    cargos,
    saldoCalculado: calculado,
    saldoMasReciente: saldoUltimo,
    esperado: totales,
    // El banco a veces manda mal este campo; queda como aviso, no como error.
    saldoFinalDelBancoRaro: !cerca(totales.saldoFinal, calculado),
  }
}

/**
 * Clave de deduplicación de un movimiento. La misma cartola se puede subir dos
 * veces, o el scraper solaparse con una subida manual: sin esto se duplicarían
 * las filas y la conciliación mostraría plata que no existe.
 *
 * No entra el saldo: el banco lo recalcula en cartolas provisorias y cambiaría
 * la huella del mismo movimiento.
 *
 * `ordinal` es para las fuentes que NO traen número de documento, como el libro banco del
 * contador. Ahí dos filas idénticas el mismo día —dos sueldos iguales pagados el 9 de enero—
 * son dos transferencias reales, y sin distinguirlas la deduplicación se come una y el mes
 * queda con menos gasto del que hubo. Solo se agrega desde la segunda ocurrencia, así que la
 * huella de todo lo ya cargado no cambia.
 */
function huellaMovimiento(cuentaId, mov) {
  const base = [
    cuentaId,
    mov.fecha,
    norm(mov.glosa).replace(/\s+/g, ' '),
    Number(mov.monto).toFixed(2),
    mov.documento || '',
  ].join('|')
  const clave = mov.ordinal > 1 ? `${base}|#${mov.ordinal}` : base
  return crypto.createHash('sha1').update(clave).digest('hex')
}

/** Quita repetidos dentro de un mismo lote (por huella). */
function deduplicar(cuentaId, movs) {
  const vistos = new Set()
  return movs.filter((m) => {
    const h = huellaMovimiento(cuentaId, m)
    if (vistos.has(h)) return false
    vistos.add(h)
    return true
  })
}

/**
 * Punto de entrada único: texto crudo de la cartola → todo lo que necesita el
 * controlador para grabar la carga.
 */
function procesarCartola(texto, cuentaId) {
  const movimientos = deduplicar(cuentaId, parsearAuto(texto))
  const totales = totalesDeCartola(texto)
  return {
    movimientos,
    totales,
    cuadre: verificarCuadre(movimientos, totales),
    rango: rangoDeCabecera(texto),
  }
}

module.exports = {
  parsearMonto,
  fechaISO,
  parsearCartolaCsv,
  parsearAnchoFijo,
  parsearPipe,
  parsearAuto,
  totalesDeCartola,
  verificarCuadre,
  rangoDeCabecera,
  huellaMovimiento,
  deduplicar,
  procesarCartola,
}
