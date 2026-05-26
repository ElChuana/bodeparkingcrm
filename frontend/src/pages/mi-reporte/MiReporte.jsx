import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, Row, Col, Statistic, Table, Tag, Spin, Typography, Button, Empty, Alert, Space, Select, message } from 'antd'
import { ThunderboltOutlined, ReloadOutlined, WarningOutlined, BulbOutlined, CheckCircleOutlined, FileTextOutlined, ClockCircleOutlined, PhoneOutlined, UnorderedListOutlined } from '@ant-design/icons'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import api from '../../services/api'

const { Title, Text, Paragraph } = Typography

const BRAND = { azul: '#0091c3', gris: '#3d3d3d', rojo: '#ca3a36' }

// Estilos por sección — cada cuadro tiene su identidad visual
const SECCION_STYLES = {
  cotizaciones: {
    color: '#ca3a36',
    bg: '#fff5f5',
    bgHeader: '#fee2e2',
    icon: <FileTextOutlined />
  },
  promesas: {
    color: '#d97706',
    bg: '#fffbeb',
    bgHeader: '#fef3c7',
    icon: <ClockCircleOutlined />
  },
  seguimientos: {
    color: '#0891b2',
    bg: '#f0f9ff',
    bgHeader: '#e0f2fe',
    icon: <PhoneOutlined />
  },
  todos: {
    color: '#6b7280',
    bg: '#f9fafb',
    bgHeader: '#f3f4f6',
    icon: <UnorderedListOutlined />
  }
}

function ChipDias({ dias }) {
  const critico = dias >= 10
  return <Tag color={critico ? 'red' : 'orange'} style={{ margin: 0, fontWeight: 600 }}>{dias}d</Tag>
}

function ContactoLink({ leadId, contacto, telefono }) {
  return (
    <Link to={`/leads/${leadId}`} style={{ display: 'block' }}>
      <div style={{ fontWeight: 600, color: BRAND.azul }}>{contacto}</div>
      {telefono && <div style={{ fontSize: 12, color: '#666' }}>{telefono}</div>}
    </Link>
  )
}

function InsightCard({ insight }) {
  const colorMap = { warning: '#fef3c7', info: '#e0f2fe', ok: '#d1fae5' }
  const borderMap = { warning: '#f59e0b', info: BRAND.azul, ok: '#10b981' }
  const iconMap = {
    warning: <WarningOutlined style={{ color: '#f59e0b' }} />,
    info: <BulbOutlined style={{ color: BRAND.azul }} />,
    ok: <CheckCircleOutlined style={{ color: '#10b981' }} />
  }
  return (
    <div style={{
      background: colorMap[insight.tipo] || '#f5f5f5',
      borderLeft: `4px solid ${borderMap[insight.tipo] || '#999'}`,
      padding: '12px 16px',
      borderRadius: 8,
      marginBottom: 10
    }}>
      <Space align="start">
        {iconMap[insight.tipo]}
        <div>
          <Text strong>{insight.titulo}</Text>
          <div style={{ fontSize: 13, marginTop: 2 }}>{insight.mensaje}</div>
        </div>
      </Space>
    </div>
  )
}

function SeccionCard({ tipo, titulo, badge, children, count }) {
  const style = SECCION_STYLES[tipo]
  return (
    <Card
      style={{
        marginBottom: 20,
        background: style.bg,
        borderLeft: `5px solid ${style.color}`,
        borderTop: 'none',
        borderRight: 'none',
        borderBottom: 'none',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
      }}
      styles={{
        header: { background: style.bgHeader, borderBottom: `2px solid ${style.color}33` },
        body: { padding: 0 }
      }}
      title={
        <Space>
          <span style={{ color: style.color, fontSize: 18 }}>{style.icon}</span>
          <span style={{ color: style.color, fontWeight: 700, fontSize: 16 }}>{titulo}</span>
          {count !== undefined && <Tag color={tipo === 'cotizaciones' ? 'red' : tipo === 'promesas' ? 'orange' : tipo === 'seguimientos' ? 'cyan' : 'default'}>{count}</Tag>}
          {badge && <Tag color="red" style={{ marginLeft: 4 }}>{badge}</Tag>}
        </Space>
      }
    >
      {children}
    </Card>
  )
}

export default function MiReporte() {
  const qc = useQueryClient()
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}')
  const esGerente = usuario.rol === 'GERENTE' || usuario.rol === 'JEFE_VENTAS'

  const [vendedorSeleccionado, setVendedorSeleccionado] = useState(null)

  const { data: vendedoresData } = useQuery({
    queryKey: ['vendedores-reporte'],
    queryFn: () => api.get('/usuarios').then(r => r.data),
    enabled: esGerente
  })

  const vendedores = (vendedoresData || [])
    .filter(u => u.activo && ['VENDEDOR', 'JEFE_VENTAS'].includes(u.rol))

  const reporteUrl = vendedorSeleccionado
    ? `/reportes-ia/vendedor/${vendedorSeleccionado}`
    : '/reportes-ia/mi-reporte'

  const { data, isLoading } = useQuery({
    queryKey: ['reporte-ia', vendedorSeleccionado || 'mio'],
    queryFn: () => api.get(reporteUrl).then(r => r.data)
  })

  const generar = useMutation({
    mutationFn: () => api.post('/reportes-ia/generar', vendedorSeleccionado ? { vendedorId: vendedorSeleccionado } : {}),
    onSuccess: () => {
      message.success('Reporte generado')
      qc.invalidateQueries({ queryKey: ['reporte-ia'] })
    },
    onError: (e) => message.error(e?.response?.data?.error || 'Error al generar')
  })

  if (isLoading) return <div style={{ padding: 40, textAlign: 'center' }}><Spin size="large" /></div>

  const reporte = data?.reporte
  const c = reporte?.contenido

  const headerSelector = esGerente && (
    <Space>
      <Text style={{ color: 'white' }}>Ver reporte de:</Text>
      <Select
        style={{ width: 200 }}
        placeholder="Mi reporte"
        allowClear
        value={vendedorSeleccionado}
        onChange={setVendedorSeleccionado}
        options={vendedores.map(v => ({ value: v.id, label: `${v.nombre} ${v.apellido}` }))}
      />
    </Space>
  )

  if (!reporte) {
    return (
      <div style={{ padding: 24 }}>
        <Title level={3}>🎯 Mi reporte diario</Title>
        <Empty description="Aún no se ha generado un reporte. Se generan automáticamente cada mañana.">
          {esGerente && (
            <Button type="primary" icon={<ThunderboltOutlined />} loading={generar.isPending} onClick={() => generar.mutate()}>
              Generar ahora
            </Button>
          )}
        </Empty>
      </div>
    )
  }

  const fechaReporte = format(new Date(reporte.fecha), "EEEE d 'de' MMMM 'de' yyyy", { locale: es })

  // Columns con contacto clickeable
  const colSugerencia = (urgente = false) => ({
    title: 'Sugerencia IA',
    dataIndex: 'sugerencia',
    render: (v, r) => (
      <Tag color={(r.urgente ?? urgente) ? 'red' : 'blue'} style={{ whiteSpace: 'normal', maxWidth: 320, padding: '4px 8px' }}>
        {v}
      </Tag>
    )
  })

  const colsCotiz = [
    { title: 'Cliente', dataIndex: 'contacto', render: (v, r) => <ContactoLink leadId={r.leadId} contacto={v} telefono={r.telefono} /> },
    { title: 'Días', dataIndex: 'dias', width: 80, render: d => <ChipDias dias={d} /> },
    { title: 'Última gestión', dataIndex: 'ultimaNota', render: v => v ? <Text italic type="secondary">"{v}"</Text> : <Text type="danger">(sin nota)</Text> },
    colSugerencia(true)
  ]

  const colsPromesas = [
    { title: 'Cliente', dataIndex: 'contacto', render: (v, r) => <ContactoLink leadId={r.leadId} contacto={v} telefono={r.telefono} /> },
    { title: 'Días', dataIndex: 'dias', width: 80, render: d => <ChipDias dias={d} /> },
    { title: 'Lo que prometiste', dataIndex: 'prometio', render: v => v && <Text italic type="secondary">"{v}"</Text> },
    colSugerencia(true)
  ]

  const colsOtros = [
    { title: 'Cliente', dataIndex: 'contacto', render: (v, r) => <ContactoLink leadId={r.leadId} contacto={v} telefono={r.telefono} /> },
    { title: 'Días', dataIndex: 'dias', width: 80, render: d => <ChipDias dias={d} /> },
    { title: 'Última nota', dataIndex: 'ultimaNota', render: v => v ? <Text italic type="secondary">"{v}"</Text> : <Text type="danger">(sin nota)</Text> },
    colSugerencia(false)
  ]

  // Columnas para "todos los leads" (data raw del backend, sin sugerencia IA)
  const colsTodos = [
    { title: 'Cliente', dataIndex: 'contacto', render: (v, r) => <ContactoLink leadId={r.id} contacto={v} telefono={r.telefono} /> },
    { title: 'Etapa', dataIndex: 'etapa', width: 180, render: e => <Tag>{e.replace(/_/g, ' ')}</Tag> },
    { title: 'Días sin tocar', dataIndex: 'diasParado', width: 130, render: d => <ChipDias dias={d} /> },
    { title: 'Última gestión real', dataIndex: 'ultimaNotaReal', render: (v, r) => v ? <Text italic type="secondary">[{r.tipoUltimaInteraccion}] "{v.slice(0, 100)}{v.length > 100 ? '…' : ''}"</Text> : <Text type="danger">— sin nota real —</Text> }
  ]

  return (
    <div style={{ padding: 24, maxWidth: 1280, margin: '0 auto' }}>
      {/* HEADER */}
      <Card
        style={{ background: `linear-gradient(135deg, ${BRAND.azul} 0%, #006a8f 100%)`, marginBottom: 20, border: 'none' }}
        styles={{ body: { padding: 24 } }}
      >
        <Row justify="space-between" align="middle" gutter={[12, 12]}>
          <Col>
            <Title level={2} style={{ color: 'white', margin: 0 }}>🎯 Mi reporte diario</Title>
            <Text style={{ color: 'rgba(255,255,255,0.85)' }}>
              {fechaReporte} — {c.vendedor?.nombre} {c.vendedor?.apellido}
            </Text>
          </Col>
          <Col>
            <Space wrap>
              <Tag style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none' }}>
                ⚡ Generado con IA
              </Tag>
              {headerSelector}
              {esGerente && (
                <Button icon={<ReloadOutlined />} loading={generar.isPending} onClick={() => generar.mutate()}>
                  Regenerar
                </Button>
              )}
            </Space>
          </Col>
        </Row>
        {c.saludo && <Paragraph style={{ color: 'white', marginTop: 12, marginBottom: 0, fontSize: 15 }}>{c.saludo}</Paragraph>}
      </Card>

      {/* STATS */}
      <Row gutter={12} style={{ marginBottom: 20 }}>
        <Col xs={12} md={6}>
          <Card><Statistic title="Leads parados" value={c.stats?.leadsParados || 0} valueStyle={{ color: BRAND.rojo }} /></Card>
        </Col>
        <Col xs={12} md={6}>
          <Card><Statistic title="Promesas vencidas" value={c.stats?.promesasVencidas || 0} valueStyle={{ color: '#d97706' }} /></Card>
        </Col>
        <Col xs={12} md={6}>
          <Card><Statistic title="Cotizaciones por cerrar" value={c.stats?.cotizacionesPorCerrar || 0} valueStyle={{ color: '#0891b2' }} /></Card>
        </Col>
        <Col xs={12} md={6}>
          <Card><Statistic title="Notas escritas (7d)" value={c.stats?.notasUltimos7Dias || 0} valueStyle={{ color: '#10b981' }} /></Card>
        </Col>
      </Row>

      {/* INSIGHTS DE IA */}
      {c.insights?.length > 0 && (
        <Card title={<Space><BulbOutlined /> Lo que la IA detectó hoy</Space>} style={{ marginBottom: 20 }}>
          {c.insights.map((ins, i) => <InsightCard key={i} insight={ins} />)}
        </Card>
      )}

      {/* COTIZACIONES (ROJO) */}
      {c.cotizacionesUrgentes?.length > 0 && (
        <SeccionCard tipo="cotizaciones" titulo="Cotizaciones por cerrar" badge="URGENTE" count={c.cotizacionesUrgentes.length}>
          <Table dataSource={c.cotizacionesUrgentes} columns={colsCotiz} rowKey="leadId" pagination={false} size="middle" />
        </SeccionCard>
      )}

      {/* PROMESAS VENCIDAS (NARANJO) */}
      {c.promesasVencidas?.length > 0 && (
        <SeccionCard tipo="promesas" titulo="⏰ Prometiste llamar y no llamaste" count={c.promesasVencidas.length}>
          <Table dataSource={c.promesasVencidas} columns={colsPromesas} rowKey="leadId" pagination={false} size="middle" />
        </SeccionCard>
      )}

      {/* OTROS SEGUIMIENTOS (CYAN) */}
      {c.otrosSeguimientos?.length > 0 && (
        <SeccionCard tipo="seguimientos" titulo="📞 Otros seguimientos pendientes" count={c.otrosSeguimientos.length}>
          <Table dataSource={c.otrosSeguimientos} columns={colsOtros} rowKey="leadId" pagination={false} size="middle" />
        </SeccionCard>
      )}

      {/* PLAN RECOMENDADO */}
      {c.planRecomendado?.length > 0 && (
        <Alert
          type="info"
          showIcon
          message="🤖 Plan recomendado para hoy"
          description={
            <ul style={{ marginBottom: 0, paddingLeft: 18 }}>
              {c.planRecomendado.map((p, i) => <li key={i} style={{ marginBottom: 4 }}>{p}</li>)}
            </ul>
          }
          style={{ marginBottom: 20 }}
        />
      )}

      {/* TODOS LOS LEADS PARADOS (GRIS, AL FINAL) */}
      {c.todosLosLeads?.length > 0 && (
        <SeccionCard tipo="todos" titulo="Todos los leads pendientes" count={c.todosLosLeads.length}>
          <Table
            dataSource={c.todosLosLeads}
            columns={colsTodos}
            rowKey="id"
            pagination={{ pageSize: 20, showSizeChanger: false }}
            size="middle"
          />
        </SeccionCard>
      )}
    </div>
  )
}
