const prisma = require('../lib/prisma')
const {
  generarReporteSemanalGerente,
  generarReporteSemanalVendedor,
  guardarReporteSemanal,
  generarReportesSemanalParaGerentes,
  generarReportesSemanalParaVendedores
} = require('../lib/reportesSemanal')

// GET /api/reportes-semanal/mi-reporte → más reciente del usuario logeado
async function miReporteSemanal(req, res) {
  try {
    const reporte = await prisma.reporteSemanal.findFirst({
      where: { usuarioId: req.usuario.id },
      orderBy: { fechaInicio: 'desc' }
    })
    if (!reporte) return res.json({ reporte: null })
    res.json({ reporte })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al obtener reporte semanal.' })
  }
}

// GET /api/reportes-semanal/usuario/:usuarioId → reporte de otro usuario
// Acceso: GERENTE y JEFE_VENTAS (solo lectura)
async function reportePorUsuario(req, res) {
  try {
    if (!['GERENTE', 'JEFE_VENTAS'].includes(req.usuario.rol)) {
      return res.status(403).json({ error: 'No autorizado.' })
    }
    const usuarioId = parseInt(req.params.usuarioId, 10)
    if (Number.isNaN(usuarioId)) return res.status(400).json({ error: 'usuarioId inválido.' })

    const reporte = await prisma.reporteSemanal.findFirst({
      where: { usuarioId },
      orderBy: { fechaInicio: 'desc' }
    })
    if (!reporte) return res.json({ reporte: null })
    res.json({ reporte })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al obtener reporte del usuario.' })
  }
}

// GET /api/reportes-semanal → lista de reportes históricos del usuario
async function listarHistorico(req, res) {
  try {
    const reportes = await prisma.reporteSemanal.findMany({
      where: { usuarioId: req.usuario.id },
      orderBy: { fechaInicio: 'desc' },
      select: { id: true, fechaInicio: true, fechaFin: true, creadoEn: true }
    })
    res.json(reportes)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al listar histórico.' })
  }
}

// POST /api/reportes-semanal/generar → genera el reporte del usuario logueado
// (GERENTE genera reporte de equipo; VENDEDOR/JEFE_VENTAS genera el suyo personal)
async function generarManual(req, res) {
  try {
    const usuario = req.usuario
    let contenido
    if (usuario.rol === 'GERENTE') {
      contenido = await generarReporteSemanalGerente(usuario.id)
    } else if (['VENDEDOR', 'JEFE_VENTAS'].includes(usuario.rol)) {
      contenido = await generarReporteSemanalVendedor(usuario.id)
    } else {
      return res.status(403).json({ error: 'Rol no autorizado para reporte semanal.' })
    }
    const r = await guardarReporteSemanal(usuario.id, contenido)
    res.json({ mensaje: 'Reporte semanal generado.', reporte: r })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message || 'Error al generar reporte semanal.' })
  }
}

module.exports = { miReporteSemanal, reportePorUsuario, listarHistorico, generarManual }
