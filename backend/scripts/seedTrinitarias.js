// Crea/actualiza la promoción "Precio Webinar Trinitarias" → objetivo $5.990.000 por bodega.
// El descuento UF se calcula dinámico con la UF vigente (peso exacto). Las unidades ya más
// baratas que el objetivo no reciben descuento (no se les sube el precio). Idempotente.
require('dotenv').config()
process.env.DATABASE_URL = process.env.DATABASE_URL_RAILWAY || process.env.DATABASE_URL
const p = require('../src/lib/prisma')

const OBJETIVO = 5990000
const FECHA_FIN = new Date('2026-06-30T23:59:59')

async function main() {
  const ed = await p.edificio.findFirst({ where: { nombre: { contains: 'trinitar', mode: 'insensitive' } } })
  if (!ed) throw new Error('No se encontró el edificio Trinitarias')
  const uf = (await p.uFDiaria.findFirst({ orderBy: { fecha: 'desc' } })).valorPesos
  const objetivoUF = OBJETIVO / uf

  const unidades = await p.unidad.findMany({ where: { edificioId: ed.id, estado: 'DISPONIBLE' } })
  const campana = await p.campana.findFirst({ where: { nombre: 'Webinar Junio 2026' } })

  // descuento fallback = para la bodega más cara (si alguna vez falta la UF)
  const maxPrecio = Math.max(...unidades.map(u => u.precioUF))
  const descFallback = Number((maxPrecio - objetivoUF).toFixed(2))

  const existe = await p.promocion.findFirst({ where: { nombre: 'Precio Webinar Trinitarias' } })
  const data = {
    descripcion: `Precio webinar Trinitarias: $${OBJETIVO.toLocaleString('es-CL')} (descuento UF dinámico)`,
    categoria: 'DESCUENTO',
    tipo: 'DESCUENTO_UF',
    valorUF: descFallback,
    precioObjetivoPesos: OBJETIVO,
    minUnidades: null,
    fechaFin: FECHA_FIN,
    activa: true,
    campanaId: campana?.id || null,
  }
  const promo = existe
    ? await p.promocion.update({ where: { id: existe.id }, data })
    : await p.promocion.create({ data: { nombre: 'Precio Webinar Trinitarias', ...data } })

  // (re)asociar todas las bodegas del edificio
  await p.unidadPromocion.deleteMany({ where: { promocionId: promo.id } })
  for (const u of unidades) await p.unidadPromocion.create({ data: { promocionId: promo.id, unidadId: u.id } })

  console.log(`Promo #${promo.id} "Precio Webinar Trinitarias" · objetivo $${OBJETIVO.toLocaleString('es-CL')} · ${unidades.length} bodegas · campaña: ${campana?.nombre || '—'}`)
  console.log(`UF vigente: $${uf} → objetivo ${objetivoUF.toFixed(2)} UF\n`)
  console.log('Precio resultante por bodega:')
  const resumen = {}
  for (const u of unidades) {
    const desc = Math.max(u.precioUF - objetivoUF, 0)
    const finalPesos = Math.round((u.precioUF - desc) * uf)
    const k = `${u.precioUF}UF`
    resumen[k] = resumen[k] || { n: 0, desc: desc.toFixed(2), finalPesos }
    resumen[k].n++
  }
  for (const [k, v] of Object.entries(resumen)) {
    const txt = v.desc === '0.00' ? `sin descuento (ya está bajo el objetivo)` : `−${v.desc} UF → $${v.finalPesos.toLocaleString('es-CL')}`
    console.log(`  ${v.n} bodega(s) de ${k}: ${txt}`)
  }
  await p.$disconnect()
}
main().catch(e => { console.error(e); process.exit(1) })
