# Permisos de Módulos por Usuario — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir al GERENTE configurar desde Equipo qué módulos del sidebar ve cada usuario individualmente, sobreescribiendo los defaults de rol.

**Architecture:** Campo `modulosVisibles String[]` en Usuario (vacío = usa rol por defecto). El middleware JWT incluye este campo en `req.usuario`. El sidebar de Layout usa la lista si tiene contenido; si no, usa la lógica de roles existente. Equipo agrega un botón "Módulos" por fila que abre un modal con checkboxes.

**Tech Stack:** Prisma (PostgreSQL), Express, React, Ant Design, TanStack Query

---

## File Map

| Archivo | Cambio |
|---------|--------|
| `backend/prisma/schema.prisma` | Agregar `modulosVisibles String[] @default([])` a Usuario |
| `backend/src/middleware/auth.js` | Incluir `modulosVisibles` en el select del JWT middleware |
| `backend/src/controllers/authController.js` | Incluir `modulosVisibles` en la respuesta del login |
| `backend/src/controllers/usuariosController.js` | Incluir `modulosVisibles` en selects y en actualizar |
| `frontend/src/components/Layout.jsx` | Nueva lógica de filtro sidebar |
| `frontend/src/pages/equipo/Equipo.jsx` | Botón "Módulos" + ModalModulos component |

---

### Task 1: Schema — agregar modulosVisibles a Usuario

**Files:**
- Modify: `backend/prisma/schema.prisma:204`

- [ ] **Step 1: Agregar el campo al schema**

En `backend/prisma/schema.prisma`, después de `notificacionesActivas Boolean @default(true)` (línea 204), agregar:

```prisma
  notificacionesActivas Boolean   @default(true)
  modulosVisibles       String[]  @default([])
```

- [ ] **Step 2: Correr la migración**

```bash
cd backend
npx prisma migrate dev --name add-modulos-visibles
```

Resultado esperado: `✓ Generated Prisma Client` y `The following migration(s) have been created and applied`

- [ ] **Step 3: Verificar en DB que la columna existe**

```bash
DATABASE_URL="postgresql://bodeparking:bodeparking2026!@monorail.proxy.rlwy.net:35865/bodeparkingcrm" \
node -e "
const { PrismaClient } = require('./node_modules/@prisma/client')
const p = new PrismaClient()
p.usuario.findFirst({ select: { id: true, modulosVisibles: true } })
  .then(u => { console.log('OK:', u); p.\$disconnect() })
"
```

Resultado esperado: `OK: { id: 7, modulosVisibles: [] }`

- [ ] **Step 4: Commit**

```bash
git add backend/prisma/schema.prisma backend/prisma/migrations/
git commit -m "feat: agregar campo modulosVisibles a Usuario"
```

---

### Task 2: Backend — exponer modulosVisibles en auth middleware, login y usuariosController

**Files:**
- Modify: `backend/src/middleware/auth.js:17`
- Modify: `backend/src/controllers/authController.js:33-38`
- Modify: `backend/src/controllers/usuariosController.js`

- [ ] **Step 1: Actualizar auth middleware**

En `backend/src/middleware/auth.js`, línea 17, cambiar el select para incluir `modulosVisibles`:

```js
      select: { id: true, nombre: true, apellido: true, email: true, rol: true, activo: true, modulosVisibles: true }
```

- [ ] **Step 2: Actualizar respuesta del login**

En `backend/src/controllers/authController.js`, en la función `login`, cambiar el objeto `usuario` en la respuesta (líneas 33-39):

```js
    res.json({
      token,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        email: usuario.email,
        rol: usuario.rol,
        modulosVisibles: usuario.modulosVisibles
      }
    })
```

- [ ] **Step 3: Actualizar listar, obtener y actualizar en usuariosController**

En `backend/src/controllers/usuariosController.js`, hay 4 funciones con `select`. Agregar `modulosVisibles: true` a cada una y aceptar `modulosVisibles` en el update.

Función `listar` (líneas 8-11) — cambiar el select:
```js
      select: {
        id: true, nombre: true, apellido: true, email: true,
        telefono: true, rol: true, comisionPorcentaje: true,
        comisionFijo: true, activo: true, creadoEn: true, modulosVisibles: true
      },
```

Función `obtener` (líneas 28-31) — mismo cambio:
```js
      select: {
        id: true, nombre: true, apellido: true, email: true,
        telefono: true, rol: true, comisionPorcentaje: true,
        comisionFijo: true, activo: true, creadoEn: true, modulosVisibles: true
      }
```

Función `crear` (líneas 67-70) — mismo cambio al select del `create`:
```js
      select: {
        id: true, nombre: true, apellido: true, email: true,
        telefono: true, rol: true, comisionPorcentaje: true,
        comisionFijo: true, activo: true, creadoEn: true, modulosVisibles: true
      }
```

Función `actualizar` (líneas 81-99) — aceptar `modulosVisibles` en body y data:

```js
const actualizar = async (req, res) => {
  const { id } = req.params
  const { nombre, apellido, email, telefono, rol, comisionPorcentaje, comisionFijo, activo, modulosVisibles } = req.body

  try {
    const usuario = await prisma.usuario.update({
      where: { id: Number(id) },
      data: { nombre, apellido, email, telefono, rol, comisionPorcentaje, comisionFijo, activo,
        ...(modulosVisibles !== undefined && { modulosVisibles }) },
      select: {
        id: true, nombre: true, apellido: true, email: true,
        telefono: true, rol: true, comisionPorcentaje: true,
        comisionFijo: true, activo: true, modulosVisibles: true
      }
    })
    res.json(usuario)
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Usuario no encontrado.' })
    res.status(500).json({ error: 'Error al actualizar usuario.' })
  }
}
```

- [ ] **Step 4: Probar que el login devuelve modulosVisibles**

```bash
curl -s -X POST https://backend-production-1c52.up.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"jgonzalez@bodeparking.cl","password":"bodeparking2026"}' | \
  node -e "let d=''; process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).usuario))"
```

Resultado esperado: objeto usuario con `modulosVisibles: []`

- [ ] **Step 5: Commit**

```bash
git add backend/src/middleware/auth.js backend/src/controllers/authController.js backend/src/controllers/usuariosController.js
git commit -m "feat: exponer modulosVisibles en auth y usuariosController"
```

---

### Task 3: Frontend — Layout sidebar respeta modulosVisibles

**Files:**
- Modify: `frontend/src/components/Layout.jsx:39-70` (NAV_SECTIONS y filtro)

- [ ] **Step 1: Agregar propiedad `modulo` a cada item de NAV_SECTIONS**

En `frontend/src/components/Layout.jsx`, reemplazar el array `NAV_SECTIONS` completo (líneas 35-72):

```js
  const NAV_SECTIONS = [
    {
      label: 'General',
      items: [
        { key: '/dashboard',  label: 'Dashboard',   icon: <DashboardOutlined />, roles: null,                              modulo: 'dashboard' },
        { key: '/inventario', label: 'Inventario',  icon: <AppstoreOutlined />,  roles: ['GERENTE','JEFE_VENTAS'],          modulo: 'inventario' },
        { key: '/leads',      label: 'Leads',       icon: <TeamOutlined />,      roles: null,                              modulo: 'leads' },
        { key: '/visitas',    label: 'Visitas',     icon: <CalendarOutlined />,  roles: ['GERENTE','JEFE_VENTAS'],          modulo: 'visitas' },
      ]
    },
    {
      label: 'Ventas',
      items: [
        { key: '/ventas',      label: 'Ventas',     icon: <ShoppingOutlined />,   roles: ['GERENTE','JEFE_VENTAS','ABOGADO'], modulo: 'ventas' },
        { key: '/legal',       label: 'Legal',      icon: <AuditOutlined />,      roles: ['GERENTE','JEFE_VENTAS','ABOGADO'], modulo: 'legal' },
        { key: '/pagos',       label: 'Pagos',      icon: <CreditCardOutlined />, roles: ['GERENTE','JEFE_VENTAS'],           modulo: 'pagos' },
        { key: '/comisiones',  label: 'Comisiones', icon: <DollarOutlined />,     roles: null,                               modulo: 'comisiones' },
      ]
    },
    {
      label: 'Gestión',
      items: [
        { key: '/promociones', label: 'Promociones',  icon: <TagOutlined />,        roles: null,                     modulo: 'promociones',    badge: undefined },
        { key: '/descuentos',  label: 'Descuentos',   icon: <PercentageOutlined />, roles: null,                     modulo: 'descuentos',     badge: nPendientes },
        { key: '/arriendos',   label: 'Arriendos',    icon: <CarOutlined />,        roles: ['GERENTE','JEFE_VENTAS'], modulo: 'arriendos' },
        { key: '/llaves',      label: 'Llaves',       icon: <KeyOutlined />,        roles: ['GERENTE','JEFE_VENTAS'], modulo: 'llaves' },
      ]
    },
    {
      label: 'Admin',
      items: [
        { key: '/equipo',                label: 'Equipo',           icon: <UserSwitchOutlined />,  roles: ['GERENTE'],              modulo: 'equipo' },
        { key: '/reportes',              label: 'Reportes',         icon: <BarChartOutlined />,    roles: ['GERENTE','JEFE_VENTAS'], modulo: 'reportes' },
        { key: '/automatizaciones',      label: 'Automatizaciones', icon: <ThunderboltOutlined />, roles: ['GERENTE','JEFE_VENTAS'], modulo: 'automatizaciones' },
        { key: '/configuracion/api-keys',label: 'API Keys',         icon: <ApiOutlined />,         roles: ['GERENTE'],              modulo: 'api-keys' },
      ]
    },
  ]
```

- [ ] **Step 2: Cambiar el filtro de visibilidad en el render**

En `frontend/src/components/Layout.jsx`, línea 99, reemplazar:

```js
          const visibles = section.items.filter(item => !item.roles || item.roles.includes(usuario?.rol))
```

Por:

```js
          const modulosActivos = usuario?.modulosVisibles || []
          const visibles = section.items.filter(item => {
            if (modulosActivos.length > 0) return modulosActivos.includes(item.modulo)
            return !item.roles || item.roles.includes(usuario?.rol)
          })
```

- [ ] **Step 3: Verificar manualmente en el browser**

Abrir la app con un usuario VENDEDOR (sin `modulosVisibles`). El sidebar debe verse igual que antes. No hay cambio visual hasta que se configure explícitamente desde Equipo.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/Layout.jsx
git commit -m "feat: sidebar respeta modulosVisibles por usuario"
```

---

### Task 4: Frontend — Modal de módulos en Equipo

**Files:**
- Modify: `frontend/src/pages/equipo/Equipo.jsx`

- [ ] **Step 1: Agregar imports necesarios**

En `frontend/src/pages/equipo/Equipo.jsx`, línea 2, el import de antd ya tiene `Modal`. Agregar `Checkbox` y `AppstoreOutlined` a los imports existentes:

```js
import { Table, Button, Tag, Modal, Form, Input, Select, Typography, Space, Avatar, Switch, App, Card, Divider, Popconfirm, Alert, Checkbox } from 'antd'
import { PlusOutlined, UserOutlined, KeyOutlined, CopyOutlined, StopOutlined, DeleteOutlined, AppstoreOutlined } from '@ant-design/icons'
```

- [ ] **Step 2: Agregar constantes MODULOS_POR_ROL y TODAS_LAS_SECCIONES**

Después de `const ROL_COLOR = { ... }` (línea ~12), agregar:

```js
const MODULOS_POR_ROL = {
  GERENTE:        ['dashboard','inventario','leads','visitas','ventas','legal','pagos','comisiones','promociones','descuentos','arriendos','llaves','equipo','reportes','automatizaciones','api-keys'],
  JEFE_VENTAS:    ['dashboard','inventario','leads','visitas','ventas','legal','pagos','comisiones','promociones','descuentos','arriendos','llaves','reportes','automatizaciones'],
  VENDEDOR:       ['dashboard','leads','comisiones','promociones','descuentos'],
  BROKER_EXTERNO: ['dashboard','leads','comisiones','promociones','descuentos'],
  ABOGADO:        ['dashboard','ventas','legal'],
}

const SECCIONES_MODULOS = [
  { label: 'General',  modulos: [
    { key: 'dashboard',  label: 'Dashboard' },
    { key: 'inventario', label: 'Inventario' },
    { key: 'leads',      label: 'Leads' },
    { key: 'visitas',    label: 'Visitas' },
  ]},
  { label: 'Ventas', modulos: [
    { key: 'ventas',      label: 'Ventas' },
    { key: 'legal',       label: 'Legal' },
    { key: 'pagos',       label: 'Pagos' },
    { key: 'comisiones',  label: 'Comisiones' },
  ]},
  { label: 'Gestión', modulos: [
    { key: 'promociones',  label: 'Promociones' },
    { key: 'descuentos',   label: 'Descuentos' },
    { key: 'arriendos',    label: 'Arriendos' },
    { key: 'llaves',       label: 'Llaves' },
  ]},
  { label: 'Admin', modulos: [
    { key: 'equipo',           label: 'Equipo' },
    { key: 'reportes',         label: 'Reportes' },
    { key: 'automatizaciones', label: 'Automatizaciones' },
    { key: 'api-keys',         label: 'API Keys' },
  ]},
]
```

- [ ] **Step 3: Crear el componente ModalModulos**

Agregar este componente antes de `function ModalUsuario`:

```js
function ModalModulos({ open, onClose, usuario }) {
  const qc = useQueryClient()
  const { message } = App.useApp()
  const [seleccionados, setSeleccionados] = useState([])

  // Al abrir el modal: si tiene modulosVisibles usa esos, si no usa defaults del rol
  const handleOpen = () => {
    const base = usuario?.modulosVisibles?.length > 0
      ? usuario.modulosVisibles
      : (MODULOS_POR_ROL[usuario?.rol] || [])
    setSeleccionados(base)
  }

  const guardar = useMutation({
    mutationFn: (modulos) => api.put(`/usuarios/${usuario.id}`, { modulosVisibles: modulos }),
    onSuccess: () => {
      message.success('Módulos actualizados')
      qc.invalidateQueries(['usuarios'])
      onClose()
    },
    onError: err => message.error(err.response?.data?.error || 'Error')
  })

  const restablecer = useMutation({
    mutationFn: () => api.put(`/usuarios/${usuario.id}`, { modulosVisibles: [] }),
    onSuccess: () => {
      message.success('Módulos restablecidos al rol')
      qc.invalidateQueries(['usuarios'])
      onClose()
    },
    onError: err => message.error(err.response?.data?.error || 'Error')
  })

  const toggle = (key) => {
    setSeleccionados(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    )
  }

  return (
    <Modal
      title={`Módulos de ${usuario?.nombre || ''}`}
      open={open}
      onCancel={onClose}
      afterOpenChange={(v) => { if (v) handleOpen() }}
      footer={[
        <Button key="reset" onClick={() => restablecer.mutate()} loading={restablecer.isPending}>
          Restablecer a rol
        </Button>,
        <Button key="cancel" onClick={onClose}>Cancelar</Button>,
        <Button key="save" type="primary" onClick={() => guardar.mutate(seleccionados)} loading={guardar.isPending}>
          Guardar
        </Button>,
      ]}
      width={520}
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 24px', marginTop: 16 }}>
        {SECCIONES_MODULOS.map(sec => (
          <div key={sec.label}>
            <div style={{ fontWeight: 600, fontSize: 12, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 8 }}>
              {sec.label}
            </div>
            {sec.modulos.map(m => (
              <div key={m.key} style={{ marginBottom: 6 }}>
                <Checkbox
                  checked={seleccionados.includes(m.key)}
                  onChange={() => toggle(m.key)}
                >
                  {m.label}
                </Checkbox>
              </div>
            ))}
          </div>
        ))}
      </div>
    </Modal>
  )
}
```

- [ ] **Step 4: Agregar estado para el modal de módulos en el componente Equipo**

En la función `Equipo()`, después de `const [usuarioEditar, setUsuarioEditar] = useState(null)` (línea ~76), agregar:

```js
  const [modalModulosOpen, setModalModulosOpen] = useState(false)
  const [usuarioModulos, setUsuarioModulos] = useState(null)
```

- [ ] **Step 5: Agregar botón "Módulos" en la columna de acciones de la tabla**

En `columns`, reemplazar la última columna `acciones` (líneas 118-125):

```js
    {
      title: '', key: 'acciones',
      render: (_, u) => (
        <Space>
          <Button size="small" type="link" icon={<AppstoreOutlined />}
            onClick={() => { setUsuarioModulos(u); setModalModulosOpen(true) }}>
            Módulos
          </Button>
          <Button size="small" type="link" onClick={() => { setUsuarioEditar(u); setModalOpen(true) }}>
            Editar
          </Button>
        </Space>
      )
    },
```

- [ ] **Step 6: Agregar ModalModulos al render del componente Equipo**

En el return de `Equipo()`, después de `<ModalUsuario ... />` (línea ~147), agregar:

```jsx
      <ModalModulos
        open={modalModulosOpen}
        onClose={() => setModalModulosOpen(false)}
        usuario={usuarioModulos}
      />
```

- [ ] **Step 7: Probar en el browser**

1. Ir a `/equipo`
2. Hacer clic en "Módulos" de un VENDEDOR — el modal debe abrirse con los checkboxes pre-marcados según su rol (dashboard, leads, comisiones, promociones, descuentos)
3. Desmarcar "Comisiones", marcar "Ventas", guardar
4. Hacer logout y login con ese usuario — el sidebar debe mostrar solo los módulos guardados
5. Volver a Equipo → Módulos → "Restablecer a rol" → el sidebar vuelve al default del rol

- [ ] **Step 8: Commit**

```bash
git add frontend/src/pages/equipo/Equipo.jsx
git commit -m "feat: modal de módulos por usuario en Equipo"
```

---

### Task 5: Push y verificar en producción

**Files:** ninguno — solo deploy

- [ ] **Step 1: Push a Railway**

```bash
git push
```

- [ ] **Step 2: Esperar el deploy**

Verificar en Railway dashboard que el deployment termine con status `Success`.

- [ ] **Step 3: Verificar que la migración se aplicó en prod**

```bash
DATABASE_URL="postgresql://bodeparking:bodeparking2026!@monorail.proxy.rlwy.net:35865/bodeparkingcrm" \
node -e "
const { PrismaClient } = require('./backend/node_modules/@prisma/client')
const p = new PrismaClient()
p.usuario.findMany({ select: { id: true, nombre: true, modulosVisibles: true } })
  .then(us => { console.log(JSON.stringify(us, null, 2)); p.\$disconnect() })
"
```

Resultado esperado: todos los usuarios con `modulosVisibles: []`

- [ ] **Step 4: Smoke test en producción**

1. Login con usuario GERENTE en la app desplegada
2. Ir a Equipo → Módulos de un vendedor
3. Configurar módulos y guardar
4. Login con ese vendedor — verificar sidebar correcto
