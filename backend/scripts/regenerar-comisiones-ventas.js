// Regenera las comisiones de ventas específicas aplicando las reglas vigentes.
// Borra las comisiones existentes de cada venta (solo si están 100% PENDIENTES,
// para no perder pagos registrados) y las vuelve a crear con el motor de reglas.
// Uso: DATABASE_URL="$RAILWAY_URL" node scripts/regenerar-comisiones-ventas.js 115 120 121
const prisma = require('../src/lib/prisma')
const { aplicarReglasComision } = require('../src/lib/comisiones')

async function main() {
  const ids = process.argv.slice(2).map(Number).filter(Boolean)
  if (!ids.length) {
    console.error('Uso: node scripts/regenerar-comisiones-ventas.js <ventaId> [ventaId...]')
    process.exit(1)
  }

  for (const ventaId of ids) {
    const existentes = await prisma.comision.findMany({
      where: { ventaId },
      include: { usuario: { select: { nombre: true, apellido: true } } }
    })

    const conPago = existentes.filter(c => c.estadoPrimera === 'PAGADO' || c.estadoSegunda === 'PAGADO')
    if (conPago.length) {
      console.log(`⚠️  Venta ${ventaId}: tiene comisiones con pagos registrados — NO se toca. Revisar a mano.`)
      continue
    }

    console.log(`\n─── Venta ${ventaId} ───`)
    for (const c of existentes) {
      console.log(`  borrada: ${c.usuario.nombre} ${c.usuario.apellido} — ${c.concepto} ${c.porcentaje ?? '-'}% (${Number(c.montoCalculadoUF).toFixed(3)} UF)`)
    }
    await prisma.comision.deleteMany({ where: { ventaId } })

    const nuevas = await aplicarReglasComision(ventaId)
    for (const c of nuevas) {
      const u = await prisma.usuario.findUnique({ where: { id: c.usuarioId }, select: { nombre: true, apellido: true } })
      console.log(`  creada:  ${u.nombre} ${u.apellido} — ${c.concepto} ${c.porcentaje}% → ${c.montoCalculadoUF.toFixed(3)} UF (promesa ${c.montoPrimera.toFixed(3)} / escritura ${c.montoSegunda.toFixed(3)})`)
    }
  }
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
