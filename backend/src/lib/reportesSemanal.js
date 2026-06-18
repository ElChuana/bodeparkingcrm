const prisma = require('./prisma')
const { generarContenido } = require('./groq')

const CHILE_UTC_OFFSET_HOURS = 4

// Calcula el lunes y domingo (en hora Chile) de la semana ANTERIOR a la actual
function semanaAnterior() {
  // Fecha actual en hora Chile
  const ahoraChile = new Date(Date.now() - CHILE_UTC_OFFSET_HOURS * 3600 * 1000)
  // Día de la semana en Chile (0=domingo, 1=lunes... 6=sábado)
  const diaActual = ahoraChile.getUTCDay()
  // Cuántos días retroceder para llegar al lunes de la semana ANTERIOR
  // si hoy es lunes, retrocedo 7 días -> lunes pasado
  // si hoy es domingo, retrocedo 6 días -> lunes pasado
  const diasAtras = diaActual === 0 ? 6 : diaActual - 1
  // Lunes de esta semana (en Chile)
  const lunesEsta = new Date(ahoraChile)
  lunesEsta.setUTCDate(lunesEsta.getUTCDate() - diasAtras)
  // Lunes de la semana ANTERIOR
  const lunesAnterior = new Date(lunesEsta)
  lunesAnterior.setUTCDate(lunesAnterior.getUTCDate() - 7)
  const domingoAnterior = new Date(lunesAnterior)
  domingoAnterior.setUTCDate(domingoAnterior.getUTCDate() + 6)

  // Formato YYYY-MM-DD en hora Chile
  const fmt = d => d.toISOString().slice(0, 10)
  return { inicioISO: fmt(lunesAnterior), finISO: fmt(domingoAnterior) }
}

// Convierte fecha Chile (YYYY-MM-DD) en bound UTC para queries
function boundsUTC(yyyymmddInicio, yyyymmddFin) {
  const off = String(CHILE_UTC_OFFSET_HOURS).padStart(2, '0')
  const inicio = new Date(`${yyyymmddInicio}T${off}:00:00.000Z`) // 00:00 Chile
  const fin = new Date(`${yyyymmddFin}T${off}:00:00.000Z`)
  fin.setUTCHours(fin.getUTCHours() + 24) // final del domingo (= 00:00 del lunes siguiente)
  return { inicio, fin }
}

// Devuelve un array de 7 fechas YYYY-MM-DD desde el lunes
function diasDeLaSemana(lunesISO) {
  const result = []
  const base = new Date(`${lunesISO}T00:00:00.000Z`)
  for (let i = 0; i < 7; i++) {
    const d = new Date(base)
    d.setUTCDate(base.getUTCDate() + i)
    result.push(d.toISOString().slice(0, 10))
  }
  return result
}

// Convierte fecha UTC de una interacción a YYYY-MM-DD en hora Chile
function fechaChileDe(date) {
  const t = new Date(date)
  const chile = new Date(t.getTime() - CHILE_UTC_OFFSET_HOURS * 3600 * 1000)
  return chile.toISOString().slice(0, 10)
}

async function agregarDatosSemana(lunesISO, domingoISO) {
  const { inicio, fin } = boundsUTC(lunesISO, domingoISO)
  const dias = diasDeLaSemana(lunesISO)

  const vendedores = await prisma.usuario.findMany({
    where: { rol: { in: ['VENDEDOR', 'JEFE_VENTAS'] }, activo: true },
    select: { id: true, nombre: true, apellido: true, rol: true }
  })

  // Actividades reales (llamadas/emails/whatsapp/reuniones) de la semana
  const actividades = await prisma.actividad.findMany({
    where: {
      usuarioId: { in: vendedores.map(v => v.id) },
      fecha: { gte: inicio, lt: fin }
    },
    select: { usuarioId: true, leadId: true, tipo: true, descripcion: true, fecha: true }
  })
  // Notas de cambio de etapa (cuentan como gestión)
  const interacciones = await prisma.interaccion.findMany({
    where: {
      usuarioId: { in: vendedores.map(v => v.id) },
      tipo: 'NOTA',
      fecha: { gte: inicio, lt: fin }
    },
    select: { usuarioId: true, leadId: true, tipo: true, descripcion: true, fecha: true }
  })

  // Ventas creadas/cerradas en la semana
  const ventas = await prisma.venta.findMany({
    where: {
      OR: [
        { creadoEn: { gte: inicio, lt: fin } },
        { fechaReserva: { gte: inicio, lt: fin } }
      ]
    },
    select: {
      id: true,
      estado: true,
      precioFinalUF: true,
      vendedorId: true,
      creadoEn: true,
      fechaReserva: true
    }
  })

  // Pipeline actual (snapshot al cierre de la semana)
  const pipelineRaw = await prisma.lead.groupBy({
    by: ['etapa'],
    _count: { _all: true }
  })
  const pipeline = Object.fromEntries(pipelineRaw.map(r => [r.etapa, r._count._all]))

  // Por vendedor: actividad diaria
  const porVendedor = vendedores.map(v => {
    const reales = actividades.filter(i => i.usuarioId === v.id)
    const cambios = interacciones.filter(i => i.usuarioId === v.id && i.descripcion?.startsWith('Etapa cambiada:'))
    // Mover lead también cuenta como gestión
    const totalGestiones = reales.length + cambios.length
    const cotizaciones = cambios.filter(i => i.descripcion?.includes('→ COTIZACION_ENVIADA'))
    const perdidos = cambios.filter(i => i.descripcion?.includes('→ PERDIDO'))
    const ventasV = ventas.filter(vt => vt.vendedorId === v.id)
    const ufVendido = ventasV.reduce((s, vt) => s + (vt.precioFinalUF || 0), 0)

    // Actividad por día = reales + cambios de etapa (todo cuenta)
    const actividadPorDia = dias.map(d => {
      const realesDia = reales.filter(i => fechaChileDe(i.fecha) === d)
      const cambiosDia = cambios.filter(i => fechaChileDe(i.fecha) === d)
      return {
        fecha: d,
        total: realesDia.length + cambiosDia.length,
        llamadas: realesDia.filter(i => i.tipo === 'LLAMADA').length,
        emails: realesDia.filter(i => i.tipo === 'EMAIL').length,
        whatsapp: realesDia.filter(i => i.tipo === 'WHATSAPP').length,
        reuniones: realesDia.filter(i => i.tipo === 'REUNION').length,
        cambiosEtapa: cambiosDia.length
      }
    })

    return {
      id: v.id,
      nombre: `${v.nombre} ${v.apellido}`,
      rol: v.rol,
      stats: {
        gestionesReales: totalGestiones, // incluye mover etapa
        llamadas: reales.filter(i => i.tipo === 'LLAMADA').length,
        emails: reales.filter(i => i.tipo === 'EMAIL').length,
        whatsapp: reales.filter(i => i.tipo === 'WHATSAPP').length,
        reuniones: reales.filter(i => i.tipo === 'REUNION').length,
        cambiosEtapa: cambios.length,
        cotizacionesEnviadas: cotizaciones.length,
        leadsPerdidos: perdidos.length,
        ventas: ventasV.length,
        ufVendido: Math.round(ufVendido * 100) / 100
      },
      actividadPorDia
    }
  })

  // Totales globales
  const totales = {
    gestionesReales: porVendedor.reduce((s, v) => s + v.stats.gestionesReales, 0),
    cotizacionesEnviadas: porVendedor.reduce((s, v) => s + v.stats.cotizacionesEnviadas, 0),
    leadsPerdidos: porVendedor.reduce((s, v) => s + v.stats.leadsPerdidos, 0),
    ventas: porVendedor.reduce((s, v) => s + v.stats.ventas, 0),
    ufVendido: Math.round(porVendedor.reduce((s, v) => s + v.stats.ufVendido, 0) * 100) / 100
  }

  return {
    fechaInicio: lunesISO,
    fechaFin: domingoISO,
    dias,
    porVendedor,
    totales,
    pipeline
  }
}

function buildPrompt(datos) {
  return `Eres un analista de ventas senior para BodeParking, empresa que vende bodegas y estacionamientos.
Genera un reporte SEMANAL EJECUTIVO en JSON para el gerente, cubriendo del ${datos.fechaInicio} al ${datos.fechaFin}.

DATOS DE LA SEMANA:
${JSON.stringify(datos, null, 2)}

INSTRUCCIONES:
1. Resumen ejecutivo: 3-4 oraciones sobre cómo le fue al equipo (volumen, conversión, ventas).
2. Vendedor destacado: el que más impacto generó (no solo más gestiones — considerá conversión, ventas, calidad).
3. Vendedor con caída o que necesita ayuda: si lo hay.
4. Patrones detectados: ej "Felix solo trabaja viernes", "Christian sin ventas pero alta actividad", "Valentina convierte bien email a venta".
5. Alertas: cualquier riesgo (cartera abandonada, conversión cayendo, etapas estancadas en pipeline).
6. Plan recomendado: 3-5 acciones específicas que el gerente debería tomar la próxima semana (no genéricas).

Responde SOLO con JSON válido en este formato exacto (sin markdown):
{
  "resumenEjecutivo": "string 3-4 oraciones",
  "vendedorDestacado": { "nombre": "string", "razon": "string corto" },
  "vendedorEnCaida": { "nombre": "string o null si no hay", "razon": "string" },
  "patrones": [
    { "vendedor": "string", "patron": "string corto" }
  ],
  "alertas": [
    { "tipo": "warning|info|critico", "titulo": "string", "mensaje": "string" }
  ],
  "planSemana": [
    "string accionable 1",
    "string accionable 2"
  ]
}`
}

async function generarReporteSemanalGerente(gerenteId) {
  const gerente = await prisma.usuario.findUnique({
    where: { id: gerenteId },
    select: { id: true, nombre: true, apellido: true, rol: true }
  })
  if (!gerente) throw new Error(`Gerente ${gerenteId} no encontrado`)

  const { inicioISO, finISO } = semanaAnterior()
  const datos = await agregarDatosSemana(inicioISO, finISO)

  // Si no hubo actividad, reporte mínimo sin IA
  if (datos.totales.gestionesReales === 0 && datos.totales.ventas === 0) {
    return {
      tipo: 'gerente',
      gerente,
      periodo: { inicio: inicioISO, fin: finISO },
      datos,
      resumenEjecutivo: 'Semana sin actividad registrada. Revisar si el equipo estuvo trabajando o si hubo problemas técnicos en el CRM.',
      vendedorDestacado: null,
      vendedorEnCaida: null,
      patrones: [],
      alertas: [{ tipo: 'critico', titulo: 'Sin actividad', mensaje: 'No se registraron gestiones reales esta semana en ningún vendedor.' }],
      planSemana: ['Confirmar con el equipo si están usando el CRM', 'Revisar acceso/permisos de los vendedores']
    }
  }

  const prompt = buildPrompt(datos)
  const ai = await generarContenido(prompt, { jsonMode: true, temperature: 0.4 })

  return {
    tipo: 'gerente',
    gerente,
    periodo: { inicio: inicioISO, fin: finISO },
    datos,
    resumenEjecutivo: ai.resumenEjecutivo || 'Reporte de la semana.',
    vendedorDestacado: ai.vendedorDestacado || null,
    vendedorEnCaida: ai.vendedorEnCaida || null,
    patrones: ai.patrones || [],
    alertas: ai.alertas || [],
    planSemana: ai.planSemana || []
  }
}

async function guardarReporteSemanal(usuarioId, contenido) {
  const fechaInicio = new Date(`${contenido.periodo.inicio}T00:00:00.000Z`)
  const fechaFin = new Date(`${contenido.periodo.fin}T00:00:00.000Z`)
  return prisma.reporteSemanal.upsert({
    where: { usuarioId_fechaInicio: { usuarioId, fechaInicio } },
    create: { usuarioId, fechaInicio, fechaFin, contenido },
    update: { contenido, creadoEn: new Date() }
  })
}

async function generarReportesSemanalParaGerentes() {
  const gerentes = await prisma.usuario.findMany({
    where: { rol: 'GERENTE', activo: true },
    select: { id: true, nombre: true }
  })
  const resultados = []
  for (const g of gerentes) {
    try {
      const contenido = await generarReporteSemanalGerente(g.id)
      await guardarReporteSemanal(g.id, contenido)
      resultados.push({ gerenteId: g.id, ok: true })
    } catch (err) {
      console.error(`[ReporteSemanal] Error gerente ${g.nombre}:`, err.message)
      resultados.push({ gerenteId: g.id, ok: false, error: err.message })
    }
  }
  return resultados
}

module.exports = {
  generarReporteSemanalGerente,
  guardarReporteSemanal,
  generarReportesSemanalParaGerentes
}
