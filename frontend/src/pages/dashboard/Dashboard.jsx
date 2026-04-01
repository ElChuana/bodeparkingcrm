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

const { Title, Text } = Typography

const ESTADO_LABEL = { RESERVA: 'Reserva', PROMESA: 'Promesa', ESCRITURA: 'Escritura', ENTREGADO: 'Entregado', ANULADO: 'Anulado' }

const COLORES_EMBUDO = ['#1677ff', '#4096ff', '#69b1ff', '#91caff', '#bae0ff']

const DESC_EMBUDO = [
  'Leads creados en el período',
  'Leads que avanzaron a Seguimiento o más',
  'Leads que agendaron o realizaron visita',
  'Ventas con fecha de reserva en el período',
  'Ventas con escritura firmada en el período',
]

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

function EmbudoVisual({ datos }) {
  if (!datos?.length) return null
  const max = datos[0]?.cantidad || 1

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 4 }}>
      {datos.map((paso, i) => {
        const pct = max > 0 ? (paso.cantidad / max) * 100 : 0
        const convPct = i > 0 && datos[i - 1].cantidad > 0
          ? Math.round((paso.cantidad / datos[i - 1].cantidad) * 100)
          : null

        return (
          <div key={paso.paso}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 3 }}>
              <div>
                <Text strong style={{ fontSize: 13 }}>{paso.paso}</Text>
                <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 1 }}>
                  {DESC_EMBUDO[i]}
                </Text>
              </div>
              <Space size={8} style={{ flexShrink: 0, marginLeft: 8 }}>
                {convPct !== null && (
                  <Tag color={convPct >= 50 ? 'green' : convPct >= 25 ? 'orange' : 'red'} style={{ fontSize: 11, margin: 0 }}>
                    {convPct}%
                  </Tag>
                )}
                <Text strong style={{ fontSize: 14, minWidth: 28, textAlign: 'right' }}>{paso.cantidad}</Text>
              </Space>
            </div>
            <div style={{ height: 22, background: '#f0f0f0', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{
                width: `${pct}%`,
                height: '100%',
                background: COLORES_EMBUDO[i],
                borderRadius: 4,
                transition: 'width 0.5s ease',
                minWidth: paso.cantidad > 0 ? 4 : 0,
              }} />
            </div>
          </div>
        )
      })}
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

export default function Dashboard() {
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

  return (
    <div style={{ maxWidth: 1300 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <Title level={4} style={{ margin: 0 }}>Dashboard</Title>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <Text type="secondary" style={{ fontSize: 12 }}>Período:</Text>
          {PRESETS.map(p => (
            <Button
              key={p.key}
              size="small"
              type={presetActivo === p.key ? 'primary' : 'default'}
              onClick={() => aplicarPreset(p.key)}
            >
              {p.label}
            </Button>
          ))}
          <DatePicker.RangePicker
            size="small"
            value={rangoCustom}
            onChange={aplicarRango}
            placeholder={['Desde', 'Hasta']}
            allowClear
            style={{ width: 210 }}
          />
        </div>
      </div>

      {/* Stats */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={12} lg={12}>
          <Card>
            <Statistic title="Leads ingresados" value={resumen?.totalLeads || 0}
              prefix={<TeamOutlined style={{ color: '#1677ff' }} />} />
          </Card>
        </Col>
        <Col xs={12} lg={12}>
          <Card>
            <Statistic title="Notificaciones sin leer" value={resumen?.notificacionesSinLeer || 0}
              prefix={<BellOutlined style={{ color: '#1677ff' }} />} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} lg={14}>
          <Card title="Embudo de conversión" style={{ height: '100%' }}>
            <EmbudoVisual datos={embudo} />
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card title="Inventario" style={{ height: '100%' }}>
            {!unidadesPorEstado?.length ? (
              <div style={{ textAlign: 'center', color: '#aaa', padding: '40px 0' }}>Sin unidades</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 4 }}>
                {unidadesPorEstado.map(u => (
                  <div key={u.estado}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 13, textTransform: 'capitalize' }}>
                        {u.estado.toLowerCase().replace('_', ' ')}
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{u._count.id}</span>
                    </div>
                    <Progress
                      percent={Math.round((u._count.id / totalUnidades) * 100)}
                      showInfo={false}
                      strokeColor={
                        u.estado === 'DISPONIBLE' ? '#52c41a' :
                        u.estado === 'RESERVADO'  ? '#faad14' :
                        u.estado === 'VENDIDO'    ? '#ff4d4f' : '#1677ff'
                      }
                      size="small"
                    />
                  </div>
                ))}
              </div>
            )}
          </Card>
        </Col>
      </Row>

      {/* Tabla de ventas del período */}
      <TablaVentas ventas={ventasRecientes || []} />

      {/* Ventas activas */}
      <div style={{ marginTop: 20 }}>
        <TablaVentasActivas ventas={ventasActivas || []} />
      </div>
    </div>
  )
}
