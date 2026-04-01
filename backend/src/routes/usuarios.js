const express = require('express')
const router = express.Router()
const { listar, obtener, crear, actualizar, desactivar } = require('../controllers/usuariosController')
const { autenticar, autorizar } = require('../middleware/auth')

router.use(autenticar)

router.get('/', autorizar('GERENTE', 'JEFE_VENTAS'), listar)
router.get('/:id', autorizar('GERENTE', 'JEFE_VENTAS'), obtener)
router.post('/', autorizar('GERENTE'), crear)
router.put('/:id', autorizar('GERENTE'), actualizar)
router.delete('/:id', autorizar('GERENTE'), desactivar)

module.exports = router
