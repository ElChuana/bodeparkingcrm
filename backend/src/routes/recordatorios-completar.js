const express = require('express')
const router = express.Router()
const { autenticar } = require('../middleware/auth')
const { completar } = require('../controllers/recordatoriosController')

router.patch('/:id/completar', autenticar, completar)

module.exports = router
