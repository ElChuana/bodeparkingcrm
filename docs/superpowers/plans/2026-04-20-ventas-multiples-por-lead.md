# Ventas múltiples por lead — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que un lead tenga múltiples ventas y que una venta agrupe múltiples unidades, reflejando el flujo real: cotización → venta con N unidades.

**Architecture:** Se elimina `@unique` de `Venta.leadId` en el schema y se migra Railway. El backend acepta un array de `unidadIds` al crear venta. El frontend actualiza las referencias de `lead.venta` (singular) a `lead.ventas` (array) en LeadDetalle y CotizacionEditor.

**Tech Stack:** Prisma · PostgreSQL Railway · Express · React · Ant Design

---

## File Structure

- Modify: `backend/prisma/schema.prisma` — quitar `@unique` de `Venta.leadId`, relación pasa a `ventas Venta[]` en Lead
- Create: `backend/prisma/migrations/TIMESTAMP_allow_multiple_ventas_per_lead/migration.sql`
- Modify: `backend/src/controllers/leadsController.js:233` — `venta` → `ventas` en select
- Modify: `backend/src/controllers/cotizacionesController.js:10` — `venta` → `ventas` en INCLUDE_COMPLETO
- Modify: `backend/src/controllers/ventasController.js:88` — aceptar `unidadIds[]` además de `unidadId`
- Modify: `frontend/src/pages/leads/LeadDetalle.jsx:611` — `lead.venta` → `lead.ventas`
- Modify: `frontend/src/pages/cotizaciones/CotizacionEditor.jsx:1046` — `puedeConvertir`, pasar todos los items al crear venta

---

## Task 1: Schema + Migración Railway

**Files:**
- Modify: `backend/prisma/schema.prisma`
- Create: `backend/prisma/migrations/20260420000000_allow_multiple_ventas_per_lead/migration.sql`

- [ ] **Step 1: Editar schema.prisma**

En `model Venta` cambiar:
```prisma
leadId                Int         @unique
```
Por:
```prisma
leadId                Int
```

En `model Lead` cambiar la relación singular:
```prisma
venta                 Venta?
```
Por:
```prisma
ventas                Venta[]
```

- [ ] **Step 2: Crear el directorio y archivo de migración**

```bash
mkdir -p backend/prisma/migrations/20260420000000_allow_multiple_ventas_per_lead
```

Crear `backend/prisma/migrations/20260420000000_allow_multiple_ventas_per_lead/migration.sql`:
```sql
-- AlterTable: remove unique constraint on leadId in ventas
ALTER TABLE "ventas" DROP CONSTRAINT "ventas_leadId_key";
```

- [ ] **Step 3: Aplicar migración en Railway**

```bash
cd backend
DATABASE_URL="postgresql://bodeparking:bodeparking2026!@monorail.proxy.rlwy.net:35865/bodeparkingcrm" npx prisma migrate deploy
```

Expected output:
```
1 migration found in prisma/migrations
Applying migration `20260420000000_allow_multiple_ventas_per_lead`
The following migration(s) have been applied:
migrations/
  └─ 20260420000000_allow_multiple_ventas_per_lead/
    └─ migration.sql
```

- [ ] **Step 4: Regenerar Prisma Client**

```bash
cd backend
npx prisma generate
```

Expected: `Generated Prisma Client`

- [ ] **Step 5: Verificar que el módulo carga**

```bash
cd backend
node -e "const p = require('./src/lib/prisma'); p.lead.findFirst({ include: { ventas: { select: { id: true } } } }).then(r => console.log('OK, ventas relation:', Array.isArray(r?.ventas))).catch(e => console.error(e.message)).finally(() => p.\$disconnect())"
```

Expected: `OK, ventas relation: true`

- [ ] **Step 6: Commit**

```bash
git add backend/prisma/schema.prisma backend/prisma/migrations/
git commit -m "feat: permitir múltiples ventas por lead — quitar @unique de leadId"
```

---

## Task 2: Backend — leadsController y cotizacionesController

**Files:**
- Modify: `backend/src/controllers/leadsController.js`
- Modify: `backend/src/controllers/cotizacionesController.js`

- [ ] **Step 1: Actualizar leadsController.js — función `obtener`**

Buscar (línea ~233):
```js
        venta: { select: { id: true, estado: true } }
```

Reemplazar con:
```js
        ventas: { select: { id: true, estado: true, unidades: { select: { numero: true, edificio: { select: { nombre: true } } } } } }
```

- [ ] **Step 2: Actualizar cotizacionesController.js — INCLUDE_COMPLETO**

Buscar (línea ~10):
```js
      venta:    { select: { id: true } },
```

Reemplazar con:
```js
      ventas:   { select: { id: true, estado: true } },
```

- [ ] **Step 3: Verificar que el servidor arranca**

```bash
cd backend && node -e "require('./src/controllers/leadsController'); require('./src/controllers/cotizacionesController'); console.log('OK')"
```

Expected: `OK`

- [ ] **Step 4: Commit**

```bash
git add backend/src/controllers/leadsController.js backend/src/controllers/cotizacionesController.js
git commit -m "feat: leads/cotizaciones — venta singular → ventas array"
```

---

## Task 3: Backend — ventasController acepta múltiples unidades

**Files:**
- Modify: `backend/src/controllers/ventasController.js`

El flujo actual acepta un solo `unidadId`. Necesitamos aceptar `unidadIds` (array) para cuando se convierte una cotizacion con varios items. Si el cliente envía `unidadId` (string/number), se normaliza a array internamente.

- [ ] **Step 1: Actualizar función `crear`**

Reemplazar la línea de destructuring (línea ~88):
```js
const { leadId, unidadId, compradorId, brokerId, precioUF, descuentoUF, fechaReserva, notas, cotizacionOrigenId } = req.body
```

Con:
```js
const { leadId, unidadId, unidadIds, compradorId, brokerId, precioUF, descuentoUF, fechaReserva, notas, cotizacionOrigenId } = req.body
// Normalizar: acepta unidadId (singular) o unidadIds (array)
const idsUnidades = unidadIds
  ? (Array.isArray(unidadIds) ? unidadIds : [unidadIds]).map(Number)
  : unidadId ? [Number(unidadId)] : []
```

Reemplazar la validación (línea ~90):
```js
  if (!leadId || !unidadId || !compradorId || !precioUF) {
    return res.status(400).json({ error: 'Lead, unidad, comprador y precio UF son requeridos.' })
  }
```

Con:
```js
  if (!leadId || idsUnidades.length === 0 || !compradorId || !precioUF) {
    return res.status(400).json({ error: 'Lead, al menos una unidad, comprador y precio UF son requeridos.' })
  }
```

Reemplazar la validación de precio mínimo (línea ~97) para usar la primera unidad:
```js
  if (descuentoUF) {
    const unidad = await prisma.unidad.findUnique({ where: { id: idsUnidades[0] } })
```

Reemplazar el bloque de vínculo de unidad (línea ~155-156) para vincular todas:
```js
    // Vincular unidades a la venta y marcarlas como reservadas
    for (const uid of idsUnidades) {
      await prisma.unidad.update({ where: { id: uid }, data: { ventaId: venta.id, estado: 'RESERVADO' } })
    }
```

(Eliminar la línea original: `await prisma.unidad.update({ where: { id: Number(unidadId) }, ... })`)

- [ ] **Step 2: Verificar que el módulo carga**

```bash
cd backend && node -e "require('./src/controllers/ventasController'); console.log('OK')"
```

Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add backend/src/controllers/ventasController.js
git commit -m "feat: ventasController — acepta unidadIds[] al crear venta"
```

---

## Task 4: Frontend — LeadDetalle.jsx

**Files:**
- Modify: `frontend/src/pages/leads/LeadDetalle.jsx`

El componente actualmente usa `lead.venta` (objeto singular). Ahora `lead.ventas` es un array.

- [ ] **Step 1: Reemplazar el botón "Ver Venta" (línea ~611)**

Buscar:
```jsx
          {lead.venta && (
            <Button type="primary" size="small" icon={<ShoppingOutlined />} onClick={() => navigate(`/ventas/${lead.venta.id}`)}>
              Ver Venta
            </Button>
          )}
```

Reemplazar con:
```jsx
          {lead.ventas?.length === 1 && (
            <Button type="primary" size="small" icon={<ShoppingOutlined />} onClick={() => navigate(`/ventas/${lead.ventas[0].id}`)}>
              Ver Venta
            </Button>
          )}
          {lead.ventas?.length > 1 && (
            lead.ventas.map(v => (
              <Button key={v.id} size="small" icon={<ShoppingOutlined />} onClick={() => navigate(`/ventas/${v.id}`)}>
                Venta #{v.id} — {v.estado}
              </Button>
            ))
          )}
```

- [ ] **Step 2: Buscar cualquier otra referencia a `lead.venta` (singular) en el archivo**

```bash
grep -n "lead\.venta[^s]" frontend/src/pages/leads/LeadDetalle.jsx
```

Si hay resultados, reemplazar cada `lead.venta.X` por `lead.ventas?.[0]?.X`.

- [ ] **Step 3: Verificar compilación**

```bash
cd frontend && npm run build 2>&1 | tail -5
```

Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/leads/LeadDetalle.jsx
git commit -m "feat: LeadDetalle — mostrar ventas[] en vez de venta singular"
```

---

## Task 5: Frontend — CotizacionEditor.jsx

**Files:**
- Modify: `frontend/src/pages/cotizaciones/CotizacionEditor.jsx`

Tres cambios:
1. `puedeConvertir` ya no bloquea si hay ventas previas — solo bloquea si ESTA cotizacion ya fue aceptada
2. "Ver Venta" se convierte en botones por cada venta del lead
3. Al crear la venta, se pasan todos los `unidadIds` de los items

- [ ] **Step 1: Actualizar `puedeConvertir` (línea ~1046)**

Reemplazar:
```js
  const puedeConvertir = !esNueva && cotizacion && items.length > 0 && estado !== 'RECHAZADA' && !cotizacion.lead?.venta
```

Con:
```js
  const puedeConvertir = !esNueva && cotizacion && items.length > 0 && estado !== 'RECHAZADA' && estado !== 'ACEPTADA'
```

(Si la cotizacion ya fue ACEPTADA, ya tiene su venta. Si fue RECHAZADA, tampoco. En cualquier otro estado se puede convertir.)

- [ ] **Step 2: Actualizar botón "Ver Venta" (líneas ~1085-1092)**

Reemplazar:
```jsx
          {cotizacion?.lead?.venta && (
            <Button
              icon={<ShoppingOutlined />}
              onClick={() => navigate(`/ventas/${cotizacion.lead.venta.id}`)}
            >
              Ver Venta
            </Button>
          )}
```

Con:
```jsx
          {cotizacion?.lead?.ventas?.map(v => (
            <Button
              key={v.id}
              icon={<ShoppingOutlined />}
              onClick={() => navigate(`/ventas/${v.id}`)}
            >
              Venta #{v.id}
            </Button>
          ))}
```

- [ ] **Step 3: Actualizar `handleOk` para pasar todos los unidadIds (línea ~711)**

Reemplazar:
```js
      crear.mutate({
        leadId: lead.id,
        unidadId: Number(values.unidadId),
        compradorId: lead.contacto.id,
        precioUF: Number(values.precioUF),
        descuentoUF: Number(values.descuentoUF) || 0,
        fechaReserva: values.fechaReserva,
        notas: values.notas,
      })
```

Con:
```js
      crear.mutate({
        leadId: lead.id,
        unidadIds: items.map(i => i.unidadId),
        compradorId: lead.contacto.id,
        precioUF: Number(values.precioUF),
        descuentoUF: Number(values.descuentoUF) || 0,
        fechaReserva: values.fechaReserva,
        notas: values.notas,
        cotizacionOrigenId: cotizacion.id,
      })
```

- [ ] **Step 4: En el modal de conversión, mostrar las unidades como info (no selector)**

Buscar el `<Select>` de unidad dentro del modal de conversión (buscar `values.unidadId` o `unidadId` dentro del `<Form>`). Si existe un selector de unidad, reemplazarlo con texto informativo:

```jsx
<Form.Item label="Unidades">
  <div style={{ fontSize: 12, color: '#6b7280' }}>
    {items.map(i => `${i.unidad?.edificio?.nombre} ${i.unidad?.numero}`).join(', ')}
  </div>
</Form.Item>
```

- [ ] **Step 5: Verificar compilación**

```bash
cd frontend && npm run build 2>&1 | tail -5
```

Expected: sin errores.

- [ ] **Step 6: Commit y push**

```bash
git add frontend/src/pages/cotizaciones/CotizacionEditor.jsx
git commit -m "feat: CotizacionEditor — múltiples ventas por lead, pasar todos los unidadIds"
git push
```

---

## Self-Review

**Spec coverage:**
- [x] Lead puede tener múltiples ventas → Task 1 (schema) + Tasks 2-5 (backend/frontend)
- [x] Venta agrupa múltiples unidades → Task 3 (unidadIds array)
- [x] Cotizacion → venta ya no bloqueada por venta existente → Task 5
- [x] Descuento a nivel de venta → ya existía (`descuentoUF` en Venta), no requiere cambio
- [x] Migración Railway → Task 1

**Notas importantes:**
- `fusionarDuplicados` en leadsController ya usa `updateMany` en ventas — no requiere cambio
- `ventasController.actualizarEstado` usa `venta.leadId` para actualizar etapa del lead — esto actualiza la etapa según la ÚLTIMA venta modificada, que es el comportamiento correcto
- El select de la modal de conversión que pedía `unidadId` se elimina porque las unidades vienen de los items de la cotizacion
