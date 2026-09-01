/**
 * Presupuesto por cuenta y subcuenta: cómo vamos contra lo planificado.
 *
 * La regla de siempre: la EJECUCIÓN nunca se guarda, se calcula. Tres cifras por
 * cuenta y período:
 *
 *   · Presupuesto  — lo que se decidió gastar (tabla Presupuesto, por subcuenta y mes)
 *   · Ejecutado    — lo efectivamente pagado: documentos/facturas de esa cuenta con
 *                    conciliación del banco, al peso real del pago
 *   · Comprometido — lo que ya se sabe que va a salir y aún no se paga: provisiones y
 *                    facturas abiertas (UF→CLP con la última UF conocida)
 *   · Disponible   — presupuesto − ejecutado − comprometido
 *
 * El PERÍODO de un gasto es el del documento (la provisión de julio cuenta contra julio
 * aunque se pague en agosto): el presupuesto se controla por lo devengado, no por caja.
 * La cuenta grande no tiene presupuesto propio: es la suma de sus subcuentas.
 */

const num = (v) => Number(v ?? 0)

/** Ordena las cuentas en un árbol de dos niveles: [{...cuenta, subcuentas: [...]}] */
function armarArbol(cuentas = []) {
  const raices = cuentas.filter((c) => !c.padreId).sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre))
  const hijas = cuentas.filter((c) => c.padreId)
  return raices.map((r) => ({
    ...r,
    subcuentas: hijas.filter((h) => h.padreId === r.id).sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre)),
  }))
}

const filaEnCero = () => ({ presupuesto: 0, ejecutado: 0, comprometido: 0 })

/**
 * Cruza presupuestos y gastos por cuenta y período.
 *
 * @param {Array} cuentas       filas de CuentaGasto (planas)
 * @param {Array} presupuestos  [{cuentaId, periodo, montoCLP}] ya convertidos a pesos
 * @param {Array} ejecutado     [{cuentaId, periodo, montoCLP}] pagos conciliados
 * @param {Array} comprometido  [{cuentaId, periodo, montoCLP}] saldos abiertos
 * @param {Array<string>} periodos  los 'YYYY-MM' a reportar, en orden
 * @returns árbol con { porPeriodo: {periodo: fila}, total: fila } en cada cuenta,
 *          donde cada fila trae presupuesto/ejecutado/comprometido/disponible/pct
 */
function ejecucion({ cuentas = [], presupuestos = [], ejecutado = [], comprometido = [], periodos = [] }) {
  const filtro = new Set(periodos)
  const porCuenta = new Map() // cuentaId → Map(periodo → fila)

  const sumar = (lista, campo) => {
    for (const x of lista) {
      if (!x.cuentaId || !filtro.has(x.periodo)) continue
      if (!porCuenta.has(x.cuentaId)) porCuenta.set(x.cuentaId, new Map())
      const meses = porCuenta.get(x.cuentaId)
      if (!meses.has(x.periodo)) meses.set(x.periodo, filaEnCero())
      meses.get(x.periodo)[campo] += num(x.montoCLP)
    }
  }
  sumar(presupuestos, 'presupuesto')
  sumar(ejecutado, 'ejecutado')
  sumar(comprometido, 'comprometido')

  const cerrar = (f) => ({
    ...f,
    disponible: f.presupuesto - f.ejecutado - f.comprometido,
    // % de avance sobre el presupuesto; null cuando no hay presupuesto que comparar.
    pct: f.presupuesto > 0 ? Math.round(((f.ejecutado + f.comprometido) / f.presupuesto) * 100) : null,
  })

  const filaDe = (cuentaId, periodo) => porCuenta.get(cuentaId)?.get(periodo) || filaEnCero()

  const arbol = armarArbol(cuentas).map((raiz) => {
    const subcuentas = raiz.subcuentas.map((s) => {
      const porPeriodo = {}
      const total = filaEnCero()
      for (const p of periodos) {
        const f = filaDe(s.id, p)
        porPeriodo[p] = cerrar(f)
        total.presupuesto += f.presupuesto
        total.ejecutado += f.ejecutado
        total.comprometido += f.comprometido
      }
      return { ...s, porPeriodo, total: cerrar(total) }
    })

    // La raíz también puede tener movimiento propio (documentos clasificados directo en
    // la cuenta grande); se suma junto con sus subcuentas.
    const porPeriodo = {}
    const total = filaEnCero()
    for (const p of periodos) {
      const propia = filaDe(raiz.id, p)
      const f = { ...propia }
      for (const s of subcuentas) {
        f.presupuesto += s.porPeriodo[p].presupuesto
        f.ejecutado += s.porPeriodo[p].ejecutado
        f.comprometido += s.porPeriodo[p].comprometido
      }
      porPeriodo[p] = cerrar(f)
      total.presupuesto += f.presupuesto
      total.ejecutado += f.ejecutado
      total.comprometido += f.comprometido
    }
    return { ...raiz, subcuentas, porPeriodo, total: cerrar(total) }
  })

  // Totales generales (solo raíces: las subcuentas ya están adentro).
  const porPeriodo = {}
  const total = filaEnCero()
  for (const p of periodos) {
    const f = filaEnCero()
    for (const r of arbol) {
      f.presupuesto += r.porPeriodo[p].presupuesto
      f.ejecutado += r.porPeriodo[p].ejecutado
      f.comprometido += r.porPeriodo[p].comprometido
    }
    porPeriodo[p] = cerrar(f)
    total.presupuesto += f.presupuesto
    total.ejecutado += f.ejecutado
    total.comprometido += f.comprometido
  }

  return { cuentas: arbol, porPeriodo, total: cerrar(total), periodos }
}

/** Los 'YYYY-MM' de un año calendario. */
function periodosDelAnio(anio) {
  return Array.from({ length: 12 }, (_, i) => `${anio}-${String(i + 1).padStart(2, '0')}`)
}

module.exports = { ejecucion, armarArbol, periodosDelAnio }
