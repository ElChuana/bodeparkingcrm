// Descarga y guarda todos los valores UF de 2025 y 2026 desde mindicador.cl
// Ejecutar: node src/seedUF.js
require('dotenv').config()
const axios = require('axios')
const prisma = require('./lib/prisma')

async function descargarAnio(anio) {
  console.log(`\nDescargando UF ${anio}...`)
  const resp = await axios.get(`https://mindicador.cl/api/uf/${anio}`, { timeout: 15000 })
  const serie = resp.data?.serie || []
  console.log(`  → ${serie.length} registros obtenidos`)
  return serie
}

async function main() {
  const anioActual = new Date().getFullYear()
  const anios = [anioActual - 1, anioActual]

  let totalInsertados = 0
  let totalOmitidos = 0

  for (const anio of anios) {
    const serie = await descargarAnio(anio)

    for (const { fecha, valor } of serie) {
      const fechaDate = new Date(fecha)
      try {
        await prisma.uFDiaria.upsert({
          where: { fecha: fechaDate },
          update: { valorPesos: valor },
          create: { fecha: fechaDate, valorPesos: valor }
        })
        totalInsertados++
      } catch (err) {
        console.warn(`  ⚠ Error en ${fecha}: ${err.message}`)
        totalOmitidos++
      }
    }

    console.log(`  ✅ ${anio} guardado`)
  }

  // Mostrar el valor de hoy
  const hoy = new Date()
  const inicio = new Date(hoy); inicio.setHours(0, 0, 0, 0)
  const fin   = new Date(hoy); fin.setHours(23, 59, 59, 999)
  const hoyUF = await prisma.uFDiaria.findFirst({ where: { fecha: { gte: inicio, lte: fin } } })

  console.log('\n══════════════════════════════════')
  console.log(`  Total guardados: ${totalInsertados}`)
  if (totalOmitidos) console.log(`  Omitidos: ${totalOmitidos}`)
  if (hoyUF) {
    console.log(`  UF hoy (${hoy.toLocaleDateString('es-CL')}): $${hoyUF.valorPesos.toLocaleString('es-CL')}`)
  }
  console.log('══════════════════════════════════')
}

main().catch(console.error).finally(() => prisma.$disconnect())
