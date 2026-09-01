const cron = require('node-cron')
const { actualizarUF } = require('./actualizarUF')
const { chequeoAlertas } = require('./chequeoAlertas')
const { reportesIa } = require('./reportesIa')
const { reporteSemanal } = require('./reporteSemanal')
const { recordatorios } = require('./recordatorios')
const { generarProvisionesMensuales } = require('./provisiones')

// El servidor corre en UTC: 11 UTC = 7-8 AM Chile según horario de verano
function registrarJobs() {
  cron.schedule('0 9 * * *',    actualizarUF)    // UF diaria
  cron.schedule('0 12 * * *',   chequeoAlertas)  // leads sin actividad/estancados
  cron.schedule('0 11 * * *',   reportesIa)      // reporte diario IA por vendedor
  cron.schedule('0 11 * * 1',   reporteSemanal)  // reporte semanal gerencia (lunes)
  cron.schedule('*/15 * * * *', recordatorios)   // recordatorios vencidos + visitas 24h
  cron.schedule('0 10 1 * *',   generarProvisionesMensuales) // ERP: provisiones del mes (día 1)
}

module.exports = { registrarJobs }
