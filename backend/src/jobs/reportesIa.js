const { generarReportesParaVendedoresActivos } = require('../lib/reportes')

// Reportes diarios con IA para cada vendedor activo
async function reportesIa() {
  try {
    const resultados = await generarReportesParaVendedoresActivos()
    const ok = resultados.filter(r => r.ok).length
    const fail = resultados.length - ok
    console.log(`[Reportes IA] ${ok} generados${fail ? `, ${fail} fallidos` : ''}`)
  } catch (err) {
    console.error('[Reportes IA] Error en cron:', err.message)
  }
}

module.exports = { reportesIa }
