import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Card, Button, Table, Modal, Form, Input, Select, InputNumber,
  Tag, Switch, Space, Tabs, Typography, App, DatePicker
} from 'antd'
import { PlusOutlined, EditOutlined } from '@ant-design/icons'
import api from '../../services/api'
import dayjs from 'dayjs'

const { Text } = Typography

const TIPO_PACK_LABEL = { COMBO_ESPECIFICO: 'Combo específico', POR_CANTIDAD: 'Por cantidad' }
const TIPO_BENEFICIO_LABEL = { ARRIENDO_ASEGURADO: 'Arriendo asegurado', GASTOS_NOTARIALES: 'Gastos notariales', CUOTAS_SIN_INTERES: 'Cuotas sin interés', OTRO: 'Otro' }

function ModalPack({ open, onClose, pack }) {
  const [form] = Form.useForm()
  const qc = useQueryClient()
  const { message } = App.useApp()
  const tipo = Form.useWatch('tipo', form)

  const { data: unidades = [] } = useQuery({
    queryKey: ['unidades-selector'],
    queryFn: () => api.get('/cotizaciones/unidades-disponibles').then(r => r.data)
  })

  const guardar = useMutation({
    mutationFn: (d) => pack
      ? api.put(`/packs/${pack.id}`, d)
      : api.post('/packs', d),
    onSuccess: () => {
      message.success(pack ? 'Pack actualizado' : 'Pack creado')
      qc.invalidateQueries({ queryKey: ['packs'] })
      qc.invalidateQueries({ queryKey: ['packs-activos'] })
      onClose()
    },
    onError: err => message.error(err.response?.data?.error || 'Error')
  })

  const handleOk = () => {
    form.validateFields().then(values => {
      const data = {
        ...values,
        fechaInicio: values.fechaInicio ? values.fechaInicio.toISOString() : null,
        fechaFin: values.fechaFin ? values.fechaFin.toISOString() : null,
        unidadIds: values.unidadIds || []
      }
      guardar.mutate(data)
    })
  }

  const initialValues = pack ? {
    ...pack,
    fechaInicio: pack.fechaInicio ? dayjs(pack.fechaInicio) : null,
    fechaFin: pack.fechaFin ? dayjs(pack.fechaFin) : null,
    unidadIds: pack.unidades?.map(u => u.unidadId) || []
  } : { activa: true, minUnidades: 2 }

  return (
    <Modal
      title={pack ? 'Editar pack' : 'Nuevo pack'}
      open={open}
      onCancel={onClose}
      onOk={handleOk}
      confirmLoading={guardar.isPending}
      okText="Guardar"
    >
      <Form form={form} layout="vertical" initialValues={initialValues} style={{ marginTop: 12 }}>
        <Form.Item name="nombre" label="Nombre" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="descripcion" label="Descripción">
          <Input.TextArea rows={2} />
        </Form.Item>
        <Form.Item name="tipo" label="Tipo" rules={[{ required: true }]}>
          <Select options={Object.entries(TIPO_PACK_LABEL).map(([v, l]) => ({ value: v, label: l }))} />
        </Form.Item>
        <Form.Item name="descuentoUF" label="Descuento (UF)" rules={[{ required: true }]}>
          <InputNumber min={0.1} step={0.5} style={{ width: '100%' }} addonAfter="UF" />
        </Form.Item>
        {tipo === 'POR_CANTIDAD' && (
          <Form.Item name="minUnidades" label="Mínimo de unidades">
            <InputNumber min={2} style={{ width: '100%' }} />
          </Form.Item>
        )}
        {tipo === 'COMBO_ESPECIFICO' && (
          <Form.Item name="unidadIds" label="Unidades del combo">
            <Select
              mode="multiple"
              placeholder="Seleccionar unidades..."
              options={unidades.map(u => ({ value: u.id, label: `${u.edificio.nombre} — ${u.numero}` }))}
              filterOption={(v, o) => o.label.toLowerCase().includes(v.toLowerCase())}
            />
          </Form.Item>
        )}
        <Space>
          <Form.Item name="fechaInicio" label="Válido desde">
            <DatePicker format="DD/MM/YYYY" />
          </Form.Item>
          <Form.Item name="fechaFin" label="Válido hasta">
            <DatePicker format="DD/MM/YYYY" />
          </Form.Item>
        </Space>
        {pack && (
          <Form.Item name="activa" label="Activo" valuePropName="checked">
            <Switch />
          </Form.Item>
        )}
      </Form>
    </Modal>
  )
}

function ModalBeneficio({ open, onClose, beneficio }) {
  const [form] = Form.useForm()
  const qc = useQueryClient()
  const { message } = App.useApp()
  const tipo = Form.useWatch('tipo', form)

  const guardar = useMutation({
    mutationFn: (d) => beneficio
      ? api.put(`/beneficios/${beneficio.id}`, d)
      : api.post('/beneficios', d),
    onSuccess: () => {
      message.success(beneficio ? 'Beneficio actualizado' : 'Beneficio creado')
      qc.invalidateQueries({ queryKey: ['beneficios'] })
      qc.invalidateQueries({ queryKey: ['beneficios-activos'] })
      onClose()
    },
    onError: err => message.error(err.response?.data?.error || 'Error')
  })

  const handleOk = () => {
    form.validateFields().then(values => {
      guardar.mutate({
        ...values,
        fechaInicio: values.fechaInicio ? values.fechaInicio.toISOString() : null,
        fechaFin: values.fechaFin ? values.fechaFin.toISOString() : null,
      })
    })
  }

  const initialValues = beneficio ? {
    ...beneficio,
    fechaInicio: beneficio.fechaInicio ? dayjs(beneficio.fechaInicio) : null,
    fechaFin: beneficio.fechaFin ? dayjs(beneficio.fechaFin) : null,
  } : { activa: true }

  return (
    <Modal
      title={beneficio ? 'Editar beneficio' : 'Nuevo beneficio'}
      open={open}
      onCancel={onClose}
      onOk={handleOk}
      confirmLoading={guardar.isPending}
      okText="Guardar"
    >
      <Form form={form} layout="vertical" initialValues={initialValues} style={{ marginTop: 12 }}>
        <Form.Item name="nombre" label="Nombre" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="descripcion" label="Descripción">
          <Input.TextArea rows={2} />
        </Form.Item>
        <Form.Item name="tipo" label="Tipo" rules={[{ required: true }]}>
          <Select options={Object.entries(TIPO_BENEFICIO_LABEL).map(([v, l]) => ({ value: v, label: l }))} />
        </Form.Item>
        {tipo === 'ARRIENDO_ASEGURADO' && (
          <Space>
            <Form.Item name="meses" label="Meses">
              <InputNumber min={1} style={{ width: 100 }} />
            </Form.Item>
            <Form.Item name="montoMensualUF" label="Monto/mes (UF)">
              <InputNumber min={0.1} step={0.1} style={{ width: 120 }} addonAfter="UF" />
            </Form.Item>
          </Space>
        )}
        {tipo === 'OTRO' && (
          <Form.Item name="detalle" label="Detalle">
            <Input.TextArea rows={2} />
          </Form.Item>
        )}
        <Space>
          <Form.Item name="fechaInicio" label="Válido desde">
            <DatePicker format="DD/MM/YYYY" />
          </Form.Item>
          <Form.Item name="fechaFin" label="Válido hasta">
            <DatePicker format="DD/MM/YYYY" />
          </Form.Item>
        </Space>
        {beneficio && (
          <Form.Item name="activa" label="Activo" valuePropName="checked">
            <Switch />
          </Form.Item>
        )}
      </Form>
    </Modal>
  )
}

function TabPacks() {
  const [modal, setModal] = useState({ open: false, pack: null })
  const { data: packs = [], isLoading } = useQuery({
    queryKey: ['packs'],
    queryFn: () => api.get('/packs').then(r => r.data)
  })

  const columns = [
    {
      title: 'Nombre', dataIndex: 'nombre', key: 'nombre',
      render: (t, r) => <><Text strong>{t}</Text>{r.descripcion && <div><Text type="secondary" style={{ fontSize: 12 }}>{r.descripcion}</Text></div>}</>
    },
    { title: 'Tipo', dataIndex: 'tipo', key: 'tipo', render: t => <Tag>{TIPO_PACK_LABEL[t]}</Tag> },
    { title: 'Descuento', dataIndex: 'descuentoUF', key: 'descuentoUF', render: v => <Text strong style={{ color: '#d46b08' }}>−{v} UF</Text> },
    { title: 'Activo', dataIndex: 'activa', key: 'activa', render: v => <Tag color={v ? 'green' : 'default'}>{v ? 'Sí' : 'No'}</Tag> },
    { title: '', key: 'acciones', render: (_, r) => <Button size="small" icon={<EditOutlined />} onClick={() => setModal({ open: true, pack: r })}>Editar</Button> }
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModal({ open: true, pack: null })}>Nuevo pack</Button>
      </div>
      <Table dataSource={packs} columns={columns} rowKey="id" loading={isLoading} size="small" />
      <ModalPack open={modal.open} onClose={() => setModal({ open: false, pack: null })} pack={modal.pack} />
    </div>
  )
}

function TabBeneficios() {
  const [modal, setModal] = useState({ open: false, beneficio: null })
  const { data: beneficios = [], isLoading } = useQuery({
    queryKey: ['beneficios'],
    queryFn: () => api.get('/beneficios').then(r => r.data)
  })

  const columns = [
    {
      title: 'Nombre', dataIndex: 'nombre', key: 'nombre',
      render: (t, r) => <><Text strong>{t}</Text>{r.descripcion && <div><Text type="secondary" style={{ fontSize: 12 }}>{r.descripcion}</Text></div>}</>
    },
    { title: 'Tipo', dataIndex: 'tipo', key: 'tipo', render: t => <Tag color="green">{TIPO_BENEFICIO_LABEL[t]}</Tag> },
    { title: 'Activo', dataIndex: 'activa', key: 'activa', render: v => <Tag color={v ? 'green' : 'default'}>{v ? 'Sí' : 'No'}</Tag> },
    { title: '', key: 'acciones', render: (_, r) => <Button size="small" icon={<EditOutlined />} onClick={() => setModal({ open: true, beneficio: r })}>Editar</Button> }
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModal({ open: true, beneficio: null })}>Nuevo beneficio</Button>
      </div>
      <Table dataSource={beneficios} columns={columns} rowKey="id" loading={isLoading} size="small" />
      <ModalBeneficio open={modal.open} onClose={() => setModal({ open: false, beneficio: null })} beneficio={modal.beneficio} />
    </div>
  )
}

export default function PacksBeneficios() {
  const tabItems = [
    { key: 'packs', label: 'Packs de descuento', children: <TabPacks /> },
    { key: 'beneficios', label: 'Beneficios adicionales', children: <TabBeneficios /> },
  ]
  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 20 }}>
        <Text style={{ fontSize: 22, fontWeight: 700 }}>Packs y Beneficios</Text>
        <div><Text type="secondary">Administra los descuentos y beneficios disponibles para las cotizaciones.</Text></div>
      </div>
      <Card>
        <Tabs items={tabItems} />
      </Card>
    </div>
  )
}
