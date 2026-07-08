const express = require('express')
const router = express.Router()
const { listar, crear, actualizar, eliminar } = require('../controllers/reglasComisionController')
const { autenticar, autorizar } = require('../middleware/auth')

router.use(autenticar)

router.get('/', autorizar('GERENTE', 'JEFE_VENTAS'), listar)
router.post('/', autorizar('GERENTE'), crear)
router.put('/:id', autorizar('GERENTE'), actualizar)
router.delete('/:id', autorizar('GERENTE'), eliminar)

module.exports = router
