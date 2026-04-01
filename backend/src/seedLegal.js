// Script para crear datos legales y de pagos conectados a las ventas existentes
// Ejecutar: node src/seedLegal.js
require('dotenv').config()
const prisma = require('./lib/prisma')

async function main() {
  // Obtener las ventas existentes
  const ventas = await prisma.venta.findMany({
    orderBy: { id: 'asc' },
    include: { lead: true }
  })

  if (ventas.length === 0) {
    console.log('❌ No hay ventas. Crea ventas primero.')
    return
  }

  console.log(`✅ Encontradas ${ventas.length} ventas`)

  for (const venta of ventas) {
    console.log(`\n→ Procesando venta #${venta.id} (${venta.estado})`)

    // ─── Proceso Legal ─────────────────────────────────────────────
    const legalExistente = await prisma.procesoLegal.findUnique({ where: { ventaId: venta.id } })

    if (!legalExistente) {
      let datos = {}

      if (venta.estado === 'PROMESA') {
        datos = {
          tienePromesa: true,
          estadoActual: 'FIRMA_CLIENTE_PROMESA',
          fechaLimiteFirmaCliente: new Date('2026-04-05'),
          // Las demás sin configurar → aparecerán como "qué falta"
        }
      } else if (venta.estado === 'ESCRITURA') {
        datos = {
          tienePromesa: true,
          estadoActual: 'ESCRITURA_LISTA',
          fechaLimiteFirmaCliente: new Date('2026-01-30'),
          fechaLimiteFirmaInmob:   new Date('2026-02-15'),
          fechaLimiteEscritura:    new Date('2026-04-20'),
          // Sin fecha notaría, CBR, entrega → aparecen como "qué falta"
        }
      } else if (venta.estado === 'ENTREGADO') {
        datos = {
          tienePromesa: true,
          estadoActual: 'ENTREGADO',
          fechaLimiteFirmaCliente: new Date('2025-12-10'),
          fechaLimiteFirmaInmob:   new Date('2025-12-20'),
          fechaLimiteEscritura:    new Date('2026-01-15'),
          fechaLimiteFirmaNot:     new Date('2026-01-20'),
          fechaLimiteCBR:          new Date('2026-02-05'),
          fechaLimiteEntrega:      new Date('2026-02-20'),
        }
      } else {
        console.log(`  ↳ Estado ${venta.estado} — sin proceso legal`)
        continue
      }

      await prisma.procesoLegal.create({ data: { ventaId: venta.id, ...datos } })
      console.log(`  ✅ ProcesoLegal creado: ${datos.estadoActual}`)
    } else {
      console.log(`  ⚠ ProcesoLegal ya existe: ${legalExistente.estadoActual}`)
    }

    // ─── Plan de pagos ─────────────────────────────────────────────
    const planExistente = await prisma.planPago.findUnique({ where: { ventaId: venta.id } })

    if (!planExistente) {
      const precio = venta.precioUF - (venta.descuentoUF || 0)

      let cuotasDef = []

      if (venta.estado === 'PROMESA') {
        cuotasDef = [
          { tipo: 'RESERVA',   numeroCuota: 1, montoUF: precio * 0.02, montoCLP: null,   fechaVencimiento: new Date('2026-03-01'), estado: 'PAGADO' },
          { tipo: 'PIE',       numeroCuota: 2, montoUF: precio * 0.20, montoCLP: null,   fechaVencimiento: new Date('2026-04-15'), estado: 'PENDIENTE' },
          { tipo: 'ESCRITURA', numeroCuota: 3, montoUF: precio * 0.78, montoCLP: null,   fechaVencimiento: new Date('2026-06-01'), estado: 'PENDIENTE' },
        ]
      } else if (venta.estado === 'ESCRITURA') {
        cuotasDef = [
          { tipo: 'RESERVA',   numeroCuota: 1, montoUF: precio * 0.02, montoCLP: null,   fechaVencimiento: new Date('2026-01-20'), estado: 'PAGADO' },
          { tipo: 'PIE',       numeroCuota: 2, montoUF: precio * 0.20, montoCLP: null,   fechaVencimiento: new Date('2026-02-15'), estado: 'PAGADO' },
          { tipo: 'ESCRITURA', numeroCuota: 3, montoUF: precio * 0.78, montoCLP: null,   fechaVencimiento: new Date('2026-04-30'), estado: 'PENDIENTE' },
        ]
      } else if (venta.estado === 'ENTREGADO') {
        cuotasDef = [
          { tipo: 'RESERVA',   numeroCuota: 1, montoUF: precio * 0.02, montoCLP: null,   fechaVencimiento: new Date('2025-11-25'), estado: 'PAGADO' },
          { tipo: 'PIE',       numeroCuota: 2, montoUF: precio * 0.20, montoCLP: null,   fechaVencimiento: new Date('2025-12-20'), estado: 'PAGADO' },
          { tipo: 'ESCRITURA', numeroCuota: 3, montoUF: precio * 0.78, montoCLP: null,   fechaVencimiento: new Date('2026-02-10'), estado: 'PAGADO' },
        ]
      }

      if (cuotasDef.length > 0) {
        await prisma.planPago.create({
          data: {
            ventaId: venta.id,
            totalCuotas: cuotasDef.length,
            montoUF: precio,
            fechaInicio: cuotasDef[0].fechaVencimiento,
            cuotas: { create: cuotasDef }
          }
        })
        console.log(`  ✅ PlanPago creado con ${cuotasDef.length} cuotas`)
      }
    } else {
      console.log(`  ⚠ PlanPago ya existe`)
    }

    // ─── Actualizar etapa del lead ──────────────────────────────────
    if (venta.lead) {
      const etapaEsperada = {
        PROMESA:    'PROMESA',
        ESCRITURA:  'ESCRITURA',
        ENTREGADO:  'ENTREGA',
        RESERVA:    'RESERVA',
      }[venta.estado]

      if (etapaEsperada) {
        await prisma.lead.update({
          where: { id: venta.lead.id },
          data: { etapa: etapaEsperada }
        })
        console.log(`  ✅ Lead #${venta.lead.id} etapa → ${etapaEsperada}`)
      }
    }
  }

  console.log('\n✅ Seed legal completado.')
}

main().catch(console.error).finally(() => prisma.$disconnect())
