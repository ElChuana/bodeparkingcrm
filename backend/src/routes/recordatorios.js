const express = require('express')
const router = express.Router({ mergeParams: true })
const { autenticar } = require('../middleware/auth')
const { listar, crear } = require('../controllers/recordatoriosController')

router.get('/',  autenticar, listar)
router.post('/', autenticar, crear)

module.exports = router
