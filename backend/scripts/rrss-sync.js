// Sincroniza Meta Ads → tablas rrss_* a mano. Uso: node scripts/rrss-sync.js [--dias 28] [--hasta YYYY-MM-DD]
// Usa DATABASE_URL del entorno. Para producción: DATABASE_URL="$DATABASE_URL_RAILWAY" node scripts/rrss-sync.js
require('dotenv').config()
const { rrssSyncMeta } = require('../src/jobs/rrssSync')

const arg = (k, def) => { const i = process.argv.indexOf(k); return i > -1 ? process.argv[i + 1] : def }

rrssSyncMeta({ dias: Number(arg('--dias', 28)), hasta: arg('--hasta', null) })
  .then(d => { console.log(JSON.stringify(d, null, 2)); process.exit(0) })
  .catch(e => { console.error(e); process.exit(1) })
