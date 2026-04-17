const bcrypt = require('bcryptjs')
const prisma = require('../lib/prisma')

// GET /api/usuarios — solo Gerente
const listar = async (req, res) => {
  try {
    const usuarios = await prisma.usuario.findMany({
      select: {
        id: true, nombre: true, apellido: true, email: true,
        telefono: true, rol: true, comisionPorcentaje: true,
        comisionFijo: true, activo: true, creadoEn: true, modulosVisibles: true
      },
      orderBy: { nombre: 'asc' }
    })
    res.json(usuarios)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al obtener usuarios.' })
  }
}

// GET /api/usuarios/:id
const obtener = async (req, res) => {
  const { id } = req.params
  try {
    const usuario = await prisma.usuario.findUnique({
      where: { id: Number(id) },
      select: {
        id: true, nombre: true, apellido: true, email: true,
        telefono: true, rol: true, comisionPorcentaje: true,
        comisionFijo: true, activo: true, creadoEn: true, modulosVisibles: true
      }
    })
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado.' })
    res.json(usuario)
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener usuario.' })
  }
}

// POST /api/usuarios — solo Gerente crea usuarios
const crear = async (req, res) => {
  const { nombre, apellido, email, password, telefono, rol, comisionPorcentaje, comisionFijo } = req.body

  if (!nombre || !apellido || !email || !password || !rol) {
    return res.status(400).json({ error: 'Nombre, apellido, email, contraseña y rol son requeridos.' })
  }

  if (password.length < 8) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres.' })
  }

  const rolesValidos = ['GERENTE', 'JEFE_VENTAS', 'VENDEDOR', 'BROKER_EXTERNO', 'ABOGADO']
  if (!rolesValidos.includes(rol)) {
    return res.status(400).json({ error: 'Rol inválido.' })
  }

  try {
    const existe = await prisma.usuario.findUnique({ where: { email } })
    if (existe) {
      return res.status(400).json({ error: 'Ya existe un usuario con ese email.' })
    }

    const hash = await bcrypt.hash(password, 10)
    const usuario = await prisma.usuario.create({
      data: { nombre, apellido, email, password: hash, telefono, rol, comisionPorcentaje, comisionFijo },
      select: {
        id: true, nombre: true, apellido: true, email: true,
        telefono: true, rol: true, comisionPorcentaje: true,
        comisionFijo: true, activo: true, creadoEn: true, modulosVisibles: true
      }
    })
    res.status(201).json(usuario)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al crear usuario.' })
  }
}

const MODULOS_VALIDOS = ['dashboard','inventario','leads','visitas','ventas','legal','pagos','comisiones','promociones','descuentos','arriendos','llaves','equipo','reportes','automatizaciones','api-keys']

// PUT /api/usuarios/:id — solo Gerente
const actualizar = async (req, res) => {
  const { id } = req.params
  const { nombre, apellido, email, telefono, rol, comisionPorcentaje, comisionFijo, activo, modulosVisibles } = req.body

  if (modulosVisibles !== undefined) {
    if (!Array.isArray(modulosVisibles) || !modulosVisibles.every(m => MODULOS_VALIDOS.includes(m))) {
      return res.status(400).json({ error: 'modulosVisibles contiene valores inválidos.' })
    }
  }

  try {
    const usuario = await prisma.usuario.update({
      where: { id: Number(id) },
      data: { nombre, apellido, email, telefono, rol, comisionPorcentaje, comisionFijo, activo,
        ...(modulosVisibles !== undefined && { modulosVisibles }) },
      select: {
        id: true, nombre: true, apellido: true, email: true,
        telefono: true, rol: true, comisionPorcentaje: true,
        comisionFijo: true, activo: true, modulosVisibles: true
      }
    })
    res.json(usuario)
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Usuario no encontrado.' })
    res.status(500).json({ error: 'Error al actualizar usuario.' })
  }
}

// DELETE /api/usuarios/:id — solo desactiva, no elimina
const desactivar = async (req, res) => {
  const { id } = req.params
  try {
    await prisma.usuario.update({
      where: { id: Number(id) },
      data: { activo: false }
    })
    res.json({ mensaje: 'Usuario desactivado correctamente.' })
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Usuario no encontrado.' })
    res.status(500).json({ error: 'Error al desactivar usuario.' })
  }
}

module.exports = { listar, obtener, crear, actualizar, desactivar }
