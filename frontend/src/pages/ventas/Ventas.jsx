import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Card, Table, Tag, Select, Input, Button, Typography, Row, Col,
  Statistic, Space, DatePicker, InputNumber, Switch, Collapse
} from 'antd'
import { FilterOutlined } from '@ant-design/icons'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import api from '../../services/api'
import { useUF } from '../../hooks/useUF'
import { ESTADO_VENTA_COLOR } from '../../components/ui'

const { Title, Text } = Typography
const { RangePicker } = DatePicker

const ESTADO_LABEL = {
  RESERVA: 'Reserva', PROMESA: 'Promesa',
  ESCRITURA: 'Escritura', ENTREGADO: 'Entregado', ANULADO: 'Anulado'
}

export default function Ventas() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { formatUF, ufAPesos, formatPesos } = useUF()
  const [estado, setEstado] = useState(searchParams.get('estado') || undefined)
  const [filtros, setFiltros] = useState({})

  const params = {
    ...(estado && { estado }),
    ...(filtros.vendedorId && { vendedorId: filtros.vendedorId }),
    ...(filtros.edificioId && { edificioId: filtros.edificioId }),
    ...(filtros.tipoUnidad && { tipoUnidad: filtros.tipoUnidad }),
    ...(filtros.precioMin && { precioMin: filtros.precioMin }),
    ...(filtros.precioMax && { precioMax: filtros.precioMax }),
    ...(filtros.desde && { desde: filtros.desde }),
    ...(filtros.hasta && { hasta: filtros.hasta }),
    ...(filtros.conDescuento && { conDescuento: 'true' }),
    ...(filtros.search && { search: filtros.search }),
  }

  const { data: ventas = [], isLoading } = useQuery({
    queryKey: ['ventas', params],
    queryFn: () => api.get('/ventas', { params }).then(r => r.data)
  })

  const { data: vendedores = [] } = useQuery({
    queryKey: ['usuarios-vendedores'],
    queryFn: () => api.get('/usuarios').then(r => r.data.filter(u => ['VENDEDOR','BROKER_EXTERNO','JEFE_VENTAS'].includes(u.rol)))
  })

  const { data: edificios = [] } = useQuery({
    queryKey: ['edificios-lista'],
    queryFn: () => api.get('/edificios').then(r => r.data)
  })

  const totales = ventas.reduce((acc, v) => {
    acc[v.estado] = (acc[v.estado] || 0) + 1
    acc[`${v.estado}_unidades`] = (acc[`${v.estado}_unidades`] || 0) + (v.unidades?.length || 0)
    return acc
  }, {})

  const filtrosActivos = Object.values(filtros).filter(v => v !== undefined && v !== '' && v !== null && v !== false).length

  const columns = [
    {
      title: 'Comprador', key: 'comprador',
      render: (_, v) => (
        <div>
          <div style={{ fontWeight: 500 }}>{v.comprador?.nombre} {v.comprador?.apellido}</div>
          {v.comprador?.rut && <div style={{ fontSize: 12, color: '#8c8c8c' }}>{v.comprador.rut}</div>}
          {v.comprador?.empresa && <div style={{ fontSize: 12, color: '#8c8c8c' }}>{v.comprador.empresa}</div>}
        </div>
      )
    },
    {
      title: 'Unidad(es)', key: 'unidades',
      render: (_, v) => {
        const us = v.unidades || []
        if (us.length === 0) return <span style={{ color: '#8c8c8c' }}>—</span>
        return (
          <div>
            <div>{us[0]?.edificio?.nombre}</div>
            <div style={{ fontSize: 12, color: '#8c8c8c' }}>
              {us.map(u => `${u.tipo === 'BODEGA' ? 'Bodega' : 'Est.'} ${u.numero}`).join(', ')}
            </div>
          </div>
        )
      }
    },
    {
      title: 'Vendedor', key: 'vendedor',
      render: (_, v) => (
        <div>
          <div>{v.vendedor ? `${v.vendedor.nombre} ${v.vendedor.apellido}` : '-'}</div>
          {v.broker && <div style={{ fontSize: 12, color: '#8c8c8c' }}>Broker: {v.broker.nombre}</div>}
        </div>
      )
    },
    {
      title: 'Precio final', key: 'precio',
      render: (_, v) => (
        <div>
          <div style={{ fontWeight: 600 }}>{formatUF(v.precioFinalUF)}</div>
          <div style={{ fontSize: 12, color: '#8c8c8c' }}>{formatPesos(ufAPesos(v.precioFinalUF))}</div>
          {(v.descuentoAprobadoUF > 0 || v.descuentoPacksUF > 0) && (
            <div style={{ fontSize: 12, color: '#52c41a' }}>
              Dcto: {((v.descuentoAprobadoUF || 0) + (v.descuentoPacksUF || 0)).toFixed(2)} UF
            </div>
          )}
        </div>
      )
    },
    {
      title: 'Estado', dataIndex: 'estado', key: 'estado',
      render: (e) => <Tag color={ESTADO_VENTA_COLOR[e]}>{ESTADO_LABEL[e]}</Tag>
    },
    {
      title: 'Fecha reserva', dataIndex: 'fechaReserva', key: 'fecha',
      render: (d) => d ? <span style={{ fontSize: 12, color: '#8c8c8c' }}>{format(new Date(d), 'd MMM yyyy', { locale: es })}</span> : '—'
    },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>Ventas</Title>
          <Text type="secondary" style={{ fontSize: 13 }}>{ventas.length} ventas encontradas</Text>
        </div>
      </div>

      {/* Resumen por estado */}
      <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
        {['RESERVA','PROMESA','ESCRITURA','ENTREGADO','ANULADO'].map(est => (
          <Col key={est} xs={12} sm={8} md={5}>
            <Card
              size="small"
              hoverable
              onClick={() => setEstado(estado === est ? undefined : est)}
              style={{
                cursor: 'pointer',
                borderColor: estado === est ? '#1677ff' : undefined,
                background: estado === est ? '#e6f4ff' : undefined,
              }}
            >
              <Statistic
                value={totales[est] || 0}
                valueStyle={{ fontSize: 22, fontWeight: 700 }}
                suffix={<Tag color={ESTADO_VENTA_COLOR[est]} style={{ marginLeft: 4 }}>{ESTADO_LABEL[est]}</Tag>}
              />
              {totales[`${est}_unidades`] > 0 && (
                <div style={{ fontSize: 11, color: '#8c8c8c', marginTop: 2 }}>
                  {totales[`${est}_unidades`]} unidad{totales[`${est}_unidades`] !== 1 ? 'es' : ''}
                </div>
              )}
            </Card>
          </Col>
        ))}
      </Row>

      {/* Filtros expandibles */}
      <Collapse
        size="small"
        style={{ marginBottom: 16 }}
        items={[{
          key: '1',
          label: (
            <Space>
              <FilterOutlined />
              <span>Filtros</span>
              {filtrosActivos > 0 && (
                <Tag color="blue" style={{ fontSize: 11 }}>{filtrosActivos} activo{filtrosActivos > 1 ? 's' : ''}</Tag>
              )}
            </Space>
          ),
          children: (
            <Row gutter={[12, 8]}>
              <Col xs={24} sm={12} md={8}>
                <Input.Search
                  placeholder="Buscar comprador, RUT..."
                  value={filtros.search || ''}
                  onChange={e => setFiltros(f => ({ ...f, search: e.target.value || undefined }))}
                  allowClear size="small"
                />
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Select
                  placeholder="Vendedor"
                  value={filtros.vendedorId}
                  onChange={v => setFiltros(f => ({ ...f, vendedorId: v }))}
                  allowClear size="small" style={{ width: '100%' }}
                  options={vendedores.map(v => ({ value: v.id, label: `${v.nombre} ${v.apellido}` }))}
                />
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Select
                  placeholder="Edificio"
                  value={filtros.edificioId}
                  onChange={v => setFiltros(f => ({ ...f, edificioId: v }))}
                  allowClear size="small" style={{ width: '100%' }}
                  options={edificios.map(e => ({ value: e.id, label: e.nombre }))}
                />
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Select
                  placeholder="Tipo de unidad"
                  value={filtros.tipoUnidad}
                  onChange={v => setFiltros(f => ({ ...f, tipoUnidad: v }))}
                  allowClear size="small" style={{ width: '100%' }}
                  options={[{ value: 'BODEGA', label: 'Bodega' }, { value: 'ESTACIONAMIENTO', label: 'Estacionamiento' }]}
                />
              </Col>
              <Col xs={12} sm={8} md={5}>
                <InputNumber
                  placeholder="Precio mín (UF)"
                  value={filtros.precioMin}
                  onChange={v => setFiltros(f => ({ ...f, precioMin: v || undefined }))}
                  min={0} size="small" style={{ width: '100%' }}
                />
              </Col>
              <Col xs={12} sm={8} md={5}>
                <InputNumber
                  placeholder="Precio máx (UF)"
                  value={filtros.precioMax}
                  onChange={v => setFiltros(f => ({ ...f, precioMax: v || undefined }))}
                  min={0} size="small" style={{ width: '100%' }}
                />
              </Col>
              <Col xs={24} sm={12} md={10}>
                <RangePicker
                  placeholder={['Fecha desde', 'Fecha hasta']}
                  size="small" style={{ width: '100%' }}
                  value={filtros._rango || null}
                  onChange={(dates) => setFiltros(f => ({
                    ...f,
                    _rango: dates,
                    desde: dates?.[0]?.toISOString(),
                    hasta: dates?.[1]?.toISOString()
                  }))}
                />
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Space>
                  <Switch
                    size="small"
                    checked={!!filtros.conDescuento}
                    onChange={v => setFiltros(f => ({ ...f, conDescuento: v || undefined }))}
                  />
                  <Text style={{ fontSize: 13 }}>Solo con descuento</Text>
                </Space>
              </Col>
              {filtrosActivos > 0 && (
                <Col xs={24}>
                  <Button size="small" onClick={() => setFiltros({})}>Limpiar filtros</Button>
                </Col>
              )}
            </Row>
          )
        }]}
      />

      <Table
        dataSource={ventas}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        onRow={(v) => ({ onClick: () => navigate(`/ventas/${v.id}`), style: { cursor: 'pointer' } })}
        size="small"
        locale={{ emptyText: 'Sin ventas que mostrar' }}
      />
    </div>
  )
}
