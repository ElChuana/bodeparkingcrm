import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Table, Tag, Button, Typography, Row, Col, Card, Statistic, Select, Space, App,
  Modal, Form, Input, InputNumber, Radio, Divider, Switch, Popconfirm, DatePicker
} from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, DownloadOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'

const { Title, Text } = Typography

const AMBITO_LABEL = {
  VENDE: 'Cuando vende él/ella',
  VENTAS_DE_OTROS: 'Ventas del resto del equipo',
  TODAS: 'Todas las ventas',
}
const ORIGEN_LABEL = {
  CUALQUIERA: 'Cualquier origen',
  SOLO_WEBINAR: 'Solo webinar',
  NO_WEBINAR: 'Solo NO webinar',
}
const ROL_LABEL = {
  GERENTE: 'Gerente',
  JEFE_VENTAS: 'Jefe de Ventas',
  VENDEDOR: 'Vendedor',
  BROKER_EXTERNO: 'Broker externo',
  ABOGADO: 'Abogado',
}

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

function ModalRegla({ open, onClose, reglaEditando, usuarios, onGuardar }) {
  const [form] = Form.useForm()
  const [aplicaA, setAplicaA] = useState('rol')

  const handleAfterOpen = () => {
    if (reglaEditando) {
      const tipo = reglaEditando.usuarioId ? 'usuario' : 'rol'
      setAplicaA(tipo)
      form.setFieldsValue({
        nombre: reglaEditando.nombre,
        aplicaA: tipo,
        usuarioId: reglaEditando.usuarioId,
        rol: reglaEditando.rol,
        ambito: reglaEditando.ambito,
        origen: reglaEditando.origen,
        porcentaje: reglaEditando.porcentaje,
        pctPromesa: reglaEditando.pctPromesa,
        pctEscritura: reglaEditando.pctEscritura,
        activa: reglaEditando.activa,
      })
    } else {
      setAplicaA('rol')
      form.resetFields()
      form.setFieldsValue({ aplicaA: 'rol', ambito: 'VENDE', origen: 'CUALQUIERA', pctPromesa: 50, pctEscritura: 50, activa: true })
    }
  }

  const handleOk = () => {
    form.validateFields().then(values => {
      onGuardar({
        nombre: values.nombre,
        usuarioId: values.aplicaA === 'usuario' ? values.usuarioId : null,
        rol: values.aplicaA === 'rol' ? values.rol : null,
        ambito: values.ambito,
        origen: values.origen,
        porcentaje: values.porcentaje,
        pctPromesa: values.pctPromesa,
        pctEscritura: values.pctEscritura,
        activa: values.activa,
      })
    })
  }

  return (
    <Modal
      title={reglaEditando ? 'Editar regla' : 'Nueva regla de comisión'}
      open={open}
      onCancel={onClose}
      onOk={handleOk}
      afterOpenChange={o => o && handleAfterOpen()}
      okText="Guardar"
      cancelText="Cancelar"
    >
      <Form form={form} layout="vertical" style={{ marginTop: 12 }}>
        <Form.Item name="nombre" label="Nombre" rules={[{ required: true, message: 'Ingresa un nombre' }]}>
          <Input placeholder="Ej: Vendedor 4%" />
        </Form.Item>
        <Form.Item name="aplicaA" label="Aplica a">
          <Radio.Group onChange={e => { setAplicaA(e.target.value); form.setFieldsValue({ usuarioId: undefined, rol: undefined }) }}>
            <Radio value="rol">Un rol completo</Radio>
            <Radio value="usuario">Un usuario específico</Radio>
          </Radio.Group>
        </Form.Item>
        {aplicaA === 'usuario' ? (
          <Form.Item name="usuarioId" label="Usuario" rules={[{ required: true, message: 'Selecciona un usuario' }]}>
            <Select
              showSearch
              optionFilterProp="label"
              placeholder="Selecciona usuario"
              options={usuarios.map(u => ({ value: u.id, label: `${u.nombre} ${u.apellido} (${ROL_LABEL[u.rol] || u.rol})` }))}
            />
          </Form.Item>
        ) : (
          <Form.Item name="rol" label="Rol" rules={[{ required: true, message: 'Selecciona un rol' }]}>
            <Select
              placeholder="Selecciona rol"
              options={Object.entries(ROL_LABEL).map(([value, label]) => ({ value, label }))}
            />
          </Form.Item>
        )}
        <Form.Item name="ambito" label="Cuándo aplica" rules={[{ required: true }]}>
          <Select options={Object.entries(AMBITO_LABEL).map(([value, label]) => ({ value, label }))} />
        </Form.Item>
        <Form.Item name="origen" label="Origen de la venta" rules={[{ required: true }]}>
          <Select options={Object.entries(ORIGEN_LABEL).map(([value, label]) => ({ value, label }))} />
        </Form.Item>
        <Form.Item name="porcentaje" label="Porcentaje sobre precio de venta" rules={[{ required: true, message: 'Ingresa el %' }]}>
          <InputNumber min={0} max={100} step={0.5} addonAfter="%" style={{ width: '100%' }} />
        </Form.Item>
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
  const [mes, setMes] = useState(dayjs())
  const [mesUsuarioFiltro, setMesUsuarioFiltro] = useState(undefined)
  const [modalPlantilla, setModalPlantilla] = useState(false)
  const [plantillaEditando, setPlantillaEditando] = useState(null)
  const [modalRegla, setModalRegla] = useState(false)
  const [reglaEditando, setReglaEditando] = useState(null)
  const qc = useQueryClient()
  const { message } = App.useApp()

  const mesStr = mes.format('YYYY-MM')

  const { data: comisiones = [], isLoading } = useQuery({
    queryKey: ['comisiones', vendedorFiltro, estadoFiltro],
    queryFn: () => api.get('/comisiones', { params: { usuarioId: vendedorFiltro, estado: estadoFiltro } }).then(r => r.data),
    enabled: esGerenciaOJV
  })

  const { data: resumen } = useQuery({
    queryKey: ['comisiones-resumen'],
    queryFn: () => api.get('/comisiones/resumen').then(r => r.data),
    enabled: esGerenciaOJV
  })

  const { data: mensual, isLoading: cargandoMensual } = useQuery({
    queryKey: ['comisiones-mensual', mesStr, mesUsuarioFiltro],
    queryFn: () => api.get('/comisiones/mensual', { params: { mes: mesStr, usuarioId: mesUsuarioFiltro } }).then(r => r.data)
  })

  const { data: vendedores = [] } = useQuery({
    queryKey: ['usuarios-vendedores'],
    queryFn: () => api.get('/usuarios').then(r => r.data.filter(u =>
      ['VENDEDOR', 'BROKER_EXTERNO', 'JEFE_VENTAS', 'GERENTE'].includes(u.rol)
    )),
    enabled: esGerenciaOJV
  })

  const { data: usuariosTodos = [] } = useQuery({
    queryKey: ['usuarios-todos'],
    queryFn: () => api.get('/usuarios').then(r => r.data),
    enabled: esGerente
  })

  const { data: plantillas = [], refetch: refetchPlantillas } = useQuery({
    queryKey: ['plantillas-comision'],
    queryFn: () => api.get('/plantillas-comision').then(r => r.data),
    enabled: esGerente
  })

  const { data: reglas = [], refetch: refetchReglas } = useQuery({
    queryKey: ['reglas-comision'],
    queryFn: () => api.get('/reglas-comision').then(r => r.data),
    enabled: esGerenciaOJV
  })

  const invalidarComisiones = () => {
    qc.invalidateQueries({ queryKey: ['comisiones'] })
    qc.invalidateQueries({ queryKey: ['comisiones-mensual'] })
    qc.invalidateQueries({ queryKey: ['comisiones-resumen'] })
  }

  const marcar = useMutation({
    mutationFn: ({ id, tramo }) => api.put(`/comisiones/${id}/${tramo}`, {}),
    onSuccess: () => { message.success('Comisión actualizada'); invalidarComisiones() },
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

  const crearRegla = useMutation({
    mutationFn: (data) => api.post('/reglas-comision', data),
    onSuccess: () => { message.success('Regla creada'); refetchReglas(); setModalRegla(false) },
    onError: err => message.error(err.response?.data?.error || 'Error')
  })

  const actualizarRegla = useMutation({
    mutationFn: ({ id, ...data }) => api.put(`/reglas-comision/${id}`, data),
    onSuccess: () => { message.success('Regla actualizada'); refetchReglas(); setModalRegla(false); setReglaEditando(null) },
    onError: err => message.error(err.response?.data?.error || 'Error')
  })

  const eliminarRegla = useMutation({
    mutationFn: (id) => api.delete(`/reglas-comision/${id}`),
    onSuccess: () => { message.success('Regla eliminada'); refetchReglas() },
    onError: err => message.error(err.response?.data?.error || 'Error')
  })

  const exportarMes = async () => {
    try {
      const r = await api.get('/comisiones/export', { params: { mes: mesStr, usuarioId: mesUsuarioFiltro }, responseType: 'blob' })
      const url = URL.createObjectURL(r.data)
      const a = document.createElement('a')
      a.href = url
      a.download = `comisiones-${mesStr}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      message.error('Error al exportar')
    }
  }

  const columns = [
    {
      title: 'Vendedor', key: 'vendedor',
      render: (_, c) => <Text strong>{c.usuario?.nombre} {c.usuario?.apellido}</Text>
    },
    { title: 'Concepto', dataIndex: 'concepto', render: v => v ? <Tag>{v}</Tag> : '—' },
    {
      title: 'Operación', key: 'venta',
      render: (_, c) => c.arriendo ? (
        <div>
          <Text style={{ fontSize: 13 }}>
            {c.arriendo.contacto?.nombre} {c.arriendo.contacto?.apellido} <Tag color="gold">arriendo</Tag>
          </Text>
          <div><Text type="secondary" style={{ fontSize: 12 }}>
            {`${c.arriendo.unidad?.edificio?.nombre || ''} ${c.arriendo.unidad?.numero || ''}`.trim()}
          </Text></div>
        </div>
      ) : (
        <div>
          <Text style={{ fontSize: 13 }}>
            {c.venta?.comprador?.nombre} {c.venta?.comprador?.apellido}
          </Text>
          <div><Text type="secondary" style={{ fontSize: 12 }}>
            {(c.venta?.unidades || []).map(u => `${u.edificio?.nombre || ''} ${u.numero}`.trim()).join(' + ')}
          </Text></div>
        </div>
      )
    },
    {
      title: 'Total', key: 'total',
      render: (_, c) => (
        <Text strong>{Number(c.montoCalculadoUF)?.toFixed(2)} UF</Text>
      )
    },
    {
      title: 'Promesa', key: 'primera',
      render: (_, c) => (
        <div>
          <Tag color={c.estadoPrimera === 'PAGADO' ? 'green' : 'orange'}>{c.estadoPrimera?.toLowerCase()}</Tag>
          <div style={{ fontSize: 12 }}>{Number(c.montoPrimera)?.toFixed(2)} UF</div>
          {esGerenciaOJV && c.estadoPrimera === 'PENDIENTE' && Number(c.montoPrimera) > 0 && (
            <Button type="link" size="small" onClick={() => marcar.mutate({ id: c.id, tramo: 'primera' })}>
              Marcar pagada
            </Button>
          )}
        </div>
      )
    },
    {
      title: 'Escritura', key: 'segunda',
      render: (_, c) => (
        <div>
          <Tag color={c.estadoSegunda === 'PAGADO' ? 'green' : 'orange'}>{c.estadoSegunda?.toLowerCase()}</Tag>
          <div style={{ fontSize: 12 }}>{Number(c.montoSegunda)?.toFixed(2)} UF</div>
          {esGerenciaOJV && c.estadoSegunda === 'PENDIENTE' && Number(c.montoSegunda) > 0 && (
            <Button type="link" size="small" onClick={() => marcar.mutate({ id: c.id, tramo: 'segunda' })}>
              Marcar pagada
            </Button>
          )}
        </div>
      )
    },
  ]

  const mensualResumenColumns = [
    { title: 'Usuario', render: (_, r) => <Text strong>{r.usuario?.nombre} {r.usuario?.apellido}</Text> },
    { title: 'Rol', render: (_, r) => ROL_LABEL[r.usuario?.rol] || r.usuario?.rol },
    { title: 'Tramos', dataIndex: 'tramos' },
    { title: 'Total mes', render: (_, r) => <Text strong>{r.totalUF?.toFixed(2)} UF</Text> },
    { title: 'Pagado', render: (_, r) => <Text style={{ color: '#52c41a' }}>{r.pagadoUF?.toFixed(2)} UF</Text> },
    { title: 'Pendiente', render: (_, r) => <Text style={{ color: '#fa8c16' }}>{r.pendienteUF?.toFixed(2)} UF</Text> },
  ]

  const mensualDetalleColumns = [
    { title: 'Usuario', render: (_, f) => `${f.usuario?.nombre} ${f.usuario?.apellido}` },
    { title: 'Concepto', dataIndex: 'concepto', render: v => v ? <Tag>{v}</Tag> : '—' },
    { title: '%', dataIndex: 'porcentaje', render: v => v != null ? `${v}%` : '—' },
    {
      title: 'Tramo', dataIndex: 'tramo',
      render: v => <Tag color={v === 'PROMESA' ? 'blue' : v === 'ARRIENDO' ? 'gold' : 'purple'}>{v.toLowerCase()}</Tag>
    },
    {
      title: 'Venta', key: 'venta',
      render: (_, f) => (
        <div>
          <Text style={{ fontSize: 13 }}>{f.comprador}</Text>
          <div><Text type="secondary" style={{ fontSize: 12 }}>{f.unidades}</Text></div>
        </div>
      )
    },
    { title: 'Monto', render: (_, f) => <Text strong>{f.montoUF?.toFixed(2)} UF</Text> },
    {
      title: 'Estado', key: 'estado',
      render: (_, f) => (
        <div>
          <Tag color={f.estadoPago === 'PAGADO' ? 'green' : 'orange'}>{f.estadoPago?.toLowerCase()}</Tag>
          {esGerenciaOJV && f.estadoPago === 'PENDIENTE' && (
            <Button
              type="link" size="small"
              onClick={() => marcar.mutate({ id: f.comisionId, tramo: f.tramo === 'ESCRITURA' ? 'segunda' : 'primera' })}
            >
              Marcar pagada
            </Button>
          )}
        </div>
      )
    },
  ]

  const reglaColumns = [
    { title: 'Nombre', dataIndex: 'nombre' },
    {
      title: 'Aplica a', key: 'aplica',
      render: (_, r) => r.usuario
        ? <Text strong>{r.usuario.nombre} {r.usuario.apellido}</Text>
        : <Tag color="geekblue">{ROL_LABEL[r.rol] || r.rol}</Tag>
    },
    { title: 'Cuándo', dataIndex: 'ambito', render: v => AMBITO_LABEL[v] || v },
    {
      title: 'Origen', dataIndex: 'origen',
      render: v => v === 'CUALQUIERA' ? <Text type="secondary">Cualquiera</Text> : <Tag color={v === 'SOLO_WEBINAR' ? 'cyan' : 'volcano'}>{ORIGEN_LABEL[v]}</Tag>
    },
    { title: 'Comisión', dataIndex: 'porcentaje', render: v => <Text strong>{v}%</Text> },
    { title: 'Split promesa / escritura', render: (_, r) => `${r.pctPromesa}% / ${r.pctEscritura}%` },
    { title: 'Estado', render: (_, r) => <Tag color={r.activa ? 'green' : 'default'}>{r.activa ? 'Activa' : 'Inactiva'}</Tag> },
    ...(esGerente ? [{
      title: '', render: (_, r) => (
        <Space size={4}>
          <Button size="small" icon={<EditOutlined />} onClick={() => { setReglaEditando(r); setModalRegla(true) }} />
          <Popconfirm
            title="¿Eliminar esta regla?"
            onConfirm={() => eliminarRegla.mutate(r.id)}
            okText="Eliminar" cancelText="Cancelar" okButtonProps={{ danger: true }}
          >
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      )
    }] : [])
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

      <Card
        title="Comisiones del mes"
        extra={
          <Space>
            {esGerenciaOJV && (
              <Select
                placeholder="Todos"
                value={mesUsuarioFiltro}
                onChange={setMesUsuarioFiltro}
                allowClear
                showSearch
                optionFilterProp="label"
                style={{ width: 180 }}
                options={vendedores.map(v => ({ value: v.id, label: `${v.nombre} ${v.apellido}` }))}
              />
            )}
            <DatePicker
              picker="month"
              value={mes}
              onChange={v => v && setMes(v)}
              allowClear={false}
              format="MMMM YYYY"
            />
            {esGerenciaOJV && (
              <Button icon={<DownloadOutlined />} onClick={exportarMes}>
                Exportar Excel
              </Button>
            )}
          </Space>
        }
        style={{ marginBottom: 24 }}
      >
        {mensual && (
          <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
            <Col xs={8}>
              <Statistic title="Devengado del mes" value={`${mensual.totalUF?.toFixed(2) || 0} UF`} />
            </Col>
            <Col xs={8}>
              <Statistic title="Pagado" value={`${mensual.pagadoUF?.toFixed(2) || 0} UF`} valueStyle={{ color: '#52c41a' }} />
            </Col>
            <Col xs={8}>
              <Statistic title="Pendiente" value={`${mensual.pendienteUF?.toFixed(2) || 0} UF`} valueStyle={{ color: '#fa8c16' }} />
            </Col>
          </Row>
        )}
        {esGerenciaOJV && (
          <Table
            dataSource={mensual?.porUsuario || []}
            columns={mensualResumenColumns}
            rowKey={r => r.usuario?.id}
            size="small"
            pagination={false}
            loading={cargandoMensual}
            style={{ marginBottom: 16 }}
            locale={{ emptyText: 'Sin comisiones devengadas este mes' }}
          />
        )}
        <Table
          dataSource={mensual?.filas || []}
          columns={mensualDetalleColumns}
          rowKey={f => `${f.comisionId}-${f.tramo}`}
          size="small"
          loading={cargandoMensual}
          locale={{ emptyText: 'Sin comisiones devengadas este mes' }}
        />
        <Text type="secondary" style={{ fontSize: 12 }}>
          El tramo "promesa" se devenga en el mes en que la venta firma promesa; el tramo "escritura", en el mes de la escritura.
        </Text>
      </Card>

      {esGerenciaOJV && (
        <Card title="Todas las comisiones" style={{ marginBottom: 24 }}>
          <Space style={{ marginBottom: 16, flexWrap: 'wrap' }}>
            <Select
              placeholder="Todos los vendedores"
              value={vendedorFiltro}
              onChange={setVendedorFiltro}
              allowClear
              style={{ width: 200 }}
              options={vendedores.map(v => ({ value: v.id, label: `${v.nombre} ${v.apellido}` }))}
            />
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
        </Card>
      )}

      {esGerenciaOJV && (
        <Card
          title="Reglas de comisión automáticas"
          extra={esGerente && (
            <Button
              size="small"
              icon={<PlusOutlined />}
              onClick={() => { setReglaEditando(null); setModalRegla(true) }}
            >
              Nueva regla
            </Button>
          )}
          style={{ marginBottom: 24 }}
        >
          <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 12 }}>
            Estas reglas generan las comisiones automáticamente al convertir una cotización en venta.
            Una regla para un usuario específico tiene prioridad sobre la regla de su rol.
          </Text>
          <Table
            dataSource={reglas}
            rowKey="id"
            size="small"
            columns={reglaColumns}
            pagination={false}
            locale={{ emptyText: 'Sin reglas. Crea una usando el botón "Nueva regla".' }}
          />
          <ModalRegla
            open={modalRegla}
            onClose={() => { setModalRegla(false); setReglaEditando(null) }}
            reglaEditando={reglaEditando}
            usuarios={usuariosTodos}
            onGuardar={(data) => {
              if (reglaEditando) {
                actualizarRegla.mutate({ id: reglaEditando.id, ...data })
              } else {
                crearRegla.mutate(data)
              }
            }}
          />
        </Card>
      )}

      {esGerente && (
        <Card
          title="Plantillas de comisión (manuales)"
          extra={
            <Button
              size="small"
              icon={<PlusOutlined />}
              onClick={() => { setPlantillaEditando(null); setModalPlantilla(true) }}
            >
              Nueva plantilla
            </Button>
          }
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
