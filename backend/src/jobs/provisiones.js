const { generarProvisiones } = require('../controllers/documentosController')

/**
 * Materializa los gastos programados en sus provisiones (DocumentoInterno PROVISION),
 * del mes en curso y el siguiente. Idempotente: el @@unique(gasto, período) y el set de
 * existentes hacen que correrlo dos veces no duplique nada.
 */
async function generarProvisionesMensuales() {
  try {
    const r = await generarProvisiones({ meses: 2 })
    if (r.generadas) console.log(`[provisiones] ${r.generadas} provisión(es) generadas para ${r.gastosActivos} gasto(s) activos`)
  } catch (err) {
    console.error('[provisiones] error al generar provisiones:', err.message)
  }
}

module.exports = { generarProvisionesMensuales }
