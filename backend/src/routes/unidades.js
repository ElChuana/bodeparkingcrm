const express = require('express')
const router = express.Router()
const { listar, obtener, crear, actualizar, subirArchivo, eliminarArchivo } = require('../controllers/unidadesController')
const { autenticar, autorizar } = require('../middleware/auth')
const upload = require('../lib/upload')

router.use(autenticar)

router.get('/', listar)
router.get('/:id', obtener)
router.post('/', autorizar('GERENTE', 'JEFE_VENTAS'), crear)
router.put('/:id', autorizar('GERENTE', 'JEFE_VENTAS'), actualizar)
router.post('/:id/archivos', autorizar('GERENTE', 'JEFE_VENTAS'), upload.single('archivo'), subirArchivo)
router.delete('/:id/archivos/:archivoId', autorizar('GERENTE', 'JEFE_VENTAS'), eliminarArchivo)

module.exports = router
