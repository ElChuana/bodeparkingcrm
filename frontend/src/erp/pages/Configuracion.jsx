/**
 * Configuración del ERP: contrapartes por identificar, plan de cuentas,
 * proveedores, reglas de conciliación automática y cuentas bancarias.
 */
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, Table, Tag, Typography, Button, Space, Tabs, Modal, Form, Input, InputNumber, Select, Checkbox, Row, Col, List, Spin, App } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import api from '../../services/api'
import { clp, fecha, ROJO, NUM } from '../ui'

const { Title, Text } = Typography

function useSubcuentas() {
  const { data: cuentas } = useQuery({
    queryKey: ['erp-cuentas'],
    queryFn: () => api.get('/erp/cuentas').then((r) => r.data),
    staleTime: 60000,
  })
  const subcuentas = (cuentas?.arbol || []).flatMap((r) => r.subcuentas.map((s) => ({ ...s, grupo: r.nombre })))
  return {
    arbol: cuentas?.arbol || [],
    opcionesCuenta: subcuentas.map((c) => ({ value: c.id, label: `${c.grupo} · ${c.nombre}` })),
  }
}

// ─── Contrapartes ─────────────────────────────────────────────

function TabContrapartes() {
  const qc = useQueryClient()
  const { message } = App.useApp()
  const { data, isLoading } = useQuery({
    queryKey: ['erp-contrapartes'],
    queryFn: () => api.get('/erp/banco/contrapartes').then((r) => r.data),
    staleTime: 30000,
  })

  const invalidar = () => {
    qc.invalidateQueries({ queryKey: ['erp-contrapartes'] })
    qc.invalidateQueries({ queryKey: ['erp-banco'] })
    qc.invalidateQueries({ queryKey: ['erp-conciliacion'] })
  }

  const asignar = useMutation({
    mutationFn: (body) => api.post('/erp/banco/contrapartes', body).then((r) => r.data),
    onSuccess: (r) => { invalidar(); message.success(`Aprendido: ${r.etiquetados} movimiento(s) etiquetados.`) },
    onError: (e) => message.error(e.response?.data?.error || 'No se pudo asignar.'),
  })
  const reidentificar = useMutation({
    mutationFn: () => api.post('/erp/banco/contrapartes/reidentificar').then((r) => r.data),
    onSuccess: (r) => { invalidar(); message.success(`${r.identificados} de ${r.revisados} identificados.`) },
  })

  const columns = [
    {
      title: 'Nombre en el banco', key: 'nombre',
      render: (_, f) => (
        <span>
          <Text strong style={{ fontSize: 13 }}>{f.nombre}</Text>
          {f.pareceInterno && <Tag style={{ marginLeft: 6 }} title="Entra y sale plata por el mismo nombre">¿interno?</Tag>}
        </span>
      ),
    },
    { title: 'Veces', dataIndex: 'veces', align: 'right', width: 70 },
    { title: 'Plata movida', key: 'movido', align: 'right', width: 130, render: (_, f) => <Text strong style={NUM}>{clp(f.movido)}</Text> },
    {
      title: 'Sugerencia', key: 'sug',
      render: (_, f) => f.sugerencia
        ? <Tag color="blue" title={f.sugerencia.como}>{f.sugerencia.tipo === 'CLIENTE' ? 'Cliente' : 'Proveedor'}: {f.sugerencia.nombre}</Tag>
        : <Text type="secondary">—</Text>,
    },
    {
      title: '', key: 'a', width: 190,
      render: (_, f) => (
        <Space>
          {f.sugerencia && (
            <Button size="small" type="primary" loading={asignar.isPending}
              onClick={() => asignar.mutate({
                nombre: f.nombre,
                ...(f.sugerencia.tipo === 'CLIENTE' ? { contactoId: f.sugerencia.id } : { proveedorId: f.sugerencia.id }),
              })}>
              Confirmar
            </Button>
          )}
          <Button size="small" loading={asignar.isPending}
            onClick={() => asignar.mutate({ nombre: f.nombre, interno: true })}
            title="Traspasos propios: ni cliente ni proveedor">
            Interno
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 8, flexWrap: 'wrap' }}>
        <Text type="secondary" style={{ fontSize: 12 }}>
          {data?.movimientosSinIdentificar ?? '…'} movimiento(s) sin contraparte. Identificar un nombre lo aprende para siempre.
        </Text>
        <Button loading={reidentificar.isPending} onClick={() => reidentificar.mutate()}>Identificar contrapartes</Button>
      </div>
      <Table
        dataSource={(data?.filas || []).slice(0, 60)}
        columns={columns}
        rowKey="clave"
        size="small"
        loading={isLoading}
        pagination={false}
        locale={{ emptyText: 'Todo el mundo está identificado.' }}
      />
    </>
  )
}

// ─── Plan de cuentas ──────────────────────────────────────────

function TabCuentas() {
  const qc = useQueryClient()
  const { message } = App.useApp()
  const [nueva, setNueva] = useState(null) // { padreId, grupo } | null
  const { arbol } = useSubcuentas()

  const crear = useMutation({
    mutationFn: (body) => api.post('/erp/cuentas', body).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['erp-cuentas'] }); setNueva(null); message.success('Cuenta creada.') },
    onError: (e) => message.error(e.response?.data?.error || 'No se pudo crear.'),
  })

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 8, flexWrap: 'wrap' }}>
        <Text type="secondary" style={{ fontSize: 12 }}>
          Dos niveles: la cuenta grande y sus subcuentas. Cada documento se clasifica en una subcuenta.
        </Text>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setNueva({ padreId: null })}>Cuenta grande</Button>
      </div>
      <Row gutter={[12, 12]}>
        {arbol.map((raiz) => (
          <Col key={raiz.id} xs={24} md={12}>
            <Card
              size="small"
              title={
                <span>
                  {raiz.color && <span style={{ display: 'inline-block', width: 9, height: 9, borderRadius: 99, background: raiz.color, marginRight: 6 }} />}
                  {raiz.nombre}
                </span>
              }
              extra={<Button size="small" type="text" onClick={() => setNueva({ padreId: raiz.id, grupo: raiz.nombre })}>+ subcuenta</Button>}
            >
              <List
                size="small"
                dataSource={raiz.subcuentas}
                locale={{ emptyText: 'Sin subcuentas.' }}
                renderItem={(s) => (
                  <List.Item style={{ padding: '4px 0' }}>
                    <Text style={{ fontSize: 13 }}>{s.nombre}</Text>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      {(s._count?.documentosInternos || 0) + (s._count?.facturasCompra || 0)} docs
                    </Text>
                  </List.Item>
                )}
              />
            </Card>
          </Col>
        ))}
      </Row>

      <Modal
        open={!!nueva}
        title={nueva?.padreId ? `Nueva subcuenta de ${nueva.grupo}` : 'Nueva cuenta grande'}
        onCancel={() => setNueva(null)}
        footer={null}
        destroyOnHidden
      >
        <Form layout="vertical" onFinish={(v) => crear.mutate({ nombre: v.nombre, padreId: nueva?.padreId })}>
          <Form.Item name="nombre" label="Nombre" rules={[{ required: true, message: 'Ponle nombre' }]}>
            <Input autoFocus placeholder={nueva?.padreId ? 'Ej: Seguros' : 'Ej: Operaciones'} />
          </Form.Item>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setNueva(null)}>Cancelar</Button>
            <Button type="primary" htmlType="submit" loading={crear.isPending}>Crear</Button>
          </div>
        </Form>
      </Modal>
    </>
  )
}

// ─── Proveedores ──────────────────────────────────────────────

function TabProveedores() {
  const qc = useQueryClient()
  const { message } = App.useApp()
  const [editando, setEditando] = useState(null) // null | 'nuevo' | proveedor
  const { opcionesCuenta } = useSubcuentas()

  const { data: proveedores, isLoading } = useQuery({
    queryKey: ['erp-proveedores'],
    queryFn: () => api.get('/erp/proveedores').then((r) => r.data),
    staleTime: 60000,
  })

  const guardar = useMutation({
    mutationFn: (v) => (editando === 'nuevo'
      ? api.post('/erp/proveedores', v)
      : api.put(`/erp/proveedores/${editando.id}`, v)
    ).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['erp-proveedores'] }); setEditando(null); message.success('Proveedor guardado.') },
    onError: (e) => message.error(e.response?.data?.error || 'No se pudo guardar.'),
  })

  const columns = [
    { title: 'Proveedor', key: 'p', render: (_, p) => <Text strong style={{ fontSize: 13, opacity: p.activo ? 1 : 0.5 }}>{p.razonSocial}</Text> },
    { title: 'RUT', dataIndex: 'rut', render: (v) => <Text style={{ fontSize: 12, ...NUM }}>{v}</Text> },
    { title: 'Cuenta por defecto', key: 'c', render: (_, p) => p.cuenta ? <Tag color="blue">{p.cuenta.nombre}</Tag> : <Text type="secondary">—</Text> },
    { title: 'Facturado', key: 'f', align: 'right', render: (_, p) => <Text style={NUM}>{clp(p.facturado)}</Text> },
    { title: 'Por pagar', key: 'pp', align: 'right', render: (_, p) => p.porPagar > 0 ? <Text strong style={{ color: ROJO, ...NUM }}>{clp(p.porPagar)}</Text> : <Text type="secondary">—</Text> },
    { title: '', key: 'a', width: 90, render: (_, p) => <Button size="small" onClick={() => setEditando(p)}>Editar</Button> },
  ]

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setEditando('nuevo')}>Proveedor</Button>
      </div>
      <Table
        dataSource={proveedores || []} columns={columns} rowKey="id" size="small" loading={isLoading}
        pagination={{ pageSize: 25, showSizeChanger: false }}
        locale={{ emptyText: 'Sin proveedores en el catálogo.' }}
      />
      <Modal
        open={!!editando}
        title={editando === 'nuevo' ? 'Nuevo proveedor' : editando?.razonSocial}
        onCancel={() => setEditando(null)}
        footer={null}
        destroyOnHidden
      >
        <Form
          layout="vertical"
          onFinish={(v) => guardar.mutate(v)}
          initialValues={editando && editando !== 'nuevo' ? {
            rut: editando.rut, razonSocial: editando.razonSocial,
            cuentaId: editando.cuentaId || undefined, diasPago: editando.diasPago || undefined,
          } : {}}
        >
          <Form.Item name="rut" label="RUT" rules={[{ required: true, message: 'RUT' }]}>
            <Input placeholder="76123456-7" />
          </Form.Item>
          <Form.Item name="razonSocial" label="Razón social" rules={[{ required: true, message: 'Razón social' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="cuentaId" label="Cuenta por defecto" extra="Sus documentos la heredan al clasificarse.">
            <Select allowClear showSearch optionFilterProp="label" options={opcionesCuenta} />
          </Form.Item>
          <Form.Item name="diasPago" label="Días de pago pactados">
            <InputNumber style={{ width: '100%' }} min={0} placeholder="30" />
          </Form.Item>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setEditando(null)}>Cancelar</Button>
            <Button type="primary" htmlType="submit" loading={guardar.isPending}>Guardar</Button>
          </div>
        </Form>
      </Modal>
    </>
  )
}

// ─── Reglas ───────────────────────────────────────────────────

function TabReglas() {
  const qc = useQueryClient()
  const { message } = App.useApp()
  const [creando, setCreando] = useState(false)
  const [prueba, setPrueba] = useState(null)
  const [form] = Form.useForm()

  const { data: reglas, isLoading } = useQuery({
    queryKey: ['erp-reglas'],
    queryFn: () => api.get('/erp/reglas').then((r) => r.data),
    staleTime: 60000,
  })
  const { data: gastos } = useQuery({
    queryKey: ['erp-gastos'],
    queryFn: () => api.get('/erp/gastos').then((r) => r.data),
    staleTime: 60000,
  })

  const probar = useMutation({
    mutationFn: () => api.post('/erp/reglas/probar', form.getFieldsValue()).then((r) => r.data),
    onSuccess: setPrueba,
    onError: (e) => message.error(e.response?.data?.error || 'No se pudo probar.'),
  })
  const crear = useMutation({
    mutationFn: (v) => api.post('/erp/reglas', v).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['erp-reglas'] }); setCreando(false); setPrueba(null); message.success('Regla creada.') },
    onError: (e) => message.error(e.response?.data?.error || 'No se pudo crear.'),
  })

  const columns = [
    { title: 'Regla', key: 'r', render: (_, r) => <Text strong style={{ fontSize: 13, opacity: r.activa ? 1 : 0.5 }}>{r.nombre}</Text> },
    { title: 'Patrón de glosa', key: 'p', render: (_, r) => <Text code style={{ fontSize: 12 }}>{r.patronGlosa}</Text> },
    { title: 'Gasto', key: 'g', render: (_, r) => <Text style={{ fontSize: 12 }}>{r.gastoProgramado?.nombre}</Text> },
    { title: 'Aplicada', key: 'v', align: 'right', render: (_, r) => <Text style={NUM}>{r.vecesAplicada}×</Text> },
    { title: 'Auto', key: 'auto', render: (_, r) => r.autoValidar ? <Tag color="orange">imputa sola</Tag> : <Tag>propone</Tag> },
  ]

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 8, flexWrap: 'wrap' }}>
        <Text type="secondary" style={{ fontSize: 12 }}>
          "Si la glosa trae esto y el monto anda por acá, es este gasto." La regla imputa a la provisión del período.
        </Text>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreando(true)}>Regla</Button>
      </div>
      <Table
        dataSource={reglas || []} columns={columns} rowKey="id" size="small" loading={isLoading} pagination={false}
        locale={{ emptyText: 'Sin reglas. El arriendo que llega igual todos los meses es el candidato perfecto.' }}
      />
      <Modal open={creando} title="Nueva regla de conciliación" onCancel={() => { setCreando(false); setPrueba(null) }} footer={null} destroyOnHidden>
        <Form form={form} layout="vertical" onFinish={(v) => crear.mutate(v)}>
          <Form.Item name="nombre" label="Nombre" rules={[{ required: true, message: 'Nombre' }]}>
            <Input autoFocus placeholder="Ej: Arriendo oficina" />
          </Form.Item>
          <Form.Item name="patronGlosa" label="La glosa debe contener" rules={[{ required: true, message: 'Sin patrón calzaría con todo' }]}>
            <Input placeholder="Ej: FENIX" />
          </Form.Item>
          <Form.Item name="gastoProgramadoId" label="Se imputa al gasto programado" rules={[{ required: true, message: 'Elige el gasto' }]}>
            <Select showSearch optionFilterProp="label" options={(gastos || []).map((g) => ({ value: g.id, label: g.nombre }))} />
          </Form.Item>
          <Space.Compact block>
            <Form.Item name="montoMin" label="Monto mínimo (opcional)" style={{ flex: 1, marginRight: 8 }}>
              <InputNumber style={{ width: '100%' }} min={0} />
            </Form.Item>
            <Form.Item name="montoMax" label="Monto máximo (opcional)" style={{ flex: 1 }}>
              <InputNumber style={{ width: '100%' }} min={0} />
            </Form.Item>
          </Space.Compact>
          <Form.Item name="autoValidar" valuePropName="checked">
            <Checkbox>Imputar sola cuando la coincidencia sea única (con cuidado)</Checkbox>
          </Form.Item>
          {prueba && (
            <div style={{ background: '#f8fafc', borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontSize: 12 }}>
              Calzaría con <Text strong>{prueba.total}</Text> movimiento(s), {prueba.libres} libres.
              {prueba.movimientos.slice(0, 3).map((m) => (
                <div key={m.id}><Text type="secondary" style={{ fontSize: 11 }}>· {fecha(m.fecha)} {m.glosa} ({clp(Math.abs(m.monto))})</Text></div>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button loading={probar.isPending} onClick={() => probar.mutate()}>Probar en seco</Button>
            <Button type="primary" htmlType="submit" loading={crear.isPending}>Crear regla</Button>
          </div>
        </Form>
      </Modal>
    </>
  )
}

// ─── Cuentas bancarias ────────────────────────────────────────

function TabBancarias() {
  const { data: cuentas, isLoading } = useQuery({
    queryKey: ['erp-banco', 'cuentas'],
    queryFn: () => api.get('/erp/banco/cuentas').then((r) => r.data),
    staleTime: 60000,
  })

  const columns = [
    { title: 'Banco', key: 'b', render: (_, c) => <Text strong style={{ fontSize: 13 }}>{c.banco}{c.alias ? <Text type="secondary"> · {c.alias}</Text> : ''}</Text> },
    { title: 'Cuenta', dataIndex: 'numeroCuenta', render: (v) => <Text style={{ fontSize: 12, ...NUM }}>{v}</Text> },
    { title: 'Titular', key: 't', render: (_, c) => <Text style={{ fontSize: 12 }}>{c.razonSocial} <Text type="secondary" style={NUM}>{c.rutEmpresa}</Text></Text> },
    { title: 'Movimientos', key: 'm', align: 'right', render: (_, c) => <Text style={NUM}>{c._count?.movimientos ?? '—'}</Text> },
  ]

  return (
    <Table
      dataSource={cuentas || []} columns={columns} rowKey="id" size="small" loading={isLoading} pagination={false}
      locale={{ emptyText: 'Sin cuentas bancarias registradas.' }}
    />
  )
}

export default function Configuracion() {
  return (
    <div>
      <Title level={4} style={{ marginBottom: 16 }}>Configuración</Title>
      <Card styles={{ body: { paddingTop: 8 } }}>
        <Tabs
          items={[
            { key: 'contrapartes', label: 'Contrapartes', children: <TabContrapartes /> },
            { key: 'cuentas', label: 'Plan de cuentas', children: <TabCuentas /> },
            { key: 'proveedores', label: 'Proveedores', children: <TabProveedores /> },
            { key: 'reglas', label: 'Reglas', children: <TabReglas /> },
            { key: 'bancarias', label: 'Cuentas bancarias', children: <TabBancarias /> },
          ]}
        />
      </Card>
    </div>
  )
}
