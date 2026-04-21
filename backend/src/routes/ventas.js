const express = require('express')
const router = express.Router()
const { listar, obtener, actualizarEstado } = require('../controllers/ventasController')
const { autenticar, autorizar } = require('../middleware/auth')

router.use(autenticar)
router.use(autorizar('GERENTE', 'JEFE_VENTAS', 'ABOGADO'))

router.get('/', listar)
router.get('/:id', obtener)
router.put('/:id/estado', autorizar('GERENTE', 'JEFE_VENTAS'), actualizarEstado)

module.exports = router
