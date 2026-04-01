const express = require('express')
const router = express.Router()
const { obtener, actualizar, subirDocumento } = require('../controllers/legalController')
const { autenticar, autorizar } = require('../middleware/auth')
const upload = require('../lib/upload')

router.use(autenticar)
router.use(autorizar('GERENTE', 'JEFE_VENTAS', 'ABOGADO'))

router.get('/:ventaId', obtener)
router.put('/:ventaId', actualizar)
router.post('/:ventaId/documentos', upload.single('archivo'), subirDocumento)

module.exports = router
