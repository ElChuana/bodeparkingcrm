// Utilidades puras del webhook del webinar (/api/public/webhooks/webinar).
// Viven acá —y no en el controller— para poder testearlas sin BD (tests/webinar.test.js).

const { desdeHoraChile } = require('./fechaChile')

// ─── Nombre ───────────────────────────────────────────────────────
// "María González Pérez"  → { nombre: "María",  apellido: "González Pérez" }
// "González Pérez, María" → { nombre: "María",  apellido: "González Pérez" }
//   (Calendly/Google mandan a veces "Apellido, Nombre"; sin esto el apellido
//    quedaba como nombre y con la coma pegada)
function splitNombre(completo) {
  const limpio = (completo || '').trim().replace(/\s+/g, ' ')
  if (!limpio) return { nombre: '', apellido: '' }

  const coma = limpio.indexOf(',')
  if (coma > 0) {
    const apellido = limpio.slice(0, coma).trim()
    const nombre   = limpio.slice(coma + 1).trim()
    if (apellido && nombre) return { nombre, apellido }
  }

  const partes = limpio.split(' ')
  if (partes.length === 1) return { nombre: partes[0], apellido: '' }
  return { nombre: partes[0], apellido: partes.slice(1).join(' ') }
}

// ─── Teléfono ─────────────────────────────────────────────────────
// Clave de comparación para deduplicar: solo dígitos, sin prefijo país ni
// formato. "9 7641 7336", "+56976417336" y "56 9 7641 7336" → "976417336".
// Se comparan los últimos 9 dígitos (largo del móvil chileno).
function normalizarTelefono(tel) {
  const digitos = String(tel || '').replace(/\D/g, '')
  if (digitos.length < 8) return null
  return digitos.slice(-9)
}

// ─── Fecha/hora de la cita ────────────────────────────────────────
const MESES = {
  enero: 1, ene: 1, january: 1, jan: 1,
  febrero: 2, feb: 2, february: 2,
  marzo: 3, mar: 3, march: 3,
  abril: 4, abr: 4, april: 4, apr: 4,
  mayo: 5, may: 5,
  junio: 6, jun: 6, june: 6,
  julio: 7, jul: 7, july: 7,
  agosto: 8, ago: 8, august: 8, aug: 8,
  septiembre: 9, setiembre: 9, sep: 9, sept: 9, september: 9,
  octubre: 10, oct: 10, october: 10,
  noviembre: 11, nov: 11, november: 11,
  diciembre: 12, dic: 12, december: 12, dec: 12,
}

const sinTildes = (s) => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

// 12h → 24h. sufijo: "AM"/"PM"/"a.m."/"p.m." (o vacío = ya viene en 24h)
function a24h(hora, sufijo) {
  if (!sufijo) return hora
  const pm = /^p/i.test(sinTildes(sufijo).replace(/[.\s]/g, ''))
  if (pm) return hora === 12 ? 12 : hora + 12
  return hora === 12 ? 0 : hora
}

const valida = (a, mo, d, h, mi) =>
  mo >= 1 && mo <= 12 && d >= 1 && d <= 31 && h >= 0 && h <= 23 && mi >= 0 && mi <= 59 && a >= 2000

// El proveedor manda la hora YA en horario chileno (el número que ve el cliente),
// aunque la marque con "Z" o un offset. Por eso se toman los componentes TAL CUAL
// y se interpretan como hora de Chile, ignorando la etiqueta de zona.
//
// Formatos aceptados, en orden:
//   1. ISO 8601            "2026-08-24T08:30:00Z"
//   2. mes por nombre      "Monday, August 24, 2026 8:30 AM" · "24 de agosto de 2026 8:30"
//   3. numérico con hora   "24/08/2026 08:30" · "24-08-2026 8:30 PM"
//   4. campos separados    fecha "DD/MM/YYYY" + hora "HH:MM"
// Ninguno depende de la zona horaria del proceso (antes el fallback usaba
// `new Date(texto)`, que interpretaba el texto en la TZ del servidor).
function parsearFechaHoraCita(body) {
  const crudo = body.inicio || body.fechaHora || body.start_time || body.startTime
  const s = crudo ? String(crudo).trim() : ''

  if (s) {
    // 1. ISO 8601
    const iso = s.match(/(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/)
    if (iso) return desdeHoraChile(+iso[1], +iso[2], +iso[3], +iso[4], +iso[5])

    const txt = sinTildes(s)

    // 2. Mes por nombre, en cualquier orden ("August 24, 2026" o "24 de agosto de 2026")
    const hora = txt.match(/(\d{1,2}):(\d{2})\s*(a\.?\s?m\.?|p\.?\s?m\.?)?/i)
    const mesNombre = txt.match(/([a-z]{3,12})/g)?.map(w => MESES[w]).find(Boolean)
    if (mesNombre && hora) {
      const anio = txt.match(/\b(20\d{2})\b/)
      // día = el primer número de 1-2 dígitos que no sea parte de la hora ni del año
      const dia = txt
        .replace(/\b20\d{2}\b/g, ' ')
        .replace(/\d{1,2}:\d{2}/g, ' ')
        .match(/\b(\d{1,2})\b/)
      if (anio && dia) {
        const h = a24h(+hora[1], hora[3])
        if (valida(+anio[1], mesNombre, +dia[1], h, +hora[2])) {
          return desdeHoraChile(+anio[1], mesNombre, +dia[1], h, +hora[2])
        }
      }
    }

    // 3. Numérico DD/MM/YYYY (o MM/DD/YYYY si el primer campo no puede ser día) + hora
    const num = txt.match(/\b(\d{1,2})[/-](\d{1,2})[/-](\d{4})\b/)
    if (num && hora) {
      const a = +num[1], b = +num[2]
      // Chile usa DD/MM; solo se invierte si el primer campo no puede ser día
      // (ej. "08/24/2026" en formato US: 24 no es un mes válido)
      const invertido = b > 12 && a <= 12
      const dia = invertido ? b : a
      const mes = invertido ? a : b
      const h = a24h(+hora[1], hora[3])
      if (valida(+num[3], mes, dia, h, +hora[2])) {
        return desdeHoraChile(+num[3], mes, dia, h, +hora[2])
      }
    }
  }

  // 4. Campos separados: fecha "DD/MM/YYYY" + hora "HH:MM"
  if (body.fecha && body.hora) {
    const m  = String(body.fecha).match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/)
    const hm = String(body.hora).match(/^(\d{1,2}):(\d{2})\s*(a\.?\s?m\.?|p\.?\s?m\.?)?$/i)
    if (m && hm) {
      const h = a24h(+hm[1], hm[3])
      if (valida(+m[3], +m[2], +m[1], h, +hm[2])) {
        return desdeHoraChile(+m[3], +m[2], +m[1], h, +hm[2])
      }
    }
  }

  return null
}

// ─── Enlace de la reunión ─────────────────────────────────────────
// Recolecta todas las URLs http(s) presentes en el payload (búsqueda recursiva).
function urlsEnPayload(obj, depth = 0, acc = []) {
  if (depth > 5 || obj == null) return acc
  if (typeof obj === 'string') {
    const s = obj.trim()
    if (/^https?:\/\/\S+/i.test(s)) acc.push(s)
    return acc
  }
  if (typeof obj === 'object') for (const v of Object.values(obj)) urlsEnPayload(v, depth + 1, acc)
  return acc
}

// Link de la reunión: primero campos conocidos; si no, cualquier URL de videollamada en el payload.
function detectarEnlaceReunion(body) {
  const conocido = (body.enlace || body.meetUrl || body.linkMeet || body.link || body.url ||
    body.join_url || body.meeting_url || body.location)?.trim()
  if (conocido && /^https?:\/\//i.test(conocido)) return conocido
  const urls = urlsEnPayload(body)
  return urls.find(u => /(meet\.google|zoom\.us|teams\.microsoft|whereby|jit\.si|hangouts|meet\.)/i.test(u)) || null
}

// ─── Tipo de visita ───────────────────────────────────────────────
// El enum de Prisma es `presencial | virtual | reunion_comercial` (el @map
// "Reunión comercial" es el valor en la BD, NO el que acepta el cliente).
// Mandarle el texto mapeado tiraba PrismaClientValidationError → 500.
const TIPO_VISITA_DEFAULT = 'reunion_comercial'
function tipoVisita(valor) {
  const v = sinTildes(String(valor || '').trim()).replace(/[\s-]+/g, '_')
  if (v === 'presencial') return 'presencial'
  if (v === 'virtual' || v === 'online' || v === 'videollamada') return 'virtual'
  if (v === 'reunion_comercial' || v === 'reunion') return 'reunion_comercial'
  return TIPO_VISITA_DEFAULT
}

// ─── Enrutado por `estado` ────────────────────────────────────────
// Contrato con el proveedor (docs/API_WEBHOOKS_LANZAMIENTO.html): `agenda` y
// `formulario-rellenado`. `cancela` se acepta de forma defensiva: si el
// proveedor empieza a mandar cancelaciones (Calendly manda invitee.canceled),
// antes caían en la rama "formulario" y dejaban la cita viva en el calendario.
function clasificarEstado(estado) {
  const e = sinTildes(String(estado || '').trim())
  if (/cancel/.test(e)) return 'cancela'
  if (e === 'agenda' || /agenda|reagenda|schedul/.test(e)) return 'agenda'
  return 'formulario'
}

// ─── Etapas ───────────────────────────────────────────────────────
// Orden del pipeline comercial (PERDIDO queda fuera: no es una etapa "avanzada").
const PIPELINE = [
  'NUEVO', 'REACTIVADO', 'NO_CONTESTA', 'SEGUIMIENTO', 'COTIZACION_ENVIADA', 'INTERESADO',
  'VISITA_AGENDADA', 'VISITA_REALIZADA', 'SEGUIMIENTO_POST_VISITA', 'NEGOCIACION',
  'RESERVA', 'PROMESA', 'ESCRITURA', 'ENTREGA', 'POSTVENTA',
]
const ETAPAS_FRIAS = ['PERDIDO', 'NO_CONTESTA']

// Etapa del lead después de agendar. Un lead ya avanzado (NEGOCIACION, RESERVA,
// PROMESA…) que agenda otra reunión NO debe retroceder a VISITA_AGENDADA.
// PERDIDO sí se mueve: agendar es señal de que revivió.
function etapaTrasAgendar(etapaActual) {
  const i = PIPELINE.indexOf(etapaActual)
  const objetivo = PIPELINE.indexOf('VISITA_AGENDADA')
  if (i > objetivo) return etapaActual
  return 'VISITA_AGENDADA'
}

// Un lead frío (dado por perdido o que nunca contestó) que vuelve a dejar sus
// datos = REACTIVADO: mostró interés de nuevo y ventas debe retomarlo.
// Misma regla que POST /api/public/leads (crearLead).
const esFrio = (etapa) => ETAPAS_FRIAS.includes(etapa)

module.exports = {
  splitNombre, normalizarTelefono, parsearFechaHoraCita,
  urlsEnPayload, detectarEnlaceReunion,
  tipoVisita, TIPO_VISITA_DEFAULT,
  clasificarEstado, etapaTrasAgendar, esFrio, PIPELINE, ETAPAS_FRIAS,
}
