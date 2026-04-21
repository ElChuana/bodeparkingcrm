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
app.use('/api/packs',       require('./routes/packs'))
app.use('/api/beneficios',  require('./routes/beneficios'))
app.use('/api/arriendos',   require('./routes/arriendos'))
app.use('/api/llaves',      require('./routes/llaves'))
app.use('/api/postventa',   require('./routes/postventa'))
app.use('/api/uf',          require('./routes/uf'))
app.use('/api/alertas',     require('./routes/alertas'))
app.use('/api/dashboard',   require('./routes/dashboard'))
app.use('/api/reportes',    require('./routes/reportes'))
app.use('/api/cotizaciones', require('./routes/cotizaciones'))
app.use('/api/public',      require('./routes/public'))
app.use('/api/buscar',      require('./routes/buscar'))
app.use('/api/descuentos',  require('./routes/descuentos'))
app.use('/api/email',       require('./routes/email'))


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

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`)
})
