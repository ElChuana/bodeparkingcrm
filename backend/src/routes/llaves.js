const express = require('express')
const router = express.Router()
const { listar, crear, prestar, devolver, historial, llavesVencidas } = require('../controllers/llavesController')
const { autenticar, autorizar } = require('../middleware/auth')

router.use(autenticar)
router.use(autorizar('GERENTE', 'JEFE_VENTAS'))

router.get('/', listar)
router.get('/vencidas', llavesVencidas)
router.post('/', crear)
router.post('/:id/prestar', prestar)
router.put('/:id/devolver', devolver)
router.get('/:id/historial', historial)

module.exports = router
