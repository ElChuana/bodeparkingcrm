/**
 * Cobranza: a quién hay que llamar hoy.
 *
 * Antigüedad 30/60/90 por cliente ordenada por gravedad, y la matriz
 * Cliente × Mes — el excel de ventas en cuotas, ahora vivo.
 */
import { useQuery } from '@tanstack/react-query'
import { Card, Table, Tag, Typography, Row, Col, Statistic, Tabs, Spin } from 'antd'
import { PhoneOutlined } from '@ant-design/icons'
import api from '../../services/api'
import { clp, uf, fecha, mesLabel, VERDE, ROJO, AMBAR, NUM } from '../ui'

const { Title, Text } = Typography

const TRAMO_TAG = {
  POR_VENCER: { label: 'Por vencer', color: 'default' },
  D1_30: { label: '1-30 días', color: 'blue' },
  D31_60: { label: '31-60', color: 'orange' },
  D61_90: { label: '61-90', color: 'orange' },
  D90_MAS: { label: '+90 días', color: 'red' },
}

function TabCobranza() {
  const { data, isLoading } = useQuery({
    queryKey: ['erp-cartera'],
    queryFn: () => api.get('/erp/cartera').then((r) => r.data),
    staleTime: 60000,
  })

  if (isLoading || !data) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spin /></div>

  const columns = [
    {
      title: 'Cliente', key: 'cliente',
      render: (_, c) => (
        <div>
          <Text strong style={{ fontSize: 13 }}>{c.nombre}</Text>
          {c.rut && <Text type="secondary" style={{ fontSize: 11 }}> · {c.rut}</Text>}
          {c.cuotas?.[0]?.telefono && (
            <a href={`tel:${c.cuotas[0].telefono}`} onClick={(e) => e.stopPropagation()} style={{ marginLeft: 8, fontSize: 11 }}>
              <PhoneOutlined /> {c.cuotas[0].telefono}
            </a>
          )}
        </div>
      ),
    },
    {
      title: 'Peor tramo', key: 'tramo', width: 120,
      render: (_, c) => { const t = TRAMO_TAG[c.peorTramo]; return <Tag color={t.color}>{t.label}</Tag> },
    },
    { title: 'Días', key: 'dias', align: 'right', width: 70, render: (_, c) => <Text type="secondary" style={NUM}>{c.diasMax || '—'}</Text> },
    { title: 'Vencido', key: 'vencido', align: 'right', width: 120, render: (_, c) => c.vencido ? <Text strong style={{ color: ROJO, ...NUM }}>{clp(c.vencido)}</Text> : <Text type="secondary">—</Text> },
    { title: 'Total', key: 'total', align: 'right', width: 120, render: (_, c) => <Text strong style={NUM}>{clp(c.total)}</Text> },
  ]

  return (
    <>
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        {data.tramos.map((t) => (
          <Col key={t.clave} xs={12} sm={8} lg={4}>
            <Card size="small">
              <Statistic
                title={t.etiqueta}
                value={data.totales[t.clave]}
                formatter={clp}
                valueStyle={{ fontSize: 16, ...NUM, color: t.clave === 'POR_VENCER' ? undefined : t.clave === 'D90_MAS' ? ROJO : AMBAR }}
              />
            </Card>
          </Col>
        ))}
        <Col xs={12} sm={8} lg={4}>
          <Card size="small" style={{ borderColor: '#0091C3', background: '#e6f5fa' }}>
            <Statistic title="Total por cobrar" value={data.total} formatter={clp} valueStyle={{ fontSize: 16, color: '#0083b0', ...NUM }} />
          </Card>
        </Col>
      </Row>

      <Table
        dataSource={data.clientes}
        columns={columns}
        rowKey={(c) => c.contactoId ?? c.nombre}
        size="small"
        pagination={false}
        locale={{ emptyText: '🎉 Nadie debe nada.' }}
        expandable={{
          expandedRowRender: (c) => (
            <div>
              {c.cuotas.map((q) => (
                <div key={q.id} style={{ display: 'flex', alignItems: 'baseline', gap: 8, fontSize: 12, padding: '2px 0' }}>
                  <Text type="secondary" style={{ width: 56, flexShrink: 0, ...NUM }}>{fecha(q.fechaVencimiento)}</Text>
                  <Text style={{ flex: 1, fontSize: 12 }} ellipsis>
                    Cuota {q.numeroCuota} · {q.tipo?.toLowerCase()}
                    {q.edificio ? <Text type="secondary"> · {q.edificio}</Text> : null}
                    {q.montoUF ? <Text type="secondary"> · {uf(q.montoUF)}</Text> : null}
                    {q.origenMigracion && <Tag style={{ marginLeft: 6, fontSize: 10 }} title="Cuota reconstruida por migración, no pactada">migrada</Tag>}
                  </Text>
                  {q.diasAtraso > 0 && <Text style={{ color: ROJO, fontSize: 11 }}>{q.diasAtraso} días</Text>}
                  <Text strong style={{ whiteSpace: 'nowrap', ...NUM }}>{clp(q.saldoPorCobrar)}</Text>
                </div>
              ))}
            </div>
          ),
        }}
      />
      {data.migradas > 0 && (
        <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 8 }}>
          {data.migradas} cuota(s) marcadas "migradas": montos y fechas reconstruidos, no pactados.
        </Text>
      )}
    </>
  )
}

function TabMatriz() {
  const { data, isLoading } = useQuery({
    queryKey: ['erp-cartera', 'matriz'],
    queryFn: () => api.get('/erp/cartera/matriz').then((r) => r.data),
    staleTime: 60000,
  })

  if (isLoading || !data) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spin /></div>

  const columns = [
    {
      title: 'Cliente', key: 'cliente', fixed: 'left', width: 180,
      render: (_, c) => (
        <div>
          <Text strong style={{ fontSize: 12.5 }}>{c.nombre}</Text>
          {c.edificio && <div><Text type="secondary" style={{ fontSize: 10 }}>{c.edificio}</Text></div>}
        </div>
      ),
    },
    ...data.meses.map((m) => ({
      title: mesLabel(m), key: m, width: 95, align: 'right',
      render: (_, c) => {
        const celda = c.meses[m]
        if (!celda) return <Text type="secondary">·</Text>
        const pagada = celda.saldo < 1000
        const detalle = celda.cuotas.map((q) => `Cuota ${q.numeroCuota} ${q.tipo} · ${clp(q.montoCLP)}${q.saldo < 1000 ? ' ✓ pagada' : ''}`).join('\n')
        return (
          <span title={detalle} style={NUM}>
            <Text style={{ fontSize: 12, color: pagada ? VERDE : undefined, fontWeight: pagada ? 400 : 600 }}>
              {clp(celda.monto)}{pagada ? ' ✓' : ''}
            </Text>
          </span>
        )
      },
    })),
    {
      title: 'Saldo', key: 'saldo', fixed: 'right', width: 110, align: 'right',
      render: (_, c) => c.saldo < 1000
        ? <Tag color="green">al día</Tag>
        : <Text strong style={NUM}>{clp(c.saldo)}</Text>,
    },
  ]

  return (
    <>
      <Table
        dataSource={data.clientes}
        columns={columns}
        rowKey={(c) => c.contactoId ?? c.nombre}
        size="small"
        pagination={false}
        scroll={{ x: 290 + data.meses.length * 95 }}
        locale={{ emptyText: 'Sin ventas en cuotas todavía.' }}
      />
      <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 8 }}>
        Verde ✓ = pagada (conciliada con el banco) · UF del día: ${Math.round(data.valorUF).toLocaleString('es-CL')}
      </Text>
    </>
  )
}

export default function Cartera() {
  return (
    <div>
      <Title level={4} style={{ marginBottom: 16 }}>Cobranza</Title>
      <Card styles={{ body: { paddingTop: 8 } }}>
        <Tabs
          items={[
            { key: 'cobranza', label: 'A quién llamar', children: <TabCobranza /> },
            { key: 'matriz', label: 'Cliente × Mes', children: <TabMatriz /> },
          ]}
        />
      </Card>
    </div>
  )
}
