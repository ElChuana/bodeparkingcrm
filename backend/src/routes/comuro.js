const express = require('express')
const router = express.Router()
const { autenticarApiKey } = require('../middleware/apiKey')
const { upsert } = require('../controllers/comuroController')

// POST /api/leads/upsert — URL pública usada por Comuro, no cambiar sin coordinar con ellos
router.post('/upsert', autenticarApiKey, upsert)

module.exports = router
