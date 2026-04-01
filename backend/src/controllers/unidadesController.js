const prisma = require('../lib/prisma')
const path = require('path')

const listar = async (req, res) => {
  const { edificioId, tipo, estado, precioMin, precioMax } = req.query
  const esGerenciaOJV = ['GERENTE', 'JEFE_VENTAS'].includes(req.usuario.rol)

  try {
    const unidades = await prisma.unidad.findMany({
      where: {
        ...(edificioId && { edificioId: Number(edificioId) }),
        ...(tipo && { tipo }),
        ...(estado && { estado }),
        ...(precioMin && { precioUF: { gte: Number(precioMin) } }),
        ...(precioMax && { precioUF: { lte: Number(precioMax) } }),
      },
      include: {
        edificio: { select: { id: true, nombre: true, region: true, comuna: true } },
        promociones: { include: { promocion: true } },
        _count: { select: { llaves: true } }
      },
      orderBy: [{ edificioId: 'asc' }, { tipo: 'asc' }, { numero: 'asc' }]
    })

    // Ocultar precio mínimo y precio de costo para roles sin acceso
    const resultado = unidades.map(u => {
      if (!esGerenciaOJV) {
        const { precioMinimoUF, precioCostoUF, ...resto } = u
        return resto
      }
      return u
    })

    res.json(resultado)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al obtener unidades.' })
  }
}

const obtener = async (req, res) => {
  const { id } = req.params
  const esGerenciaOJV = ['GERENTE', 'JEFE_VENTAS'].includes(req.usuario.rol)

  try {
    const unidad = await prisma.unidad.findUnique({
      where: { id: Number(id) },
      include: {
        edificio: true,
        archivos: true,
        llaves: { include: { movimientos: { orderBy: { creadoEn: 'desc' }, take: 1 } } },
        promociones: { include: { promocion: true } },
        arriendos: { where: { estado: 'ACTIVO' } }
      }
    })
    if (!unidad) return res.status(404).json({ error: 'Unidad no encontrada.' })

    if (!esGerenciaOJV) {
      const { precioMinimoUF, precioCostoUF, ...resto } = unidad
      return res.json(resto)
    }

    res.json(unidad)
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener unidad.' })
  }
}

const crear = async (req, res) => {
  const {
    edificioId, tipo, subtipo, numero, piso, m2, techado, acceso,
    precioUF, precioMinimoUF, precioCostoUF, notas
  } = req.body

  if (!edificioId || !tipo || !numero || !precioUF) {
    return res.status(400).json({ error: 'Edificio, tipo, número y precio UF son requeridos.' })
  }

  try {
    const unidad = await prisma.unidad.create({
      data: {
        edificioId: Number(edificioId), tipo, subtipo, numero,
        piso, m2: m2 ? Number(m2) : null,
        techado, acceso,
        precioUF: Number(precioUF),
        precioMinimoUF: precioMinimoUF ? Number(precioMinimoUF) : null,
        precioCostoUF: precioCostoUF ? Number(precioCostoUF) : null,
        notas
      },
      include: { edificio: { select: { nombre: true } } }
    })
    res.status(201).json(unidad)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al crear unidad.' })
  }
}

const actualizar = async (req, res) => {
  const { id } = req.params
  const {
    tipo, subtipo, numero, piso, m2, techado, acceso,
    precioUF, precioMinimoUF, precioCostoUF, estado, notas
  } = req.body

  try {
    const unidad = await prisma.unidad.update({
      where: { id: Number(id) },
      data: {
        tipo, subtipo, numero, piso,
        m2: m2 ? Number(m2) : undefined,
        techado, acceso,
        precioUF: precioUF ? Number(precioUF) : undefined,
        precioMinimoUF: precioMinimoUF !== undefined ? Number(precioMinimoUF) : undefined,
        precioCostoUF: precioCostoUF !== undefined ? Number(precioCostoUF) : undefined,
        estado, notas
      }
    })
    res.json(unidad)
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Unidad no encontrada.' })
    res.status(500).json({ error: 'Error al actualizar unidad.' })
  }
}

const subirArchivo = async (req, res) => {
  const { id } = req.params
  const { tipo } = req.body // "foto" | "plano"

  if (!req.file) return res.status(400).json({ error: 'No se recibió ningún archivo.' })

  try {
    const archivo = await prisma.archivo.create({
      data: {
        unidadId: Number(id),
        url: `/uploads/${req.file.filename}`,
        nombre: req.file.originalname,
        tipo: tipo || 'foto'
      }
    })
    res.status(201).json(archivo)
  } catch (err) {
    res.status(500).json({ error: 'Error al guardar archivo.' })
  }
}

const eliminarArchivo = async (req, res) => {
  const { archivoId } = req.params
  try {
    await prisma.archivo.delete({ where: { id: Number(archivoId) } })
    res.json({ mensaje: 'Archivo eliminado.' })
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Archivo no encontrado.' })
    res.status(500).json({ error: 'Error al eliminar archivo.' })
  }
}

module.exports = { listar, obtener, crear, actualizar, subirArchivo, eliminarArchivo }
