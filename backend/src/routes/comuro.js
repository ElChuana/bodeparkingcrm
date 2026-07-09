const express = require('express')
const router = express.Router()
const { autenticarApiKey } = require('../middleware/apiKey')
const { logIntegracion } = require('../middleware/logIntegraciones')
const { upsert } = require('../controllers/comuroController')

// POST /api/leads/upsert — URL pública usada por Comuro, no cambiar sin coordinar con ellos
router.post('/upsert', logIntegracion, autenticarApiKey, upsert)

module.exports = router
