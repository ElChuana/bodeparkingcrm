# Conversión UF/CLP en Plan de Pago — Design Spec

## Objetivo

En el modal de creación de plan de pago (`ModalPlanPago`), permitir que al ingresar un monto en UF o CLP se calcule automáticamente el equivalente en la otra moneda, usando el valor de la UF del día específico de vencimiento de esa cuota. Además, formatear todos los campos numéricos con notación chilena (`1.000,00`).

---

## Alcance

### Cambio 1 — Backend: endpoint UF por fecha

**Archivo:** `backend/src/controllers/ufController.js`

Extender `obtenerUF` para aceptar query param `?fecha=YYYY-MM-DD`:

- Si `fecha` está presente:
  - Buscar en `UFDiaria` donde `fecha` coincide (±rango del día, igual que hoy)
  - Si está en cache → retornar
  - Si no → consultar `https://mindicador.cl/api/uf/DD-MM-YYYY` (formato DD-MM-YYYY)
  - Guardar en cache `UFDiaria` y retornar
- Si no hay `fecha` → comportamiento actual (UF de hoy)

La respuesta siempre tiene la forma: `{ fecha, valorPesos, fuente }`.

**Archivo:** `backend/src/routes/uf.js` (o donde estén las rutas) — no requiere nueva ruta, solo el query param en la existente `GET /api/uf`.

---

### Cambio 2 — Frontend: hook `useUFPorFecha`

**Archivo nuevo:** `frontend/src/hooks/useUFPorFecha.js`

```js
// Retorna { valorUF: number|null, isLoading: boolean }
// fecha: string 'YYYY-MM-DD' o null/undefined
// Si fecha es null, retorna { valorUF: null, isLoading: false }
useUFPorFecha(fecha)
```

Usa React Query con key `['uf', fecha]`. `staleTime: 1000 * 60 * 60 * 24` (1 día — el valor de una UF histórica no cambia). Solo hace fetch si `fecha` es un string válido de 10 caracteres.

**Fallback para fechas futuras o sin datos:** Si el fetch falla o la API no tiene datos para esa fecha (fechas muy futuras), el hook retorna `{ valorUF: null }` y el campo derivado no se auto-calcula — ambos campos quedan editables de forma independiente sin conversión.

---

### Cambio 3 — Frontend: lógica de conversión en `ModalPlanPago`

**Archivo:** `frontend/src/pages/ventas/VentaDetalle.jsx` — función `ModalPlanPago`

#### Estado por cuota

Agregar campo `_ultimoEditado: 'uf' | 'clp' | null` al objeto de cada cuota (campo interno, no se envía al backend).

#### Handlers de conversión

Cuando el usuario edita `montoUF` en la cuota `i`:
1. Actualizar `cuotas[i].montoUF` y `_ultimoEditado = 'uf'`
2. Si `cuotas[i].fechaVencimiento` está set y `valorUF` disponible para esa fecha:
   - `montoCLP = round(montoUF × valorUF)`
3. Si no hay fecha → dejar `montoCLP` sin cambio

Cuando el usuario edita `montoCLP` en la cuota `i`:
1. Actualizar `cuotas[i].montoCLP` y `_ultimoEditado = 'clp'`
2. Si fecha set y `valorUF` disponible:
   - `montoUF = round(montoCLP / valorUF, 4)` (4 decimales para UF)
3. Si no hay fecha → dejar `montoUF` sin cambio

Cuando el usuario edita `fechaVencimiento` en la cuota `i`:
1. Actualizar `cuotas[i].fechaVencimiento`
2. Cuando el valor de UF para esa fecha llegue (via React Query), si `_ultimoEditado === 'uf'` y `montoUF > 0` → recalcular `montoCLP`. Si `_ultimoEditado === 'clp'` y `montoCLP > 0` → recalcular `montoUF`.

#### Indicador visual del campo derivado

El campo que fue auto-calculado (no el que el usuario escribió) se muestra con `background: '#f0f4f8'` en el `InputNumber` para indicar que es derivado. Si el usuario edita ese campo, pasa a ser el "activo" y el otro se vuelve derivado.

#### Fetch de UF por cuota

Para N cuotas con potencialmente N fechas distintas, cada fila llama a `useUFPorFecha(c.fechaVencimiento)`. React Query deduplica peticiones para la misma fecha automáticamente. Como `ModalPlanPago` es un componente hijo, esto es limpio.

**Nota:** El campo `_ultimoEditado` no se incluye en el payload que se envía a `POST /api/pagos/plan`. El backend solo recibe `{ ventaId, cuotas: [{ tipo, montoUF, montoCLP, fechaVencimiento }] }`.

---

### Cambio 4 — Frontend: formato numérico `1.000,00`

**Archivo:** `frontend/src/pages/ventas/VentaDetalle.jsx` — `ModalPlanPago`

Reemplazar `<Input type="number">` por `<InputNumber>` de Ant Design para los campos `montoUF` y `montoCLP`:

```jsx
// formatter para InputNumber
const fmtCLP = (v) => v != null ? Math.round(v).toLocaleString('es-CL') : ''
const parseCLP = (v) => Number(v?.replace(/\./g, '').replace(',', '.')) || 0

const fmtUF = (v) => v != null ? Number(v).toLocaleString('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 4 }) : ''
const parseUF = (v) => parseFloat(v?.replace(/\./g, '').replace(',', '.')) || 0
```

- `montoUF`: min=0, step=0.01, formato UF (`1.000,0000`)
- `montoCLP`: min=0, step=1000, formato pesos (`1.000.000`)

---

## Archivos a modificar

| Archivo | Cambio |
|---|---|
| `backend/src/controllers/ufController.js` | Aceptar `?fecha` en `obtenerUF` |
| `frontend/src/hooks/useUFPorFecha.js` | Nuevo hook (crear) |
| `frontend/src/pages/ventas/VentaDetalle.jsx` | Conversión + formato en `ModalPlanPago` |

---

## Lo que NO cambia

- La estructura de datos enviada al backend (`montoUF`, `montoCLP` como numbers)
- El resto de `VentaDetalle.jsx` fuera de `ModalPlanPago`
- La vista de cuotas existentes (solo el formulario de creación)
- `Pagos.jsx` (página de pagos atrasados)
