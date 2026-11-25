// Genera el informe RRSS en HTML + PDF (chromium headless, igual que el informe del webinar).
// Uso: DATABASE_URL=... node scripts/rrss-informe-pdf.js [--desde YYYY-MM-DD] [--hasta YYYY-MM-DD] [--salida DIR] [--nombre informe-rrss]
require('dotenv').config()
const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')
const { generarInformeHtml } = require('../src/lib/rrssInforme')

const arg = (k, def) => { const i = process.argv.indexOf('--' + k); return i > -1 ? process.argv[i + 1] : def }

async function main() {
  const salida = arg('salida', process.cwd()).replace(/^~/, process.env.HOME)
  const nombre = arg('nombre', 'informe-rrss')
  const html = await generarInformeHtml({ desde: arg('desde', null), hasta: arg('hasta', null) })
  fs.mkdirSync(salida, { recursive: true })
  const fHtml = path.join(salida, nombre + '.html')
  fs.writeFileSync(fHtml, html)
  const chrome = ['chromium', 'google-chrome-stable', 'chromium-browser'].find(c => { try { execFileSync('which', [c], { stdio: 'ignore' }); return true } catch { return false } })
  let fPdf = null
  if (chrome) {
    fPdf = path.join(salida, nombre + '.pdf')
    execFileSync(chrome, ['--headless', '--disable-gpu', '--no-sandbox', '--no-pdf-header-footer', '--print-to-pdf=' + fPdf, fHtml], { stdio: 'ignore' })
  }
  console.log(`HTML: ${fHtml}${fPdf ? `\nPDF:  ${fPdf}` : '\n(sin chromium: no se generó PDF)'}`)
}
main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1) })
