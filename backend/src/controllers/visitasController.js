const prisma = require('../lib/prisma')

const listarPorLead = async (req, res) => {
  const { leadId } = req.params
  try {
    const visitas = await prisma.visita.findMany({
      where: { leadId: Number(leadId) },
      include: {
        vendedor: { select: { nombre: true, apellido: true } },
        edificio: { select: { id: true, nombre: true } }
      },
      orderBy: { fechaHora: 'desc' }
    })
    res.json(visitas)
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener visitas.' })
  }
}

const listarTodas = async (req, res) => {
  const esGerenciaOJV = ['GERENTE', 'JEFE_VENTAS'].includes(req.usuario.rol)
  const { desde, hasta, vendedorId, edificioId, resultado } = req.query

  // Vendedores solo ven sus propias visitas
  const filtroVendedor = esGerenciaOJV
    ? (vendedorId ? { vendedorId: Number(vendedorId) } : {})
    : { vendedorId: req.usuario.id }

  try {
    const visitas = await prisma.visita.findMany({
      where: {
        ...filtroVendedor,
        ...(desde || hasta ? {
          fechaHora: {
            ...(desde && { gte: new Date(desde) }),
            ...(hasta && { lte: new Date(hasta) })
          }
        } : {}),
        ...(edificioId && { edificioId: Number(edificioId) }),
        ...(resultado && { resultado })
      },
      include: {
        lead: {
          select: {
            id: true,
            contacto: { select: { nombre: true, apellido: true, telefono: true } }
          }
        },
        vendedor: { select: { id: true, nombre: true, apellido: true } },
        edificio: { select: { id: true, nombre: true } }
      },
      orderBy: { fechaHora: 'desc' }
    })
    res.json(visitas)
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener visitas.' })
  }
}

const crear = async (req, res) => {
  const { leadId, fechaHora, tipo, notas, edificioId } = req.body

  if (!leadId || !fechaHora || !tipo) {
    return res.status(400).json({ error: 'Lead, fecha/hora y tipo son requeridos.' })
  }

  try {
    const visita = await prisma.visita.create({
      data: {
        leadId: Number(leadId),
        vendedorId: req.usuario.id,
        edificioId: edificioId ? Number(edificioId) : null,
        fechaHora: new Date(fechaHora),
        tipo,
        notas
      }
    })

    // Actualizar etapa del lead automáticamente
    await prisma.lead.update({
      where: { id: Number(leadId) },
      data: { etapa: 'VISITA_AGENDADA' }
    })

    await prisma.interaccion.create({
      data: {
        leadId: Number(leadId),
        usuarioId: req.usuario.id,
        tipo: 'REUNION',
        descripcion: `Visita agendada para el ${new Date(fechaHora).toLocaleDateString('es-CL')} (${tipo})`
      }
    })

    res.status(201).json(visita)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al crear visita.' })
  }
}

const actualizarResultado = async (req, res) => {
  const { id } = req.params
  const { resultado, notas } = req.body

  try {
    const visita = await prisma.visita.update({
      where: { id: Number(id) },
      data: { resultado, notas }
    })

    // Actualizar etapa a visita realizada
    await prisma.lead.update({
      where: { id: visita.leadId },
      data: { etapa: 'VISITA_REALIZADA' }
    })

    await prisma.interaccion.create({
      data: {
        leadId: visita.leadId,
        usuarioId: req.usuario.id,
        tipo: 'REUNION',
        descripcion: `Visita realizada. Resultado: ${resultado}. ${notas || ''}`
      }
    })

    res.json(visita)
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Visita no encontrada.' })
    res.status(500).json({ error: 'Error al actualizar visita.' })
  }
}

// Edición completa de una visita (fecha, tipo, notas, edificio, vendedor)
const actualizar = async (req, res) => {
  const { id } = req.params
  const { fechaHora, tipo, notas, edificioId, vendedorId } = req.body

  try {
    const visita = await prisma.visita.update({
      where: { id: Number(id) },
      data: {
        ...(fechaHora !== undefined && { fechaHora: new Date(fechaHora) }),
        ...(tipo !== undefined && { tipo }),
        ...(notas !== undefined && { notas: notas || null }),
        ...(edificioId !== undefined && { edificioId: edificioId ? Number(edificioId) : null }),
        ...(vendedorId !== undefined && { vendedorId: vendedorId ? Number(vendedorId) : null }),
      },
      include: {
        vendedor: { select: { id: true, nombre: true, apellido: true } },
        edificio: { select: { id: true, nombre: true } }
      }
    })
    res.json(visita)
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Visita no encontrada.' })
    res.status(500).json({ error: 'Error al actualizar visita.' })
  }
}

module.exports = { listarPorLead, listarTodas, crear, actualizarResultado, actualizar }
