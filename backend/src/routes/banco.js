const express = require('express')
const router = express.Router()
const {
  listarCuentas, crearCuenta, cargarCartola, listarCargas,
  listarContrapartes, asignarContraparte, reidentificar, listarAlias, eliminarContraparte,
  listarMovimientos, resumenMovimientos, actualizarMovimiento,
  analizarGlosas, estadoIa,
} = require('../controllers/bancoController')
const { autenticar, autorizar } = require('../middleware/auth')
const { uploadCartola } = require('../lib/upload')

router.use(autenticar)
router.use(autorizar('GERENTE', 'JEFE_VENTAS'))

router.get('/cuentas', listarCuentas)
router.post('/cuentas', autorizar('GERENTE'), crearCuenta)

router.get('/cargas', listarCargas)
router.post('/cargas', uploadCartola.single('cartola'), cargarCartola)

// Quién es quién. La lista de nombres sin identificar es la lista de trabajo para dejar
// la base ordenada; asignar uno lo aprende y etiqueta de una vez todos sus movimientos.
router.get('/contrapartes', listarContrapartes)
router.post('/contrapartes', asignarContraparte)
router.post('/contrapartes/reidentificar', reidentificar)
router.get('/contrapartes/alias', listarAlias)
router.delete('/contrapartes/alias/:id', eliminarContraparte)

router.get('/movimientos', listarMovimientos)
// Los totales van aparte del listado: la lista se corta en los más recientes y las cifras
// de arriba tienen que hablar de la cuenta entera, no de la página.
router.get('/movimientos/resumen', resumenMovimientos)
router.patch('/movimientos/:id', actualizarMovimiento)

// Lector de glosas: la IA como parser, nunca como juez.
router.get('/ia', estadoIa)
router.post('/analizar-glosas', analizarGlosas)

module.exports = router
