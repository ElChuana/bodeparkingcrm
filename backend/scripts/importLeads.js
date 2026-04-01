const fs = require('fs')
const path = require('path')
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const CSV_PATH = process.argv[2] || '/tmp/leads.csv'

function limpiarTelefono(raw) {
  if (!raw) return null
  // Quitar prefijo "p:" y espacios
  let t = raw.replace(/^p:/i, '').trim()
  // Si es número chileno sin código país, agregar +56
  t = t.replace(/\s/g, '')
  if (!t) return null
  return t
}

function splitNombre(nombreCompleto) {
  if (!nombreCompleto) return { nombre: 'Sin nombre', apellido: '' }
  const partes = nombreCompleto.trim().split(/\s+/)
  if (partes.length === 1) return { nombre: partes[0], apellido: '' }
  const nombre = partes[0]
  const apellido = partes.slice(1).join(' ')
  return { nombre, apellido }
}

function origenDesdePlatform(platform) {
  if (!platform) return 'OTRO'
  const p = platform.toLowerCase()
  if (p === 'ig') return 'INSTAGRAM'
  if (p === 'fb') return 'OTRO' // Facebook → OTRO por ahora
  return 'OTRO'
}

function esTestLead(row) {
  return row.nombre && row.nombre.includes('<test lead')
}

async function main() {
  const contenido = fs.readFileSync(CSV_PATH, 'utf-8')
  const lineas = contenido.split('\n').filter(l => l.trim())

  // Parsear CSV simple (sin comillas complejas)
  const headers = lineas[0].split(',').map(h => h.trim())
  const rows = lineas.slice(1).map(linea => {
    const valores = linea.split(',')
    const obj = {}
    headers.forEach((h, i) => { obj[h] = (valores[i] || '').trim() })
    return obj
  })

  console.log(`Total filas: ${rows.length}`)

  let creados = 0
  let duplicados = 0
  let omitidos = 0

  for (const row of rows) {
    // Saltar test leads
    if (esTestLead(row)) { omitidos++; continue }

    const email = row['correo_electrónico'] || row['email'] || null
    const telefono = limpiarTelefono(row['número_de_teléfono'] || row['phone_number'])
    const { nombre, apellido } = splitNombre(row['nombre'] || row['first_name'])

    // Saltar si no tiene contacto válido
    if (!nombre || nombre === 'Sin nombre') { omitidos++; continue }
    if (!email && !telefono) { omitidos++; continue }

    // Verificar si ya existe por email
    if (email) {
      const existe = await prisma.contacto.findFirst({ where: { email } })
      if (existe) { duplicados++; continue }
    }

    const origen = origenDesdePlatform(row['platform'])
    const campana = row['ad_name'] || null

    // Fecha de entrada desde created_time
    let creadoEn = new Date()
    if (row['created_time']) {
      const parsed = new Date(row['created_time'])
      if (!isNaN(parsed)) creadoEn = parsed
    }

    // Más de 2 semanas de antigüedad → PERDIDO
    const dosSemanasMs = 14 * 24 * 60 * 60 * 1000
    const etapa = (Date.now() - creadoEn.getTime()) > dosSemanasMs ? 'PERDIDO' : 'NUEVO'

    try {
      const contacto = await prisma.contacto.create({
        data: {
          nombre,
          apellido,
          email: email || null,
          telefono,
          origen,
        }
      })

      await prisma.lead.create({
        data: {
          contactoId: contacto.id,
          etapa,
          campana: campana && campana !== 'Test' ? campana : null,
          notas: row['platform'] ? `Plataforma: ${row['platform']}` : null,
          creadoEn,
        }
      })

      creados++
      if (creados % 100 === 0) console.log(`  Procesados: ${creados}...`)
    } catch (err) {
      console.error(`Error en fila (${nombre}):`, err.message)
    }
  }

  console.log(`\n✓ Importación completada`)
  console.log(`  Leads creados:  ${creados}`)
  console.log(`  Duplicados:     ${duplicados}`)
  console.log(`  Omitidos:       ${omitidos}`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
