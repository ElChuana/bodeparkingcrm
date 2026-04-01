import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Table, Tag, Button, Typography, Modal, Form, Input,
  Select, Space, Switch, App, Tooltip, Tabs, InputNumber, Divider, Alert
} from 'antd'
import { PlusOutlined, EditOutlined, GiftOutlined, AppstoreOutlined, PercentageOutlined, DollarOutlined, UnorderedListOutlined, DeleteOutlined } from '@ant-design/icons'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import api from '../../services/api'

const { Title, Text } = Typography

// ─── Constantes compartidas ───────────────────────────────────────────

export const TIPO_PROMO_LABEL = {
  BENEFICIO:            'Beneficio',
  ARRIENDO_ASEGURADO:   'Arriendo asegurado',
  GASTOS_NOTARIALES:    'Gastos notariales',
  CUOTAS_SIN_INTERES:   'Cuotas sin interés',
  OTRO:                 'Otro',
  DESCUENTO_PORCENTAJE: 'Descuento %',
  DESCUENTO_UF:         'Descuento UF fijo',
  PAQUETE:              'Pack de unidades',
}

export const TIPO_PROMO_COLOR = {
  BENEFICIO:            'green',
  ARRIENDO_ASEGURADO:   'purple',
  GASTOS_NOTARIALES:    'cyan',
  CUOTAS_SIN_INTERES:   'geekblue',
  OTRO:                 'default',
  DESCUENTO_PORCENTAJE: 'orange',
  DESCUENTO_UF:         'gold',
  PAQUETE:              'blue',
}

export function resumenPromo(p) {
  if (p.tipo === 'PAQUETE')             return `Precio pack: ${p.valorUF} UF${p.unidades?.length ? ` · ${p.unidades.length} unidades` : ''}`
  if (p.tipo === 'DESCUENTO_PORCENTAJE') {
    const base = `${p.valorPorcentaje}% descuento`
    return p.minUnidades ? `${base} comprando ${p.minUnidades}+ unidades` : base
  }
  if (p.tipo === 'DESCUENTO_UF') {
    const base = `${p.valorUF} UF descuento`
    return p.minUnidades ? `${base} comprando ${p.minUnidades}+ unidades` : base
  }
  if (p.tipo === 'BENEFICIO')           return p.detalle || p.descripcion || '—'
  if (p.tipo === 'ARRIENDO_ASEGURADO')  return `${p.mesesArriendo} meses · ${p.montoMensualUF} UF/mes`
  if (p.tipo === 'GASTOS_NOTARIALES')   return p.detalle || 'Gastos notariales incluidos'
  if (p.tipo === 'CUOTAS_SIN_INTERES')  return `${p.cuotasSinInteres} cuotas sin interés`
  return p.descripcion || '—'
}

const TIPOS_PACK        = ['PAQUETE', 'DESCUENTO_PORCENTAJE', 'DESCUENTO_UF']
const TIPOS_PROMOCION   = ['BENEFICIO', 'ARRIENDO_ASEGURADO', 'GASTOS_NOTARIALES', 'CUOTAS_SIN_INTERES', 'OTRO']

// ─── Modal Unidades del Pack ──────────────────────────────────────────
function ModalUnidadesPack({ open, onClose, pack }) {
  const qc = useQueryClient()
  const { message } = App.useApp()
  const [busqueda, setBusqueda] = useState('')

  // Unidades ya en el pack (del objeto pack que incluye unidades)
  const { data: packDetalle, isLoading: cargandoPack } = useQuery({
    queryKey: ['pack-detalle', pack?.id],
    queryFn: () => api.get(`/promociones/${pack.id}`).then(r => r.data),
    enabled: !!pack?.id && open,
  })

  // Todas las unidades del sistema
  const { data: todasUnidades = [] } = useQuery({
    queryKey: ['unidades-todas'],
    queryFn: () => api.get('/unidades').then(r => r.data),
    enabled: open,
  })

  const unidadesEnPack = packDetalle?.unidades || []
  const idsEnPack = new Set(unidadesEnPack.map(u => u.unidadId))

  const agregar = useMutation({
    mutationFn: (unidadId) => api.post(`/promociones/${pack.id}/unidades`, { unidadId }),
    onSuccess: () => {
      qc.invalidateQueries(['pack-detalle', pack.id])
      qc.invalidateQueries(['promociones'])
    },
    onError: err => message.error(err.response?.data?.error || 'Error al agregar')
  })

  const quitar = useMutation({
    mutationFn: (unidadId) => api.delete(`/promociones/${pack.id}/unidades/${unidadId}`),
    onSuccess: () => {
      qc.invalidateQueries(['pack-detalle', pack.id])
      qc.invalidateQueries(['promociones'])
    },
    onError: err => message.error(err.response?.data?.error || 'Error al quitar')
  })

  // Unidades disponibles para agregar (no están en el pack)
  const disponibles = todasUnidades.filter(u => {
    if (idsEnPack.has(u.id)) return false
    if (!busqueda) return true
    const b = busqueda.toLowerCase()
    return (
      u.numero?.toLowerCase().includes(b) ||
      u.edificio?.nombre?.toLowerCase().includes(b) ||
      u.tipo?.toLowerCase().includes(b)
    )
  })

  return (
    <Modal
      title={<span><AppstoreOutlined /> Unidades del pack — {pack?.nombre}</span>}
      open={open}
      onCancel={onClose}
      footer={<Button onClick={onClose}>Cerrar</Button>}
      width={620}
    >
      {/* Unidades actuales en el pack */}
      <Text strong style={{ display: 'block', marginBottom: 8 }}>
        Unidades en el pack ({unidadesEnPack.length})
      </Text>
      {cargandoPack ? (
        <Text type="secondary">Cargando...</Text>
      ) : unidadesEnPack.length === 0 ? (
        <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
          Sin unidades asignadas. El pack aplica a todas las unidades de la cotización.
        </Text>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 16 }}>
          {unidadesEnPack.map(({ unidad, unidadId }) => (
            <div key={unidadId} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '6px 10px', borderRadius: 6, background: '#fff7e6', border: '1px solid #ffd591'
            }}>
              <Space>
                <Tag color="blue">{unidad?.tipo}</Tag>
                <Text strong>{unidad?.edificio?.nombre}</Text>
                <Text>— {unidad?.numero}</Text>
                {unidad?.estado && (
                  <Tag color={unidad.estado === 'DISPONIBLE' ? 'green' : 'default'} style={{ fontSize: 11 }}>
                    {unidad.estado.toLowerCase()}
                  </Tag>
                )}
              </Space>
              <Button
                size="small" danger type="text"
                icon={<DeleteOutlined />}
                loading={quitar.isPending}
                onClick={() => quitar.mutate(unidadId)}
              />
            </div>
          ))}
        </div>
      )}

      <Divider style={{ margin: '12px 0' }} />

      {/* Agregar unidades */}
      <Text strong style={{ display: 'block', marginBottom: 8 }}>
        Agregar unidad al pack
      </Text>
      <Input
        placeholder="Buscar por edificio, número o tipo..."
        value={busqueda}
        onChange={e => setBusqueda(e.target.value)}
        style={{ marginBottom: 8 }}
        allowClear
      />
      <div style={{ maxHeight: 260, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {disponibles.length === 0 ? (
          <Text type="secondary" style={{ fontSize: 12 }}>
            {busqueda ? 'Sin resultados' : 'Todas las unidades ya están en el pack'}
          </Text>
        ) : disponibles.map(u => (
          <div key={u.id} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '6px 10px', borderRadius: 6, background: '#fafafa', border: '1px solid #f0f0f0'
          }}>
            <Space>
              <Tag color="blue">{u.tipo}</Tag>
              <Text>{u.edificio?.nombre}</Text>
              <Text strong>— {u.numero}</Text>
              {u.precioUF && <Text type="secondary" style={{ fontSize: 12 }}>{u.precioUF} UF</Text>}
              <Tag color={u.estado === 'DISPONIBLE' ? 'green' : 'default'} style={{ fontSize: 11 }}>
                {u.estado?.toLowerCase()}
              </Tag>
            </Space>
            <Button
              size="small" type="primary" ghost
              icon={<PlusOutlined />}
              loading={agregar.isPending}
              onClick={() => agregar.mutate(u.id)}
            >
              Agregar
            </Button>
          </div>
        ))}
      </div>
    </Modal>
  )
}

// ─── Modal Pack ───────────────────────────────────────────────────────
function ModalPack({ open, onClose, pack }) {
  const qc = useQueryClient()
  const [form] = Form.useForm()
  const { message } = App.useApp()
  const tipo = Form.useWatch('tipo', form)

  const guardar = useMutation({
    mutationFn: (d) => pack ? api.put(`/promociones/${pack.id}`, d) : api.post('/promociones', d),
    onSuccess: () => {
      message.success(pack ? 'Pack actualizado' : 'Pack creado')
      qc.invalidateQueries(['promociones'])
      onClose(); form.resetFields()
    },
    onError: err => message.error(err.response?.data?.error || 'Error')
  })

  return (
    <Modal
      title={pack ? 'Editar Pack' : 'Nuevo Pack'}
      open={open}
      onCancel={() => { onClose(); form.resetFields() }}
      onOk={() => form.validateFields().then(guardar.mutate)}
      okText="Guardar" cancelText="Cancelar"
      confirmLoading={guardar.isPending}
      afterOpenChange={(o) => {
        if (o && pack) form.setFieldsValue({ ...pack, fechaInicio: pack.fechaInicio?.substring(0, 10) || '', fechaFin: pack.fechaFin?.substring(0, 10) || '' })
        if (o && !pack) form.resetFields()
      }}
      width={540}
    >
      <Alert
        type="info"
        message="Los packs afectan directamente el precio en cotizaciones"
        style={{ marginBottom: 16, marginTop: 12 }}
        showIcon
      />
      <Form form={form} layout="vertical" initialValues={{ tipo: 'DESCUENTO_UF', activa: true }}>
        <Form.Item name="nombre" label="Nombre del pack" rules={[{ required: true }]}>
          <Input placeholder="Ej: Pack 2+ unidades · Bodega + Estacionamiento mismo piso" />
        </Form.Item>

        <Form.Item name="tipo" label="Tipo de descuento" rules={[{ required: true }]}>
          <Select options={TIPOS_PACK.map(t => ({ value: t, label: TIPO_PROMO_LABEL[t] }))} />
        </Form.Item>

        {tipo === 'DESCUENTO_PORCENTAJE' && (
          <>
            <Form.Item name="valorPorcentaje" label="Porcentaje de descuento" rules={[{ required: true }]}>
              <InputNumber min={0} max={100} step={0.5} addonAfter="%" style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="minUnidades" label="Mínimo de unidades para activar (opcional)"
              extra="Si se indica, el descuento solo aplica cuando la cotización tiene ese número de unidades o más">
              <InputNumber min={2} style={{ width: '100%' }} placeholder="Ej: 2" />
            </Form.Item>
          </>
        )}

        {tipo === 'DESCUENTO_UF' && (
          <>
            <Form.Item name="valorUF" label="Descuento fijo en UF" rules={[{ required: true }]}>
              <InputNumber min={0} step={0.5} addonAfter="UF" style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="minUnidades" label="Mínimo de unidades para activar (opcional)"
              extra="Si se indica, el descuento solo aplica cuando la cotización tiene ese número de unidades o más">
              <InputNumber min={2} style={{ width: '100%' }} placeholder="Ej: 2" />
            </Form.Item>
          </>
        )}

        {tipo === 'PAQUETE' && (
          <>
            <Form.Item name="valorUF" label="Precio especial del pack (UF total)" rules={[{ required: true }]}
              extra="El descuento se calcula como la suma individual de las unidades asignadas menos este precio">
              <InputNumber min={0} step={0.5} addonAfter="UF" style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="descripcion" label="Descripción">
              <Input.TextArea rows={2} placeholder="Ej: Bodega B-12 + Estacionamiento E-05" />
            </Form.Item>
            <Alert
              type="warning" showIcon
              message="Asigna las unidades específicas del pack desde la tabla una vez guardado"
              style={{ marginBottom: 8 }}
            />
          </>
        )}

        {tipo !== 'PAQUETE' && (
          <Form.Item name="descripcion" label="Descripción (opcional)">
            <Input.TextArea rows={2} />
          </Form.Item>
        )}

        <Space align="start">
          <Form.Item name="fechaInicio" label="Vigencia desde">
            <Input type="date" style={{ width: 160 }} />
          </Form.Item>
          <Form.Item name="fechaFin" label="Hasta">
            <Input type="date" style={{ width: 160 }} />
          </Form.Item>
        </Space>

        {pack && (
          <Form.Item name="activa" label="Activo" valuePropName="checked">
            <Switch />
          </Form.Item>
        )}
      </Form>
    </Modal>
  )
}

// ─── Modal Promoción (beneficios) ─────────────────────────────────────
function ModalPromocion({ open, onClose, promo }) {
  const qc = useQueryClient()
  const [form] = Form.useForm()
  const { message } = App.useApp()
  const tipo = Form.useWatch('tipo', form)

  const guardar = useMutation({
    mutationFn: (d) => promo ? api.put(`/promociones/${promo.id}`, d) : api.post('/promociones', d),
    onSuccess: () => {
      message.success(promo ? 'Promoción actualizada' : 'Promoción creada')
      qc.invalidateQueries(['promociones'])
      onClose(); form.resetFields()
    },
    onError: err => message.error(err.response?.data?.error || 'Error')
  })

  return (
    <Modal
      title={promo ? 'Editar Promoción' : 'Nueva Promoción'}
      open={open}
      onCancel={() => { onClose(); form.resetFields() }}
      onOk={() => form.validateFields().then(guardar.mutate)}
      okText="Guardar" cancelText="Cancelar"
      confirmLoading={guardar.isPending}
      afterOpenChange={(o) => {
        if (o && promo) form.setFieldsValue({ ...promo, fechaInicio: promo.fechaInicio?.substring(0, 10) || '', fechaFin: promo.fechaFin?.substring(0, 10) || '' })
        if (o && !promo) form.resetFields()
      }}
      width={520}
    >
      <Alert
        type="success"
        message="Las promociones son beneficios adicionales que no afectan el precio base"
        style={{ marginBottom: 16, marginTop: 12 }}
        showIcon
      />
      <Form form={form} layout="vertical" initialValues={{ tipo: 'BENEFICIO', activa: true }}>
        <Form.Item name="nombre" label="Nombre" rules={[{ required: true }]}>
          <Input placeholder="Ej: 3 meses de gastos comunes gratis" />
        </Form.Item>

        <Form.Item name="tipo" label="Tipo" rules={[{ required: true }]}>
          <Select options={TIPOS_PROMOCION.map(t => ({ value: t, label: TIPO_PROMO_LABEL[t] }))} />
        </Form.Item>

        {tipo === 'BENEFICIO' && (
          <Form.Item name="detalle" label="Detalle" rules={[{ required: true }]}>
            <Input placeholder="Ej: Cortinas blackout incluidas · Repisa de regalo" />
          </Form.Item>
        )}

        {tipo === 'ARRIENDO_ASEGURADO' && (
          <Space style={{ width: '100%' }} align="start">
            <Form.Item name="mesesArriendo" label="Meses garantizados">
              <InputNumber min={1} style={{ width: 150 }} addonAfter="meses" />
            </Form.Item>
            <Form.Item name="montoMensualUF" label="Monto mensual">
              <InputNumber min={0} step={0.01} style={{ width: 160 }} addonAfter="UF/mes" />
            </Form.Item>
          </Space>
        )}

        {tipo === 'CUOTAS_SIN_INTERES' && (
          <Form.Item name="cuotasSinInteres" label="Número de cuotas">
            <InputNumber min={1} style={{ width: 160 }} />
          </Form.Item>
        )}

        <Form.Item name="descripcion" label="Descripción adicional">
          <Input.TextArea rows={2} />
        </Form.Item>

        <Space align="start">
          <Form.Item name="fechaInicio" label="Vigencia desde">
            <Input type="date" style={{ width: 160 }} />
          </Form.Item>
          <Form.Item name="fechaFin" label="Hasta">
            <Input type="date" style={{ width: 160 }} />
          </Form.Item>
        </Space>

        {promo && (
          <Form.Item name="activa" label="Activa" valuePropName="checked">
            <Switch />
          </Form.Item>
        )}
      </Form>
    </Modal>
  )
}

// ─── Columnas compartidas ─────────────────────────────────────────────
function columnaVigencia(p) {
  if (!p.fechaInicio && !p.fechaFin) return <Text type="secondary" style={{ fontSize: 12 }}>Sin límite</Text>
  return (
    <Text style={{ fontSize: 12 }}>
      {p.fechaInicio ? format(new Date(p.fechaInicio), 'd MMM yyyy', { locale: es }) : '—'}
      {' → '}
      {p.fechaFin ? format(new Date(p.fechaFin), 'd MMM yyyy', { locale: es }) : '∞'}
    </Text>
  )
}

// ─── Tab Packs ────────────────────────────────────────────────────────
function TabPacks({ promociones, isLoading }) {
  const [modalOpen, setModalOpen] = useState(false)
  const [editando, setEditando] = useState(null)
  const [modalUnidades, setModalUnidades] = useState(null) // pack seleccionado para gestionar unidades

  const packs = promociones.filter(p => TIPOS_PACK.includes(p.tipo))

  const abrir = (p = null) => { setEditando(p); setModalOpen(true) }

  const columns = [
    {
      title: 'Pack', key: 'nombre',
      render: (_, p) => (
        <div>
          <Text strong style={{ fontSize: 13 }}>{p.nombre}</Text>
          <div><Text type="secondary" style={{ fontSize: 12 }}>{resumenPromo(p)}</Text></div>
        </div>
      )
    },
    {
      title: 'Tipo', key: 'tipo', width: 160,
      render: (_, p) => (
        <Tag color={TIPO_PROMO_COLOR[p.tipo]} icon={
          p.tipo === 'DESCUENTO_PORCENTAJE' ? <PercentageOutlined /> :
          p.tipo === 'DESCUENTO_UF' ? <DollarOutlined /> :
          <AppstoreOutlined />
        }>
          {TIPO_PROMO_LABEL[p.tipo]}
        </Tag>
      )
    },
    {
      title: 'Condición', key: 'cond', width: 180,
      render: (_, p) => {
        if (p.tipo === 'PAQUETE') return <Tag color="blue">{p._count?.unidades ?? 0} unidades en pack</Tag>
        if (p.minUnidades) return <Tag color="volcano">{p.minUnidades}+ unidades requeridas</Tag>
        return <Text type="secondary" style={{ fontSize: 12 }}>Sin mínimo</Text>
      }
    },
    { title: 'Vigencia', key: 'vig', width: 190, render: (_, p) => columnaVigencia(p) },
    { title: 'Usos', key: 'usos', width: 60, align: 'center', render: (_, p) => p._count?.ventas ?? 0 },
    { title: 'Estado', key: 'activa', width: 90, render: (_, p) => <Tag color={p.activa ? 'green' : 'default'}>{p.activa ? 'Activo' : 'Inactivo'}</Tag> },
    {
      title: '', key: 'accion', width: 100,
      render: (_, p) => (
        <Space size={4}>
          {p.tipo === 'PAQUETE' && (
            <Tooltip title="Gestionar unidades del pack">
              <Button
                size="small" icon={<UnorderedListOutlined />} type="text"
                onClick={() => setModalUnidades(p)}
              />
            </Tooltip>
          )}
          <Tooltip title="Editar">
            <Button size="small" icon={<EditOutlined />} type="text" onClick={() => abrir(p)} />
          </Tooltip>
        </Space>
      )
    }
  ]

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Text type="secondary">
          Los packs afectan directamente el precio: descuentos por cantidad o precios especiales al comprar combinaciones de unidades.
        </Text>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => abrir()}>Nuevo pack</Button>
      </div>
      <Table dataSource={packs} columns={columns} rowKey="id" loading={isLoading} size="small" pagination={false} locale={{ emptyText: 'Sin packs' }} />
      <ModalPack open={modalOpen} onClose={() => { setModalOpen(false); setEditando(null) }} pack={editando} />
      <ModalUnidadesPack open={!!modalUnidades} onClose={() => setModalUnidades(null)} pack={modalUnidades} />
    </>
  )
}

// ─── Tab Promociones ──────────────────────────────────────────────────
function TabPromociones({ promociones, isLoading }) {
  const [modalOpen, setModalOpen] = useState(false)
  const [editando, setEditando] = useState(null)

  const promos = promociones.filter(p => TIPOS_PROMOCION.includes(p.tipo))

  const abrir = (p = null) => { setEditando(p); setModalOpen(true) }

  const columns = [
    {
      title: 'Promoción', key: 'nombre',
      render: (_, p) => (
        <div>
          <Text strong style={{ fontSize: 13 }}>{p.nombre}</Text>
          <div><Text type="secondary" style={{ fontSize: 12 }}>{resumenPromo(p)}</Text></div>
        </div>
      )
    },
    {
      title: 'Tipo', key: 'tipo', width: 180,
      render: (_, p) => (
        <Tag color={TIPO_PROMO_COLOR[p.tipo]} icon={<GiftOutlined />}>{TIPO_PROMO_LABEL[p.tipo]}</Tag>
      )
    },
    { title: 'Vigencia', key: 'vig', width: 200, render: (_, p) => columnaVigencia(p) },
    { title: 'Usos', key: 'usos', width: 70, align: 'center', render: (_, p) => p._count?.ventas ?? 0 },
    { title: 'Estado', key: 'activa', width: 90, render: (_, p) => <Tag color={p.activa ? 'green' : 'default'}>{p.activa ? 'Activa' : 'Inactiva'}</Tag> },
    {
      title: '', key: 'accion', width: 60,
      render: (_, p) => <Tooltip title="Editar"><Button size="small" icon={<EditOutlined />} type="text" onClick={() => abrir(p)} /></Tooltip>
    }
  ]

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Text type="secondary">
          Las promociones son beneficios adicionales que se incluyen en la venta, sin modificar el precio base.
        </Text>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => abrir()}>Nueva promoción</Button>
      </div>
      <Table dataSource={promos} columns={columns} rowKey="id" loading={isLoading} size="small" pagination={false} locale={{ emptyText: 'Sin promociones' }} />
      <ModalPromocion open={modalOpen} onClose={() => { setModalOpen(false); setEditando(null) }} promo={editando} />
    </>
  )
}

// ─── Página ───────────────────────────────────────────────────────────
export default function Promociones() {
  const { data: promociones = [], isLoading } = useQuery({
    queryKey: ['promociones'],
    queryFn: () => api.get('/promociones').then(r => r.data)
  })

  const nPacks = promociones.filter(p => TIPOS_PACK.includes(p.tipo)).length
  const nPromos = promociones.filter(p => TIPOS_PROMOCION.includes(p.tipo)).length

  const tabs = [
    {
      key: 'packs',
      label: <span><AppstoreOutlined /> Packs <Tag style={{ marginLeft: 4 }}>{nPacks}</Tag></span>,
      children: <TabPacks promociones={promociones} isLoading={isLoading} />
    },
    {
      key: 'promociones',
      label: <span><GiftOutlined /> Promociones <Tag style={{ marginLeft: 4 }}>{nPromos}</Tag></span>,
      children: <TabPromociones promociones={promociones} isLoading={isLoading} />
    },
  ]

  return (
    <div>
      <Title level={4} style={{ marginBottom: 16 }}>Packs y Promociones</Title>
      <Tabs items={tabs} />
    </div>
  )
}
