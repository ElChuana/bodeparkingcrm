const express = require('express')
const router = express.Router()
const { listar, obtener, crear, actualizar } = require('../controllers/contactosController')
const { autenticar } = require('../middleware/auth')

router.use(autenticar)
router.get('/', listar)
router.get('/:id', obtener)
router.post('/', crear)
router.put('/:id', actualizar)

module.exports = router
