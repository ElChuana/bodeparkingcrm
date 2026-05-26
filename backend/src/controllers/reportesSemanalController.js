const prisma = require('../lib/prisma')
const { generarReporteSemanalGerente, guardarReporteSemanal, generarReportesSemanalParaGerentes } = require('../lib/reportesSemanal')

// GET /api/reportes-semanal/mi-reporte → más reciente del gerente logeado
async function miReporteSemanal(req, res) {
  try {
    if (req.usuario.rol !== 'GERENTE') return res.status(403).json({ error: 'Solo GERENTE.' })

    const reporte = await prisma.reporteSemanal.findFirst({
      where: { gerenteId: req.usuario.id },
      orderBy: { fechaInicio: 'desc' }
    })
    if (!reporte) return res.json({ reporte: null })
    res.json({ reporte })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al obtener reporte semanal.' })
  }
}

// GET /api/reportes-semanal → lista de reportes históricos del gerente
async function listarHistorico(req, res) {
  try {
    if (req.usuario.rol !== 'GERENTE') return res.status(403).json({ error: 'Solo GERENTE.' })

    const reportes = await prisma.reporteSemanal.findMany({
      where: { gerenteId: req.usuario.id },
      orderBy: { fechaInicio: 'desc' },
      select: { id: true, fechaInicio: true, fechaFin: true, creadoEn: true }
    })
    res.json(reportes)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al listar histórico.' })
  }
}

// POST /api/reportes-semanal/generar → fuerza generación manual (GERENTE)
async function generarManual(req, res) {
  try {
    if (req.usuario.rol !== 'GERENTE') return res.status(403).json({ error: 'Solo GERENTE.' })

    const contenido = await generarReporteSemanalGerente(req.usuario.id)
    const r = await guardarReporteSemanal(req.usuario.id, contenido)
    res.json({ mensaje: 'Reporte semanal generado.', reporte: r })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message || 'Error al generar reporte semanal.' })
  }
}

module.exports = { miReporteSemanal, listarHistorico, generarManual }
