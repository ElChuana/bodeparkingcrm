const express = require('express')
const router = express.Router()
const { dashboard, salud, flujo } = require('../controllers/erpController')
const {
  resumen: conciliacionResumen, porConciliar, conciliar, desconciliar, conciliarAutomatico,
  cuotasPorCobrar, pagarManual, saldosAFavor, aplicarSaldo,
  sugerenciaHistorial, crearDocumentoYConciliar,
} = require('../controllers/conciliacionController')
const {
  listarDocumentos, crearDocumento, editarDocumento, eliminarDocumento,
  asociarFactura, desasociarFactura, generarProvisionesEndpoint,
  listarGastos, crearGasto, editarGasto, eliminarGasto,
  listarFacturas, crearFactura, editarFactura, eliminarFactura,
} = require('../controllers/documentosController')
const {
  listarCuentas, crearCuenta, editarCuenta, eliminarCuenta,
  verPresupuesto, guardarPresupuesto, copiarPresupuesto, verEjecucion, documentosDeCuenta,
} = require('../controllers/cuentasController')
const { resumen: carteraResumen, matriz, detalleCliente } = require('../controllers/carteraController')
const proveedores = require('../controllers/proveedoresController')
const reglas = require('../controllers/reglasController')
const { autenticar, autorizar } = require('../middleware/auth')
const upload = require('../lib/upload')

router.use(autenticar)
router.use(autorizar('GERENTE', 'JEFE_VENTAS'))

// ── Panel ──
router.get('/dashboard', dashboard)
router.get('/salud', salud)
router.get('/flujo', flujo)

// ── Conciliación (el corazón) ──
router.get('/conciliacion/resumen', conciliacionResumen)
router.get('/conciliacion/por-conciliar', porConciliar)
router.post('/conciliacion', conciliar)
router.delete('/conciliacion/:id', desconciliar)
router.post('/conciliacion/automatica', conciliarAutomatico)
router.get('/conciliacion/cuotas-por-cobrar', cuotasPorCobrar)
router.post('/conciliacion/cuotas/:id/pagar-manual', upload.single('comprobante'), pagarManual)
router.get('/conciliacion/saldos-a-favor', saldosAFavor)
router.post('/conciliacion/aplicar-saldo', aplicarSaldo)
router.get('/conciliacion/historial-sugerencia', sugerenciaHistorial)
// El caso notaría: crear el documento ficticio y conciliarlo de una.
router.post('/conciliacion/documento', crearDocumentoYConciliar)

// ── Documentos y provisiones ──
router.get('/documentos', listarDocumentos)
router.post('/documentos', crearDocumento)
router.put('/documentos/:id', editarDocumento)
router.delete('/documentos/:id', eliminarDocumento)
router.post('/documentos/:id/asociar-factura', asociarFactura)
router.post('/documentos/:id/desasociar-factura', desasociarFactura)
router.post('/documentos/generar-provisiones', generarProvisionesEndpoint)

// ── Gastos programados (las plantillas) ──
router.get('/gastos', listarGastos)
router.post('/gastos', crearGasto)
router.put('/gastos/:id', editarGasto)
router.delete('/gastos/:id', autorizar('GERENTE'), eliminarGasto)

// ── Facturas de compra (mínimas: cierran el ciclo de la provisión) ──
router.get('/facturas-compra', listarFacturas)
router.post('/facturas-compra', upload.single('archivo'), crearFactura)
router.put('/facturas-compra/:id', upload.single('archivo'), editarFactura)
router.delete('/facturas-compra/:id', eliminarFactura)

// ── Plan de cuentas y presupuesto ──
router.get('/cuentas', listarCuentas)
router.post('/cuentas', crearCuenta)
router.put('/cuentas/:id', editarCuenta)
router.delete('/cuentas/:id', autorizar('GERENTE'), eliminarCuenta)
router.get('/cuentas/:id/documentos', documentosDeCuenta)
router.get('/presupuesto', verPresupuesto)
router.put('/presupuesto', guardarPresupuesto)
router.post('/presupuesto/copiar', copiarPresupuesto)
router.get('/presupuesto/ejecucion', verEjecucion)

// ── Cartera / cobranza ──
router.get('/cartera', carteraResumen)
router.get('/cartera/matriz', matriz)
router.get('/cartera/:contactoId', detalleCliente)

// ── Proveedores ──
router.get('/proveedores', proveedores.listar)
router.post('/proveedores', proveedores.crear)
router.put('/proveedores/:id', proveedores.editar)
router.delete('/proveedores/:id', autorizar('GERENTE'), proveedores.eliminar)
router.post('/proveedores/:id/aplicar-cuenta', proveedores.aplicarCuenta)

// ── Reglas de conciliación automática ──
router.get('/reglas', reglas.listar)
router.post('/reglas', reglas.crear)
router.put('/reglas/:id', reglas.editar)
router.delete('/reglas/:id', reglas.eliminar)
router.post('/reglas/probar', reglas.probar)
router.post('/reglas/:id/probar', reglas.probar)

module.exports = router
