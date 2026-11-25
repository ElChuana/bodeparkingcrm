// Pestaña Mapa del módulo RRSS: coroplético de Chile por región (gasto / leads / CPL / leads CRM / ventas) +
// círculos de segmentación de los conjuntos de anuncios de Meta. Datos: GET /api/rrss/mapa-datos y /segmentacion.
// GeoJSON estático en /geo/regiones.json (ver /geo/FUENTE.md). Tiles de OpenStreetMap, sin API key.
import React, { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, Row, Col, Table, Tag, Spin, Typography, Segmented, Switch, Space, Empty, Alert, Tooltip } from 'antd'
import { MapContainer, TileLayer, GeoJSON, Circle, Tooltip as LTooltip } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import api from '../../services/api'

const { Text } = Typography

const clp = (v) => (v == null ? '—' : '$' + Math.round(v).toLocaleString('es-CL'))
const num = (v) => (v == null ? '—' : Number(v).toLocaleString('es-CL', { maximumFractionDigits: 0 }))

const METRICAS = [
  { key: 'gasto', label: 'Gasto Meta', fmt: clp, menorEsMejor: false },
  { key: 'leadsMeta', label: 'Leads Meta', fmt: num, menorEsMejor: false },
  { key: 'cpl', label: 'CPL', fmt: clp, menorEsMejor: true },
  { key: 'leadsCRM', label: 'Leads CRM', fmt: num, menorEsMejor: false },
  { key: 'cotizados', label: 'Cotizaciones', fmt: num, menorEsMejor: false },
  { key: 'ventas', label: 'Ventas', fmt: num, menorEsMejor: false },
]

// Escala secuencial del azul de la marca (claro → oscuro), 5 pasos; sin dato = gris
const ESCALA = ['#e0f2fe', '#a5d8f3', '#5fb8e0', '#0092C0', '#005f80']
const colorDe = (valor, max) => {
  if (valor == null || valor === 0 || !max) return '#f1f5f9'
  const i = Math.min(ESCALA.length - 1, Math.floor((valor / max) * ESCALA.length))
  return ESCALA[i]
}

const COLORES_CONJUNTO = ['#dc2626', '#d97706', '#7c3aed', '#059669', '#db2777', '#2563eb', '#0f766e', '#9333ea']

export default function MapaRrss({ periodo }) {
  const [metrica, setMetrica] = useState('gasto')
  const [verSegmentacion, setVerSegmentacion] = useState(true)
  const [soloActivas, setSoloActivas] = useState(true)

  const { data: geo } = useQuery({ queryKey: ['geo-regiones'], queryFn: () => fetch('/geo/regiones.json').then(r => r.json()), staleTime: Infinity })
  const { data, isLoading } = useQuery({ queryKey: ['rrss-mapa', periodo], queryFn: () => api.get('/rrss/mapa-datos', { params: periodo }).then(r => r.data) })
  const { data: seg } = useQuery({ queryKey: ['rrss-segmentacion'], queryFn: () => api.get('/rrss/segmentacion').then(r => r.data), staleTime: 60 * 60 * 1000 })

  const m = METRICAS.find(x => x.key === metrica)
  const porCodigo = useMemo(() => Object.fromEntries((data?.regiones || []).map(r => [Number(r.codigo), r])), [data])
  const max = useMemo(() => Math.max(0, ...(data?.regiones || []).map(r => r[metrica] || 0)), [data, metrica])

  const conjuntos = useMemo(() => {
    const lista = (seg?.conjuntos || []).filter(c => c.circulos.length && (!soloActivas || (c.estado === 'ACTIVE' && c.campanaActiva)))
    return lista.map((c, i) => ({ ...c, color: COLORES_CONJUNTO[i % COLORES_CONJUNTO.length] }))
  }, [seg, soloActivas])

  const estilo = (feature) => {
    const r = porCodigo[feature.properties.codregion]
    return { fillColor: colorDe(r?.[metrica], max), weight: 1, color: '#64748b', fillOpacity: 0.85 }
  }
  const onEach = (feature, layer) => {
    const r = porCodigo[feature.properties.codregion]
    const nombre = r?.nombre || feature.properties.Region
    const html = r
      ? `<b>${nombre}</b><br/>Gasto: ${clp(r.gasto)} · Leads Meta: ${num(r.leadsMeta)} · CPL: ${clp(r.cpl)}<br/>Leads CRM: ${num(r.leadsCRM)} · Cotizaciones: ${num(r.cotizados)} · Ventas: ${num(r.ventas)}`
      : `<b>${nombre}</b><br/>Sin datos`
    layer.bindTooltip(html, { sticky: true })
  }

  const conDatos = (data?.regiones || []).filter(r => r.gasto || r.leadsCRM || r.ventas).sort((a, b) => (b[metrica] || 0) - (a[metrica] || 0))

  return (
    <Row gutter={[12, 12]}>
      <Col span={24}>
        <Space wrap size={16}>
          <Segmented value={metrica} onChange={setMetrica} options={METRICAS.map(x => ({ value: x.key, label: x.label }))} />
          <Space><Switch size="small" checked={verSegmentacion} onChange={setVerSegmentacion} /> <Text style={{ fontSize: 13 }}>Mostrar dónde apunta la pauta (círculos)</Text></Space>
          <Space><Switch size="small" checked={soloActivas} onChange={setSoloActivas} disabled={!verSegmentacion} /> <Text style={{ fontSize: 13 }}>Solo campañas activas</Text></Space>
        </Space>
      </Col>
      {data?.nota && <Col span={24}><Alert type="info" showIcon title={data.nota} style={{ padding: '4px 12px' }} /></Col>}
      <Col xs={24} lg={15}>
        <Card size="small" styles={{ body: { padding: 0 } }}>
          {isLoading || !geo ? <div style={{ height: 720, display: 'grid', placeItems: 'center' }}><Spin /></div> : (
            <MapContainer bounds={[[-44.5, -76.5], [-26.5, -66.5]]} boundsOptions={{ padding: [8, 8] }} minZoom={4} maxZoom={12} style={{ height: 720, width: '100%', borderRadius: 8 }} scrollWheelZoom={false}>
              <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <GeoJSON key={metrica + (data?.periodo?.desde || '')} data={geo} style={estilo} onEachFeature={onEach} />
              {verSegmentacion && conjuntos.map(c => c.circulos.map((x, i) => (
                <Circle key={`${c.id}-${i}`} center={[x.lat, x.lng]} radius={Math.max(x.radioKm, 1) * 1000} pathOptions={{ color: c.color, fillColor: c.color, fillOpacity: 0.12, weight: 2, dashArray: c.estado === 'ACTIVE' ? null : '4 4' }}>
                  <LTooltip sticky>
                    <b>{c.campana}</b><br />{c.nombre}<br />{x.nombre} · radio {Math.round(x.radioKm)} km · {c.edadMin}–{c.edadMax} años{c.advantagePlus ? ' · Advantage+' : ''}
                  </LTooltip>
                </Circle>
              )))}
            </MapContainer>
          )}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '8px 12px', flexWrap: 'wrap' }}>
            <Text type="secondary" style={{ fontSize: 12 }}>{m.label}:</Text>
            {ESCALA.map((c, i) => <span key={c} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#475569' }}><span style={{ width: 14, height: 14, background: c, borderRadius: 3, border: '1px solid #cbd5e1' }} />{i === 0 ? 'bajo' : i === ESCALA.length - 1 ? 'alto' : ''}</span>)}
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#475569' }}><span style={{ width: 14, height: 14, background: '#f1f5f9', borderRadius: 3, border: '1px solid #cbd5e1' }} />sin datos</span>
            {data?.sinRegion?.gasto > 0 && <Text type="secondary" style={{ fontSize: 11.5, marginLeft: 'auto' }}>Fuera del mapa (región desconocida): {clp(data.sinRegion.gasto)} · {num(data.sinRegion.leadsMeta)} leads Meta</Text>}
          </div>
        </Card>
      </Col>
      <Col xs={24} lg={9}>
        <Card size="small" title="Por región" style={{ marginBottom: 12 }}>
          <Table
            size="small" rowKey="codigo" pagination={false} dataSource={conDatos} scroll={{ x: 'max-content' }}
            columns={[
              { title: 'Región', dataIndex: 'nombre', render: (v) => v.replace('Metropolitana de Santiago', 'Metropolitana') },
              { title: 'Gasto', dataIndex: 'gasto', align: 'right', render: clp },
              { title: 'Leads', dataIndex: 'leadsMeta', align: 'right', render: num },
              { title: 'CPL', dataIndex: 'cpl', align: 'right', render: clp },
              { title: 'En CRM', dataIndex: 'leadsCRM', align: 'right', render: num },
              { title: 'Cotiz.', dataIndex: 'cotizados', align: 'right', render: num },
              { title: 'Ventas', dataIndex: 'ventas', align: 'right', render: num },
            ]}
            locale={{ emptyText: <Empty description="Sin datos por región en el período" /> }}
          />
          <Text type="secondary" style={{ fontSize: 11.5, display: 'block', marginTop: 8 }}>
            Gasto y leads Meta vienen del desglose por región de Meta. Los leads y ventas del CRM se ubican por el edificio de interés; si el lead no tiene uno, por la región a la que apunta la pauta de su campaña.
          </Text>
        </Card>
        <Card size="small" title="Dónde apunta la pauta (segmentación de cada conjunto)">
          {!seg?.metaConfigurada && <Alert type="warning" showIcon title="Sin conexión a Meta en este servidor" style={{ marginBottom: 8 }} />}
          {conjuntos.length === 0 ? <Empty description="Sin conjuntos con ubicación" /> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 420, overflowY: 'auto' }}>
              {conjuntos.map(c => (
                <div key={c.id} style={{ borderLeft: `4px solid ${c.color}`, paddingLeft: 10 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{c.campana} <Tag color={c.estado === 'ACTIVE' && c.campanaActiva ? 'green' : 'default'} style={{ fontSize: 10, marginInlineStart: 4 }}>{c.estado === 'ACTIVE' && c.campanaActiva ? 'Activa' : 'Pausada'}</Tag></div>
                  <div style={{ fontSize: 12, color: '#475569' }}>
                    {c.circulos.map(x => `${x.nombre} +${Math.round(x.radioKm)} km`).concat(c.regiones).concat(c.ciudadesSinCoord).join(' · ')}
                  </div>
                  <div style={{ fontSize: 11.5, color: '#94a3b8' }}>
                    {c.edadMin}–{c.edadMax} años · {c.generos ? (c.generos.includes(1) && !c.generos.includes(2) ? 'solo hombres' : c.generos.includes(2) && !c.generos.includes(1) ? 'solo mujeres' : 'todos') : 'todos los géneros'}
                    {c.advantagePlus ? ' · Advantage+ (Meta amplía la audiencia por su cuenta)' : ''}
                    {c.intereses?.length ? <Tooltip title={c.intereses.join(', ')}> · {c.intereses.length} intereses</Tooltip> : ''}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </Col>
    </Row>
  )
}
