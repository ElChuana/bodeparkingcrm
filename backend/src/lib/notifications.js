const prisma = require('./prisma')
const { enviarEmail } = require('./mailer')

// Tipos "importantes/personales" que además disparan un email al destinatario.
// El resto (cron masivo, actividad informativa) solo notifica in-app.
const TIPOS_EMAIL = new Set(['MENCION_NOTA', 'LEAD_NUEVO', 'ACTIVIDAD_EN_LEAD', 'CUOTA_VENCIDA'])

const APP_URL = (process.env.APP_URL || '').replace(/\/$/, '')

function rutaDe(referenciaTipo, referenciaId) {
  if (!referenciaId) return ''
  switch (referenciaTipo) {
    case 'lead':       return `/leads/${referenciaId}`
    case 'venta':      return `/ventas/${referenciaId}`
    case 'cotizacion': return `/cotizaciones/${referenciaId}`
    case 'llave':      return '/llaves'
    case 'visita':     return '/visitas'
    default:           return ''
  }
}

function htmlEmail(mensaje, ruta) {
  const url = APP_URL && ruta ? `${APP_URL}${ruta}` : APP_URL
  const boton = url
    ? `<p style="margin:20px 0"><a href="${url}" style="background:#1d4ed8;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;font-size:14px">Ver en el CRM</a></p>`
    : ''
  return `<div style="font-family:Arial,sans-serif;max-width:520px;color:#1f2937">
    <p style="font-size:15px;line-height:1.5">${mensaje}</p>
    ${boton}
    <hr style="border:none;border-top:1px solid #eee;margin-top:24px">
    <p style="color:#9ca3af;font-size:12px">Notificación de BodeParking CRM. Podés desactivar estos correos en tu perfil.</p>
  </div>`
}

// Envía email de notificación a un usuario, respetando sus preferencias.
async function emailNotificacion(usuarioId, { asunto, mensaje, referenciaTipo, referenciaId }) {
  try {
    const u = await prisma.usuario.findUnique({
      where: { id: usuarioId },
      select: { email: true, activo: true, notificacionesActivas: true, notificacionesEmail: true }
    })
    if (!u || !u.activo || !u.email) return
    if (u.notificacionesActivas === false || u.notificacionesEmail === false) return
    await enviarEmail({ para: u.email, asunto, html: htmlEmail(mensaje, rutaDe(referenciaTipo, referenciaId)) })
  } catch (err) {
    console.error(`[emailNotificacion usuario=${usuarioId}]`, err.message)
  }
}

// Crea una notificación para UN usuario (siempre, sin dedup) y, si el tipo es
// importante, además le manda un email. Usado para menciones y avisos directos.
async function notificarUsuario({ usuarioId, tipo, mensaje, referenciaId = null, referenciaTipo = null, asunto }) {
  if (!usuarioId) return
  try {
    await prisma.notificacion.create({
      data: { usuarioId, tipo, mensaje, referenciaId, referenciaTipo }
    })
    if (TIPOS_EMAIL.has(tipo)) {
      await emailNotificacion(usuarioId, { asunto: asunto || mensaje, mensaje, referenciaTipo, referenciaId })
    }
  } catch (err) {
    console.error(`[notificarUsuario usuario=${usuarioId} tipo=${tipo}]`, err.message)
  }
}

// Notifica a destinatarios relacionados con el lead.
// Por defecto: gerentes + jefes de ventas + vendedor asignado.
// Si soloAVendedor=true: solo al vendedor asignado (más silencioso).
async function notificarLead({ leadId, mensaje, tipo, excluirUsuarioId, soloAVendedor = false }) {
  try {
    const where = soloAVendedor
      ? {
          notificacionesActivas: true,
          activo: true,
          leadsAsignados: { some: { id: leadId } },
          ...(excluirUsuarioId ? { id: { not: excluirUsuarioId } } : {})
        }
      : {
          notificacionesActivas: true,
          activo: true,
          OR: [
            { rol: 'GERENTE' },
            { rol: 'JEFE_VENTAS' },
            { leadsAsignados: { some: { id: leadId } } }
          ],
          ...(excluirUsuarioId ? { id: { not: excluirUsuarioId } } : {})
        }

    const destinatarios = await prisma.usuario.findMany({ where, select: { id: true } })
    if (!destinatarios.length) return
    await prisma.notificacion.createMany({
      data: destinatarios.map(u => ({
        usuarioId: u.id, tipo, mensaje, referenciaId: leadId, referenciaTipo: 'lead'
      })),
      skipDuplicates: true
    })

    // Email solo para tipos importantes y SOLO al vendedor asignado del lead
    // (no spameamos a gerencia/JV, que ven todo en el CRM y los reportes).
    if (TIPOS_EMAIL.has(tipo)) {
      const lead = await prisma.lead.findUnique({ where: { id: leadId }, select: { vendedorId: true } })
      const vid = lead?.vendedorId
      if (vid && vid !== excluirUsuarioId && destinatarios.some(d => d.id === vid)) {
        await emailNotificacion(vid, { asunto: mensaje, mensaje, referenciaTipo: 'lead', referenciaId: leadId })
      }
    }
  } catch (err) {
    console.error(`[notificarLead lead=${leadId}]`, err.message)
  }
}

// Crea una notificación SOLO si no existe ya una sin leer del mismo tipo
// para el mismo usuario y referencia. Evita el spam del cron diario, que
// antes generaba una notificación nueva cada día para el mismo lead/cuota/llave.
// Devuelve true si la creó, false si ya existía una pendiente.
async function notificarUnaVez({ usuarioId, tipo, mensaje, referenciaId = null, referenciaTipo = null }) {
  if (!usuarioId) return false
  try {
    const existe = await prisma.notificacion.findFirst({
      where: { usuarioId, tipo, referenciaId, referenciaTipo, leida: false },
      select: { id: true }
    })
    if (existe) return false
    await prisma.notificacion.create({
      data: { usuarioId, tipo, mensaje, referenciaId, referenciaTipo }
    })
    if (TIPOS_EMAIL.has(tipo)) {
      await emailNotificacion(usuarioId, { asunto: mensaje, mensaje, referenciaTipo, referenciaId })
    }
    return true
  } catch (err) {
    console.error(`[notificarUnaVez usuario=${usuarioId} tipo=${tipo}]`, err.message)
    return false
  }
}

module.exports = { notificarLead, notificarUnaVez, notificarUsuario, emailNotificacion }
