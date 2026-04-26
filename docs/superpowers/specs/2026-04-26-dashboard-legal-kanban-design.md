# Spec: Dashboard Legal — Vista Kanban por Etapa

**Fecha:** 2026-04-26
**Estado:** Aprobado

---

## Objetivo

Reemplazar el widget `LegalWidget` del dashboard por un kanban horizontal que muestre las ventas activas agrupadas por etapa legal, con flechas entre columnas, conteo por etapa, cards de ventas con 4 líneas de info, y borde de urgencia por fecha límite. La columna "Entregado" es clickeable y lleva a `/ventas?estado=ENTREGADO`.

---

## Diseño

### Estructura visual

Kanban horizontal con 6 columnas (pasos del proceso legal):

```
[Firma Cliente] → [Firma Inmob.] → [Escritura] → [Notaría] → [CBR] → [Entregado]
     3                  2               1             0           2          5 →link
```

Cada columna tiene:
- **Header** coloreado con nombre del paso y conteo de ventas
- **Columna** con fondo tenue del mismo color, llenada con cards de ventas
- Si no hay ventas: texto "Sin ventas" centrado

### Cards de venta

Cada card muestra 4 líneas:
1. Nombre comprador (negrita, 11px)
2. Edificio · Unidad (secundario, 10px)
3. Fecha límite del paso actual — coloreada por urgencia (10px, bold)
4. Nombre vendedor (gris, 9px)

**Borde izquierdo de la card** indica urgencia:
- 🔴 Rojo (`#ef4444`): fecha vencida
- 🟠 Naranja (`#f59e0b`): vence en ≤7 días
- 🔵 Azul (`#3b82f6`): ok o sin fecha

Cards son clickeables → navegan a `/ventas/{id}`.

### Columna Entregado

- Header clickeable → `navigate('/ventas?estado=ENTREGADO')`
- Cuerpo muestra "✓ N completados" (no lista las ventas individuales)
- Cursor pointer en header

### Leyenda

Debajo del kanban: tres chips de color (Vencido / Vence <7d / OK).

---

## Datos

El widget usa `ventasActivas` que ya llega desde el endpoint `/dashboard` — incluye todas las ventas en RESERVA, PROMESA, ESCRITURA, ENTREGADO con `procesoLegal` y `unidades`.

Para agrupar por etapa legal se usa `v.procesoLegal?.estadoActual`. Ventas sin `procesoLegal` van a una columna "Sin proceso" implícita (no se muestran en el kanban, se ignoran).

Pasos con promesa: `['FIRMA_CLIENTE_PROMESA','FIRMA_INMOBILIARIA_PROMESA','ESCRITURA_LISTA','FIRMADA_NOTARIA','INSCRIPCION_CBR','ENTREGADO']`
Pasos sin promesa: `['ESCRITURA_LISTA','FIRMADA_NOTARIA','INSCRIPCION_CBR','ENTREGADO']`

Para el kanban se unifican ambos caminos mostrando siempre las 6 columnas: si una venta sin promesa llega a `ESCRITURA_LISTA`, cae en la columna "Escritura".

### Colores por columna

| Paso | Color header | Color fondo |
|------|-------------|-------------|
| FIRMA_CLIENTE_PROMESA | `#2563eb` | `#eff6ff` |
| FIRMA_INMOBILIARIA_PROMESA | `#7c3aed` | `#f5f3ff` |
| ESCRITURA_LISTA | `#d97706` | `#fffbeb` |
| FIRMADA_NOTARIA | `#ec4899` | `#fdf2f8` |
| INSCRIPCION_CBR | `#10b981` | `#ecfdf5` |
| ENTREGADO | `#22c55e` | `#f0fdf4` |

---

## Página Ventas — soporte filtro URL

`/ventas?estado=ENTREGADO` debe funcionar. Cambios en `Ventas.jsx`:
- Importar `useSearchParams` de `react-router-dom`
- Al montar, leer `searchParams.get('estado')` y setear `estado` inicial
- El select de estado en el filtro también debe reflejar el valor de la URL

---

## Archivos a modificar

- `frontend/src/pages/dashboard/Dashboard.jsx` — reemplazar `LegalWidget` por `KanbanLegal`
- `frontend/src/pages/ventas/Ventas.jsx` — agregar `useSearchParams` para filtro de estado por URL
