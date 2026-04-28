const express = require('express')
const router = express.Router()
const { crearPlan, agregarCuota, obtenerPlan, registrarPago, registrarPagoArriendo, cuotasAtrasadas } = require('../controllers/pagosController')
const { autenticar, autorizar } = require('../middleware/auth')
const upload = require('../lib/upload')

router.use(autenticar)
router.use(autorizar('GERENTE', 'JEFE_VENTAS'))

router.post('/plan', crearPlan)
router.post('/plan/:ventaId/cuota', agregarCuota)
router.get('/plan/:ventaId', obtenerPlan)
router.put('/cuotas/:id/pagar', upload.single('comprobante'), registrarPago)
router.post('/arriendos/:arriendoId/pagar', upload.single('comprobante'), registrarPagoArriendo)
router.get('/atrasados', cuotasAtrasadas)

module.exports = router
