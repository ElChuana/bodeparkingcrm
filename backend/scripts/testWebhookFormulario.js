require('dotenv').config()
process.env.DATABASE_URL = process.env.DATABASE_URL_RAILWAY || process.env.DATABASE_URL
const express = require('express')
const prisma = require('../src/lib/prisma')
async function main() {
  const key = await prisma.apiKey.findFirst({ where: { activa: true } })
  const app = express(); app.use(express.json()); app.use('/api/public', require('../src/routes/public'))
  const server = app.listen(0); const base = `http://localhost:${server.address().port}/api/public`
  const payload = { nombre: 'Test Formulario Bot', correo: `form.${Date.now()}@ej.cl`, telefono: '+56900000009', estado: 'formulario-rellenado' }
  const r = await fetch(`${base}/webhooks/formulario`, { method:'POST', headers:{'Content-Type':'application/json','X-Api-Key':key.key}, body: JSON.stringify(payload) })
  const d = await r.json(); console.log('Respuesta:', r.status, JSON.stringify(d))
  if (d.leadId) {
    const lead = await prisma.lead.findUnique({ where: { id: d.leadId } })
    const notis = await prisma.notificacion.findMany({ where: { referenciaId: d.leadId, referenciaTipo:'lead', tipo:'LEAD_NUEVO' } })
    console.log('Etapa:', lead.etapa, '· notis:', notis.length, lead.etapa==='NUEVO'&&notis.length>0?'✅':'❌')
    await prisma.notificacion.deleteMany({ where:{referenciaId:d.leadId,referenciaTipo:'lead'} })
    await prisma.interaccion.deleteMany({ where:{leadId:d.leadId} })
    await prisma.lead.delete({ where:{id:d.leadId} }); await prisma.contacto.delete({ where:{id:d.contactoId} })
    console.log('(limpio)')
  }
  server.close(); await prisma.$disconnect()
}
main().catch(e=>{console.error(e);process.exit(1)})
