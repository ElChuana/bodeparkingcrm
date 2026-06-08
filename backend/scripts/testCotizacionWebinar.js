// Prueba e2e de la lógica de promociones (descuento por-unidad + tachado + pack volumen).
// Crea una cotización temporal en BORRADOR, aplica promos del webinar, verifica y BORRA.
// Uso: node scripts/testCotizacionWebinar.js
require('dotenv').config()
process.env.DATABASE_URL = process.env.DATABASE_URL_RAILWAY || process.env.DATABASE_URL
const p = require('../src/lib/prisma')
const { recalcularPromociones, calcularTotales } = require('../src/controllers/cotizacionesController')

const aprox = (a, b) => Math.abs(a - b) < 0.011

async function main() {
  const lead = await p.lead.findFirst({ orderBy: { id: 'asc' } })
  const gerente = await p.usuario.findFirst({ where: { rol: 'GERENTE' } })
  if (!lead || !gerente) throw new Error('Falta lead o gerente para la prueba')

  const u87 = await p.unidad.findFirst({ where: { numero: '87', edificio: { nombre: 'Obispo Salas' } } })
  const u45 = await p.unidad.findFirst({ where: { numero: '45', edificio: { nombre: 'Obispo Salas' } } })
  const promoEntry = await p.promocion.findFirst({ where: { nombre: 'Precio Webinar ENTRY' } })
  const packDuo = await p.promocion.findFirst({ where: { nombre: 'Pack Dúo Webinar' } })

  console.log(`Unidades: 87(${u87.precioUF}UF) 45(${u45.precioUF}UF) · promoEntry #${promoEntry.id} (−${promoEntry.valorUF}) · packDúo #${packDuo.id} (−${packDuo.valorUF})`)

  // Crear cotización temporal con 2 unidades ENTRY
  const cot = await p.cotizacion.create({
    data: {
      leadId: lead.id,
      creadoPorId: gerente.id,
      estado: 'BORRADOR',
      notas: '__TEST_WEBINAR__ (borrar)',
      items: { create: [
        { unidadId: u87.id, precioListaUF: u87.precioUF },
        { unidadId: u45.id, precioListaUF: u45.precioUF },
      ] },
    },
  })

  try {
    // Aplicar promo de tier (por-unidad) + pack dúo (volumen)
    await p.cotizacionPromocion.create({ data: { cotizacionId: cot.id, promocionId: promoEntry.id, descuentoAplicadoUF: 0 } })
    await p.cotizacionPromocion.create({ data: { cotizacionId: cot.id, promocionId: packDuo.id, descuentoAplicadoUF: 0 } })
    await recalcularPromociones(cot.id)

    const full = await p.cotizacion.findUnique({
      where: { id: cot.id },
      include: { items: true, promociones: { include: { promocion: true } } },
    })
    const totales = calcularTotales(full)

    console.log('\n— RESULTADO —')
    full.items.forEach(i => console.log(`  item u${i.unidadId}: lista ${i.precioListaUF} − dto ${i.descuentoUF} = ${i.precioListaUF - i.descuentoUF} UF`))
    full.promociones.forEach(cp => console.log(`  promo ${cp.promocion.nombre}: −${cp.descuentoAplicadoUF} UF`))
    console.log('  totales:', JSON.stringify(totales))

    // Verificaciones esperadas
    const entryDesc = promoEntry.valorUF
    const esperadoFinal = (u87.precioUF + u45.precioUF) - (entryDesc * 2) - packDuo.valorUF
    const checks = [
      ['snapshot por unidad u87', aprox(full.items.find(i => i.unidadId === u87.id).descuentoUF, entryDesc)],
      ['snapshot por unidad u45', aprox(full.items.find(i => i.unidadId === u45.id).descuentoUF, entryDesc)],
      ['descuento promo ENTRY = 2×' + entryDesc, aprox(full.promociones.find(cp => cp.promocionId === promoEntry.id).descuentoAplicadoUF, entryDesc * 2)],
      ['descuento Pack Dúo = 5', aprox(full.promociones.find(cp => cp.promocionId === packDuo.id).descuentoAplicadoUF, 5)],
      ['precio final = ' + esperadoFinal.toFixed(2), aprox(totales.precioFinalUF, esperadoFinal)],
    ]
    console.log('\n— CHECKS —')
    let ok = true
    checks.forEach(([n, r]) => { console.log(`  ${r ? '✅' : '❌'} ${n}`); if (!r) ok = false })
    console.log(ok ? '\n✅ TODOS LOS CHECKS PASARON' : '\n❌ HAY CHECKS FALLIDOS')
  } finally {
    // Cleanup
    await p.cotizacionPromocion.deleteMany({ where: { cotizacionId: cot.id } })
    await p.cotizacionItem.deleteMany({ where: { cotizacionId: cot.id } })
    await p.cotizacion.delete({ where: { id: cot.id } })
    console.log('\n(cotización de prueba eliminada)')
  }
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => p.$disconnect())
