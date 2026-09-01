const { test } = require('node:test')
const assert = require('node:assert')
const { saldoAFavor, porCliente, devueltoAClientes } = require('../src/lib/saldoCliente')

// Tres situaciones que antes dejaban plata pegada: pagó de más, pagó un tercero, hay que
// devolverle. El modelo es un estacionamiento: la plata sin destino queda "a cuenta".

const abono = (monto, o = {}) => ({ id: 1, contactoId: 7, monto, movimiento: { monto: 1000000, fecha: new Date('2026-08-01'), glosa: 'TEF' }, ...o })
const cargo = (monto, o = {}) => ({ id: 2, contactoId: 7, monto, movimiento: { monto: -1000000, fecha: new Date('2026-09-01'), glosa: 'TEF' }, ...o })

test('saldoAFavor: un abono suma y una devolución resta', () => {
  assert.strictEqual(saldoAFavor([abono(1000000)]), 1000000)
  assert.strictEqual(saldoAFavor([abono(1000000), cargo(300000)]), 700000)
  assert.strictEqual(saldoAFavor([]), 0)
})

test('saldoAFavor: el signo lo pone el movimiento del banco, no la conciliación', () => {
  // Así el saldo no puede quedar al revés por un monto mal digitado: si el banco dice que
  // salió plata, salió, aunque el monto de la conciliación venga positivo.
  assert.strictEqual(saldoAFavor([cargo(300000)]), -300000)
  assert.strictEqual(saldoAFavor([cargo(-300000)]), -300000)
})

test('saldoAFavor: devolver todo lo deja en cero', () => {
  assert.strictEqual(saldoAFavor([abono(500000), cargo(500000)]), 0)
})

test('porCliente: agrupa y arma el detalle en orden cronológico', () => {
  const r = porCliente([
    cargo(45000, { id: 2, contacto: { nombre: 'Patricia', apellido: 'Muñoz', rut: '1-9' } }),
    abono(5000000, { id: 1, contacto: { nombre: 'Patricia', apellido: 'Muñoz', rut: '1-9' } }),
  ])
  assert.strictEqual(r.length, 1)
  assert.strictEqual(r[0].nombre, 'Patricia Muñoz')
  assert.strictEqual(r[0].saldo, 4955000)
  assert.deepStrictEqual(r[0].lineas.map((l) => l.tipo), ['ABONO', 'DEVOLUCION'])
})

test('porCliente: el que ya no tiene saldo no aparece', () => {
  // Devolverle todo cierra el caso: no tiene sentido seguir mostrándolo.
  const r = porCliente([abono(500000), cargo(500000)])
  assert.strictEqual(r.length, 0)
})

test('porCliente: ordena por saldo, de mayor a menor', () => {
  const r = porCliente([
    abono(100000, { contactoId: 1, contacto: { nombre: 'Chico' } }),
    abono(900000, { contactoId: 2, contacto: { nombre: 'Grande' } }),
  ])
  assert.strictEqual(r[0].nombre, 'Grande')
})

test('devueltoAClientes: cuánto de un cargo es devolución y no gasto', () => {
  // Devolverle plata a un cliente no es un costo del negocio: es la salida de algo que
  // nunca fue mío. Contarlo como gasto haría bajar el resultado por plata que tampoco
  // había sumado al entrar.
  assert.strictEqual(devueltoAClientes([{ contactoId: 7, monto: 45000 }, { cuotaId: 3, monto: 200000 }]), 45000)
  assert.strictEqual(devueltoAClientes([{ cuotaId: 3, monto: 200000 }]), 0)
  assert.strictEqual(devueltoAClientes([]), 0)
})
