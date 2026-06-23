const prisma = require('./prisma')

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
    return true
  } catch (err) {
    console.error(`[notificarUnaVez usuario=${usuarioId} tipo=${tipo}]`, err.message)
    return false
  }
}

module.exports = { notificarLead, notificarUnaVez }
