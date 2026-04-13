# Optimización Rendimiento Kanban — Diseño

## Goal
Eliminar el lag al arrastrar tarjetas y al cargar el kanban con 1700+ leads.

## Root Cause
1. El backend devuelve todos los leads sin límite → payload grande, render inicial lento.
2. `LeadCard` y `KanbanColumn` no tienen `React.memo` → cuando `activeId` cambia durante drag, React redibuja TODOS los componentes aunque no hayan cambiado.
3. La query del kanban hace refetch cada 30s y al volver al foco de ventana, interrumpiendo la interacción.

## Architecture

### Fix 1 — Limitar 100 leads por columna (backend)
En `leadsController.js`, función `kanban()`: después de agrupar leads por etapa, aplicar `.slice(0, 100)` a cada columna. También devolver el total real de cada columna para que el frontend pueda mostrar "y X más...".

Respuesta del endpoint cambia de `{ NUEVO: [...leads] }` a `{ NUEVO: { leads: [...100 leads], total: 142 } }`.

### Fix 2 — React.memo en LeadCard y KanbanColumn
Envolver ambos componentes con `React.memo`. Esto hace que React omita el re-render si las props no cambiaron. Durante un drag, solo el componente de la tarjeta arrastrada cambia (`isDragging: true`), el resto no se toca.

### Fix 3 — staleTime y refetchOnWindowFocus en query kanban
En `VistaKanban`, la query `useQuery` del kanban pasa a tener:
- `staleTime: 5 * 60 * 1000` (5 minutos)
- `refetchOnWindowFocus: false`

Esto evita refetches mientras el usuario está arrastrando o al volver de otra pestaña.

## Files Changed

| Archivo | Cambio |
|---|---|
| `backend/src/controllers/leadsController.js` | Función `kanban()`: slice 100 por columna + devolver `{ leads, total }` por etapa |
| `frontend/src/pages/leads/Leads.jsx` | `React.memo` en `LeadCard` y `KanbanColumn`; adaptar consumo de `{ leads, total }`; staleTime + refetchOnWindowFocus |

## Behavior Details

### Formato respuesta kanban actualizado
```json
{
  "NUEVO": { "leads": [...], "total": 142 },
  "SEGUIMIENTO": { "leads": [...], "total": 38 },
  ...
}
```

### Indicador "y X más"
Si `total > leads.length`, mostrar debajo de la columna:
`y 42 más — filtra para ver todos`

El texto invita a usar los filtros para encontrar leads específicos.

### React.memo — qué props cambian y cuándo
- `LeadCard`: solo `lead` y `onPreview`. `lead` cambia solo cuando la query se refresca. `onPreview` es estable (definida fuera del render loop).
- `KanbanColumn`: `etapa`, `leads`, `onPreview`. Cambia solo cuando los leads de esa columna cambian.

Durante drag: `activeId` cambia pero no es prop de `LeadCard` — se obtiene internamente via `useDraggable`. Por lo tanto `React.memo` evita que las tarjetas no-arrastradas se redibuje.
