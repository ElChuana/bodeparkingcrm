const express = require('express')
const router = express.Router()
const { autenticarApiKey } = require('../middleware/apiKey')
const { logIntegracion } = require('../middleware/logIntegraciones')
const { rateLimit } = require('../middleware/rateLimit')
const { autenticar, autorizar } = require('../middleware/auth')
const {
  crearLead, disponibilidad, webhookWebinar,
  listarKeys, crearKey, desactivarKey, eliminarKey,
} = require('../controllers/publicController')

// Tope por API Key (o por IP si la key es inválida). Holgado frente al tráfico
// real —decenas de requests/hora— pero corta un flood con la key filtrada.
const limiteEscritura = rateLimit({ max: 60,  ventanaMs: 60_000, nombre: 'public-escritura' })
const limiteLectura   = rateLimit({ max: 120, ventanaMs: 60_000, nombre: 'public-lectura' })

// API pública para integraciones externas (autenticación por API Key)
router.post('/leads',            logIntegracion, autenticarApiKey, limiteEscritura, crearLead)
// GET /leads/:id eliminado por IDOR (2026-07-30) — ver nota en publicController.js
router.get('/disponibilidad',    logIntegracion, autenticarApiKey, limiteLectura,   disponibilidad)
router.post('/webhooks/webinar', logIntegracion, autenticarApiKey, limiteEscritura, webhookWebinar)

// Gestión de API Keys (requiere JWT normal, solo gerencia)
router.get('/keys',                  autenticar, autorizar('GERENTE'), listarKeys)
router.post('/keys',                 autenticar, autorizar('GERENTE'), crearKey)
router.put('/keys/:id/desactivar',   autenticar, autorizar('GERENTE'), desactivarKey)
router.delete('/keys/:id',           autenticar, autorizar('GERENTE'), eliminarKey)

module.exports = router
