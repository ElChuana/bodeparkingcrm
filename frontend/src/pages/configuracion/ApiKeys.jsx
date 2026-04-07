import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Table, Button, Modal, Input, Tag, Space, Typography, Popconfirm, message, Card, Alert } from 'antd'
import { PlusOutlined, CopyOutlined, DeleteOutlined, StopOutlined, KeyOutlined } from '@ant-design/icons'
import api from '../../services/api'

const { Title, Text, Paragraph } = Typography

export default function ApiKeys() {
  const qc = useQueryClient()
  const [modalVisible, setModalVisible] = useState(false)
  const [nombre, setNombre] = useState('')
  const [keyGenerada, setKeyGenerada] = useState(null)

  const { data: keys = [], isLoading } = useQuery({
    queryKey: ['api-keys'],
    queryFn: () => api.get('/public/keys').then(r => r.data)
  })

  const crear = useMutation({
    mutationFn: (nombre) => api.post('/public/keys', { nombre }).then(r => r.data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['api-keys'] })
      setKeyGenerada(data.key)
      setNombre('')
    },
    onError: () => message.error('Error al crear la API Key')
  })

  const desactivar = useMutation({
    mutationFn: (id) => api.put(`/public/keys/${id}/desactivar`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['api-keys'] }); message.success('Key desactivada') },
    onError: () => message.error('Error al desactivar')
  })

  const eliminar = useMutation({
    mutationFn: (id) => api.delete(`/public/keys/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['api-keys'] }); message.success('Key eliminada') },
    onError: () => message.error('Error al eliminar')
  })

  const copiar = (key) => {
    navigator.clipboard.writeText(key)
    message.success('API Key copiada al portapapeles')
  }

  const handleCrear = () => {
    if (!nombre.trim()) return message.warning('Ingresa un nombre para la key')
    crear.mutate(nombre.trim())
  }

  const columns = [
    {
      title: 'Nombre',
      dataIndex: 'nombre',
      key: 'nombre',
      render: (v) => <Text strong>{v}</Text>
    },
    {
      title: 'Estado',
      dataIndex: 'activa',
      key: 'activa',
      render: (activa) => activa
        ? <Tag color="green">Activa</Tag>
        : <Tag color="red">Desactivada</Tag>
    },
    {
      title: 'Creada',
      dataIndex: 'creadoEn',
      key: 'creadoEn',
      render: (v) => new Date(v).toLocaleDateString('es-CL')
    },
    {
      title: 'Acciones',
      key: 'acciones',
      render: (_, record) => (
        <Space>
          {record.activa && (
            <Popconfirm
              title="¿Desactivar esta key?"
              description="Los sistemas que la usen dejarán de funcionar."
              onConfirm={() => desactivar.mutate(record.id)}
              okText="Desactivar"
              cancelText="Cancelar"
            >
              <Button icon={<StopOutlined />} size="small">Desactivar</Button>
            </Popconfirm>
          )}
          <Popconfirm
            title="¿Eliminar esta key?"
            description="Esta acción no se puede deshacer."
            onConfirm={() => eliminar.mutate(record.id)}
            okText="Eliminar"
            okButtonProps={{ danger: true }}
            cancelText="Cancelar"
          >
            <Button icon={<DeleteOutlined />} size="small" danger>Eliminar</Button>
          </Popconfirm>
        </Space>
      )
    }
  ]

  return (
    <div style={{ padding: 24, maxWidth: 900 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>API Keys</Title>
          <Text type="secondary">Gestiona las keys para integrar sistemas externos con el CRM</Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { setModalVisible(true); setKeyGenerada(null) }}>
          Nueva API Key
        </Button>
      </div>

      <Card style={{ marginBottom: 24 }}>
        <Alert
          message="¿Para qué sirve una API Key?"
          description="Permite que formularios web, landing pages u otros sistemas envíen leads directamente al CRM. Crea una key por cada sistema externo para poder revocarla independientemente."
          type="info"
          showIcon
          icon={<KeyOutlined />}
        />
      </Card>

      <Table
        columns={columns}
        dataSource={keys}
        rowKey="id"
        loading={isLoading}
        locale={{ emptyText: 'No hay API Keys creadas aún' }}
      />

      <Modal
        title="Nueva API Key"
        open={modalVisible}
        onCancel={() => { setModalVisible(false); setKeyGenerada(null); setNombre('') }}
        footer={null}
        width={520}
      >
        {!keyGenerada ? (
          <div style={{ paddingTop: 8 }}>
            <Text>Asigna un nombre descriptivo (ej: "Formulario web", "Landing Instagram")</Text>
            <Input
              style={{ marginTop: 12, marginBottom: 16 }}
              placeholder="Nombre de la key"
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              onPressEnter={handleCrear}
            />
            <Button type="primary" block onClick={handleCrear} loading={crear.isPending}>
              Generar API Key
            </Button>
          </div>
        ) : (
          <div style={{ paddingTop: 8 }}>
            <Alert
              message="¡Key generada! Cópiala ahora."
              description="Esta es la única vez que se muestra completa. Si la pierdes, deberás crear una nueva."
              type="warning"
              showIcon
              style={{ marginBottom: 16 }}
            />
            <Paragraph
              copyable={{ text: keyGenerada, onCopy: () => message.success('Copiada') }}
              code
              style={{ fontSize: 12, wordBreak: 'break-all' }}
            >
              {keyGenerada}
            </Paragraph>
            <Button
              type="primary"
              icon={<CopyOutlined />}
              block
              onClick={() => copiar(keyGenerada)}
            >
              Copiar al portapapeles
            </Button>
          </div>
        )}
      </Modal>
    </div>
  )
}
