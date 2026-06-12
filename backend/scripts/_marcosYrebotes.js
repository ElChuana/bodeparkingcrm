require('dotenv').config()
process.env.DATABASE_URL = process.env.DATABASE_URL_RAILWAY || process.env.DATABASE_URL
const p = require('../src/lib/prisma')
const { Resend } = require('resend')
const resend = new Resend(process.env.RESEND_API_KEY)
const sleep = ms => new Promise(r=>setTimeout(r,ms))

const ids = {
 'Ximena':'eece11ef-a591-4dc8-83af-9f3ade615494','Pablo Rojas':'bc80a20a-f193-4562-9564-2acc2f696c25',
 'Gonzalo':'2c28f4a0-4d32-42c8-a8fe-406738bd20d2','Paola':'c4e116c5-5a6b-45ca-90aa-27fb167ae3ee',
 'Rodrigo (gmai-mal)':'1f534149-005d-4a43-a4c4-39ac2d8f6d3c','Marcelo':'99b90a62-e323-4f75-82b9-f54789acd04f',
 'Pabla':'531bf05d-f946-4a4a-9e2b-f6ddf825cdc6','Evelyn':'48bdfcec-8526-4749-887f-b3b0ab47d535',
 'Maribel':'07c737e6-f8fa-4fa6-b983-00b12e29bbf0','Patricio':'704a9e95-8022-4d6e-9802-b1dae4e117f4',
 'Carmen':'e2df0882-518f-492c-b74e-4b6f79342a1c','Juan Romero':'a4012afe-ae36-477b-ade3-ba81191af3f3',
 'Rodrigo (reenvio gmail)':'f1a70e1e-ed48-4f77-bb91-61076b4bfe6e',
}
;(async()=>{
  // 1. Reactivar Marcos Vera (#4293)
  const m=await p.lead.update({ where:{id:4293}, data:{ etapa:'SEGUIMIENTO', motivoPerdida:null, motivoPerdidaCat:null, motivoPerdidaNota:null, etapaAntesDePerdido:null, perdidaAutomatica:false, perdidaAutomaticaEn:null } })
  console.log('✅ Marcos Vera reactivado → etapa', m.etapa, '\n')

  // 2. Estado de los correos de CONFIRMACIÓN (tengo los IDs)
  console.log('— Estado correos de confirmación (Resend) —')
  for(const [nombre,id] of Object.entries(ids)){
    try{ const r=await resend.emails.get(id); console.log('  '+(r.data?.last_event||r.last_event||'?').padEnd(12)+' | '+nombre+' → '+(r.data?.to||r.to)) }
    catch(e){ console.log('  ERROR | '+nombre+' · '+e.message) }
    await sleep(350)
  }
  await p.$disconnect()
})()
