import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Table, Button, Tag, Modal, Form, Input, Select, Typography, Space, Avatar, Switch, App, Popconfirm, Checkbox } from 'antd'
import { PlusOutlined, UserOutlined, AppstoreOutlined, EyeOutlined } from '@ant-design/icons'
import api from '../../services/api'
import { ROL_LABEL } from '../../components/ui'

const { Title, Text } = Typography

const ROL_COLOR = {
  GERENTE: 'purple', JEFE_VENTAS: 'blue', VENDEDOR: 'green',
  BROKER_EXTERNO: 'cyan', ABOGADO: 'orange'
}

const MODULOS_POR_ROL = {
  GERENTE:        ['dashboard','inventario','leads','asignacion','visitas','ventas','legal','pagos','comisiones','promociones','descuentos','arriendos','llaves','equipo','reportes','automatizaciones','api-keys'],
  JEFE_VENTAS:    ['dashboard','inventario','leads','asignacion','visitas','ventas','legal','pagos','comisiones','promociones','descuentos','arriendos','llaves','reportes','automatizaciones'],
  VENDEDOR:       ['dashboard','leads','comisiones','promociones','descuentos'],
  BROKER_EXTERNO: ['dashboard','leads','comisiones','promociones','descuentos'],
  ABOGADO:        ['dashboard','ventas','legal'],
}

const SECCIONES_MODULOS = [
  { label: 'General',  modulos: [
    { key: 'dashboard',  label: 'Dashboard' },
    { key: 'inventario', label: 'Inventario' },
    { key: 'leads',      label: 'Leads' },
    { key: 'asignacion', label: 'Asignación' },
    { key: 'visitas',    label: 'Visitas' },
  ]},
  { label: 'Ventas', modulos: [
    { key: 'ventas',      label: 'Ventas' },
    { key: 'legal',       label: 'Legal' },
    { key: 'pagos',       label: 'Pagos' },
    { key: 'comisiones',  label: 'Comisiones' },
  ]},
  { label: 'Gestión', modulos: [
    { key: 'promociones',  label: 'Promociones' },
    { key: 'descuentos',   label: 'Descuentos' },
    { key: 'arriendos',    label: 'Arriendos' },
    { key: 'llaves',       label: 'Llaves' },
  ]},
  { label: 'Admin', modulos: [
    { key: 'equipo',           label: 'Equipo' },
    { key: 'reportes',         label: 'Reportes' },
    { key: 'automatizaciones', label: 'Automatizaciones' },
    { key: 'api-keys',         label: 'API Keys' },
  ]},
]

function ModalModulos({ open, onClose, usuario }) {
  const qc = useQueryClient()
  const { message } = App.useApp()
  const [seleccionados, setSeleccionados] = useState([])

  const handleOpen = () => {
    const base = usuario?.modulosVisibles?.length > 0
      ? usuario.modulosVisibles
      : (MODULOS_POR_ROL[usuario?.rol] || [])
    setSeleccionados(base)
  }

  const guardar = useMutation({
    mutationFn: (modulos) => api.put(`/usuarios/${usuario.id}`, { modulosVisibles: modulos }),
    onSuccess: () => {
      message.success('Módulos actualizados')
      qc.invalidateQueries({ queryKey: ['usuarios'] })
      onClose()
    },
    onError: err => message.error(err.response?.data?.error || 'Error')
  })

  const restablecer = useMutation({
    mutationFn: () => api.put(`/usuarios/${usuario.id}`, { modulosVisibles: [] }),
    onSuccess: () => {
      message.success('Módulos restablecidos al rol')
      qc.invalidateQueries({ queryKey: ['usuarios'] })
      onClose()
    },
    onError: err => message.error(err.response?.data?.error || 'Error')
  })

  const toggle = (key) => {
    setSeleccionados(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    )
  }

  return (
    <Modal
      title={`Módulos de ${usuario?.nombre || ''}`}
      open={open}
      onCancel={onClose}
      afterOpenChange={(v) => { if (v) handleOpen() }}
      footer={[
        <Button key="reset" onClick={() => restablecer.mutate()} loading={restablecer.isPending}>
          Restablecer a rol
        </Button>,
        <Button key="cancel" onClick={onClose}>Cancelar</Button>,
        <Button key="save" type="primary" onClick={() => guardar.mutate(seleccionados)} loading={guardar.isPending}>
          Guardar
        </Button>,
      ]}
      width={520}
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 24px', marginTop: 16 }}>
        {SECCIONES_MODULOS.map(sec => (
          <div key={sec.label}>
            <div style={{ fontWeight: 600, fontSize: 12, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 8 }}>
              {sec.label}
            </div>
            {sec.modulos.map(m => (
              <div key={m.key} style={{ marginBottom: 6 }}>
                <Checkbox
                  checked={seleccionados.includes(m.key)}
                  onChange={() => toggle(m.key)}
                >
                  {m.label}
                </Checkbox>
              </div>
            ))}
          </div>
        ))}
      </div>
    </Modal>
  )
}

function ModalVisibilidad({ open, onClose, usuario }) {
  const qc = useQueryClient()
  const { message } = App.useApp()
  const [campanas, setCampanas] = useState([])
  const [edificios, setEdificios] = useState([])
  const [leadsIndividuales, setLeadsIndividuales] = useState([])
  const [busquedaLeads, setBusquedaLeads] = useState([])

  const { data: campanaOpciones = [] } = useQuery({
    queryKey: ['campanas'],
    queryFn: () => api.get('/leads/campanas').then(r => r.data),
    enabled: open
  })

  const { data: edificioOpciones = [] } = useQuery({
    queryKey: ['edificios'],
    queryFn: () => api.get('/edificios').then(r => r.data),
    enabled: open
  })

  const handleOpen = () => {
    setCampanas(usuario?.campanasFiltro || [])
    setEdificios(usuario?.edificiosFiltro || [])
    setLeadsIndividuales(usuario?.leadsIndividualesFiltro || [])
  }

  const buscarLeads = async (search) => {
    if (!search || search.length < 2) { setBusquedaLeads([]); return }
    try {
      const res = await api.get('/leads', { params: { search, limit: 20 } })
      setBusquedaLeads(Array.isArray(res.data) ? res.data : (res.data?.leads || []))
    } catch {
      setBusquedaLeads([])
    }
  }

  const guardar = useMutation({
    mutationFn: () => api.put(`/usuarios/${usuario.id}`, {
      campanasFiltro: campanas,
      edificiosFiltro: edificios,
      leadsIndividualesFiltro: leadsIndividuales
    }),
    onSuccess: () => {
      message.success('Visibilidad actualizada')
      qc.invalidateQueries({ queryKey: ['usuarios'] })
      onClose()
    },
    onError: err => message.error(err.response?.data?.error || 'Error')
  })

  const limpiar = useMutation({
    mutationFn: () => api.put(`/usuarios/${usuario.id}`, {
      campanasFiltro: [],
      edificiosFiltro: [],
      leadsIndividualesFiltro: []
    }),
    onSuccess: () => {
      message.success('Filtros limpiados')
      qc.invalidateQueries({ queryKey: ['usuarios'] })
      onClose()
    },
    onError: err => message.error(err.response?.data?.error || 'Error')
  })

  return (
    <Modal
      title={`Visibilidad de leads — ${usuario?.nombre || ''}`}
      open={open}
      onCancel={onClose}
      afterOpenChange={(v) => { if (v) handleOpen() }}
      footer={[
        <Button key="clear" onClick={() => limpiar.mutate()} loading={limpiar.isPending}>
          Limpiar todo
        </Button>,
        <Button key="cancel" onClick={onClose}>Cancelar</Button>,
        <Button key="save" type="primary" onClick={() => guardar.mutate()} loading={guardar.isPending}>
          Guardar
        </Button>,
      ]}
      width={520}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginTop: 16 }}>
        <div>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Campañas</div>
          <Select
            mode="multiple"
            style={{ width: '100%' }}
            placeholder="Selecciona campañas..."
            value={campanas}
            onChange={setCampanas}
            options={campanaOpciones.map(c => ({ value: c, label: c }))}
          />
        </div>
        <div>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Edificios</div>
          <Select
            mode="multiple"
            style={{ width: '100%' }}
            placeholder="Selecciona edificios..."
            value={edificios}
            onChange={setEdificios}
            options={edificioOpciones.map(e => ({ value: e.id, label: e.nombre }))}
          />
        </div>
        <div>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Leads individuales</div>
          <Select
            mode="multiple"
            style={{ width: '100%' }}
            placeholder="Busca por nombre o teléfono..."
            value={leadsIndividuales}
            onChange={setLeadsIndividuales}
            showSearch
            filterOption={false}
            onSearch={buscarLeads}
            options={busquedaLeads.map(l => ({
              value: l.id,
              label: `${[l.contacto?.nombre, l.contacto?.apellido].filter(Boolean).join(' ') || 'Sin nombre'} — ${l.campana || 'Sin campaña'}`
            }))}
          />
        </div>
      </div>
    </Modal>
  )
}

function ModalUsuario({ open, onClose, usuario }) {
  const qc = useQueryClient()
  const [form] = Form.useForm()
  const { message } = App.useApp()

  const guardar = useMutation({
    mutationFn: (d) => usuario ? api.put(`/usuarios/${usuario.id}`, d) : api.post('/usuarios', d),
    onSuccess: () => {
      message.success(usuario ? 'Usuario actualizado' : 'Usuario creado')
      qc.invalidateQueries({ queryKey: ['usuarios'] })
      onClose()
      form.resetFields()
    },
    onError: err => message.error(err.response?.data?.error || 'Error')
  })

  return (
    <Modal
      title={usuario ? 'Editar Usuario' : 'Nuevo Usuario'}
      open={open}
      onCancel={onClose}
      onOk={() => form.validateFields().then(guardar.mutate)}
      okText="Guardar"
      cancelText="Cancelar"
      confirmLoading={guardar.isPending}
    >
      <Form form={form} layout="vertical" style={{ marginTop: 16 }}
        initialValues={usuario || { activo: true }}>
        <Space.Compact style={{ width: '100%' }}>
          <Form.Item name="nombre" label="Nombre" rules={[{ required: true }]} style={{ width: '50%' }}>
            <Input />
          </Form.Item>
          <Form.Item name="apellido" label="Apellido" rules={[{ required: true }]} style={{ width: '50%' }}>
            <Input />
          </Form.Item>
        </Space.Compact>
        <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
          <Input />
        </Form.Item>
        {!usuario && (
          <Form.Item name="password" label="Contraseña" rules={[{ required: true, min: 6 }]}>
            <Input.Password />
          </Form.Item>
        )}
        <Form.Item name="rol" label="Rol" rules={[{ required: true }]}>
          <Select options={Object.entries(ROL_LABEL).map(([k, v]) => ({ value: k, label: v }))} />
        </Form.Item>
        <Form.Item name="telefono" label="Teléfono">
          <Input />
        </Form.Item>
      </Form>
    </Modal>
  )
}

export default function Equipo() {
  const [modalOpen, setModalOpen] = useState(false)
  const [usuarioEditar, setUsuarioEditar] = useState(null)
  const [modalModulosOpen, setModalModulosOpen] = useState(false)
  const [usuarioModulos, setUsuarioModulos] = useState(null)
  const [modalVisibilidadOpen, setModalVisibilidadOpen] = useState(false)
  const [usuarioVisibilidad, setUsuarioVisibilidad] = useState(null)
  const qc = useQueryClient()
  const { message } = App.useApp()

  const { data: usuarios = [], isLoading } = useQuery({
    queryKey: ['usuarios'],
    queryFn: () => api.get('/usuarios').then(r => r.data)
  })

  const toggleActivo = useMutation({
    mutationFn: ({ id, activo }) => api.put(`/usuarios/${id}`, { activo }),
    onSuccess: () => qc.invalidateQueries(['usuarios']),
    onError: err => message.error(err.response?.data?.error || 'Error')
  })

  const columns = [
    {
      title: 'Usuario', key: 'usuario',
      render: (_, u) => (
        <Space>
          <Avatar style={{ background: '#1677ff' }}>{u.nombre[0]}{u.apellido[0]}</Avatar>
          <div>
            <Text strong>{u.nombre} {u.apellido}</Text>
            <div><Text type="secondary" style={{ fontSize: 12 }}>{u.email}</Text></div>
          </div>
        </Space>
      )
    },
    {
      title: 'Rol', dataIndex: 'rol', key: 'rol',
      render: (r) => <Tag color={ROL_COLOR[r]}>{ROL_LABEL[r]}</Tag>
    },
    {
      title: 'Teléfono', dataIndex: 'telefono', key: 'telefono',
      render: (t) => t || '-'
    },
    {
      title: 'Activo', key: 'activo',
      render: (_, u) => (
        <Switch
          checked={u.activo}
          size="small"
          onChange={(v) => toggleActivo.mutate({ id: u.id, activo: v })}
        />
      )
    },
    {
      title: '', key: 'acciones',
      render: (_, u) => (
        <Space>
          <Button size="small" type="link" icon={<AppstoreOutlined />}
            onClick={() => { setUsuarioModulos(u); setModalModulosOpen(true) }}>
            Módulos
          </Button>
          <Button size="small" type="link" icon={<EyeOutlined />}
            onClick={() => { setUsuarioVisibilidad(u); setModalVisibilidadOpen(true) }}>
            Visibilidad
          </Button>
          <Button size="small" type="link" onClick={() => { setUsuarioEditar(u); setModalOpen(true) }}>
            Editar
          </Button>
        </Space>
      )
    },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <Title level={4} style={{ margin: 0 }}>Equipo</Title>
        <Button type="primary" icon={<PlusOutlined />}
          onClick={() => { setUsuarioEditar(null); setModalOpen(true) }}>
          Nuevo usuario
        </Button>
      </div>

      <Table
        dataSource={usuarios}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        size="small"
        locale={{ emptyText: 'Sin usuarios' }}
      />

      <ModalUsuario
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        usuario={usuarioEditar}
      />

      <ModalModulos
        open={modalModulosOpen}
        onClose={() => setModalModulosOpen(false)}
        usuario={usuarioModulos}
      />

      <ModalVisibilidad
        open={modalVisibilidadOpen}
        onClose={() => setModalVisibilidadOpen(false)}
        usuario={usuarioVisibilidad}
      />

    </div>
  )
}

