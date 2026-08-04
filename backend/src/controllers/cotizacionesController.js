const prisma = require('../lib/prisma')
const { aplicarReglasComision } = require('../lib/comisiones')
const { calcularTotalesVenta, prorratearPrecioVenta } = require('../lib/precios')

const INCLUDE_COMPLETO = {
  lead: {
    select: {
      id: true,
      contacto: { select: { id: true, nombre: true, apellido: true, email: true, telefono: true } },
      vendedor: { select: { id: true, nombre: true, apellido: true, email: true, telefono: true } },
      broker:   { select: { id: true, nombre: true, apellido: true, email: true, telefono: true } },
      ventas:   { select: { id: true, estado: true } },
    }
  },
  creadoPor: { select: { id: true, nombre: true, apellido: true } },
  items: {
    include: {
      unidad: {
        include: {
          edificio: { select: { id: true, nombre: true, region: true } }
        }
      }
    }
  },
  packs: {
    include: {
      pack: {
        include: { unidades: { select: { unidadId: true } } }
      }
    }
  },
  beneficios: {
    include: { beneficio: true }
  },
  promociones: {
    include: {
      promocion: { include: { unidades: { select: { unidadId: true } } } }
    }
  },
  solicitudesDescuento: {
    orderBy: { creadoEn: 'desc' },
    include: {
      solicitadoPor: { select: { id: true, nombre: true, apellido: true } },
      revisadoPor:   { select: { id: true, nombre: true, apellido: true } }
    }
  }
}

function calcularTotales(cotizacion) {
  const precioListaUF = (cotizacion.items || []).reduce((s, i) => s + (i.precioListaUF || 0), 0)
  const descuentoPacksUF = (cotizacion.packs || []).reduce((s, p) => s + (p.descuentoAplicadoUF || 0), 0)
  const descuentoPromosUF = (cotizacion.promociones || []).reduce((s, p) => s + (p.descuentoAplicadoUF || 0), 0)
  const descuentoAprobadoUF = cotizacion.descuentoAprobadoUF || 0
  const precioFinalUF = Math.max(precioListaUF - descuentoPacksUF - descuentoPromosUF - descuentoAprobadoUF, 0)
  return { precioListaUF, descuentoPacksUF, descuentoPromosUF, descuentoAprobadoUF, precioFinalUF }
}

// Recalcula el descuento de cada promoción aplicada y el snapshot por ítem (descuentoUF).
// Reglas por tipo (categoría DESCUENTO):
//   - DESCUENTO_UF con unidades asociadas  → POR UNIDAD: valorUF por cada unidad de la promo presente
//     (se snapshotea en CotizacionItem.descuentoUF → habilita el precio tachado por unidad)
//   - DESCUENTO_UF sin unidades             → fijo por volumen si items >= minUnidades
//   - DESCUENTO_PORCENTAJE                  → % sobre la base (unidades de la promo o todas)
//   - PAQUETE                               → suma de precios de las unidades del pack − valorUF
//   - categoría BENEFICIO                   → 0 (no afecta precio)
async function recalcularPromociones(cotizacionId) {
  const cot = await prisma.cotizacion.findUnique({
    where: { id: cotizacionId },
    include: {
      items: true,
      promociones: { include: { promocion: { include: { unidades: { select: { unidadId: true } } } } } },
    },
  })
  if (!cot) return

  // UF vigente: para descuentos con precio objetivo en pesos (peso exacto)
  const ufRow = await prisma.uFDiaria.findFirst({ orderBy: { fecha: 'desc' } })
  const valorUF = ufRow?.valorPesos || null

  const itemUnidadIds = cot.items.map(i => i.unidadId)
  const descuentoPorUnidad = {} // unidadId → UF acumulado (para el snapshot/tachado)

  for (const cp of cot.promociones) {
    const promo = cp.promocion
    const promoUnidadIds = promo.unidades.map(u => u.unidadId)
    const tieneUnidades = promoUnidadIds.length > 0
    let descuento = 0

    if (promo.categoria === 'DESCUENTO') {
      if (promo.tipo === 'PAQUETE') {
        const todas = tieneUnidades && promoUnidadIds.every(id => itemUnidadIds.includes(id))
        if (todas) {
          const suma = cot.items.filter(i => promoUnidadIds.includes(i.unidadId)).reduce((s, i) => s + i.precioListaUF, 0)
          descuento = Math.max(suma - (promo.valorUF || 0), 0)
        }
      } else if (promo.tipo === 'DESCUENTO_UF') {
        if (tieneUnidades) {
          const afectadas = cot.items.filter(i => promoUnidadIds.includes(i.unidadId))
          // Si la promo define un precio objetivo en pesos, el descuento por unidad
          // se calcula con la UF vigente para que el precio final en $ caiga exacto.
          const usarObjetivo = promo.precioObjetivoPesos != null && valorUF
          for (const it of afectadas) {
            const d = usarObjetivo
              ? Math.max(it.precioListaUF - (promo.precioObjetivoPesos / valorUF), 0)
              : (promo.valorUF || 0)
            descuentoPorUnidad[it.unidadId] = (descuentoPorUnidad[it.unidadId] || 0) + d
            descuento += d
          }
        } else if (!promo.minUnidades || cot.items.length >= promo.minUnidades) {
          descuento = promo.valorUF || 0
        }
      } else if (promo.tipo === 'DESCUENTO_PORCENTAJE') {
        const base = tieneUnidades
          ? cot.items.filter(i => promoUnidadIds.includes(i.unidadId)).reduce((s, i) => s + i.precioListaUF, 0)
          : cot.items.reduce((s, i) => s + i.precioListaUF, 0)
        if (!promo.minUnidades || cot.items.length >= promo.minUnidades) {
          descuento = base * ((promo.valorPorcentaje || 0) / 100)
        }
      }
    }

    await prisma.cotizacionPromocion.update({
      where: { id: cp.id },
      // 6 decimales: con precio objetivo en pesos el peso final debe caer exacto
      data: { descuentoAplicadoUF: Number(descuento.toFixed(6)) },
    })
  }

  // Snapshot por ítem (descuento por unidad → precio tachado en el PDF)
  for (const it of cot.items) {
    const d = Number((descuentoPorUnidad[it.unidadId] || 0).toFixed(6))
    if (it.descuentoUF !== d) {
      await prisma.cotizacionItem.update({ where: { id: it.id }, data: { descuentoUF: d } })
    }
  }
}

// Middleware: verifica que el usuario pueda acceder a la cotización :id.
// Gerencia/JV acceden a todas; el resto solo a las que crearon (evita IDOR).
const verificarAccesoCotizacion = async (req, res, next) => {
  if (['GERENTE', 'JEFE_VENTAS'].includes(req.usuario.rol)) return next()
  const cot = await prisma.cotizacion.findFirst({
    where: { id: Number(req.params.id), creadoPorId: req.usuario.id },
    select: { id: true },
  })
  if (!cot) return res.status(404).json({ error: 'Cotización no encontrada.' })
  next()
}

// Quita los precios sensibles de las unidades de una cotización para roles sin permiso.
const ocultarPreciosCotizacion = (cotizacion, esGerenciaOJV) => {
  if (esGerenciaOJV || !cotizacion?.items) return cotizacion
  cotizacion.items = cotizacion.items.map(it =>
    it.unidad
      ? { ...it, unidad: (({ precioMinimoUF, precioCostoUF, precioVentaUF, ...u }) => u)(it.unidad) }
      : it
  )
  return cotizacion
}

const listar = async (req, res) => {
  const { leadId, estado } = req.query
  const esGerenciaOJV = ['GERENTE', 'JEFE_VENTAS'].includes(req.usuario.rol)

  try {
    const cotizaciones = await prisma.cotizacion.findMany({
      where: {
        ...(leadId && { leadId: Number(leadId) }),
        ...(estado && { estado }),
        ...(!esGerenciaOJV && { creadoPorId: req.usuario.id }),
      },
      include: {
        lead: {
          select: { id: true, contacto: { select: { nombre: true, apellido: true } } }
        },
        creadoPor: { select: { nombre: true, apellido: true } },
        items: { select: { precioListaUF: true } },
        packs: { select: { descuentoAplicadoUF: true } },
        ventaOrigen: { select: { id: true, estado: true } }, // venta generada (si se convirtió)
        _count: { select: { items: true, packs: true, beneficios: true } }
      },
      orderBy: { creadoEn: 'desc' }
    })
    const result = cotizaciones.map(c => ({ ...c, ...calcularTotales(c) }))
    res.json(result)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al obtener cotizaciones.' })
  }
}

const obtener = async (req, res) => {
  const { id } = req.params
  try {
    const cotizacion = await prisma.cotizacion.findUnique({
      where: { id: Number(id) },
      include: INCLUDE_COMPLETO
    })
    if (!cotizacion) return res.status(404).json({ error: 'Cotización no encontrada.' })
    const esGerenciaOJV = ['GERENTE', 'JEFE_VENTAS'].includes(req.usuario.rol)
    const cot = ocultarPreciosCotizacion(cotizacion, esGerenciaOJV)
    res.json({ ...cot, ...calcularTotales(cotizacion) })
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener cotización.' })
  }
}

const crear = async (req, res) => {
  const { leadId, items, notas, validezDias } = req.body

  if (!leadId || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Se requiere lead y al menos una unidad.' })
  }

  try {
    const cotizacion = await prisma.cotizacion.create({
      data: {
        leadId: Number(leadId),
        creadoPorId: req.usuario.id,
        notas: notas || null,
        validezDias: validezDias || 7,
        items: {
          create: items.map(i => ({
            unidadId: Number(i.unidadId),
            precioListaUF: Number(i.precioListaUF),
          }))
        }
      },
      include: INCLUDE_COMPLETO
    })
    const esGerenciaOJV = ['GERENTE', 'JEFE_VENTAS'].includes(req.usuario.rol)
    const cot = ocultarPreciosCotizacion(cotizacion, esGerenciaOJV)
    res.status(201).json({ ...cot, ...calcularTotales(cotizacion) })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al crear cotización.' })
  }
}

const actualizar = async (req, res) => {
  const { id } = req.params
  const { items, notas, validezDias } = req.body

  try {
    const cot = await prisma.cotizacion.findUnique({
      where: { id: Number(id) },
      select: { ventaOrigen: { select: { id: true } } }
    })
    if (cot?.ventaOrigen) {
      return res.status(400).json({ error: 'No se puede editar una cotización que ya fue convertida en venta.' })
    }

    // Deduplicar items entrantes por unidad (evita filas repetidas) y aplicar de forma atómica
    const itemsUnicos = Array.isArray(items)
      ? Array.from(new Map(items.map(i => [Number(i.unidadId), i])).values())
      : null

    if (itemsUnicos) {
      await prisma.$transaction([
        prisma.cotizacionItem.deleteMany({ where: { cotizacionId: Number(id) } }),
        prisma.cotizacionItem.createMany({
          data: itemsUnicos.map(i => ({
            cotizacionId: Number(id),
            unidadId: Number(i.unidadId),
            precioListaUF: Number(i.precioListaUF),
          })),
        }),
      ])
    }

    const cotizacion = await prisma.cotizacion.update({
      where: { id: Number(id) },
      data: {
        ...(notas !== undefined && { notas }),
        ...(validezDias !== undefined && { validezDias }),
      },
      include: INCLUDE_COMPLETO
    })

    // Si cambiaron las unidades, recalcular descuentos de promociones y snapshot por ítem
    if (Array.isArray(items)) {
      await recalcularPromociones(Number(id))
    }
    const refrescada = await prisma.cotizacion.findUnique({ where: { id: Number(id) }, include: INCLUDE_COMPLETO })
    const esGerenciaOJV = ['GERENTE', 'JEFE_VENTAS'].includes(req.usuario.rol)
    const cotVisible = ocultarPreciosCotizacion(refrescada, esGerenciaOJV)
    res.json({ ...cotVisible, ...calcularTotales(refrescada) })
  } catch (err) {
    console.error(err)
    if (err.code === 'P2025') return res.status(404).json({ error: 'Cotización no encontrada.' })
    res.status(500).json({ error: 'Error al actualizar cotización.' })
  }
}

const cambiarEstado = async (req, res) => {
  const { id } = req.params
  const { estado } = req.body
  const validos = ['BORRADOR', 'ENVIADA', 'ACEPTADA', 'RECHAZADA']
  if (!validos.includes(estado)) return res.status(400).json({ error: 'Estado inválido.' })

  try {
    const cotizacion = await prisma.cotizacion.update({
      where: { id: Number(id) },
      data: { estado },
      include: INCLUDE_COMPLETO
    })
    res.json({ ...cotizacion, ...calcularTotales(cotizacion) })
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Cotización no encontrada.' })
    res.status(500).json({ error: 'Error al cambiar estado.' })
  }
}

const eliminar = async (req, res) => {
  const { id } = req.params
  try {
    await prisma.cotizacion.delete({ where: { id: Number(id) } })
    res.json({ ok: true })
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Cotización no encontrada.' })
    res.status(500).json({ error: 'Error al eliminar cotización.' })
  }
}

const unidadesDisponibles = async (req, res) => {
  const { search, edificioId, tipo } = req.query
  try {
    const unidades = await prisma.unidad.findMany({
      where: {
        estado: 'DISPONIBLE',
        NOT: { ventaId: { not: null } },
        ...(edificioId && { edificioId: Number(edificioId) }),
        ...(tipo && { tipo }),
        ...(search && {
          OR: [
            { numero: { contains: search, mode: 'insensitive' } },
            { edificio: { nombre: { contains: search, mode: 'insensitive' } } }
          ]
        })
      },
      include: {
        edificio: { select: { id: true, nombre: true, region: true, comuna: true } },
        packs: {
          include: { pack: true },
          where: {
            pack: {
              activa: true,
              OR: [{ fechaFin: null }, { fechaFin: { gte: new Date() } }]
            }
          }
        },
        beneficios: {
          include: { beneficio: true },
          where: {
            beneficio: {
              activa: true,
              OR: [{ fechaFin: null }, { fechaFin: { gte: new Date() } }]
            }
          }
        },
        promociones: {
          include: { promocion: true },
          where: {
            promocion: {
              activa: true,
              OR: [{ fechaFin: null }, { fechaFin: { gte: new Date() } }]
            }
          }
        }
      },
      orderBy: [{ edificio: { nombre: 'asc' } }, { numero: 'asc' }]
    })
    res.json(unidades)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al obtener unidades.' })
  }
}

const agregarPack = async (req, res) => {
  const { id } = req.params
  const { packId } = req.body
  if (!packId) return res.status(400).json({ error: 'packId requerido.' })

  try {
    const cotizacion = await prisma.cotizacion.findUnique({
      where: { id: Number(id) },
      include: { items: true, packs: true, ventaOrigen: true }
    })
    if (!cotizacion) return res.status(404).json({ error: 'Cotización no encontrada.' })
    if (cotizacion.ventaOrigen) return res.status(400).json({ error: 'Cotización ya fue convertida.' })

    const pack = await prisma.pack.findUnique({
      where: { id: Number(packId) },
      include: { unidades: { select: { unidadId: true } } }
    })
    if (!pack || !pack.activa) return res.status(404).json({ error: 'Pack no encontrado o inactivo.' })

    if (pack.tipo === 'COMBO_ESPECIFICO') {
      const unidadesEnPack = pack.unidades.map(u => u.unidadId)
      const unidadesEnCot = cotizacion.items.map(i => i.unidadId)
      const faltantes = unidadesEnPack.filter(uid => !unidadesEnCot.includes(uid))
      if (faltantes.length > 0) {
        return res.status(400).json({ error: 'La cotización no contiene todas las unidades requeridas por este pack.' })
      }
    } else if (pack.tipo === 'POR_CANTIDAD') {
      if (cotizacion.items.length < pack.minUnidades) {
        return res.status(400).json({ error: `Este pack requiere al menos ${pack.minUnidades} unidades en la cotización.` })
      }
    }

    if (cotizacion.packs.find(p => p.packId === Number(packId))) {
      return res.status(400).json({ error: 'Pack ya aplicado a esta cotización.' })
    }

    await prisma.cotizacionPack.create({
      data: {
        cotizacionId: Number(id),
        packId: Number(packId),
        descuentoAplicadoUF: pack.descuentoUF
      }
    })

    const actualizada = await prisma.cotizacion.findUnique({ where: { id: Number(id) }, include: INCLUDE_COMPLETO })
    res.json({ ...actualizada, ...calcularTotales(actualizada) })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al agregar pack.' })
  }
}

const quitarPack = async (req, res) => {
  const { id, packId } = req.params
  try {
    await prisma.cotizacionPack.deleteMany({
      where: { cotizacionId: Number(id), packId: Number(packId) }
    })
    const actualizada = await prisma.cotizacion.findUnique({ where: { id: Number(id) }, include: INCLUDE_COMPLETO })
    if (!actualizada) return res.status(404).json({ error: 'Cotización no encontrada.' })
    res.json({ ...actualizada, ...calcularTotales(actualizada) })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al quitar pack.' })
  }
}

const agregarBeneficio = async (req, res) => {
  const { id } = req.params
  const { beneficioId } = req.body
  if (!beneficioId) return res.status(400).json({ error: 'beneficioId requerido.' })

  try {
    const cotizacion = await prisma.cotizacion.findUnique({
      where: { id: Number(id) },
      include: { beneficios: true }
    })
    if (!cotizacion) return res.status(404).json({ error: 'Cotización no encontrada.' })
    if (cotizacion.beneficios.find(b => b.beneficioId === Number(beneficioId))) {
      return res.status(400).json({ error: 'Beneficio ya aplicado a esta cotización.' })
    }

    await prisma.cotizacionBeneficio.create({
      data: { cotizacionId: Number(id), beneficioId: Number(beneficioId) }
    })

    const actualizada = await prisma.cotizacion.findUnique({ where: { id: Number(id) }, include: INCLUDE_COMPLETO })
    res.json({ ...actualizada, ...calcularTotales(actualizada) })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al agregar beneficio.' })
  }
}

const quitarBeneficio = async (req, res) => {
  const { id, beneficioId } = req.params
  try {
    await prisma.cotizacionBeneficio.deleteMany({
      where: { cotizacionId: Number(id), beneficioId: Number(beneficioId) }
    })
    const actualizada = await prisma.cotizacion.findUnique({ where: { id: Number(id) }, include: INCLUDE_COMPLETO })
    if (!actualizada) return res.status(404).json({ error: 'Cotización no encontrada.' })
    res.json({ ...actualizada, ...calcularTotales(actualizada) })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al quitar beneficio.' })
  }
}

// ─── Promociones unificadas (descuentos + beneficios) ─────────────
const agregarPromocion = async (req, res) => {
  const { id } = req.params
  const { promocionId } = req.body
  if (!promocionId) return res.status(400).json({ error: 'promocionId requerido.' })

  try {
    const cotizacion = await prisma.cotizacion.findUnique({
      where: { id: Number(id) },
      include: { items: true, promociones: true, ventaOrigen: true },
    })
    if (!cotizacion) return res.status(404).json({ error: 'Cotización no encontrada.' })
    if (cotizacion.ventaOrigen) return res.status(400).json({ error: 'Cotización ya fue convertida.' })

    const promo = await prisma.promocion.findUnique({
      where: { id: Number(promocionId) },
      include: { unidades: { select: { unidadId: true } } },
    })
    if (!promo || !promo.activa) return res.status(404).json({ error: 'Promoción no encontrada o inactiva.' })
    if (cotizacion.promociones.find(p => p.promocionId === Number(promocionId))) {
      return res.status(400).json({ error: 'Promoción ya aplicada a esta cotización.' })
    }

    // Validaciones para descuentos
    if (promo.categoria === 'DESCUENTO') {
      const promoUnidadIds = promo.unidades.map(u => u.unidadId)
      const itemUnidadIds = cotizacion.items.map(i => i.unidadId)
      if (promo.tipo === 'PAQUETE') {
        if (promoUnidadIds.length === 0) return res.status(400).json({ error: 'El pack no tiene unidades configuradas.' })
        const faltan = promoUnidadIds.filter(uid => !itemUnidadIds.includes(uid))
        if (faltan.length > 0) return res.status(400).json({ error: 'La cotización no contiene todas las unidades del pack.' })
      } else if (promoUnidadIds.length > 0) {
        if (!promoUnidadIds.some(uid => itemUnidadIds.includes(uid))) {
          return res.status(400).json({ error: 'Ninguna unidad de la cotización aplica a esta promoción.' })
        }
      } else if (promo.minUnidades && cotizacion.items.length < promo.minUnidades) {
        return res.status(400).json({ error: `Esta promoción requiere al menos ${promo.minUnidades} unidades.` })
      }
    }

    await prisma.cotizacionPromocion.create({
      data: { cotizacionId: Number(id), promocionId: Number(promocionId), descuentoAplicadoUF: 0 },
    })
    await recalcularPromociones(Number(id))

    const actualizada = await prisma.cotizacion.findUnique({ where: { id: Number(id) }, include: INCLUDE_COMPLETO })
    res.json({ ...actualizada, ...calcularTotales(actualizada) })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al agregar promoción.' })
  }
}

const quitarPromocion = async (req, res) => {
  const { id, promocionId } = req.params
  try {
    await prisma.cotizacionPromocion.deleteMany({
      where: { cotizacionId: Number(id), promocionId: Number(promocionId) },
    })
    await recalcularPromociones(Number(id))
    const actualizada = await prisma.cotizacion.findUnique({ where: { id: Number(id) }, include: INCLUDE_COMPLETO })
    if (!actualizada) return res.status(404).json({ error: 'Cotización no encontrada.' })
    res.json({ ...actualizada, ...calcularTotales(actualizada) })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al quitar promoción.' })
  }
}

const convertir = async (req, res) => {
  const { id } = req.params
  const { conPromesa = true } = req.body

  try {
    const cotizacion = await prisma.cotizacion.findUnique({
      where: { id: Number(id) },
      include: {
        items: { include: { unidad: true } },
        packs: true,
        beneficios: true,
        promociones: { include: { promocion: true } },
        lead: { select: { id: true, vendedorId: true, brokerId: true, contactoId: true } },
        ventaOrigen: true
      }
    })

    if (!cotizacion) return res.status(404).json({ error: 'Cotización no encontrada.' })
    if (cotizacion.ventaOrigen) return res.status(400).json({ error: 'Esta cotización ya fue convertida en venta.' })
    if (cotizacion.estado === 'RECHAZADA') return res.status(400).json({ error: 'No se puede convertir una cotización rechazada.' })
    if (cotizacion.items.length === 0) return res.status(400).json({ error: 'La cotización no tiene unidades.' })

    const unidadesNoDisponibles = cotizacion.items.filter(i => i.unidad.estado !== 'DISPONIBLE' || i.unidad.ventaId !== null)
    if (unidadesNoDisponibles.length > 0) {
      const nums = unidadesNoDisponibles.map(i => i.unidad.numero).join(', ')
      return res.status(400).json({ error: `Las siguientes unidades ya no están disponibles: ${nums}` })
    }

    // Totales de la cabecera (packs y promociones se consolidan en descuentoPacksUF)
    const { precioListaUF, descuentoPacksUF, descuentoAprobadoUF, precioFinalUF } = calcularTotalesVenta({
      items: cotizacion.items,
      packs: cotizacion.packs,
      promociones: cotizacion.promociones,
      descuentoAprobadoUF: cotizacion.descuentoAprobadoUF,
    })

    const gerentes = await prisma.usuario.findMany({ where: { rol: 'GERENTE', activo: true }, select: { id: true } })
    const gerenteId = gerentes[0]?.id || null

    const venta = await prisma.$transaction(async (tx) => {
      const nuevaVenta = await tx.venta.create({
        data: {
          leadId: cotizacion.lead.id,
          compradorId: cotizacion.lead.contactoId,
          vendedorId: cotizacion.lead.vendedorId || null,
          brokerId: cotizacion.lead.brokerId || null,
          gerenteId,
          cotizacionOrigenId: cotizacion.id,
          precioListaUF,
          descuentoPacksUF,
          descuentoAprobadoUF,
          precioFinalUF,
          estado: 'RESERVA',
          fechaReserva: new Date(),
          conPromesa: Boolean(conPromesa)
        }
      })

      // Congelar el precio pactado por unidad: se reparte el precio final de la
      // venta proporcional al precio de lista de cada unidad (mismo % de descuento).
      // Queda independiente del catálogo (unidad.precioUF), que se bloquea al vender.
      for (const { unidadId, precioVentaUF } of prorratearPrecioVenta(cotizacion.items, precioFinalUF)) {
        await tx.unidad.update({
          where: { id: unidadId },
          data: { ventaId: nuevaVenta.id, estado: 'RESERVADO', precioVentaUF }
        })
      }

      for (const cb of cotizacion.beneficios) {
        await tx.ventaBeneficio.create({
          data: { ventaId: nuevaVenta.id, beneficioId: cb.beneficioId }
        })
      }

      for (const cp of cotizacion.promociones) {
        await tx.ventaPromocion.create({
          data: {
            ventaId: nuevaVenta.id,
            promocionId: cp.promocionId,
            categoria: cp.promocion.categoria,
            descuentoAplicadoUF: cp.descuentoAplicadoUF,
          }
        })
      }

      await tx.cotizacion.update({ where: { id: cotizacion.id }, data: { estado: 'ACEPTADA' } })
      await tx.lead.update({ where: { id: cotizacion.lead.id }, data: { etapa: 'RESERVA' } })

      const procesoLegal = await tx.procesoLegal.create({
        data: {
          ventaId: nuevaVenta.id,
          tienePromesa: Boolean(conPromesa),
          estadoActual: conPromesa ? 'CONFECCION_PROMESA' : 'CONFECCION_ESCRITURA',
        }
      })

      await tx.historialLegal.create({
        data: {
          procesoLegalId: procesoLegal.id,
          paso: procesoLegal.estadoActual,
          usuarioId: req.usuario?.id || null
        }
      })

      return nuevaVenta
    })

    await aplicarReglasComision(venta.id)

    const ventaCompleta = await prisma.venta.findUnique({
      where: { id: venta.id },
      include: {
        comprador: true,
        unidades: { include: { edificio: true } },
        beneficios: { include: { beneficio: true } },
        procesoLegal: true,
        comisiones: true
      }
    })

    res.status(201).json(ventaCompleta)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al convertir cotización.' })
  }
}

module.exports = { listar, obtener, crear, actualizar, cambiarEstado, eliminar, unidadesDisponibles, agregarPack, quitarPack, agregarBeneficio, quitarBeneficio, agregarPromocion, quitarPromocion, convertir, recalcularPromociones, calcularTotales, verificarAccesoCotizacion }
