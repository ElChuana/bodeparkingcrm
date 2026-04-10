# Visitas Mejoradas + Fix Kanban Drag — Diseño

## Goal
Arreglar el drag-and-drop del kanban (bug de sensor) y mejorar el módulo de visitas con: registrar resultado (asistió + notas), eliminar visita con control de permisos.

## Architecture

### Kanban Fix
El `PointerSensor` tiene `activationConstraint: { delay: 200, tolerance: 8 }`. El `tolerance: 8px` cancela el drag cuando el usuario mueve naturalmente el cursor durante el hold. Se cambia a `{ distance: 5 }`: el drag activa al mover 5px, sin delay. Estándar para kanban web.

### Visitas — Registrar resultado
Se reutilizan los campos existentes `resultado String?` y `notas String?` del modelo `Visita`. Sin migración de DB.

- `resultado` almacena `'ASISTIO'` | `'NO_ASISTIO'`
- `notas` almacena texto libre del vendedor

El endpoint `PUT /leads/:leadId/visitas/:id` (actualizarResultado) ya acepta estos campos. Solo se necesita UI.

En el timeline de visitas, cada visita **sin resultado** muestra un botón "Registrar resultado". Las visitas con resultado muestran un tag de estado (verde = asistió, rojo = no asistió) y las notas.

Modal "Registrar resultado":
- Campo: ¿Asistió? — Select: Sí / No
- Campo: Notas — TextArea libre, requerido
- Al guardar: llama `PUT /leads/:leadId/visitas/:id`

### Visitas — Eliminar
**Permisos:** Solo puede eliminar el vendedor que creó la visita (`vendedorId === usuarioActual.id`) o un usuario con rol `GERENTE` o `JEFE_VENTAS`.

**Backend:**
- Nueva función `eliminar` en `visitasController.js`
- Verifica permisos antes de borrar
- Ruta: `DELETE /leads/:leadId/visitas/:id`

**Frontend:**
- Botón eliminar (icono basura) en cada visita del timeline
- Confirmación con `Modal.confirm` antes de ejecutar
- Solo visible si el usuario tiene permisos

## Files Changed

| Archivo | Cambio |
|---|---|
| `frontend/src/pages/leads/Leads.jsx` | Cambiar sensor a `distance: 5` |
| `backend/src/controllers/visitasController.js` | Agregar función `eliminar` con validación de permisos |
| `backend/src/routes/leads.js` | Agregar `DELETE /:leadId/visitas/:id` |
| `frontend/src/pages/leads/LeadDetalle.jsx` | Agregar modal resultado, botón eliminar, botón resultado en timeline |

## Behavior Details

### Tags de resultado en timeline
- Sin resultado: badge gris "Pendiente"
- `ASISTIO`: tag verde "Asistió"
- `NO_ASISTIO`: tag rojo "No asistió"

### Flujo de registro de resultado
1. Vendedor hace click en "Registrar resultado" en la visita del timeline
2. Modal pide: ¿asistió? + notas
3. Al guardar: actualiza visita, actualiza etapa del lead a `VISITA_REALIZADA` si asistió
4. Timeline se refresca mostrando el resultado

### Validaciones de eliminación
- Backend retorna 403 si el usuario no es el creador ni GERENTE/JEFE_VENTAS
- Frontend oculta el botón eliminar si el usuario no tiene permisos (para UX limpia)
