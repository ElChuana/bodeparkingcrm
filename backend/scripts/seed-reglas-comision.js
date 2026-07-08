// Seed inicial de reglas de comisión automáticas (2026-07-08).
// Crea el usuario ChileParadise (agencia que hace los webinars) y las reglas base.
// Idempotente: no duplica si ya existen. Correr contra Railway:
//   DATABASE_URL="$RAILWAY_URL" node scripts/seed-reglas-comision.js
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')
const crypto = require('crypto')
const prisma = new PrismaClient()

const CHRISTIAN_GODOY_ID = 9

async function main() {
  // 1. Usuario ChileParadise (agencia externa, sin acceso al CRM: password aleatoria)
  let chileParadise = await prisma.usuario.findUnique({ where: { email: 'chileparadise@bodeparking.cl' } })
  if (!chileParadise) {
    chileParadise = await prisma.usuario.create({
      data: {
        nombre: 'ChileParadise',
        apellido: '(Agencia Webinar)',
        email: 'chileparadise@bodeparking.cl',
        password: await bcrypt.hash(crypto.randomBytes(24).toString('hex'), 10),
        rol: 'BROKER_EXTERNO',
        activo: true,
        modulosVisibles: [],
      }
    })
    console.log(`Usuario ChileParadise creado (ID ${chileParadise.id})`)
  } else {
    console.log(`Usuario ChileParadise ya existe (ID ${chileParadise.id})`)
  }

  // 2. Reglas
  const reglas = [
    {
      nombre: 'Vendedor 4%',
      rol: 'VENDEDOR', ambito: 'VENDE', origen: 'CUALQUIERA',
      porcentaje: 4, pctPromesa: 100, pctEscritura: 0,
    },
    {
      nombre: 'Christian Godoy 8% (no webinar)',
      usuarioId: CHRISTIAN_GODOY_ID, ambito: 'VENDE', origen: 'NO_WEBINAR',
      porcentaje: 8, pctPromesa: 100, pctEscritura: 0,
    },
    {
      nombre: 'Christian Godoy 4% (webinar)',
      usuarioId: CHRISTIAN_GODOY_ID, ambito: 'VENDE', origen: 'SOLO_WEBINAR',
      porcentaje: 4, pctPromesa: 100, pctEscritura: 0,
    },
    {
      nombre: 'Jefe de Ventas vende 4%',
      rol: 'JEFE_VENTAS', ambito: 'VENDE', origen: 'CUALQUIERA',
      porcentaje: 4, pctPromesa: 100, pctEscritura: 0,
    },
    {
      nombre: 'Jefe de Ventas 1% equipo',
      rol: 'JEFE_VENTAS', ambito: 'VENTAS_DE_OTROS', origen: 'CUALQUIERA',
      porcentaje: 1, pctPromesa: 50, pctEscritura: 50,
    },
    {
      nombre: 'ChileParadise webinar 4%',
      usuarioId: chileParadise.id, ambito: 'TODAS', origen: 'SOLO_WEBINAR',
      porcentaje: 4, pctPromesa: 50, pctEscritura: 50,
    },
  ]

  for (const r of reglas) {
    const existe = await prisma.reglaComision.findFirst({ where: { nombre: r.nombre } })
    if (existe) {
      console.log(`Ya existe: ${r.nombre}`)
      continue
    }
    await prisma.reglaComision.create({ data: r })
    console.log(`Creada: ${r.nombre}`)
  }
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
