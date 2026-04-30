const prisma = require('../backend/src/lib/prisma')

// Fecha de vencimiento: día 5 del mes, comenzando Feb 2026
function fechaCuota(numeroCuota) {
  // Cuota 1 = Feb 5 2026, cuota 2 = Mar 5, etc.
  const mes = 1 + numeroCuota  // Feb = mes index 1 (0-based)
  return new Date(2026, mes, 5)
}

const ventas = [
  {
    contactoId: 3809,   // Claudia Suárez Del (csuarezdp@gmail.com)
    unidadId: 103,      // Aldunate 48 Bodega
    precioUF: 43.99,
    cuotas: ['PAGADO', 'PAGADO', 'ATRASADO', 'PENDIENTE'],
  },
  {
    contactoId: 3809,   // Claudia Suárez Del
    unidadId: 101,      // Aldunate 57 Bodega
    precioUF: 43.99,
    cuotas: ['PAGADO', 'PAGADO', 'ATRASADO', 'PENDIENTE'],
  },
  {
    contactoId: 4693,   // Esteban (estebanorregoeu13@gmail.com)
    unidadId: 94,       // Plus B298 Bodega
    precioUF: 62.78,
    cuotas: ['PAGADO', 'PAGADO', 'ATRASADO'],
  },
  {
    contactoId: 4129,   // Germán Navarrete (germanantonionavarrete7@gmail.com)
    unidadId: 85,       // Trinitarias 33 Bodega
    precioUF: 139,
    cuotas: ['PAGADO', 'PAGADO', 'PAGADO'],
  },
  {
    contactoId: 4129,   // Germán Navarrete
    unidadId: 86,       // Trinitarias 32 Bodega
    precioUF: 139,
    cuotas: ['PAGADO', 'PAGADO', 'PAGADO'],
  },
]

async function main() {
  for (const v of ventas) {
    const unidad = await prisma.unidad.findUnique({
      where: { id: v.unidadId },
      select: { numero: true, edificio: { select: { nombre: true } } }
    })
    const contacto = await prisma.contacto.findUnique({
      where: { id: v.contactoId },
      select: { nombre: true, apellido: true }
    })

    console.log(`\n→ Procesando: ${contacto.nombre} ${contacto.apellido} | ${unidad.edificio.nombre} ${unidad.numero}`)

    // Verificar que no haya venta ya para esta unidad
    const ventaExistente = await prisma.venta.findFirst({
      where: { unidades: { some: { id: v.unidadId } } }
    })
    if (ventaExistente) {
      console.log('  ⚠ Ya existe venta para esta unidad (id:', ventaExistente.id, '). Saltando.')
      continue
    }

    // Crear lead
    const lead = await prisma.lead.create({
      data: {
        contactoId: v.contactoId,
        unidadInteresId: v.unidadId,
        etapa: 'RESERVA',
      }
    })
    console.log('  Lead creado:', lead.id)

    // Crear venta
    const montoUFPorCuota = +(v.precioUF / v.cuotas.length).toFixed(2)
    const venta = await prisma.venta.create({
      data: {
        leadId: lead.id,
        compradorId: v.contactoId,
        precioUF: v.precioUF,
        estado: 'RESERVA',
        fechaReserva: new Date(2026, 0, 5), // 5 enero 2026
        unidades: { connect: { id: v.unidadId } },
      }
    })
    console.log('  Venta creada:', venta.id)

    // Crear plan de pago
    const plan = await prisma.planPago.create({
      data: {
        ventaId: venta.id,
        totalCuotas: v.cuotas.length,
        montoUF: v.precioUF,
        fechaInicio: new Date(2026, 1, 5), // 5 febrero 2026
      }
    })
    console.log('  Plan de pago creado:', plan.id)

    // Crear cuotas
    for (let i = 0; i < v.cuotas.length; i++) {
      const estado = v.cuotas[i]
      const fv = fechaCuota(i + 1)
      const cuota = await prisma.cuota.create({
        data: {
          planPagoId: plan.id,
          numeroCuota: i + 1,
          tipo: 'CUOTA',
          montoUF: montoUFPorCuota,
          montoCLP: 200000,
          fechaVencimiento: fv,
          estado,
          fechaPagoReal: estado === 'PAGADO' ? fv : null,
        }
      })
      console.log(`  Cuota ${i+1}: ${estado} (${fv.toFullDateString ? fv.toDateString() : fv.toISOString().split('T')[0]})`)
    }
    console.log('  ✓ Listo')
  }

  await prisma.$disconnect()
  console.log('\n✅ Todas las ventas y pagos creados.')
}

main().catch(e => {
  console.error(e)
  prisma.$disconnect()
  process.exit(1)
})
