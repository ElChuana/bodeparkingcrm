// Sincronización nocturna del sitio web: GA4 (últimos 3 días, upsert) + Clarity (foto del día, ≤ 4 llamadas).
// Solo escribe en rrss_ga4_diario / rrss_clarity_diario / rrss_sync_log.
const prisma = require('../lib/prisma')
const ga4 = require('../lib/ga4')
const clarity = require('../lib/clarity')

const fechaISO = (d) => new Date(d).toISOString().slice(0, 10)
const fechaGa = (s) => new Date(`${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}T00:00:00Z`) // "20261125" → Date

// Reportes de GA4: tipo → dimensiones extra (además de date) y métricas
const REPORTES = [
  { tipo: 'TOTAL', dims: [], mets: ['sessions', 'totalUsers', 'newUsers', 'engagedSessions', 'userEngagementDuration'] },
  { tipo: 'FUENTE', dims: ['sessionSource', 'sessionMedium'], mets: ['sessions', 'totalUsers', 'newUsers', 'engagedSessions', 'userEngagementDuration'] },
  { tipo: 'CAMPANA', dims: ['sessionCampaignName'], mets: ['sessions', 'totalUsers', 'newUsers', 'engagedSessions', 'userEngagementDuration'] },
  { tipo: 'REGION', dims: ['region'], mets: ['sessions', 'totalUsers', 'newUsers', 'engagedSessions', 'userEngagementDuration'] },
  { tipo: 'DISPOSITIVO', dims: ['deviceCategory'], mets: ['sessions', 'totalUsers', 'newUsers', 'engagedSessions', 'userEngagementDuration'] },
  { tipo: 'PAGINA', dims: ['pagePath'], mets: ['screenPageViews', 'sessions'] },
  { tipo: 'EVENTO', dims: ['eventName'], mets: ['eventCount', 'sessions'] },
]

async function sincronizarGa4({ dias = 3 } = {}) {
  const until = fechaISO(Date.now())
  const since = fechaISO(Date.now() - (dias - 1) * 86400000)
  const conteo = {}
  for (const r of REPORTES) {
    const filas = await ga4.reporte({ since, until, dimensiones: ['date', ...r.dims], metricas: r.mets })
    let n = 0
    for (const f of filas) {
      const fecha = fechaGa(f.dims[0])
      const clave = r.dims.length ? f.dims.slice(1).join(' / ') : 'total'
      const m = Object.fromEntries(r.mets.map((k, i) => [k, f.mets[i]]))
      const data = {
        sesiones: Math.round(m.sessions || 0), usuarios: Math.round(m.totalUsers || 0), nuevosUsuarios: Math.round(m.newUsers || 0),
        sesionesComprometidas: Math.round(m.engagedSessions || 0), duracionSeg: m.userEngagementDuration || 0,
        vistas: Math.round(m.screenPageViews || 0), eventos: Math.round(m.eventCount || 0),
      }
      await prisma.rrssGa4Diario.upsert({ where: { fecha_tipo_clave: { fecha, tipo: r.tipo, clave } }, create: { fecha, tipo: r.tipo, clave, ...data }, update: data })
      n++
    }
    conteo[r.tipo] = n
  }
  return { since, until, ...conteo }
}

// Clarity: 4 llamadas (sin desglose, Device, Source, URL) con numOfDays=1 → se guardan con fecha de AYER (día cerrado)
const DIMENSIONES_CLARITY = [null, 'Device', 'Source', 'URL']
const MAX_LLAMADAS_DIA = 8

async function sincronizarClarity() {
  const hoy = new Date(fechaISO(Date.now()) + 'T00:00:00Z')
  const usadas = await prisma.rrssSyncLog.findMany({ where: { fuente: 'CLARITY', inicio: { gte: hoy } }, select: { detalle: true } })
  const llamadasHoy = usadas.reduce((a, l) => a + (l.detalle?.llamadas || 0), 0)
  if (llamadasHoy + DIMENSIONES_CLARITY.length > MAX_LLAMADAS_DIA) return { omitido: `límite diario de Clarity (${llamadasHoy} llamadas usadas)`, llamadas: 0 }

  const fecha = new Date(hoy.getTime() - 86400000)
  let filas = 0, llamadas = 0
  for (const dim of DIMENSIONES_CLARITY) {
    const data = await clarity.exportar({ numOfDays: 1, dimension: dim })
    llamadas++
    for (const f of clarity.aplanar(data, dim)) {
      await prisma.rrssClarityDiario.upsert({
        where: { fecha_dimension_metrica_clave: { fecha, dimension: dim || '', metrica: f.metrica, clave: f.clave.slice(0, 500) } },
        create: { fecha, dimension: dim || '', metrica: f.metrica, clave: f.clave.slice(0, 500), valor: f.valor },
        update: { valor: f.valor },
      })
      filas++
    }
  }
  return { fecha: fechaISO(fecha), llamadas, filas }
}

async function correr(fuente, fn) {
  const log = await prisma.rrssSyncLog.create({ data: { fuente } })
  try {
    const detalle = await fn()
    await prisma.rrssSyncLog.update({ where: { id: log.id }, data: { fin: new Date(), ok: true, detalle } })
    console.log(`[rrss] ${fuente} sincronizado`, JSON.stringify(detalle))
    return detalle
  } catch (err) {
    console.error(`[rrss] Error ${fuente}:`, err.message)
    await prisma.rrssSyncLog.update({ where: { id: log.id }, data: { fin: new Date(), ok: false, error: err.message } })
    return { error: err.message }
  }
}

async function rrssSyncWeb({ dias = 3 } = {}) {
  const out = {}
  if (ga4.ga4Disponible()) out.ga4 = await correr('GA4', () => sincronizarGa4({ dias })); else console.log('[rrss] GA4 no configurado — se omite')
  if (clarity.clarityDisponible()) out.clarity = await correr('CLARITY', sincronizarClarity); else console.log('[rrss] Clarity no configurado — se omite')
  return out
}

module.exports = { rrssSyncWeb, sincronizarGa4, sincronizarClarity }
