const { test } = require('node:test')
const assert = require('node:assert')
const { generarPlanPago, sumarMeses } = require('../src/lib/planPago')

const sum = (cuotas) => Math.round(cuotas.reduce((s, c) => s + c.montoUF, 0) * 100) / 100
const soloCuotas = (r) => r.cuotas.filter(c => c.tipo === 'CUOTA')

test('reparte el saldo en cuotas iguales y el total reconstruye el precio', () => {
  const r = generarPlanPago({ precioUF: 100, pieUF: 20, numCuotas: 4, fechaPrimeraCuota: '2026-11-05' })
  assert.strictEqual(r.ok, true)
  assert.strictEqual(r.cuotaUF, 20)
  assert.deepStrictEqual(soloCuotas(r).map(c => c.montoUF), [20, 20, 20, 20])
  assert.strictEqual(sum(r.cuotas), 100)
})

test('las cuotas quedan iguales aunque el saldo no divida exacto: el residuo va al pie', () => {
  // 100 - 10 = 90 en 7 cuotas → 12.857… → 12.86 x 7 = 90.02, sobran -0.02
  const r = generarPlanPago({ precioUF: 100, pieUF: 10, numCuotas: 7, fechaPrimeraCuota: '2026-11-05' })
  assert.strictEqual(r.ok, true)
  const montos = soloCuotas(r).map(c => c.montoUF)
  assert.strictEqual(new Set(montos).size, 1, 'todas las cuotas deben ser idénticas')
  assert.strictEqual(r.ajustadoEn, 'PIE')
  assert.strictEqual(sum(r.cuotas), 100, 'el plan igual debe sumar el precio')
})

test('sin pie el residuo lo absorbe la reserva', () => {
  const r = generarPlanPago({
    precioUF: 100, reservaUF: 5, fechaReserva: '2026-10-20',
    numCuotas: 3, fechaPrimeraCuota: '2026-11-20',
  })
  assert.strictEqual(r.ok, true)
  assert.strictEqual(new Set(soloCuotas(r).map(c => c.montoUF)).size, 1)
  assert.strictEqual(r.ajustadoEn, 'RESERVA')
  assert.strictEqual(sum(r.cuotas), 100)
})

test('sin pie ni reserva ni escritura el residuo cae en la última cuota', () => {
  const r = generarPlanPago({ precioUF: 100, numCuotas: 3, fechaPrimeraCuota: '2026-11-05' })
  assert.strictEqual(r.ok, true)
  assert.strictEqual(r.ajustadoEn, 'ULTIMA_CUOTA')
  const m = soloCuotas(r).map(c => c.montoUF)
  assert.strictEqual(m[0], m[1], 'las anteriores siguen iguales entre sí')
  assert.strictEqual(sum(r.cuotas), 100)
})

test('el pie se puede pactar como porcentaje del precio', () => {
  const r = generarPlanPago({ precioUF: 200, piePorcentaje: 20, numCuotas: 8, fechaPrimeraCuota: '2026-11-10' })
  assert.strictEqual(r.ok, true)
  assert.strictEqual(r.cuotas.find(c => c.tipo === 'PIE').montoUF, 40)
  assert.strictEqual(r.cuotaUF, 20)
  assert.strictEqual(sum(r.cuotas), 200)
})

test('las cuotas vencen mes a mes desde la primera', () => {
  const r = generarPlanPago({ precioUF: 90, numCuotas: 3, fechaPrimeraCuota: '2026-11-15' })
  assert.deepStrictEqual(soloCuotas(r).map(c => c.fechaVencimiento),
    ['2026-11-15', '2026-12-15', '2027-01-15'])
})

test('un vencimiento el 31 cae al último día de los meses cortos', () => {
  assert.strictEqual(sumarMeses('2027-01-31', 1), '2027-02-28')
  assert.strictEqual(sumarMeses('2028-01-31', 1), '2028-02-29')
  assert.strictEqual(sumarMeses('2026-10-31', 1), '2026-11-30')
  assert.strictEqual(sumarMeses('2026-12-15', 1), '2027-01-15')
})

test('arma reserva + pie + cuotas + escritura en orden', () => {
  const r = generarPlanPago({
    precioUF: 150, reservaUF: 5, fechaReserva: '2026-10-15',
    pieUF: 25, fechaPie: '2026-11-01',
    numCuotas: 6, fechaPrimeraCuota: '2026-12-01',
    escrituraUF: 30, fechaEscritura: '2027-06-01',
  })
  assert.strictEqual(r.ok, true)
  assert.deepStrictEqual(r.cuotas.map(c => c.tipo),
    ['RESERVA', 'PIE', 'CUOTA', 'CUOTA', 'CUOTA', 'CUOTA', 'CUOTA', 'CUOTA', 'ESCRITURA'])
  assert.strictEqual(r.saldoCuotasUF, 90)
  assert.strictEqual(r.cuotaUF, 15)
  assert.strictEqual(sum(r.cuotas), 150)
})

test('acepta un plan sin cuotas: solo pie y escritura', () => {
  const r = generarPlanPago({
    precioUF: 100, pieUF: 40, fechaPie: '2026-11-01',
    escrituraUF: 60, fechaEscritura: '2027-01-01', numCuotas: 0,
  })
  assert.strictEqual(r.ok, true)
  assert.deepStrictEqual(r.cuotas.map(c => c.tipo), ['PIE', 'ESCRITURA'])
  assert.strictEqual(sum(r.cuotas), 100)
})

test('rechaza que el pie supere el precio', () => {
  const r = generarPlanPago({ precioUF: 100, pieUF: 120, numCuotas: 3, fechaPrimeraCuota: '2026-11-05' })
  assert.strictEqual(r.ok, false)
  assert.match(r.error, /superan el precio/)
})

test('avisa si queda saldo sin repartir y no hay cuotas', () => {
  const r = generarPlanPago({ precioUF: 100, pieUF: 30, numCuotas: 0, fechaPie: '2026-11-01' })
  assert.strictEqual(r.ok, false)
  assert.match(r.error, /sin repartir/)
})

test('pide la fecha de la primera cuota', () => {
  const r = generarPlanPago({ precioUF: 100, pieUF: 20, numCuotas: 4 })
  assert.strictEqual(r.ok, false)
  assert.match(r.error, /primera cuota/)
})

test('rechaza precio cero o ausente', () => {
  assert.strictEqual(generarPlanPago({ numCuotas: 3 }).ok, false)
  assert.strictEqual(generarPlanPago({ precioUF: 0, numCuotas: 3 }).ok, false)
})

test('el pie absorbe el residuo sin descuadrar el total, en varios repartos difíciles', () => {
  for (const [precio, pie, n] of [[146.61, 20, 7], [97.08, 10, 3], [328.24, 50, 11], [60.57, 5, 6]]) {
    const r = generarPlanPago({ precioUF: precio, pieUF: pie, numCuotas: n, fechaPrimeraCuota: '2026-11-05' })
    assert.strictEqual(r.ok, true, `${precio}/${pie}/${n}`)
    assert.strictEqual(new Set(soloCuotas(r).map(c => c.montoUF)).size, 1, `cuotas desiguales en ${precio}/${pie}/${n}`)
    assert.strictEqual(sum(r.cuotas), Math.round(precio * 100) / 100, `descuadre en ${precio}/${pie}/${n}`)
  }
})

// ─── derivar el plan desde las formas de pago ────────────────────
const { parametrosDesdeFormasPago } = require('../src/lib/planPago')

test('el pie sale de las formas al contado y el saldo de la forma Cuotas', () => {
  const r = parametrosDesdeFormasPago([
    { forma: 'TRANSFERENCIA', montoUF: 20 },
    { forma: 'CUOTAS', montoUF: 38.12, cuotas: 6 },
  ], 58.12)
  assert.strictEqual(r.pieUF, 20)
  assert.strictEqual(r.numCuotas, 6)
  assert.strictEqual(r.saldoCuotasUF, 38.12)
  assert.strictEqual(r.calza, true)
  assert.strictEqual(r.aviso, null)
})

test('suma varias formas al contado en un solo pie', () => {
  const r = parametrosDesdeFormasPago([
    { forma: 'TRANSFERENCIA', montoUF: 10 },
    { forma: 'VALE_VISTA', montoUF: 5 },
    { forma: 'TARJETA', montoUF: 5 },
    { forma: 'CUOTAS', montoUF: 80, cuotas: 10 },
  ], 100)
  assert.strictEqual(r.pieUF, 20)
  assert.strictEqual(r.saldoCuotasUF, 80)
  assert.strictEqual(r.calza, true)
})

test('avisa cuando las formas no cubren el precio', () => {
  const r = parametrosDesdeFormasPago([
    { forma: 'TRANSFERENCIA', montoUF: 20 },
    { forma: 'CUOTAS', montoUF: 30, cuotas: 6 },
  ], 100)
  assert.strictEqual(r.calza, false)
  assert.strictEqual(r.saldoCuotasUF, 80)
  assert.match(r.aviso, /50,00 UF sin asignar/)
})

test('avisa distinto cuando la forma Cuotas viene sin monto', () => {
  const r = parametrosDesdeFormasPago([
    { forma: 'TRANSFERENCIA', montoUF: 36.69 },
    { forma: 'CUOTAS', montoUF: null, cuotas: 8 },
  ], 97.59)
  assert.strictEqual(r.calza, false)
  assert.strictEqual(r.saldoCuotasUF, 60.9)
  assert.match(r.aviso, /no tiene monto pactado/)
  assert.doesNotMatch(r.aviso, /0,00 UF pactados/)
})

test('avisa cuando las formas se pasan del precio', () => {
  const r = parametrosDesdeFormasPago([
    { forma: 'TRANSFERENCIA', montoUF: 80 },
    { forma: 'CUOTAS', montoUF: 40, cuotas: 4 },
  ], 100)
  assert.strictEqual(r.calza, false)
  assert.match(r.aviso, /se pasan por 20,00 UF/)
})

test('toma el número de cuotas del beneficio si la forma no lo trae', () => {
  const r = parametrosDesdeFormasPago([{ forma: 'CUOTAS', montoUF: 100 }], 100, 8)
  assert.strictEqual(r.numCuotas, 8)
  assert.strictEqual(r.pieUF, 0)
})

test('sin forma Cuotas no hay nada que avisar', () => {
  const r = parametrosDesdeFormasPago([{ forma: 'TRANSFERENCIA', montoUF: 100 }], 100)
  assert.strictEqual(r.calza, true)
  assert.strictEqual(r.numCuotas, 0)
  assert.strictEqual(r.pieUF, 100)
})

test('el plan derivado de las formas reparte el saldo en cuotas iguales', () => {
  const formas = [{ forma: 'TRANSFERENCIA', montoUF: 20 }, { forma: 'CUOTAS', montoUF: 38.12, cuotas: 6 }]
  const d = parametrosDesdeFormasPago(formas, 58.12)
  const plan = generarPlanPago({
    precioUF: 58.12, pieUF: d.pieUF, fechaPie: '2026-11-01',
    numCuotas: d.numCuotas, fechaPrimeraCuota: '2026-12-01',
  })
  assert.strictEqual(plan.ok, true)
  const cuotas = plan.cuotas.filter(c => c.tipo === 'CUOTA')
  assert.strictEqual(cuotas.length, 6)
  assert.strictEqual(new Set(cuotas.map(c => c.montoUF)).size, 1)
  assert.strictEqual(sum(plan.cuotas), 58.12)
})

test('el pie sale de lo marcado como PIE, no de deducirlo', () => {
  // Dos transferencias: una es el pie y la otra paga una parte al contado.
  const r = parametrosDesdeFormasPago([
    { forma: 'TRANSFERENCIA', destino: 'PIE', montoUF: 20 },
    { forma: 'VALE_VISTA', destino: 'CONTADO', montoUF: 30 },
    { forma: 'CUOTAS', destino: 'SALDO', montoUF: 50, cuotas: 5 },
  ], 100)
  assert.strictEqual(r.pieUF, 20)
  assert.strictEqual(r.contadoUF, 30)
  assert.strictEqual(r.saldoCuotasUF, 50)
  assert.strictEqual(r.calza, true)
})

test('una venta sin destinos marcados sigue funcionando como antes', () => {
  const r = parametrosDesdeFormasPago([
    { forma: 'TRANSFERENCIA', montoUF: 41.56 },
    { forma: 'CUOTAS', montoUF: 50.12, cuotas: 7 },
  ], 91.68)
  assert.strictEqual(r.pieUF, 41.56)
  assert.strictEqual(r.contadoUF, 0)
  assert.strictEqual(r.calza, true)
})

test('lo marcado al contado no infla el pie del plan', () => {
  const r = parametrosDesdeFormasPago([
    { forma: 'TRANSFERENCIA', destino: 'CONTADO', montoUF: 60 },
    { forma: 'CUOTAS', destino: 'SALDO', montoUF: 40, cuotas: 4 },
  ], 100)
  assert.strictEqual(r.pieUF, 0, 'nada marcado como pie → pie cero')
  assert.strictEqual(r.contadoUF, 60)
  assert.strictEqual(r.saldoCuotasUF, 40)
})
