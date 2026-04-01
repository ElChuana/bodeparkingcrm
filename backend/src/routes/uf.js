const express = require('express')
const router = express.Router()
const { obtenerUF, convertir } = require('../controllers/ufController')
const { autenticar } = require('../middleware/auth')

router.use(autenticar)
router.get('/', obtenerUF)
router.get('/convertir', convertir)

module.exports = router
