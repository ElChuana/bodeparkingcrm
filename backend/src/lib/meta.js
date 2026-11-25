// Cliente de la Meta Marketing API (Graph) — SOLO LECTURA.
// Token: META_ACCESS_TOKEN (Railway). En local, si falta, se lee ~/.meta_token (nunca se copia al repo).
const axios = require('axios')
const fs = require('fs')
const path = require('path')
const os = require('os')

const VERSION = process.env.META_API_VERSION || 'v23.0'
const BASE = `https://graph.facebook.com/${VERSION}`

function leerToken() {
  if (process.env.META_ACCESS_TOKEN) return process.env.META_ACCESS_TOKEN.trim()
  if (process.env.NODE_ENV !== 'production') {
    const f = path.join(os.homedir(), '.meta_token')
    if (fs.existsSync(f)) return fs.readFileSync(f, 'utf8').trim()
  }
  return null
}

const config = () => ({
  token: leerToken(),
  adAccountId: process.env.META_AD_ACCOUNT_ID || 'act_1535035901738878',
  pageId: process.env.META_PAGE_ID || null,
  igId: process.env.META_IG_ID || null,
})

const metaDisponible = () => !!leerToken()

// GET con paginación por cursor. Devuelve todos los `data` concatenados.
async function getTodo(url, params = {}, { maxPaginas = 50 } = {}) {
  const { token } = config()
  if (!token) throw new Error('META_ACCESS_TOKEN no configurado')
  const out = []
  let siguiente = url
  let p = { access_token: token, limit: 500, ...params }
  for (let i = 0; i < maxPaginas && siguiente; i++) {
    let resp
    try {
      resp = await axios.get(siguiente, { params: p, timeout: 60000 })
    } catch (err) {
      const e = err.response?.data?.error
      if (e?.code === 17 || e?.code === 4 || e?.code === 32 || err.response?.status === 429) {
        // rate limit: esperar y reintentar una vez
        await new Promise(r => setTimeout(r, 60000))
        resp = await axios.get(siguiente, { params: p, timeout: 60000 })
      } else {
        throw new Error(`Meta API ${url}: ${e ? `${e.code} ${e.message}` : err.message}`)
      }
    }
    out.push(...(resp.data.data || []))
    siguiente = resp.data.paging?.next || null
    p = {} // la url `next` ya trae todos los params
  }
  return out
}

// ── Estructura de la cuenta ──────────────────────────────────────
const campanas = () => getTodo(`${BASE}/${config().adAccountId}/campaigns`, {
  fields: 'id,name,status,effective_status,objective,start_time,stop_time,created_time,updated_time',
})

const conjuntos = () => getTodo(`${BASE}/${config().adAccountId}/adsets`, {
  fields: 'id,name,status,campaign_id,targeting,start_time,end_time,daily_budget,lifetime_budget,optimization_goal',
})

const anuncios = () => getTodo(`${BASE}/${config().adAccountId}/ads`, {
  fields: 'id,name,status,effective_status,adset_id,campaign_id,created_time',
})

// ── Insights ─────────────────────────────────────────────────────
const CAMPOS_INSIGHTS = [
  'campaign_id', 'campaign_name', 'adset_id', 'adset_name', 'ad_id', 'ad_name',
  'spend', 'impressions', 'reach', 'frequency', 'clicks', 'inline_link_clicks',
  'cpm', 'ctr', 'cpc', 'actions', 'date_start', 'date_stop',
]
const CAMPOS_RANKING = ['quality_ranking', 'engagement_rate_ranking', 'conversion_rate_ranking']

// level: campaign | adset | ad. since/until: 'YYYY-MM-DD'. Una fila por día (time_increment=1).
async function insights({ level, since, until, breakdowns = null, conRanking = false }) {
  const fields = [...CAMPOS_INSIGHTS, ...(conRanking ? CAMPOS_RANKING : [])]
  return getTodo(`${BASE}/${config().adAccountId}/insights`, {
    level,
    fields: fields.join(','),
    time_range: JSON.stringify({ since, until }),
    time_increment: 1,
    ...(breakdowns && { breakdowns }),
    limit: 500,
  })
}

// Alcance y frecuencia REALES del período (deduplicados por Meta): sin time_increment. level: account | campaign.
async function insightsPeriodo({ level, since, until }) {
  return getTodo(`${BASE}/${config().adAccountId}/insights`, {
    level,
    fields: ['reach', 'frequency', 'impressions', ...(level === 'campaign' ? ['campaign_id'] : [])].join(','),
    time_range: JSON.stringify({ since, until }),
    limit: 500,
  })
}

// Leads del formulario instantáneo de un anuncio (permiso leads_retrieval). `since` opcional (Date o ISO).
async function leadsDeAnuncio(adId, since = null) {
  const params = {
    fields: 'id,created_time,ad_id,adset_id,campaign_id,form_id,platform,is_organic,field_data',
    limit: 500,
  }
  if (since) {
    const ts = Math.floor(new Date(since).getTime() / 1000)
    params.filtering = JSON.stringify([{ field: 'time_created', operator: 'GREATER_THAN', value: ts }])
  }
  return getTodo(`${BASE}/${adId}/leads`, params)
}

// Cantidad de leads dentro de `actions` de una fila de insights
function leadsDeAcciones(actions) {
  if (!Array.isArray(actions)) return 0
  const a = actions.find(x => x.action_type === 'lead')
    || actions.find(x => x.action_type === 'onsite_conversion.lead_grouped')
    || actions.find(x => x.action_type === 'leadgen_grouped')
  return a ? Number(a.value) || 0 : 0
}

module.exports = { config, metaDisponible, campanas, conjuntos, anuncios, insights, insightsPeriodo, leadsDeAnuncio, leadsDeAcciones }
