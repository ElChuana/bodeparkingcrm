require('dotenv').config()
const bcrypt = require('bcryptjs')
const prisma = require('../src/lib/prisma')

async function main() {
  const hash = await bcrypt.hash('bodeparking2026', 10)

  const juan = await prisma.usuario.upsert({
    where: { email: 'jvaldivieso@bodeparking.cl' },
    update: {},
    create: {
      nombre: 'Juan',
      apellido: 'Valdivieso',
      email: 'jvaldivieso@bodeparking.cl',
      password: hash,
      rol: 'GERENTE',
      activo: true
    }
  })

  const felix = await prisma.usuario.upsert({
    where: { email: 'fbetancourtt@bodeparking.cl' },
    update: {},
    create: {
      nombre: 'Felix',
      apellido: 'Betancourt',
      email: 'fbetancourtt@bodeparking.cl',
      password: hash,
      rol: 'JEFE_VENTAS',
      activo: true
    }
  })

  console.log('✅ Usuarios creados:')
  console.log('   Juan Valdivieso  jvaldivieso@bodeparking.cl  GERENTE')
  console.log('   Felix Betancourt fbetancourtt@bodeparking.cl JEFE_VENTAS')
  console.log('   Contraseña inicial configurada.')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
