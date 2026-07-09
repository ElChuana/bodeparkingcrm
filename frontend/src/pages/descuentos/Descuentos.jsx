import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  Table, Tag, Button, Typography, Modal, Form, Input,
  Space, App, Tabs, Badge, Tooltip, Card, Statistic, Row, Col, Divider
} from 'antd'
import { CheckOutlined, CloseOutlined, FileTextOutlined, AppstoreOutlined } from '@ant-design/icons'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import { useUF } from '../../hooks/useUF'

const { Title, Text } = Typography

const ESTADO_COLOR = { PENDIENTE: 'orange', APROBADA: 'green', RECHAZADA: 'red' }
const ESTADO_LABEL = { PENDIENTE: 'Pendiente', APROBADA: 'Aprobada', RECHAZADA: 'Rechazada' }
const ROL_LABEL = { VENDEDOR: 'Vendedor', JEFE_VENTAS: 'Jefe de Ventas', BROKER_EXTERNO: 'Broker', ABOGADO: 'Abogado' }

function fmt(date) {
  return date ? format(new Date(date), "d MMM yyyy HH:mm", { locale: es }) : '—'
}
function fmtDescuento(s) {
  const pesos = v => `$${Number(v).toLocaleString('es-CL')}`
  switch (s.tipo) {
    case 'UF':          return `−${s.valor} UF`
    case 'PESOS':       return `−${pesos(s.valor)}`
    case 'PORCENTAJE':  return `−${s.valor}%`
    case 'TOTAL_UF':    return `dejar en ${s.valor} UF`
    case 'TOTAL_PESOS': return `dejar en ${pesos(s.valor)}`
    default:            return `${s.valor}`
  }
}

// Total vigente de la cotización (base − packs − promos − descuentos ya aprobados)
function totalesCotizacion(cot) {
  const base = (cot?.items || []).reduce((s, i) => s + (i.precioListaUF || 0), 0)
  const previos = (cot?.packs || []).reduce((s, p) => s + (p.descuentoAplicadoUF || 0), 0)
    + (cot?.promociones || []).reduce((s, p) => s + (p.descuentoAplicadoUF || 0), 0)
    + (cot?.descuentoAprobadoUF || 0)
  return { base, totalActual: Math.max(base - previos, 0) }
}

// Descuento en UF que implica la solicitud. Si ya fue aprobada usa el monto
// aplicado (auditado); si está pendiente, estima con la UF de hoy.
function montoUFSolicitud(s, valorUF) {
  if (s.descuentoAplicadoUF != null) return Number(s.descuentoAplicadoUF)
  const { base, totalActual } = totalesCotizacion(s.cotizacion)
  const v = Number(s.valor)
  switch (s.tipo) {
    case 'UF':          return v
    case 'PORCENTAJE':  return +(base * v / 100).toFixed(2)
    case 'PESOS':       return valorUF ? +(v / valorUF).toFixed(2) : null
    case 'TOTAL_UF':    return +(totalActual - v).toFixed(2)
    case 'TOTAL_PESOS': return valorUF ? +(totalActual - v / valorUF).toFixed(2) : null
    default:            return null
  }
}

// ─── Modal revisar ────────────────────────────────────────────────────
function ModalRevisar({ solicitud, onClose }) {
  const qc = useQueryClient()
  const [form] = Form.useForm()
  const { message } = App.useApp()

  const revisar = useMutation({
    mutationFn: ({ decision, comentario }) =>
      api.put(`/descuentos/${solicitud.id}/revisar`, { decision, comentario }),
    onSuccess: (_, vars) => {
      message.success(vars.decision === 'APROBADA' ? 'Descuento aprobado y aplicado' : 'Solicitud rechazada')
      qc.invalidateQueries(['solicitudes-descuento'])
      onClose()
    },
    onError: err => message.error(err.response?.data?.error || 'Error')
  })

  const { valorUF, ufAPesos, formatPesos } = useUF()
  const items = solicitud?.cotizacion?.items || []
  const { base, totalActual } = totalesCotizacion(solicitud?.cotizacion)
  const montoUF = solicitud ? (montoUFSolicitud(solicitud, valorUF) ?? 0) : 0
  const finalConDescuento = Math.max(totalActual - montoUF, 0)
  const pctAhorro = totalActual > 0 ? ((montoUF / totalActual) * 100).toFixed(1) : 0
  // PESOS y TOTAL_PESOS se convierten con la UF vigente al momento de aprobar
  const usaUFDelDia = ['PESOS', 'TOTAL_PESOS'].includes(solicitud?.tipo)

  const TIPO_UNIDAD_COLOR = { BODEGA: 'blue', ESTACIONAMIENTO: 'purple' }

  return (
    <Modal
      title="Revisar solicitud de descuento"
      open={!!solicitud}
      onCancel={onClose}
      footer={null}
      width={560}
    >
      {solicitud && (
        <div style={{ marginTop: 12 }}>

          {/* Info solicitante + cliente */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <Card size="small" style={{ flex: 1, background: '#f0f5ff' }}>
              <Text type="secondary" style={{ fontSize: 11 }}>Solicitante</Text>
              <div><Text strong>{solicitud.solicitadoPor.nombre} {solicitud.solicitadoPor.apellido}</Text></div>
              <div><Text type="secondary" style={{ fontSize: 11 }}>{ROL_LABEL[solicitud.solicitadoPor.rol] || solicitud.solicitadoPor.rol}</Text></div>
            </Card>
            <Card size="small" style={{ flex: 1, background: '#f0f5ff' }}>
              <Text type="secondary" style={{ fontSize: 11 }}>Cliente</Text>
              <div><Text strong>{solicitud.cotizacion.lead.contacto.nombre} {solicitud.cotizacion.lead.contacto.apellido}</Text></div>
              <div><Text type="secondary" style={{ fontSize: 11 }}>Cotización #{solicitud.cotizacionId}</Text></div>
            </Card>
          </div>

          {/* Unidades de la cotización */}
          <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
            <AppstoreOutlined /> Unidades en la cotización
          </Text>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 14 }}>
            {items.map((item, i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '6px 10px', borderRadius: 6,
                background: '#fafafa', border: '1px solid #f0f0f0'
              }}>
                <Space size={6}>
                  <Tag color={TIPO_UNIDAD_COLOR[item.unidad?.tipo] || 'default'} style={{ margin: 0, fontSize: 11 }}>
                    {item.unidad?.tipo}
                  </Tag>
                  <Text style={{ fontSize: 13 }}>
                    {item.unidad?.edificio?.nombre} — {item.unidad?.numero}
                  </Text>
                </Space>
                <Text strong style={{ fontSize: 13 }}>{item.precioListaUF?.toFixed(2)} UF</Text>
              </div>
            ))}
          </div>

          {/* Cálculo de precios */}
          <div style={{
            borderRadius: 8, overflow: 'hidden',
            border: '1px solid #e8e8e8', marginBottom: 14
          }}>
            {/* Precio base */}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#fafafa' }}>
              <Text type="secondary">Precio base ({items.length} unidad{items.length !== 1 ? 'es' : ''})</Text>
              <Text strong>{base.toFixed(2)} UF</Text>
            </div>
            {/* Promos/descuentos ya aplicados */}
            {totalActual < base && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#fafafa', borderTop: '1px solid #f0f0f0' }}>
                <Text type="secondary">Total actual (con promos/descuentos previos)</Text>
                <Text strong>{totalActual.toFixed(2)} UF</Text>
              </div>
            )}
            {/* Descuento */}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#fff7e6', borderTop: '1px solid #ffe58f' }}>
              <Text style={{ color: '#d46b08' }}>
                Pedido: {fmtDescuento(solicitud)}
              </Text>
              <Text strong style={{ color: '#d46b08' }}>− {montoUF.toFixed(2)} UF</Text>
            </div>
            {/* Total */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: '#f6ffed', borderTop: '1px solid #b7eb8f' }}>
              <div>
                <Text strong style={{ fontSize: 14 }}>Total con descuento</Text>
                <div>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    Ahorro: {montoUF.toFixed(2)} UF ({pctAhorro}%)
                  </Text>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <Text strong style={{ fontSize: 20, color: '#389e0d' }}>{finalConDescuento.toFixed(2)} UF</Text>
                {valorUF && (
                  <div><Text type="secondary" style={{ fontSize: 11 }}>{formatPesos(ufAPesos(finalConDescuento))}</Text></div>
                )}
              </div>
            </div>
          </div>

          {usaUFDelDia && solicitud.estado === 'PENDIENTE' && (
            <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: -8, marginBottom: 14 }}>
              Monto estimado con la UF de hoy{valorUF ? ` (${formatPesos(valorUF)})` : ''}; se recalcula con la UF vigente al aprobar.
            </Text>
          )}

          {/* Motivo */}
          <div style={{ marginBottom: 14 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>Motivo</Text>
            <div style={{ marginTop: 4, padding: '8px 12px', background: '#f5f5f5', borderRadius: 6 }}>
              <Text style={{ fontSize: 13 }}>{solicitud.motivo}</Text>
            </div>
          </div>

          <Form form={form} layout="vertical">
            <Form.Item name="comentario" label="Comentario (opcional)">
              <Input.TextArea rows={2} placeholder="Ej: Aprobado por cliente frecuente" />
            </Form.Item>
          </Form>

          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button
              danger
              icon={<CloseOutlined />}
              loading={revisar.isPending}
              onClick={() => form.validateFields().then(v => revisar.mutate({ decision: 'RECHAZADA', comentario: v.comentario }))}
            >
              Rechazar
            </Button>
            <Button
              type="primary"
              icon={<CheckOutlined />}
              loading={revisar.isPending}
              onClick={() => form.validateFields().then(v => revisar.mutate({ decision: 'APROBADA', comentario: v.comentario }))}
            >
              Aprobar y aplicar
            </Button>
          </Space>
        </div>
      )}
    </Modal>
  )
}

// ─── Tabla de solicitudes ─────────────────────────────────────────────
function TablaSolicitudes({ data, isLoading, soloGerente }) {
  const navigate = useNavigate()
  const [revisando, setRevisando] = useState(null)
  const { valorUF } = useUF()

  const columns = [
    {
      title: 'Solicitante', key: 'sol',
      render: (_, s) => (
        <div>
          <Text strong style={{ fontSize: 13 }}>{s.solicitadoPor.nombre} {s.solicitadoPor.apellido}</Text>
          <div><Text type="secondary" style={{ fontSize: 11 }}>{ROL_LABEL[s.solicitadoPor.rol] || s.solicitadoPor.rol}</Text></div>
        </div>
      )
    },
    {
      title: 'Cliente', key: 'cliente',
      render: (_, s) => (
        <Text>{s.cotizacion.lead.contacto.nombre} {s.cotizacion.lead.contacto.apellido}</Text>
      )
    },
    {
      title: 'Cotización', key: 'cot', width: 90,
      render: (_, s) => (
        <Button type="link" size="small" icon={<FileTextOutlined />}
          onClick={() => navigate(`/cotizaciones/${s.cotizacionId}`)}>
          #{s.cotizacionId}
        </Button>
      )
    },
    {
      title: 'Descuento pedido', key: 'desc', width: 160,
      render: (_, s) => {
        const uf = montoUFSolicitud(s, valorUF)
        const mostrarUF = s.tipo !== 'UF' && uf != null && uf > 0
        return (
          <div>
            <Text strong style={{ color: '#d46b08' }}>{fmtDescuento(s)}</Text>
            {mostrarUF && (
              <div>
                <Text type="secondary" style={{ fontSize: 11 }}>
                  {s.descuentoAplicadoUF != null ? '=' : '≈'} −{uf.toFixed(2)} UF
                </Text>
              </div>
            )}
          </div>
        )
      }
    },
    {
      title: 'Motivo', key: 'motivo',
      render: (_, s) => (
        <Tooltip title={s.motivo}>
          <Text style={{ fontSize: 12 }} ellipsis={{ tooltip: true }}>{s.motivo}</Text>
        </Tooltip>
      )
    },
    {
      title: 'Estado', key: 'estado', width: 110,
      render: (_, s) => (
        <div>
          <Tag color={ESTADO_COLOR[s.estado]}>{ESTADO_LABEL[s.estado]}</Tag>
          {s.revisadoPor && (
            <div><Text type="secondary" style={{ fontSize: 10 }}>por {s.revisadoPor.nombre}</Text></div>
          )}
        </div>
      )
    },
    {
      title: 'Fecha', key: 'fecha', width: 130,
      render: (_, s) => <Text style={{ fontSize: 12 }}>{fmt(s.creadoEn)}</Text>
    },
    ...(soloGerente ? [{
      title: '', key: 'accion', width: 80,
      render: (_, s) => s.estado === 'PENDIENTE' ? (
        <Button size="small" type="primary" onClick={() => setRevisando(s)}>Revisar</Button>
      ) : (
        s.comentario && (
          <Tooltip title={s.comentario}>
            <Text type="secondary" style={{ fontSize: 11, cursor: 'help' }}>ver nota</Text>
          </Tooltip>
        )
      )
    }] : [])
  ]

  return (
    <>
      <Table
        dataSource={data}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        size="small"
        pagination={{ pageSize: 15 }}
        locale={{ emptyText: 'Sin solicitudes' }}
      />
      <ModalRevisar solicitud={revisando} onClose={() => setRevisando(null)} />
    </>
  )
}

// ─── Página principal ─────────────────────────────────────────────────
export default function Descuentos() {
  const { usuario } = useAuth()
  const esGerente = usuario?.rol === 'GERENTE'

  const { data: todas = [], isLoading } = useQuery({
    queryKey: ['solicitudes-descuento'],
    queryFn: () => api.get('/descuentos').then(r => r.data),
    refetchInterval: 30000,
  })

  const pendientes = todas.filter(s => s.estado === 'PENDIENTE')
  const aprobadas  = todas.filter(s => s.estado === 'APROBADA')
  const rechazadas = todas.filter(s => s.estado === 'RECHAZADA')

  const tabs = [
    {
      key: 'pendientes',
      label: <span>Pendientes <Badge count={pendientes.length} size="small" style={{ marginLeft: 4 }} /></span>,
      children: <TablaSolicitudes data={pendientes} isLoading={isLoading} soloGerente={esGerente} />
    },
    {
      key: 'aprobadas',
      label: `Aprobadas (${aprobadas.length})`,
      children: <TablaSolicitudes data={aprobadas} isLoading={isLoading} soloGerente={false} />
    },
    {
      key: 'rechazadas',
      label: `Rechazadas (${rechazadas.length})`,
      children: <TablaSolicitudes data={rechazadas} isLoading={isLoading} soloGerente={false} />
    },
  ]

  return (
    <div>
      <Title level={4} style={{ marginBottom: 20 }}>Solicitudes de Descuento</Title>

      <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
        <Col xs={8}><Card size="small"><Statistic title="Pendientes" value={pendientes.length} valueStyle={{ color: '#faad14' }} /></Card></Col>
        <Col xs={8}><Card size="small"><Statistic title="Aprobadas" value={aprobadas.length} valueStyle={{ color: '#52c41a' }} /></Card></Col>
        <Col xs={8}><Card size="small"><Statistic title="Rechazadas" value={rechazadas.length} valueStyle={{ color: '#ff4d4f' }} /></Card></Col>
      </Row>

      <Tabs items={tabs} />
    </div>
  )
}
