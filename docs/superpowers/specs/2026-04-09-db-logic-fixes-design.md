# Correcciones Lógica Base de Datos — Design Spec

## Objetivo

Corregir 6 problemas identificados en el schema y controllers del CRM: 2 bugs que rompen endpoints hoy, 3 validaciones de lógica de negocio, y 1 mejora de trazabilidad. Las comisiones permanecen 100% manuales.

## Alcance

### Grupo 1 — Bugs de código (sin migración)

#### Fix #1: `unidad` vs `unidades` en controllers

**Problema:** `comisionesController.js` (función `listar`) y `pagosController.js` (función `cuotasAtrasadas`) usan `select: { unidad: ... }` pero el schema define `Venta.unidades` (array). Prisma lanza error → endpoints devuelven 500.

**Fix:**
- `comisionesController.js` `listar`: cambiar `unidad` → `unidades: { select: { id, numero, tipo, edificio } }`
- `pagosController.js` `cuotasAtrasadas`: cambiar `unidad` → `unidades: { select: { id, numero, tipo, edificio } }`
- En ambos casos, `unidades` es un array — mostrar como está (el frontend ya maneja arrays de unidades).

#### Fix #5: `PlanPago.montoUF` incorrecto cuando cuotas son en CLP

**Problema:** Al crear plan de pago, `montoUF` se calcula como suma de `cuota.montoUF || 0`. Si todas las cuotas tienen solo `montoCLP`, el total queda en `0`.

**Fix:** Calcular `montoUF` solo si hay cuotas con `montoUF > 0`, si no guardar `null`.
```js
const totalUF = cuotas.some(c => c.montoUF)
  ? cuotas.reduce((s, c) => s + (c.montoUF || 0), 0)
  : null
```

#### Fix #6: Cuota sin montos

**Problema:** `Cuota.montoUF` y `Cuota.montoCLP` son ambos nullable. Una cuota puede crearse sin ningún valor monetario.

**Fix:** Validación al crear plan: si una cuota no tiene `montoUF > 0` ni `montoCLP > 0` → 400 `"Cada cuota debe tener montoUF o montoCLP."`.

#### Fix #7: Comisión en venta anulada

**Problema:** Se puede crear una `Comision` para una `Venta` con `estado === 'ANULADO'`.

**Fix:** En `comisionesController.js` `crear`: después de obtener la venta, validar:
```js
if (venta.estado === 'ANULADO') return res.status(400).json({ error: 'No se pueden crear comisiones para ventas anuladas.' })
```

---

### Grupo 2 — Schema + migración

#### Fix #2: Unique constraint en VentaPromocion

**Problema:** La misma promoción puede aplicarse múltiples veces a la misma venta. `VentaPromocion` no tiene `@@unique([ventaId, promocionId])`, a diferencia de `UnidadPromocion` que sí lo tiene.

**Fix:**
1. Verificar duplicados existentes en producción antes de migrar:
   ```sql
   SELECT "ventaId", "promocionId", COUNT(*) FROM ventas_promociones GROUP BY "ventaId", "promocionId" HAVING COUNT(*) > 1;
   ```
2. Si hay duplicados: eliminar los extras (mantener el más reciente).
3. Agregar al schema:
   ```prisma
   @@unique([ventaId, promocionId])
   ```
4. Corregir `aplicarAVenta` controller: manejar error `P2002` → 400 `"Esta promoción ya está aplicada a esta venta."`.

---

### Grupo 3 — Trazabilidad cotización → venta

#### Fix #8: Link cotización origen en Venta

**Problema:** No hay forma directa de saber qué cotización originó una venta. La relación existe indirectamente (Venta → Lead → Cotizaciones) pero si el lead tiene múltiples cotizaciones, no se sabe cuál se usó.

**Fix:**
1. Agregar campo opcional al schema:
   ```prisma
   model Venta {
     cotizacionOrigenId Int?
     cotizacionOrigen   Cotizacion? @relation(fields: [cotizacionOrigenId], references: [id])
   }
   ```
2. Agregar relación inversa en `Cotizacion`:
   ```prisma
   model Cotizacion {
     ventaOrigen Venta?
   }
   ```
3. Al crear una venta (endpoint `POST /api/ventas`): aceptar `cotizacionOrigenId` opcional en el body y guardarlo.
4. Ventas existentes quedan con `cotizacionOrigenId = null` — sin efecto en datos actuales.

---

## Lo que NO cambia

- Lógica de creación de comisiones (100% manual, sin auto-generación)
- Tramos primera/segunda comisión (manual, sin triggers automáticos)
- Estructura de pagos de arriendo
- Frontend (solo cambios en backend y schema)

## Archivos a modificar

| Archivo | Cambio |
|---|---|
| `backend/src/controllers/comisionesController.js` | Fix #1 (unidades), Fix #7 (venta anulada) |
| `backend/src/controllers/pagosController.js` | Fix #1 (unidades), Fix #5 (montoUF), Fix #6 (validación) |
| `backend/src/controllers/promocionesController.js` | Fix #2 (error P2002) |
| `backend/src/controllers/ventasController.js` | Fix #8 (cotizacionOrigenId) |
| `backend/prisma/schema.prisma` | Fix #2 (unique), Fix #8 (FK) |
| `backend/prisma/migrations/...` | Migración para Fix #2 y Fix #8 |
