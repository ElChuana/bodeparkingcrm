const multer = require('multer')
const path = require('path')

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads'))
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname)
    const nombre = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`
    cb(null, nombre)
  }
})

const filtroImagenes = (req, file, cb) => {
  const tiposPermitidos = /jpeg|jpg|png|gif|webp|pdf/
  const esValido = tiposPermitidos.test(path.extname(file.originalname).toLowerCase())
  esValido ? cb(null, true) : cb(new Error('Solo se permiten imágenes y PDF'))
}

const upload = multer({ storage, fileFilter: filtroImagenes, limits: { fileSize: 10 * 1024 * 1024 } })

module.exports = upload
