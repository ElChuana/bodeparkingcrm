const express = require('express')
const router = express.Router()
const { listar, kanban, kanbanPorVendedor, obtener, crear, actualizar, cambiarEtapa, asignarMasivo } = require('../controllers/leadsController')
const { listarPorLead, listarTodas, crear: crearVisita, actualizarResultado } = require('../controllers/visitasController')
const { listarPorLead: listarInteracciones, crear: crearInteraccion } = require('../controllers/interaccionesController')
const { autenticar } = require('../middleware/auth')

router.use(autenticar)

router.get('/', listar)
router.get('/kanban', kanban)
router.get('/kanban/por-vendedor', kanbanPorVendedor)
router.get('/:id', obtener)
router.post('/', crear)
router.put('/:id', actualizar)
router.put('/:id/etapa', cambiarEtapa)
router.post('/asignar-masivo', asignarMasivo)

// Visitas de un lead
router.get('/:leadId/visitas', listarPorLead)
router.post('/:leadId/visitas', crearVisita)
router.put('/:leadId/visitas/:id', actualizarResultado)

// Interacciones de un lead
router.get('/:leadId/interacciones', listarInteracciones)
router.post('/:leadId/interacciones', crearInteraccion)

module.exports = router
