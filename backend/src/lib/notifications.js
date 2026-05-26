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

module.exports = { notificarLead }
