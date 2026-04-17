const jwt = require('jsonwebtoken')
const prisma = require('../lib/prisma')

// Verifica que el token JWT sea válido
const autenticar = async (req, res, next) => {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1] // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Acceso denegado. Token requerido.' })
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const usuario = await prisma.usuario.findUnique({
      where: { id: decoded.id },
      select: { id: true, nombre: true, apellido: true, email: true, rol: true, activo: true, modulosVisibles: true }
    })

    if (!usuario || !usuario.activo) {
      return res.status(401).json({ error: 'Usuario no válido o inactivo.' })
    }

    req.usuario = usuario
    next()
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido o expirado.' })
  }
}

// Verifica que el usuario tenga uno de los roles permitidos
const autorizar = (...rolesPermitidos) => {
  return (req, res, next) => {
    if (!rolesPermitidos.includes(req.usuario.rol)) {
      return res.status(403).json({ error: 'No tienes permiso para realizar esta acción.' })
    }
    next()
  }
}

module.exports = { autenticar, autorizar }
