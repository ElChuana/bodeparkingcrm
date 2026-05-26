const prisma = require('../lib/prisma')
const { generarReporteVendedor, guardarReporte, generarReportesParaVendedoresActivos } = require('../lib/reportes')

// GET /api/reportes-ia/mi-reporte → reporte del usuario logeado (hoy o el más reciente)
async function miReporte(req, res) {
  try {
    const usuarioId = req.usuario.id
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0)

    let reporte = await prisma.reporteDiario.findUnique({
      where: { vendedorId_fecha: { vendedorId: usuarioId, fecha: hoy } }
    })
    if (!reporte) {
      reporte = await prisma.reporteDiario.findFirst({
        where: { vendedorId: usuarioId },
        orderBy: { fecha: 'desc' }
      })
    }
    if (!reporte) return res.json({ reporte: null })
    res.json({ reporte })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al obtener mi reporte.' })
  }
}

// GET /api/reportes-ia/vendedor/:vendedorId → reporte específico de un vendedor (GERENTE/JEFE_VENTAS)
async function reportePorVendedor(req, res) {
  try {
    const vendedorId = parseInt(req.params.vendedorId, 10)
    if (Number.isNaN(vendedorId)) return res.status(400).json({ error: 'vendedorId inválido.' })

    const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
    let reporte = await prisma.reporteDiario.findUnique({
      where: { vendedorId_fecha: { vendedorId, fecha: hoy } }
    })
    if (!reporte) {
      reporte = await prisma.reporteDiario.findFirst({
        where: { vendedorId },
        orderBy: { fecha: 'desc' }
      })
    }
    if (!reporte) return res.json({ reporte: null })
    res.json({ reporte })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al obtener reporte del vendedor.' })
  }
}

// POST /api/reportes-ia/generar → fuerza generación manual (GERENTE)
// Body opcional: { vendedorId: number } — si no, regenera para todos los vendedores activos
async function generarManual(req, res) {
  try {
    const { vendedorId } = req.body || {}

    if (vendedorId) {
      const contenido = await generarReporteVendedor(parseInt(vendedorId, 10))
      const r = await guardarReporte(parseInt(vendedorId, 10), contenido)
      return res.json({ mensaje: 'Reporte generado.', reporte: r })
    }

    const resultados = await generarReportesParaVendedoresActivos()
    res.json({ mensaje: 'Reportes generados.', resultados })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message || 'Error al generar reporte.' })
  }
}

module.exports = { miReporte, reportePorVendedor, generarManual }
