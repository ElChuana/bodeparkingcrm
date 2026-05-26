require('dotenv').config()
const express = require('express')
const cors = require('cors')
const path = require('path')
const cron = require('node-cron')
const axios = require('axios')
const prisma = require('./lib/prisma')

const app = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))

// Archivos estáticos (fotos, planos, documentos subidos)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')))

// Rutas
app.use('/api/auth',        require('./routes/auth'))
app.use('/api/usuarios',    require('./routes/usuarios'))
app.use('/api/edificios',   require('./routes/edificios'))
app.use('/api/unidades',    require('./routes/unidades'))
app.use('/api/contactos',   require('./routes/contactos'))
app.use('/api/leads',       require('./routes/comuro'))
app.use('/api/leads',       require('./routes/leads'))
app.use('/api/visitas',        require('./routes/visitas'))
app.use('/api/interacciones',  require('./routes/interacciones'))
app.use('/api/ventas',      require('./routes/ventas'))
app.use('/api/legal',       require('./routes/legal'))
app.use('/api/pagos',       require('./routes/pagos'))
app.use('/api/comisiones',  require('./routes/comisiones'))
app.use('/api/plantillas-comision', require('./routes/plantillasComision'))
app.use('/api/packs',       require('./routes/packs'))
app.use('/api/beneficios',  require('./routes/beneficios'))
app.use('/api/arriendos',   require('./routes/arriendos'))
app.use('/api/llaves',      require('./routes/llaves'))
app.use('/api/postventa',   require('./routes/postventa'))
app.use('/api/uf',          require('./routes/uf'))
app.use('/api/alertas',     require('./routes/alertas'))
app.use('/api/dashboard',   require('./routes/dashboard'))
app.use('/api/reportes',    require('./routes/reportes'))
app.use('/api/reportes-ia', require('./routes/reportesIa'))
app.use('/api/cotizaciones', require('./routes/cotizaciones'))
app.use('/api/public',      require('./routes/public'))
app.use('/api/buscar',      require('./routes/buscar'))
app.use('/api/descuentos',  require('./routes/descuentos'))
app.use('/api/email',       require('./routes/email'))
app.use('/api/leads/:id/recordatorios', require('./routes/recordatorios'))
app.use('/api/recordatorios',           require('./routes/recordatorios-completar'))


// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Servir frontend en producción
if (process.env.NODE_ENV === 'production') {
  const frontendDist = path.join(__dirname, '../../frontend/dist')
  app.use(express.static(frontendDist))
  app.get('/{*path}', (req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'))
  })
}

// Manejo de errores global
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ error: 'Error interno del servidor.' })
})

// ─── Cron: actualizar UF una vez al día a las 9:00 AM ────────────
async function actualizarUF() {
  try {
    const hoy = new Date()
    const d = String(hoy.getDate()).padStart(2, '0')
    const m = String(hoy.getMonth() + 1).padStart(2, '0')
    const y = hoy.getFullYear()

    const resp = await axios.get(`https://mindicador.cl/api/uf/${d}-${m}-${y}`, { timeout: 10000 })
    const serie = resp.data?.serie
    if (!serie?.length) throw new Error('Sin datos')

    const { fecha, valor } = serie[0]
    await prisma.uFDiaria.upsert({
      where: { fecha: new Date(fecha) },
      update: { valorPesos: valor },
      create: { fecha: new Date(fecha), valorPesos: valor }
    })
    console.log(`[UF] Actualizada: $${valor.toLocaleString('es-CL')} (${d}/${m}/${y})`)
  } catch (err) {
    console.error('[UF] Error al actualizar:', err.message)
  }
}

// Ejecutar cada día a las 09:00 AM (hora del servidor)
cron.schedule('0 9 * * *', actualizarUF)

// ─── Cron: chequeo de alertas (leads sin actividad/estancados) ───
const { _ejecutarChequeo } = require('./controllers/alertasController')
cron.schedule('0 12 * * *', async () => {
  try {
    const resultado = await _ejecutarChequeo()
    console.log(`[Alertas] Chequeo diario: ${resultado.alertasGeneradas?.length || 0} alertas, ${resultado.acciones?.length || 0} acciones`)
  } catch (err) {
    console.error('[Alertas] Error en cron:', err.message)
  }
})

// ─── Cron: reportes diarios con IA (Gemini) — 11 UTC = 7-8 AM Chile ───
const { generarReportesParaVendedoresActivos } = require('./lib/reportes')
cron.schedule('0 11 * * *', async () => {
  try {
    const resultados = await generarReportesParaVendedoresActivos()
    const ok = resultados.filter(r => r.ok).length
    const fail = resultados.length - ok
    console.log(`[Reportes IA] ${ok} generados${fail ? `, ${fail} fallidos` : ''}`)
  } catch (err) {
    console.error('[Reportes IA] Error en cron:', err.message)
  }
})

// ─── Cron: recordatorios vencidos → notificación ──────────────────
cron.schedule('*/15 * * * *', async () => {
  try {
    const pendientes = await prisma.recordatorio.findMany({
      where: { fechaHora: { lte: new Date() }, completado: false, notificado: false },
      include: {
        lead: {
          select: {
            id: true,
            vendedorId: true,
            contacto: { select: { nombre: true, apellido: true } }
          }
        }
      }
    })
    for (const r of pendientes) {
      if (r.lead.vendedorId) {
        await prisma.notificacion.create({
          data: {
            usuarioId:      r.lead.vendedorId,
            tipo:           'RECORDATORIO_LEAD',
            mensaje:        `Recordatorio: ${r.descripcion} — ${r.lead.contacto.nombre} ${r.lead.contacto.apellido}`,
            referenciaId:   r.leadId,
            referenciaTipo: 'lead'
          }
        })
      }
      await prisma.recordatorio.update({ where: { id: r.id }, data: { notificado: true } })
    }
    if (pendientes.length > 0) {
      console.log(`[Recordatorios] ${pendientes.length} procesados`)
    }

    // ── Visitas próximas (24h) ─────────────────────────────────────
    const ventanaMin = new Date(Date.now() + 23 * 60 * 60 * 1000)
    const ventanaMax = new Date(Date.now() + 25 * 60 * 60 * 1000)

    const visitasProximas = await prisma.visita.findMany({
      where: { fechaHora: { gte: ventanaMin, lte: ventanaMax }, resultado: null },
      include: {
        lead: {
          select: {
            id: true,
            vendedorId: true,
            contacto: { select: { nombre: true, apellido: true } }
          }
        }
      }
    })

    for (const visita of visitasProximas) {
      if (!visita.lead.vendedorId) continue
      const yaNotificado = await prisma.notificacion.findFirst({
        where: {
          tipo: 'VISITA_PROXIMA',
          referenciaId: visita.id,
          referenciaTipo: 'visita',
          usuarioId: visita.lead.vendedorId,
          creadoEn: { gte: new Date(Date.now() - 2 * 60 * 60 * 1000) }
        }
      })
      if (!yaNotificado) {
        await prisma.notificacion.create({
          data: {
            usuarioId: visita.lead.vendedorId,
            tipo: 'VISITA_PROXIMA',
            mensaje: `Visita mañana con ${visita.lead.contacto.nombre} ${visita.lead.contacto.apellido}`,
            referenciaId: visita.id,
            referenciaTipo: 'visita'
          }
        })
      }
    }
    if (visitasProximas.length > 0) {
      console.log(`[Visitas] ${visitasProximas.length} visitas próximas procesadas`)
    }
  } catch (err) {
    console.error('[Recordatorios] Error en cron:', err.message)
  }
})

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`)
})
