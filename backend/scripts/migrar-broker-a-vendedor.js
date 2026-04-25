/**
 * Migración: lead.brokerId → lead.vendedorId donde vendedorId es null
 * Ejecutar una sola vez: node scripts/migrar-broker-a-vendedor.js
 */
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  // Leads con broker pero sin vendedor → asignar broker como vendedor
  const sinVendedor = await prisma.lead.updateMany({
    where: { brokerId: { not: null }, vendedorId: null },
    data: {} // no podemos copiar campo a campo con updateMany
  })

  // Hay que hacerlo con raw SQL
  const result = await prisma.$executeRaw`
    UPDATE leads
    SET "vendedorId" = "brokerId"
    WHERE "brokerId" IS NOT NULL AND "vendedorId" IS NULL
  `
  console.log(`Leads actualizados (broker → vendedor): ${result}`)

  // Limpiar brokerId de todos los leads
  const limpiado = await prisma.lead.updateMany({
    where: { brokerId: { not: null } },
    data: { brokerId: null }
  })
  console.log(`Leads con brokerId limpiado: ${limpiado.count}`)

  console.log('Migración completada.')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
