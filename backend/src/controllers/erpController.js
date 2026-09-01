/**
 * El panel financiero y el flujo de caja: las preguntas que uno se hace al abrir el ERP.
 *
 *   1. ¿Cuánta plata hay?          → caja (último saldo del banco, entradas/salidas del mes)
 *   2. ¿Cuánto me deben?           → cartera de cuotas, y cuánto vencido
 *   3. ¿Cómo viene el mes?         → próximos 30 días (por cobrar − por pagar) y presupuesto
 *   4. ¿Qué espera decisión mía?   → provisiones sin factura, plata del banco sin imputar
 *
 * Todo derivado, nada guardado: cada número sale de las mismas librerías que usan las
 * pantallas de detalle, así que el panel y el detalle no pueden contradecirse.
 */

const prisma = require('../lib/prisma')
const { valorUFEn } = require('../lib/uf')
const { WHERE_ABIERTA } = require('../lib/cuotas')
const { proyectar, claveMes } = require('../lib/gastosProgramados')
const { agrupar } = require('../lib/cartera')
const { verificarSalud } = require('../lib/salud')
const { saldoCuota, saldoFacturaCompra } = require('../lib/conciliacion')
const { montoCLPDocumento, pagadoDocumento, estadoDocumento } = require('../lib/documentos')
const { ejecucion } = require('../lib/presupuesto')
const { leerCartera } = require('./carteraController')
const { movimientoPresupuestario } = require('./cuentasController')

const mesActual = () => claveMes(new Date())

/** Etiqueta legible de un 'YYYY-MM'. */
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const etiquetaMes = (clave) => {
  const [a, m] = clave.split('-')
  return `${MESES[Number(m) - 1]} ${a.slice(2)}`
}

/** Los documentos de gasto abiertos (provisiones, respaldos pendientes y facturas), como salidas por venir. */
async function salidasAbiertas(valorUF) {
  const [documentos, facturas] = await Promise.all([
    prisma.documentoInterno.findMany({
      where: { lado: 'GASTO' },
      include: {
        cuenta: { select: { id: true, nombre: true, color: true } },
        proveedor: { select: { razonSocial: true } },
        conciliaciones: { select: { monto: true } },
        facturaCompra: { select: { id: true, folio: true, total: true, fechaVencimiento: true, fechaEmision: true, conciliaciones: { select: { monto: true } } } },
      },
    }),
    prisma.facturaCompra.findMany({
      where: { documentoInterno: null },
      include: {
        cuenta: { select: { id: true, nombre: true, color: true } },
        proveedor: { select: { razonSocial: true } },
        conciliaciones: { select: { monto: true } },
      },
    }),
  ])

  const salidas = []
  for (const d of documentos) {
    // Con factura asociada mandan el total y el vencimiento de la factura (dato real).
    const total = d.facturaCompra ? Number(d.facturaCompra.total) : montoCLPDocumento(d, valorUF)
    const saldo = total - pagadoDocumento(d)
    if (saldo <= 0) continue
    salidas.push({
      origen: d.tipo === 'PROVISION' ? 'PROVISION' : 'DOCUMENTO',
      documentoInternoId: d.id,
      concepto: d.descripcion,
      proveedor: d.proveedor?.razonSocial || null,
      cuenta: d.cuenta || null,
      fecha: d.facturaCompra?.fechaVencimiento || d.facturaCompra?.fechaEmision || d.fechaEsperada,
      monto: saldo,
      estado: estadoDocumento(d, { valorUF }),
      facturada: Boolean(d.facturaCompra),
    })
  }
  for (const f of facturas) {
    const saldo = saldoFacturaCompra(f)
    if (saldo <= 0) continue
    salidas.push({
      origen: 'COMPRA',
      facturaCompraId: f.id,
      concepto: `Factura N° ${f.folio}`,
      proveedor: f.proveedor?.razonSocial || null,
      cuenta: f.cuenta || null,
      fecha: f.fechaVencimiento || f.fechaEmision,
      monto: saldo,
      facturada: true,
    })
  }
  return salidas
}

const dashboard = async (req, res) => {
  try {
    const ahora = mesActual()
    const [anio, mes] = ahora.split('-').map(Number)
    const inicioMes = new Date(Date.UTC(anio, mes - 1, 1))
    const finMes = new Date(Date.UTC(anio, mes, 0, 23, 59, 59, 999))
    const hoy = new Date()
    const en30 = new Date(hoy.getTime() + 30 * 86400000)

    const uf = await valorUFEn().catch(() => null)
    const valorUF = uf?.valor || 0

    const [movimientosMes, ultimoSaldo, cuentasBancarias, cartera, cuotas30, salidas, movsSinImputar, cuentas, presupuestosMes, movsPresu, salud] = await Promise.all([
      prisma.movimientoBanco.findMany({
        where: { ignorado: false, fecha: { gte: inicioMes, lte: finMes } },
        select: { monto: true },
      }),
      prisma.movimientoBanco.findFirst({ where: { saldo: { not: null } }, orderBy: [{ fecha: 'desc' }, { id: 'desc' }], select: { saldo: true, fecha: true } }),
      prisma.cuentaBancaria.count({ where: { activa: true } }),
      leerCartera(),
      prisma.cuota.findMany({
        where: { ...WHERE_ABIERTA, fechaVencimiento: { lte: en30 } },
        include: { conciliaciones: { select: { monto: true } }, planPago: { select: { venta: { select: { comprador: { select: { id: true, nombre: true, apellido: true } } } } } } },
      }),
      salidasAbiertas(valorUF),
      prisma.movimientoBanco.findMany({
        where: { ignorado: false, conciliaciones: { none: {} } },
        select: { monto: true },
      }),
      prisma.cuentaGasto.findMany({ where: { activa: true } }),
      prisma.presupuesto.findMany({ where: { periodo: ahora } }),
      movimientoPresupuestario(valorUF),
      verificarSalud(prisma, { ejemplos: 3 }),
    ])

    // ── Caja ──
    const entradasMes = movimientosMes.filter((m) => Number(m.monto) > 0).reduce((a, m) => a + Number(m.monto), 0)
    const salidasMes = movimientosMes.filter((m) => Number(m.monto) < 0).reduce((a, m) => a - Number(m.monto), 0)

    // ── CxC ──
    const cxc = agrupar(cartera.filas, hoy)

    // ── Próximos 30 días ──
    const porCobrar30 = cuotas30.reduce((a, c) => a + Math.max(0, saldoCuota(c, valorUF)), 0)
    const porPagar30 = salidas.filter((s) => !s.fecha || new Date(s.fecha) <= en30).reduce((a, s) => a + s.monto, 0)

    // ── Provisiones vencidas sin factura: "no te han facturado" ──
    const provisionesVencidas = salidas.filter((s) => s.estado === 'VENCIDO_SIN_FACTURA')

    // ── Presupuesto del mes, por cuenta grande ──
    const presupuestos = presupuestosMes.map((p) => ({
      cuentaId: p.cuentaId,
      periodo: p.periodo,
      montoCLP: Number(p.montoCLP) > 0 ? Number(p.montoCLP) : Math.round(Number(p.montoUF || 0) * valorUF),
    }))
    const ejec = ejecucion({ cuentas, presupuestos, ejecutado: movsPresu.ejecutado, comprometido: movsPresu.comprometido, periodos: [ahora] })

    // ── Pendientes ──
    const abonosSinImputar = movsSinImputar.filter((m) => Number(m.monto) > 0)
    const cargosSinDocumento = movsSinImputar.filter((m) => Number(m.monto) < 0)

    res.json({
      mes: ahora,
      valorUF,
      caja: {
        saldo: ultimoSaldo?.saldo != null ? Number(ultimoSaldo.saldo) : null,
        saldoAl: ultimoSaldo?.fecha || null,
        entradasMes,
        salidasMes,
        netoMes: entradasMes - salidasMes,
        cuentas: cuentasBancarias,
      },
      cxc: {
        total: cxc.total,
        vencido: cxc.vencido,
        clientes: cxc.clientes.length,
        peores: cxc.clientes.slice(0, 3).map((c) => ({ contactoId: c.contactoId, nombre: c.nombre, total: c.total, vencido: c.vencido, diasMax: c.diasMax })),
      },
      proximos30: {
        porCobrar: porCobrar30,
        porPagar: porPagar30,
        neto: porCobrar30 - porPagar30,
      },
      provisiones: {
        vencidasSinFactura: provisionesVencidas.length,
        montoSinFactura: provisionesVencidas.reduce((a, s) => a + s.monto, 0),
        detalle: provisionesVencidas.slice(0, 5),
      },
      presupuestoMes: {
        total: ejec.porPeriodo[ahora],
        cuentas: ejec.cuentas.map((c) => ({ id: c.id, nombre: c.nombre, color: c.color, ...c.porPeriodo[ahora] })),
      },
      pendientes: {
        abonosSinImputar: { cantidad: abonosSinImputar.length, monto: abonosSinImputar.reduce((a, m) => a + Number(m.monto), 0) },
        cargosSinDocumento: { cantidad: cargosSinDocumento.length, monto: cargosSinDocumento.reduce((a, m) => a - Number(m.monto), 0) },
      },
      salud: { errores: salud.errores, avisos: salud.avisos },
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al cargar el panel del ERP.' })
  }
}

/** Los invariantes del ERP verificados contra la base (ver lib/salud.js). */
const salud = async (_req, res) => {
  try {
    res.json(await verificarSalud(prisma))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al verificar la salud de los datos.' })
  }
}

/**
 * Flujo de caja: lo que entró y salió, y lo que viene.
 *
 * La regla que evita el error clásico de esta vista: **el pasado se arma solo con
 * movimientos reales del banco y el futuro solo con proyección.** Si se mezclaran, una
 * cuota ya cobrada aparecería dos veces.
 *
 *   Entradas proyectadas: cuotas por cobrar + arriendos pendientes.
 *   Salidas proyectadas: provisiones y documentos abiertos + facturas de compra sin pagar
 *   + comisiones de venta pendientes (del CRM) + ocurrencias de gastos programados que aún
 *   no tienen provisión generada (meses lejanos).
 */
const flujo = async (req, res) => {
  const meses = Math.min(Math.max(Number(req.query.meses) || 12, 1), 24)

  try {
    const hoy = new Date()
    const desde = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth() - Math.min(meses, 12), 1))
    const hasta = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth() + meses + 1, 0))

    const uf = await valorUFEn().catch(() => null)
    const valorUF = uf?.valor || 0
    const aPesos = (montoUF, montoCLP) => (Number(montoCLP) > 0 ? Number(montoCLP) : Math.round(Number(montoUF || 0) * valorUF))

    const [movimientos, cuotas, arriendos, comisiones, ultimoSaldo, gastos, provisionesExistentes, salidas] = await Promise.all([
      prisma.movimientoBanco.findMany({
        where: { fecha: { gte: desde }, ignorado: false },
        include: {
          // La cuenta no está en el movimiento: la trae el documento que paga.
          conciliaciones: {
            select: {
              contactoId: true,
              documentoInterno: { select: { descripcion: true, cuenta: { select: { nombre: true, color: true } } } },
              facturaCompra: { select: { cuenta: { select: { nombre: true, color: true } } } },
            },
          },
        },
        orderBy: { fecha: 'asc' },
      }),
      // Solo lo que sigue por cobrar: lo pagado ya está en los movimientos reales.
      prisma.cuota.findMany({
        where: { ...WHERE_ABIERTA, fechaVencimiento: { lte: hasta } },
        select: {
          id: true, montoUF: true, montoCLP: true, fechaVencimiento: true, origenMigracion: true,
          numeroCuota: true, tipo: true,
          conciliaciones: { select: { monto: true } },
          planPago: {
            select: {
              venta: {
                select: {
                  id: true,
                  comprador: { select: { id: true, nombre: true, apellido: true } },
                  unidades: { select: { numero: true, tipo: true, edificio: { select: { nombre: true } } } },
                },
              },
            },
          },
        },
      }),
      prisma.pagoArriendo.findMany({
        where: { estado: { in: ['PENDIENTE', 'ATRASADO'] }, mes: { lte: hasta } },
        include: {
          conciliaciones: { select: { monto: true } },
          arriendo: { select: { montoMensualUF: true, contacto: { select: { nombre: true, apellido: true } }, unidad: { select: { numero: true, tipo: true } } } },
        },
      }),
      prisma.comision.findMany({
        where: { OR: [{ venta: { estado: { not: 'ANULADO' } } }, { arriendoId: { not: null } }] },
        include: {
          venta: { select: { id: true, estado: true, fechaPromesa: true, fechaEscritura: true } },
          arriendo: { select: { fechaInicio: true } },
          usuario: { select: { id: true, nombre: true } },
        },
      }),
      prisma.movimientoBanco.findFirst({ where: { saldo: { not: null } }, orderBy: [{ fecha: 'desc' }, { id: 'desc' }], select: { saldo: true, fecha: true } }),
      prisma.gastoProgramado.findMany({ where: { activo: true }, include: { cuenta: { select: { nombre: true } }, proveedor: { select: { razonSocial: true } } } }),
      prisma.documentoInterno.findMany({ where: { gastoProgramadoId: { not: null } }, select: { gastoProgramadoId: true, periodo: true } }),
      salidasAbiertas(valorUF),
    ])

    const ahora = mesActual()
    const mapa = new Map()

    // La serie tiene que ser CONTINUA: un mes sin movimientos no puede desaparecer.
    for (let i = -Math.min(meses, 12); i <= meses; i++) {
      const d = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth() + i, 1))
      const clave = claveMes(d)
      mapa.set(clave, {
        mes: clave, etiqueta: etiquetaMes(clave),
        esFuturo: clave > ahora, esActual: clave === ahora,
        entradasReales: 0, salidasReales: 0, entradasProyectadas: 0, salidasProyectadas: 0,
        porCuenta: {}, sinCuenta: 0, detalle: [],
      })
    }
    const mes = (clave) => {
      if (!mapa.has(clave)) {
        mapa.set(clave, {
          mes: clave, etiqueta: etiquetaMes(clave), esFuturo: clave > ahora, esActual: clave === ahora,
          entradasReales: 0, salidasReales: 0, entradasProyectadas: 0, salidasProyectadas: 0,
          porCuenta: {}, sinCuenta: 0, detalle: [],
        })
      }
      return mapa.get(clave)
    }

    // ── Real: lo que efectivamente pasó por el banco ──
    const cuentaDe = (m) => {
      for (const c of m.conciliaciones || []) {
        const cuenta = c.documentoInterno?.cuenta || c.facturaCompra?.cuenta
        if (cuenta) return cuenta
      }
      return null
    }
    for (const m of movimientos) {
      const f = mes(claveMes(m.fecha))
      const monto = Number(m.monto)
      const cuenta = cuentaDe(m)
      // Devolverle plata a un cliente no es un gasto: es la salida de algo que nunca fue mío.
      const esDevolucion = monto < 0 && (m.conciliaciones || []).some((c) => c.contactoId)

      f.detalle.push({
        tipo: monto > 0 ? 'ENTRADA' : 'SALIDA',
        real: true,
        origen: 'BANCO',
        concepto: m.glosa,
        nota: esDevolucion ? 'Devolución a un cliente' : cuenta?.nombre || null,
        fecha: m.fecha,
        monto: Math.abs(monto),
        ref: { movimientoId: m.id },
      })

      if (monto > 0) { f.entradasReales += monto; continue }
      f.salidasReales += Math.abs(monto)

      const etiqueta = esDevolucion ? 'Devoluciones a clientes' : cuenta?.nombre
      if (etiqueta) f.porCuenta[etiqueta] = (f.porCuenta[etiqueta] || 0) + Math.abs(monto)
      // Sin documento que lo respalde, el cargo queda sin clasificar — y eso es información:
      // dice que falta el documento, en vez de fingir que se sabe qué era.
      else f.sinCuenta += Math.abs(monto)
    }

    // ── Proyectado: solo hacia adelante, para no contar dos veces ──
    for (const c of cuotas) {
      const saldo = aPesos(c.montoUF, c.montoCLP) - (c.conciliaciones || []).reduce((a, x) => a + Math.abs(Number(x.monto)), 0)
      if (saldo <= 0) continue
      const clave = claveMes(c.fechaVencimiento)
      if (clave < ahora) continue // ya venció: si se cobró está en el banco, y si no, es mora (cartera)
      const f = mes(clave)
      f.entradasProyectadas += saldo

      const venta = c.planPago?.venta
      const comprador = venta?.comprador
      const unidades = (venta?.unidades || []).map((u) => `${u.tipo} ${u.numero}`).join(', ')
      f.detalle.push({
        tipo: 'ENTRADA',
        real: false,
        origen: 'CUOTA',
        concepto: comprador ? `${comprador.nombre} ${comprador.apellido || ''}`.trim() : 'Cuota sin cliente',
        nota: [`Cuota ${c.numeroCuota}${c.tipo ? ` · ${c.tipo}` : ''}`, unidades, venta?.unidades?.[0]?.edificio?.nombre]
          .filter(Boolean).join(' · '),
        fecha: c.fechaVencimiento,
        monto: saldo,
        migrada: c.origenMigracion,
        ref: { cuotaId: c.id, ventaId: venta?.id ?? null, contactoId: comprador?.id ?? null },
      })
    }

    for (const p of arriendos) {
      const saldo = aPesos(p.montoUF ?? p.arriendo?.montoMensualUF, p.montoCLP) - (p.conciliaciones || []).reduce((a, x) => a + Math.abs(Number(x.monto)), 0)
      if (saldo <= 0) continue
      const clave = claveMes(p.mes)
      const f = mes(clave < ahora ? ahora : clave) // un arriendo impago se arrastra: se sigue esperando
      f.entradasProyectadas += saldo
      const contacto = p.arriendo?.contacto
      f.detalle.push({
        tipo: 'ENTRADA',
        real: false,
        origen: 'ARRIENDO',
        concepto: contacto ? `${contacto.nombre} ${contacto.apellido || ''}`.trim() : 'Arriendo',
        nota: `Arriendo ${new Date(p.mes).toISOString().slice(0, 7)} · ${p.arriendo?.unidad?.tipo || ''} ${p.arriendo?.unidad?.numero || ''}`.trim(),
        fecha: p.mes,
        monto: saldo,
        ref: { pagoArriendoId: p.id },
      })
    }

    for (const c of comisiones) {
      const tramos = [
        { t: 'PRIMERA', monto: Number(c.montoPrimera), estado: c.estadoPrimera, fecha: c.venta?.fechaPromesa || c.arriendo?.fechaInicio },
        { t: 'SEGUNDA', monto: Number(c.montoSegunda), estado: c.estadoSegunda, fecha: c.venta?.fechaEscritura },
      ]
      for (const tr of tramos) {
        if (!(tr.monto > 0) || tr.estado === 'PAGADO') continue
        // Sin fecha del hito todavía, se proyecta al mes en curso: es una deuda vigente.
        const clave = tr.fecha ? claveMes(tr.fecha) : ahora
        const f = mes(clave < ahora ? ahora : clave)
        const monto = Math.round(tr.monto * valorUF)
        f.salidasProyectadas += monto
        f.porCuenta['Comisiones de venta'] = (f.porCuenta['Comisiones de venta'] || 0) + monto
        f.detalle.push({
          tipo: 'SALIDA',
          real: false,
          origen: 'COMISION',
          concepto: `Comisión de ${c.usuario?.nombre || 'vendedor'}`,
          nota: [tr.t === 'PRIMERA' ? 'primer tramo' : 'segundo tramo', c.venta ? `venta N° ${c.venta.id}` : 'arriendo']
            .filter(Boolean).join(' · '),
          fecha: tr.fecha || null,
          monto,
          ref: { comisionId: c.id, ventaId: c.venta?.id ?? null },
        })
      }
    }

    // ── Provisiones, documentos y facturas abiertas ──
    // Una salida vencida y sin pagar se arrastra al mes en curso en vez de ignorarse: es
    // plata que va a salir igual. Es la dirección conservadora para la caja.
    for (const s of salidas) {
      const clave = s.fecha ? claveMes(s.fecha) : ahora
      const f = mes(clave < ahora ? ahora : clave)
      f.salidasProyectadas += s.monto
      const etiqueta = s.cuenta?.nombre || s.proveedor || s.concepto
      f.porCuenta[etiqueta] = (f.porCuenta[etiqueta] || 0) + s.monto
      f.detalle.push({
        tipo: 'SALIDA',
        real: false,
        origen: s.origen,
        concepto: s.concepto,
        nota: [s.proveedor, s.cuenta?.nombre, s.estado === 'VENCIDO_SIN_FACTURA' ? '⚠ sin factura' : null].filter(Boolean).join(' · ') || null,
        fecha: s.fecha,
        monto: s.monto,
        ref: s.documentoInternoId ? { documentoInternoId: s.documentoInternoId } : { facturaCompraId: s.facturaCompraId },
      })
    }

    // ── Gastos programados sin provisión generada todavía (meses lejanos) ──
    const cubiertas = new Set(provisionesExistentes.map((p) => `${p.gastoProgramadoId}|${p.periodo}`))
    const proyeccionGastos = proyectar(gastos, new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), 1)), hasta, valorUF, cubiertas)
    for (const g of proyeccionGastos) {
      const f = mes(g.periodo)
      if (!f) continue
      f.salidasProyectadas += g.montoCLP
      const etiqueta = g.cuenta || g.nombre
      f.porCuenta[etiqueta] = (f.porCuenta[etiqueta] || 0) + g.montoCLP
      f.detalle.push({
        tipo: 'SALIDA',
        real: false,
        origen: 'GASTO',
        concepto: g.nombre,
        nota: [g.proveedor, g.cuenta].filter(Boolean).join(' · ') || null,
        fecha: g.fecha,
        monto: g.montoCLP,
        ref: { gastoProgramadoId: g.gastoId, periodo: g.periodo },
      })
    }

    const filas = [...mapa.values()].sort((a, b) => a.mes.localeCompare(b.mes))

    // Un mes pasado sin NINGÚN movimiento no es "un mes tranquilo": es un hueco en la
    // cobertura del banco. Se marca para que la pantalla lo diga en vez de mostrar $0.
    const mesesConBanco = new Set(movimientos.map((m) => claveMes(m.fecha)))
    const primerMesConBanco = [...mesesConBanco].sort()[0] || null
    const huecos = []
    for (const f of filas) {
      f.sinDatosBanco = !f.esFuturo && !f.esActual && primerMesConBanco != null && f.mes >= primerMesConBanco && !mesesConBanco.has(f.mes)
      if (f.sinDatosBanco) huecos.push(f.etiqueta)
    }

    // Saldo acumulado desde el último saldo conocido del banco.
    let saldo = ultimoSaldo?.saldo != null ? Number(ultimoSaldo.saldo) : 0
    const saldoMesUltimoConocido = ultimoSaldo ? claveMes(ultimoSaldo.fecha) : null
    for (const f of filas) {
      f.entradas = f.entradasReales + f.entradasProyectadas
      f.salidas = f.salidasReales + f.salidasProyectadas
      f.neto = f.entradas - f.salidas
      f.detalle.sort((a, b) => b.monto - a.monto)
      if (saldoMesUltimoConocido && f.mes > saldoMesUltimoConocido) {
        saldo += f.neto
        f.saldoProyectado = saldo
      } else if (f.mes === saldoMesUltimoConocido) {
        f.saldoProyectado = saldo
      }
    }

    res.json({
      valorUF,
      mesActual: ahora,
      saldoInicial: ultimoSaldo?.saldo != null ? Number(ultimoSaldo.saldo) : null,
      saldoAl: ultimoSaldo?.fecha || null,
      filas,
      huecos,
      limitaciones: [
        ...(huecos.length ? [`Sin movimientos bancarios cargados en: ${huecos.join(', ')}. Esos meses no son $0: falta cargar la cartola.`] : []),
        `Las salidas proyectadas incluyen provisiones y facturas abiertas, comisiones pendientes y ${gastos.length} gasto(s) programado(s). Una provisión con factura usa el monto real de la factura.`,
        `Los montos en UF se proyectan con la UF de hoy (${Math.round(valorUF).toLocaleString('es-CL')}).`,
      ],
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al calcular el flujo de caja.' })
  }
}

module.exports = { dashboard, salud, flujo, salidasAbiertas }
