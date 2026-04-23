# Automatizaciones Pipeline — Design Spec

## Objetivo

Extender el sistema de automatizaciones para:
1. Agregar etapa `INTERESADO` al pipeline
2. Rastrear motivo y etapa de pérdida de leads
3. Marcar visualmente si un lead fue perdido de forma automática vs manual
4. Configurar reglas de pipeline: si lead lleva X días en etapa Y → mover a etapa Z

---

## Scope

**Fase 1 (este spec):** Schema + backend + frontend para pipeline automation y lost reasons.
**Fase 2 (spec separado):** Analytics del embudo (funnel + tiempo promedio por etapa).

---

## Schema changes (`backend/prisma/schema.prisma`)

### 1. Enum `EtapaLead` — agregar `INTERESADO`

```prisma
enum EtapaLead {
  NUEVO
  NO_CONTESTA
  CONTACTADO
  COTIZACION_ENVIADA
  INTERESADO           // NUEVA — entre COTIZACION_ENVIADA y VISITA_AGENDADA
  VISITA_AGENDADA
  VISITA_REALIZADA
  SEGUIMIENTO_POST_VISITA
  NEGOCIACION
  RESERVA
  ENTREGA
  POSTVENTA
  PERDIDO
}
```

### 2. Modelo `Lead` — nuevos campos

```prisma
etapaAntesDePerdido   EtapaLead?   // se guarda automáticamente al pasar a PERDIDO
motivoPerdidaCat      String?      // categoría predefinida (ver lista abajo)
motivoPerdidaNota     String?      // nota libre opcional del vendedor
perdidaAutomatica     Boolean      @default(false)
perdidaAutomaticaEn   DateTime?
```

**Categorías válidas para `motivoPerdidaCat`:**
- `NO_CONTESTA` — Nunca contestó / dejó de contestar
- `PRECIO_ALTO` — Precio fuera de presupuesto
- `ELIGIO_COMPETENCIA` — Eligió otra empresa
- `NO_CALIFICA_FINANC` — No califica financieramente
- `NO_GUSTO_PRODUCTO` — No le gustó el producto / ubicación
- `PERDIO_INTERES` — Perdió el interés sin razón clara
- `OTRO` — Otro motivo

### 3. Modelo `AlertaConfig` — nuevos campos

```prisma
etapaOrigen    String?   // EtapaLead como string, ej: "NUEVO"
etapaDestino   String?   // EtapaLead como string, ej: "PERDIDO"
motivoAuto     String?   // motivoPerdidaCat a asignar cuando etapaDestino=PERDIDO
```

### 4. Nuevo tipo en `AlertaConfig.tipo`

Agregar `PIPELINE_TIMEOUT` a los tipos existentes. Una regla `PIPELINE_TIMEOUT` significa: "si el lead lleva más de `umbralDias` días en `etapaOrigen` → moverlo a `etapaDestino`".

---

## Backend changes

### `alertasController.js` — `_ejecutarChequeo()`

Agregar handler para tipo `PIPELINE_TIMEOUT` dentro del loop de reglas activas:

```
Para cada regla PIPELINE_TIMEOUT activa:
  1. Buscar leads donde:
     - etapa = alerta.etapaOrigen
     - actualizadoEn < (hoy - umbralDias días)
     - etapa NOT IN ['PERDIDO', 'ENTREGA', 'POSTVENTA']

  2. Para cada lead encontrado:
     a. Si etapaDestino = 'PERDIDO':
        - Leer etapa actual → guardar en etapaAntesDePerdido
        - Poner perdidaAutomatica = true
        - Poner perdidaAutomaticaEn = ahora
        - Poner motivoPerdidaCat = alerta.motivoAuto (o 'NO_CONTESTA' por defecto)
        - Poner motivoPerdida = "Auto: [umbralDias] días en [etapaOrigen] sin avance"
     b. Si etapaDestino = otra etapa: solo actualizar etapa
     
     c. En todos los casos:
        - Actualizar etapa del lead
        - Crear Interaccion:
            tipo: 'NOTA'
            descripcion: "Automatización: lead movido de [etapaOrigen] a [etapaDestino] 
                          por inactividad de [umbralDias] días (regla automática)"
            usuarioId: gerentes[0]?.id || null
        - Notificar al vendedor asignado si existe

  3. Registrar en acciones: { tipo: 'PIPELINE_TIMEOUT', leadId, de: etapaOrigen, a: etapaDestino }
```

### `leadsController.js` — `actualizar()`

Cuando `etapa` en el body es `'PERDIDO'` y el lead no estaba ya en PERDIDO:
```
1. Leer etapa actual del lead ANTES de actualizar
2. Guardar etapaAntesDePerdido = etapa actual
3. Guardar motivoPerdidaCat si viene en body
4. Guardar motivoPerdidaNota si viene en body
5. perdidaAutomatica = false (es manual)
```

### `seedData.js` — reglas PIPELINE_TIMEOUT por defecto

Agregar estas reglas desactivadas (activa: false) para que aparezcan en la UI listas para configurar:

| etapaOrigen | etapaDestino | umbralDias | motivoAuto |
|---|---|---|---|
| NUEVO | NO_CONTESTA | 3 | — |
| NO_CONTESTA | PERDIDO | 14 | NO_CONTESTA |
| COTIZACION_ENVIADA | INTERESADO | 5 | — |
| VISITA_REALIZADA | SEGUIMIENTO_POST_VISITA | 3 | — |
| NEGOCIACION | NEGOCIACION | 14 | — (solo notifica) |

Para insertar en BD existente usar `prisma.alertaConfig.createMany({ skipDuplicates: true })`.

---

## Frontend changes

### 1. Modal `ModalPerdido.jsx` (nuevo componente)

Se muestra cuando el vendedor arrastra un lead a PERDIDO en el kanban o cambia la etapa en LeadDetalle.

```
Campos:
- Select "Motivo" (requerido): NO_CONTESTA | PRECIO_ALTO | ELIGIO_COMPETENCIA |
  NO_CALIFICA_FINANC | NO_GUSTO_PRODUCTO | PERDIO_INTERES | OTRO
- TextArea "Nota adicional" (opcional, max 300 chars)
- Info readonly: "Etapa actual: [etapa] — se guardará automáticamente"

Al confirmar:
  PUT /leads/:id { etapa: 'PERDIDO', motivoPerdidaCat, motivoPerdidaNota }
```

### 2. `LeadDetalle.jsx` — banner automático

Cuando `lead.perdidaAutomatica === true`, mostrar banner arriba del contenido:

```jsx
<Alert
  type="info"
  icon={<RobotOutlined />}
  message="Perdido automáticamente"
  description={`Estaba en ${lead.etapaAntesDePerdido} sin actividad por más de X días.
                Regla aplicada el ${formatDate(lead.perdidaAutomaticaEn)}.`}
/>
```

Cuando `lead.etapa === 'PERDIDO'` (cualquier origen) mostrar también:
```
Motivo: [chip con motivoPerdidaCat]   Desde: [etapaAntesDePerdido]
Nota: [motivoPerdidaNota si existe]
```

### 3. Kanban y lista de leads

En tarjetas de leads con `etapa = PERDIDO`:
- Badge `🤖 Auto` (azul claro) si `perdidaAutomatica = true`
- Tag con label del `motivoPerdidaCat` si existe

Labels para los chips:
```js
const MOTIVO_LABEL = {
  NO_CONTESTA:        'No contesta',
  PRECIO_ALTO:        'Precio alto',
  ELIGIO_COMPETENCIA: 'Eligió competencia',
  NO_CALIFICA_FINANC: 'No califica financ.',
  NO_GUSTO_PRODUCTO:  'No gustó producto',
  PERDIO_INTERES:     'Perdió interés',
  OTRO:               'Otro',
}
```

### 4. `Automatizaciones.jsx` — sección "Reglas de pipeline"

Nueva sección debajo de las reglas existentes con las reglas `PIPELINE_TIMEOUT`.

Cada card muestra:
```
[Etapa origen] ──→ [Etapa destino]    si pasan [X] días sin avance
[Switch activa]  [Botón Configurar]
```

Modal de configurar (reusar `ModalConfigurar` existente, extender con):
- Select "Etapa origen" (todas las etapas activas)
- Select "Etapa destino" (todas las etapas + PERDIDO)
- InputNumber "Días sin avance"
- Si etapaDestino = PERDIDO: Select "Motivo automático"

---

## Audit trail

Toda acción automática crea una `Interaccion` con:
- `tipo: 'NOTA'`
- `descripcion`: texto que incluye "Automatización:" al inicio
- `usuarioId`: primer GERENTE activo (o null si no hay)

Esto permite ver en el historial del lead exactamente qué regla actuó y cuándo.

---

## Reglas de negocio importantes

1. Un lead en `ENTREGA`, `POSTVENTA` o `PERDIDO` nunca es afectado por reglas PIPELINE_TIMEOUT
2. Si un lead ya está en `PERDIDO` y vuelve a ser evaluado, se ignora
3. `etapaAntesDePerdido` solo se escribe una vez (al pasar a PERDIDO) — no se sobreescribe
4. `perdidaAutomatica` es false por defecto — solo se pone true desde el cron
5. El modal `ModalPerdido` se dispara siempre que un humano mueve a PERDIDO (kanban drag o cambio manual en detalle)

---

## Archivos a modificar / crear

| Archivo | Acción |
|---|---|
| `backend/prisma/schema.prisma` | Modificar: nuevo enum value + campos en Lead + campos en AlertaConfig |
| `backend/src/controllers/alertasController.js` | Modificar: handler PIPELINE_TIMEOUT en _ejecutarChequeo |
| `backend/src/controllers/leadsController.js` | Modificar: capturar etapaAntesDePerdido + motivo al actualizar |
| `backend/src/seedData.js` | Modificar: insertar reglas PIPELINE_TIMEOUT por defecto |
| `frontend/src/components/ModalPerdido.jsx` | Crear: modal de motivo de pérdida |
| `frontend/src/pages/leads/LeadDetalle.jsx` | Modificar: banner automático + info de pérdida |
| `frontend/src/pages/leads/Leads.jsx` o Kanban | Modificar: badge auto + tag motivo en tarjetas PERDIDO |
| `frontend/src/pages/automatizaciones/Automatizaciones.jsx` | Modificar: nueva sección reglas pipeline + extender modal |
