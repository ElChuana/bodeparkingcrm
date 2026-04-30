/**
 * Importa las 9 ventas que fallaron en la importación original
 * porque tenían leadIdExistente y la schema usa unidades[] (relación)
 * Uso: DATABASE_URL=... node scripts/importar-ventas-faltantes.js
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const DATOS = [
  { nombre:'Elias',    apellido:'Valverde',    email:null,                                unidadId:74, precioUF:249,   estado:'ESCRITURA', fechaReserva:'2025-07-31', fechaPromesa:null,         vendedorId:null, corredor:'ALFONSO ROBLES',    leadIdExistente:372  },
  { nombre:'Antonio',  apellido:'Otonel',      email:'aozulu@gmail.com',                  unidadId:66, precioUF:149,   estado:'ESCRITURA', fechaReserva:'2025-12-18', fechaPromesa:null,         vendedorId:null, corredor:'RENTACORTA',        leadIdExistente:392  },
  { nombre:'Carolina', apellido:'Muñoz',       email:'munozr.carolina@gmail.com',         unidadId:56, precioUF:58,    estado:'ESCRITURA', fechaReserva:'2026-01-07', fechaPromesa:null,         vendedorId:3,    corredor:'F.BETANCOURTT',     leadIdExistente:956  },
  { nombre:'Carolina', apellido:'Sandoval',    email:'carosandovalsepulveda84@gmail.com', unidadId:59, precioUF:89,    estado:'RESERVA',   fechaReserva:'2026-01-30', fechaPromesa:null,         vendedorId:null, corredor:'RENTACORTA',        leadIdExistente:1267 },
  { nombre:'Felipe',   apellido:'Iñiguez',     email:'felipe.iniguez@gmail.com',          unidadId:75, precioUF:349,   estado:'PROMESA',   fechaReserva:'2026-02-04', fechaPromesa:'2026-02-04', vendedorId:null, corredor:'RENTACORTA',        leadIdExistente:1486 },
  { nombre:'German',   apellido:'Navarrete',   email:'germanantonionavarrete7@gmail.com', unidadId:62, precioUF:149,   estado:'PROMESA',   fechaReserva:'2026-02-05', fechaPromesa:'2026-02-17', vendedorId:null, corredor:'RENTACORTA',        leadIdExistente:1540 },
  { nombre:'Cynthia',  apellido:'Oteiza',      email:'cynthiaoteiza@yahoo.com',           unidadId:60, precioUF:144,   estado:'RESERVA',   fechaReserva:'2026-02-13', fechaPromesa:null,         vendedorId:null, corredor:'RENTACORTA',        leadIdExistente:1685 },
  { nombre:'Claudia',  apellido:'Suarez',      email:'csuarezdp@gmail.com',               unidadId:76, precioUF:94,    estado:'RESERVA',   fechaReserva:'2026-02-17', fechaPromesa:null,         vendedorId:null, corredor:'RENTACORTA',        leadIdExistente:1220 },
  { nombre:'Esteban',  apellido:'Orrego',      email:'estebanorregoeu13@gmail.com',       unidadId:71, precioUF:62.78, estado:'PROMESA',   fechaReserva:'2026-03-05', fechaPromesa:'2026-03-01', vendedorId:3,    corredor:'F.BETANCOURTT',     leadIdExistente:2104 },
]

async function main() {
  const gerente = await prisma.usuario.findFirst({ where: { rol: 'GERENTE', activo: true } })
  if (!gerente) throw new Error('No se encontró gerente activo')

  const resultados = []

  for (const d of DATOS) {
    try {
      const leadId = d.leadIdExistente

      // Verificar que el lead existe
      const lead = await prisma.lead.findUnique({ where: { id: leadId } })
      if (!lead) throw new Error(`Lead ID ${leadId} no encontrado en la BD`)

      // Verificar que el lead no tiene ya una venta
      const ventaExistente = await prisma.venta.findUnique({ where: { leadId } })
      if (ventaExistente) {
        console.log(`⚠️  Lead ${leadId} (${d.nombre} ${d.apellido}) ya tiene venta ID ${ventaExistente.id} — saltando`)
        resultados.push({ ok: false, motivo: 'ya tiene venta', leadId, ventaId: ventaExistente.id })
        continue
      }

      // Verificar que la unidad existe
      const unidad = await prisma.unidad.findUnique({ where: { id: d.unidadId } })
      if (!unidad) throw new Error(`Unidad ID ${d.unidadId} no encontrada`)

      // Crear venta con relación unidades[]
      const venta = await prisma.venta.create({
        data: {
          lead: { connect: { id: leadId } },
          unidades: { connect: { id: d.unidadId } },
          comprador: { connect: { id: lead.contactoId } },
          ...(d.vendedorId ? { vendedor: { connect: { id: d.vendedorId } } } : {}),
          gerente: { connect: { id: gerente.id } },
          precioUF: d.precioUF,
          descuentoUF: 0,
          estado: 'RESERVA',
          fechaReserva: new Date(d.fechaReserva),
          notas: `Corredor: ${d.corredor}`,
        }
      })

      // Actualizar unidad a RESERVADO
      await prisma.unidad.update({ where: { id: d.unidadId }, data: { estado: 'RESERVADO' } })

      // Actualizar lead a RESERVA
      await prisma.lead.update({ where: { id: leadId }, data: { etapa: 'RESERVA', ...(d.vendedorId ? { vendedorId: d.vendedorId } : {}) } })

      // Avanzar estado si es PROMESA o ESCRITURA
      if (d.estado === 'PROMESA' || d.estado === 'ESCRITURA') {
        await prisma.venta.update({
          where: { id: venta.id },
          data: {
            estado: d.estado,
            ...(d.fechaPromesa ? { fechaPromesa: new Date(d.fechaPromesa) } : {}),
            ...(d.estado === 'ESCRITURA' ? { fechaEscritura: new Date(d.fechaReserva) } : {}),
          }
        })
        await prisma.lead.update({
          where: { id: leadId },
          data: { etapa: d.estado === 'ESCRITURA' ? 'ESCRITURA' : 'PROMESA' }
        })
        if (d.estado === 'ESCRITURA') {
          await prisma.unidad.update({ where: { id: d.unidadId }, data: { estado: 'VENDIDO' } })
        }
      }

      console.log(`✅ ${d.nombre} ${d.apellido} — venta ${venta.id} (lead ${leadId}, unidad ${d.unidadId}, ${d.estado})`)
      resultados.push({ ok: true, ventaId: venta.id, leadId, unidadId: d.unidadId, estado: d.estado })
    } catch (err) {
      console.error(`❌ ${d.nombre} ${d.apellido} — ${err.message}`)
      resultados.push({ ok: false, nombre: `${d.nombre} ${d.apellido}`, error: err.message })
    }
  }

  console.log('\n--- RESULTADO ---')
  console.log(`OK: ${resultados.filter(r => r.ok).length}`)
  console.log(`Error: ${resultados.filter(r => !r.ok).length}`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
