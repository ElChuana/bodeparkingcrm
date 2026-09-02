/**
 * Panel financiero: ¿cuánta plata hay? ¿cuánto me deben? ¿cómo viene el mes?
 * ¿qué espera una decisión mía? Todo calculado en el backend, nada guardado.
 */
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Card, Row, Col, Statistic, Typography, Progress, List, Tag, Alert, Empty, Spin, Badge } from 'antd'
import { BankOutlined, ArrowUpOutlined, ArrowDownOutlined, TeamOutlined, CalendarOutlined } from '@ant-design/icons'
import api from '../../services/api'
import { clp, fecha, VERDE, ROJO, AMBAR, NUM } from '../ui'

const { Title, Text } = Typography

function BarraPresupuesto({ cuenta }) {
  const usado = cuenta.ejecutado + cuenta.comprometido
  const pct = cuenta.presupuesto > 0 ? Math.round((usado / cuenta.presupuesto) * 100) : null
  const color = pct == null ? '#94a3b8' : pct > 100 ? ROJO : pct >= 85 ? '#faad14' : '#52c41a'
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
        <Text style={{ fontSize: 13 }}>{cuenta.nombre}</Text>
        <Text type="secondary" style={{ fontSize: 12, ...NUM, whiteSpace: 'nowrap' }}>
          {clp(usado)}{cuenta.presupuesto > 0 ? ` / ${clp(cuenta.presupuesto)}` : ''}
        </Text>
      </div>
      <Progress
        percent={pct == null ? (usado > 0 ? 100 : 0) : Math.min(pct, 100)}
        showInfo={pct != null}
        format={() => `${pct}%`}
        strokeColor={color}
        size="small"
      />
    </div>
  )
}

export default function Panel() {
  const { data, isLoading } = useQuery({
    queryKey: ['erp-dashboard'],
    queryFn: () => api.get('/erp/dashboard').then((r) => r.data),
    staleTime: 60000,
  })

  if (isLoading || !data) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Spin size="large" /></div>
  }

  const { caja, cxc, proximos30, provisiones, presupuestoMes, pendientes, salud } = data
  const cuentasConMovimiento = (presupuestoMes?.cuentas || []).filter((c) => c.presupuesto > 0 || c.ejecutado > 0 || c.comprometido > 0)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 20 }}>
        <Title level={4} style={{ margin: 0 }}>Panel financiero</Title>
        <Text type="secondary" style={{ fontSize: 12 }}>
          {caja.saldoAl ? `Banco al ${fecha(caja.saldoAl)}` : 'Sin cartola cargada'}
        </Text>
      </div>

      {salud.errores > 0 && (
        <Alert
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
          message={`${salud.errores} error${salud.errores === 1 ? '' : 'es'} en los datos — las cifras no son confiables hasta revisarlos.`}
        />
      )}

      {/* Las cifras que mandan */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={12} lg={5}>
          <Card>
            <Statistic title="Saldo banco" value={caja.saldo ?? '—'} formatter={(v) => (typeof v === 'number' ? clp(v) : v)}
              prefix={<BankOutlined />} valueStyle={{ color: '#0083b0', ...NUM }} />
            <Text type="secondary" style={{ fontSize: 11 }}>{caja.cuentas} cuenta{caja.cuentas === 1 ? '' : 's'}</Text>
          </Card>
        </Col>
        <Col xs={12} sm={12} lg={5}>
          <Card>
            <Statistic title="Entradas del mes" value={caja.entradasMes} formatter={clp}
              prefix={<ArrowUpOutlined />} valueStyle={{ color: VERDE, ...NUM }} />
          </Card>
        </Col>
        <Col xs={12} sm={12} lg={5}>
          <Card>
            <Statistic title="Salidas del mes" value={caja.salidasMes} formatter={clp}
              prefix={<ArrowDownOutlined />} valueStyle={{ color: ROJO, ...NUM }} />
          </Card>
        </Col>
        <Col xs={12} sm={12} lg={4}>
          <Card>
            <Statistic title="Por cobrar (cuotas)" value={cxc.total} formatter={clp}
              prefix={<TeamOutlined />} valueStyle={{ color: cxc.vencido > 0 ? AMBAR : undefined, ...NUM }} />
            <Text type={cxc.vencido > 0 ? 'danger' : 'secondary'} style={{ fontSize: 11 }}>
              {cxc.vencido > 0 ? `${clp(cxc.vencido)} vencido` : 'nada vencido'}
            </Text>
          </Card>
        </Col>
        <Col xs={24} sm={24} lg={5}>
          <Card>
            <Statistic title="Próximos 30 días" value={proximos30.neto} formatter={clp}
              prefix={<CalendarOutlined />} valueStyle={{ color: proximos30.neto >= 0 ? VERDE : ROJO, ...NUM }} />
            <Text type="secondary" style={{ fontSize: 11, ...NUM }}>
              {clp(proximos30.porCobrar)} entra · {clp(proximos30.porPagar)} sale
            </Text>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        {/* Presupuesto del mes */}
        <Col xs={24} lg={8}>
          <Card
            title="Presupuesto del mes"
            extra={<Link to="/erp/presupuesto" style={{ fontSize: 12 }}>Ver todo</Link>}
            styles={{ body: { paddingTop: 12 } }}
          >
            {cuentasConMovimiento.length
              ? cuentasConMovimiento.map((c) => <BarraPresupuesto key={c.id} cuenta={c} />)
              : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={<span>Sin presupuesto este mes. <Link to="/erp/presupuesto">Cárgalo acá</Link>.</span>} />}
          </Card>
        </Col>

        {/* No te han facturado */}
        <Col xs={24} lg={8}>
          <Card
            title={<span>¿No te han facturado? {provisiones.vencidasSinFactura > 0 && <Badge count={provisiones.vencidasSinFactura} color="orange" />}</span>}
            extra={<Link to="/erp/documentos?estado=VENCIDO_SIN_FACTURA" style={{ fontSize: 12 }}>Ver</Link>}
          >
            {provisiones.vencidasSinFactura === 0 ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Ninguna provisión vencida sin factura." />
            ) : (
              <>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {clp(provisiones.montoSinFactura)} en gastos cuya fecha pasó y la factura no llega:
                </Text>
                <List
                  size="small"
                  dataSource={provisiones.detalle}
                  renderItem={(p) => (
                    <List.Item style={{ padding: '6px 0' }}>
                      <Text style={{ fontSize: 13, flex: 1 }} ellipsis>
                        {p.concepto}{p.proveedor ? <Text type="secondary"> · {p.proveedor}</Text> : ''}
                      </Text>
                      <Text strong style={{ color: AMBAR, ...NUM }}>{clp(p.monto)}</Text>
                    </List.Item>
                  )}
                />
              </>
            )}
          </Card>
        </Col>

        {/* Espera una decisión tuya */}
        <Col xs={24} lg={8}>
          <Card title="Espera una decisión tuya">
            <Link to="/erp/conciliacion?lado=abonos" style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
              <span style={{ fontSize: 13 }}>Abonos sin imputar <Tag color="blue">{pendientes.abonosSinImputar.cantidad}</Tag></span>
              <Text strong style={{ color: VERDE, ...NUM }}>{clp(pendientes.abonosSinImputar.monto)}</Text>
            </Link>
            <Link to="/erp/conciliacion?lado=cargos" style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
              <span style={{ fontSize: 13 }}>Cargos sin documento <Tag color="orange">{pendientes.cargosSinDocumento.cantidad}</Tag></span>
              <Text strong style={{ color: ROJO, ...NUM }}>−{clp(pendientes.cargosSinDocumento.monto)}</Text>
            </Link>

            {cxc.peores.length > 0 && (
              <>
                <div style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, margin: '10px 0 4px' }}>
                  A quién llamar
                </div>
                {cxc.peores.map((c) => (
                  <Link key={c.contactoId} to="/erp/cartera" style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
                    <Text style={{ fontSize: 13 }} ellipsis>{c.nombre} <Text type="secondary">· {c.diasMax} días</Text></Text>
                    <Text strong style={{ color: ROJO, ...NUM }}>{clp(c.vencido || c.total)}</Text>
                  </Link>
                ))}
              </>
            )}

            <div style={{ borderTop: '1px solid #f0f0f0', marginTop: 10, paddingTop: 8 }}>
              {salud.errores > 0
                ? <Text type="danger" style={{ fontSize: 12 }}>⚠ {salud.errores} error(es) en los datos</Text>
                : <Text type="secondary" style={{ fontSize: 12 }}>✓ Datos sanos{salud.avisos > 0 ? ` · ${salud.avisos} aviso${salud.avisos === 1 ? '' : 's'}` : ''}</Text>}
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  )
}
