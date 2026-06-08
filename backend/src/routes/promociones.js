const express = require('express')
const router = express.Router()
const c = require('../controllers/promocionesController')
const { autenticar, autorizar } = require('../middleware/auth')

router.use(autenticar)

router.get('/', c.listar)
router.get('/:id', c.obtener)
router.post('/', autorizar('GERENTE', 'JEFE_VENTAS'), c.crear)
router.put('/:id', autorizar('GERENTE', 'JEFE_VENTAS'), c.actualizar)
router.delete('/:id', autorizar('GERENTE', 'JEFE_VENTAS'), c.desactivar)
router.post('/:id/unidades', autorizar('GERENTE', 'JEFE_VENTAS'), c.agregarUnidad)
router.delete('/:id/unidades/:unidadId', autorizar('GERENTE', 'JEFE_VENTAS'), c.quitarUnidad)

module.exports = router
