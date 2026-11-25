// Backfill único del módulo RRSS:
//  1. Lead.metaLeadId desde las notas que manda el conector de ATAK ("Meta ID: l:1621679365752797")
//  2. Limpia el prefijo "p:" que ese mismo conector antepone al teléfono del contacto
// Dry-run por defecto; --ejecutar aplica. Usa DATABASE_URL del entorno.
require('dotenv').config()
const prisma = require('../src/lib/prisma')
const { extraerMetaIdDeNotas, limpiarPrefijoConector } = require('../src/lib/rrss')

const EJECUTAR = process.argv.includes('--ejecutar')

async function main() {
  const leads = await prisma.lead.findMany({
    where: { metaLeadId: null, notas: { contains: 'Meta ID' } },
    select: { id: true, notas: true },
  })
  const usados = new Set()
  let conId = 0, dupl = 0
  for (const l of leads) {
    const id = extraerMetaIdDeNotas(l.notas)
    if (!id) continue
    if (usados.has(id)) { dupl++; continue }
    usados.add(id)
    conId++
    if (EJECUTAR) {
      try { await prisma.lead.update({ where: { id: l.id }, data: { metaLeadId: id } }) }
      catch (e) { dupl++ }
    }
  }

  const contactos = await prisma.contacto.findMany({
    where: { telefono: { startsWith: 'p:' } }, select: { id: true, telefono: true },
  })
  if (EJECUTAR) {
    for (const c of contactos) {
      await prisma.contacto.update({ where: { id: c.id }, data: { telefono: limpiarPrefijoConector(c.telefono) } })
    }
  }

  console.log(`${EJECUTAR ? 'APLICADO' : 'DRY-RUN'} — leads con Meta ID en notas: ${leads.length}, metaLeadId asignables: ${conId}, repetidos/conflicto: ${dupl}; teléfonos con "p:": ${contactos.length}`)
  if (!EJECUTAR) console.log('Agrega --ejecutar para aplicar.')
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1) })
