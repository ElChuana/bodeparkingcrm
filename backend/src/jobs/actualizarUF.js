const axios = require('axios')
const prisma = require('../lib/prisma')

// Trae el valor UF del día desde mindicador.cl y lo guarda en la BD
async function actualizarUF() {
  try {
    const hoy = new Date()
    const d = String(hoy.getDate()).padStart(2, '0')
    const m = String(hoy.getMonth() + 1).padStart(2, '0')
    const y = hoy.getFullYear()

    const resp = await axios.get(`https://mindicador.cl/api/uf/${d}-${m}-${y}`, { timeout: 10000 })
    const serie = resp.data?.serie
    if (!serie?.length) throw new Error('Sin datos')

    const { fecha, valor } = serie[0]
    await prisma.uFDiaria.upsert({
      where: { fecha: new Date(fecha) },
      update: { valorPesos: valor },
      create: { fecha: new Date(fecha), valorPesos: valor }
    })
    console.log(`[UF] Actualizada: $${valor.toLocaleString('es-CL')} (${d}/${m}/${y})`)
  } catch (err) {
    console.error('[UF] Error al actualizar:', err.message)
  }
}

module.exports = { actualizarUF }
