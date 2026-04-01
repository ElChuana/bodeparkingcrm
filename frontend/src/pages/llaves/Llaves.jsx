import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Table, Tag, Button, Typography, Modal, Form, Input, Select, Space, Alert, App } from 'antd'
import { PlusOutlined, WarningOutlined } from '@ant-design/icons'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import api from '../../services/api'

const { Title, Text } = Typography

function ModalPrestar({ open, onClose, llaveId }) {
  const qc = useQueryClient()
  const [form] = Form.useForm()
  const { message } = App.useApp()

  const prestar = useMutation({
    mutationFn: (d) => api.post(`/llaves/${llaveId}/prestar`, d),
    onSuccess: () => {
      message.success('Llave prestada')
      qc.invalidateQueries(['llaves'])
      onClose()
      form.resetFields()
    },
    onError: err => message.error(err.response?.data?.error || 'Error')
  })

  return (
    <Modal title="Prestar Llave" open={open} onCancel={onClose}
      onOk={() => form.validateFields().then(prestar.mutate)}
      okText="Prestar" cancelText="Cancelar" confirmLoading={prestar.isPending}>
      <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
        <Form.Item name="prestadoA" label="Prestado a (nombre)" rules={[{ required: true }]}>
          <Input placeholder="Nombre del receptor" />
        </Form.Item>
        <Form.Item name="fechaDevolucionEsperada" label="Fecha devolución esperada">
          <Input type="date" />
        </Form.Item>
        <Form.Item name="notas" label="Notas">
          <Input.TextArea rows={2} />
        </Form.Item>
      </Form>
    </Modal>
  )
}

export default function Llaves() {
  const [modalPrestar, setModalPrestar] = useState(null)
  const qc = useQueryClient()
  const { message } = App.useApp()

  const { data: llaves = [], isLoading } = useQuery({
    queryKey: ['llaves'],
    queryFn: () => api.get('/llaves').then(r => r.data)
  })

  const devolver = useMutation({
    mutationFn: (id) => api.post(`/llaves/${id}/devolver`, {}),
    onSuccess: () => { message.success('Llave devuelta'); qc.invalidateQueries(['llaves']) },
    onError: err => message.error(err.response?.data?.error || 'Error')
  })

  const vencidas = llaves.filter(l => {
    if (!l.fechaDevolucionEsperada || l.estado !== 'PRESTADA') return false
    return new Date(l.fechaDevolucionEsperada) < new Date()
  })

  const columns = [
    {
      title: 'Unidad', key: 'unidad',
      render: (_, l) => (
        <div>
          <Text strong>{l.unidad?.edificio?.nombre}</Text>
          <div><Text type="secondary" style={{ fontSize: 12 }}>
            {l.unidad?.tipo === 'BODEGA' ? 'Bodega' : 'Est.'} {l.unidad?.numero}
          </Text></div>
        </div>
      )
    },
    {
      title: 'Código', dataIndex: 'codigo', key: 'codigo',
      render: (c) => <Tag>{c || 'Sin código'}</Tag>
    },
    {
      title: 'Estado', dataIndex: 'estado', key: 'estado',
      render: (e) => <Tag color={e === 'DISPONIBLE' ? 'green' : e === 'PRESTADA' ? 'orange' : 'default'}>{e.toLowerCase()}</Tag>
    },
    {
      title: 'Prestado a', key: 'prestado',
      render: (_, l) => l.estado === 'PRESTADA' ? (
        <div>
          <Text>{l.prestadoA}</Text>
          {l.fechaDevolucionEsperada && (
            <div><Text type={new Date(l.fechaDevolucionEsperada) < new Date() ? 'danger' : 'secondary'} style={{ fontSize: 12 }}>
              Devolver: {format(new Date(l.fechaDevolucionEsperada), 'd MMM yyyy', { locale: es })}
            </Text></div>
          )}
        </div>
      ) : '-'
    },
    {
      title: '', key: 'accion',
      render: (_, l) => l.estado === 'DISPONIBLE' ? (
        <Button size="small" type="primary" onClick={() => setModalPrestar(l.id)}>Prestar</Button>
      ) : l.estado === 'PRESTADA' ? (
        <Button size="small" danger onClick={() => devolver.mutate(l.id)}>Devolver</Button>
      ) : null
    },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Llaves</Title>
      </div>

      {vencidas.length > 0 && (
        <Alert
          type="warning"
          icon={<WarningOutlined />}
          showIcon
          message={`${vencidas.length} llave(s) con devolución vencida`}
          style={{ marginBottom: 16 }}
        />
      )}

      <Table
        dataSource={llaves}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        size="small"
        locale={{ emptyText: 'Sin llaves registradas' }}
      />

      <ModalPrestar
        open={!!modalPrestar}
        onClose={() => setModalPrestar(null)}
        llaveId={modalPrestar}
      />
    </div>
  )
}
