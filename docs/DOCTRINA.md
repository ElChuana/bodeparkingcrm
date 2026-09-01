# Doctrina del ERP financiero

**Heredera de la revisión de agosto 2026 (rama `respaldo-erp-2026-08-31`), recortada a lo
financiero.** El ERP sigue LA PLATA: banco, conciliación, provisiones, presupuesto, flujo
de caja y cobranza. No lleva contabilidad: sin partida doble, sin F29/RCV/IVA — eso lo
sigue haciendo el contador con Nubox.

## La idea que sostiene todo

> **Un movimiento del banco es un hecho. Un documento es una afirmación. La conciliación los une.**

Nadie tipea "pagado". Una provisión está cerrada porque tiene factura asociada y un
movimiento del banco imputado; una cuota está atrasada porque hoy es después de su
vencimiento y no tiene pago. Todo estado de plata se **calcula**, ninguno se guarda.

## Las reglas del modelo

1. **Un movimiento bancario es un hecho; un documento es una afirmación.** No se pueden
   crear movimientos a mano (el enum `OrigenMovimiento` ni siquiera tiene MANUAL): entran
   solo por cartola — scraper o subida manual. Lo que sí se crea son DOCUMENTOS.

2. **El estado derivable no se guarda.** "Pagada", "conciliado", "vencida", el estado de
   un documento interno, la ejecución del presupuesto: se calculan (lib/documentos.js,
   lib/cuotas.js, lib/presupuesto.js). *(Excepción heredada del CRM: `Cuota.estado` sí se
   persiste para sus alertas; el ERP lo actualiza al conciliar pero deriva el suyo.)*

3. **La clasificación vive en el documento, nunca en el movimiento.** La cuenta de gasto
   de un movimiento sale del documento que paga (documento interno o factura de compra).
   Guardarla también en el movimiento crearía dos versiones de la misma respuesta.

4. **Cada peso se imputa una sola vez.** `Conciliacion` es N:N a propósito y toda
   creación pasa por `crearConciliacionSegura()` (lib/imputacion.js), que lee la base y
   rechaza lo que sobrepase. `GET /api/erp/salud` lo verifica después.

5. **El documento ficticio es la pieza central** (`DocumentoInterno`):
   - **PROVISION** — "sé que me van a facturar tal fecha tal cosa": monto aproximado
     (usualmente UF), fecha esperada, cuenta. El cron mensual la genera desde el
     `GastoProgramado` (la plantilla). Cuando llega la factura real se ASOCIA y el pago
     se imputa a la factura. Si la fecha pasó sin factura → alerta **"no te han facturado"**.
   - **RESPALDO** — plata que ya se movió y nunca tendrá DTE (la notaría, una comisión
     bancaria). Se crea desde el movimiento y se concilia en la misma transacción; si se
     desconcilia y nada más lo respalda, se borra.
   - La cadena de los egresos: `GastoProgramado (plan) → DocumentoInterno PROVISION
     (ocurrencia) → FacturaCompra (documento real) → MovimientoBanco (hecho)`. Cada
     eslabón reemplaza al anterior en la proyección — nunca se cuenta dos veces.

6. **El plan de cuentas tiene dos niveles** (`CuentaGasto`): la cuenta grande
   (Administración, Comercial, Financiera, Inmobiliaria) y sus subcuentas (Software,
   Notaría, Publicidad…). El presupuesto se carga por subcuenta y mes; la cuenta grande
   es la suma. La ejecución (Ejecutado / Comprometido / Disponible) se calcula por lo
   **devengado**: la provisión de julio cuenta contra julio aunque se pague en agosto.

7. **El matcher propone, la persona confirma.** El score es determinista y explica sus
   motivos. Las únicas excepciones: reglas `autoValidar` con coincidencia única, y la
   pasada automática con umbral ≥90 y elección mutua única.

8. **La IA es un parser, nunca un juez** (lib/glosaIA.js): lee glosas y deja campos
   limpios en columnas aparte. La decisión sigue siendo del score.

## Verificación

- `npm test` — los motores puros se testean sin Postgres.
- `GET /api/erp/salud` — los invariantes contra la base (lib/salud.js). Un `error`
  significa que las cifras no son confiables hasta arreglarlo.
- Los oráculos externos: `~/Documentos/bodeparking-finanzas/ventas-en-cuotas-calendario-*.xlsx`
  (CxC), `ventas-vs-gastos-*.xlsx` (gasto por cuenta).

## Qué quedó fuera a propósito (roadmap)

Facturación de venta (DTE/SimpleFactura), RCV del SII, IVA y entregable contable, libro
banco del contador, pagos de comisiones con documento, asistente IA con SQL de solo
lectura. Todo eso existe implementado en la rama `respaldo-erp-2026-08-31` si algún día
se retoma.
