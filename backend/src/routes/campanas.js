const express = require('express')
const router = express.Router()
const c = require('../controllers/campanasController')
const { autenticar, autorizar } = require('../middleware/auth')

router.use(autenticar)

router.get('/', c.listar)
router.get('/:id', c.obtener)
router.post('/', autorizar('GERENTE', 'JEFE_VENTAS'), c.crear)
router.put('/:id', autorizar('GERENTE', 'JEFE_VENTAS'), c.actualizar)

module.exports = router
