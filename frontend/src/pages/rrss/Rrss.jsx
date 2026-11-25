// Módulo RRSS — informe didáctico de marketing: pauta Meta → embudo del CRM → venta.
// Datos: GET /api/rrss/informe (ver backend/src/controllers/rrssController.js). Cada KPI trae su semáforo y un
// texto "qué es / por qué importa / cuánto está bien" que viene de la tabla rrss_umbrales (editable en Configuración).
import React, { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Card, Row, Col, Table, Tag, Spin, Typography, Button, Empty, Alert, Space, Tabs, DatePicker, Tooltip, Popover,
  Select, InputNumber, App, Segmented, Statistic, Progress, Switch
} from 'antd'
import {
  InfoCircleOutlined, SyncOutlined, CheckCircleFilled, ExclamationCircleFilled, CloseCircleFilled, MinusCircleOutlined,
  LinkOutlined, DisconnectOutlined, FunnelPlotOutlined, BarChartOutlined, AlertOutlined, SettingOutlined, ArrowRightOutlined
} from '@ant-design/icons'
import {
  ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip as RTooltip, Legend, CartesianGrid, BarChart, Cell
} from 'recharts'
import dayjs from 'dayjs'
import 'dayjs/locale/es'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'

dayjs.locale('es')

const { Text, Title, Paragraph } = Typography

// ── Formato ───────────────────────────────────────────────────────
const clp = (v) => (v == null ? '—' : '$' + Math.round(v).toLocaleString('es-CL'))
// `num` también se usa como render de Table (recibe (valor, fila, índice)) → solo acepta d numérico
const num = (v, d) => {
  const dec = typeof d === 'number' && d >= 0 && d <= 6 ? d : 0
  return v == null || v === '' || isNaN(Number(v)) ? '—' : Number(v).toLocaleString('es-CL', { maximumFractionDigits: dec, minimumFractionDigits: dec })
}
const pctF = (v) => (v == null ? '—' : `${num(v, 1)}%`)
const horas = (h) => {
  if (h == null) return '—'
  if (h < 1) return `${Math.round(h * 60)} min`
  if (h < 48) return `${num(h, 1)} h`
  return `${num(h / 24, 1)} días`
}

const SEM = {
  verde:    { color: '#16a34a', bg: '#f0fdf4', label: 'Bien',  Icon: CheckCircleFilled },
  amarillo: { color: '#d97706', bg: '#fffbeb', label: 'Ojo',   Icon: ExclamationCircleFilled },
  rojo:     { color: '#dc2626', bg: '#fef2f2', label: 'Mal',   Icon: CloseCircleFilled },
  null:     { color: '#94a3b8', bg: '#f8fafc', label: 'Sin dato', Icon: MinusCircleOutlined },
}

// Punto + texto: nunca solo color
function Semaforo({ valor, size = 'small' }) {
  const s = SEM[valor] || SEM.null
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: s.color, fontSize: size === 'small' ? 12 : 13, fontWeight: 600 }}>
      <s.Icon style={{ fontSize: size === 'small' ? 12 : 14 }} /> {s.label}
    </span>
  )
}

// Popover didáctico del KPI
function Explica({ umbral, mediana }) {
  if (!umbral) return null
  const unidad = umbral.unidad === 'x mediana'
    ? `Se compara con la mediana de la cuenta en los últimos 90 días${mediana != null ? ` (${clp(mediana)})` : ''}.`
    : null
  return (
    <Popover
      placement="bottomLeft"
      overlayStyle={{ maxWidth: 360 }}
      content={
        <div style={{ fontSize: 13, lineHeight: 1.55 }}>
          <div style={{ marginBottom: 8 }}><Text strong>¿Qué es?</Text><br />{umbral.queEs}</div>
          <div style={{ marginBottom: 8 }}><Text strong>¿Por qué importa?</Text><br />{umbral.porQueImporta}</div>
          <div><Text strong>¿Cuánto está bien?</Text><br />{umbral.cuantoEstaBien}{unidad && <><br /><Text type="secondary">{unidad}</Text></>}</div>
        </div>
      }
    >
      <Button type="text" size="small" icon={<InfoCircleOutlined />} aria-label={`Explicación de ${umbral.nombre}`} style={{ color: '#64748b' }} />
    </Popover>
  )
}

function KpiCard({ titulo, valor, sub, clave, data, formato = (v) => v }) {
  const umbral = data.umbrales.find(u => u.clave === clave)
  const sem = clave ? data.totales.semaforos?.[clave] : null
  const s = SEM[sem] || SEM.null
  return (
    <Card size="small" style={{ borderLeft: `4px solid ${clave ? s.color : '#cbd5e1'}`, height: '100%' }} styles={{ body: { padding: '10px 12px' } }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 4 }}>
        <Text type="secondary" style={{ fontSize: 12 }}>{titulo}</Text>
        <Explica umbral={umbral} mediana={data.medianas90d?.[clave]} />
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, fontVariantNumeric: 'tabular-nums', lineHeight: 1.2, color: '#0f172a' }}>{formato(valor)}</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
        <Text type="secondary" style={{ fontSize: 11.5 }}>{sub}</Text>
        {clave && <Semaforo valor={sem} />}
      </div>
    </Card>
  )
}

// ── Embudo horizontal ─────────────────────────────────────────────
function Embudo({ t }) {
  const pasos = [
    { k: 'impresiones', label: 'Impresiones', v: t.impresiones, fmt: num, nota: 'Veces que se mostró el anuncio' },
    { k: 'clicsEnlace', label: 'Clics en el enlace', v: t.clicsEnlace, fmt: num, nota: 'Personas que entraron al formulario' },
    { k: 'leadsMeta', label: 'Leads en Meta', v: t.leadsMeta, fmt: num, nota: 'Dejaron sus datos (según Meta)' },
    { k: 'leadsCRM', label: 'Leads en el CRM', v: t.leadsCRM, fmt: num, nota: 'Llegaron al CRM en campañas vinculadas' },
    { k: 'contactados', label: 'Contactados', v: t.contactados, fmt: num, nota: 'Con al menos una gestión del vendedor' },
    { k: 'cotizados', label: 'Cotizados', v: t.cotizados, fmt: num, nota: 'Recibieron una cotización' },
    { k: 'visitasRealizadas', label: 'Visita presencial', v: t.visitasRealizadas, fmt: num, nota: 'Fueron a ver la unidad' },
    { k: 'ventas', label: 'Ventas', v: t.ventas, fmt: num, nota: `${num(t.ufVendidas, 1)} UF` },
  ]
  // escala log para que los pasos chicos se vean; el número real va al lado
  const max = Math.max(...pasos.map(p => p.v || 0), 1)
  const ancho = (v) => (v > 0 ? Math.max(6, (Math.log10(v + 1) / Math.log10(max + 1)) * 100) : 0)
  return (
    <div>
      {pasos.map((p, i) => {
        const prev = i > 0 ? pasos[i - 1].v : null
        const conv = prev ? (p.v / prev) * 100 : null
        return (
          <div key={p.k} style={{ display: 'grid', gridTemplateColumns: '160px 1fr 140px', alignItems: 'center', gap: 10, padding: '5px 0', borderBottom: i < pasos.length - 1 ? '1px dashed #eef2f7' : 'none' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{p.label}</div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>{p.nota}</div>
            </div>
            <div style={{ position: 'relative', height: 22, background: '#f1f5f9', borderRadius: 6, overflow: 'hidden' }}>
              <div style={{ width: `${ancho(p.v)}%`, height: '100%', background: i < 3 ? '#60a5fa' : i < 6 ? '#0092C0' : '#16a34a', borderRadius: 6, transition: 'width .3s' }} />
              <span style={{ position: 'absolute', left: 8, top: 2, fontSize: 12, fontWeight: 700, color: ancho(p.v) > 25 ? '#fff' : '#0f172a', fontVariantNumeric: 'tabular-nums' }}>{p.fmt(p.v)}</span>
            </div>
            <div style={{ fontSize: 12, color: '#475569', fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>
              {conv != null && <span><ArrowRightOutlined style={{ fontSize: 10, marginRight: 4 }} />{pctF(conv)} del paso anterior</span>}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Tabla por campaña ─────────────────────────────────────────────
function CeldaSem({ valor, sem, fmt = (v) => v }) {
  const s = SEM[sem] || null
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontVariantNumeric: 'tabular-nums' }}>
      {s && sem && <s.Icon style={{ color: s.color, fontSize: 11 }} aria-label={s.label} />}
      {fmt(valor)}
    </span>
  )
}

function TablaCampanas({ data }) {
  const columns = [
    {
      title: 'Campaña', dataIndex: 'nombreMeta', key: 'c', fixed: 'left', width: 230,
      render: (v, r) => (
        <div>
          <div style={{ fontWeight: 600, fontSize: 13 }}>{v}</div>
          <Space size={4} style={{ marginTop: 2 }}>
            <Tag color={r.estadoMeta === 'ACTIVE' ? 'green' : 'default'} style={{ fontSize: 10, margin: 0 }}>{r.estadoMeta === 'ACTIVE' ? 'Activa' : 'Pausada'}</Tag>
            {r.campanaId
              ? <Tooltip title={`Vinculada a "${r.nombreCRM}" en el CRM`}><Tag icon={<LinkOutlined />} color="blue" style={{ fontSize: 10, margin: 0 }}>CRM</Tag></Tooltip>
              : <Tooltip title="Sin campaña del CRM vinculada: solo datos de Meta (vincular en Configuración)"><Tag icon={<DisconnectOutlined />} style={{ fontSize: 10, margin: 0 }}>sin CRM</Tag></Tooltip>}
          </Space>
        </div>
      )
    },
    { title: 'Gasto', dataIndex: 'gasto', key: 'g', align: 'right', width: 100, sorter: (a, b) => a.gasto - b.gasto, defaultSortOrder: 'descend', render: clp },
    { title: 'Leads Meta', dataIndex: 'leadsMeta', key: 'lm', align: 'right', width: 90, sorter: (a, b) => a.leadsMeta - b.leadsMeta, render: num },
    { title: 'CPL', dataIndex: 'cpl', key: 'cpl', align: 'right', width: 95, sorter: (a, b) => (a.cpl ?? 1e12) - (b.cpl ?? 1e12), render: (v, r) => <CeldaSem valor={v} sem={r.semaforos.CPL} fmt={clp} /> },
    { title: 'Leads CRM', dataIndex: 'leadsCRM', key: 'lc', align: 'right', width: 90, render: (v, r) => r.campanaId ? num(v) : '—' },
    {
      title: 'Cotizaron', key: 'cot', align: 'right', width: 110,
      sorter: (a, b) => (a.tasaLeadCotizacion ?? -1) - (b.tasaLeadCotizacion ?? -1),
      render: (_, r) => r.campanaId ? <CeldaSem valor={`${num(r.cotizados)} · ${pctF(r.tasaLeadCotizacion)}`} sem={r.semaforos.TASA_LEAD_COTIZACION} /> : '—'
    },
    {
      title: <span>Costo / cotización <Text type="warning">★</Text></span>, dataIndex: 'costoCotizacion', key: 'cc', align: 'right', width: 130,
      sorter: (a, b) => (a.costoCotizacion ?? 1e12) - (b.costoCotizacion ?? 1e12),
      render: (v, r) => <CeldaSem valor={v} sem={r.semaforos.COSTO_COTIZACION} fmt={clp} />
    },
    { title: 'Visitas', dataIndex: 'visitasRealizadas', key: 'vis', align: 'right', width: 80, render: (v, r) => r.campanaId ? num(v) : '—' },
    { title: 'Ventas', key: 'ven', align: 'right', width: 110, render: (_, r) => r.campanaId ? <span>{num(r.ventas)}{r.ventas ? <Text type="secondary" style={{ fontSize: 11 }}> · {num(r.ufVendidas, 1)} UF</Text> : null}</span> : '—' },
    { title: 'CAC', dataIndex: 'cac', key: 'cac', align: 'right', width: 110, render: (v, r) => <CeldaSem valor={v} sem={r.semaforos.CAC} fmt={clp} /> },
    { title: '1er contacto', dataIndex: 'horasPrimerContactoMediana', key: 'h1', align: 'right', width: 105, render: (v, r) => <CeldaSem valor={v} sem={r.semaforos.TIEMPO_PRIMER_CONTACTO} fmt={horas} /> },
    { title: 'Sin gestión 48 h', dataIndex: 'pctSinGestion48h', key: 'sg', align: 'right', width: 120, render: (v, r) => <CeldaSem valor={v} sem={r.semaforos.LEADS_SIN_GESTION_48H} fmt={pctF} /> },
    { title: 'Perdidos entrega', dataIndex: 'leadsPerdidosEntrega', key: 'pe', align: 'right', width: 120, render: (v, r) => <CeldaSem valor={v} sem={r.semaforos.LEADS_PERDIDOS_ENTREGA} fmt={num} /> },
  ]
  return (
    <Table
      size="small" rowKey="campanaMetaId" dataSource={data.campanas} columns={columns} pagination={false} scroll={{ x: 1500 }}
      expandable={{ expandedRowRender: (r) => <DetalleCampana r={r} data={data} /> }}
      locale={{ emptyText: <Empty description="Sin campañas con datos en este período" /> }}
    />
  )
}

function DetalleCampana({ r, data }) {
  const items = [
    ['CPM', r.cpm, clp], ['CTR_ENLACE', r.ctrEnlace, pctF], ['CONV_FORMULARIO', r.convFormulario, pctF],
    ['FRECUENCIA_7D', r.frecuencia7d, (v) => num(v, 2)], ['FRECUENCIA_30D', r.frecuencia30d, (v) => num(v, 2)],
    ['PCT_AUDIENCE_NETWORK', r.pctAudienceNetwork, pctF], ['PCT_LEADS_65', r.pctLeads65, pctF],
    ['TASA_COTIZACION_VISITA', r.tasaCotizacionVisita, pctF], ['COSTO_VISITA', r.costoVisita, clp], ['ROAS', r.roas, (v) => v == null ? '—' : `${num(v, 1)}×`],
  ]
  return (
    <Row gutter={[10, 10]}>
      {items.map(([clave, v, fmt]) => {
        const u = data.umbrales.find(x => x.clave === clave)
        return (
          <Col key={clave} xs={12} sm={8} md={6} lg={4}>
            <div style={{ background: '#fff', border: '1px solid #eef2f7', borderRadius: 8, padding: '8px 10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text type="secondary" style={{ fontSize: 11.5 }}>{u?.nombre || clave}</Text>
                <Explica umbral={u} mediana={data.medianas90d?.[clave]} />
              </div>
              <div style={{ fontSize: 17, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{fmt(v)}</div>
              <Semaforo valor={r.semaforos[clave]} />
            </div>
          </Col>
        )
      })}
    </Row>
  )
}

// ── Pestaña Pauta Meta ────────────────────────────────────────────
const UBIC_LABEL = {
  facebook: 'Facebook', instagram: 'Instagram', audience_network: 'Audience Network', messenger: 'Messenger',
  feed: 'Feed', instagram_reels: 'Reels', instagram_stories: 'Stories', facebook_reels: 'Reels', facebook_stories: 'Stories',
  instagram_explore: 'Explorar', instagram_profile_feed: 'Perfil', right_hand_column: 'Columna derecha', marketplace: 'Marketplace',
  video_feeds: 'Video', search: 'Búsqueda', classic: 'Clásico', rewarded_video: 'Video con premio', an_classic: 'Clásico',
  facebook_reels_overlay: 'Reels (superpuesto)', instream_video: 'Video in-stream', instagram_lead_gen_multi_submit: 'Formulario en Instagram',
  instagram_search: 'Búsqueda', facebook_profile_feed: 'Perfil', biz_disco_feed: 'Descubrir negocios', instagram_explore_grid_home: 'Explorar',
}
const ubic = (clave) => clave.split('|').map(p => UBIC_LABEL[p] || p.replace(/_/g, ' ')).join(' · ')

function PautaMeta({ data }) {
  const serie = data.serie.map(s => ({ ...s, fechaL: dayjs(s.fecha).format('D MMM') }))
  const ubicacion = data.desgloses.UBICACION.slice(0, 10).map(d => ({ ...d, label: ubic(d.clave), esAN: d.clave.startsWith('audience_network') }))
  // edad × género → filas por edad con columnas por género
  const edades = {}
  for (const d of data.desgloses.EDAD_GENERO) {
    const [edad, gen] = d.clave.split('|')
    const o = edades[edad] ||= { edad, hombres: 0, mujeres: 0, otros: 0, leads: 0 }
    const k = gen === 'male' ? 'hombres' : gen === 'female' ? 'mujeres' : 'otros'
    o[k] += d.impresiones; o.leads += d.leads
  }
  const edadData = Object.values(edades).sort((a, b) => a.edad.localeCompare(b.edad))
  const totalGasto = data.desgloses.REGION.reduce((a, r) => a + r.gasto, 0)
  const regiones = data.desgloses.REGION.slice(0, 12)

  return (
    <Row gutter={[12, 12]}>
      <Col span={24}>
        <Card size="small" title="Gasto y leads por día" extra={<Text type="secondary" style={{ fontSize: 12 }}>Barras: gasto en pesos · Línea: leads del formulario</Text>}>
          {serie.length ? (
            <ResponsiveContainer width="100%" height={240}>
              <ComposedChart data={serie} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#eef2f7" vertical={false} />
                <XAxis dataKey="fechaL" tick={{ fontSize: 11 }} interval="preserveStartEnd" minTickGap={24} />
                <YAxis yAxisId="g" tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} width={56} />
                <YAxis yAxisId="l" orientation="right" tick={{ fontSize: 11 }} allowDecimals={false} width={32} />
                <RTooltip formatter={(v, name) => [name === 'Gasto' ? clp(v) : num(v), name]} labelStyle={{ fontWeight: 600 }} />
                <Legend />
                <Bar yAxisId="g" dataKey="gasto" name="Gasto" fill="#93c5fd" radius={[3, 3, 0, 0]} />
                <Line yAxisId="l" dataKey="leads" name="Leads" stroke="#0092C0" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          ) : <Empty description="Sin datos diarios en el período" />}
        </Card>
      </Col>
      <Col xs={24} lg={12}>
        <Card size="small" title="Dónde se mostró (gasto por ubicación)" extra={<Explica umbral={data.umbrales.find(u => u.clave === 'PCT_AUDIENCE_NETWORK')} />}>
          {ubicacion.length ? (
            <ResponsiveContainer width="100%" height={Math.max(160, ubicacion.length * 28)}>
              <BarChart data={ubicacion} layout="vertical" margin={{ top: 0, right: 40, left: 0, bottom: 0 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="label" width={170} tick={{ fontSize: 11.5 }} />
                <RTooltip formatter={(v, n, p) => [`${clp(v)} · ${num(p.payload.leads)} leads · CPL ${clp(p.payload.cpl)}`, 'Gasto']} />
                <Bar dataKey="gasto" radius={[0, 4, 4, 0]} label={{ position: 'right', fontSize: 11, formatter: (v) => clp(v) }}>
                  {ubicacion.map((d, i) => <Cell key={i} fill={d.esAN ? '#f59e0b' : '#0092C0'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <Empty description="Sin desglose por ubicación" />}
          <Text type="secondary" style={{ fontSize: 11.5 }}>Naranjo = Audience Network (apps y sitios externos; suele traer leads de baja calidad).</Text>
        </Card>
      </Col>
      <Col xs={24} lg={12}>
        <Card size="small" title="A quién se mostró (impresiones por edad y género)" extra={<Explica umbral={data.umbrales.find(u => u.clave === 'PCT_LEADS_65')} />}>
          {edadData.length ? (
            <ResponsiveContainer width="100%" height={Math.max(160, edadData.length * 30)}>
              <BarChart data={edadData} layout="vertical" margin={{ top: 0, right: 40, left: 0, bottom: 0 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="edad" width={56} tick={{ fontSize: 12 }} />
                <RTooltip formatter={(v, n) => [num(v), n]} labelFormatter={(l, p) => `${l} años · ${num(p?.[0]?.payload?.leads)} leads`} />
                <Legend />
                <Bar dataKey="mujeres" name="Mujeres" stackId="a" fill="#c084fc" />
                <Bar dataKey="hombres" name="Hombres" stackId="a" fill="#60a5fa" />
                <Bar dataKey="otros" name="Otros/desconocido" stackId="a" fill="#cbd5e1" />
              </BarChart>
            </ResponsiveContainer>
          ) : <Empty description="Sin desglose por edad" />}
        </Card>
      </Col>
      <Col span={24}>
        <Card size="small" title="Dónde está la gente (gasto y leads por región)" extra={<Text type="secondary" style={{ fontSize: 12 }}>Nombres tal como los entrega Meta · el mapa viene en la fase 3</Text>}>
          <Table
            size="small" rowKey="clave" pagination={false} dataSource={regiones}
            columns={[
              { title: 'Región', dataIndex: 'clave', key: 'r', render: (v) => v === 'Unknown' ? 'Desconocida' : v },
              { title: 'Gasto', dataIndex: 'gasto', align: 'right', render: clp },
              { title: '% del gasto', key: 'p', align: 'right', render: (_, r) => pctF(totalGasto ? (r.gasto / totalGasto) * 100 : null) },
              { title: 'Impresiones', dataIndex: 'impresiones', align: 'right', render: num },
              { title: 'Leads', dataIndex: 'leads', align: 'right', render: num },
              { title: 'CPL', dataIndex: 'cpl', align: 'right', render: clp },
            ]}
          />
        </Card>
      </Col>
    </Row>
  )
}

// ── Pestaña Salud de leads ────────────────────────────────────────
function SaludLeads({ data, periodo }) {
  const { data: perdidos = [], isLoading } = useQuery({
    queryKey: ['rrss-perdidos', periodo],
    queryFn: () => api.get('/rrss/leads-perdidos', { params: periodo }).then(r => r.data),
  })
  const t = data.totales
  const u = (k) => data.umbrales.find(x => x.clave === k)
  return (
    <Row gutter={[12, 12]}>
      <Col xs={24} md={8}><KpiCard titulo="Tiempo al primer contacto (mediana)" valor={t.horasPrimerContactoMediana} formato={horas} clave="TIEMPO_PRIMER_CONTACTO" data={data} sub="Desde que entra el lead hasta la 1ª gestión" /></Col>
      <Col xs={24} md={8}><KpiCard titulo="Leads sin gestión a 48 h" valor={t.pctSinGestion48h} formato={pctF} clave="LEADS_SIN_GESTION_48H" data={data} sub={`${num(t.sinGestion48h)} de ${num(t.con48h)} leads con más de 48 h`} /></Col>
      <Col xs={24} md={8}><KpiCard titulo="Leads perdidos en la entrega" valor={t.leadsPerdidosEntrega} formato={num} clave="LEADS_PERDIDOS_ENTREGA" data={data} sub={`${pctF(t.pctLeadsPerdidos)} de los leads de Meta no llegaron al CRM`} /></Col>
      <Col span={24}>
        <Card size="small" title={<Space><AlertOutlined /> Leads que Meta registró pero no están en el CRM</Space>} extra={<Explica umbral={u('LEADS_PERDIDOS_ENTREGA')} />}>
          <Paragraph type="secondary" style={{ fontSize: 12.5, marginBottom: 10 }}>
            Son personas que llenaron el formulario y pagamos por ellas, pero el conector de la agencia no las entregó al CRM (o llegaron con otro teléfono y correo). Conviene llamarlas y reclamar a la agencia si se repite.
          </Paragraph>
          <Table
            size="small" rowKey="metaLeadId" loading={isLoading} dataSource={perdidos} pagination={{ pageSize: 10, hideOnSinglePage: true }}
            columns={[
              { title: 'Fecha', dataIndex: 'creadoMeta', render: (v) => dayjs(v).format('D MMM YYYY HH:mm') },
              { title: 'Nombre', dataIndex: 'nombre' },
              { title: 'Teléfono', dataIndex: 'telefono' },
              { title: 'Email', dataIndex: 'email' },
              { title: 'Campaña', dataIndex: 'campana' },
              { title: 'Plataforma', dataIndex: 'plataforma', render: (v) => v === 'ig' ? 'Instagram' : v === 'fb' ? 'Facebook' : v || '—' },
            ]}
            locale={{ emptyText: <Empty description="Todos los leads de Meta del período están en el CRM" /> }}
          />
        </Card>
      </Col>
    </Row>
  )
}

// ── Pestaña Configuración (GERENTE) ───────────────────────────────
function Configuracion({ data }) {
  const qc = useQueryClient()
  const { message } = App.useApp()
  const { data: mapa = [] } = useQuery({ queryKey: ['rrss-mapa'], queryFn: () => api.get('/rrss/mapa').then(r => r.data) })
  const { data: campanasCRM = [] } = useQuery({ queryKey: ['campanas'], queryFn: () => api.get('/campanas').then(r => r.data) })
  const { data: log = [] } = useQuery({ queryKey: ['rrss-log'], queryFn: () => api.get('/rrss/sync-log').then(r => r.data) })

  const invalidar = () => { qc.invalidateQueries({ queryKey: ['rrss-informe'] }); qc.invalidateQueries({ queryKey: ['rrss-mapa'] }); qc.invalidateQueries({ queryKey: ['rrss-log'] }) }
  const vincular = useMutation({
    mutationFn: ({ id, campanaId }) => api.put(`/rrss/mapa/${id}`, { campanaId }),
    onSuccess: () => { message.success('Vínculo guardado'); invalidar() },
    onError: () => message.error('No se pudo guardar el vínculo'),
  })
  const umbral = useMutation({
    mutationFn: ({ id, ...body }) => api.put(`/rrss/umbrales/${id}`, body),
    onSuccess: () => { message.success('Umbral guardado'); invalidar() },
    onError: () => message.error('No se pudo guardar el umbral'),
  })
  const sync = useMutation({
    mutationFn: () => api.post('/rrss/sync', { dias: 28 }).then(r => r.data),
    onSuccess: (d) => { message.success(`Sincronizado: ${d.insights?.CAMPANA || 0} días-campaña, ${d.leads?.leadsNuevos || 0} leads nuevos`); invalidar() },
    onError: (e) => message.error(e.response?.data?.error || 'Falló la sincronización'),
  })

  const opcionesCRM = campanasCRM.map(c => ({ value: c.id, label: c.nombre }))

  return (
    <Row gutter={[12, 12]}>
      <Col span={24}>
        <Card size="small" title="Campañas de Meta ↔ campañas del CRM" extra={<Button icon={<SyncOutlined spin={sync.isPending} />} onClick={() => sync.mutate()} loading={sync.isPending} disabled={!data.metaConfigurada}>Actualizar desde Meta ahora</Button>}>
          <Paragraph type="secondary" style={{ fontSize: 12.5 }}>
            El sistema vincula solo por nombre exacto o por la mayoría de los leads cruzados. Si una campaña quedó "sin CRM", elige acá a qué campaña del catálogo corresponde. Lo que fijes a mano no lo pisa la sincronización.
          </Paragraph>
          <Table
            size="small" rowKey="id" dataSource={mapa} pagination={false}
            columns={[
              { title: 'Campaña en Meta', dataIndex: 'nombreMeta', render: (v, r) => <div><div style={{ fontWeight: 600 }}>{v}</div><Text type="secondary" style={{ fontSize: 11 }}>{r.objetivo?.replace('OUTCOME_', '')} · {r.inicioMeta ? dayjs(r.inicioMeta).format('D MMM YY') : '—'}{r.finMeta ? ` → ${dayjs(r.finMeta).format('D MMM YY')}` : ''}</Text></div> },
              { title: 'Estado', dataIndex: 'estadoMeta', width: 90, render: (v) => <Tag color={v === 'ACTIVE' ? 'green' : 'default'}>{v === 'ACTIVE' ? 'Activa' : 'Pausada'}</Tag> },
              {
                title: 'Campaña en el CRM', key: 'crm', width: 340,
                render: (_, r) => (
                  <Select
                    allowClear showSearch optionFilterProp="label" placeholder="Sin vincular (solo datos de Meta)" style={{ width: '100%' }}
                    value={r.campanaId ?? undefined} options={opcionesCRM}
                    onChange={(v) => vincular.mutate({ id: r.id, campanaId: v ?? null })}
                  />
                )
              },
              { title: 'Origen', dataIndex: 'vinculoManual', width: 90, render: (v, r) => r.campanaId ? <Tag style={{ margin: 0 }}>{v ? 'Manual' : 'Auto'}</Tag> : null },
            ]}
          />
        </Card>
      </Col>
      <Col span={24}>
        <Card size="small" title="Umbrales de los semáforos">
          <Paragraph type="secondary" style={{ fontSize: 12.5 }}>
            Verde hasta el primer valor, amarillo hasta el segundo, rojo más allá (o al revés si "mayor es mejor"). Los costos en "x mediana" se comparan con la mediana de la cuenta en los últimos 90 días.
          </Paragraph>
          <Table
            size="small" rowKey="id" dataSource={data.umbrales} pagination={false}
            columns={[
              { title: 'KPI', dataIndex: 'nombre', render: (v, r) => <div><div style={{ fontWeight: 600 }}>{v}</div><Text type="secondary" style={{ fontSize: 11 }}>{r.queEs}</Text></div> },
              { title: 'Unidad', dataIndex: 'unidad', width: 90 },
              { title: 'Menor es mejor', dataIndex: 'menorEsMejor', width: 120, render: (v, r) => <Switch size="small" checked={v} onChange={(c) => umbral.mutate({ id: r.id, menorEsMejor: c })} /> },
              { title: 'Verde hasta', dataIndex: 'verdeHasta', width: 130, render: (v, r) => <InputNumber size="small" value={v} step={r.unidad === '%' ? 0.5 : 0.1} onBlur={(e) => { const n = e.target.value === '' ? null : Number(e.target.value); if (n !== v) umbral.mutate({ id: r.id, verdeHasta: n }) }} style={{ width: 100 }} /> },
              { title: 'Amarillo hasta', dataIndex: 'amarilloHasta', width: 130, render: (v, r) => <InputNumber size="small" value={v} step={r.unidad === '%' ? 0.5 : 0.1} onBlur={(e) => { const n = e.target.value === '' ? null : Number(e.target.value); if (n !== v) umbral.mutate({ id: r.id, amarilloHasta: n }) }} style={{ width: 100 }} /> },
              { title: 'Mediana 90 d', key: 'm', width: 110, render: (_, r) => r.unidad === 'x mediana' ? clp(data.medianas90d?.[r.clave]) : '' },
            ]}
          />
        </Card>
      </Col>
      <Col span={24}>
        <Card size="small" title="Últimas sincronizaciones">
          <Table
            size="small" rowKey="id" dataSource={log} pagination={{ pageSize: 8, hideOnSinglePage: true }}
            columns={[
              { title: 'Inicio', dataIndex: 'inicio', render: (v) => dayjs(v).format('D MMM YYYY HH:mm') },
              { title: 'Fuente', dataIndex: 'fuente', width: 80 },
              { title: 'Resultado', key: 'ok', width: 110, render: (_, r) => r.ok == null ? <Tag>En curso</Tag> : r.ok ? <Tag color="green">OK</Tag> : <Tooltip title={r.error}><Tag color="red">Error</Tag></Tooltip> },
              { title: 'Detalle', dataIndex: 'detalle', render: (d) => d ? <Text type="secondary" style={{ fontSize: 11.5 }}>{d.since} → {d.until} · {d.insights?.CAMPANA ?? 0} días-campaña · {d.leads?.leadsVistos ?? 0} leads vistos · cruce {d.cruce ? `${(d.cruce.META_ID || 0) + (d.cruce.TELEFONO8 || 0) + (d.cruce.EMAIL || 0)}/${d.cruce.revisados}` : '—'}</Text> : null },
            ]}
          />
        </Card>
      </Col>
    </Row>
  )
}

// ── Página ────────────────────────────────────────────────────────
const PRESETS = [
  { label: '7 días', dias: 7 }, { label: '30 días', dias: 30 }, { label: '90 días', dias: 90 }, { label: 'Este año', desde: dayjs().startOf('year') },
]

export default function Rrss() {
  const { usuario } = useAuth()
  const esGerente = usuario?.rol === 'GERENTE'
  const [rango, setRango] = useState([dayjs().subtract(29, 'day'), dayjs()])
  const periodo = useMemo(() => ({ desde: rango[0].format('YYYY-MM-DD'), hasta: rango[1].format('YYYY-MM-DD') }), [rango])

  const { data, isLoading, isError } = useQuery({
    queryKey: ['rrss-informe', periodo],
    queryFn: () => api.get('/rrss/informe', { params: periodo }).then(r => r.data),
    staleTime: 5 * 60 * 1000,
  })

  const presetActivo = PRESETS.find(p => p.dias ? rango[0].isSame(dayjs().subtract(p.dias - 1, 'day'), 'day') && rango[1].isSame(dayjs(), 'day') : rango[0].isSame(p.desde, 'day') && rango[1].isSame(dayjs(), 'day'))?.label

  return (
    <div style={{ padding: '0 0 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>RRSS · Marketing</Title>
          <Text type="secondary" style={{ fontSize: 13 }}>Cuánto cuesta cada paso desde el anuncio hasta la venta. Pasa el mouse por el <InfoCircleOutlined /> de cada indicador para entenderlo.</Text>
        </div>
        <Space wrap>
          <Segmented
            size="small" value={presetActivo}
            options={PRESETS.map(p => p.label)}
            onChange={(label) => { const p = PRESETS.find(x => x.label === label); setRango([p.dias ? dayjs().subtract(p.dias - 1, 'day') : p.desde, dayjs()]) }}
          />
          <DatePicker.RangePicker size="small" value={rango} onChange={(v) => v && setRango(v)} allowClear={false} format="D MMM YYYY" disabledDate={(d) => d.isAfter(dayjs(), 'day')} />
        </Space>
      </div>

      {isLoading && <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>}
      {isError && <Alert type="error" showIcon message="No se pudo cargar el informe" description="Revisa la conexión o intenta de nuevo." />}
      {data && !data.metaConfigurada && (
        <Alert type="warning" showIcon style={{ marginBottom: 12 }} message="Meta Ads no está conectado en este servidor" description="Falta la variable META_ACCESS_TOKEN. Se muestran los datos ya sincronizados." />
      )}
      {data && data.ultimoSync && (
        <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 10 }}><SyncOutlined /> Datos de Meta actualizados {dayjs(data.ultimoSync).format('D MMM YYYY HH:mm')} · UF {clp(data.totales.ufValor)}</Text>
      )}

      {data && (
        <Tabs
          defaultActiveKey="embudo"
          items={[
            {
              key: 'embudo', label: <span><FunnelPlotOutlined /> Embudo y costos</span>,
              children: (
                <Row gutter={[12, 12]}>
                  <Col xs={12} md={8} lg={6} xl={4}><KpiCard titulo="Gasto en pauta" valor={data.totales.gasto} formato={clp} data={data} sub={`${num(data.totales.impresiones)} impresiones`} /></Col>
                  <Col xs={12} md={8} lg={6} xl={4}><KpiCard titulo="Leads (Meta)" valor={data.totales.leadsMeta} formato={num} data={data} sub={`${num(data.totales.leadsCRM)} llegaron al CRM`} /></Col>
                  <Col xs={12} md={8} lg={6} xl={4}><KpiCard titulo="Costo por lead" valor={data.totales.cpl} formato={clp} clave="CPL" data={data} sub="Gasto ÷ leads de Meta" /></Col>
                  <Col xs={12} md={8} lg={6} xl={4}><KpiCard titulo={<span>Costo por cotización <Text type="warning">★</Text></span>} valor={data.totales.costoCotizacion} formato={clp} clave="COSTO_COTIZACION" data={data} sub={`${num(data.totales.cotizados)} cotizaciones · ${pctF(data.totales.tasaLeadCotizacion)} de los leads`} /></Col>
                  <Col xs={12} md={8} lg={6} xl={4}><KpiCard titulo="Costo por venta (CAC)" valor={data.totales.cac} formato={clp} clave="CAC" data={data} sub={`${num(data.totales.ventas)} ventas · ${num(data.totales.ufVendidas, 1)} UF`} /></Col>
                  <Col xs={12} md={8} lg={6} xl={4}><KpiCard titulo="Retorno (ROAS)" valor={data.totales.roas} formato={(v) => v == null ? '—' : `${num(v, 1)}×`} clave="ROAS" data={data} sub={`${clp(data.totales.pesosVendidos)} vendidos`} /></Col>

                  <Col xs={24} lg={14}>
                    <Card size="small" title="Embudo del período" extra={<Text type="secondary" style={{ fontSize: 12 }}>Escala logarítmica para que se vean los pasos chicos</Text>}>
                      <Embudo t={data.totales} />
                    </Card>
                  </Col>
                  <Col xs={24} lg={10}>
                    <Card size="small" title="Calidad del anuncio" style={{ height: '100%' }}>
                      <Row gutter={[8, 8]}>
                        {[['CTR_ENLACE', data.totales.ctrEnlace, pctF, 'CTR de enlace'], ['CONV_FORMULARIO', data.totales.convFormulario, pctF, 'Conversión del formulario'], ['CPM', data.totales.cpm, clp, 'CPM'], ['PCT_AUDIENCE_NETWORK', data.totales.pctAudienceNetwork, pctF, 'Gasto en Audience Network'], ['TASA_LEAD_COTIZACION', data.totales.tasaLeadCotizacion, pctF, 'Lead → cotización'], ['TASA_COTIZACION_VISITA', data.totales.tasaCotizacionVisita, pctF, 'Cotización → visita']].map(([k, v, f, t]) => (
                          <Col span={12} key={k}><KpiCard titulo={t} valor={v} formato={f} clave={k} data={data} sub="" /></Col>
                        ))}
                      </Row>
                    </Card>
                  </Col>
                  <Col span={24}>
                    <Card size="small" title="Por campaña" extra={<Text type="secondary" style={{ fontSize: 12 }}>Haz clic en ▸ para ver todos los indicadores de la campaña</Text>}>
                      <TablaCampanas data={data} />
                    </Card>
                  </Col>
                </Row>
              )
            },
            { key: 'pauta', label: <span><BarChartOutlined /> Pauta Meta</span>, children: <PautaMeta data={data} /> },
            { key: 'salud', label: <span><AlertOutlined /> Salud de los leads</span>, children: <SaludLeads data={data} periodo={periodo} /> },
            ...(esGerente ? [{ key: 'config', label: <span><SettingOutlined /> Configuración</span>, children: <Configuracion data={data} /> }] : []),
          ]}
        />
      )}
    </div>
  )
}
