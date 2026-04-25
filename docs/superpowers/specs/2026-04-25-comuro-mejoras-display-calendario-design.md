# Spec: Mejoras Comuro — Display, Calendario y Notificaciones

**Fecha:** 2026-04-25  
**Estado:** Aprobado

---

## Problema

Los leads que ingresan por Comuro tienen dos problemas:

1. **Display:** El campo `context` muestra basura al final (`| Fecha Reunión: |Hora Reunion:`) y los datos no tienen jerarquía clara (datos estructurados mezclados con texto libre).
2. **Calendario y notificaciones:** Cuando Comuro agenda una reunión o llamada, esta no aparece en el calendario ni notifica al vendedor. El campo `actualizadoEn` tampoco se actualiza en el upsert.

---

## Solución: Opción A — Parse en webhook + interaccion REUNION

Sin cambios de schema. El webhook parsea la reunión del `context`, crea la interaccion, notifica y actualiza `actualizadoEn`. El frontend mejora el display con los mismos datos ya disponibles.

---

## Backend — `backend/src/routes/comuro.js`

### Parser de reunión

```js
function parsearReunionComuro(context) {
  // Patrón: "| Fecha Reunión: DD/MM/YYYY|Hora Reunion: HH:MM"
  const match = context?.match(/Fecha Reuni[oó]n:\s*(\d{2}\/\d{2}\/\d{4})\|Hora Reunion:\s*(\d{2}:\d{2})/)
  if (!match) return null
  const [, fecha, hora] = match
  const [dia, mes, anio] = fecha.split('/')
  const dt = new Date(`${anio}-${mes}-${dia}T${hora}:00`)
  return isNaN(dt.getTime()) ? null : dt
}
```

### Al hacer UPDATE:
- Agregar `actualizadoEn: new Date()` al `prisma.lead.update`
- Llamar `parsearReunionComuro(body.context)` — si retorna fecha válida:
  - Verificar que no exista ya una interaccion REUNION del mismo lead con esa fecha exacta (deduplicar)
  - Si no existe: `prisma.interaccion.create` con:
    - `leadId`: id del lead
    - `tipo`: `'REUNION'`
    - `fecha`: datetime parseado
    - `descripcion`: texto limpio del context (sin el pipe final)
    - `usuarioId`: `vendedorId` del lead ?? ID de Felix (8)
  - Llamar `notificarLead({ leadId, mensaje: "Comuro agendó reunión con [nombre] el [fecha] a las [hora]", tipo: 'ACTIVIDAD' })`

### Al hacer CREATE:
- Mismo parse + crear interaccion + (ya notifica LEAD_NUEVO, agregar notificación de reunión si aplica)

### Función `limpiarContextComuro(context)`:
Remueve el patrón `|  Fecha Reunión: ...|Hora Reunion: ...` del final del string antes de guardar en `descripcion` y para uso en frontend.

---

## Frontend — `frontend/src/pages/leads/LeadDetalle.jsx`

### Helpers JS (al tope del archivo o en utils)

```js
function limpiarContext(text) {
  return text?.replace(/\|\s*Fecha Reuni[oó]n:.*$/s, '').trim() || ''
}

function parsearFechaComuro(context) {
  const match = context?.match(/Fecha Reuni[oó]n:\s*(\d{2}\/\d{2}\/\d{4})\|Hora Reunion:\s*(\d{2}:\d{2})/)
  if (!match) return null
  const [, fecha, hora] = match
  const [dia, mes, anio] = fecha.split('/')
  const dt = new Date(`${anio}-${mes}-${dia}T${hora}:00`)
  return isNaN(dt.getTime()) ? null : { fecha, hora, dt }
}
```

### Card Comuro rediseñada

Estructura de arriba a abajo:

1. **Bloque reunión agendada** (solo si `parsearFechaComuro` retorna valor):
   - Fondo destacado (verde claro o azul claro)
   - Muestra: `📅 Reunión agendada — [día] [mes] [año] · [hora]`
   - Subtítulo: texto limpio del inicio del context (primera línea o primeras palabras)

2. **Grid datos estructurados** (igual que hoy pero primero):
   - INTERÉS: tipo activo, ubicación, superficie, presupuesto, value_deal
   - CALIFICACIÓN: lead_prospect, cumple_requisitos, opportunity_prospect
   - CONTACTO: tipo_contacto, coordinar_reunion, solicito_imagenes, pregunta_direccion
   - ORIGEN: source_type, utm_source, utm_medium, utm_campaign, campaign

3. **Texto contexto limpio** (abajo):
   - Aplicar `limpiarContext(lead.comuroData.context)` antes de mostrar
   - Fondo gris suave, fuente 12-13px
   - Label: "RESUMEN CONVERSACIÓN"

---

## Deduplicación de reunión

Antes de crear la interaccion REUNION en el webhook, verificar:

```js
const yaExiste = await prisma.interaccion.findFirst({
  where: { leadId: lead.id, tipo: 'REUNION', fecha: reunionDt }
})
if (!yaExiste) { /* crear */ }
```

---

## Casos borde

| Caso | Comportamiento |
|------|---------------|
| Context vacío o sin fecha | No crear interaccion, no notificar |
| Fecha inválida (ej: "sdfsfd") | `parsearReunionComuro` retorna null, ignorar |
| Lead sin vendedor asignado | Usar Felix (usuarioId: 8) como fallback |
| Upsert repetido misma fecha | Deduplicar por leadId + tipo + fecha exacta |
| Comuro envía `coordinar_reunion: false` con fecha en context | Confiar en el parse del context, no en el flag |

---

## Archivos a modificar

- `backend/src/routes/comuro.js` — parser + crear interaccion + actualizar actualizadoEn + notificar
- `frontend/src/pages/leads/LeadDetalle.jsx` — helpers + card Comuro rediseñada
