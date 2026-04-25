import { useState } from 'react'
import dayjs from 'dayjs'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Table, Select, Button, Tag, Space, Typography, App,
  DatePicker, Card, Row, Col, Switch
} from 'antd'
import { UserSwitchOutlined } from '@ant-design/icons'
import api from '../../services/api'

const { Title, Text } = Typography
const { RangePicker } = DatePicker

const ORIGEN_OPCIONES = [
  { value: 'INSTAGRAM', label: 'Instagram' },
  { value: 'GOOGLE', label: 'Google' },
  { value: 'REFERIDO', label: 'Referido' },
  { value: 'BROKER', label: 'Broker' },
  { value: 'VISITA_DIRECTA', label: 'Visita directa' },
  { value: 'WEB', label: 'Web' },
  { value: 'OTRO', label: 'Otro' },
]

export default function CentroAsignacion() {
  const qc = useQueryClient()
  const { message } = App.useApp()

  // Filtros
  const [campanasFiltro, setCampanasFiltro] = useState([])
  const [origen, setOrigen] = useState(null)
  const [desde, setDesde] = useState(null)
  const [hasta, setHasta] = useState(null)
  const [soloSinAsignar, setSoloSinAsignar] = useState(true)
  const [fechaRapida, setFechaRapida] = useState(null)

  // Selección
  const [selectedRowKeys, setSelectedRowKeys] = useState([])

  // Asignación
  const [vendedorSeleccionado, setVendedorSeleccionado] = useState(null)

  // ── Queries ──────────────────────────────────────────────────
  const { data: campanaOpciones = [] } = useQuery({
    queryKey: ['campanas'],
    queryFn: () => api.get('/leads/campanas').then(r => r.data),
  })

  const { data: usuarios = [] } = useQuery({
    queryKey: ['usuarios'],
    queryFn: () => api.get('/usuarios').then(r => r.data),
  })
  const vendedores = usuarios.filter(u => u.activo && ['BROKER_EXTERNO', 'VENDEDOR', 'JEFE_VENTAS', 'GERENTE'].includes(u.rol))

  const params = {
    ...(soloSinAsignar && { sinAsignar: 'true' }),
    ...(campanasFiltro.length === 1 && { campana: campanasFiltro[0] }),
    ...(origen && { origen }),
    ...(desde && { desde }),
    ...(hasta && { hasta }),
  }

  const { data: leadsRaw = [], isLoading, isFetching } = useQuery({
    queryKey: ['leads-asignacion', params],
    queryFn: () => api.get('/leads', { params }).then(r => r.data),
  })

  // Filtro local para múltiples campañas (backend solo acepta 1 a la vez)
  const leads = campanasFiltro.length > 1
    ? leadsRaw.filter(l => campanasFiltro.includes(l.campana))
    : leadsRaw

  const asignar = useMutation({
    mutationFn: ({ leadIds, vendedorId }) =>
      api.post('/leads/asignar-masivo', { leadIds, vendedorId }).then(r => r.data),
    onSuccess: (data) => {
      message.success(`${data.actualizados} lead(s) asignado(s)`)
      setSelectedRowKeys([])
      setVendedorSeleccionado(null)
      qc.invalidateQueries({ queryKey: ['leads-asignacion'] })
    },
    onError: err => message.error(err.response?.data?.error || 'Error al asignar'),
  })

  const handleFechaRapida = (tipo) => {
    if (fechaRapida === tipo) {
      setFechaRapida(null); setDesde(null); setHasta(null); return
    }
    setFechaRapida(tipo)
    if (tipo === 'hoy') {
      setDesde(dayjs().startOf('day').toISOString())
      setHasta(dayjs().endOf('day').toISOString())
    } else if (tipo === 'ayer') {
      setDesde(dayjs().subtract(1, 'day').startOf('day').toISOString())
      setHasta(dayjs().subtract(1, 'day').endOf('day').toISOString())
    } else if (tipo === 'semana') {
      setDesde(dayjs().subtract(7, 'day').startOf('day').toISOString())
      setHasta(dayjs().endOf('day').toISOString())
    }
  }

  const handleRangeChange = (dates) => {
    setFechaRapida(null)
    if (dates) {
      setDesde(dates[0].startOf('day').toISOString())
      setHasta(dates[1].endOf('day').toISOString())
    } else {
      setDesde(null); setHasta(null)
    }
  }

  const handleAsignar = () => {
    if (!vendedorSeleccionado) return message.warning('Selecciona un vendedor')
    if (!selectedRowKeys.length) return message.warning('Selecciona al menos un lead')
    asignar.mutate({ leadIds: selectedRowKeys, vendedorId: vendedorSeleccionado })
  }

  const columns = [
    {
      title: 'Contacto',
      key: 'contacto',
      render: (_, r) => (
        <div>
          <Text strong style={{ fontSize: 13 }}>{r.contacto.nombre} {r.contacto.apellido}</Text>
          {r.contacto.telefono && (
            <div><Text type="secondary" style={{ fontSize: 12 }}>{r.contacto.telefono}</Text></div>
          )}
        </div>
      ),
    },
    {
      title: 'Campaña',
      dataIndex: 'campana',
      key: 'campana',
      render: v => v ? <Tag color="blue">{v}</Tag> : <Text type="secondary">—</Text>,
    },
    {
      title: 'Origen',
      key: 'origen',
      render: (_, r) => <Text style={{ fontSize: 12 }}>{r.contacto.origen || '—'}</Text>,
    },
    {
      title: 'Fecha ingreso',
      dataIndex: 'creadoEn',
      key: 'creadoEn',
      render: v => <Text style={{ fontSize: 12 }}>{dayjs(v).format('DD/MM/YYYY')}</Text>,
    },
    {
      title: 'Vendedor actual',
      key: 'vendedor',
      render: (_, r) => r.vendedor
        ? <Tag color="green">{r.vendedor.nombre} {r.vendedor.apellido}</Tag>
        : <Tag color="red">Sin asignar</Tag>,
    },
  ]

  return (
    <div style={{ maxWidth: 1100 }}>
      <div style={{ marginBottom: 20 }}>
        <Title level={3} style={{ margin: 0 }}>
          <UserSwitchOutlined style={{ marginRight: 8, color: '#1d4ed8' }} />
          Centro de Asignación
        </Title>
        <Text type="secondary">Filtra leads y asígnalos a vendedores en bulk</Text>
      </div>

      {/* Filtros */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} sm={12} md={6}>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Campaña</div>
            <Select
              mode="multiple"
              allowClear
              placeholder="Todas las campañas"
              style={{ width: '100%' }}
              value={campanasFiltro}
              onChange={setCampanasFiltro}
              options={campanaOpciones.map(c => ({ value: c, label: c }))}
            />
          </Col>
          <Col xs={24} sm={12} md={5}>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Origen</div>
            <Select
              allowClear
              placeholder="Todos"
              style={{ width: '100%' }}
              value={origen}
              onChange={setOrigen}
              options={ORIGEN_OPCIONES}
            />
          </Col>
          <Col xs={24} md={9}>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Fecha de ingreso</div>
            <Space wrap size={4}>
              {[['hoy', 'Hoy'], ['ayer', 'Ayer'], ['semana', 'Esta semana']].map(([t, label]) => (
                <Button
                  key={t}
                  size="small"
                  type={fechaRapida === t ? 'primary' : 'default'}
                  onClick={() => handleFechaRapida(t)}
                >
                  {label}
                </Button>
              ))}
              <RangePicker
                size="small"
                onChange={handleRangeChange}
                value={fechaRapida ? null : (desde ? [dayjs(desde), dayjs(hasta)] : null)}
                format="DD/MM/YY"
              />
            </Space>
          </Col>
          <Col xs={24} md={4}>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Solo sin asignar</div>
            <Switch checked={soloSinAsignar} onChange={setSoloSinAsignar} />
          </Col>
        </Row>
      </Card>

      {/* Barra de acción flotante */}
      {selectedRowKeys.length > 0 && (
        <div style={{
          position: 'sticky', top: 60, zIndex: 50,
          background: '#1d4ed8', borderRadius: 8, padding: '10px 16px',
          marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
          boxShadow: '0 4px 12px rgba(29,78,216,0.3)',
        }}>
          <Text style={{ color: '#fff', fontWeight: 600, whiteSpace: 'nowrap' }}>
            {selectedRowKeys.length} lead(s) seleccionado(s)
          </Text>
          <Select
            placeholder="Vendedor..."
            style={{ minWidth: 180, maxWidth: 240 }}
            allowClear
            value={vendedorSeleccionado}
            onChange={setVendedorSeleccionado}
            options={vendedores.map(v => ({ value: v.id, label: `${v.nombre} ${v.apellido}` }))}
          />
          <Button
            onClick={handleAsignar}
            loading={asignar.isPending}
            disabled={!vendedorSeleccionado}
            style={{ fontWeight: 600 }}
          >
            Asignar
          </Button>
          <Button type="text" style={{ color: '#fff' }} onClick={() => setSelectedRowKeys([])}>
            Cancelar
          </Button>
        </div>
      )}

      {/* Tabla */}
      <Table
        rowKey="id"
        columns={columns}
        dataSource={leads}
        loading={isLoading || isFetching}
        rowSelection={{
          selectedRowKeys,
          onChange: setSelectedRowKeys,
          preserveSelectedRowKeys: false,
        }}
        pagination={{ pageSize: 50, showSizeChanger: false, showTotal: t => `${t} leads` }}
        size="small"
        locale={{ emptyText: 'No hay leads con estos filtros' }}
      />
    </div>
  )
}
