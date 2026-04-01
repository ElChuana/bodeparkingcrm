require('dotenv').config()
const bcrypt = require('bcryptjs')
const prisma = require('./lib/prisma')

async function main() {
  const hash = await bcrypt.hash('admin1234', 10)

  const gerente = await prisma.usuario.upsert({
    where: { email: 'gerente@bodeparking.cl' },
    update: {},
    create: {
      nombre: 'Admin',
      apellido: 'Gerente',
      email: 'gerente@bodeparking.cl',
      password: hash,
      rol: 'GERENTE',
      activo: true
    }
  })

  // Configuración inicial de alertas
  const alertas = [
    { tipo: 'LLAVE_NO_DEVUELTA',   umbralDias: 3  },
    { tipo: 'CUOTA_VENCIDA',       umbralDias: 1  },
    { tipo: 'LEAD_SIN_ACTIVIDAD',  umbralDias: 7  },
    { tipo: 'FECHA_LEGAL_PROXIMA', umbralDias: 5  },
    { tipo: 'ARRIENDO_POR_VENCER', umbralDias: 30 },
    { tipo: 'DESCUENTO_PENDIENTE', umbralDias: 1  },
  ]

  for (const alerta of alertas) {
    await prisma.alertaConfig.upsert({
      where: { tipo: alerta.tipo },
      update: {},
      create: { ...alerta, activa: true, canalEmail: true, canalWhatsapp: false }
    })
  }

  console.log('✅ Usuario gerente creado:')
  console.log('   Email:      gerente@bodeparking.cl')
  console.log('   Contraseña: admin1234')
  console.log('✅ Configuración de alertas creada')
  console.log('')
  console.log('⚠️  Recuerda cambiar la contraseña después del primer login.')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
