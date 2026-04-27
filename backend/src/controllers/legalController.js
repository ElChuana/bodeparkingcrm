const prisma = require('../lib/prisma')

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

  try {
    const proceso = await prisma.procesoLegal.update({
      where: { ventaId: Number(ventaId) },
      data: {
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
    })

    if (estadoActual === 'ENTREGADO') {
      await prisma.unidad.updateMany({ where: { ventaId: Number(ventaId) }, data: { estado: 'VENDIDO' } })
      await prisma.venta.update({ where: { id: Number(ventaId) }, data: { estado: 'ENTREGADO' } })
    }

    res.json(proceso)
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Proceso legal no encontrado.' })
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
