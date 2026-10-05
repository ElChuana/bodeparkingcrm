const prisma = require('../lib/prisma')
const { validarReserva } = require('../lib/sala')

// Reserva de la sala de reuniones de la oficina. Endpoints públicos (la página
// /sala se comparte por link, sin login): el equipo es chico y se confía en
// quien escribe su nombre; el rate limit en la ruta corta cualquier abuso.

const RE_FECHA = /^\d{4}-\d{2}-\d{2}$/

// GET /api/sala/reservas?desde=YYYY-MM-DD&hasta=YYYY-MM-DD
const listar = async (req, res) => {
  try {
    const { desde, hasta } = req.query
    if (!RE_FECHA.test(desde || '') || !RE_FECHA.test(hasta || '')) {
      return res.status(400).json({ error: 'Faltan los parámetros desde y hasta (YYYY-MM-DD).' })
    }
    // Las fechas YYYY-MM-DD se comparan bien como strings
    const reservas = await prisma.reservaSala.findMany({
      where: { fecha: { gte: desde, lte: hasta } },
      orderBy: [{ fecha: 'asc' }, { inicio: 'asc' }],
    })
    res.json(reservas)
  } catch (error) {
    console.error('Error al listar reservas de sala:', error)
    res.status(500).json({ error: 'Error al listar las reservas.' })
  }
}

// POST /api/sala/reservas  { fecha, inicio, fin, nombre, motivo? }
const crear = async (req, res) => {
  try {
    const { fecha, inicio, fin } = req.body
    const nombre = (req.body.nombre || '').trim()
    const motivo = (req.body.motivo || '').trim().slice(0, 120) || null

    const error = validarReserva({ fecha, inicio, fin, nombre })
    if (error) return res.status(400).json({ error })

    // Tope con otra reserva del mismo día: [inicio, fin) contra [inicio, fin)
    const choque = await prisma.reservaSala.findFirst({
      where: { fecha, inicio: { lt: fin }, fin: { gt: inicio } },
    })
    if (choque) {
      return res.status(409).json({
        error: `La sala ya está reservada de ${choque.inicio} a ${choque.fin} por ${choque.nombre}.`,
      })
    }

    const reserva = await prisma.reservaSala.create({
      data: { fecha, inicio, fin, nombre, motivo },
    })
    res.status(201).json(reserva)
  } catch (error) {
    console.error('Error al crear reserva de sala:', error)
    res.status(500).json({ error: 'Error al crear la reserva.' })
  }
}

// DELETE /api/sala/reservas/:id — cualquiera puede liberar la sala (equipo chico)
const eliminar = async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'ID inválido.' })
    }
    const { count } = await prisma.reservaSala.deleteMany({ where: { id } })
    if (count === 0) return res.status(404).json({ error: 'La reserva ya no existe.' })
    res.json({ ok: true })
  } catch (error) {
    console.error('Error al eliminar reserva de sala:', error)
    res.status(500).json({ error: 'Error al eliminar la reserva.' })
  }
}

module.exports = { listar, crear, eliminar }
