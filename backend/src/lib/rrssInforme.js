// Informe RRSS en HTML listo para imprimir / guardar como PDF (mismo estilo que el informe del webinar).
// Orden (pedido por Juan vía sesión "facebook"): portada → 6 KPIs con semáforo → embudo → tabla por campaña →
// pauta Meta con segmentación → mapa (SVG) → sitio web → salud de leads (lista de perdidos, sin basura).
// Solo datos y explicaciones: sin conclusiones ni recomendaciones escritas por el sistema.
const fs = require('fs')
const path = require('path')
const { etiquetaUbicacion } = require('./rrss')

const clp = (v) => (v == null ? '—' : '$' + Math.round(v).toLocaleString('es-CL'))
const num = (v, d = 0) => (v == null || isNaN(Number(v)) ? '—' : Number(v).toLocaleString('es-CL', { maximumFractionDigits: d, minimumFractionDigits: d }))
const pct = (v) => (v == null ? '—' : `${num(v, 1)}%`)
const horas = (h) => (h == null ? '—' : h < 1 ? `${Math.round(h * 60)} min` : h < 48 ? `${num(h, 1)} h` : `${num(h / 24, 1)} días`)
const fechaL = (s) => { const d = new Date(s + 'T00:00:00Z'); return d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }) }
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))

const SEM = { verde: ['Bien', '#0f9d58'], amarillo: ['Ojo', '#b45309'], rojo: ['Mal', '#b91c1c'], muestra: ['Muestra chica', '#64748b'], null: ['Sin dato', '#98a5b0'] }
const sem = (v) => { const [t, c] = SEM[v] || SEM.null; return `<span class="sem" style="color:${c}">● ${t}</span>` }

function leerGeo() {
  for (const p of ['../../../frontend/public/geo/regiones.json', '../../../frontend/dist/geo/regiones.json']) {
    const f = path.join(__dirname, p)
    if (fs.existsSync(f)) return JSON.parse(fs.readFileSync(f, 'utf8'))
  }
  return null
}

// Mapa SVG: coroplético por región (gasto) + círculos de segmentación. Proyección equirectangular corregida por latitud.
function mapaSvg(mapa, conjuntos) {
  const geo = leerGeo()
  if (!geo) return '<p class="nota">Mapa no disponible (falta geo/regiones.json).</p>'
  const porCod = Object.fromEntries(mapa.regiones.map(r => [Number(r.codigo), r]))
  const conDatos = new Set(mapa.regiones.filter(r => r.gasto || r.leadsCRM || r.ventas).map(r => Number(r.codigo)))
  // bounds: regiones con datos + mínimo Valparaíso→Los Lagos
  let minLat = -43.6, maxLat = -32.0, minLon = -75.5, maxLon = -69.5
  const recorrer = (coords, fn) => Array.isArray(coords[0]) ? coords.forEach(c => recorrer(c, fn)) : fn(coords)
  for (const f of geo.features) if (conDatos.has(f.properties.codregion)) recorrer(f.geometry.coordinates, ([lon, lat]) => { if (lon < -80) return; minLat = Math.min(minLat, lat); maxLat = Math.max(maxLat, lat); minLon = Math.min(minLon, lon); maxLon = Math.max(maxLon, lon) })
  const k = Math.cos(((minLat + maxLat) / 2) * Math.PI / 180)
  const W = 300, H = Math.round(W * ((maxLat - minLat) / ((maxLon - minLon) * k)))
  const px = (lon) => ((lon - minLon) * k / ((maxLon - minLon) * k)) * W
  const py = (lat) => ((maxLat - lat) / (maxLat - minLat)) * H
  const max = Math.max(1, ...mapa.regiones.map(r => r.gasto || 0))
  const escala = ['#e0f2fe', '#a5d8f3', '#5fb8e0', '#0092C0', '#005f80']
  const color = (v) => (!v ? '#f1f5f9' : escala[Math.min(4, Math.floor((v / max) * 5))])
  const poligonos = geo.features.map(f => {
    const r = porCod[f.properties.codregion]
    const anillos = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates
    const d = anillos.map(poly => poly.map(ring => 'M' + ring.filter(([lon]) => lon > -80).map(([lon, lat]) => `${px(lon).toFixed(1)},${py(lat).toFixed(1)}`).join('L') + 'Z').join('')).join('')
    return `<path d="${d}" fill="${color(r?.gasto)}" stroke="#64748b" stroke-width="0.6"><title>${esc(r?.nombre || f.properties.Region)}: ${clp(r?.gasto)} · ${num(r?.leadsMeta)} leads Meta · ${num(r?.leadsCRM)} leads CRM</title></path>`
  }).join('')
  const colores = ['#dc2626', '#d97706', '#7c3aed', '#059669', '#db2777', '#2563eb']
  const activos = conjuntos.filter(c => c.circulos.length && c.campanaEstado === 'ACTIVA')
  const circulos = activos.flatMap((c, i) => c.circulos.map(x => {
    const r = (x.radioKm / 111) / (maxLat - minLat) * H
    return `<circle cx="${px(x.lng).toFixed(1)}" cy="${py(x.lat).toFixed(1)}" r="${Math.max(3, r).toFixed(1)}" fill="${colores[i % colores.length]}" fill-opacity="0.18" stroke="${colores[i % colores.length]}" stroke-width="1.2"/>`
  })).join('')
  const leyenda = activos.map((c, i) => `<span style="color:${colores[i % colores.length]}">● ${esc(c.campana)}: ${c.circulos.map(x => `${esc(x.nombre)} +${Math.round(x.radioKm)} km`).join(', ')}</span>`).join('<br>')
  const filas = mapa.regiones.filter(r => conDatos.has(Number(r.codigo))).sort((a, b) => b.gasto - a.gasto)
    .map(r => `<tr><td>${esc(r.nombre)}</td><td class="n">${clp(r.gasto)}</td><td class="n">${num(r.leadsMeta)}</td><td class="n">${clp(r.cpl)}</td><td class="n">${num(r.leadsCRM)}</td><td class="n">${num(r.cotizados)}</td><td class="n">${num(r.ventas)}</td></tr>`).join('')
  return `<div class="mapa-grid">
    <div><svg viewBox="0 0 ${W} ${H}" width="${W}" height="${Math.min(H, 520)}" style="max-height:520px">${poligonos}${circulos}</svg>
      <div class="nota">Color = gasto en Meta por región (claro → oscuro). Círculos = dónde apunta cada conjunto activo.${mapa.nota ? ' ' + esc(mapa.nota) : ''}</div>
      <div class="nota">${leyenda}</div></div>
    <table><thead><tr><th>Región</th><th class="n">Gasto</th><th class="n">Leads Meta</th><th class="n">CPL</th><th class="n">Leads CRM</th><th class="n">Cotiz.</th><th class="n">Ventas</th></tr></thead><tbody>${filas}</tbody></table>
  </div>`
}

// Barras SVG simples para series (mensual o diaria)
function barrasSvg(data, key, { color = '#0092C0', colorDe = null, alto = 110, etiqueta = (d) => d.label } = {}) {
  if (!data.length) return '<p class="nota">Sin datos.</p>'
  const W = 700, H = alto, pad = 18
  const max = Math.max(1, ...data.map(d => d[key] || 0))
  const bw = (W - pad) / data.length
  const barras = data.map((d, i) => {
    const h = ((d[key] || 0) / max) * (H - 28)
    const x = pad + i * bw
    const c = colorDe ? colorDe(d) : color
    return `<rect x="${(x + bw * 0.12).toFixed(1)}" y="${(H - 16 - h).toFixed(1)}" width="${(bw * 0.76).toFixed(1)}" height="${h.toFixed(1)}" fill="${c}" rx="2"/>
      ${data.length <= 20 ? `<text x="${(x + bw / 2).toFixed(1)}" y="${(H - 18 - h).toFixed(1)}" font-size="7" text-anchor="middle" fill="#3D3D3D">${num(d[key])}</text>` : ''}
      ${(data.length <= 20 || i % Math.ceil(data.length / 12) === 0) ? `<text x="${(x + bw / 2).toFixed(1)}" y="${H - 4}" font-size="7" text-anchor="middle" fill="#5b6873">${esc(etiqueta(d))}</text>` : ''}`
  }).join('')
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}">${barras}</svg>`
}

const kpiHtml = ({ titulo, valor, sub, semaforo, umbral }) => `<div class="kpi">
  <div class="val">${valor}</div><div class="lbl">${esc(titulo)}</div>
  <div class="note">${esc(sub || '')}</div>
  ${semaforo !== undefined ? `<div class="note">${sem(semaforo)}</div>` : ''}
  ${umbral ? `<div class="que">${esc(umbral.queEs)} <b>Bien:</b> ${esc(umbral.cuantoEstaBien)}</div>` : ''}
</div>`

async function generarInformeHtml(query = {}) {
  const c = require('../controllers/rrssController')
  const [inf, mapa, webD, perd, conjuntos] = await Promise.all([
    c.datosInforme(query), c.datosMapa(query), c.datosWeb(query), c.datosLeadsPerdidos(query), c.obtenerSegmentacion().catch(() => []),
  ])
  const t = inf.totales
  const u = (k) => inf.umbrales.find(x => x.clave === k)
  const uw = (k) => webD.umbrales.find(x => x.clave === k)
  const periodo = `${fechaL(inf.periodo.desde)} – ${fechaL(inf.periodo.hasta)}`

  // Embudo
  const pasos = [
    ['Impresiones', t.impresiones, 'Veces que se mostró el anuncio'], ['Clics en el enlace', t.clicsEnlace, 'Entraron al formulario'],
    ['Leads en Meta', t.leadsMeta, 'Dejaron sus datos'], ['Leads en el CRM', t.leadsCRM, 'Llegaron al CRM (campañas vinculadas)'],
    ['Contactados', t.contactados, 'Con al menos una gestión del vendedor'], ['Cotizados', t.cotizados, 'Recibieron cotización'],
    ['Visita presencial', t.visitasRealizadas, 'Fueron a ver la unidad'], ['Ventas', t.ventas, `${num(t.ufVendidas, 1)} UF`],
  ]
  const maxP = Math.max(1, ...pasos.map(p => p[1] || 0))
  const embudo = pasos.map((p, i) => {
    const prev = i ? pasos[i - 1][1] : null
    const w = p[1] > 0 ? Math.max(4, Math.log10(p[1] + 1) / Math.log10(maxP + 1) * 100) : 0
    return `<div class="fe"><div class="et">${p[0]}<div class="nota">${p[2]}</div></div><div class="barra"><span style="width:${w.toFixed(1)}%"></span></div><div class="ci"><b>${num(p[1])}</b>${prev ? `<br>${pct(prev ? p[1] / prev * 100 : null)} del anterior` : ''}</div></div>`
  }).join('')

  // Tabla por campaña
  const estadoL = { ACTIVA: 'Activa', FINALIZADA: 'Finalizada', PAUSADA: 'Pausada' }
  const filasC = inf.campanas.map(r => `<tr>
    <td><b>${esc(r.nombreMeta)}</b><div class="nota">${estadoL[r.estado] || ''}${r.nombreCRM ? (r.nombreCRM.trim().toLowerCase() === r.nombreMeta.trim().toLowerCase() ? ' · vinculada ✓' : ` · CRM: ${esc(r.nombreCRM)}`) : ' · sin campaña del CRM'}</div></td>
    <td class="n">${clp(r.gasto)}</td><td class="n">${num(r.leadsMeta)}</td><td class="n">${clp(r.cpl)} ${sem(r.semaforos.CPL)}</td>
    <td class="n">${r.campanaId ? num(r.leadsCRM) : '—'}</td>
    <td class="n">${r.campanaId ? `${num(r.cotizados)} · ${pct(r.tasaLeadCotizacion)} ${sem(r.semaforos.TASA_LEAD_COTIZACION)}` : '—'}</td>
    <td class="n">${clp(r.costoCotizacion)} ${sem(r.semaforos.COSTO_COTIZACION)}</td>
    <td class="n">${r.campanaId ? num(r.visitasRealizadas) : '—'}</td><td class="n">${r.campanaId ? num(r.ventas) : '—'}</td>
    <td class="n">${horas(r.horasPrimerContactoMediana)} ${sem(r.semaforos.TIEMPO_PRIMER_CONTACTO)}</td>
    <td class="n">${pct(r.pctSinGestion48h)} ${sem(r.semaforos.LEADS_SIN_GESTION_48H)}</td>
  </tr>`).join('')

  // Pauta: ubicación, edad, segmentación
  const ubic = inf.desgloses.UBICACION.slice(0, 8)
  const totalUb = ubic.reduce((a, d) => a + d.gasto, 0) || 1
  const filasUb = ubic.map(d => `<tr><td>${esc(etiquetaUbicacion(d.clave))}</td><td class="n">${clp(d.gasto)}</td><td class="n">${pct(d.gasto / totalUb * 100)}</td><td class="n">${num(d.leads)}</td><td class="n">${clp(d.cpl)}</td></tr>`).join('')
  const edades = {}
  for (const d of inf.desgloses.EDAD_GENERO) { const [e] = d.clave.split('|'); const o = edades[e] ||= { e, imp: 0, leads: 0, gasto: 0 }; o.imp += d.impresiones; o.leads += d.leads; o.gasto += d.gasto }
  const totImp = Object.values(edades).reduce((a, o) => a + o.imp, 0) || 1
  const filasEd = Object.values(edades).sort((a, b) => a.e.localeCompare(b.e)).map(o => `<tr><td>${esc(o.e)} años</td><td class="n">${num(o.imp)}</td><td class="n">${pct(o.imp / totImp * 100)}</td><td class="n">${num(o.leads)}</td><td class="n">${clp(o.leads ? o.gasto / o.leads : null)}</td></tr>`).join('')
  const activos = conjuntos.filter(c => c.campanaEstado === 'ACTIVA')
  const filasSeg = (activos.length ? activos : conjuntos.slice(0, 8)).map(c => `<tr><td><b>${esc(c.campana)}</b><div class="nota">${esc(c.nombre)}</div></td>
    <td>${esc([...c.circulos.map(x => `${x.nombre} +${Math.round(x.radioKm)} km`), ...c.regiones, ...c.ciudadesSinCoord].join(', ') || '—')}</td>
    <td class="n">${c.edadMin}–${c.edadMax}</td><td>${c.generos ? (c.generos.includes(1) && !c.generos.includes(2) ? 'Hombres' : c.generos.includes(2) && !c.generos.includes(1) ? 'Mujeres' : 'Todos') : 'Todos'}</td>
    <td>${c.advantagePlus ? 'Sí (Meta amplía la audiencia por su cuenta)' : 'No'}</td><td>${esc(c.intereses.slice(0, 6).join(', ') || '—')}</td></tr>`).join('')
  const serieDia = inf.serie.map(s => ({ ...s, label: fechaL(s.fecha).replace(/ de \d{4}$/, '') }))

  // Sitio web
  const g = webD.ga4.totales, cl = webD.clarity
  const hist = webD.historico.map(h => ({ ...h, label: h.mes.slice(5) + '/' + h.mes.slice(2, 4) }))
  const filasHist = webD.historico.map(h => `<tr><td>${h.mes}</td><td>${h.fuente === 'ga4' ? 'GA4' : 'AWStats (aprox.)'}</td><td class="n">${num(h.visitas)}</td><td class="n">${num(h.unicos)}</td><td class="n">${num(h.refsFbIg)}</td><td class="n">${num(h.refsGoogle)}</td></tr>`).join('')

  // Salud
  const filasPerd = perd.perdidos.map(p => `<tr><td>${esc(new Date(p.creadoMeta).toLocaleString('es-CL', { timeZone: 'America/Santiago', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }))}</td><td>${esc(p.nombre)}</td><td>${esc(p.telefono)}</td><td>${esc(p.email)}</td><td>${esc(p.campana)}</td><td>${p.plataforma === 'ig' ? 'Instagram' : p.plataforma === 'fb' ? 'Facebook' : esc(p.plataforma || '')}</td></tr>`).join('')

  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Informe RRSS · BodeParking · ${esc(periodo)}</title>
<style>
  :root{--marca:#0091C3;--marca-dark:#00719a;--gris:#3D3D3D;--texto:#1b2227;--texto-2:#5b6873;--borde:#dfe6ec}
  @page{size:letter;margin:11mm 10mm}
  *{box-sizing:border-box}
  body{margin:0;background:#fff;color:var(--texto);font-size:9.5pt;line-height:1.35;font-family:"Open Sans",-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .pagina{max-width:1000px;margin:0 auto;padding:12px}
  header.top{border-left:5px solid var(--marca);padding:2px 0 2px 14px;margin-bottom:12px}
  header.top h1{margin:0 0 3px;font-size:16.5pt;letter-spacing:-.01em}
  header.top .sub{color:var(--texto-2);margin:0;font-size:8.5pt}
  .kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-bottom:12px}
  .kpi{border:1px solid var(--borde);border-radius:8px;padding:7px 9px}
  .kpi .val{font-size:15pt;font-weight:700;line-height:1.05;color:var(--marca);font-variant-numeric:tabular-nums}
  .kpi .lbl{font-size:6.6pt;text-transform:uppercase;letter-spacing:.04em;color:var(--texto-2);margin-top:2px;font-weight:700}
  .kpi .note{font-size:7.2pt;color:var(--texto-2)} .kpi .que{font-size:7pt;color:var(--texto-2);margin-top:3px;border-top:1px dashed var(--borde);padding-top:3px}
  .sem{font-size:7.5pt;font-weight:700;white-space:nowrap}
  h2{font-size:9pt;margin:15px 0 4px;text-transform:uppercase;letter-spacing:.04em;color:var(--gris);break-after:avoid}
  h2 .hint{float:right;font-size:7.5pt;text-transform:none;letter-spacing:0;color:var(--texto-2);font-weight:400}
  .embudo{border:1px solid var(--borde);border-radius:8px;padding:10px 12px;margin-bottom:4px}
  .fe{display:grid;grid-template-columns:150px 1fr 120px;gap:9px;align-items:center;margin-bottom:6px}
  .fe .et{font-size:8.5pt;font-weight:600}
  .barra{background:#eef2f5;border-radius:5px;height:15px;overflow:hidden}
  .barra span{display:block;height:100%;background:linear-gradient(90deg,var(--marca),var(--marca-dark))}
  .fe .ci{text-align:right;font-variant-numeric:tabular-nums;font-size:8pt;color:var(--texto-2)} .fe .ci b{color:var(--texto);font-size:9.5pt}
  table{width:100%;border-collapse:collapse;font-size:8pt;margin-bottom:6px}
  thead{display:table-header-group}
  th{text-align:left;background:#f4f7f9;padding:4px 6px;font-size:6.8pt;text-transform:uppercase;letter-spacing:.03em;color:var(--texto-2);border-top:2px solid var(--borde);border-bottom:1px solid var(--borde)}
  td{padding:4px 6px;border-bottom:1px solid #eef2f5;vertical-align:top}
  tr{break-inside:avoid} .n{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap} th.n{text-align:right}
  .nota{font-size:7.5pt;color:var(--texto-2)}
  .dos{display:grid;grid-template-columns:1fr 1fr;gap:12px} .mapa-grid{display:grid;grid-template-columns:320px 1fr;gap:14px;align-items:start}
  .seccion{break-inside:avoid-page}
  table.camp th:first-child,table.camp td:first-child{width:230px} table.camp{font-size:7.6pt}
  .btn{position:fixed;top:10px;right:10px;background:var(--marca);color:#fff;border:0;border-radius:6px;padding:8px 14px;font-size:10pt;cursor:pointer}
  @media print{.btn{display:none}}
</style></head><body><div class="pagina">
<button class="btn" onclick="window.print()">Imprimir / guardar PDF</button>
<header class="top"><h1>Informe RRSS · Marketing digital BodeParking</h1>
<p class="sub">Período ${esc(periodo)} · Datos de Meta actualizados ${inf.ultimoSync ? esc(new Date(inf.ultimoSync).toLocaleString('es-CL', { timeZone: 'America/Santiago' })) : '—'} · UF ${clp(t.ufValor)} · Generado ${esc(new Date().toLocaleString('es-CL', { timeZone: 'America/Santiago' }))}</p>
<p class="sub">Cada indicador trae qué es y cuánto está bien. Los semáforos usan los umbrales configurados en el CRM; "Muestra chica" = pocos casos para juzgar.</p></header>

<h2>1. Resumen</h2>
<div class="kpis">
${kpiHtml({ titulo: 'Gasto en pauta', valor: clp(t.gasto), sub: t.alcance ? `${num(t.alcance)} personas alcanzadas · ${num(t.frecuenciaPeriodo, 1)} veces cada una` : `${num(t.impresiones)} impresiones` })}
${kpiHtml({ titulo: 'Leads de Meta', valor: num(t.leadsMeta), sub: `${num(t.leadsCRM)} llegaron al CRM · ${num(t.leadsPerdidosEntrega)} no llegaron` })}
${kpiHtml({ titulo: 'Costo por lead', valor: clp(t.cpl), sub: 'Gasto ÷ leads de Meta', semaforo: t.semaforos.CPL, umbral: u('CPL') })}
${kpiHtml({ titulo: 'Costo por cotización ★', valor: clp(t.costoCotizacion), sub: `${num(t.cotizados)} cotizaciones · ${pct(t.tasaLeadCotizacion)} de los leads`, semaforo: t.semaforos.COSTO_COTIZACION, umbral: u('COSTO_COTIZACION') })}
${kpiHtml({ titulo: 'Costo por venta (CAC)', valor: clp(t.cac), sub: `${num(t.ventas)} ventas · ${num(t.ufVendidas, 1)} UF`, semaforo: t.semaforos.CAC, umbral: u('CAC') })}
${kpiHtml({ titulo: 'Retorno de la pauta (ROAS)', valor: t.roas == null ? '—' : `${num(t.roas, 1)}×`, sub: `${clp(t.pesosVendidos)} vendidos`, semaforo: t.semaforos.ROAS, umbral: u('ROAS') })}
</div>

<h2>2. Embudo del período <span class="hint">barras en escala logarítmica para que se vean los pasos chicos</span></h2>
<div class="embudo">${embudo}</div>
<div class="kpis" style="grid-template-columns:repeat(4,1fr);margin-top:8px">
${kpiHtml({ titulo: 'CTR de enlace', valor: pct(t.ctrEnlace), semaforo: t.semaforos.CTR_ENLACE, umbral: u('CTR_ENLACE') })}
${kpiHtml({ titulo: 'Conversión del formulario', valor: pct(t.convFormulario), semaforo: t.semaforos.CONV_FORMULARIO, umbral: u('CONV_FORMULARIO') })}
${kpiHtml({ titulo: 'Lead → cotización', valor: pct(t.tasaLeadCotizacion), semaforo: t.semaforos.TASA_LEAD_COTIZACION, umbral: u('TASA_LEAD_COTIZACION') })}
${kpiHtml({ titulo: 'Cotización → visita', valor: pct(t.tasaCotizacionVisita), semaforo: t.semaforos.TASA_COTIZACION_VISITA, umbral: u('TASA_COTIZACION_VISITA') })}
</div>

<h2>3. Por campaña</h2>
<table class="camp"><thead><tr><th>Campaña</th><th class="n">Gasto</th><th class="n">Leads Meta</th><th class="n">CPL</th><th class="n">Leads CRM</th><th class="n">Cotizaron</th><th class="n">Costo / cotización</th><th class="n">Visitas</th><th class="n">Ventas</th><th class="n">1er contacto</th><th class="n">Sin gestión 48 h</th></tr></thead>
<tbody>${filasC || '<tr><td colspan="11">Sin campañas con datos en el período</td></tr>'}</tbody></table>
<p class="nota">Leads CRM, cotizaciones, visitas y ventas solo se calculan para campañas vinculadas a una campaña del CRM. "1er contacto" = mediana de horas entre la llegada del lead y la primera gestión del vendedor. "Sin gestión 48 h" = leads con más de 48 h sin ninguna gestión.</p>

<h2>4. Pauta Meta</h2>
<div class="seccion"><p class="nota" style="margin:0 0 2px">Gasto por día (pesos)</p>${barrasSvg(serieDia, 'gasto', { alto: 100, etiqueta: (d) => d.label })}</div>
<div class="dos">
  <div><p class="nota"><b>Dónde se mostró</b> · ${esc(u('PCT_AUDIENCE_NETWORK')?.queEs || '')} <b>Bien:</b> ${esc(u('PCT_AUDIENCE_NETWORK')?.cuantoEstaBien || '')} Hoy: ${pct(t.pctAudienceNetwork)} ${sem(t.semaforos.PCT_AUDIENCE_NETWORK)}</p>
  <table><thead><tr><th>Ubicación</th><th class="n">Gasto</th><th class="n">% gasto</th><th class="n">Leads</th><th class="n">CPL</th></tr></thead><tbody>${filasUb}</tbody></table></div>
  <div><p class="nota"><b>A quién se mostró</b> · ${esc(u('PCT_LEADS_65')?.queEs || '')} ${esc(u('PCT_LEADS_65')?.cuantoEstaBien || '')}</p>
  <table><thead><tr><th>Edad</th><th class="n">Impresiones</th><th class="n">% impresiones</th><th class="n">Leads</th><th class="n">CPL</th></tr></thead><tbody>${filasEd}</tbody></table></div>
</div>
<p class="nota" style="margin:6px 0 2px"><b>Segmentación configurada</b> (${activos.length ? 'conjuntos activos' : 'últimos conjuntos'})</p>
<table><thead><tr><th>Campaña · conjunto</th><th>Dónde</th><th class="n">Edad</th><th>Género</th><th>Advantage+</th><th>Intereses</th></tr></thead><tbody>${filasSeg || '<tr><td colspan="6">Sin acceso a la segmentación</td></tr>'}</tbody></table>
<p class="nota">Frecuencia del período: ${num(t.frecuenciaPeriodo, 2)} veces por persona. ${esc(u('FRECUENCIA_30D')?.queEs || '')} <b>Bien:</b> ${esc(u('FRECUENCIA_30D')?.cuantoEstaBien || '')}</p>

<h2>5. Mapa <span class="hint">gasto, leads y ventas por región</span></h2>
<div class="seccion">${mapaSvg(mapa, conjuntos)}</div>
<p class="nota">Gasto y leads Meta: desglose por región de Meta. Leads y ventas del CRM: por el edificio de interés; si el lead no tiene uno, por la región a la que apunta la pauta de su campaña.${mapa.sinRegion?.gasto ? ` Fuera del mapa (región desconocida): ${clp(mapa.sinRegion.gasto)}.` : ''}</p>

<h2>6. Sitio web</h2>
<div class="kpis" style="grid-template-columns:repeat(4,1fr)">
${kpiHtml({ titulo: 'Sesiones (GA4)', valor: num(g.sesiones), sub: `${num(g.usuarios)} usuarios · ${num(g.nuevosUsuarios)} nuevos` })}
${kpiHtml({ titulo: 'Conversión del sitio', valor: pct(g.webConversion), sub: `${num(g.leadsWeb)} formularios enviados`, semaforo: webD.semaforos.WEB_CONVERSION, umbral: uw('WEB_CONVERSION') })}
${kpiHtml({ titulo: 'Abandono del formulario', valor: pct(g.abandonoForm), sub: `${num(g.eventos.form_start)} lo empezaron`, semaforo: webD.semaforos.WEB_ABANDONO_FORM, umbral: uw('WEB_ABANDONO_FORM') })}
${kpiHtml({ titulo: 'Sesiones con rage clicks', valor: pct(cl?.ultimo?.rageClicksPct), sub: cl ? `Clarity, foto del ${esc(fechaL(cl.ultimo.fecha))} · ${num(cl.ultimo.sesiones)} sesiones reales, ${num(cl.ultimo.bots)} bots` : 'Clarity sin datos', semaforo: webD.semaforos.CLARITY_RAGE, umbral: uw('CLARITY_RAGE') })}
</div>
${g.sesiones === 0 && webD.ga4Configurado ? '<p class="nota">GA4 se instaló el 25-nov-2026; Google tarda 24–48 h en procesar las primeras sesiones.</p>' : ''}
<div class="seccion"><p class="nota" style="margin:8px 0 2px"><b>Visitas al sitio por mes</b> · gris: histórico aproximado (AWStats, cuela bots) · azul: GA4 exacto desde nov-2026. Hitos: ${webD.hitos.map(h => `${h.mes} ${esc(h.texto)}`).join(' · ')}</p>
${barrasSvg(hist, 'visitas', { colorDe: (d) => d.fuente === 'ga4' ? '#0092C0' : '#cbd5e1', alto: 120 })}</div>
<table><thead><tr><th>Mes</th><th>Fuente</th><th class="n">Visitas</th><th class="n">Únicos</th><th class="n">Referidos FB/IG</th><th class="n">Referidos Google</th></tr></thead><tbody>${filasHist}</tbody></table>
${webD.ga4.fuentes.length ? `<div class="dos"><div><p class="nota"><b>De dónde llegan (GA4)</b></p><table><thead><tr><th>Fuente / medio</th><th class="n">Sesiones</th><th class="n">Usuarios</th></tr></thead><tbody>${webD.ga4.fuentes.map(f => `<tr><td>${esc(f.clave)}</td><td class="n">${num(f.sesiones)}</td><td class="n">${num(f.usuarios)}</td></tr>`).join('')}</tbody></table></div>
<div><p class="nota"><b>Páginas más vistas (GA4)</b></p><table><thead><tr><th>Página</th><th class="n">Vistas</th><th class="n">Sesiones</th></tr></thead><tbody>${webD.ga4.paginas.map(f => `<tr><td>${esc(f.clave)}</td><td class="n">${num(f.vistas)}</td><td class="n">${num(f.sesiones)}</td></tr>`).join('')}</tbody></table></div></div>` : ''}

<h2>7. Salud de los leads</h2>
<div class="kpis">
${kpiHtml({ titulo: 'Tiempo al primer contacto (mediana)', valor: horas(t.horasPrimerContactoMediana), sub: 'Desde que entra el lead hasta la 1ª gestión', semaforo: t.semaforos.TIEMPO_PRIMER_CONTACTO, umbral: u('TIEMPO_PRIMER_CONTACTO') })}
${kpiHtml({ titulo: 'Leads sin gestión a 48 h', valor: pct(t.pctSinGestion48h), sub: `${num(t.sinGestion48h)} de ${num(t.con48h)} leads con más de 48 h`, semaforo: t.semaforos.LEADS_SIN_GESTION_48H, umbral: u('LEADS_SIN_GESTION_48H') })}
${kpiHtml({ titulo: 'Leads perdidos en la entrega', valor: num(t.leadsPerdidosEntrega), sub: `${pct(t.pctLeadsPerdidos)} de los leads de Meta no llegaron al CRM`, semaforo: t.semaforos.LEADS_PERDIDOS_ENTREGA, umbral: u('LEADS_PERDIDOS_ENTREGA') })}
</div>
<p class="nota"><b>Leads que Meta registró pero no están en el CRM</b> (sin contar los de las últimas ${perd.graciaHoras} h ni los formularios de relleno)</p>
<table><thead><tr><th>Fecha</th><th>Nombre</th><th>Teléfono</th><th>Email</th><th>Campaña</th><th>Plataforma</th></tr></thead><tbody>${filasPerd || '<tr><td colspan="6">Todos los leads de Meta del período están en el CRM</td></tr>'}</tbody></table>
</div></body></html>`
}

module.exports = { generarInformeHtml }
