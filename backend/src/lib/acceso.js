const prisma = require('./prisma')

// Roles que ven todo (no se les acota el acceso por pertenencia)
const ROLES_ACCESO_TOTAL = ['GERENTE', 'JEFE_VENTAS', 'ABOGADO']

// Filtro Prisma para acotar consultas de Lead a los que el usuario puede ver.
// Gerencia/JV/Abogado ven todo; el resto solo sus leads (por vendedor + filtros).
const filtroAcceso = (usuario) => {
  if (ROLES_ACCESO_TOTAL.includes(usuario.rol)) return {}

  const condiciones = [{ vendedorId: usuario.id }]

  if (usuario.campanasFiltro?.length > 0)
    condiciones.push({ campana: { in: usuario.campanasFiltro } })

  if (usuario.edificiosFiltro?.length > 0)
    condiciones.push({ unidadInteres: { edificioId: { in: usuario.edificiosFiltro } } })

  if (usuario.leadsIndividualesFiltro?.length > 0)
    condiciones.push({ id: { in: usuario.leadsIndividualesFiltro } })

  return { OR: condiciones }
}

// ¿El usuario puede acceder a este lead? Se usa para proteger los subrecursos
// anidados de un lead (visitas, actividades, notas, correos) contra IDOR.
async function puedeAccederLead(usuario, leadId) {
  if (ROLES_ACCESO_TOTAL.includes(usuario.rol)) return true
  const lead = await prisma.lead.findFirst({
    where: { id: Number(leadId), ...filtroAcceso(usuario) },
    select: { id: true },
  })
  return !!lead
}

module.exports = { filtroAcceso, puedeAccederLead, ROLES_ACCESO_TOTAL }
