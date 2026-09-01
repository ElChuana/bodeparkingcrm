const { test } = require('node:test')
const assert = require('node:assert')
const { ocurrencias, proyectar, fechaEnMes } = require('../src/lib/gastosProgramados')

// Acá viven las trampas de calendario: el día 31 en meses de 30, los gastos que empiezan
// o terminan a mitad de la ventana, y la periodicidad que no es mensual.

const U = (s) => new Date(s + 'T00:00:00.000Z')
const gasto = (o = {}) => ({
  id: 1, activo: true, nombre: 'Arriendo oficina', montoUF: 16,
  periodicidad: 'MENSUAL', diaVencimiento: 5, fechaInicio: U('2026-01-05'), fechaFin: null, ...o,
})

test('fechaEnMes: el día 31 no se desborda al mes siguiente', () => {
  // Un gasto que se paga el 31 cae el 28 en febrero, no el 3 de marzo.
  assert.strictEqual(fechaEnMes(2026, 1, 31).getUTCDate(), 28) // feb 2026
  assert.strictEqual(fechaEnMes(2026, 1, 31).getUTCMonth(), 1)
  assert.strictEqual(fechaEnMes(2026, 3, 31).getUTCDate(), 30) // abril
  assert.strictEqual(fechaEnMes(2026, 0, 31).getUTCDate(), 31) // enero sí tiene 31
})

test('ocurrencias: un gasto mensual cae una vez por mes en su día', () => {
  const o = ocurrencias(gasto(), U('2026-09-01'), U('2026-11-30'))
  assert.deepStrictEqual(o.map(x => x.periodo), ['2026-09', '2026-10', '2026-11'])
  assert.ok(o.every(x => x.fecha.getUTCDate() === 5))
})

test('ocurrencias: respeta la fecha de término', () => {
  const o = ocurrencias(gasto({ fechaFin: U('2026-10-31') }), U('2026-09-01'), U('2026-12-31'))
  assert.deepStrictEqual(o.map(x => x.periodo), ['2026-09', '2026-10'])
})

test('ocurrencias: no proyecta antes de que el gasto empiece', () => {
  const o = ocurrencias(gasto({ fechaInicio: U('2026-11-05') }), U('2026-09-01'), U('2026-12-31'))
  assert.deepStrictEqual(o.map(x => x.periodo), ['2026-11', '2026-12'])
})

test('ocurrencias: un gasto trimestral cae cada 3 meses desde su inicio', () => {
  // Y en los meses correctos: si empieza en febrero, cae feb/may/ago/nov, no en el
  // trimestre calendario.
  const o = ocurrencias(gasto({ periodicidad: 'TRIMESTRAL', fechaInicio: U('2026-02-10'), diaVencimiento: 10 }),
    U('2026-01-01'), U('2026-12-31'))
  assert.deepStrictEqual(o.map(x => x.periodo), ['2026-02', '2026-05', '2026-08', '2026-11'])
})

test('ocurrencias: anual y semestral', () => {
  const anual = ocurrencias(gasto({ periodicidad: 'ANUAL', fechaInicio: U('2026-03-01') }), U('2026-01-01'), U('2028-12-31'))
  assert.deepStrictEqual(anual.map(x => x.periodo), ['2026-03', '2027-03', '2028-03'])
  const sem = ocurrencias(gasto({ periodicidad: 'SEMESTRAL', fechaInicio: U('2026-01-05') }), U('2026-01-01'), U('2026-12-31'))
  assert.deepStrictEqual(sem.map(x => x.periodo), ['2026-01', '2026-07'])
})

test('ocurrencias: un gasto único cae una sola vez, en su fecha', () => {
  const g = gasto({ periodicidad: 'UNICO', fechaInicio: U('2026-10-15') })
  assert.deepStrictEqual(ocurrencias(g, U('2026-09-01'), U('2026-12-31')).map(x => x.periodo), ['2026-10'])
  assert.deepStrictEqual(ocurrencias(g, U('2026-11-01'), U('2026-12-31')), [])
})

test('ocurrencias: un gasto inactivo no proyecta nada', () => {
  assert.deepStrictEqual(ocurrencias(gasto({ activo: false }), U('2026-01-01'), U('2026-12-31')), [])
})

test('proyectar: convierte UF a pesos y descarta lo ya pagado', () => {
  // La ocurrencia de septiembre ya tiene su cargo en el banco: no se proyecta, o el mes
  // contaría el arriendo dos veces (el real y el proyectado).
  const pagadas = new Set(['1|2026-09'])
  const p = proyectar([gasto()], U('2026-09-01'), U('2026-11-30'), 40000, pagadas)
  assert.deepStrictEqual(p.map(x => x.periodo), ['2026-10', '2026-11'])
  assert.strictEqual(p[0].montoCLP, 640000) // 16 UF × 40.000
})

test('proyectar: un gasto pactado en pesos no se convierte', () => {
  const p = proyectar([gasto({ montoUF: null, montoCLP: 350000 })], U('2026-09-01'), U('2026-09-30'), 40000)
  assert.strictEqual(p[0].montoCLP, 350000)
})

test('proyectar: descarta las ocurrencias sin monto', () => {
  assert.deepStrictEqual(proyectar([gasto({ montoUF: null, montoCLP: null })], U('2026-09-01'), U('2026-12-31'), 40000), [])
})
