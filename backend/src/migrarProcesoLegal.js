const prisma = require('./lib/prisma')

async function main() {
  const ventas = await prisma.venta.findMany({
    where: { procesoLegal: null },
    select: { id: true, fechaReserva: true, creadoEn: true }
  })

  console.log(`Ventas sin ProcesoLegal: ${ventas.length}`)

  for (const venta of ventas) {
    const fechaBase = venta.fechaReserva || venta.creadoEn
    await prisma.procesoLegal.create({
      data: {
        ventaId: venta.id,
        tienePromesa: false,
        estadoActual: 'ESCRITURA_LISTA',
        fechaLimiteEscritura: fechaBase,
        fechaLimiteFirmaNot: fechaBase,
        fechaLimiteCBR: fechaBase,
        fechaLimiteEntrega: fechaBase
      }
    })
    console.log(`  ✓ Venta #${venta.id}`)
  }

  console.log('Listo.')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
