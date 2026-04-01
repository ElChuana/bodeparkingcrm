import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Card, Switch, Button, InputNumber, Typography, Space, Tag, Modal,
  Form, Tooltip, Alert, Divider, Row, Col, Statistic, App, List, Badge
} from 'antd'
import {
  ThunderboltOutlined, PlayCircleOutlined, CheckCircleOutlined,
  ClockCircleOutlined, TeamOutlined, KeyOutlined, CreditCardOutlined,
  RobotOutlined, InfoCircleOutlined, WarningOutlined
} from '@ant-design/icons'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import api from '../../services/api'

const { Title, Text, Paragraph } = Typography

const TIPO_META = {
  LEAD_SIN_ACTIVIDAD: {
    label: 'Lead sin actividad',
    desc: 'Se activa cuando un lead no ha tenido ninguna interacción o cambio en X días.',
    icon: <TeamOutlined />,
    color: '#1677ff',
    accion: 'Marcar como PERDIDO automáticamente',
    unidad: 'días sin actividad',
  },
  LEAD_ESTANCADO: {
    label: 'Lead estancado',
    desc: 'Se activa cuando un lead lleva demasiado tiempo en la misma etapa del pipeline.',
    icon: <ClockCircleOutlined />,
    color: '#fa8c16',
    accion: null, // solo notifica
    unidad: 'días en la misma etapa',
  },
  LLAVE_NO_DEVUELTA: {
    label: 'Llave no devuelta',
    desc: 'Se activa cuando una llave prestada no ha sido devuelta en el tiempo esperado.',
    icon: <KeyOutlined />,
    color: '#faad14',
    accion: null,
    unidad: 'días sin devolver',
  },
  CUOTA_VENCIDA: {
    label: 'Cuota vencida',
    desc: 'Se activa cuando hay cuotas de pago que llevan más de X días vencidas sin pagar.',
    icon: <CreditCardOutlined />,
    color: '#ff4d4f',
    accion: null,
    unidad: 'días vencida',
  },
  FECHA_LEGAL_PROXIMA: {
    label: 'Fecha legal próxima',
    desc: 'Alerta cuando se acerca una fecha importante del proceso legal (escritura, etc.).',
    icon: <CheckCircleOutlined />,
    color: '#722ed1',
    accion: null,
    unidad: 'días de anticipación',
  },
  ARRIENDO_POR_VENCER: {
    label: 'Arriendo por vencer',
    desc: 'Alerta cuando un contrato de arriendo está próximo a vencer.',
    icon: <WarningOutlined />,
    color: '#13c2c2',
    accion: null,
    unidad: 'días antes del vencimiento',
  },
}

function AutomatizacionCard({ config, onEdit }) {
  const qc = useQueryClient()
  const { message } = App.useApp()
  const meta = TIPO_META[config.tipo] || { label: config.tipo, icon: <RobotOutlined />, color: '#8c8c8c', unidad: 'días' }

  const toggleActiva = useMutation({
    mutationFn: (activa) => api.put(`/alertas/config/${config.tipo}`, { activa }),
    onSuccess: () => qc.invalidateQueries(['alertas-config']),
    onError: () => message.error('Error al actualizar')
  })

  return (
    <Card
      style={{ borderLeft: `4px solid ${config.activa ? meta.color : '#d9d9d9'}`, transition: 'all 0.2s' }}
      bodyStyle={{ padding: '16px 20px' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <Space align="start">
          <div style={{
            width: 36, height: 36, borderRadius: 8,
            background: config.activa ? `${meta.color}15` : '#f5f5f5',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: config.activa ? meta.color : '#bfbfbf', fontSize: 16, flexShrink: 0
          }}>
            {meta.icon}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Text strong style={{ fontSize: 14 }}>{meta.label}</Text>
              {config.activa
                ? <Tag color="green" style={{ fontSize: 11 }}>Activa</Tag>
                : <Tag style={{ fontSize: 11 }}>Inactiva</Tag>
              }
              {config.accionAutomatica && config.activa && (
                <Tooltip title="Ejecuta una acción automática cuando se cumple la condición">
                  <Tag color="orange" icon={<RobotOutlined />} style={{ fontSize: 11 }}>Auto-acción</Tag>
                </Tooltip>
              )}
            </div>
            <Text type="secondary" style={{ fontSize: 12 }}>{meta.desc}</Text>
            <div style={{ marginTop: 6 }}>
              <Text style={{ fontSize: 13 }}>
                Umbral: <Text strong style={{ color: config.activa ? meta.color : undefined }}>{config.umbralDias} {meta.unidad}</Text>
              </Text>
              {meta.accion && config.accionAutomatica && (
                <Text type="secondary" style={{ fontSize: 12, marginLeft: 12 }}>
                  <RobotOutlined /> {meta.accion}
                </Text>
              )}
            </div>
          </div>
        </Space>

        <Space>
          <Button size="small" onClick={() => onEdit(config)}>Configurar</Button>
          <Switch
            checked={config.activa}
            size="small"
            loading={toggleActiva.isPending}
            onChange={(v) => toggleActiva.mutate(v)}
          />
        </Space>
      </div>
    </Card>
  )
}

function ModalConfigurar({ config, onClose }) {
  const qc = useQueryClient()
  const [form] = Form.useForm()
  const { message } = App.useApp()
  const meta = config ? TIPO_META[config.tipo] : {}

  const guardar = useMutation({
    mutationFn: (d) => api.put(`/alertas/config/${config.tipo}`, d),
    onSuccess: () => {
      message.success('Automatización actualizada')
      qc.invalidateQueries(['alertas-config'])
      onClose()
    },
    onError: () => message.error('Error al guardar')
  })

  if (!config) return null

  return (
    <Modal
      title={
        <Space>
          <ThunderboltOutlined style={{ color: meta.color }} />
          Configurar: {meta.label}
        </Space>
      }
      open={!!config}
      onCancel={onClose}
      onOk={() => form.validateFields().then(guardar.mutate)}
      okText="Guardar"
      cancelText="Cancelar"
      confirmLoading={guardar.isPending}
      width={480}
    >
      <Alert
        message={meta.desc}
        type="info"
        showIcon
        icon={<InfoCircleOutlined />}
        style={{ marginBottom: 20, marginTop: 12 }}
      />
      <Form form={form} layout="vertical" initialValues={config}>
        <Form.Item
          name="umbralDias"
          label={`Umbral (${meta.unidad})`}
          rules={[{ required: true }, { type: 'number', min: 1, max: 365 }]}
          extra={`La automatización se activa cuando se superan estos días`}
        >
          <InputNumber min={1} max={365} style={{ width: '100%' }} addonAfter="días" />
        </Form.Item>

        <Form.Item name="activa" label="Estado" valuePropName="checked">
          <Switch checkedChildren="Activa" unCheckedChildren="Inactiva" />
        </Form.Item>

        {meta.accion && (
          <>
            <Divider style={{ margin: '12px 0' }} />
            <Form.Item
              name="accionAutomatica"
              label={
                <Space>
                  <RobotOutlined />
                  <span>Acción automática</span>
                  <Tooltip title="Si está activo, además de notificar ejecutará la acción indicada">
                    <InfoCircleOutlined style={{ color: '#aaa' }} />
                  </Tooltip>
                </Space>
              }
              valuePropName="checked"
              extra={
                <Text type="warning" style={{ fontSize: 12 }}>
                  ⚠️ {meta.accion}
                </Text>
              }
            >
              <Switch checkedChildren="Activada" unCheckedChildren="Solo notificar" />
            </Form.Item>
          </>
        )}
      </Form>
    </Modal>
  )
}

export default function Automatizaciones() {
  const [configurando, setConfigurando] = useState(null)
  const { message } = App.useApp()
  const qc = useQueryClient()

  const { data: configs = [], isLoading } = useQuery({
    queryKey: ['alertas-config'],
    queryFn: () => api.get('/alertas/config').then(r => r.data)
  })

  const { data: notifs = [] } = useQuery({
    queryKey: ['notificaciones'],
    queryFn: () => api.get('/alertas').then(r => r.data)
  })

  const ejecutar = useMutation({
    mutationFn: () => api.post('/alertas/chequeo'),
    onSuccess: (res) => {
      const { alertasGeneradas = [], acciones = [] } = res.data
      qc.invalidateQueries(['notificaciones'])
      qc.invalidateQueries(['leads-kanban'])
      const msg = `Chequeo completado: ${alertasGeneradas.length} alerta(s) generada(s)${acciones.length ? `, ${acciones.length} acción(es) automática(s)` : ''}.`
      message.success(msg, 5)
    },
    onError: err => message.error(err.response?.data?.error || 'Error al ejecutar')
  })

  const activas = configs.filter(c => c.activa).length
  const conAccion = configs.filter(c => c.activa && c.accionAutomatica).length
  const sinLeer = notifs.filter(n => !n.leida).length

  return (
    <div style={{ maxWidth: 800 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>Automatizaciones</Title>
          <Text type="secondary">Configura cuándo y cómo el sistema actúa automáticamente sobre leads, pagos y llaves.</Text>
        </div>
        <Tooltip title="Ejecuta el chequeo ahora para generar alertas y aplicar acciones automáticas configuradas">
          <Button
            type="primary"
            icon={<PlayCircleOutlined />}
            onClick={() => ejecutar.mutate()}
            loading={ejecutar.isPending}
          >
            Ejecutar chequeo ahora
          </Button>
        </Tooltip>
      </div>

      {/* Resumen */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={8}>
          <Card size="small">
            <Statistic title="Reglas activas" value={activas} suffix={`/ ${configs.length}`} valueStyle={{ color: '#52c41a' }} />
          </Card>
        </Col>
        <Col xs={8}>
          <Card size="small">
            <Statistic title="Con auto-acción" value={conAccion} prefix={<RobotOutlined />} valueStyle={{ color: '#fa8c16' }} />
          </Card>
        </Col>
        <Col xs={8}>
          <Card size="small">
            <Statistic title="Alertas sin leer" value={sinLeer} valueStyle={{ color: sinLeer > 0 ? '#ff4d4f' : undefined }} />
          </Card>
        </Col>
      </Row>

      {/* Reglas */}
      <Space direction="vertical" style={{ width: '100%' }} size={12}>
        {isLoading ? (
          <Card loading />
        ) : configs.map(c => (
          <AutomatizacionCard key={c.tipo} config={c} onEdit={setConfigurando} />
        ))}
      </Space>

      {/* Notificaciones recientes */}
      {notifs.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <Divider>
            <Text type="secondary" style={{ fontSize: 13 }}>Alertas recientes generadas por el sistema</Text>
          </Divider>
          <List
            size="small"
            dataSource={notifs.slice(0, 15)}
            renderItem={n => (
              <List.Item style={{ background: !n.leida ? '#f0f5ff' : undefined, borderRadius: 4, padding: '8px 12px', marginBottom: 4 }}>
                <Space align="start">
                  <Badge dot={!n.leida} color="blue">
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {TIPO_META[n.tipo]?.icon || <RobotOutlined />}
                    </div>
                  </Badge>
                  <div>
                    <Text style={{ fontSize: 13 }}>{n.mensaje}</Text>
                    <div><Text type="secondary" style={{ fontSize: 11 }}>
                      {formatDistanceToNow(new Date(n.creadoEn), { addSuffix: true, locale: es })}
                    </Text></div>
                  </div>
                </Space>
              </List.Item>
            )}
          />
        </div>
      )}

      <ModalConfigurar config={configurando} onClose={() => setConfigurando(null)} />
    </div>
  )
}
