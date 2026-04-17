# Visibilidad de Leads por Usuario — Design

## Problema

Actualmente un VENDEDOR o BROKER solo ve los leads donde está asignado directamente. No hay forma de darle acceso a leads de una campaña específica, de un edificio, o de leads individuales sin asignárselos.

## Solución

Tres campos de filtro adicionales por usuario. Cuando están vacíos, el comportamiento es idéntico al actual. Cuando tienen contenido, se agregan como condiciones OR al filtro de acceso existente. El GERENTE los configura desde un modal en la página de Equipo.

## Receptores del filtro

Solo aplica a usuarios con rol `VENDEDOR` o `BROKER_EXTERNO`. GERENTE, JEFE_VENTAS y ABOGADO siempre ven todos los leads.

## Archivos afectados

- **Modify:** `backend/prisma/schema.prisma` — tres campos nuevos en Usuario
- **Modify:** `backend/src/middleware/auth.js` — incluir los tres campos en el select del JWT
- **Modify:** `backend/src/controllers/usuariosController.js` — incluir y aceptar los tres campos
- **Modify:** `backend/src/controllers/leadsController.js` — extender `filtroAcceso` + nuevo controlador `listarCampanas`
- **Modify:** `backend/src/routes/leads.js` — nuevo endpoint `GET /campanas` (antes de `/:id`)
- **Modify:** `frontend/src/pages/equipo/Equipo.jsx` — botón "Visibilidad" + componente `ModalVisibilidad`

## Schema

```prisma
model Usuario {
  // ...campos existentes...
  campanasFiltro          String[] @default([])
  edificiosFiltro         Int[]    @default([])
  leadsIndividualesFiltro Int[]    @default([])
}
```

- `[]` vacío = sin filtro extra (comportamiento actual sin cambio)
- Los usuarios existentes quedan en `[]` tras el `db push`

## Lógica de filtro — leadsController.js

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

Los filtros son **aditivos**: el vendedor siempre ve sus leads asignados PLUS lo que defina cada filtro.

## Endpoint nuevo — GET /api/leads/campanas

Devuelve los valores únicos del campo `campana` en la tabla leads (no nulos, ordenados).

```js
const listarCampanas = async (req, res) => {
  const leads = await prisma.lead.findMany({
    where: { campana: { not: null } },
    select: { campana: true },
    distinct: ['campana'],
    orderBy: { campana: 'asc' }
  })
  res.json(leads.map(l => l.campana))
}
```

Se registra en `backend/src/routes/leads.js` ANTES de `GET /:id` para evitar conflicto de routing:
```js
router.get('/campanas', listarCampanas)
router.get('/:id', obtener)
```

## Auth middleware

Agregar los tres campos al `select` del `findUnique` en `backend/src/middleware/auth.js`:

```js
select: {
  id: true, nombre: true, apellido: true, email: true, rol: true, activo: true,
  modulosVisibles: true,
  campanasFiltro: true, edificiosFiltro: true, leadsIndividualesFiltro: true
}
```

## usuariosController

Agregar los tres campos a los `select` de listar, obtener y crear.

En `actualizar`, aceptarlos del body y aplicarlos condicionalmente (igual que `modulosVisibles`):
```js
...(campanasFiltro !== undefined && { campanasFiltro }),
...(edificiosFiltro !== undefined && { edificiosFiltro }),
...(leadsIndividualesFiltro !== undefined && { leadsIndividualesFiltro }),
```

## UI — Modal Visibilidad en Equipo

Botón `<EyeOutlined /> Visibilidad` en la columna acciones de cada fila.

Modal "Visibilidad de leads — {nombre}" con tres secciones:

### Campañas
`Select mode="multiple"` con las opciones de `GET /api/leads/campanas`. Pre-cargado con `campanasFiltro` del usuario.

### Edificios
`Select mode="multiple"` con las opciones de `GET /api/edificios`. Pre-cargado con `edificiosFiltro` del usuario.

### Leads individuales
`Select mode="multiple" showSearch` contra `GET /api/leads?search=...` (ya existe). Muestra `{nombre apellido} — {campana}` por item. Pre-cargado con `leadsIndividualesFiltro` del usuario (resolver IDs → labels en carga inicial via `GET /api/leads?search=` o simplemente mostrar los IDs numéricos pre-seleccionados, ya que el select los acepta como values).

### Botones del footer
- **Limpiar todo**: guarda `{ campanasFiltro: [], edificiosFiltro: [], leadsIndividualesFiltro: [] }`
- **Cancelar**: cierra sin guardar
- **Guardar**: PUT `/api/usuarios/:id` con los tres arrays

## Notas

- `filtroAcceso` ya está integrado en `listar`, `kanban`, `kanbanPorVendedor`, `obtener`, `actualizar` y `eliminar` — todos se benefician automáticamente del cambio.
- El campo `edificiosFiltro` referencia IDs de Edificio pero no usa FK en Prisma (array de Int sin relación formal) — aceptable para este uso.
- Seguridad: igual que módulos, esto controla UX/visibilidad. Las rutas del backend aplican el filtro server-side en cada query, por lo que no es solo frontend.
