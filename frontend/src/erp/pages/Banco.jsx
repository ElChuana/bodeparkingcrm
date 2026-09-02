/**
 * Banco: qué pasó en la cuenta. Movimientos (hechos del banco, nunca editables)
 * y cargas de cartola con su cuadre contra los totales del banco.
 */
import { useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, Table, Tag, Typography, Button, Input, Select, Space, Tabs, App } from 'antd'
import { UploadOutlined } from '@ant-design/icons'
import api from '../../services/api'
import { clp, fecha, Monto, VERDE, ROJO, NUM } from '../ui'

const { Title, Text } = Typography

function BotonSubirCartola() {
  const inputRef = useRef(null)
  const qc = useQueryClient()
  const { message } = App.useApp()

  const subir = useMutation({
    mutationFn: (file) => {
      const fd = new FormData()
      fd.append('cartola', file)
      return api.post('/erp/banco/cargas', fd).then((r) => r.data)
    },
    onSuccess: ({ carga, cuadre }) => {
      qc.invalidateQueries({ queryKey: ['erp-banco'] })
      qc.invalidateQueries({ queryKey: ['erp-dashboard'] })
      message.success(
        `Cartola cargada: ${carga.totalNuevos} nuevos, ${carga.totalRepetidos} repetidos${cuadre?.cuadra === false ? ' · ⚠ NO cuadra con el banco' : cuadre?.cuadra ? ' · cuadra ✓' : ''}`,
        6,
      )
    },
    onError: (e) => message.error(e.response?.data?.error || 'Error al subir la cartola.'),
  })

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".txt,.csv,text/plain"
        style={{ display: 'none' }}
        onChange={(e) => { if (e.target.files?.[0]) subir.mutate(e.target.files[0]); e.target.value = '' }}
      />
      <Button type="primary" icon={<UploadOutlined />} loading={subir.isPending} onClick={() => inputRef.current?.click()}>
        Subir cartola
      </Button>
    </>
  )
}

function Movimientos() {
  const [filtro, setFiltro] = useState({ tipo: undefined, search: '', conciliado: undefined })
  const params = {
    ...(filtro.tipo && { tipo: filtro.tipo }),
    ...(filtro.search && { search: filtro.search }),
    ...(filtro.conciliado !== undefined && { conciliado: filtro.conciliado }),
  }

  const { data: resumen } = useQuery({
    queryKey: ['erp-banco', 'resumen', params],
    queryFn: () => api.get('/erp/banco/movimientos/resumen', { params }).then((r) => r.data),
    staleTime: 30000,
  })
  const { data: movimientos, isLoading } = useQuery({
    queryKey: ['erp-banco', 'movimientos', params],
    queryFn: () => api.get('/erp/banco/movimientos', { params }).then((r) => r.data),
    staleTime: 30000,
  })

  const columns = [
    { title: 'Fecha', key: 'fecha', width: 90, render: (_, m) => <Text style={{ fontSize: 12, whiteSpace: 'nowrap', ...NUM }}>{fecha(m.fecha)}</Text> },
    {
      title: 'Glosa', key: 'glosa',
      render: (_, m) => {
        const contraparte = m.contacto
          ? `${m.contacto.nombre || ''} ${m.contacto.apellido || ''}`.trim()
          : m.proveedor?.razonSocial || null
        return (
          <div>
            <Text style={{ fontSize: 13 }} ellipsis={{ tooltip: m.glosa }}>{m.glosa}</Text>
            {contraparte && <div><Text type="secondary" style={{ fontSize: 11 }}>{contraparte}</Text></div>}
          </div>
        )
      },
    },
    {
      title: 'Cuenta de gasto', key: 'cuenta', width: 150,
      render: (_, m) => m.cuentaGasto ? <Tag color="blue">{m.cuentaGasto.nombre}</Tag> : <Text type="secondary">—</Text>,
    },
    {
      title: 'Estado', key: 'estado', width: 110,
      render: (_, m) =>
        m.ignorado ? <Tag>Ignorado</Tag>
          : m.conciliado ? <Tag color="green">Conciliado</Tag>
          : m.conciliaciones?.length ? <Tag color="blue">Parcial</Tag>
          : <Tag color="orange">Pendiente</Tag>,
    },
    { title: 'Monto', key: 'monto', align: 'right', width: 130, render: (_, m) => <Monto valor={m.monto} /> },
  ]

  return (
    <>
      <Space wrap style={{ marginBottom: 12, width: '100%', justifyContent: 'space-between' }}>
        <Space wrap>
          <Input.Search
            placeholder="Buscar en glosa o documento…"
            allowClear
            style={{ width: 240 }}
            onSearch={(v) => setFiltro((f) => ({ ...f, search: v }))}
          />
          <Select
            placeholder="Tipo" allowClear style={{ width: 110 }}
            options={[{ value: 'abono', label: 'Abonos' }, { value: 'cargo', label: 'Cargos' }]}
            onChange={(v) => setFiltro((f) => ({ ...f, tipo: v }))}
          />
          <Select
            placeholder="Estado" allowClear style={{ width: 140 }}
            options={[{ value: 'false', label: 'Sin conciliar' }, { value: 'true', label: 'Conciliados' }]}
            onChange={(v) => setFiltro((f) => ({ ...f, conciliado: v }))}
          />
        </Space>
        {resumen && (
          <Space size="middle">
            <Text style={{ fontSize: 12 }}><Text strong style={{ color: VERDE, ...NUM }}>{clp(resumen.abonos.monto)}</Text> en {resumen.abonos.cantidad} abonos</Text>
            <Text style={{ fontSize: 12 }}><Text strong style={{ color: ROJO, ...NUM }}>{clp(resumen.cargos.monto)}</Text> en {resumen.cargos.cantidad} cargos</Text>
            <Tag color={resumen.sinConciliar ? 'orange' : 'green'}>{resumen.sinConciliar} sin conciliar</Tag>
          </Space>
        )}
      </Space>

      <Table
        dataSource={movimientos || []}
        columns={columns}
        rowKey="id"
        size="small"
        loading={isLoading}
        pagination={{ pageSize: 50, showSizeChanger: false, showTotal: (t) => `${t} movimientos` }}
        locale={{ emptyText: 'Sin movimientos con esos filtros. Los movimientos entran solo por cartola.' }}
      />
    </>
  )
}

function Cargas() {
  const { data: cargas, isLoading } = useQuery({
    queryKey: ['erp-banco', 'cargas'],
    queryFn: () => api.get('/erp/banco/cargas').then((r) => r.data),
    staleTime: 30000,
  })

  const columns = [
    { title: 'Fecha carga', key: 'fecha', render: (_, c) => <Text style={{ fontSize: 12, ...NUM }}>{fecha(c.creadoEn)}</Text> },
    {
      title: 'Origen', key: 'origen',
      render: (_, c) => <Tag color={c.origen === 'SCRAPER' ? 'blue' : 'default'}>{c.origen === 'SCRAPER' ? 'Scraper' : c.origen === 'LIBRO_BANCO' ? 'Libro banco' : 'Manual'}</Tag>,
    },
    { title: 'Rango', key: 'rango', render: (_, c) => <Text style={{ fontSize: 12, ...NUM }}>{c.desde || c.hasta ? `${fecha(c.desde)} → ${fecha(c.hasta)}` : '—'}</Text> },
    { title: 'Leídos', dataIndex: 'totalLeidos', align: 'right' },
    { title: 'Nuevos', dataIndex: 'totalNuevos', align: 'right', render: (v) => <Text strong>{v}</Text> },
    { title: 'Repetidos', dataIndex: 'totalRepetidos', align: 'right', render: (v) => <Text type="secondary">{v}</Text> },
    {
      title: 'Cuadre', key: 'cuadre',
      render: (_, c) => c.cuadra == null ? <Tag>s/ totales</Tag> : c.cuadra ? <Tag color="green">Cuadra</Tag> : <Tag color="red">No cuadra</Tag>,
    },
    { title: 'Subida por', key: 'por', render: (_, c) => <Text type="secondary" style={{ fontSize: 12 }}>{c.subidoPor ? c.subidoPor.nombre : 'Scraper'}</Text> },
  ]

  return (
    <Table
      dataSource={cargas || []}
      columns={columns}
      rowKey="id"
      size="small"
      loading={isLoading}
      pagination={false}
      locale={{ emptyText: 'Todavía no se carga ninguna cartola.' }}
    />
  )
}

export default function Banco() {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <Title level={4} style={{ margin: 0 }}>Banco</Title>
        <BotonSubirCartola />
      </div>
      <Card styles={{ body: { paddingTop: 8 } }}>
        <Tabs
          items={[
            { key: 'movimientos', label: 'Movimientos', children: <Movimientos /> },
            { key: 'cargas', label: 'Cargas de cartola', children: <Cargas /> },
          ]}
        />
      </Card>
    </div>
  )
}
