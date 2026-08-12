const express = require('express')
const router = express.Router()
const { iniciar, actualizar, cerrar, listar } = require('../controllers/reunionesController')
const { autenticar, autorizar } = require('../middleware/auth')

router.use(autenticar)

// Los roles que atienden clientes; el abogado no hace reuniones comerciales
const comerciales = autorizar('GERENTE', 'JEFE_VENTAS', 'VENDEDOR', 'BROKER_EXTERNO')

router.get('/', listar)
router.post('/', comerciales, iniciar)
router.patch('/:id', comerciales, actualizar)
router.post('/:id/cerrar', comerciales, cerrar)

module.exports = router
