// Test e2e del webhook único del webinar (/api/public/webhooks/webinar).
// Cubre los 3 eventos (formulario / agenda / cancela), la idempotencia, el
// reagendamiento, la reactivación de leads fríos y el no-retroceso de etapa.
// Crea datos de prueba y los limpia al final.
require('dotenv').config()
process.env.DATABASE_URL = process.env.DATABASE_URL_RAILWAY || process.env.DATABASE_URL
const express = require('express')
const prisma = require('../src/lib/prisma')

const TZ = 'America/Santiago'
const enChile = (d) => d.toLocaleString('es-CL', { timeZone: TZ })

let ok = 0, fallos = 0
function check(etiqueta, condicion, detalle = '') {
  if (condicion) { ok++; console.log(`  ✅ ${etiqueta}`, detalle) }
  else { fallos++; console.log(`  ❌ ${etiqueta}`, detalle) }
}

async function main() {
  const key = await prisma.apiKey.findFirst({ where: { activa: true } })
  if (!key) throw new Error('No hay API Key activa en la BD')

  const app = express(); app.use(express.json()); app.use('/api/public', require('../src/routes/public'))
  const server = app.listen(0)
  const base = `http://localhost:${server.address().port}/api/public`
  const post = (body) => fetch(`${base}/webhooks/webinar`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Api-Key': key.key }, body: JSON.stringify(body),
  }).then(async r => ({ status: r.status, ...(await r.json()) }))

  const creados = { leads: [], contactos: [] }
  const marca = Date.now()

  // ── 1. Formulario → lead NUEVO ────────────────────────────────
  console.log('\n1. Formulario rellenado')
  const correo = `webinar.${marca}@ejemplo.cl`
  const f = await post({ nombre: 'Cliente Webinar Test', correo, telefono: '+56900000123', estado: 'formulario-rellenado' })
  creados.leads.push(f.leadId); creados.contactos.push(f.contactoId)
  const leadF = await prisma.lead.findUnique({ where: { id: f.leadId } })
  check('status 201', f.status === 201, f.status)
  check('etapa NUEVO', leadF.etapa === 'NUEVO', leadF.etapa)

  // ── 2. Agenda con el payload REAL del proveedor ───────────────
  // Formato de fecha tal cual llega en producción (no es ISO).
  console.log('\n2. Agenda (payload real: "Monday, August 24, 2026 8:30 AM")')
  const a = await post({
    nombre: 'Cliente Webinar Test', correo, telefono: '9 0000 0123', estado: 'agenda',
    inicio: 'Monday, August 24, 2026 8:30 AM', enlace: 'https://meet.google.com/wgh-vnqz-ckd',
  })
  const visita = a.visitaId ? await prisma.visita.findUnique({ where: { id: a.visitaId } }) : null
  const leadA = await prisma.lead.findUnique({ where: { id: a.leadId } })
  check('status 201 (antes daba 500)', a.status === 201, JSON.stringify(a).slice(0, 120))
  check('mismo lead (dedup por correo)', a.leadId === f.leadId)
  check('dedup con teléfono en otro formato', a.contactoId === f.contactoId)
  check('VISITA en el calendario', !!visita, visita ? `#${visita.id} tipo=${visita.tipo}` : 'NO')
  check('tipo válido del enum', visita?.tipo === 'reunion_comercial', visita?.tipo)
  check('hora correcta en Chile (8:30)', visita && enChile(visita.fechaHora).includes('8:30'), visita && enChile(visita.fechaHora))
  check('enlace guardado', visita?.enlace === 'https://meet.google.com/wgh-vnqz-ckd')
  check('etapa VISITA_AGENDADA', leadA.etapa === 'VISITA_AGENDADA', leadA.etapa)

  // ── 3. Reenvío del mismo evento → no duplica ──────────────────
  console.log('\n3. Reenvío del mismo evento (idempotencia)')
  const r = await post({ nombre: 'Cliente Webinar Test', correo, estado: 'agenda', inicio: 'Monday, August 24, 2026 8:30 AM' })
  let visitas = await prisma.visita.findMany({ where: { leadId: a.leadId } })
  check('no duplica la visita', visitas.length === 1, `${visitas.length} visita(s)`)
  check('status 200 (no crea nada)', r.status === 200, r.status)

  // ── 4. Reagendamiento → mueve la cita, no crea otra ───────────
  console.log('\n4. Reagendamiento a otra hora')
  const re = await post({ nombre: 'Cliente Webinar Test', correo, estado: 'agenda', inicio: 'Monday, August 24, 2026 3:00 PM' })
  visitas = await prisma.visita.findMany({ where: { leadId: a.leadId } })
  check('sigue habiendo UNA sola visita', visitas.length === 1, `${visitas.length} visita(s)`)
  check('marcada como reagendada', re.reagendada === true)
  // 15:00 en Chile; es-CL lo formatea como "3:00:00 p. m."
  const horaChile = visitas[0] && visitas[0].fechaHora.toLocaleTimeString('es-CL', { timeZone: TZ, hour12: false })
  check('hora actualizada a 15:00', horaChile?.startsWith('15:00'), horaChile)

  // ── 5. Lead avanzado no retrocede de etapa ────────────────────
  console.log('\n5. Lead en NEGOCIACION que agenda otra reunión')
  await prisma.lead.update({ where: { id: a.leadId }, data: { etapa: 'NEGOCIACION' } })
  await post({ nombre: 'Cliente Webinar Test', correo, estado: 'agenda', inicio: '25/08/2026 11:00' })
  const leadAv = await prisma.lead.findUnique({ where: { id: a.leadId } })
  check('mantiene NEGOCIACION (no retrocede)', leadAv.etapa === 'NEGOCIACION', leadAv.etapa)

  // ── 6. Cancelación → saca la cita del calendario ──────────────
  console.log('\n6. Cancelación')
  await prisma.lead.update({ where: { id: a.leadId }, data: { etapa: 'VISITA_AGENDADA' } })
  const c = await post({ nombre: 'Cliente Webinar Test', correo, estado: 'cancela' })
  visitas = await prisma.visita.findMany({ where: { leadId: a.leadId } })
  const leadC = await prisma.lead.findUnique({ where: { id: a.leadId } })
  check('cita borrada del calendario', visitas.length === 0, `${visitas.length} visita(s)`)
  check('reporta cuántas canceló', c.visitasCanceladas >= 1, c.visitasCanceladas)
  check('etapa vuelve a SEGUIMIENTO', leadC.etapa === 'SEGUIMIENTO', leadC.etapa)

  // ── 7. Lead PERDIDO que vuelve por el formulario → REACTIVADO ─
  console.log('\n7. Lead PERDIDO que vuelve a dejar sus datos')
  await prisma.lead.update({ where: { id: a.leadId }, data: { etapa: 'PERDIDO' } })
  const reac = await post({ nombre: 'Cliente Webinar Test', correo, estado: 'formulario-rellenado' })
  const leadR = await prisma.lead.findUnique({ where: { id: a.leadId } })
  check('etapa REACTIVADO (antes seguía PERDIDO)', leadR.etapa === 'REACTIVADO', leadR.etapa)
  check('lo reporta en la respuesta', reac.reactivado === true)

  // ── 8. vendedorId inexistente → 400, no 500 ───────────────────
  console.log('\n8. vendedorId inexistente')
  const v = await post({ nombre: 'Cliente Webinar Test', correo, estado: 'formulario-rellenado', vendedorId: 999999 })
  check('400 con mensaje claro (antes 500)', v.status === 400, `${v.status} ${v.error || ''}`)

  // ── Cleanup ───────────────────────────────────────────────────
  for (const leadId of [...new Set(creados.leads)]) {
    await prisma.notificacion.deleteMany({ where: { referenciaId: leadId, referenciaTipo: 'lead' } })
    await prisma.visita.deleteMany({ where: { leadId } })
    await prisma.interaccion.deleteMany({ where: { leadId } })
    await prisma.lead.delete({ where: { id: leadId } })
  }
  for (const contactoId of [...new Set(creados.contactos)]) {
    await prisma.contacto.delete({ where: { id: contactoId } })
  }
  console.log('\n(datos de prueba eliminados)')
  console.log(`\nResultado: ${ok} ok · ${fallos} fallos`)

  server.close(); await prisma.$disconnect()
  process.exit(fallos > 0 ? 1 : 0)
}
main().catch(e => { console.error(e); process.exit(1) })
