const express = require('express')
const router = express.Router()
const { miReporteSemanal, listarHistorico, generarManual } = require('../controllers/reportesSemanalController')
const { autenticar } = require('../middleware/auth')

router.use(autenticar)

router.get('/mi-reporte', miReporteSemanal)
router.get('/', listarHistorico)
router.post('/generar', generarManual)

module.exports = router
