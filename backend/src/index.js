require('dotenv').config()
const express = require('express')
const cors = require('cors')
const path = require('path')
const cron = require('node-cron')
const axios = require('axios')
const prisma = require('./lib/prisma')

const app = express()

app.use(cors())
app.use(express.json())

// Archivos estáticos (fotos, planos, documentos subidos)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')))

// Rutas
app.use('/api/auth',        require('./routes/auth'))
app.use('/api/usuarios',    require('./routes/usuarios'))
app.use('/api/edificios',   require('./routes/edificios'))
app.use('/api/unidades',    require('./routes/unidades'))
app.use('/api/contactos',   require('./routes/contactos'))
app.use('/api/leads',       require('./routes/leads'))
app.use('/api/visitas',        require('./routes/visitas'))
app.use('/api/interacciones',  require('./routes/interacciones'))
app.use('/api/ventas',      require('./routes/ventas'))
app.use('/api/legal',       require('./routes/legal'))
app.use('/api/pagos',       require('./routes/pagos'))
app.use('/api/comisiones',  require('./routes/comisiones'))
app.use('/api/promociones', require('./routes/promociones'))
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

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Importación temporal de datos desde Google Sheets
app.post('/api/importar-datos-bodeparking-2026', async (req, res) => {
  try {
    // ── helpers ──────────────────────────────────────────────────
    function parseCsvLine(line) {
      const result = []; let cur = '', inQ = false
      for (const ch of line) {
        if (ch === '"') { inQ = !inQ }
        else if (ch === ',' && !inQ) { result.push(cur.trim()); cur = '' }
        else { cur += ch }
      }
      result.push(cur.trim()); return result
    }
    function parseCsv(text) {
      const lines = text.split('\n').filter(l => l.trim())
      const headers = parseCsvLine(lines[0])
      return lines.slice(1).map(l => {
        const vals = parseCsvLine(l)
        const obj = {}; headers.forEach((h, i) => { obj[h] = (vals[i] || '').trim() })
        return obj
      })
    }
    function limpiarTelefono(raw) {
      if (!raw) return null
      return raw.replace(/^p:/i, '').replace(/\s/g, '').trim() || null
    }
    function splitNombre(n) {
      if (!n) return { nombre: 'Sin nombre', apellido: '' }
      const p = n.trim().split(/\s+/)
      return { nombre: p[0], apellido: p.slice(1).join(' ') }
    }
    function parsearPrecio(raw) { return parseFloat((raw || '').replace(',', '.')) || 0 }
    function parsearM2(raw) { return parseFloat((raw || '').replace(',', '.')) || null }
    function mapearEstado(e) {
      if (!e) return 'DISPONIBLE'
      const s = e.toLowerCase()
      if (s === 'activo') return 'DISPONIBLE'
      if (s === 'reservado') return 'RESERVADO'
      if (s === 'vendido') return 'VENDIDO'
      return 'DISPONIBLE'
    }
    function mapearTipo(t) {
      if (!t) return 'BODEGA'
      return t.toLowerCase().includes('estacionamiento') ? 'ESTACIONAMIENTO' : 'BODEGA'
    }
    const EDIFICIOS = [
      { key: 'Obispo Salas', nombre: 'Obispo Salas', direccion: 'Obispo Hipólito Salas 445', region: 'Biobío', comuna: 'Concepción' },
      { key: 'Trinitarias',  nombre: 'Trinitarias',  direccion: 'Las Trinitarias 7047',      region: 'Metropolitana', comuna: 'Las Condes' },
      { key: 'Plus',         nombre: 'Plus',          direccion: 'Conde Del Maule 4325',      region: 'Metropolitana', comuna: 'Estación Central' },
      { key: 'Neocisterna',  nombre: 'Neocisterna',   direccion: 'Lo Ovalle 150',             region: 'Metropolitana', comuna: 'La Cisterna' },
      { key: 'Brasil',       nombre: 'Brasil',        direccion: 'Brasil 601',                region: 'Metropolitana', comuna: 'Santiago' },
      { key: 'Aldunate',     nombre: 'Aldunate',      direccion: 'Pedro León Gallo 1050',     region: 'Araucanía',     comuna: 'Temuco' },
    ]
    function extraerNumero(titulo) {
      let t = titulo
      for (const e of EDIFICIOS) { t = t.replace(e.key, '').trim() }
      t = t.replace(/\b(Bodega|Estacionamiento|Tandem)\b/gi, '').trim()
      return t.replace(/\s+/g, '-').replace(/-+$/, '').replace(/^-+/, '') || titulo
    }

    // ── Descargar CSVs ────────────────────────────────────────────
    const LEADS_URL = 'https://docs.google.com/spreadsheets/d/1_nBFjJJpZHUDHXBDzVvPvcttxn3xLGAGS-ZLRgCmIFs/export?format=csv'
    const PROPS_URL = 'https://docs.google.com/spreadsheets/d/1Uos4NdDBxxeg87smkXlhTYL98huwGP7Awi3ungM2DhE/export?format=csv'

    const [leadsResp, propsResp] = await Promise.all([
      axios.get(LEADS_URL, { responseType: 'text' }),
      axios.get(PROPS_URL, { responseType: 'text' }),
    ])

    // ── Importar propiedades ──────────────────────────────────────
    const propRows = parseCsv(propsResp.data)
    const edificiosMap = {}
    for (const e of EDIFICIOS) {
      const existe = await prisma.edificio.findFirst({ where: { nombre: e.nombre } })
      edificiosMap[e.key] = existe ? existe.id : (await prisma.edificio.create({
        data: { nombre: e.nombre, direccion: e.direccion, region: e.region, comuna: e.comuna }
      })).id
    }
    let propCreadas = 0, propOmitidas = 0
    for (const row of propRows) {
      const titulo = row['Título'] || ''
      const edificioInfo = EDIFICIOS.find(e => titulo.includes(e.key))
      if (!edificioInfo) { propOmitidas++; continue }
      const numero = extraerNumero(titulo)
      const edificioId = edificiosMap[edificioInfo.key]
      const existeUnidad = await prisma.unidad.findFirst({ where: { edificioId, numero } })
      if (existeUnidad) { propOmitidas++; continue }
      try {
        await prisma.unidad.create({
          data: {
            edificioId,
            tipo: mapearTipo(row['Tipo']),
            numero,
            precioUF: parsearPrecio(row['Precio Venta']),
            m2: parsearM2(row['Superficie (m²)']),
            estado: mapearEstado(row['Estado']),
          }
        })
        propCreadas++
      } catch { propOmitidas++ }
    }

    // ── Limpiar unidades duplicadas (conservar la de menor ID por edificio+numero) ─
    const todasUnidades = await prisma.unidad.findMany({ select: { id: true, edificioId: true, numero: true }, orderBy: { id: 'asc' } })
    const vistas = new Set()
    const idsAEliminar = []
    for (const u of todasUnidades) {
      const key = `${u.edificioId}-${u.numero}`
      if (vistas.has(key)) { idsAEliminar.push(u.id) } else { vistas.add(key) }
    }
    if (idsAEliminar.length > 0) await prisma.unidad.deleteMany({ where: { id: { in: idsAEliminar } } })

    // ── Limpiar contactos huérfanos (sin lead) antes de reimportar ─
    await prisma.contacto.deleteMany({ where: { leads: { none: {} } } })

    // ── Importar leads ────────────────────────────────────────────
    const leadRows = parseCsv(leadsResp.data)
    const dosSemanasMs = 14 * 24 * 60 * 60 * 1000
    let leadCreados = 0, leadDuplicados = 0, leadOmitidos = 0
    for (const row of leadRows) {
      const nombreRaw = row['nombre'] || row['first_name'] || ''
      if (nombreRaw.includes('<test lead')) { leadOmitidos++; continue }
      const { nombre, apellido } = splitNombre(nombreRaw)
      if (!nombre || nombre === 'Sin nombre') { leadOmitidos++; continue }
      const email = row['correo_electrónico'] || row['email'] || null
      const telefono = limpiarTelefono(row['número_de_teléfono'] || row['phone_number'])
      if (!email && !telefono) { leadOmitidos++; continue }
      if (email) {
        const existe = await prisma.contacto.findFirst({ where: { email } })
        if (existe) { leadDuplicados++; continue }
      }
      let creadoEn = new Date()
      if (row['created_time']) { const p = new Date(row['created_time']); if (!isNaN(p)) creadoEn = p }
      const etapa = (Date.now() - creadoEn.getTime()) > dosSemanasMs ? 'PERDIDO' : 'NUEVO'
      const campana = row['ad_name'] || null
      try {
        const contacto = await prisma.contacto.create({
          data: { nombre, apellido, email: email || null, telefono }
        })
        await prisma.lead.create({
          data: {
            contactoId: contacto.id, etapa,
            campana: campana && campana !== 'Test' ? campana : null,
            notas: row['platform'] ? `Plataforma: ${row['platform']}` : null,
            creadoEn,
          }
        })
        leadCreados++
      } catch { leadOmitidos++ }
    }

    res.json({
      ok: true,
      propiedades: { creadas: propCreadas, omitidas: propOmitidas },
      leads: { creados: leadCreados, duplicados: leadDuplicados, omitidos: leadOmitidos },
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
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
