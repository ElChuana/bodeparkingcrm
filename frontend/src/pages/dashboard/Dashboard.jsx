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

const ANCHOS_EMBUDO = ['100%', '90%', '78%', '64%', '50%', '36%']
const COLORES_TRAPECIO = ['#1d4ed8', '#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe']

function EmbudoVisual({ datos }) {
  if (!datos?.length) return <div style={{ color: '#94a3b8', fontSize: 12, padding: '20px 0', textAlign: 'center' }}>Sin datos</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
      {datos.map((paso, i) => {
        const convPct = i > 0 && datos[i - 1].cantidad > 0
          ? Math.round((paso.cantidad / datos[i - 1].cantidad) * 100)
          : null
        const esUltimo = i === datos.length - 1
        const textColor = i >= 5 ? '#1e3a8a' : '#fff'
        const subTextColor = i >= 5 ? 'rgba(30,58,138,0.7)' : 'rgba(255,255,255,0.75)'

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

  const totalUF     = ventas.reduce((s, v) => s + (v.precioFinalUF || 0), 0)
  const totalCosto  = ventas.reduce((s, v) => s + (v.unidades?.reduce((cs, u) => cs + (u.precioCostoUF || 0), 0) || 0), 0)
  const totalMultiplo = totalCosto > 0 ? totalUF / totalCosto : null

  const columns = [
    {
      title: 'Vendedor', key: 'vendedor', width: 130,
      render: (_, v) => v.vendedor
        ? <Text style={{ fontSize: 12 }}>{v.vendedor.nombre} {v.vendedor.apellido}</Text>
        : <Text type="secondary" style={{ fontSize: 12 }}>—</Text>
    },
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
      render: (_, v) => {
        const costo = v.unidades?.reduce((s, u) => s + (u.precioCostoUF || 0), 0) || 0
        return costo > 0
          ? <Text style={{ fontSize: 12, color: '#8c8c8c' }}>{costo.toLocaleString('es-CL', { minimumFractionDigits: 2 })} UF</Text>
          : <Text type="secondary" style={{ fontSize: 12 }}>—</Text>
      }
    },
    {
      title: 'Múltiplo', key: 'multiplo', width: 85, align: 'center',
      render: (_, v) => {
        const precio = v.precioFinalUF || 0
        const costo  = v.unidades?.reduce((s, u) => s + (u.precioCostoUF || 0), 0) || 0
        if (!costo || !precio) return <Text type="secondary" style={{ fontSize: 12 }}>—</Text>
        const m = precio / costo
        const color = m >= 2 ? '#52c41a' : m >= 1.5 ? '#1677ff' : m >= 1 ? '#faad14' : '#ff4d4f'
        return (
          <Tooltip title={`${precio.toFixed(2)} UF ÷ ${costo.toFixed(2)} UF`}>
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
        scroll={{ x: 1100 }}
        locale={{ emptyText: 'Sin ventas (reservas) en este período' }}
        onRow={(v) => ({ onClick: () => navigate(`/ventas/${v.id}`), style: { cursor: 'pointer' } })}
        rowHoverable
        summary={() => ventas.length > 0 && (
          <Table.Summary.Row style={{ background: '#f8fafc', fontWeight: 600 }}>
            <Table.Summary.Cell index={0} colSpan={4}>
              <Text strong style={{ fontSize: 12 }}>Totales ({ventas.length} ventas)</Text>
            </Table.Summary.Cell>
            <Table.Summary.Cell index={4} align="right">
              <Text strong style={{ fontSize: 12 }}>{totalUF.toLocaleString('es-CL', { minimumFractionDigits: 2 })} UF</Text>
            </Table.Summary.Cell>
            <Table.Summary.Cell index={5} align="right">
              <Text style={{ fontSize: 12 }}>{ufAPesos(totalUF) ? formatPesos(ufAPesos(totalUF)) : '—'}</Text>
            </Table.Summary.Cell>
            <Table.Summary.Cell index={6} align="right">
              <Text style={{ fontSize: 12, color: '#8c8c8c' }}>{totalCosto > 0 ? `${totalCosto.toLocaleString('es-CL', { minimumFractionDigits: 2 })} UF` : '—'}</Text>
            </Table.Summary.Cell>
            <Table.Summary.Cell index={7} align="center">
              {totalMultiplo != null
                ? <Text strong style={{ fontSize: 13, color: totalMultiplo >= 2 ? '#52c41a' : totalMultiplo >= 1.5 ? '#1677ff' : '#faad14' }}>{totalMultiplo.toFixed(2)}x</Text>
                : '—'}
            </Table.Summary.Cell>
            <Table.Summary.Cell index={8} colSpan={3} />
          </Table.Summary.Row>
        )}
      />
    </Card>
  )
}

// ─── Ventas activas (en curso) ────────────────────────────────────
const LEGAL_LABEL = {
  CONFECCION_PROMESA:           'Confec. promesa',
  FIRMA_CLIENTE_PROMESA:        'Firma cliente',
  FIRMA_INMOBILIARIA_PROMESA:   'Firma inmob.',
  CONFECCION_ESCRITURA:         'Confec. escritura',
  FIRMA_CLIENTE_ESCRITURA:      'Firma cliente',
  FIRMA_INMOBILIARIA_ESCRITURA: 'Firma inmob.',
  INSCRIPCION_CBR:              'CBR',
  ENTREGADO:                    'Entregado',
}
const PASOS_CON_PROMESA = ['CONFECCION_PROMESA','FIRMA_CLIENTE_PROMESA','FIRMA_INMOBILIARIA_PROMESA','CONFECCION_ESCRITURA','FIRMA_CLIENTE_ESCRITURA','FIRMA_INMOBILIARIA_ESCRITURA','INSCRIPCION_CBR','ENTREGADO']
const PASOS_SIN_PROMESA = ['CONFECCION_ESCRITURA','FIRMA_CLIENTE_ESCRITURA','FIRMA_INMOBILIARIA_ESCRITURA','INSCRIPCION_CBR','ENTREGADO']
const FECHA_POR_PASO = {
  CONFECCION_PROMESA:           'fechaLimiteConfeccionPromesa',
  FIRMA_CLIENTE_PROMESA:        'fechaLimiteFirmaCliente',
  FIRMA_INMOBILIARIA_PROMESA:   'fechaLimiteFirmaInmob',
  CONFECCION_ESCRITURA:         'fechaLimiteEscritura',
  FIRMA_CLIENTE_ESCRITURA:      'fechaLimiteFirmaNot',
  FIRMA_INMOBILIARIA_ESCRITURA: 'fechaLimiteFirmaInmobEscritura',
  INSCRIPCION_CBR:              'fechaLimiteCBR',
  ENTREGADO:                    'fechaLimiteEntrega',
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

const KANBAN_PASOS = [
  { key: 'CONFECCION_PROMESA',          label: 'Confec. promesa',   color: '#3b82f6', fondo: '#eff6ff', borde: '#bfdbfe' },
  { key: 'FIRMA_CLIENTE_PROMESA',       label: 'Firma cliente',     color: '#2563eb', fondo: '#dbeafe', borde: '#93c5fd' },
  { key: 'FIRMA_INMOBILIARIA_PROMESA',  label: 'Firma inmob.',      color: '#7c3aed', fondo: '#f5f3ff', borde: '#ddd6fe' },
  { key: 'CONFECCION_ESCRITURA',        label: 'Confec. escritura', color: '#d97706', fondo: '#fffbeb', borde: '#fde68a' },
  { key: 'FIRMA_CLIENTE_ESCRITURA',     label: 'Firma cliente',     color: '#ec4899', fondo: '#fdf2f8', borde: '#fbcfe8' },
  { key: 'FIRMA_INMOBILIARIA_ESCRITURA',label: 'Firma inmob.',      color: '#be185d', fondo: '#fdf2f8', borde: '#f9a8d4' },
  { key: 'INSCRIPCION_CBR',             label: 'CBR',               color: '#10b981', fondo: '#ecfdf5', borde: '#a7f3d0' },
  { key: 'ENTREGADO',                   label: 'Entregado',         color: '#22c55e', fondo: '#f0fdf4', borde: '#bbf7d0' },
]

function urgencia(fecha) {
  if (!fecha) return 'ok'
  const d = new Date(fecha)
  if (isPast(d)) return 'vencido'
  if (d - new Date() < 7 * 86400000) return 'proximo'
  return 'ok'
}

const URG_COLOR = { vencido: '#ef4444', proximo: '#f59e0b', ok: '#3b82f6' }
const URG_LABEL = { vencido: '⚠ Vence', proximo: '⏰ Vence', ok: '📅 Vence' }

function KanbanLegal({ ventasActivas }) {
  const navigate = useNavigate()
  const ventas = (ventasActivas || []).filter(v => v.procesoLegal)

  const porPaso = {}
  for (const p of KANBAN_PASOS) porPaso[p.key] = []

  for (const v of ventas) {
    const paso = v.procesoLegal?.estadoActual
    if (porPaso[paso]) porPaso[paso].push(v)
  }

  const entregados = porPaso['ENTREGADO'] || []

  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 0, minWidth: 860 }}>
        {KANBAN_PASOS.map((paso, idx) => {
          const cards = porPaso[paso.key] || []
          const esEntregado = paso.key === 'ENTREGADO'
          return (
            <div key={paso.key} style={{ display: 'flex', alignItems: 'flex-start', flex: 1, minWidth: 120 }}>
              <div style={{ flex: 1 }}>
                {/* Header columna */}
                <div
                  style={{
                    background: paso.color, color: 'white', padding: '7px 10px',
                    borderRadius: idx === 0 ? '8px 0 0 0' : idx === KANBAN_PASOS.length - 1 ? '0 8px 0 0' : 0,
                    textAlign: 'center',
                    cursor: esEntregado ? 'pointer' : 'default',
                  }}
                  onClick={esEntregado ? () => navigate('/ventas?estado=ENTREGADO') : undefined}
                  title={esEntregado ? 'Ver ventas entregadas →' : undefined}
                >
                  <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', opacity: 0.85 }}>{paso.label}</div>
                  <div style={{ fontSize: 20, fontWeight: 800, lineHeight: 1.1 }}>{cards.length}</div>
                </div>

                {/* Cuerpo columna */}
                <div style={{
                  background: paso.fondo, border: `1px solid ${paso.borde}`, borderTop: 'none',
                  borderRadius: idx === 0 ? '0 0 0 8px' : idx === KANBAN_PASOS.length - 1 ? '0 0 8px 0' : 0,
                  padding: 8, minHeight: 120,
                  display: 'flex', flexDirection: 'column', gap: 6,
                  alignItems: esEntregado ? 'center' : undefined,
                  justifyContent: (esEntregado || cards.length === 0) ? 'center' : undefined,
                }}>
                  {esEntregado ? (
                    <div
                      style={{ color: '#16a34a', fontSize: 11, fontWeight: 600, textAlign: 'center', cursor: 'pointer' }}
                      onClick={() => navigate('/ventas?estado=ENTREGADO')}
                    >
                      ✓ {cards.length} completados
                    </div>
                  ) : cards.length === 0 ? (
                    <div style={{ color: '#94a3b8', fontSize: 10, textAlign: 'center' }}>Sin ventas</div>
                  ) : (
                    cards.map(v => {
                      const pl = v.procesoLegal
                      const campo = FECHA_POR_PASO[paso.key]
                      const fecha = campo && pl[campo]
                      const urg = urgencia(fecha)
                      const unidad = v.unidades?.[0]
                      return (
                        <div
                          key={v.id}
                          onClick={() => navigate(`/ventas/${v.id}`)}
                          style={{
                            background: 'white', borderRadius: 6, padding: '7px 8px',
                            borderLeft: `3px solid ${URG_COLOR[urg]}`,
                            boxShadow: '0 1px 3px rgba(0,0,0,0.06)', cursor: 'pointer',
                          }}
                        >
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#1e293b' }}>
                            {v.comprador?.nombre} {v.comprador?.apellido}
                          </div>
                          <div style={{ fontSize: 10, color: '#64748b', marginTop: 1 }}>
                            {unidad?.edificio?.nombre} · {unidad?.tipo === 'BODEGA' ? 'Bodega' : 'Est.'} {unidad?.numero}
                          </div>
                          <div style={{ fontSize: 10, color: URG_COLOR[urg], fontWeight: 600, marginTop: 2 }}>
                            {fecha ? `${URG_LABEL[urg]} ${format(new Date(fecha), 'd MMM', { locale: es })}` : 'Sin fecha'}
                          </div>
                          <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 1 }}>
                            {v.vendedor?.nombre} {v.vendedor?.apellido}
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>

              {/* Flecha entre columnas */}
              {idx < KANBAN_PASOS.length - 1 && (
                <div style={{ display: 'flex', alignItems: 'center', paddingTop: 22, color: '#94a3b8', fontSize: 18, flexShrink: 0 }}>→</div>
              )}
            </div>
          )
        })}
      </div>

      {/* Leyenda */}
      <div style={{ display: 'flex', gap: 16, marginTop: 10, paddingTop: 8, borderTop: '1px solid #e2e8f0' }}>
        {[['#ef4444','Vencido'],['#f59e0b','Vence <7 días'],['#3b82f6','OK']].map(([c, label]) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: '#64748b' }}>
            <div style={{ width: 10, height: 10, background: c, borderRadius: 2 }} />
            {label}
          </div>
        ))}
      </div>
    </div>
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
          formatter={(v) => [v, 'Unidades']}
        />
        <Bar dataKey="cantidadUnidades" radius={[3,3,0,0]}>
          {datos.map(entry => (
            <Cell key={entry.mes} fill={entry.mes === mesActual ? '#1d4ed8' : '#c7d2fe'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

function GraficoLeadsSemana({ datos }) {
  if (!datos?.length) return <div style={{ color: '#94a3b8', fontSize: 12, textAlign: 'center', padding: '20px 0' }}>Sin datos</div>
  const total = datos.reduce((s, d) => s + d.leads, 0)
  return (
    <div>
      <ResponsiveContainer width="100%" height={120}>
        <BarChart data={datos} barSize={18}>
          <XAxis dataKey="semana" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
          <YAxis hide allowDecimals={false} />
          <RechartsTooltip
            contentStyle={{ fontSize: 11, borderRadius: 6 }}
            formatter={(v) => [v, 'Leads']}
          />
          <Bar dataKey="leads" fill="#7c3aed" radius={[3,3,0,0]} />
        </BarChart>
      </ResponsiveContainer>
      <div style={{ fontSize: 11, marginTop: 4 }}>
        <span><span style={{ color: '#7c3aed' }}>■</span> Total período: <strong>{total}</strong></span>
      </div>
    </div>
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

function ResumenCampanas({ datos }) {
  if (!datos?.length) return <div style={{ color: '#94a3b8', fontSize: 12, textAlign: 'center', padding: '12px 0' }}>Sin datos de campañas</div>
  const max = Math.max(...datos.map(d => d.total))
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {datos.map((row, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 180, fontSize: 11, color: '#374151', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flexShrink: 0 }}>
            {row.campana}
          </div>
          <div style={{ flex: 1, background: '#f1f5f9', borderRadius: 4, height: 18, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 4,
              background: row.campana === 'Sin campaña' ? '#e2e8f0' : '#3b82f6',
              width: `${Math.round((row.total / max) * 100)}%`,
              minWidth: 4,
              transition: 'width 0.3s',
            }} />
          </div>
          <div style={{ width: 36, textAlign: 'right', fontSize: 12, fontWeight: 700, color: '#1e293b', flexShrink: 0 }}>
            {row.total}
          </div>
        </div>
      ))}
      <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 4 }}>
        Total: <strong style={{ color: '#374151' }}>{datos.reduce((s, r) => s + r.total, 0)}</strong> leads · {datos.filter(r => r.campana !== 'Sin campaña').length} campañas
      </div>
    </div>
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
            const contacto     = v.lead?.contacto
            const edificioNombre = v.edificio?.nombre || v.lead?.unidadInteres?.edificio?.nombre
            const unidad       = v.lead?.unidadInteres
            const prop = edificioNombre
              ? unidad
                ? `${edificioNombre} · ${unidad.tipo === 'BODEGA' ? 'Bodega' : 'Est.'} ${unidad.numero}`
                : edificioNombre
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
  const { kpis, ventasPorMes, leadsPorSemana,
          inventarioPorEdificio, visitasDelPeriodo, visitasProximas,
          ventasRecientes: ventasPeriodo, resumenCampanas } = data || {}

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

      {/* Tabla de ventas del período */}
      <div style={{ marginBottom: 16 }}>
        <TablaVentas ventas={ventasPeriodo || []} />
      </div>

      {/* Gráficos: ventas unidades + leads por semana */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 10 }}>Ventas por mes {new Date().getFullYear()} (unidades)</div>
          <GraficoVentasMes datos={ventasPorMes} />
        </div>
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 10 }}>Leads por semana {new Date().getFullYear()}</div>
          <GraficoLeadsSemana datos={leadsPorSemana} />
        </div>
      </div>

      {/* Embudo — cuadro completo */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 14, marginBottom: 16 }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 12 }}>Embudo de ventas</div>
        <EmbudoVisual datos={embudo} />
      </div>

      {/* Visitas */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 14, marginBottom: 16 }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 10 }}>Visitas</div>
        <SeccionVisitas delPeriodo={visitasDelPeriodo} proximas={visitasProximas} />
      </div>

      {/* Kanban Legal — card grande */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 14, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Proceso legal</div>
          <span onClick={() => navigate('/legal')} style={{ fontSize: 9, color: '#3b82f6', fontWeight: 500, cursor: 'pointer' }}>Ver legal →</span>
        </div>
        <KanbanLegal ventasActivas={ventasActivas} />
      </div>

      {/* Inventario por edificio */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 14, marginBottom: 16 }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 12 }}>Inventario por propiedad</div>
        <InventarioEdificios datos={inventarioPorEdificio} />
      </div>

      {/* Resumen de campañas */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 14, marginBottom: 16 }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 12 }}>
          Leads por campaña — histórico total
        </div>
        <ResumenCampanas datos={resumenCampanas} />
      </div>
    </div>
  )
}
