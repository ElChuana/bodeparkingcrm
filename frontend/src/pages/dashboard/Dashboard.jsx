import { useState } from 'react'
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

  const totalUF = ventas.reduce((s, v) => s + (v.precioUF - (v.descuentoUF || 0)), 0)

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
          <Text strong style={{ fontSize: 12 }}>{v.unidad?.numero}</Text>
          <div><Text type="secondary" style={{ fontSize: 11 }}>
            {v.unidad?.tipo === 'BODEGA' ? 'Bodega' : 'Est.'}
          </Text></div>
        </div>
      )
    },
    {
      title: 'Proyecto', key: 'proyecto',
      render: (_, v) => <Text style={{ fontSize: 12 }}>{v.unidad?.edificio?.nombre || '—'}</Text>
    },
    {
      title: 'Valor UF', key: 'uf', width: 100, align: 'right',
      render: (_, v) => {
        const precio = v.precioUF - (v.descuentoUF || 0)
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
        const precio = v.precioUF - (v.descuentoUF || 0)
        const clp = ufAPesos(precio)
        return clp
          ? <Text style={{ fontSize: 12 }}>{formatPesos(clp)}</Text>
          : <Text type="secondary" style={{ fontSize: 12 }}>—</Text>
      }
    },
    {
      title: 'Costo UF', key: 'costo', width: 95, align: 'right',
      render: (_, v) => v.unidad?.precioCostoUF
        ? <Text style={{ fontSize: 12, color: '#8c8c8c' }}>{v.unidad.precioCostoUF.toLocaleString('es-CL', { minimumFractionDigits: 2 })} UF</Text>
        : <Text type="secondary" style={{ fontSize: 12 }}>—</Text>
    },
    {
      title: 'Múltiplo', key: 'multiplo', width: 85, align: 'center',
      render: (_, v) => {
        const precio = v.precioUF - (v.descuentoUF || 0)
        const costo  = v.unidad?.precioCostoUF
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
              {v.unidad?.edificio?.nombre} — {v.unidad?.tipo === 'BODEGA' ? 'Bodega' : 'Est.'} {v.unidad?.numero}
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

  if (isLoading) return <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>

  const { resumen, embudo, unidadesPorEstado, ventasRecientes, ventasActivas } = data || {}
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

  const STAT_CARDS = [
    {
      label: 'Ventas del período',
      value: ventasRecientes?.length || 0,
      hint: `${(ventasActivas || []).filter(v => v.estado === 'RESERVA').length} en reserva`,
      highlight: true,
    },
    {
      label: 'Leads activos',
      value: resumen?.totalLeads || 0,
      hint: `${resumen?.notificacionesSinLeer || 0} notif. sin leer`,
    },
    {
      label: 'Ocupación',
      value: `${ocupacionPct}%`,
      hint: `${unidadesOcupadas} de ${totalUnidades} unidades`,
    },
    {
      label: 'En proceso legal',
      value: ventasEnLegal,
      hint: alertasLegal > 0 ? `${alertasLegal} con fechas vencidas` : 'Sin alertas',
      hintColor: alertasLegal > 0 ? '#f59e0b' : '#10b981',
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

      {/* 4 Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 16 }}>
        {STAT_CARDS.map((s, i) => (
          <div key={i} style={{
            background: s.highlight ? 'linear-gradient(135deg, #1d4ed8, #3b82f6)' : '#fff',
            border: s.highlight ? 'none' : '1px solid #e2e8f0',
            borderRadius: 10, padding: 14,
          }}>
            <div style={{ fontSize: 9, fontWeight: 600, color: s.highlight ? 'rgba(255,255,255,0.65)' : '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 6 }}>
              {s.label}
            </div>
            <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 26, fontWeight: 800, color: s.highlight ? '#fff' : '#0f172a', lineHeight: 1 }}>
              {s.value}
            </div>
            <div style={{ fontSize: 10, color: s.highlight ? 'rgba(255,255,255,0.75)' : (s.hintColor || '#10b981'), marginTop: 4 }}>
              {s.hint}
            </div>
          </div>
        ))}
      </div>

      {/* Embudo + Legal */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 14, marginBottom: 16 }}>
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Embudo de ventas</div>
          </div>
          <EmbudoVisual datos={embudo} />
        </div>
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Proceso legal</div>
            <span onClick={() => navigate('/legal')} style={{ fontSize: 9, color: '#3b82f6', fontWeight: 500, cursor: 'pointer' }}>Ver legal →</span>
          </div>
          <LegalWidget ventasActivas={ventasActivas} />
        </div>
      </div>

      {/* Inventario */}
      <Card title="Inventario" size="small" style={{ marginBottom: 16 }}>
        {!unidadesPorEstado?.length ? (
          <div style={{ textAlign: 'center', color: '#aaa', padding: '20px 0' }}>Sin unidades</div>
        ) : (
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {unidadesPorEstado.map(u => (
              <div key={u.estado} style={{ minWidth: 120 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, textTransform: 'capitalize' }}>{u.estado.toLowerCase().replace('_', ' ')}</span>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>{u._count.id}</span>
                </div>
                <Progress
                  percent={Math.round((u._count.id / totalUnidades) * 100)}
                  showInfo={false}
                  strokeColor={u.estado === 'DISPONIBLE' ? '#52c41a' : u.estado === 'RESERVADO' ? '#faad14' : u.estado === 'VENDIDO' ? '#ef4444' : '#1677ff'}
                  size="small"
                />
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Tabla de ventas del período */}
      <TablaVentas ventas={ventasRecientes || []} />

      {/* Ventas activas */}
      <div style={{ marginTop: 16 }}>
        <TablaVentasActivas ventas={ventasActivas || []} />
      </div>
    </div>
  )
}
