const express = require('express')
const router = express.Router()
const { autenticarApiKey, bloquearSoloEscritura } = require('../middleware/apiKey')
const { logIntegracion } = require('../middleware/logIntegraciones')
const { listarVentasActivas, recibirResumenes } = require('../controllers/legalController')

// Endpoints para el proceso EXTERNO que lee correos legales y envía resúmenes.
// Autenticados por API Key (no JWT). Se montan antes que routes/legal.js.

// GET requiere key de lectura (rechaza keys soloEscritura)
router.get('/ventas-activas', autenticarApiKey, bloquearSoloEscritura, listarVentasActivas)

// POST acepta cualquier key activa (incluida soloEscritura)
router.post('/resumenes', logIntegracion, autenticarApiKey, recibirResumenes)

module.exports = router
