# Correcciones Lógica Base de Datos — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corregir 6 bugs y problemas de lógica en los controllers y schema de Prisma del CRM — sin tocar comisiones automáticas ni frontend.

**Architecture:** Todos los cambios son en backend (Node.js/Express + Prisma). Tasks 1-3 son solo código. Tasks 4-5 requieren migración Prisma (schema change + `npx prisma migrate deploy`). Task 6 deploya todo.

**Tech Stack:** Node.js, Express, Prisma, PostgreSQL, Railway.

---

## Archivos a modificar

| Archivo | Qué cambia |
|---|---|
| `backend/src/controllers/comisionesController.js` | Fix `unidad`→`unidades` en listar; validar venta no ANULADA al crear |
| `backend/src/controllers/pagosController.js` | Fix `unidad`→`unidades` en cuotasAtrasadas; fix montoUF nulo; validar cuota tiene monto |
| `backend/src/controllers/promocionesController.js` | Manejar error P2002 en aplicarAVenta |
| `backend/prisma/schema.prisma` | `@@unique([ventaId, promocionId])` en VentaPromocion; campo `cotizacionOrigenId` en Venta |
| `backend/src/controllers/ventasController.js` | Aceptar `cotizacionOrigenId` al crear venta |

---

### Task 1: Fix comisionesController — `unidades` y validar venta anulada

**Files:**
- Modify: `backend/src/controllers/comisionesController.js:25-31` (listar)
- Modify: `backend/src/controllers/comisionesController.js:63-65` (crear)

- [ ] **Step 1: Fix `unidad` → `unidades` en listar**

En `backend/src/controllers/comisionesController.js`, línea 28, cambiar:

```js
// ANTES (línea 28):
unidad: { select: { numero: true, tipo: true, edificio: { select: { nombre: true } } } },

// DESPUÉS:
unidades: { select: { numero: true, tipo: true, edificio: { select: { nombre: true } } } },
```

La sección completa del select de venta queda:
```js
venta: {
  select: {
    id: true, estado: true, precioUF: true,
    unidades: { select: { numero: true, tipo: true, edificio: { select: { nombre: true } } } },
    comprador: { select: { nombre: true, apellido: true } }
  }
}
```

- [ ] **Step 2: Agregar validación de venta ANULADA en crear**

En `backend/src/controllers/comisionesController.js`, en la función `crear`, después de la línea:
```js
const venta = await prisma.venta.findUnique({ where: { id: Number(ventaId) }, select: { precioUF: true, descuentoUF: true } })
if (!venta) return res.status(404).json({ error: 'Venta no encontrada.' })
```

Cambiar el select para incluir `estado`, y agregar la validación:
```js
const venta = await prisma.venta.findUnique({
  where: { id: Number(ventaId) },
  select: { precioUF: true, descuentoUF: true, estado: true }
})
if (!venta) return res.status(404).json({ error: 'Venta no encontrada.' })
if (venta.estado === 'ANULADO') return res.status(400).json({ error: 'No se pueden crear comisiones para ventas anuladas.' })
```

- [ ] **Step 3: Verificar manualmente**

```bash
cd /Users/juana/Documents/bodeparkingcrm/backend
node -e "
const prisma = require('./src/lib/prisma')
prisma.comision.findMany({
  take: 1,
  include: {
    venta: {
      select: {
        id: true, estado: true, precioUF: true,
        unidades: { select: { numero: true, tipo: true, edificio: { select: { nombre: true } } } },
        comprador: { select: { nombre: true, apellido: true } }
      }
    }
  }
}).then(r => console.log(JSON.stringify(r, null, 2))).catch(e => console.error('ERROR:', e.message)).finally(() => prisma.\$disconnect())
"
```

Expected: JSON con `venta.unidades` como array (sin error de Prisma).

- [ ] **Step 4: Commit**

```bash
cd /Users/juana/Documents/bodeparkingcrm
git add backend/src/controllers/comisionesController.js
git commit -m "fix: unidades en listar comisiones y validar venta anulada"
```

---

### Task 2: Fix pagosController — `unidades`, montoUF y validación cuota

**Files:**
- Modify: `backend/src/controllers/pagosController.js:5-40` (crearPlan)
- Modify: `backend/src/controllers/pagosController.js:110-145` (cuotasAtrasadas)

- [ ] **Step 1: Fix validación de montos en crearPlan y montoUF**

En `backend/src/controllers/pagosController.js`, en la función `crearPlan`, reemplazar el bloque desde `if (!ventaId...` hasta el `try {`:

```js
const crearPlan = async (req, res) => {
  const { ventaId, cuotas } = req.body
  // cuotas = [{ tipo, montoUF, montoCLP, fechaVencimiento }]

  if (!ventaId || !cuotas || !cuotas.length) {
    return res.status(400).json({ error: 'VentaId y cuotas son requeridos.' })
  }

  // Cada cuota debe tener al menos un monto
  const cuotaSinMonto = cuotas.find(c => !(c.montoUF > 0) && !(c.montoCLP > 0))
  if (cuotaSinMonto) {
    return res.status(400).json({ error: 'Cada cuota debe tener montoUF o montoCLP.' })
  }

  try {
    const existente = await prisma.planPago.findUnique({ where: { ventaId: Number(ventaId) } })
    if (existente) return res.status(400).json({ error: 'Esta venta ya tiene un plan de pago.' })

    // Solo sumar montoUF si hay cuotas con valor UF
    const totalUF = cuotas.some(c => c.montoUF > 0)
      ? cuotas.reduce((s, c) => s + (c.montoUF || 0), 0)
      : null

    const plan = await prisma.planPago.create({
      data: {
        ventaId: Number(ventaId),
        totalCuotas: cuotas.length,
        montoUF: totalUF,
        fechaInicio: new Date(cuotas[0].fechaVencimiento),
        cuotas: {
          create: cuotas.map((c, i) => ({
            numeroCuota: i + 1,
            tipo: c.tipo,
            montoUF: c.montoUF ? Number(c.montoUF) : null,
            montoCLP: c.montoCLP ? Number(c.montoCLP) : null,
            fechaVencimiento: new Date(c.fechaVencimiento),
            estado: 'PENDIENTE'
          }))
        }
      },
      include: { cuotas: { orderBy: { numeroCuota: 'asc' } } }
    })

    res.status(201).json(plan)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al crear plan de pago.' })
  }
}
```

- [ ] **Step 2: Fix `unidad` → `unidades` en cuotasAtrasadas**

En `backend/src/controllers/pagosController.js`, en la función `cuotasAtrasadas`, línea 135, cambiar:

```js
// ANTES (línea 135):
unidad: { select: { numero: true, tipo: true, edificio: { select: { nombre: true } } } }

// DESPUÉS:
unidades: { select: { numero: true, tipo: true, edificio: { select: { nombre: true } } } }
```

El include completo de venta en cuotasAtrasadas queda:
```js
venta: {
  include: {
    comprador: { select: { nombre: true, apellido: true, telefono: true } },
    unidades: { select: { numero: true, tipo: true, edificio: { select: { nombre: true } } } }
  }
}
```

- [ ] **Step 3: Verificar manualmente**

```bash
cd /Users/juana/Documents/bodeparkingcrm/backend
node -e "
const prisma = require('./src/lib/prisma')
prisma.cuota.findMany({
  take: 1,
  where: { estado: 'PENDIENTE' },
  include: {
    planPago: {
      include: {
        venta: {
          include: {
            comprador: { select: { nombre: true } },
            unidades: { select: { numero: true, tipo: true } }
          }
        }
      }
    }
  }
}).then(r => console.log(JSON.stringify(r[0], null, 2))).catch(e => console.error('ERROR:', e.message)).finally(() => prisma.\$disconnect())
"
```

Expected: JSON con `venta.unidades` como array (sin error).

- [ ] **Step 4: Commit**

```bash
cd /Users/juana/Documents/bodeparkingcrm
git add backend/src/controllers/pagosController.js
git commit -m "fix: unidades en cuotasAtrasadas, montoUF nulo si CLP, validar monto cuota"
```

---

### Task 3: Fix promocionesController — manejar duplicado VentaPromocion

**Files:**
- Modify: `backend/src/controllers/promocionesController.js:85-105` (aplicarAVenta)

- [ ] **Step 1: Agregar manejo de P2002 en aplicarAVenta**

En `backend/src/controllers/promocionesController.js`, en la función `aplicarAVenta`, en el bloque catch, agregar manejo para P2002 (unique constraint violation) que vendrá de la migración del Task 4:

```js
const aplicarAVenta = async (req, res) => {
  const { id } = req.params
  const { ventaId } = req.body

  try {
    const promo = await prisma.promocion.findUnique({ where: { id: Number(id) } })
    if (!promo) return res.status(404).json({ error: 'Promoción no encontrada.' })

    const ventaPromo = await prisma.ventaPromocion.create({
      data: { ventaId: Number(ventaId), promocionId: Number(id) }
    })

    // Si es arriendo asegurado, crear registros de pagos mes a mes
    if (promo.tipo === 'ARRIENDO_ASEGURADO' && promo.mesesArriendo) {
      const pagos = Array.from({ length: promo.mesesArriendo }, (_, i) => ({
        ventaPromocionId: ventaPromo.id,
        mes: i + 1,
        montoUF: promo.montoMensualUF || 0,
        estado: 'PENDIENTE'
      }))
      await prisma.pagoArriendoAsegurado.createMany({ data: pagos })
    }

    res.status(201).json(ventaPromo)
  } catch (err) {
    console.error(err)
    if (err.code === 'P2002') return res.status(400).json({ error: 'Esta promoción ya está aplicada a esta venta.' })
    res.status(500).json({ error: 'Error al aplicar promoción a venta.' })
  }
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/juana/Documents/bodeparkingcrm
git add backend/src/controllers/promocionesController.js
git commit -m "fix: manejar duplicado al aplicar promocion a venta (P2002)"
```

---

### Task 4: Schema — unique constraint en VentaPromocion + migración

**Files:**
- Modify: `backend/prisma/schema.prisma` (modelo VentaPromocion)

- [ ] **Step 1: Verificar duplicados en producción**

Conectarse al DB de Railway y verificar si hay VentaPromociones duplicadas:

```bash
railway run --service backend node -e "
const prisma = require('./src/lib/prisma')
prisma.\$queryRaw\`
  SELECT \"ventaId\", \"promocionId\", COUNT(*)::int as cnt
  FROM ventas_promociones
  GROUP BY \"ventaId\", \"promocionId\"
  HAVING COUNT(*) > 1
\`.then(r => { console.log('Duplicados:', r); prisma.\$disconnect() }).catch(e => { console.error(e.message); prisma.\$disconnect() })
"
```

Expected: array vacío `[]`. Si hay duplicados, eliminarlos antes de continuar (ver Step 1b).

- [ ] **Step 1b: (Solo si hay duplicados) Limpiar duplicados**

Solo ejecutar si el Step 1 devuelve resultados:

```bash
railway run --service backend node -e "
const prisma = require('./src/lib/prisma')
async function limpiar() {
  const dups = await prisma.\$queryRaw\`
    SELECT \"ventaId\", \"promocionId\", MIN(id) as mantener
    FROM ventas_promociones
    GROUP BY \"ventaId\", \"promocionId\"
    HAVING COUNT(*) > 1
  \`
  for (const dup of dups) {
    await prisma.ventaPromocion.deleteMany({
      where: {
        ventaId: dup.ventaId,
        promocionId: dup.promocionId,
        id: { not: dup.mantener }
      }
    })
  }
  console.log('Limpiado:', dups.length, 'grupos')
}
limpiar().finally(() => prisma.\$disconnect())
"
```

- [ ] **Step 2: Agregar unique constraint al schema**

En `backend/prisma/schema.prisma`, en el modelo `VentaPromocion`, agregar `@@unique`:

```prisma
model VentaPromocion {
  id                          Int       @id @default(autoincrement())
  ventaId                     Int
  promocionId                 Int
  gastosNotarialesPagados     Boolean?  @default(false)
  gastosMonto                 Float?

  venta                       Venta     @relation(fields: [ventaId], references: [id])
  promocion                   Promocion @relation(fields: [promocionId], references: [id])
  pagosArriendoAsegurado      PagoArriendoAsegurado[]

  @@unique([ventaId, promocionId])
  @@map("ventas_promociones")
}
```

- [ ] **Step 3: Crear y aplicar migración**

```bash
cd /Users/juana/Documents/bodeparkingcrm/backend
npx prisma migrate dev --name add_unique_venta_promocion
```

Expected output: `Your database is now in sync with your schema.`

- [ ] **Step 4: Verificar**

```bash
cd /Users/juana/Documents/bodeparkingcrm/backend
node -e "
const prisma = require('./src/lib/prisma')
// Intentar crear duplicado debe fallar
async function test() {
  // Obtener cualquier VentaPromocion existente
  const vp = await prisma.ventaPromocion.findFirst()
  if (!vp) { console.log('Sin VentaPromociones para testear'); return }
  try {
    await prisma.ventaPromocion.create({ data: { ventaId: vp.ventaId, promocionId: vp.promocionId } })
    console.log('ERROR: No debería crear duplicado')
  } catch (e) {
    if (e.code === 'P2002') console.log('OK: Constraint funciona, rechazó duplicado')
    else console.log('ERROR inesperado:', e.message)
  }
}
test().finally(() => prisma.\$disconnect())
"
```

- [ ] **Step 5: Commit**

```bash
cd /Users/juana/Documents/bodeparkingcrm
git add backend/prisma/schema.prisma backend/prisma/migrations/
git commit -m "feat: unique constraint ventaId+promocionId en VentaPromocion"
```

---

### Task 5: Schema — cotizacionOrigenId en Venta + controller

**Files:**
- Modify: `backend/prisma/schema.prisma` (modelos Venta y Cotizacion)
- Modify: `backend/src/controllers/ventasController.js:88` (crear)

- [ ] **Step 1: Agregar campos al schema**

En `backend/prisma/schema.prisma`, en el modelo `Venta`, agregar el campo y la relación después de `notas`:

```prisma
model Venta {
  id                    Int         @id @default(autoincrement())
  leadId                Int         @unique
  compradorId           Int
  vendedorId            Int?
  brokerId              Int?
  gerenteId             Int?
  cotizacionOrigenId    Int?
  precioUF              Float
  descuentoUF           Float?      @default(0)
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
  cotizacionOrigen      Cotizacion? @relation(fields: [cotizacionOrigenId], references: [id])
  planPago              PlanPago?
  procesoLegal          ProcesoLegal?
  comisiones            Comision[]
  promociones           VentaPromocion[]
  postventa             Postventa[]

  @@map("ventas")
}
```

En el modelo `Cotizacion`, agregar la relación inversa después de `solicitudesDescuento`:

```prisma
model Cotizacion {
  // ... campos existentes ...
  solicitudesDescuento  SolicitudDescuento[]
  ventaOrigen           Venta?

  @@map("cotizaciones")
}
```

- [ ] **Step 2: Crear y aplicar migración**

```bash
cd /Users/juana/Documents/bodeparkingcrm/backend
npx prisma migrate dev --name add_cotizacion_origen_to_venta
```

Expected: `Your database is now in sync with your schema.`

- [ ] **Step 3: Aceptar cotizacionOrigenId en ventasController**

En `backend/src/controllers/ventasController.js`, función `crear` (línea ~88), cambiar la destructuración del body para incluir `cotizacionOrigenId`:

```js
// ANTES:
const { leadId, unidadId, compradorId, brokerId, precioUF, descuentoUF, fechaReserva, notas } = req.body

// DESPUÉS:
const { leadId, unidadId, compradorId, brokerId, precioUF, descuentoUF, fechaReserva, notas, cotizacionOrigenId } = req.body
```

Y en el `prisma.venta.create`, agregar el campo:

```js
const venta = await prisma.venta.create({
  data: {
    leadId: Number(leadId),
    compradorId: Number(compradorId),
    vendedorId: lead?.vendedorId || null,
    brokerId: brokerId ? Number(brokerId) : lead?.brokerId || null,
    gerenteId: gerenteId || null,
    cotizacionOrigenId: cotizacionOrigenId ? Number(cotizacionOrigenId) : null,
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
```

- [ ] **Step 4: Verificar**

```bash
cd /Users/juana/Documents/bodeparkingcrm/backend
node -e "
const prisma = require('./src/lib/prisma')
prisma.venta.findFirst({
  select: { id: true, cotizacionOrigenId: true, cotizacionOrigen: { select: { id: true, estado: true } } }
}).then(r => console.log('OK, campo existe:', JSON.stringify(r))).catch(e => console.error('ERROR:', e.message)).finally(() => prisma.\$disconnect())
"
```

Expected: JSON con `cotizacionOrigenId: null` (ventas existentes) sin error.

- [ ] **Step 5: Commit**

```bash
cd /Users/juana/Documents/bodeparkingcrm
git add backend/prisma/schema.prisma backend/prisma/migrations/ backend/src/controllers/ventasController.js
git commit -m "feat: campo cotizacionOrigenId en Venta para trazabilidad"
```

---

### Task 6: Deploy

**Files:** ninguno nuevo

- [ ] **Step 1: Push a GitHub**

```bash
cd /Users/juana/Documents/bodeparkingcrm
git push origin main
```

- [ ] **Step 2: Deploy a Railway (aplica migraciones automáticamente)**

```bash
railway up --detach
```

Railway ejecuta `prisma migrate deploy` como parte del build, aplicando las 2 nuevas migraciones.

- [ ] **Step 3: Verificar endpoints en producción**

Abrir el CRM y verificar:
- Página Comisiones carga sin error (ya no 500 por `unidad`)
- Página Pagos / alertas carga sin error
- Aplicar una promoción a una venta → intentar aplicar la misma dos veces → debe rechazar con error claro

---

## Self-Review

**Spec coverage:**
- ✅ Fix #1 `unidad`→`unidades` comisionesController (Task 1)
- ✅ Fix #1 `unidad`→`unidades` pagosController (Task 2)
- ✅ Fix #5 montoUF nulo si CLP (Task 2)
- ✅ Fix #6 validar cuota tiene monto (Task 2)
- ✅ Fix #7 no comisión en venta ANULADA (Task 1)
- ✅ Fix #2 P2002 en aplicarAVenta (Task 3)
- ✅ Fix #2 unique constraint VentaPromocion (Task 4)
- ✅ Fix #8 cotizacionOrigenId (Task 5)
- ✅ Deploy (Task 6)

**Consistencia:** `unidades` (plural) usado consistentemente en Tasks 1 y 2. `cotizacionOrigenId` definido en schema y usado en controller con mismo nombre.
