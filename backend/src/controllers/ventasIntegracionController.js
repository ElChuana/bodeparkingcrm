const prisma = require('../lib/prisma')
const { normalizarFormasPago } = require('../lib/formasPago')
const { ufVigente } = require('../lib/uf')

// Endpoints para el proceso EXTERNO que lee los correos de pago y completa la
// forma de pago de las ventas. Mismo esquema que la integración legal:
// API Key, sin JWT.

// GET /api/integracion/ventas/formas-pago
// Todas las ventas no anuladas con su forma de pago actual. El bot se enfoca
// en las que vienen con formasPago vacío.
const listarFormasPago = async (req, res) => {
  try {
    const ventas = await prisma.venta.findMany({
      where: { estado: { not: 'ANULADO' } },
      select: {
        id: true,
        estado: true,
        precioFinalUF: true,
        fechaReserva: true,
        comprador: { select: { nombre: true, apellido: true, rut: true, email: true } },
        unidades: { select: { numero: true, edificio: { select: { nombre: true } } } },
        formasPago: {
          orderBy: { id: 'asc' },
          select: { forma: true, destino: true, moneda: true, montoUF: true, montoCLP: true, cuotas: true, notas: true }
        },
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
      precioFinalUF: v.precioFinalUF,
      fechaReserva: v.fechaReserva,
      formasPago: v.formasPago,
    })))
  } catch (err) {
    console.error('[Integracion/formas-pago]', err)
    res.status(500).json({ error: 'Error al listar las formas de pago.' })
  }
}

// POST /api/integracion/ventas/formas-pago
// Body: { items: [{ ventaId, formasPago: [...], sobrescribir? }] } (o un array directo).
// Reemplaza el set completo de formas de la venta, con la misma validación que
// el endpoint JWT. Por defecto NO toca una venta que ya tiene forma de pago
// registrada: para pisarla hay que mandar sobrescribir: true explícito.
const recibirFormasPago = async (req, res) => {
  const items = Array.isArray(req.body) ? req.body : req.body?.items
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Se espera un array de items (o { items: [...] }).' })
  }

  const guardadas = []
  const omitidas = []
  const errores = []

  // La UF vigente se necesita solo para formas pactadas en pesos
  let valorUF = null
  try {
    valorUF = await ufVigente()
  } catch {
    valorUF = null
  }

  for (const item of items) {
    const ventaId = Number(item?.ventaId)
    if (!Number.isInteger(ventaId) || ventaId <= 0) {
      errores.push({ ventaId: item?.ventaId ?? null, error: 'ventaId inválido.' })
      continue
    }

    try {
      const venta = await prisma.venta.findUnique({
        where: { id: ventaId },
        select: {
          id: true, estado: true, precioFinalUF: true,
          formasPago: { select: { id: true } }
        }
      })
      if (!venta) {
        errores.push({ ventaId, error: 'Venta no encontrada.' })
        continue
      }
      if (venta.estado === 'ANULADO') {
        errores.push({ ventaId, error: 'La venta está anulada.' })
        continue
      }
      if (venta.formasPago.length > 0 && !item.sobrescribir) {
        omitidas.push({ ventaId, motivo: 'Ya tiene forma de pago registrada (mandar sobrescribir: true para pisarla).' })
        continue
      }

      const { ok, error, formas } = normalizarFormasPago(item.formasPago, venta.precioFinalUF, valorUF)
      if (!ok) {
        errores.push({ ventaId, error })
        continue
      }

      await prisma.$transaction(async (tx) => {
        await tx.ventaFormaPago.deleteMany({ where: { ventaId: venta.id } })
        if (formas.length > 0) {
          await tx.ventaFormaPago.createMany({
            data: formas.map(f => ({ ventaId: venta.id, ...f }))
          })
        }
      })
      guardadas.push({ ventaId, formas: formas.map(f => f.forma) })
    } catch (err) {
      console.error('[Integracion/formas-pago]', ventaId, err)
      errores.push({ ventaId, error: 'Error al guardar la forma de pago.' })
    }
  }

  res.status(errores.length > 0 && guardadas.length === 0 ? 400 : 200).json({
    guardadas, omitidas, errores
  })
}

module.exports = { listarFormasPago, recibirFormasPago }
