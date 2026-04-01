const express = require('express')
const router = express.Router()
const { leads, ventas, inventario, pagosAtrasados, comisiones } = require('../controllers/reportesController')
const { autenticar, autorizar } = require('../middleware/auth')

router.use(autenticar)
router.use(autorizar('GERENTE', 'JEFE_VENTAS'))

router.get('/leads', leads)
router.get('/ventas', ventas)
router.get('/inventario', inventario)
router.get('/pagos-atrasados', pagosAtrasados)
router.get('/comisiones', comisiones)

module.exports = router
