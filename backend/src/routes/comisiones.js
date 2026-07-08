const express = require('express')
const router = express.Router()
const { listar, crear, editar, eliminar, marcarPrimeraPagada, marcarSegundaPagada, resumen, mensual, exportar } = require('../controllers/comisionesController')
const { autenticar, autorizar } = require('../middleware/auth')

router.use(autenticar)

router.get('/', autorizar('GERENTE', 'JEFE_VENTAS'), listar)
router.get('/resumen', autorizar('GERENTE', 'JEFE_VENTAS'), resumen)
router.get('/mensual', mensual)
router.get('/export', autorizar('GERENTE', 'JEFE_VENTAS'), exportar)
router.post('/', autorizar('GERENTE'), crear)
router.put('/:id', autorizar('GERENTE'), editar)
router.delete('/:id', autorizar('GERENTE'), eliminar)
router.put('/:id/primera', autorizar('GERENTE', 'JEFE_VENTAS'), marcarPrimeraPagada)
router.put('/:id/segunda', autorizar('GERENTE', 'JEFE_VENTAS'), marcarSegundaPagada)

module.exports = router
