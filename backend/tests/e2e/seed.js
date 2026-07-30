// Seed mínimo para el e2e. Se ejecuta contra la BD de prueba efímera,
// NUNCA contra producción (ver tests/e2e/README.md).
const bcrypt = require('bcryptjs')
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  if (!/localhost:55432/.test(process.env.DATABASE_URL || '')) {
    throw new Error('Seed abortado: DATABASE_URL no apunta a la BD de prueba (localhost:55432).')
  }

  const gerente = await prisma.usuario.create({
    data: {
      nombre: 'Test', apellido: 'Gerente', email: 'e2e@test.local',
      password: await bcrypt.hash('test1234', 10), rol: 'GERENTE', activo: true,
    },
  })

  const edificio = await prisma.edificio.create({
    data: { nombre: 'Edificio E2E', comuna: 'Concepción', region: 'Biobío', direccion: 'Calle Falsa 123' },
  })

  // Dos bodegas: replica el escenario que rompió la venta 123 (compra en combo).
  const u1 = await prisma.unidad.create({
    data: { edificioId: edificio.id, tipo: 'BODEGA', numero: '101', m2: 1.85, precioUF: 109, precioCostoUF: 25, estado: 'DISPONIBLE' },
  })
  const u2 = await prisma.unidad.create({
    data: { edificioId: edificio.id, tipo: 'BODEGA', numero: '102', m2: 2.18, precioUF: 102, precioCostoUF: 25, estado: 'DISPONIBLE' },
  })

  const contacto = await prisma.contacto.create({
    data: { nombre: 'Cliente E2E', apellido: 'Test', email: 'cliente.e2e@test.local', telefono: '+56900000000' },
  })
  const lead = await prisma.lead.create({
    data: { contactoId: contacto.id, etapa: 'NUEVO', vendedorId: gerente.id },
  })

  console.log(JSON.stringify({
    gerenteId: gerente.id, edificioId: edificio.id,
    unidadIds: [u1.id, u2.id], leadId: lead.id,
  }))
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
