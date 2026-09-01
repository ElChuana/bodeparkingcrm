const { test } = require('node:test')
const assert = require('node:assert')
const {
  puntuar, sugerirObjetivos, sugerirMovimientos, saldoMovimiento, saldoObjetivo, estaCuadrado,
  cuotaComoObjetivo, compraComoObjetivo, documentoComoObjetivo, pagoArriendoComoObjetivo,
  normalizarRut, rutEnTexto, similitudNombre,
} = require('../src/lib/conciliacion')

const mov = (o = {}) => ({
  id: 1, fecha: '2026-08-10', glosa: 'TRANSFERENCIA DESDE Chile DE Carolina Sandoval',
  monto: 850000, conciliaciones: [], ...o,
})
const objetivo = (o = {}) => ({
  id: 10, total: 850000, razonSocialReceptor: 'Carolina Sandoval Rojas', rutReceptor: '12345678-9',
  fechaEmision: '2026-08-08', conciliaciones: [], ...o,
})

test('saldoMovimiento descuenta lo ya imputado, en valor absoluto', () => {
  assert.strictEqual(saldoMovimiento(mov({ monto: -500000, conciliaciones: [{ monto: 200000 }] })), 300000)
})

test('saldoObjetivo: total menos conciliaciones', () => {
  assert.strictEqual(saldoObjetivo(objetivo({ conciliaciones: [{ monto: 850000 }] })), 0)
  assert.ok(estaCuadrado(saldoObjetivo(objetivo({ conciliaciones: [{ monto: 849500 }] }))))
})

test('puntuar: monto exacto + nombre en la glosa pasa el umbral con claridad', () => {
  const { score, motivos } = puntuar(mov(), objetivo())
  assert.ok(score >= 80, `score ${score}`)
  assert.ok(motivos.includes('monto exacto'))
})

test('puntuar: la contraparte identificada es una igualdad, no un parecido', () => {
  const { motivos } = puntuar(mov({ contactoId: 44, glosa: 'TEF 0012' }), objetivo({ contactoId: 44 }))
  assert.ok(motivos.includes('contraparte identificada en pagos anteriores'))
})

test('puntuar: el folio nombrado en el movimiento pesa como el monto', () => {
  const { score } = puntuar(
    mov({ referenciaDetectada: '37', glosa: 'Pago factura', monto: 100000 }),
    objetivo({ folio: '37', total: 500000 }),
  )
  assert.ok(score >= 45, `score ${score}`)
})

test('puntuar: sin saldo en alguno de los dos lados, score 0', () => {
  assert.strictEqual(puntuar(mov({ conciliaciones: [{ monto: 850000 }] }), objetivo()).score, 0)
  assert.strictEqual(puntuar(mov(), objetivo({ conciliaciones: [{ monto: 850000 }] })).score, 0)
})

test('sugerir: ordena por score, corta en 5 y filtra el ruido', () => {
  const objetivos = [
    objetivo({ id: 1 }),
    objetivo({ id: 2, total: 850200 }),
    objetivo({ id: 3, total: 20000000, razonSocialReceptor: 'Otra Persona Distinta', fechaEmision: '2025-01-01' }),
  ]
  const s = sugerirObjetivos(mov(), objetivos)
  assert.ok(s.length >= 1)
  assert.strictEqual(s[0].objetivo.id, 1)
  assert.ok(!s.some((x) => x.objetivo.id === 3))
  const desdeElOtroLado = sugerirMovimientos(objetivo(), [mov()])
  assert.strictEqual(desdeElOtroLado.length, 1)
})

test('cuotaComoObjetivo: convierte UF a pesos y arrastra al comprador', () => {
  const cuota = {
    id: 7, montoUF: 25, montoCLP: null, fechaVencimiento: '2026-09-05', conciliaciones: [],
    planPago: { venta: { comprador: { id: 3, nombre: 'Juan', apellido: 'Pérez', rut: '9876543-2' } } },
  }
  const o = cuotaComoObjetivo(cuota, 40000)
  assert.strictEqual(o.total, 1000000)
  assert.strictEqual(o.contactoId, 3)
  assert.strictEqual(o.razonSocialReceptor, 'Juan Pérez')
})

test('documentoComoObjetivo: usa CLP si existe, o UF convertida; proveedor o contacto dan el nombre', () => {
  const d = {
    id: 4, montoCLP: null, montoUF: 16, fechaEsperada: '2026-09-05', descripcion: 'Arriendo oficina',
    proveedorId: 9, proveedor: { razonSocial: 'Inmobiliaria Fénix', rut: '76111222-3' }, conciliaciones: [],
  }
  const o = documentoComoObjetivo(d, 40000)
  assert.strictEqual(o.total, 640000)
  assert.strictEqual(o.proveedorId, 9)
  assert.strictEqual(o.razonSocialReceptor, 'Inmobiliaria Fénix')
})

test('compraComoObjetivo: el vencimiento manda sobre la emisión', () => {
  const o = compraComoObjetivo({ id: 1, folio: '88', total: 100000, proveedorId: 2, proveedor: { razonSocial: 'Nubox', rut: '1-9' }, fechaEmision: '2026-08-01', fechaVencimiento: '2026-08-30', conciliaciones: [] })
  assert.strictEqual(o.fechaEmision, '2026-08-30')
  assert.strictEqual(o.folio, '88')
})

test('pagoArriendoComoObjetivo: cae al canon del arriendo cuando el pago no trae monto', () => {
  const p = {
    id: 2, mes: '2026-09-01', montoUF: null, montoCLP: null, conciliaciones: [],
    arriendo: { montoMensualUF: 8, contacto: { id: 5, nombre: 'Ana', apellido: 'Rojas', rut: null } },
  }
  const o = pagoArriendoComoObjetivo(p, 40000)
  assert.strictEqual(o.total, 320000)
  assert.strictEqual(o.contactoId, 5)
})

test('normalizarRut y rutEnTexto aguantan los formatos del banco', () => {
  assert.strictEqual(normalizarRut('12.345.678-9'), '12345678-9')
  assert.ok(rutEnTexto('12345678-9', 'PAGO 123456789 REF'))
  assert.ok(!rutEnTexto('111-1', 'nada'))
})

test('similitudNombre: ignora partículas y palabras cortas', () => {
  assert.ok(similitudNombre('Carolina Sandoval Rojas', 'TRANSFERENCIA DE Carolina Sandoval') > 0.6)
  assert.strictEqual(similitudNombre('de la', 'lo que sea'), 0)
})
