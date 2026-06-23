import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, Row, Col, Statistic, Table, Tag, Spin, Typography, Button, Empty, Alert, Space, Select, message } from 'antd'
import { ThunderboltOutlined, ReloadOutlined, WarningOutlined, BulbOutlined, CheckCircleOutlined, FileTextOutlined, ClockCircleOutlined, PhoneOutlined, UnorderedListOutlined, CloseCircleOutlined } from '@ant-design/icons'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'

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
  },
  perdidos: {
    color: '#7c3aed',
    bg: '#faf5ff',
    bgHeader: '#ede9fe',
    icon: <CloseCircleOutlined />
  },
  ayer: {
    color: '#059669',
    bg: '#ecfdf5',
    bgHeader: '#d1fae5',
    icon: <CheckCircleOutlined />
  },
  nuevoSinContactar: {
    color: '#0891b2',
    bg: '#f0fdfa',
    bgHeader: '#ccfbf1',
    icon: <PhoneOutlined />
  },
  sinAsignar: {
    color: '#be185d',
    bg: '#fdf2f8',
    bgHeader: '#fce7f3',
    icon: <WarningOutlined />
  }
}

const NOMBRES_DIA = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
function nombreDiaDeFecha(yyyymmdd) {
  if (!yyyymmdd) return ''
  // Interpretar como local para evitar offsets raros
  const [y, m, d] = yyyymmdd.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return NOMBRES_DIA[date.getDay()]
}

function ChipDias({ dias }) {
  const critico = dias >= 10
  return <Tag color={critico ? 'red' : 'orange'} style={{ margin: 0, fontWeight: 600 }}>{dias}d</Tag>
}

function ContactoLink({ leadId, contacto, telefono, completado }) {
  const styleTach = completado ? { textDecoration: 'line-through', opacity: 0.6 } : {}
  return (
    <Link to={`/leads/${leadId}`} style={{ display: 'block' }}>
      <div style={{ fontWeight: 600, color: BRAND.azul, ...styleTach }}>{contacto}</div>
      {telefono && <div style={{ fontSize: 12, color: '#666', ...styleTach }}>{telefono}</div>}
    </Link>
  )
}

function BadgeCompletado({ tipo }) {
  return (
    <Tag color="green" icon={<CheckCircleOutlined />} style={{ fontWeight: 600 }}>
      ✓ Gestionado{tipo ? ` (${tipo.toLowerCase()})` : ''}
    </Tag>
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
  const { usuario } = useAuth()
  const esGerente = usuario?.rol === 'GERENTE'
  const puedeVerOtros = usuario?.rol === 'GERENTE' || usuario?.rol === 'JEFE_VENTAS'

  const [vendedorSeleccionado, setVendedorSeleccionado] = useState(null)

  const { data: vendedoresData } = useQuery({
    queryKey: ['vendedores-reporte'],
    queryFn: () => api.get('/usuarios').then(r => r.data),
    enabled: puedeVerOtros
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
  // Defensa: contenido puede ser objeto JSON o string serializado
  let c = reporte?.contenido
  if (typeof c === 'string') {
    try { c = JSON.parse(c) } catch { c = {} }
  }
  if (!c) c = {}
  const actualizaciones = data?.actualizaciones || {}
  const estaCompleto = (leadId, key = 'gestionado') => !!(actualizaciones[leadId]?.[key])
  const tipoGestion = (leadId) => actualizaciones[leadId]?.tipoGestion

  // Contador motivacional
  const totalLeads = (c.cotizacionesUrgentes?.length || 0) + (c.promesasVencidas?.length || 0) + (c.otrosSeguimientos?.length || 0)
  const completados = Object.values(actualizaciones).filter(a => a.gestionado).length

  const headerSelector = puedeVerOtros && (
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
    const descripcion = puedeVerOtros && !vendedorSeleccionado
      ? 'No tienes reporte propio todavía. Selecciona un vendedor arriba para ver el suyo.'
      : 'Aún no se ha generado un reporte. Se genera automáticamente cada mañana.'

    return (
      <div style={{ padding: 24, maxWidth: 1280, margin: '0 auto' }}>
        <Card style={{ background: `linear-gradient(135deg, ${BRAND.azul} 0%, #006a8f 100%)`, marginBottom: 20, border: 'none' }} styles={{ body: { padding: 24 } }}>
          <Row justify="space-between" align="middle" gutter={[12, 12]}>
            <Col>
              <Title level={2} style={{ color: 'white', margin: 0 }}>🎯 Mi reporte diario</Title>
              <Text style={{ color: 'rgba(255,255,255,0.85)' }}>Reporte generado con IA</Text>
            </Col>
            <Col>
              <Space wrap>{headerSelector}</Space>
            </Col>
          </Row>
        </Card>
        <Empty description={descripcion}>
          {esGerente && (
            <Button type="primary" icon={<ThunderboltOutlined />} loading={generar.isPending} onClick={() => generar.mutate()}>
              {vendedorSeleccionado ? 'Generar reporte de este vendedor' : 'Generar para todos'}
            </Button>
          )}
        </Empty>
      </div>
    )
  }

  const fechaReporte = format(new Date(reporte.fecha), "EEEE d 'de' MMMM 'de' yyyy", { locale: es })

  // Estilo de fila completada (tachado tenue)
  const rowClass = (record, leadIdKey = 'leadId') =>
    estaCompleto(record[leadIdKey]) ? 'row-completado' : ''

  const colEstado = (leadIdKey = 'leadId') => ({
    title: 'Estado',
    key: 'estado',
    width: 220,
    render: (_, r) => estaCompleto(r[leadIdKey])
      ? <BadgeCompletado tipo={tipoGestion(r[leadIdKey])} />
      : <Tag color="default">Pendiente</Tag>
  })

  const colSugerencia = (urgente = false) => ({
    title: 'Sugerencia IA',
    dataIndex: 'sugerencia',
    render: (v, r) => (
      <Tag color={(r.urgente ?? urgente) ? 'red' : 'blue'} style={{ whiteSpace: 'normal', maxWidth: 320, padding: '4px 8px', ...(estaCompleto(r.leadId) ? { opacity: 0.5 } : {}) }}>
        {v}
      </Tag>
    )
  })

  const colsCotiz = [
    { title: 'Cliente', dataIndex: 'contacto', render: (v, r) => <ContactoLink leadId={r.leadId} contacto={v} telefono={r.telefono} completado={estaCompleto(r.leadId)} /> },
    { title: 'Días', dataIndex: 'dias', width: 80, render: d => <ChipDias dias={d} /> },
    { title: 'Última gestión', dataIndex: 'ultimaNota', render: v => v ? <Text italic type="secondary">"{v}"</Text> : <Text type="danger">(sin nota)</Text> },
    colSugerencia(true),
    colEstado('leadId')
  ]

  const colsPromesas = [
    { title: 'Cliente', dataIndex: 'contacto', render: (v, r) => <ContactoLink leadId={r.leadId} contacto={v} telefono={r.telefono} completado={estaCompleto(r.leadId)} /> },
    { title: 'Días', dataIndex: 'dias', width: 80, render: d => <ChipDias dias={d} /> },
    { title: 'Lo que prometiste', dataIndex: 'prometio', render: v => v && <Text italic type="secondary">"{v}"</Text> },
    colSugerencia(true),
    colEstado('leadId')
  ]

  const colsOtros = [
    { title: 'Cliente', dataIndex: 'contacto', render: (v, r) => <ContactoLink leadId={r.leadId} contacto={v} telefono={r.telefono} completado={estaCompleto(r.leadId)} /> },
    { title: 'Días', dataIndex: 'dias', width: 80, render: d => <ChipDias dias={d} /> },
    { title: 'Última nota', dataIndex: 'ultimaNota', render: v => v ? <Text italic type="secondary">"{v}"</Text> : <Text type="danger">(sin nota)</Text> },
    colSugerencia(false),
    colEstado('leadId')
  ]

  const colsTodos = [
    { title: 'Cliente', dataIndex: 'contacto', render: (v, r) => <ContactoLink leadId={r.id} contacto={v} telefono={r.telefono} completado={estaCompleto(r.id)} /> },
    { title: 'Etapa', dataIndex: 'etapa', width: 180, render: e => <Tag>{e.replace(/_/g, ' ')}</Tag> },
    { title: 'Días sin tocar', dataIndex: 'diasParado', width: 130, render: d => <ChipDias dias={d} /> },
    { title: 'Última gestión real', dataIndex: 'ultimaNotaReal', render: (v, r) => v ? <Text italic type="secondary">[{r.tipoUltimaInteraccion}] "{v.slice(0, 100)}{v.length > 100 ? '…' : ''}"</Text> : <Text type="danger">— sin nota real —</Text> },
    colEstado('id')
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
        {totalLeads > 0 && (
          <div style={{ marginTop: 10 }}>
            <Tag color="green" style={{ fontSize: 13, padding: '4px 10px' }}>
              ✅ {completados} de {totalLeads} gestionados hoy
            </Tag>
          </div>
        )}
      </Card>

      {/* RESUMEN DE AYER (VERDE, ARRIBA) */}
      {c.ayer && (
        <SeccionCard
          tipo="ayer"
          titulo={`Resumen de ayer ${c.ayer.fecha ? `(${nombreDiaDeFecha(c.ayer.fecha)} ${c.ayer.fecha.slice(8, 10)}/${c.ayer.fecha.slice(5, 7)})` : ''}`}
          count={c.ayer.stats?.leadsTrabajados || 0}
        >
          <div style={{ padding: 16 }}>
            {c.resumenAyer && (
              <div style={{ marginBottom: 16, padding: 14, background: 'white', borderRadius: 8, borderLeft: '4px solid #059669' }}>
                <Text strong style={{ fontSize: 15, color: '#059669' }}>{c.resumenAyer.titulo || 'Tu día'}</Text>
                {c.resumenAyer.mensaje && <Paragraph style={{ marginTop: 6, marginBottom: c.resumenAyer.destacados?.length ? 10 : 0 }}>{c.resumenAyer.mensaje}</Paragraph>}
                {c.resumenAyer.destacados?.length > 0 && (
                  <ul style={{ marginBottom: 0, paddingLeft: 18 }}>
                    {c.resumenAyer.destacados.map((d, i) => <li key={i} style={{ fontSize: 13 }}>{d}</li>)}
                  </ul>
                )}
              </div>
            )}

            <Row gutter={8}>
              <Col xs={8} md={4}><Card size="small"><Statistic title="Llamadas" value={c.ayer.stats?.llamadas || 0} /></Card></Col>
              <Col xs={8} md={4}><Card size="small"><Statistic title="Emails" value={c.ayer.stats?.emails || 0} /></Card></Col>
              <Col xs={8} md={4}><Card size="small"><Statistic title="WhatsApp" value={c.ayer.stats?.whatsapp || 0} /></Card></Col>
              <Col xs={8} md={4}><Card size="small"><Statistic title="Reuniones" value={c.ayer.stats?.reuniones || 0} /></Card></Col>
              <Col xs={8} md={4}><Card size="small"><Statistic title="Leads trabajados" value={c.ayer.stats?.leadsTrabajados || 0} valueStyle={{ color: '#059669' }} /></Card></Col>
              <Col xs={8} md={4}><Card size="small"><Statistic title="Cambios etapa" value={c.ayer.stats?.cambiosEtapa || 0} /></Card></Col>
            </Row>

            {c.ayer.leadsTrabajados?.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <Text strong style={{ display: 'block', marginBottom: 8 }}>Leads que trabajaste:</Text>
                <Table
                  dataSource={c.ayer.leadsTrabajados}
                  rowKey="leadId"
                  pagination={{ pageSize: 10, showSizeChanger: false }}
                  size="small"
                  columns={[
                    { title: 'Cliente', dataIndex: 'contacto', render: (v, r) => <Link to={`/leads/${r.leadId}`} style={{ fontWeight: 600, color: BRAND.azul }}>{v}</Link> },
                    { title: 'Etapa actual', dataIndex: 'etapaActual', width: 160, render: e => e ? <Tag>{e.replace(/_/g, ' ')}</Tag> : null },
                    { title: 'Cambio etapa', dataIndex: 'cambioEtapa', width: 200, render: v => v ? <Tag color="cyan">{v}</Tag> : <Text type="secondary">—</Text> },
                    { title: 'Gestiones', dataIndex: 'interacciones', render: arr => (
                      <Space wrap size={4}>
                        {(arr || []).map((it, i) => <Tag key={i} color="green">{it.tipo}</Tag>)}
                      </Space>
                    )}
                  ]}
                />
              </div>
            )}
          </div>
        </SeccionCard>
      )}

      {/* STATS DE HOY */}
      <Row gutter={12} style={{ marginBottom: 20 }}>
        <Col xs={12} md={8} lg={4}>
          <Card><Statistic title="Leads parados" value={c.stats?.leadsParados || 0} valueStyle={{ color: BRAND.rojo }} /></Card>
        </Col>
        <Col xs={12} md={8} lg={4}>
          <Card><Statistic title="Sin contactar" value={c.stats?.leadsNuevoSinContactar || 0} valueStyle={{ color: '#0891b2' }} /></Card>
        </Col>
        {c.stats?.leadsSinAsignar > 0 && (
          <Col xs={12} md={8} lg={4}>
            <Card><Statistic title="Sin asignar" value={c.stats?.leadsSinAsignar || 0} valueStyle={{ color: '#be185d' }} /></Card>
          </Col>
        )}
        <Col xs={12} md={8} lg={4}>
          <Card><Statistic title="Promesas vencidas" value={c.stats?.promesasVencidas || 0} valueStyle={{ color: '#d97706' }} /></Card>
        </Col>
        <Col xs={12} md={8} lg={4}>
          <Card><Statistic title="Perdidos sin nota" value={c.stats?.perdidosSinNota || 0} valueStyle={{ color: '#7c3aed' }} /></Card>
        </Col>
        <Col xs={12} md={8} lg={4}>
          <Card><Statistic title="Notas 7d" value={c.stats?.notasUltimos7Dias || 0} valueStyle={{ color: '#10b981' }} /></Card>
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

      {/* LEADS SIN ASIGNAR (solo JEFE_VENTAS / GERENTE) */}
      {c.leadsSinAsignar?.length > 0 && (
        <SeccionCard tipo="sinAsignar" titulo="Leads sin asignar a vendedor" count={c.leadsSinAsignar.length} badge="ASIGNAR">
          <Alert
            type="warning"
            showIcon
            message="Estos leads están en NUEVO o NO_CONTESTA sin vendedor asignado."
            description={<>Es tu responsabilidad asignarlos. Podés hacerlo desde <Link to="/asignacion">Centro de Asignación</Link>.</>}
            style={{ margin: 16, marginBottom: 0 }}
          />
          <Table
            dataSource={c.leadsSinAsignar}
            columns={[
              { title: 'Cliente', dataIndex: 'contacto', render: (v, r) => <ContactoLink leadId={r.id} contacto={v} telefono={r.telefono} /> },
              { title: 'Etapa', dataIndex: 'etapa', width: 140, render: e => <Tag>{e.replace(/_/g, ' ')}</Tag> },
              { title: 'Campaña', dataIndex: 'campana', width: 180, render: c => c || <Text type="secondary">—</Text> },
              { title: 'Días sin asignar', dataIndex: 'diasDesdeIngreso', width: 140, render: d => <Tag color={d >= 7 ? 'red' : d >= 3 ? 'orange' : 'default'} style={{ fontWeight: 600 }}>{d}d</Tag> }
            ]}
            rowKey="id"
            pagination={{ pageSize: 15, showSizeChanger: false }}
            size="middle"
          />
        </SeccionCard>
      )}

      {/* LEADS NUEVOS SIN CONTACTAR (cyan) — recordatorio personal para todos */}
      {c.leadsNuevoSinContactar?.length > 0 && (
        <SeccionCard tipo="nuevoSinContactar" titulo="Tus leads NUEVO sin tu primer contacto" count={c.leadsNuevoSinContactar.length} badge="CONTACTAR">
          <Alert
            type="info"
            showIcon
            message="Estos leads están asignados a vos y todavía no registraste ninguna llamada, email, WhatsApp o reunión."
            description="El primer contacto rápido aumenta mucho la conversión. Hacé al menos un intento hoy."
            style={{ margin: 16, marginBottom: 0 }}
          />
          <Table
            dataSource={c.leadsNuevoSinContactar}
            columns={[
              { title: 'Cliente', dataIndex: 'contacto', render: (v, r) => <ContactoLink leadId={r.id} contacto={v} telefono={r.telefono} /> },
              { title: 'Campaña', dataIndex: 'campana', width: 180, render: c => c || <Text type="secondary">—</Text> },
              { title: 'Días sin contactar', dataIndex: 'diasDesdeIngreso', width: 150, render: d => <Tag color={d >= 7 ? 'red' : d >= 3 ? 'orange' : 'cyan'} style={{ fontWeight: 600 }}>{d}d</Tag> }
            ]}
            rowKey="id"
            pagination={{ pageSize: 15, showSizeChanger: false }}
            size="middle"
          />
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

      {/* PERDIDOS SIN NOTA (PÚRPURA) — recordatorio para escribir motivo */}
      {c.perdidosSinNota?.length > 0 && (
        <SeccionCard tipo="perdidos" titulo="Perdidos sin motivo escrito" count={c.perdidosSinNota.length} badge="ESCRIBE LA NOTA">
          <Alert
            type="warning"
            showIcon
            message="Estos leads los marcaste como PERDIDO pero no escribiste el motivo."
            description="Es importante anotar por qué (no contestó, ya compró en otra empresa, sin presupuesto, etc.) para que el equipo aprenda y mejoren campañas. Hacé click en cada lead y agregá una nota."
            style={{ margin: 16, marginBottom: 0 }}
          />
          <Table
            dataSource={c.perdidosSinNota}
            columns={[
              { title: 'Cliente', dataIndex: 'contacto', render: (v, r) => <ContactoLink leadId={r.id} contacto={v} telefono={r.telefono} completado={estaCompleto(r.id, 'motivoEscrito')} /> },
              { title: 'Etapa previa', dataIndex: 'etapaAntesDePerdido', width: 180, render: e => e ? <Tag>{e.replace(/_/g, ' ')}</Tag> : <Text type="secondary">—</Text> },
              { title: 'Perdido hace', dataIndex: 'perdidoHace', width: 130, render: d => <Tag color="purple" style={{ fontWeight: 600 }}>{d}d</Tag> },
              {
                title: 'Estado',
                key: 'estado',
                width: 220,
                render: (_, r) => estaCompleto(r.id, 'motivoEscrito')
                  ? <Tag color="green" icon={<CheckCircleOutlined />} style={{ fontWeight: 600 }}>✓ Motivo escrito</Tag>
                  : <Link to={`/leads/${r.id}`}><Tag color="purple">Abrir y escribir motivo</Tag></Link>
              }
            ]}
            rowKey="id"
            pagination={{ pageSize: 15, showSizeChanger: false }}
            size="middle"
          />
        </SeccionCard>
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
