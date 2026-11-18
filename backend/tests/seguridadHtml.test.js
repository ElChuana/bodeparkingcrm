const { test } = require('node:test')
const assert = require('node:assert')
const { limpiarHtml, escaparHtml, textoAHtml } = require('../src/lib/htmlSeguro')
const { verificarFirmaResend } = require('../src/lib/firmaWebhook')

// ── limpiarHtml: correos entrantes y firmas ─────────────────────────────────

test('limpiarHtml quita scripts, on* y javascript:', () => {
  const sucio = `<p>Hola</p><script>alert(1)</script><img src=x onerror="alert(2)">
    <a href="javascript:alert(3)">clic</a><div onclick="x()">d</div>
    <iframe src="https://evil.test"></iframe><svg onload="alert(4)"></svg>
    <form action="https://evil.test"><input name="clave"></form>`
  const limpio = limpiarHtml(sucio)
  for (const malo of ['<script', 'onerror', 'onclick', 'onload', 'javascript:', '<iframe', '<form', '<input', '<svg', 'alert(1)']) {
    assert.ok(!limpio.toLowerCase().includes(malo), `quedó "${malo}" en: ${limpio}`)
  }
  assert.ok(limpio.includes('<p>Hola</p>'))
})

test('limpiarHtml mantiene el formato normal de un correo y de una firma', () => {
  const firma = '<table cellpadding="0"><tr><td style="color:#0091C3"><b>Juan</b><br>' +
    '<img src="https://bodeparking.cl/logo.png" alt="logo" width="120"></td></tr></table>' +
    '<a href="https://bodeparking.cl">bodeparking.cl</a> · <a href="mailto:a@b.cl">a@b.cl</a>'
  const limpio = limpiarHtml(firma)
  assert.ok(limpio.includes('style="color:#0091C3"'))
  assert.ok(limpio.includes('src="https://bodeparking.cl/logo.png"'))
  assert.ok(limpio.includes('href="https://bodeparking.cl"'))
  assert.ok(limpio.includes('href="mailto:a@b.cl"'))
  assert.ok(limpio.includes('rel="noopener noreferrer"'))
})

test('limpiarHtml acepta vacío y null', () => {
  assert.strictEqual(limpiarHtml(''), '')
  assert.strictEqual(limpiarHtml(null), '')
})

test('escaparHtml y textoAHtml', () => {
  assert.strictEqual(escaparHtml('<b>"Ana" & \'Ty\'</b>'), '&lt;b&gt;&quot;Ana&quot; &amp; &#39;Ty&#39;&lt;/b&gt;')
  assert.strictEqual(textoAHtml('hola\n<script>'), 'hola<br>&lt;script&gt;')
})

// ── Firma Svix de los webhooks de Resend ────────────────────────────────────
// Vector de prueba publicado en la documentación de Svix.
const SECRETO = 'whsec_MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw'
const CUERPO = '{"test": 2432232314}'
const HEADERS = {
  'svix-id': 'msg_p5jXN8AQM9LWM0D4loKWxJek',
  'svix-timestamp': '1614265330',
  'svix-signature': 'v1,g0hM9SsE+OTPJTGt/tmIKtSyZlE3uFJELVlNIOLJ1OE=',
}
const AHORA = 1614265330

test('firma Resend: válida con el vector de Svix', () => {
  const r = verificarFirmaResend({ secretos: [SECRETO], headers: HEADERS, cuerpo: Buffer.from(CUERPO), ahora: AHORA })
  assert.deepStrictEqual(r, { ok: true })
})

test('firma Resend: sirve cualquiera de varios secretos', () => {
  const r = verificarFirmaResend({ secretos: ['whsec_b3Rybw==', SECRETO], headers: HEADERS, cuerpo: CUERPO, ahora: AHORA })
  assert.strictEqual(r.ok, true)
})

test('firma Resend: rechaza cuerpo alterado, secreto ajeno, sin headers y timestamp viejo', () => {
  assert.strictEqual(verificarFirmaResend({ secretos: [SECRETO], headers: HEADERS, cuerpo: '{"test": 1}', ahora: AHORA }).ok, false)
  assert.strictEqual(verificarFirmaResend({ secretos: ['whsec_b3Rybw=='], headers: HEADERS, cuerpo: CUERPO, ahora: AHORA }).ok, false)
  assert.strictEqual(verificarFirmaResend({ secretos: [SECRETO], headers: {}, cuerpo: CUERPO, ahora: AHORA }).ok, false)
  assert.strictEqual(verificarFirmaResend({ secretos: [SECRETO], headers: HEADERS, cuerpo: CUERPO, ahora: AHORA + 3600 }).ok, false)
  assert.strictEqual(verificarFirmaResend({ secretos: [SECRETO], headers: HEADERS, cuerpo: undefined, ahora: AHORA }).ok, false)
})
