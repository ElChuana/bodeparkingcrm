// Puebla el catálogo `campanas` desde los strings de lead.campana y vincula
// cada lead vía campanaId. Marca esWebinar cuando el nombre contiene "webinar".
// Idempotente: se puede correr de nuevo sin duplicar.
// Uso: DATABASE_URL="$RAILWAY_URL" node scripts/backfill-campanas.js
const prisma = require('../src/lib/prisma')
const { vincularCampana } = require('../src/lib/campanas')

async function main() {
  const distintas = await prisma.lead.findMany({
    where: { campana: { not: null }, campanaId: null },
    select: { campana: true },
    distinct: ['campana'],
  })

  for (const { campana } of distintas) {
    const id = await vincularCampana(campana)
    if (!id) continue
    const { count } = await prisma.lead.updateMany({
      where: { campana, campanaId: null },
      data: { campanaId: id },
    })
    console.log(`"${campana}" → campaña #${id} (${count} leads vinculados)`)
  }

  const webinars = await prisma.campana.findMany({ where: { esWebinar: true }, select: { id: true, nombre: true } })
  console.log('\nCampañas marcadas esWebinar:', webinars.map(c => `#${c.id} ${c.nombre}`).join(', ') || 'ninguna')

  const sinVinculo = await prisma.lead.count({ where: { campana: { not: null }, campanaId: null } })
  console.log('Leads con campana sin vincular:', sinVinculo)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
