const express = require('express')
const router = express.Router()
const {
  listar, obtener, crear, actualizar, cambiarEstado, eliminar, unidadesDisponibles,
  agregarPack, quitarPack, agregarBeneficio, quitarBeneficio,
  agregarPromocion, quitarPromocion, convertir, verificarAccesoCotizacion
} = require('../controllers/cotizacionesController')
const { autenticar, autorizar } = require('../middleware/auth')

router.use(autenticar)

// Roles comerciales (no ABOGADO) — pueden gestionar/convertir cotizaciones
const comerciales = autorizar('GERENTE', 'JEFE_VENTAS', 'VENDEDOR', 'BROKER_EXTERNO')

router.get('/unidades-disponibles', unidadesDisponibles)
router.get('/', listar)
// Rutas por :id — verificarAccesoCotizacion cierra el IDOR (solo dueño o gerencia)
router.get('/:id', verificarAccesoCotizacion, obtener)
router.post('/', comerciales, crear)
router.put('/:id', comerciales, verificarAccesoCotizacion, actualizar)
router.put('/:id/estado', comerciales, verificarAccesoCotizacion, cambiarEstado)
router.delete('/:id', comerciales, verificarAccesoCotizacion, eliminar)

router.post('/:id/convertir', comerciales, verificarAccesoCotizacion, convertir)
router.post('/:id/packs', comerciales, verificarAccesoCotizacion, agregarPack)
router.delete('/:id/packs/:packId', comerciales, verificarAccesoCotizacion, quitarPack)
router.post('/:id/beneficios', comerciales, verificarAccesoCotizacion, agregarBeneficio)
router.delete('/:id/beneficios/:beneficioId', comerciales, verificarAccesoCotizacion, quitarBeneficio)
router.post('/:id/promociones', comerciales, verificarAccesoCotizacion, agregarPromocion)
router.delete('/:id/promociones/:promocionId', comerciales, verificarAccesoCotizacion, quitarPromocion)

module.exports = router
