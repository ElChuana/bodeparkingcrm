const express = require('express')
const router = express.Router()
const { miReporteSemanal, reportePorUsuario, listarHistorico, generarManual } = require('../controllers/reportesSemanalController')
const { autenticar, autorizar } = require('../middleware/auth')

router.use(autenticar)

router.get('/mi-reporte', miReporteSemanal)
router.get('/usuario/:usuarioId', autorizar('GERENTE', 'JEFE_VENTAS'), reportePorUsuario)
router.get('/', listarHistorico)
router.post('/generar', generarManual)

module.exports = router
