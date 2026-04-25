/**
 * Migración: lead.notas → Interaccion tipo NOTA
 * Ejecutar una sola vez: node scripts/migrar-notas-leads.js
 */
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const leads = await prisma.lead.findMany({
    where: { notas: { not: null } },
    select: { id: true, notas: true, creadoEn: true }
  })

  console.log(`Leads con notas: ${leads.length}`)

  const data = leads
    .filter(l => l.notas?.trim())
    .map(l => ({
      leadId: l.id,
      tipo: 'NOTA',
      descripcion: l.notas.trim(),
      fecha: l.creadoEn
    }))

  // Insertar en lotes de 500
  const BATCH = 500
  let creadas = 0
  for (let i = 0; i < data.length; i += BATCH) {
    const lote = data.slice(i, i + BATCH)
    const r = await prisma.interaccion.createMany({ data: lote, skipDuplicates: false })
    creadas += r.count
    console.log(`  lote ${i / BATCH + 1}: ${creadas} creadas`)
  }

  console.log(`\nTotal interacciones creadas: ${creadas}`)
  console.log('Listo.')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
