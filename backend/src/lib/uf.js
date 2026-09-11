// Valor de la UF vigente según la caché diaria (`uf_diaria`, que llena el job
// de UF). Se usa para todo lo que se pacta en pesos y hay que expresar en UF.

const prisma = require('./prisma')

/** UF vigente en pesos, o null si todavía no hay ninguna cargada. */
async function ufVigente() {
  const row = await prisma.uFDiaria.findFirst({ orderBy: { fecha: 'desc' } })
  return row ? Number(row.valorPesos) : null
}

module.exports = { ufVigente }
