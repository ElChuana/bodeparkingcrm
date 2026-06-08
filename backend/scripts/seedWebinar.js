// Crea los datos del Webinar Junio 2026:
//  - Campaña "Webinar Junio 2026" (vence 30-jun-2026)
//  - 3 descuentos por tier (DESCUENTO_UF por-unidad) que llevan al precio webinar
//  - 3 packs por volumen (5 UF: Dúo/Trío/Inversor)
//  - Asegura el beneficio "Gastos Operacionales" activo (permanente)
// Idempotente: upsert por nombre. Uso: node scripts/seedWebinar.js
require('dotenv').config()
process.env.DATABASE_URL = process.env.DATABASE_URL_RAILWAY || process.env.DATABASE_URL
const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()

const FECHA_FIN = new Date('2026-06-30T23:59:59')

// Precio webinar prometido por tier (UF exacta, base $ a UF=40.391)
const TIERS = {
  ENTRY: {
    precioWebinar: 74.03,
    unidades: [
      ['Plus', 'B142'],
      ['Obispo Salas', '87'], ['Obispo Salas', '45'], ['Obispo Salas', '159'], ['Obispo Salas', '151'],
      ['Obispo Salas', '106'], ['Obispo Salas', '105'], ['Obispo Salas', '58'], ['Obispo Salas', '41'],
      ['Obispo Salas', '42'], ['Obispo Salas', '43'], ['Obispo Salas', '120'],
    ],
  },
  MID: {
    precioWebinar: 86.41,
    unidades: [
      ['Obispo Salas', '126'], ['Obispo Salas', '40'], ['Obispo Salas', '152'],
      ['Obispo Salas', '24'], ['Obispo Salas', '110'], ['Obispo Salas', '79'],
    ],
  },
  PREMIUM: {
    precioWebinar: 98.78,
    unidades: [
      ['Obispo Salas', '153'], ['Obispo Salas', '128'], ['Obispo Salas', '86'], ['Obispo Salas', '133'], ['Obispo Salas', '28'],
      ['Aldunate', '1'], ['Aldunate', '2'], ['Aldunate', '15'], ['Aldunate', '43'], ['Aldunate', '46'],
      ['Aldunate', '61'], ['Aldunate', '63'], ['Aldunate', '65'], ['Aldunate', '73'],
    ],
  },
}

const PACKS = [
  { nombre: 'Pack Dúo Webinar', min: 2 },
  { nombre: 'Pack Trío Webinar', min: 3 },
  { nombre: 'Pack Inversor', min: 4 },
]

async function resolverUnidad(edificioNombre, numero) {
  return p.unidad.findFirst({
    where: { numero, edificio: { nombre: { equals: edificioNombre, mode: 'insensitive' } } },
  })
}

async function upsertPromo(nombre, data) {
  const existe = await p.promocion.findFirst({ where: { nombre } })
  if (existe) return p.promocion.update({ where: { id: existe.id }, data })
  return p.promocion.create({ data: { nombre, ...data } })
}

async function main() {
  // 1. Campaña
  let campana = await p.campana.findFirst({ where: { nombre: 'Webinar Junio 2026' } })
  if (!campana) {
    campana = await p.campana.create({
      data: { nombre: 'Webinar Junio 2026', descripcion: 'Lanzamiento webinar 9 jun 2026', fechaFin: FECHA_FIN, activa: true },
    })
  }
  console.log(`Campaña #${campana.id}: ${campana.nombre}`)

  // 2. Descuentos por tier (por-unidad → habilitan el tachado)
  for (const [tier, info] of Object.entries(TIERS)) {
    const unidades = []
    for (const [ed, num] of info.unidades) {
      const u = await resolverUnidad(ed, num)
      if (!u) { console.warn(`  ⚠ No encontrada: ${ed} ${num}`); continue }
      unidades.push(u)
    }
    if (unidades.length === 0) { console.warn(`  ⚠ ${tier}: sin unidades, salto`); continue }

    const precios = [...new Set(unidades.map(u => u.precioUF))]
    if (precios.length !== 1) console.warn(`  ⚠ ${tier}: precios lista NO uniformes: ${precios.join(', ')} (uso el más alto)`)
    const base = precios.length === 1 ? precios[0] : Math.max(...unidades.map(u => u.precioUF))
    const descuento = Number((base - info.precioWebinar).toFixed(2))

    const promo = await upsertPromo(`Precio Webinar ${tier}`, {
      descripcion: `Precio webinar: ${base} UF → ${info.precioWebinar} UF (−${descuento} UF)`,
      categoria: 'DESCUENTO',
      tipo: 'DESCUENTO_UF',
      valorUF: descuento,
      minUnidades: null,
      fechaFin: FECHA_FIN,
      activa: true,
      campanaId: campana.id,
    })
    // re-asociar unidades (idempotente)
    await p.unidadPromocion.deleteMany({ where: { promocionId: promo.id } })
    for (const u of unidades) {
      await p.unidadPromocion.create({ data: { promocionId: promo.id, unidadId: u.id } })
    }
    console.log(`  ${tier}: promo #${promo.id} −${descuento} UF (${base}→${info.precioWebinar}) · ${unidades.length} unidades`)
  }

  // 3. Packs por volumen (5 UF fijo cada uno)
  for (const pk of PACKS) {
    const promo = await upsertPromo(pk.nombre, {
      descripcion: '+ Gastos Operacionales de regalo',
      categoria: 'DESCUENTO',
      tipo: 'DESCUENTO_UF',
      valorUF: 5,
      minUnidades: pk.min,
      fechaFin: FECHA_FIN,
      activa: true,
      campanaId: campana.id,
    })
    console.log(`  ${pk.nombre}: promo #${promo.id} −5 UF (min ${pk.min} unidades)`)
  }

  // 4. Beneficio Gastos Operacionales (permanente) — asegurar activo
  const go = await p.promocion.findFirst({
    where: { nombre: { contains: 'Gastos Operacionales', mode: 'insensitive' }, categoria: 'BENEFICIO' },
  })
  if (go) {
    await p.promocion.update({ where: { id: go.id }, data: { activa: true } })
    console.log(`  Beneficio Gastos Operacionales: #${go.id} (permanente, activo)`)
  } else {
    console.warn('  ⚠ No se encontró el beneficio Gastos Operacionales')
  }

  console.log('\n✅ Seed webinar completo.')
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => p.$disconnect())
