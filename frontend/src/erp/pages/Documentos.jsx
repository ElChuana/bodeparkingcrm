/**
 * Documentos y provisiones: la afirmación de "esta plata fue (o va a ser) esto".
 *
 * Provisiones ("sé que me van a facturar tal fecha"), respaldos (plata sin DTE) y
 * las facturas reales que cierran el ciclo. El estado siempre es calculado, y la
 * alerta que importa es "no te han facturado".
 */
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { Card, Table, Tag, Typography, Button, Space, Tabs, Modal, Form, Input, InputNumber, Select, DatePicker, Segmented, App } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import api from '../../services/api'
import { clp, uf, fecha, mesLabel, EstadoDoc, VERDE, ROJO, NUM } from '../ui'

const { Title, Text } = Typography

const invalidar = (qc) => {
  qc.invalidateQueries({ queryKey: ['erp-documentos'] })
  qc.invalidateQueries({ queryKey: ['erp-facturas'] })
  qc.invalidateQueries({ queryKey: ['erp-gastos'] })
  qc.invalidateQueries({ queryKey: ['erp-dashboard'] })
  qc.invalidateQueries({ queryKey: ['erp-conciliacion'] })
}

function useCatalogos() {
  const { data: cuentas } = useQuery({
    queryKey: ['erp-cuentas'],
    queryFn: () => api.get('/erp/cuentas').then((r) => r.data),
    staleTime: 300000,
  })
  const { data: proveedores } = useQuery({
    queryKey: ['erp-proveedores'],
    queryFn: () => api.get('/erp/proveedores').then((r) => r.data),
    staleTime: 300000,
  })
  const subcuentas = (cuentas?.arbol || []).flatMap((r) => [
    ...(r.subcuentas.length ? [] : [{ ...r, grupo: null }]),
    ...r.subcuentas.map((s) => ({ ...s, grupo: r.nombre })),
  ])
  return {
    opcionesCuenta: subcuentas.map((c) => ({ value: c.id, label: c.grupo ? `${c.grupo} · ${c.nombre}` : c.nombre })),
    opcionesProveedor: (proveedores || []).map((p) => ({ value: p.id, label: p.razonSocial })),
  }
}

const CampoMonto = () => (
  <Space.Compact block>
    <Form.Item name="montoUF" label="Monto UF" style={{ flex: 1, marginRight: 8 }}>
      <InputNumber style={{ width: '100%' }} min={0} step={0.01} placeholder="—" />
    </Form.Item>
    <Form.Item name="montoCLP" label="o Monto $" style={{ flex: 1 }}>
      <InputNumber style={{ width: '100%' }} min={0} placeholder="—" />
    </Form.Item>
  </Space.Compact>
)

// ─── Provisiones y respaldos ──────────────────────────────────

function ModalProvision({ onCerrar }) {
  const qc = useQueryClient()
  const { message } = App.useApp()
  const { opcionesCuenta, opcionesProveedor } = useCatalogos()

  const crear = useMutation({
    mutationFn: (v) => api.post('/erp/documentos', { ...v, fechaEsperada: v.fechaEsperada?.format('YYYY-MM-DD') }).then((r) => r.data),
    onSuccess: () => { invalidar(qc); message.success('Provisión creada.'); onCerrar() },
    onError: (e) => message.error(e.response?.data?.error || 'No se pudo crear.'),
  })

  return (
    <Modal open title="Nueva provisión" onCancel={onCerrar} footer={null} destroyOnHidden>
      <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 12 }}>
        "Sé que me van a facturar tal fecha tal cosa." Cuando llegue la factura real se asocia;
        si la fecha pasa sin factura, el sistema avisa.
      </Text>
      <Form layout="vertical" onFinish={(v) => crear.mutate(v)}>
        <Form.Item name="descripcion" label="Qué es" rules={[{ required: true, message: 'Descríbelo' }]}>
          <Input autoFocus placeholder="Ej: Asesoría legal septiembre" />
        </Form.Item>
        <Form.Item name="fechaEsperada" label="Fecha esperada" rules={[{ required: true, message: 'Indica la fecha' }]}>
          <DatePicker style={{ width: '100%' }} format="DD-MM-YYYY" />
        </Form.Item>
        <CampoMonto />
        <Space.Compact block>
          <Form.Item name="cuentaId" label="Cuenta del plan" style={{ flex: 1, marginRight: 8 }}>
            <Select allowClear showSearch optionFilterProp="label" placeholder="Sin clasificar" options={opcionesCuenta} />
          </Form.Item>
          <Form.Item name="proveedorId" label="Proveedor (opcional)" style={{ flex: 1 }}>
            <Select allowClear showSearch optionFilterProp="label" placeholder="—" options={opcionesProveedor} />
          </Form.Item>
        </Space.Compact>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button onClick={onCerrar}>Cancelar</Button>
          <Button type="primary" htmlType="submit" loading={crear.isPending}>Crear provisión</Button>
        </div>
      </Form>
    </Modal>
  )
}

/** Asociar la factura real a la provisión: "ya me facturaron esto". */
function ModalAsociar({ doc, onCerrar }) {
  const qc = useQueryClient()
  const { message } = App.useApp()
  const [modo, setModo] = useState('nueva')
  const { opcionesCuenta, opcionesProveedor } = useCatalogos()

  const { data: facturas } = useQuery({
    queryKey: ['erp-facturas'],
    queryFn: () => api.get('/erp/facturas-compra').then((r) => r.data),
    staleTime: 60000,
  })
  const sinDoc = (facturas || []).filter((f) => !f.documentoInterno)

  const asociar = useMutation({
    mutationFn: (facturaCompraId) => api.post(`/erp/documentos/${doc.id}/asociar-factura`, { facturaCompraId }).then((r) => r.data),
    onSuccess: () => { invalidar(qc); message.success('Factura asociada: la provisión quedó respaldada.'); onCerrar() },
    onError: (e) => message.error(e.response?.data?.error || 'No se pudo asociar.'),
  })

  const crearYAsociar = useMutation({
    mutationFn: (v) => api.post('/erp/facturas-compra', {
      ...v,
      fechaEmision: v.fechaEmision?.format('YYYY-MM-DD'),
      fechaVencimiento: v.fechaVencimiento?.format('YYYY-MM-DD'),
      documentoInternoId: doc.id,
    }).then((r) => r.data),
    onSuccess: () => { invalidar(qc); message.success('Factura registrada y asociada.'); onCerrar() },
    onError: (e) => message.error(e.response?.data?.error || 'No se pudo registrar.'),
  })

  return (
    <Modal open title={`Ya me facturaron: ${doc.descripcion}`} onCancel={onCerrar} footer={null} destroyOnHidden>
      <Segmented
        style={{ marginBottom: 16 }}
        options={[{ label: 'Registrar la factura', value: 'nueva' }, { label: 'Elegir una cargada', value: 'existente' }]}
        value={modo}
        onChange={setModo}
      />
      {modo === 'existente' ? (
        <Form layout="vertical" onFinish={(v) => asociar.mutate(v.facturaCompraId)}>
          <Form.Item name="facturaCompraId" label="Factura de compra" rules={[{ required: true, message: 'Elige la factura' }]}>
            <Select
              showSearch optionFilterProp="label" placeholder="Elegir…"
              options={sinDoc.map((f) => ({ value: f.id, label: `N° ${f.folio} · ${f.proveedor?.razonSocial} · ${clp(f.total)}` }))}
            />
          </Form.Item>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={onCerrar}>Cancelar</Button>
            <Button type="primary" htmlType="submit" loading={asociar.isPending}>Asociar</Button>
          </div>
        </Form>
      ) : (
        <Form layout="vertical" onFinish={(v) => crearYAsociar.mutate(v)}
          initialValues={{ proveedorId: doc.proveedorId || undefined, total: doc.montoEstimadoCLP || undefined, cuentaId: doc.cuentaId || undefined }}>
          <Space.Compact block>
            <Form.Item name="proveedorId" label="Proveedor" style={{ flex: 1, marginRight: 8 }} rules={[{ required: true, message: 'Elige el proveedor' }]}>
              <Select showSearch optionFilterProp="label" options={opcionesProveedor} />
            </Form.Item>
            <Form.Item name="folio" label="Folio" style={{ width: 140 }} rules={[{ required: true, message: 'Folio' }]}>
              <Input />
            </Form.Item>
          </Space.Compact>
          <Space.Compact block>
            <Form.Item name="fechaEmision" label="Emisión" style={{ flex: 1, marginRight: 8 }} rules={[{ required: true, message: 'Fecha' }]}>
              <DatePicker style={{ width: '100%' }} format="DD-MM-YYYY" />
            </Form.Item>
            <Form.Item name="fechaVencimiento" label="Vencimiento" style={{ flex: 1, marginRight: 8 }}>
              <DatePicker style={{ width: '100%' }} format="DD-MM-YYYY" />
            </Form.Item>
            <Form.Item name="total" label="Total $" style={{ flex: 1 }} rules={[{ required: true, message: 'Total' }]}>
              <InputNumber style={{ width: '100%' }} min={1} />
            </Form.Item>
          </Space.Compact>
          <Form.Item name="cuentaId" label="Cuenta del plan">
            <Select allowClear showSearch optionFilterProp="label" options={opcionesCuenta} />
          </Form.Item>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={onCerrar}>Cancelar</Button>
            <Button type="primary" htmlType="submit" loading={crearYAsociar.isPending}>Registrar y asociar</Button>
          </div>
        </Form>
      )}
    </Modal>
  )
}

function TabDocumentos() {
  const [params, setParams] = useSearchParams()
  const estado = params.get('estado') || ''
  const [modalNueva, setModalNueva] = useState(false)
  const [asociando, setAsociando] = useState(null)
  const qc = useQueryClient()
  const { message, modal } = App.useApp()

  const { data, isLoading } = useQuery({
    queryKey: ['erp-documentos', 'lista'],
    queryFn: () => api.get('/erp/documentos').then((r) => r.data),
    staleTime: 30000,
  })

  const eliminar = useMutation({
    mutationFn: (id) => api.delete(`/erp/documentos/${id}`).then((r) => r.data),
    onSuccess: () => { invalidar(qc); message.success('Documento eliminado.') },
    onError: (e) => message.error(e.response?.data?.error || 'No se pudo eliminar.'),
  })

  const docs = (data?.documentos || []).filter((d) => !estado || d.estado === estado)

  const columns = [
    {
      title: 'Documento', key: 'doc',
      render: (_, d) => (
        <div>
          <Text strong style={{ fontSize: 13 }}>{d.descripcion}</Text>
          <div><Text type="secondary" style={{ fontSize: 11 }}>
            {d.tipo === 'PROVISION' ? 'Provisión' : 'Respaldo'}
            {d.proveedor ? ` · ${d.proveedor.razonSocial}` : ''}
            {d.facturaCompra ? ` · Factura N° ${d.facturaCompra.folio}` : ''}
          </Text></div>
        </div>
      ),
    },
    { title: 'Cuenta', key: 'cuenta', render: (_, d) => d.cuenta ? <Tag color="blue">{d.cuenta.nombre}</Tag> : <Text type="secondary">—</Text> },
    { title: 'Período', key: 'periodo', render: (_, d) => <Text style={{ fontSize: 12, ...NUM }}>{d.periodo ? mesLabel(d.periodo) : '—'}</Text> },
    { title: 'Fecha esperada', key: 'fecha', render: (_, d) => <Text style={{ fontSize: 12, ...NUM }}>{fecha(d.fechaEsperada)}</Text> },
    { title: 'Monto', key: 'monto', align: 'right', render: (_, d) => <Text strong style={NUM}>{d.montoUF ? uf(d.montoUF) : clp(d.montoCLP)}</Text> },
    { title: 'Pagado', key: 'pagado', align: 'right', render: (_, d) => d.pagado > 0 ? <Text style={{ color: VERDE, ...NUM }}>{clp(d.pagado)}</Text> : <Text type="secondary">—</Text> },
    { title: 'Estado', key: 'estado', render: (_, d) => <EstadoDoc estado={d.estado} /> },
    {
      title: '', key: 'acciones',
      render: (_, d) => (
        <Space>
          {d.tipo === 'PROVISION' && !d.facturaCompraId && d.estado !== 'CERRADO' && (
            <Button size="small" onClick={() => setAsociando(d)}>Ya me facturaron</Button>
          )}
          {!d.conciliaciones?.length && !d.facturaCompraId && (
            <Button size="small" type="text" danger
              onClick={() => modal.confirm({ title: '¿Eliminar este documento?', okText: 'Eliminar', okButtonProps: { danger: true }, onOk: () => eliminar.mutate(d.id) })}>
              ✕
            </Button>
          )}
        </Space>
      ),
    },
  ]

  const FILTROS = [
    { label: 'Todos', value: '' },
    { label: 'Esperados', value: 'ESPERADO' },
    { label: '⚠ Sin factura', value: 'VENCIDO_SIN_FACTURA' },
    { label: 'Por pagar', value: 'FACTURADO_SIN_PAGO' },
    { label: 'Cerrados', value: 'CERRADO' },
  ]

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <Segmented options={FILTROS} value={estado} onChange={(v) => setParams(v ? { estado: v } : {})} />
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalNueva(true)}>Provisión</Button>
      </div>
      <Table
        dataSource={docs} columns={columns} rowKey="id" size="small" loading={isLoading}
        pagination={{ pageSize: 25, showSizeChanger: false }}
        locale={{ emptyText: 'No hay documentos con ese estado. Las provisiones se generan solas desde los gastos programados.' }}
      />
      {modalNueva && <ModalProvision onCerrar={() => setModalNueva(false)} />}
      {asociando && <ModalAsociar doc={asociando} onCerrar={() => setAsociando(null)} />}
    </>
  )
}

// ─── Gastos programados ───────────────────────────────────────

function ModalGasto({ gasto, onCerrar }) {
  const qc = useQueryClient()
  const { message } = App.useApp()
  const { opcionesCuenta, opcionesProveedor } = useCatalogos()

  const guardar = useMutation({
    mutationFn: (v) => {
      const body = { ...v, fechaInicio: v.fechaInicio?.format('YYYY-MM-DD'), fechaFin: v.fechaFin?.format('YYYY-MM-DD') || null }
      return (gasto ? api.put(`/erp/gastos/${gasto.id}`, body) : api.post('/erp/gastos', body)).then((r) => r.data)
    },
    onSuccess: () => { invalidar(qc); message.success('Gasto guardado; sus provisiones se generan solas.'); onCerrar() },
    onError: (e) => message.error(e.response?.data?.error || 'No se pudo guardar.'),
  })

  return (
    <Modal open title={gasto ? `Editar: ${gasto.nombre}` : 'Nuevo gasto programado'} onCancel={onCerrar} footer={null} destroyOnHidden>
      <Form
        layout="vertical"
        onFinish={(v) => guardar.mutate(v)}
        initialValues={gasto ? {
          nombre: gasto.nombre, cuentaId: gasto.cuentaId || undefined, proveedorId: gasto.proveedorId || undefined,
          montoUF: gasto.montoUF || undefined, montoCLP: gasto.montoCLP || undefined,
          periodicidad: gasto.periodicidad, diaVencimiento: gasto.diaVencimiento || undefined,
          fechaInicio: gasto.fechaInicio ? dayjs(gasto.fechaInicio) : undefined,
          fechaFin: gasto.fechaFin ? dayjs(gasto.fechaFin) : undefined,
          activo: gasto.activo,
        } : { periodicidad: 'MENSUAL' }}
      >
        <Form.Item name="nombre" label="Nombre" rules={[{ required: true, message: 'Ponle nombre' }]}>
          <Input autoFocus placeholder="Ej: Arriendo oficina" />
        </Form.Item>
        <Space.Compact block>
          <Form.Item name="cuentaId" label="Cuenta del plan" style={{ flex: 1, marginRight: 8 }}>
            <Select allowClear showSearch optionFilterProp="label" options={opcionesCuenta} />
          </Form.Item>
          <Form.Item name="proveedorId" label="Proveedor" style={{ flex: 1 }}>
            <Select allowClear showSearch optionFilterProp="label" options={opcionesProveedor} />
          </Form.Item>
        </Space.Compact>
        <CampoMonto />
        <Space.Compact block>
          <Form.Item name="periodicidad" label="Periodicidad" style={{ flex: 1, marginRight: 8 }}>
            <Select options={['MENSUAL', 'BIMESTRAL', 'TRIMESTRAL', 'SEMESTRAL', 'ANUAL', 'UNICO'].map((p) => ({ value: p, label: p.toLowerCase() }))} />
          </Form.Item>
          <Form.Item name="diaVencimiento" label="Día de pago" style={{ width: 120 }}>
            <InputNumber style={{ width: '100%' }} min={1} max={31} placeholder="5" />
          </Form.Item>
        </Space.Compact>
        <Space.Compact block>
          <Form.Item name="fechaInicio" label="Desde" style={{ flex: 1, marginRight: 8 }} rules={[{ required: true, message: 'Desde cuándo' }]}>
            <DatePicker style={{ width: '100%' }} format="DD-MM-YYYY" />
          </Form.Item>
          <Form.Item name="fechaFin" label="Hasta (opcional)" style={{ flex: 1 }}>
            <DatePicker style={{ width: '100%' }} format="DD-MM-YYYY" />
          </Form.Item>
        </Space.Compact>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button onClick={onCerrar}>Cancelar</Button>
          <Button type="primary" htmlType="submit" loading={guardar.isPending}>Guardar</Button>
        </div>
      </Form>
    </Modal>
  )
}

function TabGastos() {
  const [editando, setEditando] = useState(null) // null | 'nuevo' | gasto
  const { data: gastos, isLoading } = useQuery({
    queryKey: ['erp-gastos'],
    queryFn: () => api.get('/erp/gastos').then((r) => r.data),
    staleTime: 60000,
  })

  const columns = [
    {
      title: 'Gasto', key: 'gasto',
      render: (_, g) => (
        <div>
          <Text strong style={{ fontSize: 13, opacity: g.activo ? 1 : 0.5 }}>{g.nombre}</Text>
          <div><Text type="secondary" style={{ fontSize: 11 }}>{g.proveedor?.razonSocial || g.proveedorTexto || ''}</Text></div>
        </div>
      ),
    },
    { title: 'Cuenta', key: 'cuenta', render: (_, g) => g.cuenta ? <Tag color="blue">{g.cuenta.nombre}</Tag> : <Text type="secondary">—</Text> },
    { title: 'Periodicidad', key: 'per', render: (_, g) => <Text style={{ fontSize: 12 }}>{g.periodicidad.toLowerCase()}{g.diaVencimiento ? ` · día ${g.diaVencimiento}` : ''}</Text> },
    { title: 'Monto', key: 'monto', align: 'right', render: (_, g) => <Text strong style={NUM}>{g.montoUF ? uf(g.montoUF) : clp(g.montoCLP)}</Text> },
    { title: '≈ $', key: 'clp', align: 'right', render: (_, g) => <Text type="secondary" style={NUM}>{clp(g.montoEstimadoCLP)}</Text> },
    { title: '', key: 'a', render: (_, g) => <Button size="small" onClick={() => setEditando(g)}>Editar</Button> },
  ]

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 8, flexWrap: 'wrap' }}>
        <Text type="secondary" style={{ fontSize: 12 }}>Las plantillas de lo que se sabe que viene. Cada mes generan su provisión sola.</Text>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setEditando('nuevo')}>Gasto programado</Button>
      </div>
      <Table
        dataSource={gastos || []} columns={columns} rowKey="id" size="small" loading={isLoading} pagination={false}
        locale={{ emptyText: 'Sin gastos programados. El arriendo, la contabilidad, un seguro: lo que llega todos los meses.' }}
      />
      {editando && <ModalGasto gasto={editando === 'nuevo' ? null : editando} onCerrar={() => setEditando(null)} />}
    </>
  )
}

// ─── Facturas ─────────────────────────────────────────────────

function TabFacturas() {
  const { data: facturas, isLoading } = useQuery({
    queryKey: ['erp-facturas'],
    queryFn: () => api.get('/erp/facturas-compra').then((r) => r.data),
    staleTime: 30000,
  })

  const columns = [
    { title: 'Folio', key: 'folio', render: (_, f) => <Text strong style={NUM}>N° {f.folio}</Text> },
    { title: 'Proveedor', key: 'prov', render: (_, f) => <Text style={{ fontSize: 13 }}>{f.proveedor?.razonSocial}</Text> },
    { title: 'Cuenta', key: 'cuenta', render: (_, f) => f.cuenta ? <Tag color="blue">{f.cuenta.nombre}</Tag> : <Text type="secondary">—</Text> },
    { title: 'Emisión', key: 'em', render: (_, f) => <Text style={{ fontSize: 12, ...NUM }}>{fecha(f.fechaEmision)}</Text> },
    { title: 'Vence', key: 've', render: (_, f) => <Text style={{ fontSize: 12, ...NUM }}>{fecha(f.fechaVencimiento)}</Text> },
    { title: 'Total', key: 'total', align: 'right', render: (_, f) => <Text strong style={NUM}>{clp(f.total)}</Text> },
    { title: 'Saldo', key: 'saldo', align: 'right', render: (_, f) => f.saldoPorPagar > 0 ? <Text strong style={{ color: ROJO, ...NUM }}>{clp(f.saldoPorPagar)}</Text> : <Text type="secondary">—</Text> },
    {
      title: 'Estado', key: 'estado',
      render: (_, f) => (
        <div>
          {f.pagada ? <Tag color="green">Pagada</Tag> : <Tag color="orange">Por pagar</Tag>}
          {f.documentoInterno && <div><Text type="secondary" style={{ fontSize: 10 }}>respalda: {f.documentoInterno.descripcion}</Text></div>}
        </div>
      ),
    },
  ]

  return (
    <Table
      dataSource={facturas || []} columns={columns} rowKey="id" size="small" loading={isLoading}
      pagination={{ pageSize: 25, showSizeChanger: false }}
      locale={{ emptyText: 'Sin facturas registradas. Se registran desde una provisión ("Ya me facturaron") o cuando llegan sueltas.' }}
    />
  )
}

export default function Documentos() {
  return (
    <div>
      <Title level={4} style={{ marginBottom: 16 }}>Documentos</Title>
      <Card styles={{ body: { paddingTop: 8 } }}>
        <Tabs
          items={[
            { key: 'documentos', label: 'Provisiones y respaldos', children: <TabDocumentos /> },
            { key: 'gastos', label: 'Gastos programados', children: <TabGastos /> },
            { key: 'facturas', label: 'Facturas', children: <TabFacturas /> },
          ]}
        />
      </Card>
    </div>
  )
}
