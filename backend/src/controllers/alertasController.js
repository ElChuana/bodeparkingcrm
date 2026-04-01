const prisma = require('../lib/prisma')

const misNotificaciones = async (req, res) => {
  try {
    const notificaciones = await prisma.notificacion.findMany({
      where: { usuarioId: req.usuario.id },
      orderBy: { creadoEn: 'desc' },
      take: 50
    })
    res.json(notificaciones)
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener notificaciones.' })
  }
}

const marcarLeida = async (req, res) => {
  const { id } = req.params
  try {
    await prisma.notificacion.update({
      where: { id: Number(id), usuarioId: req.usuario.id },
      data: { leida: true }
    })
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: 'Error al marcar notificación.' })
  }
}

const marcarTodasLeidas = async (req, res) => {
  try {
    await prisma.notificacion.updateMany({
      where: { usuarioId: req.usuario.id, leida: false },
      data: { leida: true }
    })
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: 'Error al marcar notificaciones.' })
  }
}

const obtenerConfig = async (req, res) => {
  try {
    const config = await prisma.alertaConfig.findMany({ orderBy: { id: 'asc' } })
    res.json(config)
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener configuración de alertas.' })
  }
}

const actualizarConfig = async (req, res) => {
  const { tipo } = req.params
  const { umbralDias, activa, accionAutomatica, canalEmail, canalWhatsapp } = req.body

  try {
    const config = await prisma.alertaConfig.update({
      where: { tipo },
      data: {
        ...(umbralDias !== undefined && { umbralDias: Number(umbralDias) }),
        ...(activa !== undefined && { activa }),
        ...(accionAutomatica !== undefined && { accionAutomatica }),
        ...(canalEmail !== undefined && { canalEmail }),
        ...(canalWhatsapp !== undefined && { canalWhatsapp })
      }
    })
    res.json(config)
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Configuración no encontrada.' })
    res.status(500).json({ error: 'Error al actualizar configuración.' })
  }
}

// ─── Chequeo de alertas (llamable desde cron o manualmente) ────────
const ejecutarChequeo = async (req, res) => {
  try {
    const resultado = await _ejecutarChequeo()
    res.json({ mensaje: 'Chequeo completado.', ...resultado })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error en el chequeo de alertas.' })
  }
}

// Helper interno para poder llamarlo también desde el cron
async function _ejecutarChequeo() {
  const alertasGeneradas = []
  const acciones = []
  const config = await prisma.alertaConfig.findMany({ where: { activa: true } })

  // Obtener gerentes para notificaciones globales
  const gerentes = await prisma.usuario.findMany({
    where: { rol: 'GERENTE', activo: true },
    select: { id: true }
  })

  for (const alerta of config) {
    const umbral = alerta.umbralDias
    const fechaLimite = new Date()
    fechaLimite.setDate(fechaLimite.getDate() - umbral)

    // ── Lead sin actividad ────────────────────────────────────────
    if (alerta.tipo === 'LEAD_SIN_ACTIVIDAD') {
      const leads = await prisma.lead.findMany({
        where: {
          actualizadoEn: { lt: fechaLimite },
          etapa: { notIn: ['PERDIDO', 'ENTREGA', 'POSTVENTA'] }
        },
        include: { vendedor: { select: { id: true, nombre: true, apellido: true } }, contacto: { select: { nombre: true, apellido: true } } }
      })

      for (const lead of leads) {
        const msg = `Lead de ${lead.contacto.nombre} ${lead.contacto.apellido} sin actividad hace más de ${umbral} días.`

        // Notificar al vendedor asignado
        if (lead.vendedorId) {
          await prisma.notificacion.create({
            data: { usuarioId: lead.vendedorId, tipo: 'LEAD_SIN_ACTIVIDAD', mensaje: msg, referenciaId: lead.id, referenciaTipo: 'lead' }
          })
        }

        // Si accionAutomatica: mover a PERDIDO
        if (alerta.accionAutomatica) {
          await prisma.lead.update({ where: { id: lead.id }, data: { etapa: 'PERDIDO', motivoPerdida: `Auto: sin actividad por más de ${umbral} días` } })
          await prisma.interaccion.create({
            data: { leadId: lead.id, usuarioId: gerentes[0]?.id || lead.vendedorId, tipo: 'NOTA', descripcion: `Automatización: lead marcado como PERDIDO por inactividad (${umbral} días)` }
          })
          acciones.push({ tipo: 'LEAD_MARCADO_PERDIDO', leadId: lead.id })
        }

        alertasGeneradas.push({ tipo: 'LEAD_SIN_ACTIVIDAD', leadId: lead.id })
      }
    }

    // ── Lead estancado (misma etapa demasiado tiempo) ─────────────
    if (alerta.tipo === 'LEAD_ESTANCADO') {
      const leads = await prisma.lead.findMany({
        where: {
          actualizadoEn: { lt: fechaLimite },
          etapa: { notIn: ['PERDIDO', 'ENTREGA', 'POSTVENTA', 'NUEVO'] }
        },
        include: { vendedor: { select: { id: true } }, contacto: { select: { nombre: true, apellido: true } } }
      })

      for (const lead of leads) {
        const msg = `Lead de ${lead.contacto.nombre} ${lead.contacto.apellido} lleva más de ${umbral} días en etapa ${lead.etapa}.`

        const destinatarios = lead.vendedorId ? [lead.vendedorId, ...gerentes.map(g => g.id)] : gerentes.map(g => g.id)
        for (const uid of [...new Set(destinatarios)]) {
          await prisma.notificacion.create({
            data: { usuarioId: uid, tipo: 'LEAD_ESTANCADO', mensaje: msg, referenciaId: lead.id, referenciaTipo: 'lead' }
          })
        }
        alertasGeneradas.push({ tipo: 'LEAD_ESTANCADO', leadId: lead.id })
      }
    }

    // ── Llave no devuelta ─────────────────────────────────────────
    if (alerta.tipo === 'LLAVE_NO_DEVUELTA') {
      const movimientos = await prisma.movimientoLlave.findMany({
        where: { tipo: 'prestamo', fechaDevolucionReal: null, fechaPrestamo: { lte: fechaLimite } },
        include: { responsable: { select: { id: true } } }
      })

      for (const mov of movimientos) {
        if (mov.responsableId) {
          await prisma.notificacion.create({
            data: { usuarioId: mov.responsableId, tipo: 'LLAVE_NO_DEVUELTA', mensaje: `Llave #${mov.llaveId} prestada hace más de ${umbral} días sin devolver.`, referenciaId: mov.llaveId, referenciaTipo: 'llave' }
          })
          alertasGeneradas.push({ tipo: 'LLAVE_NO_DEVUELTA', llaveId: mov.llaveId })
        }
      }
    }

    // ── Cuota vencida ─────────────────────────────────────────────
    if (alerta.tipo === 'CUOTA_VENCIDA') {
      const cuotas = await prisma.cuota.findMany({
        where: { estado: 'PENDIENTE', fechaVencimiento: { lt: fechaLimite } },
        include: { planPago: { include: { venta: { include: { vendedor: { select: { id: true } }, comprador: { select: { nombre: true, apellido: true } } } } } } }
      })

      for (const cuota of cuotas) {
        const venta = cuota.planPago?.venta
        if (venta?.vendedorId) {
          await prisma.notificacion.create({
            data: { usuarioId: venta.vendedorId, tipo: 'CUOTA_VENCIDA', mensaje: `Cuota #${cuota.numeroCuota} de ${venta.comprador?.nombre} ${venta.comprador?.apellido} está vencida.`, referenciaId: venta.id, referenciaTipo: 'venta' }
          })
          alertasGeneradas.push({ tipo: 'CUOTA_VENCIDA', cuotaId: cuota.id })
        }
      }
    }
  }

  return { alertasGeneradas, acciones }
}

module.exports = { misNotificaciones, marcarLeida, marcarTodasLeidas, obtenerConfig, actualizarConfig, ejecutarChequeo }
