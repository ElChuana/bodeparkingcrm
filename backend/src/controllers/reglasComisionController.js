const prisma = require('../lib/prisma')

const AMBITOS = ['VENDE', 'VENTAS_DE_OTROS', 'TODAS']
const ORIGENES = ['CUALQUIERA', 'SOLO_WEBINAR', 'NO_WEBINAR']
const ROLES = ['GERENTE', 'JEFE_VENTAS', 'VENDEDOR', 'BROKER_EXTERNO', 'ABOGADO']

const INCLUDE_USUARIO = { usuario: { select: { id: true, nombre: true, apellido: true, rol: true } } }

const listar = async (req, res) => {
  try {
    const reglas = await prisma.reglaComision.findMany({
      include: INCLUDE_USUARIO,
      orderBy: { creadoEn: 'asc' }
    })
    res.json(reglas)
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener reglas de comisión.' })
  }
}

const validar = (body, esCreacion) => {
  const { nombre, usuarioId, rol, ambito, origen, porcentaje, pctPromesa, pctEscritura } = body
  if (esCreacion && !nombre) return 'nombre es requerido.'
  if (esCreacion && porcentaje == null) return 'porcentaje es requerido.'
  if (esCreacion && !usuarioId && !rol) return 'Debe indicar un usuario o un rol.'
  if (usuarioId && rol) return 'Indica usuario O rol, no ambos.'
  if (ambito !== undefined && !AMBITOS.includes(ambito)) return 'ambito inválido.'
  if (origen !== undefined && !ORIGENES.includes(origen)) return 'origen inválido.'
  if (rol && !ROLES.includes(rol)) return 'rol inválido.'
  if (esCreacion && !ambito) return 'ambito es requerido.'
  if (pctPromesa != null && pctEscritura != null && Math.round(Number(pctPromesa) + Number(pctEscritura)) !== 100) {
    return 'pctPromesa + pctEscritura debe sumar 100.'
  }
  return null
}

const crear = async (req, res) => {
  const error = validar(req.body, true)
  if (error) return res.status(400).json({ error })
  const { nombre, usuarioId, rol, ambito, origen, porcentaje, pctPromesa, pctEscritura, activa } = req.body
  try {
    const regla = await prisma.reglaComision.create({
      data: {
        nombre,
        usuarioId: usuarioId ? Number(usuarioId) : null,
        rol: rol || null,
        ambito,
        origen: origen || 'CUALQUIERA',
        porcentaje: Number(porcentaje),
        pctPromesa: pctPromesa != null ? Number(pctPromesa) : 50,
        pctEscritura: pctEscritura != null ? Number(pctEscritura) : 50,
        activa: activa !== undefined ? Boolean(activa) : true,
      },
      include: INCLUDE_USUARIO
    })
    res.status(201).json(regla)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al crear regla de comisión.' })
  }
}

const actualizar = async (req, res) => {
  const { id } = req.params
  const error = validar(req.body, false)
  if (error) return res.status(400).json({ error })
  const { nombre, usuarioId, rol, ambito, origen, porcentaje, pctPromesa, pctEscritura, activa } = req.body
  try {
    const regla = await prisma.reglaComision.update({
      where: { id: Number(id) },
      data: {
        ...(nombre !== undefined && { nombre }),
        ...(usuarioId !== undefined && { usuarioId: usuarioId ? Number(usuarioId) : null }),
        ...(rol !== undefined && { rol: rol || null }),
        ...(ambito !== undefined && { ambito }),
        ...(origen !== undefined && { origen }),
        ...(porcentaje !== undefined && { porcentaje: Number(porcentaje) }),
        ...(pctPromesa !== undefined && { pctPromesa: Number(pctPromesa) }),
        ...(pctEscritura !== undefined && { pctEscritura: Number(pctEscritura) }),
        ...(activa !== undefined && { activa: Boolean(activa) }),
      },
      include: INCLUDE_USUARIO
    })
    res.json(regla)
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Regla no encontrada.' })
    console.error(err)
    res.status(500).json({ error: 'Error al actualizar regla de comisión.' })
  }
}

const eliminar = async (req, res) => {
  const { id } = req.params
  try {
    await prisma.reglaComision.delete({ where: { id: Number(id) } })
    res.json({ ok: true })
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Regla no encontrada.' })
    res.status(500).json({ error: 'Error al eliminar regla de comisión.' })
  }
}

module.exports = { listar, crear, actualizar, eliminar }
