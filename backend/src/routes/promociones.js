const express = require('express')
const router = express.Router()
const { listar, obtener, crear, actualizar, asignarUnidad, desasignarUnidad, aplicarAVenta, quitarDeVenta } = require('../controllers/promocionesController')
const { autenticar, autorizar } = require('../middleware/auth')

router.use(autenticar)

router.get('/', listar)   // todos pueden ver
router.get('/:id', obtener)
router.post('/', autorizar('GERENTE', 'JEFE_VENTAS'), crear)
router.put('/:id', autorizar('GERENTE', 'JEFE_VENTAS'), actualizar)
router.post('/:id/unidades', autorizar('GERENTE', 'JEFE_VENTAS'), asignarUnidad)
router.delete('/:id/unidades/:unidadId', autorizar('GERENTE', 'JEFE_VENTAS'), desasignarUnidad)
router.post('/:id/aplicar-venta', autorizar('GERENTE', 'JEFE_VENTAS'), aplicarAVenta)
router.delete('/venta-promo/:ventaPromoId', autorizar('GERENTE', 'JEFE_VENTAS'), quitarDeVenta)

module.exports = router
