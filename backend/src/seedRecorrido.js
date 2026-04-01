// Crea un lead completo que hace todo el recorrido: lead → visita → venta → legal → pagos
require('dotenv').config()
const prisma = require('./lib/prisma')

async function main() {
  console.log('Creando recorrido completo de un lead...\n')

  // ─── Contacto ───────────────────────────────────────────────────
  const contacto = await prisma.contacto.create({
    data: {
      nombre: 'Carlos',
      apellido: 'Mendoza',
      rut: '12.345.678-9',
      email: 'carlos.mendoza@gmail.com',
      telefono: '+56912345678',
      empresa: 'Mendoza Logistics SpA',
      tipoPersona: 'EMPRESA',
      origen: 'REFERIDO',
    }
  })
  console.log(`✅ Contacto: ${contacto.nombre} ${contacto.apellido} (ID ${contacto.id})`)

  // ─── Lead ───────────────────────────────────────────────────────
  const lead = await prisma.lead.create({
    data: {
      contactoId: contacto.id,
      unidadInteresId: 1,   // Bodega B-001, Torre Bodegas Las Condes, 450 UF
      vendedorId: 3,         // María López
      etapa: 'NUEVO',
      campana: 'Referidos Q1 2026',
      presupuestoAprox: 460,
      notas: 'Cliente busca bodega para empresa de logística. Referido por Diego Castro.',
    }
  })
  console.log(`✅ Lead creado: ID ${lead.id} | Etapa: ${lead.etapa}`)

  // ─── Interacciones (historia del lead) ─────────────────────────
  await prisma.interaccion.create({
    data: {
      leadId: lead.id,
      usuarioId: 3,
      tipo: 'LLAMADA',
      descripcion: 'Primer contacto. Cliente interesado en bodega para almacenamiento de equipos industriales. Agenda visita para la semana siguiente.',
      fecha: new Date('2026-03-10T10:00:00Z'),
    }
  })

  await prisma.lead.update({ where: { id: lead.id }, data: { etapa: 'SEGUIMIENTO' } })
  console.log('✅ Etapa → SEGUIMIENTO')

  await prisma.interaccion.create({
    data: {
      leadId: lead.id,
      usuarioId: 3,
      tipo: 'WHATSAPP',
      descripcion: 'Se envió ficha técnica de bodega B-001 y cotización por 450 UF. Cliente confirma recepción e interés.',
      fecha: new Date('2026-03-11T14:30:00Z'),
    }
  })

  await prisma.lead.update({ where: { id: lead.id }, data: { etapa: 'COTIZACION_ENVIADA' } })
  console.log('✅ Etapa → COTIZACION_ENVIADA')

  // ─── Visita ─────────────────────────────────────────────────────
  await prisma.lead.update({ where: { id: lead.id }, data: { etapa: 'VISITA_AGENDADA' } })
  console.log('✅ Etapa → VISITA_AGENDADA')

  await prisma.visita.create({
    data: {
      leadId: lead.id,
      vendedorId: 3,
      fechaHora: new Date('2026-03-15T11:00:00Z'),
      tipo: 'PRESENCIAL',
      resultado: 'POSITIVO',
      notas: 'Visita muy positiva. Le gustó el acceso directo y el tamaño. Confirma que el espacio cubre sus necesidades. Pide un pequeño descuento.',
    }
  })

  await prisma.lead.update({ where: { id: lead.id }, data: { etapa: 'VISITA_REALIZADA' } })
  console.log('✅ Visita registrada → VISITA_REALIZADA')

  // ─── Negociación ────────────────────────────────────────────────
  await prisma.interaccion.create({
    data: {
      leadId: lead.id,
      usuarioId: 3,
      tipo: 'LLAMADA',
      descripcion: 'Se aprobó descuento de 10 UF. Precio final acordado: 440 UF. Cliente acepta y solicita proceder con la reserva.',
      fecha: new Date('2026-03-18T16:00:00Z'),
    }
  })

  await prisma.lead.update({ where: { id: lead.id }, data: { etapa: 'NEGOCIACION' } })
  console.log('✅ Etapa → NEGOCIACION')

  // ─── Venta (Reserva) ────────────────────────────────────────────
  const venta = await prisma.venta.create({
    data: {
      leadId: lead.id,
      unidadId: 1,
      compradorId: contacto.id,
      vendedorId: 3,
      gerenteId: 1,
      precioUF: 450,
      descuentoUF: 10,
      estado: 'RESERVA',
      fechaReserva: new Date('2026-03-20T00:00:00Z'),
      notas: 'Descuento aprobado por gerencia. Cliente pagó boleta de reserva.',
    }
  })

  await prisma.lead.update({ where: { id: lead.id }, data: { etapa: 'RESERVA' } })
  await prisma.unidad.update({ where: { id: 1 }, data: { estado: 'RESERVADO' } })
  console.log(`✅ Venta creada: ID ${venta.id} | Estado: RESERVA`)

  // ─── Plan de pagos ───────────────────────────────────────────────
  const precioFinal = 440 // 450 - 10 descuento
  await prisma.planPago.create({
    data: {
      ventaId: venta.id,
      totalCuotas: 4,
      montoUF: precioFinal,
      fechaInicio: new Date('2026-03-20'),
      cuotas: {
        create: [
          { tipo: 'RESERVA',   numeroCuota: 1, montoUF: 8.8,    fechaVencimiento: new Date('2026-03-20'), estado: 'PAGADO' },
          { tipo: 'PIE',       numeroCuota: 2, montoUF: 88,     fechaVencimiento: new Date('2026-04-30'), estado: 'PENDIENTE' },
          { tipo: 'PIE',       numeroCuota: 3, montoUF: 88,     fechaVencimiento: new Date('2026-05-30'), estado: 'PENDIENTE' },
          { tipo: 'ESCRITURA', numeroCuota: 4, montoUF: 255.2,  fechaVencimiento: new Date('2026-07-15'), estado: 'PENDIENTE' },
        ]
      }
    }
  })
  console.log('✅ Plan de pagos creado (4 cuotas)')

  // ─── Avanzar a Promesa ───────────────────────────────────────────
  await prisma.venta.update({
    where: { id: venta.id },
    data: { estado: 'PROMESA', fechaPromesa: new Date('2026-04-10') }
  })
  await prisma.lead.update({ where: { id: lead.id }, data: { etapa: 'PROMESA' } })
  console.log('✅ Venta → PROMESA')

  // ─── Proceso Legal ────────────────────────────────────────────────
  await prisma.procesoLegal.create({
    data: {
      ventaId: venta.id,
      tienePromesa: true,
      estadoActual: 'FIRMA_CLIENTE_PROMESA',
      fechaLimiteFirmaCliente: new Date('2026-04-15'),
      fechaLimiteFirmaInmob:   new Date('2026-04-22'),
      // Las demás fechas aún sin configurar → aparecerán como "qué falta"
    }
  })
  console.log('✅ Proceso legal iniciado: FIRMA_CLIENTE_PROMESA')

  console.log('\n══════════════════════════════════════')
  console.log('Recorrido completo creado:')
  console.log(`  Contacto:  ${contacto.nombre} ${contacto.apellido} (ID ${contacto.id})`)
  console.log(`  Lead:      ID ${lead.id} — etapa final: PROMESA`)
  console.log(`  Venta:     ID ${venta.id} — PROMESA, 440 UF`)
  console.log(`  Unidad:    Bodega B-001, Torre Bodegas Las Condes`)
  console.log(`  Legal:     FIRMA_CLIENTE_PROMESA (límite 15 Abr 2026)`)
  console.log(`  Pagos:     4 cuotas — 1 pagada (reserva), 3 pendientes`)
  console.log('══════════════════════════════════════')
}

main().catch(console.error).finally(() => prisma.$disconnect())
