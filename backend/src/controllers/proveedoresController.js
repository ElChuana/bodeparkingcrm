/**
 * Proveedores: quién me cobra a mí.
 *
 * El CRM sabía todo del lado de las ventas y nada del de las compras. Sin un catálogo no
 * se puede contestar "¿cuánto le pagué a este durante el año?" ni agrupar lo que se le
 * debe. La cuenta por defecto existe para que clasificar sus documentos no obligue a
 * repetir la misma decisión cada vez.
 */

const prisma = require('../lib/prisma')
const { normalizarRut, saldoFacturaCompra } = require('../lib/conciliacion')

const INCLUDE = { cuenta: { select: { id: true, nombre: true, color: true } } }

const listar = async (req, res) => {
  const { search, activo } = req.query
  try {
    const proveedores = await prisma.proveedor.findMany({
      where: {
        ...(activo != null ? { activo: activo === 'true' } : {}),
        ...(search
          ? { OR: [{ razonSocial: { contains: search, mode: 'insensitive' } }, { rut: { contains: search } }] }
          : {}),
      },
      include: {
        ...INCLUDE,
        facturasCompra: {
          select: { total: true, cuentaId: true, fechaEmision: true, conciliaciones: { select: { monto: true } } },
        },
      },
      orderBy: { razonSocial: 'asc' },
    })

    // Lo que se le debe y lo que se le ha pagado son derivados: se calculan acá y no se
    // guardan, para que no exista la posibilidad de que queden desincronizados.
    res.json(proveedores.map((p) => {
      const porPagar = p.facturasCompra.reduce((a, f) => a + Math.max(0, saldoFacturaCompra(f)), 0)
      const facturado = p.facturasCompra.reduce((a, f) => a + Number(f.total), 0)
      const sinCuenta = p.facturasCompra.filter((f) => !f.cuentaId).length
      return { ...p, facturasCompra: undefined, nFacturas: p.facturasCompra.length, porPagar, facturado, sinCuenta }
    }))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al listar los proveedores.' })
  }
}

const datos = (body) => {
  const rut = normalizarRut(body.rut)
  return {
    rut,
    razonSocial: String(body.razonSocial || '').trim(),
    giro: body.giro?.trim() || null,
    email: body.email?.trim() || null,
    telefono: body.telefono?.trim() || null,
    contacto: body.contacto?.trim() || null,
    cuentaId: body.cuentaId ? Number(body.cuentaId) : null,
    diasPago: body.diasPago != null && body.diasPago !== '' ? Number(body.diasPago) : null,
    activo: body.activo == null ? true : Boolean(body.activo),
    notas: body.notas || null,
  }
}

const crear = async (req, res) => {
  try {
    const d = datos(req.body)
    if (!d.rut) return res.status(400).json({ error: 'El RUT no es válido.' })
    if (!d.razonSocial) return res.status(400).json({ error: 'Falta la razón social.' })

    const proveedor = await prisma.proveedor.create({ data: d, include: INCLUDE })
    res.status(201).json(proveedor)
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Ya existe un proveedor con ese RUT.' })
    console.error(err)
    res.status(500).json({ error: 'Error al crear el proveedor.' })
  }
}

const editar = async (req, res) => {
  try {
    const d = datos(req.body)
    if (!d.rut) return res.status(400).json({ error: 'El RUT no es válido.' })
    if (!d.razonSocial) return res.status(400).json({ error: 'Falta la razón social.' })

    const proveedor = await prisma.proveedor.update({
      where: { id: Number(req.params.id) },
      data: d,
      include: INCLUDE,
    })
    res.json(proveedor)
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Ya existe otro proveedor con ese RUT.' })
    console.error(err)
    res.status(500).json({ error: 'Error al editar el proveedor.' })
  }
}

/**
 * Un proveedor con documentos no se borra: se desactiva. Borrarlo dejaría huérfano el
 * histórico de lo que se le pagó, que es justamente la razón de tener el catálogo.
 */
const eliminar = async (req, res) => {
  try {
    const id = Number(req.params.id)
    const [nFacturas, nDocs, nGastos] = await Promise.all([
      prisma.facturaCompra.count({ where: { proveedorId: id } }),
      prisma.documentoInterno.count({ where: { proveedorId: id } }),
      prisma.gastoProgramado.count({ where: { proveedorId: id } }),
    ])
    const n = nFacturas + nDocs + nGastos
    if (n > 0) {
      await prisma.proveedor.update({ where: { id }, data: { activo: false } })
      return res.json({ mensaje: `Tiene ${n} documento(s) asociados, así que se desactivó en vez de borrarse.`, desactivado: true })
    }
    await prisma.proveedor.delete({ where: { id } })
    res.json({ mensaje: 'Proveedor eliminado.' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al eliminar el proveedor.' })
  }
}

/**
 * Le pone al histórico del proveedor la cuenta que acaba de definirse. Definir la cuenta
 * del proveedor arregla los documentos futuros; esto arregla los pasados — un clic por
 * proveedor en vez de una edición por documento. Solo toca los que no tienen ninguna.
 */
const aplicarCuenta = async (req, res) => {
  try {
    const id = Number(req.params.id)
    const proveedor = await prisma.proveedor.findUnique({ where: { id } })
    if (!proveedor) return res.status(404).json({ error: 'Proveedor no encontrado.' })
    if (!proveedor.cuentaId) {
      return res.status(400).json({ error: 'Este proveedor todavía no tiene cuenta por defecto. Defínesela primero.' })
    }

    const [facturas, documentos] = await prisma.$transaction([
      prisma.facturaCompra.updateMany({ where: { proveedorId: id, cuentaId: null }, data: { cuentaId: proveedor.cuentaId } }),
      prisma.documentoInterno.updateMany({ where: { proveedorId: id, cuentaId: null }, data: { cuentaId: proveedor.cuentaId } }),
    ])

    res.json({ actualizadas: facturas.count + documentos.count })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al aplicar la cuenta.' })
  }
}

module.exports = { listar, crear, editar, eliminar, aplicarCuenta }
