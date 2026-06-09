require('dotenv').config()
process.env.DATABASE_URL = process.env.DATABASE_URL_RAILWAY || process.env.DATABASE_URL
const express = require('express')
const prisma = require('../src/lib/prisma')

async function main() {
  // API key activa (o crear una de prueba)
  let key = await prisma.apiKey.findFirst({ where: { activa: true } })
  if (!key) key = await prisma.apiKey.create({ data: { nombre: 'Test Webhook', key: 'bp_test_' + Date.now() } })
  console.log('API key:', key.nombre)

  const app = express()
  app.use(express.json())
  app.use('/api/public', require('../src/routes/public'))
  const server = app.listen(0)
  const port = server.address().port
  const base = `http://localhost:${port}/api/public`

  const fechaCita = new Date(Date.now() + 24 * 3600 * 1000) // mañana
  const payload = {
    nombre: 'Cliente Prueba Webhook',
    correo: `test.webhook.${Date.now()}@ejemplo.cl`,
    telefono: '+56900000001',
    estado: 'agenda',
    inicio: fechaCita.toISOString(),
    tipo: 'Reunión comercial',
    notas: 'Prueba e2e',
  }

  const r = await fetch(`${base}/webhooks/agenda`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Api-Key': key.key },
    body: JSON.stringify(payload),
  })
  const data = await r.json()
  console.log('\nRespuesta:', r.status, JSON.stringify(data, null, 2))

  // Verificar en BD
  if (data.leadId) {
    const lead = await prisma.lead.findUnique({ where: { id: data.leadId }, include: { contacto: true, vendedor: true } })
    const visita = data.visitaId ? await prisma.visita.findUnique({ where: { id: data.visitaId } }) : null
    const notis = await prisma.notificacion.findMany({ where: { referenciaId: data.leadId, referenciaTipo: 'lead', tipo: 'ACTIVIDAD_EN_LEAD' } })
    const inter = await prisma.interaccion.findFirst({ where: { leadId: data.leadId, tipo: 'REUNION' }, orderBy: { id: 'desc' } })
    console.log('\n— VERIFICACIÓN —')
    console.log('  Lead etapa:', lead.etapa, '· vendedor:', lead.vendedor ? lead.vendedor.nombre : 'none')
    console.log('  Visita:', visita ? `#${visita.id} ${visita.fechaHora.toISOString()} (${visita.tipo})` : 'NO CREADA')
    console.log('  Interacción REUNION:', inter ? inter.descripcion : 'NO')
    console.log('  Notificaciones creadas:', notis.length)
    const ok = lead.etapa === 'VISITA_AGENDADA' && visita && notis.length > 0 && inter
    console.log(ok ? '\n✅ TODO OK' : '\n❌ FALTA ALGO')

    // Probar idempotencia (reenviar mismo payload → no duplica visita)
    const r2 = await fetch(`${base}/webhooks/agenda`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Api-Key': key.key }, body: JSON.stringify(payload) })
    const d2 = await r2.json()
    const visitas = await prisma.visita.findMany({ where: { leadId: data.leadId } })
    console.log('Reenvío → visitas del lead:', visitas.length, visitas.length === 1 ? '✅ no duplica' : '❌ duplicó')

    // Cleanup
    await prisma.notificacion.deleteMany({ where: { referenciaId: data.leadId, referenciaTipo: 'lead' } })
    await prisma.visita.deleteMany({ where: { leadId: data.leadId } })
    await prisma.interaccion.deleteMany({ where: { leadId: data.leadId } })
    await prisma.lead.delete({ where: { id: data.leadId } })
    await prisma.contacto.delete({ where: { id: data.contactoId } })
    console.log('(datos de prueba eliminados)')
  }

  server.close()
  await prisma.$disconnect()
}
main().catch(e => { console.error(e); process.exit(1) })
