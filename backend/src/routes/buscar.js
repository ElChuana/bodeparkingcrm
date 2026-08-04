const express = require('express')
const router = express.Router()
const prisma = require('../lib/prisma')
const { autenticar } = require('../middleware/auth')
const { filtroAcceso, ROLES_ACCESO_TOTAL } = require('../lib/acceso')

router.use(autenticar)

// GET /api/buscar?q=texto
router.get('/', async (req, res) => {
  const { q } = req.query
  if (!q || q.trim().length < 2) return res.json({ leads: [], unidades: [], ventas: [], contactos: [] })

  const texto = q.trim()
  const modo = 'insensitive'

  // Cada palabra debe matchear algún campo (AND entre palabras, OR entre campos).
  // Así "Juan Pérez" matchea aunque "Juan" esté en nombre y "Pérez" en apellido.
  const palabras = texto.split(/\s+/).filter(Boolean)
  const todasLasPalabras = (campos) => ({
    AND: palabras.map(palabra => ({
      OR: campos.map(campo => campo(palabra))
    }))
  })

  // Acota los resultados a lo que el usuario puede ver (mismo criterio que el resto del CRM)
  const { rol, id: usuarioId } = req.usuario
  const accesoTotal = ROLES_ACCESO_TOTAL.includes(rol)
  const esGerenciaOJV = ['GERENTE', 'JEFE_VENTAS'].includes(rol)
  const filtroLead = accesoTotal ? {} : filtroAcceso(req.usuario)
  const filtroVenta = !esGerenciaOJV && rol !== 'ABOGADO' ? { OR: [{ vendedorId: usuarioId }, { brokerId: usuarioId }] } : {}
  const filtroContacto = accesoTotal ? {} : { leads: { some: filtroAcceso(req.usuario) } }
  const conAcceso = (base, extra) => Object.keys(extra).length ? { AND: [base, extra] } : base

  try {
    const [leads, unidades, ventas, contactos] = await Promise.all([

      // Leads — busca por nombre/email/teléfono del contacto
      prisma.lead.findMany({
        where: conAcceso(todasLasPalabras([
          (p) => ({ contacto: { nombre: { contains: p, mode: modo } } }),
          (p) => ({ contacto: { apellido: { contains: p, mode: modo } } }),
          (p) => ({ contacto: { email: { contains: p, mode: modo } } }),
          (p) => ({ contacto: { telefono: { contains: p, mode: modo } } }),
          (p) => ({ contacto: { rut: { contains: p, mode: modo } } }),
        ]), filtroLead),
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
        where: todasLasPalabras([
          (p) => ({ numero: { contains: p, mode: modo } }),
          (p) => ({ edificio: { nombre: { contains: p, mode: modo } } }),
        ]),
        select: {
          id: true, numero: true, tipo: true, estado: true, precioUF: true,
          edificio: { select: { nombre: true, region: true } },
        },
        orderBy: [{ edificio: { nombre: 'asc' } }, { numero: 'asc' }],
        take: 5,
      }),

      // Ventas — busca por nombre del comprador o número de unidad
      prisma.venta.findMany({
        where: conAcceso(todasLasPalabras([
          (p) => ({ comprador: { nombre: { contains: p, mode: modo } } }),
          (p) => ({ comprador: { apellido: { contains: p, mode: modo } } }),
          (p) => ({ comprador: { rut: { contains: p, mode: modo } } }),
          (p) => ({ unidades: { some: { numero: { contains: p, mode: modo } } } }),
          (p) => ({ unidades: { some: { edificio: { nombre: { contains: p, mode: modo } } } } }),
        ]), filtroVenta),
        select: {
          id: true, estado: true, precioFinalUF: true,
          comprador: { select: { nombre: true, apellido: true } },
          unidades: { select: { numero: true, tipo: true, edificio: { select: { nombre: true } } } },
        },
        orderBy: { creadoEn: 'desc' },
        take: 5,
      }),

      // Contactos — búsqueda directa
      prisma.contacto.findMany({
        where: conAcceso(todasLasPalabras([
          (p) => ({ nombre: { contains: p, mode: modo } }),
          (p) => ({ apellido: { contains: p, mode: modo } }),
          (p) => ({ email: { contains: p, mode: modo } }),
          (p) => ({ telefono: { contains: p, mode: modo } }),
          (p) => ({ rut: { contains: p, mode: modo } }),
          (p) => ({ empresa: { contains: p, mode: modo } }),
        ]), filtroContacto),
        select: {
          id: true, nombre: true, apellido: true, email: true, telefono: true, empresa: true,
          _count: { select: { leads: true } }
        },
        orderBy: { nombre: 'asc' },
        take: 5,
      }),
    ])

    res.json({ leads, unidades, ventas, contactos })
  } catch (err) {
    console.error('[Buscar]', err)
    res.status(500).json({ error: 'Error al buscar.' })
  }
})

module.exports = router
