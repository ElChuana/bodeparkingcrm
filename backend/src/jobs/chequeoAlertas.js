const { _ejecutarChequeo } = require('../controllers/alertasController')

// Chequeo diario de leads sin actividad / estancados
async function chequeoAlertas() {
  try {
    const resultado = await _ejecutarChequeo()
    console.log(`[Alertas] Chequeo diario: ${resultado.alertasGeneradas?.length || 0} alertas, ${resultado.acciones?.length || 0} acciones`)
  } catch (err) {
    console.error('[Alertas] Error en cron:', err.message)
  }
}

module.exports = { chequeoAlertas }
