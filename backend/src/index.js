require('dotenv').config()
const express = require('express')
const cors = require('cors')
const path = require('path')
const { registrarJobs } = require('./jobs')

const app = express()

// En producción el frontend se sirve desde este mismo Express (same-origin),
// así que CORS solo se abre a los orígenes listados en CORS_ORIGIN (separados
// por coma). Sin la variable, se mantiene abierto como antes.
app.use(cors(process.env.CORS_ORIGIN ? { origin: process.env.CORS_ORIGIN.split(',') } : {}))
app.use(express.json({ limit: '10mb' }))
app.use(require('./middleware/decimalSerializer'))

// Archivos estáticos (fotos, planos, documentos subidos)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')))

// Rutas
app.use('/api/auth',        require('./routes/auth'))
app.use('/api/usuarios',    require('./routes/usuarios'))
app.use('/api/edificios',   require('./routes/edificios'))
app.use('/api/unidades',    require('./routes/unidades'))
app.use('/api/contactos',   require('./routes/contactos'))
// Comuro expone POST /api/leads/upsert (URL pactada con ellos); se monta antes
// que ./routes/leads y solo define esa ruta — cuidado con colisiones al agregar más
app.use('/api/leads',       require('./routes/comuro'))
app.use('/api/leads',       require('./routes/leads'))
app.use('/api/visitas',        require('./routes/visitas'))
app.use('/api/interacciones',  require('./routes/interacciones'))
app.use('/api/actividades',    require('./routes/actividades'))
app.use('/api/ventas',      require('./routes/ventas'))
app.use('/api/legal',       require('./routes/legalIntegracion')) // integración externa (API key), antes del router JWT
app.use('/api/legal',       require('./routes/legal'))
app.use('/api/pagos',       require('./routes/pagos'))
app.use('/api/comisiones',  require('./routes/comisiones'))
app.use('/api/plantillas-comision', require('./routes/plantillasComision'))
app.use('/api/reglas-comision', require('./routes/reglasComision'))
app.use('/api/packs',       require('./routes/packs'))
app.use('/api/beneficios',  require('./routes/beneficios'))
app.use('/api/promociones', require('./routes/promociones'))
app.use('/api/campanas',    require('./routes/campanas'))
app.use('/api/arriendos',   require('./routes/arriendos'))
app.use('/api/llaves',      require('./routes/llaves'))
app.use('/api/postventa',   require('./routes/postventa'))
app.use('/api/uf',          require('./routes/uf'))
app.use('/api/alertas',     require('./routes/alertas'))
app.use('/api/dashboard',   require('./routes/dashboard'))
app.use('/api/reportes',    require('./routes/reportes'))
app.use('/api/reportes-ia', require('./routes/reportesIa'))
app.use('/api/reportes-semanal', require('./routes/reportesSemanal'))
app.use('/api/cotizaciones', require('./routes/cotizaciones'))
app.use('/api/reuniones',   require('./routes/reuniones'))
app.use('/api/public',      require('./routes/public'))
app.use('/api/buscar',      require('./routes/buscar'))
app.use('/api/descuentos',  require('./routes/descuentos'))
app.use('/api/email',       require('./routes/email'))
app.use('/api/plantillas-email', require('./routes/plantillasEmail'))
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

// Cron jobs (UF, alertas, reportes, recordatorios) — ver src/jobs/
registrarJobs()

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`)
})
