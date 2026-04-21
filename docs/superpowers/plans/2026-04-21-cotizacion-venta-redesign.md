# Cotización → Venta Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the generic `Promocion` model with separate `Pack` (price-affecting) and `Beneficio` (non-monetary) models, make cotización mandatory before venta, and implement atomic server-side conversion.

**Architecture:** New schema with `Pack`/`Beneficio`/join tables replaces `Promocion` family. A single `POST /cotizaciones/:id/convertir` endpoint atomically creates the venta with server-calculated price breakdown. Frontend packs/beneficios panels call dedicated API endpoints; price is never sent from the client.

**Tech Stack:** Prisma + PostgreSQL (Railway), Express, React + Ant Design, React Query

**Railway URL:** `postgresql://bodeparking:bodeparking2026!@monorail.proxy.rlwy.net:35865/bodeparkingcrm`

---

## File Map

**Create:**
- `backend/src/controllers/packsController.js`
- `backend/src/controllers/beneficiosController.js`
- `backend/src/routes/packs.js`
- `backend/src/routes/beneficios.js`
- `backend/prisma/migrations/20260421000000_redesign_cotizacion_venta/migration.sql`
- `frontend/src/pages/configuracion/PacksBeneficios.jsx`

**Modify:**
- `backend/prisma/schema.prisma` — full schema rewrite (remove Promocion family, add Pack/Beneficio family)
- `backend/src/controllers/cotizacionesController.js` — rewrite INCLUDE_COMPLETO, crear, actualizar; add convertir/packs/beneficios endpoints
- `backend/src/controllers/ventasController.js` — remove `crear`, update includes for new schema
- `backend/src/index.js` — remove promociones route, add packs + beneficios routes
- `frontend/src/pages/cotizaciones/CotizacionEditor.jsx` — replace ModalConvertirVenta + PanelPromociones with new packs/beneficios/convertir UI
- `frontend/src/pages/ventas/VentaDetalle.jsx` — replace `promociones` section with beneficios + new price breakdown
- `frontend/src/App.jsx` — add `/configuracion/packs-beneficios` route
- `frontend/src/components/Layout.jsx` — replace "Promociones" nav item with "Packs y Beneficios"

**Delete:**
- `backend/src/controllers/promocionesController.js`
- `backend/src/routes/promociones.js`

---

## Task 1: DB Cleanup — Delete ventas and promo data from Railway

**Files:** none (SQL only)

- [ ] **Step 1: Connect to Railway and delete data in dependency order**

```bash
DATABASE_URL="postgresql://bodeparking:bodeparking2026!@monorail.proxy.rlwy.net:35865/bodeparkingcrm"

# Delete in FK dependency order
psql "$DATABASE_URL" <<'SQL'
DELETE FROM "pagos_arriendo_asegurado";
DELETE FROM "ventas_promociones";
DELETE FROM "cotizacion_promociones";
DELETE FROM "ventas";
DELETE FROM "unidades_promociones";
DELETE FROM "promociones";
SQL
```

Expected: `DELETE N` for each statement (N can be 0).

- [ ] **Step 2: Reset unidades that were linked to ventas**

```bash
psql "$DATABASE_URL" <<'SQL'
UPDATE "unidades" SET "ventaId" = NULL, "estado" = 'DISPONIBLE'
WHERE "ventaId" IS NOT NULL OR "estado" IN ('RESERVADO', 'VENDIDO');
SQL
```

Expected: `UPDATE N`

- [ ] **Step 3: Verify clean state**

```bash
psql "$DATABASE_URL" -c 'SELECT COUNT(*) FROM "ventas";'
psql "$DATABASE_URL" -c 'SELECT COUNT(*) FROM "promociones";'
psql "$DATABASE_URL" -c 'SELECT COUNT(*) FROM "unidades" WHERE "ventaId" IS NOT NULL;'
```

Expected: all counts = 0.

- [ ] **Step 4: Commit**

```bash
git add -p
git commit -m "chore: clean ventas and promociones data before schema redesign"
```

---

## Task 2: Schema Migration

**Files:**
- Modify: `backend/prisma/schema.prisma`
- Create: `backend/prisma/migrations/20260421000000_redesign_cotizacion_venta/migration.sql`

- [ ] **Step 1: Write the new schema.prisma**

Replace the entire file content of `backend/prisma/schema.prisma` with the following (keep all models not listed here unchanged — Edificio, Contacto, Lead, Visita, Interaccion, ProcesoLegal, DocumentoLegal, PlanPago, Cuota, Comision, Arriendo, PagoArriendo, Llave, MovimientoLlave, Postventa, ApiKey, UFDiaria, AlertaConfig, Notificacion, SolicitudDescuento):

**Enums to REMOVE:** `TipoPromocion`, `CategoriaPromocion`

**Enums to ADD** (insert after `EstadoSolicitudDescuento`):

```prisma
enum TipoPack {
  COMBO_ESPECIFICO
  POR_CANTIDAD
}

enum TipoBeneficio {
  ARRIENDO_ASEGURADO
  GASTOS_NOTARIALES
  CUOTAS_SIN_INTERES
  OTRO
}

enum EstadoBeneficio {
  PENDIENTE
  EN_CURSO
  COMPLETADO
  CANCELADO
}
```

**Modify `Unidad` model** — remove `promociones UnidadPromocion[]`, add:

```prisma
  packs             UnidadPack[]
  beneficios        UnidadBeneficio[]
```

**Replace `Venta` model:**

```prisma
model Venta {
  id                    Int         @id @default(autoincrement())
  leadId                Int
  compradorId           Int
  vendedorId            Int?
  brokerId              Int?
  gerenteId             Int?
  cotizacionOrigenId    Int         @unique

  precioListaUF         Float
  descuentoPacksUF      Float       @default(0)
  descuentoAprobadoUF   Float       @default(0)
  precioFinalUF         Float

  estado                EstadoVenta @default(RESERVA)
  fechaReserva          DateTime?
  fechaPromesa          DateTime?
  fechaEscritura        DateTime?
  fechaEntrega          DateTime?
  notas                 String?
  creadoEn              DateTime    @default(now())
  actualizadoEn         DateTime    @updatedAt

  lead                  Lead        @relation(fields: [leadId], references: [id])
  unidades              Unidad[]
  comprador             Contacto    @relation("CompradorVenta", fields: [compradorId], references: [id])
  vendedor              Usuario?    @relation("VendedorVenta", fields: [vendedorId], references: [id])
  broker                Usuario?    @relation("BrokerVenta", fields: [brokerId], references: [id])
  gerente               Usuario?    @relation("GerenteVenta", fields: [gerenteId], references: [id])
  cotizacionOrigen      Cotizacion  @relation(fields: [cotizacionOrigenId], references: [id])
  planPago              PlanPago?
  procesoLegal          ProcesoLegal?
  comisiones            Comision[]
  beneficios            VentaBeneficio[]
  postventa             Postventa[]

  @@map("ventas")
}
```

**Replace `Cotizacion` model:**

```prisma
model Cotizacion {
  id                    Int                  @id @default(autoincrement())
  leadId                Int
  creadoPorId           Int
  estado                EstadoCotizacion     @default(BORRADOR)
  validezDias           Int                  @default(30)
  descuentoAprobadoUF   Float                @default(0)
  notas                 String?
  creadoEn              DateTime             @default(now())
  actualizadoEn         DateTime             @updatedAt

  lead                  Lead                 @relation(fields: [leadId], references: [id])
  creadoPor             Usuario              @relation(fields: [creadoPorId], references: [id])
  items                 CotizacionItem[]
  packs                 CotizacionPack[]
  beneficios            CotizacionBeneficio[]
  solicitudesDescuento  SolicitudDescuento[]
  ventaOrigen           Venta?

  @@map("cotizaciones")
}
```

**Replace `CotizacionItem` model:**

```prisma
model CotizacionItem {
  id             Int        @id @default(autoincrement())
  cotizacionId   Int
  unidadId       Int
  precioListaUF  Float

  cotizacion     Cotizacion @relation(fields: [cotizacionId], references: [id], onDelete: Cascade)
  unidad         Unidad     @relation(fields: [unidadId], references: [id])

  @@map("cotizacion_items")
}
```

**Remove these models entirely:** `Promocion`, `UnidadPromocion`, `VentaPromocion`, `PagoArriendoAsegurado`, `CotizacionPromocion`

**Add these new models** (after `Cotizacion`):

```prisma
model Pack {
  id           Int       @id @default(autoincrement())
  nombre       String
  descripcion  String?
  tipo         TipoPack
  descuentoUF  Float
  minUnidades  Int       @default(2)
  fechaInicio  DateTime?
  fechaFin     DateTime?
  activa       Boolean   @default(true)
  creadoEn     DateTime  @default(now())

  unidades     UnidadPack[]
  cotizaciones CotizacionPack[]

  @@map("packs")
}

model UnidadPack {
  unidadId Int
  packId   Int
  unidad   Unidad @relation(fields: [unidadId], references: [id])
  pack     Pack   @relation(fields: [packId], references: [id])

  @@id([unidadId, packId])
  @@map("unidades_packs")
}

model CotizacionPack {
  id                  Int        @id @default(autoincrement())
  cotizacionId        Int
  packId              Int
  descuentoAplicadoUF Float

  cotizacion          Cotizacion @relation(fields: [cotizacionId], references: [id], onDelete: Cascade)
  pack                Pack       @relation(fields: [packId], references: [id])

  @@unique([cotizacionId, packId])
  @@map("cotizacion_packs")
}

model Beneficio {
  id             Int           @id @default(autoincrement())
  nombre         String
  descripcion    String?
  tipo           TipoBeneficio
  meses          Int?
  montoMensualUF Float?
  detalle        String?
  fechaInicio    DateTime?
  fechaFin       DateTime?
  activa         Boolean       @default(true)
  creadoEn       DateTime      @default(now())

  unidades     UnidadBeneficio[]
  cotizaciones CotizacionBeneficio[]
  ventas       VentaBeneficio[]

  @@map("beneficios")
}

model UnidadBeneficio {
  unidadId    Int
  beneficioId Int
  unidad      Unidad    @relation(fields: [unidadId], references: [id])
  beneficio   Beneficio @relation(fields: [beneficioId], references: [id])

  @@id([unidadId, beneficioId])
  @@map("unidades_beneficios")
}

model CotizacionBeneficio {
  cotizacionId Int
  beneficioId  Int

  cotizacion   Cotizacion @relation(fields: [cotizacionId], references: [id], onDelete: Cascade)
  beneficio    Beneficio  @relation(fields: [beneficioId], references: [id])

  @@id([cotizacionId, beneficioId])
  @@map("cotizacion_beneficios")
}

model VentaBeneficio {
  id          Int             @id @default(autoincrement())
  ventaId     Int
  beneficioId Int
  estado      EstadoBeneficio @default(PENDIENTE)
  notas       String?
  creadoEn    DateTime        @default(now())

  venta       Venta     @relation(fields: [ventaId], references: [id])
  beneficio   Beneficio @relation(fields: [beneficioId], references: [id])

  @@unique([ventaId, beneficioId])
  @@map("ventas_beneficios")
}
```

- [ ] **Step 2: Create migration directory and SQL file**

Create `backend/prisma/migrations/20260421000000_redesign_cotizacion_venta/migration.sql`:

```sql
-- Drop dependent tables (FK order)
DROP TABLE IF EXISTS "pagos_arriendo_asegurado";
DROP TABLE IF EXISTS "ventas_promociones";
DROP TABLE IF EXISTS "cotizacion_promociones";
DROP TABLE IF EXISTS "unidades_promociones";
DROP TABLE IF EXISTS "promociones";

-- Drop old enums
DROP TYPE IF EXISTS "TipoPromocion";
DROP TYPE IF EXISTS "CategoriaPromocion";

-- Remove old columns from cotizacion_items
ALTER TABLE "cotizacion_items" DROP COLUMN IF EXISTS "descuentoUF";

-- Fix descuentoAprobadoUF on cotizaciones (make non-nullable)
UPDATE "cotizaciones" SET "descuentoAprobadoUF" = 0 WHERE "descuentoAprobadoUF" IS NULL;
ALTER TABLE "cotizaciones" ALTER COLUMN "descuentoAprobadoUF" SET NOT NULL;
ALTER TABLE "cotizaciones" ALTER COLUMN "descuentoAprobadoUF" SET DEFAULT 0;

-- Modify ventas: replace precioUF/descuentoUF with breakdown
ALTER TABLE "ventas" DROP COLUMN IF EXISTS "precioUF";
ALTER TABLE "ventas" DROP COLUMN IF EXISTS "descuentoUF";
ALTER TABLE "ventas" ADD COLUMN "precioListaUF" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "ventas" ADD COLUMN "descuentoPacksUF" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "ventas" ADD COLUMN "descuentoAprobadoUF" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "ventas" ADD COLUMN "precioFinalUF" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "ventas" ALTER COLUMN "cotizacionOrigenId" SET NOT NULL;

-- Create new enums
CREATE TYPE "TipoPack" AS ENUM ('COMBO_ESPECIFICO', 'POR_CANTIDAD');
CREATE TYPE "TipoBeneficio" AS ENUM ('ARRIENDO_ASEGURADO', 'GASTOS_NOTARIALES', 'CUOTAS_SIN_INTERES', 'OTRO');
CREATE TYPE "EstadoBeneficio" AS ENUM ('PENDIENTE', 'EN_CURSO', 'COMPLETADO', 'CANCELADO');

-- Create Pack
CREATE TABLE "packs" (
  "id" SERIAL PRIMARY KEY,
  "nombre" TEXT NOT NULL,
  "descripcion" TEXT,
  "tipo" "TipoPack" NOT NULL,
  "descuentoUF" DOUBLE PRECISION NOT NULL,
  "minUnidades" INTEGER NOT NULL DEFAULT 2,
  "fechaInicio" TIMESTAMP(3),
  "fechaFin" TIMESTAMP(3),
  "activa" BOOLEAN NOT NULL DEFAULT true,
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create UnidadPack
CREATE TABLE "unidades_packs" (
  "unidadId" INTEGER NOT NULL,
  "packId" INTEGER NOT NULL,
  PRIMARY KEY ("unidadId", "packId"),
  FOREIGN KEY ("unidadId") REFERENCES "unidades"("id"),
  FOREIGN KEY ("packId") REFERENCES "packs"("id")
);

-- Create CotizacionPack
CREATE TABLE "cotizacion_packs" (
  "id" SERIAL PRIMARY KEY,
  "cotizacionId" INTEGER NOT NULL,
  "packId" INTEGER NOT NULL,
  "descuentoAplicadoUF" DOUBLE PRECISION NOT NULL,
  UNIQUE ("cotizacionId", "packId"),
  FOREIGN KEY ("cotizacionId") REFERENCES "cotizaciones"("id") ON DELETE CASCADE,
  FOREIGN KEY ("packId") REFERENCES "packs"("id")
);

-- Create Beneficio
CREATE TABLE "beneficios" (
  "id" SERIAL PRIMARY KEY,
  "nombre" TEXT NOT NULL,
  "descripcion" TEXT,
  "tipo" "TipoBeneficio" NOT NULL,
  "meses" INTEGER,
  "montoMensualUF" DOUBLE PRECISION,
  "detalle" TEXT,
  "fechaInicio" TIMESTAMP(3),
  "fechaFin" TIMESTAMP(3),
  "activa" BOOLEAN NOT NULL DEFAULT true,
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create UnidadBeneficio
CREATE TABLE "unidades_beneficios" (
  "unidadId" INTEGER NOT NULL,
  "beneficioId" INTEGER NOT NULL,
  PRIMARY KEY ("unidadId", "beneficioId"),
  FOREIGN KEY ("unidadId") REFERENCES "unidades"("id"),
  FOREIGN KEY ("beneficioId") REFERENCES "beneficios"("id")
);

-- Create CotizacionBeneficio
CREATE TABLE "cotizacion_beneficios" (
  "cotizacionId" INTEGER NOT NULL,
  "beneficioId" INTEGER NOT NULL,
  PRIMARY KEY ("cotizacionId", "beneficioId"),
  FOREIGN KEY ("cotizacionId") REFERENCES "cotizaciones"("id") ON DELETE CASCADE,
  FOREIGN KEY ("beneficioId") REFERENCES "beneficios"("id")
);

-- Create VentaBeneficio
CREATE TABLE "ventas_beneficios" (
  "id" SERIAL PRIMARY KEY,
  "ventaId" INTEGER NOT NULL,
  "beneficioId" INTEGER NOT NULL,
  "estado" "EstadoBeneficio" NOT NULL DEFAULT 'PENDIENTE',
  "notas" TEXT,
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("ventaId", "beneficioId"),
  FOREIGN KEY ("ventaId") REFERENCES "ventas"("id"),
  FOREIGN KEY ("beneficioId") REFERENCES "beneficios"("id")
);
```

- [ ] **Step 3: Apply migration to Railway**

```bash
cd backend
DATABASE_URL="postgresql://bodeparking:bodeparking2026!@monorail.proxy.rlwy.net:35865/bodeparkingcrm" \
  npx prisma migrate deploy
```

Expected output: `1 migration found... Applying migration '20260421000000_redesign_cotizacion_venta'... Migration applied.`

- [ ] **Step 4: Regenerate Prisma client**

```bash
cd backend
DATABASE_URL="postgresql://bodeparking:bodeparking2026!@monorail.proxy.rlwy.net:35865/bodeparkingcrm" \
  npx prisma generate
```

Expected: `Generated Prisma Client`

- [ ] **Step 5: Verify schema round-trip (no drift)**

```bash
cd backend
DATABASE_URL="postgresql://bodeparking:bodeparking2026!@monorail.proxy.rlwy.net:35865/bodeparkingcrm" \
  npx prisma migrate status
```

Expected: `Database schema is up to date!`

- [ ] **Step 6: Commit**

```bash
git add backend/prisma/schema.prisma backend/prisma/migrations/
git commit -m "feat: schema redesign — Pack/Beneficio replace Promocion"
```

---

## Task 3: packsController.js + route

**Files:**
- Create: `backend/src/controllers/packsController.js`
- Create: `backend/src/routes/packs.js`

- [ ] **Step 1: Write `backend/src/controllers/packsController.js`**

```js
const prisma = require('../lib/prisma')

const INCLUDE_PACK = {
  unidades: {
    include: {
      unidad: { select: { id: true, numero: true, tipo: true, edificio: { select: { nombre: true } } } }
    }
  }
}

const listar = async (req, res) => {
  const { activa } = req.query
  try {
    const packs = await prisma.pack.findMany({
      where: { ...(activa !== undefined && { activa: activa === 'true' }) },
      include: INCLUDE_PACK,
      orderBy: { creadoEn: 'desc' }
    })
    res.json(packs)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al obtener packs.' })
  }
}

const crear = async (req, res) => {
  const { nombre, descripcion, tipo, descuentoUF, minUnidades, fechaInicio, fechaFin, unidadIds } = req.body
  if (!nombre || !tipo || !descuentoUF) {
    return res.status(400).json({ error: 'nombre, tipo y descuentoUF son requeridos.' })
  }
  try {
    const pack = await prisma.pack.create({
      data: {
        nombre, descripcion: descripcion || null, tipo,
        descuentoUF: Number(descuentoUF),
        minUnidades: minUnidades ? Number(minUnidades) : 2,
        fechaInicio: fechaInicio ? new Date(fechaInicio) : null,
        fechaFin: fechaFin ? new Date(fechaFin) : null,
        unidades: tipo === 'COMBO_ESPECIFICO' && Array.isArray(unidadIds) && unidadIds.length > 0
          ? { create: unidadIds.map(id => ({ unidadId: Number(id) })) }
          : undefined
      },
      include: INCLUDE_PACK
    })
    res.status(201).json(pack)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al crear pack.' })
  }
}

const actualizar = async (req, res) => {
  const { id } = req.params
  const { nombre, descripcion, tipo, descuentoUF, minUnidades, fechaInicio, fechaFin, activa, unidadIds } = req.body
  try {
    // Replace unidades for COMBO_ESPECIFICO
    if (tipo === 'COMBO_ESPECIFICO' && Array.isArray(unidadIds)) {
      await prisma.unidadPack.deleteMany({ where: { packId: Number(id) } })
    }
    const pack = await prisma.pack.update({
      where: { id: Number(id) },
      data: {
        ...(nombre !== undefined && { nombre }),
        ...(descripcion !== undefined && { descripcion }),
        ...(tipo !== undefined && { tipo }),
        ...(descuentoUF !== undefined && { descuentoUF: Number(descuentoUF) }),
        ...(minUnidades !== undefined && { minUnidades: Number(minUnidades) }),
        ...(fechaInicio !== undefined && { fechaInicio: fechaInicio ? new Date(fechaInicio) : null }),
        ...(fechaFin !== undefined && { fechaFin: fechaFin ? new Date(fechaFin) : null }),
        ...(activa !== undefined && { activa: Boolean(activa) }),
        ...(tipo === 'COMBO_ESPECIFICO' && Array.isArray(unidadIds) && {
          unidades: { create: unidadIds.map(uid => ({ unidadId: Number(uid) })) }
        })
      },
      include: INCLUDE_PACK
    })
    res.json(pack)
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Pack no encontrado.' })
    console.error(err)
    res.status(500).json({ error: 'Error al actualizar pack.' })
  }
}

const desactivar = async (req, res) => {
  const { id } = req.params
  try {
    const pack = await prisma.pack.update({
      where: { id: Number(id) },
      data: { activa: false }
    })
    res.json(pack)
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Pack no encontrado.' })
    res.status(500).json({ error: 'Error al desactivar pack.' })
  }
}

module.exports = { listar, crear, actualizar, desactivar }
```

- [ ] **Step 2: Write `backend/src/routes/packs.js`**

```js
const express = require('express')
const router = express.Router()
const { listar, crear, actualizar, desactivar } = require('../controllers/packsController')
const { autenticar, autorizar } = require('../middleware/auth')

router.use(autenticar)

router.get('/', listar)
router.post('/', autorizar('GERENTE', 'JEFE_VENTAS'), crear)
router.put('/:id', autorizar('GERENTE', 'JEFE_VENTAS'), actualizar)
router.delete('/:id', autorizar('GERENTE', 'JEFE_VENTAS'), desactivar)

module.exports = router
```

- [ ] **Step 3: Verify syntax**

```bash
cd backend && node -e "require('./src/controllers/packsController')" && echo OK
```

Expected: `OK`

- [ ] **Step 4: Commit**

```bash
git add backend/src/controllers/packsController.js backend/src/routes/packs.js
git commit -m "feat: add packsController and route"
```

---

## Task 4: beneficiosController.js + route

**Files:**
- Create: `backend/src/controllers/beneficiosController.js`
- Create: `backend/src/routes/beneficios.js`

- [ ] **Step 1: Write `backend/src/controllers/beneficiosController.js`**

```js
const prisma = require('../lib/prisma')

const INCLUDE_BENEFICIO = {
  unidades: {
    include: {
      unidad: { select: { id: true, numero: true, tipo: true, edificio: { select: { nombre: true } } } }
    }
  }
}

const listar = async (req, res) => {
  const { activa } = req.query
  try {
    const beneficios = await prisma.beneficio.findMany({
      where: { ...(activa !== undefined && { activa: activa === 'true' }) },
      include: INCLUDE_BENEFICIO,
      orderBy: { creadoEn: 'desc' }
    })
    res.json(beneficios)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al obtener beneficios.' })
  }
}

const crear = async (req, res) => {
  const { nombre, descripcion, tipo, meses, montoMensualUF, detalle, fechaInicio, fechaFin, unidadIds } = req.body
  if (!nombre || !tipo) {
    return res.status(400).json({ error: 'nombre y tipo son requeridos.' })
  }
  try {
    const beneficio = await prisma.beneficio.create({
      data: {
        nombre, descripcion: descripcion || null, tipo,
        meses: meses ? Number(meses) : null,
        montoMensualUF: montoMensualUF ? Number(montoMensualUF) : null,
        detalle: detalle || null,
        fechaInicio: fechaInicio ? new Date(fechaInicio) : null,
        fechaFin: fechaFin ? new Date(fechaFin) : null,
        unidades: Array.isArray(unidadIds) && unidadIds.length > 0
          ? { create: unidadIds.map(id => ({ unidadId: Number(id) })) }
          : undefined
      },
      include: INCLUDE_BENEFICIO
    })
    res.status(201).json(beneficio)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al crear beneficio.' })
  }
}

const actualizar = async (req, res) => {
  const { id } = req.params
  const { nombre, descripcion, tipo, meses, montoMensualUF, detalle, fechaInicio, fechaFin, activa, unidadIds } = req.body
  try {
    if (Array.isArray(unidadIds)) {
      await prisma.unidadBeneficio.deleteMany({ where: { beneficioId: Number(id) } })
    }
    const beneficio = await prisma.beneficio.update({
      where: { id: Number(id) },
      data: {
        ...(nombre !== undefined && { nombre }),
        ...(descripcion !== undefined && { descripcion }),
        ...(tipo !== undefined && { tipo }),
        ...(meses !== undefined && { meses: meses ? Number(meses) : null }),
        ...(montoMensualUF !== undefined && { montoMensualUF: montoMensualUF ? Number(montoMensualUF) : null }),
        ...(detalle !== undefined && { detalle }),
        ...(fechaInicio !== undefined && { fechaInicio: fechaInicio ? new Date(fechaInicio) : null }),
        ...(fechaFin !== undefined && { fechaFin: fechaFin ? new Date(fechaFin) : null }),
        ...(activa !== undefined && { activa: Boolean(activa) }),
        ...(Array.isArray(unidadIds) && {
          unidades: { create: unidadIds.map(uid => ({ unidadId: Number(uid) })) }
        })
      },
      include: INCLUDE_BENEFICIO
    })
    res.json(beneficio)
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Beneficio no encontrado.' })
    console.error(err)
    res.status(500).json({ error: 'Error al actualizar beneficio.' })
  }
}

const desactivar = async (req, res) => {
  const { id } = req.params
  try {
    const beneficio = await prisma.beneficio.update({
      where: { id: Number(id) },
      data: { activa: false }
    })
    res.json(beneficio)
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Beneficio no encontrado.' })
    res.status(500).json({ error: 'Error al desactivar beneficio.' })
  }
}

module.exports = { listar, crear, actualizar, desactivar }
```

- [ ] **Step 2: Write `backend/src/routes/beneficios.js`**

```js
const express = require('express')
const router = express.Router()
const { listar, crear, actualizar, desactivar } = require('../controllers/beneficiosController')
const { autenticar, autorizar } = require('../middleware/auth')

router.use(autenticar)

router.get('/', listar)
router.post('/', autorizar('GERENTE', 'JEFE_VENTAS'), crear)
router.put('/:id', autorizar('GERENTE', 'JEFE_VENTAS'), actualizar)
router.delete('/:id', autorizar('GERENTE', 'JEFE_VENTAS'), desactivar)

module.exports = router
```

- [ ] **Step 3: Verify syntax**

```bash
cd backend && node -e "require('./src/controllers/beneficiosController')" && echo OK
```

Expected: `OK`

- [ ] **Step 4: Commit**

```bash
git add backend/src/controllers/beneficiosController.js backend/src/routes/beneficios.js
git commit -m "feat: add beneficiosController and route"
```

---

## Task 5: cotizacionesController.js — full rewrite

**Files:**
- Modify: `backend/src/controllers/cotizacionesController.js`
- Modify: `backend/src/routes/cotizaciones.js`

- [ ] **Step 1: Write new `backend/src/controllers/cotizacionesController.js`**

```js
const prisma = require('../lib/prisma')

const INCLUDE_COMPLETO = {
  lead: {
    select: {
      id: true,
      contacto: { select: { id: true, nombre: true, apellido: true, email: true, telefono: true } },
      vendedor: { select: { id: true, nombre: true, apellido: true } },
      broker:   { select: { id: true, nombre: true, apellido: true } },
      ventas:   { select: { id: true, estado: true } },
    }
  },
  creadoPor: { select: { id: true, nombre: true, apellido: true } },
  items: {
    include: {
      unidad: {
        include: {
          edificio: { select: { id: true, nombre: true, region: true } }
        }
      }
    }
  },
  packs: {
    include: {
      pack: {
        include: { unidades: { select: { unidadId: true } } }
      }
    }
  },
  beneficios: {
    include: { beneficio: true }
  },
  solicitudesDescuento: {
    orderBy: { creadoEn: 'desc' },
    include: {
      solicitadoPor: { select: { id: true, nombre: true, apellido: true } },
      revisadoPor:   { select: { id: true, nombre: true, apellido: true } }
    }
  }
}

// Calcula los totales de una cotización a partir de sus datos
function calcularTotales(cotizacion) {
  const precioListaUF = (cotizacion.items || []).reduce((s, i) => s + (i.precioListaUF || 0), 0)
  const descuentoPacksUF = (cotizacion.packs || []).reduce((s, p) => s + (p.descuentoAplicadoUF || 0), 0)
  const descuentoAprobadoUF = cotizacion.descuentoAprobadoUF || 0
  const precioFinalUF = Math.max(precioListaUF - descuentoPacksUF - descuentoAprobadoUF, 0)
  return { precioListaUF, descuentoPacksUF, descuentoAprobadoUF, precioFinalUF }
}

const listar = async (req, res) => {
  const { leadId, estado } = req.query
  const esGerenciaOJV = ['GERENTE', 'JEFE_VENTAS'].includes(req.usuario.rol)

  try {
    const cotizaciones = await prisma.cotizacion.findMany({
      where: {
        ...(leadId && { leadId: Number(leadId) }),
        ...(estado && { estado }),
        ...(!esGerenciaOJV && { creadoPorId: req.usuario.id }),
      },
      include: {
        lead: {
          select: { id: true, contacto: { select: { nombre: true, apellido: true } } }
        },
        creadoPor: { select: { nombre: true, apellido: true } },
        items: { select: { precioListaUF: true } },
        packs: { select: { descuentoAplicadoUF: true } },
        _count: { select: { items: true, packs: true, beneficios: true } }
      },
      orderBy: { creadoEn: 'desc' }
    })
    // Attach calculated totals
    const result = cotizaciones.map(c => ({
      ...c,
      ...calcularTotales(c)
    }))
    res.json(result)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al obtener cotizaciones.' })
  }
}

const obtener = async (req, res) => {
  const { id } = req.params
  try {
    const cotizacion = await prisma.cotizacion.findUnique({
      where: { id: Number(id) },
      include: INCLUDE_COMPLETO
    })
    if (!cotizacion) return res.status(404).json({ error: 'Cotización no encontrada.' })
    res.json({ ...cotizacion, ...calcularTotales(cotizacion) })
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener cotización.' })
  }
}

const crear = async (req, res) => {
  const { leadId, items, notas, validezDias } = req.body

  if (!leadId || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Se requiere lead y al menos una unidad.' })
  }

  try {
    const cotizacion = await prisma.cotizacion.create({
      data: {
        leadId: Number(leadId),
        creadoPorId: req.usuario.id,
        notas: notas || null,
        validezDias: validezDias || 30,
        items: {
          create: items.map(i => ({
            unidadId: Number(i.unidadId),
            precioListaUF: Number(i.precioListaUF),
          }))
        }
      },
      include: INCLUDE_COMPLETO
    })
    res.status(201).json({ ...cotizacion, ...calcularTotales(cotizacion) })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al crear cotización.' })
  }
}

const actualizar = async (req, res) => {
  const { id } = req.params
  const { items, notas, validezDias } = req.body

  try {
    if (Array.isArray(items)) {
      await prisma.cotizacionItem.deleteMany({ where: { cotizacionId: Number(id) } })
    }

    const cotizacion = await prisma.cotizacion.update({
      where: { id: Number(id) },
      data: {
        ...(notas !== undefined && { notas }),
        ...(validezDias !== undefined && { validezDias }),
        ...(Array.isArray(items) && {
          items: {
            create: items.map(i => ({
              unidadId: Number(i.unidadId),
              precioListaUF: Number(i.precioListaUF),
            }))
          }
        })
      },
      include: INCLUDE_COMPLETO
    })

    res.json({ ...cotizacion, ...calcularTotales(cotizacion) })
  } catch (err) {
    console.error(err)
    if (err.code === 'P2025') return res.status(404).json({ error: 'Cotización no encontrada.' })
    res.status(500).json({ error: 'Error al actualizar cotización.' })
  }
}

const cambiarEstado = async (req, res) => {
  const { id } = req.params
  const { estado } = req.body
  const validos = ['BORRADOR', 'ENVIADA', 'ACEPTADA', 'RECHAZADA']
  if (!validos.includes(estado)) return res.status(400).json({ error: 'Estado inválido.' })

  try {
    const cotizacion = await prisma.cotizacion.update({
      where: { id: Number(id) },
      data: { estado },
      include: INCLUDE_COMPLETO
    })
    res.json({ ...cotizacion, ...calcularTotales(cotizacion) })
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Cotización no encontrada.' })
    res.status(500).json({ error: 'Error al cambiar estado.' })
  }
}

const eliminar = async (req, res) => {
  const { id } = req.params
  try {
    await prisma.cotizacion.delete({ where: { id: Number(id) } })
    res.json({ ok: true })
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Cotización no encontrada.' })
    res.status(500).json({ error: 'Error al eliminar cotización.' })
  }
}

// GET /cotizaciones/unidades-disponibles
const unidadesDisponibles = async (req, res) => {
  const { search, edificioId, tipo } = req.query
  try {
    const unidades = await prisma.unidad.findMany({
      where: {
        estado: 'DISPONIBLE',
        NOT: { ventaId: { not: null } },
        ...(edificioId && { edificioId: Number(edificioId) }),
        ...(tipo && { tipo }),
        ...(search && {
          OR: [
            { numero: { contains: search, mode: 'insensitive' } },
            { edificio: { nombre: { contains: search, mode: 'insensitive' } } }
          ]
        })
      },
      include: {
        edificio: { select: { id: true, nombre: true, region: true, comuna: true } },
        packs: {
          include: { pack: true },
          where: {
            pack: {
              activa: true,
              OR: [{ fechaFin: null }, { fechaFin: { gte: new Date() } }]
            }
          }
        },
        beneficios: {
          include: { beneficio: true },
          where: {
            beneficio: {
              activa: true,
              OR: [{ fechaFin: null }, { fechaFin: { gte: new Date() } }]
            }
          }
        }
      },
      orderBy: [{ edificio: { nombre: 'asc' } }, { numero: 'asc' }]
    })
    res.json(unidades)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al obtener unidades.' })
  }
}

// POST /cotizaciones/:id/packs
const agregarPack = async (req, res) => {
  const { id } = req.params
  const { packId } = req.body
  if (!packId) return res.status(400).json({ error: 'packId requerido.' })

  try {
    const cotizacion = await prisma.cotizacion.findUnique({
      where: { id: Number(id) },
      include: { items: true, packs: true }
    })
    if (!cotizacion) return res.status(404).json({ error: 'Cotización no encontrada.' })
    if (cotizacion.ventaOrigen) return res.status(400).json({ error: 'Cotización ya fue convertida.' })

    const pack = await prisma.pack.findUnique({
      where: { id: Number(packId) },
      include: { unidades: { select: { unidadId: true } } }
    })
    if (!pack || !pack.activa) return res.status(404).json({ error: 'Pack no encontrado o inactivo.' })

    // Verificar eligibilidad
    if (pack.tipo === 'COMBO_ESPECIFICO') {
      const unidadesEnPack = pack.unidades.map(u => u.unidadId)
      const unidadesEnCot = cotizacion.items.map(i => i.unidadId)
      const faltantes = unidadesEnPack.filter(uid => !unidadesEnCot.includes(uid))
      if (faltantes.length > 0) {
        return res.status(400).json({ error: 'La cotización no contiene todas las unidades requeridas por este pack.' })
      }
    } else if (pack.tipo === 'POR_CANTIDAD') {
      if (cotizacion.items.length < pack.minUnidades) {
        return res.status(400).json({ error: `Este pack requiere al menos ${pack.minUnidades} unidades en la cotización.` })
      }
    }

    // Upsert (en caso de que ya exista)
    const yaExiste = cotizacion.packs.find(p => p.packId === Number(packId))
    if (yaExiste) return res.status(400).json({ error: 'Pack ya aplicado a esta cotización.' })

    await prisma.cotizacionPack.create({
      data: {
        cotizacionId: Number(id),
        packId: Number(packId),
        descuentoAplicadoUF: pack.descuentoUF
      }
    })

    const actualizada = await prisma.cotizacion.findUnique({ where: { id: Number(id) }, include: INCLUDE_COMPLETO })
    res.json({ ...actualizada, ...calcularTotales(actualizada) })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al agregar pack.' })
  }
}

// DELETE /cotizaciones/:id/packs/:packId
const quitarPack = async (req, res) => {
  const { id, packId } = req.params
  try {
    await prisma.cotizacionPack.deleteMany({
      where: { cotizacionId: Number(id), packId: Number(packId) }
    })
    const actualizada = await prisma.cotizacion.findUnique({ where: { id: Number(id) }, include: INCLUDE_COMPLETO })
    if (!actualizada) return res.status(404).json({ error: 'Cotización no encontrada.' })
    res.json({ ...actualizada, ...calcularTotales(actualizada) })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al quitar pack.' })
  }
}

// POST /cotizaciones/:id/beneficios
const agregarBeneficio = async (req, res) => {
  const { id } = req.params
  const { beneficioId } = req.body
  if (!beneficioId) return res.status(400).json({ error: 'beneficioId requerido.' })

  try {
    const cotizacion = await prisma.cotizacion.findUnique({
      where: { id: Number(id) },
      include: { beneficios: true }
    })
    if (!cotizacion) return res.status(404).json({ error: 'Cotización no encontrada.' })
    if (cotizacion.beneficios.find(b => b.beneficioId === Number(beneficioId))) {
      return res.status(400).json({ error: 'Beneficio ya aplicado a esta cotización.' })
    }

    await prisma.cotizacionBeneficio.create({
      data: { cotizacionId: Number(id), beneficioId: Number(beneficioId) }
    })

    const actualizada = await prisma.cotizacion.findUnique({ where: { id: Number(id) }, include: INCLUDE_COMPLETO })
    res.json({ ...actualizada, ...calcularTotales(actualizada) })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al agregar beneficio.' })
  }
}

// DELETE /cotizaciones/:id/beneficios/:beneficioId
const quitarBeneficio = async (req, res) => {
  const { id, beneficioId } = req.params
  try {
    await prisma.cotizacionBeneficio.deleteMany({
      where: { cotizacionId: Number(id), beneficioId: Number(beneficioId) }
    })
    const actualizada = await prisma.cotizacion.findUnique({ where: { id: Number(id) }, include: INCLUDE_COMPLETO })
    if (!actualizada) return res.status(404).json({ error: 'Cotización no encontrada.' })
    res.json({ ...actualizada, ...calcularTotales(actualizada) })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al quitar beneficio.' })
  }
}

// POST /cotizaciones/:id/convertir
const convertir = async (req, res) => {
  const { id } = req.params

  try {
    const cotizacion = await prisma.cotizacion.findUnique({
      where: { id: Number(id) },
      include: {
        items: { include: { unidad: true } },
        packs: true,
        beneficios: true,
        lead: { select: { id: true, vendedorId: true, brokerId: true, contactoId: true } },
        ventaOrigen: true
      }
    })

    if (!cotizacion) return res.status(404).json({ error: 'Cotización no encontrada.' })
    if (cotizacion.ventaOrigen) return res.status(400).json({ error: 'Esta cotización ya fue convertida en venta.' })
    if (cotizacion.estado === 'RECHAZADA') return res.status(400).json({ error: 'No se puede convertir una cotización rechazada.' })
    if (cotizacion.items.length === 0) return res.status(400).json({ error: 'La cotización no tiene unidades.' })

    // Verificar que todas las unidades siguen disponibles
    const unidadesNoDisponibles = cotizacion.items.filter(i => i.unidad.estado !== 'DISPONIBLE' || i.unidad.ventaId !== null)
    if (unidadesNoDisponibles.length > 0) {
      const nums = unidadesNoDisponibles.map(i => i.unidad.numero).join(', ')
      return res.status(400).json({ error: `Las siguientes unidades ya no están disponibles: ${nums}` })
    }

    // Calcular precio
    const precioListaUF = cotizacion.items.reduce((s, i) => s + i.precioListaUF, 0)
    const descuentoPacksUF = cotizacion.packs.reduce((s, p) => s + p.descuentoAplicadoUF, 0)
    const descuentoAprobadoUF = cotizacion.descuentoAprobadoUF || 0
    const precioFinalUF = Math.max(precioListaUF - descuentoPacksUF - descuentoAprobadoUF, 0)

    const gerentes = await prisma.usuario.findMany({ where: { rol: 'GERENTE', activo: true }, select: { id: true } })
    const gerenteId = gerentes[0]?.id || null

    const venta = await prisma.$transaction(async (tx) => {
      // Crear venta
      const nuevaVenta = await tx.venta.create({
        data: {
          leadId: cotizacion.lead.id,
          compradorId: cotizacion.lead.contactoId,
          vendedorId: cotizacion.lead.vendedorId || null,
          brokerId: cotizacion.lead.brokerId || null,
          gerenteId,
          cotizacionOrigenId: cotizacion.id,
          precioListaUF,
          descuentoPacksUF,
          descuentoAprobadoUF,
          precioFinalUF,
          estado: 'RESERVA',
          fechaReserva: new Date()
        }
      })

      // Vincular unidades
      for (const item of cotizacion.items) {
        await tx.unidad.update({
          where: { id: item.unidadId },
          data: { ventaId: nuevaVenta.id, estado: 'RESERVADO' }
        })
      }

      // Copiar beneficios
      for (const cb of cotizacion.beneficios) {
        await tx.ventaBeneficio.create({
          data: { ventaId: nuevaVenta.id, beneficioId: cb.beneficioId }
        })
      }

      // Actualizar cotización
      await tx.cotizacion.update({
        where: { id: cotizacion.id },
        data: { estado: 'ACEPTADA' }
      })

      // Actualizar lead
      await tx.lead.update({
        where: { id: cotizacion.lead.id },
        data: { etapa: 'RESERVA' }
      })

      // Crear proceso legal
      const hoy = new Date()
      await tx.procesoLegal.create({
        data: {
          ventaId: nuevaVenta.id,
          tienePromesa: false,
          estadoActual: 'ESCRITURA_LISTA',
          fechaLimiteEscritura: hoy,
          fechaLimiteFirmaNot: hoy,
          fechaLimiteCBR: hoy,
          fechaLimiteEntrega: hoy
        }
      })

      return nuevaVenta
    })

    // Calcular comisiones fuera de la transacción
    await calcularComisiones(venta.id, precioFinalUF, cotizacion.lead)

    const ventaCompleta = await prisma.venta.findUnique({
      where: { id: venta.id },
      include: {
        comprador: true,
        unidades: { include: { edificio: true } },
        beneficios: { include: { beneficio: true } },
        procesoLegal: true,
        comisiones: true
      }
    })

    res.status(201).json(ventaCompleta)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al convertir cotización.' })
  }
}

// Reutilizada por convertir
async function calcularComisiones(ventaId, precioFinalUF, lead) {
  const venta = await prisma.venta.findUnique({
    where: { id: ventaId },
    select: { vendedorId: true, brokerId: true, gerenteId: true }
  })

  const comisionesACrear = []

  if (venta.vendedorId) {
    const vendedor = await prisma.usuario.findUnique({ where: { id: venta.vendedorId }, select: { comisionPorcentaje: true } })
    if (vendedor?.comisionPorcentaje) {
      const total = (precioFinalUF * vendedor.comisionPorcentaje) / 100
      comisionesACrear.push({ ventaId, usuarioId: venta.vendedorId, concepto: 'Vendedor', porcentaje: vendedor.comisionPorcentaje, montoCalculadoUF: total, montoPrimera: total / 2, montoSegunda: total / 2 })
    }
  }

  if (venta.brokerId) {
    const broker = await prisma.usuario.findUnique({ where: { id: venta.brokerId }, select: { comisionPorcentaje: true } })
    if (broker?.comisionPorcentaje) {
      const total = (precioFinalUF * broker.comisionPorcentaje) / 100
      comisionesACrear.push({ ventaId, usuarioId: venta.brokerId, concepto: 'Broker', porcentaje: broker.comisionPorcentaje, montoCalculadoUF: total, montoPrimera: total / 2, montoSegunda: total / 2 })
    }
  }

  const jefes = await prisma.usuario.findMany({ where: { rol: 'JEFE_VENTAS', activo: true }, select: { id: true, comisionPorcentaje: true } })
  for (const jefe of jefes) {
    const pct = jefe.id === venta.vendedorId ? (jefe.comisionPorcentaje || 4) : 1
    const total = (precioFinalUF * pct) / 100
    comisionesACrear.push({ ventaId, usuarioId: jefe.id, concepto: 'Jefe de Ventas', porcentaje: pct, montoCalculadoUF: total, montoPrimera: total / 2, montoSegunda: total / 2 })
  }

  if (comisionesACrear.length > 0) {
    await prisma.comision.createMany({ data: comisionesACrear })
  }
}

module.exports = { listar, obtener, crear, actualizar, cambiarEstado, eliminar, unidadesDisponibles, agregarPack, quitarPack, agregarBeneficio, quitarBeneficio, convertir }
```

- [ ] **Step 2: Update `backend/src/routes/cotizaciones.js`**

```js
const express = require('express')
const router = express.Router()
const {
  listar, obtener, crear, actualizar, cambiarEstado, eliminar, unidadesDisponibles,
  agregarPack, quitarPack, agregarBeneficio, quitarBeneficio, convertir
} = require('../controllers/cotizacionesController')
const { autenticar } = require('../middleware/auth')

router.use(autenticar)

router.get('/unidades-disponibles', unidadesDisponibles)
router.get('/', listar)
router.get('/:id', obtener)
router.post('/', crear)
router.put('/:id', actualizar)
router.put('/:id/estado', cambiarEstado)
router.delete('/:id', eliminar)

router.post('/:id/convertir', convertir)
router.post('/:id/packs', agregarPack)
router.delete('/:id/packs/:packId', quitarPack)
router.post('/:id/beneficios', agregarBeneficio)
router.delete('/:id/beneficios/:beneficioId', quitarBeneficio)

module.exports = router
```

- [ ] **Step 3: Verify syntax**

```bash
cd backend && node -e "require('./src/controllers/cotizacionesController')" && echo OK
```

Expected: `OK`

- [ ] **Step 4: Commit**

```bash
git add backend/src/controllers/cotizacionesController.js backend/src/routes/cotizaciones.js
git commit -m "feat: rewrite cotizacionesController — packs/beneficios/convertir endpoints"
```

---

## Task 6: ventasController.js — remove crear, update includes

**Files:**
- Modify: `backend/src/controllers/ventasController.js`
- Modify: `backend/src/routes/ventas.js`

- [ ] **Step 1: Replace `backend/src/controllers/ventasController.js`**

```js
const prisma = require('../lib/prisma')

const listar = async (req, res) => {
  const { estado, vendedorId, edificioId, tipoUnidad, precioMin, precioMax, search, desde, hasta } = req.query
  try {
    const ventas = await prisma.venta.findMany({
      where: {
        ...(estado && { estado }),
        ...(vendedorId && { vendedorId: Number(vendedorId) }),
        ...(desde || hasta ? { creadoEn: { ...(desde && { gte: new Date(desde) }), ...(hasta && { lte: new Date(hasta) }) } } : {}),
        ...(edificioId && { unidades: { some: { edificioId: Number(edificioId) } } }),
        ...(tipoUnidad && { unidades: { some: { tipo: tipoUnidad } } }),
        ...(precioMin && { precioFinalUF: { gte: Number(precioMin) } }),
        ...(precioMax && { precioFinalUF: { lte: Number(precioMax) } }),
        ...(search && { comprador: { OR: [{ nombre: { contains: search, mode: 'insensitive' } }, { apellido: { contains: search, mode: 'insensitive' } }, { rut: { contains: search, mode: 'insensitive' } }] } })
      },
      include: {
        comprador: { select: { nombre: true, apellido: true, rut: true, empresa: true } },
        vendedor: { select: { nombre: true, apellido: true } },
        broker: { select: { nombre: true, apellido: true } },
        unidades: { select: { numero: true, tipo: true, edificio: { select: { nombre: true, region: true } } } },
        planPago: { select: { totalCuotas: true } },
        procesoLegal: { select: { estadoActual: true, tienePromesa: true, fechaLimiteFirmaCliente: true, fechaLimiteFirmaInmob: true, fechaLimiteEscritura: true, fechaLimiteFirmaNot: true, fechaLimiteCBR: true, fechaLimiteEntrega: true } },
        _count: { select: { comisiones: true } }
      },
      orderBy: { creadoEn: 'desc' }
    })
    res.json(ventas)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al obtener ventas.' })
  }
}

const obtener = async (req, res) => {
  const { id } = req.params
  try {
    const venta = await prisma.venta.findUnique({
      where: { id: Number(id) },
      include: {
        comprador: true,
        vendedor: { select: { id: true, nombre: true, apellido: true } },
        broker: { select: { id: true, nombre: true, apellido: true } },
        gerente: { select: { id: true, nombre: true, apellido: true } },
        unidades: { include: { edificio: true } },
        lead: { select: { id: true, etapa: true } },
        cotizacionOrigen: { select: { id: true, estado: true, descuentoAprobadoUF: true } },
        planPago: { include: { cuotas: { orderBy: { numeroCuota: 'asc' } } } },
        procesoLegal: { include: { documentos: { orderBy: { creadoEn: 'desc' } } } },
        comisiones: { include: { usuario: { select: { nombre: true, apellido: true, rol: true } } } },
        beneficios: { include: { beneficio: true } },
        postventa: { orderBy: { fechaApertura: 'desc' } }
      }
    })
    if (!venta) return res.status(404).json({ error: 'Venta no encontrada.' })
    res.json(venta)
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener venta.' })
  }
}

const actualizarEstado = async (req, res) => {
  const { id } = req.params
  const { estado, fechaPromesa, fechaEscritura, fechaEntrega, notas } = req.body

  const estadosValidos = ['RESERVA', 'PROMESA', 'ESCRITURA', 'ENTREGADO', 'ANULADO']
  if (!estadosValidos.includes(estado)) {
    return res.status(400).json({ error: 'Estado inválido.' })
  }

  try {
    const venta = await prisma.venta.update({
      where: { id: Number(id) },
      data: {
        estado,
        ...(fechaPromesa && { fechaPromesa: new Date(fechaPromesa) }),
        ...(fechaEscritura && { fechaEscritura: new Date(fechaEscritura) }),
        ...(fechaEntrega && { fechaEntrega: new Date(fechaEntrega) }),
        ...(notas && { notas })
      }
    })

    if (estado === 'ENTREGADO') {
      await prisma.unidad.updateMany({ where: { ventaId: Number(id) }, data: { estado: 'VENDIDO' } })
      await prisma.lead.update({ where: { id: venta.leadId }, data: { etapa: 'ENTREGA' } })
    } else if (estado === 'ANULADO') {
      await prisma.unidad.updateMany({ where: { ventaId: Number(id) }, data: { estado: 'DISPONIBLE', ventaId: null } })
      await prisma.lead.update({ where: { id: venta.leadId }, data: { etapa: 'PERDIDO', motivoPerdida: 'Venta anulada' } })
    } else if (estado === 'PROMESA') {
      await prisma.comision.updateMany({ where: { ventaId: Number(id) }, data: { estadoPrimera: 'PENDIENTE' } })
      await prisma.lead.update({ where: { id: venta.leadId }, data: { etapa: 'PROMESA' } })
    } else if (estado === 'ESCRITURA') {
      await prisma.lead.update({ where: { id: venta.leadId }, data: { etapa: 'ESCRITURA' } })
    }

    res.json(venta)
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Venta no encontrada.' })
    res.status(500).json({ error: 'Error al actualizar estado de venta.' })
  }
}

module.exports = { listar, obtener, actualizarEstado }
```

- [ ] **Step 2: Update `backend/src/routes/ventas.js`**

```js
const express = require('express')
const router = express.Router()
const { listar, obtener, actualizarEstado } = require('../controllers/ventasController')
const { autenticar, autorizar } = require('../middleware/auth')

router.use(autenticar)
router.use(autorizar('GERENTE', 'JEFE_VENTAS', 'ABOGADO'))

router.get('/', listar)
router.get('/:id', obtener)
router.put('/:id/estado', autorizar('GERENTE', 'JEFE_VENTAS'), actualizarEstado)

module.exports = router
```

- [ ] **Step 3: Verify syntax**

```bash
cd backend && node -e "require('./src/controllers/ventasController')" && echo OK
```

Expected: `OK`

- [ ] **Step 4: Commit**

```bash
git add backend/src/controllers/ventasController.js backend/src/routes/ventas.js
git commit -m "feat: ventasController — remove standalone crear, update includes for new schema"
```

---

## Task 7: Wire routes + remove promociones

**Files:**
- Modify: `backend/src/index.js`
- Delete: `backend/src/controllers/promocionesController.js`
- Delete: `backend/src/routes/promociones.js`

- [ ] **Step 1: In `backend/src/index.js`, replace the promociones route line and add packs/beneficios**

Find this line:
```js
app.use('/api/promociones', require('./routes/promociones'))
```

Replace with:
```js
app.use('/api/packs', require('./routes/packs'))
app.use('/api/beneficios', require('./routes/beneficios'))
```

- [ ] **Step 2: Delete old files**

```bash
rm backend/src/controllers/promocionesController.js
rm backend/src/routes/promociones.js
```

- [ ] **Step 3: Start server and verify new routes respond**

```bash
cd backend && node src/index.js &
sleep 2

# Login to get token
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"gerente@bodeparking.cl","password":"bodeparking2026"}' \
  | node -e "const d=require('fs').readFileSync('/dev/stdin','utf8'); console.log(JSON.parse(d).token)")

curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/packs | node -e "const d=require('fs').readFileSync('/dev/stdin','utf8'); console.log(JSON.parse(d))"
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/beneficios | node -e "const d=require('fs').readFileSync('/dev/stdin','utf8'); console.log(JSON.parse(d))"

kill %1
```

Expected: both return `[]` (empty arrays).

- [ ] **Step 4: Commit**

```bash
git add backend/src/index.js
git commit -m "feat: wire packs/beneficios routes, remove promociones route"
```

---

## Task 8: CotizacionEditor.jsx — redesign packs/beneficios/convertir

**Files:**
- Modify: `frontend/src/pages/cotizaciones/CotizacionEditor.jsx`

The current file has: `PanelPromociones` (calls `/api/promociones`), `ModalConvertirVenta` (form with price fields), `calcularResumen` (client-side price calc). All three need to be replaced.

- [ ] **Step 1: Remove `calcularResumen`, `calcularResumenConAprobado`, `TIPO_PROMO_LABEL`, `TIPO_PROMO_COLOR`, `TIPOS_PACK`, `FilaPromo`, `PanelPromociones`, and `ModalConvertirVenta` from the file**

These are defined at lines ~26–750. Remove them entirely.

- [ ] **Step 2: Add new `PanelPacks` component** (insert after imports, before `SelectorUnidades`):

```jsx
function PanelPacks({ cotizacionId, packs, soloLectura }) {
  const qc = useQueryClient()
  const { message } = App.useApp()

  const { data: todosLosPacks = [] } = useQuery({
    queryKey: ['packs-activos'],
    queryFn: () => api.get('/packs', { params: { activa: true } }).then(r => r.data)
  })

  const packIds = new Set(packs.map(p => p.packId))
  const packsDisponibles = todosLosPacks.filter(p => !packIds.has(p.id))

  const agregar = useMutation({
    mutationFn: (packId) => api.post(`/cotizaciones/${cotizacionId}/packs`, { packId }),
    onSuccess: () => { message.success('Pack agregado'); qc.invalidateQueries(['cotizacion', String(cotizacionId)]) },
    onError: err => message.error(err.response?.data?.error || 'Error al agregar pack')
  })

  const quitar = useMutation({
    mutationFn: (packId) => api.delete(`/cotizaciones/${cotizacionId}/packs/${packId}`),
    onSuccess: () => { message.success('Pack quitado'); qc.invalidateQueries(['cotizacion', String(cotizacionId)]) },
    onError: err => message.error(err.response?.data?.error || 'Error')
  })

  return (
    <Card
      size="small"
      title={<Text strong style={{ color: '#d46b08' }}>Packs — descuentos sobre el precio</Text>}
      style={{ borderColor: '#ffd591' }}
      extra={
        !soloLectura && packsDisponibles.length > 0 && (
          <Select
            placeholder="Agregar pack..."
            size="small"
            style={{ width: 200 }}
            showSearch
            filterOption={(v, o) => o.label.toLowerCase().includes(v.toLowerCase())}
            options={packsDisponibles.map(p => ({ value: p.id, label: `${p.nombre} (−${p.descuentoUF} UF)` }))}
            onChange={id => agregar.mutate(id)}
            value={null}
          />
        )
      }
    >
      {packs.length === 0 ? (
        <Text type="secondary" style={{ fontSize: 12 }}>Sin packs aplicados</Text>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {packs.map(cp => (
            <div key={cp.packId} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '6px 10px', borderRadius: 8, background: '#fff7e6', border: '1px solid #ffd591'
            }}>
              <div>
                <Text strong style={{ fontSize: 13 }}>{cp.pack.nombre}</Text>
                {cp.pack.descripcion && <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>{cp.pack.descripcion}</Text>}
                <div><Text style={{ color: '#d46b08', fontSize: 12 }}>−{cp.descuentoAplicadoUF} UF</Text></div>
              </div>
              {!soloLectura && (
                <Button size="small" danger type="text" icon={<DeleteOutlined />} onClick={() => quitar.mutate(cp.packId)} />
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

function PanelBeneficios({ cotizacionId, beneficios, soloLectura }) {
  const qc = useQueryClient()
  const { message } = App.useApp()

  const { data: todosBeneficios = [] } = useQuery({
    queryKey: ['beneficios-activos'],
    queryFn: () => api.get('/beneficios', { params: { activa: true } }).then(r => r.data)
  })

  const beneficioIds = new Set(beneficios.map(b => b.beneficioId))
  const disponibles = todosBeneficios.filter(b => !beneficioIds.has(b.id))

  const agregar = useMutation({
    mutationFn: (beneficioId) => api.post(`/cotizaciones/${cotizacionId}/beneficios`, { beneficioId }),
    onSuccess: () => { message.success('Beneficio agregado'); qc.invalidateQueries(['cotizacion', String(cotizacionId)]) },
    onError: err => message.error(err.response?.data?.error || 'Error')
  })

  const quitar = useMutation({
    mutationFn: (beneficioId) => api.delete(`/cotizaciones/${cotizacionId}/beneficios/${beneficioId}`),
    onSuccess: () => { message.success('Beneficio quitado'); qc.invalidateQueries(['cotizacion', String(cotizacionId)]) },
    onError: err => message.error(err.response?.data?.error || 'Error')
  })

  const TIPO_LABEL = { ARRIENDO_ASEGURADO: 'Arriendo asegurado', GASTOS_NOTARIALES: 'Gastos notariales', CUOTAS_SIN_INTERES: 'Cuotas sin interés', OTRO: 'Otro' }

  return (
    <Card
      size="small"
      title={<Text strong style={{ color: '#389e0d' }}>Beneficios adicionales</Text>}
      style={{ borderColor: '#b7eb8f' }}
      extra={
        !soloLectura && disponibles.length > 0 && (
          <Select
            placeholder="Agregar beneficio..."
            size="small"
            style={{ width: 200 }}
            showSearch
            filterOption={(v, o) => o.label.toLowerCase().includes(v.toLowerCase())}
            options={disponibles.map(b => ({ value: b.id, label: b.nombre }))}
            onChange={id => agregar.mutate(id)}
            value={null}
          />
        )
      }
    >
      {beneficios.length === 0 ? (
        <Text type="secondary" style={{ fontSize: 12 }}>Sin beneficios aplicados</Text>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {beneficios.map(cb => (
            <div key={cb.beneficioId} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '6px 10px', borderRadius: 8, background: '#f6ffed', border: '1px solid #b7eb8f'
            }}>
              <div>
                <Tag color="green" style={{ fontSize: 11 }}>{TIPO_LABEL[cb.beneficio.tipo] || cb.beneficio.tipo}</Tag>
                <Text style={{ fontSize: 13 }}>{cb.beneficio.nombre}</Text>
              </div>
              {!soloLectura && (
                <Button size="small" danger type="text" icon={<DeleteOutlined />} onClick={() => quitar.mutate(cb.beneficioId)} />
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

function ResumenPrecio({ cotizacion }) {
  const items = cotizacion?.items || []
  const packs = cotizacion?.packs || []
  const beneficios = cotizacion?.beneficios || []
  const descAprobado = cotizacion?.descuentoAprobadoUF || 0

  const precioLista = items.reduce((s, i) => s + (i.precioListaUF || 0), 0)
  const descPacks = packs.reduce((s, p) => s + (p.descuentoAplicadoUF || 0), 0)
  const precioFinal = Math.max(precioLista - descPacks - descAprobado, 0)

  return (
    <Card title="Resumen de precio" size="small" style={{ background: '#f8faff', border: '1px solid #d6e4ff' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {items.map(i => (
          <div key={i.unidadId || i.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
            <Text type="secondary">
              {i.unidad?.edificio?.nombre || i.edificio} — {i.unidad?.tipo === 'BODEGA' || i.tipo === 'BODEGA' ? 'Bodega' : 'Est.'} {i.unidad?.numero || i.numero}
            </Text>
            <Text strong>{(i.precioListaUF || 0).toFixed(2)} UF</Text>
          </div>
        ))}

        {items.length > 1 && (
          <>
            <Divider style={{ margin: '4px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <Text>Precio de lista</Text>
              <Text strong>{precioLista.toFixed(2)} UF</Text>
            </div>
          </>
        )}

        {descPacks > 0 && (
          <>
            <Divider style={{ margin: '4px 0' }} />
            {packs.map(p => (
              <div key={p.packId} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <Text style={{ color: '#d46b08' }}>− Pack: {p.pack.nombre}</Text>
                <Text style={{ color: '#d46b08' }}>−{p.descuentoAplicadoUF.toFixed(2)} UF</Text>
              </div>
            ))}
          </>
        )}

        {descAprobado > 0 && (
          <>
            <Divider style={{ margin: '4px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <Text style={{ color: '#d46b08' }}>− Descuento aprobado</Text>
              <Text style={{ color: '#d46b08' }}>−{descAprobado.toFixed(2)} UF</Text>
            </div>
          </>
        )}

        {beneficios.length > 0 && (
          <>
            <Divider style={{ margin: '4px 0' }} />
            {beneficios.map(b => (
              <div key={b.beneficioId} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                <CheckCircleOutlined style={{ color: '#52c41a' }} />
                <Text style={{ color: '#52c41a' }}>{b.beneficio.nombre}</Text>
              </div>
            ))}
          </>
        )}

        <Divider style={{ margin: '6px 0' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <Text strong style={{ fontSize: 15 }}>Total</Text>
          <Text strong style={{ fontSize: 17, color: '#1677ff' }}>{precioFinal.toFixed(2)} UF</Text>
        </div>
      </div>
    </Card>
  )
}
```

- [ ] **Step 3: Replace `ModalConvertirVenta` usage**

Find the section in the main `CotizacionEditor` component where `ModalConvertirVenta` is rendered and replace with a `Popconfirm` button. In the actions area of the main component find:

```jsx
<Button ... onClick={() => setModalConvertir(true)}>Convertir a Venta</Button>
...
<ModalConvertirVenta open={modalConvertir} onClose={() => setModalConvertir(false)} ... />
```

And replace with:

```jsx
<Popconfirm
  title="Convertir cotización a venta"
  description={`¿Confirmas la conversión? Se creará la venta con precio final ${(cotizacion?.precioFinalUF || 0).toFixed(2)} UF.`}
  onConfirm={() => convertir.mutate()}
  okText="Sí, convertir"
  cancelText="Cancelar"
  disabled={!puedeConvertir}
>
  <Button
    type="primary"
    icon={<ShoppingOutlined />}
    loading={convertir.isPending}
    disabled={!puedeConvertir}
  >
    Convertir a Venta
  </Button>
</Popconfirm>
```

Add the `convertir` mutation in the main component (near where `crear` mutation is defined):

```jsx
const convertir = useMutation({
  mutationFn: () => api.post(`/cotizaciones/${id}/convertir`),
  onSuccess: (res) => {
    message.success('¡Venta creada exitosamente!')
    qc.invalidateQueries({ queryKey: ['cotizacion', id] })
    navigate(`/ventas/${res.data.id}`)
  },
  onError: err => message.error(err.response?.data?.error || 'Error al convertir')
})
```

- [ ] **Step 4: Replace the promotions render section**

In the JSX render, find where `PanelPromociones` is rendered and replace with:

```jsx
<PanelPacks
  cotizacionId={id}
  packs={cotizacion?.packs || []}
  soloLectura={soloLectura}
/>
<PanelBeneficios
  cotizacionId={id}
  beneficios={cotizacion?.beneficios || []}
  soloLectura={soloLectura}
/>
```

Replace the `ResumenPrecio` usage (currently `<ResumenPrecio items={items} promos={promos} ...>`) with:

```jsx
<ResumenPrecio cotizacion={cotizacion} />
```

- [ ] **Step 5: Remove unused imports and state**

Remove from imports: `GiftOutlined, PercentageOutlined, TagOutlined, DollarOutlined, ClockCircleOutlined, PercentageOutlined as PctIcon` (any that are no longer used).

Remove state variables that were for the old modal: `modalConvertir`, `setModalConvertir`.

Remove the old `promos` state (it was `cotizacion?.promociones || []` — packs and beneficios now come directly from `cotizacion.packs` and `cotizacion.beneficios`).

In the `crear` mutation data, remove the `promociones` field if present.

- [ ] **Step 6: Update `puedeConvertir` logic**

Find the `puedeConvertir` variable. It should be:

```js
const puedeConvertir = !soloLectura &&
  cotizacion &&
  !cotizacion.ventaOrigen &&
  cotizacion.estado !== 'RECHAZADA' &&
  (cotizacion.items?.length || 0) > 0
```

- [ ] **Step 7: Add Popconfirm to imports**

In the antd imports line, add `Popconfirm` if not already present.

- [ ] **Step 8: Verify the frontend builds**

```bash
cd frontend && npm run build 2>&1 | tail -20
```

Expected: build completes without errors.

- [ ] **Step 9: Commit**

```bash
git add frontend/src/pages/cotizaciones/CotizacionEditor.jsx
git commit -m "feat: CotizacionEditor — packs/beneficios panels + simple convertir button"
```

---

## Task 9: PacksBeneficios.jsx — new admin page

**Files:**
- Create: `frontend/src/pages/configuracion/PacksBeneficios.jsx`

- [ ] **Step 1: Write `frontend/src/pages/configuracion/PacksBeneficios.jsx`**

```jsx
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Card, Button, Table, Modal, Form, Input, Select, InputNumber,
  Tag, Switch, Space, Tabs, Typography, App, Popconfirm, DatePicker
} from 'antd'
import { PlusOutlined, EditOutlined } from '@ant-design/icons'
import api from '../../services/api'
import dayjs from 'dayjs'

const { Text } = Typography

const TIPO_PACK_LABEL = { COMBO_ESPECIFICO: 'Combo específico', POR_CANTIDAD: 'Por cantidad' }
const TIPO_BENEFICIO_LABEL = { ARRIENDO_ASEGURADO: 'Arriendo asegurado', GASTOS_NOTARIALES: 'Gastos notariales', CUOTAS_SIN_INTERES: 'Cuotas sin interés', OTRO: 'Otro' }

function ModalPack({ open, onClose, pack }) {
  const [form] = Form.useForm()
  const qc = useQueryClient()
  const { message } = App.useApp()
  const tipo = Form.useWatch('tipo', form)

  const { data: unidades = [] } = useQuery({
    queryKey: ['unidades-selector'],
    queryFn: () => api.get('/cotizaciones/unidades-disponibles').then(r => r.data)
  })

  const guardar = useMutation({
    mutationFn: (d) => pack
      ? api.put(`/packs/${pack.id}`, d)
      : api.post('/packs', d),
    onSuccess: () => {
      message.success(pack ? 'Pack actualizado' : 'Pack creado')
      qc.invalidateQueries({ queryKey: ['packs'] })
      qc.invalidateQueries({ queryKey: ['packs-activos'] })
      onClose()
    },
    onError: err => message.error(err.response?.data?.error || 'Error')
  })

  const handleOk = () => {
    form.validateFields().then(values => {
      const data = {
        ...values,
        fechaInicio: values.fechaInicio ? values.fechaInicio.toISOString() : null,
        fechaFin: values.fechaFin ? values.fechaFin.toISOString() : null,
        unidadIds: values.unidadIds || []
      }
      guardar.mutate(data)
    })
  }

  const initialValues = pack ? {
    ...pack,
    fechaInicio: pack.fechaInicio ? dayjs(pack.fechaInicio) : null,
    fechaFin: pack.fechaFin ? dayjs(pack.fechaFin) : null,
    unidadIds: pack.unidades?.map(u => u.unidadId) || []
  } : { activa: true, minUnidades: 2 }

  return (
    <Modal
      title={pack ? 'Editar pack' : 'Nuevo pack'}
      open={open}
      onCancel={onClose}
      onOk={handleOk}
      confirmLoading={guardar.isPending}
      okText="Guardar"
    >
      <Form form={form} layout="vertical" initialValues={initialValues} style={{ marginTop: 12 }}>
        <Form.Item name="nombre" label="Nombre" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="descripcion" label="Descripción">
          <Input.TextArea rows={2} />
        </Form.Item>
        <Form.Item name="tipo" label="Tipo" rules={[{ required: true }]}>
          <Select options={Object.entries(TIPO_PACK_LABEL).map(([v, l]) => ({ value: v, label: l }))} />
        </Form.Item>
        <Form.Item name="descuentoUF" label="Descuento (UF)" rules={[{ required: true }]}>
          <InputNumber min={0.1} step={0.5} style={{ width: '100%' }} addonAfter="UF" />
        </Form.Item>
        {tipo === 'POR_CANTIDAD' && (
          <Form.Item name="minUnidades" label="Mínimo de unidades">
            <InputNumber min={2} style={{ width: '100%' }} />
          </Form.Item>
        )}
        {tipo === 'COMBO_ESPECIFICO' && (
          <Form.Item name="unidadIds" label="Unidades del combo">
            <Select
              mode="multiple"
              placeholder="Seleccionar unidades..."
              options={unidades.map(u => ({ value: u.id, label: `${u.edificio.nombre} — ${u.numero}` }))}
              filterOption={(v, o) => o.label.toLowerCase().includes(v.toLowerCase())}
            />
          </Form.Item>
        )}
        <Space>
          <Form.Item name="fechaInicio" label="Válido desde">
            <DatePicker format="DD/MM/YYYY" />
          </Form.Item>
          <Form.Item name="fechaFin" label="Válido hasta">
            <DatePicker format="DD/MM/YYYY" />
          </Form.Item>
        </Space>
        {pack && (
          <Form.Item name="activa" label="Activo" valuePropName="checked">
            <Switch />
          </Form.Item>
        )}
      </Form>
    </Modal>
  )
}

function ModalBeneficio({ open, onClose, beneficio }) {
  const [form] = Form.useForm()
  const qc = useQueryClient()
  const { message } = App.useApp()
  const tipo = Form.useWatch('tipo', form)

  const guardar = useMutation({
    mutationFn: (d) => beneficio
      ? api.put(`/beneficios/${beneficio.id}`, d)
      : api.post('/beneficios', d),
    onSuccess: () => {
      message.success(beneficio ? 'Beneficio actualizado' : 'Beneficio creado')
      qc.invalidateQueries({ queryKey: ['beneficios'] })
      qc.invalidateQueries({ queryKey: ['beneficios-activos'] })
      onClose()
    },
    onError: err => message.error(err.response?.data?.error || 'Error')
  })

  const handleOk = () => {
    form.validateFields().then(values => {
      guardar.mutate({
        ...values,
        fechaInicio: values.fechaInicio ? values.fechaInicio.toISOString() : null,
        fechaFin: values.fechaFin ? values.fechaFin.toISOString() : null,
      })
    })
  }

  const initialValues = beneficio ? {
    ...beneficio,
    fechaInicio: beneficio.fechaInicio ? dayjs(beneficio.fechaInicio) : null,
    fechaFin: beneficio.fechaFin ? dayjs(beneficio.fechaFin) : null,
  } : { activa: true }

  return (
    <Modal
      title={beneficio ? 'Editar beneficio' : 'Nuevo beneficio'}
      open={open}
      onCancel={onClose}
      onOk={handleOk}
      confirmLoading={guardar.isPending}
      okText="Guardar"
    >
      <Form form={form} layout="vertical" initialValues={initialValues} style={{ marginTop: 12 }}>
        <Form.Item name="nombre" label="Nombre" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="descripcion" label="Descripción">
          <Input.TextArea rows={2} />
        </Form.Item>
        <Form.Item name="tipo" label="Tipo" rules={[{ required: true }]}>
          <Select options={Object.entries(TIPO_BENEFICIO_LABEL).map(([v, l]) => ({ value: v, label: l }))} />
        </Form.Item>
        {tipo === 'ARRIENDO_ASEGURADO' && (
          <Space>
            <Form.Item name="meses" label="Meses">
              <InputNumber min={1} style={{ width: 100 }} />
            </Form.Item>
            <Form.Item name="montoMensualUF" label="Monto/mes (UF)">
              <InputNumber min={0.1} step={0.1} style={{ width: 120 }} addonAfter="UF" />
            </Form.Item>
          </Space>
        )}
        {tipo === 'OTRO' && (
          <Form.Item name="detalle" label="Detalle">
            <Input.TextArea rows={2} />
          </Form.Item>
        )}
        <Space>
          <Form.Item name="fechaInicio" label="Válido desde">
            <DatePicker format="DD/MM/YYYY" />
          </Form.Item>
          <Form.Item name="fechaFin" label="Válido hasta">
            <DatePicker format="DD/MM/YYYY" />
          </Form.Item>
        </Space>
        {beneficio && (
          <Form.Item name="activa" label="Activo" valuePropName="checked">
            <Switch />
          </Form.Item>
        )}
      </Form>
    </Modal>
  )
}

function TabPacks() {
  const [modal, setModal] = useState({ open: false, pack: null })
  const { data: packs = [], isLoading } = useQuery({
    queryKey: ['packs'],
    queryFn: () => api.get('/packs').then(r => r.data)
  })

  const columns = [
    { title: 'Nombre', dataIndex: 'nombre', key: 'nombre', render: (t, r) => <><Text strong>{t}</Text>{r.descripcion && <div><Text type="secondary" style={{ fontSize: 12 }}>{r.descripcion}</Text></div>}</> },
    { title: 'Tipo', dataIndex: 'tipo', key: 'tipo', render: t => <Tag>{TIPO_PACK_LABEL[t]}</Tag> },
    { title: 'Descuento', dataIndex: 'descuentoUF', key: 'descuentoUF', render: v => <Text strong style={{ color: '#d46b08' }}>−{v} UF</Text> },
    { title: 'Activo', dataIndex: 'activa', key: 'activa', render: v => <Tag color={v ? 'green' : 'default'}>{v ? 'Sí' : 'No'}</Tag> },
    { title: '', key: 'acciones', render: (_, r) => <Button size="small" icon={<EditOutlined />} onClick={() => setModal({ open: true, pack: r })}>Editar</Button> }
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModal({ open: true, pack: null })}>Nuevo pack</Button>
      </div>
      <Table dataSource={packs} columns={columns} rowKey="id" loading={isLoading} size="small" />
      <ModalPack open={modal.open} onClose={() => setModal({ open: false, pack: null })} pack={modal.pack} />
    </div>
  )
}

function TabBeneficios() {
  const [modal, setModal] = useState({ open: false, beneficio: null })
  const { data: beneficios = [], isLoading } = useQuery({
    queryKey: ['beneficios'],
    queryFn: () => api.get('/beneficios').then(r => r.data)
  })

  const columns = [
    { title: 'Nombre', dataIndex: 'nombre', key: 'nombre', render: (t, r) => <><Text strong>{t}</Text>{r.descripcion && <div><Text type="secondary" style={{ fontSize: 12 }}>{r.descripcion}</Text></div>}</> },
    { title: 'Tipo', dataIndex: 'tipo', key: 'tipo', render: t => <Tag color="green">{TIPO_BENEFICIO_LABEL[t]}</Tag> },
    { title: 'Activo', dataIndex: 'activa', key: 'activa', render: v => <Tag color={v ? 'green' : 'default'}>{v ? 'Sí' : 'No'}</Tag> },
    { title: '', key: 'acciones', render: (_, r) => <Button size="small" icon={<EditOutlined />} onClick={() => setModal({ open: true, beneficio: r })}>Editar</Button> }
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModal({ open: true, beneficio: null })}>Nuevo beneficio</Button>
      </div>
      <Table dataSource={beneficios} columns={columns} rowKey="id" loading={isLoading} size="small" />
      <ModalBeneficio open={modal.open} onClose={() => setModal({ open: false, beneficio: null })} beneficio={modal.beneficio} />
    </div>
  )
}

export default function PacksBeneficios() {
  const items = [
    { key: 'packs', label: 'Packs de descuento', children: <TabPacks /> },
    { key: 'beneficios', label: 'Beneficios adicionales', children: <TabBeneficios /> },
  ]
  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 20 }}>
        <Text style={{ fontSize: 22, fontWeight: 700 }}>Packs y Beneficios</Text>
        <div><Text type="secondary">Administra los descuentos y beneficios disponibles para las cotizaciones.</Text></div>
      </div>
      <Card>
        <Tabs items={items} />
      </Card>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/configuracion/PacksBeneficios.jsx
git commit -m "feat: add PacksBeneficios admin page"
```

---

## Task 10: VentaDetalle.jsx — update for new schema

**Files:**
- Modify: `frontend/src/pages/ventas/VentaDetalle.jsx`

- [ ] **Step 1: Remove imports of old promo types**

Find and remove:
```js
import { TIPO_PROMO_LABEL, TIPO_PROMO_COLOR, resumenPromo } from '../promociones/Promociones'
```

- [ ] **Step 2: Replace the price display section**

Find where `venta.precioUF` or `venta.descuentoUF` are rendered (usually in the main info card showing "Precio" / "Descuento"). Replace with a price breakdown block:

```jsx
{/* Desglose de precio */}
<div style={{ background: '#f8faff', border: '1px solid #d6e4ff', borderRadius: 8, padding: '12px 16px' }}>
  <Text strong style={{ display: 'block', marginBottom: 8 }}>Desglose de precio</Text>
  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
    <Text type="secondary">Precio de lista</Text>
    <Text>{(venta.precioListaUF || 0).toFixed(2)} UF</Text>
  </div>
  {venta.descuentoPacksUF > 0 && (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
      <Text style={{ color: '#d46b08' }}>− Descuento packs</Text>
      <Text style={{ color: '#d46b08' }}>−{venta.descuentoPacksUF.toFixed(2)} UF</Text>
    </div>
  )}
  {venta.descuentoAprobadoUF > 0 && (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
      <Text style={{ color: '#d46b08' }}>− Desc. aprobado</Text>
      <Text style={{ color: '#d46b08' }}>−{venta.descuentoAprobadoUF.toFixed(2)} UF</Text>
    </div>
  )}
  <Divider style={{ margin: '8px 0' }} />
  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
    <Text strong>Precio final</Text>
    <Text strong style={{ fontSize: 16, color: '#1677ff' }}>{(venta.precioFinalUF || 0).toFixed(2)} UF</Text>
  </div>
</div>
```

- [ ] **Step 3: Replace the promociones section with beneficios**

Find the section that renders `venta.promociones` (usually a card titled "Promociones" or similar). Replace with:

```jsx
{/* Beneficios */}
{venta.beneficios?.length > 0 && (
  <Card title="Beneficios" size="small" style={{ marginTop: 16 }}>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {venta.beneficios.map(vb => (
        <div key={vb.id} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 12px', borderRadius: 8, background: '#f6ffed', border: '1px solid #b7eb8f'
        }}>
          <div>
            <Tag color="green">{vb.beneficio.tipo}</Tag>
            <Text strong style={{ fontSize: 13 }}>{vb.beneficio.nombre}</Text>
            {vb.beneficio.descripcion && <div><Text type="secondary" style={{ fontSize: 12 }}>{vb.beneficio.descripcion}</Text></div>}
          </div>
          <Tag color={
            vb.estado === 'COMPLETADO' ? 'green' :
            vb.estado === 'EN_CURSO' ? 'blue' :
            vb.estado === 'CANCELADO' ? 'red' : 'orange'
          }>{vb.estado}</Tag>
        </div>
      ))}
    </div>
  </Card>
)}
```

- [ ] **Step 4: Add link to cotización de origen**

In the main info card (near the other metadata), add:

```jsx
{venta.cotizacionOrigen && (
  <div>
    <Text type="secondary">Cotización origen: </Text>
    <a href={`/cotizaciones/${venta.cotizacionOrigen.id}`}>#{venta.cotizacionOrigen.id}</a>
    <Tag style={{ marginLeft: 8 }} color={venta.cotizacionOrigen.estado === 'ACEPTADA' ? 'green' : 'blue'}>
      {venta.cotizacionOrigen.estado}
    </Tag>
  </div>
)}
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/ventas/VentaDetalle.jsx
git commit -m "feat: VentaDetalle — price breakdown + beneficios section"
```

---

## Task 11: App.jsx + Layout.jsx — routes and nav

**Files:**
- Modify: `frontend/src/App.jsx`
- Modify: `frontend/src/components/Layout.jsx`

- [ ] **Step 1: Add PacksBeneficios route to `frontend/src/App.jsx`**

Add import at top:
```js
import PacksBeneficios from './pages/configuracion/PacksBeneficios'
```

Add route (after the ApiKeys route):
```jsx
<Route path="configuracion/packs-beneficios" element={<RutaProtegida roles={['GERENTE','JEFE_VENTAS']}><PacksBeneficios /></RutaProtegida>} />
```

- [ ] **Step 2: Update `frontend/src/components/Layout.jsx` nav**

Find this item in the `NAV_SECTIONS` array:
```js
{ key: '/promociones', label: 'Promociones', icon: <TagOutlined />, roles: null, modulo: 'promociones', badge: undefined },
```

Replace with:
```js
{ key: '/configuracion/packs-beneficios', label: 'Packs y Beneficios', icon: <TagOutlined />, roles: ['GERENTE','JEFE_VENTAS'], modulo: 'packs-beneficios' },
```

- [ ] **Step 3: Verify frontend builds**

```bash
cd frontend && npm run build 2>&1 | tail -20
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/App.jsx frontend/src/components/Layout.jsx
git commit -m "feat: add Packs y Beneficios route and nav item, remove Promociones"
```

---

## Task 12: End-to-end smoke test

- [ ] **Step 1: Start backend and frontend**

```bash
cd backend && node src/index.js &
cd frontend && npm run dev &
sleep 3
```

- [ ] **Step 2: Verify backend endpoints via curl**

```bash
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"gerente@bodeparking.cl","password":"bodeparking2026"}' \
  | node -e "process.stdin.resume();let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).token))")

echo "=== Packs ===" && curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/packs
echo "=== Beneficios ===" && curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/beneficios
echo "=== Cotizaciones ===" && curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/cotizaciones
echo "=== Ventas ===" && curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/ventas
```

Expected: all return valid JSON (arrays, possibly empty).

- [ ] **Step 3: Kill background processes**

```bash
kill %1 %2 2>/dev/null
```

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "chore: final cleanup after cotizacion-venta redesign"
```
