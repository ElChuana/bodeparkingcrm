import { useState } from 'react'
import ModalEmail from '../../components/ModalEmail'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { formatDistanceToNow, format } from 'date-fns'
import { es } from 'date-fns/locale'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import { ETAPA_COLOR, ETAPA_LABEL } from '../../components/ui'
import {
  Card, Button, Tag, Modal, Form, Input, Select, Typography,
  Space, Spin, Row, Col, Timeline, Descriptions, App
} from 'antd'
import {
  PhoneOutlined, MailOutlined, MessageOutlined, CalendarOutlined,
  EditOutlined, ArrowRightOutlined, ShoppingOutlined, UserOutlined,
  FileTextOutlined, PlusOutlined, DeleteOutlined, RobotOutlined, ExpandOutlined
} from '@ant-design/icons'

const { Title, Text } = Typography

const ETAPAS_PIPELINE = [
  'NUEVO', 'NO_CONTESTA', 'SEGUIMIENTO', 'COTIZACION_ENVIADA',
  'VISITA_AGENDADA', 'VISITA_REALIZADA', 'SEGUIMIENTO_POST_VISITA',
  'NEGOCIACION', 'RESERVA', 'PROMESA', 'ESCRITURA', 'ENTREGA', 'POSTVENTA', 'PERDIDO'
]

const TIPO_ICON = {
  LLAMADA: <PhoneOutlined />, EMAIL: <MailOutlined />,
  WHATSAPP: <MessageOutlined />, REUNION: <CalendarOutlined />, NOTA: <EditOutlined />,
}
const TIPO_COLOR = {
  LLAMADA: '#1677ff', EMAIL: '#722ed1', WHATSAPP: '#52c41a',
  REUNION: '#fa8c16', NOTA: '#8c8c8c',
}

// ─── Modal cambiar etapa ─────────────────────────────────────────
function ModalCambiarEtapa({ open, onClose, lead }) {
  const qc = useQueryClient()
  const [form] = Form.useForm()
  const { message } = App.useApp()
  const etapa = Form.useWatch('etapa', form)

  const cambiar = useMutation({
    mutationFn: (d) => api.put(`/leads/${lead.id}/etapa`, d),
    onSuccess: () => {
      message.success('Etapa actualizada')
      qc.invalidateQueries(['lead', lead.id])
      qc.invalidateQueries(['leads-kanban'])
      onClose()
    },
    onError: err => message.error(err.response?.data?.error || 'Error')
  })

  return (
    <Modal title="Cambiar Etapa" open={open} onCancel={onClose}
      onOk={() => form.validateFields().then(cambiar.mutate)}
      okText="Guardar" cancelText="Cancelar" confirmLoading={cambiar.isPending}>
      <Form form={form} layout="vertical" style={{ marginTop: 16 }} initialValues={{ etapa: lead?.etapa }}>
        <Form.Item name="etapa" label="Nueva etapa" rules={[{ required: true }]}>
          <Select options={ETAPAS_PIPELINE.map(e => ({ value: e, label: ETAPA_LABEL[e] }))} />
        </Form.Item>
        {etapa === 'PERDIDO' && (
          <Form.Item name="motivoPerdida" label="Motivo de pérdida" rules={[{ required: true }]}>
            <Input.TextArea rows={3} placeholder="¿Por qué se perdió este lead?" />
          </Form.Item>
        )}
      </Form>
    </Modal>
  )
}

// ─── Modal registrar interacción ──────────────────────────────────
function ModalInteraccion({ open, onClose, leadId }) {
  const qc = useQueryClient()
  const [form] = Form.useForm()
  const { message } = App.useApp()

  const crear = useMutation({
    mutationFn: (d) => api.post(`/leads/${leadId}/interacciones`, d),
    onSuccess: () => {
      message.success('Interacción registrada')
      qc.invalidateQueries(['lead', leadId])
      onClose()
      form.resetFields()
    },
    onError: err => message.error(err.response?.data?.error || 'Error')
  })

  return (
    <Modal title="Registrar Actividad" open={open} onCancel={onClose}
      onOk={() => form.validateFields().then(v => crear.mutate({ leadId, ...v }))}
      okText="Registrar" cancelText="Cancelar" confirmLoading={crear.isPending}>
      <Form form={form} layout="vertical" style={{ marginTop: 16 }} initialValues={{ tipo: 'LLAMADA' }}>
        <Form.Item name="tipo" label="Tipo">
          <Select options={[
            { value: 'LLAMADA', label: '📞 Llamada' },
            { value: 'WHATSAPP', label: '💬 WhatsApp' },
            { value: 'EMAIL', label: '✉️ Email' },
            { value: 'REUNION', label: '📅 Reunión' },
            { value: 'NOTA', label: '📝 Nota' },
          ]} />
        </Form.Item>
        <Form.Item name="fecha" label="Fecha (opcional — por defecto hoy)">
          <Input type="datetime-local" />
        </Form.Item>
        <Form.Item name="descripcion" label="Descripción" rules={[{ required: true }]}>
          <Input.TextArea rows={4} placeholder="¿Qué pasó? ¿Qué dijo el cliente?" />
        </Form.Item>
      </Form>
    </Modal>
  )
}

// ─── Modal agendar visita ─────────────────────────────────────────
function ModalVisita({ open, onClose, leadId }) {
  const qc = useQueryClient()
  const [form] = Form.useForm()
  const { message } = App.useApp()

  const { data: edificios = [] } = useQuery({
    queryKey: ['edificios-activos'],
    queryFn: () => api.get('/edificios').then(r => r.data),
    enabled: open
  })
  const { data: vendedores = [] } = useQuery({
    queryKey: ['usuarios-vendedores'],
    queryFn: () => api.get('/usuarios').then(r => r.data.filter(u => ['VENDEDOR', 'JEFE_VENTAS', 'BROKER_EXTERNO'].includes(u.rol))),
    enabled: open
  })

  const crear = useMutation({
    mutationFn: (d) => api.post(`/leads/${leadId}/visitas`, d),
    onSuccess: () => {
      message.success('Visita agendada')
      qc.invalidateQueries(['lead', leadId])
      qc.invalidateQueries(['leads-kanban'])
      qc.invalidateQueries(['visitas-todas'])
      onClose()
      form.resetFields()
    },
    onError: err => message.error(err.response?.data?.error || 'Error')
  })

  return (
    <Modal title="Agendar Visita" open={open} onCancel={onClose}
      onOk={() => form.validateFields().then(v => crear.mutate({ leadId, ...v }))}
      okText="Agendar" cancelText="Cancelar" confirmLoading={crear.isPending}>
      <Form form={form} layout="vertical" style={{ marginTop: 16 }} initialValues={{ tipo: 'presencial' }}>
        <Form.Item name="fechaHora" label="Fecha y hora" rules={[{ required: true }]}>
          <Input type="datetime-local" />
        </Form.Item>
        <Form.Item name="tipo" label="Tipo">
          <Select options={[{ value: 'presencial', label: 'Presencial' }, { value: 'virtual', label: 'Virtual' }]} />
        </Form.Item>
        <Form.Item name="vendedorId" label="Quién realiza la visita">
          <Select allowClear placeholder="Seleccionar..." options={vendedores.map(v => ({ value: v.id, label: `${v.nombre} ${v.apellido}` }))} />
        </Form.Item>
        <Form.Item name="edificioId" label="Proyecto / Edificio">
          <Select allowClear placeholder="Seleccionar proyecto..." options={edificios.map(e => ({ value: e.id, label: e.nombre }))} />
        </Form.Item>
        <Form.Item name="notas" label="Notas">
          <Input.TextArea rows={3} placeholder="Observaciones..." />
        </Form.Item>
      </Form>
    </Modal>
  )
}

// ─── Modal registrar resultado de visita ──────────────────────────
function ModalResultadoVisita({ open, onClose, visita, leadId }) {
  const qc = useQueryClient()
  const [form] = Form.useForm()
  const { message } = App.useApp()

  const registrar = useMutation({
    mutationFn: (d) => api.put(`/leads/${leadId}/visitas/${visita.id}`, d),
    onSuccess: () => {
      message.success('Resultado registrado')
      qc.invalidateQueries(['lead', String(leadId)])
      qc.invalidateQueries(['visitas-todas'])
      onClose()
      form.resetFields()
    },
    onError: err => message.error(err.response?.data?.error || 'Error')
  })

  return (
    <Modal
      title="Registrar resultado de visita"
      open={open}
      onCancel={onClose}
      onOk={() => form.validateFields().then(registrar.mutate)}
      okText="Guardar"
      cancelText="Cancelar"
      confirmLoading={registrar.isPending}
    >
      <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
        <Form.Item name="resultado" label="¿Asistió el cliente?" rules={[{ required: true, message: 'Indica si asistió' }]}>
          <Select
            options={[
              { value: 'ASISTIO', label: '✅ Sí asistió' },
              { value: 'NO_ASISTIO', label: '❌ No asistió' },
            ]}
          />
        </Form.Item>
        <Form.Item name="notas" label="Notas de la visita" rules={[{ required: true, message: 'Agrega una nota' }]}>
          <Input.TextArea rows={4} placeholder="¿Cómo resultó la visita? ¿Próximos pasos?" />
        </Form.Item>
      </Form>
    </Modal>
  )
}

// ─── Modal editar visita ──────────────────────────────────────────
function ModalEditarVisita({ open, onClose, visita, leadId }) {
  const qc = useQueryClient()
  const [form] = Form.useForm()
  const { message } = App.useApp()

  const { data: edificios = [] } = useQuery({
    queryKey: ['edificios-activos'],
    queryFn: () => api.get('/edificios').then(r => r.data),
    enabled: open
  })
  const { data: vendedores = [] } = useQuery({
    queryKey: ['usuarios-vendedores'],
    queryFn: () => api.get('/usuarios').then(r => r.data.filter(u => ['VENDEDOR', 'JEFE_VENTAS', 'BROKER_EXTERNO'].includes(u.rol))),
    enabled: open
  })

  const editar = useMutation({
    mutationFn: (d) => api.patch(`/leads/${leadId}/visitas/${visita.id}`, d),
    onSuccess: () => {
      message.success('Visita actualizada')
      qc.invalidateQueries(['lead', String(leadId)])
      qc.invalidateQueries(['visitas-todas'])
      onClose()
    },
    onError: err => message.error(err.response?.data?.error || 'Error')
  })

  const toLocalDatetime = (iso) => {
    if (!iso) return ''
    const d = new Date(iso)
    const pad = n => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  }

  return (
    <Modal
      title="Editar visita"
      open={open}
      onCancel={onClose}
      onOk={() => form.validateFields().then(editar.mutate)}
      okText="Guardar"
      cancelText="Cancelar"
      confirmLoading={editar.isPending}
      afterOpenChange={(o) => {
        if (o && visita) form.setFieldsValue({
          fechaHora: toLocalDatetime(visita.fechaHora),
          tipo: visita.tipo,
          notas: visita.notas || '',
          edificioId: visita.edificioId || undefined,
          vendedorId: visita.vendedor?.id || undefined,
        })
      }}
    >
      <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
        <Form.Item name="fechaHora" label="Fecha y hora" rules={[{ required: true }]}>
          <Input type="datetime-local" />
        </Form.Item>
        <Form.Item name="tipo" label="Tipo">
          <Select options={[{ value: 'presencial', label: 'Presencial' }, { value: 'virtual', label: 'Virtual' }]} />
        </Form.Item>
        <Form.Item name="vendedorId" label="Quién realiza la visita">
          <Select allowClear placeholder="Seleccionar..." options={vendedores.map(v => ({ value: v.id, label: `${v.nombre} ${v.apellido}` }))} />
        </Form.Item>
        <Form.Item name="edificioId" label="Proyecto / Edificio">
          <Select allowClear placeholder="Seleccionar proyecto..." options={edificios.map(e => ({ value: e.id, label: e.nombre }))} />
        </Form.Item>
        <Form.Item name="notas" label="Notas">
          <Input.TextArea rows={3} placeholder="Observaciones..." />
        </Form.Item>
      </Form>
    </Modal>
  )
}


// ─── Cotizaciones del lead ─────────────────────────────────────────
const ESTADO_COT_COLOR = { BORRADOR: 'default', ENVIADA: 'blue', ACEPTADA: 'green', RECHAZADA: 'red' }
const ESTADO_COT_LABEL = { BORRADOR: 'Borrador', ENVIADA: 'Enviada', ACEPTADA: 'Aceptada', RECHAZADA: 'Rechazada' }

function CotizacionesLead({ leadId }) {
  const navigate = useNavigate()
  const { data: cotizaciones = [], isLoading } = useQuery({
    queryKey: ['cotizaciones', leadId],
    queryFn: () => api.get('/cotizaciones', { params: { leadId } }).then(r => r.data)
  })

  const totalUF = (items) => items.reduce((s, i) => s + i.precioListaUF, 0)

  return (
    <Card
      title={<><FileTextOutlined /> Cotizaciones ({cotizaciones.length})</>}
      extra={
        <Button size="small" icon={<PlusOutlined />} onClick={() => navigate(`/cotizaciones/nueva?leadId=${leadId}`)}>
          Nueva
        </Button>
      }
      loading={isLoading}
    >
      {cotizaciones.length === 0 ? (
        <Text type="secondary" style={{ display: 'block', textAlign: 'center', padding: '16px 0' }}>
          Sin cotizaciones. Crea una con el botón "Nueva".
        </Text>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {cotizaciones.map(c => (
            <div
              key={c.id}
              onClick={() => navigate(`/cotizaciones/${c.id}`)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 14px', borderRadius: 8,
                background: '#fafafa', border: '1px solid #f0f0f0',
                cursor: 'pointer', transition: 'border-color 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = '#adc6ff'}
              onMouseLeave={e => e.currentTarget.style.borderColor = '#f0f0f0'}
            >
              <div>
                <Space size={8}>
                  <Text strong style={{ fontSize: 13 }}>Cotización #{c.id}</Text>
                  <Tag color={ESTADO_COT_COLOR[c.estado]} style={{ fontSize: 11 }}>{ESTADO_COT_LABEL[c.estado]}</Tag>
                </Space>
                <div>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {c._count.items} unidad{c._count.items !== 1 ? 'es' : ''} · {totalUF(c.items).toFixed(2)} UF base
                    {' · '}{format(new Date(c.creadoEn), "d MMM yyyy", { locale: es })}
                  </Text>
                </div>
              </div>
              <Button size="small" type="link" icon={<FileTextOutlined />}>Ver</Button>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

// ─── Modal editar contacto (nombre, telefono, email, empresa) ─────
function ModalEditarContacto({ open, onClose, lead }) {
  const qc = useQueryClient()
  const [form] = Form.useForm()
  const { message } = App.useApp()

  const editar = useMutation({
    mutationFn: (d) => api.put(`/contactos/${lead.contacto.id}`, d),
    onSuccess: () => {
      message.success('Contacto actualizado')
      qc.invalidateQueries(['lead', String(lead.id)])
      onClose()
    },
    onError: err => message.error(err.response?.data?.error || 'Error')
  })

  return (
    <Modal
      title="Editar contacto"
      open={open}
      onCancel={onClose}
      onOk={() => form.validateFields().then(editar.mutate)}
      okText="Guardar"
      cancelText="Cancelar"
      confirmLoading={editar.isPending}
      afterOpenChange={(o) => {
        if (o) form.setFieldsValue({
          nombre: lead?.contacto.nombre,
          apellido: lead?.contacto.apellido,
          telefono: lead?.contacto.telefono || '',
          email: lead?.contacto.email || '',
          empresa: lead?.contacto.empresa || '',
        })
      }}
    >
      <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
        <Form.Item name="nombre" label="Nombre" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="apellido" label="Apellido">
          <Input />
        </Form.Item>
        <Form.Item name="telefono" label="Teléfono">
          <Input />
        </Form.Item>
        <Form.Item name="email" label="Email">
          <Input type="email" />
        </Form.Item>
        <Form.Item name="empresa" label="Empresa">
          <Input />
        </Form.Item>
      </Form>
    </Modal>
  )
}

// ─── Modal editar datos del lead (notas, campaña) ─────────────────
function ModalEditarLead({ open, onClose, lead }) {
  const qc = useQueryClient()
  const [form] = Form.useForm()
  const { message } = App.useApp()

  const editar = useMutation({
    mutationFn: (d) => api.put(`/leads/${lead.id}`, d),
    onSuccess: () => {
      message.success('Lead actualizado')
      qc.invalidateQueries(['lead', String(lead.id)])
      onClose()
    },
    onError: err => message.error(err.response?.data?.error || 'Error')
  })

  return (
    <Modal
      title="Editar lead"
      open={open}
      onCancel={onClose}
      onOk={() => form.validateFields().then(editar.mutate)}
      okText="Guardar"
      cancelText="Cancelar"
      confirmLoading={editar.isPending}
      afterOpenChange={(o) => {
        if (o) form.setFieldsValue({
          notas: lead?.notas || '',
          campana: lead?.campana || '',
          presupuestoAprox: lead?.presupuestoAprox || '',
        })
      }}
    >
      <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
        <Form.Item name="campana" label="Campaña">
          <Input placeholder="Nombre de la campaña..." />
        </Form.Item>
        <Form.Item name="presupuestoAprox" label="Presupuesto aprox. (UF)">
          <Input type="number" />
        </Form.Item>
        <Form.Item name="notas" label="Notas internas">
          <Input.TextArea rows={4} placeholder="Notas sobre este lead..." />
        </Form.Item>
      </Form>
    </Modal>
  )
}

// ─── Página principal ──────────────────────────────────────────────
export default function LeadDetalle() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { esGerenciaOJV, usuario } = useAuth()

  const [modalEtapa, setModalEtapa] = useState(false)
  const [modalInteraccion, setModalInteraccion] = useState(false)
  const [modalVisita, setModalVisita] = useState(false)
  const [modalEditarContacto, setModalEditarContacto] = useState(false)
  const [modalEditarLead, setModalEditarLead] = useState(false)
  const [visitaEditando, setVisitaEditando] = useState(null)
  const [visitaResultando, setVisitaResultando] = useState(null)
  const [modalEmail, setModalEmail] = useState(false)
  const [modalComuro, setModalComuro] = useState(false)

  const qc = useQueryClient()
  const { message, modal } = App.useApp()

  const mutEliminarVisita = useMutation({
    mutationFn: (visitaId) => api.delete(`/leads/${id}/visitas/${visitaId}`),
    onSuccess: () => {
      message.success('Visita eliminada')
      qc.invalidateQueries(['lead', id])
      qc.invalidateQueries(['visitas-todas'])
    },
    onError: err => message.error(err.response?.data?.error || 'Sin permiso para eliminar')
  })

  const confirmarEliminarVisita = (visita) => {
    modal.confirm({
      title: 'Eliminar visita',
      content: `¿Seguro que quieres eliminar la visita del ${format(new Date(visita.fechaHora), "d MMM yyyy 'a las' HH:mm", { locale: es })}?`,
      okText: 'Eliminar',
      okType: 'danger',
      cancelText: 'Cancelar',
      onOk: () => mutEliminarVisita.mutate(visita.id)
    })
  }

  const { data: lead, isLoading } = useQuery({
    queryKey: ['lead', id],
    queryFn: () => api.get(`/leads/${id}`).then(r => r.data)
  })

  if (isLoading) return <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>
  if (!lead) return <Text type="secondary" style={{ padding: 24, display: 'block' }}>Lead no encontrado.</Text>

  const timeline = [
    ...(lead.interacciones || []).map(i => ({ ...i, _tipo: 'interaccion' })),
    ...(lead.visitas || []).map(v => ({ ...v, _tipo: 'visita', fecha: v.fechaHora }))
  ].sort((a, b) => new Date(b.fecha) - new Date(a.fecha))

  const timelineItems = timeline.map(item => {
    if (item._tipo === 'visita') {
      const puedeEliminar = esGerenciaOJV || item.vendedor?.id === usuario?.id
      const resultadoTag = item.resultado === 'ASISTIO'
        ? <Tag color="green">Asistió</Tag>
        : item.resultado === 'NO_ASISTIO'
        ? <Tag color="red">No asistió</Tag>
        : <Tag color="default">Pendiente</Tag>

      return {
        key: `v-${item.id}`,
        color: '#fa8c16',
        dot: <CalendarOutlined style={{ color: '#fa8c16' }} />,
        children: (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Space wrap>
                <Text strong style={{ fontSize: 13 }}>Visita {item.tipo}</Text>
                {resultadoTag}
              </Space>
              <Space size={4}>
                {!item.resultado && (
                  <Button size="small" type="primary" ghost onClick={() => setVisitaResultando(item)}>
                    Registrar resultado
                  </Button>
                )}
                <Button type="text" size="small" icon={<EditOutlined />} onClick={() => setVisitaEditando(item)} />
                {puedeEliminar && (
                  <Button
                    type="text"
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => confirmarEliminarVisita(item)}
                  />
                )}
              </Space>
            </div>
            <div><Text type="secondary" style={{ fontSize: 12 }}>
              {format(new Date(item.fechaHora), "d MMM yyyy 'a las' HH:mm", { locale: es })}
            </Text></div>
            {item.vendedor && (
              <div><Text type="secondary" style={{ fontSize: 12 }}>👤 {item.vendedor.nombre} {item.vendedor.apellido}</Text></div>
            )}
            {item.notas && <Text style={{ fontSize: 13, display: 'block', marginTop: 4 }}>{item.notas}</Text>}
          </div>
        )
      }
    }
    return {
      key: `i-${item.id}`,
      color: TIPO_COLOR[item.tipo] || '#8c8c8c',
      dot: TIPO_ICON[item.tipo],
      children: (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Text strong style={{ fontSize: 13 }}>
              {item.tipo?.charAt(0) + item.tipo?.slice(1).toLowerCase()}
            </Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {formatDistanceToNow(new Date(item.fecha), { addSuffix: true, locale: es })}
            </Text>
          </div>
          {item.usuario && (
            <div><Text type="secondary" style={{ fontSize: 12 }}>{item.usuario.nombre} {item.usuario.apellido}</Text></div>
          )}
          <Text style={{ fontSize: 13 }}>{item.descripcion}</Text>
        </div>
      )
    }
  })

  return (
    <div style={{ maxWidth: 960, margin: '0 auto' }}>
      {/* Breadcrumb */}
      <Space style={{ marginBottom: 16 }}>
        <Button type="link" style={{ padding: 0 }} onClick={() => navigate('/leads')}>← Leads</Button>
        <Text type="secondary">/</Text>
        <Text type="secondary">{lead.contacto.nombre} {lead.contacto.apellido}</Text>
      </Space>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>{lead.contacto.nombre} {lead.contacto.apellido}</Title>
          <Space style={{ marginTop: 6 }}>
            <Tag color={ETAPA_COLOR[lead.etapa]}>{ETAPA_LABEL[lead.etapa]}</Tag>
            {lead.contacto.origen && <Tag>{lead.contacto.origen.toLowerCase().replace('_', ' ')}</Tag>}
          </Space>
        </div>
        <Space wrap>
          <Button size="small" onClick={() => setModalInteraccion(true)}>+ Actividad</Button>
          <Button size="small" icon={<CalendarOutlined />} onClick={() => setModalVisita(true)}>Agendar visita</Button>
          {lead.contacto.email && (
            <Button size="small" icon={<MailOutlined />} onClick={() => setModalEmail(true)}>Enviar email</Button>
          )}
          <Button size="small" icon={<FileTextOutlined />} onClick={() => navigate(`/cotizaciones/nueva?leadId=${id}`)}>
            Nueva cotización
          </Button>
          <Button size="small" icon={<ArrowRightOutlined />} onClick={() => setModalEtapa(true)}>Cambiar etapa</Button>
          {lead.venta && (
            <Button type="primary" size="small" icon={<ShoppingOutlined />} onClick={() => navigate(`/ventas/${lead.venta.id}`)}>
              Ver Venta
            </Button>
          )}
        </Space>
      </div>

      <Row gutter={[16, 16]}>
        {/* Columna izquierda */}
        <Col xs={24} md={8}>
          <Space direction="vertical" style={{ width: '100%' }} size={12}>
            {/* Contacto */}
            <Card
              size="small"
              title={<><UserOutlined /> Contacto</>}
              extra={<Button type="text" size="small" icon={<EditOutlined />} onClick={() => setModalEditarContacto(true)} />}
            >
              <Space direction="vertical" size={4}>
                {lead.contacto.telefono && (
                  <a href={`tel:${lead.contacto.telefono}`}>
                    <Space><PhoneOutlined /><Text style={{ fontSize: 13 }}>{lead.contacto.telefono}</Text></Space>
                  </a>
                )}
                {lead.contacto.email && (
                  <Space>
                    <MailOutlined />
                    <Text style={{ fontSize: 13 }}>{lead.contacto.email}</Text>
                    <Button type="link" size="small" style={{ padding: 0, fontSize: 12 }} onClick={() => setModalEmail(true)}>Enviar</Button>
                  </Space>
                )}
                {lead.contacto.empresa && <Text type="secondary" style={{ fontSize: 13 }}>🏢 {lead.contacto.empresa}</Text>}
                {lead.contacto.rut && <Text type="secondary" style={{ fontSize: 13 }}>RUT: {lead.contacto.rut}</Text>}
              </Space>
            </Card>

            {/* Unidad de interés */}
            {lead.unidadInteres && (
              <Card size="small" title="Unidad de interés">
                <Text strong style={{ display: 'block' }}>
                  {lead.unidadInteres.tipo === 'BODEGA' ? '📦 Bodega' : '🚗 Estacionamiento'} {lead.unidadInteres.numero}
                </Text>
                <Text type="secondary" style={{ fontSize: 13 }}>{lead.unidadInteres.edificio?.nombre}</Text>
                <div><Text strong style={{ color: '#1677ff' }}>{lead.unidadInteres.precioUF} UF</Text></div>
              </Card>
            )}

            {/* Equipo */}
            <Card size="small" title="Equipo asignado">
              {lead.vendedor ? (
                <Text style={{ fontSize: 13 }}>👤 <Text strong>{lead.vendedor.nombre} {lead.vendedor.apellido}</Text> <Text type="secondary">· Vendedor</Text></Text>
              ) : <Text type="secondary" style={{ fontSize: 13 }}>Sin vendedor asignado</Text>}
              {lead.broker && (
                <div><Text style={{ fontSize: 13 }}>🤝 <Text strong>{lead.broker.nombre} {lead.broker.apellido}</Text> <Text type="secondary">· Broker</Text></Text></div>
              )}
            </Card>

            {/* Notas del lead */}
            <Card
              size="small"
              title="Notas internas"
              extra={<Button type="text" size="small" icon={<EditOutlined />} onClick={() => setModalEditarLead(true)} />}
            >
              {lead.notas ? (
                <Text style={{ fontSize: 13, whiteSpace: 'pre-wrap' }}>{lead.notas}</Text>
              ) : (
                <Text type="secondary" style={{ fontSize: 13 }}>Sin notas. <Button type="link" size="small" style={{ padding: 0 }} onClick={() => setModalEditarLead(true)}>Agregar</Button></Text>
              )}
              {lead.campana && <div style={{ marginTop: 6 }}><Text type="secondary" style={{ fontSize: 12 }}>📣 Campaña: {lead.campana}</Text></div>}
              {lead.presupuestoAprox && <div><Text type="secondary" style={{ fontSize: 12 }}>💰 Presupuesto: {lead.presupuestoAprox} UF</Text></div>}
            </Card>

            {/* Pipeline */}
            <Card size="small" title="Pipeline">
              {ETAPAS_PIPELINE.filter(e => e !== 'PERDIDO').map(etapa => {
                const indiceActual = ETAPAS_PIPELINE.indexOf(lead.etapa)
                const i = ETAPAS_PIPELINE.indexOf(etapa)
                const completada = i < indiceActual
                const actual = etapa === lead.etapa
                return (
                  <div key={etapa} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '2px 0' }}>
                    <span style={{ fontSize: 12, color: completada ? '#52c41a' : actual ? '#1677ff' : '#d9d9d9' }}>
                      {completada ? '✓' : actual ? '●' : '○'}
                    </span>
                    <Text style={{ fontSize: 12, color: actual ? '#1677ff' : completada ? '#52c41a' : '#bfbfbf', fontWeight: actual ? 600 : 400 }}>
                      {ETAPA_LABEL[etapa]}
                    </Text>
                  </div>
                )
              })}
              {lead.etapa === 'PERDIDO' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                  <Text style={{ fontSize: 12, color: '#ff4d4f', fontWeight: 600 }}>✗ Perdido</Text>
                  {lead.motivoPerdida && <Text type="secondary" style={{ fontSize: 11 }}>— {lead.motivoPerdida}</Text>}
                </div>
              )}
            </Card>
          </Space>
        </Col>

        {/* Columna derecha: timeline + cotizaciones */}
        <Col xs={24} md={16}>
          <Space direction="vertical" style={{ width: '100%' }} size={12}>
            <Card
              title={`Actividad (${timeline.length})`}
              extra={<Button type="link" size="small" onClick={() => setModalInteraccion(true)}>+ Agregar</Button>}
            >
              {timeline.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 0', color: '#aaa' }}>
                  <Text type="secondary">Sin actividad registrada.</Text><br />
                  <Button type="link" onClick={() => setModalInteraccion(true)}>Registrar primera actividad</Button>
                </div>
              ) : (
                <Timeline items={timelineItems} style={{ marginTop: 8 }} />
              )}
            </Card>

            <CotizacionesLead leadId={id} />

            {/* Comuro — debajo de cotizaciones */}
            {lead.comuroData && (
        <Card
          style={{ marginTop: 16, borderColor: '#ede9fe', borderTop: '3px solid #7c3aed' }}
          title={
            <Space>
              <RobotOutlined style={{ color: '#7c3aed', fontSize: 16 }} />
              <Text strong style={{ color: '#7c3aed' }}>Datos Comuro</Text>
              {lead.comuroThreadId && (
                <Text type="secondary" style={{ fontSize: 12, fontWeight: 400 }}>· Thread: {lead.comuroThreadId}</Text>
              )}
            </Space>
          }
          extra={
            lead.comuroData.conversation_url
              ? <a href={lead.comuroData.conversation_url} target="_blank" rel="noreferrer" style={{ fontSize: 13 }}>Ver conversación →</a>
              : null
          }
        >
          {/* Contexto destacado arriba */}
          {lead.comuroData.context && (
            <div style={{ background: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: 8, padding: '10px 14px', marginBottom: 16 }}>
              <Text type="secondary" style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, display: 'block', marginBottom: 4 }}>CONTEXTO DE CONVERSACIÓN</Text>
              <Text style={{ fontSize: 13, color: '#374151' }}>{String(lead.comuroData.context)}</Text>
            </div>
          )}

          {/* Grid de campos */}
          <Row gutter={[16, 8]}>
            {/* Interés */}
            {(lead.comuroData.interes_tipo_activo || lead.comuroData.interes_ubicacion || lead.comuroData.interes_superficie || lead.comuroData.interes_presupuesto || lead.comuroData.value_deal) && (
              <Col xs={24} sm={12} md={6}>
                <Text type="secondary" style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, display: 'block', marginBottom: 6 }}>INTERÉS</Text>
                {lead.comuroData.interes_tipo_activo && <div style={{ fontSize: 13 }}>📦 {lead.comuroData.interes_tipo_activo}</div>}
                {lead.comuroData.interes_ubicacion && <div style={{ fontSize: 13 }}>📍 {lead.comuroData.interes_ubicacion}</div>}
                {lead.comuroData.interes_superficie && <div style={{ fontSize: 13 }}>📐 {lead.comuroData.interes_superficie}</div>}
                {lead.comuroData.interes_presupuesto && <div style={{ fontSize: 13 }}>💰 {lead.comuroData.interes_presupuesto}</div>}
                {lead.comuroData.value_deal && <div style={{ fontSize: 13, color: '#059669', fontWeight: 600 }}>{lead.comuroData.value_deal}</div>}
              </Col>
            )}

            {/* Calificación */}
            {(lead.comuroData.lead_prospect !== undefined || lead.comuroData.cumple_requisitos !== undefined || lead.comuroData.opportunity_prospect !== undefined) && (
              <Col xs={24} sm={12} md={6}>
                <Text type="secondary" style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, display: 'block', marginBottom: 6 }}>CALIFICACIÓN</Text>
                {lead.comuroData.lead_prospect !== undefined && (
                  <div style={{ fontSize: 13 }}>{lead.comuroData.lead_prospect ? '✅' : '❌'} Prospecto: <Text strong>{lead.comuroData.lead_prospect ? 'Sí' : 'No'}</Text></div>
                )}
                {lead.comuroData.cumple_requisitos !== undefined && (
                  <div style={{ fontSize: 13 }}>{lead.comuroData.cumple_requisitos ? '✅' : '❌'} Cumple req.: <Text strong>{lead.comuroData.cumple_requisitos ? 'Sí' : 'No'}</Text></div>
                )}
                {lead.comuroData.opportunity_prospect !== undefined && (
                  <div style={{ fontSize: 13 }}>{lead.comuroData.opportunity_prospect ? '✅' : '❌'} Oportunidad: <Text strong>{lead.comuroData.opportunity_prospect ? 'Sí' : 'No'}</Text></div>
                )}
              </Col>
            )}

            {/* Contacto / visita */}
            {(lead.comuroData.coordinar_reunion !== undefined || lead.comuroData.tipo_contacto || lead.comuroData.fecha_visita) && (
              <Col xs={24} sm={12} md={6}>
                <Text type="secondary" style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, display: 'block', marginBottom: 6 }}>CONTACTO</Text>
                {lead.comuroData.tipo_contacto && <div style={{ fontSize: 13 }}>📱 {lead.comuroData.tipo_contacto}</div>}
                {lead.comuroData.coordinar_reunion !== undefined && (
                  <div style={{ fontSize: 13 }}>{lead.comuroData.coordinar_reunion ? '✅' : '❌'} Quiere visita</div>
                )}
                {lead.comuroData.fecha_visita && <div style={{ fontSize: 13 }}>📅 {lead.comuroData.fecha_visita} {lead.comuroData.hora_visita || ''}</div>}
                {lead.comuroData.solicito_imagenes && <div style={{ fontSize: 13 }}>🖼 Solicitó imágenes</div>}
                {lead.comuroData.pregunta_direccion && <div style={{ fontSize: 13 }}>📍 Preguntó dirección</div>}
              </Col>
            )}

            {/* Marketing */}
            {(lead.comuroData.utm_source || lead.comuroData.utm_campaign || lead.comuroData.source_type || lead.comuroData.campaign) && (
              <Col xs={24} sm={12} md={6}>
                <Text type="secondary" style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, display: 'block', marginBottom: 6 }}>ORIGEN</Text>
                {lead.comuroData.source_type && <div style={{ fontSize: 13 }}>🔗 {lead.comuroData.source_type}</div>}
                {lead.comuroData.utm_source && <div style={{ fontSize: 13 }}>Fuente: {lead.comuroData.utm_source}</div>}
                {lead.comuroData.utm_medium && <div style={{ fontSize: 13 }}>Medio: {lead.comuroData.utm_medium}</div>}
                {lead.comuroData.utm_campaign && <div style={{ fontSize: 12, color: '#6b7280' }}>{lead.comuroData.utm_campaign}</div>}
                {lead.comuroData.campaign && <div style={{ fontSize: 12, color: '#6b7280' }}>{lead.comuroData.campaign}</div>}
              </Col>
            )}
          </Row>
        </Card>
            )}
          </Space>
        </Col>
      </Row>

      <ModalEmail
        open={modalEmail}
        onClose={() => setModalEmail(false)}
        para={lead.contacto.email || ''}
        nombre={`${lead.contacto.nombre} ${lead.contacto.apellido}`.trim()}
        leadId={parseInt(id)}
      />
      <ModalCambiarEtapa   open={modalEtapa}          onClose={() => setModalEtapa(false)}          lead={lead} />
      <ModalInteraccion    open={modalInteraccion}    onClose={() => setModalInteraccion(false)}    leadId={id} />
      <ModalVisita         open={modalVisita}         onClose={() => setModalVisita(false)}         leadId={id} />
      <ModalEditarContacto open={modalEditarContacto} onClose={() => setModalEditarContacto(false)} lead={lead} />
      <ModalEditarLead     open={modalEditarLead}     onClose={() => setModalEditarLead(false)}     lead={lead} />
      <Modal
        title={<><RobotOutlined style={{ color: '#7c3aed' }} /> Datos Comuro</>}
        open={modalComuro}
        onCancel={() => setModalComuro(false)}
        footer={null}
        width={640}
      >
        {lead.comuroData && (
          <div style={{ maxHeight: 500, overflowY: 'auto' }}>
            {Object.entries(lead.comuroData)
              .filter(([, v]) => v !== null && v !== undefined && v !== '')
              .map(([k, v]) => (
                <div key={k} style={{ display: 'flex', gap: 8, padding: '4px 0', borderBottom: '1px solid #f0f0f0' }}>
                  <Text type="secondary" style={{ fontSize: 12, minWidth: 180, flexShrink: 0 }}>{k}</Text>
                  <Text style={{ fontSize: 13, wordBreak: 'break-word' }}>{String(v)}</Text>
                </div>
              ))}
          </div>
        )}
      </Modal>

      <ModalEditarVisita
        open={!!visitaEditando}
        onClose={() => setVisitaEditando(null)}
        visita={visitaEditando}
        leadId={id}
      />
      <ModalResultadoVisita
        open={!!visitaResultando}
        onClose={() => setVisitaResultando(null)}
        visita={visitaResultando}
        leadId={id}
      />
    </div>
  )
}
