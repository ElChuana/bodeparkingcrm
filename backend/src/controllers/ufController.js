const axios = require('axios')
const prisma = require('../lib/prisma')


const obtenerUF = async (req, res) => {
  try {
    const hoy = new Date()

    // Buscar en cache por rango del día (evita problemas de timezone)
    const inicio = new Date(hoy)
    inicio.setHours(0, 0, 0, 0)
    const fin = new Date(hoy)
    fin.setHours(23, 59, 59, 999)

    const cache = await prisma.uFDiaria.findFirst({
      where: { fecha: { gte: inicio, lte: fin } }
    })
    if (cache) return res.json({ fecha: cache.fecha, valorPesos: cache.valorPesos, fuente: 'cache' })

    // Consultar mindicador.cl — sin fecha devuelve los últimos 30 días, serie[0] es el más reciente
    const resp = await axios.get('https://mindicador.cl/api/uf', { timeout: 8000 })
    const serie = resp.data?.serie
    if (!serie?.length) throw new Error('Sin datos en mindicador.cl')

    const { fecha, valor } = serie[0]
    const fechaDate = new Date(fecha)

    await prisma.uFDiaria.upsert({
      where: { fecha: fechaDate },
      update: { valorPesos: valor },
      create: { fecha: fechaDate, valorPesos: valor }
    })

    res.json({ fecha: fechaDate, valorPesos: valor, fuente: 'mindicador' })
  } catch (err) {
    console.error('Error obteniendo UF:', err.message)

    // Fallback: último valor guardado
    const ultima = await prisma.uFDiaria.findFirst({ orderBy: { fecha: 'desc' } })
    if (ultima) {
      return res.json({ fecha: ultima.fecha, valorPesos: ultima.valorPesos, fuente: 'cache_fallback' })
    }

    res.status(503).json({ error: 'No se pudo obtener el valor de la UF.' })
  }
}

const convertir = async (req, res) => {
  const { uf } = req.query
  if (!uf) return res.status(400).json({ error: 'Parámetro uf requerido.' })

  try {
    const registro = await prisma.uFDiaria.findFirst({ orderBy: { fecha: 'desc' } })
    if (!registro) return res.status(503).json({ error: 'Sin datos de UF disponibles.' })

    const pesos = Number(uf) * registro.valorPesos
    res.json({ uf: Number(uf), pesos: Math.round(pesos), valorUF: registro.valorPesos })
  } catch (err) {
    res.status(500).json({ error: 'Error al convertir UF.' })
  }
}

module.exports = { obtenerUF, convertir }
