const prisma = require('./prisma')

// Una venta es "de webinar" según el flag del catálogo de campañas;
// si el lead no está vinculado al catálogo, fallback: el texto contiene "webinar"
const esVentaWebinar = (lead) =>
  lead?.campanaRef
    ? lead.campanaRef.esWebinar
    : (lead?.campana || '').toLowerCase().includes('webinar')

const matchOrigen = (regla, webinar) => {
  if (regla.origen === 'SOLO_WEBINAR') return webinar
  if (regla.origen === 'NO_WEBINAR') return !webinar
  return true
}

// Evalúa las reglas de comisión activas para una venta y crea las Comision.
// Precedencia en ámbito VENDE: regla por usuario > regla por rol; dentro de eso,
// origen específico (SOLO_WEBINAR/NO_WEBINAR) > CUALQUIERA.
async function aplicarReglasComision(ventaId, client = prisma) {
  const venta = await client.venta.findUnique({
    where: { id: Number(ventaId) },
    select: {
      id: true, vendedorId: true, brokerId: true, conPromesa: true,
      precioFinalUF: true, estado: true,
      lead: { select: { campana: true, campanaRef: { select: { esWebinar: true } } } },
    },
  })
  if (!venta || venta.estado === 'ANULADO') return []

  const precio = Number(venta.precioFinalUF)
  const webinar = esVentaWebinar(venta.lead)

  const reglas = await client.reglaComision.findMany({ where: { activa: true } })

  const aCrear = []
  const agregar = (usuarioId, regla) => {
    const total = (precio * regla.porcentaje) / 100
    let primera = (total * regla.pctPromesa) / 100
    let segunda = (total * regla.pctEscritura) / 100
    if (!venta.conPromesa) { primera = 0; segunda = total } // directo a escritura
    aCrear.push({
      ventaId: venta.id,
      usuarioId,
      concepto: regla.nombre,
      porcentaje: regla.porcentaje,
      montoCalculadoUF: total,
      montoPrimera: primera,
      montoSegunda: segunda,
    })
  }

  const expandirRol = async (rol) =>
    client.usuario.findMany({ where: { rol, activo: true }, select: { id: true } })

  // 1) Comisión del vendedor (ámbito VENDE) — se aplica UNA sola regla
  if (venta.vendedorId) {
    const vendedor = await client.usuario.findUnique({
      where: { id: venta.vendedorId }, select: { rol: true },
    })
    const deUsuario = reglas.filter(r => r.ambito === 'VENDE' && r.usuarioId === venta.vendedorId && matchOrigen(r, webinar))
    const deRol = reglas.filter(r => r.ambito === 'VENDE' && !r.usuarioId && r.rol === vendedor?.rol && matchOrigen(r, webinar))
    const candidatas = deUsuario.length ? deUsuario : deRol
    const elegida = candidatas.sort((a, b) => (a.origen === 'CUALQUIERA') - (b.origen === 'CUALQUIERA'))[0]
    if (elegida) agregar(venta.vendedorId, elegida)
  }

  // 2) Ámbito VENTAS_DE_OTROS (ej: jefe de ventas 1% sobre ventas del equipo)
  for (const r of reglas.filter(r => r.ambito === 'VENTAS_DE_OTROS' && matchOrigen(r, webinar))) {
    if (r.usuarioId) {
      if (r.usuarioId !== venta.vendedorId) agregar(r.usuarioId, r)
    } else if (r.rol) {
      for (const u of await expandirRol(r.rol)) {
        if (u.id !== venta.vendedorId) agregar(u.id, r)
      }
    }
  }

  // 3) Ámbito TODAS (ej: comisión webinar de ChileParadise, se suma a la del vendedor)
  for (const r of reglas.filter(r => r.ambito === 'TODAS' && matchOrigen(r, webinar))) {
    if (r.usuarioId) {
      agregar(r.usuarioId, r)
    } else if (r.rol) {
      for (const u of await expandirRol(r.rol)) agregar(u.id, r)
    }
  }

  // 4) Broker externo asignado a la venta (comportamiento histórico: su % personal)
  if (venta.brokerId) {
    const broker = await client.usuario.findUnique({
      where: { id: venta.brokerId }, select: { comisionPorcentaje: true },
    })
    if (broker?.comisionPorcentaje) {
      const total = (precio * broker.comisionPorcentaje) / 100
      const primera = venta.conPromesa ? total / 2 : 0
      const segunda = venta.conPromesa ? total / 2 : total
      aCrear.push({
        ventaId: venta.id,
        usuarioId: venta.brokerId,
        concepto: 'Broker',
        porcentaje: broker.comisionPorcentaje,
        montoCalculadoUF: total,
        montoPrimera: primera,
        montoSegunda: segunda,
      })
    }
  }

  if (aCrear.length > 0) {
    await client.comision.createMany({ data: aCrear })
  }
  return aCrear
}

module.exports = { aplicarReglasComision, esVentaWebinar }
