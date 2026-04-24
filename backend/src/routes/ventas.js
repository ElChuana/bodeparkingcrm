const express = require('express')
const router = express.Router()
const { listar, obtener, actualizarEstado, editar } = require('../controllers/ventasController')
const { autenticar, autorizar } = require('../middleware/auth')

router.use(autenticar)
router.use(autorizar('GERENTE', 'JEFE_VENTAS', 'ABOGADO'))

router.get('/', listar)
router.get('/:id', obtener)
router.put('/:id/estado', autorizar('GERENTE', 'JEFE_VENTAS'), actualizarEstado)
router.put('/:id', autorizar('GERENTE'), editar)

module.exports = router
