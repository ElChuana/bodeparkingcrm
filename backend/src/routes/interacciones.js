const express = require('express')
const router = express.Router()
const { listarTodas, toggleReaccion, crearRespuesta, eliminarRespuesta } = require('../controllers/interaccionesController')
const { autenticar } = require('../middleware/auth')

router.use(autenticar)

router.get('/', listarTodas)

// Reacciones y respuestas a una nota (interacción)
router.post('/:id/reacciones', toggleReaccion)
router.post('/:id/respuestas', crearRespuesta)
router.delete('/respuestas/:respuestaId', eliminarRespuesta)

module.exports = router
