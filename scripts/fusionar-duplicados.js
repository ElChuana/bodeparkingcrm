const { PrismaClient } = require('../backend/node_modules/@prisma/client')
const prisma = new PrismaClient({
  datasources: { db: { url: 'postgresql://bodeparking:bodeparking2026!@monorail.proxy.rlwy.net:35865/bodeparkingcrm' } }
})

async function main() {
  console.log('Buscando duplicados por teléfono...')

  const contactos = await prisma.contacto.findMany({
    where: { telefono: { not: null } },
    select: { id: true, nombre: true, apellido: true, email: true, telefono: true, rut: true, empresa: true, creadoEn: true },
    orderBy: { creadoEn: 'asc' }
  })

  // Agrupar por teléfono normalizado
  const grupos = {}
  for (const c of contactos) {
    const tel = c.telefono.replace(/\D/g, '')
    if (!tel || tel.length < 8) continue
    if (!grupos[tel]) grupos[tel] = []
    grupos[tel].push(c)
  }

  const duplicados = Object.values(grupos).filter(g => g.length > 1)
  console.log(`${duplicados.length} grupos de duplicados encontrados`)

  let fusionados = 0
  let saltados = 0
  let errores = 0

  for (const grupo of duplicados) {
    // Primario: el que tiene email, si empate el más antiguo (ya están ordenados por creadoEn)
    const primario = grupo.find(c => c.email) || grupo[0]
    const secundarios = grupo.filter(c => c.id !== primario.id)

    // Verificar que el primario sigue existiendo
    const primarioExiste = await prisma.contacto.findUnique({ where: { id: primario.id } })
    if (!primarioExiste) {
      saltados++
      continue
    }

    // Filtrar secundarios que aún existen
    const secundariosExistentes = []
    for (const sec of secundarios) {
      const existe = await prisma.contacto.findUnique({ where: { id: sec.id } })
      if (existe) secundariosExistentes.push(sec)
    }
    if (secundariosExistentes.length === 0) {
      saltados++
      continue
    }

    try {
      await prisma.$transaction(async (tx) => {
        for (const sec of secundariosExistentes) {
          // Mover leads al primario
          const leadsSecundario = await tx.lead.findMany({ where: { contactoId: sec.id } })

          for (const leadSec of leadsSecundario) {
            const leadPrimario = await tx.lead.findFirst({
              where: { contactoId: primario.id, etapa: { notIn: ['PERDIDO'] } },
              include: { venta: true }
            })

            if (leadPrimario) {
              // Mover interacciones, visitas
              await tx.interaccion.updateMany({ where: { leadId: leadSec.id }, data: { leadId: leadPrimario.id } })
              await tx.visita.updateMany({ where: { leadId: leadSec.id }, data: { leadId: leadPrimario.id } })
              // Cotizaciones solo si el primario no tiene venta
              if (!leadPrimario.venta) {
                await tx.cotizacion.updateMany({ where: { leadId: leadSec.id }, data: { leadId: leadPrimario.id } })
              }
              // Fusionar comuroData
              if (leadSec.comuroData) {
                const dataActual = (leadPrimario.comuroData && typeof leadPrimario.comuroData === 'object') ? leadPrimario.comuroData : {}
                const copyUuid  = leadSec.comuroUuid    && !leadPrimario.comuroUuid
                const copyThread = leadSec.comuroThreadId && !leadPrimario.comuroThreadId

                // Si vamos a copiar el comuroUuid, primero limpiarlo del secundario para evitar unique constraint
                if (copyUuid) {
                  await tx.lead.update({ where: { id: leadSec.id }, data: { comuroUuid: null } })
                }
                if (copyThread) {
                  await tx.lead.update({ where: { id: leadSec.id }, data: { comuroThreadId: null } })
                }

                await tx.lead.update({
                  where: { id: leadPrimario.id },
                  data: {
                    comuroData: { ...leadSec.comuroData, ...dataActual },
                    ...(copyUuid   && { comuroUuid:      leadSec.comuroUuid }),
                    ...(copyThread && { comuroThreadId:  leadSec.comuroThreadId }),
                  }
                })
              }
              // Marcar lead secundario como perdido
              await tx.lead.update({
                where: { id: leadSec.id },
                data: { etapa: 'PERDIDO', motivoPerdida: `Fusionado con lead #${leadPrimario.id} por duplicado de teléfono` }
              })
            } else {
              // No hay lead activo en primario: reasignar
              await tx.lead.update({ where: { id: leadSec.id }, data: { contactoId: primario.id } })
            }
          }

          // Mover ventas y arriendos
          await tx.venta.updateMany({ where: { compradorId: sec.id }, data: { compradorId: primario.id } })
          await tx.arriendo.updateMany({ where: { contactoId: sec.id }, data: { contactoId: primario.id } })

          // Completar datos del primario con los del secundario si faltan
          const update = {}
          if (!primario.email   && sec.email)   { update.email   = sec.email;   primario.email   = sec.email }
          if (!primario.rut     && sec.rut)     { update.rut     = sec.rut;     primario.rut     = sec.rut }
          if (!primario.empresa && sec.empresa) { update.empresa = sec.empresa; primario.empresa = sec.empresa }
          if (Object.keys(update).length > 0) {
            await tx.contacto.update({ where: { id: primario.id }, data: update })
          }

          // Mover TODOS los leads restantes del secundario al primario (incluye los recién marcados PERDIDO)
          await tx.lead.updateMany({ where: { contactoId: sec.id }, data: { contactoId: primario.id } })

          // Eliminar contacto secundario
          await tx.contacto.delete({ where: { id: sec.id } })
        }
      }, { timeout: 30000 })
      fusionados++
    } catch (err) {
      errores++
      console.error(`  Error grupo tel ${primario.telefono} (ids: ${grupo.map(c=>c.id).join(',')}): ${err.message}`)
    }
  }

  console.log(`\nListo: ${fusionados} grupos fusionados, ${saltados} saltados (ya procesados), ${errores} errores.`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
