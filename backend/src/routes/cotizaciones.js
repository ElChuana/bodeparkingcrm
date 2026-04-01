const express = require('express')
const router = express.Router()
const { listar, obtener, crear, actualizar, cambiarEstado, eliminar, unidadesDisponibles } = require('../controllers/cotizacionesController')
const { autenticar } = require('../middleware/auth')

router.use(autenticar)

router.get('/unidades-disponibles', unidadesDisponibles)
router.get('/', listar)
router.get('/:id', obtener)
router.post('/', crear)
router.put('/:id', actualizar)
router.put('/:id/estado', cambiarEstado)
router.delete('/:id', eliminar)

module.exports = router
