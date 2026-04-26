import { useState, useEffect } from 'react'
import dayjs from 'dayjs'
import ModalEmail from '../../components/ModalEmail'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { formatDistanceToNow, format } from 'date-fns'
import { es } from 'date-fns/locale'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import { ETAPA_COLOR, ETAPA_LABEL, MOTIVO_PERDIDA_LABEL } from '../../components/ui'
import ModalPerdido from '../../components/ModalPerdido'
import {
  Card, Button, Tag, Modal, Form, Input, Select, Typography,
  Space, Spin, Row, Col, Timeline, Descriptions, App, DatePicker, Alert
} from 'antd'
import {
  PhoneOutlined, MailOutlined, MessageOutlined, CalendarOutlined,
  EditOutlined, ArrowRightOutlined, ShoppingOutlined, UserOutlined,
  FileTextOutlined, PlusOutlined, DeleteOutlined, RobotOutlined,
  ExpandOutlined
} from '@ant-design/icons'

const { Title, Text } = Typography

const ETAPAS_PIPELINE = [
  'NUEVO', 'NO_CONTESTA', 'SEGUIMIENTO', 'COTIZACION_ENVIADA', 'INTERESADO',
  'VISITA_AGENDADA', 'VISITA_REALIZADA', 'SEGUIMIENTO_POST_VISITA',
  'NEGOCIACION', 'RESERVA', 'PROMESA', 'ESCRITURA', 'ENTREGA', 'POSTVENTA', 'PERDIDO'
]

function limpiarContext(text) {
  if (!text) return ''
  return text.replace(/\|\s*Fecha Reuni[oó]n:.*$/s, '').trim()
}

function parsearFechaComuro(context) {
  const match = context?.match(/Fecha Reuni[oó]n:\s*(\d{2}\/\d{2}\/\d{4})\|Hora Reunion:\s*(\d{2}:\d{2})/)
  if (!match) return null
  const [, fecha, hora] = match
  const [dia, mes, anio] = fecha.split('/')
  const dt = new Date(`${anio}-${mes}-${dia}T${hora}:00`)
  return isNaN(dt.getTime()) ? null : { fecha, hora, dt }
}

const TIPO_ICON = {
  LLAMADA: <PhoneOutlined />, EMAIL: <MailOutlined />,
  WHATSAPP: <MessageOutlined />, REUNION: <CalendarOutlined />, NOTA: <EditOutlined />,
}
const TIPO_COLOR = {
  LLAMADA: '#1677ff', EMAIL: '#722ed1', WHATSAPP: '#52c41a',
  REUNION: '#fa8c16', NOTA: '#8c8c8c',
}

// ─── Modal cambiar etapa ─────────────────────────────────────────
function ModalCambiarEtapa({ open, onClose, lead, onPerdido }) {
  const qc = useQueryClient()
  const [form] = Form.useForm()
  const { message } = App.useApp()

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

  const handleOk = () => {
    form.validateFields().then(values => {
      if (values.etapa === 'PERDIDO') {
        onClose()
        onPerdido()
      } else {
        cambiar.mutate(values)
      }
    })
  }

  return (
    <Modal title="Cambiar Etapa" open={open} onCancel={onClose}
      onOk={handleOk}
      okText="Guardar" cancelText="Cancelar" confirmLoading={cambiar.isPending}>
      <Form form={form} layout="vertical" style={{ marginTop: 16 }} initialValues={{ etapa: lead?.etapa }}>
        <Form.Item name="etapa" label="Nueva etapa" rules={[{ required: true }]}>
          <Select options={ETAPAS_PIPELINE.map(e => ({ value: e, label: ETAPA_LABEL[e] }))} />
        </Form.Item>
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
    mutationFn: (d) => api.post(`/leads/${leadId}/interacciones`, {
      leadId,
      tipo: d.tipo,
      descripcion: d.descripcion,
      ...(d.fecha && { fecha: d.fecha.toISOString() })
    }),
    onSuccess: () => {
      message.success('Actividad registrada')
      qc.invalidateQueries(['lead', leadId])
      qc.invalidateQueries(['actividades-cal'])
      onClose()
      form.resetFields()
    },
    onError: err => message.error(err.response?.data?.error || 'Error')
  })

  return (
    <Modal title="Registrar Actividad" open={open} onCancel={onClose}
      onOk={() => form.validateFields().then(crear.mutate)}
      okText="Registrar" cancelText="Cancelar" confirmLoading={crear.isPending}>
      <Form form={form} layout="vertical" style={{ marginTop: 16 }} initialValues={{ tipo: 'LLAMADA' }}>
        <Form.Item name="tipo" label="Tipo">
          <Select options={[
            { value: 'LLAMADA', label: '📞 Llamada' },
            { value: 'WHATSAPP', label: '💬 WhatsApp' },
            { value: 'EMAIL', label: '✉️ Email' },
            { value: 'REUNION', label: '📅 Reunión' },
          ]} />
        </Form.Item>
        <Form.Item name="fecha" label="Fecha y hora (dejar vacío = ahora)">
          <DatePicker showTime={{ format: 'HH:mm' }} format="DD/MM/YYYY HH:mm" style={{ width: '100%' }} placeholder="Seleccionar fecha/hora" />
        </Form.Item>
        <Form.Item name="descripcion" label="Descripción" rules={[{ required: true }]}>
          <Input.TextArea rows={3} placeholder="Ej: Llamar a las 5pm, Reunión de seguimiento, etc." />
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
      onOk={() => form.validateFields().then(v => crear.mutate({ leadId, ...v, fechaHora: new Date(v.fechaHora).toISOString() }))}
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
  const { message } = App.useApp()
  const [loading, setLoading] = useState(false)
  const [fechaHora, setFechaHora] = useState('')
  const [tipo, setTipo] = useState('presencial')
  const [notas, setNotas] = useState('')
  const [vendedorId, setVendedorId] = useState(undefined)
  const [edificioId, setEdificioId] = useState(undefined)

  const toLocalDatetime = (iso) => {
    if (!iso) return ''
    const d = new Date(iso)
    const pad = n => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  }

  useEffect(() => {
    if (visita) {
      setFechaHora(toLocalDatetime(visita.fechaHora))
      setTipo(visita.tipo || 'presencial')
      setNotas(visita.notas || '')
      setVendedorId(visita.vendedor?.id || undefined)
      setEdificioId(visita.edificioId || undefined)
    }
  }, [visita?.id])

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

  const handleSave = async () => {
    if (!fechaHora) { message.error('La fecha y hora son requeridas'); return }
    if (!visita?.id) return
    setLoading(true)
    try {
      const fechaHoraUTC = new Date(fechaHora).toISOString()
      await api.patch(`/leads/${leadId}/visitas/${visita.id}`, { fechaHora: fechaHoraUTC, tipo, notas, vendedorId, edificioId })
      await qc.refetchQueries({ queryKey: ['lead', String(leadId)], type: 'active' })
      qc.invalidateQueries(['visitas-todas'])
      message.success('Visita actualizada')
      onClose()
    } catch (err) {
      message.error(err.response?.data?.error || 'Error al actualizar visita')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      title="Editar visita"
      open={open}
      onCancel={onClose}
      onOk={handleSave}
      okText="Guardar"
      cancelText="Cancelar"
      confirmLoading={loading}
    >
      <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <div style={{ marginBottom: 4, fontSize: 13 }}>Fecha y hora</div>
          <Input type="datetime-local" value={fechaHora} onChange={e => setFechaHora(e.target.value)} />
        </div>
        <div>
          <div style={{ marginBottom: 4, fontSize: 13 }}>Tipo</div>
          <Select value={tipo} onChange={setTipo} style={{ width: '100%' }}
            options={[{ value: 'presencial', label: 'Presencial' }, { value: 'virtual', label: 'Virtual' }]} />
        </div>
        <div>
          <div style={{ marginBottom: 4, fontSize: 13 }}>Quién realiza la visita</div>
          <Select allowClear value={vendedorId} onChange={v => setVendedorId(v)} style={{ width: '100%' }}
            placeholder="Seleccionar..." options={vendedores.map(v => ({ value: v.id, label: `${v.nombre} ${v.apellido}` }))} />
        </div>
        <div>
          <div style={{ marginBottom: 4, fontSize: 13 }}>Proyecto / Edificio</div>
          <Select allowClear value={edificioId} onChange={v => setEdificioId(v)} style={{ width: '100%' }}
            placeholder="Seleccionar proyecto..." options={edificios.map(e => ({ value: e.id, label: e.nombre }))} />
        </div>
        <div>
          <div style={{ marginBottom: 4, fontSize: 13 }}>Notas</div>
          <Input.TextArea rows={3} value={notas} onChange={e => setNotas(e.target.value)} placeholder="Observaciones..." />
        </div>
      </div>
    </Modal>
  )
}


// ─── Nota rápida inline ───────────────────────────────────────────
function NotaRapida({ leadId }) {
  const qc = useQueryClient()
  const { message } = App.useApp()
  const [descripcion, setDescripcion] = useState('')
  const [edificioId, setEdificioId] = useState(undefined)
  const [unidadesIds, setUnidadesIds] = useState([])
  const [loading, setLoading] = useState(false)

  const { data: edificios = [] } = useQuery({
    queryKey: ['edificios-activos'],
    queryFn: () => api.get('/edificios').then(r => r.data)
  })
  const { data: unidades = [] } = useQuery({
    queryKey: ['unidades-edificio', edificioId],
    queryFn: () => api.get('/unidades', { params: { edificioId } }).then(r => r.data),
    enabled: !!edificioId
  })

  const handleSubmit = async () => {
    if (!descripcion.trim()) return
    setLoading(true)
    try {
      // Construir descripción con contexto de interés
      let texto = descripcion.trim()
      const partes = []
      if (edificioId) {
        const edif = edificios.find(e => e.id === edificioId)
        if (edif) partes.push(`📍 ${edif.nombre}`)
      }
      if (unidadesIds.length > 0) {
        const nums = unidades.filter(u => unidadesIds.includes(u.id)).map(u => u.numero)
        if (nums.length) partes.push(`Unidades: ${nums.join(', ')}`)
      }
      if (partes.length) texto = `${texto}\n${partes.join(' · ')}`

      await api.post(`/leads/${leadId}/interacciones`, { leadId, tipo: 'NOTA', descripcion: texto })
      message.success('Nota guardada')
      qc.invalidateQueries(['lead', leadId])
      setDescripcion('')
      setEdificioId(undefined)
      setUnidadesIds([])
    } catch (err) {
      message.error('Error al guardar nota')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: '12px 0 16px', borderBottom: '1px solid #f0f0f0', marginBottom: 12 }}>
      <Input.TextArea
        rows={2}
        value={descripcion}
        onChange={e => setDescripcion(e.target.value)}
        placeholder="Agregar nota..."
        style={{ marginBottom: 8, resize: 'none' }}
        onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit() }}
      />
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <Select
          allowClear
          placeholder="Edificio de interés"
          value={edificioId}
          onChange={v => { setEdificioId(v); setUnidadesIds([]) }}
          style={{ flex: 1, minWidth: 140 }}
          options={edificios.map(e => ({ value: e.id, label: e.nombre }))}
          size="small"
        />
        <Select
          mode="multiple"
          allowClear
          placeholder="Unidades"
          value={unidadesIds}
          onChange={setUnidadesIds}
          disabled={!edificioId}
          style={{ flex: 1, minWidth: 140 }}
          options={unidades.map(u => ({ value: u.id, label: `${u.tipo === 'BODEGA' ? '🏪' : '🚗'} ${u.numero}` }))}
          size="small"
          maxTagCount={2}
        />
        <Button
          type="primary"
          size="small"
          loading={loading}
          disabled={!descripcion.trim()}
          onClick={handleSubmit}
        >
          Guardar nota
        </Button>
      </div>
      <div style={{ fontSize: 11, color: '#bbb', marginTop: 4 }}>Cmd+Enter para guardar rápido · Edificio y unidades son opcionales</div>
    </div>
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

// ─── Modal editar contacto ─────────────────────────────────────────
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

  const c = lead?.contacto
  return (
    <Modal
      title="Editar contacto"
      open={open}
      onCancel={onClose}
      onOk={() => form.validateFields().then(vals => editar.mutate({
        ...vals,
        fechaNacimiento: vals.fechaNacimiento ? vals.fechaNacimiento.toISOString() : null,
      }))}
      okText="Guardar"
      cancelText="Cancelar"
      confirmLoading={editar.isPending}
      width={600}
      afterOpenChange={(o) => {
        if (o && c) form.setFieldsValue({
          nombre: c.nombre,
          apellido: c.apellido,
          rut: c.rut || '',
          telefono: c.telefono || '',
          email: c.email || '',
          empresa: c.empresa || '',
          fechaNacimiento: c.fechaNacimiento ? dayjs(c.fechaNacimiento) : null,
          ciudadNacimiento: c.ciudadNacimiento || '',
          estadoCivil: c.estadoCivil || '',
          profesion: c.profesion || '',
          nacionalidad: c.nacionalidad || '',
          regimenMatrimonial: c.regimenMatrimonial || '',
          direccionParticular: c.direccionParticular || '',
        })
      }}
    >
      <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
        <Row gutter={12}>
          <Col span={12}>
            <Form.Item name="nombre" label="Nombre" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="apellido" label="Apellido">
              <Input />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="rut" label="RUT">
              <Input placeholder="12.345.678-9" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="telefono" label="Teléfono">
              <Input />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="email" label="Email">
              <Input type="email" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="empresa" label="Empresa">
              <Input />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="fechaNacimiento" label="Fecha de nacimiento">
              <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="ciudadNacimiento" label="Ciudad de nacimiento">
              <Input placeholder="Ej: Santiago, Chile" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="estadoCivil" label="Estado civil">
              <Select allowClear options={[
                { value: 'Soltero/a', label: 'Soltero/a' },
                { value: 'Casado/a', label: 'Casado/a' },
                { value: 'Divorciado/a', label: 'Divorciado/a' },
                { value: 'Viudo/a', label: 'Viudo/a' },
                { value: 'Conviviente civil', label: 'Conviviente civil' },
              ]} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="regimenMatrimonial" label="Régimen matrimonial">
              <Select allowClear options={[
                { value: 'Sociedad conyugal', label: 'Sociedad conyugal' },
                { value: 'Separación Total de Bienes', label: 'Separación Total de Bienes' },
                { value: 'Participación en los gananciales', label: 'Participación en los gananciales' },
              ]} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="profesion" label="Profesión">
              <Input />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="nacionalidad" label="Nacionalidad">
              <Input />
            </Form.Item>
          </Col>
          <Col span={24}>
            <Form.Item name="direccionParticular" label="Dirección particular">
              <Input placeholder="Ej: Radal 1225, Quinta Normal. Depto 908" />
            </Form.Item>
          </Col>
        </Row>
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
  const [modalPerdido, setModalPerdido] = useState(false)
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

  const cambiarEtapa = useMutation({
    mutationFn: ({ etapa, motivoPerdidaCat, motivoPerdidaNota }) =>
      api.put(`/leads/${id}/etapa`, { etapa, motivoPerdidaCat, motivoPerdidaNota }),
    onSuccess: () => {
      message.success('Etapa actualizada')
      qc.invalidateQueries(['lead', Number(id)])
      qc.invalidateQueries(['leads-kanban'])
    },
    onError: err => message.error(err.response?.data?.error || 'Error al cambiar etapa')
  })

  const handleConfirmarPerdido = (values) => {
    cambiarEtapa.mutate(
      { etapa: 'PERDIDO', ...values },
      { onSettled: () => setModalPerdido(false) }
    )
  }

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

  const { data: todosVendedores = [] } = useQuery({
    queryKey: ['usuarios-todos-activos'],
    queryFn: () => api.get('/usuarios').then(r => r.data.filter(u => u.activo)),
    enabled: esGerenciaOJV,
  })

  const cambiarVendedor = useMutation({
    mutationFn: (vendedorId) => api.put(`/leads/${id}`, { vendedorId: vendedorId || null }),
    onSuccess: () => {
      message.success('Vendedor actualizado')
      qc.invalidateQueries(['lead', id])
    },
    onError: err => message.error(err.response?.data?.error || 'Error al cambiar vendedor'),
  })

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
          {lead.ventas?.length === 1 && (
            <Button type="primary" size="small" icon={<ShoppingOutlined />} onClick={() => navigate(`/ventas/${lead.ventas[0].id}`)}>
              Ver Venta
            </Button>
          )}
          {lead.ventas?.length > 1 && (
            lead.ventas.map(v => (
              <Button key={v.id} size="small" icon={<ShoppingOutlined />} onClick={() => navigate(`/ventas/${v.id}`)}>
                Venta #{v.id} — {v.estado}
              </Button>
            ))
          )}
        </Space>
      </div>

      <Row gutter={[16, 16]}>
        {/* Columna izquierda */}
        <Col xs={24} md={8}>
          <Space direction="vertical" style={{ width: '100%' }} size={12}>
            {/* Banners pérdida */}
            {lead.perdidaAutomatica && (
              <Alert
                type="info"
                showIcon
                icon={<span>🤖</span>}
                message="Perdido automáticamente"
                description={`Estaba en ${ETAPA_LABEL[lead.etapaAntesDePerdido] || lead.etapaAntesDePerdido || '—'} sin actividad. Regla aplicada el ${dayjs(lead.perdidaAutomaticaEn).format('DD/MM/YYYY HH:mm')}.`}
                style={{ marginBottom: 12 }}
              />
            )}
            {lead.etapa === 'PERDIDO' && lead.motivoPerdidaCat && (
              <Alert
                type="error"
                showIcon
                message={
                  <span>
                    Motivo: <Tag color="red" style={{ margin: '0 4px' }}>{MOTIVO_PERDIDA_LABEL[lead.motivoPerdidaCat] || lead.motivoPerdidaCat}</Tag>
                    {lead.etapaAntesDePerdido && (
                      <> · Desde: <Tag style={{ margin: '0 4px' }}>{ETAPA_LABEL[lead.etapaAntesDePerdido] || lead.etapaAntesDePerdido}</Tag></>
                    )}
                  </span>
                }
                description={lead.motivoPerdidaNota || undefined}
                style={{ marginBottom: 12 }}
              />
            )}

            {/* Contacto */}
            <Card
              size="small"
              title={<><UserOutlined /> Contacto</>}
              extra={<Button type="text" size="small" icon={<EditOutlined />} onClick={() => setModalEditarContacto(true)} />}
            >
              <Space direction="vertical" size={4} style={{ width: '100%' }}>
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
                {lead.contacto.rut && <Text type="secondary" style={{ fontSize: 13 }}>RUT: {lead.contacto.rut}</Text>}
                {lead.contacto.empresa && <Text type="secondary" style={{ fontSize: 13 }}>🏢 {lead.contacto.empresa}</Text>}
                {lead.contacto.fechaNacimiento && <Text type="secondary" style={{ fontSize: 13 }}>📅 {format(new Date(lead.contacto.fechaNacimiento), 'dd/MM/yyyy')}</Text>}
                {lead.contacto.ciudadNacimiento && <Text type="secondary" style={{ fontSize: 13 }}>🌍 {lead.contacto.ciudadNacimiento}</Text>}
                {lead.contacto.estadoCivil && <Text type="secondary" style={{ fontSize: 13 }}>💍 {lead.contacto.estadoCivil}</Text>}
                {lead.contacto.regimenMatrimonial && <Text type="secondary" style={{ fontSize: 13 }}>📄 {lead.contacto.regimenMatrimonial}</Text>}
                {lead.contacto.profesion && <Text type="secondary" style={{ fontSize: 13 }}>💼 {lead.contacto.profesion}</Text>}
                {lead.contacto.nacionalidad && <Text type="secondary" style={{ fontSize: 13 }}>🏳️ {lead.contacto.nacionalidad}</Text>}
                {lead.contacto.direccionParticular && <Text type="secondary" style={{ fontSize: 13 }}>📍 {lead.contacto.direccionParticular}</Text>}
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

            {/* Vendedor */}
            <Card size="small" title="Vendedor asignado">
              {esGerenciaOJV ? (
                <Select
                  style={{ width: '100%' }}
                  size="small"
                  allowClear
                  placeholder="Sin vendedor asignado"
                  value={lead.vendedor?.id || undefined}
                  onChange={(val) => cambiarVendedor.mutate(val)}
                  loading={cambiarVendedor.isPending}
                  options={todosVendedores.map(v => ({ value: v.id, label: `${v.nombre} ${v.apellido}` }))}
                />
              ) : (
                lead.vendedor
                  ? <Text style={{ fontSize: 13 }}><Text strong>{lead.vendedor.nombre} {lead.vendedor.apellido}</Text></Text>
                  : <Text type="secondary" style={{ fontSize: 13 }}>Sin vendedor asignado</Text>
              )}
            </Card>

            {(lead.campana || lead.presupuestoAprox) && (
              <Card size="small" title="Info del lead" extra={<Button type="text" size="small" icon={<EditOutlined />} onClick={() => setModalEditarLead(true)} />}>
                {lead.campana && <div><Text type="secondary" style={{ fontSize: 12 }}>📣 Campaña: {lead.campana}</Text></div>}
                {lead.presupuestoAprox && <div><Text type="secondary" style={{ fontSize: 12 }}>💰 Presupuesto: {lead.presupuestoAprox} UF</Text></div>}
              </Card>
            )}

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
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                  <Text style={{ fontSize: 12, color: '#ff4d4f', fontWeight: 600 }}>✗ Perdido</Text>
                  {lead.motivoPerdidaCat && <Tag color="red" style={{ fontSize: 11, margin: 0 }}>{MOTIVO_PERDIDA_LABEL[lead.motivoPerdidaCat] || lead.motivoPerdidaCat}</Tag>}
                  {lead.perdidaAutomatica && <Tag color="blue" style={{ fontSize: 11, margin: 0 }}>🤖 Auto</Tag>}
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
              <NotaRapida leadId={id} />
              {timeline.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 0', color: '#aaa' }}>
                  <Text type="secondary">Sin actividad registrada.</Text>
                </div>
              ) : (
                <Timeline items={timelineItems} style={{ marginTop: 8 }} />
              )}
            </Card>

            <CotizacionesLead leadId={id} />

            {/* Comuro — debajo de cotizaciones */}
            {lead.comuroData && (() => {
              const reunion = parsearFechaComuro(lead.comuroData.context)
              const contextoLimpio = limpiarContext(lead.comuroData.context)
              return (
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
                  {/* Reunión agendada — destacada arriba */}
                  {reunion && (
                    <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 14px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 20 }}>📅</span>
                      <div>
                        <Text strong style={{ fontSize: 13, color: '#15803d' }}>
                          Reunión agendada — {reunion.fecha} · {reunion.hora}
                        </Text>
                        {contextoLimpio && (
                          <div style={{ fontSize: 12, color: '#166534', marginTop: 2 }}>
                            {contextoLimpio.split('\n')[0].slice(0, 120)}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Grid datos estructurados */}
                  <Row gutter={[16, 8]}>
                    {(lead.comuroData.interes_tipo_activo || lead.comuroData.interes_ubicacion || lead.comuroData.interes_superficie || lead.comuroData.interes_presupuesto || lead.comuroData.value_deal) && (
                      <Col xs={24} sm={12} md={6}>
                        <Text type="secondary" style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, display: 'block', marginBottom: 6 }}>INTERÉS</Text>
                        {lead.comuroData.interes_tipo_activo && <div style={{ fontSize: 13 }}>📦 {lead.comuroData.interes_tipo_activo}</div>}
                        {lead.comuroData.interes_ubicacion && <div style={{ fontSize: 13 }}>📍 {lead.comuroData.interes_ubicacion}</div>}
                        {lead.comuroData.interes_superficie && <div style={{ fontSize: 13 }}>📐 {lead.comuroData.interes_superficie}</div>}
                        {lead.comuroData.interes_presupuesto && lead.comuroData.interes_presupuesto !== 'false' && <div style={{ fontSize: 13 }}>💰 {lead.comuroData.interes_presupuesto}</div>}
                        {lead.comuroData.value_deal && <div style={{ fontSize: 13, color: '#059669', fontWeight: 600 }}>{lead.comuroData.value_deal}</div>}
                      </Col>
                    )}

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

                    {(lead.comuroData.coordinar_reunion !== undefined || lead.comuroData.tipo_contacto || lead.comuroData.fecha_visita || lead.comuroData.solicito_imagenes || lead.comuroData.pregunta_direccion) && (
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

                  {/* Contexto limpio abajo */}
                  {contextoLimpio && (
                    <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px 14px', marginTop: 16 }}>
                      <Text type="secondary" style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, display: 'block', marginBottom: 4 }}>RESUMEN CONVERSACIÓN</Text>
                      <Text style={{ fontSize: 12, color: '#374151', whiteSpace: 'pre-wrap' }}>{contextoLimpio}</Text>
                    </div>
                  )}
                </Card>
              )
            })()}
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
      <ModalCambiarEtapa   open={modalEtapa}          onClose={() => setModalEtapa(false)}          lead={lead} onPerdido={() => setModalPerdido(true)} />
      <ModalPerdido
        open={modalPerdido}
        etapaActual={lead?.etapa}
        onConfirm={handleConfirmarPerdido}
        onCancel={() => setModalPerdido(false)}
        loading={cambiarEtapa.isPending}
      />
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
