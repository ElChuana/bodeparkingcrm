/**
 * Semilla del plan de cuentas del ERP: cuentas grandes y subcuentas.
 *
 * Sale de las categorías que ya se usaban en los excels de finanzas
 * (ventas-vs-gastos, resultado-extendido). Idempotente: upsert por (nombre, padre).
 *
 * Uso: DATABASE_URL=... node scripts/seed-cuentas-gasto.js
 */

const prisma = require('../src/lib/prisma')

const PLAN = [
  {
    nombre: 'Comercial', color: '#0091C3', subcuentas: [
      'Publicidad',
      'Asesoría comercial',
      'Representación regiones',
      'Webinar',
      'Comisiones de venta',
    ],
  },
  {
    nombre: 'Administración', color: '#3D3D3D', subcuentas: [
      'Arriendo oficina',
      'Sueldos administración',
      'Contabilidad',
      'Software',
      'Legal y notaría',
    ],
  },
  {
    nombre: 'Inmobiliaria', color: '#0E7C5A', subcuentas: [
      'Compra de unidades',
      'Gastos comunes',
      'Contribuciones',
      'Mantención',
    ],
  },
  {
    nombre: 'Financiera', color: '#8A4FBF', subcuentas: [
      'Comisiones bancarias',
      'Impuestos',
      'Intereses y créditos',
    ],
  },
]

async function main() {
  let creadas = 0
  for (const [i, raiz] of PLAN.entries()) {
    let padre = await prisma.cuentaGasto.findFirst({ where: { nombre: raiz.nombre, padreId: null } })
    if (!padre) {
      padre = await prisma.cuentaGasto.create({ data: { nombre: raiz.nombre, color: raiz.color, orden: i, tipo: 'GASTO' } })
      creadas++
    }
    for (const [j, sub] of raiz.subcuentas.entries()) {
      const ya = await prisma.cuentaGasto.findFirst({ where: { nombre: sub, padreId: padre.id } })
      if (!ya) {
        await prisma.cuentaGasto.create({ data: { nombre: sub, padreId: padre.id, orden: j, tipo: 'GASTO' } })
        creadas++
      }
    }
  }
  const total = await prisma.cuentaGasto.count()
  console.log(`Plan de cuentas listo: ${creadas} cuenta(s) creadas, ${total} en total.`)
}

main().finally(() => prisma.$disconnect())
