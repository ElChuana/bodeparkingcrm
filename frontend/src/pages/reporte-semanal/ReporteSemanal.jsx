import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, Row, Col, Statistic, Table, Tag, Spin, Typography, Button, Empty, Alert, Space, message } from 'antd'
import { ReloadOutlined, ThunderboltOutlined, TrophyOutlined, WarningOutlined, BulbOutlined, FireOutlined } from '@ant-design/icons'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import api from '../../services/api'

const { Title, Text, Paragraph } = Typography
const BRAND = { azul: '#0091c3', gris: '#3d3d3d', rojo: '#ca3a36' }

const NOMBRES_DIA_CORTO = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
function diaCorto(yyyymmdd) {
  const [y, m, d] = yyyymmdd.split('-').map(Number)
  return NOMBRES_DIA_CORTO[new Date(y, m - 1, d).getDay()]
}

function AlertaCard({ alerta }) {
  const colores = {
    critico: { bg: '#fee2e2', border: '#ca3a36', text: '#7f1d1d', icon: <FireOutlined /> },
    warning: { bg: '#fef3c7', border: '#d97706', text: '#92400e', icon: <WarningOutlined /> },
    info: { bg: '#e0f2fe', border: '#0891b2', text: '#075985', icon: <BulbOutlined /> }
  }
  const cc = colores[alerta.tipo] || colores.info
  return (
    <div style={{ background: cc.bg, borderLeft: `4px solid ${cc.border}`, padding: '12px 16px', borderRadius: 8, marginBottom: 10 }}>
      <Space align="start">
        <span style={{ color: cc.border, fontSize: 16 }}>{cc.icon}</span>
        <div>
          <Text strong style={{ color: cc.text }}>{alerta.titulo}</Text>
          <div style={{ fontSize: 13, color: cc.text, marginTop: 2 }}>{alerta.mensaje}</div>
        </div>
      </Space>
    </div>
  )
}

// ─── VISTA GERENTE ────────────────────────────────────────────────
function VistaGerente({ c }) {
  const colsActividad = [
    { title: 'Vendedor', dataIndex: 'nombre', fixed: 'left', width: 180, render: (v, r) => (
      <div>
        <div style={{ fontWeight: 600 }}>{v}</div>
        <div style={{ fontSize: 11, color: '#666' }}>{r.rol}</div>
      </div>
    )},
    ...((c.datos?.dias || []).map((d, i) => ({
      title: <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 11, color: '#888' }}>{diaCorto(d)}</div>
        <div style={{ fontSize: 11 }}>{d.slice(8, 10)}</div>
      </div>,
      dataIndex: ['actividadPorDia', i, 'total'],
      width: 60,
      align: 'center',
      render: v => v ? <Tag color={v >= 8 ? 'green' : v >= 4 ? 'cyan' : 'default'} style={{ margin: 0, fontWeight: 600 }}>{v}</Tag> : <Text type="secondary">—</Text>
    }))),
    { title: 'Total', dataIndex: ['stats', 'gestionesReales'], width: 80, fixed: 'right', align: 'center', render: v => <Tag color="blue" style={{ fontWeight: 700 }}>{v}</Tag> }
  ]

  const colsKPI = [
    { title: 'Vendedor', dataIndex: 'nombre', fixed: 'left', width: 180 },
    { title: 'Llamadas', dataIndex: ['stats', 'llamadas'], align: 'center' },
    { title: 'Emails', dataIndex: ['stats', 'emails'], align: 'center' },
    { title: 'WhatsApp', dataIndex: ['stats', 'whatsapp'], align: 'center' },
    { title: 'Reuniones', dataIndex: ['stats', 'reuniones'], align: 'center' },
    { title: 'Cambios etapa', dataIndex: ['stats', 'cambiosEtapa'], align: 'center' },
    { title: 'Cotiz. enviadas', dataIndex: ['stats', 'cotizacionesEnviadas'], align: 'center', render: v => v ? <Tag color="cyan">{v}</Tag> : '—' },
    { title: 'Perdidos', dataIndex: ['stats', 'leadsPerdidos'], align: 'center', render: v => v ? <Tag color="purple">{v}</Tag> : '—' },
    { title: 'Ventas', dataIndex: ['stats', 'ventas'], align: 'center', render: v => v ? <Tag color="green" style={{ fontWeight: 700 }}>{v}</Tag> : '—' },
    { title: 'UF vendido', dataIndex: ['stats', 'ufVendido'], align: 'right', render: v => v ? <Text strong style={{ color: '#10b981' }}>UF {v.toLocaleString('es-CL')}</Text> : '—' }
  ]

  return (
    <>
      <Row gutter={12} style={{ marginBottom: 20 }}>
        <Col xs={12} md={6}><Card><Statistic title="Gestiones reales" value={c.datos?.totales?.gestionesReales || 0} /></Card></Col>
        <Col xs={12} md={6}><Card><Statistic title="Cotizaciones" value={c.datos?.totales?.cotizacionesEnviadas || 0} valueStyle={{ color: '#0891b2' }} /></Card></Col>
        <Col xs={12} md={6}><Card><Statistic title="Ventas cerradas" value={c.datos?.totales?.ventas || 0} valueStyle={{ color: '#10b981' }} /></Card></Col>
        <Col xs={12} md={6}><Card><Statistic title="UF vendido" value={c.datos?.totales?.ufVendido || 0} precision={2} valueStyle={{ color: '#10b981' }} /></Card></Col>
      </Row>

      <Row gutter={12} style={{ marginBottom: 20 }}>
        {c.vendedorDestacado && (
          <Col xs={24} md={12}>
            <Card style={{ background: '#ecfdf5', borderLeft: '4px solid #10b981' }}>
              <Space>
                <TrophyOutlined style={{ fontSize: 28, color: '#10b981' }} />
                <div>
                  <Text type="secondary" style={{ fontSize: 12 }}>VENDEDOR DESTACADO</Text>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#065f46' }}>{c.vendedorDestacado.nombre}</div>
                  <div style={{ fontSize: 13, color: '#065f46' }}>{c.vendedorDestacado.razon}</div>
                </div>
              </Space>
            </Card>
          </Col>
        )}
        {c.vendedorEnCaida?.nombre && (
          <Col xs={24} md={12}>
            <Card style={{ background: '#fef3c7', borderLeft: '4px solid #d97706' }}>
              <Space>
                <WarningOutlined style={{ fontSize: 28, color: '#d97706' }} />
                <div>
                  <Text type="secondary" style={{ fontSize: 12 }}>NECESITA AYUDA</Text>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#92400e' }}>{c.vendedorEnCaida.nombre}</div>
                  <div style={{ fontSize: 13, color: '#92400e' }}>{c.vendedorEnCaida.razon}</div>
                </div>
              </Space>
            </Card>
          </Col>
        )}
      </Row>

      {c.alertas?.length > 0 && (
        <Card title="⚠️ Alertas de la semana" style={{ marginBottom: 20 }}>
          {c.alertas.map((a, i) => <AlertaCard key={i} alerta={a} />)}
        </Card>
      )}

      <Card title="📅 Actividad diaria por vendedor (lun a dom)" style={{ marginBottom: 20 }}>
        <Table dataSource={c.datos?.porVendedor || []} columns={colsActividad} rowKey="id" pagination={false} scroll={{ x: 800 }} size="middle" />
      </Card>

      <Card title="📈 KPIs por vendedor" style={{ marginBottom: 20 }}>
        <Table dataSource={c.datos?.porVendedor || []} columns={colsKPI} rowKey="id" pagination={false} scroll={{ x: 1100 }} size="middle" />
      </Card>

      {c.datos?.pipeline && (
        <Card title="📂 Pipeline actual" style={{ marginBottom: 20 }}>
          <Row gutter={[12, 12]}>
            {Object.entries(c.datos.pipeline).map(([etapa, count]) => (
              <Col key={etapa} xs={12} sm={8} md={6} lg={4}>
                <Card size="small"><Statistic title={etapa.replace(/_/g, ' ')} value={count} /></Card>
              </Col>
            ))}
          </Row>
        </Card>
      )}

      {c.patrones?.length > 0 && (
        <Card title="🔍 Patrones detectados" style={{ marginBottom: 20 }}>
          {c.patrones.map((p, i) => (
            <div key={i} style={{ padding: 10, background: '#f9fafb', borderRadius: 6, marginBottom: 8 }}>
              <Text strong>{p.vendedor}: </Text><Text>{p.patron}</Text>
            </div>
          ))}
        </Card>
      )}

      {c.planSemana?.length > 0 && (
        <Alert type="info" showIcon message="🎯 Plan recomendado para esta semana"
          description={<ul style={{ marginBottom: 0, paddingLeft: 18 }}>{c.planSemana.map((p, i) => <li key={i} style={{ marginBottom: 4 }}>{p}</li>)}</ul>}
        />
      )}
    </>
  )
}


export default function ReporteSemanal() {
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['reporte-semanal'],
    queryFn: () => api.get('/reportes-semanal/mi-reporte').then(r => r.data)
  })

  const generar = useMutation({
    mutationFn: () => api.post('/reportes-semanal/generar'),
    onSuccess: () => {
      message.success('Reporte generado')
      qc.invalidateQueries({ queryKey: ['reporte-semanal'] })
    },
    onError: e => message.error(e?.response?.data?.error || 'Error al generar')
  })

  if (isLoading) return <div style={{ padding: 40, textAlign: 'center' }}><Spin size="large" /></div>

  const reporte = data?.reporte
  let c = reporte?.contenido
  if (typeof c === 'string') { try { c = JSON.parse(c) } catch { c = {} } }
  if (!c) c = {}

  const titulo = '📊 Reporte semanal del equipo'

  if (!reporte) {
    return (
      <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
        <Title level={3}>{titulo}</Title>
        <Empty description="Aún no se ha generado un reporte semanal. Se genera automáticamente cada lunes a las 7 AM.">
          <Button type="primary" icon={<ThunderboltOutlined />} loading={generar.isPending} onClick={() => generar.mutate()}>
            Generar ahora
          </Button>
        </Empty>
      </div>
    )
  }

  const periodoStr = `${format(new Date(c.periodo.inicio + 'T12:00:00'), "d 'de' MMM", { locale: es })} al ${format(new Date(c.periodo.fin + 'T12:00:00'), "d 'de' MMM yyyy", { locale: es })}`

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
      <Card
        style={{ background: `linear-gradient(135deg, ${BRAND.azul} 0%, #006a8f 100%)`, marginBottom: 20, border: 'none' }}
        styles={{ body: { padding: 24 } }}
      >
        <Row justify="space-between" align="middle" gutter={[12, 12]}>
          <Col>
            <Title level={2} style={{ color: 'white', margin: 0 }}>{titulo}</Title>
            <Text style={{ color: 'rgba(255,255,255,0.85)' }}>{periodoStr}</Text>
          </Col>
          <Col>
            <Space wrap>
              <Tag style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none' }}>⚡ Generado con IA</Tag>
              <Button icon={<ReloadOutlined />} loading={generar.isPending} onClick={() => generar.mutate()}>Regenerar</Button>
            </Space>
          </Col>
        </Row>
        {c.resumenEjecutivo && <Paragraph style={{ color: 'white', marginTop: 12, marginBottom: 0, fontSize: 15 }}>{c.resumenEjecutivo}</Paragraph>}
      </Card>

      <VistaGerente c={c} />
    </div>
  )
}
