---
name: Checklist módulo nuevo
description: Cada vez que se agrega un módulo nuevo, hay 3 lugares que actualizar siempre
type: feedback
---

Al agregar módulo nuevo, siempre actualizar estos 3 lugares:

1. **`frontend/src/components/Layout.jsx`** — agregar item al `NAV_SECTIONS` con `key`, `label`, `icon`, `roles`, `modulo`
2. **`frontend/src/App.jsx`** — agregar `<Route>` con `<RutaProtegida roles={...} modulo="...">` incluyendo el prop `modulo`
3. **`frontend/src/pages/equipo/Equipo.jsx`** — agregar `{ key: '...', label: '...' }` en `SECCIONES_MODULOS` + agregar key a los roles relevantes en `MODULOS_POR_ROL`

**Why:** Si falta cualquiera de los 3: el módulo no aparece en el sidebar, o bloquea acceso a usuarios con modulosVisibles custom, o no se puede seleccionar al editar permisos de usuario.

**How to apply:** Antes de hacer push de cualquier módulo nuevo, verificar que los 3 archivos están actualizados.
