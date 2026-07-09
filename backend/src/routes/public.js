const express = require('express')
const router = express.Router()
const { autenticarApiKey, bloquearSoloEscritura } = require('../middleware/apiKey')
const { logIntegracion } = require('../middleware/logIntegraciones')
const { autenticar, autorizar } = require('../middleware/auth')
const {
  crearLead, obtenerLead, disponibilidad, webhookWebinar,
  listarKeys, crearKey, desactivarKey, eliminarKey,
} = require('../controllers/publicController')

// API pública para integraciones externas (autenticación por API Key)
router.post('/leads',            logIntegracion, autenticarApiKey, crearLead)
router.get('/leads/:id',         logIntegracion, autenticarApiKey, bloquearSoloEscritura, obtenerLead)
router.get('/disponibilidad',    logIntegracion, autenticarApiKey, disponibilidad)
router.post('/webhooks/webinar', logIntegracion, autenticarApiKey, webhookWebinar)

// Gestión de API Keys (requiere JWT normal, solo gerencia)
router.get('/keys',                  autenticar, autorizar('GERENTE'), listarKeys)
router.post('/keys',                 autenticar, autorizar('GERENTE'), crearKey)
router.put('/keys/:id/desactivar',   autenticar, autorizar('GERENTE'), desactivarKey)
router.delete('/keys/:id',           autenticar, autorizar('GERENTE'), eliminarKey)

module.exports = router
