const express = require('express')
const router = express.Router()
const { recibirCartolaScraper } = require('../controllers/bancoController')
const { autenticarApiKey } = require('../middleware/apiKey')

// Entrada del scraper de Banco Security, autenticada por API Key (no por JWT):
// corre fuera del CRM, en el equipo donde alguien tiene la sesión del banco.
// Se monta ANTES del router con JWT para que no le exija token de usuario.
router.post('/cartola-scraper', autenticarApiKey, recibirCartolaScraper)

module.exports = router
