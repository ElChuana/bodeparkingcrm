/**
 * Arreglar teléfonos de leads importados sin teléfono (hoja 2 - Leads Preguntas)
 *
 * Uso:
 *   cd /Users/juana/Documents/bodeparkingcrm/backend
 *   node ../scripts/arreglar-telefonos-leads.js
 */

const path = require('path')
module.paths.unshift(path.join(__dirname, '../backend/node_modules'))
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') })

const { PrismaClient } = require('@prisma/client')
const axios = require('axios')

process.env.DATABASE_URL = 'postgresql://bodeparking:bodeparking2026!@monorail.proxy.rlwy.net:35865/bodeparkingcrm'
const prisma = new PrismaClient()

const SPREADSHEET_ID = '1_nBFjJJpZHUDHXBDzVvPvcttxn3xLGAGS-ZLRgCmIFs'
const GID_HOJA2 = '433849164'

function parseCSVLine(line) {
  const result = []
  let current = '', inQuotes = false
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

function normalizaTelefono(tel) {
  if (!tel) return null
  return tel.replace(/^p:/i, '').trim() || null
}

async function main() {
  console.log('📞 Arreglando teléfonos de leads (hoja 1 y 2)...\n')

  // Construir mapa email → telefono desde ambas hojas
  const emailTelMap = new Map()

  // ── Hoja 1 ──────────────────────────────────────────────────
  console.log('📥 Descargando Hoja 1...')
  const r1 = await axios.get(
    `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=0`,
    { maxRedirects: 5, responseType: 'text', timeout: 30000, headers: { 'User-Agent': 'Mozilla/5.0' } }
  )
  const rows1 = parseCSV(r1.data)
  console.log(`   ${rows1.length} filas`)
  for (const row of rows1) {
    const email = (row['correo_electrónico'] || '').toLowerCase().trim()
    const tel = normalizaTelefono(row['número_de_teléfono'])
    if (email && tel) emailTelMap.set(email, tel)
  }

  // ── Hoja 2 ──────────────────────────────────────────────────
  console.log('📥 Descargando Hoja 2 (Leads Preguntas)...')
  const r2 = await axios.get(
    `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=${GID_HOJA2}`,
    { maxRedirects: 5, responseType: 'text', timeout: 30000, headers: { 'User-Agent': 'Mozilla/5.0' } }
  )
  const rows2 = parseCSV(r2.data)
  console.log(`   ${rows2.length} filas`)
  for (const row of rows2) {
    const email = (row['email'] || '').toLowerCase().trim()
    const tel = normalizaTelefono(row['phone_number'])
    if (email && tel) emailTelMap.set(email, tel)
  }

  console.log(`\n   Emails con teléfono en CSV: ${emailTelMap.size}`)

  // Cargar todos los contactos sin teléfono de Railway en memoria
  console.log('📡 Cargando contactos sin teléfono de Railway...')
  const sinTel = await prisma.contacto.findMany({
    where: { telefono: null, email: { not: null } },
    select: { id: true, email: true }
  })
  console.log(`   ${sinTel.length} contactos sin teléfono`)

  // Construir updates en lote
  const updates = []
  for (const c of sinTel) {
    const tel = emailTelMap.get(c.email.toLowerCase())
    if (tel) updates.push({ id: c.id, telefono: tel })
  }
  console.log(`   ${updates.length} matches encontrados\n`)

  // Ejecutar en lotes de 50
  const BATCH = 50
  let actualizados = 0
  for (let i = 0; i < updates.length; i += BATCH) {
    const chunk = updates.slice(i, i + BATCH)
    await Promise.all(chunk.map(u =>
      prisma.contacto.update({ where: { id: u.id }, data: { telefono: u.telefono } })
    ))
    actualizados += chunk.length
    if (actualizados % 200 === 0) console.log(`   ... ${actualizados} actualizados`)
  }

  const restantes = await prisma.contacto.count({ where: { telefono: null, origen: 'META' } })

  console.log('\n─────────────────────────────────────────────')
  console.log(`✅ Actualizados: ${actualizados}`)
  console.log(`   Quedan sin teléfono (META): ${restantes}`)
  console.log('─────────────────────────────────────────────')

  await prisma.$disconnect()
}

main().catch(async err => {
  console.error('Error:', err.message)
  await prisma.$disconnect()
  process.exit(1)
})
