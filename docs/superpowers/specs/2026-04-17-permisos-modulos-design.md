# Permisos de Módulos por Usuario — Design

## Problema

El sidebar muestra módulos basados en el rol del usuario (hardcoded en el frontend). No hay forma de configurar qué módulos ve cada usuario individualmente. Un GERENTE necesita poder darle acceso a Ventas a un vendedor específico, o quitarle Comisiones a otro.

## Solución

Agregar un campo `modulosVisibles String[]` por usuario. Vacío = comportamiento actual por rol. Con contenido = lista explícita que reemplaza la lógica de rol. El GERENTE configura esto desde un modal en la página de Equipo.

## Claves de módulos

| Clave | Label |
|-------|-------|
| `dashboard` | Dashboard |
| `inventario` | Inventario |
| `leads` | Leads |
| `visitas` | Visitas |
| `ventas` | Ventas |
| `legal` | Legal |
| `pagos` | Pagos |
| `comisiones` | Comisiones |
| `promociones` | Promociones |
| `descuentos` | Descuentos |
| `arriendos` | Arriendos |
| `llaves` | Llaves |
| `equipo` | Equipo |
| `reportes` | Reportes |
| `automatizaciones` | Automatizaciones |
| `api-keys` | API Keys |

## Archivos afectados

- **Modify:** `backend/prisma/schema.prisma` — agregar `modulosVisibles String[] @default([])` al modelo `Usuario`
- **Modify:** `backend/src/controllers/usuariosController.js` — incluir `modulosVisibles` en GET (listar/obtener) y PUT (actualizar)
- **Modify:** `backend/src/controllers/authController.js` — incluir `modulosVisibles` en el payload del login/me
- **Modify:** `frontend/src/components/Layout.jsx` — nueva lógica de filtro sidebar: si `modulosVisibles.length > 0` usar lista explícita, si no usar rol
- **Modify:** `frontend/src/pages/equipo/Equipo.jsx` — botón "Módulos" por fila + modal con checkboxes

## Schema

```prisma
model Usuario {
  // ...campos existentes...
  modulosVisibles String[] @default([])
}
```

- `[]` (vacío) = usa defaults del rol (comportamiento actual, sin cambio para usuarios existentes)
- `["leads","comisiones","ventas"]` = lista explícita para ese usuario

## Lógica sidebar (Layout.jsx)

```js
// Agregar propiedad `modulo` a cada item del sidebar
{ key: '/leads', label: 'Leads', icon: <TeamOutlined />, roles: null, modulo: 'leads' }

// Nuevo filtro:
const modulosActivos = usuario?.modulosVisibles || []
const visibles = section.items.filter(item => {
  if (modulosActivos.length > 0) {
    return modulosActivos.includes(item.modulo)
  }
  return !item.roles || item.roles.includes(usuario?.rol)
})
```

## Defaults por rol (para pre-marcar el modal)

```js
const MODULOS_POR_ROL = {
  GERENTE:        ['dashboard','inventario','leads','visitas','ventas','legal','pagos','comisiones','promociones','descuentos','arriendos','llaves','equipo','reportes','automatizaciones','api-keys'],
  JEFE_VENTAS:    ['dashboard','inventario','leads','visitas','ventas','legal','pagos','comisiones','promociones','descuentos','arriendos','llaves','reportes','automatizaciones'],
  VENDEDOR:       ['dashboard','leads','comisiones','promociones','descuentos'],
  BROKER_EXTERNO: ['dashboard','leads','comisiones','promociones','descuentos'],
  ABOGADO:        ['dashboard','ventas','legal'],
}
```

## Modal en Equipo

- Botón "Módulos" (icono AppstoreOutlined) por fila en la tabla
- Modal "Módulos de {nombre}"
- Checkboxes agrupados por sección (igual que el sidebar)
- Al abrir: si `modulosVisibles.length > 0` usa esa lista; si no, usa `MODULOS_POR_ROL[usuario.rol]`
- **Guardar:** PUT `/api/usuarios/:id` con `{ modulosVisibles: [...seleccionados] }`
- **Restablecer a rol:** PUT `/api/usuarios/:id` con `{ modulosVisibles: [] }`

## Backend — usuariosController

- `GET /api/usuarios` y `GET /api/usuarios/:id`: incluir `modulosVisibles` en el `select`
- `PUT /api/usuarios/:id`: aceptar `modulosVisibles` en el body y guardarlo

## Backend — authController (login y /me)

Incluir `modulosVisibles` en el `select` al obtener el usuario para que llegue al frontend en el contexto de auth.

## Notas de seguridad

`modulosVisibles` controla solo la visibilidad del sidebar (UX). Las rutas del backend tienen su propio control de acceso por rol — esto no altera permisos de API.
