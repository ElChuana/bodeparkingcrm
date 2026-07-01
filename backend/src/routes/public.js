const express = require('express')
const router = express.Router()
const { autenticarApiKey, bloquearSoloEscritura } = require('../middleware/apiKey')
const { autenticar, autorizar } = require('../middleware/auth')
const {
  crearLead, obtenerLead, webhookWebinar,
  listarKeys, crearKey, desactivarKey, eliminarKey,
} = require('../controllers/publicController')

// API pública para integraciones externas (autenticación por API Key)
router.post('/leads',            autenticarApiKey, crearLead)
router.get('/leads/:id',         autenticarApiKey, bloquearSoloEscritura, obtenerLead)
router.post('/webhooks/webinar', autenticarApiKey, webhookWebinar)

// Gestión de API Keys (requiere JWT normal, solo gerencia)
router.get('/keys',                  autenticar, autorizar('GERENTE'), listarKeys)
router.post('/keys',                 autenticar, autorizar('GERENTE'), crearKey)
router.put('/keys/:id/desactivar',   autenticar, autorizar('GERENTE'), desactivarKey)
router.delete('/keys/:id',           autenticar, autorizar('GERENTE'), eliminarKey)

module.exports = router
