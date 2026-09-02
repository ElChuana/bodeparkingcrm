/**
 * Cuentas y presupuesto: ¿cómo vamos con el presupuesto de cada cuenta?
 *
 * Árbol cuenta grande → subcuenta con Presupuesto / Ejecutado / Comprometido /
 * Disponible y semáforo. La ejecución es calculada por lo devengado; el
 * presupuesto se carga en una grilla subcuenta × mes.
 */
import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, Table, Tag, Typography, Button, Segmented, Tabs, InputNumber, Spin, App } from 'antd'
import api from '../../services/api'
import { clp, mesLabel, VERDE, ROJO, NUM } from '../ui'

const { Title, Text } = Typography

function Semaforo({ fila }) {
  if (fila.pct == null) return fila.ejecutado + fila.comprometido > 0 ? <Tag>s/ ppto</Tag> : null
  const color = fila.pct > 100 ? 'red' : fila.pct >= 85 ? 'orange' : 'green'
  return <Tag color={color} style={NUM}>{fila.pct}%</Tag>
}

function TabEjecucion({ anio }) {
  const [periodo, setPeriodo] = useState('') // '' = acumulado del año
  const { data, isLoading } = useQuery({
    queryKey: ['erp-presupuesto', 'ejecucion', anio],
    queryFn: () => api.get('/erp/presupuesto/ejecucion', { params: { anio } }).then((r) => r.data),
    staleTime: 60000,
  })

  if (isLoading || !data) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spin /></div>

  const filaDe = (c) => (periodo ? c.porPeriodo[periodo] : c.total)

  // Árbol para la tabla AntD: cuentas grandes con children (subcuentas).
  const dataSource = data.cuentas.map((c) => ({
    ...c,
    key: `c-${c.id}`,
    fila: filaDe(c),
    children: c.subcuentas.length
      ? c.subcuentas.map((s) => ({ ...s, key: `s-${s.id}`, fila: periodo ? s.porPeriodo[periodo] : s.total }))
      : undefined,
  }))

  const celda = (campo, color) => (_, r) => {
    const v = r.fila[campo]
    return v ? <Text style={{ color, ...NUM }} strong={!r.padreId && campo === 'disponible'}>{clp(v)}</Text> : <Text type="secondary">—</Text>
  }

  const columns = [
    {
      title: 'Cuenta', key: 'nombre',
      render: (_, r) => (
        <span>
          {r.color && <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 99, background: r.color, marginRight: 6 }} />}
          <Text strong={!r.padreId} style={{ fontSize: 13 }}>{r.nombre}</Text>
        </span>
      ),
    },
    { title: 'Presupuesto', key: 'p', align: 'right', render: celda('presupuesto') },
    { title: 'Ejecutado', key: 'e', align: 'right', render: celda('ejecutado') },
    { title: 'Comprometido', key: 'c', align: 'right', render: celda('comprometido', '#d46b08') },
    {
      title: 'Disponible', key: 'd', align: 'right',
      render: (_, r) => {
        const f = r.fila
        if (!(f.presupuesto || f.ejecutado || f.comprometido)) return <Text type="secondary">—</Text>
        return <Text strong style={{ color: f.disponible < 0 ? ROJO : VERDE, ...NUM }}>{clp(f.disponible)}</Text>
      },
    },
    { title: '', key: 's', align: 'right', render: (_, r) => <Semaforo fila={r.fila} /> },
  ]

  const total = periodo ? data.porPeriodo[periodo] : data.total

  return (
    <>
      <div style={{ marginBottom: 12, overflowX: 'auto' }}>
        <Segmented
          size="small"
          options={[{ label: 'Año completo', value: '' }, ...data.periodos.map((p) => ({ label: mesLabel(p), value: p }))]}
          value={periodo}
          onChange={setPeriodo}
        />
      </div>
      <Table
        dataSource={dataSource}
        columns={columns}
        size="small"
        pagination={false}
        expandable={{ defaultExpandAllRows: true }}
        summary={() => (
          <Table.Summary.Row style={{ background: '#f8fafc' }}>
            <Table.Summary.Cell index={0}><Text strong>Total</Text></Table.Summary.Cell>
            <Table.Summary.Cell index={1} align="right"><Text strong style={NUM}>{clp(total.presupuesto)}</Text></Table.Summary.Cell>
            <Table.Summary.Cell index={2} align="right"><Text strong style={NUM}>{clp(total.ejecutado)}</Text></Table.Summary.Cell>
            <Table.Summary.Cell index={3} align="right"><Text strong style={{ color: '#d46b08', ...NUM }}>{clp(total.comprometido)}</Text></Table.Summary.Cell>
            <Table.Summary.Cell index={4} align="right"><Text strong style={{ color: total.disponible < 0 ? ROJO : VERDE, ...NUM }}>{clp(total.disponible)}</Text></Table.Summary.Cell>
            <Table.Summary.Cell index={5} align="right"><Semaforo fila={total} /></Table.Summary.Cell>
          </Table.Summary.Row>
        )}
      />
      <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 8 }}>
        Ejecutado = pagado y conciliado con el banco · Comprometido = provisiones y facturas abiertas ·
        El período es el del documento (devengado), no el del pago.
      </Text>
    </>
  )
}

function TabCargar({ anio }) {
  const qc = useQueryClient()
  const { message } = App.useApp()
  const [celdas, setCeldas] = useState({}) // `${cuentaId}|${periodo}` → valor editado

  const { data: cuentas } = useQuery({
    queryKey: ['erp-cuentas'],
    queryFn: () => api.get('/erp/cuentas').then((r) => r.data),
    staleTime: 300000,
  })
  const { data: presupuesto, isLoading } = useQuery({
    queryKey: ['erp-presupuesto', 'grilla', anio],
    queryFn: () => api.get('/erp/presupuesto', { params: { anio } }).then((r) => r.data),
    staleTime: 30000,
  })

  const base = useMemo(() => {
    const m = new Map()
    for (const f of presupuesto?.filas || []) m.set(`${f.cuentaId}|${f.periodo}`, f)
    return m
  }, [presupuesto])

  const subcuentas = (cuentas?.arbol || []).flatMap((r) =>
    r.subcuentas.length ? r.subcuentas.map((s) => ({ ...s, grupo: r.nombre })) : [{ ...r, grupo: null }])
  const periodos = presupuesto?.periodos || []

  const valorDe = (cuentaId, p) => {
    const k = `${cuentaId}|${p}`
    if (k in celdas) return celdas[k]
    const f = base.get(k)
    return f && Number(f.montoCLP) > 0 ? Number(f.montoCLP) : null
  }

  const guardar = useMutation({
    mutationFn: () => {
      const filas = Object.entries(celdas).map(([k, v]) => {
        const [cuentaId, periodo] = k.split('|')
        return { cuentaId: Number(cuentaId), periodo, montoCLP: v == null || v === '' ? null : Number(v) }
      })
      return api.put('/erp/presupuesto', { filas }).then((r) => r.data)
    },
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ['erp-presupuesto'] })
      setCeldas({})
      message.success(`Presupuesto guardado (${r.guardadas} celdas).`)
    },
    onError: (e) => message.error(e.response?.data?.error || 'No se pudo guardar.'),
  })

  const copiarAlAno = (cuentaId, desdePeriodo) => {
    const v = valorDe(cuentaId, desdePeriodo)
    if (v == null) return
    setCeldas((c) => {
      const nuevo = { ...c }
      for (const p of periodos) if (p !== desdePeriodo) nuevo[`${cuentaId}|${p}`] = v
      return nuevo
    })
    message.info('Copiado al resto del año — guarda para confirmar.')
  }

  if (isLoading || !cuentas) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spin /></div>

  const columns = [
    {
      title: 'Subcuenta', key: 'nombre', fixed: 'left', width: 170,
      render: (_, s) => (
        <div>
          <Text strong style={{ fontSize: 12.5 }}>{s.nombre}</Text>
          {s.grupo && <div><Text type="secondary" style={{ fontSize: 10 }}>{s.grupo}</Text></div>}
        </div>
      ),
    },
    ...periodos.map((p) => ({
      title: mesLabel(p), key: p, width: 105, align: 'right',
      render: (_, s) => {
        const k = `${s.id}|${p}`
        const editada = k in celdas
        return (
          <InputNumber
            size="small"
            style={{ width: 95, background: editada ? '#e6f5fa' : undefined, ...NUM }}
            controls={false}
            min={0}
            placeholder="—"
            value={valorDe(s.id, p)}
            onChange={(v) => setCeldas((c) => ({ ...c, [k]: v }))}
            onDoubleClick={() => copiarAlAno(s.id, p)}
            formatter={(v) => (v == null || v === '' ? '' : `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.'))}
            parser={(v) => v.replace(/[^\d]/g, '')}
          />
        )
      },
    })),
  ]

  const cambios = Object.keys(celdas).length

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 8, flexWrap: 'wrap' }}>
        <Text type="secondary" style={{ fontSize: 12 }}>
          Montos en pesos por subcuenta y mes. Doble clic en una celda la copia al resto del año.
        </Text>
        <Button type="primary" disabled={!cambios} loading={guardar.isPending} onClick={() => guardar.mutate()}>
          {cambios ? `Guardar ${cambios} cambio${cambios === 1 ? '' : 's'}` : 'Sin cambios'}
        </Button>
      </div>
      <Table
        dataSource={subcuentas}
        columns={columns}
        rowKey="id"
        size="small"
        pagination={false}
        scroll={{ x: 170 + periodos.length * 105 }}
        locale={{ emptyText: 'Primero crea el plan de cuentas en Configuración.' }}
      />
    </>
  )
}

export default function Presupuesto() {
  const [anio, setAnio] = useState(new Date().getFullYear())

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <Title level={4} style={{ margin: 0 }}>Presupuesto</Title>
        <Segmented options={[anio - 1, anio, anio + 1].map((a) => ({ label: `${a}`, value: a }))} value={anio} onChange={setAnio} />
      </div>
      <Card styles={{ body: { paddingTop: 8 } }}>
        <Tabs
          items={[
            { key: 'ejecucion', label: 'Cómo vamos', children: <TabEjecucion anio={anio} /> },
            { key: 'cargar', label: 'Cargar presupuesto', children: <TabCargar anio={anio} /> },
          ]}
        />
      </Card>
    </div>
  )
}
