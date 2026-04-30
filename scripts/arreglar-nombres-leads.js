/**
 * Arreglar nombres de leads importados sin nombre (hoja 2 - Leads Preguntas)
 *
 * Uso:
 *   cd /Users/juana/Documents/bodeparkingcrm/backend
 *   node ../scripts/arreglar-nombres-leads.js
 */

const path = require('path')
module.paths.unshift(path.join(__dirname, '../backend/node_modules'))
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') })

const { PrismaClient } = require('@prisma/client')
const axios = require('axios')

const RAILWAY_URL = 'postgresql://bodeparking:bodeparking2026!@monorail.proxy.rlwy.net:35865/bodeparkingcrm'
process.env.DATABASE_URL = RAILWAY_URL

const prisma = new PrismaClient()

const SPREADSHEET_ID = '1_nBFjJJpZHUDHXBDzVvPvcttxn3xLGAGS-ZLRgCmIFs'
const GID_HOJA2 = '433849164'

function parseCSVLine(line) {
  const result = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++ }
      else inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      result.push(current); current = ''
    } else {
      current += char
    }
  }
  result.push(current)
  return result
}

function parseCSV(text) {
  const lines = text.trim().split('\n')
  if (lines.length < 2) return []
  const headers = parseCSVLine(lines[0])
  return lines.slice(1).map(line => {
    const values = parseCSVLine(line)
    const row = {}
    headers.forEach((h, i) => { row[h.trim()] = (values[i] || '').trim() })
    return row
  }).filter(r => Object.values(r).some(v => v))
}

function splitNombre(nombreCompleto) {
  const parts = (nombreCompleto || '').trim().split(/\s+/)
  if (!parts[0]) return { nombre: 'Sin nombre', apellido: '' }
  if (parts.length === 1) return { nombre: parts[0], apellido: '' }
  return { nombre: parts[0], apellido: parts.slice(1).join(' ') }
}

async function main() {
  console.log('🔧 Arreglando nombres de leads sin nombre (hoja 2)...\n')

  // Descargar hoja 2
  console.log('📥 Descargando Leads Preguntas...')
  const exportUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=${GID_HOJA2}`
  const response = await axios.get(exportUrl, {
    maxRedirects: 5, responseType: 'text', timeout: 30000,
    headers: { 'User-Agent': 'Mozilla/5.0' }
  })
  const rows = parseCSV(response.data)
  console.log(`   ${rows.length} filas\n`)

  let actualizados = 0
  let sinMatch = 0
  let yaTenianNombre = 0

  for (const row of rows) {
    const firstName = row['first_name'] || ''
    const email = (row['email'] || '').toLowerCase().trim()

    if (!email) { sinMatch++; continue }
    if (!firstName) { sinMatch++; continue }

    // Buscar contacto por email que tenga "Sin nombre"
    const contacto = await prisma.contacto.findFirst({
      where: { email, nombre: 'Sin nombre' },
      select: { id: true }
    })

    if (!contacto) {
      yaTenianNombre++
      continue
    }

    const { nombre, apellido } = splitNombre(firstName)
    await prisma.contacto.update({
      where: { id: contacto.id },
      data: { nombre, apellido }
    })

    actualizados++
    if (actualizados % 100 === 0) console.log(`   ... ${actualizados} actualizados`)
  }

  // Verificar cuántos quedan sin nombre
  const restantes = await prisma.contacto.count({ where: { nombre: 'Sin nombre' } })

  console.log('\n─────────────────────────────────────────────')
  console.log(`✅ Actualizados:       ${actualizados}`)
  console.log(`   Ya tenían nombre:   ${yaTenianNombre}`)
  console.log(`   Sin email/nombre:   ${sinMatch}`)
  console.log(`   Quedan sin nombre:  ${restantes}`)
  console.log('─────────────────────────────────────────────')

  await prisma.$disconnect()
}

main().catch(async err => {
  console.error('Error:', err.message)
  await prisma.$disconnect()
  process.exit(1)
})
