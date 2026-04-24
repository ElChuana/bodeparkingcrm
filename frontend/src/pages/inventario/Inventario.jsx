import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Card, Button, Tag, Modal, Form, Input, Select, Row, Col, Spin, Empty,
  Typography, Space, App, InputNumber, Table, Segmented, Tooltip
} from 'antd'
import {
  PlusOutlined, HomeOutlined, AppstoreOutlined, BarsOutlined, SearchOutlined
} from '@ant-design/icons'
import api from '../../services/api'
import { useUF } from '../../hooks/useUF'
import { useAuth } from '../../context/AuthContext'

const { Title, Text } = Typography

const ESTADO_COLOR = { DISPONIBLE: 'green', RESERVADO: 'orange', VENDIDO: 'red', ARRENDADO: 'blue' }
const ESTADO_LABEL = { DISPONIBLE: 'Disponible', RESERVADO: 'Reservado', VENDIDO: 'Vendido', ARRENDADO: 'Arrendado' }

function ModalEdificio({ open, onClose, edificio }) {
  const qc = useQueryClient()
  const [form] = Form.useForm()
  const { message } = App.useApp()

  const guardar = useMutation({
    mutationFn: (d) => edificio ? api.put(`/edificios/${edificio.id}`, d) : api.post('/edificios', d),
    onSuccess: () => {
      message.success(edificio ? 'Edificio actualizado' : 'Edificio creado')
      qc.invalidateQueries(['edificios'])
      onClose()
    },
    onError: err => message.error(err.response?.data?.error || 'Error')
  })

  return (
    <Modal
      title={edificio ? 'Editar Edificio' : 'Nuevo Edificio'}
      open={open}
      onCancel={onClose}
      onOk={() => form.validateFields().then(guardar.mutate)}
      okText="Guardar"
      cancelText="Cancelar"
      confirmLoading={guardar.isPending}
    >
      <Form form={form} layout="vertical" initialValues={edificio || {}} style={{ marginTop: 16 }}>
        <Form.Item name="nombre" label="Nombre" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="direccion" label="Dirección" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Row gutter={12}>
          <Col span={12}>
            <Form.Item name="region" label="Región" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="comuna" label="Comuna" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item name="inmobiliaria" label="Inmobiliaria">
          <Input />
        </Form.Item>
        <Form.Item name="contactoInmobiliaria" label="Contacto inmobiliaria">
          <Input />
        </Form.Item>
      </Form>
    </Modal>
  )
}

function ModalUnidad({ open, onClose, edificioId, unidad, onSuccess }) {
  const qc = useQueryClient()
  const { usuario } = useAuth()
  const esGerente = usuario?.rol === 'GERENTE'
  const esGerenciaOJV = ['GERENTE', 'JEFE_VENTAS'].includes(usuario?.rol)
  const [form] = Form.useForm()
  const { message } = App.useApp()

  const tipo = Form.useWatch('tipo', form) || unidad?.tipo || 'BODEGA'

  const guardar = useMutation({
    mutationFn: (d) => unidad ? api.put(`/unidades/${unidad.id}`, d) : api.post('/unidades', { ...d, edificioId }),
    onSuccess: () => {
      message.success(unidad ? 'Unidad actualizada' : 'Unidad creada')
      if (edificioId) qc.invalidateQueries(['edificio', edificioId])
      qc.invalidateQueries(['unidades-lista'])
      onSuccess?.()
      onClose()
    },
    onError: err => message.error(err.response?.data?.error || 'Error')
  })

  return (
    <Modal
      title={unidad ? 'Editar Unidad' : 'Nueva Unidad'}
      open={open}
      onCancel={onClose}
      onOk={() => form.validateFields().then(guardar.mutate)}
      okText="Guardar"
      cancelText="Cancelar"
      confirmLoading={guardar.isPending}
      width={560}
    >
      <Form form={form} layout="vertical" initialValues={unidad || { tipo: 'BODEGA' }} style={{ marginTop: 16 }}>
        <Row gutter={12}>
          <Col span={12}>
            <Form.Item name="tipo" label="Tipo" rules={[{ required: true }]}>
              <Select options={[{ value: 'BODEGA', label: 'Bodega' }, { value: 'ESTACIONAMIENTO', label: 'Estacionamiento' }]} />
            </Form.Item>
          </Col>
          {tipo === 'ESTACIONAMIENTO' && (
            <Col span={12}>
              <Form.Item name="subtipo" label="Subtipo">
                <Select options={[{ value: '', label: 'Normal' }, { value: 'TANDEM', label: 'Tándem' }]} />
              </Form.Item>
            </Col>
          )}
        </Row>
        <Row gutter={12}>
          <Col span={8}><Form.Item name="numero" label="Número" rules={[{ required: true }]}><Input /></Form.Item></Col>
          <Col span={8}><Form.Item name="piso" label="Piso"><Input /></Form.Item></Col>
          <Col span={8}><Form.Item name="m2" label="M²"><Input type="number" /></Form.Item></Col>
        </Row>
        {tipo === 'ESTACIONAMIENTO' && (
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="techado" label="Techado">
                <Select options={[{ value: '', label: 'Sin especificar' }, { value: 'true', label: 'Techado' }, { value: 'false', label: 'Descubierto' }]} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="acceso" label="Acceso">
                <Select options={[{ value: '', label: 'Sin especificar' }, { value: 'NIVEL', label: 'Nivel' }, { value: 'SUBTERRANEO', label: 'Subterráneo' }]} />
              </Form.Item>
            </Col>
          </Row>
        )}
        <Row gutter={12}>
          <Col span={12}>
            <Form.Item name="precioUF" label="Precio UF" rules={[{ required: true }]}><Input type="number" step="0.01" /></Form.Item>
          </Col>
          {esGerenciaOJV && (
            <Col span={12}>
              <Form.Item name="precioMinimoUF" label="Precio mínimo UF"><Input type="number" step="0.01" /></Form.Item>
            </Col>
          )}
        </Row>
        {esGerente && (
          <Form.Item name="precioCostoUF" label="Precio de costo UF"><Input type="number" step="0.01" /></Form.Item>
        )}
        <Form.Item name="notas" label="Notas"><Input /></Form.Item>
      </Form>
    </Modal>
  )
}

function DetalleEdificio({ edificioId, onBack }) {
  const { formatUF, ufAPesos, formatPesos } = useUF()
  const { esGerenciaOJV } = useAuth()
  const [modalUnidad, setModalUnidad] = useState(false)
  const [unidadEditar, setUnidadEditar] = useState(null)
  const [filtroTipo, setFiltroTipo] = useState(undefined)
  const [filtroEstado, setFiltroEstado] = useState(undefined)
  const [filtroPrecioMin, setFiltroPrecioMin] = useState(undefined)
  const [filtroPrecioMax, setFiltroPrecioMax] = useState(undefined)

  const { data: edificio, isLoading } = useQuery({
    queryKey: ['edificio', edificioId],
    queryFn: () => api.get(`/edificios/${edificioId}`).then(r => r.data)
  })

  if (isLoading) return <div style={{ textAlign: 'center', padding: 60 }}><Spin /></div>

  const unidadesFiltradas = (edificio?.unidades || []).filter(u => {
    if (filtroTipo && u.tipo !== filtroTipo) return false
    if (filtroEstado && u.estado !== filtroEstado) return false
    if (filtroPrecioMin && u.precioUF < filtroPrecioMin) return false
    if (filtroPrecioMax && u.precioUF > filtroPrecioMax) return false
    return true
  })

  const hayFiltros = filtroTipo || filtroEstado || filtroPrecioMin || filtroPrecioMax

  const porEstado = (edificio?.unidades || []).reduce((acc, u) => {
    acc[u.estado] = (acc[u.estado] || 0) + 1; return acc
  }, {})

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <Button type="link" onClick={onBack} style={{ padding: 0 }}>← Volver</Button>
        <Title level={4} style={{ margin: 0 }}>{edificio?.nombre}</Title>
        <Tag>{edificio?.region}, {edificio?.comuna}</Tag>
      </div>

      {edificio?.inmobiliaria && (
        <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
          Inmobiliaria: {edificio.inmobiliaria}
          {edificio.contactoInmobiliaria && ` — ${edificio.contactoInmobiliaria}`}
        </Text>
      )}

      <Row gutter={[8, 8]} style={{ marginBottom: 16 }}>
        {Object.entries(ESTADO_LABEL).map(([key, label]) => (
          <Col key={key}>
            <Tag
              color={filtroEstado === key ? ESTADO_COLOR[key] : undefined}
              style={{ cursor: 'pointer', fontSize: 12 }}
              onClick={() => setFiltroEstado(filtroEstado === key ? undefined : key)}
            >
              {label}: {porEstado[key] || 0}
            </Tag>
          </Col>
        ))}
      </Row>

      <Space style={{ marginBottom: 16, flexWrap: 'wrap' }}>
        <Select
          placeholder="Tipo"
          value={filtroTipo}
          onChange={setFiltroTipo}
          allowClear size="small" style={{ width: 160 }}
          options={[{ value: 'BODEGA', label: '📦 Bodega' }, { value: 'ESTACIONAMIENTO', label: '🚗 Estacionamiento' }]}
        />
        <Select
          placeholder="Estado"
          value={filtroEstado}
          onChange={setFiltroEstado}
          allowClear size="small" style={{ width: 140 }}
          options={Object.entries(ESTADO_LABEL).map(([k, v]) => ({ value: k, label: v }))}
        />
        <InputNumber
          placeholder="Precio mín (UF)"
          value={filtroPrecioMin}
          onChange={setFiltroPrecioMin}
          min={0} size="small" style={{ width: 150 }}
        />
        <InputNumber
          placeholder="Precio máx (UF)"
          value={filtroPrecioMax}
          onChange={setFiltroPrecioMax}
          min={0} size="small" style={{ width: 150 }}
        />
        {esGerenciaOJV && (
          <Button type="primary" icon={<PlusOutlined />} size="small"
            onClick={() => { setUnidadEditar(null); setModalUnidad(true) }}>
            Nueva unidad
          </Button>
        )}
        {hayFiltros && (
          <Button size="small" onClick={() => {
            setFiltroTipo(undefined); setFiltroEstado(undefined)
            setFiltroPrecioMin(undefined); setFiltroPrecioMax(undefined)
          }}>Limpiar</Button>
        )}
      </Space>

      <Text type="secondary" style={{ display: 'block', marginBottom: 12, fontSize: 13 }}>
        {unidadesFiltradas.length} de {edificio?.unidades?.length || 0} unidades
      </Text>

      <Row gutter={[12, 12]}>
        {unidadesFiltradas.map(u => (
          <Col key={u.id} xs={24} sm={12} lg={8}>
            <Card
              size="small"
              hoverable
              onClick={() => { setUnidadEditar(u); setModalUnidad(true) }}
              extra={<Tag color={ESTADO_COLOR[u.estado]}>{ESTADO_LABEL[u.estado]}</Tag>}
              title={
                <Space>
                  <span>{u.tipo === 'BODEGA' ? '📦' : '🚗'}</span>
                  <span>{u.tipo === 'BODEGA' ? 'Bodega' : 'Est.'} {u.numero}</span>
                  {u.subtipo === 'TANDEM' && <Tag color="purple">Tándem</Tag>}
                </Space>
              }
            >
              {u.piso && <div><Text type="secondary" style={{ fontSize: 12 }}>Piso {u.piso}</Text></div>}
              {u.m2 && <div><Text type="secondary" style={{ fontSize: 12 }}>{u.m2} m²</Text></div>}
              <div style={{ marginTop: 8 }}>
                <Text strong style={{ color: '#1677ff' }}>{formatUF(u.precioUF)}</Text>
                {ufAPesos(u.precioUF) && (
                  <div><Text type="secondary" style={{ fontSize: 11 }}>{formatPesos(ufAPesos(u.precioUF))}</Text></div>
                )}
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      <ModalUnidad
        open={modalUnidad}
        onClose={() => setModalUnidad(false)}
        edificioId={edificioId}
        unidad={unidadEditar}
      />
    </div>
  )
}

function VistaLista({ edificios, onNuevaUnidad }) {
  const { formatUF, ufAPesos, formatPesos } = useUF()
  const { esGerenciaOJV } = useAuth()
  const [unidadEditar, setUnidadEditar] = useState(null)
  const [modalUnidad, setModalUnidad] = useState(false)

  const [filtroEdificio, setFiltroEdificio] = useState(undefined)
  const [filtroTipo, setFiltroTipo] = useState(undefined)
  const [filtroEstado, setFiltroEstado] = useState(undefined)
  const [filtroPrecioMin, setFiltroPrecioMin] = useState(undefined)
  const [filtroPrecioMax, setFiltroPrecioMax] = useState(undefined)
  const [busqueda, setBusqueda] = useState('')

  const params = {
    ...(filtroEdificio && { edificioId: filtroEdificio }),
    ...(filtroTipo && { tipo: filtroTipo }),
    ...(filtroEstado && { estado: filtroEstado }),
    ...(filtroPrecioMin && { precioMin: filtroPrecioMin }),
    ...(filtroPrecioMax && { precioMax: filtroPrecioMax }),
  }

  const { data: unidades = [], isLoading } = useQuery({
    queryKey: ['unidades-lista', params],
    queryFn: () => api.get('/unidades', { params }).then(r => r.data)
  })

  const hayFiltros = filtroEdificio || filtroTipo || filtroEstado || filtroPrecioMin || filtroPrecioMax || busqueda

  const datos = busqueda
    ? unidades.filter(u =>
        u.numero.toLowerCase().includes(busqueda.toLowerCase()) ||
        u.edificio?.nombre?.toLowerCase().includes(busqueda.toLowerCase())
      )
    : unidades

  const columns = [
    {
      title: 'Edificio',
      dataIndex: ['edificio', 'nombre'],
      key: 'edificio',
      sorter: (a, b) => (a.edificio?.nombre || '').localeCompare(b.edificio?.nombre || ''),
      render: (_, u) => (
        <div>
          <Text strong style={{ fontSize: 13 }}>{u.edificio?.nombre}</Text>
          <div><Text type="secondary" style={{ fontSize: 11 }}>{u.edificio?.region} — {u.edificio?.comuna}</Text></div>
        </div>
      )
    },
    {
      title: 'Tipo',
      dataIndex: 'tipo',
      key: 'tipo',
      sorter: (a, b) => a.tipo.localeCompare(b.tipo),
      render: (tipo, u) => (
        <Space size={4}>
          <span>{tipo === 'BODEGA' ? '📦' : '🚗'}</span>
          <Text style={{ fontSize: 13 }}>{tipo === 'BODEGA' ? 'Bodega' : 'Est.'}</Text>
          {u.subtipo === 'TANDEM' && <Tag color="purple" style={{ fontSize: 10 }}>Tándem</Tag>}
        </Space>
      )
    },
    {
      title: 'Número',
      dataIndex: 'numero',
      key: 'numero',
      sorter: (a, b) => a.numero.localeCompare(b.numero, undefined, { numeric: true }),
    },
    {
      title: 'Piso',
      dataIndex: 'piso',
      key: 'piso',
      sorter: (a, b) => (a.piso || '').localeCompare(b.piso || '', undefined, { numeric: true }),
      render: v => v || <Text type="secondary">—</Text>
    },
    {
      title: 'M²',
      dataIndex: 'm2',
      key: 'm2',
      sorter: (a, b) => (Number(a.m2) || 0) - (Number(b.m2) || 0),
      render: v => v ? `${v} m²` : <Text type="secondary">—</Text>
    },
    {
      title: 'Estado',
      dataIndex: 'estado',
      key: 'estado',
      sorter: (a, b) => a.estado.localeCompare(b.estado),
      render: v => <Tag color={ESTADO_COLOR[v]}>{ESTADO_LABEL[v]}</Tag>
    },
    {
      title: 'Precio UF',
      dataIndex: 'precioUF',
      key: 'precioUF',
      sorter: (a, b) => (a.precioUF || 0) - (b.precioUF || 0),
      render: (v, u) => (
        <div>
          <Text strong style={{ color: '#1677ff' }}>{formatUF(v)}</Text>
          {ufAPesos(v) && <div><Text type="secondary" style={{ fontSize: 11 }}>{formatPesos(ufAPesos(v))}</Text></div>}
        </div>
      )
    },
    ...(esGerenciaOJV ? [{
      title: 'P. mín UF',
      dataIndex: 'precioMinimoUF',
      key: 'precioMinimoUF',
      sorter: (a, b) => (a.precioMinimoUF || 0) - (b.precioMinimoUF || 0),
      render: v => v ? <Text type="secondary" style={{ fontSize: 12 }}>{formatUF(v)}</Text> : <Text type="secondary">—</Text>
    }] : []),
    ...(esGerenciaOJV ? [{
      title: '',
      key: 'acciones',
      render: (_, u) => (
        <Button
          size="small"
          type="link"
          onClick={() => { setUnidadEditar(u); setModalUnidad(true) }}
        >
          Editar
        </Button>
      )
    }] : [])
  ]

  return (
    <div>
      {/* Filtros */}
      <Space style={{ marginBottom: 16, flexWrap: 'wrap' }}>
        <Input
          placeholder="Buscar edificio o número..."
          prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          allowClear
          style={{ width: 220 }}
          size="small"
        />
        <Select
          placeholder="Edificio"
          value={filtroEdificio}
          onChange={setFiltroEdificio}
          allowClear size="small" style={{ width: 180 }}
          showSearch
          filterOption={(v, o) => o.label.toLowerCase().includes(v.toLowerCase())}
          options={edificios.map(e => ({ value: e.id, label: e.nombre }))}
        />
        <Select
          placeholder="Tipo"
          value={filtroTipo}
          onChange={setFiltroTipo}
          allowClear size="small" style={{ width: 160 }}
          options={[{ value: 'BODEGA', label: '📦 Bodega' }, { value: 'ESTACIONAMIENTO', label: '🚗 Estacionamiento' }]}
        />
        <Select
          placeholder="Estado"
          value={filtroEstado}
          onChange={setFiltroEstado}
          allowClear size="small" style={{ width: 140 }}
          options={Object.entries(ESTADO_LABEL).map(([k, v]) => ({ value: k, label: v }))}
        />
        <InputNumber
          placeholder="Precio mín (UF)"
          value={filtroPrecioMin}
          onChange={setFiltroPrecioMin}
          min={0} size="small" style={{ width: 150 }}
        />
        <InputNumber
          placeholder="Precio máx (UF)"
          value={filtroPrecioMax}
          onChange={setFiltroPrecioMax}
          min={0} size="small" style={{ width: 150 }}
        />
        {hayFiltros && (
          <Button size="small" onClick={() => {
            setFiltroEdificio(undefined); setFiltroTipo(undefined); setFiltroEstado(undefined)
            setFiltroPrecioMin(undefined); setFiltroPrecioMax(undefined); setBusqueda('')
          }}>Limpiar</Button>
        )}
      </Space>

      <Text type="secondary" style={{ display: 'block', marginBottom: 12, fontSize: 13 }}>
        {datos.length} unidad{datos.length !== 1 ? 'es' : ''}
      </Text>

      <Table
        dataSource={datos}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        size="small"
        pagination={{ pageSize: 50, showSizeChanger: true, pageSizeOptions: ['25', '50', '100', '200'], showTotal: (t) => `${t} unidades` }}
        locale={{ emptyText: 'Sin unidades' }}
        scroll={{ x: 800 }}
      />

      <ModalUnidad
        open={modalUnidad}
        onClose={() => { setModalUnidad(false); setUnidadEditar(null) }}
        edificioId={unidadEditar?.edificioId}
        unidad={unidadEditar}
      />
    </div>
  )
}

export default function Inventario() {
  const { esGerenciaOJV } = useAuth()
  const [modalEdificio, setModalEdificio] = useState(false)
  const [edificioSeleccionado, setEdificioSeleccionado] = useState(null)
  const [vista, setVista] = useState('edificios')

  const { data: edificios = [], isLoading } = useQuery({
    queryKey: ['edificios'],
    queryFn: () => api.get('/edificios').then(r => r.data)
  })

  if (edificioSeleccionado) {
    return <DetalleEdificio edificioId={edificioSeleccionado} onBack={() => setEdificioSeleccionado(null)} />
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>Inventario</Title>
          <Text type="secondary">Edificios y unidades</Text>
        </div>
        <Space>
          <Segmented
            value={vista}
            onChange={setVista}
            options={[
              { value: 'edificios', icon: <AppstoreOutlined />, label: 'Edificios' },
              { value: 'lista', icon: <BarsOutlined />, label: 'Lista' },
            ]}
          />
          {esGerenciaOJV && vista === 'edificios' && (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalEdificio(true)}>
              Nuevo edificio
            </Button>
          )}
        </Space>
      </div>

      {vista === 'lista' ? (
        <VistaLista edificios={edificios} />
      ) : isLoading ? (
        <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>
      ) : edificios.length === 0 ? (
        <Empty description="No hay edificios registrados" />
      ) : (
        <Row gutter={[16, 16]}>
          {edificios.map(e => (
            <Col key={e.id} xs={24} sm={12} lg={8}>
              <Card
                hoverable
                onClick={() => setEdificioSeleccionado(e.id)}
                style={{ cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: '#e6f4ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <HomeOutlined style={{ color: '#1677ff', fontSize: 18 }} />
                  </div>
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <Text strong style={{ display: 'block' }}>{e.nombre}</Text>
                    <Text type="secondary" style={{ fontSize: 13 }}>{e.region} — {e.comuna}</Text>
                    {e.inmobiliaria && <div><Text type="secondary" style={{ fontSize: 12 }}>{e.inmobiliaria}</Text></div>}
                  </div>
                </div>
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #f0f0f0' }}>
                  <Text type="secondary" style={{ fontSize: 13 }}>{e._count?.unidades || 0} unidades</Text>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      <ModalEdificio open={modalEdificio} onClose={() => setModalEdificio(false)} />
    </div>
  )
}
