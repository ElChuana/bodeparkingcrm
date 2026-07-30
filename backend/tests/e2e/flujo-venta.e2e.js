// E2E del flujo cotización → venta contra un backend real y una BD efímera.
// Uso:  DATABASE_URL=<bd de prueba> API=http://localhost:3999 node tests/e2e/flujo-venta.e2e.js
// Valida el invariante que rompió la venta 123: la cabecera debe cuadrar con las unidades.
const assert = require('node:assert')
const { PrismaClient } = require('@prisma/client')

const API = process.env.API || 'http://localhost:3999'
const prisma = new PrismaClient()
const cerca = (a, b, tol = 0.01) => Math.abs(Number(a) - Number(b)) <= tol

async function api(path, { method = 'GET', token, body } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
    ...(body && { body: JSON.stringify(body) }),
  })
  const txt = await res.text()
  let json; try { json = JSON.parse(txt) } catch { json = txt }
  return { status: res.status, body: json }
}

const pasos = []
const paso = (nombre, fn) => pasos.push({ nombre, fn })

paso('health responde', async () => {
  const r = await api('/api/health')
  assert.strictEqual(r.status, 200)
})

paso('login con credenciales válidas devuelve token', async (ctx) => {
  const r = await api('/api/auth/login', { method: 'POST', body: { email: 'e2e@test.local', password: 'test1234' } })
  assert.strictEqual(r.status, 200, JSON.stringify(r.body))
  assert.ok(r.body.token, 'no vino token')
  ctx.token = r.body.token
})

paso('login con password incorrecta es rechazado', async () => {
  const r = await api('/api/auth/login', { method: 'POST', body: { email: 'e2e@test.local', password: 'incorrecta' } })
  assert.strictEqual(r.status, 401)
})

paso('endpoint protegido sin token devuelve 401', async () => {
  const r = await api('/api/cotizaciones')
  assert.strictEqual(r.status, 401)
})

paso('crear cotización con 2 unidades (109 + 102 = 211 UF)', async (ctx) => {
  const lead = await prisma.lead.findFirst()
  const unidades = await prisma.unidad.findMany({ orderBy: { id: 'asc' } })
  const r = await api('/api/cotizaciones', {
    method: 'POST', token: ctx.token,
    body: {
      leadId: lead.id,
      items: unidades.map(u => ({ unidadId: u.id, precioListaUF: Number(u.precioUF) })),
    },
  })
  assert.strictEqual(r.status, 201, JSON.stringify(r.body))
  assert.ok(cerca(r.body.precioListaUF, 211), `lista=${r.body.precioListaUF}`)
  ctx.cotizacionId = r.body.id
})

paso('aplicar descuento aprobado de 32.586963 UF', async (ctx) => {
  await prisma.cotizacion.update({
    where: { id: ctx.cotizacionId },
    data: { descuentoAprobadoUF: 32.586963 },
  })
})

paso('convertir cotización en venta', async (ctx) => {
  const r = await api(`/api/cotizaciones/${ctx.cotizacionId}/convertir`, {
    method: 'POST', token: ctx.token, body: { conPromesa: true },
  })
  assert.ok([200, 201].includes(r.status), JSON.stringify(r.body))
  ctx.ventaId = r.body.id || r.body.venta?.id
  assert.ok(ctx.ventaId, 'no se obtuvo id de venta')
})

paso('INVARIANTE: la cabecera de la venta cuadra con sus unidades', async (ctx) => {
  const venta = await prisma.venta.findUnique({
    where: { id: ctx.ventaId }, include: { unidades: true },
  })
  assert.strictEqual(venta.unidades.length, 2, 'deben quedar 2 unidades vinculadas')

  // precio final = lista - descuentos
  assert.ok(cerca(venta.precioFinalUF, 178.413037), `final=${venta.precioFinalUF}`)

  // catálogo: suma de precioUF == precioListaUF de la cabecera
  const sumaCatalogo = venta.unidades.reduce((s, u) => s + Number(u.precioUF), 0)
  assert.ok(cerca(venta.precioListaUF, sumaCatalogo), `lista=${venta.precioListaUF} vs catálogo=${sumaCatalogo}`)

  // venta: suma de precioVentaUF == precioFinalUF  ← el descuadre de la venta 123
  const sumaVenta = venta.unidades.reduce((s, u) => s + Number(u.precioVentaUF || 0), 0)
  assert.ok(cerca(venta.precioFinalUF, sumaVenta), `final=${venta.precioFinalUF} vs prorrateo=${sumaVenta}`)
})

paso('las unidades quedaron RESERVADAS y con precio pactado congelado', async (ctx) => {
  const unidades = await prisma.unidad.findMany({ where: { ventaId: ctx.ventaId } })
  for (const u of unidades) {
    assert.strictEqual(u.estado, 'RESERVADO', `unidad ${u.numero} quedó ${u.estado}`)
    assert.ok(u.precioVentaUF != null, `unidad ${u.numero} sin precioVentaUF`)
  }
})

paso('el catálogo NO se tocó al aplicar el descuento', async (ctx) => {
  // El descuento va en la cabecera, nunca bajando unidad.precioUF.
  const unidades = await prisma.unidad.findMany({ where: { ventaId: ctx.ventaId }, orderBy: { id: 'asc' } })
  assert.ok(cerca(unidades[0].precioUF, 109), `precioUF=${unidades[0].precioUF}`)
  assert.ok(cerca(unidades[1].precioUF, 102), `precioUF=${unidades[1].precioUF}`)
})

paso('no se puede cotizar una unidad ya vendida', async (ctx) => {
  const lead = await prisma.lead.findFirst()
  const unidad = await prisma.unidad.findFirst({ where: { ventaId: ctx.ventaId } })
  const cot = await api('/api/cotizaciones', {
    method: 'POST', token: ctx.token,
    body: { leadId: lead.id, items: [{ unidadId: unidad.id, precioListaUF: 109 }] },
  })
  const r = await api(`/api/cotizaciones/${cot.body.id}/convertir`, {
    method: 'POST', token: ctx.token, body: {},
  })
  assert.strictEqual(r.status, 400, `debió rechazar, dio ${r.status}`)
  assert.match(JSON.stringify(r.body), /disponible/i)
})

paso('SEGURIDAD: GET /api/public/leads/:id ya no existe (IDOR cerrado)', async () => {
  // Se eliminó el 2026-07-30: permitía enumerar toda la base de leads (PII) con
  // cualquier API Key de lectura. Si este test falla, alguien lo reintrodujo.
  const key = await prisma.apiKey.create({
    data: { nombre: 'e2e-idor-check', key: 'bp_' + require('crypto').randomBytes(24).toString('hex'), soloEscritura: false },
  })
  const res = await fetch(`${API}/api/public/leads/1`, { headers: { 'X-Api-Key': key.key } })
  assert.strictEqual(res.status, 404, `el endpoint respondió ${res.status}; debería no existir`)
})

;(async () => {
  const ctx = {}
  let ok = 0, fail = 0
  for (const { nombre, fn } of pasos) {
    try { await fn(ctx); console.log(`  ✔ ${nombre}`); ok++ }
    catch (e) { console.log(`  ✘ ${nombre}\n      ${e.message}`); fail++ }
  }
  console.log(`\n  ${ok} pasaron, ${fail} fallaron`)
  await prisma.$disconnect()
  process.exit(fail ? 1 : 0)
})()
