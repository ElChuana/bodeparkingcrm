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

// Cartolas del banco (ERP). Vienen como .txt pese a ser CSV con ";", y a veces
// el navegador las baja como .csv — se aceptan las dos, más text/plain suelto.
const filtroCartola = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase()
  const ok = ['.txt', '.csv'].includes(ext) || /^text\//.test(file.mimetype)
  ok ? cb(null, true) : cb(new Error('La cartola debe ser un archivo .txt o .csv del banco'))
}

const uploadCartola = multer({ storage, fileFilter: filtroCartola, limits: { fileSize: 5 * 1024 * 1024 } })

module.exports = upload
module.exports.uploadCartola = uploadCartola
