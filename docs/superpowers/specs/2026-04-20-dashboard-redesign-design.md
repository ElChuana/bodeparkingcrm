# Dashboard Redesign — Spec

> **Para agentic workers:** usar superpowers:subagent-driven-development o superpowers:executing-plans para implementar tarea por tarea.

**Goal:** Rediseñar el dashboard del CRM agregando nuevas métricas, gráficos y secciones que dan visibilidad operacional real: ingresos, visitas, campañas, cuotas pendientes y ventas por mes.

**Architecture:** El backend agrega datos en `GET /api/dashboard` (dashboardController.js). El frontend es un solo componente Dashboard.jsx con subcomponentes. Se extienden ambos sin cambiar el contrato del endpoint — se agregan campos nuevos a la respuesta JSON existente.

**Tech Stack:** React + Ant Design + TanStack Query · Express + Prisma · PostgreSQL Railway

---

## Cambios en KPIs

Las 4 tarjetas actuales se reemplazan por:

| # | Métrica | Dato | Comparación |
|---|---------|------|-------------|
| 1 | Leads ingresados | count de leads creados en el período | % vs período anterior equivalente |
| 2 | Ventas | count de ventas (estado ≠ ANULADO) en el período por fechaReserva | diferencia absoluta vs período anterior |
| 3 | Monto vendido (UF) | suma de `precioUF` de ventas del período | % vs período anterior |
| 4 | Monto vendido ($) | monto UF × valorUF del día | % vs período anterior |

**Período anterior:** se calcula automáticamente. Si el período es de N días, el anterior es los N días previos al inicio del período seleccionado.

---

## Nueva sección: Ingresos por semana (UF)

- Gráfico de barras agrupadas por semana dentro del período seleccionado
- **Azul** = UF vendidas (suma `precioUF` de ventas con `fechaReserva` en esa semana)
- **Verde** = UF recolectadas (suma de cuotas con `fechaPago` real en esa semana — campo a definir según modelo)
- Totales del período debajo del gráfico
- Usa la librería de gráficos ya disponible en el proyecto (Recharts o similar); si no hay una, usar barras CSS puras como los componentes actuales del embudo

---

## Nueva sección: Ventas por mes (gráfico)

- Barras verticales, una por mes del año en curso (enero–diciembre)
- Valor = cantidad de ventas con `fechaReserva` en ese mes
- Mes actual destacado en azul `#1d4ed8`, meses anteriores en azul claro `#c7d2fe`
- Sin filtro de fechas: siempre muestra el año completo

---

## Nueva sección: Leads por campaña (tabla comparativa)

Tabla con columnas: **Campaña | Actual | Anterior | Δ%**

- Filas = cada valor único de `campana` en los leads del período
- `Actual` = count de leads en el período seleccionado
- `Anterior` = count de leads en el período anterior equivalente
- `Δ%` = ((actual - anterior) / anterior) × 100, con flecha verde ↑ o roja ↓
- Si `anterior = 0`, mostrar "nuevo" en lugar de %
- Ordenar por `actual` descendente
- Leads sin campaña se agrupan como "Sin campaña"

---

## Inventario por propiedad (reemplaza inventario actual)

Por cada edificio:
- Nombre del edificio
- Números: **X disponibles · X reservados · X vendidos** de N total
- Barra de proporción de colores: verde=disponible, naranja=reservado, rojo=vendido
- Ordenar por nombre de edificio

Backend: `groupBy edificioId + estado`, con join a nombre del edificio.

---

## Embudo de ventas

Sin cambios funcionales — mantener igual.

---

## Visitas (sección nueva)

Dos tabs:

**Tab "Del período":**
- Visitas con `fechaHora` dentro del rango de fechas seleccionado
- Columnas: Cliente (nombre + apellido del contacto del lead), Propiedad (edificio + número de unidad del lead), Vendedor, Resultado (tag de color: Realizada=verde, Pendiente=naranja, No asistió=rojo)
- Ordenar por `fechaHora` desc

**Tab "Próximas":**
- Visitas con `fechaHora > ahora` (sin filtro de período)
- Mismas columnas + fecha/hora visible
- Ordenar por `fechaHora` asc (la más próxima primero)
- Máximo 10 visitas

---

## Proceso legal (modificación)

- **Filtrar**: solo mostrar ventas donde al menos un paso del `procesoLegal` NO esté completado
- Ventas con todos los pasos completados NO aparecen
- Mantener la lógica de alertas de vencimiento (rojo=vencido, naranja=próximo)

---

## Cuotas pendientes de pago (sección nueva)

Tabla con cuotas del `planPago` que:
- No han sido pagadas (campo `pagado = false` o similar según schema)
- De todos los planes de pago activos (ventas en RESERVA, PROMESA, ESCRITURA)

Columnas: **Comprador | Cuota (X/N) | Vencimiento | Monto UF**
- Cuotas vencidas (fecha < hoy y no pagadas) en rojo
- Ordenar: vencidas primero, luego por fecha de vencimiento asc

---

## Tabla de ventas del período (modificación)

- **Eliminar** la tabla "Ventas activas en curso" (ventasActivas)
- **Mantener** solo la tabla de ventas del período
- Agregar columna "Propiedad" = nombre edificio + número de unidad
- Columnas finales: Comprador | Propiedad | Vendedor | Precio UF | Estado

---

## Cambios en backend (dashboardController.js)

Nuevos campos en la respuesta de `GET /api/dashboard`:

```json
{
  "kpis": {
    "leadsIngresados": 148,
    "leadsIngresadosAnterior": 132,
    "ventas": 7,
    "ventasAnterior": 4,
    "montoUF": 623.5,
    "montoUFAnterior": 678.0
  },
  "ingresosPorSemana": [
    { "semana": "S1", "vendidoUF": 120, "recolectadoUF": 65 }
  ],
  "ventasPorMes": [
    { "mes": 1, "nombre": "Ene", "cantidad": 3 }
  ],
  "leadsPorCampana": [
    { "campana": "Inversion_Bodegas", "actual": 42, "anterior": 31 }
  ],
  "inventarioPorEdificio": [
    { "edificio": "Edificio Central", "disponible": 28, "reservado": 8, "vendido": 4, "total": 40 }
  ],
  "visitasDelPeriodo": [...],
  "visitasProximas": [...],
  "cuotasPendientes": [...],
  "ventasRecientes": [...],
  "procesoLegalPendiente": [...],
  "embudo": [...]
}
```

El campo `ventasActivas` se elimina de la respuesta.

---

## Archivos a modificar

- `backend/src/controllers/dashboardController.js` — agregar todas las queries nuevas
- `frontend/src/pages/dashboard/Dashboard.jsx` — reestructurar layout y componentes
