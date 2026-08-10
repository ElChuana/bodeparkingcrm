// Prepara el CRM para el Webinar de Agosto 2026 (directo 10-ago, promo vigente hasta el 17-ago).
// Fuente comercial: ~/Documentos/bodeparking-finanzas/webinar precios.xlsx (hoja "Propuesta Webinar").
//
//  1. Campaña "Webinar Agosto 2026" (esWebinar=true → activa las comisiones de webinar)
//  2. Sube el precio de LISTA de las 36 unidades disponibles al precio ANCLA del excel
//     (queda registro en historial_precios_unidad)
//  3. Crea los descuentos "Precio Webinar" por tier con precioObjetivoPesos → el precio final
//     en $ cae exacto según la UF vigente al cotizar
//  4. Reactiva el Pack 2+ Unidades (−5 UF) y el beneficio Gastos Operacionales
//  5. Desactiva las promos del webinar de junio
//
// Idempotente: upsert por nombre, precios por ancla (no acumula). Uso: node scripts/seed-webinar-ago2026.js
require('dotenv').config()
process.env.DATABASE_URL = process.env.DATABASE_URL_RAILWAY || process.env.DATABASE_URL
const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()

const CAMPANA = 'Webinar Agosto 2026'
const FECHA_FIN = new Date('2026-08-17T23:59:59')
const USUARIO_ID = 7 // Juan Valdivieso (GERENTE) — autor del cambio de precios
const MOTIVO = 'Precio ancla Webinar Agosto 2026'

// Tiers: ancla = nuevo precio de lista (en $), objetivo = precio webinar (en $).
const TIERS = [
  {
    nombre: 'Precio Webinar GANCHO · Ago 2026', ancla: 3290000, objetivo: 2490000,
    descripcion: 'Precio webinar $2.490.000 — solo 3 unidades',
    unidades: [['Obispo Salas', '45'], ['Obispo Salas', '87'], ['Obispo Salas', '151']],
  },
  {
    nombre: 'Precio Webinar ENTRY · Ago 2026', ancla: 3890000, objetivo: 2990000,
    descripcion: 'Precio webinar $2.990.000',
    unidades: [['Obispo Salas', '159'], ['Obispo Salas', '105'], ['Obispo Salas', '106'],
      ['Obispo Salas', '41'], ['Obispo Salas', '42'], ['Obispo Salas', '43']],
  },
  {
    nombre: 'Precio Webinar MID · Ago 2026', ancla: 4490000, objetivo: 3490000,
    descripcion: 'Precio webinar $3.490.000',
    unidades: [['Obispo Salas', '126'], ['Obispo Salas', '40'], ['Obispo Salas', '110'],
      ['Obispo Salas', '24'], ['Obispo Salas', '79']],
  },
  {
    nombre: 'Precio Webinar PREMIUM · Ago 2026', ancla: 4990000, objetivo: 3990000,
    descripcion: 'Precio webinar $3.990.000',
    unidades: [['Obispo Salas', '128'], ['Obispo Salas', '153'], ['Obispo Salas', '86'],
      ['Obispo Salas', '133'], ['Obispo Salas', '28'], ['Obispo Salas', '154'],
      ['Obispo Salas', '80'], ['Obispo Salas', '139'], ['Obispo Salas', '75']],
  },
  {
    nombre: 'Precio Webinar Aldunate · Ago 2026', ancla: 4990000, objetivo: 3990000,
    descripcion: 'Precio webinar $3.990.000 — Aldunate, Temuco',
    unidades: [['Aldunate', '65'], ['Aldunate', '63'], ['Aldunate', '46'],
      ['Aldunate', '43'], ['Aldunate', '2'], ['Aldunate', '34']],
  },
  {
    nombre: 'Precio Webinar Trinitarias · Ago 2026', ancla: 7490000, objetivo: 5990000,
    descripcion: 'Precio webinar $5.990.000 — Trinitarias, Las Condes',
    unidades: [['Trinitarias', '204'], ['Trinitarias', '205'], ['Trinitarias', '23'], ['Trinitarias', '31']],
  },
  // Plus: el ancla va en UF fija (2× costo) y el precio webinar es el de renta 8%.
  {
    nombre: 'Precio Webinar Plus B149 · Ago 2026', anclaUF: 296, objetivo: 8990000,
    descripcion: 'Precio webinar $8.990.000 (renta 8%) — Plus B149',
    unidades: [['Plus', 'B149']],
  },
  {
    nombre: 'Precio Webinar Plus B208 · Ago 2026', anclaUF: 312, objetivo: 9490000,
    descripcion: 'Precio webinar $9.490.000 (renta 8%) — Plus B208',
    unidades: [['Plus', 'B208']],
  },
  {
    nombre: 'Precio Webinar Plus B209 · Ago 2026', anclaUF: 184, objetivo: 5590000,
    descripcion: 'Precio webinar $5.590.000 (renta 8%) — Plus B209',
    unidades: [['Plus', 'B209']],
  },
]

// Promos del webinar de junio que hay que dejar fuera de circulación.
const PROMOS_JUNIO = [
  'Precio Webinar ENTRY', 'Precio Webinar MID', 'Precio Webinar PREMIUM',
  'Precio Webinar Trinitarias', 'Pack Dúo Webinar', 'Pack Trío Webinar', 'Pack Inversor',
]

async function resolverUnidad(edificioNombre, numero) {
  return p.unidad.findFirst({
    where: { numero, edificio: { nombre: { equals: edificioNombre, mode: 'insensitive' } } },
    include: { edificio: { select: { nombre: true } } },
  })
}

async function upsertPromo(nombre, data) {
  const existe = await p.promocion.findFirst({ where: { nombre } })
  if (existe) return p.promocion.update({ where: { id: existe.id }, data })
  return p.promocion.create({ data: { nombre, ...data } })
}

async function actualizarPrecio(unidad, nuevoUF) {
  const actual = Number(unidad.precioUF)
  if (Math.abs(actual - nuevoUF) < 0.005) return false // ya está en el ancla
  await p.$transaction([
    p.unidad.update({ where: { id: unidad.id }, data: { precioUF: nuevoUF } }),
    p.historialPrecioUnidad.create({
      data: { unidadId: unidad.id, precioAnteriorUF: actual, precioNuevoUF: nuevoUF, motivo: MOTIVO, usuarioId: USUARIO_ID },
    }),
  ])
  return true
}

async function main() {
  const ufRow = await p.uFDiaria.findFirst({ orderBy: { fecha: 'desc' } })
  if (!ufRow) throw new Error('No hay UF vigente en uf_diaria — no puedo convertir las anclas en $ a UF.')
  const UF = Number(ufRow.valorPesos)
  console.log(`UF vigente (${ufRow.fecha.toISOString().slice(0, 10)}): $${UF.toLocaleString('es-CL')}\n`)

  // 1. Campaña
  let campana = await p.campana.findFirst({ where: { nombre: CAMPANA } })
  const dataCampana = {
    descripcion: 'Webinar 10-ago-2026 · promo vigente hasta el 17-ago',
    fechaFin: FECHA_FIN, activa: true, esWebinar: true,
  }
  campana = campana
    ? await p.campana.update({ where: { id: campana.id }, data: dataCampana })
    : await p.campana.create({ data: { nombre: CAMPANA, ...dataCampana } })
  console.log(`Campaña #${campana.id}: ${campana.nombre} (esWebinar=${campana.esWebinar}, vence ${FECHA_FIN.toISOString().slice(0, 10)})\n`)

  // 2 + 3. Precios ancla y descuentos por tier
  let cambiados = 0
  for (const tier of TIERS) {
    const anclaUF = tier.anclaUF ?? Number((tier.ancla / UF).toFixed(2))
    const objetivoUF = tier.objetivo / UF
    const unidades = []

    for (const [ed, num] of tier.unidades) {
      const u = await resolverUnidad(ed, num)
      if (!u) { console.warn(`  ⚠ No existe: ${ed} ${num}`); continue }
      if (u.estado !== 'DISPONIBLE') { console.warn(`  ⚠ ${ed} ${num} está ${u.estado} — la salto (no se re-precia lo vendido)`); continue }
      if (await actualizarPrecio(u, anclaUF)) cambiados++
      unidades.push(u)
    }
    if (unidades.length === 0) { console.warn(`  ⚠ ${tier.nombre}: sin unidades, salto`); continue }

    const promo = await upsertPromo(tier.nombre, {
      descripcion: `${tier.descripcion} (descuento UF dinámico según UF vigente)`,
      categoria: 'DESCUENTO',
      tipo: 'DESCUENTO_UF',
      valorUF: Number((anclaUF - objetivoUF).toFixed(2)), // fallback si no hay UF vigente
      precioObjetivoPesos: tier.objetivo,
      minUnidades: null,
      fechaInicio: null,
      fechaFin: FECHA_FIN,
      activa: true,
      campanaId: campana.id,
    })
    await p.unidadPromocion.deleteMany({ where: { promocionId: promo.id } })
    for (const u of unidades) await p.unidadPromocion.create({ data: { promocionId: promo.id, unidadId: u.id } })

    console.log(`  #${promo.id} ${tier.nombre}`)
    console.log(`     lista ${anclaUF} UF ($${Math.round(anclaUF * UF).toLocaleString('es-CL')}) → webinar $${tier.objetivo.toLocaleString('es-CL')} (${objetivoUF.toFixed(2)} UF) · −${(anclaUF - objetivoUF).toFixed(2)} UF · ${unidades.length} uds`)
  }
  console.log(`\n  ${cambiados} precios de lista actualizados al ancla.\n`)

  // 4. Pack por volumen y beneficio permanente
  const pack = await upsertPromo('Pack 2+ Unidades', {
    descripcion: '−5 UF al comprar 2 o más unidades + Gastos Operacionales de regalo',
    categoria: 'DESCUENTO', tipo: 'DESCUENTO_UF', valorUF: 5, minUnidades: 2,
    fechaInicio: null, fechaFin: FECHA_FIN, activa: true, campanaId: campana.id,
  })
  console.log(`  #${pack.id} Pack 2+ Unidades: −5 UF (mín. 2 unidades)`)

  const go = await p.promocion.findFirst({
    where: { nombre: { contains: 'Gastos Operacionales', mode: 'insensitive' }, categoria: 'BENEFICIO' },
  })
  if (go) {
    await p.promocion.update({ where: { id: go.id }, data: { activa: true } })
    console.log(`  #${go.id} Gastos Operacionales: beneficio permanente activo`)
  } else console.warn('  ⚠ No se encontró el beneficio Gastos Operacionales')

  // 5. Bajar las promos del webinar de junio
  const off = await p.promocion.updateMany({ where: { nombre: { in: PROMOS_JUNIO } }, data: { activa: false } })
  if (off.count) console.log(`  (${off.count} promos del webinar de junio desactivadas)`)

  console.log('\n✅ CRM listo para el webinar.')
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => p.$disconnect())
