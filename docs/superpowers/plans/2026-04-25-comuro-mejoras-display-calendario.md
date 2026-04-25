# Comuro — Mejoras Display, Calendario y Notificaciones

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Parsear reuniones agendadas por Comuro para crearlas como interacciones (aparecen en calendario + notifican al vendedor), y mejorar el display del card Comuro en LeadDetalle con datos estructurados arriba y contexto limpio abajo.

**Architecture:** El webhook `comuro.js` parsea fecha/hora del campo `context`, crea una interaccion tipo REUNION con esa fecha, y notifica. `LeadDetalle.jsx` usa dos helpers JS para limpiar el context y parsear la fecha, rediseñando el card con reunión destacada arriba, grid de datos, y texto limpio abajo.

**Tech Stack:** Node.js + Prisma (backend), React + Ant Design (frontend)

---

## Archivos a modificar

- `backend/src/routes/comuro.js` — agregar parser, crear interaccion, actualizar actualizadoEn, notificar
- `frontend/src/pages/leads/LeadDetalle.jsx` — helpers + card Comuro rediseñada

---

### Task 1: Backend — Parser de reunión + interaccion REUNION en webhook

**Files:**
- Modify: `backend/src/routes/comuro.js`

- [ ] **Step 1: Agregar función `parsearReunionComuro` al inicio del archivo** (después de los requires)

Abrir `backend/src/routes/comuro.js`. Después de la línea `const { notificarLead } = require('../lib/notifications')`, agregar:

```js
function limpiarContextComuro(context) {
  if (!context) return ''
  return context.replace(/\|\s*Fecha Reuni[oó]n:.*$/s, '').trim()
}

function parsearReunionComuro(context) {
  const match = context?.match(/Fecha Reuni[oó]n:\s*(\d{2}\/\d{2}\/\d{4})\|Hora Reunion:\s*(\d{2}:\d{2})/)
  if (!match) return null
  const [, fecha, hora] = match
  const [dia, mes, anio] = fecha.split('/')
  const dt = new Date(`${anio}-${mes}-${dia}T${hora}:00`)
  return isNaN(dt.getTime()) ? null : { dt, fecha, hora }
}
```

- [ ] **Step 2: Agregar helper `crearReunionComuro` (función interna)**

Justo después de `parsearReunionComuro`, agregar:

```js
const FELIX_ID = 8

async function crearReunionComuro({ leadId, vendedorId, context, reunion, nombreContacto }) {
  const yaExiste = await prisma.interaccion.findFirst({
    where: { leadId, tipo: 'REUNION', fecha: reunion.dt }
  })
  if (yaExiste) return

  await prisma.interaccion.create({
    data: {
      leadId,
      usuarioId: vendedorId ?? FELIX_ID,
      tipo: 'REUNION',
      descripcion: limpiarContextComuro(context) || 'Reunión agendada por Comuro.',
      fecha: reunion.dt,
    }
  })

  await notificarLead({
    leadId,
    mensaje: `Comuro agendó reunión con ${nombreContacto} el ${reunion.fecha} a las ${reunion.hora}`,
    tipo: 'ACTIVIDAD',
  })
}
```

- [ ] **Step 3: En el bloque UPDATE, agregar `actualizadoEn` y llamar `crearReunionComuro`**

Encontrar el bloque UPDATE (línea ~96):

```js
await prisma.lead.update({
  where: { id: lead.id },
  data: {
    comuroData: comuroDataFinal,
    ...(internal_uuid && { comuroUuid: internal_uuid }),
    ...(body.thread_id && { comuroThreadId: body.thread_id }),
  }
})
return res.status(200).json({ lead_id: String(lead.id), status: 'updated' })
```

Reemplazar por:

```js
const leadActualizado = await prisma.lead.update({
  where: { id: lead.id },
  data: {
    comuroData: comuroDataFinal,
    actualizadoEn: new Date(),
    ...(internal_uuid && { comuroUuid: internal_uuid }),
    ...(body.thread_id && { comuroThreadId: body.thread_id }),
  },
  select: { id: true, vendedorId: true }
})

const reunion = parsearReunionComuro(body.context)
if (reunion) {
  const nombreContacto = name || body.nombre_whatsapp || 'cliente'
  await crearReunionComuro({
    leadId: lead.id,
    vendedorId: leadActualizado.vendedorId,
    context: body.context,
    reunion,
    nombreContacto,
  })
}

return res.status(200).json({ lead_id: String(lead.id), status: 'updated' })
```

- [ ] **Step 4: En el bloque CREATE, llamar `crearReunionComuro` si hay reunión**

Encontrar el bloque CREATE (después de `prisma.lead.create`), actualmente termina con `notificarLead(...)`. Después de ese `notificarLead`, agregar:

```js
const reunion = parsearReunionComuro(body.context)
if (reunion) {
  await crearReunionComuro({
    leadId: leadNuevo.id,
    vendedorId: null,
    context: body.context,
    reunion,
    nombreContacto: `${nombreContacto} ${apellidoContacto}`.trim(),
  })
}
```

- [ ] **Step 5: Verificar manualmente con un lead de ejemplo**

Buscar en la BD un lead con reunión agendada:
```sql
SELECT id, "comuroData"->>'context' as context, "vendedorId"
FROM leads
WHERE "comuroData"->>'context' ILIKE '%Fecha Reunión:%'
  AND "comuroData"->>'context' NOT ILIKE '%Fecha Reunión: |%'
LIMIT 1;
```
Confirmar que el parse extraería fecha y hora válidas del context.

- [ ] **Step 6: Commit**

```bash
git add backend/src/routes/comuro.js
git commit -m "feat: comuro parsea reuniones, crea interaccion REUNION y notifica vendedor"
git push origin main
```

---

### Task 2: Frontend — Helpers + card Comuro rediseñada

**Files:**
- Modify: `frontend/src/pages/leads/LeadDetalle.jsx`

- [ ] **Step 1: Agregar helpers al inicio del archivo**

En `LeadDetalle.jsx`, buscar la zona de imports/constantes al tope. Agregar después de las constantes existentes (buscar la última `const` de constantes, antes del primer componente):

```js
function limpiarContext(text) {
  if (!text) return ''
  return text.replace(/\|\s*Fecha Reuni[oó]n:.*$/s, '').trim()
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

- [ ] **Step 2: Reemplazar el card Comuro completo**

Localizar el bloque entre `{/* Comuro — debajo de cotizaciones */}` y su `</Card>` de cierre (líneas ~1010–1094 en el archivo actual). Reemplazar todo ese bloque con:

```jsx
{/* Comuro — debajo de cotizaciones */}
{lead.comuroData && (() => {
  const reunion = parsearFechaComuro(lead.comuroData.context)
  const contextoLimpio = limpiarContext(lead.comuroData.context)

  return (
    <Card
      style={{ marginTop: 16, borderColor: '#ede9fe', borderTop: '3px solid #7c3aed' }}
      title={
        <Space>
          <RobotOutlined style={{ color: '#7c3aed', fontSize: 16 }} />
          <Text strong style={{ color: '#7c3aed' }}>Datos Comuro</Text>
          {lead.comuroThreadId && (
            <Text type="secondary" style={{ fontSize: 12, fontWeight: 400 }}>· Thread: {lead.comuroThreadId}</Text>
          )}
        </Space>
      }
      extra={
        lead.comuroData.conversation_url
          ? <a href={lead.comuroData.conversation_url} target="_blank" rel="noreferrer" style={{ fontSize: 13 }}>Ver conversación →</a>
          : null
      }
    >
      {/* Reunión agendada — destacada arriba */}
      {reunion && (
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 14px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 20 }}>📅</span>
          <div>
            <Text strong style={{ fontSize: 13, color: '#15803d' }}>
              Reunión agendada — {reunion.fecha} · {reunion.hora}
            </Text>
            {contextoLimpio && (
              <div style={{ fontSize: 12, color: '#166534', marginTop: 2 }}>
                {contextoLimpio.split('\n')[0].slice(0, 120)}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Grid datos estructurados */}
      <Row gutter={[16, 8]}>
        {(lead.comuroData.interes_tipo_activo || lead.comuroData.interes_ubicacion || lead.comuroData.interes_superficie || lead.comuroData.interes_presupuesto || lead.comuroData.value_deal) && (
          <Col xs={24} sm={12} md={6}>
            <Text type="secondary" style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, display: 'block', marginBottom: 6 }}>INTERÉS</Text>
            {lead.comuroData.interes_tipo_activo && <div style={{ fontSize: 13 }}>📦 {lead.comuroData.interes_tipo_activo}</div>}
            {lead.comuroData.interes_ubicacion && <div style={{ fontSize: 13 }}>📍 {lead.comuroData.interes_ubicacion}</div>}
            {lead.comuroData.interes_superficie && <div style={{ fontSize: 13 }}>📐 {lead.comuroData.interes_superficie}</div>}
            {lead.comuroData.interes_presupuesto && lead.comuroData.interes_presupuesto !== 'false' && <div style={{ fontSize: 13 }}>💰 {lead.comuroData.interes_presupuesto}</div>}
            {lead.comuroData.value_deal && <div style={{ fontSize: 13, color: '#059669', fontWeight: 600 }}>{lead.comuroData.value_deal}</div>}
          </Col>
        )}

        {(lead.comuroData.lead_prospect !== undefined || lead.comuroData.cumple_requisitos !== undefined || lead.comuroData.opportunity_prospect !== undefined) && (
          <Col xs={24} sm={12} md={6}>
            <Text type="secondary" style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, display: 'block', marginBottom: 6 }}>CALIFICACIÓN</Text>
            {lead.comuroData.lead_prospect !== undefined && (
              <div style={{ fontSize: 13 }}>{lead.comuroData.lead_prospect ? '✅' : '❌'} Prospecto: <Text strong>{lead.comuroData.lead_prospect ? 'Sí' : 'No'}</Text></div>
            )}
            {lead.comuroData.cumple_requisitos !== undefined && (
              <div style={{ fontSize: 13 }}>{lead.comuroData.cumple_requisitos ? '✅' : '❌'} Cumple req.: <Text strong>{lead.comuroData.cumple_requisitos ? 'Sí' : 'No'}</Text></div>
            )}
            {lead.comuroData.opportunity_prospect !== undefined && (
              <div style={{ fontSize: 13 }}>{lead.comuroData.opportunity_prospect ? '✅' : '❌'} Oportunidad: <Text strong>{lead.comuroData.opportunity_prospect ? 'Sí' : 'No'}</Text></div>
            )}
          </Col>
        )}

        {(lead.comuroData.coordinar_reunion !== undefined || lead.comuroData.tipo_contacto || lead.comuroData.fecha_visita || lead.comuroData.solicito_imagenes || lead.comuroData.pregunta_direccion) && (
          <Col xs={24} sm={12} md={6}>
            <Text type="secondary" style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, display: 'block', marginBottom: 6 }}>CONTACTO</Text>
            {lead.comuroData.tipo_contacto && <div style={{ fontSize: 13 }}>📱 {lead.comuroData.tipo_contacto}</div>}
            {lead.comuroData.coordinar_reunion !== undefined && (
              <div style={{ fontSize: 13 }}>{lead.comuroData.coordinar_reunion ? '✅' : '❌'} Quiere visita</div>
            )}
            {lead.comuroData.fecha_visita && <div style={{ fontSize: 13 }}>📅 {lead.comuroData.fecha_visita} {lead.comuroData.hora_visita || ''}</div>}
            {lead.comuroData.solicito_imagenes && <div style={{ fontSize: 13 }}>🖼 Solicitó imágenes</div>}
            {lead.comuroData.pregunta_direccion && <div style={{ fontSize: 13 }}>📍 Preguntó dirección</div>}
          </Col>
        )}

        {(lead.comuroData.utm_source || lead.comuroData.utm_campaign || lead.comuroData.source_type || lead.comuroData.campaign) && (
          <Col xs={24} sm={12} md={6}>
            <Text type="secondary" style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, display: 'block', marginBottom: 6 }}>ORIGEN</Text>
            {lead.comuroData.source_type && <div style={{ fontSize: 13 }}>🔗 {lead.comuroData.source_type}</div>}
            {lead.comuroData.utm_source && <div style={{ fontSize: 13 }}>Fuente: {lead.comuroData.utm_source}</div>}
            {lead.comuroData.utm_medium && <div style={{ fontSize: 13 }}>Medio: {lead.comuroData.utm_medium}</div>}
            {lead.comuroData.utm_campaign && <div style={{ fontSize: 12, color: '#6b7280' }}>{lead.comuroData.utm_campaign}</div>}
            {lead.comuroData.campaign && <div style={{ fontSize: 12, color: '#6b7280' }}>{lead.comuroData.campaign}</div>}
          </Col>
        )}
      </Row>

      {/* Contexto limpio abajo */}
      {contextoLimpio && (
        <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px 14px', marginTop: 16 }}>
          <Text type="secondary" style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, display: 'block', marginBottom: 4 }}>RESUMEN CONVERSACIÓN</Text>
          <Text style={{ fontSize: 12, color: '#374151', whiteSpace: 'pre-wrap' }}>{contextoLimpio}</Text>
        </div>
      )}
    </Card>
  )
})()}
```

- [ ] **Step 3: Verificar que el build compila sin errores**

```bash
cd /Users/juana/Documents/bodeparkingcrm/frontend && npm run build 2>&1 | tail -20
```

Esperado: sin errores de compilación.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/leads/LeadDetalle.jsx
git commit -m "feat: comuro card rediseñada con reunión destacada, datos estructurados arriba y contexto limpio abajo"
git push origin main
```
