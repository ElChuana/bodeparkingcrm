// Utilidades del módulo RRSS: normalización de leads de Meta y cruce con los leads del CRM.
const prisma = require('./prisma')

// Los formularios de ATAK no usan nombres de campo uniformes → alias
const ALIAS_CAMPO = {
  telefono: ['phone', 'phone_number', 'número_de_teléfono', 'numero_de_telefono', 'telefono', 'teléfono', 'celular', 'whatsapp'],
  email: ['email', 'correo_electrónico', 'correo_electronico', 'correo', 'e-mail', 'mail'],
  nombre: ['first_name', 'nombre', 'nombres', 'name', 'full_name', 'nombre_completo'],
  apellido: ['last_name', 'apellido', 'apellidos'],
  comuna: ['comuna', 'ciudad', 'city', 'comuna_de_residencia', 'donde_vives', 'dónde_vives'],
}

const limpiar = (s) => String(s || '').trim().toLowerCase()

// field_data de Meta → { nombre, apellido, email, telefono, comuna }
function normalizarFieldData(fieldData) {
  const out = {}
  for (const f of fieldData || []) {
    const n = limpiar(f.name)
    const v = Array.isArray(f.values) ? f.values[0] : f.values
    if (v == null || v === '') continue
    for (const [campo, aliases] of Object.entries(ALIAS_CAMPO)) {
      if (aliases.includes(n) && !out[campo]) out[campo] = String(v).trim()
    }
  }
  return out
}

// "Meta ID: l:1621679365752797" (notas que manda el conector de ATAK) → "1621679365752797"
function extraerMetaIdDeNotas(notas) {
  const m = String(notas || '').match(/Meta ID:\s*(?:l:)?(\d{10,20})/i)
  return m ? m[1] : null
}

// El conector de ATAK antepone "p:" al teléfono y "l:" al id → sacar prefijos de una letra + ":"
function limpiarPrefijoConector(valor) {
  if (valor == null) return valor
  return String(valor).replace(/^[a-z]:\s*/i, '').trim()
}

const ultimos8 = (tel) => {
  const d = String(tel || '').replace(/\D/g, '')
  return d.length >= 8 ? d.slice(-8) : null
}

// Busca el lead del CRM que corresponde a un lead de Meta. Devuelve { leadId, metodo } o null.
// Orden: metaLeadId ya guardado en el lead (si lo tiene) → últimos 8 dígitos del teléfono → email. Si el contacto tiene varios leads,
// prefiere el de la campaña del CRM vinculada a la campaña de Meta; si no, el más reciente.
async function buscarLeadCRM(metaLead, campanaIdCRM = null) {
  const porMetaId = await prisma.lead.findUnique({ where: { metaLeadId: metaLead.metaLeadId }, select: { id: true } })
  if (porMetaId) return { leadId: porMetaId.id, metodo: 'META_ID' }

  const elegir = (leads) => {
    if (!leads.length) return null
    if (campanaIdCRM) {
      const deCampana = leads.find(l => l.campanaId === campanaIdCRM)
      if (deCampana) return deCampana.id
    }
    return leads[0].id
  }

  const t8 = ultimos8(metaLead.telefono)
  if (t8) {
    const contactos = await prisma.$queryRaw`
      SELECT id FROM contactos
      WHERE regexp_replace(coalesce(telefono, ''), '[^0-9]', '', 'g') LIKE ${'%' + t8}
      LIMIT 20`
    if (contactos.length) {
      const leads = await prisma.lead.findMany({
        where: { contactoId: { in: contactos.map(c => c.id) } },
        select: { id: true, campanaId: true },
        orderBy: { creadoEn: 'desc' },
      })
      const id = elegir(leads)
      if (id) return { leadId: id, metodo: 'TELEFONO8' }
    }
  }

  const email = limpiar(metaLead.email)
  if (email && email.includes('@')) {
    const contactos = await prisma.contacto.findMany({
      where: { email: { equals: email, mode: 'insensitive' } }, select: { id: true }, take: 20,
    })
    if (contactos.length) {
      const leads = await prisma.lead.findMany({
        where: { contactoId: { in: contactos.map(c => c.id) } },
        select: { id: true, campanaId: true },
        orderBy: { creadoEn: 'desc' },
      })
      const id = elegir(leads)
      if (id) return { leadId: id, metodo: 'EMAIL' }
    }
  }
  return null
}

// Cruza todos los RrssMetaLead sin leadId. Devuelve conteos por método.
async function cruzarLeadsMeta({ soloSinCruce = true } = {}) {
  const mapa = await prisma.rrssCampanaMapa.findMany({ select: { campanaMetaId: true, campanaId: true } })
  const campanaCRM = Object.fromEntries(mapa.map(m => [m.campanaMetaId, m.campanaId]))

  const pendientes = await prisma.rrssMetaLead.findMany({
    where: soloSinCruce ? { leadId: null } : {},
    orderBy: { creadoMeta: 'asc' },
  })
  const res = { revisados: pendientes.length, META_ID: 0, TELEFONO8: 0, EMAIL: 0, sinCruce: 0 }
  for (const ml of pendientes) {
    const hit = await buscarLeadCRM(ml, campanaCRM[ml.campaignId] || null)
    if (!hit) { res.sinCruce++; continue }
    // Solo se escribe en la tabla RRSS: el job nunca modifica leads ni contactos del CRM.
    await prisma.rrssMetaLead.update({ where: { id: ml.id }, data: { leadId: hit.leadId, metodoCruce: hit.metodo, cruzadoEn: new Date() } })
    res[hit.metodo]++
  }
  return res
}

// Teléfono chileno plausible: 9 dígitos que parten con 9, o 11 con 569 (E.164 sin el +)
const esTelefonoChileno = (tel) => {
  const d = String(tel || '').replace(/\D/g, '')
  return /^9\d{8}$/.test(d) || /^569\d{8}$/.test(d)
}
// Nombre de relleno: 4+ letras iguales seguidas, sin vocales, o muy corto
const esNombreBasura = (nombre) => {
  const n = String(nombre || '').trim().toLowerCase()
  if (n.length < 3) return true
  if (/(.)\1{3,}/.test(n)) return true
  if (!/[aeiouáéíóú]/.test(n)) return true
  return false
}
// Un lead de Meta sin cruce es "basura" si el teléfono no es chileno válido o el nombre es de relleno
const esLeadBasura = (ml) => !esTelefonoChileno(ml.telefono) || esNombreBasura(ml.nombre)

// Período de gracia: el conector tarda minutos en entregar; un lead de las últimas 2 h todavía no es "perdido"
const GRACIA_MS = 2 * 60 * 60 * 1000

module.exports = { esTelefonoChileno, esNombreBasura, esLeadBasura, GRACIA_MS, normalizarFieldData, extraerMetaIdDeNotas, limpiarPrefijoConector, ultimos8, buscarLeadCRM, cruzarLeadsMeta }
