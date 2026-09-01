const axios = require('axios')
const prisma = require('./prisma')

/**
 * Valor de la UF en pesos para una fecha.
 *
 * Primero mira la tabla `uf_diaria` (que llena el job diario) y solo sale a
 * mindicador.cl si no la tiene, guardando lo que traiga. Si tampoco hay red,
 * cae a la última UF conocida: para facturar es preferible un valor de ayer que
 * quedarse sin poder emitir.
 *
 * @param {Date|string} fecha
 * @returns {Promise<{valor:number, fecha:Date, fuente:string}>}
 */
async function valorUFEn(fecha = new Date()) {
  const dia = new Date(fecha)
  const inicio = new Date(dia); inicio.setHours(0, 0, 0, 0)
  const fin = new Date(dia); fin.setHours(23, 59, 59, 999)

  const cache = await prisma.uFDiaria.findFirst({ where: { fecha: { gte: inicio, lte: fin } } })
  if (cache) return { valor: Number(cache.valorPesos), fecha: cache.fecha, fuente: 'cache' }

  try {
    const d = String(dia.getDate()).padStart(2, '0')
    const m = String(dia.getMonth() + 1).padStart(2, '0')
    const y = dia.getFullYear()
    const resp = await axios.get(`https://mindicador.cl/api/uf/${d}-${m}-${y}`, { timeout: 8000 })
    const serie = resp.data?.serie
    if (serie?.length) {
      const { fecha: fRaw, valor } = serie[0]
      const fechaDate = new Date(fRaw)
      await prisma.uFDiaria.upsert({
        where: { fecha: fechaDate },
        update: { valorPesos: valor },
        create: { fecha: fechaDate, valorPesos: valor },
      })
      return { valor: Number(valor), fecha: fechaDate, fuente: 'mindicador' }
    }
  } catch {
    // sin red o mindicador caído — se resuelve abajo con la última conocida
  }

  const ultima = await prisma.uFDiaria.findFirst({ orderBy: { fecha: 'desc' } })
  if (ultima) return { valor: Number(ultima.valorPesos), fecha: ultima.fecha, fuente: 'ultima_conocida' }

  throw new Error('No hay valor de UF disponible.')
}

module.exports = { valorUFEn }
