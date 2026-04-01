const express = require('express')
const router = express.Router()
const { listar, crear, editar, eliminar, marcarPrimeraPagada, marcarSegundaPagada, resumen } = require('../controllers/comisionesController')
const { autenticar, autorizar } = require('../middleware/auth')

router.use(autenticar)

router.get('/', listar)
router.get('/resumen', autorizar('GERENTE', 'JEFE_VENTAS'), resumen)
router.post('/', autorizar('GERENTE', 'JEFE_VENTAS'), crear)
router.put('/:id', autorizar('GERENTE', 'JEFE_VENTAS'), editar)
router.delete('/:id', autorizar('GERENTE', 'JEFE_VENTAS'), eliminar)
router.put('/:id/primera', autorizar('GERENTE', 'JEFE_VENTAS'), marcarPrimeraPagada)
router.put('/:id/segunda', autorizar('GERENTE', 'JEFE_VENTAS'), marcarSegundaPagada)

module.exports = router
