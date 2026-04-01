const express = require('express')
const router = express.Router()
const { listar, obtener, crear, actualizar } = require('../controllers/arrendosController')
const { autenticar, autorizar } = require('../middleware/auth')
const upload = require('../lib/upload')

router.use(autenticar)
router.use(autorizar('GERENTE', 'JEFE_VENTAS'))

router.get('/', listar)
router.get('/:id', obtener)
router.post('/', upload.single('contrato'), crear)
router.put('/:id', upload.single('contrato'), actualizar)

module.exports = router
