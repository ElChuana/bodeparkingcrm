const { test } = require('node:test')
const assert = require('node:assert')
const { estadoDocumento, montoCLPDocumento, pagadoDocumento, saldoDocumento, provisionesFaltantes } = require('../src/lib/documentos')

const U = (s) => new Date(s + 'T00:00:00.000Z')
const AHORA = U('2026-09-01')

const provision = (o = {}) => ({
  tipo: 'PROVISION', lado: 'GASTO', descripcion: 'Arriendo oficina',
  fechaEsperada: U('2026-09-05'), montoUF: 16, montoCLP: null,
  facturaCompraId: null, facturaCompra: null, conciliaciones: [], ...o,
})

test('montoCLPDocumento: CLP directo, o UF convertida', () => {
  assert.strictEqual(montoCLPDocumento(provision({ montoCLP: 500000 }), 40000), 500000)
  assert.strictEqual(montoCLPDocumento(provision(), 40000), 640000)
})

test('pagadoDocumento suma los pagos propios Y los de la factura asociada', () => {
  const d = provision({
    conciliaciones: [{ monto: 100000 }],
    facturaCompra: { conciliaciones: [{ monto: 200000 }] },
  })
  assert.strictEqual(pagadoDocumento(d), 300000)
  assert.strictEqual(saldoDocumento(d, 40000), 340000)
})

// El ciclo de vida completo de la provisión: la alerta "no te han facturado" incluida.
test('estadoDocumento: ESPERADO antes de la fecha, VENCIDO_SIN_FACTURA después', () => {
  assert.strictEqual(estadoDocumento(provision(), { ahora: AHORA }), 'ESPERADO')
  assert.strictEqual(estadoDocumento(provision({ fechaEsperada: U('2026-08-05') }), { ahora: AHORA }), 'VENCIDO_SIN_FACTURA')
})

test('estadoDocumento: con factura asociada pasa a FACTURADO_SIN_PAGO y cierra con el pago', () => {
  const facturada = provision({ facturaCompraId: 9, facturaCompra: { conciliaciones: [] }, montoCLP: 640000, montoUF: null })
  assert.strictEqual(estadoDocumento(facturada, { ahora: AHORA }), 'FACTURADO_SIN_PAGO')
  const pagada = provision({ facturaCompraId: 9, facturaCompra: { conciliaciones: [{ monto: 640000 }] }, montoCLP: 640000, montoUF: null })
  assert.strictEqual(estadoDocumento(pagada, { ahora: AHORA }), 'CERRADO')
})

test('estadoDocumento: pagado sin factura queda esperándola (PAGADO_SIN_FACTURA)', () => {
  const d = provision({ montoCLP: 640000, montoUF: null, conciliaciones: [{ monto: 640000 }] })
  assert.strictEqual(estadoDocumento(d, { ahora: AHORA }), 'PAGADO_SIN_FACTURA')
})

test('estadoDocumento: un RESPALDO no espera factura — cierra con su pago', () => {
  const sinPago = provision({ tipo: 'RESPALDO', montoCLP: 90000, montoUF: null })
  const conPago = provision({ tipo: 'RESPALDO', montoCLP: 90000, montoUF: null, conciliaciones: [{ monto: 90000 }] })
  assert.strictEqual(estadoDocumento(sinPago, { ahora: AHORA }), 'ESPERADO')
  assert.strictEqual(estadoDocumento(conPago, { ahora: AHORA }), 'CERRADO')
})

test('estadoDocumento: la UF define el total cuando el monto está en UF', () => {
  const d = provision({ conciliaciones: [{ monto: 640000 }] })
  assert.strictEqual(estadoDocumento(d, { valorUF: 40000, ahora: AHORA }), 'PAGADO_SIN_FACTURA')
  // Con una UF más alta el mismo pago ya no cubre el total.
  assert.strictEqual(estadoDocumento(d, { valorUF: 45000, ahora: AHORA }), 'ESPERADO')
})

test('provisionesFaltantes: materializa las ocurrencias que no existen todavía', () => {
  const gasto = {
    id: 3, activo: true, nombre: 'Contabilidad', montoCLP: 350000, montoUF: null,
    periodicidad: 'MENSUAL', diaVencimiento: 10, fechaInicio: U('2026-01-10'), fechaFin: null,
    cuentaId: 7, proveedorId: 2,
  }
  const existentes = new Set(['3|2026-09'])
  const faltantes = provisionesFaltantes([gasto], U('2026-09-01'), U('2026-10-31'), existentes)
  assert.strictEqual(faltantes.length, 1)
  assert.deepStrictEqual(
    { periodo: faltantes[0].periodo, tipo: faltantes[0].tipo, cuentaId: faltantes[0].cuentaId, gastoProgramadoId: faltantes[0].gastoProgramadoId },
    { periodo: '2026-10', tipo: 'PROVISION', cuentaId: 7, gastoProgramadoId: 3 },
  )
})
