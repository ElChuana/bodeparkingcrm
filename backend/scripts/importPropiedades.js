const fs = require('fs')
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const CSV_PATH = process.argv[2] || '/tmp/propiedades.csv'

// Detectar edificio según el título y dirección
const EDIFICIOS = [
  { key: 'Obispo Salas', nombre: 'Obispo Salas', direccion: 'Obispo Hipólito Salas 445', region: 'Biobío', comuna: 'Concepción' },
  { key: 'Trinitarias',  nombre: 'Trinitarias',  direccion: 'Las Trinitarias 7047',      region: 'Metropolitana', comuna: 'Las Condes' },
  { key: 'Plus',         nombre: 'Plus',          direccion: 'Conde Del Maule 4325',      region: 'Metropolitana', comuna: 'Estación Central' },
  { key: 'Neocisterna',  nombre: 'Neocisterna',   direccion: 'Lo Ovalle 150',             region: 'Metropolitana', comuna: 'La Cisterna' },
  { key: 'Brasil',       nombre: 'Brasil',        direccion: 'Brasil 601',                region: 'Metropolitana', comuna: 'Santiago' },
  { key: 'Aldunate',     nombre: 'Aldunate',      direccion: 'Pedro León Gallo 1050',     region: 'Araucanía',     comuna: 'Temuco' },
]

function detectarEdificio(titulo) {
  for (const e of EDIFICIOS) {
    if (titulo.includes(e.key)) return e
  }
  return null
}

function extraerNumero(titulo) {
  // "Obispo Salas 154 Bodega" → "154"
  // "Plus B55 Bodega" → "B55"
  // "Neocisterna 50-51 Tandem" → "50-51"
  // "Brasil E2 E4 Tandem" → "E2-E4"
  // Quitar el nombre del edificio y la palabra final (Bodega/Estacionamiento/Tandem)
  let t = titulo
  for (const e of EDIFICIOS) { t = t.replace(e.key, '').trim() }
  t = t.replace(/\b(Bodega|Estacionamiento|Tandem)\b/gi, '').trim()
  // Normalizar espacios múltiples a guión
  t = t.replace(/\s+/g, '-').replace(/-+$/, '').replace(/^-+/, '')
  return t || titulo
}

function mapearEstado(estado) {
  if (!estado) return 'DISPONIBLE'
  const e = estado.toLowerCase()
  if (e === 'activo') return 'DISPONIBLE'
  if (e === 'reservado') return 'RESERVADO'
  if (e === 'vendido') return 'VENDIDO'
  return 'DISPONIBLE'
}

function mapearTipo(tipo) {
  if (!tipo) return 'BODEGA'
  const t = tipo.toLowerCase()
  if (t.includes('estacionamiento')) return 'ESTACIONAMIENTO'
  return 'BODEGA'
}

function parsearPrecio(raw) {
  if (!raw) return 0
  return parseFloat(raw.replace(',', '.')) || 0
}

function parsearM2(raw) {
  if (!raw) return null
  return parseFloat(raw.replace(',', '.')) || null
}

async function main() {
  const contenido = fs.readFileSync(CSV_PATH, 'utf-8')
  const lineas = contenido.split('\n').filter(l => l.trim())
  const headers = lineas[0].split(',').map(h => h.trim())

  // CSV con campos que pueden tener comas dentro de comillas → parseo manual
  function parseCsvLine(line) {
    const result = []
    let cur = '', inQuotes = false
    for (const ch of line) {
      if (ch === '"') { inQuotes = !inQuotes }
      else if (ch === ',' && !inQuotes) { result.push(cur.trim()); cur = '' }
      else { cur += ch }
    }
    result.push(cur.trim())
    return result
  }

  const rows = lineas.slice(1).map(linea => {
    const valores = parseCsvLine(linea)
    const obj = {}
    headers.forEach((h, i) => { obj[h] = (valores[i] || '').trim() })
    return obj
  })

  console.log(`Total propiedades: ${rows.length}`)

  // Crear edificios únicos
  const edificiosMap = {}
  for (const e of EDIFICIOS) {
    const existe = await prisma.edificio.findFirst({ where: { nombre: e.nombre } })
    if (existe) {
      edificiosMap[e.key] = existe.id
    } else {
      const creado = await prisma.edificio.create({
        data: {
          nombre: e.nombre,
          direccion: e.direccion,
          region: e.region,
          comuna: e.comuna,
        }
      })
      edificiosMap[e.key] = creado.id
      console.log(`  Edificio creado: ${e.nombre}`)
    }
  }

  let creadas = 0, omitidas = 0

  for (const row of rows) {
    const titulo = row['Título'] || ''
    const edificioInfo = detectarEdificio(titulo)
    if (!edificioInfo) { console.warn(`  Sin edificio para: ${titulo}`); omitidas++; continue }

    const edificioId = edificiosMap[edificioInfo.key]
    const numero = extraerNumero(titulo)
    const tipo = mapearTipo(row['Tipo'])
    const precioUF = parsearPrecio(row['Precio Venta'])
    const m2 = parsearM2(row['Superficie (m²)'])
    const estado = mapearEstado(row['Estado'])

    try {
      await prisma.unidad.create({
        data: {
          edificioId,
          tipo,
          numero,
          precioUF,
          m2,
          estado,
        }
      })
      creadas++
    } catch (err) {
      console.error(`  Error en ${titulo}:`, err.message)
      omitidas++
    }
  }

  console.log(`\n✓ Importación completada`)
  console.log(`  Unidades creadas: ${creadas}`)
  console.log(`  Omitidas:         ${omitidas}`)
  console.log(`\nEdificios creados:`)
  for (const e of EDIFICIOS) {
    const count = rows.filter(r => (r['Título'] || '').includes(e.key)).length
    console.log(`  ${e.nombre} (${e.comuna}): ${count} unidades`)
  }
}

main().catch(console.error).finally(() => prisma.$disconnect())
