const express = require('express')
const router = express.Router()
const c = require('../controllers/rrssController')
const { autenticar, autorizar } = require('../middleware/auth')

router.use(autenticar)
router.use(autorizar('GERENTE', 'JEFE_VENTAS'))

router.get('/informe',        c.informe)
router.get('/leads-perdidos', c.leadsPerdidos)
router.get('/umbrales',       c.listarUmbrales)
router.put('/umbrales/:id',   autorizar('GERENTE'), c.actualizarUmbral)
router.get('/mapa',           c.listarMapa)
router.put('/mapa/:id',       autorizar('GERENTE'), c.actualizarMapa)
router.get('/sync-log',       c.listarSyncLog)
router.post('/sync',          autorizar('GERENTE'), c.sincronizar)

module.exports = router
