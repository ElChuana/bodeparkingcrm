const prisma = require('./prisma')
const { generarContenido } = require('./gemini')

const ETAPAS_OBJETIVO = ['SEGUIMIENTO', 'COTIZACION_ENVIADA', 'VISITA_AGENDADA', 'NEGOCIACION', 'INTERESADO']

async function agregarDatosVendedor(vendedorId) {
  const vendedor = await prisma.usuario.findUnique({
    where: { id: vendedorId },
    select: { id: true, nombre: true, apellido: true, rol: true }
  })
  if (!vendedor) throw new Error(`Vendedor ${vendedorId} no encontrado`)

  const haceTresDias = new Date(Date.now() - 3 * 86400000)

  const leadsParados = await prisma.lead.findMany({
    where: {
      vendedorId,
      etapa: { in: ETAPAS_OBJETIVO },
      actualizadoEn: { lt: haceTresDias }
    },
    include: {
      contacto: { select: { nombre: true, apellido: true, telefono: true, email: true } },
      interacciones: {
        where: { tipo: { not: 'NOTA' } },
        orderBy: { fecha: 'desc' },
        take: 3,
        select: { tipo: true, descripcion: true, fecha: true }
      }
    },
    orderBy: { actualizadoEn: 'asc' },
    take: 40
  })

  const notasRecientes = await prisma.interaccion.count({
    where: {
      usuarioId: vendedorId,
      tipo: { not: 'NOTA' },
      fecha: { gte: new Date(Date.now() - 7 * 86400000) }
    }
  })

  const promesasVencidas = leadsParados.filter(l => {
    const u = l.interacciones[0]?.descripcion?.toLowerCase() || ''
    return /llamar|llame|llámame|hablar|conversar|wsp|whatsapp|mañana|lunes|martes|miércoles|jueves|viernes|tarde|mañana|am|pm/.test(u)
  }).length

  return {
    vendedor,
    stats: {
      leadsParados: leadsParados.length,
      promesasVencidas,
      cotizacionesPorCerrar: leadsParados.filter(l => l.etapa === 'COTIZACION_ENVIADA').length,
      notasUltimos7Dias: notasRecientes
    },
    leads: leadsParados.map(l => ({
      id: l.id,
      contacto: `${l.contacto.nombre} ${l.contacto.apellido || ''}`.trim(),
      telefono: l.contacto.telefono || '',
      email: l.contacto.email || '',
      etapa: l.etapa,
      diasParado: Math.floor((Date.now() - new Date(l.actualizadoEn)) / 86400000),
      ultimaNotaReal: l.interacciones[0]?.descripcion?.slice(0, 250) || null,
      tipoUltimaInteraccion: l.interacciones[0]?.tipo || null
    }))
  }
}

function buildPrompt(datos) {
  return `Eres un asistente de ventas para BodeParking, empresa que vende bodegas y estacionamientos. Genera un reporte diario personalizado en JSON para el vendedor ${datos.vendedor.nombre} ${datos.vendedor.apellido}.

ESTADÍSTICAS:
${JSON.stringify(datos.stats, null, 2)}

LEADS PARADOS (≥3 días sin actividad):
${JSON.stringify(datos.leads, null, 2)}

INSTRUCCIONES:
1. Analiza qué leads son MÁS URGENTES (alto valor, promesas incumplidas, cotizaciones sin cerrar).
2. Detecta patrones en las notas (promesas de llamada a hora específica, intereses específicos, motivos de no contacto).
3. Genera 2-4 "insights" de IA (tipo "warning", "info", "ok") con observaciones útiles.
4. Para cada lead, genera una "sugerencia" concreta y corta (máx 80 chars) y marca "urgente" true/false.
5. Arma un "planRecomendado" del día con 3-5 puntos accionables.

Responde SOLO con JSON válido en este formato exacto (sin markdown ni texto extra):
{
  "saludo": "string corto personalizado",
  "insights": [
    { "tipo": "warning|info|ok", "titulo": "string", "mensaje": "string detallado" }
  ],
  "cotizacionesUrgentes": [
    { "leadId": number, "contacto": "string", "telefono": "string", "dias": number, "ultimaNota": "string o null", "sugerencia": "string", "urgente": boolean }
  ],
  "promesasVencidas": [
    { "leadId": number, "contacto": "string", "telefono": "string", "dias": number, "prometio": "string", "sugerencia": "string", "urgente": boolean }
  ],
  "otrosSeguimientos": [
    { "leadId": number, "contacto": "string", "telefono": "string", "dias": number, "ultimaNota": "string o null", "sugerencia": "string" }
  ],
  "planRecomendado": [
    "string accionable 1",
    "string accionable 2"
  ]
}`
}

async function generarReporteVendedor(vendedorId) {
  const datos = await agregarDatosVendedor(vendedorId)

  // Si no hay leads parados, generamos reporte mínimo sin IA
  if (datos.stats.leadsParados === 0) {
    return {
      vendedor: datos.vendedor,
      stats: datos.stats,
      saludo: `¡Excelente, ${datos.vendedor.nombre}! No tienes leads parados.`,
      insights: [{ tipo: 'ok', titulo: 'Cartera al día', mensaje: 'Ningún lead lleva más de 3 días sin actividad. Mantén el ritmo.' }],
      cotizacionesUrgentes: [],
      promesasVencidas: [],
      otrosSeguimientos: [],
      planRecomendado: ['Trabajar los leads NUEVO sin asignar', 'Confirmar visitas agendadas', 'Mantener notas detalladas en cada gestión']
    }
  }

  const prompt = buildPrompt(datos)
  const ai = await generarContenido(prompt, { jsonMode: true, temperature: 0.4 })

  return {
    vendedor: datos.vendedor,
    stats: datos.stats,
    saludo: ai.saludo || `Hola ${datos.vendedor.nombre}, este es tu reporte de hoy.`,
    insights: ai.insights || [],
    cotizacionesUrgentes: ai.cotizacionesUrgentes || [],
    promesasVencidas: ai.promesasVencidas || [],
    otrosSeguimientos: ai.otrosSeguimientos || [],
    planRecomendado: ai.planRecomendado || []
  }
}

async function guardarReporte(vendedorId, contenido) {
  const fechaHoy = new Date()
  fechaHoy.setHours(0, 0, 0, 0)

  return prisma.reporteDiario.upsert({
    where: { vendedorId_fecha: { vendedorId, fecha: fechaHoy } },
    create: { vendedorId, fecha: fechaHoy, contenido },
    update: { contenido, creadoEn: new Date() }
  })
}

async function generarReportesParaVendedoresActivos() {
  const vendedores = await prisma.usuario.findMany({
    where: { rol: { in: ['VENDEDOR', 'JEFE_VENTAS'] }, activo: true },
    select: { id: true, nombre: true, apellido: true }
  })

  const resultados = []
  for (const v of vendedores) {
    try {
      const contenido = await generarReporteVendedor(v.id)
      await guardarReporte(v.id, contenido)
      resultados.push({ vendedorId: v.id, ok: true })
    } catch (err) {
      console.error(`[Reportes] Error generando reporte de ${v.nombre}:`, err.message)
      resultados.push({ vendedorId: v.id, ok: false, error: err.message })
    }
  }
  return resultados
}

module.exports = { generarReporteVendedor, guardarReporte, generarReportesParaVendedoresActivos }
