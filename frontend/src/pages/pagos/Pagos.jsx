import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Table, Tag, Button, Typography, Card, Row, Col, Statistic, App } from 'antd'
import { ExclamationCircleOutlined } from '@ant-design/icons'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import api from '../../services/api'
import { useUF } from '../../hooks/useUF'

const { Title, Text } = Typography

export default function Pagos() {
  const { formatUF, formatPesos, ufAPesos } = useUF()
  const qc = useQueryClient()
  const { message } = App.useApp()

  const { data: atrasados = [], isLoading } = useQuery({
    queryKey: ['pagos-atrasados'],
    queryFn: () => api.get('/pagos/atrasados').then(r => r.data)
  })

  const marcarPagado = useMutation({
    mutationFn: ({ cuotaId }) => api.put(`/pagos/cuotas/${cuotaId}/pagar`, { metodoPago: 'TRANSFERENCIA' }),
    onSuccess: () => { message.success('Pago registrado'); qc.invalidateQueries(['pagos-atrasados']) },
    onError: err => message.error(err.response?.data?.error || 'Error')
  })

  const TIPO_LABEL = { RESERVA: 'Reserva', PIE: 'Pie', CUOTA: 'Cuota', ESCRITURA: 'Escritura' }

  const columns = [
    {
      title: 'Comprador', key: 'comprador',
      render: (_, c) => (
        <div>
          <Text strong style={{ fontSize: 13 }}>
            {c.planPago?.venta?.comprador?.nombre} {c.planPago?.venta?.comprador?.apellido}
          </Text>
          <div><Text type="secondary" style={{ fontSize: 12 }}>
            {c.planPago?.venta?.unidad?.edificio?.nombre} — {c.planPago?.venta?.unidad?.numero}
          </Text></div>
        </div>
      )
    },
    {
      title: 'Cuota', key: 'cuota',
      render: (_, c) => <Text style={{ fontSize: 13 }}>{TIPO_LABEL[c.tipo]} #{c.numeroCuota}</Text>
    },
    {
      title: 'Vencimiento', dataIndex: 'fechaVencimiento', key: 'fecha',
      render: (d) => (
        <Tag color="red" style={{ fontSize: 12 }}>
          {format(new Date(d), 'd MMM yyyy', { locale: es })}
        </Tag>
      )
    },
    {
      title: 'Monto', key: 'monto',
      render: (_, c) => (
        <div>
          {c.montoUF && <div style={{ fontWeight: 600 }}>{formatUF(c.montoUF)}</div>}
          {c.montoCLP && <div style={{ fontSize: 12, color: '#8c8c8c' }}>{formatPesos(c.montoCLP)}</div>}
        </div>
      )
    },
    {
      title: 'Vendedor', key: 'vendedor',
      render: (_, c) => {
        const v = c.planPago?.venta?.vendedor
        return v ? `${v.nombre} ${v.apellido}` : '-'
      }
    },
    {
      title: '', key: 'accion',
      render: (_, c) => (
        <Button type="primary" size="small" danger
          onClick={() => marcarPagado.mutate({ cuotaId: c.id })}
          loading={marcarPagado.isPending}>
          Marcar pagado
        </Button>
      )
    },
  ]

  return (
    <div>
      <Title level={4} style={{ marginBottom: 20 }}>Pagos Atrasados</Title>

      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Cuotas atrasadas"
              value={atrasados.length}
              prefix={<ExclamationCircleOutlined />}
              valueStyle={{ color: atrasados.length > 0 ? '#ff4d4f' : '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      <Table
        dataSource={atrasados}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        size="small"
        locale={{ emptyText: '✓ Sin cuotas atrasadas' }}
      />
    </div>
  )
}
