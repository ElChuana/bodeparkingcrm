const express = require('express')
const router = express.Router()
const { rateLimit } = require('../middleware/rateLimit')
const { listar, crear, eliminar } = require('../controllers/salaController')

// Reserva de la sala de reuniones (página pública /sala, sin login).
// Sin API key: solo maneja nombres y horarios de la sala, nada sensible.
// El rate limit por IP evita que alguien con el link martille la BD.
const limiteLectura   = rateLimit({ max: 120, ventanaMs: 60_000, nombre: 'sala-lectura' })
const limiteEscritura = rateLimit({ max: 30,  ventanaMs: 60_000, nombre: 'sala-escritura' })

router.get('/reservas',        limiteLectura, listar)
router.post('/reservas',       limiteEscritura, crear)
router.delete('/reservas/:id', limiteEscritura, eliminar)

module.exports = router
