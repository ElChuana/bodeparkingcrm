const fs = require('fs')
const prisma = require('../lib/prisma')
const { crearConciliacionSegura } = require('../lib/imputacion')
const { procesarCartola, huellaMovimiento } = require('../lib/cartola')
const { saldoMovimiento, estaCuadrado, normalizarRut } = require('../lib/conciliacion')
const { indexar, resolver, emparejarNombre, claveNombre, nucleoGlosa } = require('../lib/contraparte')
const { aplicar } = require('../lib/reglas')
const { ocurrencias, claveMes } = require('../lib/gastosProgramados')
const { registrarContraparte, aprenderNombre, propagar, olvidar } = require('../lib/aprendizaje')
const { disponible, analizarGlosas: analizarGlosasIA } = require('../lib/glosaIA')
const { valorUFEn } = require('../lib/uf')

// ─── CUENTAS ──────────────────────────────────────────────────

const listarCuentas = async (req, res) => {
  try {
    const cuentas = await prisma.cuentaBancaria.findMany({
      orderBy: { creadoEn: 'asc' },
      include: { _count: { select: { movimientos: true } } },
    })
    res.json(cuentas)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al listar las cuentas bancarias.' })
  }
}

const crearCuenta = async (req, res) => {
  const { banco, numeroCuenta, rutEmpresa, razonSocial, alias } = req.body
  if (!banco || !numeroCuenta || !rutEmpresa || !razonSocial) {
    return res.status(400).json({ error: 'Banco, número de cuenta, RUT y razón social son requeridos.' })
  }
  try {
    const cuenta = await prisma.cuentaBancaria.create({
      data: { banco, numeroCuenta: String(numeroCuenta), rutEmpresa, razonSocial, alias: alias || null },
    })
    res.status(201).json(cuenta)
  } catch (err) {
    if (err.code === 'P2002') return res.status(400).json({ error: 'Esa cuenta ya está registrada.' })
    console.error(err)
    res.status(500).json({ error: 'Error al crear la cuenta bancaria.' })
  }
}

/**
 * Devuelve la cuenta a usar cuando no la mandan explícita. Si hay una sola
 * cuenta registrada, es esa: pedirle el id al scraper en cada llamada sería
 * fricción sin ganancia.
 */
async function resolverCuenta(cuentaId) {
  if (cuentaId) return prisma.cuentaBancaria.findUnique({ where: { id: Number(cuentaId) } })
  const cuentas = await prisma.cuentaBancaria.findMany({ where: { activa: true }, take: 2 })
  return cuentas.length === 1 ? cuentas[0] : null
}

// ─── CARGA DE CARTOLA ─────────────────────────────────────────

/**
 * Lo único que se puede saber de un movimiento antes de que una persona lo mire.
 *
 * Dos señales, y ninguna clasifica:
 *   1. las reglas escritas a mano — a qué gasto programado corresponde el cargo;
 *   2. la contraparte ya aprendida — quién es el que paga.
 *
 * La CUENTA DE GASTO no se guarda acá. Un movimiento del banco solo dice que se movió
 * plata; qué era lo dice el documento que paga. Guardarla también en el movimiento
 * crearía dos versiones de la misma respuesta.
 */
function enriquecer(m, { reglas, alias }) {
  const decision = aplicar(reglas, m)
  const contraparte = resolver(m.glosa, alias)
  return {
    contactoId: contraparte?.contactoId ?? null,
    regla: decision.regla,
    autoValidar: decision.autoValidar,
    gastoProgramadoId: decision.gastoProgramadoId,
  }
}

/**
 * Graba movimientos ya parseados. Es el corazón compartido por las vías de entrada
 * —subida manual del .txt y POST del scraper—, así que la deduplicación y el registro
 * de la carga quedan idénticos en las dos.
 */
async function guardarMovimientos({
  cuenta, movimientos, cuadre, rango, origen, nombreArchivo, archivoUrl, usuarioId, etiquetasDe,
}) {
  if (!movimientos.length) {
    const err = new Error('No se reconoció ningún movimiento en el archivo. ¿Es la cartola del banco?')
    err.status = 400
    throw err
  }

  const huellas = movimientos.map((m) => huellaMovimiento(cuenta.id, m))
  const yaExisten = await prisma.movimientoBanco.findMany({
    where: { huella: { in: huellas } },
    select: { huella: true },
  })
  const existentes = new Set(yaExisten.map((m) => m.huella))
  const nuevos = movimientos.filter((m) => !existentes.has(huellaMovimiento(cuenta.id, m)))

  const [reglasActivas, aliasFilas] = await Promise.all([
    prisma.reglaConciliacion.findMany({ where: { activa: true } }),
    prisma.aliasContraparte.findMany({ where: { contactoId: { not: null } } }),
  ])
  const contexto = { reglas: reglasActivas, alias: indexar(aliasFilas) }

  return prisma.$transaction(async (tx) => {
    const carga = await tx.cargaCartola.create({
      data: {
        cuentaId: cuenta.id,
        origen,
        nombreArchivo: nombreArchivo || null,
        archivoUrl: archivoUrl || null,
        desde: rango.desde ? new Date(rango.desde) : null,
        hasta: rango.hasta ? new Date(rango.hasta) : null,
        totalLeidos: movimientos.length,
        totalNuevos: nuevos.length,
        totalRepetidos: movimientos.length - nuevos.length,
        cuadra: cuadre.cuadra,
        detalleCuadre: cuadre,
        subidoPorId: usuarioId || null,
      },
    })

    if (nuevos.length) {
      await tx.movimientoBanco.createMany({
        data: nuevos.map((m) => ({
          cuentaId: cuenta.id,
          cargaId: carga.id,
          fecha: new Date(m.fecha),
          glosa: m.glosa,
          monto: m.monto,
          saldo: m.saldo ?? null,
          documento: m.documento ?? null,
          contraparteRut: m.contraparteRut ?? null,
          origen,
          ...(({ regla: _r, autoValidar: _a, gastoProgramadoId: _g, ...etiquetas }) => etiquetas)(enriquecer(m, contexto)),
          ...(etiquetasDe ? etiquetasDe(m) : {}),
          huella: huellaMovimiento(cuenta.id, m),
        })),
        skipDuplicates: true, // dos cargas simultáneas no se pisan
      })
    }

    const imputados = await imputarPorReglas(tx, cuenta.id, nuevos, contexto)

    return { carga, cuadre, imputados }
  })
}

/**
 * Imputa solo la ocurrencia de un gasto cuando una regla con `autoValidar` lo permite.
 *
 * En el rediseño la regla no imputa "al gasto" sino a su PROVISIÓN del período (el
 * DocumentoInterno que el cron genera). Si la provisión de ese mes todavía no existe,
 * se crea acá mismo — la regla ya afirmó qué es este cargo, y el documento es la forma
 * que esa afirmación toma. Condiciones, más estrictas que en Odoo:
 *
 *   · el gasto tiene que caer efectivamente en ese mes (uno trimestral no cae siempre);
 *   · la provisión no puede estar ya pagada;
 *   · un solo movimiento del lote puede reclamarla.
 *
 * Si algo de eso no se cumple, no pasa nada: el movimiento queda a la espera de que
 * alguien lo impute desde la pantalla.
 */
async function imputarPorReglas(tx, cuentaId, movimientos, contexto) {
  const candidatos = movimientos
    .map((m) => ({ m, d: enriquecer(m, contexto) }))
    .filter(({ d }) => d.autoValidar && d.gastoProgramadoId)
  if (!candidatos.length) return []

  const gastos = await tx.gastoProgramado.findMany({
    where: { id: { in: [...new Set(candidatos.map(({ d }) => d.gastoProgramadoId))] } },
  })
  const porId = new Map(gastos.map((g) => [g.id, g]))
  const uf = await valorUFEn().catch(() => null)

  const salida = []
  const reclamadas = new Set()

  for (const { m, d } of candidatos) {
    const gasto = porId.get(d.gastoProgramadoId)
    if (!gasto) continue

    const fecha = new Date(m.fecha)
    const periodo = claveMes(fecha)
    const clave = `${gasto.id}|${periodo}`
    if (reclamadas.has(clave)) continue

    // Un gasto trimestral no cae todos los meses: si en este mes no toca, no hay nada
    // que imputar y la regla se calla.
    const mes = ocurrencias(gasto, new Date(Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth(), 1)),
      new Date(Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth() + 1, 0)))
    if (!mes.length) continue

    // La provisión de ese período: la generada por el cron, o se crea acá.
    let provision = await tx.documentoInterno.findUnique({
      where: { gastoProgramadoId_periodo: { gastoProgramadoId: gasto.id, periodo } },
      include: { conciliaciones: { select: { monto: true } } },
    })
    if (provision && provision.conciliaciones.length) continue // ya pagada
    if (!provision) {
      provision = await tx.documentoInterno.create({
        data: {
          tipo: 'PROVISION',
          lado: 'GASTO',
          descripcion: gasto.nombre,
          fechaEsperada: mes[0].fecha,
          montoUF: gasto.montoUF,
          montoCLP: gasto.montoCLP,
          cuentaId: gasto.cuentaId,
          proveedorId: gasto.proveedorId,
          gastoProgramadoId: gasto.id,
          periodo,
        },
      })
    }

    const guardado = await tx.movimientoBanco.findUnique({ where: { huella: huellaMovimiento(cuentaId, m) } })
    if (!guardado) continue

    await crearConciliacionSegura(tx, {
      data: {
        movimientoId: guardado.id,
        documentoInternoId: provision.id,
        monto: Math.abs(Number(m.monto)),
        automatica: true,
        notas: `Imputado por la regla "${d.regla.nombre}"`,
      },
    }, { valorUF: uf?.valor })
    await tx.reglaConciliacion.update({ where: { id: d.regla.id }, data: { vecesAplicada: { increment: 1 } } })
    reclamadas.add(clave)
    salida.push({ movimientoId: guardado.id, gasto: gasto.nombre, periodo, regla: d.regla.nombre })
  }

  return salida
}

/** La vía cartola: parsea el .txt del banco y delega en el corazón compartido. */
function guardarCartola({ cuenta, texto, ...resto }) {
  const { movimientos, cuadre, rango } = procesarCartola(texto, cuenta.id)
  return guardarMovimientos({ cuenta, movimientos, cuadre, rango, ...resto })
}

/** Subida manual del .txt desde el ERP. */
const cargarCartola = async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Falta el archivo de la cartola.' })

  try {
    const cuenta = await resolverCuenta(req.body.cuentaId)
    if (!cuenta) {
      return res.status(400).json({ error: 'Indica a qué cuenta bancaria corresponde la cartola.' })
    }

    // El banco exporta en latin1, no en UTF-8: leerlo como UTF-8 rompe los
    // nombres con tilde y la ñ de las glosas.
    const texto = fs.readFileSync(req.file.path, 'latin1')

    const { carga, cuadre, imputados } = await guardarCartola({
      cuenta,
      texto,
      origen: 'CARTOLA_MANUAL',
      nombreArchivo: req.file.originalname,
      archivoUrl: `/uploads/${req.file.filename}`,
      usuarioId: req.usuario.id,
    })

    res.status(201).json({ carga, cuadre, imputados })
  } catch (err) {
    console.error(err)
    res.status(err.status || 500).json({ error: err.message || 'Error al procesar la cartola.' })
  }
}

/**
 * Entrada del scraper (autenticada por API key, no por JWT).
 * Manda el texto crudo de la cartola, no movimientos ya parseados: así el
 * parser vive en un solo lugar y arreglar el formato no obliga a redesplegar
 * el scraper.
 */
const recibirCartolaScraper = async (req, res) => {
  const { texto, cuentaId, nombreArchivo } = req.body
  if (!texto || typeof texto !== 'string') {
    return res.status(400).json({ error: 'Falta el campo "texto" con el contenido de la cartola.' })
  }

  try {
    const cuenta = await resolverCuenta(cuentaId)
    if (!cuenta) return res.status(400).json({ error: 'No se pudo determinar la cuenta bancaria (manda cuentaId).' })

    const { carga, cuadre } = await guardarCartola({
      cuenta,
      texto,
      origen: 'SCRAPER',
      nombreArchivo: nombreArchivo || null,
      usuarioId: null,
    })

    res.status(201).json({
      ok: true,
      cargaId: carga.id,
      leidos: carga.totalLeidos,
      nuevos: carga.totalNuevos,
      repetidos: carga.totalRepetidos,
      cuadra: cuadre.cuadra,
    })
  } catch (err) {
    console.error(err)
    res.status(err.status || 500).json({ error: err.message || 'Error al procesar la cartola.' })
  }
}

// ─── CONTRAPARTES POR IDENTIFICAR ─────────────────────────────

/**
 * Los catálogos contra los que se resuelve un nombre, más los alias.
 * Los alias van primero al resolver: un alias es una persona que YA dijo quién es este
 * nombre, y el catálogo no puede ganarle.
 */
async function catalogosDeContrapartes() {
  const [contactos, proveedores, alias] = await Promise.all([
    prisma.contacto.findMany({ select: { id: true, nombre: true, apellido: true, rut: true } }),
    prisma.proveedor.findMany({ select: { id: true, razonSocial: true, rut: true } }),
    prisma.aliasContraparte.findMany({ select: { clave: true, contactoId: true, proveedorId: true, interno: true } }),
  ])
  return {
    contactos: contactos.map((c) => ({ id: c.id, nombre: `${c.nombre || ''} ${c.apellido || ''}`.trim(), rut: c.rut })),
    proveedores: proveedores.map((p) => ({ id: p.id, nombre: p.razonSocial, rut: p.rut })),
    alias: new Map(alias.map((a) => [a.clave, a])),
  }
}

/**
 * De quién es este movimiento. Lo que alguien ya afirmó (alias) gana sobre cualquier
 * parecido calculado. El lado se decide por el signo: un abono viene de un cliente; un
 * cargo va primero a un proveedor y si no, a un cliente (una devolución).
 */
function identificar(m, catalogos, memo = new Map()) {
  const clave = `${m.monto > 0 ? '+' : '-'}|${m.beneficiario || ''}|${m.contraparte || ''}`
  if (memo.has(clave)) return memo.get(clave)

  const aprendido = catalogos.alias?.get(claveNombre(m.contraparte || ''))
  if (aprendido) {
    const r = aprendido.interno
      ? { interno: true, como: 'marcado como interno' }
      : {
        ...(aprendido.contactoId ? { contactoId: aprendido.contactoId } : {}),
        ...(aprendido.proveedorId ? { proveedorId: aprendido.proveedorId } : {}),
        como: 'identificado antes',
      }
    memo.set(clave, r)
    return r
  }

  let r = {}
  if (m.monto > 0) {
    const porBeneficiario = m.beneficiario && emparejarNombre(m.beneficiario, catalogos.contactos)
    const porContraparte = m.contraparte && emparejarNombre(m.contraparte, catalogos.contactos)
    const elegido = porBeneficiario || porContraparte
    if (elegido) r = { contactoId: elegido.id, quien: elegido.nombre, como: elegido.como }
  } else {
    const prov = m.contraparte && emparejarNombre(m.contraparte, catalogos.proveedores)
    if (prov) r = { proveedorId: prov.id, quien: prov.nombre, como: prov.como }
    else {
      // Un cargo también puede ir a un cliente: una devolución de reserva no la cobra un proveedor.
      const cli = m.contraparte && emparejarNombre(m.contraparte, catalogos.contactos)
      if (cli) r = { contactoId: cli.id, quien: cli.nombre, como: cli.como }
    }
  }

  memo.set(clave, r)
  return r
}

/**
 * Los nombres que aparecen en los movimientos y todavía no son nadie.
 *
 * La lista de trabajo para dejar la base ordenada de una sentada. Sale agrupada por
 * nombre y ordenada por plata movida, no por cantidad de veces: identificar a quien
 * mueve cuarenta millones importa más que a quien aparece veinte veces por mil pesos.
 */
const listarContrapartes = async (req, res) => {
  try {
    const movimientos = await prisma.movimientoBanco.findMany({
      where: { contactoId: null, proveedorId: null },
      select: { id: true, glosa: true, monto: true, nombreDetectado: true, fecha: true },
    })

    const grupos = new Map()
    for (const m of movimientos) {
      const nombre = m.nombreDetectado || nucleoGlosa(m.glosa)
      if (!nombre) continue
      const clave = claveNombre(nombre)
      if (!clave) continue
      if (!grupos.has(clave)) {
        grupos.set(clave, { clave, nombre, veces: 0, abonos: 0, cargos: 0, desde: m.fecha, hasta: m.fecha, ejemplos: [] })
      }
      const g = grupos.get(clave)
      g.veces++
      if (Number(m.monto) > 0) g.abonos += Number(m.monto)
      else g.cargos -= Number(m.monto)
      if (m.fecha < g.desde) g.desde = m.fecha
      if (m.fecha > g.hasta) g.hasta = m.fecha
      if (g.ejemplos.length < 3) g.ejemplos.push({ fecha: m.fecha, glosa: m.glosa, monto: Number(m.monto) })
    }

    const catalogos = await catalogosDeContrapartes()
    const filas = [...grupos.values()].map((g) => {
      // El lado se propone por dónde está la plata: quien solo recibe cargos es proveedor,
      // quien solo manda abonos es cliente. Cuando hay de los dos, no se propone lado.
      const soloCargos = g.cargos > 0 && g.abonos === 0
      const soloAbonos = g.abonos > 0 && g.cargos === 0
      const prov = soloCargos ? emparejarNombre(g.nombre, catalogos.proveedores) : null
      const cli = soloAbonos ? emparejarNombre(g.nombre, catalogos.contactos) : null
      return {
        ...g,
        movido: g.abonos + g.cargos,
        // Plata que entra Y sale por el mismo nombre suele ser tesorería propia (un fondo
        // mutuo que se rescata y se vuelve a invertir), no un cliente ni un proveedor.
        pareceInterno: g.abonos > 0 && g.cargos > 0,
        ladoSugerido: soloCargos ? 'PROVEEDOR' : soloAbonos ? 'CLIENTE' : null,
        sugerencia: prov
          ? { tipo: 'PROVEEDOR', id: prov.id, nombre: prov.nombre, como: prov.como }
          : cli ? { tipo: 'CLIENTE', id: cli.id, nombre: cli.nombre, como: cli.como } : null,
      }
    })

    filas.sort((a, b) => b.movido - a.movido)
    res.json({ total: filas.length, movimientosSinIdentificar: movimientos.length, filas })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al listar las contrapartes por identificar.' })
  }
}

/**
 * Dice quién es un nombre, de una vez y para siempre.
 *
 * Hace tres cosas en la misma transacción, porque separarlas dejaría la base a medio camino
 * si algo falla: crea el proveedor si hace falta, guarda el alias para que las próximas
 * cargas lo resuelvan solas, y etiqueta los movimientos que ya estaban esperando.
 */
const asignarContraparte = async (req, res) => {
  const { nombre, contactoId, proveedorId, proveedorNuevo, interno } = req.body
  if (!nombre) return res.status(400).json({ error: 'Falta el nombre de la contraparte.' })
  if (!contactoId && !proveedorId && !proveedorNuevo && !interno) {
    return res.status(400).json({ error: 'Indica a qué cliente o proveedor corresponde, o márcalo como interno.' })
  }
  if (contactoId && (proveedorId || proveedorNuevo)) {
    return res.status(400).json({ error: 'Una contraparte es cliente o proveedor, no las dos.' })
  }

  try {
    const salida = await prisma.$transaction(async (tx) => {
      let provId = proveedorId ? Number(proveedorId) : null
      let creado = null

      if (proveedorNuevo) {
        const rut = normalizarRut(proveedorNuevo.rut)
        if (!rut) {
          const e = new Error('El RUT del proveedor no es válido.')
          e.status = 400
          throw e
        }
        creado = await tx.proveedor.upsert({
          where: { rut },
          create: {
            rut,
            razonSocial: proveedorNuevo.razonSocial || nombre,
            cuentaId: proveedorNuevo.cuentaId ? Number(proveedorNuevo.cuentaId) : null,
            notas: 'Creado al identificar una contraparte del banco.',
          },
          update: {},
        })
        provId = creado.id
      }

      const destino = {
        contactoId: contactoId ? Number(contactoId) : null,
        proveedorId: provId,
        interno: !!interno && !contactoId && !provId,
      }
      const alias = await aprenderNombre(nombre, destino, tx)
      const etiquetados = await propagar(alias.clave, destino, tx)

      return { alias, etiquetados, proveedorCreado: creado }
    })

    res.json(salida)
  } catch (err) {
    if (err.status === 400) return res.status(400).json({ error: err.message })
    console.error(err)
    res.status(500).json({ error: 'Error al asignar la contraparte.' })
  }
}

/** Los alias ya aprendidos: lo que el sistema "sabe" de cada nombre del banco. */
const listarAlias = async (_req, res) => {
  try {
    const alias = await prisma.aliasContraparte.findMany({
      include: {
        contacto: { select: { id: true, nombre: true, apellido: true } },
        proveedor: { select: { id: true, razonSocial: true } },
      },
      orderBy: { ultimaVez: 'desc' },
    })
    res.json(alias)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al listar los alias.' })
  }
}

/**
 * Deshace una identificación. Borra el alias y suelta los movimientos que se
 * etiquetaron por él, salvo los que ya tienen un pago imputado — esos se informan.
 */
const eliminarContraparte = async (req, res) => {
  try {
    const r = await prisma.$transaction((tx) => olvidar(Number(req.params.id), tx))
    if (!r) return res.status(404).json({ error: 'Alias no encontrado.' })
    res.json({
      eliminado: r.alias.etiqueta,
      liberados: r.liberados,
      conPago: r.conPago,
      ...(r.conPago ? { aviso: `${r.conPago} movimiento(s) ya tienen un pago imputado y conservan la contraparte. Desconcilia primero si también hay que soltarlos.` } : {}),
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al eliminar la contraparte.' })
  }
}

/**
 * Vuelve a pasar el catálogo por los movimientos sin identificar.
 *
 * Hace falta porque el orden real de trabajo es al revés del ideal: primero se carga el
 * banco y después se cargan los proveedores. Sin esto, todo lo que se cargó antes de que
 * existiera el proveedor se queda sin identificar para siempre.
 */
const reidentificar = async (req, res) => {
  try {
    const [movimientos, catalogos] = await Promise.all([
      prisma.movimientoBanco.findMany({
        where: { contactoId: null, proveedorId: null },
        select: { id: true, glosa: true, monto: true, nombreDetectado: true },
      }),
      catalogosDeContrapartes(),
    ])

    const memo = new Map()
    const cambios = movimientos
      // El nombre sale del campo limpio si el lector de glosas corrió; si no, del núcleo de
      // la glosa misma (nucleoGlosa saca el preámbulo del banco).
      .map((m) => ({ id: m.id, ...identificar({ ...m, contraparte: m.nombreDetectado || nucleoGlosa(m.glosa), beneficiario: null }, catalogos, memo) }))
      .filter((c) => c.contactoId || c.proveedorId || c.interno)

    // Un update por movimiento sería 500 consultas; se agrupan por destino.
    const porDestino = new Map()
    for (const c of cambios) {
      const clave = c.interno ? 'interno' : c.contactoId ? `c${c.contactoId}` : `p${c.proveedorId}`
      if (!porDestino.has(clave)) {
        const datos = c.interno ? { ignorado: true } : c.contactoId ? { contactoId: c.contactoId } : { proveedorId: c.proveedorId }
        porDestino.set(clave, { datos, ids: [] })
      }
      porDestino.get(clave).ids.push(c.id)
    }
    for (const { datos, ids } of porDestino.values()) {
      await prisma.movimientoBanco.updateMany({ where: { id: { in: ids } }, data: datos })
    }

    res.json({ revisados: movimientos.length, identificados: cambios.length })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al re-identificar las contrapartes.' })
  }
}

const listarCargas = async (req, res) => {
  try {
    const cargas = await prisma.cargaCartola.findMany({
      take: 50,
      orderBy: { creadoEn: 'desc' },
      include: {
        cuenta: { select: { banco: true, numeroCuenta: true, alias: true } },
        subidoPor: { select: { nombre: true, apellido: true } },
      },
    })
    res.json(cargas)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al listar las cargas de cartola.' })
  }
}

// ─── MOVIMIENTOS ──────────────────────────────────────────────

/** La cuenta de gasto de un movimiento sale del documento que paga, nunca de él mismo. */
function cuentaDelMovimiento(m) {
  for (const c of m.conciliaciones || []) {
    const cuenta = c.documentoInterno?.cuenta || c.facturaCompra?.cuenta
    if (cuenta) return cuenta
  }
  return null
}

/**
 * Los totales de la cuenta, con los mismos filtros que el listado.
 *
 * Van aparte del listado a propósito: la pantalla corta la lista en los movimientos más
 * recientes, y las cifras de arriba tienen que hablar de la cuenta entera, no de la página.
 */
const resumenMovimientos = async (req, res) => {
  try {
    const donde = filtroMovimientos(req.query)
    const [abonos, cargos, paraConciliar] = await Promise.all([
      prisma.movimientoBanco.aggregate({ where: { ...donde, monto: { gt: 0 } }, _sum: { monto: true }, _count: true }),
      prisma.movimientoBanco.aggregate({ where: { ...donde, monto: { lt: 0 } }, _sum: { monto: true }, _count: true }),
      prisma.movimientoBanco.findMany({
        where: { ...donde, ignorado: false },
        select: { monto: true, conciliaciones: { select: { monto: true } } },
      }),
    ])
    res.json({
      abonos: { cantidad: abonos._count, monto: Number(abonos._sum.monto || 0) },
      cargos: { cantidad: cargos._count, monto: Math.abs(Number(cargos._sum.monto || 0)) },
      sinConciliar: paraConciliar.filter((m) => !estaCuadrado(saldoMovimiento(m))).length,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al calcular los totales de la cuenta.' })
  }
}

/** El filtro que comparten el listado y sus totales, para que no se separen nunca. */
function filtroMovimientos({ cuentaId, desde, hasta, tipo, search, ignorado }) {
  return {
    ...(cuentaId && { cuentaId: Number(cuentaId) }),
    ...(ignorado != null ? { ignorado: ignorado === 'true' } : {}),
    ...(desde || hasta
      ? { fecha: { ...(desde && { gte: new Date(desde) }), ...(hasta && { lte: new Date(hasta) }) } }
      : {}),
    ...(tipo === 'abono' && { monto: { gt: 0 } }),
    ...(tipo === 'cargo' && { monto: { lt: 0 } }),
    ...(search && {
      OR: [
        { glosa: { contains: search, mode: 'insensitive' } },
        { documento: { contains: search, mode: 'insensitive' } },
      ],
    }),
  }
}

const listarMovimientos = async (req, res) => {
  const { conciliado, limite, sinClasificar } = req.query

  try {
    const donde = filtroMovimientos(req.query)

    const movimientos = await prisma.movimientoBanco.findMany({
      where: donde,
      include: {
        cuenta: { select: { banco: true, numeroCuenta: true, alias: true } },
        contacto: { select: { id: true, nombre: true, apellido: true, rut: true } },
        proveedor: { select: { id: true, razonSocial: true, rut: true } },
        conciliaciones: {
          include: {
            cuota: { select: { id: true, numeroCuota: true, tipo: true } },
            pagoArriendo: { select: { id: true, mes: true, arriendo: { select: { id: true, contacto: { select: { nombre: true, apellido: true } } } } } },
            contacto: { select: { id: true, nombre: true, apellido: true } },
            facturaCompra: {
              select: {
                id: true, folio: true, tipoDte: true,
                proveedor: { select: { id: true, razonSocial: true } },
                cuenta: { select: { id: true, nombre: true, color: true } },
              },
            },
            documentoInterno: { select: { id: true, descripcion: true, tipo: true, cuenta: { select: { id: true, nombre: true, color: true } } } },
          },
        },
      },
      orderBy: [{ fecha: 'desc' }, { id: 'desc' }],
      take: Number(limite) || 300,
    })

    // Cuántos hay en total con esos mismos filtros: sin este número la pantalla corta en el
    // tope en silencio y hace pensar que la cartola se subió a medias.
    const total = await prisma.movimientoBanco.count({ where: donde })

    // Tanto el saldo como la CUENTA son derivados: el saldo, de lo imputado; la cuenta,
    // del documento que el movimiento paga. Ninguno es una columna.
    const conSaldo = movimientos.map((m) => {
      const saldo = saldoMovimiento(m)
      return {
        ...m,
        saldoPendiente: saldo,
        conciliado: estaCuadrado(saldo),
        cuentaGasto: cuentaDelMovimiento(m),
      }
    })

    let filtrados = conciliado == null
      ? conSaldo
      : conSaldo.filter((m) => m.conciliado === (conciliado === 'true'))
    if (sinClasificar === 'true') filtrados = filtrados.filter((m) => !m.cuentaGasto)

    res.set('X-Total-Count', String(total))
    res.set('Access-Control-Expose-Headers', 'X-Total-Count')
    res.json(filtrados)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al listar los movimientos.' })
  }
}

// No existe "crear movimiento a mano", y es a propósito: un movimiento bancario es un
// HECHO del banco. Los movimientos entran solo por cartola (scraper o subida manual).
// Lo que sí se puede crear son DOCUMENTOS, que son afirmaciones propias.

/**
 * Marca un movimiento como fuera del radar de conciliación, o le fija la contraparte.
 */
const actualizarMovimiento = async (req, res) => {
  const { id } = req.params
  const { ignorado, notas, contactoId, proveedorId, aprender } = req.body
  try {
    const mov = await prisma.movimientoBanco.update({
      where: { id: Number(id) },
      data: {
        ...(ignorado != null && { ignorado: Boolean(ignorado) }),
        ...(notas !== undefined && { notas: notas || null }),
        ...(contactoId !== undefined && { contactoId: contactoId ? Number(contactoId) : null }),
        ...(proveedorId !== undefined && { proveedorId: proveedorId ? Number(proveedorId) : null }),
      },
      include: { contacto: { select: { id: true, nombre: true, apellido: true, rut: true } } },
    })

    // Identificar la contraparte a mano también enseña: es la misma decisión que confirmar
    // una conciliación, y vale para todos los pagos siguientes de esa persona.
    if (aprender && mov.contactoId) await registrarContraparte(mov.glosa, mov.contactoId, mov.contacto?.rut)

    res.json(mov)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al actualizar el movimiento.' })
  }
}

/**
 * Lee las glosas pendientes con el modelo de lenguaje y guarda lo que extrajo.
 * Lo que sale va a columnas APARTE (`nombreDetectado`, `referenciaDetectada`): no pisa
 * la glosa, no concilia nada. El matcher las usa como una señal más y sigue decidiendo él.
 */
const analizarGlosas = async (req, res) => {
  if (!disponible()) {
    return res.status(400).json({
      error: 'No hay proveedor de IA configurado. Falta GROQ_API_KEY o XAI_API_KEY en el servidor.',
    })
  }

  try {
    const pendientes = await prisma.movimientoBanco.findMany({
      where: { glosaAnalizada: false },
      select: { id: true, glosa: true, contraparteRut: true },
      orderBy: { fecha: 'desc' },
      take: Number(req.body?.limite) || 200,
    })
    if (!pendientes.length) return res.json({ analizados: 0, conNombre: 0, errores: [], mensaje: 'No hay glosas pendientes.' })

    const { filas, errores, proveedor, modelo } = await analizarGlosasIA(pendientes.map((m) => m.glosa))

    let conNombre = 0
    const leidos = new Set()
    for (const f of filas) {
      const mov = pendientes[f.indice]
      if (!mov) continue
      leidos.add(mov.id)
      if (f.nombre) conNombre++
      await prisma.movimientoBanco.update({
        where: { id: mov.id },
        data: {
          nombreDetectado: f.nombre,
          referenciaDetectada: f.referencia,
          // El RUT completa un campo del banco solo si venía vacío: un dato que puso el
          // banco no lo pisa un modelo, nunca.
          ...(f.rut && !mov.contraparteRut ? { contraparteRut: f.rut } : {}),
          glosaAnalizada: true,
        },
      })
    }

    // Las que el modelo no devolvió quedan SIN marcar, para poder reintentarlas.
    res.json({ analizados: leidos.size, pendientes: pendientes.length, conNombre, errores, proveedor, modelo })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: `Error al analizar las glosas: ${err.message}` })
  }
}

/** Le dice a la pantalla si el lector de glosas está disponible, para no ofrecer un botón muerto. */
const estadoIa = async (_req, res) => {
  const pendientes = await prisma.movimientoBanco.count({ where: { glosaAnalizada: false } })
  res.json({ disponible: disponible(), pendientes })
}

module.exports = {
  listarAlias,
  eliminarContraparte,
  listarCuentas,
  crearCuenta,
  cargarCartola,
  listarContrapartes,
  asignarContraparte,
  reidentificar,
  recibirCartolaScraper,
  listarCargas,
  listarMovimientos,
  resumenMovimientos,
  actualizarMovimiento,
  analizarGlosas,
  estadoIa,
  cuentaDelMovimiento,
  catalogosDeContrapartes,
  identificar,
}
