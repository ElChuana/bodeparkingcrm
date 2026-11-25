// Sincronización nocturna del módulo RRSS con Meta Ads.
// Re-sincroniza los últimos N días (Meta ajusta atribución hasta ~28 días) con upsert, baja los leads de cada
// anuncio y los cruza con los leads del CRM. TODO queda en tablas rrss_*: el job NO escribe en leads ni contactos.
const prisma = require('../lib/prisma')
const meta = require('../lib/meta')
const { normalizarFieldData, cruzarLeadsMeta } = require('../lib/rrss')

const fechaISO = (d) => new Date(d).toISOString().slice(0, 10)
const num = (v) => (v == null || v === '' ? 0 : Number(v))
const dec = (v) => Math.round(num(v) * 100) / 100

// ── 1. Campañas de Meta → rrss_campanas_mapa (autovínculo por nombre exacto con el catálogo del CRM) ──
async function sincronizarCampanas() {
  const lista = await meta.campanas()
  const catalogo = await prisma.campana.findMany({ select: { id: true, nombre: true } })
  const porNombre = Object.fromEntries(catalogo.map(c => [c.nombre.trim().toLowerCase(), c.id]))
  let vinculadas = 0
  for (const c of lista) {
    const existente = await prisma.rrssCampanaMapa.findUnique({ where: { campanaMetaId: c.id } })
    const autoId = porNombre[c.name.trim().toLowerCase()] || null
    const data = {
      nombreMeta: c.name,
      estadoMeta: c.effective_status || c.status,
      objetivo: c.objective || null,
      inicioMeta: c.start_time ? new Date(c.start_time) : null,
      finMeta: c.stop_time ? new Date(c.stop_time) : null,
    }
    if (!existente) {
      await prisma.rrssCampanaMapa.create({ data: { campanaMetaId: c.id, ...data, campanaId: autoId } })
      if (autoId) vinculadas++
    } else {
      await prisma.rrssCampanaMapa.update({
        where: { id: existente.id },
        data: { ...data, ...(!existente.vinculoManual && !existente.campanaId && autoId ? { campanaId: autoId } : {}) },
      })
      if (existente.campanaId || autoId) vinculadas++
    }
  }
  return { campanas: lista.length, vinculadas }
}

// Campañas de Meta sin vínculo (nombre distinto al del CRM, ej. "SEP" vs "SEPTIEMBRE"): se vinculan a la campaña
// del CRM a la que pertenece la MAYORÍA de sus leads cruzados (≥ 60% y al menos 5 leads). No toca vínculos manuales.
async function vincularCampanasPorLeads() {
  const sinVinculo = await prisma.rrssCampanaMapa.findMany({ where: { campanaId: null, vinculoManual: false } })
  let vinculadas = 0
  for (const m of sinVinculo) {
    const filas = await prisma.$queryRaw`
      SELECT l."campanaId", COUNT(*)::int AS n
      FROM rrss_meta_leads ml JOIN leads l ON l.id = ml."leadId"
      WHERE ml."campaignId" = ${m.campanaMetaId} AND l."campanaId" IS NOT NULL
      GROUP BY l."campanaId" ORDER BY n DESC`
    const total = filas.reduce((a, f) => a + f.n, 0)
    if (!filas.length || total < 5 || filas[0].n / total < 0.6) continue
    await prisma.rrssCampanaMapa.update({ where: { id: m.id }, data: { campanaId: filas[0].campanaId } })
    vinculadas++
  }
  return vinculadas
}

// ── 2. Insights diarios por nivel ──
const NIVEL = { campaign: 'CAMPANA', adset: 'CONJUNTO', ad: 'ANUNCIO' }
const idDeNivel = { campaign: r => r.campaign_id, adset: r => r.adset_id, ad: r => r.ad_id }
const nombreDeNivel = { campaign: r => r.campaign_name, adset: r => r.adset_name, ad: r => r.ad_name }

async function sincronizarInsights(since, until) {
  const conteo = {}
  for (const level of ['campaign', 'adset', 'ad']) {
    const filas = await meta.insights({ level, since, until, conRanking: level === 'ad' })
    let n = 0
    for (const r of filas) {
      const impresiones = num(r.impressions)
      const clicsEnlace = num(r.inline_link_clicks)
      const data = {
        nombre: nombreDeNivel[level](r) || '',
        campanaMetaId: r.campaign_id,
        conjuntoMetaId: r.adset_id || null,
        gasto: dec(r.spend),
        impresiones,
        alcance: num(r.reach),
        frecuencia: num(r.frequency),
        clics: num(r.clicks),
        clicsEnlace,
        leads: meta.leadsDeAcciones(r.actions),
        cpm: r.cpm != null ? Number(r.cpm) : null,
        ctr: r.ctr != null ? Number(r.ctr) : null,
        ctrEnlace: impresiones ? Math.round((clicsEnlace / impresiones) * 10000) / 100 : null,
        cpc: r.cpc != null ? Number(r.cpc) : null,
        rankingCalidad: r.quality_ranking || null,
        rankingInteraccion: r.engagement_rate_ranking || null,
        rankingConversion: r.conversion_rate_ranking || null,
        crudo: r,
      }
      await prisma.rrssMetaDiario.upsert({
        where: { fecha_nivel_metaId: { fecha: new Date(r.date_start), nivel: NIVEL[level], metaId: idDeNivel[level](r) } },
        create: { fecha: new Date(r.date_start), nivel: NIVEL[level], metaId: idDeNivel[level](r), ...data },
        update: data,
      })
      n++
    }
    conteo[NIVEL[level]] = n
  }
  return conteo
}

// ── 3. Desgloses a nivel campaña ──
const DESGLOSES = [
  { tipo: 'REGION', breakdowns: 'region', clave: r => r.region || 'Desconocida' },
  { tipo: 'EDAD_GENERO', breakdowns: 'age,gender', clave: r => `${r.age || '?'}|${r.gender || '?'}` },
  { tipo: 'UBICACION', breakdowns: 'publisher_platform,platform_position', clave: r => `${r.publisher_platform || '?'}|${r.platform_position || '?'}` },
]

async function sincronizarDesgloses(since, until) {
  const conteo = {}
  for (const d of DESGLOSES) {
    const filas = await meta.insights({ level: 'campaign', since, until, breakdowns: d.breakdowns })
    let n = 0
    for (const r of filas) {
      const clave = d.clave(r)
      const data = {
        gasto: dec(r.spend), impresiones: num(r.impressions), alcance: num(r.reach),
        clics: num(r.clicks), leads: meta.leadsDeAcciones(r.actions),
      }
      await prisma.rrssMetaDesglose.upsert({
        where: { fecha_campanaMetaId_tipo_clave: { fecha: new Date(r.date_start), campanaMetaId: r.campaign_id, tipo: d.tipo, clave } },
        create: { fecha: new Date(r.date_start), campanaMetaId: r.campaign_id, tipo: d.tipo, clave, ...data },
        update: data,
      })
      n++
    }
    conteo[d.tipo] = n
  }
  return conteo
}

// ── 4. Leads por anuncio → rrss_meta_leads ──
// Solo anuncios con leads en la ventana (según insights ya guardados) para no pedir 1 request por anuncio muerto.
async function sincronizarLeads(since) {
  const anuncios = await prisma.rrssMetaDiario.groupBy({
    by: ['metaId'], where: { nivel: 'ANUNCIO', fecha: { gte: new Date(since) }, leads: { gt: 0 } },
  })
  const antes = await prisma.rrssMetaLead.count()
  let vistos = 0
  for (const a of anuncios) {
    // pedir desde 2 días antes del último lead guardado de ese anuncio (margen), o toda la ventana
    const ultimo = await prisma.rrssMetaLead.findFirst({ where: { adId: a.metaId }, orderBy: { creadoMeta: 'desc' }, select: { creadoMeta: true } })
    const desde = ultimo ? new Date(ultimo.creadoMeta.getTime() - 2 * 86400000) : new Date(since)
    const leads = await meta.leadsDeAnuncio(a.metaId, desde)
    for (const l of leads) {
      vistos++
      const campos = normalizarFieldData(l.field_data)
      const data = {
        creadoMeta: new Date(l.created_time),
        adId: l.ad_id || a.metaId, adsetId: l.adset_id || null, campaignId: l.campaign_id || null,
        formId: l.form_id || null, plataforma: l.platform || null, esOrganico: !!l.is_organic,
        nombre: [campos.nombre, campos.apellido].filter(Boolean).join(' ') || null,
        email: campos.email || null, telefono: campos.telefono || null,
        campos: l.field_data || null,
      }
      await prisma.rrssMetaLead.upsert({ where: { metaLeadId: l.id }, create: { metaLeadId: l.id, ...data }, update: data })
    }
  }
  const despues = await prisma.rrssMetaLead.count()
  return { anunciosConsultados: anuncios.length, leadsVistos: vistos, leadsNuevos: despues - antes }
}

// ── Orquestador ──
// `desde` (YYYY-MM-DD) manda sobre `dias` — para cargar histórico (insights no tienen límite; los leads solo 90 días).
async function rrssSyncMeta({ dias = 28, hasta = null, desde = null } = {}) {
  if (!meta.metaDisponible()) {
    console.log('[rrss] META_ACCESS_TOKEN no configurado — se omite la sincronización')
    return null
  }
  const log = await prisma.rrssSyncLog.create({ data: { fuente: 'META' } })
  const until = fechaISO(hasta || Date.now())
  const since = desde || fechaISO(new Date(until).getTime() - (dias - 1) * 86400000)
  // Meta solo entrega leads de los últimos ~90 días: no pedir más atrás (devuelve error/vacío)
  const sinceLeads = fechaISO(Math.max(new Date(since).getTime(), Date.now() - 89 * 86400000))
  const detalle = { since, until, sinceLeads }
  try {
    detalle.campanas = await sincronizarCampanas()
    detalle.insights = await sincronizarInsights(since, until)
    detalle.desgloses = await sincronizarDesgloses(since, until)
    detalle.leads = await sincronizarLeads(sinceLeads)
    detalle.cruce = await cruzarLeadsMeta()
    detalle.campanas.vinculadasPorLeads = await vincularCampanasPorLeads()
    if (detalle.campanas.vinculadasPorLeads) detalle.cruce = await cruzarLeadsMeta() // re-cruzar con el vínculo nuevo (elige mejor el lead por campaña)
    await prisma.rrssSyncLog.update({ where: { id: log.id }, data: { fin: new Date(), ok: true, detalle } })
    console.log('[rrss] Meta sincronizado', JSON.stringify(detalle))
    return detalle
  } catch (err) {
    console.error('[rrss] Error sincronizando Meta:', err.message)
    await prisma.rrssSyncLog.update({ where: { id: log.id }, data: { fin: new Date(), ok: false, detalle, error: err.message } })
    throw err
  }
}

module.exports = { rrssSyncMeta, sincronizarCampanas, sincronizarInsights, sincronizarDesgloses, sincronizarLeads }
