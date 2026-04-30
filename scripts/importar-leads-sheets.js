/**
 * Importar leads desde Google Sheets → Railway
 *
 * Uso:
 *   cd /Users/juana/Documents/bodeparkingcrm/backend
 *   node ../scripts/importar-leads-sheets.js
 *
 * Para importar solo una hoja:
 *   node ../scripts/importar-leads-sheets.js --sheet=1
 *   node ../scripts/importar-leads-sheets.js --sheet=2
 */

// Resolver módulos desde backend/node_modules
const path = require('path')
module.paths.unshift(path.join(__dirname, '../backend/node_modules'))

require('dotenv').config({ path: path.join(__dirname, '../backend/.env') })
const { PrismaClient } = require('@prisma/client')
const axios = require('axios')

const RAILWAY_URL = 'postgresql://bodeparking:bodeparking2026!@monorail.proxy.rlwy.net:35865/bodeparkingcrm'
process.env.DATABASE_URL = RAILWAY_URL

const prisma = new PrismaClient()

// ─── Google Sheets ───────────────────────────────────────────────────────────
const SPREADSHEET_ID = '1_nBFjJJpZHUDHXBDzVvPvcttxn3xLGAGS-ZLRgCmIFs'

const SHEETS = {
  1: { gid: '0',          nombre: 'Hoja 1 (leads jul-ago 2025)' },
  2: { gid: '433849164', nombre: 'Leads Preguntas' },
}

// ─── Parsear CSV simple (sin dependencias externas) ─────────────────────────
function parseCSV(text) {
  const lines = text.trim().split('\n')
  if (lines.length < 2) return []

  const headers = parseCSVLine(lines[0])
  const rows = []

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    if (values.length === 0) continue
    const row = {}
    headers.forEach((h, idx) => {
      row[h.trim()] = (values[idx] || '').trim()
    })
    rows.push(row)
  }

  return rows
}

function parseCSVLine(line) {
  const result = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += char
    }
  }
  result.push(current)
  return result
}

// ─── Descargar CSV ───────────────────────────────────────────────────────────
async function downloadCSV(gid) {
  const exportUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=${gid}`
  const response = await axios.get(exportUrl, {
    maxRedirects: 5,
    responseType: 'text',
    timeout: 30000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; CRM-Import/1.0)',
    },
  })
  return response.data
}

// ─── Normalizar nombre ────────────────────────────────────────────────────────
function splitNombre(nombreCompleto) {
  const parts = (nombreCompleto || '').trim().split(/\s+/)
  if (parts.length === 0 || !parts[0]) return { nombre: 'Sin nombre', apellido: '' }
  if (parts.length === 1) return { nombre: parts[0], apellido: '' }
  // Primer token = nombre, resto = apellido
  return { nombre: parts[0], apellido: parts.slice(1).join(' ') }
}

// ─── Normalizar teléfono (quitar prefijo "p:") ───────────────────────────────
function normalizaTelefono(tel) {
  if (!tel) return null
  return tel.replace(/^p:/i, '').trim() || null
}

// ─── Normalizar origen ────────────────────────────────────────────────────────
const { OrigenLead } = require('@prisma/client')
function normalizaOrigen(platform) {
  // 'ig', 'fb', 'an' (audience network) → todos META
  return OrigenLead.META
}

// ─── Parsear fecha de Google Sheets (formato: 2025-07-15T10:23:00+0000) ──────
function parseFecha(str) {
  if (!str) return new Date()
  try {
    const d = new Date(str)
    if (!isNaN(d.getTime())) return d
  } catch {}
  return new Date()
}

// ─── Importar una hoja ───────────────────────────────────────────────────────
async function importarHoja(sheetNum) {
  const sheet = SHEETS[sheetNum]
  if (!sheet) {
    console.error(`Hoja ${sheetNum} no definida`)
    return { creados: 0, duplicados: 0, errores: 0 }
  }

  console.log(`\n📥 Descargando ${sheet.nombre} (gid=${sheet.gid})...`)
  let csvText
  try {
    csvText = await downloadCSV(sheet.gid)
  } catch (err) {
    console.error(`❌ Error descargando hoja ${sheetNum}: ${err.message}`)
    if (err.response?.status === 400) {
      console.error('   → La hoja puede estar privada o el gid es incorrecto.')
    }
    return { creados: 0, duplicados: 0, errores: 0 }
  }

  const rows = parseCSV(csvText)
  console.log(`   ${rows.length} filas encontradas`)

  if (rows.length === 0) {
    console.log('   Sin datos, saltando.')
    return { creados: 0, duplicados: 0, errores: 0 }
  }

  // Mostrar columnas disponibles
  const cols = Object.keys(rows[0])
  console.log(`   Columnas: ${cols.join(', ')}`)

  let creados = 0
  let duplicados = 0
  let errores = 0

  for (const row of rows) {
    try {
      // Detectar columnas con nombres variables
      const nombre = row['nombre'] || row['full_name'] || row['Nombre'] || row['first_name'] || ''
      const email = (row['correo_electrónico'] || row['email'] || row['Email'] || row['correo'] || '').toLowerCase().trim()
      const telefonoRaw = row['número_de_teléfono'] || row['telefono'] || row['phone_number'] || row['phone'] || ''
      const telefono = normalizaTelefono(telefonoRaw)
      const createdTime = row['created_time'] || row['fecha'] || ''
      const campana = row['campaign_name'] || row['campaña'] || row['campaign'] || ''
      const platform = row['platform'] || row['plataforma'] || 'fb'

      if (!nombre && !email) {
        errores++
        continue
      }

      // Saltar filas de prueba (datos dummy de Facebook)
      if (nombre.startsWith('<test') || email.startsWith('<test') || email === 'test@fb.com') {
        duplicados++
        continue
      }

      // Deduplicar por email
      if (email) {
        const existe = await prisma.contacto.findFirst({
          where: { email },
          select: { id: true },
        })
        if (existe) {
          duplicados++
          continue
        }
      }

      const { nombre: primerNombre, apellido } = splitNombre(nombre)
      const origen = normalizaOrigen(platform)
      const creadoEn = parseFecha(createdTime)

      // Crear Contacto + Lead en transacción
      await prisma.$transaction(async (tx) => {
        const contacto = await tx.contacto.create({
          data: {
            nombre: primerNombre,
            apellido,
            email: email || null,
            telefono,
            origen,
          },
        })

        await tx.lead.create({
          data: {
            contactoId: contacto.id,
            etapa: 'NUEVO',
            campana: campana || null,
            creadoEn,
          },
        })
      })

      creados++
      if (creados % 50 === 0) console.log(`   ... ${creados} leads creados`)
    } catch (err) {
      console.error(`   Error en fila: ${JSON.stringify(row).slice(0, 80)} → ${err.message}`)
      errores++
    }
  }

  return { creados, duplicados, errores }
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2)
  const sheetArg = args.find(a => a.startsWith('--sheet='))
  const sheetNum = sheetArg ? parseInt(sheetArg.split('=')[1]) : null

  console.log('🚀 Importador de leads desde Google Sheets → Railway')
  console.log(`   BD: ${RAILWAY_URL.replace(/:([^:@]+)@/, ':****@')}`)

  const hojas = sheetNum ? [sheetNum] : [1, 2]
  let totalCreados = 0
  let totalDuplicados = 0
  let totalErrores = 0

  for (const h of hojas) {
    const { creados, duplicados, errores } = await importarHoja(h)
    totalCreados += creados
    totalDuplicados += duplicados
    totalErrores += errores
  }

  console.log('\n─────────────────────────────────────────────')
  console.log(`✅ Importación completa:`)
  console.log(`   Creados:    ${totalCreados}`)
  console.log(`   Duplicados: ${totalDuplicados} (saltados)`)
  console.log(`   Errores:    ${totalErrores}`)
  console.log('─────────────────────────────────────────────')

  await prisma.$disconnect()
}

main().catch(async (err) => {
  console.error('Error fatal:', err)
  await prisma.$disconnect()
  process.exit(1)
})
