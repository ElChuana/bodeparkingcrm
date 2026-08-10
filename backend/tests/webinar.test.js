const { test } = require('node:test')
const assert = require('node:assert')
const {
  splitNombre, normalizarTelefono, parsearFechaHoraCita, detectarEnlaceReunion,
  tipoVisita, clasificarEstado, etapaTrasAgendar, esFrio,
} = require('../src/lib/webinar')
const { redactarUrl } = require('../src/middleware/logIntegraciones')

// Utilidades del webhook del webinar (/api/public/webhooks/webinar).
// Los payloads de ejemplo son los que manda el proveedor de verdad
// (ver logs_integraciones del 10-ago-2026).

// ─── Nombre ───────────────────────────────────────────────────────
test('splitNombre: nombre + apellidos', () => {
  assert.deepStrictEqual(splitNombre('María González Pérez'), { nombre: 'María', apellido: 'González Pérez' })
})

test('splitNombre: formato "Apellido, Nombre" (Calendly/Google)', () => {
  // Antes devolvía { nombre: "Prueba,", apellido: "Camilo. Reyes" } — con la coma pegada
  assert.deepStrictEqual(splitNombre('Reyes, Camilo'), { nombre: 'Camilo', apellido: 'Reyes' })
  assert.deepStrictEqual(splitNombre('González Pérez, María'), { nombre: 'María', apellido: 'González Pérez' })
})

test('splitNombre: un solo nombre y vacío', () => {
  assert.deepStrictEqual(splitNombre('Camilo'), { nombre: 'Camilo', apellido: '' })
  assert.deepStrictEqual(splitNombre('   '), { nombre: '', apellido: '' })
})

// ─── Teléfono ─────────────────────────────────────────────────────
test('normalizarTelefono: el mismo número en distintos formatos coincide', () => {
  // El proveedor manda "9 7641 7336" al agendar y "+56976417336" en el formulario
  const esperado = '976417336'
  assert.strictEqual(normalizarTelefono('9 7641 7336'), esperado)
  assert.strictEqual(normalizarTelefono('+56976417336'), esperado)
  assert.strictEqual(normalizarTelefono('56 9 7641 7336'), esperado)
  assert.strictEqual(normalizarTelefono('(9) 7641-7336'), esperado)
})

test('normalizarTelefono: basura → null', () => {
  assert.strictEqual(normalizarTelefono(''), null)
  assert.strictEqual(normalizarTelefono(null), null)
  assert.strictEqual(normalizarTelefono('123'), null)
})

// ─── Fecha/hora ───────────────────────────────────────────────────
// Todas se interpretan como hora de CHILE y el resultado es un instante UTC fijo,
// independiente de la zona horaria del proceso.
test('parsearFechaHoraCita: ISO 8601 (la etiqueta de zona se ignora)', () => {
  const d = parsearFechaHoraCita({ inicio: '2026-08-24T08:30:00Z' })
  assert.strictEqual(d.toISOString(), '2026-08-24T12:30:00.000Z') // 08:30 Chile (UTC-4)
})

test('parsearFechaHoraCita: texto en inglés con AM/PM (payload real del proveedor)', () => {
  const d = parsearFechaHoraCita({ inicio: 'Monday, August 24, 2026 8:30 AM' })
  assert.strictEqual(d.toISOString(), '2026-08-24T12:30:00.000Z')
})

test('parsearFechaHoraCita: PM se convierte a 24h', () => {
  const d = parsearFechaHoraCita({ inicio: 'Monday, August 24, 2026 3:00 PM' })
  assert.strictEqual(d.toISOString(), '2026-08-24T19:00:00.000Z') // 15:00 Chile
})

test('parsearFechaHoraCita: 12 AM y 12 PM', () => {
  assert.strictEqual(parsearFechaHoraCita({ inicio: 'August 24, 2026 12:00 AM' }).toISOString(), '2026-08-24T04:00:00.000Z')
  assert.strictEqual(parsearFechaHoraCita({ inicio: 'August 24, 2026 12:00 PM' }).toISOString(), '2026-08-24T16:00:00.000Z')
})

test('parsearFechaHoraCita: texto en español', () => {
  const d = parsearFechaHoraCita({ inicio: '24 de agosto de 2026, 8:30' })
  assert.strictEqual(d.toISOString(), '2026-08-24T12:30:00.000Z')
})

test('parsearFechaHoraCita: numérico DD/MM/YYYY con hora', () => {
  const d = parsearFechaHoraCita({ inicio: '24/08/2026 08:30' })
  assert.strictEqual(d.toISOString(), '2026-08-24T12:30:00.000Z')
})

test('parsearFechaHoraCita: campos separados fecha + hora', () => {
  const d = parsearFechaHoraCita({ fecha: '24/08/2026', hora: '08:30' })
  assert.strictEqual(d.toISOString(), '2026-08-24T12:30:00.000Z')
})

test('parsearFechaHoraCita: verano chileno (UTC-3)', () => {
  const d = parsearFechaHoraCita({ inicio: 'January 15, 2026 10:00 AM' })
  assert.strictEqual(d.toISOString(), '2026-01-15T13:00:00.000Z')
})

test('parsearFechaHoraCita: no depende de la TZ del proceso', () => {
  // El bug anterior: el fallback usaba new Date(texto), que interpreta el texto
  // en la zona del servidor. En Railway (UTC) salía bien; en cualquier otra, corrido.
  const tzPrevia = process.env.TZ
  const resultados = ['UTC', 'America/Santiago', 'Asia/Tokyo'].map(tz => {
    process.env.TZ = tz
    return parsearFechaHoraCita({ inicio: 'Monday, August 24, 2026 8:30 AM' }).toISOString()
  })
  process.env.TZ = tzPrevia
  assert.deepStrictEqual(resultados, Array(3).fill('2026-08-24T12:30:00.000Z'))
})

test('parsearFechaHoraCita: sin fecha usable → null', () => {
  assert.strictEqual(parsearFechaHoraCita({}), null)
  assert.strictEqual(parsearFechaHoraCita({ inicio: 'cuando se pueda' }), null)
  assert.strictEqual(parsearFechaHoraCita({ fecha: '24/08/2026' }), null) // sin hora
})

// ─── Enlace ───────────────────────────────────────────────────────
test('detectarEnlaceReunion: campo conocido', () => {
  assert.strictEqual(
    detectarEnlaceReunion({ enlace: 'https://meet.google.com/wgh-vnqz-ckd' }),
    'https://meet.google.com/wgh-vnqz-ckd'
  )
})

test('detectarEnlaceReunion: URL de videollamada anidada en el payload', () => {
  const body = { evento: { detalle: { conferencia: 'https://zoom.us/j/123456' } }, web: 'https://bodeparking.cl' }
  assert.strictEqual(detectarEnlaceReunion(body), 'https://zoom.us/j/123456')
})

test('detectarEnlaceReunion: sin videollamada → null', () => {
  assert.strictEqual(detectarEnlaceReunion({ web: 'https://bodeparking.cl' }), null)
})

// ─── Tipo de visita (enum de Prisma) ──────────────────────────────
test('tipoVisita: el default es un valor válido del enum', () => {
  // El bug: se mandaba 'Reunión comercial' (el @map de la BD) y Prisma lo rechazaba
  // → PrismaClientValidationError → 500 en TODA agenda del webinar.
  const VALIDOS = ['presencial', 'virtual', 'reunion_comercial']
  assert.ok(VALIDOS.includes(tipoVisita(undefined)))
  assert.strictEqual(tipoVisita(undefined), 'reunion_comercial')
  assert.strictEqual(tipoVisita('Reunión comercial'), 'reunion_comercial')
  assert.strictEqual(tipoVisita('presencial'), 'presencial')
  assert.strictEqual(tipoVisita('online'), 'virtual')
  assert.strictEqual(tipoVisita('cualquier cosa'), 'reunion_comercial')
})

test('tipoVisita: coincide con el enum real de Prisma', () => {
  const { TipoVisita } = require('@prisma/client')
  for (const entrada of [undefined, 'presencial', 'virtual', 'Reunión comercial', 'basura']) {
    assert.ok(Object.values(TipoVisita).includes(tipoVisita(entrada)), `${entrada} → valor inválido`)
  }
})

// ─── Enrutado por estado ──────────────────────────────────────────
test('clasificarEstado: los dos eventos del contrato', () => {
  assert.strictEqual(clasificarEstado('agenda'), 'agenda')
  assert.strictEqual(clasificarEstado('formulario-rellenado'), 'formulario')
})

test('clasificarEstado: cancelaciones no caen en "formulario"', () => {
  // Antes una cancelación dejaba la cita viva en el calendario
  assert.strictEqual(clasificarEstado('cancela'), 'cancela')
  assert.strictEqual(clasificarEstado('cancelada'), 'cancela')
  assert.strictEqual(clasificarEstado('invitee.canceled'), 'cancela')
})

test('clasificarEstado: desconocido → formulario (comportamiento previo)', () => {
  assert.strictEqual(clasificarEstado(''), 'formulario')
  assert.strictEqual(clasificarEstado(undefined), 'formulario')
  assert.strictEqual(clasificarEstado('otra cosa'), 'formulario')
})

// ─── Etapas ───────────────────────────────────────────────────────
test('etapaTrasAgendar: un lead temprano avanza a VISITA_AGENDADA', () => {
  for (const e of ['NUEVO', 'REACTIVADO', 'NO_CONTESTA', 'SEGUIMIENTO', 'COTIZACION_ENVIADA', 'INTERESADO']) {
    assert.strictEqual(etapaTrasAgendar(e), 'VISITA_AGENDADA', e)
  }
})

test('etapaTrasAgendar: un lead avanzado NO retrocede', () => {
  // Bug: quien ya estaba en RESERVA/PROMESA/ESCRITURA volvía a VISITA_AGENDADA
  for (const e of ['VISITA_REALIZADA', 'NEGOCIACION', 'RESERVA', 'PROMESA', 'ESCRITURA', 'ENTREGA', 'POSTVENTA']) {
    assert.strictEqual(etapaTrasAgendar(e), e)
  }
})

test('etapaTrasAgendar: PERDIDO sí se mueve (agendar es señal de que revivió)', () => {
  assert.strictEqual(etapaTrasAgendar('PERDIDO'), 'VISITA_AGENDADA')
})

test('esFrio: solo PERDIDO y NO_CONTESTA', () => {
  assert.ok(esFrio('PERDIDO'))
  assert.ok(esFrio('NO_CONTESTA'))
  assert.ok(!esFrio('NUEVO'))
  assert.ok(!esFrio('NEGOCIACION'))
})

// ─── Log de integraciones ─────────────────────────────────────────
test('redactarUrl: la API Key no queda en texto plano en el log', () => {
  assert.strictEqual(
    redactarUrl('/api/public/leads?api_key=bp_abc123&origen=web'),
    '/api/public/leads?api_key=***&origen=web'
  )
  assert.strictEqual(redactarUrl('/api/public/disponibilidad?tipo=BODEGA'), '/api/public/disponibilidad?tipo=BODEGA')
  assert.strictEqual(redactarUrl('/api/public/webhooks/webinar'), '/api/public/webhooks/webinar')
})
