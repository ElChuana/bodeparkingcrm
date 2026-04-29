# Spec: Rediseño módulo de email

**Fecha:** 2026-04-29  
**Estado:** aprobado

## Objetivo

Consolidar toda la funcionalidad de email en un único card al final de `LeadDetalle`. Eliminar los botones de email dispersos en el resto del sistema.

---

## Componente: `EmailCard`

Card nuevo al final de `LeadDetalle`, separado del layout existente por un borde azul superior. Contiene dos tabs internas.

### Tab 1 — "Nuevo email"

| Campo | Comportamiento |
|---|---|
| **Para** | Pre-llenado con `lead.email`. No editable. |
| **Asunto** | Editable. Vacío por defecto. Al responder, pre-llenado con `Re: [asunto original]`. |
| **Plantillas** | 4 pills: Seguimiento / Presentación bodega / Enviar cotización / Confirmar reunión. Al hacer clic reemplaza asunto + cuerpo con texto pre-definido. |
| **Mensaje** | Textarea libre (HTML básico). |
| **Adjuntar cotización** | Dropdown con cotizaciones del lead (fetch de `/api/cotizaciones?leadId=X`). Al seleccionar una, genera el PDF client-side con `@react-pdf/renderer` (mismo patrón que `CotizacionEditor`) y lo adjunta como base64. |
| **Adjuntar archivo** | Upload genérico. |
| **Enviar** | Llama a `POST /api/email/enviar` con `leadId`. Limpia el formulario al éxito. |
| **Limpiar** | Resetea asunto, cuerpo y adjuntos. |

### Tab 2 — "Conversación"

- Burbujas de chat: enviados (azul, derecha) / recibidos (gris, izquierda).
- Emails recibidos no leídos: borde amarillo + badge "NUEVO".
- Badge rojo en la tab con conteo de emails no leídos.
- Cada burbuja **recibida** tiene botón **↩ Responder** que:
  1. Cambia a tab "Nuevo email".
  2. Pre-llena Asunto con `Re: [asunto original]`.
  3. Limpia el cuerpo para escribir.
- Refresca automáticamente cada 30 segundos.

---

## Limpieza — eliminar botones de email dispersos

| Ubicación | Acción |
|---|---|
| Header de `LeadDetalle` (botón "Enviar email") | Eliminar |
| Card de contacto dentro del lead | Eliminar |
| Timeline / actividad | Eliminar botón si existe |
| `CotizacionEditor` (botón "Enviar por email" + `ModalEmail`) | Eliminar — enviar cotización por email se hace desde `EmailCard` en el lead |
| `ModalEmail` component | Eliminar — queda sin usos tras limpiar los dos lugares anteriores |

---

## Backend — sin cambios

El endpoint `POST /api/email/enviar` y `GET /api/email/conversacion/:leadId` ya existen y funcionan. No se modifica el backend.

---

## "Emails no leídos" — campo nuevo

Para mostrar el badge y resaltar emails recibidos no leídos, se necesita un campo `leido` en `EmailConversacion`.

**Schema change:**
```prisma
model EmailConversacion {
  // ... campos existentes ...
  leido     Boolean  @default(false)
}
```

- Al guardar un email `RECIBIDO` (webhook inbound): `leido: false`.
- Al guardar un email `ENVIADO`: `leido: true`.
- Al abrir la tab "Conversación": marcar todos los `RECIBIDO` de ese lead como `leido: true` (`PATCH /api/email/conversacion/:leadId/leer`).

---

## Plantillas — texto pre-definido

| Plantilla | Asunto | Cuerpo (resumen) |
|---|---|---|
| Seguimiento | `Seguimiento — BodeParking` | Consulta si revisó la información enviada, quedo atento. |
| Presentación bodega | `Presentación de Bodega — BodeParking` | Descripción de la unidad, invitación a visita. |
| Enviar cotización | `Cotización BodeParking` | Adjunto la cotización solicitada, quedo a disposición. |
| Confirmar reunión | `Confirmación de reunión — BodeParking` | Confirma fecha/hora/lugar, ofrece reagendar. |

Plantillas hardcodeadas en el componente (no configurables por usuario en esta versión).

---

## Archivos afectados

**Nuevo:**
- `frontend/src/components/EmailCard.jsx` — componente principal

**Modificados:**
- `frontend/src/pages/leads/LeadDetalle.jsx` — agregar `<EmailCard>`, eliminar botones de email dispersos
- `backend/prisma/schema.prisma` — agregar campo `leido` a `EmailConversacion`
- `backend/src/routes/email.js` — agregar `PATCH /conversacion/:leadId/leer`, incluir `leido` al guardar emails
- `frontend/src/services/api.js` — agregar llamada a nuevo endpoint

**Eliminados (si quedan sin usos):**
- `frontend/src/components/ModalEmail.jsx`
