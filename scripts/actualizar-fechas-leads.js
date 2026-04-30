/**
 * Actualiza creadoEn de leads según fechas del export de Facebook Ads
 * Uso: node scripts/actualizar-fechas-leads.js [--dry-run]
 */

const XLSX = require('xlsx')
const path = require('path')
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()
const DRY_RUN = process.argv.includes('--dry-run')

async function main() {
  console.log(DRY_RUN ? '=== MODO DRY-RUN (sin cambios reales) ===' : '=== ACTUALIZANDO FECHAS ===')

  // 1. Leer Excel
  const wb = XLSX.readFile(path.join(__dirname, '../docs/lea.xlsx'))
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json(ws).slice(1) // skip header

  // 2. Agrupar por email → fecha más antigua
  const emailAFecha = {}
  for (const row of rows) {
    const email = row.__EMPTY_2?.toLowerCase().trim()
    const fechaStr = row.__EMPTY
    if (!email || !fechaStr) continue

    const fecha = new Date(fechaStr)
    if (!emailAFecha[email] || fecha < emailAFecha[email]) {
      emailAFecha[email] = fecha
    }
  }

  const emails = Object.keys(emailAFecha)
  console.log(`\nEmails únicos en Excel: ${emails.length}`)

  // 3. Por cada email, buscar leads en la BD
  let actualizados = 0
  let sinMatch = 0
  let sinEmail = 0

  for (const email of emails) {
    if (email === 'test@fb.com') continue // skip test lead

    // Buscar contacto por email
    const contacto = await prisma.contacto.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
      include: { leads: { select: { id: true, creadoEn: true } } }
    })

    if (!contacto) {
      sinMatch++
      continue
    }

    if (contacto.leads.length === 0) {
      sinEmail++
      continue
    }

    const nuevaFecha = emailAFecha[email]

    // Actualizar creadoEn de todos los leads de ese contacto
    for (const lead of contacto.leads) {
      const fechaActual = lead.creadoEn
      if (Math.abs(nuevaFecha - fechaActual) < 1000) continue // ya están iguales

      if (!DRY_RUN) {
        await prisma.lead.update({
          where: { id: lead.id },
          data: { creadoEn: nuevaFecha }
        })
      } else {
        console.log(`  [DRY] Lead #${lead.id} (${email}): ${fechaActual.toISOString()} → ${nuevaFecha.toISOString()}`)
      }
      actualizados++
    }
  }

  console.log(`\n--- RESULTADO ---`)
  console.log(`Leads actualizados:  ${actualizados}`)
  console.log(`Sin match en BD:     ${sinMatch}`)
  console.log(`Emails sin leads:    ${sinEmail}`)
  if (DRY_RUN) console.log('\n(Nada fue cambiado — corré sin --dry-run para aplicar)')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
