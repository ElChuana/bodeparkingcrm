# Leads Auto-asignación y Recordatorios — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Auto-asignar leads de API al JEFE_VENTAS, eliminar la notificación LEAD_NUEVO al crear leads, y agregar recordatorios programados en leads con notificación automática vía cron.

**Architecture:** Cuatro tareas independientes y secuenciales: (1) migración DB, (2) cambios simples en backend existente, (3) nuevo controller/routes para recordatorios + cron, (4) sección de recordatorios en LeadDetalle frontend.

**Tech Stack:** Prisma + PostgreSQL (Railway), Express, node-cron (ya instalado), React + Ant Design + React Query

---

## Files

**Modify:**
- `backend/prisma/schema.prisma` — agregar enum `RECORDATORIO_LEAD`, modelo `Recordatorio`, relaciones en `Lead` y `Usuario`
- `backend/src/routes/public.js` — auto-asignar vendedorId al JEFE_VENTAS activo en POST /leads
- `backend/src/controllers/leadsController.js:284-290` — eliminar llamada `notificarLead` con tipo `LEAD_NUEVO`
- `backend/src/index.js` — registrar ruta `/api/recordatorios` + añadir cron job cada 15 min
- `frontend/src/pages/leads/LeadDetalle.jsx` — agregar sección Recordatorios al final

**Create:**
- `backend/src/controllers/recordatoriosController.js` — listar, crear, completar recordatorios
- `backend/src/routes/recordatorios.js` — rutas para recordatorios

---

## Task 1: Schema — Recordatorio model + migración

**Files:**
- Modify: `backend/prisma/schema.prisma`

- [ ] **Step 1: Agregar `RECORDATORIO_LEAD` al enum `TipoAlerta`**

En `backend/prisma/schema.prisma`, el enum `TipoAlerta` (línea ~160) actualmente termina con `LEAD_NUEVO`. Añadir el nuevo valor al final:

```prisma
enum TipoAlerta {
  LLAVE_NO_DEVUELTA
  CUOTA_VENCIDA
  LEAD_SIN_ACTIVIDAD
  LEAD_ESTANCADO
  FECHA_LEGAL_PROXIMA
  ARRIENDO_POR_VENCER
  DESCUENTO_PENDIENTE
  LEAD_ETAPA_CAMBIO
  LEAD_NUEVO
  RECORDATORIO_LEAD
}
```

- [ ] **Step 2: Agregar modelo `Recordatorio`**

Al final del schema, antes del último `}` o después del modelo `Notificacion`, agregar:

```prisma
model Recordatorio {
  id          Int      @id @default(autoincrement())
  leadId      Int
  creadoPorId Int
  descripcion String
  fechaHora   DateTime
  completado  Boolean  @default(false)
  notificado  Boolean  @default(false)
  creadoEn    DateTime @default(now())

  lead      Lead    @relation(fields: [leadId], references: [id])
  creadoPor Usuario @relation("RecordatoriosCreadosPor", fields: [creadoPorId], references: [id])

  @@map("recordatorios")
}
```

- [ ] **Step 3: Agregar relaciones en `Lead` y `Usuario`**

En el modelo `Lead`, agregar al final de las relaciones:
```prisma
  recordatorios     Recordatorio[]
```

En el modelo `Usuario`, agregar al final de las relaciones:
```prisma
  recordatoriosCreadosPor Recordatorio[] @relation("RecordatoriosCreadosPor")
```

- [ ] **Step 4: Generar y aplicar migración**

```bash
cd backend
DATABASE_URL="postgresql://bodeparking:bodeparking2026!@monorail.proxy.rlwy.net:35865/bodeparkingcrm" npx prisma migrate dev --name add_recordatorios
```

Expected: `✔ Generated Prisma Client` y migración aplicada sin errores.

- [ ] **Step 5: Verificar que Prisma genera el cliente correctamente**

```bash
cd backend
DATABASE_URL="postgresql://bodeparking:bodeparking2026!@monorail.proxy.rlwy.net:35865/bodeparkingcrm" npx prisma generate
```

Expected: `✔ Generated Prisma Client` sin errores.

- [ ] **Step 6: Commit**

```bash
git add backend/prisma/schema.prisma backend/prisma/migrations/
git commit -m "feat: agregar modelo Recordatorio y enum RECORDATORIO_LEAD"
```

---

## Task 2: Auto-asignación API + eliminar notificación LEAD_NUEVO

**Files:**
- Modify: `backend/src/routes/public.js:180-194`
- Modify: `backend/src/controllers/leadsController.js:284-290`

- [ ] **Step 1: Auto-asignar JEFE_VENTAS en `public.js`**

En `backend/src/routes/public.js`, en el comentario `// ── 5. Crear el lead ──` (línea ~179), ANTES de `prisma.lead.create`, agregar la búsqueda del JEFE_VENTAS:

```js
    // ── 5. Crear el lead ──────────────────────────────────────────
    // Auto-asignar al JEFE_VENTAS activo si no se especificó vendedorId
    let vendedorIdFinal = vendedorId ? Number(vendedorId) : null
    if (!vendedorIdFinal) {
      const jefeVentas = await prisma.usuario.findFirst({
        where: { rol: 'JEFE_VENTAS', activo: true }
      })
      if (jefeVentas) vendedorIdFinal = jefeVentas.id
    }

    const lead = await prisma.lead.create({
      data: {
        contactoId:       contacto.id,
        unidadInteresId:  unidadInteresId,
        vendedorId:       vendedorIdFinal,
        campana:          campana?.trim() || null,
        presupuestoAprox: presupuestoAprox ? Number(presupuestoAprox) : null,
        notas:            notas?.trim()   || null,
        etapa:            'NUEVO',
      },
      include: {
        contacto:      { select: { nombre: true, apellido: true, email: true, telefono: true } },
        unidadInteres: { select: { numero: true, tipo: true, edificio: { select: { nombre: true } } } },
      }
    })
```

El bloque original de `prisma.lead.create` (líneas 180-194) queda reemplazado por este.

- [ ] **Step 2: Eliminar notificación LEAD_NUEVO en `leadsController.js`**

En `backend/src/controllers/leadsController.js`, eliminar el bloque que empieza con `notificarLead({` después de `res.status(201).json(lead)`:

```js
    // ANTES (eliminar estas líneas):
    notificarLead({
      leadId: lead.id,
      mensaje: `Nuevo lead: ${lead.contacto.nombre} ${lead.contacto.apellido}`,
      tipo: 'LEAD_NUEVO',
      excluirUsuarioId: req.usuario.id
    })
```

El resultado debe quedar así (solo `res.status(201).json(lead)` sin nada después):

```js
    res.status(201).json(lead)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al crear lead.' })
  }
}
```

- [ ] **Step 3: Verificar que el servidor arranca sin errores**

```bash
cd backend
node -e "require('./src/index.js')" 2>&1 | head -5
```

Expected: sin errores de syntax.

- [ ] **Step 4: Commit**

```bash
git add backend/src/routes/public.js backend/src/controllers/leadsController.js
git commit -m "feat: auto-asignar API leads al JEFE_VENTAS, quitar notif LEAD_NUEVO"
```

---

## Task 3: Recordatorios — Controller, Routes y Cron

**Files:**
- Create: `backend/src/controllers/recordatoriosController.js`
- Create: `backend/src/routes/recordatorios.js`
- Modify: `backend/src/index.js`

- [ ] **Step 1: Crear `recordatoriosController.js`**

Crear `backend/src/controllers/recordatoriosController.js` con el siguiente contenido completo:

```js
const prisma = require('../lib/prisma')

// GET /leads/:id/recordatorios
const listar = async (req, res) => {
  const leadId = Number(req.params.id)
  try {
    const recordatorios = await prisma.recordatorio.findMany({
      where: { leadId },
      include: { creadoPor: { select: { nombre: true, apellido: true } } },
      orderBy: { fechaHora: 'asc' }
    })
    res.json(recordatorios)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al obtener recordatorios.' })
  }
}

// POST /leads/:id/recordatorios
const crear = async (req, res) => {
  const leadId = Number(req.params.id)
  const { descripcion, fechaHora } = req.body

  if (!descripcion || !fechaHora) {
    return res.status(400).json({ error: 'descripcion y fechaHora son requeridos.' })
  }

  try {
    // Verificar acceso: el usuario debe ser GERENTE, JEFE_VENTAS, o el vendedor del lead
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: { vendedorId: true }
    })
    if (!lead) return res.status(404).json({ error: 'Lead no encontrado.' })

    const { rol, id: usuarioId } = req.usuario
    const tieneAcceso = ['GERENTE', 'JEFE_VENTAS'].includes(rol) || lead.vendedorId === usuarioId
    if (!tieneAcceso) return res.status(403).json({ error: 'No tienes acceso a este lead.' })

    const recordatorio = await prisma.recordatorio.create({
      data: {
        leadId,
        creadoPorId: usuarioId,
        descripcion: descripcion.trim(),
        fechaHora:   new Date(fechaHora),
      },
      include: { creadoPor: { select: { nombre: true, apellido: true } } }
    })
    res.status(201).json(recordatorio)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al crear recordatorio.' })
  }
}

// PATCH /recordatorios/:id/completar
const completar = async (req, res) => {
  const id = Number(req.params.id)
  try {
    const recordatorio = await prisma.recordatorio.findUnique({
      where: { id },
      include: { lead: { select: { vendedorId: true } } }
    })
    if (!recordatorio) return res.status(404).json({ error: 'Recordatorio no encontrado.' })

    const { rol, id: usuarioId } = req.usuario
    const tieneAcceso = ['GERENTE', 'JEFE_VENTAS'].includes(rol) || recordatorio.lead.vendedorId === usuarioId
    if (!tieneAcceso) return res.status(403).json({ error: 'No tienes acceso.' })

    const actualizado = await prisma.recordatorio.update({
      where: { id },
      data: { completado: true },
      include: { creadoPor: { select: { nombre: true, apellido: true } } }
    })
    res.json(actualizado)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al completar recordatorio.' })
  }
}

module.exports = { listar, crear, completar }
```

- [ ] **Step 2: Crear `recordatorios.js` route**

Crear `backend/src/routes/recordatorios.js`:

```js
const express = require('express')
const router = express.Router({ mergeParams: true })
const { autenticar } = require('../middleware/auth')
const { listar, crear, completar } = require('../controllers/recordatoriosController')

// Rutas bajo /api/leads/:id/recordatorios
router.get('/',    autenticar, listar)
router.post('/',   autenticar, crear)

module.exports = router
```

Y crear `backend/src/routes/recordatorios-completar.js` para el PATCH independiente:

```js
const express = require('express')
const router = express.Router()
const { autenticar } = require('../middleware/auth')
const { completar } = require('../controllers/recordatoriosController')

router.patch('/:id/completar', autenticar, completar)

module.exports = router
```

- [ ] **Step 3: Registrar rutas y cron en `index.js`**

En `backend/src/index.js`, después de `app.use('/api/email', ...)`, agregar:

```js
app.use('/api/leads/:id/recordatorios', require('./routes/recordatorios'))
app.use('/api/recordatorios',           require('./routes/recordatorios-completar'))
```

Luego, después del cron de UF (`cron.schedule('0 9 * * *', actualizarUF)`), agregar:

```js
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
  } catch (err) {
    console.error('[Recordatorios] Error en cron:', err.message)
  }
})
```

- [ ] **Step 4: Verificar sintaxis**

```bash
cd backend
node -e "require('./src/index.js')" 2>&1 | head -5
```

Expected: sin errores de syntax.

- [ ] **Step 5: Commit**

```bash
git add backend/src/controllers/recordatoriosController.js \
        backend/src/routes/recordatorios.js \
        backend/src/routes/recordatorios-completar.js \
        backend/src/index.js
git commit -m "feat: recordatorios controller, routes y cron de notificación"
```

---

## Task 4: Recordatorios — Frontend en LeadDetalle

**Files:**
- Modify: `frontend/src/pages/leads/LeadDetalle.jsx`

- [ ] **Step 1: Agregar imports necesarios**

En `frontend/src/pages/leads/LeadDetalle.jsx`, en el bloque de imports de antd (línea ~11), agregar `DatePicker` y `BellOutlined` si no están:

```js
import {
  Card, Button, Tag, Modal, Form, Input, Select, Typography,
  Space, Spin, Row, Col, Timeline, Descriptions, App, DatePicker
} from 'antd'
import {
  PhoneOutlined, MailOutlined, MessageOutlined, CalendarOutlined,
  EditOutlined, ArrowRightOutlined, ShoppingOutlined, UserOutlined,
  FileTextOutlined, PlusOutlined, DeleteOutlined, RobotOutlined,
  ExpandOutlined, BellOutlined, CheckOutlined
} from '@ant-design/icons'
```

- [ ] **Step 2: Agregar componente `SeccionRecordatorios`**

Antes de `export default function LeadDetalle()`, agregar el componente:

```jsx
function SeccionRecordatorios({ leadId, vendedorId }) {
  const { usuario } = useAuth()
  const qc = useQueryClient()
  const { message } = App.useApp()
  const [descripcion, setDescripcion] = useState('')
  const [fechaHora, setFechaHora] = useState(null)

  const tieneAcceso = ['GERENTE', 'JEFE_VENTAS'].includes(usuario?.rol) || usuario?.id === vendedorId
  if (!tieneAcceso) return null

  const { data: recordatorios = [], isLoading } = useQuery({
    queryKey: ['recordatorios', leadId],
    queryFn: () => api.get(`/leads/${leadId}/recordatorios`).then(r => r.data)
  })

  const crear = useMutation({
    mutationFn: () => api.post(`/leads/${leadId}/recordatorios`, {
      descripcion,
      fechaHora: fechaHora?.toISOString()
    }),
    onSuccess: () => {
      message.success('Recordatorio creado')
      setDescripcion('')
      setFechaHora(null)
      qc.invalidateQueries(['recordatorios', leadId])
    },
    onError: err => message.error(err.response?.data?.error || 'Error')
  })

  const completar = useMutation({
    mutationFn: (id) => api.patch(`/recordatorios/${id}/completar`),
    onSuccess: () => qc.invalidateQueries(['recordatorios', leadId]),
    onError: err => message.error(err.response?.data?.error || 'Error')
  })

  const ahora = new Date()

  const badgeColor = (r) => {
    if (r.completado) return 'green'
    if (new Date(r.fechaHora) < ahora) return 'red'
    return 'orange'
  }
  const badgeLabel = (r) => {
    if (r.completado) return 'Completado'
    if (new Date(r.fechaHora) < ahora) return 'Vencido'
    return 'Pendiente'
  }

  return (
    <Card
      title={<Space><BellOutlined /> Recordatorios</Space>}
      size="small"
      style={{ marginTop: 16 }}
    >
      {/* Lista */}
      {isLoading ? <Spin size="small" /> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          {recordatorios.length === 0 && (
            <Text type="secondary" style={{ fontSize: 12 }}>Sin recordatorios</Text>
          )}
          {recordatorios.map(r => (
            <div key={r.id} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 10px', borderRadius: 6,
              background: r.completado ? '#f6ffed' : new Date(r.fechaHora) < ahora ? '#fff2f0' : '#fffbe6',
              border: `1px solid ${r.completado ? '#b7eb8f' : new Date(r.fechaHora) < ahora ? '#ffccc7' : '#ffe58f'}`
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: '#1e293b' }}>{r.descripcion}</div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                  {format(new Date(r.fechaHora), "d MMM yyyy 'a las' HH:mm", { locale: es })}
                  {' · '}{r.creadoPor?.nombre}
                </div>
              </div>
              <Tag color={badgeColor(r)} style={{ fontSize: 10 }}>{badgeLabel(r)}</Tag>
              {!r.completado && (
                <Button
                  size="small"
                  icon={<CheckOutlined />}
                  onClick={() => completar.mutate(r.id)}
                  loading={completar.isPending}
                  style={{ fontSize: 11 }}
                >
                  Completar
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Formulario agregar */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Input
          placeholder="Descripción del recordatorio..."
          value={descripcion}
          onChange={e => setDescripcion(e.target.value)}
          style={{ flex: 1, minWidth: 180 }}
          size="small"
        />
        <DatePicker
          showTime={{ format: 'HH:mm' }}
          format="DD/MM/YYYY HH:mm"
          placeholder="Fecha y hora"
          value={fechaHora}
          onChange={setFechaHora}
          size="small"
          style={{ width: 180 }}
        />
        <Button
          type="primary"
          size="small"
          icon={<PlusOutlined />}
          onClick={() => crear.mutate()}
          loading={crear.isPending}
          disabled={!descripcion.trim() || !fechaHora}
        >
          Agregar
        </Button>
      </div>
    </Card>
  )
}
```

- [ ] **Step 3: Usar `SeccionRecordatorios` en el JSX del lead**

En la función `LeadDetalle`, buscar el bloque donde termina el contenido principal (antes de los Modals, cerca del final del JSX, donde está el bloque `<ModalEmail ...>`). Justo antes de `<ModalEmail ...>`, agregar:

```jsx
        <SeccionRecordatorios leadId={Number(id)} vendedorId={lead.vendedorId} />
```

Debe quedar dentro del `<Space direction="vertical" ...>` que envuelve las Cards, o en el Col principal. La posición exacta: al final del segundo `<Col>` que contiene las Cards de interacciones/visitas, antes del cierre `</Col>`.

- [ ] **Step 4: Verificar que el frontend compila sin errores**

```bash
cd frontend
npm run build 2>&1 | tail -10
```

Expected: `✓ built in X.XXs` sin errores.

- [ ] **Step 5: Commit y push**

```bash
git add frontend/src/pages/leads/LeadDetalle.jsx
git commit -m "feat: sección recordatorios en detalle de lead"
git push origin main
```

---

## Self-Review Checklist

- [x] Spec sección 1 (modelo): cubierto en Task 1
- [x] Spec sección 2 (auto-asignación API): cubierto en Task 2 Step 1
- [x] Spec sección 3 (quitar LEAD_NUEVO): cubierto en Task 2 Step 2
- [x] Spec sección 4 (backend recordatorios): cubierto en Task 3
- [x] Spec sección 5 (frontend recordatorios): cubierto en Task 4
- [x] Casos borde (sin JEFE_VENTAS activo, sin vendedorId): manejados en public.js y cron
- [x] Push final incluido en Task 4 Step 5
