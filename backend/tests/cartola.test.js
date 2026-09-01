const { test } = require('node:test')
const assert = require('node:assert')
const {
  parsearMonto, fechaISO, parsearAuto, totalesDeCartola,
  verificarCuadre, rangoDeCabecera, huellaMovimiento, procesarCartola,
} = require('../src/lib/cartola')

// Cartola real del portal empresas (recortada). Es CSV con ";" pese a la
// extensión .txt, con montos anglosajones y Cargos/Abonos en columnas aparte.
const CARTOLA = [
  'Nombre;Dirección;Comuna;Ciudad;Cuenta;Moneda;Cartola;Desde;Hasta;Fecha cartola anterior',
  'INMOBILIARIA E Y B UNO SPA;ROSARIO NORTE 555, 402;LAS CONDES;SANTIAGO;927449983;CLP;Provisoria;20260803;20260820;20260802',
  '',
  'Fecha;Descripción;N de documento;Cargos;Abonos;Saldo',
  '20/08;PAGO EN LINEA SII ;001004521266;79,966.00;0.00;11,681,916.00',
  '05/08;TRANSFERENCIA DESDE Chile  DE Marcos Rene Vera;000991771481;0.00;1,040,000.00;11,761,882.00',
  '03/08;COMISION MANTENCION;;20,034.00;0.00;10,721,882.00',
  '',
  'Saldo inicial;Total cargos;Total abonos;Saldo final',
  '10,741,916.00;100,000.00;1,040,000.00;10,741,916.00',
].join('\r\n')

test('parsearMonto: entiende el formato anglosajón del banco y el chileno', () => {
  assert.strictEqual(parsearMonto('21,000.00'), 21000)
  assert.strictEqual(parsearMonto('16,217,452.00'), 16217452)
  assert.strictEqual(parsearMonto('1.234.567,89'), 1234567.89)
  assert.strictEqual(parsearMonto('16588418'), 16588418)
  assert.strictEqual(parsearMonto('-5,000.50'), -5000.5)
  assert.strictEqual(parsearMonto(''), 0)
  assert.strictEqual(parsearMonto(null), 0)
})

test('fechaISO: exige que el campo SEA una fecha, no que la contenga', () => {
  assert.strictEqual(fechaISO('05/08', 2026), '2026-08-05')
  assert.strictEqual(fechaISO('05/08/2026'), '2026-08-05')
  assert.strictEqual(fechaISO('5-8-26'), '2026-08-05')
  // Un monto no debe colar como fecha: "52.00" daría día 52, mes 00.
  assert.strictEqual(fechaISO('16,217,452.00'), null)
  assert.strictEqual(fechaISO('32/01/2026'), null)
  assert.strictEqual(fechaISO('05/13/2026'), null)
})

test('parsearAuto: lee la cartola CSV y separa cargos de abonos', () => {
  const movs = parsearAuto(CARTOLA)
  assert.strictEqual(movs.length, 3)

  const [sii, transferencia, comision] = movs
  assert.strictEqual(sii.fecha, '2026-08-20')
  assert.strictEqual(sii.monto, -79966, 'un cargo va en negativo')
  assert.strictEqual(sii.documento, '001004521266')

  assert.strictEqual(transferencia.fecha, '2026-08-05')
  assert.strictEqual(transferencia.monto, 1040000, 'un abono va en positivo')
  assert.match(transferencia.glosa, /Marcos Rene Vera/)

  assert.strictEqual(comision.monto, -20034)
  assert.strictEqual(comision.documento, null, 'documento vacío queda en null')
})

test('parsearAuto: el año sale de la cabecera, las filas no lo traen', () => {
  const movs = parsearAuto(CARTOLA)
  assert.ok(movs.every((m) => m.fecha.startsWith('2026-')))
})

test('rangoDeCabecera: entiende el formato compacto yyyymmdd del banco', () => {
  assert.deepStrictEqual(rangoDeCabecera(CARTOLA), { desde: '2026-08-03', hasta: '2026-08-20' })
})

test('totalesDeCartola + verificarCuadre: detectan si se perdió una fila', () => {
  const totales = totalesDeCartola(CARTOLA)
  assert.strictEqual(totales.saldoInicial, 10741916)
  assert.strictEqual(totales.totalCargos, 100000)
  assert.strictEqual(totales.totalAbonos, 1040000)

  const movs = parsearAuto(CARTOLA)
  const cuadre = verificarCuadre(movs, totales)
  assert.strictEqual(cuadre.abonos, 1040000)
  assert.strictEqual(cuadre.cargos, 100000)
  assert.strictEqual(cuadre.cuadra, true)

  // Si se pierde un movimiento, el cuadre tiene que avisar.
  const incompleto = verificarCuadre(movs.slice(1), totales)
  assert.strictEqual(incompleto.cuadra, false)
})

test('huellaMovimiento: misma fila = misma huella; cuenta distinta = huella distinta', () => {
  const mov = { fecha: '2026-08-05', glosa: 'TRANSFERENCIA  DE Juan', monto: 1040000, documento: '123' }
  assert.strictEqual(huellaMovimiento(1, mov), huellaMovimiento(1, { ...mov }))
  assert.notStrictEqual(huellaMovimiento(1, mov), huellaMovimiento(2, mov))
  // El saldo NO entra: el banco lo recalcula en cartolas provisorias y cambiaría
  // la huella del mismo movimiento, duplicándolo.
  assert.strictEqual(huellaMovimiento(1, mov), huellaMovimiento(1, { ...mov, saldo: 999 }))
  // Espacios de más en la glosa tampoco deben generar un duplicado.
  assert.strictEqual(huellaMovimiento(1, mov), huellaMovimiento(1, { ...mov, glosa: 'TRANSFERENCIA DE Juan' }))
})

test('procesarCartola: deduplica dentro del mismo archivo', () => {
  const conRepetida = CARTOLA.replace(
    '03/08;COMISION MANTENCION;;20,034.00;0.00;10,721,882.00',
    '03/08;COMISION MANTENCION;;20,034.00;0.00;10,721,882.00\r\n03/08;COMISION MANTENCION;;20,034.00;0.00;10,721,882.00'
  )
  const { movimientos } = procesarCartola(conRepetida, 1)
  assert.strictEqual(movimientos.length, 3, 'la fila repetida no se cuenta dos veces')
})
