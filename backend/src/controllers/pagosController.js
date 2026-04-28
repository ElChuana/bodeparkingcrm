const prisma = require('../lib/prisma')

// ─── PLAN DE PAGOS ────────────────────────────────────────────

const crearPlan = async (req, res) => {
  const { ventaId, cuotas } = req.body
  // cuotas = [{ tipo, montoUF, montoCLP, fechaVencimiento }]

  if (!ventaId || !cuotas || !cuotas.length) {
    return res.status(400).json({ error: 'VentaId y cuotas son requeridos.' })
  }

  // Cada cuota debe tener al menos un monto
  const cuotaSinMonto = cuotas.find(c => !(c.montoUF > 0) && !(c.montoCLP > 0))
  if (cuotaSinMonto) {
    return res.status(400).json({ error: 'Cada cuota debe tener montoUF o montoCLP.' })
  }

  try {
    const existente = await prisma.planPago.findUnique({ where: { ventaId: Number(ventaId) } })
    if (existente) return res.status(400).json({ error: 'Esta venta ya tiene un plan de pago.' })

    // Solo sumar montoUF si hay cuotas con valor UF
    const totalUF = cuotas.some(c => c.montoUF > 0)
      ? cuotas.reduce((s, c) => s + (c.montoUF || 0), 0)
      : null

    const plan = await prisma.planPago.create({
      data: {
        ventaId: Number(ventaId),
        totalCuotas: cuotas.length,
        montoUF: totalUF,
        fechaInicio: new Date(cuotas[0].fechaVencimiento),
        cuotas: {
          create: cuotas.map((c, i) => ({
            numeroCuota: i + 1,
            tipo: c.tipo,
            montoUF: c.montoUF ? Number(c.montoUF) : null,
            montoCLP: c.montoCLP ? Number(c.montoCLP) : null,
            fechaVencimiento: new Date(c.fechaVencimiento),
            estado: 'PENDIENTE'
          }))
        }
      },
      include: { cuotas: { orderBy: { numeroCuota: 'asc' } } }
    })

    res.status(201).json(plan)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al crear plan de pago.' })
  }
}

const obtenerPlan = async (req, res) => {
  const { ventaId } = req.params
  try {
    const plan = await prisma.planPago.findUnique({
      where: { ventaId: Number(ventaId) },
      include: { cuotas: { orderBy: { numeroCuota: 'asc' } } }
    })
    if (!plan) return res.status(404).json({ error: 'Plan de pago no encontrado.' })
    res.json(plan)
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener plan de pago.' })
  }
}

const agregarCuota = async (req, res) => {
  const { ventaId } = req.params
  const { tipo, montoUF, montoCLP, fechaVencimiento } = req.body

  if (!fechaVencimiento) return res.status(400).json({ error: 'fechaVencimiento es requerido.' })
  if (!montoUF && !montoCLP) return res.status(400).json({ error: 'Debe ingresar montoUF o montoCLP.' })

  try {
    const plan = await prisma.planPago.findUnique({
      where: { ventaId: Number(ventaId) },
      include: { cuotas: { orderBy: { numeroCuota: 'desc' }, take: 1 } }
    })
    if (!plan) return res.status(404).json({ error: 'Plan de pago no encontrado.' })

    const ultimoNumero = plan.cuotas[0]?.numeroCuota || 0
    const cuota = await prisma.cuota.create({
      data: {
        planPagoId: plan.id,
        numeroCuota: ultimoNumero + 1,
        tipo: tipo || 'CUOTA',
        montoUF: montoUF ? Number(montoUF) : null,
        montoCLP: montoCLP ? Number(montoCLP) : null,
        fechaVencimiento: new Date(fechaVencimiento),
        estado: 'PENDIENTE'
      }
    })
    await prisma.planPago.update({
      where: { id: plan.id },
      data: { totalCuotas: { increment: 1 } }
    })
    res.status(201).json(cuota)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al agregar cuota.' })
  }
}

// ─── CUOTAS ────────────────────────────────────────────────────

const registrarPago = async (req, res) => {
  const { id } = req.params
  const { metodoPago, numeroComprobante, notas, fechaPagoReal, montoCLP } = req.body

  if (!metodoPago) return res.status(400).json({ error: 'Método de pago es requerido.' })

  try {
    const cuota = await prisma.cuota.update({
      where: { id: Number(id) },
      data: {
        estado: 'PAGADO',
        metodoPago,
        numeroComprobante,
        notas,
        montoCLP: montoCLP ? Number(montoCLP) : undefined,
        fechaPagoReal: fechaPagoReal ? new Date(fechaPagoReal) : new Date(),
        ...(req.file && { archivoUrl: `/uploads/${req.file.filename}` })
      }
    })
    res.json(cuota)
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Cuota no encontrada.' })
    res.status(500).json({ error: 'Error al registrar pago.' })
  }
}

// ─── ARRIENDOS ─────────────────────────────────────────────────

const registrarPagoArriendo = async (req, res) => {
  const { arriendoId } = req.params
  const { mes, montoUF, montoCLP, metodoPago, fechaPago } = req.body

  if (!mes) return res.status(400).json({ error: 'El mes es requerido (formato: YYYY-MM).' })

  try {
    const pago = await prisma.pagoArriendo.upsert({
      where: { arriendoId_mes: { arriendoId: Number(arriendoId), mes } },
      update: {
        estado: 'PAGADO',
        montoUF: montoUF ? Number(montoUF) : undefined,
        montoCLP: montoCLP ? Number(montoCLP) : undefined,
        fechaPago: fechaPago ? new Date(fechaPago) : new Date(),
        ...(req.file && { comprobante: `/uploads/${req.file.filename}` })
      },
      create: {
        arriendoId: Number(arriendoId),
        mes,
        montoUF: montoUF ? Number(montoUF) : null,
        montoCLP: montoCLP ? Number(montoCLP) : null,
        estado: 'PAGADO',
        fechaPago: fechaPago ? new Date(fechaPago) : new Date(),
        ...(req.file && { comprobante: `/uploads/${req.file.filename}` })
      }
    })
    res.json(pago)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al registrar pago de arriendo.' })
  }
}

// Cuotas atrasadas (para alertas y dashboard)
const cuotasAtrasadas = async (req, res) => {
  try {
    const cuotas = await prisma.cuota.findMany({
      where: {
        estado: 'PENDIENTE',
        fechaVencimiento: { lt: new Date() }
      },
      include: {
        planPago: {
          include: {
            venta: {
              include: {
                comprador: { select: { nombre: true, apellido: true, telefono: true } },
                unidades: { select: { numero: true, tipo: true, edificio: { select: { nombre: true } } } }
              }
            }
          }
        }
      },
      orderBy: { fechaVencimiento: 'asc' }
    })

    // Marcar como atrasadas
    await prisma.cuota.updateMany({
      where: { estado: 'PENDIENTE', fechaVencimiento: { lt: new Date() } },
      data: { estado: 'ATRASADO' }
    })

    res.json(cuotas)
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener cuotas atrasadas.' })
  }
}

module.exports = { crearPlan, agregarCuota, obtenerPlan, registrarPago, registrarPagoArriendo, cuotasAtrasadas }
