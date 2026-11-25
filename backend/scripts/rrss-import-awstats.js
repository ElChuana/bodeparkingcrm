// Import ÚNICO del histórico mensual del sitio desde AWStats (cPanel) → rrss_web_historico.
// Credenciales cPanel por entorno (CPANEL_HOST, CPANEL_USER, CPANEL_TOKEN); en local: `set -a; source ~/.bodeparking-cpanel; set +a`.
// Uso: DATABASE_URL=... node scripts/rrss-import-awstats.js [--solo 112026]
require('dotenv').config()
const prisma = require('../src/lib/prisma')
const aw = require('../src/lib/awstats')

const arg = (k) => { const i = process.argv.indexOf(k); return i > -1 ? process.argv[i + 1] : null }

async function main() {
  const solo = arg('--solo')
  const archivos = (await aw.listarArchivos()).filter(f => !solo || f.includes(`awstats${solo}.`)).sort()
  console.log(`Archivos: ${archivos.length}`)
  for (const f of archivos) {
    const mes = aw.mesDeArchivo(f)
    if (!mes) continue
    const texto = await aw.leerArchivo(f)
    const d = aw.interpretar(texto)
    await prisma.rrssWebHistorico.upsert({ where: { mes }, create: { mes, ...d }, update: d })
    console.log(`${mes.toISOString().slice(0, 7)}  visitas ${d.visitas}  únicos ${d.unicos}  refsFbIg ${d.refsFbIg}  refsGoogle ${d.refsGoogle}`)
  }
}
main().then(() => process.exit(0)).catch(e => { console.error(e.message); process.exit(1) })
