const express = require('express')
const router = express.Router()
const { listar, porCotizacion, crear, revisar, aplicarDirecto } = require('../controllers/descuentosController')
const { autenticar } = require('../middleware/auth')

router.use(autenticar)

router.get('/',                           listar)
router.get('/cotizacion/:cotizacionId',   porCotizacion)
router.post('/',                          crear)
router.put('/cotizacion/:cotizacionId/directo',          aplicarDirecto)
router.put('/:id/revisar',                               revisar)

module.exports = router
