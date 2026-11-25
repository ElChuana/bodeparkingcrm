const cron = require('node-cron')
const { actualizarUF } = require('./actualizarUF')
const { chequeoAlertas } = require('./chequeoAlertas')
const { reportesIa } = require('./reportesIa')
const { reporteSemanal } = require('./reporteSemanal')
const { recordatorios } = require('./recordatorios')
const { rrssSyncMeta } = require('./rrssSync')
const { rrssSyncWeb } = require('./rrssSyncWeb')

// El servidor corre en UTC: 11 UTC = 7-8 AM Chile según horario de verano
function registrarJobs() {
  cron.schedule('0 9 * * *',    actualizarUF)    // UF diaria
  cron.schedule('0 12 * * *',   chequeoAlertas)  // leads sin actividad/estancados
  cron.schedule('0 11 * * *',   reportesIa)      // reporte diario IA por vendedor
  cron.schedule('0 11 * * 1',   reporteSemanal)  // reporte semanal gerencia (lunes)
  cron.schedule('*/15 * * * *', recordatorios)   // recordatorios vencidos + visitas 24h
  cron.schedule('0 6 * * *',    () => rrssSyncMeta().catch(() => {})) // RRSS: Meta Ads últimos 28 días (03:00 Chile verano)
  cron.schedule('10 6 * * *',   () => rrssSyncWeb().catch(() => {}))  // RRSS: GA4 (3 días) + Clarity (foto diaria, ≤4 llamadas)
}

module.exports = { registrarJobs }
