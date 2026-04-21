const express = require('express')
const router = express.Router()
const { listar, crear, actualizar, desactivar } = require('../controllers/packsController')
const { autenticar, autorizar } = require('../middleware/auth')

router.use(autenticar)

router.get('/', listar)
router.post('/', autorizar('GERENTE', 'JEFE_VENTAS'), crear)
router.put('/:id', autorizar('GERENTE', 'JEFE_VENTAS'), actualizar)
router.delete('/:id', autorizar('GERENTE', 'JEFE_VENTAS'), desactivar)

module.exports = router
