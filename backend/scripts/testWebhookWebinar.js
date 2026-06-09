// Test e2e del webhook único del webinar (/api/public/webhooks/webinar).
// Prueba estado "formulario-rellenado" (lead nuevo) y "agenda" (lead + reunión
// como Interaccion REUNION → calendario). Verifica e idempotencia, luego limpia.
require('dotenv').config()
process.env.DATABASE_URL = process.env.DATABASE_URL_RAILWAY || process.env.DATABASE_URL
const express = require('express')
const prisma = require('../src/lib/prisma')

async function main() {
  const key = await prisma.apiKey.findFirst({ where: { activa: true } })
  const app = express(); app.use(express.json()); app.use('/api/public', require('../src/routes/public'))
  const server = app.listen(0)
  const base = `http://localhost:${server.address().port}/api/public`
  const post = (body) => fetch(`${base}/webhooks/webinar`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Api-Key': key.key }, body: JSON.stringify(body),
  }).then(r => r.json())

  const correo = `webinar.${Date.now()}@ejemplo.cl`
  const ids = {}

  // 1. Formulario rellenado → lead nuevo NUEVO
  const f = await post({ nombre: 'Cliente Webinar Test', correo, telefono: '+56900000123', estado: 'formulario-rellenado' })
  console.log('Formulario:', JSON.stringify(f))
  ids.leadId = f.leadId; ids.contactoId = f.contactoId
  const leadF = await prisma.lead.findUnique({ where: { id: f.leadId } })
  console.log('  etapa:', leadF.etapa, '· campaña:', leadF.campana, leadF.etapa === 'NUEVO' ? '✅' : '❌')

  // 2. Agenda (mismo contacto) → reusa lead + reunión en calendario
  const fechaCita = new Date(Date.now() + 24 * 3600 * 1000)
  const a = await post({ nombre: 'Cliente Webinar Test', correo, telefono: '+56900000123', estado: 'agenda', inicio: fechaCita.toISOString() })
  console.log('\nAgenda:', JSON.stringify(a))
  const leadA = await prisma.lead.findUnique({ where: { id: a.leadId } })
  const reunion = await prisma.interaccion.findUnique({ where: { id: a.reunionId } })
  const notis = await prisma.notificacion.findMany({ where: { referenciaId: a.leadId, referenciaTipo: 'lead', tipo: 'ACTIVIDAD_EN_LEAD' } })
  console.log('  mismo lead:', a.leadId === f.leadId ? '✅' : '❌')
  console.log('  etapa:', leadA.etapa, leadA.etapa === 'VISITA_AGENDADA' ? '✅' : '❌')
  console.log('  reunión (Interaccion REUNION con fecha):', reunion?.tipo, reunion?.fecha?.toISOString(), reunion?.tipo === 'REUNION' && reunion?.fecha ? '✅' : '❌')
  console.log('  notificaciones:', notis.length, notis.length > 0 ? '✅' : '❌')

  // 3. Idempotencia: reenviar agenda misma fecha → no duplica reunión
  await post({ nombre: 'Cliente Webinar Test', correo, telefono: '+56900000123', estado: 'agenda', inicio: fechaCita.toISOString() })
  const reuniones = await prisma.interaccion.findMany({ where: { leadId: a.leadId, tipo: 'REUNION' } })
  console.log('  reenvío → reuniones:', reuniones.length, reuniones.length === 1 ? '✅ no duplica' : '❌ duplicó')

  // Cleanup
  await prisma.notificacion.deleteMany({ where: { referenciaId: ids.leadId, referenciaTipo: 'lead' } })
  await prisma.interaccion.deleteMany({ where: { leadId: ids.leadId } })
  await prisma.lead.delete({ where: { id: ids.leadId } })
  await prisma.contacto.delete({ where: { id: ids.contactoId } })
  console.log('\n(datos de prueba eliminados)')

  server.close(); await prisma.$disconnect()
}
main().catch(e => { console.error(e); process.exit(1) })
