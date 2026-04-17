# Notificaciones de Leads — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Crear notificaciones in-app automáticas cuando llega un lead nuevo o cambia de etapa, con toggle por usuario para activar/desactivar.

**Architecture:** El backend crea registros `Notificacion` en la BD al detectar los eventos (cambio de etapa, lead nuevo). El frontend ya tiene `NotificacionesBadge` con bell + popover que lee `/api/alertas`. Se agregan dos tipos nuevos al enum `TipoAlerta`, un campo `notificacionesActivas` al modelo `Usuario`, y un endpoint para que cada usuario cambie su preferencia. Las notificaciones serán clickeables para navegar al lead.

**Tech Stack:** Node.js + Prisma (PostgreSQL en Railway), React + Ant Design, @tanstack/react-query

---

### Task 1: Schema — nuevos tipos y campo notificacionesActivas

**Files:**
- Modify: `backend/prisma/schema.prisma`

- [ ] **Step 1: Agregar LEAD_ETAPA_CAMBIO y LEAD_NUEVO al enum TipoAlerta**

En `backend/prisma/schema.prisma`, buscar el enum `TipoAlerta` (alrededor de línea 177) y agregar al final:

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
}
```

- [ ] **Step 2: Agregar notificacionesActivas al modelo Usuario**

En el modelo `Usuario` (alrededor de línea 189), agregar después del campo `smtpPassword`:

```prisma
notificacionesActivas  Boolean   @default(true)
```

- [ ] **Step 3: Push schema a Railway**

```bash
cd backend
DATABASE_URL="postgresql://bodeparking:bodeparking2026!@monorail.proxy.rlwy.net:35865/bodeparkingcrm" npx prisma db push --accept-data-loss
```

Resultado esperado: `🚀 Your database is now in sync with your Prisma schema.`

- [ ] **Step 4: Commit**

```bash
git add backend/prisma/schema.prisma
git commit -m "feat: agregar LEAD_ETAPA_CAMBIO, LEAD_NUEVO y notificacionesActivas al schema"
```

---

### Task 2: Helper notificarLead en leadsController

**Files:**
- Modify: `backend/src/controllers/leadsController.js`

Context: El archivo ya tiene `const prisma = require('../lib/prisma')` en la línea 1. El enum `TipoAlerta` se usa como string en Prisma (ej: `tipo: 'LEAD_NUEVO'`).

Los labels de etapa para el mensaje:

```js
const ETAPA_LABEL = {
  NUEVO: 'Nuevo', NO_CONTESTA: 'No contesta', SEGUIMIENTO: 'Seguimiento',
  COTIZACION_ENVIADA: 'Cotización enviada', VISITA_AGENDADA: 'Visita agendada',
  VISITA_REALIZADA: 'Visita realizada', SEGUIMIENTO_POST_VISITA: 'Seguimiento post visita',
  NEGOCIACION: 'Negociación', RESERVA: 'Reserva', PROMESA: 'Promesa',
  ESCRITURA: 'Escritura', ENTREGA: 'Entrega', POSTVENTA: 'Postventa', PERDIDO: 'Perdido'
}
```

- [ ] **Step 1: Agregar ETAPA_LABEL y helper notificarLead al inicio del archivo**

Después de `const ORDEN_ETAPAS = [...]` (alrededor de línea 17), agregar:

```js
const ETAPA_LABEL = {
  NUEVO: 'Nuevo', NO_CONTESTA: 'No contesta', SEGUIMIENTO: 'Seguimiento',
  COTIZACION_ENVIADA: 'Cotización enviada', VISITA_AGENDADA: 'Visita agendada',
  VISITA_REALIZADA: 'Visita realizada', SEGUIMIENTO_POST_VISITA: 'Seguimiento post visita',
  NEGOCIACION: 'Negociación', RESERVA: 'Reserva', PROMESA: 'Promesa',
  ESCRITURA: 'Escritura', ENTREGA: 'Entrega', POSTVENTA: 'Postventa', PERDIDO: 'Perdido'
}

async function notificarLead({ leadId, mensaje, tipo, excluirUsuarioId }) {
  try {
    const destinatarios = await prisma.usuario.findMany({
      where: {
        notificacionesActivas: true,
        activo: true,
        OR: [
          { rol: 'GERENTE' },
          { rol: 'JEFE_VENTAS' },
          { leadsAsignados: { some: { id: leadId } } }
        ],
        ...(excluirUsuarioId ? { id: { not: excluirUsuarioId } } : {})
      },
      select: { id: true }
    })
    if (!destinatarios.length) return
    await prisma.notificacion.createMany({
      data: destinatarios.map(u => ({
        usuarioId: u.id,
        tipo,
        mensaje,
        referenciaId: leadId,
        referenciaTipo: 'lead'
      })),
      skipDuplicates: true
    })
  } catch (err) {
    console.error('[notificarLead]', err.message)
  }
}
```

- [ ] **Step 2: Llamar notificarLead en crear — después de res.status(201).json(lead)**

En la función `crear` (alrededor de línea 235), después de `res.status(201).json(lead)`, agregar:

```js
    notificarLead({
      leadId: lead.id,
      mensaje: `Nuevo lead: ${lead.contacto.nombre} ${lead.contacto.apellido}`,
      tipo: 'LEAD_NUEVO',
      excluirUsuarioId: req.usuario.id
    })
```

Nota: sin `await` — no bloquea la respuesta.

- [ ] **Step 3: Llamar notificarLead en cambiarEtapa — después de res.json(actualizado)**

En la función `cambiarEtapa` (alrededor de línea 300), después de `res.json(actualizado)`, agregar:

```js
    notificarLead({
      leadId: Number(id),
      mensaje: `Lead ${lead.contacto ? lead.contacto.nombre + ' ' + lead.contacto.apellido : '#' + id} → ${ETAPA_LABEL[etapa] || etapa}`,
      tipo: 'LEAD_ETAPA_CAMBIO',
      excluirUsuarioId: req.usuario.id
    })
```

Pero `cambiarEtapa` no incluye `contacto` en el `findFirst`. Necesitamos el nombre. Cambiar el `findFirst` existente para incluir contacto:

```js
    const lead = await prisma.lead.findFirst({
      where: { id: Number(id), ...filtroAcceso(req.usuario) },
      include: { contacto: { select: { nombre: true, apellido: true } } }
    })
```

- [ ] **Step 4: Commit**

```bash
git add backend/src/controllers/leadsController.js
git commit -m "feat: notificarLead helper + triggers en crear y cambiarEtapa"
```

---

### Task 3: Trigger en Comuro upsert (lead nuevo)

**Files:**
- Modify: `backend/src/routes/comuro.js`

Context: El archivo ya tiene `const prisma = require('../lib/prisma')`. El upsert responde `{ lead_id, status }` donde `status` es `'created'` o `'updated'`.

- [ ] **Step 1: Agregar helper notificarLead en comuro.js**

Al inicio de `backend/src/routes/comuro.js`, después de `const prisma = require('../lib/prisma')`, agregar:

```js
async function notificarLead({ leadId, mensaje, tipo }) {
  try {
    const destinatarios = await prisma.usuario.findMany({
      where: {
        notificacionesActivas: true,
        activo: true,
        OR: [{ rol: 'GERENTE' }, { rol: 'JEFE_VENTAS' }]
      },
      select: { id: true }
    })
    if (!destinatarios.length) return
    await prisma.notificacion.createMany({
      data: destinatarios.map(u => ({
        usuarioId: u.id, tipo, mensaje, referenciaId: leadId, referenciaTipo: 'lead'
      })),
      skipDuplicates: true
    })
  } catch (err) {
    console.error('[comuro notificarLead]', err.message)
  }
}
```

Nota: En Comuro no hay `excluirUsuarioId` porque no hay usuario autenticado.

- [ ] **Step 2: Llamar notificarLead al crear lead desde Comuro**

En el handler `POST /upsert`, justo antes de `return res.status(201).json(...)`, agregar:

```js
    notificarLead({
      leadId: leadNuevo.id,
      mensaje: `Nuevo lead de Comuro: ${nombreContacto} ${apellidoContacto}`,
      tipo: 'LEAD_NUEVO'
    })
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/routes/comuro.js
git commit -m "feat: notificacion LEAD_NUEVO al crear lead desde Comuro"
```

---

### Task 4: Endpoint preferencias de notificaciones

**Files:**
- Modify: `backend/src/routes/alertas.js`
- Modify: `backend/src/controllers/alertasController.js`

- [ ] **Step 1: Agregar controladores obtenerPreferencias y actualizarPreferencias**

En `backend/src/controllers/alertasController.js`, agregar al final (antes del `module.exports`):

```js
const obtenerPreferencias = async (req, res) => {
  try {
    const usuario = await prisma.usuario.findUnique({
      where: { id: req.usuario.id },
      select: { notificacionesActivas: true }
    })
    res.json({ notificacionesActivas: usuario.notificacionesActivas })
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener preferencias.' })
  }
}

const actualizarPreferencias = async (req, res) => {
  const { notificacionesActivas } = req.body
  if (typeof notificacionesActivas !== 'boolean') {
    return res.status(400).json({ error: 'notificacionesActivas debe ser true o false.' })
  }
  try {
    await prisma.usuario.update({
      where: { id: req.usuario.id },
      data: { notificacionesActivas }
    })
    res.json({ ok: true, notificacionesActivas })
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar preferencias.' })
  }
}
```

Actualizar el `module.exports` al final del archivo para incluir los nuevos:

```js
module.exports = { misNotificaciones, marcarLeida, marcarTodasLeidas, obtenerConfig, actualizarConfig, ejecutarChequeo, obtenerPreferencias, actualizarPreferencias }
```

- [ ] **Step 2: Registrar rutas en alertas.js**

En `backend/src/routes/alertas.js`, actualizar el import y agregar las rutas:

```js
const { misNotificaciones, marcarLeida, marcarTodasLeidas, obtenerConfig, actualizarConfig, ejecutarChequeo, obtenerPreferencias, actualizarPreferencias } = require('../controllers/alertasController')
```

Agregar después de `router.put('/leer-todas', marcarTodasLeidas)`:

```js
router.get('/preferencias', obtenerPreferencias)
router.put('/preferencias', actualizarPreferencias)
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/controllers/alertasController.js backend/src/routes/alertas.js
git commit -m "feat: endpoints GET/PUT /api/alertas/preferencias para toggle notificaciones"
```

---

### Task 5: Frontend — NotificacionesBadge clickeable y refetch 30s

**Files:**
- Modify: `frontend/src/components/NotificacionesBadge.jsx`

Context: El componente ya existe con Popover + Badge + List. Actualmente `refetchInterval: 60000`. Las notificaciones tienen `referenciaId` (leadId) y `referenciaTipo` ('lead') cuando vienen de leads.

- [ ] **Step 1: Actualizar NotificacionesBadge**

Reemplazar el contenido completo de `frontend/src/components/NotificacionesBadge.jsx`:

```jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Badge, Popover, List, Button, Typography, Empty } from 'antd'
import { BellOutlined } from '@ant-design/icons'
import api from '../services/api'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

const { Text } = Typography

export default function NotificacionesBadge() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  const { data: notifs = [] } = useQuery({
    queryKey: ['notificaciones'],
    queryFn: () => api.get('/alertas').then(r => r.data),
    refetchInterval: 30000
  })

  const marcarTodas = useMutation({
    mutationFn: () => api.put('/alertas/leer-todas'),
    onSuccess: () => qc.invalidateQueries(['notificaciones'])
  })

  const marcarUna = useMutation({
    mutationFn: (id) => api.put(`/alertas/${id}/leer`),
    onSuccess: () => qc.invalidateQueries(['notificaciones'])
  })

  const sinLeer = notifs.filter(n => !n.leida).length

  const handleClick = (n) => {
    if (!n.leida) marcarUna.mutate(n.id)
    if (n.referenciaTipo === 'lead' && n.referenciaId) {
      setOpen(false)
      navigate(`/leads/${n.referenciaId}`)
    }
  }

  const content = (
    <div style={{ width: 320 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <Text strong>Notificaciones</Text>
        {sinLeer > 0 && (
          <Button type="link" size="small" onClick={() => marcarTodas.mutate()}>
            Marcar todas como leídas
          </Button>
        )}
      </div>
      {notifs.length === 0 ? (
        <Empty description="Sin notificaciones" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <List
          dataSource={notifs.slice(0, 15)}
          style={{ maxHeight: 360, overflow: 'auto' }}
          renderItem={n => (
            <List.Item
              style={{
                padding: '8px 10px',
                background: !n.leida ? '#f0f5ff' : 'transparent',
                borderRadius: 6,
                marginBottom: 2,
                cursor: n.referenciaTipo === 'lead' ? 'pointer' : 'default',
                border: 'none'
              }}
              onClick={() => handleClick(n)}
            >
              <div style={{ width: '100%' }}>
                <Text style={{ fontSize: 13, display: 'block' }}>{n.mensaje}</Text>
                <Text type="secondary" style={{ fontSize: 11 }}>
                  {formatDistanceToNow(new Date(n.creadoEn), { addSuffix: true, locale: es })}
                </Text>
              </div>
            </List.Item>
          )}
        />
      )}
    </div>
  )

  return (
    <Popover content={content} trigger="click" placement="bottomRight" open={open} onOpenChange={setOpen}>
      <Badge count={sinLeer} size="small">
        <Button type="text" icon={<BellOutlined style={{ fontSize: 18 }} />} />
      </Badge>
    </Popover>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/NotificacionesBadge.jsx
git commit -m "feat: notificaciones clickeables hacia lead + refetch 30s"
```

---

### Task 6: Frontend — Toggle en Mi Perfil

**Files:**
- Modify: `frontend/src/pages/perfil/MiPerfil.jsx`

Context: El archivo ya existe. Importa `{ Card, Form, Input, Button, App, Space, Tag }` de antd y `{ MailOutlined, CheckCircleOutlined, SettingOutlined }` de icons. Tiene un `useEffect` que llama `GET /email/config`.

- [ ] **Step 1: Actualizar MiPerfil.jsx con el toggle de notificaciones**

Reemplazar el contenido completo de `frontend/src/pages/perfil/MiPerfil.jsx`:

```jsx
import React, { useState, useEffect } from 'react'
import { Card, Form, Input, Button, App, Space, Tag, Switch } from 'antd'
import { MailOutlined, CheckCircleOutlined, SettingOutlined, BellOutlined } from '@ant-design/icons'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'

export default function MiPerfil() {
  const { usuario } = useAuth()
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const [guardando, setGuardando] = useState(false)
  const [emailConfigurado, setEmailConfigurado] = useState(null)
  const [notificacionesActivas, setNotificacionesActivas] = useState(true)
  const [guardandoNotif, setGuardandoNotif] = useState(false)

  useEffect(() => {
    api.get('/email/config').then(r => {
      setEmailConfigurado(r.data.smtpEmail)
      if (r.data.smtpEmail) form.setFieldValue('smtpEmail', r.data.smtpEmail)
    }).catch(() => {})

    api.get('/alertas/preferencias').then(r => {
      setNotificacionesActivas(r.data.notificacionesActivas)
    }).catch(() => {})
  }, [])

  const handleGuardar = async () => {
    try {
      const valores = await form.validateFields()
      setGuardando(true)
      await api.put('/email/config', valores)
      message.success('Email configurado correctamente')
      setEmailConfigurado(valores.smtpEmail)
    } catch (err) {
      if (err?.errorFields) return
      message.error(err.response?.data?.error || 'No se pudo guardar')
    } finally {
      setGuardando(false)
    }
  }

  const handleToggleNotif = async (valor) => {
    setGuardandoNotif(true)
    try {
      await api.put('/alertas/preferencias', { notificacionesActivas: valor })
      setNotificacionesActivas(valor)
      message.success(valor ? 'Notificaciones activadas' : 'Notificaciones desactivadas')
    } catch {
      message.error('No se pudo actualizar')
    } finally {
      setGuardandoNotif(false)
    }
  }

  return (
    <div style={{ maxWidth: 560, margin: '32px auto', padding: '0 16px' }}>
      <h2 style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 8 }}>
        <SettingOutlined /> Mi Perfil
      </h2>

      <Card title="Información de cuenta" style={{ marginBottom: 20 }}>
        <Space direction="vertical" size={4}>
          <div><strong>Nombre:</strong> {usuario?.nombre} {usuario?.apellido}</div>
          <div><strong>Email CRM:</strong> {usuario?.email}</div>
          <div><strong>Rol:</strong> <Tag>{usuario?.rol?.replace(/_/g, ' ')}</Tag></div>
        </Space>
      </Card>

      <Card
        title={<span><MailOutlined style={{ marginRight: 8, color: '#1677ff' }} />Email para envío de correos</span>}
        style={{ marginBottom: 20 }}
      >
        <p style={{ color: '#666', marginBottom: 16, fontSize: 13 }}>
          Configura el email desde el que se enviarán tus correos a clientes (ej: <strong>tuusuario@bodeparking.cl</strong>).
        </p>
        {emailConfigurado && (
          <div style={{ marginBottom: 16, padding: '8px 12px', background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
            <CheckCircleOutlined style={{ color: '#52c41a' }} />
            <span style={{ fontSize: 13 }}>Email configurado: <strong>{emailConfigurado}</strong></span>
          </div>
        )}
        <Form form={form} layout="vertical">
          <Form.Item
            label="Tu email (@bodeparking.cl)"
            name="smtpEmail"
            rules={[{ required: true, message: 'Ingresa tu email' }, { type: 'email', message: 'Email inválido' }]}
          >
            <Input prefix={<MailOutlined style={{ color: '#bbb' }} />} placeholder="tuusuario@bodeparking.cl" />
          </Form.Item>
          <Button type="primary" loading={guardando} onClick={handleGuardar}>Guardar</Button>
        </Form>
      </Card>

      <Card title={<span><BellOutlined style={{ marginRight: 8, color: '#faad14' }} />Notificaciones</span>}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 500 }}>Notificaciones de leads</div>
            <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
              Recibe alertas cuando llegue un lead nuevo o cambie de etapa
            </div>
          </div>
          <Switch
            checked={notificacionesActivas}
            onChange={handleToggleNotif}
            loading={guardandoNotif}
          />
        </div>
      </Card>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/perfil/MiPerfil.jsx
git commit -m "feat: toggle notificaciones de leads en Mi Perfil"
```

---

### Task 7: Push y verificar en producción

- [ ] **Step 1: Push a Railway**

```bash
git push origin main
```

- [ ] **Step 2: Esperar deploy (~1 min) y verificar**

```bash
sleep 60 && curl -s https://backend-production-1c52.up.railway.app/api/health
```

Resultado esperado: `{"status":"ok",...}`

- [ ] **Step 3: Probar creación de lead vía Comuro y verificar notificación**

```bash
curl -s -X POST https://backend-production-1c52.up.railway.app/api/leads/upsert \
  -H "Authorization: bp_16b21a567c47b4c1f672ce70972bf9422f17a23c1a85b146" \
  -H "Content-Type: application/json" \
  -d '{"phone":"56900000001","name":"Test Notif","internal_uuid":"notif-test-001","project":"Test"}'
```

Resultado esperado: `{"lead_id":"...","status":"created"}`

- [ ] **Step 4: Verificar que se crearon notificaciones en BD**

```bash
cd backend && DATABASE_URL="postgresql://bodeparking:bodeparking2026!@monorail.proxy.rlwy.net:35865/bodeparkingcrm" node -e "
const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()
p.notificacion.findMany({ where: { tipo: 'LEAD_NUEVO' }, orderBy: { creadoEn: 'desc' }, take: 5 })
  .then(r => { console.log(JSON.stringify(r, null, 2)); p.\$disconnect() })
"
```

Resultado esperado: array con al menos 1 notificación tipo `LEAD_NUEVO`.
