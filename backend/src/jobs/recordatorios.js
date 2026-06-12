const prisma = require('../lib/prisma')

// Recordatorios vencidos → notificación al vendedor
async function procesarRecordatoriosVencidos() {
  const pendientes = await prisma.recordatorio.findMany({
    where: { fechaHora: { lte: new Date() }, completado: false, notificado: false },
    include: {
      lead: {
        select: {
          id: true,
          vendedorId: true,
          contacto: { select: { nombre: true, apellido: true } }
        }
      }
    }
  })
  for (const r of pendientes) {
    if (r.lead.vendedorId) {
      await prisma.notificacion.create({
        data: {
          usuarioId:      r.lead.vendedorId,
          tipo:           'RECORDATORIO_LEAD',
          mensaje:        `Recordatorio: ${r.descripcion} — ${r.lead.contacto.nombre} ${r.lead.contacto.apellido}`,
          referenciaId:   r.leadId,
          referenciaTipo: 'lead'
        }
      })
    }
    await prisma.recordatorio.update({ where: { id: r.id }, data: { notificado: true } })
  }
  if (pendientes.length > 0) {
    console.log(`[Recordatorios] ${pendientes.length} procesados`)
  }
}

// Visitas en las próximas 24h → notificación al vendedor (sin duplicar)
async function notificarVisitasProximas() {
  const ventanaMin = new Date(Date.now() + 23 * 60 * 60 * 1000)
  const ventanaMax = new Date(Date.now() + 25 * 60 * 60 * 1000)

  const visitasProximas = await prisma.visita.findMany({
    where: { fechaHora: { gte: ventanaMin, lte: ventanaMax }, resultado: null },
    include: {
      lead: {
        select: {
          id: true,
          vendedorId: true,
          contacto: { select: { nombre: true, apellido: true } }
        }
      }
    }
  })
  if (visitasProximas.length === 0) return

  // Una sola consulta para saber qué visitas ya fueron notificadas (antes era 1 query por visita)
  const yaNotificadas = await prisma.notificacion.findMany({
    where: {
      tipo: 'VISITA_PROXIMA',
      referenciaTipo: 'visita',
      referenciaId: { in: visitasProximas.map(v => v.id) },
      creadoEn: { gte: new Date(Date.now() - 2 * 60 * 60 * 1000) }
    },
    select: { referenciaId: true, usuarioId: true }
  })
  const notificadasSet = new Set(yaNotificadas.map(n => `${n.referenciaId}:${n.usuarioId}`))

  for (const visita of visitasProximas) {
    if (!visita.lead.vendedorId) continue
    if (notificadasSet.has(`${visita.id}:${visita.lead.vendedorId}`)) continue
    await prisma.notificacion.create({
      data: {
        usuarioId: visita.lead.vendedorId,
        tipo: 'VISITA_PROXIMA',
        mensaje: `Visita mañana con ${visita.lead.contacto.nombre} ${visita.lead.contacto.apellido}`,
        referenciaId: visita.id,
        referenciaTipo: 'visita'
      }
    })
  }
  console.log(`[Visitas] ${visitasProximas.length} visitas próximas procesadas`)
}

async function recordatorios() {
  try {
    await procesarRecordatoriosVencidos()
    await notificarVisitasProximas()
  } catch (err) {
    console.error('[Recordatorios] Error en cron:', err.message)
  }
}

module.exports = { recordatorios }
