# Comisiones con Hitos — Design Spec

## Objetivo

Rediseñar el sistema de comisiones para soportar pagos en hitos (promesa / escritura), plantillas predefinidas por GERENTE, y notificación automática al llegar a escritura. Mantiene la estructura existente `montoPrimera`/`montoSegunda` del modelo `Comision`.

---

## Schema Changes

### Nuevo modelo: `PlantillaComision`

```prisma
model PlantillaComision {
  id           Int      @id @default(autoincrement())
  nombre       String                    // "Broker Estándar", "Vendedor Senior"
  concepto     String                    // texto libre: "BROKER", "VENDEDOR INTERNO", etc.
  porcentaje   Float?                    // % del precioFinalUF (ej: 8.0)
  montoFijo    Float?                    // alternativa: monto fijo en UF
  pctPromesa   Float    @default(50)     // % del total cobrado en promesa
  pctEscritura Float    @default(50)     // % del total cobrado en escritura
  activa       Boolean  @default(true)
  creadoEn     DateTime @default(now())

  @@map("plantillas_comision")
}
```

Validación: `porcentaje` XOR `montoFijo` — uno de los dos debe estar presente, no ambos ni ninguno.
Validación: `pctPromesa + pctEscritura === 100`.

### Cambio en modelo `Venta`

Agregar campo:

```prisma
conPromesa  Boolean  @default(true)
```

Este campo se fija al crear la venta y no cambia. Si es `false`, la venta va directo a escritura sin etapa de promesa.

### Sin cambios en `Comision`

Los campos `montoPrimera` / `montoSegunda` ya representan los hitos. El cálculo se hace al crear/editar:
- `conPromesa=true`: `montoPrimera = totalUF * pctPromesa/100`, `montoSegunda = totalUF * pctEscritura/100`
- `conPromesa=false`: `montoPrimera = 0`, `montoSegunda = totalUF` (100% en escritura)

---

## Backend

### Nuevo: `plantillasComisionController.js`

Funciones: `listar`, `crear`, `actualizar`, `eliminar`

Permisos: solo `GERENTE`.

### Rutas: `/api/plantillas-comision`

```
GET    /api/plantillas-comision          → listar (GERENTE)
POST   /api/plantillas-comision          → crear (GERENTE)
PUT    /api/plantillas-comision/:id      → actualizar (GERENTE)
DELETE /api/plantillas-comision/:id      → eliminar (GERENTE)
```

### Cambio en `comisionesController.js`

**Permisos tightening:**
- `crear`, `actualizar`, `eliminar`: de `GERENTE | JEFE_VENTAS` → solo `GERENTE`
- `listar`, `obtener`: sin cambio (GERENTE + JEFE_VENTAS)

**Cambio en `crear`:**
- Recibe `plantillaId?` opcional. Si viene, pre-calcula `montoPrimera`/`montoSegunda` según `conPromesa` de la venta.
- `montoCalculadoUF` se recalcula igual que hoy (porcentaje * precioFinalUF).

### Cambio en `ventasController.js` — `actualizarEstado`

Cuando `estado === 'ESCRITURA'`:
1. Buscar comisiones de la venta con `estadoSegunda = 'PENDIENTE'` (o cualquier estado activo)
2. Si existen, crear `Notificacion` para todos los usuarios con rol `GERENTE` y `JEFE_VENTAS`:
   - `tipo: 'COMISION_ESCRITURA'`
   - `mensaje: 'Venta #X llegó a escritura. Revisar comisiones pendientes.'`
   - `ventaId`: el id de la venta

### Cambio en creación de venta

Al crear venta (endpoint existente), aceptar campo `conPromesa: Boolean` en el body y guardarlo.

---

## Frontend

### 1. Modal de creación de venta — nuevo campo

Agregar selector "¿Esta venta tiene promesa?" (radio/toggle: Sí / No) antes de confirmar.
Campo `conPromesa` enviado al backend.

### 2. Badge en `VentaDetalle`

Mostrar pill cerca del título: **"Con promesa"** (azul) o **"Directo a escritura"** (naranja).

### 3. `ModalComision` en `VentaDetalle` — selector de plantilla

- Dropdown "Aplicar plantilla" al inicio del modal
- Al seleccionar plantilla: auto-rellena concepto, porcentaje/montoFijo, y calcula montoPrimera/montoSegunda según `venta.conPromesa`
- Los campos siguen siendo editables manualmente después de aplicar
- Si `conPromesa=false`: campo `montoPrimera` deshabilitado y en 0; tooltip "Directo a escritura"

### 4. Nueva sección: Gestión de Plantillas

Ubicación: dentro de la página `/comisiones` (nuevo tab "Plantillas") o en la página de configuración de GERENTE.

Opción: tab "Plantillas" en `/comisiones` — solo visible para GERENTE.

UI:
- Tabla de plantillas: nombre, concepto, %, split promesa/escritura, activa
- Botón "Nueva plantilla" → modal con formulario
- Botón editar / eliminar por fila

### 5. Permisos UI

- Botones "Editar comisión" / "Eliminar comisión" en VentaDetalle: solo visible para GERENTE
- Tab "Plantillas": solo visible para GERENTE

---

## Notificaciones

Tipo nuevo: `COMISION_ESCRITURA`

Se crea en `actualizarEstado` al llegar a ESCRITURA. No bloquea el flujo — es informativa.

---

## Seed data

Agregar 3 plantillas de ejemplo (inactivas en producción, activas en dev):
- Broker Estándar: 2%, 50/50
- Vendedor Senior: 1%, 50/50
- Directo sin promesa: 1.5%, 0/100

---

## Out of scope

- Pago real / integración bancaria
- Más de 2 hitos por comisión
- Historial de cambios de estado de comisión
