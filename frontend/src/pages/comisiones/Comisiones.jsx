import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Table, Tag, Button, Typography, Row, Col, Card, Statistic, Select, Space, App,
  Modal, Form, Input, InputNumber, Radio, Divider, Switch, Popconfirm
} from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'

const { Title, Text } = Typography

function ModalPlantilla({ open, onClose, plantillaEditando, onGuardar }) {
  const [form] = Form.useForm()
  const [tipoCalculo, setTipoCalculo] = useState('porcentaje')

  const handleAfterOpen = () => {
    if (plantillaEditando) {
      const tipo = plantillaEditando.porcentaje != null ? 'porcentaje' : 'fijo'
      setTipoCalculo(tipo)
      form.setFieldsValue({
        nombre: plantillaEditando.nombre,
        concepto: plantillaEditando.concepto,
        tipoCalculo: tipo,
        porcentaje: plantillaEditando.porcentaje,
        montoFijo: plantillaEditando.montoFijo,
        pctPromesa: plantillaEditando.pctPromesa,
        pctEscritura: plantillaEditando.pctEscritura,
        activa: plantillaEditando.activa,
      })
    } else {
      setTipoCalculo('porcentaje')
      form.resetFields()
      form.setFieldsValue({ tipoCalculo: 'porcentaje', pctPromesa: 50, pctEscritura: 50, activa: true })
    }
  }

  const handleOk = () => {
    form.validateFields().then(values => {
      onGuardar({
        nombre: values.nombre,
        concepto: values.concepto,
        porcentaje: values.tipoCalculo === 'porcentaje' ? values.porcentaje : null,
        montoFijo: values.tipoCalculo === 'fijo' ? values.montoFijo : null,
        pctPromesa: values.pctPromesa,
        pctEscritura: values.pctEscritura,
        activa: values.activa,
      })
    })
  }

  return (
    <Modal
      title={plantillaEditando ? 'Editar plantilla' : 'Nueva plantilla de comisión'}
      open={open}
      onCancel={onClose}
      onOk={handleOk}
      afterOpenChange={o => o && handleAfterOpen()}
      okText="Guardar"
      cancelText="Cancelar"
    >
      <Form form={form} layout="vertical" style={{ marginTop: 12 }}>
        <Form.Item name="nombre" label="Nombre" rules={[{ required: true, message: 'Ingresa un nombre' }]}>
          <Input placeholder="Ej: Broker Estándar" />
        </Form.Item>
        <Form.Item name="concepto" label="Concepto (etiqueta)" rules={[{ required: true, message: 'Ingresa el concepto' }]}>
          <Input placeholder="Ej: BROKER, VENDEDOR INTERNO..." />
        </Form.Item>
        <Form.Item name="tipoCalculo" label="Tipo">
          <Radio.Group onChange={e => { setTipoCalculo(e.target.value); form.setFieldsValue({ porcentaje: undefined, montoFijo: undefined }) }}>
            <Radio value="porcentaje">% sobre precio venta</Radio>
            <Radio value="fijo">Monto fijo en UF</Radio>
          </Radio.Group>
        </Form.Item>
        {tipoCalculo === 'porcentaje' ? (
          <Form.Item name="porcentaje" label="Porcentaje" rules={[{ required: true, message: 'Ingresa el %' }]}>
            <InputNumber min={0} max={100} step={0.1} addonAfter="%" style={{ width: '100%' }} />
          </Form.Item>
        ) : (
          <Form.Item name="montoFijo" label="Monto fijo" rules={[{ required: true, message: 'Ingresa el monto' }]}>
            <InputNumber min={0} step={0.1} addonAfter="UF" style={{ width: '100%' }} />
          </Form.Item>
        )}
        <Divider style={{ margin: '8px 0' }}>Split de pago</Divider>
        <Row gutter={12}>
          <Col span={12}>
            <Form.Item name="pctPromesa" label="% en promesa" rules={[{ required: true }]}>
              <InputNumber
                min={0} max={100} step={5} addonAfter="%" style={{ width: '100%' }}
                onChange={v => form.setFieldValue('pctEscritura', 100 - (v || 0))}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="pctEscritura" label="% en escritura" rules={[{ required: true }]}>
              <InputNumber
                min={0} max={100} step={5} addonAfter="%" style={{ width: '100%' }}
                onChange={v => form.setFieldValue('pctPromesa', 100 - (v || 0))}
              />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item name="activa" label="Estado" valuePropName="checked">
          <Switch checkedChildren="Activa" unCheckedChildren="Inactiva" />
        </Form.Item>
      </Form>
    </Modal>
  )
}

export default function Comisiones() {
  const { usuario, esGerenciaOJV, esGerente } = useAuth()
  const [vendedorFiltro, setVendedorFiltro] = useState(undefined)
  const [estadoFiltro, setEstadoFiltro] = useState(undefined)
  const [modalPlantilla, setModalPlantilla] = useState(false)
  const [plantillaEditando, setPlantillaEditando] = useState(null)
  const qc = useQueryClient()
  const { message } = App.useApp()

  const { data: comisiones = [], isLoading } = useQuery({
    queryKey: ['comisiones', vendedorFiltro, estadoFiltro],
    queryFn: () => api.get('/comisiones', { params: { usuarioId: vendedorFiltro, estado: estadoFiltro } }).then(r => r.data)
  })

  const { data: resumen } = useQuery({
    queryKey: ['comisiones-resumen'],
    queryFn: () => api.get('/comisiones/resumen').then(r => r.data),
    enabled: esGerenciaOJV
  })

  const { data: vendedores = [] } = useQuery({
    queryKey: ['usuarios-vendedores'],
    queryFn: () => api.get('/usuarios').then(r => r.data.filter(u =>
      ['VENDEDOR', 'BROKER_EXTERNO', 'JEFE_VENTAS'].includes(u.rol)
    )),
    enabled: esGerenciaOJV
  })

  const { data: plantillas = [], refetch: refetchPlantillas } = useQuery({
    queryKey: ['plantillas-comision'],
    queryFn: () => api.get('/plantillas-comision').then(r => r.data),
    enabled: esGerente
  })

  const marcar = useMutation({
    mutationFn: ({ id, tramo }) => api.put(`/comisiones/${id}/${tramo}`, {}),
    onSuccess: () => { message.success('Comisión actualizada'); qc.invalidateQueries(['comisiones']) },
    onError: err => message.error(err.response?.data?.error || 'Error')
  })

  const crearPlantilla = useMutation({
    mutationFn: (data) => api.post('/plantillas-comision', data),
    onSuccess: () => { message.success('Plantilla creada'); refetchPlantillas(); setModalPlantilla(false) },
    onError: err => message.error(err.response?.data?.error || 'Error')
  })

  const actualizarPlantilla = useMutation({
    mutationFn: ({ id, ...data }) => api.put(`/plantillas-comision/${id}`, data),
    onSuccess: () => { message.success('Plantilla actualizada'); refetchPlantillas(); setModalPlantilla(false); setPlantillaEditando(null) },
    onError: err => message.error(err.response?.data?.error || 'Error')
  })

  const eliminarPlantilla = useMutation({
    mutationFn: (id) => api.delete(`/plantillas-comision/${id}`),
    onSuccess: () => { message.success('Plantilla eliminada'); refetchPlantillas() },
    onError: err => message.error(err.response?.data?.error || 'Error')
  })

  const columns = [
    {
      title: 'Vendedor', key: 'vendedor',
      render: (_, c) => <Text strong>{c.usuario?.nombre} {c.usuario?.apellido}</Text>
    },
    {
      title: 'Venta', key: 'venta',
      render: (_, c) => (
        <div>
          <Text style={{ fontSize: 13 }}>
            {c.venta?.comprador?.nombre} {c.venta?.comprador?.apellido}
          </Text>
          <div><Text type="secondary" style={{ fontSize: 12 }}>
            {c.venta?.unidad?.edificio?.nombre} — {c.venta?.unidad?.numero}
          </Text></div>
        </div>
      )
    },
    {
      title: 'Total', key: 'total',
      render: (_, c) => (
        <Text strong>{c.montoCalculadoUF?.toFixed(2)} UF</Text>
      )
    },
    {
      title: '1ª mitad (promesa)', key: 'primera',
      render: (_, c) => (
        <div>
          <Tag color={c.estadoPrimera === 'PAGADO' ? 'green' : 'orange'}>{c.estadoPrimera?.toLowerCase()}</Tag>
          <div style={{ fontSize: 12 }}>{c.montoPrimera?.toFixed(2)} UF</div>
          {esGerenciaOJV && c.estadoPrimera === 'PENDIENTE' && (
            <Button type="link" size="small" onClick={() => marcar.mutate({ id: c.id, tramo: 'primera' })}>
              Marcar pagada
            </Button>
          )}
        </div>
      )
    },
    {
      title: '2ª mitad (escritura)', key: 'segunda',
      render: (_, c) => (
        <div>
          <Tag color={c.estadoSegunda === 'PAGADO' ? 'green' : 'orange'}>{c.estadoSegunda?.toLowerCase()}</Tag>
          <div style={{ fontSize: 12 }}>{c.montoSegunda?.toFixed(2)} UF</div>
          {esGerenciaOJV && c.estadoSegunda === 'PENDIENTE' && (
            <Button type="link" size="small" onClick={() => marcar.mutate({ id: c.id, tramo: 'segunda' })}>
              Marcar pagada
            </Button>
          )}
        </div>
      )
    },
  ]

  const plantillaColumns = [
    { title: 'Nombre', dataIndex: 'nombre' },
    { title: 'Concepto', dataIndex: 'concepto' },
    { title: 'Comisión', render: (_, r) => r.porcentaje != null ? `${r.porcentaje}%` : `${r.montoFijo} UF` },
    { title: 'Split promesa / escritura', render: (_, r) => `${r.pctPromesa}% / ${r.pctEscritura}%` },
    { title: 'Estado', render: (_, r) => <Tag color={r.activa ? 'green' : 'default'}>{r.activa ? 'Activa' : 'Inactiva'}</Tag> },
    {
      title: '', render: (_, r) => (
        <Space size={4}>
          <Button size="small" icon={<EditOutlined />} onClick={() => { setPlantillaEditando(r); setModalPlantilla(true) }} />
          <Popconfirm
            title="¿Eliminar esta plantilla?"
            onConfirm={() => eliminarPlantilla.mutate(r.id)}
            okText="Eliminar" cancelText="Cancelar" okButtonProps={{ danger: true }}
          >
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      )
    }
  ]

  return (
    <div>
      <Title level={4} style={{ marginBottom: 20 }}>Comisiones</Title>

      {esGerenciaOJV && resumen && (
        <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
          <Col xs={12} sm={8}>
            <Card><Statistic title="Total pendiente" value={`${resumen.totalPendienteUF?.toFixed(2) || 0} UF`} /></Card>
          </Col>
          <Col xs={12} sm={8}>
            <Card><Statistic title="Total pagado" value={`${resumen.totalPagadoUF?.toFixed(2) || 0} UF`} valueStyle={{ color: '#52c41a' }} /></Card>
          </Col>
        </Row>
      )}

      <Space style={{ marginBottom: 16, flexWrap: 'wrap' }}>
        {esGerenciaOJV && (
          <Select
            placeholder="Todos los vendedores"
            value={vendedorFiltro}
            onChange={setVendedorFiltro}
            allowClear
            style={{ width: 200 }}
            options={vendedores.map(v => ({ value: v.id, label: `${v.nombre} ${v.apellido}` }))}
          />
        )}
        <Select
          placeholder="Todos los estados"
          value={estadoFiltro}
          onChange={setEstadoFiltro}
          allowClear
          style={{ width: 180 }}
          options={[
            { value: 'PENDIENTE', label: 'Pendiente' },
            { value: 'PAGADO', label: 'Pagado' },
          ]}
        />
      </Space>

      <Table
        dataSource={comisiones}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        size="small"
        locale={{ emptyText: 'Sin comisiones' }}
      />

      {esGerente && (
        <Card
          title="Plantillas de comisión"
          extra={
            <Button
              size="small"
              icon={<PlusOutlined />}
              onClick={() => { setPlantillaEditando(null); setModalPlantilla(true) }}
            >
              Nueva plantilla
            </Button>
          }
          style={{ marginTop: 32 }}
        >
          <Table
            dataSource={plantillas}
            rowKey="id"
            size="small"
            columns={plantillaColumns}
            locale={{ emptyText: 'Sin plantillas. Crea una usando el botón "Nueva plantilla".' }}
          />
          <ModalPlantilla
            open={modalPlantilla}
            onClose={() => { setModalPlantilla(false); setPlantillaEditando(null) }}
            plantillaEditando={plantillaEditando}
            onGuardar={(data) => {
              if (plantillaEditando) {
                actualizarPlantilla.mutate({ id: plantillaEditando.id, ...data })
              } else {
                crearPlantilla.mutate(data)
              }
            }}
          />
        </Card>
      )}
    </div>
  )
}
