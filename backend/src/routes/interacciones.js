const express = require('express')
const router = express.Router()
const { listarTodas } = require('../controllers/interaccionesController')
const { autenticar } = require('../middleware/auth')

router.use(autenticar)

router.get('/', listarTodas)

module.exports = router
