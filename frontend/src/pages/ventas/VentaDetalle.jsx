import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import api from '../../services/api'
import { useUF } from '../../hooks/useUF'
import { useAuth } from '../../context/AuthContext'
import { ESTADO_VENTA_COLOR } from '../../components/ui'
import {
  Card, Button, Tag, Modal, Form, Input, Select, Typography,
  Space, Spin, Row, Col, Steps, Table, App, Alert, Divider, Tooltip, Popconfirm,
  InputNumber, Radio
} from 'antd'
import { PlusOutlined, DeleteOutlined, WarningOutlined, CheckCircleOutlined, GiftOutlined, AppstoreOutlined, EditOutlined, HomeOutlined, ExpandOutlined } from '@ant-design/icons'
import { TIPO_PROMO_LABEL, TIPO_PROMO_COLOR, resumenPromo } from '../promociones/Promociones'
import { isPast } from 'date-fns'

const { Title, Text } = Typography

const ESTADO_LABEL = { RESERVA:'Reserva', PROMESA:'Promesa', ESCRITURA:'Escritura', ENTREGADO:'Entregado', ANULADO:'Anulado' }
const LEGAL_LABEL = {
  FIRMA_CLIENTE_PROMESA: 'Firma cliente (promesa)',
  FIRMA_INMOBILIARIA_PROMESA: 'Firma inmobiliaria (promesa)',
  ESCRITURA_LISTA: 'Escritura lista',
  FIRMADA_NOTARIA: 'Firmada notaría',
  INSCRIPCION_CBR: 'Inscripción CBR',
  ENTREGADO: 'Entregado'
}
const PASOS_CON_PROMESA = ['FIRMA_CLIENTE_PROMESA','FIRMA_INMOBILIARIA_PROMESA','ESCRITURA_LISTA','FIRMADA_NOTARIA','INSCRIPCION_CBR','ENTREGADO']
const PASOS_SIN_PROMESA = ['ESCRITURA_LISTA','FIRMADA_NOTARIA','INSCRIPCION_CBR','ENTREGADO']

const FECHA_POR_PASO = {
  FIRMA_CLIENTE_PROMESA:     'fechaLimiteFirmaCliente',
  FIRMA_INMOBILIARIA_PROMESA:'fechaLimiteFirmaInmob',
  ESCRITURA_LISTA:           'fechaLimiteEscritura',
  FIRMADA_NOTARIA:           'fechaLimiteFirmaNot',
  INSCRIPCION_CBR:           'fechaLimiteCBR',
  ENTREGADO:                 'fechaLimiteEntrega',
}

function calcFaltantes(proceso) {
  if (!proceso) return []
  const pasos = proceso.tienePromesa === false ? PASOS_SIN_PROMESA : PASOS_CON_PROMESA
  const idx   = pasos.indexOf(proceso.estadoActual)
  const items = []

  const campoActual = FECHA_POR_PASO[proceso.estadoActual]
  if (campoActual && proceso[campoActual] && proceso.estadoActual !== 'ENTREGADO') {
    if (isPast(new Date(proceso[campoActual]))) {
      items.push({ tipo: 'error', texto: `Paso vencido: ${LEGAL_LABEL[proceso.estadoActual]}` })
    }
  }

  for (let i = Math.max(idx, 0); i < pasos.length; i++) {
    const campo = FECHA_POR_PASO[pasos[i]]
    if (campo && !proceso[campo]) {
      items.push({ tipo: 'warning', texto: `Sin fecha límite: ${LEGAL_LABEL[pasos[i]]}` })
    }
  }
  return items
}

// ─── Modal cambiar estado venta ───────────────────────────────────
function ModalEstado({ open, onClose, venta }) {
  const qc = useQueryClient()
  const [form] = Form.useForm()
  const { message } = App.useApp()
  const estadoWatch = Form.useWatch('estado', form)

  const cambiar = useMutation({
    mutationFn: (d) => api.put(`/ventas/${venta.id}/estado`, d),
    onSuccess: () => {
      message.success('Estado actualizado')
      qc.invalidateQueries(['venta', venta.id])
      qc.invalidateQueries(['ventas'])
      onClose()
    },
    onError: err => message.error(err.response?.data?.error || 'Error')
  })

  return (
    <Modal title="Cambiar Estado de Venta" open={open} onCancel={onClose}
      onOk={() => form.validateFields().then(cambiar.mutate)}
      okText="Guardar" cancelText="Cancelar" confirmLoading={cambiar.isPending}>
      <Form form={form} layout="vertical" style={{ marginTop: 16 }} initialValues={{ estado: venta?.estado }}>
        <Form.Item name="estado" label="Nuevo estado">
          <Select options={['RESERVA','PROMESA','ESCRITURA','ENTREGADO','ANULADO'].map(e => ({ value: e, label: ESTADO_LABEL[e] }))} />
        </Form.Item>
        {estadoWatch === 'PROMESA' && (
          <Form.Item name="fechaPromesa" label="Fecha promesa"><Input type="date" /></Form.Item>
        )}
        {estadoWatch === 'ESCRITURA' && (
          <Form.Item name="fechaEscritura" label="Fecha escritura"><Input type="date" /></Form.Item>
        )}
        {estadoWatch === 'ENTREGADO' && (
          <Form.Item name="fechaEntrega" label="Fecha entrega"><Input type="date" /></Form.Item>
        )}
        <Form.Item name="notas" label="Notas">
          <Input.TextArea rows={2} />
        </Form.Item>
      </Form>
    </Modal>
  )
}

// ─── Modal crear plan de pago ─────────────────────────────────────
function ModalPlanPago({ open, onClose, ventaId, precioUF }) {
  const qc = useQueryClient()
  const [cuotas, setCuotas] = useState([
    { tipo: 'RESERVA', montoUF: '', montoCLP: '200000', fechaVencimiento: '' }
  ])
  const { message } = App.useApp()

  const totalUF = cuotas.reduce((s, c) => s + (Number(c.montoUF) || 0), 0)

  const crear = useMutation({
    mutationFn: () => api.post('/pagos/plan', { ventaId, cuotas }),
    onSuccess: () => {
      message.success('Plan de pago creado')
      qc.invalidateQueries(['venta', ventaId])
      onClose()
    },
    onError: err => message.error(err.response?.data?.error || 'Error')
  })

  const upd = (i, k, v) => setCuotas(p => p.map((c, idx) => idx === i ? { ...c, [k]: v } : c))

  return (
    <Modal title="Crear Plan de Pago" open={open} onCancel={onClose}
      onOk={() => crear.mutate()} okText="Crear Plan" cancelText="Cancelar"
      confirmLoading={crear.isPending} width={680}>
      <div style={{ marginTop: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Precio: <strong>{precioUF} UF</strong> · Total plan:{' '}
            <strong style={{ color: totalUF > precioUF ? '#ff4d4f' : '#52c41a' }}>{totalUF.toFixed(2)} UF</strong>
          </Text>
          <Button size="small" icon={<PlusOutlined />}
            onClick={() => setCuotas(p => [...p, { tipo: 'CUOTA', montoUF: '', montoCLP: '', fechaVencimiento: '' }])}>
            Cuota
          </Button>
        </div>
        {cuotas.map((c, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, background: '#fafafa', padding: 10, borderRadius: 8 }}>
            <Select value={c.tipo} onChange={v => upd(i, 'tipo', v)} style={{ width: 110 }} size="small"
              options={[{ value: 'RESERVA', label: 'Reserva' }, { value: 'PIE', label: 'Pie' }, { value: 'CUOTA', label: 'Cuota' }, { value: 'ESCRITURA', label: 'Escritura' }]} />
            <Input size="small" type="number" step="0.01" placeholder="UF" value={c.montoUF} onChange={e => upd(i, 'montoUF', e.target.value)} style={{ width: 80 }} />
            <Input size="small" type="number" placeholder="CLP" value={c.montoCLP} onChange={e => upd(i, 'montoCLP', e.target.value)} style={{ width: 110 }} />
            <Input size="small" type="date" value={c.fechaVencimiento} onChange={e => upd(i, 'fechaVencimiento', e.target.value)} style={{ width: 140 }} />
            {cuotas.length > 1 && (
              <Button size="small" danger icon={<DeleteOutlined />} type="text" onClick={() => setCuotas(p => p.filter((_, idx) => idx !== i))} />
            )}
          </div>
        ))}
      </div>
    </Modal>
  )
}

// ─── Modal actualizar proceso legal ──────────────────────────────
function ModalLegal({ open, onClose, ventaId, proceso }) {
  const qc = useQueryClient()
  const [form] = Form.useForm()
  const { message } = App.useApp()
  const pasos = proceso?.tienePromesa === false ? PASOS_SIN_PROMESA : PASOS_CON_PROMESA

  const toDateStr = (d) => d ? d.substring(0, 10) : ''

  const actualizar = useMutation({
    mutationFn: (d) => api.put(`/legal/${ventaId}`, d),
    onSuccess: () => {
      message.success('Proceso legal actualizado')
      qc.invalidateQueries(['venta', ventaId])
      onClose()
    },
    onError: err => message.error(err.response?.data?.error || 'Error')
  })

  return (
    <Modal title="Actualizar Proceso Legal" open={open} onCancel={onClose}
      onOk={() => form.validateFields().then(actualizar.mutate)}
      okText="Guardar" cancelText="Cancelar" confirmLoading={actualizar.isPending} width={520}>
      <Form form={form} layout="vertical" style={{ marginTop: 16 }} initialValues={{
        estadoActual: proceso?.estadoActual,
        tienePromesa: proceso?.tienePromesa !== false,
        fechaLimiteFirmaCliente:  toDateStr(proceso?.fechaLimiteFirmaCliente),
        fechaLimiteFirmaInmob:    toDateStr(proceso?.fechaLimiteFirmaInmob),
        fechaLimiteEscritura:     toDateStr(proceso?.fechaLimiteEscritura),
        fechaLimiteFirmaNot:      toDateStr(proceso?.fechaLimiteFirmaNot),
        fechaLimiteCBR:           toDateStr(proceso?.fechaLimiteCBR),
        fechaLimiteEntrega:       toDateStr(proceso?.fechaLimiteEntrega),
        notas: proceso?.notas,
      }}>
        <Row gutter={12}>
          <Col span={16}>
            <Form.Item name="estadoActual" label="Paso actual">
              <Select options={pasos.map(p => ({ value: p, label: LEGAL_LABEL[p] }))} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="tienePromesa" label="¿Tiene promesa?">
              <Select options={[{ value: true, label: 'Sí' }, { value: false, label: 'No' }]} />
            </Form.Item>
          </Col>
        </Row>
        <Divider orientation="left" plain style={{ fontSize: 12, color: '#8c8c8c' }}>Fechas límite</Divider>
        <Row gutter={12}>
          {proceso?.tienePromesa !== false && <>
            <Col span={12}>
              <Form.Item name="fechaLimiteFirmaCliente" label="Firma cliente (promesa)">
                <Input type="date" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="fechaLimiteFirmaInmob" label="Firma inmobiliaria (promesa)">
                <Input type="date" />
              </Form.Item>
            </Col>
          </>}
          <Col span={12}>
            <Form.Item name="fechaLimiteEscritura" label="Escritura lista">
              <Input type="date" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="fechaLimiteFirmaNot" label="Firma notaría">
              <Input type="date" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="fechaLimiteCBR" label="Inscripción CBR">
              <Input type="date" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="fechaLimiteEntrega" label="Entrega">
              <Input type="date" />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item name="notas" label="Notas">
          <Input.TextArea rows={2} />
        </Form.Item>
      </Form>
    </Modal>
  )
}

// ─── Sección Proceso Legal ────────────────────────────────────────
function ProcesoLegal({ ventaId, venta }) {
  const [modalLegal, setModalLegal] = useState(false)
  const { usuario } = useAuth()
  const puedeEditar = ['GERENTE','JEFE_VENTAS','ABOGADO'].includes(usuario?.rol)

  const proceso = venta?.procesoLegal
  if (!proceso) return (
    <Card title="Proceso Legal">
      <Text type="secondary">No hay proceso legal iniciado para esta venta.</Text>
      {puedeEditar && (
        <div style={{ marginTop: 12 }}>
          <Button size="small" onClick={() => setModalLegal(true)}>Iniciar proceso</Button>
          <ModalLegal open={modalLegal} onClose={() => setModalLegal(false)} ventaId={ventaId} proceso={null} />
        </div>
      )}
    </Card>
  )

  const pasos        = proceso.tienePromesa === false ? PASOS_SIN_PROMESA : PASOS_CON_PROMESA
  const indiceActual = pasos.indexOf(proceso.estadoActual)
  const faltantes    = calcFaltantes(proceso)
  const tieneErrores = faltantes.some(f => f.tipo === 'error')

  const stepsItems = pasos.map((paso, i) => {
    const campo     = FECHA_POR_PASO[paso]
    const fecha     = campo && proceso[campo]
    const vencido   = fecha && i === indiceActual && isPast(new Date(fecha)) && paso !== 'ENTREGADO'
    return {
      title: LEGAL_LABEL[paso],
      description: fecha
        ? <span style={{ fontSize: 11, color: vencido ? '#ff4d4f' : '#8c8c8c' }}>
            {vencido ? '⚠ ' : ''}Límite: {format(new Date(fecha), 'd MMM yyyy', { locale: es })}
          </span>
        : (i >= indiceActual
            ? <span style={{ fontSize: 11, color: '#faad14' }}>Sin fecha límite</span>
            : null),
      status: i < indiceActual ? 'finish' : i === indiceActual ? (vencido ? 'error' : 'process') : 'wait',
    }
  })

  return (
    <Card
      title="Proceso Legal"
      extra={puedeEditar && <Button size="small" onClick={() => setModalLegal(true)}>Actualizar</Button>}
    >
      {/* Qué falta */}
      {faltantes.length > 0 && (
        <Alert
          type={tieneErrores ? 'error' : 'warning'}
          icon={tieneErrores ? <WarningOutlined /> : null}
          showIcon
          style={{ marginBottom: 16 }}
          message={<Text strong style={{ fontSize: 13 }}>Qué falta ({faltantes.length})</Text>}
          description={
            <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
              {faltantes.map((f, i) => (
                <li key={i} style={{ fontSize: 12 }}>{f.texto}</li>
              ))}
            </ul>
          }
        />
      )}
      {faltantes.length === 0 && proceso.estadoActual === 'ENTREGADO' && (
        <Alert type="success" showIcon icon={<CheckCircleOutlined />}
          message="Proceso legal completado" style={{ marginBottom: 16 }} />
      )}

      {/* Timeline */}
      <Steps items={stepsItems} direction="vertical" size="small" current={indiceActual} />

      {/* Documentos */}
      {proceso.documentos?.length > 0 && (
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #f0f0f0' }}>
          <Text strong style={{ fontSize: 13 }}>Documentos adjuntos</Text>
          <div style={{ marginTop: 8 }}>
            {proceso.documentos.map(doc => (
              <a key={doc.id} href={doc.url} target="_blank" rel="noreferrer"
                style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>
                📄 {doc.nombre}
                <Text type="secondary" style={{ fontSize: 11, marginLeft: 8 }}>
                  {LEGAL_LABEL[doc.etapa]}
                </Text>
              </a>
            ))}
          </div>
        </div>
      )}

      <ModalLegal open={modalLegal} onClose={() => setModalLegal(false)} ventaId={ventaId} proceso={proceso} />
    </Card>
  )
}

// ─── Sección Plan de Pagos ────────────────────────────────────────
function PlanDePagos({ venta }) {
  const qc = useQueryClient()
  const [modalPlan, setModalPlan] = useState(false)
  const { esGerenciaOJV } = useAuth()
  const { formatUF, formatPesos, ufAPesos } = useUF()
  const { message } = App.useApp()

  const plan = venta?.planPago

  const marcarPagado = useMutation({
    mutationFn: ({ cuotaId }) => api.put(`/pagos/cuotas/${cuotaId}/pagar`, { metodoPago: 'TRANSFERENCIA' }),
    onSuccess: () => { message.success('Pago registrado'); qc.invalidateQueries(['venta', venta.id]) },
    onError: err => message.error(err.response?.data?.error || 'Error')
  })

  const ESTADO_CUOTA_COLOR = { PENDIENTE: 'orange', PAGADO: 'green', ATRASADO: 'red', CONDONADO: 'default' }
  const TIPO_CUOTA = { RESERVA: 'Reserva', PIE: 'Pie', CUOTA: 'Cuota', ESCRITURA: 'Escritura' }

  const columns = [
    {
      title: 'Tipo', key: 'tipo',
      render: (_, c) => <Text style={{ fontSize: 13 }}>{TIPO_CUOTA[c.tipo]} #{c.numeroCuota}</Text>
    },
    {
      title: 'Vencimiento', dataIndex: 'fechaVencimiento', key: 'fecha',
      render: (d) => <Text style={{ fontSize: 12 }}>{format(new Date(d), 'd MMM yyyy', { locale: es })}</Text>
    },
    {
      title: 'Monto', key: 'monto',
      render: (_, c) => (
        <div>
          {c.montoUF && <div style={{ fontWeight: 600 }}>{formatUF(c.montoUF)}</div>}
          {c.montoCLP && <div style={{ fontSize: 12, color: '#8c8c8c' }}>{formatPesos(c.montoCLP)}</div>}
        </div>
      )
    },
    {
      title: 'Estado', dataIndex: 'estado', key: 'estado',
      render: (e) => <Tag color={ESTADO_CUOTA_COLOR[e]}>{e.toLowerCase()}</Tag>
    },
    {
      title: '', key: 'accion',
      render: (_, c) => esGerenciaOJV && c.estado === 'PENDIENTE' ? (
        <Button type="link" size="small" onClick={() => marcarPagado.mutate({ cuotaId: c.id })}>
          Marcar pagado
        </Button>
      ) : null
    },
  ]

  return (
    <Card
      title="Plan de Pagos"
      extra={esGerenciaOJV && !plan && <Button size="small" onClick={() => setModalPlan(true)}>Crear plan</Button>}
    >
      {!plan ? (
        <Text type="secondary" style={{ display: 'block', textAlign: 'center', padding: '16px 0' }}>
          Sin plan de pagos creado.
        </Text>
      ) : (
        <Table dataSource={plan.cuotas} columns={columns} rowKey="id" pagination={false} size="small"
          rowClassName={(c) => c.estado === 'ATRASADO' ? 'ant-table-row-danger' : ''}
        />
      )}

      <ModalPlanPago open={modalPlan} onClose={() => setModalPlan(false)}
        ventaId={venta?.id} precioUF={venta?.precioUF - (venta?.descuentoUF || 0)} />
    </Card>
  )
}

// ─── Modal agregar/editar comisión ────────────────────────────────
function ModalComision({ open, onClose, venta, comisionEditando }) {
  const [form] = Form.useForm()
  const { message } = App.useApp()
  const qc = useQueryClient()
  const [tipoCalculo, setTipoCalculo] = useState('porcentaje')

  const { data: usuarios = [] } = useQuery({
    queryKey: ['usuarios-todos'],
    queryFn: () => api.get('/usuarios').then(r => r.data.filter(u => u.activo)),
    enabled: open
  })

  const guardar = useMutation({
    mutationFn: (data) => comisionEditando
      ? api.put(`/comisiones/${comisionEditando.id}`, data)
      : api.post('/comisiones', { ...data, ventaId: venta.id }),
    onSuccess: () => {
      message.success(comisionEditando ? 'Comisión actualizada' : 'Comisión agregada')
      qc.invalidateQueries({ queryKey: ['venta', venta.id] })
      qc.invalidateQueries({ queryKey: ['comisiones'] })
      onClose()
    },
    onError: err => message.error(err.response?.data?.error || 'Error')
  })

  const precioFinal = (venta?.precioUF || 0) - (venta?.descuentoUF || 0)

  // Al abrir: precargar si estamos editando
  const handleAfterOpen = () => {
    if (comisionEditando) {
      const tipo = comisionEditando.porcentaje != null ? 'porcentaje' : 'fijo'
      setTipoCalculo(tipo)
      form.setFieldsValue({
        usuarioId: comisionEditando.usuarioId,
        concepto: comisionEditando.concepto || '',
        tipoCalculo: tipo,
        porcentaje: comisionEditando.porcentaje,
        montoFijo: comisionEditando.montoFijo,
        montoPrimera: comisionEditando.montoPrimera,
        montoSegunda: comisionEditando.montoSegunda,
      })
    } else {
      setTipoCalculo('porcentaje')
      form.resetFields()
      form.setFieldValue('tipoCalculo', 'porcentaje')
    }
  }

  // Recalcular split al cambiar valor
  const recalcularSplit = (valor, tipo) => {
    const total = tipo === 'porcentaje' ? (precioFinal * (valor || 0)) / 100 : (valor || 0)
    form.setFieldsValue({ montoPrimera: +(total / 2).toFixed(4), montoSegunda: +(total / 2).toFixed(4) })
  }

  const handleOk = () => {
    form.validateFields().then(values => {
      const data = {
        concepto: values.concepto || undefined,
        porcentaje: values.tipoCalculo === 'porcentaje' ? values.porcentaje : null,
        montoFijo: values.tipoCalculo === 'fijo' ? values.montoFijo : null,
        montoPrimera: values.montoPrimera,
        montoSegunda: values.montoSegunda,
      }
      if (!comisionEditando) data.usuarioId = values.usuarioId
      guardar.mutate(data)
    })
  }

  const rolLabel = (rol) => ({ VENDEDOR: 'Vendedor', BROKER_EXTERNO: 'Broker', JEFE_VENTAS: 'Jefe ventas', GERENTE: 'Gerente', ABOGADO: 'Abogado' }[rol] || rol)

  return (
    <Modal
      title={comisionEditando ? 'Editar comisión' : 'Agregar comisión'}
      open={open}
      onCancel={onClose}
      onOk={handleOk}
      afterOpenChange={o => o && handleAfterOpen()}
      okText="Guardar"
      cancelText="Cancelar"
      confirmLoading={guardar.isPending}
    >
      <Form form={form} layout="vertical" style={{ marginTop: 12 }}
        initialValues={{ tipoCalculo: 'porcentaje' }}>
        {!comisionEditando && (
          <Form.Item name="usuarioId" label="Persona" rules={[{ required: true, message: 'Selecciona una persona' }]}>
            <Select
              showSearch
              placeholder="Seleccionar..."
              filterOption={(input, opt) => opt.search.toLowerCase().includes(input.toLowerCase())}
              options={usuarios.map(u => ({
                value: u.id,
                search: `${u.nombre} ${u.apellido}`,
                label: <span>{u.nombre} {u.apellido} <Text type="secondary" style={{ fontSize: 11 }}>({rolLabel(u.rol)})</Text></span>
              }))}
            />
          </Form.Item>
        )}

        <Form.Item name="concepto" label="Concepto (etiqueta)">
          <Input placeholder="Ej: Vendedor, Broker, Bono cierre..." />
        </Form.Item>

        <Form.Item name="tipoCalculo" label="Tipo de comisión">
          <Radio.Group onChange={e => { setTipoCalculo(e.target.value); form.setFieldsValue({ porcentaje: undefined, montoFijo: undefined, montoPrimera: undefined, montoSegunda: undefined }) }}>
            <Radio value="porcentaje">% sobre precio venta</Radio>
            <Radio value="fijo">Monto fijo en UF</Radio>
          </Radio.Group>
        </Form.Item>

        {tipoCalculo === 'porcentaje' ? (
          <Form.Item name="porcentaje" label={`Porcentaje (precio final: ${precioFinal.toFixed(2)} UF)`} rules={[{ required: true, message: 'Ingresa el porcentaje' }]}>
            <InputNumber
              min={0} max={100} step={0.1} addonAfter="%"
              style={{ width: '100%' }}
              onChange={v => recalcularSplit(v, 'porcentaje')}
            />
          </Form.Item>
        ) : (
          <Form.Item name="montoFijo" label="Monto en UF" rules={[{ required: true, message: 'Ingresa el monto' }]}>
            <InputNumber
              min={0} step={0.1} addonAfter="UF"
              style={{ width: '100%' }}
              onChange={v => recalcularSplit(v, 'fijo')}
            />
          </Form.Item>
        )}

        <Divider style={{ margin: '8px 0' }}>Distribución del pago</Divider>
        <Row gutter={12}>
          <Col span={12}>
            <Form.Item name="montoPrimera" label="1ª parte (promesa)" rules={[{ required: true }]}>
              <InputNumber min={0} step={0.01} addonAfter="UF" style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="montoSegunda" label="2ª parte (escritura)" rules={[{ required: true }]}>
              <InputNumber min={0} step={0.01} addonAfter="UF" style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  )
}

// ─── Comisiones ───────────────────────────────────────────────────
function Comisiones({ venta }) {
  const { esGerenciaOJV } = useAuth()
  const qc = useQueryClient()
  const { message } = App.useApp()
  const [modalOpen, setModalOpen] = useState(false)
  const [editando, setEditando] = useState(null)

  const marcar = useMutation({
    mutationFn: ({ id, tramo }) => api.put(`/comisiones/${id}/${tramo}`, {}),
    onSuccess: () => { message.success('Comisión actualizada'); qc.invalidateQueries(['venta', venta.id]) },
    onError: err => message.error(err.response?.data?.error || 'Error')
  })

  const eliminar = useMutation({
    mutationFn: (id) => api.delete(`/comisiones/${id}`),
    onSuccess: () => { message.success('Comisión eliminada'); qc.invalidateQueries(['venta', venta.id]) },
    onError: err => message.error(err.response?.data?.error || 'Error')
  })

  if (!esGerenciaOJV) return null

  const comisiones = venta?.comisiones || []
  const totalUF = comisiones.reduce((s, c) => s + c.montoCalculadoUF, 0)

  const abrirEditar = (c) => { setEditando(c); setModalOpen(true) }
  const abrirNuevo = () => { setEditando(null); setModalOpen(true) }
  const cerrarModal = () => { setModalOpen(false); setEditando(null) }

  return (
    <Card
      title={<span>Comisiones <Text type="secondary" style={{ fontSize: 13, fontWeight: 400 }}>— total: {totalUF.toFixed(2)} UF</Text></span>}
      extra={<Button size="small" icon={<PlusOutlined />} onClick={abrirNuevo}>Agregar</Button>}
    >
      {comisiones.length === 0 ? (
        <Text type="secondary" style={{ display: 'block', textAlign: 'center', padding: '16px 0' }}>
          Sin comisiones. Usa "Agregar" para crear una.
        </Text>
      ) : (
        <Space direction="vertical" style={{ width: '100%' }} size={10}>
          {comisiones.map(c => (
            <Card key={c.id} size="small" style={{ background: '#fafafa' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div>
                  <Text strong>{c.usuario.nombre} {c.usuario.apellido}</Text>
                  {c.concepto && <Tag style={{ marginLeft: 8, fontSize: 11 }}>{c.concepto}</Tag>}
                  <div>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {c.porcentaje != null ? `${c.porcentaje}% del precio` : `Fijo`}
                      {' · '}
                      <Text strong style={{ fontSize: 12 }}>{c.montoCalculadoUF.toFixed(2)} UF total</Text>
                    </Text>
                  </div>
                </div>
                <Space size={4}>
                  <Button size="small" icon={<EditOutlined />} onClick={() => abrirEditar(c)} />
                  <Popconfirm
                    title="¿Eliminar esta comisión?"
                    onConfirm={() => eliminar.mutate(c.id)}
                    okText="Eliminar" cancelText="Cancelar" okButtonProps={{ danger: true }}
                  >
                    <Button size="small" danger icon={<DeleteOutlined />} />
                  </Popconfirm>
                </Space>
              </div>
              <Row gutter={8}>
                <Col span={12}>
                  <div style={{ background: c.estadoPrimera === 'PAGADO' ? '#f6ffed' : '#fffbe6', borderRadius: 6, padding: '8px 10px' }}>
                    <Text strong style={{ fontSize: 12 }}>1ª parte — promesa</Text>
                    <div><Text style={{ fontSize: 13 }}>{c.montoPrimera.toFixed(2)} UF</Text></div>
                    <Tag color={c.estadoPrimera === 'PAGADO' ? 'green' : 'orange'} style={{ fontSize: 11, marginTop: 4 }}>
                      {c.estadoPrimera === 'PAGADO' ? 'Pagado' : 'Pendiente'}
                    </Tag>
                    {c.estadoPrimera === 'PENDIENTE' && (
                      <div><Button type="link" size="small" style={{ padding: 0 }} onClick={() => marcar.mutate({ id: c.id, tramo: 'primera' })}>
                        Marcar pagada
                      </Button></div>
                    )}
                  </div>
                </Col>
                <Col span={12}>
                  <div style={{ background: c.estadoSegunda === 'PAGADO' ? '#f6ffed' : '#fffbe6', borderRadius: 6, padding: '8px 10px' }}>
                    <Text strong style={{ fontSize: 12 }}>2ª parte — escritura</Text>
                    <div><Text style={{ fontSize: 13 }}>{c.montoSegunda.toFixed(2)} UF</Text></div>
                    <Tag color={c.estadoSegunda === 'PAGADO' ? 'green' : 'orange'} style={{ fontSize: 11, marginTop: 4 }}>
                      {c.estadoSegunda === 'PAGADO' ? 'Pagado' : 'Pendiente'}
                    </Tag>
                    {c.estadoSegunda === 'PENDIENTE' && (
                      <div><Button type="link" size="small" style={{ padding: 0 }} onClick={() => marcar.mutate({ id: c.id, tramo: 'segunda' })}>
                        Marcar pagada
                      </Button></div>
                    )}
                  </div>
                </Col>
              </Row>
            </Card>
          ))}
        </Space>
      )}

      <ModalComision
        open={modalOpen}
        onClose={cerrarModal}
        venta={venta}
        comisionEditando={editando}
      />
    </Card>
  )
}

// ─── Modal agregar promoción ──────────────────────────────────────
function ModalAgregarPromocion({ open, onClose, ventaId }) {
  const qc = useQueryClient()
  const [form] = Form.useForm()
  const { message } = App.useApp()

  const { data: disponibles = [] } = useQuery({
    queryKey: ['promociones-activas'],
    queryFn: () => api.get('/promociones', { params: { activa: true } }).then(r => r.data),
    enabled: open
  })

  const agregar = useMutation({
    mutationFn: (d) => api.post(`/promociones/${d.promocionId}/aplicar-venta`, { ventaId }),
    onSuccess: () => {
      message.success('Promoción agregada')
      qc.invalidateQueries(['venta', String(ventaId)])
      onClose()
      form.resetFields()
    },
    onError: err => message.error(err.response?.data?.error || 'Error')
  })

  return (
    <Modal title="Agregar Promoción" open={open} onCancel={() => { onClose(); form.resetFields() }}
      onOk={() => form.validateFields().then(agregar.mutate)}
      okText="Agregar" cancelText="Cancelar" confirmLoading={agregar.isPending}>
      <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
        <Form.Item name="promocionId" label="Seleccionar promoción" rules={[{ required: true }]}>
          <Select
            showSearch
            optionFilterProp="label"
            placeholder="Buscar promoción..."
            options={disponibles.map(p => ({
              value: p.id,
              label: p.nombre,
              p,
            }))}
            optionRender={({ data }) => (
              <div>
                <Tag color={TIPO_PROMO_COLOR[data.p?.tipo]} style={{ fontSize: 11 }}>
                  {TIPO_PROMO_LABEL[data.p?.tipo]}
                </Tag>
                <Text style={{ fontSize: 13 }}>{data.label}</Text>
                <div><Text type="secondary" style={{ fontSize: 11 }}>{resumenPromo(data.p || {})}</Text></div>
              </div>
            )}
          />
        </Form.Item>
      </Form>
    </Modal>
  )
}

// ─── Card promociones en venta ────────────────────────────────────
function PromocionesVenta({ venta }) {
  const { esGerenciaOJV } = useAuth()
  const qc = useQueryClient()
  const { message } = App.useApp()
  const [modal, setModal] = useState(false)

  const quitar = useMutation({
    mutationFn: (vpId) => api.delete(`/promociones/venta-promo/${vpId}`),
    onSuccess: () => {
      message.success('Promoción quitada')
      qc.invalidateQueries(['venta', String(venta.id)])
    },
    onError: err => message.error(err.response?.data?.error || 'Error')
  })

  const aplicadas = venta?.promociones || []

  return (
    <Card
      title="Promociones"
      extra={esGerenciaOJV && (
        <Button size="small" icon={<PlusOutlined />} type="primary" ghost onClick={() => setModal(true)}>
          Agregar
        </Button>
      )}
    >
      {aplicadas.length === 0 ? (
        <Text type="secondary" style={{ display: 'block', textAlign: 'center', padding: '12px 0' }}>
          Sin promociones asociadas.
        </Text>
      ) : (
        <Space direction="vertical" style={{ width: '100%' }} size={8}>
          {aplicadas.map(vp => {
            const p = vp.promocion
            const icono = p.tipo === 'PAQUETE' ? <AppstoreOutlined /> : p.tipo === 'BENEFICIO' ? <GiftOutlined /> : null
            return (
              <div key={vp.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                background: '#fafafa', padding: '10px 14px', borderRadius: 8,
                border: '1px solid #f0f0f0'
              }}>
                <div>
                  <Space size={6}>
                    <Tag color={TIPO_PROMO_COLOR[p.tipo]} icon={icono} style={{ fontSize: 11 }}>
                      {TIPO_PROMO_LABEL[p.tipo]}
                    </Tag>
                    <Text strong style={{ fontSize: 13 }}>{p.nombre}</Text>
                  </Space>
                  <div style={{ marginTop: 2 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>{resumenPromo(p)}</Text>
                  </div>
                  {p.tipo === 'ARRIENDO_ASEGURADO' && vp.pagosArriendoAsegurado?.length > 0 && (
                    <div style={{ marginTop: 4 }}>
                      <Text style={{ fontSize: 11, color: '#8c8c8c' }}>
                        {vp.pagosArriendoAsegurado.filter(pg => pg.estado === 'PAGADO').length} / {vp.pagosArriendoAsegurado.length} pagos completados
                      </Text>
                    </div>
                  )}
                </div>
                {esGerenciaOJV && (
                  <Popconfirm
                    title="¿Quitar esta promoción?"
                    onConfirm={() => quitar.mutate(vp.id)}
                    okText="Sí" cancelText="No"
                  >
                    <Button size="small" type="text" danger icon={<DeleteOutlined />} />
                  </Popconfirm>
                )}
              </div>
            )
          })}
        </Space>
      )}
      <ModalAgregarPromocion open={modal} onClose={() => setModal(false)} ventaId={venta?.id} />
    </Card>
  )
}

// ─── Unidades Card ─────────────────────────────────────────────────
const ACCESO_LABEL = { RAMPA: 'Rampa', ASCENSOR: 'Ascensor', ESCALERA: 'Escalera' }
const ESTADO_UNIDAD_COLOR = { DISPONIBLE: 'green', RESERVADO: 'orange', VENDIDO: 'red', ARRENDADO: 'blue' }
const ESTADO_UNIDAD_LABEL = { DISPONIBLE: 'Disponible', RESERVADO: 'Reservado', VENDIDO: 'Vendido', ARRENDADO: 'Arrendado' }

function UnidadesCard({ unidades }) {
  const { formatUF, ufAPesos, formatPesos } = useUF()
  const [unidadVer, setUnidadVer] = useState(null)

  return (
    <>
      <Card
        size="small"
        title={<Space><HomeOutlined />{`Unidad${unidades.length !== 1 ? 'es' : ''} compradas (${unidades.length})`}</Space>}
      >
        <Row gutter={[8, 8]}>
          {unidades.map(u => (
            <Col key={u.id} span={unidades.length === 1 ? 24 : 12}>
              <Card
                size="small"
                hoverable
                onClick={() => setUnidadVer(u)}
                style={{ cursor: 'pointer', background: '#f9f9f9' }}
                extra={<ExpandOutlined style={{ color: '#8c8c8c', fontSize: 11 }} />}
                title={
                  <Space size={4}>
                    <span>{u.tipo === 'BODEGA' ? '📦' : '🚗'}</span>
                    <Text strong style={{ fontSize: 13 }}>{u.tipo === 'BODEGA' ? 'Bodega' : 'Est.'} {u.numero}</Text>
                    {u.subtipo === 'TANDEM' && <Tag color="purple" style={{ fontSize: 10 }}>Tándem</Tag>}
                  </Space>
                }
              >
                <Tag color={ESTADO_UNIDAD_COLOR[u.estado]} style={{ marginBottom: 6 }}>{ESTADO_UNIDAD_LABEL[u.estado]}</Tag>
                {u.m2 && <div><Text type="secondary" style={{ fontSize: 12 }}>{u.m2} m²</Text></div>}
                {u.piso && <div><Text type="secondary" style={{ fontSize: 12 }}>Piso {u.piso}</Text></div>}
                <div style={{ marginTop: 4 }}>
                  <Text strong style={{ fontSize: 13, color: '#1677ff' }}>{formatUF(u.precioUF)}</Text>
                </div>
                <div><Text type="secondary" style={{ fontSize: 11 }}>{u.edificio?.nombre}</Text></div>
              </Card>
            </Col>
          ))}
        </Row>
      </Card>

      <Modal
        open={!!unidadVer}
        onCancel={() => setUnidadVer(null)}
        footer={null}
        title={
          <Space>
            <span>{unidadVer?.tipo === 'BODEGA' ? '📦' : '🚗'}</span>
            <span>{unidadVer?.tipo === 'BODEGA' ? 'Bodega' : 'Est.'} {unidadVer?.numero}</span>
            {unidadVer?.subtipo === 'TANDEM' && <Tag color="purple">Tándem</Tag>}
          </Space>
        }
        width={420}
      >
        {unidadVer && (
          <Space direction="vertical" style={{ width: '100%' }} size={0}>
            <Tag color={ESTADO_UNIDAD_COLOR[unidadVer.estado]} style={{ marginBottom: 12 }}>
              {ESTADO_UNIDAD_LABEL[unidadVer.estado]}
            </Tag>

            <Row gutter={[0, 6]}>
              <Col span={12}><Text type="secondary">Edificio</Text></Col>
              <Col span={12}><Text strong>{unidadVer.edificio?.nombre}</Text></Col>

              <Col span={12}><Text type="secondary">Dirección</Text></Col>
              <Col span={12}><Text>{unidadVer.edificio?.direccion || '—'}</Text></Col>

              <Col span={12}><Text type="secondary">Región</Text></Col>
              <Col span={12}><Text>{unidadVer.edificio?.region} · {unidadVer.edificio?.comuna}</Text></Col>

              {unidadVer.piso && <>
                <Col span={12}><Text type="secondary">Piso</Text></Col>
                <Col span={12}><Text>{unidadVer.piso}</Text></Col>
              </>}

              {unidadVer.m2 && <>
                <Col span={12}><Text type="secondary">Superficie</Text></Col>
                <Col span={12}><Text>{unidadVer.m2} m²</Text></Col>
              </>}

              {unidadVer.techado !== null && unidadVer.techado !== undefined && <>
                <Col span={12}><Text type="secondary">Techado</Text></Col>
                <Col span={12}><Text>{unidadVer.techado ? 'Sí' : 'No'}</Text></Col>
              </>}

              {unidadVer.acceso && <>
                <Col span={12}><Text type="secondary">Acceso</Text></Col>
                <Col span={12}><Text>{ACCESO_LABEL[unidadVer.acceso] || unidadVer.acceso}</Text></Col>
              </>}

              <Col span={24}><Divider style={{ margin: '8px 0' }} /></Col>

              <Col span={12}><Text type="secondary">Precio venta</Text></Col>
              <Col span={12}><Text strong style={{ color: '#1677ff' }}>{formatUF(unidadVer.precioUF)}</Text></Col>

              {ufAPesos(unidadVer.precioUF) && <>
                <Col span={12}></Col>
                <Col span={12}><Text type="secondary" style={{ fontSize: 12 }}>{formatPesos(ufAPesos(unidadVer.precioUF))}</Text></Col>
              </>}

              {unidadVer.precioMinimoUF && <>
                <Col span={12}><Text type="secondary">Precio mínimo</Text></Col>
                <Col span={12}><Text type="secondary">{formatUF(unidadVer.precioMinimoUF)}</Text></Col>
              </>}

              {unidadVer.notas && <>
                <Col span={24}><Divider style={{ margin: '8px 0' }} /></Col>
                <Col span={24}><Text type="secondary" style={{ fontSize: 12 }}>{unidadVer.notas}</Text></Col>
              </>}
            </Row>
          </Space>
        )}
      </Modal>
    </>
  )
}

// ─── Página principal ──────────────────────────────────────────────
export default function VentaDetalle() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { esGerenciaOJV } = useAuth()
  const { formatUF, formatPesos, ufAPesos } = useUF()
  const [modalEstado, setModalEstado] = useState(false)

  const { data: venta, isLoading } = useQuery({
    queryKey: ['venta', id],
    queryFn: () => api.get(`/ventas/${id}`).then(r => r.data)
  })

  if (isLoading) return <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>
  if (!venta) return <Text type="secondary" style={{ padding: 24, display: 'block' }}>Venta no encontrada.</Text>

  const precioFinal = venta.precioUF - (venta.descuentoUF || 0)

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      {/* Breadcrumb */}
      <Space style={{ marginBottom: 16 }}>
        <Button type="link" style={{ padding: 0 }} onClick={() => navigate('/ventas')}>← Ventas</Button>
        <Text type="secondary">/</Text>
        <Text type="secondary">Venta #{venta.id}</Text>
      </Space>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <div>
          <Space align="center">
            <Title level={4} style={{ margin: 0 }}>Venta #{venta.id}</Title>
            <Tag color={ESTADO_VENTA_COLOR[venta.estado]}>{ESTADO_LABEL[venta.estado]}</Tag>
          </Space>
          <div style={{ marginTop: 4 }}>
            <Text type="secondary" style={{ fontSize: 13 }}>
              {venta.comprador?.nombre} {venta.comprador?.apellido}
            </Text>
          </div>
          <div style={{ marginTop: 2 }}>
            {(venta.unidades || []).map(u => (
              <Tag key={u.id} color="geekblue" style={{ marginBottom: 2 }}>
                {u.tipo === 'BODEGA' ? 'Bodega' : 'Est.'} {u.numero}{u.m2 ? ` · ${u.m2}m²` : ''} — {u.edificio?.nombre}
              </Tag>
            ))}
          </div>
        </div>
        {esGerenciaOJV && !['ENTREGADO','ANULADO'].includes(venta.estado) && (
          <Button onClick={() => setModalEstado(true)}>Cambiar estado</Button>
        )}
      </div>

      <Row gutter={[16, 16]}>
        {/* Columna izquierda */}
        <Col xs={24} md={8}>
          <Space direction="vertical" style={{ width: '100%' }} size={12}>
            <Card size="small" title="Precio">
              <Title level={3} style={{ margin: 0 }}>{formatUF(precioFinal)}</Title>
              <Text type="secondary">{formatPesos(ufAPesos(precioFinal))}</Text>
              {venta.descuentoUF > 0 && (
                <div style={{ color: '#52c41a', fontSize: 13, marginTop: 4 }}>Descuento: {formatUF(venta.descuentoUF)}</div>
              )}
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #f0f0f0' }}>
                {venta.fechaReserva && <div style={{ fontSize: 12, color: '#8c8c8c' }}>Reserva: {format(new Date(venta.fechaReserva), 'd MMM yyyy', { locale: es })}</div>}
                {venta.fechaPromesa && <div style={{ fontSize: 12, color: '#8c8c8c' }}>Promesa: {format(new Date(venta.fechaPromesa), 'd MMM yyyy', { locale: es })}</div>}
                {venta.fechaEscritura && <div style={{ fontSize: 12, color: '#8c8c8c' }}>Escritura: {format(new Date(venta.fechaEscritura), 'd MMM yyyy', { locale: es })}</div>}
                {venta.fechaEntrega && <div style={{ fontSize: 12, color: '#8c8c8c' }}>Entrega: {format(new Date(venta.fechaEntrega), 'd MMM yyyy', { locale: es })}</div>}
              </div>
            </Card>

            <Card size="small" title="Comprador">
              <Text strong>{venta.comprador?.nombre} {venta.comprador?.apellido}</Text>
              {venta.comprador?.rut && <div><Text type="secondary" style={{ fontSize: 13 }}>RUT: {venta.comprador.rut}</Text></div>}
              {venta.comprador?.empresa && <div><Text type="secondary" style={{ fontSize: 13 }}>{venta.comprador.empresa}</Text></div>}
            </Card>

            <Card size="small" title="Equipo">
              <Space direction="vertical" size={4}>
                {venta.vendedor && <Text style={{ fontSize: 13 }}>👤 <Text strong>{venta.vendedor.nombre} {venta.vendedor.apellido}</Text> <Text type="secondary">· Vendedor</Text></Text>}
                {venta.broker && <Text style={{ fontSize: 13 }}>🤝 <Text strong>{venta.broker.nombre} {venta.broker.apellido}</Text> <Text type="secondary">· Broker</Text></Text>}
                {venta.gerente && <Text style={{ fontSize: 13 }}>⭐ <Text strong>{venta.gerente.nombre} {venta.gerente.apellido}</Text> <Text type="secondary">· Gerente</Text></Text>}
              </Space>
            </Card>

            <UnidadesCard unidades={venta.unidades || []} />
          </Space>
        </Col>

        {/* Columna derecha */}
        <Col xs={24} md={16}>
          <Space direction="vertical" style={{ width: '100%' }} size={16}>
            <ProcesoLegal ventaId={id} venta={venta} />
            <PlanDePagos venta={venta} />
            <PromocionesVenta venta={venta} />
            <Comisiones venta={venta} />

            {venta.postventa?.length > 0 && (
              <Card title={`Postventa (${venta.postventa.length})`}>
                <Space direction="vertical" style={{ width: '100%' }} size={8}>
                  {venta.postventa.map(pv => (
                    <Card key={pv.id} size="small" style={{ background: '#fafafa' }}>
                      <Space>
                        <Tag color={pv.estado === 'CERRADO' ? 'green' : pv.prioridad === 'alta' ? 'red' : 'orange'}>
                          {pv.estado.toLowerCase()}
                        </Tag>
                        <Text style={{ fontSize: 13 }}>{pv.tipo.toLowerCase()}</Text>
                      </Space>
                      <div><Text style={{ fontSize: 13 }}>{pv.descripcion}</Text></div>
                    </Card>
                  ))}
                </Space>
              </Card>
            )}
          </Space>
        </Col>
      </Row>

      <ModalEstado open={modalEstado} onClose={() => setModalEstado(false)} venta={venta} />
    </div>
  )
}
