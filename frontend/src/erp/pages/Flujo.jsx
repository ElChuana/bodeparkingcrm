/**
 * Flujo de caja: lo real en sólido, lo proyectado atenuado; el saldo como línea.
 * Cada mes se expande para ver qué lo explica, ordenado por monto.
 */
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, Table, Tag, Typography, Segmented, Spin, Alert } from 'antd'
import {
  ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ReferenceLine, Cell,
} from 'recharts'
import api from '../../services/api'
import { clp, fecha, VERDE, ROJO, NUM } from '../ui'

const { Title, Text } = Typography

const ORIGEN = {
  BANCO: { label: 'Banco', color: 'default' },
  CUOTA: { label: 'Cuota', color: 'blue' },
  ARRIENDO: { label: 'Arriendo', color: 'cyan' },
  COMISION: { label: 'Comisión', color: 'gold' },
  PROVISION: { label: 'Provisión', color: 'orange' },
  DOCUMENTO: { label: 'Documento', color: 'default' },
  COMPRA: { label: 'Factura', color: 'volcano' },
  GASTO: { label: 'Gasto prog.', color: 'default' },
}

function TooltipFlujo({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const f = payload[0]?.payload
  if (!f) return null
  const fila = (t, v, color) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
      <span style={{ color: '#64748b' }}>{t}</span>
      <span style={{ fontWeight: 600, color, ...NUM }}>{clp(v)}</span>
    </div>
  )
  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', fontSize: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>{label}{f.sinDatosBanco ? ' · sin cartola' : ''}</div>
      {fila('Entradas', f.entradas, VERDE)}
      {fila('Salidas', f.salidas, ROJO)}
      {fila('Neto', f.neto, f.neto >= 0 ? VERDE : ROJO)}
      {f.saldoProyectado != null && fila('Saldo proy.', f.saldoProyectado, '#0083b0')}
    </div>
  )
}

export default function Flujo() {
  const [meses, setMeses] = useState(12)
  const { data, isLoading } = useQuery({
    queryKey: ['erp-flujo', meses],
    queryFn: () => api.get('/erp/flujo', { params: { meses } }).then((r) => r.data),
    staleTime: 60000,
  })

  if (isLoading || !data) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Spin size="large" /></div>
  }

  const filas = data.filas

  const columns = [
    {
      title: 'Mes', key: 'mes',
      render: (_, f) => (
        <span>
          <Text strong style={{ fontSize: 13 }}>{f.etiqueta}</Text>
          {f.esActual && <Tag color="blue" style={{ marginLeft: 6 }}>en curso</Tag>}
          {f.esFuturo && <Text type="secondary" style={{ fontSize: 11, marginLeft: 6 }}>proyectado</Text>}
          {f.sinDatosBanco && <Tag color="orange" style={{ marginLeft: 6 }}>sin cartola</Tag>}
        </span>
      ),
    },
    { title: 'Entradas', key: 'entradas', align: 'right', render: (_, f) => <Text style={{ color: VERDE, ...NUM }}>{clp(f.entradas)}</Text> },
    { title: 'Salidas', key: 'salidas', align: 'right', render: (_, f) => <Text style={{ color: ROJO, ...NUM }}>{clp(f.salidas)}</Text> },
    { title: 'Neto', key: 'neto', align: 'right', render: (_, f) => <Text strong style={{ color: f.neto >= 0 ? VERDE : ROJO, ...NUM }}>{clp(f.neto)}</Text> },
    { title: 'Saldo proy.', key: 'saldo', align: 'right', render: (_, f) => <Text style={{ color: '#0083b0', ...NUM }}>{f.saldoProyectado != null ? clp(f.saldoProyectado) : '—'}</Text> },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 8 }}>
        <Title level={4} style={{ margin: 0 }}>Flujo de caja</Title>
        <Segmented
          options={[{ label: '6 meses', value: 6 }, { label: '12 meses', value: 12 }, { label: '18 meses', value: 18 }]}
          value={meses}
          onChange={setMeses}
        />
      </div>

      <Card style={{ marginBottom: 16 }}>
        <div style={{ height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={filas} margin={{ top: 8, right: 8, bottom: 0, left: 8 }} barGap={1}>
              <XAxis dataKey="etiqueta" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(v) => `${Math.round(v / 1e6)}M`} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={40} />
              <Tooltip content={<TooltipFlujo />} />
              <ReferenceLine y={0} stroke="#e2e8f0" />
              <Bar dataKey="entradas" name="Entradas" radius={[3, 3, 0, 0]} maxBarSize={18}>
                {filas.map((f, i) => <Cell key={i} fill="#52c41a" fillOpacity={f.esFuturo ? 0.35 : 0.9} />)}
              </Bar>
              <Bar dataKey="salidas" name="Salidas" radius={[3, 3, 0, 0]} maxBarSize={18}>
                {filas.map((f, i) => <Cell key={i} fill="#ff4d4f" fillOpacity={f.esFuturo ? 0.3 : 0.8} />)}
              </Bar>
              <Line dataKey="saldoProyectado" name="Saldo" stroke="#0091C3" strokeWidth={2} strokeDasharray="5 4" dot={false} connectNulls />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <Text type="secondary" style={{ fontSize: 11 }}>
          ■ verde entradas · ■ rojo salidas · - - línea: saldo proyectado · lo proyectado va atenuado
        </Text>
      </Card>

      <Card title="Mes a mes" styles={{ body: { padding: 0 } }}>
        <Table
          dataSource={filas}
          columns={columns}
          rowKey="mes"
          size="small"
          pagination={false}
          expandable={{
            expandedRowRender: (f) => (
              f.detalle.length === 0
                ? <Text type="secondary" style={{ fontSize: 12 }}>Sin movimientos este mes.</Text>
                : (
                  <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                    {f.detalle.slice(0, 40).map((d, i) => {
                      const o = ORIGEN[d.origen] || { label: d.origen, color: 'default' }
                      return (
                        <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 8, fontSize: 12, padding: '2px 0' }}>
                          <Text type="secondary" style={{ width: 56, flexShrink: 0, ...NUM }}>{d.fecha ? fecha(d.fecha) : '—'}</Text>
                          <Tag color={o.color} style={{ fontSize: 10, lineHeight: '16px' }}>{o.label}</Tag>
                          <Text style={{ flex: 1, fontSize: 12 }} ellipsis>
                            {d.concepto}{d.nota ? <Text type="secondary"> · {d.nota}</Text> : ''}
                          </Text>
                          <Text strong style={{ color: d.tipo === 'ENTRADA' ? VERDE : ROJO, whiteSpace: 'nowrap', ...NUM }}>
                            {d.tipo === 'SALIDA' ? '−' : ''}{clp(d.monto)}
                          </Text>
                        </div>
                      )
                    })}
                    {f.detalle.length > 40 && <Text type="secondary" style={{ fontSize: 11 }}>… y {f.detalle.length - 40} más</Text>}
                  </div>
                )
            ),
          }}
        />
        {data.limitaciones?.length > 0 && (
          <div style={{ padding: '10px 16px', borderTop: '1px solid #f0f0f0' }}>
            {data.limitaciones.map((l, i) => (
              <div key={i}><Text type="secondary" style={{ fontSize: 11 }}>· {l}</Text></div>
            ))}
          </div>
        )}
      </Card>

      {data.huecos?.length > 0 && (
        <Alert style={{ marginTop: 12 }} type="warning" showIcon
          message={`Meses sin cartola cargada: ${data.huecos.join(', ')} — no son $0, falta cargar el banco.`} />
      )}
    </div>
  )
}
