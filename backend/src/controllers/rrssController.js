// Módulo RRSS — informe de marketing (Meta Ads ↔ embudo del CRM).
// Solo lee: tablas rrss_* + leads/cotizaciones/visitas/ventas del CRM. Escribe únicamente en rrss_umbrales,
// rrss_campanas_mapa (vínculo campaña) y rrss_sync_log (vía el job).
const prisma = require('../lib/prisma')
const { Prisma } = require('@prisma/client')
const { rrssSyncMeta } = require('../jobs/rrssSync')
const meta = require('../lib/meta')
const { esLeadBasura, GRACIA_MS } = require('../lib/rrss')
const { normalizarRegion, REGIONES } = require('../lib/regiones')

// Fechas del período en UTC puro (rrss_meta_diario.fecha es DATE; Prisma lo entrega como medianoche UTC)
const dia = (s, def) => {
  const d = /^\d{4}-\d{2}-\d{2}$/.test(s || '') ? new Date(`${s}T00:00:00Z`) : def
  return isNaN(d) ? def : d
}
const hoyUTC = () => new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00Z')
const iso = (d) => new Date(d).toISOString().slice(0, 10)
const n = (v) => (v == null ? 0 : Number(v))
const pct = (a, b) => (b ? Math.round((a / b) * 1000) / 10 : null)
const mediana = (arr) => {
  const v = arr.filter(x => x != null && isFinite(x)).sort((a, b) => a - b)
  if (!v.length) return null
  const m = Math.floor(v.length / 2)
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2
}

// ── Semáforo ──────────────────────────────────────────────────────
// Umbrales en "x mediana" se evalúan como valor / mediana(cuenta 90 días). Devuelve verde | amarillo | rojo | null.
function semaforo(umbral, valor, med = null) {
  if (!umbral || valor == null || umbral.verdeHasta == null || umbral.amarilloHasta == null) return null
  let v = valor
  if (umbral.unidad === 'x mediana') {
    if (!med) return null
    v = valor / med
  }
  if (umbral.menorEsMejor) {
    if (v <= umbral.verdeHasta) return 'verde'
    if (v <= umbral.amarilloHasta) return 'amarillo'
    return 'rojo'
  }
  if (v >= umbral.verdeHasta) return 'verde'
  if (v >= umbral.amarilloHasta) return 'amarillo'
  return 'rojo'
}

// ── Embudo del CRM por campaña del catálogo ──────────────────────
// Devuelve { [campanaId]: { leadsCRM, contactados, cotizados, visitasAgendadas, visitasRealizadas, ventas, ufVendidas,
//            sinGestion48h, horasPrimerContacto: [..] } } para los leads creados en [desde, hasta].
async function embudoCRM(campanaIds, desde, hasta) {
  if (!campanaIds.length) return {}
  const ids = Prisma.join(campanaIds)
  const filas = await prisma.$queryRaw`
    WITH base AS (
      SELECT l.id, l."campanaId", l."creadoEn"
      FROM leads l
      WHERE l."campanaId" IN (${ids}) AND l."creadoEn" >= ${desde} AND l."creadoEn" < ${hasta}
    ),
    primer_contacto AS (
      SELECT b.id AS lead_id, MIN(t.fecha) AS fecha
      FROM base b
      JOIN (
        -- gestión humana del vendedor: llamadas, WhatsApp, reuniones y correos ENVIADOS (los recibidos los manda el cliente)
        SELECT "leadId", fecha FROM actividades WHERE tipo <> 'EMAIL' OR descripcion LIKE 'Email enviado%'
        UNION ALL
        -- notas escritas por una persona (las del sistema no tienen usuario: "Lead ingresado vía API", "Plataforma: ig", etapas)
        SELECT "leadId", fecha FROM interacciones
          WHERE "usuarioId" IS NOT NULL AND descripcion NOT LIKE 'Etapa cambiada%' AND descripcion NOT LIKE 'Automatización%' AND descripcion NOT LIKE 'Campaña:%'
      ) t ON t."leadId" = b.id
      GROUP BY b.id
    ),
    cot AS (SELECT DISTINCT c."leadId" FROM cotizaciones c JOIN base b ON b.id = c."leadId"),
    vis_ag AS (SELECT DISTINCT v."leadId" FROM visitas v JOIN base b ON b.id = v."leadId" WHERE v.tipo = 'presencial'),
    vis_ok AS (SELECT DISTINCT v."leadId" FROM visitas v JOIN base b ON b.id = v."leadId" WHERE v.tipo = 'presencial' AND v.resultado = 'ASISTIO'),
    ven AS (
      SELECT v."leadId", COUNT(*)::int AS ventas, COALESCE(SUM(v."precioFinalUF"), 0) AS uf
      FROM ventas v JOIN base b ON b.id = v."leadId" WHERE v.estado <> 'ANULADO' GROUP BY v."leadId"
    )
    SELECT b."campanaId",
      COUNT(*)::int AS leads,
      COUNT(pc.lead_id)::int AS contactados,
      COUNT(cot."leadId")::int AS cotizados,
      COUNT(vis_ag."leadId")::int AS visitas_agendadas,
      COUNT(vis_ok."leadId")::int AS visitas_realizadas,
      COALESCE(SUM(ven.ventas), 0)::int AS ventas,
      COALESCE(SUM(ven.uf), 0) AS uf_vendidas,
      COUNT(*) FILTER (WHERE pc.lead_id IS NULL AND b."creadoEn" < NOW() - INTERVAL '48 hours')::int AS sin_gestion_48h,
      COUNT(*) FILTER (WHERE b."creadoEn" < NOW() - INTERVAL '48 hours')::int AS con_48h,
      ARRAY_REMOVE(ARRAY_AGG(EXTRACT(EPOCH FROM (pc.fecha - b."creadoEn")) / 3600.0), NULL) AS horas_contacto
    FROM base b
    LEFT JOIN primer_contacto pc ON pc.lead_id = b.id
    LEFT JOIN cot ON cot."leadId" = b.id
    LEFT JOIN vis_ag ON vis_ag."leadId" = b.id
    LEFT JOIN vis_ok ON vis_ok."leadId" = b.id
    LEFT JOIN ven ON ven."leadId" = b.id
    GROUP BY b."campanaId"`
  const out = {}
  for (const f of filas) {
    out[f.campanaId] = {
      leadsCRM: f.leads, contactados: f.contactados, cotizados: f.cotizados,
      visitasAgendadas: f.visitas_agendadas, visitasRealizadas: f.visitas_realizadas,
      ventas: f.ventas, ufVendidas: Number(f.uf_vendidas),
      sinGestion48h: f.sin_gestion_48h, con48h: f.con_48h,
      horasContacto: (f.horas_contacto || []).map(Number).filter(h => h >= 0),
    }
  }
  return out
}

// ── Meta agregado por campaña en el período ──
async function metaPorCampana(desde, hasta) {
  const filas = await prisma.rrssMetaDiario.groupBy({
    by: ['campanaMetaId'],
    where: { nivel: 'CAMPANA', fecha: { gte: desde, lt: hasta } },
    _sum: { gasto: true, impresiones: true, clics: true, clicsEnlace: true, leads: true },
    _max: { alcance: true },
  })
  // alcance por campaña en el período = pedir a Meta sin time_increment sería exacto; aquí aproximamos con la suma
  // de alcance diario (sobreestima gente repetida). Frecuencia = impresiones / alcance aprox.
  const alc = await prisma.rrssMetaDiario.groupBy({
    by: ['campanaMetaId'], where: { nivel: 'CAMPANA', fecha: { gte: desde, lt: hasta } }, _sum: { alcance: true },
  })
  const alcance = Object.fromEntries(alc.map(a => [a.campanaMetaId, n(a._sum.alcance)]))
  const out = {}
  for (const f of filas) {
    const gasto = n(f._sum.gasto), imp = n(f._sum.impresiones), ce = n(f._sum.clicsEnlace), leads = n(f._sum.leads)
    out[f.campanaMetaId] = {
      gasto, impresiones: imp, clics: n(f._sum.clics), clicsEnlace: ce, leadsMeta: leads,
      alcanceAprox: alcance[f.campanaMetaId] || 0,
      cpm: imp ? Math.round((gasto / imp) * 1000) : null,
      ctrEnlace: imp ? Math.round((ce / imp) * 10000) / 100 : null,
      convFormulario: pct(leads, ce),
      cpl: leads ? Math.round(gasto / leads) : null,
    }
  }
  return out
}

// Desgloses agregados en el período: ubicación (para % Audience Network) y edad (para % 65+), por campaña
async function desglosesPorCampana(desde, hasta) {
  const filas = await prisma.rrssMetaDesglose.groupBy({
    by: ['campanaMetaId', 'tipo', 'clave'],
    where: { fecha: { gte: desde, lt: hasta }, tipo: { in: ['UBICACION', 'EDAD_GENERO'] } },
    _sum: { gasto: true, impresiones: true, leads: true },
  })
  const out = {}
  for (const f of filas) {
    const o = out[f.campanaMetaId] ||= { gastoTotal: 0, gastoAN: 0, impTotal: 0, imp65: 0, leadsTotal: 0, leads65: 0 }
    if (f.tipo === 'UBICACION') {
      o.gastoTotal += n(f._sum.gasto)
      if (f.clave.startsWith('audience_network')) o.gastoAN += n(f._sum.gasto)
    } else {
      o.impTotal += n(f._sum.impresiones); o.leadsTotal += n(f._sum.leads)
      if (f.clave.startsWith('65')) { o.imp65 += n(f._sum.impresiones); o.leads65 += n(f._sum.leads) }
    }
  }
  return out
}

// Frecuencia real de los últimos 7 y 30 días por campaña (alcance diario sumado es aproximación; aquí usamos
// la frecuencia que reporta Meta por día, promediada ponderando por impresiones)
async function frecuenciaReciente(dias) {
  const desde = new Date(Date.now() - dias * 86400000)
  const filas = await prisma.rrssMetaDiario.findMany({
    where: { nivel: 'CAMPANA', fecha: { gte: desde } }, select: { campanaMetaId: true, frecuencia: true, impresiones: true },
  })
  const acc = {}
  for (const f of filas) {
    const a = acc[f.campanaMetaId] ||= { s: 0, w: 0 }
    a.s += f.frecuencia * f.impresiones; a.w += f.impresiones
  }
  return Object.fromEntries(Object.entries(acc).map(([k, a]) => [k, a.w ? Math.round((a.s / a.w) * 100) / 100 : null]))
}

// Leads de Meta sin lead en el CRM, descontando los de las últimas 2 h (gracia) y los de relleno (basura)
async function leadsPerdidosPorCampana(desde, hasta) {
  const limite = new Date(Math.min(hasta.getTime(), Date.now() - GRACIA_MS))
  const filas = await prisma.rrssMetaLead.findMany({
    where: { leadId: null, creadoMeta: { gte: desde, lt: limite } }, select: { campaignId: true, nombre: true, telefono: true },
  })
  const out = {}
  for (const f of filas) { if (!esLeadBasura(f)) out[f.campaignId] = (out[f.campaignId] || 0) + 1 }
  return out
}

// Alcance y frecuencia reales del período desde Meta (1 llamada por nivel), cacheadas 1 h por período
const cacheAlcance = new Map()
async function alcanceReal(since, until) {
  const k = `${since}|${until}`
  const hit = cacheAlcance.get(k)
  if (hit && hit.t > Date.now() - 3600000) return hit.v
  if (!meta.metaDisponible()) return { cuenta: null, campanas: {} }
  try {
    const [cuenta, camp] = await Promise.all([
      meta.insightsPeriodo({ level: 'account', since, until }),
      meta.insightsPeriodo({ level: 'campaign', since, until }),
    ])
    const v = {
      cuenta: cuenta[0] ? { alcance: n(cuenta[0].reach), frecuencia: n(cuenta[0].frequency) } : null,
      campanas: Object.fromEntries(camp.map(c => [c.campaign_id, { alcance: n(c.reach), frecuencia: n(c.frequency) }])),
    }
    cacheAlcance.set(k, { t: Date.now(), v })
    return v
  } catch (err) {
    console.error('[rrss] alcance real', err.message)
    return { cuenta: null, campanas: {} }
  }
}

async function ufHoy() {
  const u = await prisma.uFDiaria.findFirst({ orderBy: { fecha: 'desc' } })
  return u ? Number(u.valorPesos) : null
}

// Construye el informe (totales + por campaña) para un período
async function construirInforme(desde, hasta) {
  const [mapa, metaC, desg, perdidos, uf, f7, f30, alc] = await Promise.all([
    prisma.rrssCampanaMapa.findMany({ include: { campanaRef: { select: { id: true, nombre: true, esWebinar: true } } } }),
    metaPorCampana(desde, hasta), desglosesPorCampana(desde, hasta), leadsPerdidosPorCampana(desde, hasta),
    ufHoy(), frecuenciaReciente(7), frecuenciaReciente(30),
    alcanceReal(iso(desde), iso(new Date(hasta.getTime() - 1))),
  ])
  const campanaIds = [...new Set(mapa.map(m => m.campanaId).filter(Boolean))]
  const crm = await embudoCRM(campanaIds, desde, hasta)

  const campanas = []
  for (const m of mapa) {
    const mc = metaC[m.campanaMetaId]
    const c = m.campanaId ? crm[m.campanaId] : null
    if (!mc && !c) continue // sin datos en el período
    const g = mc?.gasto || 0
    const d = desg[m.campanaMetaId]
    const fila = {
      campanaMetaId: m.campanaMetaId, nombreMeta: m.nombreMeta, estadoMeta: m.estadoMeta, objetivo: m.objetivo,
      campanaId: m.campanaId, nombreCRM: m.campanaRef?.nombre || null, vinculoManual: m.vinculoManual,
      inicioMeta: m.inicioMeta, finMeta: m.finMeta,
      gasto: g, impresiones: mc?.impresiones || 0, clics: mc?.clics || 0,
      alcance: alc.campanas[m.campanaMetaId]?.alcance ?? null, // real (deduplicado por Meta); null si no hay token
      frecuenciaPeriodo: alc.campanas[m.campanaMetaId]?.frecuencia ?? null,
      alcanceAprox: mc?.alcanceAprox || 0, // suma de alcance diario (sobreestima), solo de respaldo
      clicsEnlace: mc?.clicsEnlace || 0, leadsMeta: mc?.leadsMeta || 0,
      cpm: mc?.cpm ?? null, ctrEnlace: mc?.ctrEnlace ?? null, convFormulario: mc?.convFormulario ?? null, cpl: mc?.cpl ?? null,
      frecuencia7d: f7[m.campanaMetaId] ?? null, frecuencia30d: f30[m.campanaMetaId] ?? null,
      pctAudienceNetwork: d?.gastoTotal ? Math.round((d.gastoAN / d.gastoTotal) * 1000) / 10 : null,
      pctLeads65: d?.leadsTotal ? Math.round((d.leads65 / d.leadsTotal) * 1000) / 10 : (d?.impTotal ? Math.round((d.imp65 / d.impTotal) * 1000) / 10 : null),
      leadsPerdidosEntrega: perdidos[m.campanaMetaId] || 0,
      leadsCRM: c?.leadsCRM || 0, contactados: c?.contactados || 0, cotizados: c?.cotizados || 0,
      visitasAgendadas: c?.visitasAgendadas || 0, visitasRealizadas: c?.visitasRealizadas || 0,
      ventas: c?.ventas || 0, ufVendidas: c?.ufVendidas || 0,
      sinGestion48h: c?.sinGestion48h || 0, con48h: c?.con48h || 0,
      horasContacto: c?.horasContacto || [],
    }
    fila.costoCotizacion = fila.cotizados ? Math.round(g / fila.cotizados) : null
    fila.costoVisita = fila.visitasRealizadas ? Math.round(g / fila.visitasRealizadas) : null
    fila.cac = fila.ventas ? Math.round(g / fila.ventas) : null
    fila.tasaLeadCotizacion = pct(fila.cotizados, fila.leadsCRM)
    fila.tasaCotizacionVisita = pct(fila.visitasRealizadas, fila.cotizados)
    fila.tasaVisitaVenta = pct(fila.ventas, fila.visitasRealizadas)
    fila.pctSinGestion48h = pct(fila.sinGestion48h, fila.con48h)
    fila.pctLeadsPerdidos = pct(fila.leadsPerdidosEntrega, fila.leadsMeta)
    fila.horasPrimerContactoMediana = mediana(fila.horasContacto)
    fila.pesosVendidos = uf ? Math.round(fila.ufVendidas * uf) : null
    fila.roas = m.campanaId && uf && g && fila.ventas ? Math.round((fila.ufVendidas * uf / g) * 10) / 10 : null // sin ventas → sin dato, no "Mal"
    delete fila.horasContacto
    fila._horas = c?.horasContacto || []
    campanas.push(fila)
  }
  campanas.sort((a, b) => b.gasto - a.gasto)

  // Totales
  const sum = (k) => campanas.reduce((a, c) => a + (c[k] || 0), 0)
  const t = {
    gasto: sum('gasto'), impresiones: sum('impresiones'), clics: sum('clics'), clicsEnlace: sum('clicsEnlace'),
    leadsMeta: sum('leadsMeta'), leadsCRM: sum('leadsCRM'), contactados: sum('contactados'), cotizados: sum('cotizados'),
    visitasAgendadas: sum('visitasAgendadas'), visitasRealizadas: sum('visitasRealizadas'), ventas: sum('ventas'),
    ufVendidas: Math.round(sum('ufVendidas') * 100) / 100, leadsPerdidosEntrega: sum('leadsPerdidosEntrega'),
    sinGestion48h: sum('sinGestion48h'), con48h: sum('con48h'),
  }
  t.cpm = t.impresiones ? Math.round((t.gasto / t.impresiones) * 1000) : null
  t.ctrEnlace = t.impresiones ? Math.round((t.clicsEnlace / t.impresiones) * 10000) / 100 : null
  t.convFormulario = pct(t.leadsMeta, t.clicsEnlace)
  t.cpl = t.leadsMeta ? Math.round(t.gasto / t.leadsMeta) : null
  t.costoCotizacion = t.cotizados ? Math.round(t.gasto / t.cotizados) : null
  t.costoVisita = t.visitasRealizadas ? Math.round(t.gasto / t.visitasRealizadas) : null
  t.cac = t.ventas ? Math.round(t.gasto / t.ventas) : null
  t.tasaLeadCotizacion = pct(t.cotizados, t.leadsCRM)
  t.tasaCotizacionVisita = pct(t.visitasRealizadas, t.cotizados)
  t.tasaVisitaVenta = pct(t.ventas, t.visitasRealizadas)
  t.pctSinGestion48h = pct(t.sinGestion48h, t.con48h)
  t.pctLeadsPerdidos = pct(t.leadsPerdidosEntrega, t.leadsMeta)
  t.horasPrimerContactoMediana = mediana(campanas.flatMap(c => c._horas))
  const gastoAN = campanas.reduce((a, c) => a + (c.pctAudienceNetwork != null ? c.gasto * c.pctAudienceNetwork / 100 : 0), 0)
  t.pctAudienceNetwork = t.gasto ? Math.round((gastoAN / t.gasto) * 1000) / 10 : null
  t.ufValor = uf
  t.pesosVendidos = uf ? Math.round(t.ufVendidas * uf) : null
  t.roas = uf && t.gasto && t.ventas ? Math.round((t.ufVendidas * uf / t.gasto) * 10) / 10 : null
  t.alcance = alc.cuenta?.alcance ?? null
  t.frecuenciaPeriodo = alc.cuenta?.frecuencia ?? null
  campanas.forEach(c => delete c._horas)
  return { totales: t, campanas }
}

// Medianas de la cuenta (últimos 90 días) para los umbrales relativos
async function medianasCuenta() {
  const hasta = new Date(Date.now() + 86400000), desde = new Date(Date.now() - 90 * 86400000)
  const { campanas } = await construirInforme(desde, hasta)
  const con = campanas.filter(c => c.gasto > 0)
  return {
    CPL: mediana(con.map(c => c.cpl)), CPM: mediana(con.map(c => c.cpm)),
    COSTO_COTIZACION: mediana(con.map(c => c.costoCotizacion)), COSTO_VISITA: mediana(con.map(c => c.costoVisita)),
    CAC: mediana(con.map(c => c.cac)),
  }
}

// Qué campo del informe alimenta cada umbral
const CAMPO_UMBRAL = {
  CPL: 'cpl', COSTO_COTIZACION: 'costoCotizacion', COSTO_VISITA: 'costoVisita', CAC: 'cac', CPM: 'cpm',
  CTR_ENLACE: 'ctrEnlace', FRECUENCIA_7D: 'frecuencia7d', FRECUENCIA_30D: 'frecuencia30d', CONV_FORMULARIO: 'convFormulario',
  TASA_LEAD_COTIZACION: 'tasaLeadCotizacion', TASA_COTIZACION_VISITA: 'tasaCotizacionVisita',
  TIEMPO_PRIMER_CONTACTO: 'horasPrimerContactoMediana', LEADS_SIN_GESTION_48H: 'pctSinGestion48h',
  LEADS_PERDIDOS_ENTREGA: 'pctLeadsPerdidos', PCT_AUDIENCE_NETWORK: 'pctAudienceNetwork', PCT_LEADS_65: 'pctLeads65', ROAS: 'roas',
}

function anotarSemaforos(obj, umbrales, med) {
  const s = {}
  for (const u of umbrales) {
    const campo = CAMPO_UMBRAL[u.clave]
    if (!campo) continue
    s[u.clave] = semaforo(u, obj[campo], med[u.clave])
  }
  obj.semaforos = s
}

// GET /api/rrss/informe?desde&hasta
const informe = async (req, res) => {
  try {
    const hastaIncl = dia(req.query.hasta, hoyUTC())
    const hasta = new Date(hastaIncl.getTime() + 86400000) // exclusivo
    const desde = dia(req.query.desde, new Date(hastaIncl.getTime() - 29 * 86400000))

    const [inf, umbrales, med, ultimoSync] = await Promise.all([
      construirInforme(desde, hasta),
      prisma.rrssUmbral.findMany({ orderBy: { orden: 'asc' } }),
      medianasCuenta(),
      prisma.rrssSyncLog.findFirst({ where: { fuente: 'META', ok: true }, orderBy: { inicio: 'desc' } }),
    ])
    anotarSemaforos(inf.totales, umbrales, med)
    inf.campanas.forEach(c => anotarSemaforos(c, umbrales, med))

    // Serie diaria (nivel campaña sumado) para el gráfico
    const serieRaw = await prisma.rrssMetaDiario.groupBy({
      by: ['fecha'], where: { nivel: 'CAMPANA', fecha: { gte: desde, lt: hasta } },
      _sum: { gasto: true, leads: true, clicsEnlace: true, impresiones: true }, orderBy: { fecha: 'asc' },
    })
    const serie = serieRaw.map(s => ({ fecha: iso(s.fecha), gasto: n(s._sum.gasto), leads: n(s._sum.leads), clicsEnlace: n(s._sum.clicsEnlace), impresiones: n(s._sum.impresiones) }))

    // Desgloses agregados del período
    const desgRaw = await prisma.rrssMetaDesglose.groupBy({
      by: ['tipo', 'clave'], where: { fecha: { gte: desde, lt: hasta } },
      _sum: { gasto: true, impresiones: true, clics: true, leads: true },
    })
    const desgloses = { REGION: [], EDAD_GENERO: [], UBICACION: [] }
    for (const d of desgRaw) {
      const gasto = n(d._sum.gasto), leads = n(d._sum.leads)
      desgloses[d.tipo].push({ clave: d.clave, gasto, impresiones: n(d._sum.impresiones), clics: n(d._sum.clics), leads, cpl: leads ? Math.round(gasto / leads) : null })
    }
    Object.values(desgloses).forEach(a => a.sort((x, y) => y.gasto - x.gasto))

    res.json({
      periodo: { desde: iso(desde), hasta: iso(new Date(hasta.getTime() - 1)) },
      medianas90d: med, umbrales, ultimoSync: ultimoSync?.fin || null,
      metaConfigurada: meta.metaDisponible(),
      ...inf, serie, desgloses,
    })
  } catch (err) {
    console.error('[rrss] informe', err)
    res.status(500).json({ error: 'Error al construir el informe RRSS.' })
  }
}

// GET /api/rrss/leads-perdidos?desde&hasta — leads de Meta que no llegaron al CRM
const leadsPerdidos = async (req, res) => {
  try {
    const hasta = new Date(dia(req.query.hasta, hoyUTC()).getTime() + 86400000)
    const desde = dia(req.query.desde, new Date(hasta.getTime() - 90 * 86400000))
    const rows = await prisma.rrssMetaLead.findMany({
      where: { leadId: null, creadoMeta: { gte: desde, lt: hasta } }, orderBy: { creadoMeta: 'desc' },
      select: { metaLeadId: true, creadoMeta: true, nombre: true, email: true, telefono: true, campaignId: true, plataforma: true, formId: true },
    })
    const mapa = await prisma.rrssCampanaMapa.findMany({ select: { campanaMetaId: true, nombreMeta: true } })
    const nombre = Object.fromEntries(mapa.map(m => [m.campanaMetaId, m.nombreMeta]))
    const limite = Date.now() - GRACIA_MS
    const perdidos = [], basura = [], enGracia = []
    for (const r of rows) {
      const fila = { ...r, campana: nombre[r.campaignId] || r.campaignId }
      if (esLeadBasura(r)) basura.push(fila)
      else if (r.creadoMeta.getTime() > limite) enGracia.push(fila)
      else perdidos.push(fila)
    }
    res.json({ perdidos, basura, enGracia, graciaHoras: GRACIA_MS / 3600000 })
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Error al listar leads perdidos.' })
  }
}

// ── Mapa ──
// GET /api/rrss/mapa-datos?desde&hasta → por región (código INE): gasto/impresiones/leads de Meta (breakdown region),
// leads del CRM y ventas (por la región del edificio de la unidad de interés / vendida). 'Unknown' va aparte.
const mapaDatos = async (req, res) => {
  try {
    const hastaIncl = dia(req.query.hasta, hoyUTC())
    const hasta = new Date(hastaIncl.getTime() + 86400000)
    const desde = dia(req.query.desde, new Date(hastaIncl.getTime() - 29 * 86400000))
    const regiones = Object.fromEntries(REGIONES.map(r => [r.codigo, { codigo: r.codigo, nombre: r.nombre, gasto: 0, impresiones: 0, clics: 0, leadsMeta: 0, leadsCRM: 0, cotizados: 0, ventas: 0, ufVendidas: 0 }]))
    const sinRegion = { gasto: 0, impresiones: 0, leadsMeta: 0, leadsCRM: 0 }

    const meta = await prisma.rrssMetaDesglose.groupBy({
      by: ['clave'], where: { tipo: 'REGION', fecha: { gte: desde, lt: hasta } },
      _sum: { gasto: true, impresiones: true, clics: true, leads: true },
    })
    for (const m of meta) {
      const r = normalizarRegion(m.clave)
      const dest = r ? regiones[r.codigo] : sinRegion
      dest.gasto += n(m._sum.gasto); dest.impresiones += n(m._sum.impresiones); dest.leadsMeta += n(m._sum.leads)
      if (r) dest.clics += n(m._sum.clics)
    }

    // Leads del CRM de campañas vinculadas, ubicados por la región del edificio de interés
    // La mayoría de los leads de Meta llegan sin unidad de interés → se ubican por la región a la que apunta
    // la segmentación de su campaña (Temuco → Araucanía, Santiago → RM...). Si tienen edificio, manda el edificio.
    const mapa = await prisma.rrssCampanaMapa.findMany({ where: { campanaId: { not: null } }, select: { campanaId: true, campanaMetaId: true } })
    const campanaIds = [...new Set(mapa.map(m => m.campanaId))]
    const regMeta = await regionPorCampanaMeta().catch(() => ({}))
    const regionDeCampanaCRM = {}
    for (const m of mapa) if (regMeta[m.campanaMetaId]) regionDeCampanaCRM[m.campanaId] = regMeta[m.campanaMetaId]
    const ubicar = (regionEdificio, campanaId) => normalizarRegion(regionEdificio)?.codigo || regionDeCampanaCRM[campanaId] || null

    if (campanaIds.length) {
      const filas = await prisma.$queryRaw`
        SELECT l."campanaId", e.region, COUNT(*)::int AS leads,
          COUNT(DISTINCT c."leadId")::int AS cotizados
        FROM leads l
        LEFT JOIN unidades u ON u.id = l."unidadInteresId"
        LEFT JOIN edificios e ON e.id = u."edificioId"
        LEFT JOIN cotizaciones c ON c."leadId" = l.id
        WHERE l."campanaId" IN (${Prisma.join(campanaIds)}) AND l."creadoEn" >= ${desde} AND l."creadoEn" < ${hasta}
        GROUP BY l."campanaId", e.region`
      for (const f of filas) {
        const cod = ubicar(f.region, f.campanaId)
        if (cod) { regiones[cod].leadsCRM += f.leads; regiones[cod].cotizados += f.cotizados } else sinRegion.leadsCRM += f.leads
      }
      const ventas = await prisma.$queryRaw`
        SELECT l."campanaId", e.region, COUNT(DISTINCT v.id)::int AS ventas, COALESCE(SUM(u."precioVentaUF"), 0) AS uf
        FROM ventas v JOIN leads l ON l.id = v."leadId"
        JOIN unidades u ON u."ventaId" = v.id JOIN edificios e ON e.id = u."edificioId"
        WHERE v.estado <> 'ANULADO' AND l."campanaId" IN (${Prisma.join(campanaIds)}) AND l."creadoEn" >= ${desde} AND l."creadoEn" < ${hasta}
        GROUP BY l."campanaId", e.region`
      for (const f of ventas) {
        const cod = ubicar(f.region, f.campanaId)
        if (cod) { regiones[cod].ventas += f.ventas; regiones[cod].ufVendidas += Number(f.uf) }
      }
    }
    for (const r of Object.values(regiones)) r.cpl = r.leadsMeta ? Math.round(r.gasto / r.leadsMeta) : null
    // Meta agrupa Ñuble dentro de "Bío Bío" (catálogo anterior a 2018)
    const nota = regiones['16'].gasto === 0 && regiones['08'].gasto > 0 ? 'Meta reporta Ñuble dentro de Biobío.' : null
    res.json({ periodo: { desde: iso(desde), hasta: iso(hastaIncl) }, regiones: Object.values(regiones), sinRegion, nota })
  } catch (err) {
    console.error('[rrss] mapa-datos', err); res.status(500).json({ error: 'Error al construir los datos del mapa.' })
  }
}

// Coordenadas de las ciudades que usa la segmentación (Meta no entrega lat/lng de ciudades, solo nombre + radio)
const CIUDADES = {
  'Santiago': [-33.4489, -70.6693], 'Temuco': [-38.7359, -72.5904], 'Concepción': [-36.8270, -73.0503],
  'San Pedro de La Paz': [-36.8406, -73.1032], 'Talca': [-35.4264, -71.6554], 'Valdivia': [-39.8142, -73.2459],
  'Villarrica': [-39.2857, -72.2279], 'Viña del Mar': [-33.0153, -71.5500], 'Valparaíso': [-33.0472, -71.6127],
  'Rancagua': [-34.1708, -70.7444], 'Chillán': [-36.6066, -72.1034], 'Puerto Montt': [-41.4693, -72.9424],
  'La Serena': [-29.9027, -71.2519], 'Antofagasta': [-23.6509, -70.3975], 'Iquique': [-20.2208, -70.1431],
}

// GET /api/rrss/segmentacion → círculos (ciudad + radio / ubicación personalizada) y regiones de cada conjunto, con su campaña
const cacheSeg = { t: 0, v: null }
async function obtenerSegmentacion() {
  if (!meta.metaDisponible()) return []
  if (!cacheSeg.v || cacheSeg.t < Date.now() - 3600000) {
      const [conjuntos, mapa] = await Promise.all([meta.conjuntos(), prisma.rrssCampanaMapa.findMany({ select: { campanaMetaId: true, nombreMeta: true, estadoMeta: true } })])
      const nombreC = Object.fromEntries(mapa.map(m => [m.campanaMetaId, m]))
      cacheSeg.v = conjuntos.map(a => {
        const g = a.targeting?.geo_locations || {}
        const circulos = [
          ...(g.custom_locations || []).map(c => ({ lat: c.latitude, lng: c.longitude, radioKm: c.distance_unit === 'mile' ? c.radius * 1.609 : c.radius, nombre: c.name || c.address_string || 'Ubicación personalizada', regionCodigo: normalizarRegion(c.region)?.codigo || null })),
          ...(g.cities || []).filter(c => CIUDADES[c.name]).map(c => ({ lat: CIUDADES[c.name][0], lng: CIUDADES[c.name][1], radioKm: c.distance_unit === 'mile' ? c.radius * 1.609 : (c.radius || 0), nombre: c.name, regionCodigo: normalizarRegion(c.region)?.codigo || null })),
        ]
        const regionesCod = [...(g.regions || []).map(r => normalizarRegion(r.name)?.codigo), ...circulos.map(c => c.regionCodigo)].filter(Boolean)
        return {
          id: a.id, nombre: a.name, estado: a.status, campanaMetaId: a.campaign_id,
          campana: nombreC[a.campaign_id]?.nombreMeta || a.campaign_id, campanaActiva: nombreC[a.campaign_id]?.estadoMeta === 'ACTIVE',
          edadMin: a.targeting?.age_min ?? null, edadMax: a.targeting?.age_max ?? null,
          generos: a.targeting?.genders || null, // [1]=hombres [2]=mujeres, null=todos
          intereses: (a.targeting?.flexible_spec || []).flatMap(f => (f.interests || []).map(i => i.name)).slice(0, 12),
          advantagePlus: !!a.targeting?.targeting_automation?.advantage_audience,
          ubicacionTipo: g.location_types || null,
          circulos, regiones: (g.regions || []).map(r => r.name), regionesCodigo: [...new Set(regionesCod)],
          ciudadesSinCoord: (g.cities || []).filter(c => !CIUDADES[c.name]).map(c => c.name),
          inicio: a.start_time || null, fin: a.end_time || null,
        }
      })
      cacheSeg.t = Date.now()
  }
  return cacheSeg.v
}

// Región (código INE) a la que apunta cada campaña de Meta = la más frecuente entre sus conjuntos
async function regionPorCampanaMeta() {
  const conj = await obtenerSegmentacion()
  const votos = {}
  // cada ciudad/ubicación vota (Temuco + Villarrica + Valdivia → gana Araucanía); las regiones explícitas valen 2
  for (const c of conj) {
    const v = votos[c.campanaMetaId] ||= {}
    for (const x of c.circulos) if (x.regionCodigo) v[x.regionCodigo] = (v[x.regionCodigo] || 0) + 1
    for (const r of c.regiones) { const cod = normalizarRegion(r)?.codigo; if (cod) v[cod] = (v[cod] || 0) + 2 }
  }
  return Object.fromEntries(Object.entries(votos).filter(([, v]) => Object.keys(v).length).map(([k, v]) => [k, Object.entries(v).sort((a, b) => b[1] - a[1])[0][0]]))
}

const segmentacion = async (_req, res) => {
  try {
    res.json({ conjuntos: await obtenerSegmentacion(), metaConfigurada: meta.metaDisponible() })
  } catch (err) {
    console.error('[rrss] segmentacion', err); res.status(500).json({ error: 'Error al leer la segmentación desde Meta.' })
  }
}

// ── Configuración ──
const listarUmbrales = async (_req, res) => res.json(await prisma.rrssUmbral.findMany({ orderBy: { orden: 'asc' } }))

const actualizarUmbral = async (req, res) => {
  const { verdeHasta, amarilloHasta, menorEsMejor, queEs, porQueImporta, cuantoEstaBien, nombre } = req.body
  try {
    const u = await prisma.rrssUmbral.update({
      where: { id: Number(req.params.id) },
      data: {
        ...(verdeHasta !== undefined && { verdeHasta: verdeHasta === null ? null : Number(verdeHasta) }),
        ...(amarilloHasta !== undefined && { amarilloHasta: amarilloHasta === null ? null : Number(amarilloHasta) }),
        ...(menorEsMejor !== undefined && { menorEsMejor: !!menorEsMejor }),
        ...(nombre && { nombre }), ...(queEs && { queEs }), ...(porQueImporta && { porQueImporta }), ...(cuantoEstaBien && { cuantoEstaBien }),
      },
    })
    res.json(u)
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error al actualizar umbral.' }) }
}

const listarMapa = async (_req, res) => res.json(await prisma.rrssCampanaMapa.findMany({
  include: { campanaRef: { select: { id: true, nombre: true } } }, orderBy: [{ inicioMeta: 'desc' }],
}))

// PUT /api/rrss/mapa/:id { campanaId | null } — vínculo manual (el job no lo pisa)
const actualizarMapa = async (req, res) => {
  const campanaId = req.body.campanaId == null ? null : Number(req.body.campanaId)
  try {
    const m = await prisma.rrssCampanaMapa.update({
      where: { id: Number(req.params.id) }, data: { campanaId, vinculoManual: true },
      include: { campanaRef: { select: { id: true, nombre: true } } },
    })
    res.json(m)
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error al actualizar vínculo.' }) }
}

const listarSyncLog = async (_req, res) => res.json(await prisma.rrssSyncLog.findMany({ orderBy: { inicio: 'desc' }, take: 30 }))

// POST /api/rrss/sync { dias? } — "Actualizar ahora" (solo GERENTE)
const sincronizar = async (req, res) => {
  if (!meta.metaDisponible()) return res.status(400).json({ error: 'META_ACCESS_TOKEN no está configurado en el servidor.' })
  try {
    const d = await rrssSyncMeta({ dias: Math.min(Number(req.body?.dias) || 28, 120) })
    res.json(d)
  } catch (err) { res.status(500).json({ error: `Falló la sincronización: ${err.message}` }) }
}

module.exports = { informe, leadsPerdidos, mapaDatos, segmentacion, listarUmbrales, actualizarUmbral, listarMapa, actualizarMapa, listarSyncLog, sincronizar, semaforo, mediana }
