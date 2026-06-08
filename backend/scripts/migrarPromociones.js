// Migra los Pack + Beneficio existentes al modelo unificado Promocion.
// Idempotente: si ya existe una Promocion con el mismo nombre+categoria, la salta.
// Uso: node scripts/migrarPromociones.js   (apunta a Railway vía DATABASE_URL_RAILWAY)
require('dotenv').config()
process.env.DATABASE_URL = process.env.DATABASE_URL_RAILWAY || process.env.DATABASE_URL
const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()

// Pack.tipo → Promocion.tipo (categoria DESCUENTO)
const mapTipoPack = (tipo) => (tipo === 'COMBO_ESPECIFICO' ? 'PAQUETE' : 'DESCUENTO_UF')
// Beneficio.tipo → Promocion.tipo (categoria BENEFICIO)
const mapTipoBeneficio = (tipo) =>
  ['ARRIENDO_ASEGURADO', 'GASTOS_NOTARIALES', 'CUOTAS_SIN_INTERES'].includes(tipo) ? tipo : 'OTRO'

async function main() {
  const packs = await p.pack.findMany({ include: { unidades: true } })
  const beneficios = await p.beneficio.findMany({ include: { unidades: true } })
  let creadas = 0, saltadas = 0

  for (const pk of packs) {
    const existe = await p.promocion.findFirst({ where: { nombre: pk.nombre, categoria: 'DESCUENTO' } })
    if (existe) { saltadas++; continue }
    await p.promocion.create({
      data: {
        nombre: pk.nombre,
        descripcion: pk.descripcion,
        categoria: 'DESCUENTO',
        tipo: mapTipoPack(pk.tipo),
        valorUF: pk.descuentoUF,
        minUnidades: pk.minUnidades,
        fechaInicio: pk.fechaInicio,
        fechaFin: pk.fechaFin,
        activa: pk.activa,
        campanaId: null,
        unidades: pk.unidades.length
          ? { create: pk.unidades.map(u => ({ unidadId: u.unidadId })) }
          : undefined,
      },
    })
    creadas++
  }

  for (const b of beneficios) {
    const existe = await p.promocion.findFirst({ where: { nombre: b.nombre, categoria: 'BENEFICIO' } })
    if (existe) { saltadas++; continue }
    await p.promocion.create({
      data: {
        nombre: b.nombre,
        descripcion: b.descripcion,
        categoria: 'BENEFICIO',
        tipo: mapTipoBeneficio(b.tipo),
        meses: b.meses,
        montoMensualUF: b.montoMensualUF,
        detalle: b.detalle,
        fechaInicio: b.fechaInicio,
        fechaFin: b.fechaFin,
        activa: b.activa,
        campanaId: null,
        unidades: b.unidades.length
          ? { create: b.unidades.map(u => ({ unidadId: u.unidadId })) }
          : undefined,
      },
    })
    creadas++
  }

  console.log(`\nMigración: creadas ${creadas} · saltadas (ya existían) ${saltadas}`)
  const all = await p.promocion.findMany({ orderBy: { id: 'asc' }, include: { _count: { select: { unidades: true } } } })
  console.log(`\nPromociones en BD (${all.length}):`)
  all.forEach(x =>
    console.log(`  #${x.id} [${x.categoria}/${x.tipo}] ${x.nombre} | valorUF:${x.valorUF ?? '-'} min:${x.minUnidades ?? '-'} unidades:${x._count.unidades} activa:${x.activa}`)
  )
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => p.$disconnect())
