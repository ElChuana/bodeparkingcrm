import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Card, Button, Typography, Space, Modal, Form, Input, App, Empty, Spin, Popconfirm, Tag, Alert
} from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, MailOutlined } from '@ant-design/icons'
import api from '../../services/api'

const { Title, Text, Paragraph } = Typography

export default function PlantillasEmail() {
  const qc = useQueryClient()
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const [editando, setEditando] = useState(null) // objeto plantilla o {} para nueva
  const [modalOpen, setModalOpen] = useState(false)

  const { data: plantillas = [], isLoading } = useQuery({
    queryKey: ['plantillas-email'],
    queryFn: () => api.get('/plantillas-email').then(r => r.data)
  })

  const invalidar = () => {
    qc.invalidateQueries(['plantillas-email'])
    qc.invalidateQueries(['plantillas-email-compositor'])
  }

  const guardar = useMutation({
    mutationFn: (vals) => editando?.id
      ? api.put(`/plantillas-email/${editando.id}`, vals)
      : api.post('/plantillas-email', vals),
    onSuccess: () => {
      message.success(editando?.id ? 'Plantilla actualizada' : 'Plantilla creada')
      invalidar()
      cerrar()
    },
    onError: err => message.error(err.response?.data?.error || 'Error al guardar')
  })

  const eliminar = useMutation({
    mutationFn: (id) => api.delete(`/plantillas-email/${id}`),
    onSuccess: () => { message.success('Plantilla eliminada'); invalidar() },
    onError: err => message.error(err.response?.data?.error || 'Error al eliminar')
  })

  const sembrar = useMutation({
    mutationFn: () => api.post('/plantillas-email/sembrar-base'),
    onSuccess: () => { message.success('Plantillas de ejemplo cargadas'); invalidar() },
    onError: err => message.error(err.response?.data?.error || 'Error')
  })

  const abrirNueva = () => { setEditando({}); form.resetFields(); setModalOpen(true) }
  const abrirEditar = (p) => {
    setEditando(p)
    form.setFieldsValue({ nombre: p.nombre, asunto: p.asunto, cuerpo: p.cuerpo })
    setModalOpen(true)
  }
  const cerrar = () => { setModalOpen(false); setEditando(null); form.resetFields() }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 8 }}>
        <div>
          <Title level={3} style={{ margin: 0 }}><MailOutlined /> Plantillas de email</Title>
          <Text type="secondary">Tus plantillas personales para el compositor de emails. Solo tú las ves y editas.</Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={abrirNueva}>Nueva plantilla</Button>
      </div>

      <Alert
        type="info"
        showIcon
        style={{ margin: '16px 0' }}
        message={<span>Usa la variable <Tag style={{ margin: '0 2px' }}>{'{nombre}'}</Tag> en el asunto o el cuerpo — se reemplaza por el nombre del lead al enviar.</span>}
      />

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 60 }}><Spin /></div>
      ) : plantillas.length === 0 ? (
        <Card>
          <Empty description="Aún no tienes plantillas">
            <Space direction="vertical">
              <Button type="primary" icon={<PlusOutlined />} onClick={abrirNueva}>Crear la primera</Button>
              <Button onClick={() => sembrar.mutate()} loading={sembrar.isPending}>Cargar plantillas de ejemplo</Button>
            </Space>
          </Empty>
        </Card>
      ) : (
        <Space direction="vertical" style={{ width: '100%' }} size={12}>
          {plantillas.map(p => (
            <Card
              key={p.id}
              size="small"
              title={<Text strong>{p.nombre}</Text>}
              extra={
                <Space size={2}>
                  <Button type="text" size="small" icon={<EditOutlined />} onClick={() => abrirEditar(p)} />
                  <Popconfirm title="¿Eliminar plantilla?" okText="Eliminar" cancelText="Cancelar" okButtonProps={{ danger: true }} onConfirm={() => eliminar.mutate(p.id)}>
                    <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                  </Popconfirm>
                </Space>
              }
            >
              <div style={{ marginBottom: 6 }}><Text type="secondary" style={{ fontSize: 12 }}>Asunto: </Text><Text style={{ fontSize: 13 }}>{p.asunto}</Text></div>
              <Paragraph style={{ margin: 0, fontSize: 13, color: '#3a4452', whiteSpace: 'pre-wrap' }} ellipsis={{ rows: 3, expandable: true, symbol: 'ver más' }}>
                {p.cuerpo}
              </Paragraph>
            </Card>
          ))}
        </Space>
      )}

      <Modal
        title={editando?.id ? 'Editar plantilla' : 'Nueva plantilla'}
        open={modalOpen}
        onCancel={cerrar}
        onOk={() => form.validateFields().then(guardar.mutate)}
        okText="Guardar"
        cancelText="Cancelar"
        confirmLoading={guardar.isPending}
        width={620}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="nombre" label="Nombre" rules={[{ required: true, message: 'Ponle un nombre' }]}>
            <Input placeholder="Ej: Seguimiento, Cotización enviada…" maxLength={60} />
          </Form.Item>
          <Form.Item name="asunto" label="Asunto" rules={[{ required: true, message: 'Escribe el asunto' }]}>
            <Input placeholder="Ej: Seguimiento — BodeParking" />
          </Form.Item>
          <Form.Item name="cuerpo" label="Mensaje" rules={[{ required: true, message: 'Escribe el mensaje' }]}
            extra="Puedes usar {nombre} para el nombre del lead.">
            <Input.TextArea rows={9} placeholder={'Estimado/a {nombre},\n\n…\n\nSaludos cordiales,'} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
