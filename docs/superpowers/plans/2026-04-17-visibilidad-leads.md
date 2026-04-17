# Visibilidad de Leads por Usuario — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir al GERENTE configurar desde Equipo qué leads puede ver cada vendedor/broker, con filtros por campaña, edificio y leads individuales, sumados a los leads que ya tiene asignados.

**Architecture:** Tres campos de array en Usuario (campanasFiltro, edificiosFiltro, leadsIndividualesFiltro). La función `filtroAcceso` en leadsController los usa como condiciones OR adicionales. El GERENTE los configura desde un modal "Visibilidad" en la tabla de Equipo. Un nuevo endpoint `GET /api/leads/campanas` devuelve los valores únicos de campaña.

**Tech Stack:** Prisma (PostgreSQL), Express, React, Ant Design, TanStack Query

---

## File Map

| Archivo | Cambio |
|---------|--------|
| `backend/prisma/schema.prisma` | 3 nuevos campos en Usuario |
| `backend/src/middleware/auth.js` | incluir 3 campos en select JWT |
| `backend/src/controllers/usuariosController.js` | incluir y aceptar 3 campos |
| `backend/src/controllers/leadsController.js` | extender `filtroAcceso` + nuevo `listarCampanas` |
| `backend/src/routes/leads.js` | registrar `GET /campanas` antes de `GET /:id` |
| `frontend/src/pages/equipo/Equipo.jsx` | botón "Visibilidad" + componente `ModalVisibilidad` |

---

### Task 1: Schema — tres campos de filtro en Usuario

**Files:**
- Modify: `backend/prisma/schema.prisma`

- [ ] **Step 1: Agregar los tres campos al modelo Usuario**

En `backend/prisma/schema.prisma`, después de `modulosVisibles String[] @default([])`, agregar:

```prisma
  modulosVisibles         String[]  @default([])
  campanasFiltro          String[]  @default([])
  edificiosFiltro         Int[]     @default([])
  leadsIndividualesFiltro Int[]     @default([])
```

- [ ] **Step 2: Aplicar el schema a la base de datos**

```bash
cd /Users/juana/Documents/bodeparkingcrm/backend
DATABASE_URL="postgresql://bodeparking:bodeparking2026!@monorail.proxy.rlwy.net:35865/bodeparkingcrm" npx prisma db push
```

Resultado esperado: `🚀 Your database is now in sync with your Prisma schema.`

- [ ] **Step 3: Verificar columnas en DB**

```bash
cd /Users/juana/Documents/bodeparkingcrm
DATABASE_URL="postgresql://bodeparking:bodeparking2026!@monorail.proxy.rlwy.net:35865/bodeparkingcrm" node -e "
const { PrismaClient } = require('./backend/node_modules/@prisma/client')
const p = new PrismaClient()
p.usuario.findFirst({ select: { id: true, campanasFiltro: true, edificiosFiltro: true, leadsIndividualesFiltro: true } })
  .then(u => { console.log('OK:', JSON.stringify(u)); p.\$disconnect() })
"
```

Resultado esperado: `OK: {"id":7,"campanasFiltro":[],"edificiosFiltro":[],"leadsIndividualesFiltro":[]}`

- [ ] **Step 4: Commit**

```bash
cd /Users/juana/Documents/bodeparkingcrm
git add backend/prisma/schema.prisma
git commit -m "feat: agregar campos de visibilidad de leads a Usuario"
```

---

### Task 2: Backend — exponer campos en auth y usuariosController

**Files:**
- Modify: `backend/src/middleware/auth.js:17`
- Modify: `backend/src/controllers/usuariosController.js`

- [ ] **Step 1: Actualizar select en auth middleware**

En `backend/src/middleware/auth.js`, línea 17, reemplazar el select:

```js
      select: { id: true, nombre: true, apellido: true, email: true, rol: true, activo: true, modulosVisibles: true, campanasFiltro: true, edificiosFiltro: true, leadsIndividualesFiltro: true }
```

- [ ] **Step 2: Actualizar los 4 selects en usuariosController**

En `backend/src/controllers/usuariosController.js`, agregar los tres campos a cada select (listar, obtener, crear, actualizar). Buscar cada bloque `select: {` que tenga `modulosVisibles: true` y agregar debajo:

```js
        campanasFiltro: true, edificiosFiltro: true, leadsIndividualesFiltro: true
```

Hay 4 selects (listar línea ~10, obtener línea ~30, crear línea ~70, actualizar línea ~92).

- [ ] **Step 3: Actualizar función `actualizar` para aceptar los tres campos**

En `backend/src/controllers/usuariosController.js`, en la función `actualizar`, el destructuring del body (línea ~83) cambia a:

```js
  const { nombre, apellido, email, telefono, rol, comisionPorcentaje, comisionFijo, activo, modulosVisibles, campanasFiltro, edificiosFiltro, leadsIndividualesFiltro } = req.body
```

Y en el objeto `data` del `prisma.usuario.update` (línea ~88), después de `...(modulosVisibles !== undefined && { modulosVisibles })`, agregar:

```js
        ...(campanasFiltro !== undefined && { campanasFiltro }),
        ...(edificiosFiltro !== undefined && { edificiosFiltro }),
        ...(leadsIndividualesFiltro !== undefined && { leadsIndividualesFiltro }),
```

- [ ] **Step 4: Verificar que el backend arranca sin errores**

```bash
cd /Users/juana/Documents/bodeparkingcrm/backend
node -e "require('./src/controllers/usuariosController'); require('./src/middleware/auth'); console.log('OK')"
```

Resultado esperado: `OK`

- [ ] **Step 5: Commit**

```bash
cd /Users/juana/Documents/bodeparkingcrm
git add backend/src/middleware/auth.js backend/src/controllers/usuariosController.js
git commit -m "feat: exponer campos de visibilidad de leads en auth y usuarios"
```

---

### Task 3: Backend — extender filtroAcceso + endpoint /campanas

**Files:**
- Modify: `backend/src/controllers/leadsController.js`
- Modify: `backend/src/routes/leads.js`

- [ ] **Step 1: Reemplazar la función filtroAcceso**

En `backend/src/controllers/leadsController.js`, líneas 63-72, reemplazar la función `filtroAcceso` completa:

```js
const filtroAcceso = (usuario) => {
  if (['GERENTE', 'JEFE_VENTAS', 'ABOGADO'].includes(usuario.rol)) return {}

  const condiciones = [
    { vendedorId: usuario.id },
    { brokerId: usuario.id }
  ]

  if (usuario.campanasFiltro?.length > 0)
    condiciones.push({ campana: { in: usuario.campanasFiltro } })

  if (usuario.edificiosFiltro?.length > 0)
    condiciones.push({ unidadInteres: { edificioId: { in: usuario.edificiosFiltro } } })

  if (usuario.leadsIndividualesFiltro?.length > 0)
    condiciones.push({ id: { in: usuario.leadsIndividualesFiltro } })

  return { OR: condiciones }
}
```

- [ ] **Step 2: Agregar el controlador listarCampanas**

Al final de `backend/src/controllers/leadsController.js`, antes de `module.exports`, agregar:

```js
const listarCampanas = async (req, res) => {
  try {
    const leads = await prisma.lead.findMany({
      where: { campana: { not: null } },
      select: { campana: true },
      distinct: ['campana'],
      orderBy: { campana: 'asc' }
    })
    res.json(leads.map(l => l.campana))
  } catch (err) {
    console.error('[listarCampanas]', err)
    res.status(500).json({ error: 'Error al obtener campañas.' })
  }
}
```

- [ ] **Step 3: Agregar listarCampanas al module.exports**

La última línea de `backend/src/controllers/leadsController.js` es:

```js
module.exports = { listar, kanban, kanbanPorVendedor, obtener, crear, actualizar, cambiarEtapa, asignarMasivo, eliminar }
```

Cambiarla a:

```js
module.exports = { listar, kanban, kanbanPorVendedor, obtener, crear, actualizar, cambiarEtapa, asignarMasivo, eliminar, listarCampanas }
```

- [ ] **Step 4: Registrar la ruta GET /campanas ANTES de GET /:id**

En `backend/src/routes/leads.js`, el import de la línea 3 ya trae los controladores. Actualizarlo para incluir `listarCampanas`:

```js
const { listar, kanban, kanbanPorVendedor, obtener, crear, actualizar, cambiarEtapa, asignarMasivo, eliminar, listarCampanas } = require('../controllers/leadsController')
```

Luego agregar la ruta ANTES de `router.get('/:id', obtener)` (línea 13):

```js
router.get('/campanas', listarCampanas)
router.get('/:id', obtener)
```

El archivo completo de rutas queda:

```js
const express = require('express')
const router = express.Router()
const { listar, kanban, kanbanPorVendedor, obtener, crear, actualizar, cambiarEtapa, asignarMasivo, eliminar, listarCampanas } = require('../controllers/leadsController')
const { listarPorLead, listarTodas, crear: crearVisita, actualizarResultado, actualizar: actualizarVisita, eliminar: eliminarVisita } = require('../controllers/visitasController')
const { listarPorLead: listarInteracciones, crear: crearInteraccion } = require('../controllers/interaccionesController')
const { autenticar } = require('../middleware/auth')

router.use(autenticar)

router.get('/', listar)
router.get('/campanas', listarCampanas)
router.get('/kanban', kanban)
router.get('/kanban/por-vendedor', kanbanPorVendedor)
router.get('/:id', obtener)
router.post('/', crear)
router.put('/:id', actualizar)
router.put('/:id/etapa', cambiarEtapa)
router.post('/asignar-masivo', asignarMasivo)
router.delete('/:id', eliminar)

// Visitas de un lead
router.get('/:leadId/visitas', listarPorLead)
router.post('/:leadId/visitas', crearVisita)
router.put('/:leadId/visitas/:id', actualizarResultado)
router.patch('/:leadId/visitas/:id', actualizarVisita)
router.delete('/:leadId/visitas/:id', eliminarVisita)

// Interacciones de un lead
router.get('/:leadId/interacciones', listarInteracciones)
router.post('/:leadId/interacciones', crearInteraccion)

module.exports = router
```

- [ ] **Step 5: Verificar que el backend arranca y el endpoint funciona**

```bash
cd /Users/juana/Documents/bodeparkingcrm/backend
node -e "require('./src/routes/leads'); require('./src/controllers/leadsController'); console.log('OK')"
```

Resultado esperado: `OK`

- [ ] **Step 6: Commit**

```bash
cd /Users/juana/Documents/bodeparkingcrm
git add backend/src/controllers/leadsController.js backend/src/routes/leads.js
git commit -m "feat: extender filtroAcceso con filtros de visibilidad + endpoint campanas"
```

---

### Task 4: Frontend — Modal Visibilidad en Equipo

**Files:**
- Modify: `frontend/src/pages/equipo/Equipo.jsx`

El archivo ya tiene importados `useState`, `useQuery`, `useMutation`, `useQueryClient`, `Modal`, `Button`, `Select`, `Space`, `App`, `api`. Reutilizamos todo.

- [ ] **Step 1: Agregar EyeOutlined a los imports de icons**

En `frontend/src/pages/equipo/Equipo.jsx`, línea 4, agregar `EyeOutlined` a los imports de icons:

```js
import { PlusOutlined, UserOutlined, KeyOutlined, CopyOutlined, StopOutlined, DeleteOutlined, AppstoreOutlined, EyeOutlined } from '@ant-design/icons'
```

- [ ] **Step 2: Agregar el componente ModalVisibilidad**

Agregar este componente ANTES de `function ModalUsuario` (línea ~128):

```jsx
function ModalVisibilidad({ open, onClose, usuario }) {
  const qc = useQueryClient()
  const { message } = App.useApp()
  const [campanas, setCampanas] = useState([])
  const [edificios, setEdificios] = useState([])
  const [leadsIndividuales, setLeadsIndividuales] = useState([])
  const [busquedaLeads, setBusquedaLeads] = useState([])

  const { data: campanaOpciones = [] } = useQuery({
    queryKey: ['campanas'],
    queryFn: () => api.get('/leads/campanas').then(r => r.data),
    enabled: open
  })

  const { data: edificioOpciones = [] } = useQuery({
    queryKey: ['edificios'],
    queryFn: () => api.get('/edificios').then(r => r.data),
    enabled: open
  })

  const handleOpen = () => {
    setCampanas(usuario?.campanasFiltro || [])
    setEdificios(usuario?.edificiosFiltro || [])
    setLeadsIndividuales(usuario?.leadsIndividualesFiltro || [])
  }

  const buscarLeads = async (search) => {
    if (!search || search.length < 2) { setBusquedaLeads([]); return }
    const res = await api.get('/leads', { params: { search, limit: 20 } })
    setBusquedaLeads(res.data.map ? res.data : (res.data.leads || []))
  }

  const guardar = useMutation({
    mutationFn: () => api.put(`/usuarios/${usuario.id}`, {
      campanasFiltro: campanas,
      edificiosFiltro: edificios,
      leadsIndividualesFiltro: leadsIndividuales
    }),
    onSuccess: () => {
      message.success('Visibilidad actualizada')
      qc.invalidateQueries({ queryKey: ['usuarios'] })
      onClose()
    },
    onError: err => message.error(err.response?.data?.error || 'Error')
  })

  const limpiar = useMutation({
    mutationFn: () => api.put(`/usuarios/${usuario.id}`, {
      campanasFiltro: [],
      edificiosFiltro: [],
      leadsIndividualesFiltro: []
    }),
    onSuccess: () => {
      message.success('Filtros limpiados')
      qc.invalidateQueries({ queryKey: ['usuarios'] })
      onClose()
    },
    onError: err => message.error(err.response?.data?.error || 'Error')
  })

  return (
    <Modal
      title={`Visibilidad de leads — ${usuario?.nombre || ''}`}
      open={open}
      onCancel={onClose}
      afterOpenChange={(v) => { if (v) handleOpen() }}
      footer={[
        <Button key="clear" onClick={() => limpiar.mutate()} loading={limpiar.isPending}>
          Limpiar todo
        </Button>,
        <Button key="cancel" onClick={onClose}>Cancelar</Button>,
        <Button key="save" type="primary" onClick={() => guardar.mutate()} loading={guardar.isPending}>
          Guardar
        </Button>,
      ]}
      width={520}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginTop: 16 }}>
        <div>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Campañas</div>
          <Select
            mode="multiple"
            style={{ width: '100%' }}
            placeholder="Selecciona campañas..."
            value={campanas}
            onChange={setCampanas}
            options={campanaOpciones.map(c => ({ value: c, label: c }))}
          />
        </div>
        <div>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Edificios</div>
          <Select
            mode="multiple"
            style={{ width: '100%' }}
            placeholder="Selecciona edificios..."
            value={edificios}
            onChange={setEdificios}
            options={edificioOpciones.map(e => ({ value: e.id, label: e.nombre }))}
          />
        </div>
        <div>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Leads individuales</div>
          <Select
            mode="multiple"
            style={{ width: '100%' }}
            placeholder="Busca por nombre o teléfono..."
            value={leadsIndividuales}
            onChange={setLeadsIndividuales}
            showSearch
            filterOption={false}
            onSearch={buscarLeads}
            options={busquedaLeads.map(l => ({
              value: l.id,
              label: `${l.contacto?.nombre || ''} ${l.contacto?.apellido || ''} — ${l.campana || 'Sin campaña'}`
            }))}
          />
        </div>
      </div>
    </Modal>
  )
}
```

- [ ] **Step 3: Agregar estado para el modal de visibilidad en Equipo**

En `export default function Equipo()`, después de `const [usuarioModulos, setUsuarioModulos] = useState(null)` (línea ~187), agregar:

```js
  const [modalVisibilidadOpen, setModalVisibilidadOpen] = useState(false)
  const [usuarioVisibilidad, setUsuarioVisibilidad] = useState(null)
```

- [ ] **Step 4: Agregar botón Visibilidad en la columna acciones**

En el array `columns`, la columna `acciones` (línea ~233) actualmente tiene "Módulos" y "Editar". Agregar "Visibilidad" entre ellos:

```js
    {
      title: '', key: 'acciones',
      render: (_, u) => (
        <Space>
          <Button size="small" type="link" icon={<AppstoreOutlined />}
            onClick={() => { setUsuarioModulos(u); setModalModulosOpen(true) }}>
            Módulos
          </Button>
          <Button size="small" type="link" icon={<EyeOutlined />}
            onClick={() => { setUsuarioVisibilidad(u); setModalVisibilidadOpen(true) }}>
            Visibilidad
          </Button>
          <Button size="small" type="link" onClick={() => { setUsuarioEditar(u); setModalOpen(true) }}>
            Editar
          </Button>
        </Space>
      )
    },
```

- [ ] **Step 5: Agregar ModalVisibilidad al return**

En el return de `Equipo()`, después de `<ModalModulos ... />` (línea ~278), agregar:

```jsx
      <ModalVisibilidad
        open={modalVisibilidadOpen}
        onClose={() => setModalVisibilidadOpen(false)}
        usuario={usuarioVisibilidad}
      />
```

- [ ] **Step 6: Verificar build**

```bash
cd /Users/juana/Documents/bodeparkingcrm/frontend
npm run build 2>&1 | tail -5
```

Resultado esperado: `✓ built in` sin errores.

- [ ] **Step 7: Commit**

```bash
cd /Users/juana/Documents/bodeparkingcrm
git add frontend/src/pages/equipo/Equipo.jsx
git commit -m "feat: modal de visibilidad de leads por usuario en Equipo"
```

---

### Task 5: Push y verificar en producción

**Files:** ninguno

- [ ] **Step 1: Push**

```bash
cd /Users/juana/Documents/bodeparkingcrm
git push
```

- [ ] **Step 2: Esperar deploy y verificar endpoint campanas**

```bash
sleep 60 && curl -s https://backend-production-1c52.up.railway.app/api/leads/campanas \
  -H "Authorization: Bearer $(curl -s -X POST https://backend-production-1c52.up.railway.app/api/auth/login \
    -H 'Content-Type: application/json' \
    -d '{"email":"fbetancourtt@bodeparking.cl","password":"bodeparking2026"}' | \
    node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).token))")"
```

Resultado esperado: array JSON con nombres de campañas o `[]` si no hay campañas en la DB.

- [ ] **Step 3: Verificar que filtroAcceso no rompió leads existentes**

```bash
TOKEN=$(curl -s -X POST https://backend-production-1c52.up.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"fbetancourtt@bodeparking.cl","password":"bodeparking2026"}' | \
  node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).token))")

curl -s "https://backend-production-1c52.up.railway.app/api/leads?limit=3" \
  -H "Authorization: Bearer $TOKEN" | \
  node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{ const r=JSON.parse(d); console.log('Total leads:', Array.isArray(r)?r.length:(r.total||'ok')) })"
```

Resultado esperado: número mayor a 0.
