const prisma = require('../lib/prisma')
const { filtroAcceso, puedeAccederLead } = require('../lib/acceso')

const leadIdValido = (valor) => {
  const id = Number(valor)
  return Number.isInteger(id) && id > 0 ? id : null
}

// Favoritos del usuario actual. Vuelve a aplicar el filtro de acceso para que
// un lead reasignado a otro vendedor deje de aparecer sin perder la marca.
const listar = async (req, res) => {
  try {
    const favoritos = await prisma.leadFavorito.findMany({
      where: { usuarioId: req.usuario.id, lead: filtroAcceso(req.usuario) },
      orderBy: { creadoEn: 'desc' },
      select: {
        creadoEn: true,
        lead: {
          select: {
            id: true,
            etapa: true,
            actualizadoEn: true,
            contacto: { select: { nombre: true, apellido: true, telefono: true } },
            vendedor: { select: { nombre: true, apellido: true } },
            unidadInteres: { select: { numero: true, tipo: true, edificio: { select: { nombre: true } } } },
          },
        },
      },
    })
    res.json(favoritos.map(({ creadoEn, lead }) => ({ ...lead, favoritoEn: creadoEn })))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al obtener los clientes favoritos.' })
  }
}

// Idempotente: marcar dos veces no falla ni duplica.
const marcar = async (req, res) => {
  const leadId = leadIdValido(req.params.id)
  if (!leadId) return res.status(400).json({ error: 'Lead inválido.' })

  try {
    if (!(await puedeAccederLead(req.usuario, leadId))) {
      return res.status(404).json({ error: 'Lead no encontrado.' })
    }
    await prisma.leadFavorito.createMany({
      data: [{ usuarioId: req.usuario.id, leadId }],
      skipDuplicates: true,
    })
    res.json({ favorito: true })
  } catch (err) {
    // puedeAccederLead no comprueba existencia para los roles de acceso total
    if (err.code === 'P2003') return res.status(404).json({ error: 'Lead no encontrado.' })
    console.error(err)
    res.status(500).json({ error: 'Error al marcar el favorito.' })
  }
}

const desmarcar = async (req, res) => {
  const leadId = leadIdValido(req.params.id)
  if (!leadId) return res.status(400).json({ error: 'Lead inválido.' })

  try {
    await prisma.leadFavorito.deleteMany({ where: { usuarioId: req.usuario.id, leadId } })
    res.json({ favorito: false })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al quitar el favorito.' })
  }
}

module.exports = { listar, marcar, desmarcar }
