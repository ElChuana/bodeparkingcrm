const express = require('express')
const router = express.Router()
const { listar, obtener, crear, actualizar } = require('../controllers/edificiosController')
const { autenticar, autorizar } = require('../middleware/auth')

router.use(autenticar)

router.get('/', listar)
router.get('/:id', obtener)
router.post('/', autorizar('GERENTE', 'JEFE_VENTAS'), crear)
router.put('/:id', autorizar('GERENTE', 'JEFE_VENTAS'), actualizar)

module.exports = router
