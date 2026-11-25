// Pestaña "Sitio web" del módulo RRSS: GA4 (desde 25-nov-2026), Clarity (foto diaria) e histórico AWStats (sep-2025 →).
// Datos: GET /api/rrss/web. El histórico es aproximado (AWStats cuela bots) y se dibuja con otro color que GA4.
import React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, Row, Col, Table, Tag, Spin, Typography, Button, Empty, Alert, Space, Tooltip, Popover, App } from 'antd'
import { InfoCircleOutlined, SyncOutlined, CheckCircleFilled, ExclamationCircleFilled, CloseCircleFilled, MinusCircleOutlined } from '@ant-design/icons'
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip as RTooltip, Legend, CartesianGrid, ReferenceLine } from 'recharts'
import dayjs from 'dayjs'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'

const { Text, Paragraph } = Typography
const num = (v, d) => { const dec = typeof d === 'number' ? d : 0; return v == null || isNaN(Number(v)) ? '—' : Number(v).toLocaleString('es-CL', { maximumFractionDigits: dec, minimumFractionDigits: dec }) }
const pctF = (v) => (v == null ? '—' : `${num(v, 1)}%`)
const seg = (s) => (s == null ? '—' : s < 60 ? `${Math.round(s)} s` : `${Math.floor(s / 60)} min ${Math.round(s % 60)} s`)

const SEM = {
  verde: { color: '#16a34a', label: 'Bien', Icon: CheckCircleFilled }, amarillo: { color: '#d97706', label: 'Ojo', Icon: ExclamationCircleFilled },
  rojo: { color: '#dc2626', label: 'Mal', Icon: CloseCircleFilled }, null: { color: '#94a3b8', label: 'Sin dato', Icon: MinusCircleOutlined },
}
function Semaforo({ valor }) { const s = SEM[valor] || SEM.null; return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: s.color, fontSize: 12, fontWeight: 600 }}><s.Icon style={{ fontSize: 12 }} /> {s.label}</span> }
function Explica({ umbral, texto }) {
  const contenido = umbral
    ? <div style={{ fontSize: 13, lineHeight: 1.55 }}><div style={{ marginBottom: 8 }}><Text strong>¿Qué es?</Text><br />{umbral.queEs}</div><div style={{ marginBottom: 8 }}><Text strong>¿Por qué importa?</Text><br />{umbral.porQueImporta}</div><div><Text strong>¿Cuánto está bien?</Text><br />{umbral.cuantoEstaBien}</div></div>
    : <div style={{ fontSize: 13, maxWidth: 320 }}>{texto}</div>
  return <Popover placement="bottomLeft" overlayStyle={{ maxWidth: 360 }} content={contenido}><Button type="text" size="small" icon={<InfoCircleOutlined />} aria-label="Explicación" style={{ color: '#64748b' }} /></Popover>
}
function Kpi({ titulo, valor, sub, sem, umbral, texto }) {
  const s = SEM[sem] || SEM.null
  return (
    <Card size="small" style={{ borderLeft: `4px solid ${sem !== undefined ? s.color : '#cbd5e1'}`, height: '100%' }} styles={{ body: { padding: '10px 12px' } }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 4 }}><Text type="secondary" style={{ fontSize: 12 }}>{titulo}</Text><Explica umbral={umbral} texto={texto} /></div>
      <div style={{ fontSize: 22, fontWeight: 700, fontVariantNumeric: 'tabular-nums', lineHeight: 1.2, color: '#0f172a' }}>{valor}</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}><Text type="secondary" style={{ fontSize: 11.5 }}>{sub}</Text>{sem !== undefined && <Semaforo valor={sem} />}</div>
    </Card>
  )
}

export default function SitioWeb({ periodo }) {
  const { usuario } = useAuth()
  const { message } = App.useApp()
  const qc = useQueryClient()
  const { data, isLoading, isError } = useQuery({ queryKey: ['rrss-web', periodo], queryFn: () => api.get('/rrss/web', { params: periodo }).then(r => r.data), staleTime: 5 * 60 * 1000 })
  const sync = useMutation({
    mutationFn: () => api.post('/rrss/sync-web').then(r => r.data),
    onSuccess: (d) => { message.success(`GA4: ${d.ga4?.TOTAL ?? 0} días · Clarity: ${d.clarity?.llamadas ?? 0} llamadas${d.clarity?.omitido ? ` (${d.clarity.omitido})` : ''}`); qc.invalidateQueries({ queryKey: ['rrss-web'] }) },
    onError: (e) => message.error(e.response?.data?.error || 'Falló la sincronización'),
  })

  if (isLoading) return <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>
  if (isError || !data) return <Alert type="error" showIcon title="No se pudo cargar el informe del sitio" />

  const u = (k) => data.umbrales.find(x => x.clave === k)
  const g = data.ga4.totales, cl = data.clarity
  const hist = data.historico.map(h => ({ ...h, mesL: dayjs(h.mes + '-01').format('MMM YY'), awVisitas: h.fuente === 'awstats' ? h.visitas : null, gaVisitas: h.fuente === 'ga4' ? h.visitas : null }))
  const serie = data.ga4.serie.map(s => ({ ...s, fechaL: dayjs(s.fecha).format('D MMM') }))

  return (
    <Row gutter={[12, 12]}>
      {!data.ga4Configurado && <Col span={24}><Alert type="warning" showIcon title="GA4 no está conectado en este servidor (falta GA4_SA_JSON_B64)." /></Col>}
      {data.ga4Configurado && g.sesiones === 0 && (
        <Col span={24}><Alert type="info" showIcon title="GA4 se instaló el 25-nov-2026 y todavía no tiene sesiones procesadas (Google tarda 24–48 h). Mientras tanto, abajo está el histórico aproximado de AWStats." /></Col>
      )}
      <Col xs={12} md={8} xl={4}><Kpi titulo="Sesiones (GA4)" valor={num(g.sesiones)} sub={`${num(g.usuarios)} usuarios · ${num(g.nuevosUsuarios)} nuevos`} texto="Visitas al sitio medidas por Google Analytics 4 en el período. Una sesión = una visita; un usuario puede tener varias." /></Col>
      <Col xs={12} md={8} xl={4}><Kpi titulo="Sesiones con interacción" valor={pctF(g.tasaCompromiso)} sub={`duración media ${seg(g.duracionMediaSeg)}`} texto="Porcentaje de visitas que duraron más de 10 s, vieron 2+ páginas o hicieron algo (engagement rate de GA4). Bajo = la gente entra y se va." /></Col>
      <Col xs={12} md={8} xl={4}><Kpi titulo="Conversión del sitio" valor={pctF(g.webConversion)} sub={`${num(g.leadsWeb)} formularios enviados`} sem={data.semaforos.WEB_CONVERSION} umbral={u('WEB_CONVERSION')} /></Col>
      <Col xs={12} md={8} xl={4}><Kpi titulo="Abandono del formulario" valor={pctF(g.abandonoForm)} sub={`${num(g.eventos.form_start)} lo empezaron`} sem={data.semaforos.WEB_ABANDONO_FORM} umbral={u('WEB_ABANDONO_FORM')} /></Col>
      <Col xs={12} md={8} xl={4}><Kpi titulo="Clics a contacto" valor={num(g.clicsContacto)} sub={`tel ${num(g.eventos.click_telefono)} · WhatsApp ${num(g.eventos.click_whatsapp)} · email ${num(g.eventos.click_email)}`} texto="Clics en el teléfono, WhatsApp o correo del sitio. No pasan por el formulario, así que no aparecen como lead: por eso se cuentan aparte." /></Col>
      <Col xs={12} md={8} xl={4}><Kpi titulo="Sesiones con rage clicks" valor={pctF(cl?.ultimo?.rageClicksPct)} sub={cl ? `Clarity · ${dayjs(cl.ultimo.fecha).format('D MMM')} · ${num(cl.ultimo.sesiones)} sesiones` : 'Clarity sin datos'} sem={data.semaforos.CLARITY_RAGE} umbral={u('CLARITY_RAGE')} /></Col>

      <Col span={24}>
        <Card size="small" title="Visitas al sitio por mes" extra={<Text type="secondary" style={{ fontSize: 12 }}>Gris: histórico aproximado (AWStats, cuela bots) · Azul: GA4 exacto desde nov-2026</Text>}>
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={hist} margin={{ top: 16, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#eef2f7" vertical={false} />
              <XAxis dataKey="mesL" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="v" tick={{ fontSize: 11 }} width={44} />
              <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 11 }} width={40} />
              <RTooltip formatter={(v, name) => [num(v), name]} />
              <Legend />
              <Bar yAxisId="v" dataKey="awVisitas" name="Visitas (AWStats, aprox.)" fill="#cbd5e1" radius={[3, 3, 0, 0]} />
              <Bar yAxisId="v" dataKey="gaVisitas" name="Sesiones (GA4)" fill="#0092C0" radius={[3, 3, 0, 0]} />
              <Line yAxisId="r" dataKey="refsGoogle" name="Referidos Google" stroke="#dc2626" strokeWidth={2} dot={false} connectNulls />
              <Line yAxisId="r" dataKey="refsFbIg" name="Referidos Facebook/Instagram" stroke="#7c3aed" strokeWidth={2} dot={false} connectNulls />
              {data.hitos.map(h => { const p = hist.find(x => x.mes === h.mes); return p ? <ReferenceLine key={h.mes} yAxisId="v" x={p.mesL} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: h.texto, position: h.mes === '2026-11' ? 'insideTopRight' : 'insideTopLeft', fontSize: 10, fill: '#b45309' }} /> : null })}
            </ComposedChart>
          </ResponsiveContainer>
          <Paragraph type="secondary" style={{ fontSize: 12, marginTop: 6, marginBottom: 0 }}>
            Referidos = páginas vistas que llegaron desde ese sitio. En jul-2026 Google dejó de mandar tráfico (1.688 → 106 al mes): eso explica la caída de visitas desde entonces. Desde el 25-nov-2026 la fuente es GA4 (exacta) y no se mezcla en la misma barra.
          </Paragraph>
        </Card>
      </Col>

      <Col xs={24} lg={14}>
        <Card size="small" title="Sesiones y formularios por día (GA4)">
          {serie.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={serie} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#eef2f7" vertical={false} />
                <XAxis dataKey="fechaL" tick={{ fontSize: 11 }} minTickGap={24} />
                <YAxis yAxisId="s" tick={{ fontSize: 11 }} width={40} />
                <YAxis yAxisId="l" orientation="right" tick={{ fontSize: 11 }} allowDecimals={false} width={32} />
                <RTooltip /><Legend />
                <Bar yAxisId="s" dataKey="sesiones" name="Sesiones" fill="#93c5fd" radius={[3, 3, 0, 0]} />
                <Line yAxisId="l" dataKey="leadsWeb" name="Formularios" stroke="#16a34a" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          ) : <Empty description="GA4 aún no tiene días con datos" />}
        </Card>
      </Col>
      <Col xs={24} lg={10}>
        <Card size="small" title="Clarity: cómo se comporta la gente" extra={cl && <Text type="secondary" style={{ fontSize: 12 }}>foto del {dayjs(cl.ultimo.fecha).format('D MMM')}</Text>}>
          {!cl ? <Empty description="Clarity aún no guardó ninguna foto diaria" /> : (
            <Row gutter={[8, 8]}>
              {[
                ['Sesiones reales', num(cl.ultimo.sesiones), `${num(cl.ultimo.bots)} de bots descartadas`],
                ['Tiempo activo', seg(cl.ultimo.tiempoActivoSeg), `de ${seg(cl.ultimo.tiempoTotalSeg)} en la página`],
                ['Scroll medio', pctF(cl.ultimo.scrollMedio), 'hasta dónde bajan'],
                ['Dead clicks', pctF(cl.ultimo.deadClicksPct), 'clic en algo que no responde'],
                ['Quickback', pctF(cl.ultimo.quickbackPct), 'entran y vuelven atrás al tiro'],
                ['Errores JS', pctF(cl.ultimo.erroresJsPct), 'sesiones con error de script'],
              ].map(([t, v, s]) => (
                <Col span={12} key={t}><div style={{ background: '#f8fafc', borderRadius: 8, padding: '8px 10px' }}><Text type="secondary" style={{ fontSize: 11.5 }}>{t}</Text><div style={{ fontSize: 17, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{v}</div><Text type="secondary" style={{ fontSize: 11 }}>{s}</Text></div></Col>
              ))}
              <Col span={24}><Text type="secondary" style={{ fontSize: 11.5 }}>Dispositivos: {cl.dispositivos.filter(d => d.valor).map(d => `${d.clave} ${num(d.valor)}`).join(' · ') || '—'}</Text></Col>
            </Row>
          )}
        </Card>
      </Col>

      <Col xs={24} lg={8}>
        <Card size="small" title="De dónde llegan (fuente / medio)">
          <Table size="small" rowKey="clave" pagination={false} dataSource={data.ga4.fuentes} columns={[{ title: 'Fuente', dataIndex: 'clave' }, { title: 'Sesiones', dataIndex: 'sesiones', align: 'right', render: num }, { title: 'Usuarios', dataIndex: 'usuarios', align: 'right', render: num }]} locale={{ emptyText: <Empty description="Sin datos aún" /> }} />
        </Card>
      </Col>
      <Col xs={24} lg={8}>
        <Card size="small" title="Páginas más vistas">
          <Table size="small" rowKey="clave" pagination={false} dataSource={data.ga4.paginas} columns={[{ title: 'Página', dataIndex: 'clave', ellipsis: true }, { title: 'Vistas', dataIndex: 'vistas', align: 'right', render: num }, { title: 'Sesiones', dataIndex: 'sesiones', align: 'right', render: num }]} locale={{ emptyText: <Empty description="Sin datos aún" /> }} />
        </Card>
      </Col>
      <Col xs={24} lg={8}>
        <Card size="small" title="Dispositivos y regiones">
          <Table size="small" rowKey="clave" pagination={false} dataSource={data.ga4.dispositivos} columns={[{ title: 'Dispositivo', dataIndex: 'clave' }, { title: 'Sesiones', dataIndex: 'sesiones', align: 'right', render: num }]} locale={{ emptyText: <Empty description="Sin datos aún" /> }} style={{ marginBottom: 8 }} />
          <Table size="small" rowKey="clave" pagination={false} dataSource={data.ga4.regiones.slice(0, 8)} columns={[{ title: 'Región', dataIndex: 'region' }, { title: 'Sesiones', dataIndex: 'sesiones', align: 'right', render: num }]} locale={{ emptyText: <Empty description="Sin datos aún" /> }} />
        </Card>
      </Col>
      {usuario?.rol === 'GERENTE' && (
        <Col span={24}><Button icon={<SyncOutlined spin={sync.isPending} />} loading={sync.isPending} onClick={() => sync.mutate()}>Actualizar GA4 y Clarity ahora</Button> <Text type="secondary" style={{ fontSize: 12 }}>Clarity permite 10 consultas al día; el job nocturno usa 4.</Text></Col>
      )}
    </Row>
  )
}
