const { generarReportesSemanalParaGerentes } = require('../lib/reportesSemanal')

// Reporte semanal consolidado para gerencia
async function reporteSemanal() {
  try {
    const resultados = await generarReportesSemanalParaGerentes()
    const ok = resultados.filter(r => r.ok).length
    console.log(`[Reporte Semanal] gerentes: ${ok}/${resultados.length}`)
  } catch (err) {
    console.error('[Reporte Semanal] Error en cron:', err.message)
  }
}

module.exports = { reporteSemanal }
