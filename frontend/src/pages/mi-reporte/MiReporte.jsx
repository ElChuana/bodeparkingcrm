import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, Row, Col, Statistic, Table, Tag, Spin, Typography, Button, Empty, Alert, Space, Select, message } from 'antd'
import { ThunderboltOutlined, ReloadOutlined, WarningOutlined, BulbOutlined, CheckCircleOutlined, FileTextOutlined } from '@ant-design/icons'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import api from '../../services/api'

const { Title, Text, Paragraph } = Typography

const BRAND = { azul: '#0091c3', gris: '#3d3d3d', rojo: '#ca3a36' }

function ChipDias({ dias }) {
  const critico = dias >= 10
  return <Tag color={critico ? 'red' : 'orange'} style={{ margin: 0 }}>{dias}d</Tag>
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

export default function MiReporte() {
  const qc = useQueryClient()
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}')
  const esGerente = usuario.rol === 'GERENTE' || usuario.rol === 'JEFE_VENTAS'

  const [vendedorSeleccionado, setVendedorSeleccionado] = useState(null)

  // Lista de vendedores (solo si es gerente)
  const { data: vendedoresData } = useQuery({
    queryKey: ['vendedores'],
    queryFn: () => api.get('/usuarios?activos=true').then(r => r.data),
    enabled: esGerente
  })

  const vendedores = (vendedoresData || []).filter(u => ['VENDEDOR', 'JEFE_VENTAS'].includes(u.rol))

  // Reporte: propio o del vendedor seleccionado
  const reporteUrl = vendedorSeleccionado
    ? `/reportes-ia/vendedor/${vendedorSeleccionado}`
    : '/reportes-ia/mi-reporte'

  const { data, isLoading, refetch } = useQuery({
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

  // Header con selector de vendedor (gerente)
  const headerSelector = esGerente && (
    <Space>
      <Text>Ver reporte de:</Text>
      <Select
        style={{ width: 220 }}
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
        <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
          <Title level={3} style={{ margin: 0 }}>🎯 Mi reporte diario</Title>
          {headerSelector}
        </Space>
        <Empty description="Aún no se ha generado un reporte. Se generan automáticamente cada mañana a las 7-8 AM." >
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

  const colsCotiz = [
    { title: 'Cliente', dataIndex: 'contacto', render: (v, r) => (
      <div>
        <div style={{ fontWeight: 600 }}>{v}</div>
        <div style={{ fontSize: 12, color: '#666' }}>{r.telefono}</div>
      </div>
    )},
    { title: 'Días', dataIndex: 'dias', width: 80, render: d => <ChipDias dias={d} /> },
    { title: 'Última gestión', dataIndex: 'ultimaNota', render: v => v ? <Text italic type="secondary">"{v}"</Text> : <Text type="danger">(sin nota)</Text> },
    { title: 'Sugerencia IA', dataIndex: 'sugerencia', render: (v, r) => (
      <Tag color={r.urgente ? 'red' : 'blue'} style={{ whiteSpace: 'normal', maxWidth: 280 }}>{v}</Tag>
    )},
  ]

  const colsPromesas = [
    { title: 'Cliente', dataIndex: 'contacto', render: (v, r) => (
      <div>
        <div style={{ fontWeight: 600 }}>{v}</div>
        <div style={{ fontSize: 12, color: '#666' }}>{r.telefono}</div>
      </div>
    )},
    { title: 'Días', dataIndex: 'dias', width: 80, render: d => <ChipDias dias={d} /> },
    { title: 'Lo que prometiste', dataIndex: 'prometio', render: v => v && <Text italic type="secondary">"{v}"</Text> },
    { title: 'Sugerencia IA', dataIndex: 'sugerencia', render: (v, r) => (
      <Tag color={r.urgente ? 'red' : 'blue'} style={{ whiteSpace: 'normal', maxWidth: 280 }}>{v}</Tag>
    )},
  ]

  const colsOtros = [
    { title: 'Cliente', dataIndex: 'contacto', render: (v, r) => (
      <div>
        <div style={{ fontWeight: 600 }}>{v}</div>
        <div style={{ fontSize: 12, color: '#666' }}>{r.telefono}</div>
      </div>
    )},
    { title: 'Días', dataIndex: 'dias', width: 80, render: d => <ChipDias dias={d} /> },
    { title: 'Última nota', dataIndex: 'ultimaNota', render: v => v ? <Text italic type="secondary">"{v}"</Text> : <Text type="danger">(sin nota)</Text> },
    { title: 'Sugerencia IA', dataIndex: 'sugerencia', render: v => <Tag color="default" style={{ whiteSpace: 'normal', maxWidth: 280 }}>{v}</Tag> },
  ]

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <Card
        style={{
          background: `linear-gradient(135deg, ${BRAND.azul} 0%, #006a8f 100%)`,
          marginBottom: 20,
          border: 'none'
        }}
        styles={{ body: { padding: 24 } }}
      >
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={2} style={{ color: 'white', margin: 0 }}>🎯 Mi reporte diario</Title>
            <Text style={{ color: 'rgba(255,255,255,0.85)' }}>
              {fechaReporte} — {c.vendedor?.nombre} {c.vendedor?.apellido}
            </Text>
          </Col>
          <Col>
            <Space>
              <Tag color="white" style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none' }}>
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

      {/* Stats */}
      <Row gutter={12} style={{ marginBottom: 20 }}>
        <Col span={6}>
          <Card><Statistic title="Leads parados" value={c.stats?.leadsParados || 0} valueStyle={{ color: BRAND.rojo }} /></Card>
        </Col>
        <Col span={6}>
          <Card><Statistic title="Promesas vencidas" value={c.stats?.promesasVencidas || 0} valueStyle={{ color: '#f59e0b' }} /></Card>
        </Col>
        <Col span={6}>
          <Card><Statistic title="Cotizaciones x cerrar" value={c.stats?.cotizacionesPorCerrar || 0} /></Card>
        </Col>
        <Col span={6}>
          <Card><Statistic title="Notas escritas (7d)" value={c.stats?.notasUltimos7Dias || 0} valueStyle={{ color: '#10b981' }} /></Card>
        </Col>
      </Row>

      {/* Insights */}
      {c.insights?.length > 0 && (
        <Card title={<Space><BulbOutlined /> Lo que la IA detectó hoy</Space>} style={{ marginBottom: 20 }}>
          {c.insights.map((ins, i) => <InsightCard key={i} insight={ins} />)}
        </Card>
      )}

      {/* Cotizaciones urgentes */}
      {c.cotizacionesUrgentes?.length > 0 && (
        <Card
          title={<Space><FileTextOutlined /> Cotizaciones por cerrar <Tag color="red">URGENTE</Tag></Space>}
          style={{ marginBottom: 20 }}
        >
          <Table dataSource={c.cotizacionesUrgentes} columns={colsCotiz} rowKey="leadId" pagination={false} size="middle" />
        </Card>
      )}

      {/* Promesas vencidas */}
      {c.promesasVencidas?.length > 0 && (
        <Card title="⏰ Prometiste llamar y no llamaste" style={{ marginBottom: 20 }}>
          <Table dataSource={c.promesasVencidas} columns={colsPromesas} rowKey="leadId" pagination={false} size="middle" />
        </Card>
      )}

      {/* Otros seguimientos */}
      {c.otrosSeguimientos?.length > 0 && (
        <Card title="📞 Otros seguimientos pendientes" style={{ marginBottom: 20 }}>
          <Table dataSource={c.otrosSeguimientos} columns={colsOtros} rowKey="leadId" pagination={false} size="middle" />
        </Card>
      )}

      {/* Plan recomendado */}
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
        />
      )}
    </div>
  )
}
