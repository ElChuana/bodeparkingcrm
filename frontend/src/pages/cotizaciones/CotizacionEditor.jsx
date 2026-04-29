import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Card, Button, Typography, Space, Tag, Input, Select, InputNumber,
  Divider, Empty, Spin, Row, Col, App, Tooltip, Alert,
  Modal, Form, Popconfirm, Radio
} from 'antd'
import {
  PlusOutlined, DeleteOutlined, SaveOutlined,
  CheckCircleOutlined, ArrowLeftOutlined,
  FilePdfOutlined, ShoppingOutlined
} from '@ant-design/icons'
import { PDFDownloadLink, pdf } from '@react-pdf/renderer'
import { CotizacionDocumento } from './CotizacionPDF'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import { useUF } from '../../hooks/useUF'
import logoUrl from '../../assets/logo.png'

const { Title, Text } = Typography

// ── Panel selector de unidades ──────────────────────────────────
function SelectorUnidades({ items, onAdd, onRemove }) {
  const [search, setSearch] = useState('')
  const [edificioFiltro, setEdificioFiltro] = useState(undefined)
  const [tipoFiltro, setTipoFiltro] = useState(undefined)

  const { data: disponibles = [], isLoading } = useQuery({
    queryKey: ['cotizacion-unidades', edificioFiltro, tipoFiltro, search],
    queryFn: ({ queryKey }) => api.get('/cotizaciones/unidades-disponibles', {
      params: { edificioId: queryKey[1], tipo: queryKey[2], search: queryKey[3] || undefined }
    }).then(r => r.data)
  })

  const { data: edificios = [] } = useQuery({
    queryKey: ['edificios-lista'],
    queryFn: () => api.get('/edificios').then(r => r.data)
  })

  const yaAgregados = new Set(items.map(i => i.unidadId))

  return (
    <Card title="Unidades disponibles" size="small">
      <Space style={{ marginBottom: 10, flexWrap: 'wrap' }} size={6}>
        <Input.Search
          placeholder="Buscar número o edificio..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          allowClear size="small" style={{ width: 200 }}
        />
        <Select
          placeholder="Edificio" allowClear size="small" style={{ width: 150 }}
          value={edificioFiltro} onChange={setEdificioFiltro}
          options={edificios.map(e => ({ value: e.id, label: e.nombre }))}
        />
        <Select
          placeholder="Tipo" allowClear size="small" style={{ width: 130 }}
          value={tipoFiltro} onChange={setTipoFiltro}
          options={[{ value: 'BODEGA', label: 'Bodega' }, { value: 'ESTACIONAMIENTO', label: 'Estacionamiento' }]}
        />
      </Space>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 20 }}><Spin size="small" /></div>
      ) : disponibles.length === 0 ? (
        <Empty description="Sin unidades disponibles" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <div style={{ maxHeight: 400, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {disponibles.map(u => {
            const agregado = yaAgregados.has(u.id)
            return (
              <div
                key={u.id}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '8px 10px', borderRadius: 8,
                  background: agregado ? '#f0f5ff' : '#fafafa',
                  border: `1px solid ${agregado ? '#adc6ff' : '#f0f0f0'}`,
                }}
              >
                <div>
                  <Text strong style={{ fontSize: 13 }}>
                    {u.edificio.nombre} — {u.tipo === 'BODEGA' ? 'Bodega' : 'Est.'} {u.numero}
                  </Text>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 2 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>{u.precioUF} UF</Text>
                    {u.tipo === 'BODEGA' && u.m2 && <Text type="secondary" style={{ fontSize: 12 }}>{u.m2} m²</Text>}
                    {u.precioMinimoUF && <Text type="secondary" style={{ fontSize: 11 }}>mín. {u.precioMinimoUF} UF</Text>}
                  </div>
                </div>
                <Button
                  size="small"
                  type={agregado ? 'default' : 'primary'}
                  icon={agregado ? <DeleteOutlined /> : <PlusOutlined />}
                  onClick={() => agregado ? onRemove(u.id) : onAdd(u)}
                  danger={agregado}
                >
                  {agregado ? 'Quitar' : 'Agregar'}
                </Button>
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}

// ── Panel de resumen de precio ──────────────────────────────────
function ResumenPrecio({ cotizacion }) {
  const items = cotizacion?.items || []
  const packs = cotizacion?.packs || []
  const beneficios = cotizacion?.beneficios || []
  const descAprobado = cotizacion?.descuentoAprobadoUF || 0

  const precioLista = items.reduce((s, i) => s + (i.precioListaUF || 0), 0)
  const descPacks = packs.reduce((s, p) => s + (p.descuentoAplicadoUF || 0), 0)
  const precioFinal = Math.max(precioLista - descPacks - descAprobado, 0)

  return (
    <Card title="Resumen de precio" size="small" style={{ background: '#f8faff', border: '1px solid #d6e4ff' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {items.map(i => (
          <div key={i.unidadId || i.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
            <Text type="secondary">
              {i.unidad?.edificio?.nombre || i.edificio} — {i.unidad?.tipo === 'BODEGA' || i.tipo === 'BODEGA' ? 'Bodega' : 'Est.'} {i.unidad?.numero || i.numero}
              {(i.unidad?.tipo === 'BODEGA' || i.tipo === 'BODEGA') && (i.unidad?.m2 || i.m2) ? ` · ${i.unidad?.m2 || i.m2} m²` : ''}
            </Text>
            <Text strong>{(i.precioListaUF || 0).toFixed(2)} UF</Text>
          </div>
        ))}

        {items.length > 1 && (
          <>
            <Divider style={{ margin: '4px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <Text>Precio de lista</Text>
              <Text strong>{precioLista.toFixed(2)} UF</Text>
            </div>
          </>
        )}

        {descPacks > 0 && (
          <>
            <Divider style={{ margin: '4px 0' }} />
            {packs.map(p => (
              <div key={p.packId} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <Text style={{ color: '#d46b08' }}>− Pack: {p.pack.nombre}</Text>
                <Text style={{ color: '#d46b08' }}>−{p.descuentoAplicadoUF.toFixed(2)} UF</Text>
              </div>
            ))}
          </>
        )}

        {descAprobado > 0 && (
          <>
            <Divider style={{ margin: '4px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <Text style={{ color: '#d46b08' }}>
                <CheckCircleOutlined style={{ color: '#d46b08', marginRight: 4 }} />
                Descuento aprobado
              </Text>
              <Text style={{ color: '#d46b08' }}>−{descAprobado.toFixed(2)} UF</Text>
            </div>
          </>
        )}

        {beneficios.length > 0 && (
          <>
            <Divider style={{ margin: '4px 0' }} />
            {beneficios.map(b => (
              <div key={b.beneficioId} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                <CheckCircleOutlined style={{ color: '#52c41a' }} />
                <Text style={{ color: '#52c41a' }}>{b.beneficio.nombre}</Text>
              </div>
            ))}
          </>
        )}

        <Divider style={{ margin: '6px 0' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <Text strong style={{ fontSize: 15 }}>Total</Text>
          <Text strong style={{ fontSize: 17, color: '#1677ff' }}>{precioFinal.toFixed(2)} UF</Text>
        </div>
      </div>
    </Card>
  )
}

// ── Panel solicitud de descuento ────────────────────────────────
function PanelDescuento({ cotizacionId, esGerente, soloLectura }) {
  const qc = useQueryClient()
  const { message } = App.useApp()
  const [modalOpen, setModalOpen] = useState(false)
  const [form] = Form.useForm()
  const tipo = Form.useWatch('tipo', form)
  const valor = Form.useWatch('valor', form)
  const { valorUF, ufAPesos, formatPesos } = useUF()

  const { data: solicitudes = [] } = useQuery({
    queryKey: ['solicitudes-descuento-cot', cotizacionId],
    queryFn: () => api.get(`/descuentos/cotizacion/${cotizacionId}`).then(r => r.data),
    enabled: !!cotizacionId,
    refetchInterval: 15000,
  })

  const { data: cotData } = useQuery({
    queryKey: ['cotizacion', String(cotizacionId)],
    queryFn: () => api.get(`/cotizaciones/${cotizacionId}`).then(r => r.data),
    enabled: modalOpen && !!cotizacionId,
    staleTime: 30000,
  })

  const cotItems = cotData?.items || []
  const base = cotItems.reduce((s, i) => s + (i.precioListaUF || 0), 0)

  const calcDescuentoUF = () => {
    if (!valor || !base) return 0
    if (tipo === 'UF') return Number(valor)
    if (tipo === 'PORCENTAJE') return +(base * Number(valor) / 100).toFixed(2)
    if (tipo === 'PESOS') return valorUF ? +(Number(valor) / valorUF).toFixed(2) : 0
    return 0
  }
  const descuentoUF = calcDescuentoUF()
  const finalUF = Math.max(base - descuentoUF, 0)

  const solicitar = useMutation({
    mutationFn: (d) => api.post('/descuentos', { ...d, cotizacionId }),
    onSuccess: () => {
      message.success('Solicitud enviada al gerente')
      qc.invalidateQueries({ queryKey: ['solicitudes-descuento-cot', cotizacionId] })
      setModalOpen(false)
      form.resetFields()
    },
    onError: err => message.error(err.response?.data?.error || 'Error')
  })

  const aplicarDirecto = useMutation({
    mutationFn: (d) => api.put(`/descuentos/cotizacion/${cotizacionId}/directo`, d),
    onSuccess: () => {
      message.success('Descuento aplicado')
      qc.invalidateQueries({ queryKey: ['cotizacion', String(cotizacionId)] })
      qc.invalidateQueries({ queryKey: ['solicitudes-descuento-cot', cotizacionId] })
      setModalOpen(false)
      form.resetFields()
    },
    onError: err => message.error(err.response?.data?.error || 'Error')
  })

  const handleSubmit = () => {
    form.validateFields().then(v => {
      let data = { ...v }
      if (v.tipo === 'PESOS') {
        data = { ...v, tipo: 'UF', valor: +(Number(v.valor) / valorUF).toFixed(2) }
      }
      esGerente ? aplicarDirecto.mutate(data) : solicitar.mutate(data)
    })
  }

  const pendiente = solicitudes.find(s => s.estado === 'PENDIENTE')
  const aprobada  = solicitudes.find(s => s.estado === 'APROBADA')
  const ESTADO_COLOR = { PENDIENTE: 'orange', APROBADA: 'green', RECHAZADA: 'red' }
  const ESTADO_LABEL = { PENDIENTE: 'Pendiente', APROBADA: 'Aprobada', RECHAZADA: 'Rechazada' }

  const puedeAgregarDescuento = !soloLectura && (esGerente || (!pendiente && !aprobada))

  const labelValor = tipo === 'PORCENTAJE' ? 'Porcentaje' : tipo === 'PESOS' ? 'Monto en pesos' : 'Monto en UF'
  const addonValor = tipo === 'PORCENTAJE' ? '%' : tipo === 'PESOS' ? 'CLP' : 'UF'
  const stepValor  = tipo === 'PESOS' ? 10000 : 0.5

  return (
    <Card
      size="small"
      title={<Text strong style={{ color: '#d46b08' }}>Descuento</Text>}
      extra={
        puedeAgregarDescuento && (
          <Button size="small" type="dashed" danger onClick={() => setModalOpen(true)}>
            {esGerente ? 'Aplicar descuento' : 'Solicitar descuento'}
          </Button>
        )
      }
      style={{ borderColor: '#ffd591' }}
    >
      {solicitudes.length === 0 ? (
        <Text type="secondary" style={{ fontSize: 12 }}>Sin descuento aplicado</Text>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {solicitudes.map(s => (
            <div key={s.id} style={{
              padding: '8px 10px', borderRadius: 6, fontSize: 12,
              background: s.estado === 'APROBADA' ? '#f6ffed' : s.estado === 'RECHAZADA' ? '#fff2f0' : '#fffbe6',
              border: `1px solid ${s.estado === 'APROBADA' ? '#b7eb8f' : s.estado === 'RECHAZADA' ? '#ffccc7' : '#ffe58f'}`,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <Space size={4}>
                  <Tag color={ESTADO_COLOR[s.estado]} style={{ fontSize: 11 }}>{ESTADO_LABEL[s.estado]}</Tag>
                  <Text strong style={{ fontSize: 13 }}>
                    {s.tipo === 'UF' ? `${s.valor} UF` : `${s.valor}%`}
                  </Text>
                </Space>
                <Text type="secondary" style={{ fontSize: 11 }}>
                  {s.solicitadoPor.nombre} {s.solicitadoPor.apellido}
                </Text>
              </div>
              <Text style={{ fontSize: 12 }}>{s.motivo}</Text>
              {s.comentario && (
                <div style={{ marginTop: 4 }}>
                  <Text type="secondary" style={{ fontSize: 11 }}>Nota: {s.comentario}</Text>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal
        title={esGerente ? 'Aplicar descuento directo' : 'Solicitar descuento al gerente'}
        open={modalOpen}
        onCancel={() => { setModalOpen(false); form.resetFields() }}
        onOk={handleSubmit}
        okText={esGerente ? 'Aplicar descuento' : 'Enviar solicitud'}
        cancelText="Cancelar"
        confirmLoading={solicitar.isPending || aplicarDirecto.isPending}
      >
        {!esGerente && (
          <Alert
            type="info" showIcon style={{ marginBottom: 16, marginTop: 12 }}
            message="La solicitud será revisada por el gerente. Cuando sea aprobada, el descuento se aplicará automáticamente."
          />
        )}

        {/* Precio base de la cotización */}
        {base > 0 && (
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '8px 12px', borderRadius: 6, background: '#f0f5ff',
            marginBottom: 16, marginTop: esGerente ? 12 : 0
          }}>
            <Text type="secondary" style={{ fontSize: 12 }}>Precio total cotización</Text>
            <div style={{ textAlign: 'right' }}>
              <Text strong>{base.toFixed(2)} UF</Text>
              {valorUF && (
                <div>
                  <Text type="secondary" style={{ fontSize: 11 }}>{formatPesos(ufAPesos(base))}</Text>
                </div>
              )}
            </div>
          </div>
        )}

        <Form form={form} layout="vertical" initialValues={{ tipo: 'UF' }} style={{ marginTop: (!esGerente || base > 0) ? 0 : 12 }}>
          <Form.Item name="tipo" label="Tipo de descuento" rules={[{ required: true }]}>
            <Select options={[
              { value: 'UF',         label: 'Monto fijo en UF' },
              { value: 'PESOS',      label: 'Monto en pesos ($)' },
              { value: 'PORCENTAJE', label: 'Porcentaje (%)' },
            ]} />
          </Form.Item>
          <Form.Item name="valor" label={labelValor} rules={[{ required: true }]}>
            <InputNumber
              min={tipo === 'PESOS' ? 1000 : 0.1}
              step={stepValor}
              style={{ width: '100%' }}
              addonAfter={addonValor}
              formatter={tipo === 'PESOS' ? v => v && Number(v).toLocaleString('es-CL') : undefined}
              parser={tipo === 'PESOS' ? v => v.replace(/\D/g, '') : undefined}
            />
          </Form.Item>

          {/* Preview del resultado */}
          {descuentoUF > 0 && base > 0 && (
            <div style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid #e8e8e8', marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 12px', background: '#fafafa' }}>
                <Text type="secondary" style={{ fontSize: 12 }}>Precio base</Text>
                <div style={{ textAlign: 'right' }}>
                  <Text style={{ fontSize: 12 }}>{base.toFixed(2)} UF</Text>
                  {valorUF && <div><Text type="secondary" style={{ fontSize: 11 }}>{formatPesos(ufAPesos(base))}</Text></div>}
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 12px', background: '#fff7e6', borderTop: '1px solid #ffe58f' }}>
                <Text style={{ color: '#d46b08', fontSize: 12 }}>Descuento</Text>
                <div style={{ textAlign: 'right' }}>
                  <Text style={{ color: '#d46b08', fontSize: 12 }}>− {descuentoUF.toFixed(2)} UF</Text>
                  {valorUF && <div><Text type="secondary" style={{ fontSize: 11 }}>− {formatPesos(ufAPesos(descuentoUF))}</Text></div>}
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 12px', background: '#f6ffed', borderTop: '1px solid #b7eb8f' }}>
                <Text strong style={{ fontSize: 13 }}>Total con descuento</Text>
                <div style={{ textAlign: 'right' }}>
                  <Text strong style={{ fontSize: 16, color: '#389e0d' }}>{finalUF.toFixed(2)} UF</Text>
                  {valorUF && <div><Text type="secondary" style={{ fontSize: 11 }}>{formatPesos(ufAPesos(finalUF))}</Text></div>}
                </div>
              </div>
            </div>
          )}

          <Form.Item
            name="motivo"
            label={esGerente ? 'Motivo (opcional)' : 'Motivo de la solicitud'}
            rules={esGerente ? [] : [{ required: true, message: 'Explica el motivo' }]}
          >
            <Input.TextArea rows={2} placeholder="Ej: Cliente frecuente, descuento para cerrar negocio..." />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  )
}

// ── Panels de packs y beneficios ───────────────────────────────
function PanelPacks({ cotizacionId, packs, soloLectura }) {
  const qc = useQueryClient()
  const { message } = App.useApp()

  const { data: todosLosPacks = [] } = useQuery({
    queryKey: ['packs-activos'],
    queryFn: () => api.get('/packs', { params: { activa: true } }).then(r => r.data)
  })

  const packIds = new Set(packs.map(p => p.packId))
  const packsDisponibles = todosLosPacks.filter(p => !packIds.has(p.id))

  const agregar = useMutation({
    mutationFn: (packId) => api.post(`/cotizaciones/${cotizacionId}/packs`, { packId }),
    onSuccess: () => { message.success('Pack agregado'); qc.invalidateQueries(['cotizacion', String(cotizacionId)]) },
    onError: err => message.error(err.response?.data?.error || 'Error al agregar pack')
  })

  const quitar = useMutation({
    mutationFn: (packId) => api.delete(`/cotizaciones/${cotizacionId}/packs/${packId}`),
    onSuccess: () => { message.success('Pack quitado'); qc.invalidateQueries(['cotizacion', String(cotizacionId)]) },
    onError: err => message.error(err.response?.data?.error || 'Error')
  })

  return (
    <Card
      size="small"
      title={<Text strong style={{ color: '#d46b08' }}>Packs — descuentos sobre el precio</Text>}
      style={{ borderColor: '#ffd591' }}
      extra={
        !soloLectura && packsDisponibles.length > 0 && (
          <Select
            placeholder="Agregar pack..."
            size="small"
            style={{ width: 200 }}
            showSearch
            filterOption={(v, o) => o.label.toLowerCase().includes(v.toLowerCase())}
            options={packsDisponibles.map(p => ({ value: p.id, label: `${p.nombre} (−${p.descuentoUF} UF)` }))}
            onChange={id => agregar.mutate(id)}
            value={null}
          />
        )
      }
    >
      {packs.length === 0 ? (
        <Text type="secondary" style={{ fontSize: 12 }}>Sin packs aplicados</Text>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {packs.map(cp => (
            <div key={cp.packId} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '6px 10px', borderRadius: 8, background: '#fff7e6', border: '1px solid #ffd591'
            }}>
              <div>
                <Text strong style={{ fontSize: 13 }}>{cp.pack.nombre}</Text>
                {cp.pack.descripcion && <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>{cp.pack.descripcion}</Text>}
                <div><Text style={{ color: '#d46b08', fontSize: 12 }}>−{cp.descuentoAplicadoUF} UF</Text></div>
              </div>
              {!soloLectura && (
                <Button size="small" danger type="text" icon={<DeleteOutlined />} onClick={() => quitar.mutate(cp.packId)} />
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

function PanelBeneficios({ cotizacionId, beneficios, soloLectura }) {
  const qc = useQueryClient()
  const { message } = App.useApp()

  const { data: todosBeneficios = [] } = useQuery({
    queryKey: ['beneficios-activos'],
    queryFn: () => api.get('/beneficios', { params: { activa: true } }).then(r => r.data)
  })

  const beneficioIds = new Set(beneficios.map(b => b.beneficioId))
  const disponibles = todosBeneficios.filter(b => !beneficioIds.has(b.id))

  const agregar = useMutation({
    mutationFn: (beneficioId) => api.post(`/cotizaciones/${cotizacionId}/beneficios`, { beneficioId }),
    onSuccess: () => { message.success('Beneficio agregado'); qc.invalidateQueries(['cotizacion', String(cotizacionId)]) },
    onError: err => message.error(err.response?.data?.error || 'Error')
  })

  const quitar = useMutation({
    mutationFn: (beneficioId) => api.delete(`/cotizaciones/${cotizacionId}/beneficios/${beneficioId}`),
    onSuccess: () => { message.success('Beneficio quitado'); qc.invalidateQueries(['cotizacion', String(cotizacionId)]) },
    onError: err => message.error(err.response?.data?.error || 'Error')
  })

  const TIPO_LABEL = { ARRIENDO_ASEGURADO: 'Arriendo asegurado', GASTOS_NOTARIALES: 'Gastos notariales', CUOTAS_SIN_INTERES: 'Cuotas sin interés', OTRO: 'Otro' }

  return (
    <Card
      size="small"
      title={<Text strong style={{ color: '#389e0d' }}>Beneficios adicionales</Text>}
      style={{ borderColor: '#b7eb8f' }}
      extra={
        !soloLectura && disponibles.length > 0 && (
          <Select
            placeholder="Agregar beneficio..."
            size="small"
            style={{ width: 200 }}
            showSearch
            filterOption={(v, o) => o.label.toLowerCase().includes(v.toLowerCase())}
            options={disponibles.map(b => ({ value: b.id, label: b.nombre }))}
            onChange={id => agregar.mutate(id)}
            value={null}
          />
        )
      }
    >
      {beneficios.length === 0 ? (
        <Text type="secondary" style={{ fontSize: 12 }}>Sin beneficios aplicados</Text>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {beneficios.map(cb => (
            <div key={cb.beneficioId} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '6px 10px', borderRadius: 8, background: '#f6ffed', border: '1px solid #b7eb8f'
            }}>
              <div>
                <Tag color="green" style={{ fontSize: 11 }}>{TIPO_LABEL[cb.beneficio.tipo] || cb.beneficio.tipo}</Tag>
                <Text style={{ fontSize: 13 }}>{cb.beneficio.nombre}</Text>
              </div>
              {!soloLectura && (
                <Button size="small" danger type="text" icon={<DeleteOutlined />} onClick={() => quitar.mutate(cb.beneficioId)} />
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

// Transforma packs/beneficios al formato promociones que espera CotizacionDocumento
function cotizacionParaPDF(cot) {
  const promociones = [
    ...(cot.packs || []).map(cp => ({
      aplicada: true,
      ahorroUF: cp.descuentoAplicadoUF,
      promocion: { nombre: cp.pack?.nombre || 'Pack', tipo: 'DESCUENTO_UF', valorUF: cp.descuentoAplicadoUF }
    })),
    ...(cot.beneficios || []).map(cb => ({
      aplicada: true,
      ahorroUF: 0,
      promocion: { nombre: cb.beneficio?.nombre || 'Beneficio', tipo: cb.beneficio?.tipo || 'OTRO' }
    }))
  ]
  return { ...cot, promociones }
}

// ── Página principal editor ─────────────────────────────────────
export default function CotizacionEditor() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { message } = App.useApp()
  const { usuario } = useAuth()
  const { valorUF } = useUF()

  const leadIdParam = searchParams.get('leadId')
  const esNueva = !id

  // Estado del editor
  const [items, setItems] = useState([])          // { unidadId, precioListaUF, numero, tipo, edificio }
  const [notas, setNotas] = useState('')
  const [validezDias, setValidezDias] = useState(30)
  const [leadId, setLeadId] = useState(leadIdParam ? Number(leadIdParam) : null)
  const [modalConvertir, setModalConvertir] = useState(false)
  const [conPromesa, setConPromesa] = useState(true)

  // Cargar cotización existente
  const { data: cotizacion, isLoading: cargando } = useQuery({
    queryKey: ['cotizacion', id],
    queryFn: () => api.get(`/cotizaciones/${id}`).then(r => r.data),
    enabled: !esNueva,
  })

  useEffect(() => {
    if (cotizacion) {
      setLeadId(cotizacion.leadId)
      setNotas(cotizacion.notas || '')
      setValidezDias(cotizacion.validezDias)
      setItems(cotizacion.items.map(i => ({
        unidadId: i.unidadId,
        precioListaUF: i.precioListaUF,
        numero: i.unidad.numero,
        tipo: i.unidad.tipo,
        edificio: i.unidad.edificio.nombre,
      })))
    }
  }, [cotizacion])

  // Info del lead
  const { data: lead } = useQuery({
    queryKey: ['lead', leadId],
    queryFn: () => api.get(`/leads/${leadId}`).then(r => r.data),
    enabled: !!leadId,
  })

  // ─── Handlers ───────────────────────────────────────────────
  const agregarUnidad = (unidad) => {
    if (items.some(i => i.unidadId === unidad.id)) return
    setItems(prev => [...prev, {
      unidadId: unidad.id,
      precioListaUF: unidad.precioUF,
      numero: unidad.numero,
      tipo: unidad.tipo,
      edificio: unidad.edificio.nombre,
    }])
  }

  const quitarUnidad = (unidadId) => {
    setItems(prev => prev.filter(i => i.unidadId !== unidadId))
  }

  const cambiarPrecio = (unidadId, precio) => {
    setItems(prev => prev.map(i => i.unidadId === unidadId ? { ...i, precioListaUF: precio } : i))
  }

  const buildPayload = () => ({
    leadId,
    notas,
    validezDias,
    items: items.map(i => ({ unidadId: i.unidadId, precioListaUF: i.precioListaUF })),
  })

  // ─── Mutations ──────────────────────────────────────────────
  const guardar = useMutation({
    mutationFn: (payload) => esNueva
      ? api.post('/cotizaciones', payload)
      : api.put(`/cotizaciones/${id}`, payload),
    onSuccess: (res) => {
      message.success('Cotización guardada')
      qc.invalidateQueries({ queryKey: ['cotizaciones'] })
      if (esNueva) navigate(`/cotizaciones/${res.data.id}`)
    },
    onError: err => message.error(err.response?.data?.error || 'Error al guardar')
  })

  const enviar = useMutation({
    mutationFn: async () => {
      if (esNueva || cotizacion?.estado === 'BORRADOR') {
        // Primero guardar si hay cambios
        const payload = buildPayload()
        if (esNueva) {
          const res = await api.post('/cotizaciones', payload)
          await api.put(`/cotizaciones/${res.data.id}/estado`, { estado: 'ENVIADA' })
          return res
        }
        await api.put(`/cotizaciones/${id}`, payload)
      }
      return api.put(`/cotizaciones/${id}/estado`, { estado: 'ENVIADA' })
    },
    onSuccess: () => {
      message.success('Cotización enviada')
      qc.invalidateQueries({ queryKey: ['cotizaciones'] })
      if (leadId) navigate(`/leads/${leadId}`)
    },
    onError: err => message.error(err.response?.data?.error || 'Error')
  })

  const convertir = useMutation({
    mutationFn: (conPromesaVal) => api.post(`/cotizaciones/${id}/convertir`, { conPromesa: conPromesaVal }),
    onSuccess: (res) => {
      message.success('¡Venta creada exitosamente!')
      qc.invalidateQueries({ queryKey: ['cotizacion', id] })
      navigate(`/ventas/${res.data.id}`)
    },
    onError: err => message.error(err.response?.data?.error || 'Error al convertir')
  })

  if (cargando) return <div style={{ textAlign: 'center', padding: 60 }}><Spin /></div>

  const estado = cotizacion?.estado || 'BORRADOR'
  const soloLectura = ['ACEPTADA', 'RECHAZADA'].includes(estado)
  const unidadesBloqueadas = !esNueva // una vez guardada, las unidades no se pueden modificar
  const puedeConvertir = !soloLectura && cotizacion && !cotizacion.ventaOrigen && (cotizacion.items?.length || 0) > 0

  const ESTADO_COLOR = { BORRADOR: 'default', ENVIADA: 'blue', ACEPTADA: 'green', RECHAZADA: 'red' }
  const ESTADO_LABEL = { BORRADOR: 'Borrador', ENVIADA: 'Enviada', ACEPTADA: 'Aceptada', RECHAZADA: 'Rechazada' }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 8 }}>
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(leadId ? `/leads/${leadId}` : '/cotizaciones')}>
            Volver
          </Button>
          <Title level={4} style={{ margin: 0 }}>
            {esNueva ? 'Nueva cotización' : `Cotización #${id}`}
          </Title>
          {!esNueva && <Tag color={ESTADO_COLOR[estado]}>{ESTADO_LABEL[estado]}</Tag>}
        </Space>
        <Space>
          {!soloLectura && (
            <Button
              type="primary"
              icon={<SaveOutlined />}
              loading={guardar.isPending}
              onClick={() => guardar.mutate(buildPayload())}
              disabled={items.length === 0 || !leadId}
            >
              Guardar
            </Button>
          )}
          {puedeConvertir && (
            <>
              <Button
                type="primary"
                icon={<ShoppingOutlined />}
                loading={convertir.isPending}
                onClick={() => { setConPromesa(true); setModalConvertir(true) }}
              >
                Convertir a Venta
              </Button>
              <Modal
                title="Convertir cotización a venta"
                open={modalConvertir}
                onCancel={() => setModalConvertir(false)}
                onOk={() => { setModalConvertir(false); convertir.mutate(conPromesa) }}
                okText="Confirmar venta"
                cancelText="Cancelar"
                confirmLoading={convertir.isPending}
              >
                <p style={{ marginBottom: 16 }}>
                  Precio final: <strong>{(cotizacion?.precioFinalUF || 0).toFixed(2)} UF</strong>
                </p>
                <Form layout="vertical">
                  <Form.Item
                    label="¿Esta venta tiene etapa de promesa?"
                    help="Afecta cómo se dividen las comisiones entre promesa y escritura."
                  >
                    <Radio.Group value={conPromesa} onChange={e => setConPromesa(e.target.value)}>
                      <Radio value={true}>Sí, tiene promesa (split 50/50)</Radio>
                      <Radio value={false}>No, directo a escritura (100% en escritura)</Radio>
                    </Radio.Group>
                  </Form.Item>
                </Form>
              </Modal>
            </>
          )}
          {cotizacion?.lead?.ventas?.map(v => (
            <Button
              key={v.id}
              icon={<ShoppingOutlined />}
              onClick={() => navigate(`/ventas/${v.id}`)}
            >
              Venta #{v.id}
            </Button>
          ))}
          {!esNueva && cotizacion && items.length > 0 && (
            <>
              <PDFDownloadLink
                document={<CotizacionDocumento cotizacion={cotizacionParaPDF(cotizacion)} logoUrl={logoUrl} valorUF={valorUF} />}
                fileName={`Cotizacion-${id}-${cotizacion.lead?.contacto?.apellido || 'cliente'}.pdf`}
              >
                {({ loading }) => (
                  <Button icon={<FilePdfOutlined />} loading={loading}>
                    {loading ? 'Generando PDF...' : 'Exportar PDF'}
                  </Button>
                )}
              </PDFDownloadLink>
            </>
          )}
        </Space>
      </div>

      {/* Info cliente */}
      {lead && (
        <Card size="small" style={{ marginBottom: 16, background: '#f0f5ff', border: '1px solid #adc6ff' }}>
          <Space wrap>
            <Text strong>{lead.contacto.nombre} {lead.contacto.apellido}</Text>
            {lead.contacto.telefono && <Text type="secondary">{lead.contacto.telefono}</Text>}
            {lead.contacto.email && <Text type="secondary">{lead.contacto.email}</Text>}
            {lead.vendedor && <Text type="secondary">Vendedor: {lead.vendedor.nombre} {lead.vendedor.apellido}</Text>}
          </Space>
        </Card>
      )}

      {!leadId && (
        <Alert type="warning" message="Esta cotización no está asociada a un lead." style={{ marginBottom: 16 }} />
      )}

      <Row gutter={[16, 16]}>
        {/* Columna izquierda: unidades */}
        <Col xs={24} lg={14}>
          {!unidadesBloqueadas && (
            <SelectorUnidades items={items} onAdd={agregarUnidad} onRemove={quitarUnidad} />
          )}

          {/* Unidades seleccionadas */}
          {items.length > 0 && (
            <Card
              title={`Unidades en cotización (${items.length})`}
              size="small"
              style={{ marginTop: 12 }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {items.map(i => (
                  <div
                    key={i.unidadId}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '8px 12px', borderRadius: 8, background: '#fafafa', border: '1px solid #f0f0f0'
                    }}
                  >
                    <div>
                      <Text strong style={{ fontSize: 13 }}>
                        {i.edificio} — {i.tipo === 'BODEGA' ? 'Bodega' : 'Est.'} {i.numero}
                      </Text>
                    </div>
                    <Space>
                      <Text strong>{i.precioListaUF?.toFixed(2)} UF</Text>
                      {!unidadesBloqueadas && (
                        <Button size="small" danger type="text" icon={<DeleteOutlined />} onClick={() => quitarUnidad(i.unidadId)} />
                      )}
                    </Space>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Solicitud de descuento — visible al guardar */}
          {!esNueva && (
            <div style={{ marginTop: 12 }}>
              <PanelDescuento
                cotizacionId={Number(id)}
                esGerente={usuario?.rol === 'GERENTE'}
                soloLectura={soloLectura}
              />
            </div>
          )}
        </Col>

        {/* Columna derecha: promociones + resumen */}
        <Col xs={24} lg={10}>
          <Space direction="vertical" style={{ width: '100%' }} size={12}>

            <ResumenPrecio cotizacion={cotizacion} />

            {!esNueva && (
              <>
                <PanelPacks
                  cotizacionId={Number(id)}
                  packs={cotizacion?.packs || []}
                  soloLectura={soloLectura}
                />
                <PanelBeneficios
                  cotizacionId={Number(id)}
                  beneficios={cotizacion?.beneficios || []}
                  soloLectura={soloLectura}
                />
              </>
            )}

            {/* Validez y notas */}
            <Card title="Detalles" size="small">
              <Space direction="vertical" style={{ width: '100%' }} size={8}>
                <div>
                  <Text style={{ fontSize: 12 }}>Validez de la cotización</Text>
                  <InputNumber
                    value={validezDias}
                    onChange={setValidezDias}
                    min={1} max={365}
                    addonAfter="días"
                    style={{ width: '100%', marginTop: 4 }}
                    disabled={soloLectura}
                  />
                </div>
                <div>
                  <Text style={{ fontSize: 12 }}>Notas</Text>
                  <Input.TextArea
                    value={notas}
                    onChange={e => setNotas(e.target.value)}
                    rows={3}
                    placeholder="Observaciones, condiciones especiales..."
                    style={{ marginTop: 4 }}
                    disabled={soloLectura}
                  />
                </div>
              </Space>
            </Card>

          </Space>
        </Col>
      </Row>

    </div>
  )
}
