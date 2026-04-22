import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from 'recharts'
import { useQuery } from '@tanstack/react-query'
import { Card, Row, Col, Statistic, Table, Tag, Spin, Typography, Progress, DatePicker, Space, Button, Tooltip, Steps } from 'antd'
import { TeamOutlined, BellOutlined, WarningOutlined, CheckCircleOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'
import { useUF } from '../../hooks/useUF'
import { ESTADO_VENTA_COLOR } from '../../components/ui'
import { format } from 'date-fns'
import { isPast } from 'date-fns'
import { es } from 'date-fns/locale'

const { Text } = Typography

const ESTADO_LABEL = { RESERVA: 'Reserva', PROMESA: 'Promesa', ESCRITURA: 'Escritura', ENTREGADO: 'Entregado', ANULADO: 'Anulado' }


const PRESETS = [
  { label: 'Hoy',         key: 'hoy' },
  { label: 'Esta semana', key: 'semana' },
  { label: 'Este mes',    key: 'mes' },
  { label: 'Mes pasado',  key: 'mes_pasado' },
  { label: 'Este año',    key: 'anio' },
]

function calcPresetDates(key) {
  const ahora = new Date()
  if (key === 'hoy') {
    const d = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate())
    return { desde: d.toISOString(), hasta: ahora.toISOString() }
  }
  if (key === 'semana') {
    const d = new Date(ahora); d.setDate(ahora.getDate() - 7); d.setHours(0,0,0,0)
    return { desde: d.toISOString(), hasta: ahora.toISOString() }
  }
  if (key === 'mes') {
    const d = new Date(ahora.getFullYear(), ahora.getMonth(), 1)
    return { desde: d.toISOString(), hasta: ahora.toISOString() }
  }
  if (key === 'mes_pasado') {
    const desde = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1)
    const hasta  = new Date(ahora.getFullYear(), ahora.getMonth(), 0, 23, 59, 59, 999)
    return { desde: desde.toISOString(), hasta: hasta.toISOString() }
  }
  if (key === 'anio') {
    const d = new Date(ahora.getFullYear(), 0, 1)
    return { desde: d.toISOString(), hasta: ahora.toISOString() }
  }
  return { desde: null, hasta: null }
}

const ANCHOS_EMBUDO = ['100%', '90%', '78%', '60%', '40%']
const COLORES_TRAPECIO = ['#1d4ed8', '#2563eb', '#3b82f6', '#60a5fa', '#93c5fd']

function EmbudoVisual({ datos }) {
  if (!datos?.length) return <div style={{ color: '#94a3b8', fontSize: 12, padding: '20px 0', textAlign: 'center' }}>Sin datos</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
      {datos.map((paso, i) => {
        const convPct = i > 0 && datos[i - 1].cantidad > 0
          ? Math.round((paso.cantidad / datos[i - 1].cantidad) * 100)
          : null
        const esUltimo = i === datos.length - 1
        const textColor = i >= 4 ? '#1e3a8a' : '#fff'
        const subTextColor = i >= 4 ? 'rgba(30,58,138,0.7)' : 'rgba(255,255,255,0.75)'

        return (
          <div key={paso.paso} style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ width: ANCHOS_EMBUDO[i] || '30%' }}>
              <div style={{
                background: COLORES_TRAPECIO[i] || '#bfdbfe',
                borderRadius: 3,
                padding: '8px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: textColor }}>{paso.paso}</span>
                <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 16, fontWeight: 800, color: textColor }}>{paso.cantidad}</span>
                {convPct !== null && (
                  <span style={{ fontSize: 9, fontWeight: 500, color: subTextColor }}>{convPct}%</span>
                )}
              </div>
            </div>
            {!esUltimo && (
              <div style={{ fontSize: 8, color: '#cbd5e1', lineHeight: 1.2 }}>▼</div>
            )}
          </div>
        )
      })}
      {datos.length >= 2 && (
        <div style={{ marginTop: 8, fontSize: 10, color: '#94a3b8', textAlign: 'center' }}>
          Conversión total{' '}
          <strong style={{ color: '#1d4ed8' }}>
            {datos[0].cantidad > 0 ? Math.round((datos[datos.length - 1].cantidad / datos[0].cantidad) * 100) : 0}%
          </strong>
          {' · '}{datos[0].cantidad} leads → {datos[datos.length - 1].cantidad} escrituras
        </div>
      )}
    </div>
  )
}

// ─── Tabla de ventas (reservas) del período ───────────────────────
function TablaVentas({ ventas }) {
  const navigate = useNavigate()
  const { ufAPesos, formatPesos } = useUF()

  const totalUF = ventas.reduce((s, v) => s + (v.precioFinalUF || 0), 0)

  const columns = [
    {
      title: 'Broker', key: 'broker', width: 130,
      render: (_, v) => v.broker
        ? <Text style={{ fontSize: 12 }}>{v.broker.nombre} {v.broker.apellido}</Text>
        : <Text type="secondary" style={{ fontSize: 12 }}>—</Text>
    },
    {
      title: 'Unidad', key: 'unidad', width: 80,
      render: (_, v) => (
        <div>
          <Text strong style={{ fontSize: 12 }}>{v.unidades?.[0]?.numero}</Text>
          <div><Text type="secondary" style={{ fontSize: 11 }}>
            {v.unidades?.[0]?.tipo === 'BODEGA' ? 'Bodega' : 'Est.'}
          </Text></div>
        </div>
      )
    },
    {
      title: 'Proyecto', key: 'proyecto',
      render: (_, v) => <Text style={{ fontSize: 12 }}>{v.unidades?.[0]?.edificio?.nombre || '—'}</Text>
    },
    {
      title: 'Valor UF', key: 'uf', width: 100, align: 'right',
      render: (_, v) => {
        const precio = v.precioFinalUF || 0
        return (
          <Text strong style={{ fontSize: 12 }}>
            {precio.toLocaleString('es-CL', { minimumFractionDigits: 2 })} UF
          </Text>
        )
      }
    },
    {
      title: 'Valor CLP', key: 'clp', width: 130, align: 'right',
      render: (_, v) => {
        const precio = v.precioFinalUF || 0
        const clp = ufAPesos(precio)
        return clp
          ? <Text style={{ fontSize: 12 }}>{formatPesos(clp)}</Text>
          : <Text type="secondary" style={{ fontSize: 12 }}>—</Text>
      }
    },
    {
      title: 'Costo UF', key: 'costo', width: 95, align: 'right',
      render: (_, v) => v.unidades?.[0]?.precioCostoUF
        ? <Text style={{ fontSize: 12, color: '#8c8c8c' }}>{v.unidades[0].precioCostoUF.toLocaleString('es-CL', { minimumFractionDigits: 2 })} UF</Text>
        : <Text type="secondary" style={{ fontSize: 12 }}>—</Text>
    },
    {
      title: 'Múltiplo', key: 'multiplo', width: 85, align: 'center',
      render: (_, v) => {
        const precio = v.precioFinalUF || 0
        const costo  = v.unidades?.[0]?.precioCostoUF
        if (!costo || !precio) return <Text type="secondary" style={{ fontSize: 12 }}>—</Text>
        const m = precio / costo
        const color = m >= 2 ? '#52c41a' : m >= 1.5 ? '#1677ff' : m >= 1 ? '#faad14' : '#ff4d4f'
        return (
          <Tooltip title={`${precio.toFixed(2)} UF ÷ ${(costo).toFixed(2)} UF`}>
            <Text strong style={{ fontSize: 13, color }}>{m.toFixed(2)}x</Text>
          </Tooltip>
        )
      }
    },
    {
      title: 'Estado', key: 'estado', width: 95,
      render: (_, v) => <Tag color={ESTADO_VENTA_COLOR[v.estado]} style={{ fontSize: 11 }}>{ESTADO_LABEL[v.estado]}</Tag>
    },
    {
      title: 'Reserva pagada', key: 'pagado', width: 120, align: 'center',
      render: (_, v) => {
        const cuota = v.planPago?.cuotas?.[0]
        if (!cuota) return <Text type="secondary" style={{ fontSize: 12 }}>Sin plan</Text>
        const pagado = cuota.estado === 'PAGADO'
        return (
          <div style={{ textAlign: 'center' }}>
            <Tag color={pagado ? 'green' : 'orange'} style={{ fontSize: 11 }}>
              {pagado ? 'Pagada' : 'Pendiente'}
            </Tag>
            {pagado && cuota.metodoPago && (
              <div style={{ fontSize: 11, color: '#8c8c8c', marginTop: 2 }}>
                {cuota.metodoPago.toLowerCase().replace('_', ' ')}
              </div>
            )}
          </div>
        )
      }
    },
    {
      title: 'Fecha reserva', key: 'fecha', width: 110,
      render: (_, v) => v.fechaReserva
        ? <Text type="secondary" style={{ fontSize: 12 }}>{format(new Date(v.fechaReserva), "d MMM yyyy", { locale: es })}</Text>
        : '—'
    },
  ]

  return (
    <Card
      title={`Ventas del período (${ventas.length})`}
      extra={totalUF > 0 && (
        <Text type="secondary" style={{ fontSize: 13 }}>
          Total: <Text strong>{totalUF.toLocaleString('es-CL', { minimumFractionDigits: 2 })} UF</Text>
          {ufAPesos(totalUF) && <Text type="secondary"> · {formatPesos(ufAPesos(totalUF))}</Text>}
        </Text>
      )}
    >
      <Table
        dataSource={ventas}
        columns={columns}
        rowKey="id"
        pagination={false}
        size="small"
        scroll={{ x: 1000 }}
        locale={{ emptyText: 'Sin ventas (reservas) en este período' }}
        onRow={(v) => ({ onClick: () => navigate(`/ventas/${v.id}`), style: { cursor: 'pointer' } })}
        rowHoverable
      />
    </Card>
  )
}

// ─── Ventas activas (en curso) ────────────────────────────────────
const LEGAL_LABEL = {
  FIRMA_CLIENTE_PROMESA:      'Firma cliente',
  FIRMA_INMOBILIARIA_PROMESA: 'Firma inmob.',
  ESCRITURA_LISTA:            'Escritura lista',
  FIRMADA_NOTARIA:            'Notaría',
  INSCRIPCION_CBR:            'CBR',
  ENTREGADO:                  'Entregado',
}
const PASOS_CON_PROMESA  = ['FIRMA_CLIENTE_PROMESA','FIRMA_INMOBILIARIA_PROMESA','ESCRITURA_LISTA','FIRMADA_NOTARIA','INSCRIPCION_CBR','ENTREGADO']
const PASOS_SIN_PROMESA  = ['ESCRITURA_LISTA','FIRMADA_NOTARIA','INSCRIPCION_CBR','ENTREGADO']
const FECHA_POR_PASO = {
  FIRMA_CLIENTE_PROMESA:      'fechaLimiteFirmaCliente',
  FIRMA_INMOBILIARIA_PROMESA: 'fechaLimiteFirmaInmob',
  ESCRITURA_LISTA:            'fechaLimiteEscritura',
  FIRMADA_NOTARIA:            'fechaLimiteFirmaNot',
  INSCRIPCION_CBR:            'fechaLimiteCBR',
  ENTREGADO:                  'fechaLimiteEntrega',
}

function TimelineLegal({ proceso }) {
  if (!proceso) return <Text type="secondary" style={{ fontSize: 12 }}>Sin proceso legal</Text>

  const pasos = proceso.tienePromesa === false ? PASOS_SIN_PROMESA : PASOS_CON_PROMESA
  const idx   = pasos.indexOf(proceso.estadoActual)

  const items = pasos.map((paso, i) => {
    const campo    = FECHA_POR_PASO[paso]
    const fecha    = campo && proceso[campo]
    const vencido  = fecha && i === idx && isPast(new Date(fecha)) && paso !== 'ENTREGADO'
    const completado = i < idx
    return {
      status: completado ? 'finish' : i === idx ? (vencido ? 'error' : 'process') : 'wait',
      title: <span style={{ fontSize: 11 }}>{LEGAL_LABEL[paso]}</span>,
      description: fecha ? (
        <span style={{ fontSize: 10, color: vencido ? '#ff4d4f' : completado ? '#52c41a' : '#8c8c8c' }}>
          {format(new Date(fecha), 'd MMM', { locale: es })}
        </span>
      ) : (
        i >= idx ? <span style={{ fontSize: 10, color: '#faad14' }}>Sin fecha</span> : null
      ),
    }
  })

  return (
    <div style={{ padding: '8px 0 4px' }}>
      <Steps size="small" current={idx} items={items} style={{ overflowX: 'auto' }} />
    </div>
  )
}

function ResumenPagos({ planPago }) {
  if (!planPago) return <Text type="secondary" style={{ fontSize: 12 }}>Sin plan</Text>

  const cuotas   = planPago.cuotas || []
  const total    = cuotas.length
  const pagadas  = cuotas.filter(c => c.estado === 'PAGADO').length
  const atrasadas = cuotas.filter(c => c.estado === 'ATRASADO' || (c.estado === 'PENDIENTE' && isPast(new Date(c.fechaVencimiento)))).length
  const pct      = total > 0 ? Math.round((pagadas / total) * 100) : 0

  // Próxima cuota pendiente
  const proxima = cuotas.find(c => c.estado === 'PENDIENTE')

  return (
    <div style={{ minWidth: 160 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <Text style={{ fontSize: 12 }}>
          {pagadas}/{total} cuotas
          {atrasadas > 0 && (
            <Tag color="red" style={{ fontSize: 10, marginLeft: 6, padding: '0 4px' }}>
              <WarningOutlined /> {atrasadas} atrasada{atrasadas > 1 ? 's' : ''}
            </Tag>
          )}
        </Text>
        {pagadas === total && (
          <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 13 }} />
        )}
      </div>
      <Progress
        percent={pct}
        size="small"
        showInfo={false}
        strokeColor={atrasadas > 0 ? '#ff4d4f' : pagadas === total ? '#52c41a' : '#1677ff'}
      />
      {proxima && (
        <div style={{ fontSize: 11, color: '#8c8c8c', marginTop: 3 }}>
          Próx: {proxima.montoUF?.toFixed(2)} UF · {format(new Date(proxima.fechaVencimiento), 'd MMM yyyy', { locale: es })}
        </div>
      )}
    </div>
  )
}

function TablaVentasActivas({ ventas }) {
  const navigate = useNavigate()

  const porEstado = {
    RESERVA:   ventas.filter(v => v.estado === 'RESERVA').length,
    PROMESA:   ventas.filter(v => v.estado === 'PROMESA').length,
    ESCRITURA: ventas.filter(v => v.estado === 'ESCRITURA').length,
  }

  const columns = [
    {
      title: 'Comprador / Unidad', key: 'info',
      render: (_, v) => (
        <div>
          <Text strong style={{ fontSize: 13 }}>{v.comprador?.nombre} {v.comprador?.apellido}</Text>
          <div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {v.unidades?.[0]?.edificio?.nombre} — {v.unidades?.[0]?.tipo === 'BODEGA' ? 'Bodega' : 'Est.'} {v.unidades?.[0]?.numero}
            </Text>
          </div>
          {v.vendedor && (
            <Text type="secondary" style={{ fontSize: 11 }}>{v.vendedor.nombre} {v.vendedor.apellido}</Text>
          )}
        </div>
      )
    },
    {
      title: 'Estado', key: 'estado', width: 100,
      render: (_, v) => <Tag color={ESTADO_VENTA_COLOR[v.estado]}>{ESTADO_LABEL[v.estado]}</Tag>
    },
    {
      title: 'Proceso legal', key: 'legal',
      render: (_, v) => <TimelineLegal proceso={v.procesoLegal} />
    },
    {
      title: 'Pagos', key: 'pagos', width: 200,
      render: (_, v) => <ResumenPagos planPago={v.planPago} />
    },
    {
      title: 'Reserva', key: 'fecha', width: 95,
      render: (_, v) => v.fechaReserva
        ? <Text type="secondary" style={{ fontSize: 12 }}>{format(new Date(v.fechaReserva), 'd MMM yyyy', { locale: es })}</Text>
        : '—'
    },
  ]

  return (
    <Card
      title={`Ventas en curso (${ventas.length})`}
      extra={
        <Space size={6}>
          {Object.entries(porEstado).map(([estado, n]) => n > 0 && (
            <Tag key={estado} color={ESTADO_VENTA_COLOR[estado]} style={{ margin: 0 }}>
              {ESTADO_LABEL[estado]}: {n}
            </Tag>
          ))}
        </Space>
      }
    >
      <Table
        dataSource={ventas}
        columns={columns}
        rowKey="id"
        pagination={false}
        size="small"
        locale={{ emptyText: 'Sin ventas activas' }}
        onRow={(v) => ({ onClick: () => navigate(`/ventas/${v.id}`), style: { cursor: 'pointer' } })}
        rowHoverable
      />
    </Card>
  )
}

function LegalWidget({ ventasActivas }) {
  const navigate = useNavigate()
  const ventasLegal = (ventasActivas || [])
    .filter(v => ['PROMESA', 'ESCRITURA'].includes(v.estado) && v.procesoLegal)
    .slice(0, 6)

  if (!ventasLegal.length) return (
    <div style={{ color: '#94a3b8', fontSize: 12, padding: '20px 0', textAlign: 'center' }}>Sin procesos legales activos</div>
  )

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
      <thead>
        <tr>
          <th style={{ background: '#f8fafc', padding: '5px 8px', fontWeight: 600, color: '#64748b', borderBottom: '1px solid #e2e8f0', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.6px', textAlign: 'left' }}>Comprador</th>
          <th style={{ background: '#f8fafc', padding: '5px 8px', fontWeight: 600, color: '#64748b', borderBottom: '1px solid #e2e8f0', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.6px', textAlign: 'left' }}>Paso actual</th>
          <th style={{ background: '#f8fafc', padding: '5px 8px', fontWeight: 600, color: '#64748b', borderBottom: '1px solid #e2e8f0', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.6px', textAlign: 'left' }}>Progreso</th>
        </tr>
      </thead>
      <tbody>
        {ventasLegal.map(v => {
          const pl = v.procesoLegal
          const pasos = pl.tienePromesa === false ? PASOS_SIN_PROMESA : PASOS_CON_PROMESA
          const idx = pasos.indexOf(pl.estadoActual)
          const campo = FECHA_POR_PASO[pl.estadoActual]
          const fecha = campo && pl[campo]
          const vencido = fecha && isPast(new Date(fecha)) && pl.estadoActual !== 'ENTREGADO'
          const sinFecha = !fecha && pl.estadoActual !== 'ENTREGADO'

          const badgeStyle = vencido
            ? { background: '#fef2f2', color: '#ef4444' }
            : sinFecha
            ? { background: '#f8fafc', color: '#94a3b8' }
            : fecha && new Date(fecha) - new Date() < 7 * 86400000
            ? { background: '#fffbeb', color: '#d97706' }
            : { background: '#eff6ff', color: '#1d4ed8' }

          const us = v.unidades || []
          const unidadLabel = us.length > 0
            ? us.map(u => `${u.tipo === 'BODEGA' ? 'Bodega' : 'Est.'} ${u.numero}`).join(', ')
            : '—'

          return (
            <tr key={v.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/ventas/${v.id}`)}>
              <td style={{ padding: '7px 8px', borderBottom: '1px solid #f8fafc' }}>
                <div style={{ fontWeight: 600, color: '#1e293b', fontSize: 11 }}>{v.comprador?.nombre} {v.comprador?.apellido}</div>
                <div style={{ color: '#94a3b8', fontSize: 9 }}>{unidadLabel}</div>
              </td>
              <td style={{ padding: '7px 8px', borderBottom: '1px solid #f8fafc' }}>
                <span style={{ ...badgeStyle, fontSize: 9, fontWeight: 600, padding: '2px 7px', borderRadius: 99, display: 'inline-block' }}>
                  {vencido ? '⚠ ' : ''}{LEGAL_LABEL[pl.estadoActual]}{fecha && !vencido ? ` · ${format(new Date(fecha), 'd MMM', { locale: es })}` : ''}
                </span>
              </td>
              <td style={{ padding: '7px 8px', borderBottom: '1px solid #f8fafc' }}>
                <div style={{ display: 'flex', gap: 2 }}>
                  {pasos.map((_, pi) => (
                    <div key={pi} style={{
                      height: 3, flex: 1, borderRadius: 99,
                      background: pi < idx ? '#1d4ed8' : pi === idx ? (vencido ? '#ef4444' : '#f59e0b') : '#e2e8f0'
                    }} />
                  ))}
                </div>
                <div style={{ fontSize: 8, color: '#94a3b8', marginTop: 2 }}>{idx + 1}/{pasos.length}</div>
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

function GraficoIngresosSemana({ datos }) {
  if (!datos?.length) return <div style={{ color: '#94a3b8', fontSize: 12, textAlign: 'center', padding: '20px 0' }}>Sin datos</div>
  const total = datos.reduce((s, d) => ({ vendido: s.vendido + d.vendidoUF, recolectado: s.recolectado + d.recolectadoUF }), { vendido: 0, recolectado: 0 })
  return (
    <div>
      <ResponsiveContainer width="100%" height={120}>
        <BarChart data={datos} barSize={14} barGap={2}>
          <XAxis dataKey="semana" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
          <YAxis hide />
          <RechartsTooltip
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

function GraficoVentasMes({ datos }) {
  if (!datos?.length) return null
  const mesActual = new Date().getMonth() + 1
  return (
    <ResponsiveContainer width="100%" height={120}>
      <BarChart data={datos} barSize={18}>
        <XAxis dataKey="nombre" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
        <YAxis hide allowDecimals={false} />
        <RechartsTooltip
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

function InventarioEdificios({ datos }) {
  if (!datos?.length) return <div style={{ color: '#94a3b8', fontSize: 12, textAlign: 'center', padding: '12px 0' }}>Sin datos</div>
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
      <thead>
        <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
          <th style={{ textAlign: 'left', padding: '4px 0', color: '#6b7280', fontWeight: 500 }}>Edificio</th>
          <th style={{ textAlign: 'right', padding: '4px 8px', color: '#16a34a', fontWeight: 600 }}>Disp.</th>
          <th style={{ textAlign: 'right', padding: '4px 8px', color: '#d97706', fontWeight: 600 }}>Reserv.</th>
          <th style={{ textAlign: 'right', padding: '4px 8px', color: '#dc2626', fontWeight: 600 }}>Vendido</th>
          <th style={{ textAlign: 'right', padding: '4px 0', color: '#9ca3af', fontWeight: 500 }}>Total</th>
        </tr>
      </thead>
      <tbody>
        {datos.map(e => (
          <tr key={e.edificio} style={{ borderBottom: '1px solid #f9fafb' }}>
            <td style={{ padding: '6px 0', fontWeight: 600, color: '#1e293b' }}>{e.edificio}</td>
            <td style={{ padding: '6px 8px', textAlign: 'right', color: '#16a34a', fontWeight: 700 }}>{e.disponible}</td>
            <td style={{ padding: '6px 8px', textAlign: 'right', color: '#d97706', fontWeight: 700 }}>{e.reservado}</td>
            <td style={{ padding: '6px 8px', textAlign: 'right', color: '#dc2626', fontWeight: 700 }}>{e.vendido}</td>
            <td style={{ padding: '6px 0', textAlign: 'right', color: '#6b7280' }}>{e.total}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

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
                    {tab === 'proximas' && v.fechaHora && ` · ${format(new Date(v.fechaHora), "d MMM HH:mm", { locale: es })}`}
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

export default function Dashboard() {
  const navigate = useNavigate()
  const [presetActivo, setPresetActivo] = useState('mes')
  const [rangoCustom, setRangoCustom] = useState(null)
  const [fechaParams, setFechaParams] = useState(() => calcPresetDates('mes'))

  const aplicarPreset = (key) => {
    setPresetActivo(key)
    setRangoCustom(null)
    setFechaParams(calcPresetDates(key))
  }

  const aplicarRango = (dates) => {
    setPresetActivo(null)
    setRangoCustom(dates)
    if (dates) {
      setFechaParams({
        desde: dates[0].startOf('day').toISOString(),
        hasta: dates[1].endOf('day').toISOString()
      })
    }
  }

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', fechaParams],
    queryFn: ({ queryKey }) => api.get('/dashboard', { params: queryKey[1] }).then(r => r.data)
  })

  const { valorUF, ufAPesos, formatPesos } = useUF()

  if (isLoading) return <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>

  const { resumen, embudo, unidadesPorEstado, ventasActivas } = data || {}
  const { kpis, ingresosPorSemana, ventasPorMes, leadsPorCampana,
          inventarioPorEdificio, visitasDelPeriodo, visitasProximas,
          cuotasPendientes, ventasRecientes: ventasPeriodo,
          procesoLegalPendiente } = data || {}

  // Helper comparación
  const calcPct = (actual, anterior) => {
    if (actual == null || !anterior) return null
    return Math.round(((actual - anterior) / anterior) * 100)
  }
  const totalUnidades = unidadesPorEstado?.reduce((s, u) => s + u._count.id, 0) || 1
  const unidadesOcupadas = unidadesPorEstado?.filter(u => u.estado !== 'DISPONIBLE').reduce((s, u) => s + u._count.id, 0) || 0
  const ocupacionPct = totalUnidades > 0 ? Math.round((unidadesOcupadas / totalUnidades) * 100) : 0
  const ventasEnLegal = (ventasActivas || []).filter(v => ['PROMESA', 'ESCRITURA'].includes(v.estado)).length
  const alertasLegal = (ventasActivas || []).filter(v => {
    const pl = v.procesoLegal
    if (!pl) return false
    const campo = FECHA_POR_PASO[pl.estadoActual]
    return campo && pl[campo] && isPast(new Date(pl[campo])) && pl.estadoActual !== 'ENTREGADO'
  }).length

  const hoy = format(new Date(), "EEEE d 'de' MMMM, yyyy", { locale: es })

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
      diff: (kpis?.ventas != null && kpis?.ventasAnterior != null) ? (kpis.ventas - kpis.ventasAnterior) : null,
      color: '#7c3aed',
    },
    {
      label: 'Unidades vendidas',
      value: kpis?.unidadesVendidas ?? 0,
      diff: (kpis?.unidadesVendidas != null && kpis?.unidadesVendidasAnterior != null) ? (kpis.unidadesVendidas - kpis.unidadesVendidasAnterior) : null,
      color: '#0891b2',
    },
    {
      label: 'Monto vendido',
      value: `${(kpis?.montoUF ?? 0).toLocaleString('es-CL', { minimumFractionDigits: 1 })} UF`,
      subValue: kpis?.montoUF && valorUF ? formatPesos(ufAPesos(kpis.montoUF)) : null,
      color: '#16a34a',
    },
  ]

  return (
    <div style={{ maxWidth: 1300 }}>
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 20, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.4px' }}>
          Dashboard
        </div>
        <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2, textTransform: 'capitalize' }}>{hoy}</div>
      </div>

      {/* Period tabs */}
      <div style={{ display: 'flex', gap: 3, background: '#f1f5f9', borderRadius: 8, padding: 3, marginBottom: 16, width: 'fit-content', flexWrap: 'wrap' }}>
        {PRESETS.map(p => (
          <div
            key={p.key}
            onClick={() => aplicarPreset(p.key)}
            style={{
              padding: '5px 12px', borderRadius: 6, cursor: 'pointer',
              fontSize: 11, fontWeight: presetActivo === p.key ? 600 : 500,
              color: presetActivo === p.key ? '#1d4ed8' : '#64748b',
              background: presetActivo === p.key ? '#fff' : 'transparent',
              boxShadow: presetActivo === p.key ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.15s',
            }}
          >{p.label}</div>
        ))}
        <DatePicker.RangePicker
          size="small"
          value={rangoCustom}
          onChange={aplicarRango}
          placeholder={['Desde', 'Hasta']}
          allowClear
          style={{ marginLeft: 4, height: 28 }}
        />
      </div>

      {/* 3 KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 16 }}>
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

      {/* Leads por campaña */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 14, marginBottom: 16 }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 10 }}>Leads por campaña</div>
        <TablaCampanas datos={leadsPorCampana} />
      </div>

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

      {/* Inventario por edificio */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 14, marginBottom: 16 }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 12 }}>Inventario por propiedad</div>
        <InventarioEdificios datos={inventarioPorEdificio} />
      </div>

      {/* Tabla de ventas del período */}
      <TablaVentas ventas={ventasPeriodo || []} />
    </div>
  )
}
