// Test e2e del webhook único del webinar (/api/public/webhooks/webinar).
// formulario-rellenado → lead NUEVO · agenda → lead + VISITA en el calendario.
// Verifica, prueba idempotencia y limpia.
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

  // 1. Formulario → lead NUEVO
  const f = await post({ nombre: 'Cliente Webinar Test', correo, telefono: '+56900000123', estado: 'formulario-rellenado' })
  const leadF = await prisma.lead.findUnique({ where: { id: f.leadId } })
  console.log('Formulario:', JSON.stringify(f), '· etapa', leadF.etapa, leadF.etapa === 'NUEVO' ? '✅' : '❌')

  // 2. Agenda → reusa lead + VISITA en el calendario
  const fechaCita = new Date(Date.now() + 24 * 3600 * 1000)
  const a = await post({ nombre: 'Cliente Webinar Test', correo, telefono: '+56900000123', estado: 'agenda', inicio: fechaCita.toISOString() })
  const leadA = await prisma.lead.findUnique({ where: { id: a.leadId } })
  const visita = a.visitaId ? await prisma.visita.findUnique({ where: { id: a.visitaId } }) : null
  const notis = await prisma.notificacion.findMany({ where: { referenciaId: a.leadId, referenciaTipo: 'lead', tipo: 'ACTIVIDAD_EN_LEAD' } })
  console.log('\nAgenda:', JSON.stringify(a))
  console.log('  mismo lead:', a.leadId === f.leadId ? '✅' : '❌')
  console.log('  etapa:', leadA.etapa, leadA.etapa === 'VISITA_AGENDADA' ? '✅' : '❌')
  console.log('  VISITA en calendario:', visita ? `#${visita.id} ${visita.fechaHora.toISOString()} (${visita.tipo})` : 'NO', visita ? '✅' : '❌')
  console.log('  notificaciones:', notis.length, notis.length > 0 ? '✅' : '❌')

  // 3. Idempotencia: reenviar agenda misma fecha → no duplica visita
  await post({ nombre: 'Cliente Webinar Test', correo, telefono: '+56900000123', estado: 'agenda', inicio: fechaCita.toISOString() })
  const visitas = await prisma.visita.findMany({ where: { leadId: a.leadId } })
  console.log('  reenvío → visitas:', visitas.length, visitas.length === 1 ? '✅ no duplica' : '❌ duplicó')

  // Cleanup
  await prisma.notificacion.deleteMany({ where: { referenciaId: f.leadId, referenciaTipo: 'lead' } })
  await prisma.visita.deleteMany({ where: { leadId: f.leadId } })
  await prisma.interaccion.deleteMany({ where: { leadId: f.leadId } })
  await prisma.lead.delete({ where: { id: f.leadId } })
  await prisma.contacto.delete({ where: { id: f.contactoId } })
  console.log('\n(datos de prueba eliminados)')
  server.close(); await prisma.$disconnect()
}
main().catch(e => { console.error(e); process.exit(1) })
