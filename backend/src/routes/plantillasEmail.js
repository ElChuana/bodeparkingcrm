const express = require('express')
const router = express.Router()
const { listar, crear, actualizar, eliminar, sembrarBase } = require('../controllers/plantillasEmailController')
const { autenticar } = require('../middleware/auth')

router.use(autenticar)

router.get('/', listar)
router.post('/', crear)
router.post('/sembrar-base', sembrarBase)
router.put('/:id', actualizar)
router.delete('/:id', eliminar)

module.exports = router
