const prisma = require('./prisma')
const { generarContenido } = require('./groq')

const ETAPAS_OBJETIVO = ['SEGUIMIENTO', 'COTIZACION_ENVIADA', 'VISITA_AGENDADA', 'NEGOCIACION', 'INTERESADO']

// Chile es UTC-4. Una hora de diferencia en DST (~3 meses al año) es irrelevante
// para el caso de uso (resumen de actividad de un día completo).
const CHILE_UTC_OFFSET_HOURS = 4

// Devuelve la fecha calendario "YYYY-MM-DD" en hora Chile, restando N días
function fechaChile(daysBack = 0) {
  const ahoraChile = new Date(Date.now() - CHILE_UTC_OFFSET_HOURS * 3600 * 1000)
  ahoraChile.setUTCDate(ahoraChile.getUTCDate() - daysBack)
  return ahoraChile.toISOString().slice(0, 10) // YYYY-MM-DD
}

// Convierte "YYYY-MM-DD" (día calendario Chile) en bounds UTC para queries
function boundsUTCdeDiaChile(yyyymmdd) {
  // 00:00 Chile = 04:00 UTC
  const inicio = new Date(`${yyyymmdd}T${String(CHILE_UTC_OFFSET_HOURS).padStart(2, '0')}:00:00.000Z`)
  const fin = new Date(inicio.getTime() + 86400000 - 1)
  return { inicio, fin }
}

// Recolecta actividad del día anterior (en hora Chile) para que la IA arme un resumen narrativo
async function agregarActividadAyer(vendedorId) {
  const fechaAyer = fechaChile(1) // p.ej. si hoy en Chile es martes 27, devuelve "2026-05-26" (lunes)
  const { inicio: inicioAyer, fin: finAyer } = boundsUTCdeDiaChile(fechaAyer)

  const selectLead = {
    leadId: true,
    tipo: true,
    descripcion: true,
    fecha: true,
    lead: {
      select: {
        etapa: true,
        contacto: { select: { nombre: true, apellido: true } }
      }
    }
  }

  // Actividades reales (llamadas, emails, whatsapp, reuniones) ahora viven en su propio modelo
  const reales = await prisma.actividad.findMany({
    where: { usuarioId: vendedorId, fecha: { gte: inicioAyer, lte: finAyer } },
    select: selectLead,
    orderBy: { fecha: 'asc' }
  })
  // Cambios de etapa quedan como NOTA en el timeline
  const cambios = await prisma.interaccion.findMany({
    where: {
      usuarioId: vendedorId,
      tipo: 'NOTA',
      descripcion: { startsWith: 'Etapa cambiada:' },
      fecha: { gte: inicioAyer, lte: finAyer }
    },
    select: selectLead,
    orderBy: { fecha: 'asc' }
  })

  // "Trabajar" un lead = interacción real O cambio de etapa
  const trabajos = [...reales, ...cambios]

  const porLead = {}
  for (const i of trabajos) {
    if (!porLead[i.leadId]) {
      porLead[i.leadId] = {
        leadId: i.leadId,
        contacto: `${i.lead?.contacto?.nombre || ''} ${i.lead?.contacto?.apellido || ''}`.trim() || `Lead ${i.leadId}`,
        etapaActual: i.lead?.etapa,
        interacciones: [],
        cambioEtapa: null
      }
    }
    // No duplicar el cambio de etapa en interacciones (queda como propiedad cambioEtapa)
    if (i.tipo !== 'NOTA') {
      porLead[i.leadId].interacciones.push({
        tipo: i.tipo,
        descripcion: i.descripcion?.slice(0, 200) || ''
      })
    } else if (i.descripcion?.startsWith('Etapa cambiada:')) {
      porLead[i.leadId].cambioEtapa = i.descripcion.replace('Etapa cambiada: ', '')
    }
  }

  return {
    fecha: fechaAyer, // YYYY-MM-DD día calendario Chile
    stats: {
      llamadas: reales.filter(i => i.tipo === 'LLAMADA').length,
      emails: reales.filter(i => i.tipo === 'EMAIL').length,
      whatsapp: reales.filter(i => i.tipo === 'WHATSAPP').length,
      reuniones: reales.filter(i => i.tipo === 'REUNION_COMERCIAL').length,
      leadsTrabajados: Object.keys(porLead).length,
      cambiosEtapa: cambios.length
    },
    leadsTrabajados: Object.values(porLead).slice(0, 25)
  }
}

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
      actividades: {
        orderBy: { fecha: 'desc' },
        take: 3,
        select: { tipo: true, descripcion: true, fecha: true }
      }
    },
    orderBy: { actualizadoEn: 'asc' },
    take: 40
  })

  const notasRecientes = await prisma.actividad.count({
    where: {
      usuarioId: vendedorId,
      fecha: { gte: new Date(Date.now() - 7 * 86400000) }
    }
  })

  // Perdidos sin nota (últimos 30 días, no automáticos)
  // motivoPerdida vacío excluye los bulk "Traspaso de CRM" porque esos tienen el campo lleno
  const hace30dias = new Date(Date.now() - 30 * 86400000)
  const perdidosSinNota = await prisma.lead.findMany({
    where: {
      vendedorId,
      etapa: 'PERDIDO',
      perdidaAutomatica: false,
      actualizadoEn: { gte: hace30dias },
      OR: [{ motivoPerdida: null }, { motivoPerdida: '' }]
    },
    include: {
      contacto: { select: { nombre: true, apellido: true, telefono: true } }
    },
    orderBy: { actualizadoEn: 'desc' },
    take: 50
  })

  // Leads NUEVO asignados al vendedor que aún no tienen interacción real
  // (recordatorio personal: "estos te asignaron, contactalos ya")
  const leadsNuevoSinContactar = await prisma.lead.findMany({
    where: {
      vendedorId,
      etapa: 'NUEVO',
      actividades: { none: {} }
    },
    include: { contacto: { select: { nombre: true, apellido: true, telefono: true } } },
    orderBy: { creadoEn: 'desc' },
    take: 50
  })

  // Solo para JEFE_VENTAS: leads sin vendedor asignado en NUEVO/NO_CONTESTA recientes
  let leadsSinAsignar = []
  if (vendedor.rol === 'JEFE_VENTAS' || vendedor.rol === 'GERENTE') {
    leadsSinAsignar = await prisma.lead.findMany({
      where: {
        vendedorId: null,
        etapa: { in: ['NUEVO', 'NO_CONTESTA'] },
        creadoEn: { gte: hace30dias }
      },
      include: {
        contacto: { select: { nombre: true, apellido: true, telefono: true } }
      },
      orderBy: { creadoEn: 'desc' },
      take: 100
    })
  }

  const promesasVencidas = leadsParados.filter(l => {
    const u = l.actividades[0]?.descripcion?.toLowerCase() || ''
    return /llamar|llame|llámame|hablar|conversar|wsp|whatsapp|mañana|lunes|martes|miércoles|jueves|viernes|tarde|mañana|am|pm/.test(u)
  }).length

  const ayer = await agregarActividadAyer(vendedorId)

  return {
    vendedor,
    ayer,
    stats: {
      leadsParados: leadsParados.length,
      promesasVencidas,
      cotizacionesPorCerrar: leadsParados.filter(l => l.etapa === 'COTIZACION_ENVIADA').length,
      notasUltimos7Dias: notasRecientes,
      perdidosSinNota: perdidosSinNota.length,
      leadsNuevoSinContactar: leadsNuevoSinContactar.length,
      leadsSinAsignar: leadsSinAsignar.length
    },
    leads: leadsParados.map(l => ({
      id: l.id,
      contacto: `${l.contacto.nombre} ${l.contacto.apellido || ''}`.trim(),
      telefono: l.contacto.telefono || '',
      email: l.contacto.email || '',
      etapa: l.etapa,
      diasParado: Math.floor((Date.now() - new Date(l.actualizadoEn)) / 86400000),
      ultimaNotaReal: l.actividades[0]?.descripcion?.slice(0, 250) || null,
      tipoUltimaInteraccion: l.actividades[0]?.tipo || null
    })),
    perdidosSinNota: perdidosSinNota.map(l => ({
      id: l.id,
      contacto: `${l.contacto.nombre} ${l.contacto.apellido || ''}`.trim(),
      telefono: l.contacto.telefono || '',
      etapaAntesDePerdido: l.etapaAntesDePerdido || null,
      perdidoHace: Math.floor((Date.now() - new Date(l.actualizadoEn)) / 86400000)
    })),
    leadsNuevoSinContactar: leadsNuevoSinContactar.map(l => ({
      id: l.id,
      contacto: `${l.contacto.nombre} ${l.contacto.apellido || ''}`.trim(),
      telefono: l.contacto.telefono || '',
      campana: l.campana || null,
      diasDesdeIngreso: Math.floor((Date.now() - new Date(l.creadoEn)) / 86400000)
    })),
    leadsSinAsignar: leadsSinAsignar.map(l => ({
      id: l.id,
      contacto: `${l.contacto.nombre} ${l.contacto.apellido || ''}`.trim(),
      telefono: l.contacto.telefono || '',
      campana: l.campana || null,
      etapa: l.etapa,
      diasDesdeIngreso: Math.floor((Date.now() - new Date(l.creadoEn)) / 86400000)
    }))
  }
}

function buildPrompt(datos) {
  return `Eres un asistente de ventas para BodeParking, empresa que vende bodegas y estacionamientos. Genera un reporte diario personalizado en JSON para el vendedor ${datos.vendedor.nombre} ${datos.vendedor.apellido}.

ACTIVIDAD DE AYER (${datos.ayer.fecha}):
${JSON.stringify(datos.ayer, null, 2)}

ESTADÍSTICAS DE HOY:
${JSON.stringify(datos.stats, null, 2)}

LEADS PARADOS HOY (≥3 días sin actividad):
${JSON.stringify(datos.leads, null, 2)}

INSTRUCCIONES:
1. Genera un "resumenAyer" narrativo y motivacional sobre lo que el vendedor hizo ayer (qué leads trabajó, cantidad de gestiones, cambios de etapa, destacados). Si no hubo actividad, decirlo claro y motivar a empezar fuerte hoy.
2. Analiza qué leads son MÁS URGENTES (alto valor, promesas incumplidas, cotizaciones sin cerrar).
3. Detecta patrones en las notas (promesas de llamada a hora específica, intereses específicos, motivos de no contacto).
4. Genera 2-4 "insights" de IA (tipo "warning", "info", "ok") con observaciones útiles.
5. Para cada lead, genera una "sugerencia" concreta y corta (máx 80 chars) y marca "urgente" true/false.
6. Arma un "planRecomendado" del día con 3-5 puntos accionables.

Responde SOLO con JSON válido en este formato exacto (sin markdown ni texto extra):
{
  "saludo": "string corto personalizado",
  "resumenAyer": {
    "titulo": "string corto (ej: 'Día productivo' / 'Día tranquilo')",
    "mensaje": "string narrativo 2-3 oraciones sobre lo que hizo ayer",
    "destacados": ["string punto destacado 1", "string punto destacado 2"]
  },
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
    const huboActividad = datos.ayer.stats.leadsTrabajados > 0
    return {
      vendedor: datos.vendedor,
      ayer: datos.ayer,
      stats: datos.stats,
      saludo: `¡Excelente, ${datos.vendedor.nombre}! No tienes leads parados.`,
      resumenAyer: {
        titulo: huboActividad ? 'Día productivo' : 'Día tranquilo',
        mensaje: huboActividad
          ? `Ayer trabajaste ${datos.ayer.stats.leadsTrabajados} leads con ${datos.ayer.stats.llamadas + datos.ayer.stats.emails + datos.ayer.stats.whatsapp + datos.ayer.stats.reuniones} gestiones reales.`
          : 'Ayer no hubo gestiones registradas. Empezá fuerte hoy.',
        destacados: []
      },
      insights: [{ tipo: 'ok', titulo: 'Cartera al día', mensaje: 'Ningún lead lleva más de 3 días sin actividad. Mantén el ritmo.' }],
      cotizacionesUrgentes: [],
      promesasVencidas: [],
      otrosSeguimientos: [],
      planRecomendado: ['Trabajar los leads NUEVO sin asignar', 'Confirmar visitas agendadas', 'Mantener notas detalladas en cada gestión'],
      perdidosSinNota: datos.perdidosSinNota,
      leadsNuevoSinContactar: datos.leadsNuevoSinContactar,
      leadsSinAsignar: datos.leadsSinAsignar
    }
  }

  const prompt = buildPrompt(datos)
  const ai = await generarContenido(prompt, { jsonMode: true, temperature: 0.4 })

  return {
    vendedor: datos.vendedor,
    ayer: datos.ayer, // datos raw del día anterior (stats + leads trabajados)
    stats: datos.stats,
    saludo: ai.saludo || `Hola ${datos.vendedor.nombre}, este es tu reporte de hoy.`,
    resumenAyer: ai.resumenAyer || null, // narrativa de IA sobre ayer
    insights: ai.insights || [],
    cotizacionesUrgentes: ai.cotizacionesUrgentes || [],
    promesasVencidas: ai.promesasVencidas || [],
    otrosSeguimientos: ai.otrosSeguimientos || [],
    planRecomendado: ai.planRecomendado || [],
    // Lista completa para que el frontend pueda mostrar TODOS los leads
    todosLosLeads: datos.leads,
    // Perdidos sin nota — recordatorio para que el vendedor escriba motivo
    perdidosSinNota: datos.perdidosSinNota,
    // Leads asignados al vendedor que aún no contactó (recordatorio personal)
    leadsNuevoSinContactar: datos.leadsNuevoSinContactar,
    // Solo para JEFE_VENTAS/GERENTE: leads sin asignar a ningún vendedor
    leadsSinAsignar: datos.leadsSinAsignar
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

const _sleep = ms => new Promise(r => setTimeout(r, ms))

async function generarReportesParaVendedoresActivos() {
  const vendedores = await prisma.usuario.findMany({
    where: { rol: { in: ['VENDEDOR', 'JEFE_VENTAS'] }, activo: true },
    select: { id: true, nombre: true, apellido: true }
  })

  const resultados = []
  for (let i = 0; i < vendedores.length; i++) {
    const v = vendedores[i]
    try {
      const contenido = await generarReporteVendedor(v.id)
      await guardarReporte(v.id, contenido)
      resultados.push({ vendedorId: v.id, ok: true })
    } catch (err) {
      console.error(`[Reportes] Error generando reporte de ${v.nombre}:`, err.message)
      resultados.push({ vendedorId: v.id, ok: false, error: err.message })
    }
    // Esperar entre vendedores para no saturar Groq (12K TPM)
    if (i < vendedores.length - 1) await _sleep(15000)
  }
  return resultados
}

module.exports = { generarReporteVendedor, guardarReporte, generarReportesParaVendedoresActivos }
