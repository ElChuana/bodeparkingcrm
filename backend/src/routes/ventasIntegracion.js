const express = require('express')
const router = express.Router()
const { autenticarApiKey, bloquearSoloEscritura } = require('../middleware/apiKey')
const { logIntegracion } = require('../middleware/logIntegraciones')
const { listarFormasPago, recibirFormasPago } = require('../controllers/ventasIntegracionController')

// Endpoints para el proceso EXTERNO que completa la forma de pago de las
// ventas leyendo el correo. Autenticados por API Key (no JWT), mismo esquema
// que legalIntegracion.

// GET requiere key de lectura (rechaza keys soloEscritura)
router.get('/formas-pago', autenticarApiKey, bloquearSoloEscritura, listarFormasPago)

// POST acepta cualquier key activa (incluida soloEscritura)
router.post('/formas-pago', logIntegracion, autenticarApiKey, recibirFormasPago)

module.exports = router
