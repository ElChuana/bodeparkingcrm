# Rediseño Cotización → Venta — Design Spec

**Fecha:** 2026-04-20  
**Estado:** Aprobado por usuario

---

## Objetivo

Rediseñar el flujo de cotización → venta para reflejar el modelo real del negocio:
- Una cotización **siempre** precede a una venta (no existe venta sin cotización)
- Un lead puede tener múltiples ventas (una por cotización convertida)
- Los **packs** afectan el precio y se calculan server-side
- Los **beneficios** son no-monetarios y se registran para seguimiento
- Los descuentos requieren **aprobación del gerente** y se aplican a la venta completa
- La conversión cotización → venta es **atómica y automática** (sin formulario de precio)

---

## Contexto: Qué se elimina

Las ventas existentes se borran antes de la implementación (respaldadas en Excel por el usuario).

### Modelos eliminados del schema
- `Promocion` — reemplazado por `Pack` y `Beneficio` separados
- `UnidadPromocion` — reemplazado por `UnidadPack` y `UnidadBeneficio`
- `VentaPromocion` — reemplazado por `VentaBeneficio`
- `CotizacionPromocion` — reemplazado por `CotizacionPack` y `CotizacionBeneficio`
- `PagoArriendoAsegurado` — eliminado (el seguimiento de arriendo asegurado pasa a `VentaBeneficio.estado`)
- `TipoPromocion` enum — reemplazado por `TipoPack` y `TipoBeneficio`
- `CategoriaPromocion` enum — eliminado

### Campos eliminados
- `CotizacionItem.descuentoUF` — los descuentos no son por ítem
- `Venta.precioUF` (renombrado/reemplazado por desglose explícito)
- `Venta.descuentoUF` (ambiguo, reemplazado por `descuentoPacksUF` + `descuentoAprobadoUF`)

---

## Modelo de Datos

### Pack (nuevo modelo)

Representa una promoción de precio: combo de unidades específicas o descuento por cantidad.

```prisma
enum TipoPack {
  COMBO_ESPECIFICO   // Unidades específicas juntas tienen descuento
  POR_CANTIDAD       // Compra N o más unidades → descuento
}

model Pack {
  id            Int       @id @default(autoincrement())
  nombre        String
  descripcion   String?
  tipo          TipoPack
  descuentoUF   Float                    // Monto fijo en UF que descuenta
  minUnidades   Int       @default(2)    // Para POR_CANTIDAD
  fechaInicio   DateTime?
  fechaFin      DateTime?
  activa        Boolean   @default(true)
  creadoEn      DateTime  @default(now())

  unidades      UnidadPack[]
  cotizaciones  CotizacionPack[]

  @@map("packs")
}

model UnidadPack {
  unidadId  Int
  packId    Int
  unidad    Unidad @relation(fields: [unidadId], references: [id])
  pack      Pack   @relation(fields: [packId], references: [id])

  @@id([unidadId, packId])
  @@map("unidades_packs")
}
```

**Reglas de negocio:**
- `COMBO_ESPECIFICO`: el pack aplica solo si TODAS las unidades del pack están en la cotización
- `POR_CANTIDAD`: el pack aplica si la cotización tiene `>= minUnidades` unidades en total
- Un pack solo puede aplicarse una vez por cotización
- El `descuentoUF` es fijo (no porcentaje) para mantener simplicidad

### Beneficio (nuevo modelo)

Representa una ventaja no monetaria que no afecta el precio de venta.

```prisma
enum TipoBeneficio {
  ARRIENDO_ASEGURADO
  GASTOS_NOTARIALES
  CUOTAS_SIN_INTERES
  OTRO
}

model Beneficio {
  id               Int            @id @default(autoincrement())
  nombre           String
  descripcion      String?
  tipo             TipoBeneficio
  meses            Int?           // Para ARRIENDO_ASEGURADO
  montoMensualUF   Float?         // Para ARRIENDO_ASEGURADO
  detalle          String?        // Texto libre para OTRO
  fechaInicio      DateTime?
  fechaFin         DateTime?
  activa           Boolean        @default(true)
  creadoEn         DateTime       @default(now())

  unidades         UnidadBeneficio[]
  cotizaciones     CotizacionBeneficio[]
  ventas           VentaBeneficio[]

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
```

### CotizacionItem (simplificado)

Se elimina `descuentoUF` del ítem — los descuentos van a nivel de venta completa.

```prisma
model CotizacionItem {
  id             Int        @id @default(autoincrement())
  cotizacionId   Int
  unidadId       Int
  precioListaUF  Float      // Copia del precio de lista al momento de cotizar

  cotizacion     Cotizacion @relation(fields: [cotizacionId], references: [id], onDelete: Cascade)
  unidad         Unidad     @relation(fields: [unidadId], references: [id])

  @@map("cotizacion_items")
}
```

### CotizacionPack y CotizacionBeneficio (tablas de unión)

```prisma
model CotizacionPack {
  id                   Int        @id @default(autoincrement())
  cotizacionId         Int
  packId               Int
  descuentoAplicadoUF  Float      // Calculado server-side al aplicar el pack

  cotizacion           Cotizacion @relation(fields: [cotizacionId], references: [id], onDelete: Cascade)
  pack                 Pack       @relation(fields: [packId], references: [id])

  @@unique([cotizacionId, packId])
  @@map("cotizacion_packs")
}

model CotizacionBeneficio {
  cotizacionId  Int
  beneficioId   Int

  cotizacion    Cotizacion @relation(fields: [cotizacionId], references: [id], onDelete: Cascade)
  beneficio     Beneficio  @relation(fields: [beneficioId], references: [id])

  @@id([cotizacionId, beneficioId])
  @@map("cotizacion_beneficios")
}
```

### Cotizacion (modificada)

```prisma
model Cotizacion {
  id                    Int       @id @default(autoincrement())
  leadId                Int
  creadoPorId           Int
  estado                EstadoCotizacion @default(BORRADOR)
  validezDias           Int       @default(30)
  descuentoAprobadoUF   Float     @default(0)  // Acumulado de solicitudes aprobadas
  notas                 String?
  creadoEn              DateTime  @default(now())
  actualizadoEn         DateTime  @updatedAt

  lead                  Lead               @relation(...)
  creadoPor             Usuario            @relation(...)
  items                 CotizacionItem[]
  packs                 CotizacionPack[]
  beneficios            CotizacionBeneficio[]
  solicitudesDescuento  SolicitudDescuento[]
  ventaOrigen           Venta?             // Reverse de cotizacionOrigenId

  @@map("cotizaciones")
}
```

**Campos calculados (no almacenados, calculados en el servidor al responder):**
- `precioListaUF` = SUM(items.precioListaUF)
- `descuentoPacksUF` = SUM(packs.descuentoAplicadoUF)
- `precioFinalUF` = precioListaUF − descuentoPacksUF − descuentoAprobadoUF

### Venta (modificada)

```prisma
model Venta {
  id                    Int       @id @default(autoincrement())
  leadId                Int
  cotizacionOrigenId    Int       @unique   // REQUERIDO — 1 cotización = 1 venta
  compradorId           Int
  vendedorId            Int?
  brokerId              Int?
  gerenteId             Int?

  // Desglose de precio (copiado de la cotización al convertir)
  precioListaUF         Float     // Suma de precios de lista de las unidades
  descuentoPacksUF      Float     @default(0)  // Suma de descuentos de packs
  descuentoAprobadoUF   Float     @default(0)  // Descuento aprobado por gerente
  precioFinalUF         Float     // = precioListaUF − descuentoPacksUF − descuentoAprobadoUF

  estado                EstadoVenta @default(RESERVA)
  fechaReserva          DateTime?
  fechaPromesa          DateTime?
  fechaEscritura        DateTime?
  fechaEntrega          DateTime?
  notas                 String?
  creadoEn              DateTime  @default(now())

  lead                  Lead            @relation(...)
  cotizacionOrigen      Cotizacion      @relation(...)
  comprador             Contacto        @relation(...)
  vendedor              Usuario?        @relation(...)
  broker                Contacto?       @relation(...)
  gerente               Usuario?        @relation(...)
  unidades              Unidad[]        // Via ventaId en Unidad
  beneficios            VentaBeneficio[]
  planPago              PlanPago?
  procesoLegal          ProcesoLegal?
  comisiones            Comision[]
  postventa             Postventa[]

  @@map("ventas")
}
```

### VentaBeneficio (tabla de unión con seguimiento)

```prisma
enum EstadoBeneficio {
  PENDIENTE
  EN_CURSO
  COMPLETADO
  CANCELADO
}

model VentaBeneficio {
  id          Int              @id @default(autoincrement())
  ventaId     Int
  beneficioId Int
  estado      EstadoBeneficio  @default(PENDIENTE)
  notas       String?
  creadoEn    DateTime         @default(now())

  venta       Venta     @relation(fields: [ventaId], references: [id])
  beneficio   Beneficio @relation(fields: [beneficioId], references: [id])

  @@unique([ventaId, beneficioId])
  @@map("ventas_beneficios")
}
```

---

## API

### Nuevos controladores

#### `packsController.js`
- `GET /api/packs` — listar packs activos (con unidades para COMBO_ESPECIFICO)
- `POST /api/packs` — crear pack (GERENTE/JEFE_VENTAS)
- `PUT /api/packs/:id` — editar pack
- `DELETE /api/packs/:id` — desactivar pack

#### `beneficiosController.js`
- `GET /api/beneficios` — listar beneficios activos
- `POST /api/beneficios` — crear beneficio (GERENTE/JEFE_VENTAS)
- `PUT /api/beneficios/:id` — editar beneficio
- `DELETE /api/beneficios/:id` — desactivar beneficio

### `cotizacionesController.js` — cambios

#### Endpoint nuevo: `POST /api/cotizaciones/:id/convertir`

Convierte una cotización aprobada en venta de forma atómica.

**Validaciones:**
1. La cotización existe y pertenece al usuario autenticado (o es GERENTE)
2. Estado no es `RECHAZADA`
3. No tiene ya una venta asociada (`ventaOrigen === null`)
4. Tiene al menos un ítem
5. Todas las unidades de los ítems siguen en estado `DISPONIBLE`

**Proceso (en transacción):**
1. Calcular `precioListaUF` = SUM(items.precioListaUF)
2. Calcular `descuentoPacksUF` = SUM(packs.descuentoAplicadoUF)
3. Calcular `precioFinalUF` = precioListaUF − descuentoPacksUF − cotizacion.descuentoAprobadoUF
4. Crear `Venta` con el desglose completo y `cotizacionOrigenId`
5. Para cada ítem: `Unidad.update({ ventaId, estado: RESERVADO })`
6. Para cada beneficio de la cotización: crear `VentaBeneficio`
7. Actualizar cotización: `estado = ACEPTADA`
8. Actualizar lead: `etapa = RESERVA`
9. Crear `ProcesoLegal` con `tienePromesa = false`, `estadoActual = ESCRITURA_LISTA`
10. Llamar a `calcularComisiones(venta)`

**Respuesta:** La venta creada con todas sus relaciones.

#### Endpoint nuevo: `POST /api/cotizaciones/:id/packs`
Agregar un pack a la cotización. El servidor calcula y almacena `descuentoAplicadoUF`.

**Lógica de cálculo:**
- `COMBO_ESPECIFICO`: verificar que todas las unidades del pack estén en los ítems de la cotización. Si no, rechazar con 400.
- `POR_CANTIDAD`: verificar que `items.length >= pack.minUnidades`. Si no, rechazar con 400.
- `descuentoAplicadoUF` = `pack.descuentoUF`

#### Endpoint nuevo: `DELETE /api/cotizaciones/:id/packs/:packId`
Quitar un pack de la cotización.

#### Endpoint nuevo: `POST /api/cotizaciones/:id/beneficios`
Agregar un beneficio a la cotización.

#### Endpoint nuevo: `DELETE /api/cotizaciones/:id/beneficios/:beneficioId`
Quitar un beneficio de la cotización.

### `ventasController.js` — cambios

- Eliminar el endpoint `POST /api/ventas` (la creación de ventas solo ocurre via `/cotizaciones/:id/convertir`)
- Mantener: `GET /api/ventas`, `GET /api/ventas/:id`, `PUT /api/ventas/:id/estado`
- Actualizar los `select`/`include` para reflejar el nuevo schema (beneficios en lugar de promociones)

### `promocionesController.js`

Eliminar completamente. Reemplazado por `packsController` y `beneficiosController`.

---

## Frontend

### `CotizacionEditor.jsx` — cambios

1. **Eliminar** el modal "Convertir a Venta" con formulario de precio
2. **Agregar** sección "Packs disponibles":
   - Lista los packs activos compatibles con los ítems actuales
   - Botón para agregar/quitar cada pack
   - El precio se recalcula automáticamente al agregar/quitar
3. **Agregar** sección "Beneficios disponibles":
   - Lista los beneficios activos
   - Botón para agregar/quitar cada beneficio
4. **Agregar** desglose de precio visible siempre:
   ```
   Precio de lista:     150.00 UF
   − Descuento packs:   −15.00 UF
   − Desc. aprobado:     −5.00 UF
   = Precio final:      130.00 UF
   ```
5. **Simplificar** botón "Convertir a Venta" → un botón directo sin formulario, llama a `POST /cotizaciones/:id/convertir`, muestra confirmación

### Nueva página: `PacksBeneficios.jsx` (GERENTE / JEFE_VENTAS)

- Tabs: Packs | Beneficios
- CRUD para cada uno
- Para packs `COMBO_ESPECIFICO`: selector de unidades específicas
- Ruta: `/configuracion/packs-beneficios`

### `VentaDetalle.jsx` — cambios

- Mostrar desglose de precio: lista / packs / descuento aprobado / **precio final**
- Mostrar beneficios con su `EstadoBeneficio` y opción de actualizar estado
- Mostrar link a cotización de origen

### `LeadDetalle.jsx` — sin cambios

Ya muestra `lead.ventas[]` correctamente.

---

## Migraciones

### Orden de operaciones

1. **Borrar ventas existentes** en Railway (el usuario tiene respaldo en Excel)
2. Crear y aplicar migración: eliminar tablas/columnas old (`promociones`, etc.)
3. Crear y aplicar migración: crear tablas new (`packs`, `beneficios`, etc.)
4. Modificar columnas en `ventas` (renombrar `precioUF`/`descuentoUF` → desglose)
5. Modificar `cotizacion_items` (eliminar `descuentoUF`)

### Script de limpieza (ejecutar antes de migrar)

Los nombres de tabla reales se deben verificar con `\dt` en psql antes de ejecutar. Basado en los `@@map()` del schema actual:

```sql
-- Ejecutar en Railway antes de las migraciones
-- Verificar nombres reales con: SELECT tablename FROM pg_tables WHERE schemaname='public';
DELETE FROM "VentaPromocion";     -- o el nombre real del @@map
DELETE FROM "CotizacionPromocion";
DELETE FROM "PagoArriendoAsegurado";
DELETE FROM "ventas";
DELETE FROM "Promocion";
```

> El plan de implementación debe obtener los nombres reales antes de ejecutar este script.

---

## Lo que NO cambia

- `Dashboard` — sin cambios
- `LeadDetalle` — sin cambios significativos
- `ProcesoLegal` — sin cambios
- `PlanPago` / `Cuota` — sin cambios
- `Comisiones` — lógica de cálculo sin cambios
- `SolicitudDescuento` — flujo de aprobación sin cambios
- `Contacto`, `Edificio`, `Unidad` — sin cambios
- `Usuario`, `autenticación` — sin cambios

---

## Reglas de Negocio Clave

1. **No existe venta sin cotización** — `cotizacionOrigenId` es requerido en Venta
2. **1 cotización = máximo 1 venta** — `cotizacionOrigenId` es `@unique` en Venta
3. **1 lead puede tener N ventas** — una por cotización convertida
4. **Descuentos solo vía gerente** — la única forma de reducir `descuentoAprobadoUF` es a través de `SolicitudDescuento` aprobada
5. **Precio calculado server-side** — el frontend nunca envía precios, solo muestra lo que calcula el servidor
6. **Packs calculados server-side** — `descuentoAplicadoUF` en `CotizacionPack` lo escribe el servidor al agregar el pack
7. **Conversión es irreversible** — una vez convertida, la cotización queda en estado ACEPTADA permanentemente
