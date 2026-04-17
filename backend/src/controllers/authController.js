const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const prisma = require('../lib/prisma')

// POST /api/auth/login
const login = async (req, res) => {
  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña son requeridos.' })
  }

  try {
    const usuario = await prisma.usuario.findUnique({ where: { email } })

    if (!usuario || !usuario.activo) {
      return res.status(401).json({ error: 'Credenciales inválidas.' })
    }

    const passwordValida = await bcrypt.compare(password, usuario.password)
    if (!passwordValida) {
      return res.status(401).json({ error: 'Credenciales inválidas.' })
    }

    const token = jwt.sign(
      { id: usuario.id, rol: usuario.rol },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    )

    res.json({
      token,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        email: usuario.email,
        rol: usuario.rol,
        modulosVisibles: usuario.modulosVisibles
      }
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error interno del servidor.' })
  }
}

// GET /api/auth/me  — devuelve el usuario autenticado actual
const me = async (req, res) => {
  res.json({ usuario: req.usuario })
}

// POST /api/auth/cambiar-password
const cambiarPassword = async (req, res) => {
  const { passwordActual, passwordNueva } = req.body

  if (!passwordActual || !passwordNueva) {
    return res.status(400).json({ error: 'Debes enviar la contraseña actual y la nueva.' })
  }

  if (passwordNueva.length < 8) {
    return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 8 caracteres.' })
  }

  try {
    const usuario = await prisma.usuario.findUnique({ where: { id: req.usuario.id } })
    const valida = await bcrypt.compare(passwordActual, usuario.password)

    if (!valida) {
      return res.status(400).json({ error: 'La contraseña actual es incorrecta.' })
    }

    const hash = await bcrypt.hash(passwordNueva, 10)
    await prisma.usuario.update({
      where: { id: req.usuario.id },
      data: { password: hash }
    })

    res.json({ mensaje: 'Contraseña actualizada correctamente.' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error interno del servidor.' })
  }
}

module.exports = { login, me, cambiarPassword }
