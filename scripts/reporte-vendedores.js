/**
 * Reporte diario de vendedores — interpretado por Claude
 *
 * Uso:
 *   cd /Users/juana/Documents/bodeparkingcrm/backend
 *   ANTHROPIC_API_KEY=sk-ant-... node ../scripts/reporte-vendedores.js
 *
 * Fecha específica:
 *   FECHA=2026-04-28 ANTHROPIC_API_KEY=sk-ant-... node ../scripts/reporte-vendedores.js
 *
 * Chile = UTC-4
 * "día Chile" = fecha 04:00 UTC → fecha+1 04:00 UTC
 */

const path = require('path')
module.paths.unshift(path.join(__dirname, '../backend/node_modules'))

require('dotenv').config({ path: path.join(__dirname, '../backend/.env') })

const { PrismaClient } = require('@prisma/client')
const Anthropic = require('@anthropic-ai/sdk')

const DB_URL = 'postgresql://bodeparking:bodeparking2026!@monorail.proxy.rlwy.net:35865/bodeparkingcrm'
const prisma = new PrismaClient({ datasources: { db: { url: DB_URL } } })
const anthropic = new Anthropic.default({ apiKey: process.env.ANTHROPIC_API_KEY })

// Las columnas timestamp WITHOUT TIME ZONE guardan UTC directamente.
// Rango para "día en Chile (UTC-4)": 04:00 UTC → 04:00 UTC siguiente día.
// Display: Prisma retorna el valor como Date UTC; restar 4h da hora Chile.

const OFFSET_H = 4

function rangoUTC(fechaStr) {
  const desde = new Date(`${fechaStr}T04:00:00Z`)
  const hasta = new Date(desde.getTime() + 24 * 3600 * 1000)
  return { desde, hasta }
}

function fmtHoraChile(dt) {
  const d = new Date(new Date(dt).getTime() - OFFSET_H * 3600 * 1000)
  return d.toISOString().slice(11, 16)
}

const TIPO_LABEL = { LLAMADA: 'Llamada', EMAIL: 'Email', WHATSAPP: 'WhatsApp', REUNION: 'Reunión', NOTA: 'Nota' }

async function recopilarDatos(fechaStr) {
  const { desde, hasta } = rangoUTC(fechaStr)

  const [interacciones, visitas, leadsNuevos, perdidos, cotizaciones, ventasAvanzadas] = await Promise.all([

    // Interacciones humanas (excluye automáticas de Comuro)
    prisma.interaccion.findMany({
      where: {
        fecha: { gte: desde, lt: hasta },
        usuarioId: { not: null },
      },
      include: {
        usuario: { select: { nombre: true, apellido: true } },
        lead: { include: { contacto: { select: { nombre: true, apellido: true } } } },
      },
      orderBy: { fecha: 'asc' },
    }),

    // Visitas del día
    prisma.visita.findMany({
      where: { fechaHora: { gte: desde, lt: hasta } },
      include: {
        vendedor: { select: { nombre: true, apellido: true } },
        edificio: { select: { nombre: true } },
        lead: { include: { contacto: { select: { nombre: true, apellido: true } } } },
      },
      orderBy: { fechaHora: 'asc' },
    }),

    // Leads nuevos (Comuro)
    prisma.lead.findMany({
      where: { creadoEn: { gte: desde, lt: hasta } },
      include: {
        contacto: { select: { nombre: true, apellido: true } },
        vendedor: { select: { nombre: true, apellido: true } },
      },
      orderBy: { creadoEn: 'asc' },
    }),

    // Leads pasados a PERDIDO hoy
    prisma.lead.findMany({
      where: {
        etapa: 'PERDIDO',
        actualizadoEn: { gte: desde, lt: hasta },
      },
      include: {
        contacto: { select: { nombre: true, apellido: true } },
        vendedor: { select: { nombre: true, apellido: true } },
        interacciones: { orderBy: { fecha: 'desc' }, take: 1 },
      },
      orderBy: { actualizadoEn: 'asc' },
    }),

    // Cotizaciones enviadas
    prisma.cotizacion.findMany({
      where: { creadoEn: { gte: desde, lt: hasta } },
      include: {
        usuario: { select: { nombre: true, apellido: true } },
        lead: { include: { contacto: { select: { nombre: true, apellido: true } } } },
      },
    }),

    // Ventas que avanzaron de estado hoy (PROMESA, ESCRITURA, ENTREGADO)
    prisma.venta.findMany({
      where: {
        actualizadoEn: { gte: desde, lt: hasta },
        estado: { in: ['PROMESA', 'ESCRITURA', 'ENTREGADO'] },
      },
      include: {
        vendedor: { select: { nombre: true, apellido: true } },
        comprador: { select: { nombre: true, apellido: true } },
      },
    }),
  ])

  return { interacciones, visitas, leadsNuevos, perdidos, cotizaciones, ventasAvanzadas, desde, hasta }
}

function construirContexto(datos, fechaStr) {
  const { interacciones, visitas, leadsNuevos, perdidos, cotizaciones, ventasAvanzadas } = datos
  const lineas = []

  lineas.push(`FECHA: ${fechaStr} (hora Chile)\n`)

  // ── 1. LEADS NUEVOS (automáticos) ──
  if (leadsNuevos.length > 0) {
    const porCampana = {}
    for (const l of leadsNuevos) {
      const camp = l.campana || 'Sin campaña'
      porCampana[camp] = (porCampana[camp] || 0) + 1
    }
    lineas.push(`LEADS NUEVOS VÍA COMURO: ${leadsNuevos.length}`)
    for (const [camp, n] of Object.entries(porCampana)) {
      lineas.push(`  ${camp}: ${n}`)
    }
    lineas.push('')
  } else {
    lineas.push('LEADS NUEVOS: Ninguno.\n')
  }

  // ── 2. INTERACCIONES HUMANAS ──
  const interHumanas = interacciones.filter(i =>
    !i.descripcion?.startsWith('Lead ingresado vía API') &&
    !i.descripcion?.startsWith('Etapa cambiada')
  )
  if (interHumanas.length > 0) {
    lineas.push(`INTERACCIONES HUMANAS (${interHumanas.length}):`)
    for (const i of interHumanas) {
      const v = i.usuario ? `${i.usuario.nombre} ${i.usuario.apellido}` : 'Sin asignar'
      const cl = `${i.lead.contacto.nombre} ${i.lead.contacto.apellido}`
      lineas.push(
        `  [${fmtHoraChile(i.fecha)}] ${v} — ${TIPO_LABEL[i.tipo] || i.tipo} con ${cl} (Lead #${i.leadId})`
        + (i.descripcion ? `\n    Nota: "${i.descripcion}"` : '')
      )
    }
    lineas.push('')
  } else {
    lineas.push('INTERACCIONES HUMANAS: Ninguna.\n')
  }

  // ── 3. CAMBIOS DE ETAPA ──
  const cambios = interacciones.filter(i => i.descripcion?.startsWith('Etapa cambiada'))
  if (cambios.length > 0) {
    lineas.push(`CAMBIOS DE ETAPA (${cambios.length}):`)
    for (const i of cambios) {
      const v = i.usuario ? `${i.usuario.nombre} ${i.usuario.apellido}` : 'Sin asignar'
      const cl = `${i.lead.contacto.nombre} ${i.lead.contacto.apellido}`
      lineas.push(`  [${fmtHoraChile(i.fecha)}] ${v} — ${cl}: ${i.descripcion}`)
    }
    lineas.push('')
  }

  // ── 4. LEADS PERDIDOS ──
  if (perdidos.length > 0) {
    lineas.push(`LEADS PASADOS A PERDIDO (${perdidos.length}):`)
    for (const l of perdidos) {
      const v = l.vendedor ? `${l.vendedor.nombre} ${l.vendedor.apellido}` : 'Sin asignar'
      const cl = `${l.contacto.nombre} ${l.contacto.apellido}`
      const motivo = [l.motivoPerdidaCat, l.motivoPerdida].filter(Boolean).join(' — ')
      const nota = l.interacciones[0]?.descripcion || ''
      lineas.push(
        `  • ${v} — ${cl}: ${motivo || 'Sin motivo'}`
        + (nota && !nota.startsWith('Etapa cambiada') ? `\n    Nota: "${nota}"` : '')
      )
    }
    lineas.push('')
  } else {
    lineas.push('LEADS PERDIDOS: Ninguno.\n')
  }

  // ── 5. VISITAS ──
  if (visitas.length > 0) {
    lineas.push(`VISITAS (${visitas.length}):`)
    for (const v of visitas) {
      const vend = v.vendedor ? `${v.vendedor.nombre} ${v.vendedor.apellido}` : 'Sin asignar'
      const cl = `${v.lead.contacto.nombre} ${v.lead.contacto.apellido}`
      const edif = v.edificio ? ` en ${v.edificio.nombre}` : ''
      lineas.push(
        `  [${fmtHoraChile(v.fechaHora)}] ${vend} — Visita${edif} con ${cl}`
        + (v.resultado ? `\n    Resultado: ${v.resultado}` : '\n    Sin resultado registrado')
        + (v.notas ? `\n    Notas: "${v.notas}"` : '')
      )
    }
    lineas.push('')
  } else {
    lineas.push('VISITAS: Ninguna.\n')
  }

  // ── 6. COTIZACIONES ──
  if (cotizaciones.length > 0) {
    lineas.push(`COTIZACIONES ENVIADAS (${cotizaciones.length}):`)
    for (const c of cotizaciones) {
      const v = c.usuario ? `${c.usuario.nombre} ${c.usuario.apellido}` : 'Sin asignar'
      const cl = `${c.lead.contacto.nombre} ${c.lead.contacto.apellido}`
      lineas.push(`  • ${v} → ${cl} (${c.estado})`)
    }
    lineas.push('')
  }

  // ── 7. VENTAS AVANZADAS ──
  if (ventasAvanzadas.length > 0) {
    lineas.push(`VENTAS QUE AVANZARON DE ESTADO (${ventasAvanzadas.length}):`)
    for (const v of ventasAvanzadas) {
      const vend = v.vendedor ? `${v.vendedor.nombre} ${v.vendedor.apellido}` : 'Sin asignar'
      const cl = `${v.comprador.nombre} ${v.comprador.apellido}`
      lineas.push(`  • ${vend} — ${cl}: estado ${v.estado}`)
    }
    lineas.push('')
  }

  return lineas.join('\n')
}

async function generarReporte(contexto, fechaStr) {
  const prompt = `Eres el asistente de gestión del equipo de ventas de BodeParking, empresa que vende bodegas y estacionamientos en Chile.

Se te entrega la actividad del día ${fechaStr} registrada en el CRM. Tu tarea:

1. **Resumen por vendedor**: qué hizo cada uno hoy — cantidad de leads contactados, llamadas, emails, visitas, resultados concretos.
2. **Lectura de notas**: lee cada nota e interacción con atención. Explica qué pasó realmente con cada cliente, no solo listes hechos. Si hay contexto importante en una nota, extráelo.
3. **Leads perdidos**: para cada lead perdido, explica brevemente el motivo y si era evitable.
4. **Señales importantes**: clientes muy interesados, negociaciones activas, oportunidades que no se deben dejar enfriar, o patrones preocupantes.
5. **Alertas para el gerente**: cualquier cosa que requiera atención hoy o mañana.

Organiza por vendedor. Sé directo y usa nombres completos. Si un vendedor no tuvo actividad, no lo menciones.

---

${contexto}`

  console.log('\nConsultando a Claude...\n')

  const stream = await anthropic.messages.stream({
    model: 'claude-opus-4-7',
    max_tokens: 3000,
    thinking: { type: 'adaptive' },
    messages: [{ role: 'user', content: prompt }],
  })

  process.stdout.write('━'.repeat(60) + '\n')
  process.stdout.write(`  REPORTE DEL DÍA ${fechaStr}\n`)
  process.stdout.write('━'.repeat(60) + '\n\n')

  for await (const chunk of stream) {
    if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
      process.stdout.write(chunk.delta.text)
    }
  }

  process.stdout.write('\n\n' + '━'.repeat(60) + '\n')
}

async function main() {
  const fechaStr = process.env.FECHA || new Date(Date.now() - OFFSET_H * 3600 * 1000).toISOString().slice(0, 10)

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('Error: falta ANTHROPIC_API_KEY')
    console.error('Uso: ANTHROPIC_API_KEY=sk-ant-... node ../scripts/reporte-vendedores.js')
    process.exit(1)
  }

  console.log(`Recopilando actividad del ${fechaStr} (Chile)...`)

  try {
    const datos = await recopilarDatos(fechaStr)
    const total = datos.interacciones.length + datos.visitas.length +
      datos.leadsNuevos.length + datos.perdidos.length + datos.cotizaciones.length

    console.log(`  ${datos.leadsNuevos.length} leads nuevos (Comuro)`)
    console.log(`  ${datos.interacciones.filter(i => !i.descripcion?.startsWith('Lead ingresado')).length} interacciones humanas`)
    console.log(`  ${datos.visitas.length} visitas`)
    console.log(`  ${datos.perdidos.length} leads perdidos`)
    console.log(`  ${datos.cotizaciones.length} cotizaciones`)
    console.log(`  ${datos.ventasAvanzadas.length} ventas avanzadas`)

    if (total === 0) {
      console.log('\nSin actividad registrada para esta fecha.')
      return
    }

    const contexto = construirContexto(datos, fechaStr)
    await generarReporte(contexto, fechaStr)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
