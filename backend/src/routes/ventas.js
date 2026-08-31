const express = require('express')
const router = express.Router()
const { listar, obtener, actualizarEstado, guardarFormasPago, editar } = require('../controllers/ventasController')
const { autenticar, autorizar } = require('../middleware/auth')

router.use(autenticar)
router.use(autorizar('GERENTE', 'JEFE_VENTAS', 'ABOGADO', 'BROKER_EXTERNO', 'VENDEDOR'))

router.get('/', listar)
router.get('/:id', obtener)
router.put('/:id/estado', autorizar('GERENTE', 'JEFE_VENTAS'), actualizarEstado)
// El vendedor puede registrar la forma de pago de sus propias ventas (se valida en el controller)
router.put('/:id/formas-pago', autorizar('GERENTE', 'JEFE_VENTAS', 'VENDEDOR', 'BROKER_EXTERNO'), guardarFormasPago)
router.put('/:id', autorizar('GERENTE'), editar)

module.exports = router
