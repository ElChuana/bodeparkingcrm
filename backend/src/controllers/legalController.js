const prisma = require('../lib/prisma')

// Mapeo paso legal → estado de venta (auto-sincronización).
// La confección NO cambia el estado: la promesa/escritura existe recién
// cuando firma el cliente (eso gatilla el devengo de comisiones).
const ESTADO_POR_PASO = {
  FIRMA_CLIENTE_PROMESA:        'PROMESA',
  FIRMA_INMOBILIARIA_PROMESA:   'PROMESA',
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
        },
        historial: {
          include: { usuario: { select: { nombre: true, apellido: true } } },
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
    const previo = await prisma.procesoLegal.findUnique({
      where: { ventaId: Number(ventaId) },
      select: { estadoActual: true }
    })

    // Upsert por si la venta no tiene proceso legal aún
    const proceso = await prisma.procesoLegal.upsert({
      where:  { ventaId: Number(ventaId) },
      create: { ventaId: Number(ventaId), ...data },
      update: data,
    })

    // Historial: registrar fecha real de cada cambio de paso y quién lo movió
    if (estadoActual && estadoActual !== previo?.estadoActual) {
      await prisma.historialLegal.create({
        data: {
          procesoLegalId: proceso.id,
          paso: estadoActual,
          usuarioId: req.usuario?.id || null
        }
      })
    }

    // Auto-sincronizar estado de venta según paso legal
    if (estadoActual) {
      const nuevoEstadoVenta = ESTADO_POR_PASO[estadoActual]
      if (nuevoEstadoVenta) {
        const venta = await prisma.venta.findUnique({
          where: { id: Number(ventaId) },
          select: { id: true, estado: true, leadId: true, fechaPromesa: true, fechaEscritura: true, fechaEntrega: true }
        })

        if (venta && venta.estado !== nuevoEstadoVenta && venta.estado !== 'ANULADO') {
          const dataVenta = { estado: nuevoEstadoVenta }
          // La firma fija la fecha real de promesa/escritura (mes de devengo de comisiones)
          if (nuevoEstadoVenta === 'PROMESA' && !venta.fechaPromesa) dataVenta.fechaPromesa = new Date()
          if (nuevoEstadoVenta === 'ESCRITURA' && !venta.fechaEscritura) dataVenta.fechaEscritura = new Date()
          if (nuevoEstadoVenta === 'ENTREGADO' && !venta.fechaEntrega) dataVenta.fechaEntrega = new Date()
          await prisma.venta.update({
            where: { id: Number(ventaId) },
            data: dataVenta
          })

          if (nuevoEstadoVenta === 'PROMESA') {
            await prisma.comision.updateMany({
              where: { ventaId: Number(ventaId), estadoPrimera: { not: 'PAGADO' } },
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

// ─── Integración externa (bot de emails legales) ──────────────────────────────

// Estados de venta que se consideran "en proceso legal / activos"
const ESTADOS_ACTIVOS = ['RESERVA', 'PROMESA', 'ESCRITURA']
const SEMAFOROS_VALIDOS = ['AL_DIA', 'ATENCION', 'ATRASADO']

// GET /api/legal/ventas-activas — lista para que el proceso externo mapee cada correo a su venta
const listarVentasActivas = async (req, res) => {
  try {
    const ventas = await prisma.venta.findMany({
      where: { estado: { in: ESTADOS_ACTIVOS } },
      select: {
        id: true,
        estado: true,
        comprador: { select: { nombre: true, apellido: true, rut: true, email: true } },
        unidades: { select: { numero: true, edificio: { select: { nombre: true } } } },
        procesoLegal: { select: { estadoActual: true, tienePromesa: true } },
        resumenesLegales: {
          orderBy: { creadoEn: 'desc' },
          take: 1,
          select: { resumen: true, semaforo: true, proximaAccion: true, creadoEn: true }
        }
      },
      orderBy: { id: 'asc' }
    })

    res.json(ventas.map(v => ({
      ventaId: v.id,
      estadoVenta: v.estado,
      comprador: `${v.comprador.nombre} ${v.comprador.apellido || ''}`.trim(),
      rut: v.comprador.rut || null,
      email: v.comprador.email || null,
      unidades: v.unidades.map(u => `${u.numero}${u.edificio ? ` (${u.edificio.nombre})` : ''}`),
      estadoLegal: v.procesoLegal?.estadoActual || null,
      ultimoResumen: v.resumenesLegales[0] || null
    })))
  } catch (err) {
    console.error('[Legal/ventas-activas]', err)
    res.status(500).json({ error: 'Error al listar ventas activas.' })
  }
}

// POST /api/legal/resumenes — recibe uno o varios resúmenes legales desde el proceso externo
// Body: { resumenes: [{ ventaId, resumen, semaforo?, proximaAccion?, fuente? }] }  (o un array directo)
const recibirResumenes = async (req, res) => {
  const items = Array.isArray(req.body) ? req.body : req.body?.resumenes
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Se espera un array de resúmenes (o { resumenes: [...] }).' })
  }

  const creados = []
  const noEncontrados = []
  const errores = []

  for (const item of items) {
    const ventaId = Number(item?.ventaId)
    const resumen = typeof item?.resumen === 'string' ? item.resumen.trim() : ''
    if (!ventaId || !resumen) {
      errores.push({ ventaId: item?.ventaId ?? null, error: 'ventaId y resumen son obligatorios.' })
      continue
    }

    let semaforo = null
    if (item.semaforo != null) {
      const s = String(item.semaforo).toUpperCase()
      if (!SEMAFOROS_VALIDOS.includes(s)) {
        errores.push({ ventaId, error: `semaforo inválido: ${item.semaforo} (usar AL_DIA | ATENCION | ATRASADO).` })
        continue
      }
      semaforo = s
    }

    try {
      const venta = await prisma.venta.findUnique({ where: { id: ventaId }, select: { id: true } })
      if (!venta) { noEncontrados.push(ventaId); continue }

      const r = await prisma.resumenLegal.create({
        data: {
          ventaId,
          resumen,
          semaforo,
          proximaAccion: item.proximaAccion ? String(item.proximaAccion) : null,
          fuente: item.fuente ? String(item.fuente) : (req.apiKey?.nombre || 'externo')
        },
        select: { id: true, ventaId: true, creadoEn: true }
      })
      creados.push(r)
    } catch (err) {
      console.error('[Legal/resumenes] venta', ventaId, err.message)
      errores.push({ ventaId, error: 'Error al guardar.' })
    }
  }

  res.status(creados.length ? 201 : 400).json({
    recibidos: items.length,
    creados: creados.length,
    detalleCreados: creados,
    noEncontrados,
    errores
  })
}

module.exports = { obtener, actualizar, subirDocumento, listarVentasActivas, recibirResumenes }
