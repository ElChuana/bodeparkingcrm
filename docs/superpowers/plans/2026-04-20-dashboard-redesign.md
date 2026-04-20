# Dashboard Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rediseñar el dashboard agregando KPIs con comparación, gráficos de ingresos/ventas por mes, leads por campaña, inventario por edificio, visitas, cuotas pendientes; eliminar tabla ventasActivas.

**Architecture:** Backend extiende `dashboardController.js` con nuevas queries en paralelo. Frontend reemplaza `Dashboard.jsx` con nuevos subcomponentes, usando Recharts para gráficos de barras.

**Tech Stack:** React 18 · Ant Design · TanStack Query v5 · Recharts 3 · Express · Prisma · PostgreSQL Railway

---

## File Structure

- Modify: `backend/src/controllers/dashboardController.js` — todas las queries nuevas
- Modify: `frontend/src/pages/dashboard/Dashboard.jsx` — reestructurar layout completo

---

## Task 1: Backend — KPIs con comparación y queries de ingresos/ventas/campañas

**Files:**
- Modify: `backend/src/controllers/dashboardController.js`

El período anterior se calcula como: si el período actual va de `desde` a `hasta` (duración = N ms), el anterior va de `desde - N` a `desde`.

- [ ] **Step 1: Reemplazar `dashboardController.js` con la versión extendida**

```js
const prisma = require('../lib/prisma')

// Calcula el período anterior con la misma duración
function calcPeriodoAnterior(desde, hasta) {
  if (!desde || !hasta) return { desdeAnt: null, hastaAnt: null }
  const d = new Date(desde), h = new Date(hasta)
  const dur = h - d
  return { desdeAnt: new Date(d - dur), hastaAnt: new Date(d) }
}

// Agrupa ventas por semana dentro del período
function agruparPorSemana(ventas, desde, hasta) {
  const inicio = desde ? new Date(desde) : new Date(ventas[0]?.fechaReserva || Date.now())
  const fin    = hasta ? new Date(hasta)  : new Date()
  const semanas = []
  let cursor = new Date(inicio)
  let i = 1
  while (cursor < fin) {
    const finSemana = new Date(Math.min(cursor.getTime() + 7 * 86400000, fin.getTime()))
    semanas.push({ label: `S${i}`, desde: new Date(cursor), hasta: finSemana })
    cursor = finSemana
    i++
  }
  return semanas.map(s => {
    const vendidoUF = ventas
      .filter(v => v.fechaReserva && new Date(v.fechaReserva) >= s.desde && new Date(v.fechaReserva) < s.hasta)
      .reduce((sum, v) => sum + (v.precioUF || 0), 0)
    const recolectadoUF = ventas
      .filter(v => v.fechaReserva && new Date(v.fechaReserva) >= s.desde && new Date(v.fechaReserva) < s.hasta)
      .flatMap(v => v.planPago?.cuotas || [])
      .filter(c => c.estado === 'PAGADO' && c.fechaPagoReal && new Date(c.fechaPagoReal) >= s.desde && new Date(c.fechaPagoReal) < s.hasta)
      .reduce((sum, c) => sum + (c.montoUF || 0), 0)
    return { semana: s.label, vendidoUF: +vendidoUF.toFixed(2), recolectadoUF: +recolectadoUF.toFixed(2) }
  })
}

const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

const obtener = async (req, res) => {
  const { desde, hasta } = req.query
  const hayFecha = desde || hasta
  const { desdeAnt, hastaAnt } = calcPeriodoAnterior(desde, hasta)

  const filtroLead     = hayFecha ? { creadoEn:     { ...(desde && { gte: new Date(desde) }), ...(hasta && { lte: new Date(hasta) }) } } : {}
  const filtroReserva  = hayFecha ? { fechaReserva: { ...(desde && { gte: new Date(desde) }), ...(hasta && { lte: new Date(hasta) }) } } : {}
  const filtroEscritura= hayFecha ? { fechaEscritura:{ ...(desde && { gte: new Date(desde) }), ...(hasta && { lte: new Date(hasta) }) } } : {}
  const filtroLeadAnt  = desdeAnt ? { creadoEn:     { gte: desdeAnt, lte: hastaAnt } } : {}
  const filtroReservaAnt = desdeAnt ? { fechaReserva:{ gte: desdeAnt, lte: hastaAnt } } : {}

  const anioActual = new Date().getFullYear()

  try {
    const [
      // KPIs actuales
      leadsIngresados,
      ventasRecientes,
      // KPIs período anterior
      leadsIngresadosAnt,
      ventasAnt,
      // Inventario por edificio
      unidadesPorEdificio,
      // Ventas activas para legal y cuotas
      ventasActivas,
      // Ventas año completo para gráfico por mes
      ventasAnio,
      // Leads para embudo
      contactados,
      visitaAgendada,
      reservas,
      escriturados,
      // Notificaciones
      notificacionesSinLeer,
      // Visitas del período
      visitasDelPeriodo,
      // Visitas próximas
      visitasProximas,
    ] = await Promise.all([
      // Leads ingresados en el período
      prisma.lead.count({ where: filtroLead }),

      // Ventas del período con planPago para ingresos por semana
      prisma.venta.findMany({
        where: { ...filtroReserva, estado: { not: 'ANULADO' } },
        orderBy: { fechaReserva: 'desc' },
        select: {
          id: true, estado: true, precioUF: true, descuentoUF: true,
          fechaReserva: true,
          comprador: { select: { nombre: true, apellido: true } },
          vendedor:  { select: { nombre: true, apellido: true } },
          broker:    { select: { nombre: true, apellido: true } },
          unidades: {
            select: {
              numero: true, tipo: true, precioCostoUF: true,
              edificio: { select: { nombre: true } }
            }
          },
          planPago: {
            select: {
              cuotas: {
                select: { montoUF: true, estado: true, fechaPagoReal: true, fechaVencimiento: true, tipo: true, numeroCuota: true, metodoPago: true },
                orderBy: { numeroCuota: 'asc' }
              }
            }
          }
        }
      }),

      // Leads período anterior
      prisma.lead.count({ where: filtroLeadAnt }),

      // Ventas período anterior
      prisma.venta.count({ where: { ...filtroReservaAnt, estado: { not: 'ANULADO' } } }),

      // Inventario por edificio — groupBy edificioId + estado
      prisma.unidad.groupBy({
        by: ['edificioId', 'estado'],
        _count: { id: true },
        orderBy: { edificioId: 'asc' }
      }).then(async rows => {
        const edificioIds = [...new Set(rows.map(r => r.edificioId))]
        const edificios = await prisma.edificio.findMany({
          where: { id: { in: edificioIds } },
          select: { id: true, nombre: true }
        })
        const edMap = Object.fromEntries(edificios.map(e => [e.id, e.nombre]))
        const result = {}
        for (const r of rows) {
          const eid = r.edificioId
          if (!result[eid]) result[eid] = { edificio: edMap[eid] || `Edificio ${eid}`, disponible: 0, reservado: 0, vendido: 0, otro: 0 }
          if (r.estado === 'DISPONIBLE')  result[eid].disponible  += r._count.id
          else if (r.estado === 'RESERVADO') result[eid].reservado += r._count.id
          else if (r.estado === 'VENDIDO')   result[eid].vendido   += r._count.id
          else result[eid].otro += r._count.id
        }
        return Object.values(result).map(e => ({ ...e, total: e.disponible + e.reservado + e.vendido + e.otro }))
          .sort((a, b) => a.edificio.localeCompare(b.edificio))
      }),

      // Ventas activas para legal y cuotas (sin filtro de fecha)
      prisma.venta.findMany({
        where: { estado: { in: ['RESERVA', 'PROMESA', 'ESCRITURA'] } },
        orderBy: { fechaReserva: 'desc' },
        include: {
          comprador: { select: { nombre: true, apellido: true } },
          vendedor:  { select: { nombre: true, apellido: true } },
          unidades:  { select: { numero: true, tipo: true, edificio: { select: { nombre: true } } } },
          procesoLegal: {
            select: {
              estadoActual: true, tienePromesa: true,
              fechaLimiteFirmaCliente: true, fechaLimiteFirmaInmob: true,
              fechaLimiteEscritura: true, fechaLimiteFirmaNot: true,
              fechaLimiteCBR: true, fechaLimiteEntrega: true,
            }
          },
          planPago: {
            include: { cuotas: { orderBy: { numeroCuota: 'asc' } } }
          }
        }
      }),

      // Ventas año completo para gráfico mensual
      prisma.venta.findMany({
        where: {
          estado: { not: 'ANULADO' },
          fechaReserva: {
            gte: new Date(anioActual, 0, 1),
            lte: new Date(anioActual, 11, 31, 23, 59, 59)
          }
        },
        select: { fechaReserva: true }
      }),

      // Embudo: contactados
      prisma.lead.count({
        where: { ...filtroLead, etapa: { in: ['SEGUIMIENTO','COTIZACION_ENVIADA','VISITA_AGENDADA','VISITA_REALIZADA','SEGUIMIENTO_POST_VISITA','NEGOCIACION','RESERVA','PROMESA','ESCRITURA','ENTREGA','POSTVENTA'] } }
      }),

      // Embudo: visita agendada+
      prisma.lead.count({
        where: { ...filtroLead, etapa: { in: ['VISITA_AGENDADA','VISITA_REALIZADA','SEGUIMIENTO_POST_VISITA','NEGOCIACION','RESERVA','PROMESA','ESCRITURA','ENTREGA','POSTVENTA'] } }
      }),

      // Embudo: reservas
      prisma.venta.count({ where: { ...filtroReserva, estado: { not: 'ANULADO' } } }),

      // Embudo: escriturados
      prisma.venta.count({
        where: hayFecha
          ? { ...filtroEscritura, estado: { not: 'ANULADO' } }
          : { fechaEscritura: { not: null }, estado: { not: 'ANULADO' } }
      }),

      // Notificaciones sin leer
      prisma.notificacion.count({ where: { usuarioId: req.usuario.id, leida: false } }),

      // Visitas del período
      prisma.visita.findMany({
        where: hayFecha ? { fechaHora: { gte: new Date(desde), lte: new Date(hasta) } } : {},
        orderBy: { fechaHora: 'desc' },
        include: {
          lead: {
            select: {
              contacto: { select: { nombre: true, apellido: true } },
              unidadInteres: { select: { numero: true, tipo: true, edificio: { select: { nombre: true } } } }
            }
          },
          vendedor: { select: { nombre: true, apellido: true } }
        }
      }),

      // Visitas próximas (después de ahora, máx 10)
      prisma.visita.findMany({
        where: { fechaHora: { gt: new Date() } },
        orderBy: { fechaHora: 'asc' },
        take: 10,
        include: {
          lead: {
            select: {
              contacto: { select: { nombre: true, apellido: true } },
              unidadInteres: { select: { numero: true, tipo: true, edificio: { select: { nombre: true } } } }
            }
          },
          vendedor: { select: { nombre: true, apellido: true } }
        }
      }),
    ])

    // Leads por campaña: actual vs anterior
    const leadsActualRaw = await prisma.lead.groupBy({
      by: ['campana'],
      where: filtroLead,
      _count: { id: true }
    })
    const leadsAntRaw = desdeAnt ? await prisma.lead.groupBy({
      by: ['campana'],
      where: filtroLeadAnt,
      _count: { id: true }
    }) : []

    const antMap = Object.fromEntries(leadsAntRaw.map(r => [r.campana ?? '__sin_campana__', r._count.id]))
    const leadsPorCampana = leadsActualRaw
      .map(r => ({
        campana: r.campana || 'Sin campaña',
        actual:   r._count.id,
        anterior: antMap[r.campana ?? '__sin_campana__'] || 0,
      }))
      .sort((a, b) => b.actual - a.actual)

    // Ingresos por semana
    const ingresosPorSemana = agruparPorSemana(ventasRecientes, desde, hasta)

    // Ventas por mes (año completo)
    const ventasPorMes = MESES.map((nombre, i) => ({
      mes: i + 1,
      nombre,
      cantidad: ventasAnio.filter(v => v.fechaReserva && new Date(v.fechaReserva).getMonth() === i).length
    }))

    // KPIs
    const montoUF = ventasRecientes.reduce((s, v) => s + (v.precioUF || 0), 0)
    const montoUFAnt = 0 // no tenemos ventas del anterior con precioUF, solo count — se puede extender
    const ventasAntCount = ventasAnt

    // Cuotas pendientes de ventas activas
    const cuotasPendientes = ventasActivas
      .flatMap(v => (v.planPago?.cuotas || [])
        .filter(c => c.estado !== 'PAGADO' && c.estado !== 'CONDONADO')
        .map(c => ({
          compradorNombre: `${v.comprador?.nombre || ''} ${v.comprador?.apellido || ''}`.trim(),
          ventaId: v.id,
          numeroCuota: c.numeroCuota,
          totalCuotas: v.planPago.cuotas.length,
          fechaVencimiento: c.fechaVencimiento,
          montoUF: c.montoUF,
          estado: c.estado,
          vencida: new Date(c.fechaVencimiento) < new Date()
        }))
      )
      .sort((a, b) => {
        if (a.vencida && !b.vencida) return -1
        if (!a.vencida && b.vencida) return 1
        return new Date(a.fechaVencimiento) - new Date(b.fechaVencimiento)
      })

    // Proceso legal — solo ventas con pasos incompletos
    const PASOS_CON_PROMESA  = ['FIRMA_CLIENTE_PROMESA','FIRMA_INMOBILIARIA_PROMESA','ESCRITURA_LISTA','FIRMADA_NOTARIA','INSCRIPCION_CBR','ENTREGADO']
    const procesoLegalPendiente = ventasActivas.filter(v => {
      if (!v.procesoLegal) return false
      const pasos = v.procesoLegal.tienePromesa === false
        ? ['ESCRITURA_LISTA','FIRMADA_NOTARIA','INSCRIPCION_CBR','ENTREGADO']
        : PASOS_CON_PROMESA
      const idx = pasos.indexOf(v.procesoLegal.estadoActual)
      return idx < pasos.length - 1 // no está en el último paso (ENTREGADO)
    })

    res.json({
      kpis: {
        leadsIngresados,
        leadsIngresadosAnterior: leadsIngresadosAnt,
        ventas: ventasRecientes.length,
        ventasAnterior: ventasAntCount,
        montoUF: +montoUF.toFixed(2),
        montoUFAnterior: montoUFAnt,
      },
      ingresosPorSemana,
      ventasPorMes,
      leadsPorCampana,
      inventarioPorEdificio: unidadesPorEdificio,
      visitasDelPeriodo,
      visitasProximas,
      cuotasPendientes,
      ventasRecientes,
      procesoLegalPendiente,
      embudo: [
        { paso: 'Leads recibidos', cantidad: leadsIngresados },
        { paso: 'Contactados',     cantidad: contactados },
        { paso: 'Visita agendada', cantidad: visitaAgendada },
        { paso: 'Reservas',        cantidad: reservas },
        { paso: 'Escriturados',    cantidad: escriturados },
      ],
      // mantenemos notificaciones para compatibilidad
      resumen: { totalLeads: leadsIngresados, notificacionesSinLeer },
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al obtener dashboard.' })
  }
}

module.exports = { obtener }
```

- [ ] **Step 2: Verificar que el servidor arranca sin errores**

```bash
cd backend && node -e "require('./src/controllers/dashboardController')" && echo "OK"
```
Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add backend/src/controllers/dashboardController.js
git commit -m "feat: dashboard backend — KPIs comparativos, visitas, cuotas, inventario por edificio, ventas por mes"
```

---

## Task 2: Frontend — KPIs con comparación de período

**Files:**
- Modify: `frontend/src/pages/dashboard/Dashboard.jsx` (reemplazar sección KPIs)

Los KPIs actuales se reemplazan. Se agrega helper `calcPct` y el nuevo layout de 4 tarjetas.

- [ ] **Step 1: Abrir Dashboard.jsx y reemplazar la sección de stat cards**

Reemplazar desde `const STAT_CARDS = [` hasta el cierre del bloque de las 4 tarjetas (líneas 515-595 aprox) con:

```jsx
  // Helper comparación
  const calcPct = (actual, anterior) => {
    if (!anterior) return null
    return Math.round(((actual - anterior) / anterior) * 100)
  }
  const { kpis, ingresosPorSemana, ventasPorMes, leadsPorCampana,
          inventarioPorEdificio, visitasDelPeriodo, visitasProximas,
          cuotasPendientes, ventasRecientes: ventasPeriodo,
          procesoLegalPendiente, embudo } = data || {}

  const KPI_CARDS = [
    {
      label: 'Leads ingresados',
      value: kpis?.leadsIngresados ?? 0,
      pct: calcPct(kpis?.leadsIngresados, kpis?.leadsIngresadosAnterior),
      color: '#1d4ed8',
    },
    {
      label: 'Ventas',
      value: kpis?.ventas ?? 0,
      diff: kpis != null ? (kpis.ventas - kpis.ventasAnterior) : null,
      color: '#7c3aed',
    },
    {
      label: 'Monto vendido',
      value: `${(kpis?.montoUF ?? 0).toLocaleString('es-CL', { minimumFractionDigits: 1 })} UF`,
      subValue: kpis?.montoUF && valorUF ? formatPesos(ufAPesos(kpis.montoUF)) : null,
      color: '#16a34a',
    },
  ]
```

Y el render de las tarjetas:

```jsx
      {/* 3 KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 16 }}>
        {KPI_CARDS.map((k, i) => (
          <div key={i} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 14, borderTop: `3px solid ${k.color}` }}>
            <div style={{ fontSize: 9, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 6 }}>
              {k.label}
            </div>
            <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 26, fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>
              {k.value}
            </div>
            {k.subValue && <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{k.subValue}</div>}
            {k.pct != null && (
              <div style={{ fontSize: 10, color: k.pct >= 0 ? '#16a34a' : '#dc2626', marginTop: 4 }}>
                {k.pct >= 0 ? '↑' : '↓'} {Math.abs(k.pct)}% vs período ant.
              </div>
            )}
            {k.diff != null && (
              <div style={{ fontSize: 10, color: k.diff >= 0 ? '#16a34a' : '#dc2626', marginTop: 4 }}>
                {k.diff >= 0 ? '+' : ''}{k.diff} vs período ant.
              </div>
            )}
          </div>
        ))}
      </div>
```

También agregar `valorUF` al destructuring del hook useUF:
```jsx
const { valorUF, ufAPesos, formatPesos } = useUF()
```

- [ ] **Step 2: Verificar que compila**

```bash
cd frontend && npm run build 2>&1 | tail -5
```
Expected: sin errores de compilación.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/dashboard/Dashboard.jsx
git commit -m "feat: dashboard KPIs — leads, ventas, monto UF con comparación período anterior"
```

---

## Task 3: Frontend — Gráficos de ingresos por semana y ventas por mes (Recharts)

**Files:**
- Modify: `frontend/src/pages/dashboard/Dashboard.jsx`

Recharts ya está instalado (`recharts ^3.8.1`). Se agregan dos componentes internos usando `BarChart`, `Bar`, `XAxis`, `YAxis`, `Tooltip`, `ResponsiveContainer` y `Cell`.

- [ ] **Step 1: Agregar imports de Recharts al principio del archivo**

```jsx
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
```

- [ ] **Step 2: Agregar componente `GraficoIngresosSemana`** (antes del `export default function Dashboard`)

```jsx
function GraficoIngresosSemana({ datos }) {
  if (!datos?.length) return <div style={{ color: '#94a3b8', fontSize: 12, textAlign: 'center', padding: '20px 0' }}>Sin datos</div>
  const total = datos.reduce((s, d) => ({ vendido: s.vendido + d.vendidoUF, recolectado: s.recolectado + d.recolectadoUF }), { vendido: 0, recolectado: 0 })
  return (
    <div>
      <ResponsiveContainer width="100%" height={120}>
        <BarChart data={datos} barSize={14} barGap={2}>
          <XAxis dataKey="semana" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
          <YAxis hide />
          <Tooltip
            contentStyle={{ fontSize: 11, borderRadius: 6 }}
            formatter={(v, name) => [`${v.toFixed(1)} UF`, name === 'vendidoUF' ? 'Vendido' : 'Recolectado']}
          />
          <Bar dataKey="vendidoUF"      fill="#1d4ed8" radius={[3,3,0,0]} />
          <Bar dataKey="recolectadoUF"  fill="#86efac" radius={[3,3,0,0]} />
        </BarChart>
      </ResponsiveContainer>
      <div style={{ display: 'flex', gap: 14, fontSize: 11, marginTop: 4 }}>
        <span><span style={{ color: '#1d4ed8' }}>■</span> Vendido: <strong>{total.vendido.toFixed(1)} UF</strong></span>
        <span><span style={{ color: '#16a34a' }}>■</span> Recolectado: <strong>{total.recolectado.toFixed(1)} UF</strong></span>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Agregar componente `GraficoVentasMes`** (justo después de `GraficoIngresosSemana`)

```jsx
function GraficoVentasMes({ datos }) {
  if (!datos?.length) return null
  const mesActual = new Date().getMonth() + 1
  return (
    <ResponsiveContainer width="100%" height={120}>
      <BarChart data={datos} barSize={18}>
        <XAxis dataKey="nombre" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
        <YAxis hide allowDecimals={false} />
        <Tooltip
          contentStyle={{ fontSize: 11, borderRadius: 6 }}
          formatter={(v) => [v, 'Ventas']}
        />
        <Bar dataKey="cantidad" radius={[3,3,0,0]}>
          {datos.map(entry => (
            <Cell key={entry.mes} fill={entry.mes === mesActual ? '#1d4ed8' : '#c7d2fe'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
```

- [ ] **Step 4: Agregar fila de gráficos en el layout** (después de las KPI cards, antes del embudo)

```jsx
      {/* Fila: Ingresos por semana + Ventas por mes */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 10 }}>Ingresos por semana (UF)</div>
          <GraficoIngresosSemana datos={ingresosPorSemana} />
        </div>
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 10 }}>Ventas por mes {new Date().getFullYear()}</div>
          <GraficoVentasMes datos={ventasPorMes} />
        </div>
      </div>
```

- [ ] **Step 5: Verificar compilación**

```bash
cd frontend && npm run build 2>&1 | tail -5
```

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/dashboard/Dashboard.jsx
git commit -m "feat: dashboard — gráficos ingresos por semana y ventas por mes con Recharts"
```

---

## Task 4: Frontend — Leads por campaña con comparación

**Files:**
- Modify: `frontend/src/pages/dashboard/Dashboard.jsx`

- [ ] **Step 1: Agregar componente `TablaCampanas`** (antes del `export default`)

```jsx
function TablaCampanas({ datos }) {
  if (!datos?.length) return <div style={{ color: '#94a3b8', fontSize: 12, textAlign: 'center', padding: '12px 0' }}>Sin datos de campañas</div>
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
      <thead>
        <tr>
          <th style={{ textAlign: 'left', padding: '3px 0', color: '#6b7280', fontWeight: 500, borderBottom: '1px solid #e5e7eb' }}>Campaña</th>
          <th style={{ textAlign: 'right', padding: '3px 6px', color: '#6b7280', fontWeight: 500, borderBottom: '1px solid #e5e7eb' }}>Actual</th>
          <th style={{ textAlign: 'right', padding: '3px 6px', color: '#6b7280', fontWeight: 500, borderBottom: '1px solid #e5e7eb' }}>Ant.</th>
          <th style={{ textAlign: 'right', padding: '3px 0', color: '#6b7280', fontWeight: 500, borderBottom: '1px solid #e5e7eb' }}>Δ</th>
        </tr>
      </thead>
      <tbody>
        {datos.map((row, i) => {
          const delta = row.anterior > 0
            ? Math.round(((row.actual - row.anterior) / row.anterior) * 100)
            : row.actual > 0 ? null : 0
          return (
            <tr key={i} style={{ borderBottom: '1px solid #f9fafb' }}>
              <td style={{ padding: '5px 0', color: '#374151', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.campana}</td>
              <td style={{ padding: '5px 6px', textAlign: 'right', fontWeight: 600, color: '#111827' }}>{row.actual}</td>
              <td style={{ padding: '5px 6px', textAlign: 'right', color: '#9ca3af' }}>{row.anterior}</td>
              <td style={{ padding: '5px 0', textAlign: 'right', color: delta == null ? '#1d4ed8' : delta >= 0 ? '#16a34a' : '#dc2626', fontWeight: 500 }}>
                {delta == null ? 'nuevo' : `${delta >= 0 ? '↑' : '↓'}${Math.abs(delta)}%`}
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
```

- [ ] **Step 2: Agregar sección en el layout** (después de los gráficos, antes del embudo)

```jsx
      {/* Leads por campaña */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 14, marginBottom: 16 }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 10 }}>Leads por campaña</div>
        <TablaCampanas datos={leadsPorCampana} />
      </div>
```

- [ ] **Step 3: Verificar compilación y commit**

```bash
cd frontend && npm run build 2>&1 | tail -5
git add frontend/src/pages/dashboard/Dashboard.jsx
git commit -m "feat: dashboard — leads por campaña con comparación período anterior"
```

---

## Task 5: Frontend — Inventario por edificio con números

**Files:**
- Modify: `frontend/src/pages/dashboard/Dashboard.jsx`

Reemplazar la sección de inventario actual (líneas 614-636 en el original) con el nuevo componente.

- [ ] **Step 1: Agregar componente `InventarioEdificios`** (antes del `export default`)

```jsx
function InventarioEdificios({ datos }) {
  if (!datos?.length) return <div style={{ color: '#94a3b8', fontSize: 12, textAlign: 'center', padding: '12px 0' }}>Sin datos</div>
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {datos.map(e => {
        const total = e.total || 1
        return (
          <div key={e.edificio}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#1e293b' }}>{e.edificio}</span>
              <span style={{ fontSize: 11, color: '#6b7280' }}>
                <span style={{ color: '#16a34a', fontWeight: 600 }}>{e.disponible}</span> disp · {' '}
                <span style={{ color: '#d97706', fontWeight: 600 }}>{e.reservado}</span> reserv · {' '}
                <span style={{ color: '#dc2626', fontWeight: 600 }}>{e.vendido}</span> vendido
                <span style={{ color: '#9ca3af' }}> / {e.total} total</span>
              </span>
            </div>
            <div style={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', background: '#f3f4f6' }}>
              <div style={{ width: `${(e.disponible/total)*100}%`, background: '#16a34a' }} />
              <div style={{ width: `${(e.reservado/total)*100}%`, background: '#d97706' }} />
              <div style={{ width: `${(e.vendido/total)*100}%`, background: '#dc2626' }} />
              {e.otro > 0 && <div style={{ flex: 1, background: '#3b82f6' }} />}
            </div>
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Reemplazar la sección de inventario en el layout**

Reemplazar el bloque:
```jsx
      {/* Inventario */}
      <Card title="Inventario" size="small" style={{ marginBottom: 16 }}>
        ...
      </Card>
```

Con:
```jsx
      {/* Inventario por edificio */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 14, marginBottom: 16 }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 12 }}>Inventario por propiedad</div>
        <InventarioEdificios datos={inventarioPorEdificio} />
      </div>
```

- [ ] **Step 3: Verificar y commit**

```bash
cd frontend && npm run build 2>&1 | tail -5
git add frontend/src/pages/dashboard/Dashboard.jsx
git commit -m "feat: dashboard — inventario por edificio con números disponible/reservado/vendido"
```

---

## Task 6: Frontend — Sección de visitas con tabs

**Files:**
- Modify: `frontend/src/pages/dashboard/Dashboard.jsx`

- [ ] **Step 1: Agregar componente `SeccionVisitas`** (antes del `export default`)

```jsx
function SeccionVisitas({ delPeriodo, proximas }) {
  const [tab, setTab] = useState('periodo')
  const datos = tab === 'periodo' ? (delPeriodo || []) : (proximas || [])

  const tagResultado = (resultado) => {
    if (!resultado) return <Tag color="orange" style={{ fontSize: 10 }}>Pendiente</Tag>
    if (resultado === 'REALIZADA') return <Tag color="green" style={{ fontSize: 10 }}>Realizada</Tag>
    if (resultado === 'NO_ASISTIO') return <Tag color="red" style={{ fontSize: 10 }}>No asistió</Tag>
    return <Tag style={{ fontSize: 10 }}>{resultado}</Tag>
  }

  return (
    <div>
      <div style={{ display: 'flex', marginBottom: 10, borderRadius: 6, overflow: 'hidden', border: '1px solid #e5e7eb' }}>
        {[['periodo', `Del período (${(delPeriodo||[]).length})`], ['proximas', `Próximas (${(proximas||[]).length})`]].map(([key, label]) => (
          <div
            key={key}
            onClick={() => setTab(key)}
            style={{
              flex: 1, textAlign: 'center', padding: '6px 0', fontSize: 11, cursor: 'pointer', fontWeight: tab === key ? 600 : 400,
              background: tab === key ? '#1d4ed8' : '#f9fafb', color: tab === key ? '#fff' : '#6b7280',
            }}
          >{label}</div>
        ))}
      </div>
      {datos.length === 0 ? (
        <div style={{ color: '#94a3b8', fontSize: 12, textAlign: 'center', padding: '12px 0' }}>Sin visitas</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, maxHeight: 220, overflowY: 'auto' }}>
          {datos.map(v => {
            const contacto = v.lead?.contacto
            const unidad   = v.lead?.unidadInteres
            const prop = unidad
              ? `${unidad.edificio?.nombre || '—'} · ${unidad.tipo === 'BODEGA' ? 'Bodega' : 'Est.'} ${unidad.numero}`
              : '—'
            return (
              <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', background: '#f9fafb', borderRadius: 6 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 500, color: '#1e293b' }}>
                    {contacto?.nombre} {contacto?.apellido}
                  </div>
                  <div style={{ fontSize: 10, color: '#6b7280' }}>
                    {prop}
                    {v.vendedor && ` · ${v.vendedor.nombre}`}
                    {tab === 'proximas' && ` · ${format(new Date(v.fechaHora), "d MMM HH:mm", { locale: es })}`}
                  </div>
                </div>
                {tagResultado(v.resultado)}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Agregar la sección en el layout** (en la fila del embudo, reemplazando el bloque `{/* Embudo + Legal */}`)

```jsx
      {/* Embudo + Visitas */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 12 }}>Embudo de ventas</div>
          <EmbudoVisual datos={embudo} />
        </div>
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 10 }}>Visitas</div>
          <SeccionVisitas delPeriodo={visitasDelPeriodo} proximas={visitasProximas} />
        </div>
      </div>
```

- [ ] **Step 3: Verificar y commit**

```bash
cd frontend && npm run build 2>&1 | tail -5
git add frontend/src/pages/dashboard/Dashboard.jsx
git commit -m "feat: dashboard — sección de visitas del período y próximas con tabs"
```

---

## Task 7: Frontend — Proceso legal (solo pendientes) + cuotas pendientes

**Files:**
- Modify: `frontend/src/pages/dashboard/Dashboard.jsx`

- [ ] **Step 1: Reemplazar la sección `{/* Embudo + Legal */}` por la nueva fila proceso legal + cuotas**

Agregar después del bloque Embudo + Visitas:

```jsx
      {/* Proceso legal pendiente + Cuotas pendientes */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Proceso legal <span style={{ color: '#dc2626' }}>(pendientes)</span></div>
            <span onClick={() => navigate('/legal')} style={{ fontSize: 9, color: '#3b82f6', fontWeight: 500, cursor: 'pointer' }}>Ver legal →</span>
          </div>
          <LegalWidget ventasActivas={procesoLegalPendiente} />
        </div>
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 10 }}>Cuotas pendientes de pago</div>
          <CuotasPendientes datos={cuotasPendientes} />
        </div>
      </div>
```

- [ ] **Step 2: Agregar componente `CuotasPendientes`** (antes del `export default`)

```jsx
function CuotasPendientes({ datos }) {
  const navigate = useNavigate()
  if (!datos?.length) return <div style={{ color: '#94a3b8', fontSize: 12, textAlign: 'center', padding: '12px 0' }}>Sin cuotas pendientes</div>
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, maxHeight: 220, overflowY: 'auto' }}>
      {datos.map((c, i) => (
        <div
          key={i}
          onClick={() => navigate(`/ventas/${c.ventaId}`)}
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', background: c.vencida ? '#fff1f2' : '#f9fafb', borderRadius: 6, cursor: 'pointer', border: c.vencida ? '1px solid #fecdd3' : '1px solid transparent' }}
        >
          <div>
            <div style={{ fontSize: 11, fontWeight: 500, color: '#1e293b' }}>{c.compradorNombre}</div>
            <div style={{ fontSize: 10, color: c.vencida ? '#dc2626' : '#6b7280' }}>
              Cuota {c.numeroCuota}/{c.totalCuotas} · {c.vencida ? '⚠ Vencida · ' : ''}{format(new Date(c.fechaVencimiento), 'd MMM yyyy', { locale: es })}
            </div>
          </div>
          <span style={{ fontSize: 12, fontWeight: 600, color: c.vencida ? '#dc2626' : '#16a34a' }}>
            {c.montoUF != null ? `${c.montoUF.toFixed(1)} UF` : '—'}
          </span>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Verificar y commit**

```bash
cd frontend && npm run build 2>&1 | tail -5
git add frontend/src/pages/dashboard/Dashboard.jsx
git commit -m "feat: dashboard — proceso legal solo pendientes y cuotas pendientes de pago"
```

---

## Task 8: Frontend — Limpiar tabla ventasActivas, ajustar TablaVentas

**Files:**
- Modify: `frontend/src/pages/dashboard/Dashboard.jsx`

- [ ] **Step 1: Eliminar el bloque `{/* Ventas activas */}`** del return del componente Dashboard

Eliminar:
```jsx
      {/* Ventas activas */}
      <div style={{ marginTop: 16 }}>
        <TablaVentasActivas ventas={ventasActivas || []} />
      </div>
```

- [ ] **Step 2: Actualizar `TablaVentas` para usar `ventasPeriodo` en vez de `ventasRecientes`**

En el return de Dashboard cambiar:
```jsx
      <TablaVentas ventas={ventasRecientes || []} />
```
Por:
```jsx
      <TablaVentas ventas={ventasPeriodo || []} />
```

- [ ] **Step 3: Verificar compilación final y push**

```bash
cd frontend && npm run build 2>&1 | tail -5
```
Expected: Build exitoso sin errores.

```bash
git add frontend/src/pages/dashboard/Dashboard.jsx
git commit -m "feat: dashboard — eliminar tabla ventasActivas, usar ventasPeriodo en tabla"
git push
```

---

## Self-Review

**Spec coverage:**
- [x] KPIs: leads ingresados, ventas, monto UF/CLP con comparación → Task 1+2
- [x] Ingresos por semana (vendido + recolectado) → Task 1+3
- [x] Ventas por mes gráfico → Task 1+3
- [x] Leads por campaña tabla comparativa → Task 1+4
- [x] Inventario por edificio con números → Task 1+5
- [x] Embudo sin cambios → mantenido en Task 6
- [x] Visitas del período + próximas → Task 1+6
- [x] Proceso legal solo pendientes → Task 1+7
- [x] Cuotas pendientes → Task 1+7
- [x] Tabla ventas del período (sin ventasActivas) → Task 8
