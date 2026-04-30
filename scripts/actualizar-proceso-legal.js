/**
 * Actualizar proceso legal de ventas desde CSV VENTAS TOTALES BODEPARKING
 *
 * Uso:
 *   cd /Users/juana/Documents/bodeparkingcrm/backend
 *   node ../scripts/actualizar-proceso-legal.js
 */

const path = require('path')
module.paths.unshift(path.join(__dirname, '../backend/node_modules'))
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') })

const { PrismaClient, EstadoLegal, EstadoVenta } = require('@prisma/client')

const RAILWAY_URL = 'postgresql://bodeparking:bodeparking2026!@monorail.proxy.rlwy.net:35865/bodeparkingcrm'
process.env.DATABASE_URL = RAILWAY_URL

const prisma = new PrismaClient()

// ─── Datos del CSV (27 ventas) ────────────────────────────────────────────────
// Columnas: comprador, fechaReserva, tienePromesa, FC, FV, CC, CBR, E, statusCSV
// FC = Firma Comprador, FV = Firma Vendedor, CC = Cierre de copias, CBR = CBR, E = Entrega
// SI o X = completado. Vacío = pendiente.

function done(v) {
  return v && v.trim() !== '' && v.trim() !== 'X' === false
    ? v.trim() !== ''
    : v && v.trim() !== ''
}

// Los datos crudos del CSV, fila a fila
const CSV_DATA = [
  // [COMPRADOR, FECHA_RESERVA, FECHA_PROMESA, FC, FV, CC, CBR, ENTREGA, STATUS]
  ['MARCIA FUENTES',        '31/07/2025', '',           'SI', 'SI', 'SI', 'SI', 'SI',        'Vendido'],
  ['SARA LINARES',          '31/07/2025', '',           'SI', 'SI', 'SI', 'SI', '',          'Vendido'],
  ['SARA LINARES',          '31/07/2025', '',           'SI', 'SI', 'SI', 'SI', '',          'Vendido'],
  ['ELÍAS VALVERDE',        '31/07/2025', '',           'SI', 'SI', 'SI', 'SI', '',          'Vendida'],
  ['GEMENES RODRIGUEZ',     '11/09/2025', '',           'SI', 'SI', 'SI', 'SI', '',          'Vendida'],
  ['GEMENES RODRIGUEZ',     '11/09/2025', '',           'SI', 'SI', 'SI', 'SI', '',          'Vendida'],
  ['GEMENES RODRIGUEZ',     '11/09/2025', '',           'SI', 'SI', 'SI', 'SI', '',          'Vendida'],
  ['ANTONIO OTONEL',        '18/12/2025', 'No promeso', 'SI', 'SI', 'SI', 'SI', 'SI',        'Vendida'],
  ['ANTONIO OTONEL',        '18/12/2025', 'No promeso', 'SI', 'SI', 'SI', 'SI', 'SI',        'Vendida'],
  ['CAROLINA MUÑOZ R.',     '07/01/2026', 'No promeso', 'SI', 'SI', 'SI', 'X',  '4/03/2026','Reservado'],
  ['CAROLINA TORO',         '19/01/2026', 'No promeso', 'SI', 'SI', 'SI', 'SI', 'X',         'Vendida'],
  ['CAROLINA SANDOVAL',     '30/01/2026', 'No promeso', 'SI', 'SI', 'X',  'X',  'X',         'Reservado'],
  ['FELIPE IÑIGUEZ',        '04/02/2026', '',           'SI', 'SI', 'X',  'X',  'X',         'Reservado'],
  ['GERMAN NAVARRETE',      '05/02/2026', '17/02/2026', 'SI', 'SI', 'X',  'X',  '',          'Reservado'],
  ['GERMAN NAVARRETE',      '05/02/2026', '17/02/2026', 'SI', 'SI', 'X',  'X',  '',          'Reservado'],
  ['CYNTHIA OTEIZA',        '13/02/2026', 'No promeso', 'SI', 'X',  'X',  'X',  '11/03/2026','Vendida'],
  ['CYNTHIA OTEIZA',        '13/02/2026', 'No promeso', 'SI', 'X',  'X',  'X',  '11/03/2026','Vendida'],
  ['CLAUDIA SUAREZ',        '17/02/2026', 'No promeso', 'SI', 'X',  'X',  'X',  'SI',        'Vendida'],
  ['CLAUDIA SUAREZ',        '18/02/2026', '',           'SI', 'X',  'X',  'X',  'SI',        'Vendida'],
  ['CLAUDIA SUAREZ',        '20/02/2026', 'No promeso', 'SI', 'X',  'X',  'X',  'SI',        'Vendida'],
  ['NATHALIA DE LA BARRA',  '25/02/2026', 'No promeso', 'X',  'X',  'X',  'X',  '2/03/2026','Vendida'],
  ['CLAUDIA SUAREZ',        '27/02/2026', '',           'X',  'X',  'X',  'X',  '3/03/2026', 'Vendida'],
  ['CLAUDIA SUAREZ',        '27/02/2026', '',           'X',  'X',  'X',  'X',  '3/03/2026', 'Vendida'],
  ['ESTEBAN ORREGO',        '05/03/2026', 'Promesado',  'X',  'X',  'X',  'X',  'X',         'Reservado'],
  ['CAROLINA MUÑOZ',        '25/03/2026', 'X',          'X',  'X',  'X',  'X',  'X',         'reservado'],
  ['DANIEL ALTAMIRANO',     '28/03/2026', 'X',          'X',  'X',  'X',  'X',  'X',         'reservado'],
]

// Parsear fecha DD/MM/YYYY → Date
function parseDate(str) {
  if (!str || str.trim() === '') return null
  const parts = str.trim().split('/')
  if (parts.length !== 3) return null
  const [d, m, y] = parts
  const year = y.length === 2 ? '20' + y : y
  return new Date(`${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}T12:00:00Z`)
}

// Normalizar nombre para comparación
function normNombre(s) {
  return (s || '').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ').trim()
}

// Determinar estadoActual según los pasos completados
function calcEstadoLegal(FC, FV, CC, CBR, E) {
  // Cualquier valor no vacío = completado
  const step = (v) => v && v.trim() !== ''
  if (step(E))   return EstadoLegal.ENTREGADO
  if (step(CBR)) return EstadoLegal.INSCRIPCION_CBR
  if (step(CC))  return EstadoLegal.FIRMADA_NOTARIA
  if (step(FV))  return EstadoLegal.FIRMA_INMOBILIARIA_PROMESA
  if (step(FC))  return EstadoLegal.FIRMA_CLIENTE_PROMESA
  return EstadoLegal.FIRMA_CLIENTE_PROMESA
}

// Determinar estado de venta según CSV
function calcEstadoVenta(statusCSV, fechaPromesaStr, FC, FV, CC, CBR, E) {
  const s = statusCSV.toLowerCase().trim()
  const step = (v) => v && v.trim() !== ''

  if (s === 'vendido' || s === 'vendida') {
    if (step(E)) return EstadoVenta.ESCRITURA  // entregado → escritura como mínimo
    return EstadoVenta.ESCRITURA
  }

  // Reservado → verificar si tiene promesa
  const tienePromesa = !!(fechaPromesaStr && fechaPromesaStr.trim() !== '' &&
    !['no promeso', 'x', ''].includes(fechaPromesaStr.toLowerCase().trim()))

  if (tienePromesa || (step(FC) && step(FV))) {
    return EstadoVenta.PROMESA
  }
  return EstadoVenta.RESERVA
}

async function main() {
  console.log('🏛️  Actualizando proceso legal de ventas...')
  console.log(`   BD: ${RAILWAY_URL.replace(/:([^:@]+)@/, ':****@')}\n`)

  // Cargar todas las ventas con comprador y fecha reserva
  const ventas = await prisma.venta.findMany({
    select: {
      id: true,
      estado: true,
      fechaReserva: true,
      comprador: { select: { nombre: true, apellido: true } },
      procesoLegal: { select: { id: true } }
    },
    orderBy: { id: 'asc' }
  })

  // Agrupar ventas por clave comprador+fecha
  const ventaMap = {}
  for (const v of ventas) {
    const nombreCompleto = normNombre(`${v.comprador.nombre} ${v.comprador.apellido}`)
    const fecha = v.fechaReserva
      ? v.fechaReserva.toISOString().split('T')[0]
      : 'sin-fecha'
    const key = `${nombreCompleto}|${fecha}`
    if (!ventaMap[key]) ventaMap[key] = []
    ventaMap[key].push(v)
  }

  let actualizados = 0
  let sinMatch = 0

  // Para cada fila CSV, buscar la venta correspondiente
  // Rastrear cuántas veces hemos usado una key (para manejar múltiples ventas mismo buyer+fecha)
  const keyIndex = {}

  for (const [compradorCSV, fechaReservaStr, fechaPromesaStr, FC, FV, CC, CBR, E, statusCSV] of CSV_DATA) {
    const fecha = parseDate(fechaReservaStr)
    const fechaKey = fecha ? fecha.toISOString().split('T')[0] : 'sin-fecha'

    // Buscar por nombre normalizado (exacto primero, luego por primer nombre)
    const nombreNorm = normNombre(compradorCSV)
    const primerNombre = nombreNorm.split(' ')[0]
    const key = `${nombreNorm}|${fechaKey}`

    let matchList = ventaMap[key]

    // Fallback: buscar por primer nombre + fecha (maneja apellidos incompletos en Railway)
    if (!matchList || matchList.length === 0) {
      const fallbackKey = Object.keys(ventaMap).find(k => {
        const [kNombre, kFecha] = k.split('|')
        return kFecha === fechaKey && kNombre.startsWith(primerNombre)
      })
      if (fallbackKey) matchList = ventaMap[fallbackKey]
    }

    if (!matchList || matchList.length === 0) {
      console.log(`⚠️  Sin match: "${compradorCSV}" ${fechaReservaStr}`)
      sinMatch++
      continue
    }

    // Tomar la siguiente venta del grupo (para múltiples ventas mismo buyer+fecha)
    const idx = keyIndex[key] || 0
    keyIndex[key] = idx + 1
    const venta = matchList[idx] || matchList[matchList.length - 1]

    const estadoLegal = calcEstadoLegal(FC, FV, CC, CBR, E)
    const estadoVenta = calcEstadoVenta(statusCSV, fechaPromesaStr, FC, FV, CC, CBR, E)

    const tienePromesa = !!(fechaPromesaStr && fechaPromesaStr.trim() !== '' &&
      !['no promeso', 'x', ''].includes(fechaPromesaStr.toLowerCase().trim()))

    // Fechas reales de entrega si son fechas válidas
    const fechaEntrega = parseDate(E) || null
    const fechaPromesa = parseDate(fechaPromesaStr) || null

    // Actualizar o crear ProcesoLegal
    if (venta.procesoLegal) {
      await prisma.procesoLegal.update({
        where: { ventaId: venta.id },
        data: {
          estadoActual: estadoLegal,
          tienePromesa,
          fechaLimiteEntrega: fechaEntrega,
        }
      })
    } else {
      await prisma.procesoLegal.create({
        data: {
          ventaId: venta.id,
          estadoActual: estadoLegal,
          tienePromesa,
          fechaLimiteEntrega: fechaEntrega,
        }
      })
    }

    // Actualizar estado y fechas de la venta
    const updateData = { estado: estadoVenta }
    if (fechaPromesa) updateData.fechaPromesa = fechaPromesa
    if (fechaEntrega) updateData.fechaEntrega = fechaEntrega

    await prisma.venta.update({
      where: { id: venta.id },
      data: updateData
    })

    const nombreDisplay = `${venta.comprador.nombre} ${venta.comprador.apellido}`.trim()
    console.log(`✅ Venta ${venta.id} (${nombreDisplay}) → ${estadoVenta} / Legal: ${estadoLegal}`)
    actualizados++
  }

  console.log(`\n─────────────────────────────────────────────`)
  console.log(`Actualizados: ${actualizados}`)
  console.log(`Sin match:    ${sinMatch}`)
  console.log(`─────────────────────────────────────────────`)

  await prisma.$disconnect()
}

main().catch(async (err) => {
  console.error('Error fatal:', err.message)
  await prisma.$disconnect()
  process.exit(1)
})
