# Diseño: Venta Multi-Unidad + Proceso Legal

**Fecha:** 2026-04-08

## Problema

El schema actual modela `Venta` con un solo `unidadId`. La realidad del negocio es:
- Una venta puede incluir múltiples unidades (ej. cliente compra 2 bodegas el mismo día)
- Una venta tiene un solo ProcesoLegal
- Una unidad pertenece a máximo una venta activa

## Cambio de Schema

### Antes
```prisma
model Venta {
  unidadId Int
  unidad   Unidad @relation(...)
}
```

### Después
```prisma
model Venta {
  // sin unidadId
  unidades Unidad[]
}

model Unidad {
  ventaId Int?
  venta   Venta? @relation(fields: [ventaId], references: [id])
}
```

`ProcesoLegal` no cambia — sigue siendo 1:1 con Venta.

## Migración de Datos (26 ventas existentes en producción)

### Grupos a fusionar (mismo cliente + misma fechaReserva):

| Cliente | Fecha | Unidades |
|---------|-------|----------|
| SARA LINARES | 31/07/2025 | Plus B251, Plus B56 |
| GEMENES RODRIGUEZ | 11/09/2025 | Trinitarias 27, 26, 15 |
| ANTONIO OTONEL | 18/12/2025 | Trinitarias 20, 11 |
| GERMAN NAVARRETE | 05/02/2026 | Trinitarias 33, 32 |
| CYNTHIA OTEIZA | 13/02/2026 | Trinitarias 35, 34 |
| CLAUDIA SUAREZ | 27/02/2026 | Aldunate 48, 57 |

Para cada grupo:
1. Mantener la venta con ID más bajo como venta principal
2. Mover unidades de ventas secundarias a la venta principal (ventaId)
3. Eliminar ProcesoLegal de ventas secundarias
4. Eliminar ventas secundarias
5. Actualizar ProcesoLegal de venta principal con datos del spreadsheet

### Actualización ProcesoLegal (todas las ventas)

Columnas del spreadsheet mapeadas a pasos legales:
- Col promesa: fecha / "No promeso" / "X" → `tienePromesa`
- Col firma cliente: SI → completado
- Col escritura: SI → completado
- Col firmada notaría: SI → completado
- Col CBR: SI → completado
- Col entregado: SI → completado

`estadoActual` = último paso con SI. Si todo SI → `ENTREGADO`.

## Cambios en Backend

1. **Prisma schema**: quitar `unidadId` de Venta, agregar `ventaId?` a Unidad
2. **Migration**: `npx prisma migrate dev`
3. **ventasController**: actualizar queries que usan `unidad: { edificio }` → `unidades: { include: { edificio } }`
4. **Script migración datos**: fusionar grupos + actualizar ProcesoLegal en Railway via SSH

## Cambios en Frontend

- `VentaDetalle`: mostrar lista de unidades en vez de una
- `Ventas` (tabla): mostrar unidades como lista o "N unidades"

## Fuera de Scope

- Cambiar flujo de creación de venta en UI (se aborda por separado)
- PlanPago multi-unidad
