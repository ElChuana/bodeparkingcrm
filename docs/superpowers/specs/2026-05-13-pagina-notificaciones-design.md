# Página de Notificaciones — Design Doc

**Fecha:** 2026-05-13

---

## Resumen

Página dedicada `/notificaciones` con 4 tabs que consolida todas las acciones pendientes de cada vendedor. GERENTE ve todo el equipo con filtro por vendedor.

---

## Acceso y roles

| Rol | Vista |
|-----|-------|
| VENDEDOR | Solo sus propios pendientes |
| BROKER_EXTERNO | Solo sus propios pendientes |
| JEFE_VENTAS | Sus propios pendientes |
| GERENTE | Selector de vendedor — puede ver pendientes de cualquier miembro del equipo |

---

## Arquitectura

### Frontend
- Nueva página `frontend/src/pages/notificaciones/Notificaciones.jsx`
- Agregar a `Layout.jsx` (sidebar) + `App.jsx` (rutas) + `Equipo.jsx` si aplica

### Backend
- Reusar endpoint `GET /api/alertas` para Tab 3
- Nuevo endpoint `GET /api/alertas/leads-sin-atencion` para Tab 2
- Emails sin responder: query directa a `EmailConversacion` desde frontend via endpoint existente de email o nuevo endpoint
- 4 nuevos tipos de notificación en el cron: `EMAIL_RECIBIDO`, `ACTIVIDAD_EN_LEAD`, `VISITA_PROXIMA`, `DESCUENTO_RESUELTO`

---

## Tabs

### Tab 1 — Emails sin responder `[N]`

**Fuente:** `EmailConversacion` con `direction = 'RECIBIDO'` y `leido = false`, filtrado por `lead.vendedorId = usuarioId`.

**Endpoint nuevo:** `GET /api/email/sin-responder?vendedorId=X`
- Devuelve: `[{ id, leadId, lead.contacto.nombre, asunto, creadoEn }]`
- GERENTE: puede pasar `vendedorId` arbitrario

**Cada tarjeta muestra:**
- Nombre del cliente
- Asunto del email
- Vendedor asignado (solo visible para GERENTE)
- Tiempo transcurrido
- Botón "Ir al lead →" → navega a `/leads/:leadId`

**Acción:** Click en tarjeta → marca `leido = true` via `PATCH /api/email/conversacion/:id/leer` (ya existe)

---

### Tab 2 — Leads sin atención `[N]`

**Fuente:** Query directa a BD, no usa tabla `Notificacion`.

**Endpoint nuevo:** `GET /api/alertas/leads-sin-atencion?vendedorId=X&dias=2`
- Etapas monitoreadas: `SEGUIMIENTO`, `COTIZACION_ENVIADA`, `NO_CONTESTA`, `SEGUIMIENTO_POST_VISITA`
- Criterio de "sin atención": `MAX(lead.actualizadoEn, MAX(interaccion.creadoEn)) < now - dias`
- Devuelve leads ordenados por días sin actividad DESC
- GERENTE: sin filtro devuelve todos

**Cada tarjeta muestra:**
- Nombre del cliente
- Días sin actividad (badge rojo si >5 días, naranja si 2-5 días)
- Etapa actual (tag de color)
- Vendedor asignado (solo GERENTE)
- Botón "Ver lead →"

**Agrupación visual:**
- Sección "Cotización enviada" → etapa `COTIZACION_ENVIADA`
- Sección "En seguimiento" → resto de etapas

---

### Tab 3 — Alertas `[N]`

**Fuente:** Tabla `Notificacion` — registros `leida = false` del usuario.

**Endpoint existente:** `GET /api/alertas`

**Tipos existentes mostrados con ícono y color:**
| Tipo | Ícono | Color |
|------|-------|-------|
| DESCUENTO_PENDIENTE | 💰 | Morado |
| LLAVE_NO_DEVUELTA | 🔑 | Rojo |
| CUOTA_VENCIDA | 💳 | Rojo |
| LEAD_ESTANCADO | ⚠️ | Naranja |
| LEAD_SIN_ACTIVIDAD | ⏰ | Naranja |
| FECHA_LEGAL_PROXIMA | ⚖️ | Azul |
| ARRIENDO_POR_VENCER | 🏠 | Naranja |
| RECORDATORIO_LEAD | 📅 | Verde |

**Acción:** "Marcar todas como leídas" → `PUT /api/alertas/leer-todas`

---

### Tab 4 — Actividad reciente `[N]`

**Fuente:** Tabla `Notificacion` — registros de tipos nuevos, leídos y no leídos (últimos 30).

**4 nuevos tipos de notificación** (agregar al enum `TipoAlerta` y al cron):

| Tipo | Cuándo se genera | Destinatario |
|------|-----------------|--------------|
| `EMAIL_RECIBIDO` | Llega `EmailConversacion` con `direction=RECIBIDO` | Vendedor del lead |
| `ACTIVIDAD_EN_LEAD` | Se crea `Interaccion` en un lead por otro usuario (no el propio vendedor) | Vendedor del lead |
| `VISITA_PROXIMA` | 24h antes de una visita agendada | Vendedor del lead |
| `DESCUENTO_RESUELTO` | Se aprueba o rechaza una solicitud de descuento | Vendedor que solicitó |

**Generación:**
- `EMAIL_RECIBIDO`: al crear `EmailConversacion` con `direction=RECIBIDO` (en tiempo real, no cron)
- `ACTIVIDAD_EN_LEAD`: al crear `Interaccion` si `usuarioId !== lead.vendedorId` (en tiempo real)
- `VISITA_PROXIMA`: cron cada 15 min, ventana 23h-25h antes de `fechaHora`
- `DESCUENTO_RESUELTO`: al `PUT /api/descuentos/:id/revisar` (en tiempo real)

**Cada tarjeta muestra:**
- Título del evento
- Descripción breve
- Lead asociado
- Tiempo transcurrido

---

## Navegación

- Agregar "Notificaciones" al sidebar en `Layout.jsx` con badge de total pendientes
- El `NotificacionesBadge` del header mantiene su funcionalidad actual (no se elimina)
- Click en ítem del badge del header puede redirigir a `/notificaciones` (mejora opcional)

---

## Decisiones de diseño

1. **Tab 2 no usa tabla Notificacion** — es una query en tiempo real para evitar notificaciones duplicadas/stale. Refleja el estado actual.
2. **Tab 1 tampoco usa Notificacion** — `EmailConversacion.leido` es la fuente de verdad.
3. **Tab 4 no filtra por no-leídas** — muestra historial reciente (30 registros) para contexto.
4. **Cron existente no se modifica** — los nuevos tipos se generan en los propios endpoints (tiempo real), excepto `VISITA_PROXIMA` que va al cron.
5. **GERENTE ve equipo completo** — parámetro `vendedorId` en endpoints nuevos, sin él GERENTE recibe todos.
