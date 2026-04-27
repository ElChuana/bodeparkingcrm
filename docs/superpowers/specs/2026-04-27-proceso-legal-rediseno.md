# Spec: Rediseño Proceso Legal

**Fecha:** 2026-04-27  
**Enfoque:** Recrear enum `EstadoLegal` con nuevos pasos, migrar datos existentes, corregir bug de creación.

---

## Contexto

El proceso legal actual tiene 6 pasos (`FIRMA_CLIENTE_PROMESA`, `FIRMA_INMOBILIARIA_PROMESA`, `ESCRITURA_LISTA`, `FIRMADA_NOTARIA`, `INSCRIPCION_CBR`, `ENTREGADO`). El nuevo flujo descompone promesa y escritura en 3 sub-pasos cada uno.

Estado actual en BD: 8 registros en `ESCRITURA_LISTA`, 3 en `FIRMA_CLIENTE_PROMESA`, 3 en `FIRMA_INMOBILIARIA_PROMESA`, 4 en `ENTREGADO`.

---

## Nuevo enum `EstadoLegal`

```
CONFECCION_PROMESA
FIRMA_CLIENTE_PROMESA
FIRMA_INMOBILIARIA_PROMESA
CONFECCION_ESCRITURA
FIRMA_CLIENTE_ESCRITURA
FIRMA_INMOBILIARIA_ESCRITURA
INSCRIPCION_CBR
ENTREGADO
```

---

## Flujos

**Con promesa (8 pasos):**
`CONFECCION_PROMESA` → `FIRMA_CLIENTE_PROMESA` → `FIRMA_INMOBILIARIA_PROMESA` → `CONFECCION_ESCRITURA` → `FIRMA_CLIENTE_ESCRITURA` → `FIRMA_INMOBILIARIA_ESCRITURA` → `INSCRIPCION_CBR` → `ENTREGADO`

**Sin promesa / directo a escritura (5 pasos):**
`CONFECCION_ESCRITURA` → `FIRMA_CLIENTE_ESCRITURA` → `FIRMA_INMOBILIARIA_ESCRITURA` → `INSCRIPCION_CBR` → `ENTREGADO`

---

## Migración de datos (script SQL — Opción C)

Ejecutar en Railway antes de hacer `prisma db push`. El script:
1. Crea enum nuevo `"EstadoLegal_new"` con los 8 valores correctos
2. Actualiza `procesos_legales."estadoActual"`: `ESCRITURA_LISTA` → `CONFECCION_ESCRITURA`, `FIRMADA_NOTARIA` → `FIRMA_CLIENTE_ESCRITURA`
3. Actualiza `documentos_legales."etapa"` con mismo mapeo
4. Altera columnas para usar el nuevo tipo
5. Borra enum viejo, renombra nuevo

---

## Cambios en `ProcesoLegal` (schema)

Añadir 2 campos nuevos:
- `fechaLimiteConfeccionPromesa DateTime?`
- `fechaLimiteFirmaInmobEscritura DateTime?`

Mapeo completo campo → paso:

| Campo BD | Paso |
|---|---|
| `fechaLimiteConfeccionPromesa` | `CONFECCION_PROMESA` |
| `fechaLimiteFirmaCliente` | `FIRMA_CLIENTE_PROMESA` |
| `fechaLimiteFirmaInmob` | `FIRMA_INMOBILIARIA_PROMESA` |
| `fechaLimiteEscritura` | `CONFECCION_ESCRITURA` |
| `fechaLimiteFirmaNot` | `FIRMA_CLIENTE_ESCRITURA` |
| `fechaLimiteFirmaInmobEscritura` | `FIRMA_INMOBILIARIA_ESCRITURA` |
| `fechaLimiteCBR` | `INSCRIPCION_CBR` |
| `fechaLimiteEntrega` | `ENTREGADO` |

---

## Fix bug creación de venta

En `cotizacionesController.js`, `procesoLegal.create` siempre usa `tienePromesa: false` y `estadoActual: 'ESCRITURA_LISTA'` ignorando el campo `conPromesa` recibido.

**Fix:**
```js
tienePromesa: Boolean(conPromesa),
estadoActual: conPromesa ? 'CONFECCION_PROMESA' : 'CONFECCION_ESCRITURA',
```
Y eliminar las fechas hardcodeadas con `hoy` que no tienen sentido al momento de crear.

---

## Labels en frontend

```js
CONFECCION_PROMESA:           'Confección promesa'
FIRMA_CLIENTE_PROMESA:        'Firma cliente'
FIRMA_INMOBILIARIA_PROMESA:   'Firma inmobiliaria'
CONFECCION_ESCRITURA:         'Confección escritura'
FIRMA_CLIENTE_ESCRITURA:      'Firma cliente'
FIRMA_INMOBILIARIA_ESCRITURA: 'Firma inmobiliaria'
INSCRIPCION_CBR:              'CBR'
ENTREGADO:                    'Entregado'
```

---

## Archivos afectados

| Archivo | Cambio |
|---|---|
| `scripts/migrar-enum-legal.sql` (nuevo) | Script SQL migración enum |
| `backend/prisma/schema.prisma` | Enum + 2 campos nuevos |
| `backend/src/controllers/legalController.js` | PASOS arrays actualizados |
| `backend/src/controllers/cotizacionesController.js` | Fix bug tienePromesa + estadoActual |
| `backend/src/controllers/dashboardController.js` | PASOS arrays actualizados |
| `frontend/src/pages/ventas/Legal.jsx` | Labels + PASOS + FECHA_POR_PASO |
| `frontend/src/pages/ventas/VentaDetalle.jsx` | Labels + PASOS + FECHA_POR_PASO + form fechas |

---

## Orden de ejecución

1. Ejecutar `scripts/migrar-enum-legal.sql` en Railway
2. Actualizar `schema.prisma` + `prisma db push`
3. Actualizar backend (controllers)
4. Actualizar frontend
5. `git commit` + `git push origin main`
