const prisma = require('../lib/prisma')

// Mapeo paso legal → estado de venta (auto-sincronización)
const ESTADO_POR_PASO = {
  CONFECCION_PROMESA:           'PROMESA',
  FIRMA_CLIENTE_PROMESA:        'PROMESA',
  FIRMA_INMOBILIARIA_PROMESA:   'PROMESA',
  CONFECCION_ESCRITURA:         'ESCRITURA',
  FIRMA_CLIENTE_ESCRITURA:      'ESCRITURA',
  FIRMA_INMOBILIARIA_ESCRITURA: 'ESCRITURA',
  INSCRIPCION_CBR:              'ESCRITURA',
  ENTREGADO:                    'ENTREGADO',
}

const PASOS_CON_PROMESA = [
  'CONFECCION_PROMESA',
  'FIRMA_CLIENTE_PROMESA',
  'FIRMA_INMOBILIARIA_PROMESA',
  'CONFECCION_ESCRITURA',
  'FIRMA_CLIENTE_ESCRITURA',
  'FIRMA_INMOBILIARIA_ESCRITURA',
  'INSCRIPCION_CBR',
  'ENTREGADO'
]

const PASOS_SIN_PROMESA = [
  'CONFECCION_ESCRITURA',
  'FIRMA_CLIENTE_ESCRITURA',
  'FIRMA_INMOBILIARIA_ESCRITURA',
  'INSCRIPCION_CBR',
  'ENTREGADO'
]

const obtener = async (req, res) => {
  const { ventaId } = req.params
  try {
    let proceso = await prisma.procesoLegal.findUnique({
      where: { ventaId: Number(ventaId) },
      include: {
        documentos: {
          include: { subidoPor: { select: { nombre: true, apellido: true } } },
          orderBy: { creadoEn: 'desc' }
        }
      }
    })

    if (!proceso) return res.status(404).json({ error: 'Proceso legal no encontrado.' })

    res.json(proceso)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al obtener proceso legal.' })
  }
}

const actualizar = async (req, res) => {
  const { ventaId } = req.params
  const {
    estadoActual, tienePromesa, notas,
    fechaLimiteConfeccionPromesa,
    fechaLimiteFirmaCliente, fechaLimiteFirmaInmob,
    fechaLimiteEscritura, fechaLimiteFirmaNot,
    fechaLimiteFirmaInmobEscritura,
    fechaLimiteCBR, fechaLimiteEntrega
  } = req.body

  const pasos = tienePromesa === false ? PASOS_SIN_PROMESA : PASOS_CON_PROMESA
  if (estadoActual && !pasos.includes(estadoActual)) {
    return res.status(400).json({ error: 'Estado legal inválido.' })
  }

  const data = {
    ...(estadoActual && { estadoActual }),
    ...(tienePromesa !== undefined && { tienePromesa }),
    ...(notas !== undefined && { notas }),
    ...(fechaLimiteConfeccionPromesa !== undefined && {
      fechaLimiteConfeccionPromesa: fechaLimiteConfeccionPromesa ? new Date(fechaLimiteConfeccionPromesa) : null
    }),
    ...(fechaLimiteFirmaCliente !== undefined && {
      fechaLimiteFirmaCliente: fechaLimiteFirmaCliente ? new Date(fechaLimiteFirmaCliente) : null
    }),
    ...(fechaLimiteFirmaInmob !== undefined && {
      fechaLimiteFirmaInmob: fechaLimiteFirmaInmob ? new Date(fechaLimiteFirmaInmob) : null
    }),
    ...(fechaLimiteEscritura !== undefined && {
      fechaLimiteEscritura: fechaLimiteEscritura ? new Date(fechaLimiteEscritura) : null
    }),
    ...(fechaLimiteFirmaNot !== undefined && {
      fechaLimiteFirmaNot: fechaLimiteFirmaNot ? new Date(fechaLimiteFirmaNot) : null
    }),
    ...(fechaLimiteFirmaInmobEscritura !== undefined && {
      fechaLimiteFirmaInmobEscritura: fechaLimiteFirmaInmobEscritura ? new Date(fechaLimiteFirmaInmobEscritura) : null
    }),
    ...(fechaLimiteCBR !== undefined && {
      fechaLimiteCBR: fechaLimiteCBR ? new Date(fechaLimiteCBR) : null
    }),
    ...(fechaLimiteEntrega !== undefined && {
      fechaLimiteEntrega: fechaLimiteEntrega ? new Date(fechaLimiteEntrega) : null
    }),
  }

  try {
    // Upsert por si la venta no tiene proceso legal aún
    const proceso = await prisma.procesoLegal.upsert({
      where:  { ventaId: Number(ventaId) },
      create: { ventaId: Number(ventaId), ...data },
      update: data,
    })

    // Auto-sincronizar estado de venta según paso legal
    if (estadoActual) {
      const nuevoEstadoVenta = ESTADO_POR_PASO[estadoActual]
      if (nuevoEstadoVenta) {
        const venta = await prisma.venta.findUnique({
          where: { id: Number(ventaId) },
          select: { id: true, estado: true, leadId: true }
        })

        if (venta && venta.estado !== nuevoEstadoVenta && venta.estado !== 'ANULADO') {
          await prisma.venta.update({
            where: { id: Number(ventaId) },
            data: { estado: nuevoEstadoVenta }
          })

          if (nuevoEstadoVenta === 'PROMESA') {
            await prisma.comision.updateMany({
              where: { ventaId: Number(ventaId) },
              data: { estadoPrimera: 'PENDIENTE' }
            })
            if (venta.leadId) {
              await prisma.lead.update({ where: { id: venta.leadId }, data: { etapa: 'PROMESA' } })
            }

          } else if (nuevoEstadoVenta === 'ESCRITURA') {
            if (venta.leadId) {
              await prisma.lead.update({ where: { id: venta.leadId }, data: { etapa: 'ESCRITURA' } })
            }
            const comisionesPendientes = await prisma.comision.findMany({
              where: { ventaId: Number(ventaId), estadoSegunda: { not: 'PAGADO' } },
              select: { id: true }
            })
            if (comisionesPendientes.length > 0) {
              const destinatarios = await prisma.usuario.findMany({
                where: { activo: true, rol: { in: ['GERENTE', 'JEFE_VENTAS'] } },
                select: { id: true }
              })
              if (destinatarios.length > 0) {
                await prisma.notificacion.createMany({
                  data: destinatarios.map(u => ({
                    usuarioId: u.id,
                    tipo: 'COMISION_ESCRITURA',
                    mensaje: `Venta #${ventaId} llegó a escritura. ${comisionesPendientes.length} comisión(es) pendiente(s) de pago.`,
                    referenciaId: Number(ventaId),
                    referenciaTipo: 'venta'
                  })),
                  skipDuplicates: true
                })
              }
            }

          } else if (nuevoEstadoVenta === 'ENTREGADO') {
            await prisma.unidad.updateMany({ where: { ventaId: Number(ventaId) }, data: { estado: 'VENDIDO' } })
            if (venta.leadId) {
              await prisma.lead.update({ where: { id: venta.leadId }, data: { etapa: 'ENTREGA' } })
            }
          }
        }
      }
    }

    res.json(proceso)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al actualizar proceso legal.' })
  }
}

const subirDocumento = async (req, res) => {
  const { ventaId } = req.params
  const { nombre, etapa } = req.body

  if (!req.file || !nombre || !etapa) {
    return res.status(400).json({ error: 'Archivo, nombre y etapa son requeridos.' })
  }

  try {
    const proceso = await prisma.procesoLegal.findUnique({ where: { ventaId: Number(ventaId) } })
    if (!proceso) return res.status(404).json({ error: 'Proceso legal no encontrado.' })

    const doc = await prisma.documentoLegal.create({
      data: {
        procesoLegalId: proceso.id,
        subioPorId: req.usuario.id,
        nombre,
        url: `/uploads/${req.file.filename}`,
        etapa
      },
      include: { subidoPor: { select: { nombre: true, apellido: true } } }
    })
    res.status(201).json(doc)
  } catch (err) {
    res.status(500).json({ error: 'Error al subir documento.' })
  }
}

module.exports = { obtener, actualizar, subirDocumento }
