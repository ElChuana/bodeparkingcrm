import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Table, Tag, Button, Typography, Modal, Form, Input, Select, Space, App } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import api from '../../services/api'
import { useUF } from '../../hooks/useUF'

const { Title, Text } = Typography

function ModalArriendo({ open, onClose, arriendo }) {
  const qc = useQueryClient()
  const [form] = Form.useForm()
  const { message } = App.useApp()

  const { data: unidades = [] } = useQuery({
    queryKey: ['unidades-arrendables'],
    queryFn: () => api.get('/unidades').then(r => r.data.filter(u => ['DISPONIBLE','ARRENDADO'].includes(u.estado))),
    enabled: open
  })

  const { data: contactos = [] } = useQuery({
    queryKey: ['contactos'],
    queryFn: () => api.get('/contactos').then(r => r.data),
    enabled: open
  })

  const guardar = useMutation({
    mutationFn: (d) => arriendo ? api.put(`/arriendos/${arriendo.id}`, d) : api.post('/arriendos', d),
    onSuccess: () => {
      message.success(arriendo ? 'Arriendo actualizado' : 'Arriendo creado')
      qc.invalidateQueries(['arriendos'])
      onClose()
      form.resetFields()
    },
    onError: err => message.error(err.response?.data?.error || 'Error')
  })

  return (
    <Modal title={arriendo ? 'Editar Arriendo' : 'Nuevo Arriendo'} open={open} onCancel={onClose}
      onOk={() => form.validateFields().then(guardar.mutate)}
      okText="Guardar" cancelText="Cancelar" confirmLoading={guardar.isPending}>
      <Form form={form} layout="vertical" style={{ marginTop: 16 }}
        initialValues={arriendo || { estado: 'ACTIVO' }}>
        <Form.Item name="unidadId" label="Unidad" rules={[{ required: true }]}>
          <Select
            placeholder="Seleccionar unidad..."
            options={unidades.map(u => ({
              value: u.id,
              label: `${u.edificio?.nombre || ''} — ${u.tipo === 'BODEGA' ? 'Bodega' : 'Est.'} ${u.numero}`
            }))}
          />
        </Form.Item>
        <Form.Item name="arrendatarioId" label="Arrendatario" rules={[{ required: true }]}>
          <Select
            placeholder="Seleccionar contacto..."
            options={contactos.map(c => ({ value: c.id, label: `${c.nombre} ${c.apellido}` }))}
            showSearch
            filterOption={(input, opt) => opt.label.toLowerCase().includes(input.toLowerCase())}
          />
        </Form.Item>
        <Space.Compact style={{ width: '100%' }}>
          <Form.Item name="montoMensualUF" label="Monto mensual (UF)" rules={[{ required: true }]} style={{ width: '50%' }}>
            <Input type="number" step="0.01" />
          </Form.Item>
          <Form.Item name="montoMensualCLP" label="Monto mensual (CLP)" style={{ width: '50%' }}>
            <Input type="number" />
          </Form.Item>
        </Space.Compact>
        <Space.Compact style={{ width: '100%' }}>
          <Form.Item name="fechaInicio" label="Inicio" rules={[{ required: true }]} style={{ width: '50%' }}>
            <Input type="date" />
          </Form.Item>
          <Form.Item name="fechaFin" label="Fin" style={{ width: '50%' }}>
            <Input type="date" />
          </Form.Item>
        </Space.Compact>
        <Form.Item name="estado" label="Estado">
          <Select options={[
            { value: 'ACTIVO', label: 'Activo' },
            { value: 'TERMINADO', label: 'Terminado' },
            { value: 'MOROSO', label: 'Moroso' },
          ]} />
        </Form.Item>
      </Form>
    </Modal>
  )
}

export default function Arriendos() {
  const [modalOpen, setModalOpen] = useState(false)
  const [arriendoEditar, setArriendoEditar] = useState(null)
  const { formatUF } = useUF()

  const { data: arriendos = [], isLoading } = useQuery({
    queryKey: ['arriendos'],
    queryFn: () => api.get('/arriendos').then(r => r.data)
  })

  const ESTADO_COLOR = { ACTIVO: 'green', TERMINADO: 'default', MOROSO: 'red' }

  const columns = [
    {
      title: 'Arrendatario', key: 'arrendatario',
      render: (_, a) => (
        <div>
          <Text strong>{a.arrendatario?.nombre} {a.arrendatario?.apellido}</Text>
          <div><Text type="secondary" style={{ fontSize: 12 }}>{a.arrendatario?.telefono || a.arrendatario?.email || ''}</Text></div>
        </div>
      )
    },
    {
      title: 'Unidad', key: 'unidad',
      render: (_, a) => (
        <div>
          <Text>{a.unidad?.edificio?.nombre}</Text>
          <div><Text type="secondary" style={{ fontSize: 12 }}>{a.unidad?.tipo === 'BODEGA' ? 'Bodega' : 'Est.'} {a.unidad?.numero}</Text></div>
        </div>
      )
    },
    {
      title: 'Monto mensual', key: 'monto',
      render: (_, a) => <Text strong>{formatUF(a.montoMensualUF)}</Text>
    },
    {
      title: 'Inicio', dataIndex: 'fechaInicio', key: 'inicio',
      render: (d) => <Text style={{ fontSize: 12 }}>{format(new Date(d), 'd MMM yyyy', { locale: es })}</Text>
    },
    {
      title: 'Fin', dataIndex: 'fechaFin', key: 'fin',
      render: (d) => d ? <Text style={{ fontSize: 12 }}>{format(new Date(d), 'd MMM yyyy', { locale: es })}</Text> : '-'
    },
    {
      title: 'Estado', dataIndex: 'estado', key: 'estado',
      render: (e) => <Tag color={ESTADO_COLOR[e]}>{e.toLowerCase()}</Tag>
    },
    {
      title: '', key: 'accion',
      render: (_, a) => (
        <Button size="small" type="link" onClick={() => { setArriendoEditar(a); setModalOpen(true) }}>Editar</Button>
      )
    },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <Title level={4} style={{ margin: 0 }}>Arriendos</Title>
        <Button type="primary" icon={<PlusOutlined />}
          onClick={() => { setArriendoEditar(null); setModalOpen(true) }}>
          Nuevo arriendo
        </Button>
      </div>

      <Table
        dataSource={arriendos}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        size="small"
        locale={{ emptyText: 'Sin arriendos registrados' }}
      />

      <ModalArriendo open={modalOpen} onClose={() => setModalOpen(false)} arriendo={arriendoEditar} />
    </div>
  )
}
