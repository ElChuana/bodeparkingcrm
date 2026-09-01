/**
 * La bandeja de conciliación: el corazón del ERP.
 *
 * Un movimiento del banco es un hecho; un documento es una afirmación; la conciliación
 * los une. Todo movimiento tiene un camino: una cuota del plan de pago, un mes de
 * arriendo, una factura de compra, un documento interno (provisión o respaldo), o la
 * cuenta de un cliente. El matcher propone con un score y sus motivos; una persona
 * confirma. Nunca concilia solo — salvo las reglas `autoValidar` y la pasada automática
 * con umbral alto y coincidencia mutua única.
 */

const prisma = require('../lib/prisma')
const { crearConciliacionSegura, ImputacionExcedida } = require('../lib/imputacion')
const {
  saldoMovimiento, saldoObjetivo, saldoFacturaCompra, estaCuadrado,
  sugerirObjetivos, sugerirMovimientos, puntuar,
  cuotaComoObjetivo, compraComoObjetivo, documentoComoObjetivo, pagoArriendoComoObjetivo,
  saldoCuota, rutEnTexto, similitudNombre,
} = require('../lib/conciliacion')
const { valorUFEn } = require('../lib/uf')
const { WHERE_ABIERTA } = require('../lib/cuotas')
const { registrarContraparte } = require('../lib/aprendizaje')
const { emparejarNombre, nucleoGlosa, claveNombre } = require('../lib/contraparte')
const { sugerirDesdeHistorial } = require('../lib/documentoInterno')
const { saldoAFavor, porCliente } = require('../lib/saldoCliente')
const { montoCLPDocumento, pagadoDocumento } = require('../lib/documentos')

const INCLUDE_MOV = {
  cuenta: { select: { banco: true, numeroCuenta: true, alias: true } },
  contacto: { select: { id: true, nombre: true, apellido: true, rut: true, telefono: true, email: true } },
  proveedor: { select: { id: true, razonSocial: true, rut: true, telefono: true, email: true } },
  conciliaciones: { select: { monto: true } },
}

const INCLUDE_CUOTA = {
  conciliaciones: { select: { monto: true } },
  planPago: {
    select: {
      venta: {
        select: {
          id: true,
          comprador: { select: { id: true, nombre: true, apellido: true, rut: true } },
          unidades: { select: { numero: true, tipo: true } },
        },
      },
    },
  },
}

const INCLUDE_DOC = {
  cuenta: { select: { id: true, nombre: true, color: true } },
  proveedor: { select: { id: true, razonSocial: true, rut: true } },
  contacto: { select: { id: true, nombre: true, apellido: true, rut: true } },
  conciliaciones: { select: { monto: true } },
  facturaCompra: { select: { id: true, folio: true, conciliaciones: { select: { monto: true } } } },
}

/** Saldo abierto de un documento interno, contando lo pagado por su factura asociada. */
const saldoDoc = (d, valorUF) => montoCLPDocumento(d, valorUF) - pagadoDocumento(d)

/**
 * Los universos que se cruzan en la bandeja. Un solo lugar los arma, para que las
 * sugerencias, el resumen y la conciliación automática miren exactamente lo mismo.
 */
async function universo({ desde, hasta } = {}) {
  const rangoFecha = (campo) =>
    desde || hasta ? { [campo]: { ...(desde && { gte: new Date(desde) }), ...(hasta && { lte: new Date(hasta) }) } } : {}

  const [movimientos, cuotas, documentos, compras, arriendos, uf] = await Promise.all([
    prisma.movimientoBanco.findMany({
      where: { ignorado: false, ...rangoFecha('fecha') },
      include: INCLUDE_MOV,
      orderBy: { fecha: 'desc' },
    }),
    // Las cuotas del plan de pago: hay ventas que se cobran por cuotas (reserva, pie) y ese
    // es el destino natural del abono. Las migradas quedan fuera de las sugerencias: sus
    // montos y fechas son reconstruidos.
    prisma.cuota.findMany({
      where: { ...WHERE_ABIERTA, origenMigracion: false },
      include: INCLUDE_CUOTA,
      orderBy: { fechaVencimiento: 'asc' },
    }),
    prisma.documentoInterno.findMany({ include: INCLUDE_DOC, orderBy: { fechaEsperada: 'asc' } }),
    // Facturas de compra SIN provisión asociada: las asociadas se pagan a través de la
    // factura pero el documento es la provisión — ofrecer las dos permitiría imputar el
    // mismo gasto dos veces.
    prisma.facturaCompra.findMany({
      where: { documentoInterno: null },
      include: {
        proveedor: { select: { id: true, razonSocial: true, rut: true } },
        cuenta: { select: { id: true, nombre: true, color: true } },
        conciliaciones: { select: { monto: true } },
      },
      orderBy: { fechaVencimiento: 'asc' },
    }),
    prisma.pagoArriendo.findMany({
      where: { estado: { in: ['PENDIENTE', 'ATRASADO'] } },
      include: {
        conciliaciones: { select: { monto: true } },
        arriendo: { select: { id: true, montoMensualUF: true, contacto: { select: { id: true, nombre: true, apellido: true, rut: true } }, unidad: { select: { numero: true, tipo: true } } } },
      },
      orderBy: { mes: 'asc' },
    }),
    valorUFEn().catch(() => null),
  ])

  return { movimientos, cuotas, documentos, compras, arriendos, valorUF: uf?.valor || 0 }
}

/** Quién está al otro lado de un movimiento, con sus datos de contacto (o una propuesta). */
async function catalogoContrapartes() {
  const [contactos, proveedores] = await Promise.all([
    prisma.contacto.findMany({ select: { id: true, nombre: true, apellido: true, rut: true, telefono: true, email: true } }),
    prisma.proveedor.findMany({ select: { id: true, razonSocial: true, rut: true, telefono: true, email: true } }),
  ])
  return {
    clientes: contactos.map((c) => ({ id: c.id, nombre: `${c.nombre || ''} ${c.apellido || ''}`.trim(), rut: c.rut, telefono: c.telefono, email: c.email })),
    proveedores: proveedores.map((p) => ({ id: p.id, nombre: p.razonSocial, rut: p.rut, telefono: p.telefono, email: p.email })),
  }
}

function contraparteDe(m, catalogo, memo = new Map()) {
  if (m.contacto) {
    return { tipo: 'cliente', sugerida: false, id: m.contacto.id, nombre: `${m.contacto.nombre || ''} ${m.contacto.apellido || ''}`.trim(), rut: m.contacto.rut, telefono: m.contacto.telefono, email: m.contacto.email }
  }
  if (m.proveedor) {
    return { tipo: 'proveedor', sugerida: false, id: m.proveedor.id, nombre: m.proveedor.razonSocial, rut: m.proveedor.rut, telefono: m.proveedor.telefono, email: m.proveedor.email }
  }
  const nombre = m.nombreDetectado || nucleoGlosa(m.glosa || '')
  if (!nombre) return null
  const clave = `${Number(m.monto) > 0 ? '+' : '-'}|${claveNombre(nombre)}`
  if (memo.has(clave)) return memo.get(clave)
  const listas = Number(m.monto) > 0
    ? [['cliente', catalogo.clientes]]
    : [['proveedor', catalogo.proveedores], ['cliente', catalogo.clientes]]
  let r = null
  for (const [tipo, lista] of listas) {
    const e = emparejarNombre(nombre, lista)
    if (e) {
      const dato = lista.find((x) => x.id === e.id)
      r = { tipo, sugerida: true, como: e.como, id: e.id, nombre: dato?.nombre || e.nombre, rut: dato?.rut || null, telefono: dato?.telefono || null, email: dato?.email || null }
      break
    }
  }
  memo.set(clave, r)
  return r
}

/** Los números de arriba del módulo: cuánto queda sin conciliar por cada lado. */
const resumen = async (req, res) => {
  try {
    const { movimientos, cuotas, documentos, compras, valorUF } = await universo(req.query)

    const sueltos = movimientos.filter((m) => !estaCuadrado(saldoMovimiento(m)))
    const abonos = sueltos.filter((m) => Number(m.monto) > 0)
    const cargos = sueltos.filter((m) => Number(m.monto) < 0)

    const cuotasAbiertas = cuotas.filter((c) => !estaCuadrado(saldoCuota(c, valorUF)))
    const docsAbiertos = documentos.filter((d) => !estaCuadrado(saldoDoc(d, valorUF)))
    const comprasAbiertas = compras.filter((f) => !estaCuadrado(saldoFacturaCompra(f)))

    res.json({
      abonosSinConciliar: { cantidad: abonos.length, monto: abonos.reduce((a, m) => a + saldoMovimiento(m), 0) },
      cargosSinDocumento: { cantidad: cargos.length, monto: cargos.reduce((a, m) => a + saldoMovimiento(m), 0) },
      cuotasPorCobrar: { cantidad: cuotasAbiertas.length, monto: cuotasAbiertas.reduce((a, c) => a + saldoCuota(c, valorUF), 0) },
      documentosAbiertos: { cantidad: docsAbiertos.length, monto: docsAbiertos.reduce((a, d) => a + Math.max(0, saldoDoc(d, valorUF)), 0) },
      comprasAbiertas: { cantidad: comprasAbiertas.length, monto: comprasAbiertas.reduce((a, f) => a + saldoFacturaCompra(f), 0) },
      valorUF,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al calcular el resumen de conciliación.' })
  }
}

/**
 * La bandeja: movimientos por conciliar, cada uno con su contraparte y sus sugerencias.
 *
 * Un ABONO se cruza con cuotas, pagos de arriendo y documentos internos de ingreso.
 * Un CARGO, con facturas de compra y documentos internos de gasto (las provisiones).
 */
const porConciliar = async (req, res) => {
  const lado = req.query.lado || 'todos' // abonos | cargos | todos
  try {
    const [{ movimientos, cuotas, documentos, compras, arriendos, valorUF }, catalogo] = await Promise.all([
      universo(req.query),
      catalogoContrapartes(),
    ])

    const cuotasPend = cuotas.filter((c) => !estaCuadrado(saldoCuota(c, valorUF)))
    const objetivosCuota = cuotasPend.map((c) => cuotaComoObjetivo(c, valorUF))
    const arriendosPend = arriendos.filter((p) => !estaCuadrado(saldoObjetivo(pagoArriendoComoObjetivo(p, valorUF))))
    const objetivosArriendo = arriendosPend.map((p) => pagoArriendoComoObjetivo(p, valorUF))
    const docsGasto = documentos.filter((d) => d.lado === 'GASTO' && !estaCuadrado(saldoDoc(d, valorUF)))
    const docsIngreso = documentos.filter((d) => d.lado === 'INGRESO' && !estaCuadrado(saldoDoc(d, valorUF)))
    const objetivosDocGasto = docsGasto.map((d) => documentoComoObjetivo(d, valorUF))
    const objetivosDocIngreso = docsIngreso.map((d) => documentoComoObjetivo(d, valorUF))
    const comprasPend = compras.filter((f) => !estaCuadrado(saldoFacturaCompra(f)))
    const objetivosCompra = comprasPend.map(compraComoObjetivo)
    const memo = new Map()

    const deCuota = (m) => sugerirObjetivos(m, objetivosCuota).map((s) => {
      const cuota = cuotasPend.find((c) => c.id === s.objetivo.id)
      const venta = cuota?.planPago?.venta
      return {
        destino: 'cuota', cuotaId: cuota.id,
        etiqueta: `Cuota ${cuota.numeroCuota} · ${cuota.tipo.toLowerCase()}`,
        nombre: s.objetivo.razonSocialReceptor,
        fecha: cuota.fechaVencimiento, total: s.objetivo.total,
        saldoPorCobrar: saldoCuota(cuota, valorUF),
        ventaId: venta?.id, montoUF: cuota.montoUF,
        score: s.score, motivos: s.motivos,
      }
    })

    const deArriendo = (m) => sugerirObjetivos(m, objetivosArriendo).map((s) => {
      const p = arriendosPend.find((x) => x.id === s.objetivo.id)
      return {
        destino: 'arriendo', pagoArriendoId: p.id,
        etiqueta: `Arriendo ${new Date(p.mes).toISOString().slice(0, 7)} · ${p.arriendo?.unidad?.tipo || ''} ${p.arriendo?.unidad?.numero || ''}`.trim(),
        nombre: s.objetivo.razonSocialReceptor,
        fecha: p.mes, total: s.objetivo.total,
        saldoPorCobrar: saldoObjetivo(s.objetivo),
        score: s.score, motivos: s.motivos,
      }
    })

    const deDocumento = (m, objetivos, lista) => sugerirObjetivos(m, objetivos).map((s) => {
      const d = lista.find((x) => x.id === s.objetivo.id)
      return {
        destino: 'documento', documentoInternoId: d.id,
        etiqueta: d.tipo === 'PROVISION' ? `Provisión · ${d.descripcion}` : d.descripcion,
        nombre: s.objetivo.razonSocialReceptor,
        fecha: d.fechaEsperada, total: s.objetivo.total,
        saldoPorCobrar: saldoDoc(d, valorUF),
        cuenta: d.cuenta?.nombre || null,
        score: s.score, motivos: s.motivos,
      }
    })

    const deCompra = (m) => sugerirObjetivos(m, objetivosCompra).map((s) => {
      const fc = comprasPend.find((x) => x.id === s.objetivo.id)
      return {
        destino: 'compra', facturaCompraId: fc.id,
        etiqueta: `Factura N° ${fc.folio}`,
        nombre: fc.proveedor?.razonSocial || 'Proveedor',
        fecha: fc.fechaVencimiento || fc.fechaEmision, total: Number(fc.total),
        saldoPorCobrar: saldoFacturaCompra(fc),
        cuenta: fc.cuenta?.nombre || null,
        score: s.score, motivos: s.motivos,
      }
    })

    const resultado = movimientos
      .filter((m) => !estaCuadrado(saldoMovimiento(m)))
      .filter((m) => (lado === 'abonos' ? Number(m.monto) > 0 : lado === 'cargos' ? Number(m.monto) < 0 : true))
      .map((m) => {
        const sugerencias = Number(m.monto) < 0
          ? [...deCompra(m), ...deDocumento(m, objetivosDocGasto, docsGasto)]
          : [...deCuota(m), ...deArriendo(m), ...deDocumento(m, objetivosDocIngreso, docsIngreso)]
        return {
          ...m,
          lado: Number(m.monto) > 0 ? 'ABONO' : 'CARGO',
          saldoPendiente: saldoMovimiento(m),
          contraparte: contraparteDe(m, catalogo, memo),
          sugerencias: sugerencias.sort((a, b) => b.score - a.score).slice(0, 5),
        }
      })

    res.json(resultado)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al armar la bandeja de conciliación.' })
  }
}

/**
 * ¿El que transfirió es el titular, o pagó un tercero? Se contesta con lo que dice la
 * glosa: si nombra al comprador —o el RUT calza— es él; si no, muy probablemente pagó
 * otra persona por él y no hay que aprender ese alias.
 */
function pagaElTitular(persona, mov) {
  const nombre = `${persona?.nombre || ''} ${persona?.apellido || ''}`.trim()
  if (rutEnTexto(persona?.rut, `${mov.glosa} ${mov.contraparteRut || ''}`)) return true
  const sim = Math.max(
    similitudNombre(nombre, mov.glosa),
    similitudNombre(nombre, mov.nombreDetectado)
  )
  return sim >= 0.5
}

/**
 * Marca una cuota pagada cuando su saldo quedó bajo la tolerancia. Conciliar ES
 * registrar el pago: el estado sigue a la plata, no al revés.
 */
async function cerrarCuotaSiCorresponde(tx, cuota, restaCuota, aImputar, fechaPago) {
  const quedaPendiente = restaCuota - aImputar
  if (quedaPendiente < 1000) {
    await tx.cuota.update({
      where: { id: cuota.id },
      data: {
        estado: 'PAGADO',
        fechaPagoReal: fechaPago,
        montoCLP: Math.round(restaCuota),
        metodoPago: cuota.metodoPago || 'TRANSFERENCIA',
        origenMigracion: false, // deja de ser un dato reconstruido: hay plata que lo respalda
      },
    })
    return true
  }
  return false
}

const conciliar = async (req, res) => {
  const { movimientoId, cuotaId, pagoArriendoId, facturaCompraId, documentoInternoId, contactoId, monto, notas, confianza } = req.body
  const destinos = [cuotaId, pagoArriendoId, facturaCompraId, documentoInternoId, contactoId].filter(Boolean)
  if (!movimientoId || !destinos.length) {
    return res.status(400).json({ error: 'Se necesita el movimiento y un destino: una cuota, un arriendo, una factura, un documento o la cuenta de un cliente.' })
  }
  if (destinos.length > 1) {
    return res.status(400).json({ error: 'Un movimiento se imputa a un solo destino, no a varios.' })
  }

  try {
    const mov = await prisma.movimientoBanco.findUnique({
      where: { id: Number(movimientoId) },
      include: { conciliaciones: true },
    })
    if (!mov) return res.status(404).json({ error: 'Movimiento no encontrado.' })

    const restaMov = saldoMovimiento(mov)
    if (restaMov <= 0) return res.status(400).json({ error: 'Ese movimiento ya está completamente imputado.' })

    const validarMonto = (aImputar, restaDestino, queEs) => {
      if (!(aImputar > 0)) return 'El monto a imputar debe ser mayor que cero.'
      if (aImputar > restaMov + 1) return `El movimiento solo tiene $${Math.round(restaMov).toLocaleString('es-CL')} sin imputar.`
      if (restaDestino != null && aImputar > restaDestino + 1) return `A ${queEs} solo le quedan $${Math.round(restaDestino).toLocaleString('es-CL')}.`
      return null
    }

    // ── Destino: a cuenta del cliente ──
    // El estacionamiento del ERP. Un abono deja saldo a favor; un cargo se lo devuelve.
    if (contactoId) {
      const contacto = await prisma.contacto.findUnique({
        where: { id: Number(contactoId) },
        select: { id: true, nombre: true, apellido: true },
      })
      if (!contacto) return res.status(404).json({ error: 'Cliente no encontrado.' })

      const aImputar = monto != null ? Math.round(Number(monto)) : Math.round(restaMov)
      const errorMonto = validarMonto(aImputar, null)
      if (errorMonto) return res.status(400).json({ error: errorMonto })

      // Una devolución no puede superar lo que el cliente tiene a favor.
      if (Number(mov.monto) < 0) {
        const aCuenta = await prisma.conciliacion.findMany({
          where: { contactoId: contacto.id },
          include: { movimiento: { select: { monto: true } } },
        })
        const disponible = saldoAFavor(aCuenta)
        if (aImputar > disponible + 1) {
          return res.status(400).json({
            error: disponible > 0
              ? `${contacto.nombre} tiene $${Math.round(disponible).toLocaleString('es-CL')} a favor y estás devolviendo más que eso.`
              : `${contacto.nombre} no tiene saldo a favor. Si se cayó la venta, desconcilia primero la cuota que se había pagado: esa plata queda a su favor y desde ahí se puede devolver.`,
          })
        }
      }

      try {
        const c = await crearConciliacionSegura(prisma, {
          data: { movimientoId: mov.id, contactoId: contacto.id, monto: aImputar, notas: notas || null, creadoPorId: req.usuario.id },
        })
        return res.status(201).json(c)
      } catch (e) {
        if (e.code === 'P2002') return res.status(400).json({ error: 'Ese movimiento ya tiene una parte imputada a la cuenta de este cliente.' })
        throw e
      }
    }

    // ── Destino: factura de compra ──
    if (facturaCompraId) {
      if (Number(mov.monto) >= 0) return res.status(400).json({ error: 'Una factura de compra se paga con un cargo, no con un abono.' })

      const fc = await prisma.facturaCompra.findUnique({
        where: { id: Number(facturaCompraId) },
        include: { conciliaciones: true, proveedor: { select: { razonSocial: true } } },
      })
      if (!fc) return res.status(404).json({ error: 'Factura de compra no encontrada.' })

      const restaFc = saldoFacturaCompra(fc)
      if (restaFc <= 0) return res.status(400).json({ error: 'Esa factura ya está pagada.' })

      const aImputar = monto != null ? Math.round(Number(monto)) : Math.round(Math.min(restaMov, restaFc))
      const errorMonto = validarMonto(aImputar, restaFc, 'la factura')
      if (errorMonto) return res.status(400).json({ error: errorMonto })

      try {
        const c = await crearConciliacionSegura(prisma, {
          data: {
            movimientoId: mov.id, facturaCompraId: fc.id, monto: aImputar,
            automatica: confianza != null, confianza: confianza != null ? Number(confianza) : null,
            notas: notas || null, creadoPorId: req.usuario.id,
          },
        })
        return res.status(201).json(c)
      } catch (e) {
        if (e.code === 'P2002') return res.status(400).json({ error: 'Ese movimiento y esa factura ya están imputados entre sí.' })
        throw e
      }
    }

    // ── Destino: documento interno (provisión o respaldo ya existente) ──
    if (documentoInternoId) {
      const uf = await valorUFEn().catch(() => null)
      const doc = await prisma.documentoInterno.findUnique({
        where: { id: Number(documentoInternoId) },
        include: INCLUDE_DOC,
      })
      if (!doc) return res.status(404).json({ error: 'Documento no encontrado.' })

      // El lado del documento tiene que calzar con el signo del movimiento.
      if (doc.lado === 'GASTO' && Number(mov.monto) >= 0) {
        return res.status(400).json({ error: 'Un documento de gasto se paga con un cargo, no con un abono.' })
      }
      if (doc.lado === 'INGRESO' && Number(mov.monto) <= 0) {
        return res.status(400).json({ error: 'Un documento de ingreso se respalda con un abono, no con un cargo.' })
      }
      if (doc.facturaCompraId) {
        return res.status(400).json({ error: 'Esa provisión ya tiene factura asociada: imputa el pago a la factura, no a la provisión.' })
      }

      const restaDocumento = saldoDoc(doc, uf?.valor || 0)
      if (restaDocumento <= 0) return res.status(400).json({ error: 'Ese documento ya está pagado.' })

      const aImputar = monto != null ? Math.round(Number(monto)) : Math.round(Math.min(restaMov, restaDocumento))
      const errorMonto = validarMonto(aImputar, restaDocumento, 'el documento')
      if (errorMonto) return res.status(400).json({ error: errorMonto })

      try {
        const c = await crearConciliacionSegura(prisma, {
          data: {
            movimientoId: mov.id, documentoInternoId: doc.id, monto: aImputar,
            automatica: confianza != null, confianza: confianza != null ? Number(confianza) : null,
            notas: notas || null, creadoPorId: req.usuario.id,
          },
        }, { valorUF: uf?.valor })
        return res.status(201).json(c)
      } catch (e) {
        if (e.code === 'P2002') return res.status(400).json({ error: 'Ese movimiento y ese documento ya están imputados entre sí.' })
        throw e
      }
    }

    // ── Destino: pago de arriendo ──
    if (pagoArriendoId) {
      if (Number(mov.monto) <= 0) return res.status(400).json({ error: 'Un arriendo se cobra con un abono.' })
      const uf = await valorUFEn().catch(() => null)
      const pago = await prisma.pagoArriendo.findUnique({
        where: { id: Number(pagoArriendoId) },
        include: {
          conciliaciones: true,
          arriendo: { select: { montoMensualUF: true, contacto: { select: { id: true, nombre: true, apellido: true, rut: true } } } },
        },
      })
      if (!pago) return res.status(404).json({ error: 'Pago de arriendo no encontrado.' })

      const objetivo = pagoArriendoComoObjetivo(pago, uf?.valor || 0)
      const restaPago = saldoObjetivo(objetivo)
      if (restaPago <= 0) return res.status(400).json({ error: 'Ese mes de arriendo ya está pagado.' })

      const aImputar = monto != null ? Math.round(Number(monto)) : Math.round(Math.min(restaMov, restaPago))
      const errorMonto = validarMonto(aImputar, restaPago, 'ese mes de arriendo')
      if (errorMonto) return res.status(400).json({ error: errorMonto })

      const resultado = await prisma.$transaction(async (tx) => {
        const c = await crearConciliacionSegura(tx, {
          data: {
            movimientoId: mov.id, pagoArriendoId: pago.id, monto: aImputar,
            automatica: confianza != null, confianza: confianza != null ? Number(confianza) : null,
            notas: notas || null, creadoPorId: req.usuario.id,
          },
        })
        if (restaPago - aImputar < 1000) {
          await tx.pagoArriendo.update({
            where: { id: pago.id },
            data: { estado: 'PAGADO', fechaPago: mov.fecha, montoCLP: Math.round(restaPago) },
          })
        }
        return c
      })

      const arrendatario = pago.arriendo?.contacto
      const aprendido = arrendatario?.id && pagaElTitular(arrendatario, mov)
        ? await registrarContraparte(mov.glosa, arrendatario.id, arrendatario.rut).catch(() => null)
        : null
      return res.status(201).json({ ...resultado, aprendido })
    }

    // ── Destino: cuota del plan de pago ──
    const uf = await valorUFEn().catch(() => null)
    const cuota = await prisma.cuota.findUnique({
      where: { id: Number(cuotaId) },
      include: { ...INCLUDE_CUOTA, conciliaciones: true },
    })
    if (!cuota) return res.status(404).json({ error: 'Cuota no encontrada.' })
    if (cuota.estado === 'PAGADO') return res.status(400).json({ error: 'Esa cuota ya está pagada.' })
    if (Number(mov.monto) <= 0) return res.status(400).json({ error: 'Una cuota se paga con un abono.' })

    const restaCuota = saldoCuota(cuota, uf?.valor || 0)
    if (restaCuota <= 0) return res.status(400).json({ error: 'Esa cuota ya está cubierta.' })

    const aImputar = monto != null ? Math.round(Number(monto)) : Math.round(Math.min(restaMov, restaCuota))
    const errorMonto = validarMonto(aImputar, null)
    if (errorMonto) return res.status(400).json({ error: errorMonto })

    const resultado = await prisma.$transaction(async (tx) => {
      const c = await crearConciliacionSegura(tx, {
        data: {
          movimientoId: mov.id, cuotaId: cuota.id, monto: aImputar,
          automatica: confianza != null, confianza: confianza != null ? Number(confianza) : null,
          notas: notas || null, creadoPorId: req.usuario.id,
        },
      })
      await cerrarCuotaSiCorresponde(tx, cuota, restaCuota, aImputar, mov.fecha)
      return c
    })

    // Conciliar es afirmar quién está al otro lado. Pero solo si la glosa efectivamente
    // nombra al comprador: cuando paga un tercero —el papá por el hijo— aprender ese alias
    // haría que todos los pagos futuros del papá se propongan para el hijo equivocado.
    const comprador = cuota.planPago?.venta?.comprador
    const aprendido = comprador?.id && pagaElTitular(comprador, mov)
      ? await registrarContraparte(mov.glosa, comprador.id, comprador.rut).catch(() => null)
      : null

    res.status(201).json({ ...resultado, aprendido })
  } catch (err) {
    if (err instanceof ImputacionExcedida) return res.status(400).json({ error: err.message })
    if (err.code === 'P2002') return res.status(400).json({ error: 'Ese movimiento y ese destino ya están conciliados entre sí.' })
    console.error(err)
    res.status(500).json({ error: 'Error al conciliar.' })
  }
}

const desconciliar = async (req, res) => {
  try {
    const c = await prisma.conciliacion.findUnique({
      where: { id: Number(req.params.id) },
      include: { documentoInterno: { select: { id: true, tipo: true, facturaCompraId: true, gastoProgramadoId: true } } },
    })
    if (!c) return res.status(404).json({ error: 'Conciliación no encontrada.' })

    await prisma.$transaction(async (tx) => {
      await tx.conciliacion.delete({ where: { id: c.id } })

      // Un RESPALDO existe para respaldar SU movimiento: si se deshace el vínculo y no lo
      // respalda nada más, se borra — una afirmación suelta sin plata detrás es exactamente
      // lo que este ERP no quiere. Una PROVISIÓN en cambio sobrevive: vuelve a ser un gasto
      // esperado, que es lo que era antes del pago.
      if (c.documentoInternoId && c.documentoInterno?.tipo === 'RESPALDO' && !c.documentoInterno.facturaCompraId) {
        const quedan = await tx.conciliacion.count({ where: { documentoInternoId: c.documentoInternoId } })
        if (quedan === 0) await tx.documentoInterno.delete({ where: { id: c.documentoInternoId } })
      }

      // Si la cuota había quedado pagada por esta conciliación, vuelve a pendiente:
      // el estado sigue a la plata, no al revés. Solo si no queda otra que la cubra.
      if (c.cuotaId) {
        const restantes = await tx.conciliacion.aggregate({ where: { cuotaId: c.cuotaId }, _sum: { monto: true } })
        if (!Number(restantes._sum.monto)) {
          await tx.cuota.update({
            where: { id: c.cuotaId },
            data: { estado: 'PENDIENTE', fechaPagoReal: null, montoCLP: null },
          })
        }
      }
      if (c.pagoArriendoId) {
        const restantes = await tx.conciliacion.aggregate({ where: { pagoArriendoId: c.pagoArriendoId }, _sum: { monto: true } })
        if (!Number(restantes._sum.monto)) {
          await tx.pagoArriendo.update({ where: { id: c.pagoArriendoId }, data: { estado: 'PENDIENTE', fechaPago: null } })
        }
      }
    })

    res.json({ mensaje: 'Conciliación deshecha.' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al deshacer la conciliación.' })
  }
}

/**
 * La segunda regla de la conciliación automática: el pago parcial a quien tiene UN solo
 * documento abierto. Cuando la contraparte está identificada y tiene exactamente un
 * documento abierto, no hay nada que decidir — es ahí o a ninguna parte. Dos condiciones
 * la hacen segura: el pago no puede ser muy anterior al documento, y tiene que ser una
 * parte apreciable de él (≥10% del saldo).
 */
const PARTE_MINIMA = 0.1

function paresPorUnicoDocumentoAbierto(pendientes, objetivos, duenoDe, pagadorDe) {
  const porDueno = new Map()
  for (const o of objetivos) {
    const d = duenoDe(o)
    if (!d) continue
    if (!porDueno.has(d)) porDueno.set(d, [])
    porDueno.get(d).push(o)
  }

  const pares = []
  for (const m of pendientes) {
    const quien = pagadorDe(m)
    if (!quien) continue
    const abiertos = porDueno.get(quien)
    if (!abiertos || abiertos.length !== 1) continue

    const obj = abiertos[0]
    // Cinco días de gracia: el banco y el documento del mismo día se cruzan seguido.
    const emision = obj.fechaEmision ? new Date(obj.fechaEmision) : null
    if (emision && new Date(m.fecha) < new Date(emision.getTime() - 5 * 86400000)) continue

    const saldoObj = saldoObjetivo(obj)
    if (saldoObj <= 0 || saldoMovimiento(m) < saldoObj * PARTE_MINIMA) continue

    pares.push({ mov: m, obj, score: 100, motivos: ['único documento abierto de esa contraparte'] })
  }
  return pares
}

/**
 * Aplica de una todos los cruces que el matcher da por seguros, por los dos lados.
 *
 * Umbral alto (90) y solo pares que se eligen mutuamente: la mejor cuota para ese
 * movimiento Y el mejor movimiento para esa cuota. Si dos movimientos idénticos compiten
 * por el mismo destino, ninguno pasa — ese caso lo resuelve una persona.
 */
const conciliarAutomatico = async (req, res) => {
  const umbral = Number(req.body?.umbral) || 90

  try {
    const { movimientos, cuotas, documentos, compras, valorUF } = await universo(req.body || {})
    const pendientes = movimientos.filter((m) => !estaCuadrado(saldoMovimiento(m)))
    const abonos = pendientes.filter((m) => Number(m.monto) > 0)
    const cargos = pendientes.filter((m) => Number(m.monto) < 0)

    // Objetivos por lado. Cada objetivo recuerda cómo escribirse como conciliación.
    const cuotasPend = cuotas.filter((c) => !estaCuadrado(saldoCuota(c, valorUF)))
    const objetivosAbono = cuotasPend.map((c) => ({ ...cuotaComoObjetivo(c, valorUF), destino: { cuotaId: c.id }, cuota: c }))
    const docsGasto = documentos.filter((d) => d.lado === 'GASTO' && !d.facturaCompraId && !estaCuadrado(saldoDoc(d, valorUF)))
    const objetivosCargo = [
      ...compras.filter((f) => !estaCuadrado(saldoFacturaCompra(f))).map((f) => ({ ...compraComoObjetivo(f), destino: { facturaCompraId: f.id } })),
      ...docsGasto.map((d) => ({ ...documentoComoObjetivo(d, valorUF), destino: { documentoInternoId: d.id } })),
    ]

    const cruzar = (movs, objetivos, pagadorDe, duenoDe) => {
      const pares = []
      for (const m of movs) {
        for (const o of objetivos) {
          const { score, motivos } = puntuar(m, o)
          if (score >= umbral) pares.push({ mov: m, obj: o, score, motivos })
        }
      }
      const porMov = new Map()
      const porObj = new Map()
      for (const p of pares) {
        porMov.set(p.mov.id, (porMov.get(p.mov.id) || 0) + 1)
        const k = JSON.stringify(p.obj.destino)
        porObj.set(k, (porObj.get(k) || 0) + 1)
      }
      const seguros = pares.filter((p) => porMov.get(p.mov.id) === 1 && porObj.get(JSON.stringify(p.obj.destino)) === 1)
      const tomados = new Set(seguros.map((p) => p.mov.id))
      const porUnico = paresPorUnicoDocumentoAbierto(movs.filter((m) => !tomados.has(m.id)), objetivos, duenoDe, pagadorDe)
      return { pares, seguros, porUnico }
    }

    const ladoAbonos = cruzar(abonos, objetivosAbono, (m) => m.contactoId ?? null, (o) => o.contactoId ?? null)
    const ladoCargos = cruzar(cargos, objetivosCargo, (m) => m.proveedorId ?? null, (o) => o.proveedorId ?? null)

    let conciliadas = 0
    let excedidas = 0
    for (const p of [...ladoAbonos.seguros, ...ladoAbonos.porUnico, ...ladoCargos.seguros, ...ladoCargos.porUnico]) {
      const monto = Math.round(Math.min(saldoMovimiento(p.mov), saldoObjetivo(p.obj)))
      if (monto <= 0) continue
      try {
        await prisma.$transaction(async (tx) => {
          await crearConciliacionSegura(tx, {
            data: {
              movimientoId: p.mov.id, ...p.obj.destino, monto,
              automatica: true, confianza: p.score,
              notas: p.motivos.join(', '), creadoPorId: req.usuario.id,
            },
          }, { valorUF })
          if (p.obj.destino.cuotaId && p.obj.cuota) {
            await cerrarCuotaSiCorresponde(tx, p.obj.cuota, saldoObjetivo(p.obj), monto, p.mov.fecha)
          }
        })
        conciliadas++
        // El saldo en memoria se actualiza: el siguiente par de la MISMA corrida tiene que
        // ver esta imputación, o dos pagos al mismo documento lo sobrepasan (pasó de verdad).
        p.obj.conciliaciones = [...(p.obj.conciliaciones || []), { monto }]
        p.mov.conciliaciones = [...(p.mov.conciliaciones || []), { monto }]
      } catch (e) {
        if (e instanceof ImputacionExcedida) { excedidas++; continue }
        if (e.code !== 'P2002') throw e // ya existía: no es un error
      }
    }

    res.json({
      conciliadas,
      candidatos: ladoAbonos.pares.length + ladoCargos.pares.length,
      ambiguos: (ladoAbonos.pares.length - ladoAbonos.seguros.length) + (ladoCargos.pares.length - ladoCargos.seguros.length),
      porUnicoDocumento: ladoAbonos.porUnico.length + ladoCargos.porUnico.length,
      excedidas,
      umbral,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al conciliar automáticamente.' })
  }
}

/**
 * Cuotas por cobrar, cruzando todas las ventas — la vista de cobranza operativa.
 */
const cuotasPorCobrar = async (req, res) => {
  try {
    const { movimientos, cuotas, valorUF } = await universo(req.query)
    const disponibles = movimientos.filter((m) => Number(m.monto) > 0 && !estaCuadrado(saldoMovimiento(m)))
    const ahora = new Date()

    const resultado = cuotas
      .filter((c) => !estaCuadrado(saldoCuota(c, valorUF)))
      .map((c) => {
        const objetivo = cuotaComoObjetivo(c, valorUF)
        const venta = c.planPago?.venta
        return {
          id: c.id,
          numeroCuota: c.numeroCuota,
          tipo: c.tipo,
          montoUF: c.montoUF,
          montoCLP: objetivo.total,
          fechaVencimiento: c.fechaVencimiento,
          vencida: new Date(c.fechaVencimiento) < ahora,
          diasAtraso: Math.max(0, Math.floor((ahora - new Date(c.fechaVencimiento)) / 86400000)),
          saldoPorCobrar: saldoCuota(c, valorUF),
          ventaId: venta?.id,
          comprador: objetivo.razonSocialReceptor,
          unidades: venta?.unidades || [],
          sugerencias: sugerirMovimientos(objetivo, disponibles).map((s) => ({
            movimientoId: s.movimiento.id,
            fecha: s.movimiento.fecha,
            glosa: s.movimiento.glosa,
            monto: s.movimiento.monto,
            score: s.score,
            motivos: s.motivos,
          })),
        }
      })
      .sort((a, b) => new Date(a.fechaVencimiento) - new Date(b.fechaVencimiento))

    res.json({ valorUF, cuotas: resultado })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al listar las cuotas por cobrar.' })
  }
}

/**
 * Registra el pago de una cuota SIN movimiento del banco.
 * Es la salida de emergencia, no el camino normal: efectivo, un pago que entró a otra
 * cuenta, o una cartola que todavía no se carga. Queda sin conciliación asociada, y por
 * eso la UI puede distinguir un pago respaldado por plata de uno que es solo palabra.
 */
const pagarManual = async (req, res) => {
  const { id } = req.params
  const { metodoPago, fechaPagoReal, montoCLP, numeroComprobante, notas } = req.body

  if (!metodoPago) return res.status(400).json({ error: 'Indica el método de pago.' })

  try {
    const cuota = await prisma.cuota.findUnique({ where: { id: Number(id) } })
    if (!cuota) return res.status(404).json({ error: 'Cuota no encontrada.' })
    if (cuota.estado === 'PAGADO') return res.status(400).json({ error: 'Esa cuota ya está pagada.' })

    const actualizada = await prisma.cuota.update({
      where: { id: cuota.id },
      data: {
        estado: 'PAGADO',
        metodoPago,
        fechaPagoReal: fechaPagoReal ? new Date(fechaPagoReal) : new Date(),
        montoCLP: montoCLP ? Math.round(Number(montoCLP)) : cuota.montoCLP,
        numeroComprobante: numeroComprobante || null,
        notas: notas || cuota.notas,
        origenMigracion: false,
        ...(req.file && { archivoUrl: `/uploads/${req.file.filename}` }),
      },
    })

    res.json(actualizada)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al registrar el pago.' })
  }
}

/** Clientes con plata a favor: pagaron de más, o pagaron antes de que existiera la cuota. */
const saldosAFavor = async (_req, res) => {
  try {
    const aCuenta = await prisma.conciliacion.findMany({
      where: { contactoId: { not: null } },
      include: {
        contacto: { select: { id: true, nombre: true, apellido: true, rut: true, email: true, telefono: true } },
        movimiento: { select: { id: true, fecha: true, glosa: true, monto: true } },
      },
      orderBy: { creadoEn: 'asc' },
    })
    const clientes = porCliente(aCuenta)
    res.json({ clientes, total: clientes.reduce((a, c) => a + c.saldo, 0) })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al listar los saldos a favor.' })
  }
}

/**
 * Aplica el saldo a favor de un cliente a una de sus cuotas.
 *
 * No crea plata: **mueve la imputación** del estacionamiento a la cuota, conservando el
 * movimiento del banco de origen. Se consume el saldo más antiguo primero.
 */
const aplicarSaldo = async (req, res) => {
  const { contactoId, cuotaId, monto } = req.body
  if (!contactoId || !cuotaId) return res.status(400).json({ error: 'Faltan el cliente y la cuota.' })

  try {
    const uf = await valorUFEn().catch(() => null)
    const [cuota, aCuenta] = await Promise.all([
      prisma.cuota.findUnique({
        where: { id: Number(cuotaId) },
        include: { ...INCLUDE_CUOTA, conciliaciones: true },
      }),
      prisma.conciliacion.findMany({
        where: { contactoId: Number(contactoId) },
        include: { movimiento: { select: { id: true, fecha: true, monto: true } } },
        orderBy: { creadoEn: 'asc' },
      }),
    ])

    if (!cuota) return res.status(404).json({ error: 'Cuota no encontrada.' })
    if (cuota.estado === 'PAGADO') return res.status(400).json({ error: 'Esa cuota ya está pagada.' })

    const disponible = saldoAFavor(aCuenta)
    if (disponible <= 0) return res.status(400).json({ error: 'Ese cliente no tiene saldo a favor.' })

    const restaCuota = saldoCuota(cuota, uf?.valor || 0)
    if (restaCuota <= 0) return res.status(400).json({ error: 'Esa cuota ya está cubierta.' })

    const aAplicar = Math.round(Math.min(disponible, restaCuota, monto != null ? Number(monto) : Infinity))
    if (!(aAplicar > 0)) return res.status(400).json({ error: 'El monto a aplicar debe ser mayor que cero.' })

    // Solo los abonos financian: una devolución ya sacó plata y no se puede volver a usar.
    const abonos = aCuenta.filter((c) => Number(c.movimiento?.monto) > 0)

    const resultado = await prisma.$transaction(async (tx) => {
      let restante = aAplicar
      const usados = []

      for (const linea of abonos) {
        if (restante <= 0) break
        const enEstaLinea = Math.min(restante, Math.abs(Number(linea.monto)))
        if (enEstaLinea <= 0) continue

        // El estacionamiento se vacía en la misma medida en que se llena la cuota: la suma
        // de las dos imputaciones nunca puede superar el movimiento original.
        const queda = Math.abs(Number(linea.monto)) - enEstaLinea
        if (queda < 1) await tx.conciliacion.delete({ where: { id: linea.id } })
        else await tx.conciliacion.update({ where: { id: linea.id }, data: { monto: queda } })

        const ya = await tx.conciliacion.findFirst({ where: { movimientoId: linea.movimientoId, cuotaId: cuota.id } })
        if (ya) {
          await tx.conciliacion.update({
            where: { id: ya.id },
            data: { monto: Math.abs(Number(ya.monto)) + enEstaLinea },
          })
        } else {
          await crearConciliacionSegura(tx, {
            data: {
              movimientoId: linea.movimientoId,
              cuotaId: cuota.id,
              monto: enEstaLinea,
              notas: 'Aplicado desde el saldo a favor del cliente',
              creadoPorId: req.usuario.id,
            },
          })
        }

        usados.push({ movimientoId: linea.movimientoId, monto: enEstaLinea })
        restante -= enEstaLinea
      }

      const quedaPendiente = restaCuota - aAplicar
      if (quedaPendiente < 1000) {
        await tx.cuota.update({
          where: { id: cuota.id },
          data: {
            estado: 'PAGADO',
            fechaPagoReal: usados[0] ? abonos.find((a) => a.movimientoId === usados[0].movimientoId)?.movimiento?.fecha : new Date(),
            montoCLP: Math.round(restaCuota),
            metodoPago: cuota.metodoPago || 'TRANSFERENCIA',
            origenMigracion: false,
          },
        })
      }

      return { aplicado: aAplicar, usados, cuotaPagada: quedaPendiente < 1000 }
    })

    res.json({ ...resultado, saldoRestante: disponible - aAplicar })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al aplicar el saldo a favor.' })
  }
}

// ─── CREAR DOCUMENTO Y CONCILIAR (el caso notaría) ────────────

/**
 * Qué es probablemente este movimiento, según el historial. Determinista, sin modelos:
 * mira cómo se clasificaron antes los movimientos con la misma glosa o la misma
 * contraparte. Pre-llena el formulario; el que decide es el que aprieta Guardar.
 */
const sugerenciaHistorial = async (req, res) => {
  try {
    const movimientoId = Number(req.query.movimientoId)
    if (!movimientoId) return res.status(400).json({ error: 'Falta el movimiento.' })
    const mov = await prisma.movimientoBanco.findUnique({
      where: { id: movimientoId },
      select: { id: true, glosa: true, nombreDetectado: true, contactoId: true, proveedorId: true, monto: true },
    })
    if (!mov) return res.status(404).json({ error: 'Movimiento no encontrado.' })

    const clasificados = await prisma.movimientoBanco.findMany({
      where: { conciliaciones: { some: {} }, id: { not: movimientoId } },
      select: {
        glosa: true, nombreDetectado: true, contactoId: true, proveedorId: true, fecha: true,
        conciliaciones: {
          select: {
            facturaCompra: { select: { cuentaId: true, cuenta: { select: { nombre: true } }, proveedorId: true } },
            documentoInterno: { select: { descripcion: true, cuentaId: true, cuenta: { select: { nombre: true } }, proveedorId: true, contactoId: true } },
          },
        },
      },
    })

    const historicos = clasificados.map((h) => {
      let clasificacion = null
      for (const c of h.conciliaciones) {
        if (c.documentoInterno) {
          clasificacion = { descripcion: c.documentoInterno.descripcion, cuentaId: c.documentoInterno.cuentaId, cuenta: c.documentoInterno.cuenta?.nombre || null, proveedorId: c.documentoInterno.proveedorId, contactoId: c.documentoInterno.contactoId }
          break
        }
        if (c.facturaCompra) {
          clasificacion = { descripcion: null, cuentaId: c.facturaCompra.cuentaId, cuenta: c.facturaCompra.cuenta?.nombre || null, proveedorId: c.facturaCompra.proveedorId, contactoId: null }
          break
        }
      }
      return { ...h, clasificacion }
    })

    res.json({ sugerencia: sugerirDesdeHistorial(mov, historicos) })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al buscar en el historial.' })
  }
}

/**
 * Crea el documento ficticio Y lo concilia con su movimiento, en una transacción.
 *
 * Es el caso notaría: pagué algo y no tengo documento que subir. El RESPALDO nace
 * amarrado a su movimiento — un respaldo suelto no existe, y si se desconcilia, se borra.
 */
const crearDocumentoYConciliar = async (req, res) => {
  const { movimientoId, descripcion, cuentaId, proveedorId, contactoId, notas, monto } = req.body || {}
  if (!movimientoId) return res.status(400).json({ error: 'Falta el movimiento.' })
  if (!descripcion?.trim()) return res.status(400).json({ error: 'Describe qué fue esta plata.' })
  if (proveedorId && contactoId) return res.status(400).json({ error: 'La contraparte es un cliente o un proveedor, no los dos.' })

  try {
    const mov = await prisma.movimientoBanco.findUnique({ where: { id: Number(movimientoId) }, include: { conciliaciones: true } })
    if (!mov) return res.status(404).json({ error: 'Movimiento no encontrado.' })
    const resta = saldoMovimiento(mov)
    if (resta <= 0) return res.status(400).json({ error: 'Ese movimiento ya está completamente imputado.' })

    const aImputar = monto != null ? Math.round(Number(monto)) : Math.round(resta)
    if (!(aImputar > 0)) return res.status(400).json({ error: 'El monto debe ser mayor que cero.' })
    if (aImputar > resta + 1) {
      return res.status(400).json({ error: `El movimiento solo tiene $${Math.round(resta).toLocaleString('es-CL')} sin imputar.` })
    }

    const creado = await prisma.$transaction(async (tx) => {
      const doc = await tx.documentoInterno.create({
        data: {
          tipo: 'RESPALDO',
          lado: Number(mov.monto) > 0 ? 'INGRESO' : 'GASTO',
          descripcion: descripcion.trim(),
          fechaEsperada: mov.fecha,
          montoCLP: aImputar,
          cuentaId: cuentaId ? Number(cuentaId) : null,
          proveedorId: proveedorId ? Number(proveedorId) : null,
          contactoId: contactoId ? Number(contactoId) : null,
          notas: notas || null,
          creadoPorId: req.usuario.id,
        },
        include: { cuenta: { select: { nombre: true, color: true } } },
      })
      await crearConciliacionSegura(tx, {
        data: { movimientoId: mov.id, documentoInternoId: doc.id, monto: aImputar, creadoPorId: req.usuario.id },
      })
      return doc
    })

    res.status(201).json(creado)
  } catch (err) {
    if (err instanceof ImputacionExcedida) return res.status(400).json({ error: err.message })
    console.error(err)
    res.status(500).json({ error: 'Error al crear el documento.' })
  }
}

module.exports = {
  resumen, porConciliar, conciliar, desconciliar, conciliarAutomatico,
  cuotasPorCobrar, pagarManual, saldosAFavor, aplicarSaldo,
  sugerenciaHistorial, crearDocumentoYConciliar,
}
