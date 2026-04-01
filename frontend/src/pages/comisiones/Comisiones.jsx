import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Table, Tag, Button, Typography, Row, Col, Card, Statistic, Select, Space, App } from 'antd'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'

const { Title, Text } = Typography

export default function Comisiones() {
  const { usuario, esGerenciaOJV } = useAuth()
  const [vendedorFiltro, setVendedorFiltro] = useState(undefined)
  const [estadoFiltro, setEstadoFiltro] = useState(undefined)
  const qc = useQueryClient()
  const { message } = App.useApp()

  const { data: comisiones = [], isLoading } = useQuery({
    queryKey: ['comisiones', vendedorFiltro, estadoFiltro],
    queryFn: () => api.get('/comisiones', { params: { usuarioId: vendedorFiltro, estado: estadoFiltro } }).then(r => r.data)
  })

  const { data: resumen } = useQuery({
    queryKey: ['comisiones-resumen'],
    queryFn: () => api.get('/comisiones/resumen').then(r => r.data),
    enabled: esGerenciaOJV
  })

  const { data: vendedores = [] } = useQuery({
    queryKey: ['usuarios-vendedores'],
    queryFn: () => api.get('/usuarios').then(r => r.data.filter(u =>
      ['VENDEDOR', 'BROKER_EXTERNO', 'JEFE_VENTAS'].includes(u.rol)
    )),
    enabled: esGerenciaOJV
  })

  const marcar = useMutation({
    mutationFn: ({ id, tramo }) => api.put(`/comisiones/${id}/${tramo}`, {}),
    onSuccess: () => { message.success('Comisión actualizada'); qc.invalidateQueries(['comisiones']) },
    onError: err => message.error(err.response?.data?.error || 'Error')
  })

  const columns = [
    {
      title: 'Vendedor', key: 'vendedor',
      render: (_, c) => <Text strong>{c.usuario?.nombre} {c.usuario?.apellido}</Text>
    },
    {
      title: 'Venta', key: 'venta',
      render: (_, c) => (
        <div>
          <Text style={{ fontSize: 13 }}>
            {c.venta?.comprador?.nombre} {c.venta?.comprador?.apellido}
          </Text>
          <div><Text type="secondary" style={{ fontSize: 12 }}>
            {c.venta?.unidad?.edificio?.nombre} — {c.venta?.unidad?.numero}
          </Text></div>
        </div>
      )
    },
    {
      title: 'Total', key: 'total',
      render: (_, c) => (
        <Text strong>{c.montoCalculadoUF?.toFixed(2)} UF</Text>
      )
    },
    {
      title: '1ª mitad (promesa)', key: 'primera',
      render: (_, c) => (
        <div>
          <Tag color={c.estadoPrimera === 'PAGADO' ? 'green' : 'orange'}>{c.estadoPrimera?.toLowerCase()}</Tag>
          <div style={{ fontSize: 12 }}>{c.montoPrimera?.toFixed(2)} UF</div>
          {esGerenciaOJV && c.estadoPrimera === 'PENDIENTE' && (
            <Button type="link" size="small" onClick={() => marcar.mutate({ id: c.id, tramo: 'primera' })}>
              Marcar pagada
            </Button>
          )}
        </div>
      )
    },
    {
      title: '2ª mitad (escritura)', key: 'segunda',
      render: (_, c) => (
        <div>
          <Tag color={c.estadoSegunda === 'PAGADO' ? 'green' : 'orange'}>{c.estadoSegunda?.toLowerCase()}</Tag>
          <div style={{ fontSize: 12 }}>{c.montoSegunda?.toFixed(2)} UF</div>
          {esGerenciaOJV && c.estadoSegunda === 'PENDIENTE' && (
            <Button type="link" size="small" onClick={() => marcar.mutate({ id: c.id, tramo: 'segunda' })}>
              Marcar pagada
            </Button>
          )}
        </div>
      )
    },
  ]

  return (
    <div>
      <Title level={4} style={{ marginBottom: 20 }}>Comisiones</Title>

      {esGerenciaOJV && resumen && (
        <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
          <Col xs={12} sm={8}>
            <Card><Statistic title="Total pendiente" value={`${resumen.totalPendienteUF?.toFixed(2) || 0} UF`} /></Card>
          </Col>
          <Col xs={12} sm={8}>
            <Card><Statistic title="Total pagado" value={`${resumen.totalPagadoUF?.toFixed(2) || 0} UF`} valueStyle={{ color: '#52c41a' }} /></Card>
          </Col>
        </Row>
      )}

      <Space style={{ marginBottom: 16, flexWrap: 'wrap' }}>
        {esGerenciaOJV && (
          <Select
            placeholder="Todos los vendedores"
            value={vendedorFiltro}
            onChange={setVendedorFiltro}
            allowClear
            style={{ width: 200 }}
            options={vendedores.map(v => ({ value: v.id, label: `${v.nombre} ${v.apellido}` }))}
          />
        )}
        <Select
          placeholder="Todos los estados"
          value={estadoFiltro}
          onChange={setEstadoFiltro}
          allowClear
          style={{ width: 180 }}
          options={[
            { value: 'PENDIENTE', label: 'Pendiente' },
            { value: 'PAGADO', label: 'Pagado' },
          ]}
        />
      </Space>

      <Table
        dataSource={comisiones}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        size="small"
        locale={{ emptyText: 'Sin comisiones' }}
      />
    </div>
  )
}
