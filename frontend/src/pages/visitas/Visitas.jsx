import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Table, Tag, Typography, Select, Space, DatePicker,
  Button, Tabs, Calendar, Badge, Tooltip
} from 'antd'
import { useNavigate } from 'react-router-dom'
import { CalendarOutlined, UnorderedListOutlined, LeftOutlined, RightOutlined } from '@ant-design/icons'
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns'
import { es } from 'date-fns/locale'
import dayjs from 'dayjs'
import api from '../../services/api'

const { Title, Text } = Typography
const { RangePicker } = DatePicker

const RESULTADO_COLOR = {
  POSITIVO: 'green', positivo: 'green',
  NEGATIVO: 'red',   negativo: 'red',
  PENDIENTE: 'default', pendiente: 'default',
}

const TIPO_COLOR = {
  LLAMADA: '#1677ff', EMAIL: '#722ed1', WHATSAPP: '#52c41a',
  REUNION: '#fa8c16', NOTA: '#8c8c8c',
}
const TIPO_BADGE = {
  LLAMADA: 'processing', EMAIL: 'error', WHATSAPP: 'success',
  REUNION: 'warning', NOTA: 'default',
}

// ─── Vista Calendario ─────────────────────────────────────────────
function VistaCalendario({ vendedorId, edificioId }) {
  const [mesActual, setMesActual] = useState(new Date())

  const desde = startOfMonth(mesActual).toISOString()
  const hasta  = endOfMonth(mesActual).toISOString()

  const { data: visitas = [] } = useQuery({
    queryKey: ['visitas-cal', desde, hasta, vendedorId, edificioId],
    queryFn: () => api.get('/visitas', {
      params: {
        desde, hasta,
        ...(vendedorId && { vendedorId }),
        ...(edificioId && { edificioId })
      }
    }).then(r => r.data)
  })

  const { data: actividades = [] } = useQuery({
    queryKey: ['actividades-cal', desde, hasta, vendedorId],
    queryFn: () => api.get('/interacciones', {
      params: {
        desde, hasta,
        ...(vendedorId && { usuarioId: vendedorId })
      }
    }).then(r => r.data)
  })

  // Agrupar por fecha ISO (YYYY-MM-DD)
  const eventosPorDia = useMemo(() => {
    const mapa = {}

    for (const v of visitas) {
      const dia = format(new Date(v.fechaHora), 'yyyy-MM-dd')
      if (!mapa[dia]) mapa[dia] = []
      mapa[dia].push({
        tipo: 'visita',
        hora: format(new Date(v.fechaHora), 'HH:mm'),
        label: `${v.lead?.contacto?.nombre} ${v.lead?.contacto?.apellido}`,
        subtitulo: v.edificio?.nombre || v.tipo,
        color: '#fa8c16',
        leadId: v.lead?.id,
        resultado: v.resultado,
      })
    }

    for (const a of actividades) {
      const dia = format(new Date(a.fecha), 'yyyy-MM-dd')
      if (!mapa[dia]) mapa[dia] = []
      mapa[dia].push({
        tipo: 'actividad',
        hora: format(new Date(a.fecha), 'HH:mm'),
        label: `${a.lead?.contacto?.nombre} ${a.lead?.contacto?.apellido}`,
        subtitulo: a.tipo,
        color: TIPO_COLOR[a.tipo] || '#8c8c8c',
        badgeStatus: TIPO_BADGE[a.tipo] || 'default',
        leadId: a.lead?.id,
      })
    }

    // Ordenar cada día por hora
    for (const dia of Object.keys(mapa)) {
      mapa[dia].sort((a, b) => a.hora.localeCompare(b.hora))
    }

    return mapa
  }, [visitas, actividades])

  const navigate = useNavigate()

  const cellRender = (current, info) => {
    if (info.type !== 'date') return info.originNode
    const dia = current.format('YYYY-MM-DD')
    const eventos = eventosPorDia[dia] || []
    if (eventos.length === 0) return null

    return (
      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {eventos.slice(0, 3).map((ev, i) => (
          <li key={i}
            style={{ cursor: ev.leadId ? 'pointer' : 'default', marginBottom: 1 }}
            onClick={ev.leadId ? (e) => { e.stopPropagation(); navigate(`/leads/${ev.leadId}`) } : undefined}
          >
            <Tooltip title={`${ev.hora} · ${ev.label}${ev.subtitulo ? ` · ${ev.subtitulo}` : ''}`}>
              <Badge
                status={ev.tipo === 'visita' ? 'warning' : (TIPO_BADGE[ev.subtitulo] || 'default')}
                text={
                  <span style={{ fontSize: 11, color: ev.color }}>
                    {ev.hora} {ev.label}
                  </span>
                }
              />
            </Tooltip>
          </li>
        ))}
        {eventos.length > 3 && (
          <li style={{ fontSize: 11, color: '#8c8c8c' }}>+{eventos.length - 3} más</li>
        )}
      </ul>
    )
  }

  return (
    <div>
      {/* Navegación de mes */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <Button size="small" icon={<LeftOutlined />} onClick={() => setMesActual(subMonths(mesActual, 1))} />
        <Text strong style={{ fontSize: 15, minWidth: 160, textAlign: 'center' }}>
          {format(mesActual, 'MMMM yyyy', { locale: es })}
        </Text>
        <Button size="small" icon={<RightOutlined />} onClick={() => setMesActual(addMonths(mesActual, 1))} />
        <Button size="small" onClick={() => setMesActual(new Date())}>Hoy</Button>
        <Space size={4} style={{ marginLeft: 8 }}>
          <Badge status="warning" text={<Text style={{ fontSize: 12 }}>Visita</Text>} />
          <Badge status="processing" text={<Text style={{ fontSize: 12 }}>Llamada</Text>} />
          <Badge status="success" text={<Text style={{ fontSize: 12 }}>WhatsApp</Text>} />
          <Badge status="error" text={<Text style={{ fontSize: 12 }}>Email</Text>} />
          <Badge status="warning" text={<Text style={{ fontSize: 12, color: '#fa8c16' }}>Reunión</Text>} />
        </Space>
      </div>
      <Calendar
        value={dayjs(mesActual)}
        cellRender={cellRender}
        headerRender={() => null}
        onPanelChange={(val) => setMesActual(val.toDate())}
        style={{ border: '1px solid #f0f0f0', borderRadius: 8 }}
      />
    </div>
  )
}

// ─── Vista Lista ──────────────────────────────────────────────────
function VistaLista({ rango, setRango, vendedorId, setVendedorId, edificioId, setEdificioId, resultado, setResultado, vendedores, edificios }) {
  const navigate = useNavigate()

  const params = {
    ...(vendedorId && { vendedorId }),
    ...(edificioId && { edificioId }),
    ...(resultado && { resultado }),
    desde: rango[0].toISOString(),
    hasta:  rango[1].toISOString(),
  }

  const { data: visitas = [], isLoading } = useQuery({
    queryKey: ['visitas-todas', params],
    queryFn: ({ queryKey }) => api.get('/visitas', { params: queryKey[1] }).then(r => r.data)
  })

  const columns = [
    {
      title: 'Cliente', key: 'cliente',
      render: (_, v) => (
        <div>
          <Text strong style={{ fontSize: 13 }}>
            {v.lead?.contacto?.nombre} {v.lead?.contacto?.apellido}
          </Text>
          {v.lead?.contacto?.telefono && (
            <div><Text type="secondary" style={{ fontSize: 12 }}>{v.lead.contacto.telefono}</Text></div>
          )}
        </div>
      )
    },
    {
      title: 'Proyecto', key: 'edificio', width: 160,
      render: (_, v) => v.edificio
        ? <Text style={{ fontSize: 13 }}>{v.edificio.nombre}</Text>
        : <Text type="secondary" style={{ fontSize: 12 }}>—</Text>
    },
    {
      title: 'Fecha', key: 'fecha', width: 160,
      render: (_, v) => (
        <Text style={{ fontSize: 13 }}>
          {format(new Date(v.fechaHora), "d MMM yyyy · HH:mm", { locale: es })}
        </Text>
      ),
      sorter: (a, b) => new Date(a.fechaHora) - new Date(b.fechaHora),
      defaultSortOrder: 'ascend',
    },
    {
      title: 'Tipo', key: 'tipo', width: 110,
      render: (_, v) => (
        <Tag color={v.tipo === 'presencial' || v.tipo === 'PRESENCIAL' ? 'blue' : 'purple'}>
          {v.tipo?.charAt(0).toUpperCase() + v.tipo?.slice(1).toLowerCase()}
        </Tag>
      )
    },
    {
      title: 'Resultado', key: 'resultado', width: 120,
      render: (_, v) => v.resultado
        ? <Tag color={RESULTADO_COLOR[v.resultado]}>{v.resultado}</Tag>
        : <Tag color="default">Sin resultado</Tag>
    },
    {
      title: 'Vendedor', key: 'vendedor', width: 150,
      render: (_, v) => v.vendedor
        ? <Text style={{ fontSize: 13 }}>{v.vendedor.nombre} {v.vendedor.apellido}</Text>
        : <Text type="secondary" style={{ fontSize: 12 }}>—</Text>
    },
    {
      title: '', key: 'accion', width: 90,
      render: (_, v) => v.lead?.id && (
        <Button size="small" type="primary" ghost onClick={() => navigate(`/leads/${v.lead.id}`)}>
          Ver lead
        </Button>
      )
    }
  ]

  const limpiar = () => {
    const hoy = dayjs()
    setRango([hoy, hoy.add(7, 'day')])
    setVendedorId(null)
    setEdificioId(null)
    setResultado(null)
  }

  const hayFiltros = vendedorId || edificioId || resultado

  return (
    <>
      <Space wrap style={{ marginBottom: 16 }}>
        <RangePicker
          value={rango}
          onChange={(val) => val && setRango(val)}
          format="DD/MM/YYYY"
          style={{ width: 240 }}
        />
        <Select
          allowClear
          placeholder="Vendedor"
          style={{ width: 180 }}
          value={vendedorId}
          onChange={setVendedorId}
          options={vendedores.map(u => ({ value: u.id, label: `${u.nombre} ${u.apellido}` }))}
        />
        <Select
          allowClear
          placeholder="Proyecto"
          style={{ width: 200 }}
          value={edificioId}
          onChange={setEdificioId}
          options={edificios.map(e => ({ value: e.id, label: e.nombre }))}
        />
        <Select
          allowClear
          placeholder="Resultado"
          style={{ width: 140 }}
          value={resultado}
          onChange={setResultado}
          options={[
            { value: 'POSITIVO', label: 'Positivo' },
            { value: 'NEGATIVO', label: 'Negativo' },
            { value: 'PENDIENTE', label: 'Pendiente' },
          ]}
        />
        {hayFiltros && <Button size="small" onClick={limpiar}>Limpiar</Button>}
      </Space>

      <Table
        dataSource={visitas}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        size="small"
        pagination={{ pageSize: 20, showSizeChanger: false }}
        locale={{ emptyText: 'Sin visitas en este rango' }}
      />
    </>
  )
}

// ─── Página principal ─────────────────────────────────────────────
export default function Visitas() {
  const hoy = dayjs()
  const [rango, setRango] = useState([hoy, hoy.add(7, 'day')])
  const [vendedorId, setVendedorId] = useState(null)
  const [edificioId, setEdificioId] = useState(null)
  const [resultado, setResultado] = useState(null)

  const { data: vendedores = [] } = useQuery({
    queryKey: ['usuarios-vendedores'],
    queryFn: () => api.get('/usuarios').then(r => r.data)
  })

  const { data: edificios = [] } = useQuery({
    queryKey: ['edificios-activos'],
    queryFn: () => api.get('/edificios').then(r => r.data)
  })

  const tabs = [
    {
      key: 'lista',
      label: <span><UnorderedListOutlined /> Lista</span>,
      children: (
        <VistaLista
          rango={rango} setRango={setRango}
          vendedorId={vendedorId} setVendedorId={setVendedorId}
          edificioId={edificioId} setEdificioId={setEdificioId}
          resultado={resultado} setResultado={setResultado}
          vendedores={vendedores} edificios={edificios}
        />
      )
    },
    {
      key: 'calendario',
      label: <span><CalendarOutlined /> Calendario</span>,
      children: (
        <VistaCalendario vendedorId={vendedorId} edificioId={edificioId} />
      )
    }
  ]

  return (
    <div>
      <Title level={4} style={{ marginBottom: 16 }}>Visitas y Actividades</Title>
      <Tabs items={tabs} defaultActiveKey="lista" />
    </div>
  )
}
