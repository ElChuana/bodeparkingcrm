// Cliente GA4 Data API (solo lectura). Credencial: GA4_SA_JSON_B64 (JSON de la cuenta de servicio en base64) o,
// en local, el archivo ~/.config/bodeparking/ga-service-account.json. Propiedad: GA4_PROPERTY_ID.
const fs = require('fs')
const path = require('path')
const os = require('os')

const PROPERTY = `properties/${process.env.GA4_PROPERTY_ID || '565903812'}`

function credenciales() {
  if (process.env.GA4_SA_JSON_B64) return JSON.parse(Buffer.from(process.env.GA4_SA_JSON_B64, 'base64').toString('utf8'))
  if (process.env.NODE_ENV !== 'production') {
    const f = path.join(os.homedir(), '.config/bodeparking/ga-service-account.json')
    if (fs.existsSync(f)) return JSON.parse(fs.readFileSync(f, 'utf8'))
  }
  return null
}
const ga4Disponible = () => !!credenciales()

let cliente = null
function obtenerCliente() {
  if (cliente) return cliente
  const cred = credenciales()
  if (!cred) throw new Error('GA4 no configurado (GA4_SA_JSON_B64)')
  const { BetaAnalyticsDataClient } = require('@google-analytics/data')
  cliente = new BetaAnalyticsDataClient({ credentials: { client_email: cred.client_email, private_key: cred.private_key }, projectId: cred.project_id })
  return cliente
}

// Devuelve filas [{ dims: [..], mets: [..] }] para un rango y dimensiones/métricas dadas
async function reporte({ since, until, dimensiones, metricas, limit = 10000 }) {
  const [r] = await obtenerCliente().runReport({
    property: PROPERTY,
    dateRanges: [{ startDate: since, endDate: until }],
    dimensions: dimensiones.map(name => ({ name })),
    metrics: metricas.map(name => ({ name })),
    limit,
  })
  return (r.rows || []).map(row => ({ dims: row.dimensionValues.map(d => d.value), mets: row.metricValues.map(m => Number(m.value) || 0) }))
}

module.exports = { ga4Disponible, reporte, PROPERTY }
