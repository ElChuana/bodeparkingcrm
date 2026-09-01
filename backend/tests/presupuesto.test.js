const { test } = require('node:test')
const assert = require('node:assert')
const { ejecucion, armarArbol, periodosDelAnio } = require('../src/lib/presupuesto')

const CUENTAS = [
  { id: 1, nombre: 'Administración', padreId: null, orden: 0 },
  { id: 2, nombre: 'Software', padreId: 1, orden: 0 },
  { id: 3, nombre: 'Contabilidad', padreId: 1, orden: 1 },
  { id: 4, nombre: 'Comercial', padreId: null, orden: 1 },
  { id: 5, nombre: 'Publicidad', padreId: 4, orden: 0 },
]

test('armarArbol: dos niveles, ordenados', () => {
  const arbol = armarArbol(CUENTAS)
  assert.deepStrictEqual(arbol.map((c) => c.nombre), ['Administración', 'Comercial'])
  assert.deepStrictEqual(arbol[0].subcuentas.map((c) => c.nombre), ['Software', 'Contabilidad'])
})

test('periodosDelAnio: los 12 meses', () => {
  const p = periodosDelAnio(2026)
  assert.strictEqual(p.length, 12)
  assert.strictEqual(p[0], '2026-01')
  assert.strictEqual(p[11], '2026-12')
})

test('ejecucion: la subcuenta calcula disponible y la cuenta grande suma a sus hijas', () => {
  const r = ejecucion({
    cuentas: CUENTAS,
    periodos: ['2026-09'],
    presupuestos: [
      { cuentaId: 2, periodo: '2026-09', montoCLP: 300000 },
      { cuentaId: 3, periodo: '2026-09', montoCLP: 400000 },
    ],
    ejecutado: [{ cuentaId: 2, periodo: '2026-09', montoCLP: 120000 }],
    comprometido: [{ cuentaId: 3, periodo: '2026-09', montoCLP: 350000 }],
  })

  const adm = r.cuentas.find((c) => c.id === 1)
  const software = adm.subcuentas.find((c) => c.id === 2)
  const conta = adm.subcuentas.find((c) => c.id === 3)

  assert.strictEqual(software.porPeriodo['2026-09'].disponible, 180000)
  assert.strictEqual(software.porPeriodo['2026-09'].pct, 40)
  assert.strictEqual(conta.porPeriodo['2026-09'].disponible, 50000)

  // La cuenta grande es la suma de sus subcuentas.
  assert.strictEqual(adm.porPeriodo['2026-09'].presupuesto, 700000)
  assert.strictEqual(adm.porPeriodo['2026-09'].ejecutado, 120000)
  assert.strictEqual(adm.porPeriodo['2026-09'].comprometido, 350000)
  assert.strictEqual(adm.porPeriodo['2026-09'].disponible, 230000)

  // Y el total general suma solo las raíces (las hijas ya están adentro).
  assert.strictEqual(r.total.presupuesto, 700000)
  assert.strictEqual(r.porPeriodo['2026-09'].disponible, 230000)
})

test('ejecucion: gasto sin presupuesto → pct null, disponible negativo', () => {
  const r = ejecucion({
    cuentas: CUENTAS,
    periodos: ['2026-09'],
    presupuestos: [],
    ejecutado: [{ cuentaId: 5, periodo: '2026-09', montoCLP: 90000 }],
    comprometido: [],
  })
  const pub = r.cuentas.find((c) => c.id === 4).subcuentas.find((c) => c.id === 5)
  assert.strictEqual(pub.porPeriodo['2026-09'].pct, null)
  assert.strictEqual(pub.porPeriodo['2026-09'].disponible, -90000)
})

test('ejecucion: el movimiento clasificado directo en la cuenta grande también cuenta', () => {
  const r = ejecucion({
    cuentas: CUENTAS,
    periodos: ['2026-09'],
    presupuestos: [{ cuentaId: 2, periodo: '2026-09', montoCLP: 100000 }],
    ejecutado: [{ cuentaId: 1, periodo: '2026-09', montoCLP: 50000 }],
    comprometido: [],
  })
  const adm = r.cuentas.find((c) => c.id === 1)
  assert.strictEqual(adm.porPeriodo['2026-09'].ejecutado, 50000)
  assert.strictEqual(adm.porPeriodo['2026-09'].presupuesto, 100000)
})

test('ejecucion: los períodos fuera del filtro no entran', () => {
  const r = ejecucion({
    cuentas: CUENTAS,
    periodos: ['2026-09'],
    presupuestos: [{ cuentaId: 2, periodo: '2026-08', montoCLP: 999999 }],
    ejecutado: [],
    comprometido: [],
  })
  assert.strictEqual(r.total.presupuesto, 0)
})
