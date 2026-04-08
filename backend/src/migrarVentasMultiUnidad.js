const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

// Grupos a fusionar: mismo compradorId + misma fechaReserva (fecha, sin hora)
async function fusionarGrupos() {
  const ventas = await prisma.venta.findMany({
    select: { id: true, compradorId: true, fechaReserva: true },
    orderBy: { id: 'asc' }
  })

  const grupos = {}
  for (const v of ventas) {
    const fechaKey = v.fechaReserva ? v.fechaReserva.toISOString().split('T')[0] : 'null'
    const key = `${v.compradorId}-${fechaKey}`
    if (!grupos[key]) grupos[key] = []
    grupos[key].push(v.id)
  }

  for (const [key, ids] of Object.entries(grupos)) {
    if (ids.length < 2) continue
    const [principal, ...secundarias] = ids
    console.log(`Fusionando ventas [${ids.join(', ')}] → principal: #${principal}`)

    for (const secId of secundarias) {
      await prisma.unidad.updateMany({ where: { ventaId: secId }, data: { ventaId: principal } })
      await prisma.procesoLegal.deleteMany({ where: { ventaId: secId } })
      await prisma.comision.deleteMany({ where: { ventaId: secId } })
      await prisma.venta.delete({ where: { id: secId } })
      console.log(`  Venta #${secId} fusionada y eliminada`)
    }
  }
}

// Mapa unidadId → estado ProcesoLegal real (del spreadsheet)
const LEGAL_DATA = [
  { unidadId: 70, tienePromesa: false, estadoActual: 'ENTREGADO' },
  { unidadId: 72, tienePromesa: false, estadoActual: 'ENTREGADO' },
  { unidadId: 73, tienePromesa: false, estadoActual: 'ENTREGADO' },
  { unidadId: 74, tienePromesa: false, estadoActual: 'ENTREGADO' },
  { unidadId: 64, tienePromesa: false, estadoActual: 'ENTREGADO' },
  { unidadId: 65, tienePromesa: false, estadoActual: 'ENTREGADO' },
  { unidadId: 68, tienePromesa: false, estadoActual: 'ENTREGADO' },
  { unidadId: 66, tienePromesa: false, estadoActual: 'ENTREGADO' },
  { unidadId: 69, tienePromesa: false, estadoActual: 'ENTREGADO' },
  { unidadId: 56, tienePromesa: false, estadoActual: 'INSCRIPCION_CBR' },
  { unidadId: 67, tienePromesa: false, estadoActual: 'ENTREGADO' },
  { unidadId: 59, tienePromesa: false, estadoActual: 'ESCRITURA_LISTA' },
  { unidadId: 75, tienePromesa: true,  estadoActual: 'ESCRITURA_LISTA' },
  { unidadId: 62, tienePromesa: true,  estadoActual: 'FIRMADA_NOTARIA' },
  { unidadId: 63, tienePromesa: true,  estadoActual: 'FIRMADA_NOTARIA' },
  { unidadId: 60, tienePromesa: false, estadoActual: 'ESCRITURA_LISTA' },
  { unidadId: 61, tienePromesa: false, estadoActual: 'ESCRITURA_LISTA' },
  { unidadId: 76, tienePromesa: false, estadoActual: 'ESCRITURA_LISTA' },
  { unidadId: 79, tienePromesa: false, estadoActual: 'ESCRITURA_LISTA' },
  { unidadId: 77, tienePromesa: false, estadoActual: 'ESCRITURA_LISTA' },
  { unidadId: 55, tienePromesa: false, estadoActual: 'ESCRITURA_LISTA' },
  { unidadId: 80, tienePromesa: false, estadoActual: 'ESCRITURA_LISTA' },
  { unidadId: 78, tienePromesa: false, estadoActual: 'ESCRITURA_LISTA' },
  { unidadId: 71, tienePromesa: true,  estadoActual: 'FIRMA_CLIENTE_PROMESA' },
  { unidadId: 58, tienePromesa: false, estadoActual: 'ESCRITURA_LISTA' },
  { unidadId: 46, tienePromesa: false, estadoActual: 'ESCRITURA_LISTA' },
]

async function actualizarLegal() {
  for (const d of LEGAL_DATA) {
    const unidad = await prisma.unidad.findUnique({
      where: { id: d.unidadId },
      select: { ventaId: true }
    })
    if (!unidad?.ventaId) {
      console.log(`  ⚠ Unidad ${d.unidadId} sin ventaId`)
      continue
    }
    const ventaId = unidad.ventaId
    const proceso = await prisma.procesoLegal.findUnique({ where: { ventaId } })
    if (proceso) {
      await prisma.procesoLegal.update({
        where: { ventaId },
        data: { tienePromesa: d.tienePromesa, estadoActual: d.estadoActual }
      })
      console.log(`  ✓ Venta #${ventaId} unidad #${d.unidadId} → ${d.estadoActual}`)
    } else {
      console.log(`  ⚠ Venta #${ventaId} sin ProcesoLegal`)
    }
  }
}

async function main() {
  console.log('=== Paso 1: Aplicar migration ===')
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='unidades' AND column_name='ventaId') THEN
        ALTER TABLE "unidades" ADD COLUMN "ventaId" INTEGER;
        ALTER TABLE "unidades" ADD CONSTRAINT "unidades_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "ventas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
      END IF;
    END $$;
  `)
  console.log('  Migration aplicada (o ya existía)')

  console.log('\n=== Paso 2: Vincular unidades a ventas existentes ===')
  // Vincula via unidadId que estaba en ventas antes (necesita mapeo manual)
  // Usamos la tabla ventas si aun tiene la columna unidad_id
  const ventasConUnidad = await prisma.$queryRaw`
    SELECT id, "unidadId" FROM ventas WHERE "unidadId" IS NOT NULL
  `.catch(() => [])

  if (ventasConUnidad.length > 0) {
    for (const v of ventasConUnidad) {
      await prisma.unidad.update({
        where: { id: v.unidadId },
        data: { ventaId: v.id }
      }).catch(e => console.log(`  ⚠ Unidad ${v.unidadId}: ${e.message}`))
      console.log(`  Unidad #${v.unidadId} → Venta #${v.id}`)
    }
    // Quitar columna unidadId de ventas
    await prisma.$executeRawUnsafe(`ALTER TABLE "ventas" DROP COLUMN IF EXISTS "unidadId"`).catch(() => {})
    console.log('  Columna unidadId eliminada de ventas')
  } else {
    console.log('  Columna unidadId ya eliminada o sin datos')
  }

  console.log('\n=== Paso 3: Fusionar ventas mismo cliente/fecha ===')
  await fusionarGrupos()

  console.log('\n=== Paso 4: Actualizar ProcesoLegal ===')
  await actualizarLegal()

  const totalVentas = await prisma.venta.count()
  const totalUnidadesVinculadas = await prisma.unidad.count({ where: { ventaId: { not: null } } })
  const totalLegal = await prisma.procesoLegal.count()
  console.log(`\nResumen: ${totalVentas} ventas, ${totalUnidadesVinculadas} unidades vinculadas, ${totalLegal} procesos legales`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
