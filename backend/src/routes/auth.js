const express = require('express')
const router = express.Router()
const { login, me, cambiarPassword } = require('../controllers/authController')
const { autenticar } = require('../middleware/auth')

router.post('/login', login)
router.get('/me', autenticar, me)
router.put('/cambiar-password', autenticar, cambiarPassword)

module.exports = router
