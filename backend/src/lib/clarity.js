// Microsoft Clarity Data Export API. Límite: 10 llamadas/día y solo 1-3 días hacia atrás.
// Token: CLARITY_API_TOKEN; en local, ~/.clarity_token.
const axios = require('axios')
const fs = require('fs')
const path = require('path')
const os = require('os')

function token() {
  if (process.env.CLARITY_API_TOKEN) return process.env.CLARITY_API_TOKEN.trim()
  if (process.env.NODE_ENV !== 'production') {
    const f = path.join(os.homedir(), '.clarity_token')
    if (fs.existsSync(f)) return fs.readFileSync(f, 'utf8').trim()
  }
  return null
}
const clarityDisponible = () => !!token()

// dimension: null | 'Device' | 'Source' | 'URL' | 'Browser' | 'OS' | 'Country/Region' | 'Channel' ...
async function exportar({ numOfDays = 1, dimension = null } = {}) {
  const t = token()
  if (!t) throw new Error('CLARITY_API_TOKEN no configurado')
  const params = { numOfDays, ...(dimension && { dimension1: dimension }) }
  const r = await axios.get('https://www.clarity.ms/export-data/api/v1/project-live-insights', {
    params, headers: { Authorization: `Bearer ${t}` }, timeout: 60000,
  })
  return r.data // [{ metricName, information: [{...}] }]
}

// Aplana la respuesta a filas { metrica: 'Traffic.totalSessionCount', clave, valor }
function aplanar(data, dimension = null) {
  const filas = []
  for (const bloque of data || []) {
    for (const info of bloque.information || []) {
      // la clave de la dimensión viene con distinta capitalización según el caso ("Device", "URL" → "Url"...)
      const kDim = dimension ? Object.keys(info).find(k => k.toLowerCase() === dimension.toLowerCase().replace('/', '')) : null
      const clave = dimension ? String((kDim && info[kDim]) ?? info.name ?? info.url ?? info.Url ?? '') : ''
      for (const [k, v] of Object.entries(info)) {
        if (typeof v === 'number') filas.push({ metrica: `${bloque.metricName}.${k}`, clave, valor: v })
      }
    }
  }
  return filas
}

module.exports = { clarityDisponible, exportar, aplanar }
