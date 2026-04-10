# Rediseño Frontend BodeParking CRM — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rediseñar Layout, Login, Dashboard y Legal con estética "Clean & Claro" — sidebar blanco, tipografía Plus Jakarta Sans + Inter, embudo trapecio y tabla legal compacta.

**Architecture:** Solo cambios de presentación — sin tocar lógica de datos, queries ni backend. Todas las páginas se benefician del nuevo Layout automáticamente. Dashboard conserva toda su lógica actual, solo cambia la presentación de stats y embudo.

**Tech Stack:** React, Ant Design, Google Fonts (Plus Jakarta Sans + Inter), CSS-in-JS inline styles.

---

## Archivos a modificar

| Archivo | Qué cambia |
|---|---|
| `frontend/index.html` | Agregar Google Fonts `<link>` |
| `frontend/src/index.css` | `body { font-family: 'Inter', sans-serif }` |
| `frontend/src/App.jsx` | ConfigProvider theme: `colorPrimary: '#1d4ed8'`, `fontFamily: 'Inter, sans-serif'` |
| `frontend/src/components/Layout.jsx` | Sidebar blanco + secciones + header rediseñado |
| `frontend/src/pages/auth/Login.jsx` | Ajustes menores tipografía y espaciado |
| `frontend/src/pages/dashboard/Dashboard.jsx` | 4 stat cards + embudo trapecio + tabla legal widget |
| `frontend/src/pages/ventas/Legal.jsx` | Tabla compacta con barra de progreso de 4 segmentos |

---

### Task 1: Fuentes y theme token global

**Files:**
- Modify: `frontend/index.html`
- Modify: `frontend/src/index.css`
- Modify: `frontend/src/App.jsx`

- [ ] **Step 1: Agregar Google Fonts en index.html**

Reemplazar:
```html
<title>frontend</title>
```
Con:
```html
<title>BodeParking CRM</title>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
```

- [ ] **Step 2: Actualizar index.css**

Agregar al final de `frontend/src/index.css`:
```css
body {
  font-family: 'Inter', sans-serif;
  background: #f0f4f8;
}
```

- [ ] **Step 3: Actualizar ConfigProvider en App.jsx**

En `frontend/src/App.jsx`, cambiar el theme token:
```jsx
theme={{
  token: {
    colorPrimary: '#1d4ed8',
    borderRadius: 8,
    fontFamily: 'Inter, sans-serif',
  },
}}
```

- [ ] **Step 4: Verificar en browser**

Abrir `http://localhost:5173`. La fuente del body debe ser Inter (verificar en DevTools → Computed → font-family).

- [ ] **Step 5: Commit**

```bash
git add frontend/index.html frontend/src/index.css frontend/src/App.jsx
git commit -m "feat: fuentes Plus Jakarta Sans + Inter, theme token azul"
```

---

### Task 2: Layout — sidebar blanco con secciones y header rediseñado

**Files:**
- Modify: `frontend/src/components/Layout.jsx`

El sidebar actual usa `background: '#001529'` (azul marino Ant Design). Lo reemplazamos por sidebar blanco con secciones agrupadas y header con buscador centrado.

- [ ] **Step 1: Reemplazar SidebarContent completo**

Reemplazar toda la función `SidebarContent` (líneas 43-118) en `frontend/src/components/Layout.jsx`:

```jsx
function SidebarContent({ selectedKey, onNavigate }) {
  const { usuario, logout } = useAuth()
  const navigate = useNavigate()

  const { data: solicitudesPendientes = [] } = useQuery({
    queryKey: ['solicitudes-descuento-pendientes-nav'],
    queryFn: () => api.get('/descuentos', { params: { estado: 'PENDIENTE' } }).then(r => r.data),
    refetchInterval: 30000,
    staleTime: 20000,
  })
  const nPendientes = solicitudesPendientes.length

  const handleLogout = () => { logout(); navigate('/login') }

  const NAV_SECTIONS = [
    {
      label: 'General',
      items: [
        { key: '/dashboard',  label: 'Dashboard',   icon: <DashboardOutlined />, roles: null },
        { key: '/inventario', label: 'Inventario',  icon: <AppstoreOutlined />,  roles: ['GERENTE','JEFE_VENTAS'] },
        { key: '/leads',      label: 'Leads',       icon: <TeamOutlined />,      roles: null },
        { key: '/visitas',    label: 'Visitas',     icon: <CalendarOutlined />,  roles: ['GERENTE','JEFE_VENTAS'] },
      ]
    },
    {
      label: 'Ventas',
      items: [
        { key: '/ventas',      label: 'Ventas',     icon: <ShoppingOutlined />,   roles: ['GERENTE','JEFE_VENTAS','ABOGADO'] },
        { key: '/legal',       label: 'Legal',      icon: <AuditOutlined />,      roles: ['GERENTE','JEFE_VENTAS','ABOGADO'] },
        { key: '/pagos',       label: 'Pagos',      icon: <CreditCardOutlined />, roles: ['GERENTE','JEFE_VENTAS'] },
        { key: '/comisiones',  label: 'Comisiones', icon: <DollarOutlined />,     roles: null },
      ]
    },
    {
      label: 'Gestión',
      items: [
        { key: '/promociones', label: 'Promociones',  icon: <TagOutlined />,        roles: null },
        { key: '/descuentos',  label: 'Descuentos',   icon: <PercentageOutlined />, roles: null, badge: nPendientes },
        { key: '/arriendos',   label: 'Arriendos',    icon: <CarOutlined />,        roles: ['GERENTE','JEFE_VENTAS'] },
        { key: '/llaves',      label: 'Llaves',       icon: <KeyOutlined />,        roles: ['GERENTE','JEFE_VENTAS'] },
      ]
    },
    {
      label: 'Admin',
      items: [
        { key: '/equipo',                label: 'Equipo',          icon: <UserSwitchOutlined />,  roles: ['GERENTE'] },
        { key: '/reportes',              label: 'Reportes',        icon: <BarChartOutlined />,    roles: ['GERENTE','JEFE_VENTAS'] },
        { key: '/automatizaciones',      label: 'Automatizaciones',icon: <ThunderboltOutlined />, roles: ['GERENTE','JEFE_VENTAS'] },
        { key: '/configuracion/api-keys',label: 'API Keys',        icon: <ApiOutlined />,         roles: ['GERENTE'] },
      ]
    },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#fff' }}>
      {/* Logo */}
      <div style={{ padding: '16px 18px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 30, height: 30, borderRadius: 7,
          background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, color: '#fff', fontWeight: 800,
          fontFamily: "'Plus Jakarta Sans', sans-serif", flexShrink: 0,
        }}>BP</div>
        <div>
          <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 13, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.3px' }}>BodeParking</div>
          <div style={{ fontSize: 9, color: '#94a3b8' }}>CRM Inmobiliario</div>
        </div>
      </div>

      {/* UF pill */}
      <div style={{ margin: '8px 12px' }}>
        <UFDisplay />
      </div>

      {/* Nav */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 8px' }}>
        {NAV_SECTIONS.map(section => {
          const visibles = section.items.filter(item => !item.roles || item.roles.includes(usuario?.rol))
          if (!visibles.length) return null
          return (
            <div key={section.label}>
              <div style={{ fontSize: 9, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1.2px', padding: '8px 8px 3px' }}>
                {section.label}
              </div>
              {visibles.map(item => {
                const isActive = selectedKey === item.key
                return (
                  <div
                    key={item.key}
                    onClick={() => onNavigate(item.key)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '7px 9px', borderRadius: 7, cursor: 'pointer',
                      fontSize: 12, fontWeight: isActive ? 600 : 500,
                      color: isActive ? '#1d4ed8' : '#475569',
                      background: isActive ? '#eff6ff' : 'transparent',
                      marginBottom: 1, transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = '#f8fafc' }}
                    onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
                  >
                    <span style={{ fontSize: 13, color: isActive ? '#1d4ed8' : '#94a3b8', width: 16, textAlign: 'center', flexShrink: 0 }}>
                      {item.icon}
                    </span>
                    <span style={{ flex: 1 }}>{item.label}</span>
                    {item.badge > 0 && (
                      <span style={{ background: '#ef4444', color: '#fff', fontSize: 8, fontWeight: 700, padding: '1px 5px', borderRadius: 99 }}>
                        {item.badge}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>

      {/* Usuario */}
      <div style={{ padding: '10px 12px', borderTop: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          width: 28, height: 28, borderRadius: '50%',
          background: 'linear-gradient(135deg, #1d4ed8, #60a5fa)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 10, fontWeight: 700, color: '#fff', flexShrink: 0,
        }}>
          {usuario?.nombre?.[0]}{usuario?.apellido?.[0]}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {usuario?.nombre} {usuario?.apellido}
          </div>
          <div style={{ fontSize: 9, color: '#94a3b8' }}>{usuario?.rol?.replace(/_/g, ' ')}</div>
        </div>
        <Button
          type="text"
          size="small"
          icon={<LogoutOutlined />}
          onClick={handleLogout}
          style={{ color: '#cbd5e1', padding: '0 4px', minWidth: 0 }}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Actualizar el Layout principal**

Reemplazar la función `Layout` (líneas 120-194) en `frontend/src/components/Layout.jsx`:

```jsx
export default function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  const selectedKey = '/' + location.pathname.split('/')[1]

  const handleNavigate = (key) => {
    navigate(key)
    setMobileOpen(false)
  }

  return (
    <AntLayout style={{ minHeight: '100vh' }}>
      {/* Desktop sidebar */}
      <Sider
        width={220}
        style={{ background: '#fff', boxShadow: '2px 0 12px rgba(0,0,0,0.04)' }}
        breakpoint="md"
        collapsedWidth={0}
        trigger={null}
      >
        <SidebarContent selectedKey={selectedKey} onNavigate={handleNavigate} />
      </Sider>

      {/* Mobile drawer */}
      <Drawer
        placement="left"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        width={220}
        bodyStyle={{ padding: 0 }}
        headerStyle={{ display: 'none' }}
      >
        <SidebarContent selectedKey={selectedKey} onNavigate={handleNavigate} />
      </Drawer>

      <AntLayout>
        {/* Header */}
        <Header style={{
          background: '#fff',
          padding: '0 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          borderBottom: '1px solid #e2e8f0',
          height: 52,
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}>
          <Button
            type="text"
            icon={<MenuOutlined />}
            onClick={() => setMobileOpen(true)}
            className="mobile-menu-btn"
            style={{ display: 'none' }}
          />
          <div style={{ flex: 1, display: 'flex', justifyContent: 'center', padding: '0 16px' }}>
            <BuscadorUniversal />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <CalendarioWidget />
            <NotificacionesBadge />
          </div>
        </Header>

        {/* Content */}
        <Content style={{ padding: '24px', background: '#f0f4f8', minHeight: 'calc(100vh - 52px)' }}>
          <Outlet />
        </Content>
      </AntLayout>
    </AntLayout>
  )
}
```

- [ ] **Step 3: Verificar en browser**

Abrir `http://localhost:5173`. El sidebar debe ser blanco con secciones agrupadas, logo "BP" azul, fondo de página `#f0f4f8`.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/Layout.jsx
git commit -m "feat: sidebar blanco con secciones, header rediseñado"
```

---

### Task 3: UFDisplay — adaptar pill al sidebar blanco

**Files:**
- Modify: `frontend/src/components/UFDisplay.jsx`

El UFDisplay actual tiene estilos para fondo oscuro. Adaptarlo al sidebar blanco.

- [ ] **Step 1: Leer UFDisplay actual**

Leer `frontend/src/components/UFDisplay.jsx` para ver los estilos actuales.

- [ ] **Step 2: Actualizar estilos del pill**

El componente debe renderizar un pill con:
```jsx
<div style={{
  background: '#eff6ff',
  border: '1px solid #bfdbfe',
  borderRadius: 7,
  padding: '6px 10px',
  display: 'flex',
  alignItems: 'center',
  gap: 6,
}}>
  <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#3b82f6', flexShrink: 0 }} />
  <span style={{ fontSize: 9, color: '#64748b', fontWeight: 500 }}>UF hoy</span>
  <span style={{ fontSize: 10, fontWeight: 700, color: '#1d4ed8', marginLeft: 'auto' }}>
    {/* valor UF formateado */}
  </span>
</div>
```

Mantener toda la lógica de fetch/cache existente — solo cambiar los estilos del wrapper.

- [ ] **Step 3: Verificar en browser**

El pill UF debe verse azul claro en el sidebar blanco.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/UFDisplay.jsx
git commit -m "feat: UFDisplay adaptado a sidebar blanco"
```

---

### Task 4: Dashboard — 4 stats + embudo trapecio + widget legal

**Files:**
- Modify: `frontend/src/pages/dashboard/Dashboard.jsx`

**Contexto importante:** El Dashboard actual tiene:
- `resumen` — `{ totalLeads, notificacionesSinLeer }`
- `embudo` — array `[{ paso, cantidad }, ...]`
- `unidadesPorEstado` — array `[{ estado, _count: { id } }]`
- `ventasRecientes` — ventas del período (para la TablaVentas)
- `ventasActivas` — ventas en RESERVA/PROMESA/ESCRITURA (para TablaVentasActivas, tienen `procesoLegal`)

NO tocar: `calcPresetDates`, `PRESETS`, `TablaVentas`, `TablaVentasActivas`, `TimelineLegal`, `ResumenPagos`, `LEGAL_LABEL`, `PASOS_*`, `FECHA_POR_PASO`.

Solo reemplazar: `EmbudoVisual` y la función `Dashboard` (la parte de presentación del header, stats, embudo, y agregar el widget legal).

- [ ] **Step 1: Reemplazar EmbudoVisual con versión trapecio**

Reemplazar la función `EmbudoVisual` (líneas 61-106):

```jsx
const ANCHOS_EMBUDO = ['100%', '90%', '78%', '60%', '40%']
const COLORES_TRAPECIO = ['#1d4ed8', '#2563eb', '#3b82f6', '#60a5fa', '#93c5fd']

function EmbudoVisual({ datos }) {
  if (!datos?.length) return <div style={{ color: '#94a3b8', fontSize: 12, padding: '20px 0', textAlign: 'center' }}>Sin datos</div>
  const max = datos[0]?.cantidad || 1

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
      {datos.map((paso, i) => {
        const convPct = i > 0 && datos[i - 1].cantidad > 0
          ? Math.round((paso.cantidad / datos[i - 1].cantidad) * 100)
          : null
        const esUltimo = i === datos.length - 1
        const textColor = i >= 4 ? '#1e3a8a' : '#fff'
        const subTextColor = i >= 4 ? 'rgba(30,58,138,0.7)' : 'rgba(255,255,255,0.75)'

        return (
          <div key={paso.paso} style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ width: ANCHOS_EMBUDO[i] || '30%' }}>
              <div style={{
                background: COLORES_TRAPECIO[i] || '#bfdbfe',
                borderRadius: 3,
                padding: '8px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: textColor }}>{paso.paso}</span>
                <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 16, fontWeight: 800, color: textColor }}>{paso.cantidad}</span>
                {convPct !== null && (
                  <span style={{ fontSize: 9, fontWeight: 500, color: subTextColor }}>{convPct}%</span>
                )}
              </div>
            </div>
            {!esUltimo && (
              <div style={{ fontSize: 8, color: '#cbd5e1', lineHeight: 1.2 }}>▼</div>
            )}
          </div>
        )
      })}
      {datos.length >= 2 && (
        <div style={{ marginTop: 8, fontSize: 10, color: '#94a3b8', textAlign: 'center' }}>
          Conversión total{' '}
          <strong style={{ color: '#1d4ed8' }}>
            {datos[0].cantidad > 0 ? Math.round((datos[datos.length - 1].cantidad / datos[0].cantidad) * 100) : 0}%
          </strong>
          {' · '}{datos[0].cantidad} leads → {datos[datos.length - 1].cantidad} escrituras
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Agregar componente LegalWidget**

Agregar antes de `export default function Dashboard()`:

```jsx
function LegalWidget({ ventasActivas }) {
  const navigate = useNavigate()
  const ventasLegal = (ventasActivas || [])
    .filter(v => ['PROMESA', 'ESCRITURA'].includes(v.estado) && v.procesoLegal)
    .slice(0, 6)

  if (!ventasLegal.length) return (
    <div style={{ color: '#94a3b8', fontSize: 12, padding: '20px 0', textAlign: 'center' }}>Sin procesos legales activos</div>
  )

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
      <thead>
        <tr>
          <th style={{ background: '#f8fafc', padding: '5px 8px', fontWeight: 600, color: '#64748b', borderBottom: '1px solid #e2e8f0', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.6px', textAlign: 'left' }}>Comprador</th>
          <th style={{ background: '#f8fafc', padding: '5px 8px', fontWeight: 600, color: '#64748b', borderBottom: '1px solid #e2e8f0', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.6px', textAlign: 'left' }}>Paso actual</th>
          <th style={{ background: '#f8fafc', padding: '5px 8px', fontWeight: 600, color: '#64748b', borderBottom: '1px solid #e2e8f0', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.6px', textAlign: 'left' }}>Progreso</th>
        </tr>
      </thead>
      <tbody>
        {ventasLegal.map(v => {
          const pl = v.procesoLegal
          const pasos = pl.tienePromesa === false ? PASOS_SIN_PROMESA : PASOS_CON_PROMESA
          const idx = pasos.indexOf(pl.estadoActual)
          const campo = FECHA_POR_PASO[pl.estadoActual]
          const fecha = campo && pl[campo]
          const vencido = fecha && isPast(new Date(fecha)) && pl.estadoActual !== 'ENTREGADO'
          const sinFecha = !fecha && pl.estadoActual !== 'ENTREGADO'

          const badgeStyle = vencido
            ? { background: '#fef2f2', color: '#ef4444' }
            : sinFecha
            ? { background: '#f8fafc', color: '#94a3b8' }
            : fecha && new Date(fecha) - new Date() < 7 * 86400000
            ? { background: '#fffbeb', color: '#d97706' }
            : { background: '#eff6ff', color: '#1d4ed8' }

          const us = v.unidades || []
          const unidadLabel = us.length > 0
            ? us.map(u => `${u.tipo === 'BODEGA' ? 'Bodega' : 'Est.'} ${u.numero}`).join(', ')
            : '—'

          return (
            <tr key={v.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/ventas/${v.id}`)}>
              <td style={{ padding: '7px 8px', borderBottom: '1px solid #f8fafc' }}>
                <div style={{ fontWeight: 600, color: '#1e293b', fontSize: 11 }}>{v.comprador?.nombre} {v.comprador?.apellido}</div>
                <div style={{ color: '#94a3b8', fontSize: 9 }}>{unidadLabel}</div>
              </td>
              <td style={{ padding: '7px 8px', borderBottom: '1px solid #f8fafc' }}>
                <span style={{ ...badgeStyle, fontSize: 9, fontWeight: 600, padding: '2px 7px', borderRadius: 99, display: 'inline-block' }}>
                  {vencido ? '⚠ ' : ''}{LEGAL_LABEL[pl.estadoActual]}{fecha && !vencido ? ` · ${format(new Date(fecha), 'd MMM', { locale: es })}` : ''}
                </span>
              </td>
              <td style={{ padding: '7px 8px', borderBottom: '1px solid #f8fafc' }}>
                <div style={{ display: 'flex', gap: 2 }}>
                  {pasos.map((_, pi) => (
                    <div key={pi} style={{
                      height: 3, flex: 1, borderRadius: 99,
                      background: pi < idx ? '#1d4ed8' : pi === idx ? (vencido ? '#ef4444' : '#f59e0b') : '#e2e8f0'
                    }} />
                  ))}
                </div>
                <div style={{ fontSize: 8, color: '#94a3b8', marginTop: 2 }}>{idx + 1}/{pasos.length}</div>
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
```

- [ ] **Step 3: Reemplazar la función Dashboard principal**

Reemplazar `export default function Dashboard()` completo:

```jsx
export default function Dashboard() {
  const navigate = useNavigate()
  const [presetActivo, setPresetActivo] = useState('mes')
  const [rangoCustom, setRangoCustom] = useState(null)
  const [fechaParams, setFechaParams] = useState(() => calcPresetDates('mes'))

  const aplicarPreset = (key) => {
    setPresetActivo(key)
    setRangoCustom(null)
    setFechaParams(calcPresetDates(key))
  }

  const aplicarRango = (dates) => {
    setPresetActivo(null)
    setRangoCustom(dates)
    if (dates) {
      setFechaParams({
        desde: dates[0].startOf('day').toISOString(),
        hasta: dates[1].endOf('day').toISOString()
      })
    }
  }

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', fechaParams],
    queryFn: ({ queryKey }) => api.get('/dashboard', { params: queryKey[1] }).then(r => r.data)
  })

  if (isLoading) return <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>

  const { resumen, embudo, unidadesPorEstado, ventasRecientes, ventasActivas } = data || {}
  const totalUnidades = unidadesPorEstado?.reduce((s, u) => s + u._count.id, 0) || 1
  const unidadesOcupadas = unidadesPorEstado?.filter(u => u.estado !== 'DISPONIBLE').reduce((s, u) => s + u._count.id, 0) || 0
  const ocupacionPct = totalUnidades > 0 ? Math.round((unidadesOcupadas / totalUnidades) * 100) : 0
  const ventasEnLegal = (ventasActivas || []).filter(v => ['PROMESA', 'ESCRITURA'].includes(v.estado)).length
  const alertasLegal = (ventasActivas || []).filter(v => {
    const pl = v.procesoLegal
    if (!pl) return false
    const campo = FECHA_POR_PASO[pl.estadoActual]
    return campo && pl[campo] && isPast(new Date(pl[campo])) && pl.estadoActual !== 'ENTREGADO'
  }).length

  const hoy = format(new Date(), "EEEE d 'de' MMMM, yyyy", { locale: es })

  const STAT_CARDS = [
    {
      label: 'Ventas del período',
      value: ventasRecientes?.length || 0,
      hint: `${(ventasActivas || []).filter(v => v.estado === 'RESERVA').length} en reserva`,
      highlight: true,
    },
    {
      label: 'Leads activos',
      value: resumen?.totalLeads || 0,
      hint: `${resumen?.notificacionesSinLeer || 0} notif. sin leer`,
    },
    {
      label: 'Ocupación',
      value: `${ocupacionPct}%`,
      hint: `${unidadesOcupadas} de ${totalUnidades} unidades`,
    },
    {
      label: 'En proceso legal',
      value: ventasEnLegal,
      hint: alertasLegal > 0 ? `${alertasLegal} con fechas vencidas` : 'Sin alertas',
      hintColor: alertasLegal > 0 ? '#f59e0b' : '#10b981',
    },
  ]

  return (
    <div style={{ maxWidth: 1300 }}>
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 20, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.4px' }}>
          Dashboard
        </div>
        <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2, textTransform: 'capitalize' }}>{hoy}</div>
      </div>

      {/* Period tabs */}
      <div style={{ display: 'flex', gap: 3, background: '#f1f5f9', borderRadius: 8, padding: 3, marginBottom: 16, width: 'fit-content', flexWrap: 'wrap' }}>
        {PRESETS.map(p => (
          <div
            key={p.key}
            onClick={() => aplicarPreset(p.key)}
            style={{
              padding: '5px 12px', borderRadius: 6, cursor: 'pointer',
              fontSize: 11, fontWeight: presetActivo === p.key ? 600 : 500,
              color: presetActivo === p.key ? '#1d4ed8' : '#64748b',
              background: presetActivo === p.key ? '#fff' : 'transparent',
              boxShadow: presetActivo === p.key ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.15s',
            }}
          >{p.label}</div>
        ))}
        <DatePicker.RangePicker
          size="small"
          value={rangoCustom}
          onChange={aplicarRango}
          placeholder={['Desde', 'Hasta']}
          allowClear
          style={{ marginLeft: 4, height: 28 }}
        />
      </div>

      {/* 4 Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 16 }}>
        {STAT_CARDS.map((s, i) => (
          <div key={i} style={{
            background: s.highlight ? 'linear-gradient(135deg, #1d4ed8, #3b82f6)' : '#fff',
            border: s.highlight ? 'none' : '1px solid #e2e8f0',
            borderRadius: 10, padding: 14,
          }}>
            <div style={{ fontSize: 9, fontWeight: 600, color: s.highlight ? 'rgba(255,255,255,0.65)' : '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 6 }}>
              {s.label}
            </div>
            <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 26, fontWeight: 800, color: s.highlight ? '#fff' : '#0f172a', lineHeight: 1 }}>
              {s.value}
            </div>
            <div style={{ fontSize: 10, color: s.highlight ? 'rgba(255,255,255,0.75)' : (s.hintColor || '#10b981'), marginTop: 4 }}>
              {s.hint}
            </div>
          </div>
        ))}
      </div>

      {/* Embudo + Legal */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 14, marginBottom: 16 }}>
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Embudo de ventas</div>
          </div>
          <EmbudoVisual datos={embudo} />
        </div>
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Proceso legal</div>
            <span onClick={() => navigate('/legal')} style={{ fontSize: 9, color: '#3b82f6', fontWeight: 500, cursor: 'pointer' }}>Ver legal →</span>
          </div>
          <LegalWidget ventasActivas={ventasActivas} />
        </div>
      </div>

      {/* Inventario */}
      <Card title="Inventario" size="small" style={{ marginBottom: 16 }}>
        {!unidadesPorEstado?.length ? (
          <div style={{ textAlign: 'center', color: '#aaa', padding: '20px 0' }}>Sin unidades</div>
        ) : (
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {unidadesPorEstado.map(u => (
              <div key={u.estado} style={{ minWidth: 120 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, textTransform: 'capitalize' }}>{u.estado.toLowerCase().replace('_', ' ')}</span>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>{u._count.id}</span>
                </div>
                <Progress
                  percent={Math.round((u._count.id / totalUnidades) * 100)}
                  showInfo={false}
                  strokeColor={u.estado === 'DISPONIBLE' ? '#52c41a' : u.estado === 'RESERVADO' ? '#faad14' : u.estado === 'VENDIDO' ? '#ef4444' : '#1677ff'}
                  size="small"
                />
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Tabla de ventas del período */}
      <TablaVentas ventas={ventasRecientes || []} />

      {/* Ventas activas */}
      <div style={{ marginTop: 16 }}>
        <TablaVentasActivas ventas={ventasActivas || []} />
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Agregar useNavigate al import (si no está)**

Verificar que `useNavigate` esté importado desde `react-router-dom` (ya está en el archivo actual).

- [ ] **Step 5: Verificar en browser**

Ir a `http://localhost:5173/dashboard`. Deben verse: 4 stat cards (primera azul), embudo trapecio, tabla legal compacta.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/dashboard/Dashboard.jsx
git commit -m "feat: dashboard con stats mejoradas, embudo trapecio y widget legal"
```

---

### Task 5: Legal.jsx — tabla compacta con progreso visual

**Files:**
- Modify: `frontend/src/pages/ventas/Legal.jsx`

**Contexto:** Legal.jsx actual usa Ant Design `<Table>` con columnas: Comprador/Unidades, Estado, Paso actual, Qué falta. Mantener toda la lógica (`calcFaltantes`, `ResumenVenta`, `TimelineExpandida`, queries, filtros) — solo reemplazar las columnas de la tabla y el render de paso actual.

- [ ] **Step 1: Reemplazar columnas de la tabla en Legal.jsx**

En `frontend/src/pages/ventas/Legal.jsx`, reemplazar el array `columns` (líneas 155-216):

```jsx
const columns = [
  {
    title: 'Comprador / Unidades', key: 'info',
    render: (_, v) => {
      const us = v.unidades || []
      return (
        <div>
          <Text strong style={{ fontSize: 13 }}>{v.comprador?.nombre} {v.comprador?.apellido}</Text>
          <div><Text type="secondary" style={{ fontSize: 11 }}>
            {us.length > 0 ? us.map(u => `${u.tipo === 'BODEGA' ? 'Bodega' : 'Est.'} ${u.numero}`).join(', ') : '—'}
            {us[0]?.edificio?.nombre ? ` — ${us[0].edificio.nombre}` : ''}
          </Text></div>
        </div>
      )
    }
  },
  {
    title: 'Estado', key: 'estado', width: 100,
    render: (_, v) => <Tag color={ESTADO_VENTA_COLOR[v.estado]}>{ESTADO_LABEL[v.estado]}</Tag>
  },
  {
    title: 'Paso actual', key: 'paso', width: 200,
    render: (_, v) => {
      if (!v.procesoLegal) return <Tag color="default">No iniciado</Tag>
      const pl = v.procesoLegal
      const campo = FECHA_POR_PASO[pl.estadoActual]
      const fecha = campo && pl[campo]
      const vencido = fecha && isPast(new Date(fecha)) && pl.estadoActual !== 'ENTREGADO'
      const sinFecha = !fecha && pl.estadoActual !== 'ENTREGADO'
      const badgeStyle = vencido
        ? { background: '#fef2f2', color: '#ef4444' }
        : sinFecha
        ? { background: '#f8fafc', color: '#94a3b8' }
        : fecha && new Date(fecha) - new Date() < 7 * 86400000
        ? { background: '#fffbeb', color: '#d97706' }
        : { background: '#eff6ff', color: '#1d4ed8' }
      return (
        <div>
          <span style={{ ...badgeStyle, fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 99, display: 'inline-block' }}>
            {vencido ? '⚠ ' : ''}{LEGAL_LABEL[pl.estadoActual]}
          </span>
          {fecha && (
            <div style={{ fontSize: 10, color: vencido ? '#ef4444' : '#94a3b8', marginTop: 2 }}>
              Límite: {format(new Date(fecha), 'd MMM', { locale: es })}
            </div>
          )}
        </div>
      )
    }
  },
  {
    title: 'Progreso', key: 'progreso', width: 140,
    render: (_, v) => {
      if (!v.procesoLegal) return null
      const pl = v.procesoLegal
      const pasos = pl.tienePromesa === false ? PASOS_SIN_PROMESA : PASOS_CON_PROMESA
      const idx = pasos.indexOf(pl.estadoActual)
      const campo = FECHA_POR_PASO[pl.estadoActual]
      const fecha = campo && pl[campo]
      const vencido = fecha && isPast(new Date(fecha)) && pl.estadoActual !== 'ENTREGADO'
      return (
        <div>
          <div style={{ display: 'flex', gap: 2 }}>
            {pasos.map((_, pi) => (
              <div key={pi} style={{
                height: 4, flex: 1, borderRadius: 99,
                background: pi < idx ? '#1d4ed8' : pi === idx ? (vencido ? '#ef4444' : '#f59e0b') : '#e2e8f0'
              }} />
            ))}
          </div>
          <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 3 }}>{idx + 1}/{pasos.length} pasos</div>
        </div>
      )
    }
  },
]
```

- [ ] **Step 2: Verificar en browser**

Ir a `http://localhost:5173/legal`. La tabla debe mostrar badge coloreado por paso y barra de progreso segmentada.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/ventas/Legal.jsx
git commit -m "feat: tabla legal compacta con barra de progreso segmentada"
```

---

### Task 6: Deploy

**Files:** ninguno nuevo

- [ ] **Step 1: Push a GitHub**

```bash
git push origin main
```

- [ ] **Step 2: Deploy a Railway**

```bash
railway up --detach
```

- [ ] **Step 3: Verificar en producción**

Abrir la URL de Railway y verificar que el nuevo diseño se ve correctamente en producción.

---

## Self-Review

**Spec coverage:**
- ✓ Fuentes Google Fonts (Task 1)
- ✓ Theme token `#1d4ed8` (Task 1)
- ✓ Sidebar blanco con secciones (Task 2)
- ✓ Header 52px con buscador y botones (Task 2)
- ✓ UFDisplay adaptado (Task 3)
- ✓ 4 stat cards (Task 4)
- ✓ Embudo trapecio (Task 4)
- ✓ Widget legal en dashboard (Task 4)
- ✓ Login — ya está bien, se beneficia del theme token
- ✓ Legal tabla compacta con progreso (Task 5)
- ✓ Deploy (Task 6)

**Consistencia:** `PASOS_SIN_PROMESA`, `PASOS_CON_PROMESA`, `FECHA_POR_PASO`, `LEGAL_LABEL`, `isPast` — usados en Task 4 (LegalWidget) y Task 5 (Legal.jsx), todos definidos en sus archivos respectivos. `format` de date-fns ya importado en ambos archivos.
