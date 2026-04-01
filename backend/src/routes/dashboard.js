const express = require('express')
const router = express.Router()
const { obtener } = require('../controllers/dashboardController')
const { autenticar } = require('../middleware/auth')

router.use(autenticar)
router.get('/', obtener)

module.exports = router
