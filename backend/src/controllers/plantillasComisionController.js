const prisma = require('../lib/prisma')

const listar = async (req, res) => {
  try {
    const plantillas = await prisma.plantillaComision.findMany({
      orderBy: { creadoEn: 'asc' }
    })
    res.json(plantillas)
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener plantillas.' })
  }
}

const crear = async (req, res) => {
  const { nombre, concepto, porcentaje, montoFijo, pctPromesa, pctEscritura, activa } = req.body
  if (!nombre || !concepto) return res.status(400).json({ error: 'nombre y concepto son requeridos.' })
  if (porcentaje == null && montoFijo == null) return res.status(400).json({ error: 'Debe indicar porcentaje o montoFijo.' })
  const pProm = pctPromesa != null ? Number(pctPromesa) : 50
  const pEsc = pctEscritura != null ? Number(pctEscritura) : 50
  if (Math.round(pProm + pEsc) !== 100) return res.status(400).json({ error: 'pctPromesa + pctEscritura debe sumar 100.' })
  try {
    const plantilla = await prisma.plantillaComision.create({
      data: {
        nombre,
        concepto,
        porcentaje: porcentaje != null ? Number(porcentaje) : null,
        montoFijo: montoFijo != null ? Number(montoFijo) : null,
        pctPromesa: pProm,
        pctEscritura: pEsc,
        activa: activa !== undefined ? Boolean(activa) : true
      }
    })
    res.status(201).json(plantilla)
  } catch (err) {
    res.status(500).json({ error: 'Error al crear plantilla.' })
  }
}

const actualizar = async (req, res) => {
  const { id } = req.params
  const { nombre, concepto, porcentaje, montoFijo, pctPromesa, pctEscritura, activa } = req.body
  if (pctPromesa != null && pctEscritura != null) {
    if (Math.round(Number(pctPromesa) + Number(pctEscritura)) !== 100) {
      return res.status(400).json({ error: 'pctPromesa + pctEscritura debe sumar 100.' })
    }
  }
  try {
    const plantilla = await prisma.plantillaComision.update({
      where: { id: Number(id) },
      data: {
        ...(nombre !== undefined && { nombre }),
        ...(concepto !== undefined && { concepto }),
        ...(porcentaje !== undefined && { porcentaje: porcentaje != null ? Number(porcentaje) : null }),
        ...(montoFijo !== undefined && { montoFijo: montoFijo != null ? Number(montoFijo) : null }),
        ...(pctPromesa !== undefined && { pctPromesa: Number(pctPromesa) }),
        ...(pctEscritura !== undefined && { pctEscritura: Number(pctEscritura) }),
        ...(activa !== undefined && { activa: Boolean(activa) }),
      }
    })
    res.json(plantilla)
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Plantilla no encontrada.' })
    res.status(500).json({ error: 'Error al actualizar plantilla.' })
  }
}

const eliminar = async (req, res) => {
  const { id } = req.params
  try {
    await prisma.plantillaComision.delete({ where: { id: Number(id) } })
    res.json({ ok: true })
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Plantilla no encontrada.' })
    res.status(500).json({ error: 'Error al eliminar plantilla.' })
  }
}

module.exports = { listar, crear, actualizar, eliminar }
