/**
 * Plan de cuentas y presupuesto: cómo vamos contra lo planificado.
 *
 * Dos niveles: la cuenta grande (Administración, Comercial, Financiera…) y sus
 * subcuentas (Software, Notaría, Publicidad…). Cada documento se clasifica en una
 * subcuenta; el presupuesto se carga por subcuenta y mes, y la ejecución se CALCULA:
 *
 *   · Ejecutado    — documentos/facturas de esa cuenta con pago conciliado del banco
 *   · Comprometido — provisiones y facturas abiertas (lo que ya se sabe que va a salir)
 *   · Disponible   — presupuesto − ejecutado − comprometido
 *
 * El período de un gasto es el del DOCUMENTO (la provisión de julio cuenta contra julio
 * aunque se pague en agosto): el presupuesto se controla por lo devengado, no por caja.
 */

const prisma = require('../lib/prisma')
const { valorUFEn } = require('../lib/uf')
const { ejecucion, armarArbol, periodosDelAnio } = require('../lib/presupuesto')
const { claveMes } = require('../lib/gastosProgramados')

// ─── PLAN DE CUENTAS ──────────────────────────────────────────

const listarCuentas = async (req, res) => {
  try {
    const cuentas = await prisma.cuentaGasto.findMany({
      orderBy: [{ orden: 'asc' }, { nombre: 'asc' }],
      include: { _count: { select: { documentosInternos: true, facturasCompra: true, gastosProgramados: true, proveedores: true } } },
    })
    res.json({ cuentas, arbol: armarArbol(cuentas) })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al listar el plan de cuentas.' })
  }
}

const crearCuenta = async (req, res) => {
  const { nombre, codigo, padreId, tipo, color, orden } = req.body
  if (!nombre?.trim()) return res.status(400).json({ error: 'La cuenta necesita un nombre.' })
  try {
    if (padreId) {
      const padre = await prisma.cuentaGasto.findUnique({ where: { id: Number(padreId) } })
      if (!padre) return res.status(404).json({ error: 'La cuenta padre no existe.' })
      // Dos niveles y no más: una subcuenta de una subcuenta ya no se puede presupuestar
      // sin volver el árbol ilegible.
      if (padre.padreId) return res.status(400).json({ error: 'Solo hay dos niveles: cuenta grande y subcuenta.' })
    }
    const cuenta = await prisma.cuentaGasto.create({
      data: {
        nombre: nombre.trim(),
        codigo: codigo?.trim() || null,
        padreId: padreId ? Number(padreId) : null,
        tipo: tipo === 'INGRESO' ? 'INGRESO' : 'GASTO',
        color: color || null,
        orden: Number(orden) || 0,
      },
    })
    res.status(201).json(cuenta)
  } catch (err) {
    if (err.code === 'P2002') return res.status(400).json({ error: 'Ya existe una cuenta con ese nombre en ese nivel.' })
    console.error(err)
    res.status(500).json({ error: 'Error al crear la cuenta.' })
  }
}

const editarCuenta = async (req, res) => {
  const { nombre, codigo, padreId, tipo, color, orden, activa } = req.body
  try {
    const cuenta = await prisma.cuentaGasto.update({
      where: { id: Number(req.params.id) },
      data: {
        ...(nombre !== undefined && { nombre: nombre.trim() }),
        ...(codigo !== undefined && { codigo: codigo?.trim() || null }),
        ...(padreId !== undefined && { padreId: padreId ? Number(padreId) : null }),
        ...(tipo !== undefined && { tipo: tipo === 'INGRESO' ? 'INGRESO' : 'GASTO' }),
        ...(color !== undefined && { color: color || null }),
        ...(orden !== undefined && { orden: Number(orden) || 0 }),
        ...(activa !== undefined && { activa: Boolean(activa) }),
      },
    })
    res.json(cuenta)
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Cuenta no encontrada.' })
    if (err.code === 'P2002') return res.status(400).json({ error: 'Ya existe una cuenta con ese nombre en ese nivel.' })
    console.error(err)
    res.status(500).json({ error: 'Error al editar la cuenta.' })
  }
}

/** Una cuenta con documentos no se borra: se desactiva, para no dejar gasto huérfano. */
const eliminarCuenta = async (req, res) => {
  try {
    const id = Number(req.params.id)
    const [docs, facturas, gastos, hijas] = await Promise.all([
      prisma.documentoInterno.count({ where: { cuentaId: id } }),
      prisma.facturaCompra.count({ where: { cuentaId: id } }),
      prisma.gastoProgramado.count({ where: { cuentaId: id } }),
      prisma.cuentaGasto.count({ where: { padreId: id } }),
    ])
    if (hijas > 0) return res.status(400).json({ error: 'Tiene subcuentas: muévelas o bórralas primero.' })
    if (docs + facturas + gastos > 0) {
      await prisma.cuentaGasto.update({ where: { id }, data: { activa: false } })
      return res.json({ mensaje: `Tiene ${docs + facturas + gastos} documento(s) clasificados, así que se desactivó en vez de borrarse.`, desactivada: true })
    }
    await prisma.$transaction([
      prisma.presupuesto.deleteMany({ where: { cuentaId: id } }),
      prisma.cuentaGasto.delete({ where: { id } }),
    ])
    res.json({ mensaje: 'Cuenta eliminada.' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al eliminar la cuenta.' })
  }
}

// ─── PRESUPUESTO ──────────────────────────────────────────────

/** La grilla cruda del año: lo cargado por subcuenta y mes (en UF o CLP). */
const verPresupuesto = async (req, res) => {
  const anio = Number(req.query.anio) || new Date().getUTCFullYear()
  try {
    const filas = await prisma.presupuesto.findMany({
      where: { periodo: { startsWith: `${anio}-` } },
      orderBy: [{ cuentaId: 'asc' }, { periodo: 'asc' }],
    })
    res.json({ anio, periodos: periodosDelAnio(anio), filas })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al leer el presupuesto.' })
  }
}

/**
 * Guarda el presupuesto en bloque: [{cuentaId, periodo, montoUF?, montoCLP?}].
 * Una fila sin monto borra la celda. Upsert por (cuenta, período): guardar dos veces
 * deja lo último, no duplica.
 */
const guardarPresupuesto = async (req, res) => {
  const filas = Array.isArray(req.body?.filas) ? req.body.filas : []
  if (!filas.length) return res.status(400).json({ error: 'No llegó ninguna fila de presupuesto.' })

  try {
    let guardadas = 0
    let borradas = 0
    await prisma.$transaction(async (tx) => {
      for (const f of filas) {
        const cuentaId = Number(f.cuentaId)
        if (!cuentaId || !/^\d{4}-\d{2}$/.test(f.periodo || '')) continue
        const montoUF = Number(f.montoUF) > 0 ? Number(f.montoUF) : null
        const montoCLP = Number(f.montoCLP) > 0 ? Math.round(Number(f.montoCLP)) : null

        if (montoUF == null && montoCLP == null) {
          const r = await tx.presupuesto.deleteMany({ where: { cuentaId, periodo: f.periodo } })
          borradas += r.count
          continue
        }
        await tx.presupuesto.upsert({
          where: { cuentaId_periodo: { cuentaId, periodo: f.periodo } },
          create: { cuentaId, periodo: f.periodo, montoUF, montoCLP, creadoPorId: req.usuario.id },
          update: { montoUF, montoCLP },
        })
        guardadas++
      }
    })
    res.json({ guardadas, borradas })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al guardar el presupuesto.' })
  }
}

/** Copia un mes a otros: "lo de enero, para todo el año". No pisa celdas ya cargadas salvo que se pida. */
const copiarPresupuesto = async (req, res) => {
  const { desdePeriodo, hastaPeriodos, pisar } = req.body || {}
  if (!/^\d{4}-\d{2}$/.test(desdePeriodo || '') || !Array.isArray(hastaPeriodos) || !hastaPeriodos.length) {
    return res.status(400).json({ error: 'Indica el mes de origen y los meses de destino.' })
  }
  try {
    const origen = await prisma.presupuesto.findMany({ where: { periodo: desdePeriodo } })
    if (!origen.length) return res.status(400).json({ error: `No hay presupuesto cargado en ${desdePeriodo}.` })

    let copiadas = 0
    await prisma.$transaction(async (tx) => {
      for (const periodo of hastaPeriodos) {
        if (!/^\d{4}-\d{2}$/.test(periodo) || periodo === desdePeriodo) continue
        for (const f of origen) {
          if (pisar) {
            await tx.presupuesto.upsert({
              where: { cuentaId_periodo: { cuentaId: f.cuentaId, periodo } },
              create: { cuentaId: f.cuentaId, periodo, montoUF: f.montoUF, montoCLP: f.montoCLP, creadoPorId: req.usuario.id },
              update: { montoUF: f.montoUF, montoCLP: f.montoCLP },
            })
            copiadas++
          } else {
            const ya = await tx.presupuesto.findUnique({ where: { cuentaId_periodo: { cuentaId: f.cuentaId, periodo } } })
            if (ya) continue
            await tx.presupuesto.create({
              data: { cuentaId: f.cuentaId, periodo, montoUF: f.montoUF, montoCLP: f.montoCLP, creadoPorId: req.usuario.id },
            })
            copiadas++
          }
        }
      }
    })
    res.json({ copiadas })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al copiar el presupuesto.' })
  }
}

// ─── EJECUCIÓN (presupuesto vs real) ──────────────────────────

/**
 * El período contra el que cuenta un documento: el de su ocurrencia si nació de un gasto
 * programado, o el mes de su fecha (esperada/emisión).
 */
const periodoDoc = (d) => d.periodo || claveMes(d.fechaEsperada)

/**
 * Junta ejecutado y comprometido por cuenta y período, a partir de los documentos.
 *
 * Regla anti doble conteo: una factura ASOCIADA a una provisión no cuenta por separado —
 * el documento manda y ya suma los pagos hechos a través de su factura.
 */
async function movimientoPresupuestario(valorUF) {
  const [documentos, facturas] = await Promise.all([
    prisma.documentoInterno.findMany({
      where: { lado: 'GASTO' },
      select: {
        cuentaId: true, periodo: true, fechaEsperada: true, montoUF: true, montoCLP: true,
        conciliaciones: { select: { monto: true } },
        facturaCompra: { select: { total: true, conciliaciones: { select: { monto: true } } } },
      },
    }),
    prisma.facturaCompra.findMany({
      where: { documentoInterno: null },
      select: { cuentaId: true, fechaEmision: true, total: true, conciliaciones: { select: { monto: true } } },
    }),
  ])

  const ejecutado = []
  const comprometido = []

  for (const d of documentos) {
    const periodo = periodoDoc(d)
    // Con factura asociada mandan el monto y el pago de la factura (es el dato real);
    // sin factura, el estimado del documento.
    const total = d.facturaCompra
      ? Number(d.facturaCompra.total)
      : (Number(d.montoCLP) > 0 ? Number(d.montoCLP) : Math.round(Number(d.montoUF || 0) * valorUF))
    const pagado = (d.conciliaciones || []).reduce((a, c) => a + Math.abs(Number(c.monto)), 0)
      + (d.facturaCompra?.conciliaciones || []).reduce((a, c) => a + Math.abs(Number(c.monto)), 0)

    if (pagado > 0) ejecutado.push({ cuentaId: d.cuentaId, periodo, montoCLP: pagado })
    if (total - pagado > 0) comprometido.push({ cuentaId: d.cuentaId, periodo, montoCLP: total - pagado })
  }

  for (const f of facturas) {
    const periodo = claveMes(f.fechaEmision)
    const pagado = (f.conciliaciones || []).reduce((a, c) => a + Math.abs(Number(c.monto)), 0)
    if (pagado > 0) ejecutado.push({ cuentaId: f.cuentaId, periodo, montoCLP: pagado })
    if (Number(f.total) - pagado > 0) comprometido.push({ cuentaId: f.cuentaId, periodo, montoCLP: Number(f.total) - pagado })
  }

  return { ejecutado, comprometido }
}

const verEjecucion = async (req, res) => {
  const anio = Number(req.query.anio) || new Date().getUTCFullYear()
  try {
    const uf = await valorUFEn().catch(() => null)
    const valorUF = uf?.valor || 0
    const periodos = periodosDelAnio(anio)

    const [cuentas, presupuestosRaw, movs] = await Promise.all([
      prisma.cuentaGasto.findMany({ where: { activa: true }, orderBy: [{ orden: 'asc' }, { nombre: 'asc' }] }),
      prisma.presupuesto.findMany({ where: { periodo: { startsWith: `${anio}-` } } }),
      movimientoPresupuestario(valorUF),
    ])

    const presupuestos = presupuestosRaw.map((p) => ({
      cuentaId: p.cuentaId,
      periodo: p.periodo,
      montoCLP: Number(p.montoCLP) > 0 ? Number(p.montoCLP) : Math.round(Number(p.montoUF || 0) * valorUF),
    }))

    const r = ejecucion({ cuentas, presupuestos, ejecutado: movs.ejecutado, comprometido: movs.comprometido, periodos })
    res.json({ anio, valorUF, ...r })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al calcular la ejecución del presupuesto.' })
  }
}

/** Drill-down: los documentos que componen la cifra de una cuenta en un período. */
const documentosDeCuenta = async (req, res) => {
  const cuentaId = Number(req.params.id)
  const { periodo } = req.query
  try {
    const cuenta = await prisma.cuentaGasto.findUnique({ where: { id: cuentaId }, include: { subcuentas: { select: { id: true } } } })
    if (!cuenta) return res.status(404).json({ error: 'Cuenta no encontrada.' })
    const ids = [cuentaId, ...cuenta.subcuentas.map((s) => s.id)]

    const [documentos, facturas] = await Promise.all([
      prisma.documentoInterno.findMany({
        where: { cuentaId: { in: ids }, lado: 'GASTO' },
        include: {
          proveedor: { select: { razonSocial: true } },
          conciliaciones: { select: { monto: true, movimiento: { select: { fecha: true, glosa: true } } } },
          facturaCompra: { select: { folio: true, total: true, conciliaciones: { select: { monto: true } } } },
        },
        orderBy: { fechaEsperada: 'desc' },
      }),
      prisma.facturaCompra.findMany({
        where: { cuentaId: { in: ids }, documentoInterno: null },
        include: {
          proveedor: { select: { razonSocial: true } },
          conciliaciones: { select: { monto: true, movimiento: { select: { fecha: true, glosa: true } } } },
        },
        orderBy: { fechaEmision: 'desc' },
      }),
    ])

    const filtraPeriodo = (p) => !periodo || p === periodo
    res.json({
      cuenta: { id: cuenta.id, nombre: cuenta.nombre },
      documentos: documentos.filter((d) => filtraPeriodo(periodoDoc(d))),
      facturas: facturas.filter((f) => filtraPeriodo(claveMes(f.fechaEmision))),
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al listar los documentos de la cuenta.' })
  }
}

module.exports = {
  listarCuentas, crearCuenta, editarCuenta, eliminarCuenta,
  verPresupuesto, guardarPresupuesto, copiarPresupuesto,
  verEjecucion, documentosDeCuenta,
  movimientoPresupuestario,
}
