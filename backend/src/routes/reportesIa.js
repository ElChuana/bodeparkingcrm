const express = require('express')
const router = express.Router()
const { miReporte, reportePorVendedor, generarManual } = require('../controllers/reportesIaController')
const { autenticar, autorizar } = require('../middleware/auth')

router.use(autenticar)

router.get('/mi-reporte', miReporte)
router.get('/vendedor/:vendedorId', autorizar('GERENTE', 'JEFE_VENTAS'), reportePorVendedor)
router.post('/generar', autorizar('GERENTE'), generarManual)

module.exports = router
