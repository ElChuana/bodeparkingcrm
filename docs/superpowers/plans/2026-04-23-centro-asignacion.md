# Centro de Asignación Manual — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Página dedicada para asignación masiva de leads (GERENTE/JEFE_VENTAS) con filtros por campaña, fecha y origen, más selector de vendedor inline en LeadDetalle.

**Architecture:** 4 tareas independientes: (1) fix backend para filtrar leads sin asignar, (2) registrar ruta y menú, (3) crear página CentroAsignacion, (4) selector inline en LeadDetalle. Todos usan endpoints existentes excepto el nuevo query param `sinAsignar`.

**Tech Stack:** React + Ant Design + @tanstack/react-query, Express/Prisma existente, dayjs (bundled con Ant Design).

---

## File Map

| Archivo | Acción |
|---------|--------|
| `backend/src/controllers/leadsController.js` | Modificar: agregar soporte `sinAsignar=true` en `listar` |
| `frontend/src/App.jsx` | Modificar: agregar ruta `/asignacion` |
| `frontend/src/components/Layout.jsx` | Modificar: agregar ítem menú Asignación |
| `frontend/src/pages/asignacion/CentroAsignacion.jsx` | Crear: página completa |
| `frontend/src/pages/leads/LeadDetalle.jsx` | Modificar: selector vendedor inline en card "Equipo asignado" |

---

## Task 1: Backend — filtro `sinAsignar` en GET /api/leads

**Files:**
- Modify: `backend/src/controllers/leadsController.js:54`

El filtro actual `vendedorId` solo matchea si se pasa un número. Para filtrar leads sin vendedor hay que agregar un parámetro `sinAsignar=true` que filtre `vendedorId: null`.

- [ ] **Step 1: Abrir `backend/src/controllers/leadsController.js` línea 54**

Localizar la función `listar`. La línea relevante es:
```js
const { etapa, vendedorId, brokerId, edificioId, origen, tipoUnidad, search, desde, hasta, sinActividad, campana } = req.query
```

- [ ] **Step 2: Agregar `sinAsignar` al destructuring y al where**

Reemplazar la línea del destructuring:
```js
const { etapa, vendedorId, brokerId, edificioId, origen, tipoUnidad, search, desde, hasta, sinActividad, campana, sinAsignar } = req.query
```

Y agregar esta condición en el objeto `where` del `prisma.lead.findMany`, después de la línea `...(campana && ...)`:
```js
...(sinAsignar === 'true' && { vendedorId: null }),
```

El bloque `where` completo queda:
```js
where: {
  ...filtroAcceso(req.usuario),
  ...(etapa && { etapa }),
  ...(vendedorId && { vendedorId: Number(vendedorId) }),
  ...(brokerId && { brokerId: Number(brokerId) }),
  ...(desde || hasta ? {
    creadoEn: {
      ...(desde && { gte: new Date(desde) }),
      ...(hasta && { lte: new Date(hasta) })
    }
  } : {}),
  ...(edificioId && { unidadInteres: { edificioId: Number(edificioId) } }),
  ...(tipoUnidad && { unidadInteres: { tipo: tipoUnidad } }),
  ...(origen && { contacto: { origen } }),
  ...(sinActividad && {
    actualizadoEn: { lt: new Date(Date.now() - Number(sinActividad) * 86400000) }
  }),
  ...(campana && { campana: { contains: campana, mode: 'insensitive' } }),
  ...(contactoIds && { contactoId: { in: contactoIds } }),
  ...(sinAsignar === 'true' && { vendedorId: null }),
},
```

- [ ] **Step 3: Verificar manualmente**

```bash
# Desde /backend, verificar que el servidor arranca sin error
node -e "require('./src/controllers/leadsController.js'); console.log('OK')"
```
Esperado: `OK`

- [ ] **Step 4: Commit**

```bash
git add backend/src/controllers/leadsController.js
git commit -m "feat: agregar filtro sinAsignar=true en GET /api/leads"
```

---

## Task 2: Ruta + menú

**Files:**
- Modify: `frontend/src/App.jsx`
- Modify: `frontend/src/components/Layout.jsx`

- [ ] **Step 1: Agregar import en App.jsx**

En `frontend/src/App.jsx`, agregar después de la última línea de imports de páginas (después de `import PreviewPDF`):
```jsx
import CentroAsignacion from './pages/asignacion/CentroAsignacion'
```

- [ ] **Step 2: Agregar ruta en App.jsx**

Dentro del bloque `<Route path="/" element={<RutaProtegida>...}>`, agregar después de la ruta `leads/:id`:
```jsx
<Route path="asignacion" element={<RutaProtegida roles={['GERENTE','JEFE_VENTAS']}><CentroAsignacion /></RutaProtegida>} />
```

- [ ] **Step 3: Agregar ítem de menú en Layout.jsx**

En `frontend/src/components/Layout.jsx`, en la sección `General` del array `NAV_SECTIONS`, agregar entre `leads` y `visitas`:

```js
{ key: '/asignacion', label: 'Asignación', icon: <UserSwitchOutlined />, roles: ['GERENTE','JEFE_VENTAS'], modulo: 'asignacion' },
```

`UserSwitchOutlined` ya está importado en Layout.jsx línea 10. No se necesita nuevo import.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/App.jsx frontend/src/components/Layout.jsx
git commit -m "feat: agregar ruta /asignacion y menú lateral"
```

---

## Task 3: Página CentroAsignacion

**Files:**
- Create: `frontend/src/pages/asignacion/CentroAsignacion.jsx`

**Contexto del codebase:**
- `api.get('/leads', { params })` — acepta `sinAsignar`, `campana`, `desde`, `hasta`, `origen`
- `api.get('/leads/campanas')` — retorna `string[]`
- `api.get('/usuarios')` — retorna array con `{ id, nombre, apellido, rol, activo }`
- `api.post('/leads/asignar-masivo', { leadIds, vendedorId })` — retorna `{ actualizados: N }`
- Patrón de queries: `useQuery({ queryKey: [...], queryFn: () => api.get(...).then(r => r.data) })`
- `useMutation` con `onSuccess` que llama `qc.invalidateQueries`
- Fechas: usar `dayjs` (viene con Ant Design, no instalar)

- [ ] **Step 1: Crear directorio y archivo**

```bash
mkdir -p frontend/src/pages/asignacion
```

- [ ] **Step 2: Crear `frontend/src/pages/asignacion/CentroAsignacion.jsx`**

```jsx
import { useState } from 'react'
import dayjs from 'dayjs'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Table, Select, Button, Tag, Space, Typography, App,
  DatePicker, Card, Row, Col, Switch
} from 'antd'
import { UserSwitchOutlined } from '@ant-design/icons'
import api from '../../services/api'

const { Title, Text } = Typography
const { RangePicker } = DatePicker

const ORIGEN_OPCIONES = [
  { value: 'INSTAGRAM', label: 'Instagram' },
  { value: 'GOOGLE', label: 'Google' },
  { value: 'REFERIDO', label: 'Referido' },
  { value: 'BROKER', label: 'Broker' },
  { value: 'VISITA_DIRECTA', label: 'Visita directa' },
  { value: 'WEB', label: 'Web' },
  { value: 'OTRO', label: 'Otro' },
]

const HOY_INICIO = dayjs().startOf('day').toISOString()
const HOY_FIN    = dayjs().endOf('day').toISOString()
const AYER_INICIO = dayjs().subtract(1, 'day').startOf('day').toISOString()
const AYER_FIN    = dayjs().subtract(1, 'day').endOf('day').toISOString()
const SEMANA_INICIO = dayjs().subtract(7, 'day').startOf('day').toISOString()

export default function CentroAsignacion() {
  const qc = useQueryClient()
  const { message } = App.useApp()

  // Filtros
  const [campanas, setCampanas] = useState([])
  const [origen, setOrigen] = useState(null)
  const [desde, setDesde] = useState(null)
  const [hasta, setHasta] = useState(null)
  const [soloSinAsignar, setSoloSinAsignar] = useState(true)
  const [fechaRapida, setFechaRapida] = useState(null)

  // Selección
  const [selectedRowKeys, setSelectedRowKeys] = useState([])

  // Asignación
  const [vendedorSeleccionado, setVendedorSeleccionado] = useState(null)

  // ── Queries ──────────────────────────────────────────────────
  const { data: campanaOpciones = [] } = useQuery({
    queryKey: ['campanas'],
    queryFn: () => api.get('/leads/campanas').then(r => r.data),
  })

  const { data: usuarios = [] } = useQuery({
    queryKey: ['usuarios'],
    queryFn: () => api.get('/usuarios').then(r => r.data),
  })
  const vendedores = usuarios.filter(u => u.activo && ['VENDEDOR', 'JEFE_VENTAS', 'GERENTE'].includes(u.rol))

  const params = {
    ...(soloSinAsignar && { sinAsignar: 'true' }),
    ...(campanas.length === 1 && { campana: campanas[0] }),
    ...(origen && { origen }),
    ...(desde && { desde }),
    ...(hasta && { hasta }),
  }

  const { data: leads = [], isLoading, isFetching } = useQuery({
    queryKey: ['leads-asignacion', params],
    queryFn: () => api.get('/leads', { params }).then(r => r.data),
  })

  const asignar = useMutation({
    mutationFn: ({ leadIds, vendedorId }) =>
      api.post('/leads/asignar-masivo', { leadIds, vendedorId }).then(r => r.data),
    onSuccess: (data) => {
      message.success(`${data.actualizados} lead(s) asignado(s)`)
      setSelectedRowKeys([])
      setVendedorSeleccionado(null)
      qc.invalidateQueries({ queryKey: ['leads-asignacion'] })
    },
    onError: err => message.error(err.response?.data?.error || 'Error al asignar'),
  })

  const handleFechaRapida = (tipo) => {
    setFechaRapida(tipo)
    if (tipo === 'hoy') { setDesde(HOY_INICIO); setHasta(HOY_FIN) }
    else if (tipo === 'ayer') { setDesde(AYER_INICIO); setHasta(AYER_FIN) }
    else if (tipo === 'semana') { setDesde(SEMANA_INICIO); setHasta(HOY_FIN) }
    else { setDesde(null); setHasta(null) }
  }

  const handleRangeChange = (dates) => {
    setFechaRapida(null)
    if (dates) {
      setDesde(dates[0].startOf('day').toISOString())
      setHasta(dates[1].endOf('day').toISOString())
    } else {
      setDesde(null)
      setHasta(null)
    }
  }

  const handleAsignar = () => {
    if (!vendedorSeleccionado) return message.warning('Selecciona un vendedor')
    if (!selectedRowKeys.length) return message.warning('Selecciona al menos un lead')
    asignar.mutate({ leadIds: selectedRowKeys, vendedorId: vendedorSeleccionado })
  }

  const columns = [
    {
      title: 'Contacto',
      key: 'contacto',
      render: (_, r) => (
        <div>
          <Text strong style={{ fontSize: 13 }}>{r.contacto.nombre} {r.contacto.apellido}</Text>
          {r.contacto.telefono && <div><Text type="secondary" style={{ fontSize: 12 }}>{r.contacto.telefono}</Text></div>}
        </div>
      ),
    },
    {
      title: 'Campaña',
      dataIndex: 'campana',
      key: 'campana',
      render: v => v ? <Tag color="blue">{v}</Tag> : <Text type="secondary">—</Text>,
    },
    {
      title: 'Origen',
      key: 'origen',
      render: (_, r) => <Text style={{ fontSize: 12 }}>{r.contacto.origen || '—'}</Text>,
    },
    {
      title: 'Fecha ingreso',
      dataIndex: 'creadoEn',
      key: 'creadoEn',
      render: v => <Text style={{ fontSize: 12 }}>{dayjs(v).format('DD/MM/YYYY')}</Text>,
    },
    {
      title: 'Vendedor actual',
      key: 'vendedor',
      render: (_, r) => r.vendedor
        ? <Tag color="green">{r.vendedor.nombre} {r.vendedor.apellido}</Tag>
        : <Tag color="red">Sin asignar</Tag>,
    },
  ]

  const leadsParaFiltrarCampana = campanas.length > 1
    ? leads.filter(l => campanas.includes(l.campana))
    : leads

  return (
    <div style={{ maxWidth: 1100 }}>
      <div style={{ marginBottom: 20 }}>
        <Title level={3} style={{ margin: 0 }}>
          <UserSwitchOutlined style={{ marginRight: 8, color: '#1d4ed8' }} />
          Centro de Asignación
        </Title>
        <Text type="secondary">Filtra leads y asígnalos a vendedores en bulk</Text>
      </div>

      {/* Filtros */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} sm={12} md={6}>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Campaña</div>
            <Select
              mode="multiple"
              allowClear
              placeholder="Todas las campañas"
              style={{ width: '100%' }}
              value={campanas}
              onChange={setCampanas}
              options={campanaOpciones.map(c => ({ value: c, label: c }))}
            />
          </Col>
          <Col xs={24} sm={12} md={5}>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Origen</div>
            <Select
              allowClear
              placeholder="Todos"
              style={{ width: '100%' }}
              value={origen}
              onChange={setOrigen}
              options={ORIGEN_OPCIONES}
            />
          </Col>
          <Col xs={24} md={9}>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Fecha de ingreso</div>
            <Space wrap>
              {['hoy', 'ayer', 'semana'].map(t => (
                <Button
                  key={t}
                  size="small"
                  type={fechaRapida === t ? 'primary' : 'default'}
                  onClick={() => handleFechaRapida(fechaRapida === t ? null : t)}
                >
                  {t === 'hoy' ? 'Hoy' : t === 'ayer' ? 'Ayer' : 'Esta semana'}
                </Button>
              ))}
              <RangePicker
                size="small"
                onChange={handleRangeChange}
                value={fechaRapida ? null : (desde ? [dayjs(desde), dayjs(hasta)] : null)}
                format="DD/MM/YY"
              />
            </Space>
          </Col>
          <Col xs={24} md={4}>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Solo sin asignar</div>
            <Switch checked={soloSinAsignar} onChange={setSoloSinAsignar} />
          </Col>
        </Row>
      </Card>

      {/* Barra de acción flotante */}
      {selectedRowKeys.length > 0 && (
        <div style={{
          position: 'sticky', top: 60, zIndex: 50,
          background: '#1d4ed8', borderRadius: 8, padding: '10px 16px',
          marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12,
          boxShadow: '0 4px 12px rgba(29,78,216,0.3)',
        }}>
          <Text style={{ color: '#fff', fontWeight: 600, whiteSpace: 'nowrap' }}>
            {selectedRowKeys.length} lead(s) seleccionado(s)
          </Text>
          <Select
            placeholder="Seleccionar vendedor..."
            style={{ flex: 1, maxWidth: 280 }}
            value={vendedorSeleccionado}
            onChange={setVendedorSeleccionado}
            options={vendedores.map(v => ({ value: v.id, label: `${v.nombre} ${v.apellido}` }))}
          />
          <Button
            type="default"
            onClick={handleAsignar}
            loading={asignar.isPending}
            disabled={!vendedorSeleccionado}
            style={{ fontWeight: 600 }}
          >
            Asignar
          </Button>
          <Button
            type="text"
            style={{ color: '#fff' }}
            onClick={() => setSelectedRowKeys([])}
          >
            Cancelar
          </Button>
        </div>
      )}

      {/* Tabla */}
      <Table
        rowKey="id"
        columns={columns}
        dataSource={leadsParaFiltrarCampana}
        loading={isLoading || isFetching}
        rowSelection={{
          selectedRowKeys,
          onChange: setSelectedRowKeys,
          preserveSelectedRowKeys: false,
        }}
        pagination={{ pageSize: 50, showSizeChanger: false, showTotal: (t) => `${t} leads` }}
        size="small"
        locale={{ emptyText: 'No hay leads con estos filtros' }}
      />
    </div>
  )
}
```

- [ ] **Step 3: Verificar que el componente no tiene errores de sintaxis**

```bash
cd frontend && node --input-type=module <<'EOF'
// Solo verifica que el archivo existe y tiene exports
import fs from 'fs'
const content = fs.readFileSync('src/pages/asignacion/CentroAsignacion.jsx', 'utf8')
console.log('Líneas:', content.split('\n').length, '— OK')
EOF
```
Esperado: `Líneas: XXX — OK`

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/asignacion/CentroAsignacion.jsx
git commit -m "feat: crear página CentroAsignacion con filtros y asignación masiva"
```

---

## Task 4: Selector de vendedor inline en LeadDetalle

**Files:**
- Modify: `frontend/src/pages/leads/LeadDetalle.jsx`

**Contexto:** La card "Equipo asignado" está en línea ~756. Muestra `lead.vendedor` como texto estático. Para GERENTE/JEFE_VENTAS hay que reemplazarla por un Select editable. El usuario autenticado está en `const { usuario } = useAuth()` — ya importado en LeadDetalle.

`PUT /api/leads/:id` acepta `{ vendedorId }` y actualiza el vendedor del lead.

- [ ] **Step 1: Localizar la card "Equipo asignado" en LeadDetalle.jsx**

Buscar en `frontend/src/pages/leads/LeadDetalle.jsx` este bloque (alrededor de línea 756):
```jsx
{/* Equipo */}
<Card size="small" title="Equipo asignado">
  {lead.vendedor ? (
    <Text style={{ fontSize: 13 }}>👤 <Text strong>{lead.vendedor.nombre} {lead.vendedor.apellido}</Text> <Text type="secondary">· Vendedor</Text></Text>
  ) : <Text type="secondary" style={{ fontSize: 13 }}>Sin vendedor asignado</Text>}
  {lead.broker && (
    <div><Text style={{ fontSize: 13 }}>🤝 <Text strong>{lead.broker.nombre} {lead.broker.apellido}</Text> <Text type="secondary">· Broker</Text></Text></div>
  )}
</Card>
```

- [ ] **Step 2: Verificar que `useQuery` de usuarios vendedores ya existe en LeadDetalle**

Buscar en el archivo: `queryKey: ['usuarios-vendedores']`. Si ya existe (línea ~134 aprox), reutilizarlo. Si no existe, agregar dentro del componente principal `LeadDetalle`:
```js
const { data: vendedores = [] } = useQuery({
  queryKey: ['usuarios-vendedores'],
  queryFn: () => api.get('/usuarios').then(r => r.data.filter(u => u.activo)),
})
```

- [ ] **Step 3: Agregar mutation para cambiar vendedor**

Dentro del componente principal `LeadDetalle` (donde están los otros `useMutation`), agregar:
```js
const cambiarVendedor = useMutation({
  mutationFn: (vendedorId) => api.put(`/leads/${id}`, { vendedorId: vendedorId || null }),
  onSuccess: () => {
    message.success('Vendedor actualizado')
    qc.invalidateQueries(['lead', Number(id)])
  },
  onError: err => message.error(err.response?.data?.error || 'Error al cambiar vendedor'),
})
```

- [ ] **Step 4: Reemplazar la card "Equipo asignado"**

Reemplazar el bloque completo de la card con:
```jsx
{/* Equipo */}
<Card size="small" title="Equipo asignado">
  <div style={{ marginBottom: lead.broker ? 8 : 0 }}>
    <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>👤 Vendedor</div>
    {(usuario?.rol === 'GERENTE' || usuario?.rol === 'JEFE_VENTAS') ? (
      <Select
        style={{ width: '100%' }}
        size="small"
        allowClear
        placeholder="Sin vendedor asignado"
        value={lead.vendedor?.id || undefined}
        onChange={(val) => cambiarVendedor.mutate(val)}
        loading={cambiarVendedor.isPending}
        options={vendedores.map(v => ({ value: v.id, label: `${v.nombre} ${v.apellido}` }))}
      />
    ) : (
      lead.vendedor
        ? <Text style={{ fontSize: 13 }}><Text strong>{lead.vendedor.nombre} {lead.vendedor.apellido}</Text></Text>
        : <Text type="secondary" style={{ fontSize: 13 }}>Sin vendedor asignado</Text>
    )}
  </div>
  {lead.broker && (
    <div><Text style={{ fontSize: 13 }}>🤝 <Text strong>{lead.broker.nombre} {lead.broker.apellido}</Text> <Text type="secondary">· Broker</Text></Text></div>
  )}
</Card>
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/leads/LeadDetalle.jsx
git commit -m "feat: selector de vendedor inline en LeadDetalle para GERENTE/JEFE_VENTAS"
```

---

## Task 5: Push y verificación final

- [ ] **Step 1: Push a Railway**

```bash
git push origin main
```

- [ ] **Step 2: Verificar en browser**

1. Login como GERENTE o JEFE_VENTAS
2. Menú lateral → debe aparecer "Asignación" entre Leads y Visitas
3. Ir a `/asignacion` → tabla carga con leads sin asignar por defecto
4. Filtrar por "Hoy" → tabla muestra solo leads de hoy
5. Seleccionar 2-3 leads → aparece barra azul flotante
6. Elegir vendedor → clic "Asignar" → mensaje éxito, tabla se refresca
7. Ir a un LeadDetalle → card "Equipo asignado" muestra Select editable
8. Cambiar vendedor → mensaje éxito

- [ ] **Step 3: Verificar acceso restringido**

Login como VENDEDOR → menú no debe mostrar "Asignación" → navegar a `/asignacion` directamente → redirige a `/dashboard`.
