import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Table, Button, Tag, Modal, Form, Input, Select, Typography, Space, Avatar, Switch, App, Card, Divider, Popconfirm, Alert } from 'antd'
import { PlusOutlined, UserOutlined, KeyOutlined, CopyOutlined, StopOutlined, DeleteOutlined } from '@ant-design/icons'
import api from '../../services/api'
import { ROL_LABEL } from '../../components/ui'

const { Title, Text } = Typography

const ROL_COLOR = {
  GERENTE: 'purple', JEFE_VENTAS: 'blue', VENDEDOR: 'green',
  BROKER_EXTERNO: 'cyan', ABOGADO: 'orange'
}

function ModalUsuario({ open, onClose, usuario }) {
  const qc = useQueryClient()
  const [form] = Form.useForm()
  const { message } = App.useApp()

  const guardar = useMutation({
    mutationFn: (d) => usuario ? api.put(`/usuarios/${usuario.id}`, d) : api.post('/usuarios', d),
    onSuccess: () => {
      message.success(usuario ? 'Usuario actualizado' : 'Usuario creado')
      qc.invalidateQueries(['usuarios'])
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
        <Button size="small" type="link" onClick={() => { setUsuarioEditar(u); setModalOpen(true) }}>
          Editar
        </Button>
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

      <Divider />
      <ApiKeys />
    </div>
  )
}

// ─── Gestión de API Keys ──────────────────────────────────────────
function ApiKeys() {
  const qc = useQueryClient()
  const { message } = App.useApp()
  const [nuevaKey, setNuevaKey] = useState(null)
  const [nombre, setNombre] = useState('')

  const { data: keys = [], isLoading } = useQuery({
    queryKey: ['api-keys'],
    queryFn: () => api.get('/public/keys').then(r => r.data)
  })

  const crear = useMutation({
    mutationFn: () => api.post('/public/keys', { nombre }),
    onSuccess: (res) => {
      setNuevaKey(res.data.key)
      setNombre('')
      qc.invalidateQueries({ queryKey: ['api-keys'] })
    },
    onError: err => message.error(err.response?.data?.error || 'Error')
  })

  const desactivar = useMutation({
    mutationFn: (id) => api.put(`/public/keys/${id}/desactivar`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['api-keys'] })
  })

  const eliminar = useMutation({
    mutationFn: (id) => api.delete(`/public/keys/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['api-keys'] })
  })

  const copiar = (text) => {
    navigator.clipboard.writeText(text)
    message.success('Copiado al portapapeles')
  }

  return (
    <Card
      title={<><KeyOutlined /> API Keys</>}
      size="small"
      style={{ marginTop: 8 }}
    >
      <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 12 }}>
        Las API Keys permiten que sistemas externos (formularios web, apps, CRMs) envíen leads directamente al sistema.
        Usa el header <code>X-Api-Key</code> en cada request.
      </Text>

      {/* Crear nueva key */}
      <Space.Compact style={{ marginBottom: 16, width: '100%', maxWidth: 500 }}>
        <Input
          placeholder="Nombre de la integración (ej: Formulario Web)"
          value={nombre}
          onChange={e => setNombre(e.target.value)}
          onPressEnter={() => nombre && crear.mutate()}
        />
        <Button
          type="primary"
          icon={<PlusOutlined />}
          loading={crear.isPending}
          onClick={() => nombre && crear.mutate()}
          disabled={!nombre}
        >
          Generar
        </Button>
      </Space.Compact>

      {/* Mostrar key recién creada */}
      {nuevaKey && (
        <Alert
          type="success"
          style={{ marginBottom: 16 }}
          message={
            <div>
              <Text strong>API Key generada — guárdala ahora, no se mostrará de nuevo</Text>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                <code style={{ fontSize: 13, background: '#f6f6f6', padding: '4px 8px', borderRadius: 4, flex: 1, wordBreak: 'break-all' }}>
                  {nuevaKey}
                </code>
                <Button size="small" icon={<CopyOutlined />} onClick={() => copiar(nuevaKey)}>
                  Copiar
                </Button>
              </div>
            </div>
          }
          closable
          onClose={() => setNuevaKey(null)}
        />
      )}

      {/* Lista de keys */}
      <Table
        dataSource={keys}
        rowKey="id"
        loading={isLoading}
        size="small"
        locale={{ emptyText: 'Sin API Keys' }}
        pagination={false}
        columns={[
          {
            title: 'Nombre', dataIndex: 'nombre', key: 'nombre',
            render: (v) => <Text strong>{v}</Text>
          },
          {
            title: 'Key', dataIndex: 'key', key: 'key',
            render: (v) => (
              <Space>
                <code style={{ fontSize: 12 }}>{v.slice(0, 12)}••••••••</code>
                <Button size="small" type="text" icon={<CopyOutlined />} onClick={() => copiar(v)} />
              </Space>
            )
          },
          {
            title: 'Estado', dataIndex: 'activa', key: 'activa',
            render: (v) => <Tag color={v ? 'green' : 'red'}>{v ? 'Activa' : 'Desactivada'}</Tag>
          },
          {
            title: 'Creada', dataIndex: 'creadoEn', key: 'creadoEn',
            render: (v) => new Date(v).toLocaleDateString('es-CL')
          },
          {
            title: '', key: 'acciones',
            render: (_, k) => (
              <Space>
                {k.activa && (
                  <Popconfirm title="¿Desactivar esta key?" onConfirm={() => desactivar.mutate(k.id)} okText="Sí" cancelText="No">
                    <Button size="small" icon={<StopOutlined />}>Desactivar</Button>
                  </Popconfirm>
                )}
                <Popconfirm title="¿Eliminar esta key?" onConfirm={() => eliminar.mutate(k.id)} okText="Eliminar" cancelText="No" okButtonProps={{ danger: true }}>
                  <Button size="small" danger icon={<DeleteOutlined />} />
                </Popconfirm>
              </Space>
            )
          }
        ]}
      />
    </Card>
  )
}
