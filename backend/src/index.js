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

// ─── TEMPORAL: eliminado post-importación ─────────────────────────
app.post('/api/importar-ventas-bp-2026-ELIMINADO', async (req, res) => {
  const DATOS = [
    // unidadId mapeado desde inventario real
    { nombre:'Marcia',   apellido:'Fuentes',    email:null,                               unidadId:70, precioUF:62,    estado:'ESCRITURA', fechaReserva:'2025-07-31', fechaPromesa:null,        vendedorId:null, corredor:'PROCOMERCIAL'      },
    { nombre:'Sara',     apellido:'Linares',    email:null,                               unidadId:72, precioUF:70,    estado:'ESCRITURA', fechaReserva:'2025-07-31', fechaPromesa:null,        vendedorId:null, corredor:'INMOBILIARIA E Y B' },
    { nombre:'Sara',     apellido:'Linares',    email:null,                               unidadId:73, precioUF:128,   estado:'ESCRITURA', fechaReserva:'2025-07-31', fechaPromesa:null,        vendedorId:null, corredor:'INMOBILIARIA E Y B' },
    { nombre:'Elias',    apellido:'Valverde',   email:null,                               unidadId:74, precioUF:249,   estado:'ESCRITURA', fechaReserva:'2025-07-31', fechaPromesa:null,        vendedorId:null, corredor:'ALFONSO ROBLES',    leadIdExistente:372  },
    { nombre:'Gemenes',  apellido:'Rodriguez',  email:null,                               unidadId:64, precioUF:149,   estado:'ESCRITURA', fechaReserva:'2025-09-11', fechaPromesa:null,        vendedorId:null, corredor:'ALFONSO ROBLES'    },
    { nombre:'Gemenes',  apellido:'Rodriguez',  email:null,                               unidadId:65, precioUF:149,   estado:'ESCRITURA', fechaReserva:'2025-09-11', fechaPromesa:null,        vendedorId:null, corredor:'ALFONSO ROBLES'    },
    { nombre:'Gemenes',  apellido:'Rodriguez',  email:null,                               unidadId:68, precioUF:149,   estado:'ESCRITURA', fechaReserva:'2025-09-11', fechaPromesa:null,        vendedorId:null, corredor:'ALFONSO ROBLES'    },
    { nombre:'Antonio',  apellido:'Otonel',     email:'aozulu@gmail.com',                 unidadId:66, precioUF:149,   estado:'ESCRITURA', fechaReserva:'2025-12-18', fechaPromesa:null,        vendedorId:null, corredor:'RENTACORTA',        leadIdExistente:392  },
    { nombre:'Antonio',  apellido:'Otonel',     email:'aozulu@gmail.com',                 unidadId:69, precioUF:149,   estado:'ESCRITURA', fechaReserva:'2025-12-18', fechaPromesa:null,        vendedorId:null, corredor:'RENTACORTA'        },
    { nombre:'Carolina', apellido:'Muñoz',      email:'munozr.carolina@gmail.com',        unidadId:56, precioUF:58,    estado:'ESCRITURA', fechaReserva:'2026-01-07', fechaPromesa:null,        vendedorId:3,    corredor:'F.BETANCOURTT',     leadIdExistente:956  },
    { nombre:'Carolina', apellido:'Toro',       email:'carolinatoro14@gmail.com',         unidadId:67, precioUF:149,   estado:'ESCRITURA', fechaReserva:'2026-01-19', fechaPromesa:null,        vendedorId:3,    corredor:'F.BETANCOURTT'     },
    { nombre:'Carolina', apellido:'Sandoval',   email:'carosandovalsepulveda84@gmail.com',unidadId:59, precioUF:89,    estado:'RESERVA',   fechaReserva:'2026-01-30', fechaPromesa:null,        vendedorId:null, corredor:'RENTACORTA',        leadIdExistente:1267 },
    { nombre:'Felipe',   apellido:'Iñiguez',    email:'felipe.iniguez@gmail.com',         unidadId:75, precioUF:349,   estado:'PROMESA',   fechaReserva:'2026-02-04', fechaPromesa:'2026-02-04',vendedorId:null, corredor:'RENTACORTA',        leadIdExistente:1486 },
    { nombre:'German',   apellido:'Navarrete',  email:'germanantonionavarrete7@gmail.com', unidadId:62, precioUF:149,  estado:'PROMESA',   fechaReserva:'2026-02-05', fechaPromesa:'2026-02-17',vendedorId:null, corredor:'RENTACORTA',        leadIdExistente:1540 },
    { nombre:'German',   apellido:'Navarrete',  email:'germanantonionavarrete7@gmail.com', unidadId:63, precioUF:139,  estado:'PROMESA',   fechaReserva:'2026-02-05', fechaPromesa:'2026-02-17',vendedorId:null, corredor:'RENTACORTA'        },
    { nombre:'Cynthia',  apellido:'Oteiza',     email:'cynthiaoteiza@yahoo.com',          unidadId:60, precioUF:144,   estado:'RESERVA',   fechaReserva:'2026-02-13', fechaPromesa:null,        vendedorId:null, corredor:'RENTACORTA',        leadIdExistente:1685 },
    { nombre:'Cynthia',  apellido:'Oteiza',     email:'cynthiaoteiza@yahoo.com',          unidadId:61, precioUF:144,   estado:'RESERVA',   fechaReserva:'2026-02-13', fechaPromesa:null,        vendedorId:null, corredor:'RENTACORTA'        },
    { nombre:'Claudia',  apellido:'Suarez',     email:'csuarezdp@gmail.com',              unidadId:76, precioUF:94,    estado:'RESERVA',   fechaReserva:'2026-02-17', fechaPromesa:null,        vendedorId:null, corredor:'RENTACORTA',        leadIdExistente:1220 },
    { nombre:'Claudia',  apellido:'Suarez',     email:'csuarezdp@gmail.com',              unidadId:79, precioUF:94,    estado:'RESERVA',   fechaReserva:'2026-02-18', fechaPromesa:null,        vendedorId:null, corredor:'RENTACORTA'        },
    { nombre:'Claudia',  apellido:'Suarez',     email:'csuarezdp@gmail.com',              unidadId:77, precioUF:99,    estado:'RESERVA',   fechaReserva:'2026-02-20', fechaPromesa:null,        vendedorId:null, corredor:'RENTACORTA'        },
    { nombre:'Nathalia', apellido:'De La Barra',email:'nathalia.delabarra.m@gmail.com',   unidadId:55, precioUF:91,    estado:'RESERVA',   fechaReserva:'2026-02-25', fechaPromesa:null,        vendedorId:3,    corredor:'F.BETANCOURTT'     },
    { nombre:'Claudia',  apellido:'Suarez',     email:'csuarezdp@gmail.com',              unidadId:80, precioUF:87,    estado:'RESERVA',   fechaReserva:'2026-02-27', fechaPromesa:null,        vendedorId:3,    corredor:'F.BETANCOURTT'     },
    { nombre:'Claudia',  apellido:'Suarez',     email:'csuarezdp@gmail.com',              unidadId:78, precioUF:87,    estado:'RESERVA',   fechaReserva:'2026-02-27', fechaPromesa:null,        vendedorId:3,    corredor:'F.BETANCOURTT'     },
    { nombre:'Esteban',  apellido:'Orrego',     email:'estebanorregoeu13@gmail.com',      unidadId:71, precioUF:62.78, estado:'PROMESA',   fechaReserva:'2026-03-05', fechaPromesa:'2026-03-01',vendedorId:3,    corredor:'F.BETANCOURTT',     leadIdExistente:2104 },
    { nombre:'Carolina', apellido:'Muñoz',      email:'munozr.carolina@gmail.com',        unidadId:58, precioUF:83,    estado:'RESERVA',   fechaReserva:'2026-03-25', fechaPromesa:null,        vendedorId:3,    corredor:'F.BETANCOURTT'     },
    { nombre:'Daniel',   apellido:'Altamirano', email:'danielarmitano@gmail.com',         unidadId:46, precioUF:94,    estado:'RESERVA',   fechaReserva:'2026-03-28', fechaPromesa:null,        vendedorId:3,    corredor:'F.BETANCOURTT'     },
  ]

  const resultados = []
  const contactoCache = {} // email → contactoId

  try {
    for (const d of DATOS) {
      try {
        // 1. Buscar o crear contacto
        let contactoId
        const emailKey = d.email?.toLowerCase()

        if (emailKey && contactoCache[emailKey]) {
          contactoId = contactoCache[emailKey]
        } else {
          let contacto = null
          if (d.email) {
            contacto = await prisma.contacto.findFirst({ where: { email: { equals: d.email, mode: 'insensitive' } } })
          }
          if (!contacto) {
            contacto = await prisma.contacto.findFirst({
              where: { nombre: { equals: d.nombre, mode: 'insensitive' }, apellido: { contains: d.apellido.split(' ')[0], mode: 'insensitive' } }
            })
          }
          if (!contacto) {
            contacto = await prisma.contacto.create({
              data: { nombre: d.nombre, apellido: d.apellido, email: d.email || null, origen: 'OTRO' }
            })
          }
          contactoId = contacto.id
          if (emailKey) contactoCache[emailKey] = contactoId
        }

        // 2. Buscar o crear lead
        let leadId = d.leadIdExistente || null
        if (!leadId) {
          const nuevoLead = await prisma.lead.create({
            data: {
              contactoId,
              vendedorId: d.vendedorId || null,
              etapa: 'NUEVO',
              notas: `Corredor: ${d.corredor}`
            }
          })
          leadId = nuevoLead.id
        } else {
          // Actualizar vendedorId del lead existente si corresponde
          if (d.vendedorId) {
            await prisma.lead.update({ where: { id: leadId }, data: { vendedorId: d.vendedorId } })
          }
        }

        // 3. Verificar que la unidad esté disponible
        const unidad = await prisma.unidad.findUnique({ where: { id: d.unidadId } })
        if (!unidad) throw new Error(`Unidad ID ${d.unidadId} no encontrada`)

        // 4. Crear venta
        const gerente = await prisma.usuario.findFirst({ where: { rol: 'GERENTE', activo: true } })
        const venta = await prisma.venta.create({
          data: {
            leadId,
            compradorId: contactoId,
            vendedorId: d.vendedorId || null,
            gerenteId: gerente?.id || null,
            precioUF: d.precioUF,
            descuentoUF: 0,
            estado: 'RESERVA',
            fechaReserva: new Date(d.fechaReserva),
            notas: `Corredor: ${d.corredor}`
          }
        })

        // 5. Vincular unidad a la venta y marcarla RESERVADO
        await prisma.unidad.update({ where: { id: d.unidadId }, data: { ventaId: venta.id, estado: 'RESERVADO' } })

        // 6. Actualizar etapa del lead
        await prisma.lead.update({ where: { id: leadId }, data: { etapa: 'RESERVA' } })

        // 7. Avanzar estado si corresponde
        if (d.estado === 'PROMESA' || d.estado === 'ESCRITURA') {
          await prisma.venta.update({
            where: { id: venta.id },
            data: {
              estado: d.estado,
              ...(d.fechaPromesa && { fechaPromesa: new Date(d.fechaPromesa) }),
              ...(d.estado === 'ESCRITURA' && { fechaEscritura: new Date(d.fechaReserva) })
            }
          })
          await prisma.lead.update({
            where: { id: leadId },
            data: { etapa: d.estado === 'ESCRITURA' ? 'ESCRITURA' : 'PROMESA' }
          })
          if (d.estado === 'ESCRITURA') {
            await prisma.unidad.updateMany({ where: { ventaId: venta.id }, data: { estado: 'VENDIDO' } })
          }
        }

        resultados.push({ ok: true, ventaId: venta.id, leadId, contactoId, unidadId: d.unidadId, cliente: `${d.nombre} ${d.apellido}`, estado: d.estado })
      } catch (err) {
        resultados.push({ ok: false, cliente: `${d.nombre} ${d.apellido}`, unidadId: d.unidadId, error: err.message })
      }
    }

    res.json({ total: DATOS.length, ok: resultados.filter(r => r.ok).length, errores: resultados.filter(r => !r.ok).length, resultados })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// ─── TEMPORAL: stats origen ──────────────────────────────────────
app.get('/api/admin-temporal/origen-stats', async (req, res) => {
  const rows = await prisma.$queryRaw`SELECT origen, COUNT(*)::int as total FROM contactos GROUP BY origen ORDER BY total DESC`
  res.json(rows)
})
// ─── FIN TEMPORAL ─────────────────────────────────────────────────

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
