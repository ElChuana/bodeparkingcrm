const express = require('express')
const router = express.Router()
const { listar, listarMencionables, obtener, crear, actualizar, desactivar } = require('../controllers/usuariosController')
const { autenticar, autorizar } = require('../middleware/auth')

router.use(autenticar)

// Antes de '/:id': lista mínima del equipo para @menciones (cualquier usuario)
router.get('/mencionables', listarMencionables)

router.get('/', autorizar('GERENTE', 'JEFE_VENTAS'), listar)
router.get('/:id', autorizar('GERENTE', 'JEFE_VENTAS'), obtener)
router.post('/', autorizar('GERENTE'), crear)
router.put('/:id', autorizar('GERENTE'), actualizar)
router.delete('/:id', autorizar('GERENTE'), desactivar)

module.exports = router
