# Página de Notificaciones — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Crear página `/notificaciones` con 4 tabs (Emails, Leads sin atención, Alertas, Actividad reciente) + 4 nuevos tipos de notificación en tiempo real.

**Architecture:** Se extienden los endpoints existentes de `/api/alertas` y `/api/email`, se agregan triggers de notificación en controllers de interacciones y descuentos, y se crea una página React nueva con 4 tabs. Sin cambios al cron existente (solo se agrega lógica de VISITA_PROXIMA al mismo cron).

**Tech Stack:** Node.js + Prisma + Express (backend), React + Ant Design + React Query (frontend)

---

## Archivos a crear/modificar

| Archivo | Acción |
|---------|--------|
| `backend/prisma/schema.prisma` | Agregar 4 valores al enum TipoAlerta |
| `backend/src/controllers/alertasController.js` | Agregar `leadsSinAtencion`, modificar `misNotificaciones` para param vendedorId |
| `backend/src/routes/alertas.js` | Agregar ruta `GET /leads-sin-atencion` |
| `backend/src/routes/email.js` | Agregar `GET /sin-responder` + trigger EMAIL_RECIBIDO en webhook |
| `backend/src/controllers/interaccionesController.js` | Trigger ACTIVIDAD_EN_LEAD al crear interacción |
| `backend/src/controllers/descuentosController.js` | Trigger DESCUENTO_RESUELTO al revisar solicitud |
| `backend/src/index.js` | Agregar VISITA_PROXIMA al cron existente |
| `frontend/src/pages/notificaciones/Notificaciones.jsx` | Crear página nueva |
| `frontend/src/App.jsx` | Agregar ruta `/notificaciones` |
| `frontend/src/components/Layout.jsx` | Agregar "Notificaciones" al sidebar |

---

## Task 1: Schema — Nuevos TipoAlerta

**Files:**
- Modify: `backend/prisma/schema.prisma`

- [ ] **Step 1: Agregar 4 valores al enum TipoAlerta**

En `backend/prisma/schema.prisma`, buscar el bloque `enum TipoAlerta` y agregar al final (antes del cierre `}`):

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
  COMISION_ESCRITURA
  EMAIL_RECIBIDO
  ACTIVIDAD_EN_LEAD
  VISITA_PROXIMA
  DESCUENTO_RESUELTO
}
```

- [ ] **Step 2: Aplicar al schema de Railway**

```bash
cd backend && npx prisma db push
```

Salida esperada: `Your database is now in sync with your Prisma schema.`

- [ ] **Step 3: Commit**

```bash
git add backend/prisma/schema.prisma
git commit -m "feat: agregar EMAIL_RECIBIDO, ACTIVIDAD_EN_LEAD, VISITA_PROXIMA, DESCUENTO_RESUELTO al enum TipoAlerta"
git push origin main
```

---

## Task 2: Backend — Endpoint leads sin atención

**Files:**
- Modify: `backend/src/controllers/alertasController.js`
- Modify: `backend/src/routes/alertas.js`

- [ ] **Step 1: Agregar función `leadsSinAtencion` en alertasController.js**

Al final de `backend/src/controllers/alertasController.js`, antes de `module.exports`, agregar:

```js
const leadsSinAtencion = async (req, res) => {
  const { vendedorId, dias = 2 } = req.query
  const esGerente = req.usuario.rol === 'GERENTE'
  const umbral = Number(dias)

  const etapasMonitoreadas = ['SEGUIMIENTO', 'COTIZACION_ENVIADA', 'NO_CONTESTA', 'SEGUIMIENTO_POST_VISITA']

  try {
    const leads = await prisma.lead.findMany({
      where: {
        etapa: { in: etapasMonitoreadas },
        ...(esGerente && vendedorId ? { vendedorId: Number(vendedorId) } : !esGerente ? { vendedorId: req.usuario.id } : {})
      },
      include: {
        contacto: { select: { nombre: true, apellido: true } },
        vendedor: { select: { id: true, nombre: true, apellido: true } },
        interacciones: {
          orderBy: { creadoEn: 'desc' },
          take: 1,
          select: { creadoEn: true }
        }
      }
    })

    const ahora = new Date()
    const resultado = leads
      .map(lead => {
        const ultimaActividad = lead.interacciones[0]?.creadoEn || lead.actualizadoEn
        const diasSinActividad = Math.floor((ahora - new Date(ultimaActividad)) / (1000 * 60 * 60 * 24))
        const { interacciones, ...leadData } = lead
        return { ...leadData, diasSinActividad, ultimaActividad }
      })
      .filter(lead => lead.diasSinActividad >= umbral)
      .sort((a, b) => b.diasSinActividad - a.diasSinActividad)

    res.json(resultado)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al obtener leads sin atención.' })
  }
}
```

- [ ] **Step 2: Exportar la función**

En `module.exports` al final del archivo, agregar `leadsSinAtencion`:

```js
module.exports = {
  misNotificaciones, marcarLeida, marcarTodasLeidas,
  obtenerConfig, actualizarConfig, ejecutarChequeo,
  obtenerPreferencias, actualizarPreferencias,
  listarReglasPipeline, crearReglaPipeline, actualizarReglaPipeline, eliminarReglaPipeline,
  leadsSinAtencion
}
```

- [ ] **Step 3: Agregar ruta en alertas.js**

En `backend/src/routes/alertas.js`, agregar el import y la ruta:

```js
const { misNotificaciones, marcarLeida, marcarTodasLeidas, obtenerConfig, actualizarConfig, ejecutarChequeo, obtenerPreferencias, actualizarPreferencias, listarReglasPipeline, crearReglaPipeline, actualizarReglaPipeline, eliminarReglaPipeline, leadsSinAtencion } = require('../controllers/alertasController')
```

Y agregar la ruta (antes de `module.exports`):

```js
router.get('/leads-sin-atencion', leadsSinAtencion)
```

- [ ] **Step 4: Verificar manualmente**

Iniciar el servidor y hacer:
```bash
curl -H "Authorization: Bearer <token>" http://localhost:3001/api/alertas/leads-sin-atencion?dias=1
```
Debe retornar array de leads con `diasSinActividad`.

- [ ] **Step 5: Commit**

```bash
git add backend/src/controllers/alertasController.js backend/src/routes/alertas.js
git commit -m "feat: endpoint GET /api/alertas/leads-sin-atencion"
git push origin main
```

---

## Task 3: Backend — Endpoint emails sin responder + soporte vendedorId en misNotificaciones

**Files:**
- Modify: `backend/src/routes/email.js`
- Modify: `backend/src/controllers/alertasController.js`

- [ ] **Step 1: Modificar `misNotificaciones` para soportar param vendedorId (solo GERENTE)**

En `backend/src/controllers/alertasController.js`, reemplazar la función `misNotificaciones`:

```js
const misNotificaciones = async (req, res) => {
  try {
    const esGerente = req.usuario.rol === 'GERENTE'
    const vendedorId = req.query.vendedorId ? Number(req.query.vendedorId) : null

    let whereUsuario
    if (esGerente && vendedorId) {
      whereUsuario = { usuarioId: vendedorId }
    } else if (esGerente && !vendedorId) {
      whereUsuario = {} // GERENTE sin filtro = todas
    } else {
      whereUsuario = { usuarioId: req.usuario.id }
    }

    const notificaciones = await prisma.notificacion.findMany({
      where: whereUsuario,
      orderBy: { creadoEn: 'desc' },
      take: 100
    })
    res.json(notificaciones)
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener notificaciones.' })
  }
}
```

- [ ] **Step 2: Agregar `GET /api/email/sin-responder` en routes/email.js**

En `backend/src/routes/email.js`, justo antes de la línea `module.exports = router`, agregar:

```js
// ─── GET /api/email/sin-responder ─────────────────────────────────────────────
router.get('/sin-responder', autenticar, async (req, res) => {
  const esGerente = req.usuario.rol === 'GERENTE'
  const vendedorId = req.query.vendedorId ? Number(req.query.vendedorId) : null

  let whereLead
  if (esGerente && vendedorId) {
    whereLead = { vendedorId }
  } else if (esGerente && !vendedorId) {
    whereLead = undefined // sin filtro = todos
  } else {
    whereLead = { vendedorId: req.usuario.id }
  }

  try {
    const emails = await prisma.emailConversacion.findMany({
      where: {
        direction: 'RECIBIDO',
        leido: false,
        ...(whereLead !== undefined && { lead: whereLead })
      },
      include: {
        lead: {
          select: {
            id: true,
            vendedor: { select: { id: true, nombre: true, apellido: true } },
            contacto: { select: { nombre: true, apellido: true } }
          }
        }
      },
      orderBy: { creadoEn: 'desc' }
    })
    res.json(emails)
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener emails sin responder.' })
  }
})
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/routes/email.js backend/src/controllers/alertasController.js
git commit -m "feat: endpoint GET /api/email/sin-responder + soporte vendedorId en alertas"
git push origin main
```

---

## Task 4: Backend — Notificaciones en tiempo real

**Files:**
- Modify: `backend/src/routes/email.js`
- Modify: `backend/src/controllers/interaccionesController.js`
- Modify: `backend/src/controllers/descuentosController.js`

- [ ] **Step 1: EMAIL_RECIBIDO — en webhook `POST /api/email/respuesta`**

En `backend/src/routes/email.js`, dentro del handler `router.post('/respuesta', ...)`, justo después de la línea:

```js
await prisma.emailConversacion.create({
  data: { leadId, messageId: msgId, inReplyTo, direction: 'RECIBIDO', asunto, cuerpo, de: deEmail, para: toEmail }
})
console.log('[Inbound] guardado en BD ✓')
```

Agregar:

```js
// Notificar al vendedor del lead
const leadParaNotif = await prisma.lead.findUnique({ where: { id: leadId }, select: { vendedorId: true } })
if (leadParaNotif?.vendedorId) {
  await prisma.notificacion.create({
    data: {
      usuarioId: leadParaNotif.vendedorId,
      tipo: 'EMAIL_RECIBIDO',
      mensaje: `Email recibido de ${deEmail.split('<')[0].trim()}: "${asunto}"`,
      referenciaId: leadId,
      referenciaTipo: 'lead'
    }
  }).catch(() => {})
}
```

- [ ] **Step 2: ACTIVIDAD_EN_LEAD — en interaccionesController.js**

En `backend/src/controllers/interaccionesController.js`, en la función `crear`, reemplazar todo el bloque `try`:

```js
try {
  const interaccion = await prisma.interaccion.create({
    data: {
      leadId: Number(leadId),
      usuarioId: req.usuario.id,
      tipo,
      descripcion,
      ...(fecha && { fecha: new Date(fecha) })
    },
    include: { usuario: { select: { nombre: true, apellido: true } } }
  })

  // Notificar al vendedor si fue otro usuario quien registró la actividad
  const lead = await prisma.lead.findUnique({ where: { id: Number(leadId) }, select: { vendedorId: true } })
  if (lead?.vendedorId && lead.vendedorId !== req.usuario.id) {
    await prisma.notificacion.create({
      data: {
        usuarioId: lead.vendedorId,
        tipo: 'ACTIVIDAD_EN_LEAD',
        mensaje: `${req.usuario.nombre} registró una actividad en tu lead: ${tipo.toLowerCase()} — "${descripcion.substring(0, 80)}"`,
        referenciaId: Number(leadId),
        referenciaTipo: 'lead'
      }
    }).catch(() => {})
  }

  res.status(201).json(interaccion)
} catch (err) {
  res.status(500).json({ error: 'Error al crear interacción.' })
}
```

- [ ] **Step 3: DESCUENTO_RESUELTO — en descuentosController.js**

En `backend/src/controllers/descuentosController.js`, en la función `revisar`, después de la línea:

```js
res.json({ solicitud: actualizada, descuentoAplicadoUF })
```

Agregar (antes del cierre del `try`):

```js
// Notificar al vendedor que solicitó el descuento
await prisma.notificacion.create({
  data: {
    usuarioId: solicitud.solicitadoPorId,
    tipo: 'DESCUENTO_RESUELTO',
    mensaje: decision === 'APROBADA'
      ? `Descuento aprobado${descuentoAplicadoUF ? ` (${descuentoAplicadoUF} UF)` : ''} — cotización #${solicitud.cotizacionId}`
      : `Descuento rechazado — cotización #${solicitud.cotizacionId}${comentario ? `: ${comentario}` : ''}`,
    referenciaId: solicitud.cotizacionId,
    referenciaTipo: 'cotizacion'
  }
}).catch(() => {})
```

- [ ] **Step 4: Commit**

```bash
git add backend/src/routes/email.js backend/src/controllers/interaccionesController.js backend/src/controllers/descuentosController.js
git commit -m "feat: notificaciones EMAIL_RECIBIDO, ACTIVIDAD_EN_LEAD, DESCUENTO_RESUELTO en tiempo real"
git push origin main
```

---

## Task 5: Backend — VISITA_PROXIMA en cron

**Files:**
- Modify: `backend/src/index.js`

- [ ] **Step 1: Agregar lógica VISITA_PROXIMA al cron de 15 minutos**

En `backend/src/index.js`, dentro del `cron.schedule('*/15 * * * *', async () => { ... })`, después del bucle que procesa recordatorios (después del `if (pendientes.length > 0) {...}`), agregar:

```js
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
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/index.js
git commit -m "feat: notificación VISITA_PROXIMA 24h antes en cron"
git push origin main
```

---

## Task 6: Frontend — Página Notificaciones

**Files:**
- Create: `frontend/src/pages/notificaciones/Notificaciones.jsx`
- Modify: `frontend/src/App.jsx`
- Modify: `frontend/src/components/Layout.jsx`

- [ ] **Step 1: Crear `frontend/src/pages/notificaciones/Notificaciones.jsx`**

```jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Tabs, Select, Typography, Empty, Tag, Button, Space, Badge } from 'antd'
import {
  MailOutlined, ClockCircleOutlined, BellOutlined,
  FileTextOutlined, CheckCircleOutlined
} from '@ant-design/icons'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

const { Text, Title } = Typography

const TIPOS_ALERTAS = [
  'LLAVE_NO_DEVUELTA','CUOTA_VENCIDA','LEAD_SIN_ACTIVIDAD','LEAD_ESTANCADO',
  'FECHA_LEGAL_PROXIMA','ARRIENDO_POR_VENCER','DESCUENTO_PENDIENTE',
  'LEAD_ETAPA_CAMBIO','LEAD_NUEVO','RECORDATORIO_LEAD','COMISION_ESCRITURA'
]
const TIPOS_ACTIVIDAD = ['EMAIL_RECIBIDO','ACTIVIDAD_EN_LEAD','VISITA_PROXIMA','DESCUENTO_RESUELTO']

const TIPO_CONFIG = {
  LLAVE_NO_DEVUELTA:   { color: 'red',    label: 'Llave', emoji: '🔑' },
  CUOTA_VENCIDA:       { color: 'red',    label: 'Cuota vencida', emoji: '💳' },
  LEAD_SIN_ACTIVIDAD:  { color: 'orange', label: 'Sin actividad', emoji: '⏰' },
  LEAD_ESTANCADO:      { color: 'orange', label: 'Lead estancado', emoji: '⚠️' },
  FECHA_LEGAL_PROXIMA: { color: 'blue',   label: 'Legal', emoji: '⚖️' },
  ARRIENDO_POR_VENCER: { color: 'orange', label: 'Arriendo', emoji: '🏠' },
  DESCUENTO_PENDIENTE: { color: 'purple', label: 'Descuento', emoji: '💰' },
  LEAD_ETAPA_CAMBIO:   { color: 'blue',   label: 'Etapa', emoji: '🔄' },
  LEAD_NUEVO:          { color: 'green',  label: 'Nuevo lead', emoji: '✨' },
  RECORDATORIO_LEAD:   { color: 'green',  label: 'Recordatorio', emoji: '📅' },
  COMISION_ESCRITURA:  { color: 'gold',   label: 'Comisión', emoji: '💵' },
  EMAIL_RECIBIDO:      { color: 'blue',   label: 'Email recibido', emoji: '✉️' },
  ACTIVIDAD_EN_LEAD:   { color: 'green',  label: 'Actividad', emoji: '📝' },
  VISITA_PROXIMA:      { color: 'blue',   label: 'Visita', emoji: '📅' },
  DESCUENTO_RESUELTO:  { color: 'purple', label: 'Descuento', emoji: '✅' },
}

const ETAPA_COLOR = {
  SEGUIMIENTO: 'blue',
  COTIZACION_ENVIADA: 'gold',
  NO_CONTESTA: 'default',
  SEGUIMIENTO_POST_VISITA: 'purple',
}

function CardItem({ children, unread, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: unread ? '#f0f5ff' : '#fff',
        border: `1px solid ${unread ? '#91caff' : '#e5e7eb'}`,
        borderLeft: unread ? '3px solid #1677ff' : '3px solid transparent',
        borderRadius: 8,
        padding: '12px 16px',
        marginBottom: 8,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'box-shadow .15s',
      }}
      onMouseEnter={e => onClick && (e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,.08)')}
      onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
    >
      {children}
    </div>
  )
}

export default function Notificaciones() {
  const { usuario } = useAuth()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const esGerente = usuario?.rol === 'GERENTE'
  const [vendedorId, setVendedorId] = useState(null)

  // Equipo para selector GERENTE
  const { data: equipo = [] } = useQuery({
    queryKey: ['usuarios-equipo'],
    queryFn: () => api.get('/usuarios').then(r => r.data),
    enabled: esGerente,
    staleTime: 60000,
  })

  const params = vendedorId ? { vendedorId } : {}

  // Tab 1: emails sin responder
  const { data: emails = [], isLoading: loadingEmails } = useQuery({
    queryKey: ['emails-sin-responder', vendedorId],
    queryFn: () => api.get('/email/sin-responder', { params }).then(r => r.data),
    refetchInterval: 30000,
  })

  // Tab 2: leads sin atención
  const { data: leadsSinAtencion = [], isLoading: loadingLeads } = useQuery({
    queryKey: ['leads-sin-atencion', vendedorId],
    queryFn: () => api.get('/alertas/leads-sin-atencion', { params }).then(r => r.data),
    refetchInterval: 60000,
  })

  // Tab 3 + 4: todas las notificaciones
  const { data: todasNotifs = [], isLoading: loadingNotifs } = useQuery({
    queryKey: ['notificaciones-pagina', vendedorId],
    queryFn: () => api.get('/alertas', { params }).then(r => r.data),
    refetchInterval: 30000,
  })

  const alertas = todasNotifs.filter(n => TIPOS_ALERTAS.includes(n.tipo) && !n.leida)
  const actividad = todasNotifs.filter(n => TIPOS_ACTIVIDAD.includes(n.tipo))
  const alertasSinLeer = alertas.filter(n => !n.leida).length
  const actividadSinLeer = actividad.filter(n => !n.leida).length

  const marcarTodasLeidas = useMutation({
    mutationFn: () => api.put('/alertas/leer-todas'),
    onSuccess: () => {
      qc.invalidateQueries(['notificaciones-pagina'])
      qc.invalidateQueries(['notificaciones'])
    }
  })

  const marcarLeida = useMutation({
    mutationFn: (id) => api.put(`/alertas/${id}/leer`),
    onSuccess: () => {
      qc.invalidateQueries(['notificaciones-pagina'])
      qc.invalidateQueries(['notificaciones'])
    }
  })

  const marcarEmailLeido = useMutation({
    mutationFn: (leadId) => api.patch(`/email/conversacion/${leadId}/leer`),
    onSuccess: () => qc.invalidateQueries(['emails-sin-responder'])
  })

  const irALead = (leadId, notifId) => {
    if (notifId) marcarLeida.mutate(notifId)
    navigate(`/leads/${leadId}`)
  }

  const tiempoRelativo = (fecha) =>
    formatDistanceToNow(new Date(fecha), { addSuffix: true, locale: es })

  // ── Tab 1: Emails ─────────────────────────────────────────────────
  const tabEmails = (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Text type="secondary">{emails.length} email{emails.length !== 1 ? 's' : ''} sin responder</Text>
        {emails.length > 0 && (
          <Button size="small" onClick={() => emails.forEach(e => marcarEmailLeido.mutate(e.leadId))}>
            Marcar todos como vistos
          </Button>
        )}
      </div>
      {emails.length === 0 && <Empty description="Sin emails pendientes" image={Empty.PRESENTED_IMAGE_SIMPLE} />}
      {emails.map(email => (
        <CardItem key={email.id} unread onClick={() => {
          marcarEmailLeido.mutate(email.leadId)
          navigate(`/leads/${email.leadId}`)
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <Text strong>{email.lead?.contacto?.nombre} {email.lead?.contacto?.apellido}</Text>
              <div style={{ fontSize: 13, color: '#444', margin: '3px 0' }}>{email.asunto}</div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                De: {email.de.split('<')[0].trim()}
                {esGerente && email.lead?.vendedor && ` · Vendedor: ${email.lead.vendedor.nombre} ${email.lead.vendedor.apellido}`}
              </Text>
            </div>
            <Text type="secondary" style={{ fontSize: 12, flexShrink: 0, marginLeft: 12 }}>
              {tiempoRelativo(email.creadoEn)}
            </Text>
          </div>
        </CardItem>
      ))}
    </div>
  )

  // ── Tab 2: Leads sin atención ─────────────────────────────────────
  const cotizaciones = leadsSinAtencion.filter(l => l.etapa === 'COTIZACION_ENVIADA')
  const enSeguimiento = leadsSinAtencion.filter(l => l.etapa !== 'COTIZACION_ENVIADA')

  const renderLead = (lead) => (
    <CardItem key={lead.id} unread={lead.diasSinActividad >= 5} onClick={() => navigate(`/leads/${lead.id}`)}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <Text strong>{lead.contacto.nombre} {lead.contacto.apellido}</Text>
          <div style={{ fontSize: 13, color: '#444', margin: '3px 0' }}>
            Sin actividad registrada en {lead.diasSinActividad} día{lead.diasSinActividad !== 1 ? 's' : ''}
          </div>
          {esGerente && lead.vendedor && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              Vendedor: {lead.vendedor.nombre} {lead.vendedor.apellido}
            </Text>
          )}
        </div>
        <div style={{ flexShrink: 0, marginLeft: 12, textAlign: 'right' }}>
          <Tag
            color={lead.diasSinActividad >= 5 ? 'red' : 'orange'}
            style={{ fontWeight: 600 }}
          >
            {lead.diasSinActividad}d
          </Tag>
          <div style={{ marginTop: 4 }}>
            <Tag color={ETAPA_COLOR[lead.etapa] || 'default'} style={{ fontSize: 11 }}>
              {lead.etapa.replace(/_/g, ' ')}
            </Tag>
          </div>
        </div>
      </div>
    </CardItem>
  )

  const tabLeads = (
    <div>
      <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
        {leadsSinAtencion.length} lead{leadsSinAtencion.length !== 1 ? 's' : ''} requieren atención
      </Text>
      {leadsSinAtencion.length === 0 && <Empty description="Todos los leads están al día" image={Empty.PRESENTED_IMAGE_SIMPLE} />}
      {cotizaciones.length > 0 && (
        <>
          <Text type="secondary" style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px', display: 'block', marginBottom: 8 }}>
            Cotización enviada
          </Text>
          {cotizaciones.map(renderLead)}
        </>
      )}
      {enSeguimiento.length > 0 && (
        <>
          <Text type="secondary" style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px', display: 'block', marginTop: cotizaciones.length ? 16 : 0, marginBottom: 8 }}>
            En seguimiento
          </Text>
          {enSeguimiento.map(renderLead)}
        </>
      )}
    </div>
  )

  // ── Tab 3: Alertas ────────────────────────────────────────────────
  const tabAlertas = (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Text type="secondary">{alertasSinLeer} alerta{alertasSinLeer !== 1 ? 's' : ''} sin leer</Text>
        {alertasSinLeer > 0 && (
          <Button size="small" onClick={() => marcarTodasLeidas.mutate()}>
            Marcar todas como leídas
          </Button>
        )}
      </div>
      {alertas.length === 0 && <Empty description="Sin alertas" image={Empty.PRESENTED_IMAGE_SIMPLE} />}
      {alertas.map(n => {
        const cfg = TIPO_CONFIG[n.tipo] || { emoji: '🔔', color: 'blue', label: n.tipo }
        return (
          <CardItem key={n.id} unread={!n.leida} onClick={() => {
            if (!n.leida) marcarLeida.mutate(n.id)
            if (n.referenciaTipo === 'lead' && n.referenciaId) navigate(`/leads/${n.referenciaId}`)
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <Space size={6}>
                  <span>{cfg.emoji}</span>
                  <Tag color={cfg.color} style={{ fontSize: 11 }}>{cfg.label}</Tag>
                </Space>
                <div style={{ fontSize: 13, color: '#333', marginTop: 4 }}>{n.mensaje}</div>
              </div>
              <Text type="secondary" style={{ fontSize: 12, flexShrink: 0, marginLeft: 12 }}>
                {tiempoRelativo(n.creadoEn)}
              </Text>
            </div>
          </CardItem>
        )
      })}
    </div>
  )

  // ── Tab 4: Actividad reciente ─────────────────────────────────────
  const tabActividad = (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Text type="secondary">{actividad.length} evento{actividad.length !== 1 ? 's' : ''} recientes</Text>
        {actividadSinLeer > 0 && (
          <Button size="small" onClick={() => marcarTodasLeidas.mutate()}>
            Marcar todo como leído
          </Button>
        )}
      </div>
      {actividad.length === 0 && <Empty description="Sin actividad reciente" image={Empty.PRESENTED_IMAGE_SIMPLE} />}
      {actividad.map(n => {
        const cfg = TIPO_CONFIG[n.tipo] || { emoji: '📋', color: 'blue', label: n.tipo }
        return (
          <CardItem key={n.id} unread={!n.leida} onClick={() => {
            if (!n.leida) marcarLeida.mutate(n.id)
            if (n.referenciaTipo === 'lead' && n.referenciaId) navigate(`/leads/${n.referenciaId}`)
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <Space size={6}>
                  <span>{cfg.emoji}</span>
                  <Tag color={cfg.color} style={{ fontSize: 11 }}>{cfg.label}</Tag>
                </Space>
                <div style={{ fontSize: 13, color: '#333', marginTop: 4 }}>{n.mensaje}</div>
              </div>
              <Text type="secondary" style={{ fontSize: 12, flexShrink: 0, marginLeft: 12 }}>
                {tiempoRelativo(n.creadoEn)}
              </Text>
            </div>
          </CardItem>
        )
      })}
    </div>
  )

  const tabItems = [
    {
      key: 'emails',
      label: <span>✉️ Emails <Badge count={emails.length} size="small" /></span>,
      children: tabEmails,
    },
    {
      key: 'leads',
      label: <span>⏰ Leads sin atención <Badge count={leadsSinAtencion.length} size="small" color="orange" /></span>,
      children: tabLeads,
    },
    {
      key: 'alertas',
      label: <span>🔔 Alertas <Badge count={alertasSinLeer} size="small" /></span>,
      children: tabAlertas,
    },
    {
      key: 'actividad',
      label: <span>📋 Actividad reciente <Badge count={actividadSinLeer} size="small" color="gray" /></span>,
      children: tabActividad,
    },
  ]

  return (
    <div style={{ padding: '24px', maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <Title level={4} style={{ margin: 0 }}>Notificaciones</Title>
        {esGerente && (
          <Space>
            <Text type="secondary" style={{ fontSize: 13 }}>Ver vendedor:</Text>
            <Select
              allowClear
              placeholder="Todo el equipo"
              style={{ width: 200 }}
              value={vendedorId}
              onChange={setVendedorId}
              options={equipo.map(u => ({ value: u.id, label: `${u.nombre} ${u.apellido}` }))}
            />
          </Space>
        )}
      </div>

      <Tabs items={tabItems} />
    </div>
  )
}
```

- [ ] **Step 2: Agregar ruta en App.jsx**

En `frontend/src/App.jsx`, agregar el import al inicio (junto a los otros imports de páginas):

```js
import Notificaciones from './pages/notificaciones/Notificaciones'
```

Y agregar la ruta dentro del bloque `<Routes>` (después de la ruta de `perfil`):

```jsx
<Route path="notificaciones" element={<RutaProtegida><Notificaciones /></RutaProtegida>} />
```

- [ ] **Step 3: Agregar al sidebar en Layout.jsx**

En `frontend/src/components/Layout.jsx`, en los imports de Ant Design icons, agregar `BellOutlined` (si no está):

```js
import {
  DashboardOutlined, AppstoreOutlined, TeamOutlined,
  ShoppingOutlined, AuditOutlined, CreditCardOutlined,
  DollarOutlined, TagOutlined, CarOutlined, KeyOutlined,
  BarChartOutlined, UserSwitchOutlined, ThunderboltOutlined,
  MenuOutlined, LogoutOutlined, CalendarOutlined, PercentageOutlined,
  ApiOutlined, SettingOutlined, BellOutlined
} from '@ant-design/icons'
```

En `NAV_SECTIONS`, en la sección `'General'`, agregar el item de notificaciones después de `/leads`:

```js
{ key: '/notificaciones', label: 'Notificaciones', icon: <BellOutlined />, roles: null, modulo: null },
```

- [ ] **Step 4: Verificar en browser**

Iniciar frontend con `cd frontend && npm run dev`. Navegar a `/notificaciones`. Verificar que:
- Los 4 tabs cargan sin errores en consola
- Tab 1 muestra emails sin responder (o Empty si no hay)
- Tab 2 muestra leads con >2 días sin actividad
- Tab 3 muestra alertas existentes
- Tab 4 muestra actividad reciente
- GERENTE ve el selector de vendedor

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/notificaciones/Notificaciones.jsx frontend/src/App.jsx frontend/src/components/Layout.jsx
git commit -m "feat: página Notificaciones con 4 tabs — emails, leads sin atención, alertas, actividad"
git push origin main
```

---

## Task 7: Actualizar FUNCIONALIDADES.md

**Files:**
- Modify: `docs/FUNCIONALIDADES.md`

- [ ] **Step 1: Actualizar sección ALERTAS/NOTIFICACIONES**

En `docs/FUNCIONALIDADES.md`, reemplazar la sección `### ALERTAS/NOTIFICACIONES`:

```markdown
### ALERTAS/NOTIFICACIONES — `/api/alertas`
- Archivos: `routes/alertas.js`, `controllers/alertasController.js`
- `GET /` — notificaciones no leídas del usuario. GERENTE acepta param `?vendedorId=X` para ver de otro usuario.
- `PUT /:id/leer` — marcar leída
- `PUT /leer-todas` — marcar todas leídas
- `GET /config`, `PUT /config/:tipo` — config de alertas (GERENTE)
- `GET /preferencias`, `PUT /preferencias` — preferencias del usuario
- `GET /leads-sin-atencion` — leads en SEGUIMIENTO/COTIZACION_ENVIADA/NO_CONTESTA/SEGUIMIENTO_POST_VISITA con >2 días sin interacción. Acepta `?vendedorId=X&dias=N`.
- Tipos de alerta: LLAVE_NO_DEVUELTA, CUOTA_VENCIDA, LEAD_SIN_ACTIVIDAD, LEAD_ESTANCADO, FECHA_LEGAL_PROXIMA, ARRIENDO_POR_VENCER, DESCUENTO_PENDIENTE, LEAD_ETAPA_CAMBIO, LEAD_NUEVO, RECORDATORIO_LEAD, COMISION_ESCRITURA, EMAIL_RECIBIDO, ACTIVIDAD_EN_LEAD, VISITA_PROXIMA, DESCUENTO_RESUELTO
- Componentes: `components/NotificacionesBadge.jsx` (header badge), `pages/notificaciones/Notificaciones.jsx` (página completa con 4 tabs)
- Página: `GET /email/sin-responder` — emails RECIBIDO no leídos por vendedor. GERENTE acepta `?vendedorId=X`.
- Notificaciones en tiempo real: EMAIL_RECIBIDO (webhook inbound), ACTIVIDAD_EN_LEAD (crear interacción), DESCUENTO_RESUELTO (revisar solicitud)
- VISITA_PROXIMA: cron cada 15 min, ventana 23h-25h antes de la visita
```

- [ ] **Step 2: Commit**

```bash
git add docs/FUNCIONALIDADES.md
git commit -m "docs: actualizar FUNCIONALIDADES.md con página notificaciones y nuevos tipos"
git push origin main
```
