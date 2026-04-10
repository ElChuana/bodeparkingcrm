import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, Table, Tag, Typography, Tabs, Statistic, Row, Col, Space, Spin, Button, DatePicker, App } from 'antd'
import { FileExcelOutlined, FilePdfOutlined } from '@ant-design/icons'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { PDFDownloadLink } from '@react-pdf/renderer'
import * as XLSX from 'xlsx'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import api from '../../services/api'
import { useUF } from '../../hooks/useUF'
import { ETAPA_LABEL, ESTADO_VENTA_COLOR } from '../../components/ui'
import { PDFVentas, PDFLeads, PDFInventario, PDFComisiones, PDFPagosAtrasados } from './ReportesPDF'

const { Title, Text } = Typography
const { RangePicker } = DatePicker

const ESTADO_LABEL = { RESERVA: 'Reserva', PROMESA: 'Promesa', ESCRITURA: 'Escritura', ENTREGADO: 'Entregado', ANULADO: 'Anulado' }
const ORIGEN_LABEL = { INSTAGRAM: 'Instagram', GOOGLE: 'Google', REFERIDO: 'Referido', BROKER: 'Broker', VISITA_DIRECTA: 'Visita directa', WEB: 'Web', META: 'Meta', ORIGEN: 'Origen', OTRO: 'Otro' }
const ROL_LABEL = { GERENTE: 'Gerente', JEFE_VENTAS: 'Jefe de Ventas', VENDEDOR: 'Vendedor', BROKER_EXTERNO: 'Broker', ABOGADO: 'Abogado' }
const COLORS = ['#1677ff', '#52c41a', '#faad14', '#ff4d4f', '#722ed1', '#13c2c2']

const fmt = (date) => date ? format(new Date(date), 'd MMM yyyy', { locale: es }) : '—'
const fmtUF = (n) => n != null ? `${Number(n).toFixed(2)} UF` : '—'

// ─── Botón Excel genérico ─────────────────────────────────────────────
function BtnExcel({ nombre, sheets }) {
  const exportar = () => {
    const wb = XLSX.utils.book_new()
    sheets.forEach(({ nombre: sNombre, columnas, filas }) => {
      const ws = XLSX.utils.json_to_sheet(
        filas.map(f => Object.fromEntries(columnas.map(c => [c.label, f[c.key] ?? ''])))
      )
      // Ancho de columnas
      ws['!cols'] = columnas.map(c => ({ wch: c.width || 18 }))
      XLSX.utils.book_append_sheet(wb, ws, sNombre)
    })
    XLSX.writeFile(wb, `${nombre} - ${format(new Date(), 'yyyy-MM-dd')}.xlsx`)
  }

  return (
    <Button icon={<FileExcelOutlined />} onClick={exportar} style={{ color: '#217346', borderColor: '#217346' }}>
      Excel
    </Button>
  )
}

// ─── Botón PDF genérico ───────────────────────────────────────────────
function BtnPDF({ documento, nombre }) {
  return (
    <PDFDownloadLink document={documento} fileName={`${nombre} - ${format(new Date(), 'yyyy-MM-dd')}.pdf`}>
      {({ loading }) => (
        <Button icon={<FilePdfOutlined />} loading={loading} danger>
          PDF
        </Button>
      )}
    </PDFDownloadLink>
  )
}

// ─── VENTAS ──────────────────────────────────────────────────────────
function ReporteVentas() {
  const { formatUF } = useUF()
  const [rango, setRango] = useState(null)

  const params = {}
  if (rango?.[0]) params.desde = rango[0].toISOString()
  if (rango?.[1]) params.hasta = rango[1].toISOString()

  const { data: raw, isLoading } = useQuery({
    queryKey: ['reporte-ventas', params],
    queryFn: () => api.get('/reportes/ventas', { params }).then(r => r.data)
  })

  const { total = 0, totalUF = 0, porEstado = {}, detalle = [] } = raw || {}
  const pieData = Object.entries(porEstado).map(([estado, value]) => ({ name: ESTADO_LABEL[estado] || estado, value }))

  const columns = [
    { title: 'Comprador', key: 'c', render: (_, v) => `${v.comprador?.nombre} ${v.comprador?.apellido}` },
    { title: 'Unidad', key: 'u', render: (_, v) => `${v.unidad?.edificio?.nombre} — ${v.unidad?.numero}` },
    { title: 'Precio (UF)', key: 'p', render: (_, v) => fmtUF(v.precioUF - (v.descuentoUF || 0)) },
    { title: 'Estado', key: 'e', render: (_, v) => <Tag color={ESTADO_VENTA_COLOR[v.estado]}>{ESTADO_LABEL[v.estado]}</Tag> },
    { title: 'Vendedor', key: 'vend', render: (_, v) => v.vendedor ? `${v.vendedor.nombre} ${v.vendedor.apellido}` : '—' },
    { title: 'Fecha', key: 'f', render: (_, v) => fmt(v.creadoEn) },
  ]

  const excelFilas = detalle.map(v => ({
    comprador: `${v.comprador?.nombre || ''} ${v.comprador?.apellido || ''}`.trim(),
    rut: v.comprador?.rut || '',
    edificio: v.unidad?.edificio?.nombre || '',
    unidad: v.unidad?.numero || '',
    precio: v.precioUF - (v.descuentoUF || 0),
    estado: ESTADO_LABEL[v.estado] || v.estado,
    vendedor: v.vendedor ? `${v.vendedor.nombre} ${v.vendedor.apellido}` : '',
    broker: v.broker ? `${v.broker.nombre} ${v.broker.apellido}` : '',
    fecha: fmt(v.creadoEn),
  }))
  const excelCols = [
    { key: 'comprador', label: 'Comprador' }, { key: 'rut', label: 'RUT', width: 14 },
    { key: 'edificio', label: 'Edificio' }, { key: 'unidad', label: 'Unidad', width: 12 },
    { key: 'precio', label: 'Precio UF', width: 12 }, { key: 'estado', label: 'Estado', width: 12 },
    { key: 'vendedor', label: 'Vendedor' }, { key: 'broker', label: 'Broker' },
    { key: 'fecha', label: 'Fecha', width: 14 },
  ]

  if (isLoading) return <Spin />

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <RangePicker onChange={setRango} placeholder={['Desde', 'Hasta']} />
        <Space>
          <BtnExcel nombre="Reporte Ventas" sheets={[{ nombre: 'Ventas', columnas: excelCols, filas: excelFilas }]} />
          <BtnPDF documento={<PDFVentas data={raw} />} nombre="Reporte Ventas" />
        </Space>
      </div>
      <Row gutter={[12, 12]}>
        <Col xs={12} sm={6}><Card size="small"><Statistic title="Total ventas" value={total} /></Card></Col>
        <Col xs={12} sm={6}><Card size="small"><Statistic title="Monto total" value={`${totalUF.toFixed(2)} UF`} /></Card></Col>
        {Object.entries(porEstado).map(([estado, n]) => (
          <Col key={estado} xs={12} sm={6}>
            <Card size="small">
              <Statistic title={ESTADO_LABEL[estado] || estado} value={n} valueStyle={{ color: ESTADO_VENTA_COLOR[estado] }} />
            </Card>
          </Col>
        ))}
      </Row>
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={10}>
          <Card title="Distribución por estado" size="small">
            <PieChart width={280} height={220}>
              <Pie data={pieData} cx={140} cy={100} outerRadius={80} dataKey="value" label>
                {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Legend /><Tooltip />
            </PieChart>
          </Card>
        </Col>
        <Col xs={24} lg={14}>
          <Card title="Ventas" size="small">
            <Table dataSource={detalle} columns={columns} rowKey="id" size="small" pagination={{ pageSize: 8 }} />
          </Card>
        </Col>
      </Row>
    </Space>
  )
}

// ─── LEADS ───────────────────────────────────────────────────────────
function ReporteLeads() {
  const [rango, setRango] = useState(null)

  const params = {}
  if (rango?.[0]) params.desde = rango[0].toISOString()
  if (rango?.[1]) params.hasta = rango[1].toISOString()

  const { data: raw, isLoading } = useQuery({
    queryKey: ['reporte-leads', params],
    queryFn: () => api.get('/reportes/leads', { params }).then(r => r.data)
  })

  const { total = 0, porEtapa = {}, porOrigen = {}, detalle = [] } = raw || {}

  const chartEtapa = Object.entries(porEtapa).map(([etapa, count]) => ({ etapa: ETAPA_LABEL[etapa] || etapa, count }))
  const chartOrigen = Object.entries(porOrigen).map(([origen, count]) => ({ name: ORIGEN_LABEL[origen] || origen, value: count }))

  const columns = [
    { title: 'Cliente', key: 'c', render: (_, l) => `${l.contacto?.nombre} ${l.contacto?.apellido}` },
    { title: 'Email', key: 'e', render: (_, l) => l.contacto?.email || '—' },
    { title: 'Etapa', key: 'et', render: (_, l) => <Tag>{ETAPA_LABEL[l.etapa] || l.etapa}</Tag> },
    { title: 'Origen', key: 'o', render: (_, l) => ORIGEN_LABEL[l.contacto?.origen] || l.contacto?.origen || '—' },
    { title: 'Vendedor', key: 'v', render: (_, l) => l.vendedor ? `${l.vendedor.nombre} ${l.vendedor.apellido}` : '—' },
    { title: 'Fecha', key: 'f', render: (_, l) => fmt(l.creadoEn) },
  ]

  const excelFilas = detalle.map(l => ({
    nombre: `${l.contacto?.nombre || ''} ${l.contacto?.apellido || ''}`.trim(),
    email: l.contacto?.email || '',
    telefono: l.contacto?.telefono || '',
    etapa: ETAPA_LABEL[l.etapa] || l.etapa,
    origen: ORIGEN_LABEL[l.contacto?.origen] || l.contacto?.origen || '',
    vendedor: l.vendedor ? `${l.vendedor.nombre} ${l.vendedor.apellido}` : '',
    broker: l.broker ? `${l.broker.nombre} ${l.broker.apellido}` : '',
    fecha: fmt(l.creadoEn),
  }))
  const excelCols = [
    { key: 'nombre', label: 'Cliente' }, { key: 'email', label: 'Email', width: 24 },
    { key: 'telefono', label: 'Teléfono', width: 14 }, { key: 'etapa', label: 'Etapa', width: 16 },
    { key: 'origen', label: 'Origen', width: 16 }, { key: 'vendedor', label: 'Vendedor' },
    { key: 'broker', label: 'Broker' }, { key: 'fecha', label: 'Fecha', width: 14 },
  ]

  if (isLoading) return <Spin />

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <RangePicker onChange={setRango} placeholder={['Desde', 'Hasta']} />
        <Space>
          <BtnExcel nombre="Reporte Leads" sheets={[{ nombre: 'Leads', columnas: excelCols, filas: excelFilas }]} />
          <BtnPDF documento={<PDFLeads data={raw} />} nombre="Reporte Leads" />
        </Space>
      </div>
      <Row gutter={[12, 12]}>
        <Col xs={12} sm={6}><Card size="small"><Statistic title="Total leads" value={total} /></Card></Col>
        {Object.entries(porEtapa).map(([etapa, n]) => (
          <Col key={etapa} xs={12} sm={6}>
            <Card size="small"><Statistic title={ETAPA_LABEL[etapa] || etapa} value={n} /></Card>
          </Col>
        ))}
      </Row>
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={10}>
          <Card title="Leads por etapa" size="small">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={chartEtapa} layout="vertical" margin={{ left: 20, right: 20 }}>
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="etapa" width={160} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#1677ff" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} lg={6}>
          <Card title="Por origen" size="small">
            <PieChart width={200} height={200}>
              <Pie data={chartOrigen} cx={100} cy={90} outerRadius={70} dataKey="value" label>
                {chartOrigen.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="Detalle" size="small">
            <Table dataSource={detalle} columns={columns} rowKey="id" size="small" pagination={{ pageSize: 8 }} />
          </Card>
        </Col>
      </Row>
    </Space>
  )
}

// ─── INVENTARIO ──────────────────────────────────────────────────────
function ReporteInventario() {
  const { data: raw, isLoading } = useQuery({
    queryKey: ['reporte-inventario'],
    queryFn: () => api.get('/reportes/inventario').then(r => r.data)
  })

  const { total = 0, porEstado = {}, porTipo = {}, detalle = [] } = raw || {}
  const ESTADO_COLOR = { DISPONIBLE: '#52c41a', RESERVADO: '#faad14', VENDIDO: '#ff4d4f', ARRENDADO: '#1677ff' }

  const chartEstado = Object.entries(porEstado).map(([estado, count]) => ({
    name: estado.toLowerCase(), count, fill: ESTADO_COLOR[estado] || '#ccc'
  }))

  const columns = [
    { title: 'Edificio', key: 'e', render: (_, u) => u.edificio?.nombre || '—' },
    { title: 'N°', dataIndex: 'numero', key: 'n' },
    { title: 'Tipo', dataIndex: 'tipo', key: 't' },
    { title: 'Estado', key: 's', render: (_, u) => <Tag color={ESTADO_COLOR[u.estado]}>{u.estado?.toLowerCase()}</Tag> },
    { title: 'Precio UF', key: 'p', render: (_, u) => fmtUF(u.precioUF) },
  ]

  const excelFilas = detalle.map(u => ({
    edificio: u.edificio?.nombre || '', region: u.edificio?.region || '',
    comuna: u.edificio?.comuna || '', numero: u.numero,
    tipo: u.tipo, estado: u.estado, precio: u.precioUF ?? '',
    superficie: u.superficie ?? '',
  }))
  const excelCols = [
    { key: 'edificio', label: 'Edificio' }, { key: 'region', label: 'Región' },
    { key: 'comuna', label: 'Comuna' }, { key: 'numero', label: 'Número', width: 10 },
    { key: 'tipo', label: 'Tipo', width: 12 }, { key: 'estado', label: 'Estado', width: 12 },
    { key: 'precio', label: 'Precio UF', width: 12 }, { key: 'superficie', label: 'Superficie m²', width: 14 },
  ]

  if (isLoading) return <Spin />

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <BtnExcel nombre="Reporte Inventario" sheets={[{ nombre: 'Inventario', columnas: excelCols, filas: excelFilas }]} />
        <BtnPDF documento={<PDFInventario data={raw} />} nombre="Reporte Inventario" />
      </div>
      <Row gutter={[12, 12]}>
        <Col xs={12} sm={6}><Card size="small"><Statistic title="Total unidades" value={total} /></Card></Col>
        {Object.entries(porEstado).map(([estado, count]) => (
          <Col key={estado} xs={12} sm={6}>
            <Card size="small">
              <Statistic title={estado.toLowerCase()} value={count} valueStyle={{ color: ESTADO_COLOR[estado] }} />
            </Card>
          </Col>
        ))}
      </Row>
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={10}>
          <Card title="Por estado" size="small">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartEstado}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {chartEstado.map((e, i) => <Cell key={i} fill={e.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} lg={14}>
          <Card title="Unidades" size="small">
            <Table dataSource={detalle} columns={columns} rowKey="id" size="small" pagination={{ pageSize: 8 }} />
          </Card>
        </Col>
      </Row>
    </Space>
  )
}

// ─── COMISIONES ──────────────────────────────────────────────────────
function ReporteComisiones() {
  const [rango, setRango] = useState(null)

  const params = {}
  if (rango?.[0]) params.desde = rango[0].toISOString()
  if (rango?.[1]) params.hasta = rango[1].toISOString()

  const { data: raw, isLoading } = useQuery({
    queryKey: ['reporte-comisiones', params],
    queryFn: () => api.get('/reportes/comisiones', { params }).then(r => r.data)
  })

  const { total = 0, totalUF = 0, pendienteUF = 0, pagadoUF = 0, detalle = [] } = raw || {}

  const columns = [
    { title: 'Persona', key: 'p', render: (_, c) => c.usuario ? `${c.usuario.nombre} ${c.usuario.apellido}` : '—' },
    { title: 'Rol', key: 'r', render: (_, c) => ROL_LABEL[c.usuario?.rol] || c.usuario?.rol || '—' },
    { title: 'Concepto', dataIndex: 'concepto', key: 'con', render: v => v || '—' },
    { title: 'Unidad', key: 'u', render: (_, c) => c.venta?.unidades?.[0] ? `${c.venta.unidades[0].edificio?.nombre} — ${c.venta.unidades[0].numero}` : '—' },
    { title: 'Total UF', key: 'total', render: (_, c) => fmtUF(c.montoCalculadoUF) },
    { title: '1ª cuota', key: 'p1', render: (_, c) => fmtUF(c.montoPrimera) },
    { title: 'Est. 1ª', key: 'e1', render: (_, c) => <Tag color={c.estadoPrimera === 'PAGADO' ? 'green' : 'orange'}>{c.estadoPrimera === 'PAGADO' ? 'Pagado' : 'Pendiente'}</Tag> },
    { title: '2ª cuota', key: 'p2', render: (_, c) => fmtUF(c.montoSegunda) },
    { title: 'Est. 2ª', key: 'e2', render: (_, c) => <Tag color={c.estadoSegunda === 'PAGADO' ? 'green' : 'orange'}>{c.estadoSegunda === 'PAGADO' ? 'Pagado' : 'Pendiente'}</Tag> },
  ]

  const excelFilas = detalle.map(c => ({
    persona: c.usuario ? `${c.usuario.nombre} ${c.usuario.apellido}` : '',
    rol: ROL_LABEL[c.usuario?.rol] || c.usuario?.rol || '',
    concepto: c.concepto || '',
    edificio: c.venta?.unidad?.edificio?.nombre || '',
    unidad: c.venta?.unidad?.numero || '',
    comprador: c.venta?.comprador ? `${c.venta.comprador.nombre} ${c.venta.comprador.apellido}` : '',
    totalUF: c.montoCalculadoUF,
    primeraUF: c.montoPrimera,
    estadoPrimera: c.estadoPrimera === 'PAGADO' ? 'Pagado' : 'Pendiente',
    segundaUF: c.montoSegunda,
    estadoSegunda: c.estadoSegunda === 'PAGADO' ? 'Pagado' : 'Pendiente',
    fecha: fmt(c.creadoEn),
  }))
  const excelCols = [
    { key: 'persona', label: 'Persona' }, { key: 'rol', label: 'Rol', width: 16 },
    { key: 'concepto', label: 'Concepto', width: 16 },
    { key: 'edificio', label: 'Edificio' }, { key: 'unidad', label: 'Unidad', width: 10 },
    { key: 'comprador', label: 'Comprador' },
    { key: 'totalUF', label: 'Total UF', width: 12 },
    { key: 'primeraUF', label: '1ª Cuota UF', width: 14 }, { key: 'estadoPrimera', label: 'Estado 1ª', width: 14 },
    { key: 'segundaUF', label: '2ª Cuota UF', width: 14 }, { key: 'estadoSegunda', label: 'Estado 2ª', width: 14 },
    { key: 'fecha', label: 'Fecha', width: 14 },
  ]

  if (isLoading) return <Spin />

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <RangePicker onChange={setRango} placeholder={['Desde', 'Hasta']} />
        <Space>
          <BtnExcel nombre="Reporte Comisiones" sheets={[{ nombre: 'Comisiones', columnas: excelCols, filas: excelFilas }]} />
          <BtnPDF documento={<PDFComisiones data={raw} />} nombre="Reporte Comisiones" />
        </Space>
      </div>
      <Row gutter={[12, 12]}>
        <Col xs={12} sm={6}><Card size="small"><Statistic title="Total comisiones" value={total} /></Card></Col>
        <Col xs={12} sm={6}><Card size="small"><Statistic title="Monto total" value={`${totalUF.toFixed(2)} UF`} /></Card></Col>
        <Col xs={12} sm={6}><Card size="small"><Statistic title="Pagado" value={`${pagadoUF.toFixed(2)} UF`} valueStyle={{ color: '#52c41a' }} /></Card></Col>
        <Col xs={12} sm={6}><Card size="small"><Statistic title="Pendiente" value={`${pendienteUF.toFixed(2)} UF`} valueStyle={{ color: '#faad14' }} /></Card></Col>
      </Row>
      <Card title="Detalle de comisiones" size="small">
        <Table dataSource={detalle} columns={columns} rowKey="id" size="small" pagination={{ pageSize: 10 }} />
      </Card>
    </Space>
  )
}

// ─── PAGOS ATRASADOS ─────────────────────────────────────────────────
function ReportePagosAtrasados() {
  const { data: raw, isLoading } = useQuery({
    queryKey: ['reporte-pagos-atrasados'],
    queryFn: () => api.get('/reportes/pagos-atrasados').then(r => r.data)
  })

  const { total = 0, totalUF = 0, detalle = [] } = raw || {}
  const hoy = new Date()

  const columns = [
    { title: 'Comprador', key: 'c', render: (_, c) => { const v = c.planPago?.venta; return v?.comprador ? `${v.comprador.nombre} ${v.comprador.apellido}` : '—' } },
    { title: 'Teléfono', key: 't', render: (_, c) => c.planPago?.venta?.comprador?.telefono || '—' },
    { title: 'Unidad', key: 'u', render: (_, c) => { const v = c.planPago?.venta; return v?.unidad ? `${v.unidad.edificio?.nombre} — ${v.unidad.numero}` : '—' } },
    { title: 'N° cuota', dataIndex: 'numeroCuota', key: 'n' },
    { title: 'Monto UF', key: 'm', render: (_, c) => fmtUF(c.montoUF) },
    { title: 'Vencimiento', key: 'v', render: (_, c) => fmt(c.fechaVencimiento) },
    { title: 'Días atraso', key: 'd', render: (_, c) => {
      const dias = Math.floor((hoy - new Date(c.fechaVencimiento)) / (1000 * 60 * 60 * 24))
      return <Tag color={dias > 30 ? 'red' : 'orange'}>{dias} días</Tag>
    }},
    { title: 'Vendedor', key: 've', render: (_, c) => { const v = c.planPago?.venta?.vendedor; return v ? `${v.nombre} ${v.apellido}` : '—' } },
  ]

  const excelFilas = detalle.map(c => {
    const venta = c.planPago?.venta
    const dias = Math.floor((hoy - new Date(c.fechaVencimiento)) / (1000 * 60 * 60 * 24))
    return {
      comprador: venta?.comprador ? `${venta.comprador.nombre} ${venta.comprador.apellido}` : '',
      telefono: venta?.comprador?.telefono || '',
      email: venta?.comprador?.email || '',
      edificio: venta?.unidad?.edificio?.nombre || '',
      unidad: venta?.unidad?.numero || '',
      cuota: c.numeroCuota ?? '',
      montoUF: c.montoUF ?? '',
      vencimiento: fmt(c.fechaVencimiento),
      diasAtraso: dias,
      vendedor: venta?.vendedor ? `${venta.vendedor.nombre} ${venta.vendedor.apellido}` : '',
    }
  })
  const excelCols = [
    { key: 'comprador', label: 'Comprador' }, { key: 'telefono', label: 'Teléfono', width: 14 },
    { key: 'email', label: 'Email', width: 24 },
    { key: 'edificio', label: 'Edificio' }, { key: 'unidad', label: 'Unidad', width: 10 },
    { key: 'cuota', label: 'N° cuota', width: 10 }, { key: 'montoUF', label: 'Monto UF', width: 12 },
    { key: 'vencimiento', label: 'Vencimiento', width: 14 }, { key: 'diasAtraso', label: 'Días atraso', width: 12 },
    { key: 'vendedor', label: 'Vendedor' },
  ]

  if (isLoading) return <Spin />

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <Text type="danger" strong>{total > 0 ? `${total} cuotas vencidas — ${totalUF.toFixed(2)} UF en mora` : 'Sin cuotas atrasadas'}</Text>
        <Space>
          <BtnExcel nombre="Pagos Atrasados" sheets={[{ nombre: 'Pagos Atrasados', columnas: excelCols, filas: excelFilas }]} />
          <BtnPDF documento={<PDFPagosAtrasados data={raw} />} nombre="Pagos Atrasados" />
        </Space>
      </div>
      <Row gutter={[12, 12]}>
        <Col xs={12} sm={8}><Card size="small"><Statistic title="Cuotas vencidas" value={total} valueStyle={{ color: '#ff4d4f' }} /></Card></Col>
        <Col xs={12} sm={8}><Card size="small"><Statistic title="Monto en mora" value={`${totalUF.toFixed(2)} UF`} valueStyle={{ color: '#ff4d4f' }} /></Card></Col>
      </Row>
      <Card title="Cuotas atrasadas" size="small">
        <Table dataSource={detalle} columns={columns} rowKey="id" size="small" pagination={{ pageSize: 10 }} />
      </Card>
    </Space>
  )
}

// ─── PÁGINA PRINCIPAL ─────────────────────────────────────────────────
export default function Reportes() {
  const tabs = [
    { key: 'ventas', label: 'Ventas', children: <ReporteVentas /> },
    { key: 'leads', label: 'Leads', children: <ReporteLeads /> },
    { key: 'inventario', label: 'Inventario', children: <ReporteInventario /> },
    { key: 'comisiones', label: 'Comisiones', children: <ReporteComisiones /> },
    { key: 'pagos', label: 'Pagos atrasados', children: <ReportePagosAtrasados /> },
  ]

  return (
    <div>
      <Title level={4} style={{ marginBottom: 20 }}>Reportes</Title>
      <Tabs items={tabs} />
    </div>
  )
}
