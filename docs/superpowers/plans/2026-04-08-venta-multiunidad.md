# Venta Multi-Unidad + Proceso Legal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cambiar schema para que una Venta tenga múltiples Unidades y un ProcesoLegal. Migrar 26 ventas en producción.

**Architecture:** Mover `unidadId` de `Venta` a `ventaId` en `Unidad`. Fusionar ventas con mismo comprador+fecha en una sola. Actualizar ProcesoLegal de cada venta según datos del spreadsheet real.

**Tech Stack:** Node.js, Prisma, PostgreSQL (Railway), React + Ant Design

---

## Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `backend/prisma/schema.prisma` | Quitar `unidadId` de Venta, agregar `ventaId?` a Unidad |
| `backend/src/controllers/ventasController.js` | Actualizar queries y lógica crear/actualizar |
| `backend/src/controllers/legalController.js` | `venta.unidadId` → `venta.unidades[0].id` |
| `backend/src/controllers/reportesController.js` | Queries con `unidad` → `unidades` |
| `backend/src/controllers/dashboardController.js` | Queries con `unidad` → `unidades` |
| `frontend/src/pages/ventas/Ventas.jsx` | Columna unidad: `unidad.numero` → `unidades[0].numero` |
| `frontend/src/pages/ventas/VentaDetalle.jsx` | Mostrar lista de unidades |

---

## Task 1: Schema Prisma

**Files:**
- Modify: `backend/prisma/schema.prisma`

- [ ] **Step 1: Editar schema — quitar unidadId de Venta, agregar ventaId a Unidad**

En `backend/prisma/schema.prisma`:

Reemplazar en model `Venta`:
```prisma
// QUITAR estas líneas:
  unidadId              Int
  unidad                Unidad      @relation(fields: [unidadId], references: [id])
// AGREGAR:
  unidades              Unidad[]
```

Reemplazar en model `Unidad`:
```prisma
// AGREGAR después del campo `estado`:
  ventaId               Int?
  venta                 Venta?      @relation(fields: [ventaId], references: [id])
// QUITAR la relación inversa actual si existe:
  // venta              Venta?
```

- [ ] **Step 2: Generar migration**

```bash
cd backend
npx prisma migrate dev --name venta-multiunidad
```

Esperado: nueva migration en `backend/prisma/migrations/`

- [ ] **Step 3: Verificar schema compilado**

```bash
npx prisma generate
```

Esperado: sin errores.

- [ ] **Step 4: Commit**

```bash
git add backend/prisma/
git commit -m "feat: schema venta multi-unidad — ventaId en Unidad"
```

---

## Task 2: Actualizar ventasController.js

**Files:**
- Modify: `backend/src/controllers/ventasController.js`

- [ ] **Step 1: Actualizar `listar` — include unidades en vez de unidad**

En `listar`, reemplazar:
```js
unidad: {
  select: {
    numero: true, tipo: true,
    edificio: { select: { nombre: true, region: true } }
  }
},
```
Por:
```js
unidades: {
  select: {
    numero: true, tipo: true,
    edificio: { select: { nombre: true, region: true } }
  }
},
```

- [ ] **Step 2: Actualizar `obtener` — include unidades**

En `obtener`, reemplazar:
```js
unidad: { include: { edificio: true } },
```
Por:
```js
unidades: { include: { edificio: true } },
```

- [ ] **Step 3: Actualizar `crear` — ya no setear unidadId en venta, en cambio vincular unidad**

Reemplazar el bloque de `prisma.venta.create`:
```js
const venta = await prisma.venta.create({
  data: {
    leadId: Number(leadId),
    unidadId: Number(unidadId),    // ← QUITAR
    ...
  }
})
// Marcar unidad como reservada
await prisma.unidad.update({ where: { id: Number(unidadId) }, data: { estado: 'RESERVADO' } })
```
Por:
```js
const venta = await prisma.venta.create({
  data: {
    leadId: Number(leadId),
    compradorId: Number(compradorId),
    vendedorId: lead?.vendedorId || null,
    brokerId: brokerId ? Number(brokerId) : lead?.brokerId || null,
    gerenteId: gerenteId || null,
    precioUF: Number(precioUF),
    descuentoUF: descuentoUF ? Number(descuentoUF) : 0,
    estado: 'RESERVA',
    fechaReserva: fechaReserva ? new Date(fechaReserva) : new Date(),
    notas
  },
  include: {
    comprador: { select: { nombre: true, apellido: true } },
    unidades: { select: { numero: true, tipo: true, edificio: { select: { nombre: true } } } }
  }
})
// Vincular unidad a la venta
await prisma.unidad.update({ where: { id: Number(unidadId) }, data: { ventaId: venta.id, estado: 'RESERVADO' } })
```

- [ ] **Step 4: Actualizar `actualizarEstado` — unidades en vez de unidadId**

Reemplazar:
```js
await prisma.unidad.update({ where: { id: venta.unidadId }, data: { estado: 'VENDIDO' } })
```
Por:
```js
await prisma.unidad.updateMany({ where: { ventaId: Number(id) }, data: { estado: 'VENDIDO' } })
```

Y:
```js
await prisma.unidad.update({ where: { id: venta.unidadId }, data: { estado: 'DISPONIBLE' } })
```
Por:
```js
await prisma.unidad.updateMany({ where: { ventaId: Number(id) }, data: { estado: 'DISPONIBLE', ventaId: null } })
```

- [ ] **Step 5: Commit**

```bash
git add backend/src/controllers/ventasController.js
git commit -m "feat: ventasController usa unidades[] en vez de unidadId"
```

---

## Task 3: Actualizar legalController.js

**Files:**
- Modify: `backend/src/controllers/legalController.js`

- [ ] **Step 1: Arreglar referencia a unidadId en actualizar**

Reemplazar:
```js
const venta = await prisma.venta.findUnique({ where: { id: Number(ventaId) } })
await prisma.unidad.update({ where: { id: venta.unidadId }, data: { estado: 'VENDIDO' } })
```
Por:
```js
await prisma.unidad.updateMany({ where: { ventaId: Number(ventaId) }, data: { estado: 'VENDIDO' } })
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/controllers/legalController.js
git commit -m "fix: legalController usa updateMany para unidades"
```

---

## Task 4: Actualizar index.js (endpoint importar ventas)

**Files:**
- Modify: `backend/src/index.js`

- [ ] **Step 1: Cambiar lógica de creación en endpoint importar ventas**

En `index.js`, el endpoint deshabilitado de importar ventas usa `unidadId: d.unidadId` en `prisma.venta.create`. Actualizar para que vincule la unidad después de crear la venta:

Reemplazar:
```js
const venta = await prisma.venta.create({
  data: {
    ...
    unidadId: d.unidadId,
    ...
  }
})
...
await prisma.unidad.update({ where: { id: d.unidadId }, data: { estado: 'RESERVADO' } })
```
Por:
```js
const venta = await prisma.venta.create({
  data: {
    leadId, compradorId: contactoId,
    vendedorId: d.vendedorId || null,
    precioUF: d.precioUF,
    estado: d.estado,
    fechaReserva: d.fechaReserva ? new Date(d.fechaReserva) : new Date(),
    ...(d.fechaPromesa && { fechaPromesa: new Date(d.fechaPromesa) }),
  }
})
await prisma.unidad.update({ where: { id: d.unidadId }, data: { ventaId: venta.id, estado: 'RESERVADO' } })
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/index.js
git commit -m "fix: importar ventas vincula unidad via ventaId"
```

---

## Task 5: Actualizar frontend Ventas.jsx

**Files:**
- Modify: `frontend/src/pages/ventas/Ventas.jsx`

- [ ] **Step 1: Columna Unidad — mostrar primera unidad o lista**

Reemplazar:
```jsx
title: 'Unidad', key: 'unidad',
render: (_, v) => (
  <>
    <div>{v.unidad?.edificio?.nombre}</div>
    <div style={{ fontSize: 12, color: '#8c8c8c' }}>{v.unidad?.tipo === 'BODEGA' ? 'Bodega' : 'Est.'} {v.unidad?.numero}</div>
  </>
)
```
Por:
```jsx
title: 'Unidad(es)', key: 'unidades',
render: (_, v) => {
  const us = v.unidades || []
  if (us.length === 0) return <Text type="secondary">—</Text>
  return (
    <>
      <div>{us[0]?.edificio?.nombre}</div>
      <div style={{ fontSize: 12, color: '#8c8c8c' }}>
        {us.map(u => `${u.tipo === 'BODEGA' ? 'Bodega' : 'Est.'} ${u.numero}`).join(', ')}
      </div>
    </>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/ventas/Ventas.jsx
git commit -m "feat: Ventas.jsx muestra lista de unidades"
```

---

## Task 6: Actualizar frontend VentaDetalle.jsx

**Files:**
- Modify: `frontend/src/pages/ventas/VentaDetalle.jsx`

- [ ] **Step 1: Sección info unidad — mostrar lista de unidades**

Buscar y reemplazar sección que muestra `venta.unidad?.edificio?.region` y `venta.unidad?.m2`:

```jsx
// REEMPLAZAR:
{venta.unidad?.edificio?.region && <div>...</div>}
{venta.unidad?.m2 && <div>...</div>}

// POR:
{(venta.unidades || []).map(u => (
  <div key={u.id} style={{ marginBottom: 4 }}>
    <Text strong>{u.tipo === 'BODEGA' ? 'Bodega' : 'Est.'} {u.numero}</Text>
    {u.m2 && <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>{u.m2} m²</Text>}
    {u.edificio?.region && <div><Text type="secondary" style={{ fontSize: 12 }}>{u.edificio.region}</Text></div>}
  </div>
))}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/ventas/VentaDetalle.jsx
git commit -m "feat: VentaDetalle muestra lista de unidades"
```

---

## Task 7: Script migración datos producción

**Files:**
- Create: `backend/src/migrarVentasMultiUnidad.js`

Este script ejecuta en Railway via SSH:
1. Fusiona ventas con mismo comprador + misma fechaReserva
2. Actualiza ProcesoLegal según estado real

- [ ] **Step 1: Crear script**

```js
// backend/src/migrarVentasMultiUnidad.js
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

// Grupos a fusionar: [ventaIdPrincipal, ...ventaIdsSecundarias]
// Determinados por: mismo compradorId + misma fechaReserva
// Los IDs se detectan dinámicamente

async function fusionarGrupos() {
  const ventas = await prisma.venta.findMany({
    select: { id: true, compradorId: true, fechaReserva: true },
    orderBy: { id: 'asc' }
  })

  // Agrupar por compradorId + fechaReserva (solo fecha, sin hora)
  const grupos = {}
  for (const v of ventas) {
    const fechaKey = v.fechaReserva ? v.fechaReserva.toISOString().split('T')[0] : 'null'
    const key = `${v.compradorId}-${fechaKey}`
    if (!grupos[key]) grupos[key] = []
    grupos[key].push(v.id)
  }

  for (const [key, ids] of Object.entries(grupos)) {
    if (ids.length < 2) continue
    const [principal, ...secundarias] = ids
    console.log(`Fusionando ${ids.join(', ')} → principal: ${principal}`)

    for (const secId of secundarias) {
      // Mover unidades al principal
      await prisma.unidad.updateMany({
        where: { ventaId: secId },
        data: { ventaId: principal }
      })
      // Eliminar ProcesoLegal de secundaria
      await prisma.procesoLegal.deleteMany({ where: { ventaId: secId } })
      // Eliminar comisiones de secundaria
      await prisma.comision.deleteMany({ where: { ventaId: secId } })
      // Eliminar venta secundaria
      await prisma.venta.delete({ where: { id: secId } })
      console.log(`  Venta #${secId} fusionada y eliminada`)
    }
  }
}

// Mapa: unidadId → datos ProcesoLegal reales del spreadsheet
// Columnas spreadsheet: tienePromesa, estadoActual
// SI = completado, X = pendiente
// estadoActual = último paso completado (sin incluir X)
const LEGAL_DATA = [
  // unidadId, tienePromesa, estadoActual
  { unidadId: 70, tienePromesa: false, estadoActual: 'ENTREGADO' },   // Marcia Fuentes
  { unidadId: 72, tienePromesa: false, estadoActual: 'ENTREGADO' },   // Sara Linares B251
  { unidadId: 73, tienePromesa: false, estadoActual: 'ENTREGADO' },   // Sara Linares B56
  { unidadId: 74, tienePromesa: false, estadoActual: 'ENTREGADO' },   // Elias Valverde
  { unidadId: 64, tienePromesa: false, estadoActual: 'ENTREGADO' },   // Gemenes Rodriguez T27
  { unidadId: 65, tienePromesa: false, estadoActual: 'ENTREGADO' },   // Gemenes Rodriguez T26
  { unidadId: 68, tienePromesa: false, estadoActual: 'ENTREGADO' },   // Gemenes Rodriguez T15
  { unidadId: 66, tienePromesa: false, estadoActual: 'ENTREGADO' },   // Antonio Otonel T20
  { unidadId: 69, tienePromesa: false, estadoActual: 'ENTREGADO' },   // Antonio Otonel T11
  { unidadId: 56, tienePromesa: false, estadoActual: 'INSCRIPCION_CBR' }, // Carolina Muñoz ObispoSalas89
  { unidadId: 67, tienePromesa: false, estadoActual: 'ENTREGADO' },   // Carolina Toro T17
  { unidadId: 59, tienePromesa: false, estadoActual: 'ESCRITURA_LISTA' }, // Carolina Sandoval
  { unidadId: 75, tienePromesa: true,  estadoActual: 'ESCRITURA_LISTA' }, // Felipe Iñiguez (promesado)
  { unidadId: 62, tienePromesa: true,  estadoActual: 'FIRMADA_NOTARIA' }, // German Navarrete T33
  { unidadId: 63, tienePromesa: true,  estadoActual: 'FIRMADA_NOTARIA' }, // German Navarrete T32
  { unidadId: 60, tienePromesa: false, estadoActual: 'ESCRITURA_LISTA' }, // Cynthia Oteiza T35
  { unidadId: 61, tienePromesa: false, estadoActual: 'ESCRITURA_LISTA' }, // Cynthia Oteiza T34
  { unidadId: 76, tienePromesa: false, estadoActual: 'ESCRITURA_LISTA' }, // Claudia Suarez Aldunate82
  { unidadId: 79, tienePromesa: false, estadoActual: 'ESCRITURA_LISTA' }, // Claudia Suarez Aldunate50
  { unidadId: 77, tienePromesa: false, estadoActual: 'ESCRITURA_LISTA' }, // Claudia Suarez Aldunate79
  { unidadId: 55, tienePromesa: false, estadoActual: 'ESCRITURA_LISTA' }, // Nathalia De La Barra
  { unidadId: 80, tienePromesa: false, estadoActual: 'ESCRITURA_LISTA' }, // Claudia Suarez Aldunate48
  { unidadId: 78, tienePromesa: false, estadoActual: 'ESCRITURA_LISTA' }, // Claudia Suarez Aldunate57
  { unidadId: 71, tienePromesa: true,  estadoActual: 'FIRMA_CLIENTE_PROMESA' }, // Esteban Orrego
  { unidadId: 58, tienePromesa: false, estadoActual: 'ESCRITURA_LISTA' }, // Carolina Muñoz 2
  { unidadId: 46, tienePromesa: false, estadoActual: 'ESCRITURA_LISTA' }, // Daniel Altamirano
]

async function actualizarLegal() {
  for (const d of LEGAL_DATA) {
    // Encontrar la venta que tiene esta unidad
    const unidad = await prisma.unidad.findUnique({
      where: { id: d.unidadId },
      select: { ventaId: true }
    })
    if (!unidad?.ventaId) {
      console.log(`  ⚠ Unidad ${d.unidadId} sin ventaId`)
      continue
    }
    const ventaId = unidad.ventaId
    const procesoExistente = await prisma.procesoLegal.findUnique({ where: { ventaId } })
    if (procesoExistente) {
      await prisma.procesoLegal.update({
        where: { ventaId },
        data: { tienePromesa: d.tienePromesa, estadoActual: d.estadoActual }
      })
      console.log(`  ✓ Venta #${ventaId} → ${d.estadoActual} (promesa: ${d.tienePromesa})`)
    } else {
      console.log(`  ⚠ Venta #${ventaId} sin ProcesoLegal`)
    }
  }
}

async function main() {
  console.log('=== Paso 1: Fusionar ventas ===')
  await fusionarGrupos()
  console.log('\n=== Paso 2: Actualizar ProcesoLegal ===')
  await actualizarLegal()
  console.log('\nListo.')
}

main().catch(console.error).finally(() => prisma.$disconnect())
```

- [ ] **Step 2: Ejecutar en Railway via SSH**

```bash
SCRIPT=$(base64 < backend/src/migrarVentasMultiUnidad.js)
railway ssh --service backend -- "echo '$SCRIPT' | base64 -d > /app/backend/src/migrarVentasMultiUnidad.js && cd /app/backend && node src/migrarVentasMultiUnidad.js"
```

Esperado: log de fusiones + actualizaciones sin errores.

- [ ] **Step 3: Verificar en Railway**

```bash
railway ssh --service backend -- "cd /app/backend && node -e \"
const {PrismaClient}=require('@prisma/client');const p=new PrismaClient();
p.venta.count().then(n=>console.log('Ventas:',n));
p.procesoLegal.count().then(n=>console.log('ProcesoLegal:',n));
p.unidad.count({where:{ventaId:{not:null}}}).then(n=>{console.log('Unidades con venta:',n);p.\\\$disconnect()})
\""
```

Esperado aprox: Ventas: 20, ProcesoLegal: 20, Unidades con venta: 26

- [ ] **Step 4: Commit**

```bash
git add backend/src/migrarVentasMultiUnidad.js
git commit -m "feat: script migración ventas multi-unidad producción"
```

---

## Task 8: Deploy a Railway

- [ ] **Step 1: Push a main**

```bash
git push origin main
```

- [ ] **Step 2: Verificar deploy en Railway dashboard**

Ir a railway.app → servicio backend → ver logs de deploy. Debe completar sin errores de Prisma.

- [ ] **Step 3: Smoke test**

```bash
curl https://backend-production-1c52.up.railway.app/api/ventas \
  -H "Authorization: Bearer <token>"
```

Verificar que `unidades` es array en la respuesta (no `unidad`).

---

## Notas

- **LEGAL_DATA en Task 7** se basa en interpretación del spreadsheet. Revisar antes de ejecutar si hay dudas en alguna fila.
- Nathalia De La Barra (unidad 55): col "escritura" muestra fecha 27/02/2026 — se asume `ESCRITURA_LISTA` completado.
- German Navarrete: promesado con fechas 17/2 y 1/3. estadoActual = `FIRMADA_NOTARIA` (CBR y entregado pendientes según X en spreadsheet).
