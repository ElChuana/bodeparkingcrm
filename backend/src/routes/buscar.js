const express = require('express')
const router = express.Router()
const prisma = require('../lib/prisma')
const { autenticar } = require('../middleware/auth')

router.use(autenticar)

// GET /api/buscar?q=texto
router.get('/', async (req, res) => {
  const { q } = req.query
  if (!q || q.trim().length < 2) return res.json({ leads: [], unidades: [], ventas: [], contactos: [] })

  const texto = q.trim()
  const modo = 'insensitive'

  try {
    const [leads, unidades, ventas, contactos, promociones] = await Promise.all([

      // Leads — busca por nombre/email/teléfono del contacto
      prisma.lead.findMany({
        where: {
          OR: [
            { contacto: { nombre: { contains: texto, mode: modo } } },
            { contacto: { apellido: { contains: texto, mode: modo } } },
            { contacto: { email: { contains: texto, mode: modo } } },
            { contacto: { telefono: { contains: texto, mode: modo } } },
            { contacto: { rut: { contains: texto, mode: modo } } },
          ]
        },
        select: {
          id: true, etapa: true, creadoEn: true,
          contacto: { select: { nombre: true, apellido: true, email: true, telefono: true } },
          vendedor: { select: { nombre: true, apellido: true } },
        },
        orderBy: { creadoEn: 'desc' },
        take: 5,
      }),

      // Unidades — busca por número o nombre de edificio
      prisma.unidad.findMany({
        where: {
          OR: [
            { numero: { contains: texto, mode: modo } },
            { edificio: { nombre: { contains: texto, mode: modo } } },
          ]
        },
        select: {
          id: true, numero: true, tipo: true, estado: true, precioUF: true,
          edificio: { select: { nombre: true, region: true } },
        },
        orderBy: [{ edificio: { nombre: 'asc' } }, { numero: 'asc' }],
        take: 5,
      }),

      // Ventas — busca por nombre del comprador o número de unidad
      prisma.venta.findMany({
        where: {
          OR: [
            { comprador: { nombre: { contains: texto, mode: modo } } },
            { comprador: { apellido: { contains: texto, mode: modo } } },
            { comprador: { rut: { contains: texto, mode: modo } } },
            { unidades: { some: { numero: { contains: texto, mode: modo } } } },
            { unidades: { some: { edificio: { nombre: { contains: texto, mode: modo } } } } },
          ]
        },
        select: {
          id: true, estado: true, precioUF: true,
          comprador: { select: { nombre: true, apellido: true } },
          unidades: { select: { numero: true, tipo: true, edificio: { select: { nombre: true } } } },
        },
        orderBy: { creadoEn: 'desc' },
        take: 5,
      }),

      // Contactos — búsqueda directa sin lead asociado
      prisma.contacto.findMany({
        where: {
          OR: [
            { nombre: { contains: texto, mode: modo } },
            { apellido: { contains: texto, mode: modo } },
            { email: { contains: texto, mode: modo } },
            { telefono: { contains: texto, mode: modo } },
            { rut: { contains: texto, mode: modo } },
            { empresa: { contains: texto, mode: modo } },
          ]
        },
        select: {
          id: true, nombre: true, apellido: true, email: true, telefono: true, empresa: true,
          _count: { select: { leads: true } }
        },
        orderBy: { nombre: 'asc' },
        take: 5,
      }),

      // Promociones y packs
      prisma.promocion.findMany({
        where: {
          OR: [
            { nombre: { contains: texto, mode: modo } },
            { descripcion: { contains: texto, mode: modo } },
            { detalle: { contains: texto, mode: modo } },
          ]
        },
        select: {
          id: true, nombre: true, tipo: true, categoria: true, activa: true,
          valorPorcentaje: true, valorUF: true, minUnidades: true,
          _count: { select: { ventas: true } },
        },
        orderBy: { nombre: 'asc' },
        take: 5,
      }),
    ])

    res.json({ leads, unidades, ventas, contactos, promociones })
  } catch (err) {
    console.error('[Buscar]', err)
    res.status(500).json({ error: 'Error al buscar.' })
  }
})

module.exports = router
