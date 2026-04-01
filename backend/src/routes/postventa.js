const express = require('express')
const router = express.Router()
const { listar, crear, actualizar } = require('../controllers/postventaController')
const { autenticar, autorizar } = require('../middleware/auth')

router.use(autenticar)
router.use(autorizar('GERENTE', 'JEFE_VENTAS'))

router.get('/', listar)
router.post('/', crear)
router.put('/:id', actualizar)

module.exports = router
