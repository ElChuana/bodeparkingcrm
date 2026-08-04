const prisma = require('../lib/prisma')
const { filtroAcceso, ROLES_ACCESO_TOTAL } = require('../lib/acceso')

// Gerencia/JV/Abogado ven todos los contactos; el resto solo los que tienen
// algún lead accesible por ellos (evita exponer toda la base de clientes).
const filtroContactoPorRol = (usuario) =>
  ROLES_ACCESO_TOTAL.includes(usuario.rol) ? {} : { leads: { some: filtroAcceso(usuario) } }

const listar = async (req, res) => {
  const { search, origen, tipoPersona } = req.query
  try {
    const contactos = await prisma.contacto.findMany({
      where: {
        ...filtroContactoPorRol(req.usuario),
        ...(origen && { origen }),
        ...(tipoPersona && { tipoPersona }),
        ...(search && {
          OR: [
            { nombre: { contains: search, mode: 'insensitive' } },
            { apellido: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { telefono: { contains: search } },
            { rut: { contains: search } }
          ]
        })
      },
      include: { _count: { select: { leads: true } } },
      orderBy: { creadoEn: 'desc' }
    })
    res.json(contactos)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al obtener contactos.' })
  }
}

const obtener = async (req, res) => {
  const { id } = req.params
  try {
    const contacto = await prisma.contacto.findFirst({
      where: { id: Number(id), ...filtroContactoPorRol(req.usuario) },
      include: {
        leads: {
          include: {
            vendedor: { select: { nombre: true, apellido: true } },
            unidadInteres: { select: { numero: true, tipo: true, edificio: { select: { nombre: true } } } }
          },
          orderBy: { creadoEn: 'desc' }
        },
        compras: { include: { unidades: { select: { numero: true, tipo: true } } } }
      }
    })
    if (!contacto) return res.status(404).json({ error: 'Contacto no encontrado.' })
    res.json(contacto)
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener contacto.' })
  }
}

const crear = async (req, res) => {
  const { nombre, apellido, rut, email, telefono, empresa, tipoPersona, origen, notas } = req.body
  if (!nombre || !apellido) {
    return res.status(400).json({ error: 'Nombre y apellido son requeridos.' })
  }
  try {
    // Anti-duplicados: mismo email o mismo teléfono → devolver el existente
    const emailLimpio = (email || '').trim()
    const telLimpio = (telefono || '').replace(/\D/g, '')
    const existente = await prisma.contacto.findFirst({
      where: {
        OR: [
          ...(emailLimpio ? [{ email: { equals: emailLimpio, mode: 'insensitive' } }] : []),
          ...(telLimpio.length >= 8 ? [{ telefono: { contains: telLimpio.slice(-8) } }] : []),
        ],
      },
    })
    if (existente) {
      return res.status(409).json({
        error: `Ya existe un contacto con ese ${emailLimpio && existente.email?.toLowerCase() === emailLimpio.toLowerCase() ? 'email' : 'teléfono'}: ${existente.nombre} ${existente.apellido} (#${existente.id}).`,
        contactoExistente: existente,
      })
    }

    const contacto = await prisma.contacto.create({
      data: { nombre, apellido, rut: rut || null, email, telefono, empresa, tipoPersona, origen, notas }
    })
    res.status(201).json(contacto)
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Ya existe un contacto con ese RUT.' })
    res.status(500).json({ error: 'Error al crear contacto.' })
  }
}

const actualizar = async (req, res) => {
  const { id } = req.params
  const {
    nombre, apellido, rut, email, telefono, empresa, tipoPersona, origen, notas,
    fechaNacimiento, ciudadNacimiento, estadoCivil, profesion, nacionalidad, regimenMatrimonial, direccionParticular
  } = req.body
  try {
    const contacto = await prisma.contacto.update({
      where: { id: Number(id) },
      data: {
        nombre, apellido, rut: rut === '' ? null : rut, email, telefono, empresa, tipoPersona, origen, notas,
        fechaNacimiento: fechaNacimiento ? new Date(fechaNacimiento) : undefined,
        ciudadNacimiento, estadoCivil, profesion, nacionalidad, regimenMatrimonial, direccionParticular
      }
    })
    res.json(contacto)
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Contacto no encontrado.' })
    if (err.code === 'P2002') return res.status(409).json({ error: 'Ya existe un contacto con ese RUT.' })
    res.status(500).json({ error: 'Error al actualizar contacto.' })
  }
}

module.exports = { listar, obtener, crear, actualizar }
