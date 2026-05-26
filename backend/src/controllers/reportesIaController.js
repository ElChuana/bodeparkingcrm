const prisma = require('../lib/prisma')
const { generarReporteVendedor, guardarReporte, generarReportesParaVendedoresActivos } = require('../lib/reportes')

// Helper: extrae todos los leadIds que aparecen en el contenido del reporte
function extraerLeadIds(contenido) {
  if (!contenido || typeof contenido !== 'object') return { todos: [], perdidos: [] }
  const ids = new Set()
  const perdidos = new Set()
  const colect = (arr, key = 'leadId') => (arr || []).forEach(it => { if (it?.[key]) ids.add(it[key]) })
  colect(contenido.cotizacionesUrgentes)
  colect(contenido.promesasVencidas)
  colect(contenido.otrosSeguimientos)
  ;(contenido.todosLosLeads || []).forEach(it => { if (it?.id) ids.add(it.id) })
  ;(contenido.perdidosSinNota || []).forEach(it => { if (it?.id) { ids.add(it.id); perdidos.add(it.id) } })
  return { todos: [...ids], perdidos: [...perdidos] }
}

// Helper: dado un reporte, calcula qué leads ya fueron gestionados luego de su creación
async function calcularActualizaciones(reporte) {
  if (!reporte) return {}
  const { todos, perdidos } = extraerLeadIds(reporte.contenido)
  if (!todos.length) return {}

  // Tomamos como referencia el INICIO del día del reporte (00:00), no la hora exacta
  // de creación. Así una gestión hecha el mismo día (antes o después de generarse) cuenta.
  const desde = new Date(reporte.fecha)
  desde.setHours(0, 0, 0, 0)
  const actualizaciones = {}

  // Interacciones reales (no NOTA) posteriores al reporte
  const interacciones = await prisma.interaccion.findMany({
    where: {
      leadId: { in: todos },
      fecha: { gt: desde },
      tipo: { in: ['LLAMADA', 'EMAIL', 'WHATSAPP', 'REUNION'] }
    },
    select: { leadId: true, tipo: true, fecha: true },
    orderBy: { fecha: 'desc' }
  })
  for (const i of interacciones) {
    if (!actualizaciones[i.leadId]) actualizaciones[i.leadId] = {}
    actualizaciones[i.leadId].gestionado = true
    if (!actualizaciones[i.leadId].tipoGestion) {
      actualizaciones[i.leadId].tipoGestion = i.tipo
      actualizaciones[i.leadId].fechaGestion = i.fecha
    }
  }

  // Perdidos: ¿ya tiene motivoPerdida?
  if (perdidos.length) {
    const leadsPerdidos = await prisma.lead.findMany({
      where: { id: { in: perdidos } },
      select: { id: true, motivoPerdida: true, motivoPerdidaCat: true }
    })
    for (const l of leadsPerdidos) {
      const motivoOk = (l.motivoPerdida && l.motivoPerdida.trim()) || (l.motivoPerdidaCat && l.motivoPerdidaCat.trim())
      if (motivoOk) {
        if (!actualizaciones[l.id]) actualizaciones[l.id] = {}
        actualizaciones[l.id].motivoEscrito = true
      }
    }
  }

  return actualizaciones
}

// GET /api/reportes-ia/mi-reporte → reporte del usuario logeado (hoy o el más reciente)
async function miReporte(req, res) {
  try {
    const usuarioId = req.usuario.id
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0)

    let reporte = await prisma.reporteDiario.findUnique({
      where: { vendedorId_fecha: { vendedorId: usuarioId, fecha: hoy } }
    })
    if (!reporte) {
      reporte = await prisma.reporteDiario.findFirst({
        where: { vendedorId: usuarioId },
        orderBy: { fecha: 'desc' }
      })
    }
    if (!reporte) return res.json({ reporte: null })
    const actualizaciones = await calcularActualizaciones(reporte)
    res.json({ reporte, actualizaciones })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al obtener mi reporte.' })
  }
}

// GET /api/reportes-ia/vendedor/:vendedorId → reporte específico de un vendedor (GERENTE/JEFE_VENTAS)
async function reportePorVendedor(req, res) {
  try {
    const vendedorId = parseInt(req.params.vendedorId, 10)
    if (Number.isNaN(vendedorId)) return res.status(400).json({ error: 'vendedorId inválido.' })

    const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
    let reporte = await prisma.reporteDiario.findUnique({
      where: { vendedorId_fecha: { vendedorId, fecha: hoy } }
    })
    if (!reporte) {
      reporte = await prisma.reporteDiario.findFirst({
        where: { vendedorId },
        orderBy: { fecha: 'desc' }
      })
    }
    if (!reporte) return res.json({ reporte: null })
    const actualizaciones = await calcularActualizaciones(reporte)
    res.json({ reporte, actualizaciones })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al obtener reporte del vendedor.' })
  }
}

// POST /api/reportes-ia/generar → fuerza generación manual (GERENTE)
// Body opcional: { vendedorId: number } — si no, regenera para todos los vendedores activos
async function generarManual(req, res) {
  try {
    const { vendedorId } = req.body || {}

    if (vendedorId) {
      const contenido = await generarReporteVendedor(parseInt(vendedorId, 10))
      const r = await guardarReporte(parseInt(vendedorId, 10), contenido)
      return res.json({ mensaje: 'Reporte generado.', reporte: r })
    }

    const resultados = await generarReportesParaVendedoresActivos()
    res.json({ mensaje: 'Reportes generados.', resultados })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message || 'Error al generar reporte.' })
  }
}

module.exports = { miReporte, reportePorVendedor, generarManual }
