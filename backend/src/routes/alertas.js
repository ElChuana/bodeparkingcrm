const express = require('express')
const router = express.Router()
const { misNotificaciones, marcarLeida, marcarTodasLeidas, obtenerConfig, actualizarConfig, ejecutarChequeo, obtenerPreferencias, actualizarPreferencias } = require('../controllers/alertasController')
const { autenticar, autorizar } = require('../middleware/auth')

router.use(autenticar)

router.get('/', misNotificaciones)
router.put('/leer-todas', marcarTodasLeidas)
router.get('/preferencias', obtenerPreferencias)
router.put('/preferencias', actualizarPreferencias)
router.put('/:id/leer', marcarLeida)
router.get('/config', autorizar('GERENTE', 'JEFE_VENTAS'), obtenerConfig)
router.put('/config/:tipo', autorizar('GERENTE'), actualizarConfig)
router.post('/chequeo', autorizar('GERENTE'), ejecutarChequeo)

module.exports = router
