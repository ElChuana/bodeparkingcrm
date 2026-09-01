/**
 * Documentos y provisiones: la afirmación de "esta plata fue (o va a ser) esto".
 *
 *   · GastoProgramado — la plantilla recurrente ("arriendo, 16 UF, el 5 de cada mes").
 *   · DocumentoInterno PROVISION — la ocurrencia concreta que el cron genera por período,
 *     con la alerta "no te han facturado" cuando la fecha pasó sin factura asociada.
 *   · DocumentoInterno RESPALDO — el documento ficticio para plata sin DTE (la notaría).
 *   · FacturaCompra mínima — el DTE real que cierra el ciclo de la provisión.
 *
 * El estado de todo esto se CALCULA (lib/documentos.js), nunca se guarda.
 */

const prisma = require('../lib/prisma')
const { valorUFEn } = require('../lib/uf')
const { conEstado, provisionesFaltantes, montoCLPDocumento } = require('../lib/documentos')
const { normalizarRut } = require('../lib/conciliacion')

const INCLUDE_DOC = {
  cuenta: { select: { id: true, nombre: true, color: true, padreId: true } },
  proveedor: { select: { id: true, razonSocial: true, rut: true } },
  contacto: { select: { id: true, nombre: true, apellido: true } },
  gastoProgramado: { select: { id: true, nombre: true, periodicidad: true } },
  facturaCompra: {
    select: {
      id: true, folio: true, tipoDte: true, total: true, fechaEmision: true,
      conciliaciones: { select: { monto: true, movimiento: { select: { id: true, fecha: true, glosa: true } } } },
    },
  },
  conciliaciones: { select: { id: true, monto: true, movimiento: { select: { id: true, fecha: true, glosa: true, monto: true } } } },
  creadoPor: { select: { nombre: true, apellido: true } },
}

// ─── DOCUMENTOS INTERNOS ──────────────────────────────────────

const listarDocumentos = async (req, res) => {
  const { tipo, estado, cuentaId, desde, hasta } = req.query
  try {
    const [docs, uf] = await Promise.all([
      prisma.documentoInterno.findMany({
        where: {
          ...(tipo && { tipo }),
          ...(cuentaId && { cuentaId: Number(cuentaId) }),
          ...(desde || hasta
            ? { fechaEsperada: { ...(desde && { gte: new Date(desde) }), ...(hasta && { lte: new Date(hasta) }) } }
            : {}),
        },
        include: INCLUDE_DOC,
        orderBy: [{ fechaEsperada: 'desc' }, { id: 'desc' }],
      }),
      valorUFEn().catch(() => null),
    ])

    const valorUF = uf?.valor || 0
    let filas = docs.map((d) => ({ ...conEstado(d, { valorUF }), montoEstimadoCLP: montoCLPDocumento(d, valorUF) }))
    // El estado es calculado, así que el filtro se aplica después de calcularlo.
    if (estado) filas = filas.filter((d) => d.estado === estado)

    res.json({ valorUF, documentos: filas })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al listar los documentos.' })
  }
}

const datosDocumento = (body) => ({
  ...(body.tipo !== undefined && { tipo: body.tipo === 'RESPALDO' ? 'RESPALDO' : 'PROVISION' }),
  ...(body.lado !== undefined && { lado: body.lado === 'INGRESO' ? 'INGRESO' : 'GASTO' }),
  ...(body.descripcion !== undefined && { descripcion: String(body.descripcion || '').trim() }),
  ...(body.fechaEsperada !== undefined && { fechaEsperada: new Date(body.fechaEsperada) }),
  ...(body.montoUF !== undefined && { montoUF: Number(body.montoUF) > 0 ? Number(body.montoUF) : null }),
  ...(body.montoCLP !== undefined && { montoCLP: Number(body.montoCLP) > 0 ? Math.round(Number(body.montoCLP)) : null }),
  ...(body.cuentaId !== undefined && { cuentaId: body.cuentaId ? Number(body.cuentaId) : null }),
  ...(body.proveedorId !== undefined && { proveedorId: body.proveedorId ? Number(body.proveedorId) : null }),
  ...(body.contactoId !== undefined && { contactoId: body.contactoId ? Number(body.contactoId) : null }),
  ...(body.notas !== undefined && { notas: body.notas || null }),
})

/** Crea una provisión (o un respaldo suelto) a mano: "sé que me van a facturar tal cosa". */
const crearDocumento = async (req, res) => {
  const d = datosDocumento(req.body)
  if (!d.descripcion) return res.status(400).json({ error: 'Describe qué es este documento.' })
  if (!d.fechaEsperada || isNaN(d.fechaEsperada)) return res.status(400).json({ error: 'Indica la fecha esperada.' })
  if (!(Number(req.body.montoUF) > 0) && !(Number(req.body.montoCLP) > 0)) {
    return res.status(400).json({ error: 'Indica el monto, en UF o en pesos.' })
  }
  if (d.proveedorId && d.contactoId) return res.status(400).json({ error: 'La contraparte es un cliente o un proveedor, no los dos.' })

  try {
    const doc = await prisma.documentoInterno.create({
      data: { tipo: 'PROVISION', lado: 'GASTO', ...d, creadoPorId: req.usuario.id },
      include: INCLUDE_DOC,
    })
    res.status(201).json(conEstado(doc, {}))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al crear el documento.' })
  }
}

/** Edita/reclasifica un documento. El monto solo se toca si aún no tiene pago. */
const editarDocumento = async (req, res) => {
  try {
    const doc = await prisma.documentoInterno.findUnique({
      where: { id: Number(req.params.id) },
      include: { conciliaciones: { select: { id: true } } },
    })
    if (!doc) return res.status(404).json({ error: 'Documento no encontrado.' })

    const d = datosDocumento(req.body)
    if (doc.conciliaciones.length && (d.montoUF !== undefined || d.montoCLP !== undefined)) {
      delete d.montoUF
      delete d.montoCLP
    }

    const actualizado = await prisma.documentoInterno.update({
      where: { id: doc.id },
      data: d,
      include: INCLUDE_DOC,
    })
    res.json(conEstado(actualizado, {}))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al editar el documento.' })
  }
}

/** Un documento con plata imputada o factura asociada no se borra. */
const eliminarDocumento = async (req, res) => {
  try {
    const doc = await prisma.documentoInterno.findUnique({
      where: { id: Number(req.params.id) },
      include: { conciliaciones: { select: { id: true } } },
    })
    if (!doc) return res.status(404).json({ error: 'Documento no encontrado.' })
    if (doc.conciliaciones.length) return res.status(400).json({ error: 'Tiene pagos imputados: desconcilia primero.' })
    if (doc.facturaCompraId) return res.status(400).json({ error: 'Tiene una factura asociada: desasóciala primero.' })

    await prisma.documentoInterno.delete({ where: { id: doc.id } })
    res.json({ mensaje: 'Documento eliminado.' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al eliminar el documento.' })
  }
}

/**
 * Asocia la factura real a la provisión: "ya me facturaron esto".
 * La factura hereda la cuenta de la provisión si venía sin clasificar, y desde ahí el
 * pago se imputa a la factura (el documento queda respaldado a través de ella).
 */
const asociarFactura = async (req, res) => {
  const { facturaCompraId } = req.body
  if (!facturaCompraId) return res.status(400).json({ error: 'Falta la factura.' })

  try {
    const [doc, factura] = await Promise.all([
      prisma.documentoInterno.findUnique({ where: { id: Number(req.params.id) }, include: { conciliaciones: { select: { id: true } } } }),
      prisma.facturaCompra.findUnique({ where: { id: Number(facturaCompraId) }, include: { documentoInterno: { select: { id: true } } } }),
    ])
    if (!doc) return res.status(404).json({ error: 'Documento no encontrado.' })
    if (!factura) return res.status(404).json({ error: 'Factura no encontrada.' })
    if (doc.tipo !== 'PROVISION') return res.status(400).json({ error: 'Solo una provisión se asocia a una factura.' })
    if (doc.facturaCompraId) return res.status(400).json({ error: 'Esa provisión ya tiene factura asociada.' })
    if (factura.documentoInterno) return res.status(400).json({ error: 'Esa factura ya respalda otra provisión.' })
    // Si la provisión ya tenía el pago imputado directo, asociarle una factura pagable
    // contaría el gasto dos veces (invariante documento_doble_respaldo).
    if (doc.conciliaciones.length) {
      return res.status(400).json({ error: 'Esta provisión ya tiene el pago imputado directo: la factura llegó tarde. Desconcilia primero si quieres que el pago quede contra la factura.' })
    }

    const [actualizado] = await prisma.$transaction([
      prisma.documentoInterno.update({
        where: { id: doc.id },
        data: { facturaCompraId: factura.id },
        include: INCLUDE_DOC,
      }),
      ...(factura.cuentaId == null && doc.cuentaId != null
        ? [prisma.facturaCompra.update({ where: { id: factura.id }, data: { cuentaId: doc.cuentaId } })]
        : []),
    ])

    res.json(conEstado(actualizado, {}))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al asociar la factura.' })
  }
}

const desasociarFactura = async (req, res) => {
  try {
    const doc = await prisma.documentoInterno.update({
      where: { id: Number(req.params.id) },
      data: { facturaCompraId: null },
      include: INCLUDE_DOC,
    })
    res.json(conEstado(doc, {}))
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Documento no encontrado.' })
    console.error(err)
    res.status(500).json({ error: 'Error al desasociar la factura.' })
  }
}

/**
 * Genera las provisiones que faltan para los gastos programados activos, desde el inicio
 * de este mes hasta N meses adelante. La corre el cron mensual y también hay botón.
 */
async function generarProvisiones({ meses = 2 } = {}) {
  const hoy = new Date()
  const desde = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), 1))
  const hasta = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth() + meses, 0))

  const [gastos, existentes] = await Promise.all([
    prisma.gastoProgramado.findMany({ where: { activo: true } }),
    prisma.documentoInterno.findMany({
      where: { gastoProgramadoId: { not: null } },
      select: { gastoProgramadoId: true, periodo: true },
    }),
  ])
  const claves = new Set(existentes.map((e) => `${e.gastoProgramadoId}|${e.periodo}`))
  const faltantes = provisionesFaltantes(gastos, desde, hasta, claves)

  if (faltantes.length) {
    await prisma.documentoInterno.createMany({ data: faltantes, skipDuplicates: true })
  }
  return { generadas: faltantes.length, gastosActivos: gastos.length }
}

const generarProvisionesEndpoint = async (req, res) => {
  try {
    const r = await generarProvisiones({ meses: Number(req.body?.meses) || 2 })
    res.json(r)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al generar las provisiones.' })
  }
}

// ─── GASTOS PROGRAMADOS (las plantillas) ──────────────────────

const INCLUDE_GASTO = {
  cuenta: { select: { id: true, nombre: true, color: true } },
  proveedor: { select: { id: true, razonSocial: true, rut: true } },
  documentos: {
    select: { id: true, periodo: true, facturaCompraId: true, conciliaciones: { select: { monto: true } } },
    orderBy: { periodo: 'desc' },
    take: 12,
  },
}

const listarGastos = async (req, res) => {
  try {
    const [gastos, uf] = await Promise.all([
      prisma.gastoProgramado.findMany({ include: INCLUDE_GASTO, orderBy: [{ activo: 'desc' }, { nombre: 'asc' }] }),
      valorUFEn().catch(() => null),
    ])
    const valorUF = uf?.valor || 0
    res.json(gastos.map((g) => ({
      ...g,
      montoEstimadoCLP: Number(g.montoCLP) > 0 ? Number(g.montoCLP) : Math.round(Number(g.montoUF || 0) * valorUF),
    })))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al listar los gastos programados.' })
  }
}

const crearGasto = async (req, res) => {
  const { nombre, proveedorTexto, proveedorId, cuentaId, montoUF, montoCLP, periodicidad, diaVencimiento, fechaInicio, fechaFin, notas } = req.body

  if (!nombre?.trim()) return res.status(400).json({ error: 'El gasto necesita un nombre.' })
  if (!fechaInicio) return res.status(400).json({ error: 'Indica desde cuándo se paga.' })
  if (!(Number(montoUF) > 0) && !(Number(montoCLP) > 0)) {
    return res.status(400).json({ error: 'Indica el monto, en UF o en pesos.' })
  }

  try {
    const gasto = await prisma.gastoProgramado.create({
      data: {
        nombre: nombre.trim(),
        // El proveedor vive en UN lugar: si está en el catálogo, se guarda el vínculo y no
        // el texto. El texto libre queda para el que todavía no tiene RUT en el catálogo.
        proveedorId: proveedorId ? Number(proveedorId) : null,
        proveedorTexto: proveedorId ? null : proveedorTexto?.trim() || null,
        cuentaId: cuentaId ? Number(cuentaId) : null,
        montoUF: Number(montoUF) > 0 ? Number(montoUF) : null,
        montoCLP: Number(montoCLP) > 0 ? Math.round(Number(montoCLP)) : null,
        periodicidad: periodicidad || 'MENSUAL',
        diaVencimiento: diaVencimiento ? Number(diaVencimiento) : null,
        fechaInicio: new Date(fechaInicio),
        fechaFin: fechaFin ? new Date(fechaFin) : null,
        notas: notas || null,
        creadoPorId: req.usuario.id,
      },
      include: INCLUDE_GASTO,
    })
    // La provisión del período en curso se genera al tiro: el gasto recién creado tiene
    // que aparecer en el flujo de caja y el presupuesto sin esperar al cron.
    await generarProvisiones().catch(() => null)
    res.status(201).json(gasto)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al crear el gasto programado.' })
  }
}

const editarGasto = async (req, res) => {
  const { nombre, proveedorTexto, proveedorId, cuentaId, montoUF, montoCLP, periodicidad, diaVencimiento, fechaInicio, fechaFin, activo, notas } = req.body
  try {
    const gasto = await prisma.gastoProgramado.update({
      where: { id: Number(req.params.id) },
      data: {
        ...(nombre !== undefined && { nombre: nombre.trim() }),
        ...(proveedorId !== undefined && { proveedorId: proveedorId ? Number(proveedorId) : null }),
        ...((proveedorTexto !== undefined || proveedorId) && { proveedorTexto: proveedorId ? null : proveedorTexto?.trim() || null }),
        ...(cuentaId !== undefined && { cuentaId: cuentaId ? Number(cuentaId) : null }),
        ...(montoUF !== undefined && { montoUF: Number(montoUF) > 0 ? Number(montoUF) : null }),
        ...(montoCLP !== undefined && { montoCLP: Number(montoCLP) > 0 ? Math.round(Number(montoCLP)) : null }),
        ...(periodicidad !== undefined && { periodicidad }),
        ...(diaVencimiento !== undefined && { diaVencimiento: diaVencimiento ? Number(diaVencimiento) : null }),
        ...(fechaInicio !== undefined && { fechaInicio: new Date(fechaInicio) }),
        ...(fechaFin !== undefined && { fechaFin: fechaFin ? new Date(fechaFin) : null }),
        ...(activo !== undefined && { activo: Boolean(activo) }),
        ...(notas !== undefined && { notas: notas || null }),
      },
      include: INCLUDE_GASTO,
    })

    // Reclasificar el gasto arrastra sus provisiones sin pagar: la plantilla y sus
    // ocurrencias abiertas dicen lo mismo. Las ya pagadas no se tocan.
    if (cuentaId !== undefined) {
      await prisma.documentoInterno.updateMany({
        where: { gastoProgramadoId: gasto.id, conciliaciones: { none: {} }, facturaCompraId: null },
        data: { cuentaId: cuentaId ? Number(cuentaId) : null },
      })
    }

    res.json(gasto)
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Gasto no encontrado.' })
    console.error(err)
    res.status(500).json({ error: 'Error al editar el gasto programado.' })
  }
}

const eliminarGasto = async (req, res) => {
  try {
    const id = Number(req.params.id)
    // Sus provisiones sin plata se van con él; las pagadas quedan (documentan historia).
    await prisma.$transaction(async (tx) => {
      await tx.documentoInterno.deleteMany({
        where: { gastoProgramadoId: id, conciliaciones: { none: {} }, facturaCompraId: null },
      })
      await tx.gastoProgramado.delete({ where: { id } })
    })
    res.json({ mensaje: 'Gasto eliminado.' })
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Gasto no encontrado.' })
    console.error(err)
    res.status(500).json({ error: 'Error al eliminar el gasto.' })
  }
}

// ─── FACTURAS DE COMPRA (mínimas) ─────────────────────────────

const INCLUDE_FACTURA = {
  proveedor: { select: { id: true, razonSocial: true, rut: true } },
  cuenta: { select: { id: true, nombre: true, color: true } },
  documentoInterno: { select: { id: true, descripcion: true, periodo: true } },
  conciliaciones: { select: { id: true, monto: true, movimiento: { select: { id: true, fecha: true, glosa: true } } } },
}

const listarFacturas = async (req, res) => {
  const { pendientes } = req.query
  try {
    const facturas = await prisma.facturaCompra.findMany({
      include: INCLUDE_FACTURA,
      orderBy: [{ fechaEmision: 'desc' }, { id: 'desc' }],
    })
    const filas = facturas.map((f) => {
      const pagado = f.conciliaciones.reduce((a, c) => a + Math.abs(Number(c.monto)), 0)
      return { ...f, pagado, saldoPorPagar: Number(f.total) - pagado, pagada: Number(f.total) - pagado < 1000 }
    })
    res.json(pendientes === 'true' ? filas.filter((f) => !f.pagada) : filas)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al listar las facturas de compra.' })
  }
}

const crearFactura = async (req, res) => {
  const { tipoDte, folio, proveedorId, proveedorNuevo, fechaEmision, fechaVencimiento, neto, iva, total, cuentaId, notas, documentoInternoId } = req.body
  if (!folio) return res.status(400).json({ error: 'Falta el folio.' })
  if (!fechaEmision) return res.status(400).json({ error: 'Falta la fecha de emisión.' })
  if (!(Number(total) > 0)) return res.status(400).json({ error: 'El total debe ser mayor que cero.' })
  if (!proveedorId && !proveedorNuevo) return res.status(400).json({ error: 'Indica el proveedor.' })

  try {
    const creada = await prisma.$transaction(async (tx) => {
      let provId = proveedorId ? Number(proveedorId) : null
      if (proveedorNuevo) {
        const rut = normalizarRut(proveedorNuevo.rut)
        if (!rut) {
          const e = new Error('El RUT del proveedor no es válido.')
          e.status = 400
          throw e
        }
        const prov = await tx.proveedor.upsert({
          where: { rut },
          create: { rut, razonSocial: proveedorNuevo.razonSocial || 'Proveedor', cuentaId: cuentaId ? Number(cuentaId) : null },
          update: {},
        })
        provId = prov.id
      }

      // El vencimiento que no viene se deriva del plazo pactado con el proveedor.
      let vence = fechaVencimiento ? new Date(fechaVencimiento) : null
      if (!vence) {
        const prov = await tx.proveedor.findUnique({ where: { id: provId }, select: { diasPago: true, cuentaId: true } })
        if (prov?.diasPago) vence = new Date(new Date(fechaEmision).getTime() + prov.diasPago * 86400000)
      }

      const factura = await tx.facturaCompra.create({
        data: {
          tipoDte: Number(tipoDte) || 33,
          folio: String(folio).trim(),
          proveedorId: provId,
          fechaEmision: new Date(fechaEmision),
          fechaVencimiento: vence,
          neto: Number(neto) || 0,
          iva: Number(iva) || 0,
          total: Math.round(Number(total)),
          cuentaId: cuentaId ? Number(cuentaId) : null,
          notas: notas || null,
          creadoPorId: req.usuario.id,
          ...(req.file && { archivoUrl: `/uploads/${req.file.filename}` }),
        },
        include: INCLUDE_FACTURA,
      })

      // Si venía apuntando a una provisión, se asocian al tiro (el caso normal:
      // "llegó la factura del arriendo de agosto").
      if (documentoInternoId) {
        const doc = await tx.documentoInterno.findUnique({
          where: { id: Number(documentoInternoId) },
          include: { conciliaciones: { select: { id: true } } },
        })
        if (doc && doc.tipo === 'PROVISION' && !doc.facturaCompraId && !doc.conciliaciones.length) {
          await tx.documentoInterno.update({ where: { id: doc.id }, data: { facturaCompraId: factura.id } })
          if (factura.cuentaId == null && doc.cuentaId != null) {
            await tx.facturaCompra.update({ where: { id: factura.id }, data: { cuentaId: doc.cuentaId } })
          }
        }
      }

      // La factura sin cuenta hereda la del proveedor: clasificar una vez, no cada vez.
      if (!cuentaId && provId) {
        const prov = await tx.proveedor.findUnique({ where: { id: provId }, select: { cuentaId: true } })
        if (prov?.cuentaId) await tx.facturaCompra.update({ where: { id: factura.id }, data: { cuentaId: prov.cuentaId } })
      }

      return factura
    })

    res.status(201).json(creada)
  } catch (err) {
    if (err.status === 400) return res.status(400).json({ error: err.message })
    if (err.code === 'P2002') return res.status(409).json({ error: 'Esa factura ya está cargada (mismo proveedor, tipo y folio).' })
    console.error(err)
    res.status(500).json({ error: 'Error al registrar la factura.' })
  }
}

const editarFactura = async (req, res) => {
  const { fechaVencimiento, cuentaId, notas } = req.body
  try {
    const factura = await prisma.facturaCompra.update({
      where: { id: Number(req.params.id) },
      data: {
        ...(fechaVencimiento !== undefined && { fechaVencimiento: fechaVencimiento ? new Date(fechaVencimiento) : null }),
        ...(cuentaId !== undefined && { cuentaId: cuentaId ? Number(cuentaId) : null }),
        ...(notas !== undefined && { notas: notas || null }),
        ...(req.file && { archivoUrl: `/uploads/${req.file.filename}` }),
      },
      include: INCLUDE_FACTURA,
    })
    res.json(factura)
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Factura no encontrada.' })
    console.error(err)
    res.status(500).json({ error: 'Error al editar la factura.' })
  }
}

const eliminarFactura = async (req, res) => {
  try {
    const factura = await prisma.facturaCompra.findUnique({
      where: { id: Number(req.params.id) },
      include: { conciliaciones: { select: { id: true } }, documentoInterno: { select: { id: true } } },
    })
    if (!factura) return res.status(404).json({ error: 'Factura no encontrada.' })
    if (factura.conciliaciones.length) return res.status(400).json({ error: 'Tiene pagos imputados: desconcilia primero.' })

    await prisma.$transaction(async (tx) => {
      if (factura.documentoInterno) {
        await tx.documentoInterno.update({ where: { id: factura.documentoInterno.id }, data: { facturaCompraId: null } })
      }
      await tx.facturaCompra.delete({ where: { id: factura.id } })
    })
    res.json({ mensaje: 'Factura eliminada.' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al eliminar la factura.' })
  }
}

module.exports = {
  listarDocumentos, crearDocumento, editarDocumento, eliminarDocumento,
  asociarFactura, desasociarFactura,
  generarProvisiones, generarProvisionesEndpoint,
  listarGastos, crearGasto, editarGasto, eliminarGasto,
  listarFacturas, crearFactura, editarFactura, eliminarFactura,
}
