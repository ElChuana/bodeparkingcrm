// Lector e intérprete de los archivos mensuales de AWStats de cPanel (tmp/awstats/ssl/awstatsMMYYYY.<dominio>.txt).
// Uso único para el histórico del sitio (sep-2025 → nov-2026). Formato: secciones "BEGIN_X n ... END_X".
const axios = require('axios')

const DOMINIO = process.env.AWSTATS_DOMINIO || 'bodeparking.cl'

function configCpanel() {
  const { CPANEL_HOST, CPANEL_USER, CPANEL_TOKEN } = process.env
  if (!CPANEL_HOST || !CPANEL_USER || !CPANEL_TOKEN) throw new Error('Faltan CPANEL_HOST / CPANEL_USER / CPANEL_TOKEN')
  return { base: `https://${CPANEL_HOST}:2083/execute`, headers: { Authorization: `cpanel ${CPANEL_USER}:${CPANEL_TOKEN}` } }
}

async function listarArchivos() {
  const { base, headers } = configCpanel()
  const r = await axios.get(`${base}/Fileman/list_files`, { params: { dir: 'tmp/awstats/ssl', types: 'file' }, headers, timeout: 60000 })
  if (!r.data?.status) throw new Error(`cPanel list_files: ${JSON.stringify(r.data?.errors)}`)
  return (r.data.data || []).map(f => f.file).filter(f => /^awstats\d{6}\./.test(f) && f.endsWith('.txt'))
}

async function leerArchivo(nombre) {
  const { base, headers } = configCpanel()
  const r = await axios.get(`${base}/Fileman/get_file_content`, { params: { dir: 'tmp/awstats/ssl', file: nombre }, headers, timeout: 120000 })
  if (!r.data?.status) throw new Error(`cPanel get_file_content ${nombre}: ${JSON.stringify(r.data?.errors)}`)
  return r.data.data.content
}

function seccion(texto, nombre) {
  const m = texto.match(new RegExp(`^BEGIN_${nombre} \\d+\\n([\\s\\S]*?)^END_${nombre}`, 'm'))
  return m ? m[1].split('\n').filter(l => l && !l.startsWith('#')) : []
}
const cols = (l) => l.trim().split(/\s+/)

// "awstats112026.bodeparking.cl.txt" → Date 2026-11-01 (UTC)
function mesDeArchivo(nombre) {
  const m = nombre.match(/^awstats(\d{2})(\d{4})\./)
  return m ? new Date(`${m[2]}-${m[1]}-01T00:00:00Z`) : null
}

// Interpreta el contenido de un mes
function interpretar(texto) {
  const general = Object.fromEntries(seccion(texto, 'GENERAL').map(l => { const c = cols(l); return [c[0], c.slice(1)] }))
  const visitas = Number(general.TotalVisits?.[0] || 0)
  const unicos = Number(general.TotalUnique?.[0] || 0)

  // DAY: fecha visitas? → formato real: YYYYMMDD pages hits bandwidth visits
  const dias = seccion(texto, 'DAY').map(l => { const c = cols(l); return { fecha: `${c[0].slice(0, 4)}-${c[0].slice(4, 6)}-${c[0].slice(6, 8)}`, paginas: Number(c[1]), hits: Number(c[2]), visitas: Number(c[4] || 0) } })
  const paginas = dias.reduce((a, d) => a + d.paginas, 0)
  const hits = dias.reduce((a, d) => a + d.hits, 0)

  // PAGEREFS: url pages hits → referidos de redes
  let refsFbIg = 0
  const referidos = []
  for (const l of seccion(texto, 'PAGEREFS')) {
    const c = cols(l); const url = c[0].toLowerCase(); const p = Number(c[1] || 0)
    if (/facebook\.com|fb\.com|instagram\.com|instagr\.am/.test(url)) refsFbIg += p
    referidos.push({ url: c[0], paginas: p })
  }
  // SEREFERRALS: id pages hits → buscadores
  let refsGoogle = 0, refsBuscadores = 0
  for (const l of seccion(texto, 'SEREFERRALS')) {
    const c = cols(l); const p = Number(c[1] || 0)
    refsBuscadores += p
    if (/google/i.test(c[0])) refsGoogle += p
  }
  // SIDER: url pages ... → páginas más vistas
  const top = seccion(texto, 'SIDER').map(l => { const c = cols(l); return { url: c[0], paginas: Number(c[1] || 0) } }).sort((a, b) => b.paginas - a.paginas).slice(0, 15)
  // DOMAIN: país pages hits bw
  const paises = seccion(texto, 'DOMAIN').map(l => { const c = cols(l); return { pais: c[0], paginas: Number(c[1] || 0) } }).sort((a, b) => b.paginas - a.paginas).slice(0, 10)

  return { visitas, unicos, paginas, hits, refsFbIg, refsGoogle, refsBuscadores, crudo: { dias, referidos: referidos.slice(0, 20), top, paises } }
}

module.exports = { listarArchivos, leerArchivo, interpretar, mesDeArchivo, DOMINIO }
