const express = require('express')
const router = express.Router()
const { listar, kanban, kanbanPorVendedor, obtener, crear, actualizar, cambiarEtapa, asignarMasivo, eliminar, listarCampanas } = require('../controllers/leadsController')
const { listarPorLead, listarTodas, crear: crearVisita, actualizarResultado, actualizar: actualizarVisita, eliminar: eliminarVisita } = require('../controllers/visitasController')
const { listarPorLead: listarInteracciones, crear: crearInteraccion } = require('../controllers/interaccionesController')
const { autenticar } = require('../middleware/auth')

router.use(autenticar)

router.get('/', listar)
router.get('/campanas', listarCampanas)
router.get('/kanban', kanban)
router.get('/kanban/por-vendedor', kanbanPorVendedor)
router.get('/:id', obtener)
router.post('/', crear)
router.put('/:id', actualizar)
router.put('/:id/etapa', cambiarEtapa)
router.post('/asignar-masivo', asignarMasivo)
router.delete('/:id', eliminar)

// Visitas de un lead
router.get('/:leadId/visitas', listarPorLead)
router.post('/:leadId/visitas', crearVisita)
router.put('/:leadId/visitas/:id', actualizarResultado)
router.patch('/:leadId/visitas/:id', actualizarVisita)
router.delete('/:leadId/visitas/:id', eliminarVisita)

// Interacciones de un lead
router.get('/:leadId/interacciones', listarInteracciones)
router.post('/:leadId/interacciones', crearInteraccion)

module.exports = router
