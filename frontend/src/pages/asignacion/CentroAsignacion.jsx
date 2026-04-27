import { useState, useMemo } from 'react'
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

const ETAPA_CONFIG = {
  NUEVO:              { label: 'Nuevo',             color: 'blue' },
  NO_CONTESTA:        { label: 'No contesta',        color: 'orange' },
  SEGUIMIENTO:        { label: 'Seguimiento',        color: 'cyan' },
  COTIZACION_ENVIADA: { label: 'Cotización enviada', color: 'purple' },
  INTERESADO:         { label: 'Interesado',         color: 'geekblue' },
  VISITA_AGENDADA:    { label: 'Visita agendada',    color: 'volcano' },
  PERDIDO:            { label: 'Perdido',            color: 'red' },
}

// Etapas donde el lead probablemente ya tiene vendedor → deshabilitar soloSinAsignar
const ETAPAS_YA_ASIGNADAS = new Set(['PERDIDO', 'NO_CONTESTA', 'SEGUIMIENTO', 'COTIZACION_ENVIADA', 'INTERESADO', 'VISITA_AGENDADA'])

const ORIGEN_OPCIONES = [
  { value: 'INSTAGRAM',      label: 'Instagram' },
  { value: 'GOOGLE',         label: 'Google' },
  { value: 'REFERIDO',       label: 'Referido' },
  { value: 'BROKER',         label: 'Broker' },
  { value: 'VISITA_DIRECTA', label: 'Visita directa' },
  { value: 'WEB',            label: 'Web' },
  { value: 'OTRO',           label: 'Otro' },
]

const QUICK_FILTERS = [
  { key: 'nuevos',       label: 'Nuevos sin asignar', etapa: 'NUEVO',       soloSinAsignar: true },
  { key: 'no_contesta',  label: 'No contesta',         etapa: 'NO_CONTESTA', soloSinAsignar: false },
  { key: 'perdidos',     label: 'Perdidos',            etapa: 'PERDIDO',     soloSinAsignar: false },
  { key: 'todos',        label: 'Todos',               etapa: null,          soloSinAsignar: false },
]

export default function CentroAsignacion() {
  const qc = useQueryClient()
  const { message } = App.useApp()

  // Filtros
  const [quickActivo, setQuickActivo]     = useState('nuevos')
  const [etapaFiltro, setEtapaFiltro]     = useState('NUEVO')
  const [soloSinAsignar, setSoloSinAsignar] = useState(true)
  const [campanasFiltro, setCampanasFiltro] = useState([])
  const [origen, setOrigen]               = useState(null)
  const [desde, setDesde]                 = useState(null)
  const [hasta, setHasta]                 = useState(null)
  const [fechaRapida, setFechaRapida]     = useState(null)

  // Selección y asignación
  const [selectedRowKeys, setSelectedRowKeys] = useState([])
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
    ...(etapaFiltro && { etapa: etapaFiltro }),
    ...(campanasFiltro.length === 1 && { campana: campanasFiltro[0] }),
    ...(origen && { origen }),
    ...(desde && { desde }),
    ...(hasta && { hasta }),
  }

  const { data: leadsRaw = [], isLoading, isFetching } = useQuery({
    queryKey: ['leads-asignacion', params],
    queryFn: () => api.get('/leads', { params }).then(r => r.data),
  })

  // Filtro local para múltiples campañas
  const leadsFiltrados = campanasFiltro.length > 1
    ? leadsRaw.filter(l => campanasFiltro.includes(l.campana))
    : leadsRaw

  // Ordenar: NUEVO primero, luego por fecha de ingreso desc
  const leads = useMemo(() => [...leadsFiltrados].sort((a, b) => {
    if (a.etapa === 'NUEVO' && b.etapa !== 'NUEVO') return -1
    if (a.etapa !== 'NUEVO' && b.etapa === 'NUEVO') return 1
    return new Date(b.creadoEn) - new Date(a.creadoEn)
  }), [leadsFiltrados])

  // ── Mutación ──────────────────────────────────────────────────
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

  // ── Handlers ─────────────────────────────────────────────────
  const aplicarQuick = (qf) => {
    setQuickActivo(qf.key)
    setEtapaFiltro(qf.etapa)
    setSoloSinAsignar(qf.soloSinAsignar)
    setSelectedRowKeys([])
  }

  const handleEtapaChange = (val) => {
    setEtapaFiltro(val)
    setQuickActivo(null)
    // Si es etapa que normalmente ya tiene vendedor, desactivar filtro sinAsignar
    if (val && ETAPAS_YA_ASIGNADAS.has(val)) setSoloSinAsignar(false)
  }

  const handleFechaRapida = (tipo) => {
    if (fechaRapida === tipo) { setFechaRapida(null); setDesde(null); setHasta(null); return }
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
    } else { setDesde(null); setHasta(null) }
  }

  const handleAsignar = () => {
    if (!vendedorSeleccionado) return message.warning('Selecciona un vendedor')
    if (!selectedRowKeys.length) return message.warning('Selecciona al menos un lead')
    asignar.mutate({ leadIds: selectedRowKeys, vendedorId: vendedorSeleccionado })
  }

  // ── Columnas ─────────────────────────────────────────────────
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
      title: 'Etapa',
      key: 'etapa',
      width: 140,
      render: (_, r) => {
        const cfg = ETAPA_CONFIG[r.etapa] || { label: r.etapa, color: 'default' }
        return <Tag color={cfg.color} style={{ fontSize: 11 }}>{cfg.label}</Tag>
      },
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
      sorter: (a, b) => new Date(b.creadoEn) - new Date(a.creadoEn),
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
    <div style={{ maxWidth: 1200 }}>
      <div style={{ marginBottom: 20 }}>
        <Title level={3} style={{ margin: 0 }}>
          <UserSwitchOutlined style={{ marginRight: 8, color: '#1d4ed8' }} />
          Centro de Asignación
        </Title>
        <Text type="secondary">Filtra leads y asígnalos a vendedores en bulk</Text>
      </div>

      {/* Quick filters */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
        {QUICK_FILTERS.map(qf => (
          <Button
            key={qf.key}
            size="small"
            type={quickActivo === qf.key ? 'primary' : 'default'}
            onClick={() => aplicarQuick(qf)}
          >
            {qf.label}
          </Button>
        ))}
      </div>

      {/* Filtros detallados */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} sm={12} md={5}>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Etapa</div>
            <Select
              allowClear
              placeholder="Todas las etapas"
              style={{ width: '100%' }}
              value={etapaFiltro}
              onChange={handleEtapaChange}
              options={Object.entries(ETAPA_CONFIG).map(([val, cfg]) => ({
                value: val, label: cfg.label
              }))}
            />
          </Col>
          <Col xs={24} sm={12} md={5}>
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
          <Col xs={24} sm={12} md={4}>
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
          <Col xs={24} md={7}>
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
          <Col xs={24} md={3}>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Solo sin asignar</div>
            <Switch
              checked={soloSinAsignar}
              onChange={v => { setSoloSinAsignar(v); setQuickActivo(null) }}
            />
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
            placeholder="Asignar a vendedor..."
            style={{ minWidth: 200, maxWidth: 260 }}
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
