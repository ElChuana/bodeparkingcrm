/**
 * Reglas de conciliación: CRUD y prueba en seco.
 *
 * Lo importante acá no es el CRUD sino `probar`: antes de guardar una regla —y sobre todo
 * antes de marcarla `autoValidar`— hay que poder ver contra qué movimientos calzaría. Una
 * regla que se automatiza a ciegas es la forma más rápida de imputar plata donde no va.
 */

const prisma = require('../lib/prisma')
const { calza, primeraQueCalza } = require('../lib/reglas')

const incluir = {
  // La cuenta no la pone la regla: la trae el gasto (y su provisión) al que imputa.
  gastoProgramado: {
    select: {
      id: true, nombre: true, montoUF: true, montoCLP: true, periodicidad: true,
      cuenta: { select: { id: true, nombre: true, color: true } },
    },
  },
}

const listar = async (_req, res) => {
  try {
    const reglas = await prisma.reglaConciliacion.findMany({
      include: incluir,
      orderBy: [{ orden: 'asc' }, { id: 'asc' }],
    })
    res.json(reglas)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al listar las reglas.' })
  }
}

const datos = (body) => ({
  nombre: String(body.nombre || '').trim(),
  patronGlosa: String(body.patronGlosa || '').trim(),
  tipoMovimiento: ['CARGO', 'ABONO', 'AMBOS'].includes(body.tipoMovimiento) ? body.tipoMovimiento : 'CARGO',
  montoMin: body.montoMin ? Number(body.montoMin) : null,
  montoMax: body.montoMax ? Number(body.montoMax) : null,
  gastoProgramadoId: body.gastoProgramadoId ? Number(body.gastoProgramadoId) : null,
  autoValidar: Boolean(body.autoValidar),
  activa: body.activa == null ? true : Boolean(body.activa),
  orden: Number(body.orden) || 0,
})

/** Una regla tiene que decir a qué se parece el cargo y a qué gasto corresponde. */
function validar(d) {
  if (!d.nombre) return 'Ponle un nombre a la regla.'
  if (!d.patronGlosa) return 'Falta el texto que debe traer la glosa: sin eso la regla calzaría con todo.'
  if (!d.gastoProgramadoId) {
    return 'Elige a qué gasto programado se imputa. La regla no clasifica el movimiento: lo manda a la provisión del gasto, y de ahí sale la cuenta.'
  }
  if (d.montoMin != null && d.montoMax != null && d.montoMin > d.montoMax) {
    return 'El monto mínimo no puede ser mayor que el máximo.'
  }
  return null
}

const crear = async (req, res) => {
  try {
    const d = datos(req.body)
    const error = validar(d)
    if (error) return res.status(400).json({ error })
    const regla = await prisma.reglaConciliacion.create({
      data: { ...d, creadoPorId: req.usuario?.id || null },
      include: incluir,
    })
    res.status(201).json(regla)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al crear la regla.' })
  }
}

const editar = async (req, res) => {
  try {
    const d = datos(req.body)
    const error = validar(d)
    if (error) return res.status(400).json({ error })
    const regla = await prisma.reglaConciliacion.update({
      where: { id: Number(req.params.id) },
      data: d,
      include: incluir,
    })
    res.json(regla)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al editar la regla.' })
  }
}

const eliminar = async (req, res) => {
  try {
    await prisma.reglaConciliacion.delete({ where: { id: Number(req.params.id) } })
    res.json({ mensaje: 'Regla eliminada.' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al eliminar la regla.' })
  }
}

/**
 * Contra qué movimientos calzaría esta regla, sin guardarla.
 *
 * Devuelve también los que ya están tomados por una regla anterior: si una regla que va
 * más arriba en la lista se lleva el movimiento, esta nunca lo va a ver, y es mejor
 * enterarse antes de guardar.
 */
const probar = async (req, res) => {
  try {
    const d = datos(req.body)
    if (!d.patronGlosa) return res.status(400).json({ error: 'Falta el texto que debe traer la glosa.' })

    const [movimientos, otras] = await Promise.all([
      prisma.movimientoBanco.findMany({
        select: { id: true, fecha: true, glosa: true, monto: true },
        orderBy: { fecha: 'desc' },
        take: 500,
      }),
      prisma.reglaConciliacion.findMany({
        where: { activa: true, ...(req.params.id ? { id: { not: Number(req.params.id) } } : {}) },
      }),
    ])

    const calzan = movimientos
      .filter((m) => calza({ ...d, activa: true }, m))
      .map((m) => {
        const previa = primeraQueCalza(otras.filter((r) => (r.orden ?? 0) < d.orden || ((r.orden ?? 0) === d.orden && r.id < (Number(req.params.id) || Infinity))), m)
        return { ...m, tomadoPor: previa ? previa.nombre : null }
      })

    res.json({
      total: calzan.length,
      libres: calzan.filter((m) => !m.tomadoPor).length,
      movimientos: calzan.slice(0, 25),
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al probar la regla.' })
  }
}

module.exports = { listar, crear, editar, eliminar, probar }
