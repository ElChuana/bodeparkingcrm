const { test } = require('node:test')
const assert = require('node:assert')
const { calza, primeraQueCalza, aplicar, tipoDeMovimiento } = require('../src/lib/reglas')

const regla = (o = {}) => ({ id: 1, activa: true, patronGlosa: 'ARRIENDO', tipoMovimiento: 'CARGO', orden: 0, gastoProgramadoId: 8, ...o })
const mov = (o = {}) => ({ glosa: 'PAGO ARRIENDO OFICINA', monto: -680052, ...o })

test('tipoDeMovimiento: el signo decide', () => {
  assert.strictEqual(tipoDeMovimiento({ monto: -1 }), 'CARGO')
  assert.strictEqual(tipoDeMovimiento({ monto: 1 }), 'ABONO')
})

test('calza: el patrón ignora tildes y mayúsculas', () => {
  assert.ok(calza(regla({ patronGlosa: 'comisión' }), mov({ glosa: 'COMISION MANTENCION CUENTA' })))
})

test('calza: una regla sin patrón nunca calza', () => {
  // Calzaría con todo, que es exactamente lo que no queremos de una regla automática.
  assert.strictEqual(calza(regla({ patronGlosa: '' }), mov()), false)
  assert.strictEqual(calza(regla({ patronGlosa: null }), mov()), false)
  assert.strictEqual(calza(regla({ patronGlosa: '   ' }), mov()), false)
})

test('calza: una regla inactiva no calza', () => {
  assert.strictEqual(calza(regla({ activa: false }), mov()), false)
})

test('calza: el tipo separa cargos de abonos', () => {
  assert.strictEqual(calza(regla({ tipoMovimiento: 'ABONO' }), mov()), false)
  assert.ok(calza(regla({ tipoMovimiento: 'AMBOS' }), mov()))
})

test('calza: los rangos se comparan en valor absoluto', () => {
  // Nadie escribe "entre -700.000 y -650.000" en una regla.
  assert.ok(calza(regla({ montoMin: 600000, montoMax: 700000 }), mov({ monto: -680052 })))
  assert.strictEqual(calza(regla({ montoMin: 700000 }), mov({ monto: -680052 })), false)
  assert.strictEqual(calza(regla({ montoMax: 600000 }), mov({ monto: -680052 })), false)
})

test('primeraQueCalza: gana el orden que puso la persona, no el mejor puntaje', () => {
  const reglas = [
    regla({ id: 2, orden: 5, patronGlosa: 'ARRIENDO', gastoProgramadoId: 99 }),
    regla({ id: 3, orden: 1, patronGlosa: 'PAGO', gastoProgramadoId: 42 }),
  ]
  assert.strictEqual(primeraQueCalza(reglas, mov()).gastoProgramadoId, 42)
})

test('aplicar: sin regla devuelve la misma forma con todo en null', () => {
  const r = aplicar([], mov())
  assert.deepStrictEqual(r, { regla: null, gastoProgramadoId: null, autoValidar: false })
})

test('aplicar: una regla solo imputa a un gasto; la categoría sale del documento', () => {
  // La regla no clasifica el movimiento: lo manda al gasto, y de ahí sale la categoría.
  const r = aplicar([regla({ gastoProgramadoId: 8, autoValidar: true })], mov())
  assert.strictEqual(r.gastoProgramadoId, 8)
  assert.strictEqual(r.autoValidar, true)
  assert.ok(!('categoriaId' in r))
})

test('aplicar: sin gasto al cual imputar no puede ejecutarse sola', () => {
  const r = aplicar([regla({ gastoProgramadoId: null, autoValidar: true })], mov())
  assert.strictEqual(r.autoValidar, false)
})
