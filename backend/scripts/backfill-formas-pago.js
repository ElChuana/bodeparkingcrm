// Backfill de la forma de pago de las ventas históricas (ago 2026).
//
// La forma de pago se empezó a registrar recién ahora, así que para las ventas
// anteriores se INFIERE de lo que ya está en la base:
//   - CUOTAS        → la venta tiene beneficio de "cuotas sin interés", o su
//                     plan de pago tiene 2 o más cuotas de tipo CUOTA (una sola
//                     cuota es un pago único, no un crédito en cuotas)
//   - TRANSFERENCIA / VALE_VISTA / TARJETA → método con que se pagó alguna cuota
//   - sin evidencia → no se crea nada: la venta queda AL CONTADO (el default)
//
// Los montos quedan en null a propósito: no hay dato histórico de cuánto se pagó
// con cada forma y no se inventa. El desglose en pesos vive en el plan de pagos.
//
// Idempotente: solo toca ventas que todavía no tienen formas de pago.
// Uso:  node scripts/backfill-formas-pago.js [--aplicar]
//       (sin --aplicar solo muestra lo que haría)

const prisma = require('../src/lib/prisma')

const APLICAR = process.argv.includes('--aplicar')

// Los métodos de una cuota que sí son una forma de pago de la venta.
// CHEQUE y EFECTIVO no existen como forma de pago: se anotan en notas.
const METODO_A_FORMA = {
  TRANSFERENCIA: 'TRANSFERENCIA',
  VALE_VISTA: 'VALE_VISTA',
  TARJETA: 'TARJETA',
}

const cuotasDelNombre = (nombre = '') => {
  const m = /(\d+)\s*cuotas/i.exec(nombre)
  return m ? Number(m[1]) : null
}

// Completa `meses` en las promociones/beneficios de cuotas que solo lo tienen
// en el nombre ("Crédito directo 6 cuotas") — así el dato queda explícito.
async function completarMesesDeBeneficios() {
  const cambios = []

  const promos = await prisma.promocion.findMany({
    where: { tipo: 'CUOTAS_SIN_INTERES', meses: null },
    select: { id: true, nombre: true },
  })
  for (const p of promos) {
    const meses = cuotasDelNombre(p.nombre)
    if (!meses) continue
    cambios.push({ tabla: 'promociones', id: p.id, nombre: p.nombre.trim(), meses })
    if (APLICAR) await prisma.promocion.update({ where: { id: p.id }, data: { meses } })
  }

  const beneficios = await prisma.beneficio.findMany({
    where: { tipo: 'CUOTAS_SIN_INTERES', meses: null },
    select: { id: true, nombre: true },
  })
  for (const b of beneficios) {
    const meses = cuotasDelNombre(b.nombre)
    if (!meses) continue
    cambios.push({ tabla: 'beneficios', id: b.id, nombre: b.nombre.trim(), meses })
    if (APLICAR) await prisma.beneficio.update({ where: { id: b.id }, data: { meses } })
  }

  return cambios
}

// Deduce las formas de pago de una venta a partir de sus datos existentes.
function inferirFormas(venta) {
  const formas = []
  const motivos = []

  const promoCuotas = venta.promociones.find(vp => vp.promocion?.tipo === 'CUOTAS_SIN_INTERES')?.promocion
  const beneficioCuotas = venta.beneficios.find(vb => vb.beneficio?.tipo === 'CUOTAS_SIN_INTERES')?.beneficio
  const fuenteCuotas = promoCuotas || beneficioCuotas

  const cuotasDelPlan = (venta.planPago?.cuotas || []).filter(c => c.tipo === 'CUOTA')
  const nDelPlan = cuotasDelPlan.length

  // Una sola cuota tipo CUOTA es el saldo pagado de una vez, no un crédito
  const planEnCuotas = nDelPlan >= 2
  if (fuenteCuotas || planEnCuotas) {
    const nBeneficio = fuenteCuotas ? (fuenteCuotas.meses || cuotasDelNombre(fuenteCuotas.nombre)) : null
    // La cantidad se guarda solo si el plan real difiere del beneficio
    // (si calzan, el beneficio manda y no hace falta duplicar el dato).
    const nPlan = planEnCuotas ? nDelPlan : null
    const cuotas = nBeneficio && nBeneficio === nPlan ? null : nPlan
    formas.push({ forma: 'CUOTAS', montoUF: null, cuotas })
    motivos.push(fuenteCuotas ? `beneficio "${fuenteCuotas.nombre.trim()}"` : `${nDelPlan} cuotas en el plan`)
  }

  const metodos = new Set()
  const ignorados = new Set()
  for (const c of venta.planPago?.cuotas || []) {
    if (!c.metodoPago) continue
    if (METODO_A_FORMA[c.metodoPago]) metodos.add(METODO_A_FORMA[c.metodoPago])
    else ignorados.add(c.metodoPago)
  }
  for (const forma of metodos) {
    if (formas.some(f => f.forma === forma)) continue
    formas.push({ forma, montoUF: null, cuotas: null })
    motivos.push(`cuotas pagadas por ${forma.toLowerCase().replace('_', ' ')}`)
  }

  // Cheque/efectivo no son formas de pago del modelo: quedan anotados
  if (ignorados.size > 0 && formas.length > 0) {
    formas[formas.length - 1].notas = `También se registraron pagos en ${[...ignorados].join(', ').toLowerCase()}`
    motivos.push(`(pagos en ${[...ignorados].join(', ').toLowerCase()} anotados en notas)`)
  }

  return { formas, motivo: motivos.join(' + ') }
}

async function main() {
  const meses = await completarMesesDeBeneficios()
  if (meses.length > 0) {
    console.log(`\n▸ Beneficios de cuotas con la cantidad completada (${meses.length}):`)
    console.table(meses)
  }

  const ventas = await prisma.venta.findMany({
    where: { estado: { not: 'ANULADO' }, formasPago: { none: {} } },
    select: {
      id: true, estado: true, precioFinalUF: true,
      comprador: { select: { nombre: true, apellido: true } },
      planPago: { select: { cuotas: { select: { tipo: true, metodoPago: true } } } },
      promociones: { select: { promocion: { select: { tipo: true, nombre: true, meses: true } } } },
      beneficios: { select: { beneficio: { select: { tipo: true, nombre: true, meses: true } } } },
    },
    orderBy: { id: 'asc' },
  })

  const conFormas = []
  const alContado = []

  for (const venta of ventas) {
    const { formas, motivo } = inferirFormas(venta)
    const fila = {
      venta: venta.id,
      estado: venta.estado,
      comprador: `${venta.comprador?.nombre || ''} ${venta.comprador?.apellido || ''}`.trim(),
      formas: formas.map(f => f.forma + (f.cuotas ? ` (${f.cuotas})` : '')).join(' + ') || 'AL CONTADO',
      segun: motivo || 'sin evidencia de pago registrada',
    }

    if (formas.length === 0) { alContado.push(fila); continue }
    conFormas.push(fila)

    if (APLICAR) {
      await prisma.ventaFormaPago.createMany({
        data: formas.map(f => ({ ventaId: venta.id, ...f })),
        skipDuplicates: true,
      })
    }
  }

  console.log(`\n▸ Ventas con forma de pago inferida (${conFormas.length}):`)
  console.table(conFormas)
  console.log(`\n▸ Ventas que quedan AL CONTADO — sin evidencia de otra forma (${alContado.length}):`)
  console.table(alContado.map(({ venta, estado, comprador }) => ({ venta, estado, comprador })))

  console.log(APLICAR
    ? '\n✅ Aplicado.'
    : '\n(dry-run: no se escribió nada. Correr con --aplicar para guardar.)')
}

main()
  .catch(e => { console.error(e); process.exitCode = 1 })
  .finally(() => prisma.$disconnect())
