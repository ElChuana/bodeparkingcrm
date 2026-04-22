const prisma = require('./prisma')

// Notifica a gerentes, jefes de ventas y vendedor asignado al lead
async function notificarLead({ leadId, mensaje, tipo, excluirUsuarioId }) {
  try {
    const destinatarios = await prisma.usuario.findMany({
      where: {
        notificacionesActivas: true,
        activo: true,
        OR: [
          { rol: 'GERENTE' },
          { rol: 'JEFE_VENTAS' },
          { leadsAsignados: { some: { id: leadId } } }
        ],
        ...(excluirUsuarioId ? { id: { not: excluirUsuarioId } } : {})
      },
      select: { id: true }
    })
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
