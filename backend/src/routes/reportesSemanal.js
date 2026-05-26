const express = require('express')
const router = express.Router()
const { miReporteSemanal, listarHistorico, generarManual } = require('../controllers/reportesSemanalController')
const { autenticar, autorizar } = require('../middleware/auth')

router.use(autenticar)
router.use(autorizar('GERENTE'))

router.get('/mi-reporte', miReporteSemanal)
router.get('/', listarHistorico)
router.post('/generar', generarManual)

module.exports = router
