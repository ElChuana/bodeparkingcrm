# Centro de Asignación Manual — Diseño

## Goal

Página dedicada para que GERENTE y JEFE_VENTAS asignen leads a vendedores rápidamente en bulk, con filtros por campaña, fecha y origen. Además, cambio de vendedor inline desde LeadDetalle.

## Architecture

Dos cambios independientes que comparten los mismos endpoints existentes:
1. **Página nueva** `CentroAsignacion.jsx` — tabla con selección múltiple y asignación masiva
2. **Modificación** `LeadDetalle.jsx` — selector de vendedor inline para roles autorizados

No se crean endpoints nuevos: todo reutiliza `GET /api/leads`, `GET /api/leads/campanas`, `POST /api/leads/asignar-masivo`, `PUT /api/leads/:id` y `GET /api/usuarios`.

## Tech Stack

React + Ant Design, @tanstack/react-query, rutas existentes de Express/Prisma.

---

## Componentes

### 1. `frontend/src/pages/asignacion/CentroAsignacion.jsx` (nuevo)

**Filtros:**
- Campaña: multiselect, datos de `GET /api/leads/campanas`
- Fecha: botones Hoy / Ayer / Esta semana + DateRangePicker personalizado
- Origen: Select (INSTAGRAM, GOOGLE, REFERIDO, BROKER, VISITA_DIRECTA, WEB, OTRO)
- Toggle "Solo sin asignar" — activo por defecto, filtra `vendedorId=null`

**Tabla:**
- Columnas: checkbox | Nombre contacto | Teléfono | Campaña | Origen | Fecha ingreso | Vendedor actual
- Checkbox en header selecciona todos los de la página actual
- Paginación 50 por página
- Query: `GET /api/leads?vendedorId=null&campana=X&desde=Y&hasta=Z&origen=W`

**Barra de acción flotante** (visible cuando rowSelection.selectedRowKeys.length > 0):
- Texto: "X leads seleccionados"
- Select vendedor (datos de `GET /api/usuarios?rol=VENDEDOR`)
- Botón "Asignar" → `POST /api/leads/asignar-masivo` con `{ leadIds, vendedorId }`
- Al confirmar: invalidar query, limpiar selección, mostrar mensaje éxito

**Acceso:** Solo GERENTE y JEFE_VENTAS. Redirigir si rol no autorizado.

### 2. `frontend/src/pages/leads/LeadDetalle.jsx` (modificar)

Agregar selector de vendedor en el header del lead, visible solo si `usuario.rol === 'GERENTE' || 'JEFE_VENTAS'`.

- Select con lista de vendedores activos (`GET /api/usuarios`)
- Al cambiar: `PUT /api/leads/:id` con `{ vendedorId }`
- Mostrar nombre del vendedor actual como valor inicial
- Invalidar query del lead al guardar

### 3. `frontend/src/App.jsx` (modificar)

Agregar ruta:
```jsx
<Route path="/asignacion" element={<CentroAsignacion />} />
```

### 4. `frontend/src/components/Layout.jsx` (modificar)

Agregar ítem de menú "Asignación" visible solo para GERENTE y JEFE_VENTAS, entre Leads y Visitas.

---

## Data Flow

```
CentroAsignacion
  → GET /api/leads (con filtros)         → tabla
  → GET /api/leads/campanas              → multiselect campañas
  → GET /api/usuarios                    → select vendedor
  → POST /api/leads/asignar-masivo       → asignación bulk

LeadDetalle (cambio inline)
  → GET /api/usuarios                    → select vendedor
  → PUT /api/leads/:id                   → guardar cambio
```

---

## Restricciones de acceso

| Acción | GERENTE | JEFE_VENTAS | VENDEDOR | otros |
|--------|---------|-------------|----------|-------|
| Ver página /asignacion | ✅ | ✅ | ❌ | ❌ |
| Cambiar vendedor en LeadDetalle | ✅ | ✅ | ❌ | ❌ |

---

## Fuera de scope (fase 2)

- Reglas de asignación automática (cron)
- Round-robin entre vendedores
- Límite máximo de leads por vendedor
