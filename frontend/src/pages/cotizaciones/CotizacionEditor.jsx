import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Card, Button, Typography, Space, Tag, Input, Select, InputNumber,
  Divider, Switch, Empty, Spin, Row, Col, App, Tooltip, Badge, Alert,
  Modal, Form
} from 'antd'
import {
  PlusOutlined, DeleteOutlined, SaveOutlined, SendOutlined,
  GiftOutlined, CheckCircleOutlined, InfoCircleOutlined, ArrowLeftOutlined,
  PercentageOutlined, TagOutlined, FilePdfOutlined, ShoppingOutlined,
  PercentageOutlined as PctIcon, DollarOutlined, ClockCircleOutlined
} from '@ant-design/icons'
import { PDFDownloadLink, pdf } from '@react-pdf/renderer'
import { CotizacionDocumento } from './CotizacionPDF'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import { useUF } from '../../hooks/useUF'
import logoUrl from '../../assets/logo.png'
import ModalEmail from '../../components/ModalEmail'

const { Title, Text } = Typography

// ── Tipos de promoción ──────────────────────────────────────────
const TIPO_PROMO_LABEL = {
  DESCUENTO_PORCENTAJE: 'Descuento %',
  DESCUENTO_UF: 'Descuento UF fijo',
  PAQUETE: 'Pack de unidades',
  BENEFICIO: 'Beneficio',
  ARRIENDO_ASEGURADO: 'Arriendo asegurado',
  GASTOS_NOTARIALES: 'Gastos notariales',
  CUOTAS_SIN_INTERES: 'Cuotas sin interés',
  COMBO: 'Combo',
  OTRO: 'Otro',
}
const TIPO_PROMO_COLOR = {
  DESCUENTO_PORCENTAJE: 'orange', DESCUENTO_UF: 'gold', PAQUETE: 'blue',
  BENEFICIO: 'green', ARRIENDO_ASEGURADO: 'purple', GASTOS_NOTARIALES: 'cyan',
  CUOTAS_SIN_INTERES: 'geekblue', COMBO: 'magenta', OTRO: 'default',
}
const TIPOS_PACK = ['DESCUENTO_PORCENTAJE', 'DESCUENTO_UF', 'PAQUETE', 'COMBO']

// ── Cálculo de precio ───────────────────────────────────────────
function calcularResumen(items, promos) {
  const base = items.reduce((s, i) => s + (i.precioListaUF || 0), 0)
  const lineas = []
  let descuentoTotal = 0

  promos.filter(p => p.aplicada && TIPOS_PACK.includes(p.tipo)).forEach(p => {
    let ahorro = 0
    if (p.tipo === 'DESCUENTO_PORCENTAJE') {
      ahorro = base * ((p.valorPorcentaje || 0) / 100)
    } else if (p.tipo === 'DESCUENTO_UF') {
      ahorro = p.valorUF || 0
    } else if (p.tipo === 'PAQUETE') {
      const idsEnPaquete = p.unidadesIds || []
      const enComun = items.filter(i => idsEnPaquete.includes(i.unidadId))
      if (enComun.length >= idsEnPaquete.length && idsEnPaquete.length > 0) {
        const sumaIndividual = enComun.reduce((s, i) => s + i.precioListaUF, 0)
        ahorro = Math.max(sumaIndividual - (p.valorUF || 0), 0)
      }
    }
    if (ahorro > 0) {
      lineas.push({ nombre: p.nombre, ahorro, tipo: p.tipo })
      descuentoTotal += ahorro
    }
    p._ahorroCalculado = ahorro
  })

  const beneficios = promos.filter(p => p.aplicada && !TIPOS_PACK.includes(p.tipo))

  return { base, descuentoTotal, final: Math.max(base - descuentoTotal, 0), lineas, beneficios }
}

function calcularResumenConAprobado(items, promos, descuentoAprobadoUF) {
  const base = calcularResumen(items, promos)
  const aprobado = descuentoAprobadoUF || 0
  return {
    ...base,
    descuentoAprobadoUF: aprobado,
    finalTotal: Math.max(base.final - aprobado, 0),
  }
}

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
            const tienePromos = u.promociones?.length > 0
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
                    {u.precioMinimoUF && <Text type="secondary" style={{ fontSize: 11 }}>mín. {u.precioMinimoUF} UF</Text>}
                    {tienePromos && (
                      <Tooltip title={u.promociones.map(p => p.promocion.nombre).join(', ')}>
                        <Tag color="green" style={{ fontSize: 11, margin: 0, cursor: 'default' }}>
                          <GiftOutlined /> {u.promociones.length} promo{u.promociones.length > 1 ? 's' : ''}
                        </Tag>
                      </Tooltip>
                    )}
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
function ResumenPrecio({ items, promos, descuentoAprobadoUF }) {
  const resumen = useMemo(() => calcularResumen(items, promos), [items, promos])
  const aprobado = descuentoAprobadoUF || 0
  const totalFinal = Math.max(resumen.final - aprobado, 0)

  return (
    <Card title="Resumen de precio" size="small" style={{ background: '#f8faff', border: '1px solid #d6e4ff' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>

        {/* Items */}
        {items.map(i => (
          <div key={i.unidadId} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
            <Text type="secondary">{i.edificio} — {i.tipo} {i.numero}</Text>
            <Text strong>{i.precioListaUF?.toFixed(2)} UF</Text>
          </div>
        ))}

        {items.length > 1 && (
          <>
            <Divider style={{ margin: '4px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <Text>Subtotal</Text>
              <Text strong>{resumen.base.toFixed(2)} UF</Text>
            </div>
          </>
        )}

        {/* Descuentos */}
        {resumen.lineas.length > 0 && (
          <>
            <Divider style={{ margin: '4px 0' }} />
            {resumen.lineas.map((l, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <Text style={{ color: '#52c41a' }}>
                  <TagOutlined /> {l.nombre}
                </Text>
                <Text style={{ color: '#52c41a' }}>− {l.ahorro.toFixed(2)} UF</Text>
              </div>
            ))}
          </>
        )}

        {/* Beneficios */}
        {resumen.beneficios.length > 0 && (
          <>
            <Divider style={{ margin: '4px 0' }} />
            {resumen.beneficios.map(b => (
              <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                <CheckCircleOutlined style={{ color: '#52c41a' }} />
                <Text style={{ color: '#52c41a' }}>{b.nombre}</Text>
              </div>
            ))}
          </>
        )}

        {/* Descuento aprobado por gerente */}
        {aprobado > 0 && (
          <>
            <Divider style={{ margin: '4px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <Text style={{ color: '#d46b08' }}>
                <CheckCircleOutlined style={{ color: '#d46b08', marginRight: 4 }} />
                Descuento aprobado
              </Text>
              <Text style={{ color: '#d46b08' }}>− {aprobado.toFixed(2)} UF</Text>
            </div>
          </>
        )}

        <Divider style={{ margin: '6px 0' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <Text strong style={{ fontSize: 15 }}>Total</Text>
          <Text strong style={{ fontSize: 17, color: '#1677ff' }}>{totalFinal.toFixed(2)} UF</Text>
        </div>
        {(resumen.descuentoTotal > 0 || aprobado > 0) && (
          <div style={{ textAlign: 'right' }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Ahorro total: {(resumen.descuentoTotal + aprobado).toFixed(2)} UF
            </Text>
          </div>
        )}
      </div>
    </Card>
  )
}

// ── Fila de promo/pack reutilizable ─────────────────────────────
function FilaPromo({ p, onToggle, onRemovePromo, esPack }) {
  const detalleAhorro = () => {
    if (!p.aplicada) return null
    if (p.tipo === 'DESCUENTO_PORCENTAJE') {
      const cond = p.minUnidades ? ` (${p.minUnidades}+ uds.)` : ''
      return `${p.valorPorcentaje}% de descuento${cond}`
    }
    if (p.tipo === 'DESCUENTO_UF') {
      const cond = p.minUnidades ? ` (${p.minUnidades}+ uds.)` : ''
      return `${p.valorUF} UF de descuento${cond}`
    }
    if (p.tipo === 'PAQUETE' && p.valorUF) return `Precio pack: ${p.valorUF} UF`
    return null
  }
  const detalle = detalleAhorro()

  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '6px 10px', borderRadius: 8,
        background: p.aplicada ? (esPack ? '#fff7e6' : '#f6ffed') : '#fafafa',
        border: `1px solid ${p.aplicada ? (esPack ? '#ffd591' : '#b7eb8f') : '#f0f0f0'}`,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Space size={6}>
          <Tag color={TIPO_PROMO_COLOR[p.tipo]} style={{ fontSize: 11, margin: 0 }}>
            {TIPO_PROMO_LABEL[p.tipo]}
          </Tag>
          <Text style={{ fontSize: 13 }}>{p.nombre}</Text>
        </Space>
        {p.descripcion && <Text type="secondary" style={{ fontSize: 11 }}>{p.descripcion}</Text>}
        {detalle && <Text style={{ fontSize: 12, color: esPack ? '#d46b08' : '#52c41a' }}>{detalle}</Text>}
      </div>
      <Space size={4}>
        <Tooltip title={p.aplicada ? 'Aplicado' : 'No aplicado'}>
          <Switch size="small" checked={p.aplicada} onChange={v => onToggle(p.promocionId, v)} />
        </Tooltip>
        <Button size="small" danger type="text" icon={<DeleteOutlined />} onClick={() => onRemovePromo(p.promocionId)} />
      </Space>
    </div>
  )
}

// ── Panel de packs y promociones ────────────────────────────────
function PanelPromociones({ items, promos, onToggle, onAddPromo, onRemovePromo }) {
  const { data: todasPromos = [] } = useQuery({
    queryKey: ['promociones-activas-cot'],
    queryFn: () => api.get('/promociones', { params: { activa: true } }).then(r => r.data)
  })

  const promoIds = new Set(promos.map(p => p.promocionId))

  // Separar en packs y beneficios
  const packsActivos    = promos.filter(p => TIPOS_PACK.includes(p.tipo))
  const beneficiosActivos = promos.filter(p => !TIPOS_PACK.includes(p.tipo))

  // Sugeridas vinculadas a las unidades seleccionadas
  const sugeridas = todasPromos.filter(p =>
    !promoIds.has(p.id) &&
    p.unidades?.some(u => items.some(i => i.unidadId === u.unidadId))
  )

  const noAgregadas = todasPromos.filter(p => !promoIds.has(p.id))
  const packsDisp = noAgregadas.filter(p => TIPOS_PACK.includes(p.tipo))
  const promosDisp = noAgregadas.filter(p => !TIPOS_PACK.includes(p.tipo))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Sugeridas automáticamente */}
      {sugeridas.length > 0 && (
        <Alert
          type="info" showIcon
          style={{ fontSize: 12 }}
          message={
            <div>
              <Text strong style={{ fontSize: 12 }}>Disponibles para las unidades seleccionadas</Text>
              <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {sugeridas.map(p => (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Space size={4}>
                      <Tag color={TIPOS_PACK.includes(p.tipo) ? 'orange' : 'green'} style={{ fontSize: 11, margin: 0 }}>
                        {TIPOS_PACK.includes(p.tipo) ? 'Pack' : 'Beneficio'}
                      </Tag>
                      <Text style={{ fontSize: 12 }}>{p.nombre}</Text>
                    </Space>
                    <Button size="small" type="link" onClick={() => onAddPromo(p)}>Agregar</Button>
                  </div>
                ))}
              </div>
            </div>
          }
        />
      )}

      {/* ── Packs (afectan precio) ── */}
      <Card
        size="small"
        title={<Text strong style={{ color: '#d46b08' }}>Packs — descuentos sobre el precio</Text>}
        extra={
          packsDisp.length > 0 && (
            <Select
              placeholder="Agregar pack..."
              size="small"
              style={{ width: 220 }}
              showSearch
              filterOption={(input, opt) => opt.label.toLowerCase().includes(input.toLowerCase())}
              options={packsDisp.map(p => ({ value: p.id, label: p.nombre }))}
              onChange={id => { const p = todasPromos.find(x => x.id === id); if (p) onAddPromo(p) }}
              value={null}
            />
          )
        }
        style={{ borderColor: '#ffd591' }}
      >
        {packsActivos.length === 0 ? (
          <Text type="secondary" style={{ fontSize: 12 }}>Sin packs aplicados</Text>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {packsActivos.map(p => (
              <FilaPromo key={p.promocionId} p={p} onToggle={onToggle} onRemovePromo={onRemovePromo} esPack />
            ))}
          </div>
        )}
      </Card>

      {/* ── Promociones (beneficios) ── */}
      <Card
        size="small"
        title={<Text strong style={{ color: '#389e0d' }}>Promociones — beneficios adicionales</Text>}
        extra={
          promosDisp.length > 0 && (
            <Select
              placeholder="Agregar promoción..."
              size="small"
              style={{ width: 220 }}
              showSearch
              filterOption={(input, opt) => opt.label.toLowerCase().includes(input.toLowerCase())}
              options={promosDisp.map(p => ({ value: p.id, label: p.nombre }))}
              onChange={id => { const p = todasPromos.find(x => x.id === id); if (p) onAddPromo(p) }}
              value={null}
            />
          )
        }
        style={{ borderColor: '#b7eb8f' }}
      >
        {beneficiosActivos.length === 0 ? (
          <Text type="secondary" style={{ fontSize: 12 }}>Sin beneficios aplicados</Text>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {beneficiosActivos.map(p => (
              <FilaPromo key={p.promocionId} p={p} onToggle={onToggle} onRemovePromo={onRemovePromo} esPack={false} />
            ))}
          </div>
        )}
      </Card>

    </div>
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

// ── Modal convertir cotización a venta ──────────────────────────
function ModalConvertirVenta({ open, onClose, cotizacion, resumen }) {
  const navigate = useNavigate()
  const [form] = Form.useForm()
  const { message } = App.useApp()
  const qc = useQueryClient()

  const items = cotizacion?.items || []
  const lead = cotizacion?.lead
  const promos = cotizacion?.promociones || []

  // Calcular descuento proporcional por unidad
  const descuentoPorUnidad = (unidadId) => {
    if (items.length === 0) return 0
    const item = items.find(i => i.unidadId === unidadId)
    if (!item) return 0
    if (items.length === 1) return resumen.descuentoTotal
    // Proporcional al precio de lista de la unidad
    const proporcion = item.precioListaUF / resumen.base
    return +(resumen.descuentoTotal * proporcion).toFixed(2)
  }

  const unidadWatch = Form.useWatch('unidadId', form)
  const precioWatch = Form.useWatch('precioUF', form)
  const descWatch = Form.useWatch('descuentoUF', form)
  const precioFinal = (Number(precioWatch) || 0) - (Number(descWatch) || 0)

  // Al cambiar la unidad seleccionada, actualizar precio y descuento
  const crear = useMutation({
    mutationFn: async (data) => {
      const res = await api.post('/ventas', data)
      // Marcar cotización como aceptada
      await api.put(`/cotizaciones/${cotizacion.id}/estado`, { estado: 'ACEPTADA' })
      return res
    },
    onSuccess: (res) => {
      message.success('¡Venta creada! La cotización fue marcada como aceptada.')
      qc.invalidateQueries({ queryKey: ['cotizacion', String(cotizacion.id)] })
      qc.invalidateQueries({ queryKey: ['cotizaciones'] })
      navigate(`/ventas/${res.data.id}`)
    },
    onError: (err) => {
      if (err.response?.status === 202) {
        message.warning(err.response.data.mensaje, 6)
      } else {
        message.error(err.response?.data?.error || 'Error al crear venta')
      }
    }
  })

  const handleOk = () => {
    form.validateFields().then(values => {
      crear.mutate({
        leadId: lead.id,
        unidadIds: items.map(i => i.unidadId),
        compradorId: lead.contacto.id,
        precioUF: Number(values.precioUF),
        descuentoUF: Number(values.descuentoUF) || 0,
        fechaReserva: values.fechaReserva,
        notas: values.notas,
        cotizacionOrigenId: cotizacion.id,
      })
    })
  }

  const initialDesc = items.length > 0 ? descuentoPorUnidad(items[0].unidadId) : 0

  return (
    <Modal
      title={<><ShoppingOutlined /> Convertir cotización a Venta</>}
      open={open}
      onCancel={onClose}
      onOk={handleOk}
      okText="Crear Venta"
      cancelText="Cancelar"
      confirmLoading={crear.isPending}
      width={520}
      afterOpenChange={o => {
        if (o && items.length > 0) {
          form.setFieldsValue({
            precioUF: items.reduce((s, i) => s + (i.precioListaUF || 0), 0),
            descuentoUF: initialDesc,
            fechaReserva: new Date().toISOString().split('T')[0],
          })
        }
      }}
    >
      <Form form={form} layout="vertical" style={{ marginTop: 12 }}>

        {/* Cliente */}
        <div style={{ background: '#e6f4ff', borderRadius: 8, padding: '8px 14px', marginBottom: 16 }}>
          <Text>Comprador: <Text strong>{lead?.contacto?.nombre} {lead?.contacto?.apellido}</Text></Text>
          {lead?.vendedor && (
            <Text style={{ marginLeft: 16 }}>Vendedor: <Text strong>{lead.vendedor.nombre} {lead.vendedor.apellido}</Text></Text>
          )}
        </div>

        {/* Unidades */}
        <Form.Item label="Unidades">
          <div style={{ fontSize: 12, color: '#6b7280' }}>
            {items.map(i => `${i.edificio} ${i.numero}`).join(', ')}
          </div>
        </Form.Item>

        {/* Precio */}
        <Row gutter={12}>
          <Col span={12}>
            <Form.Item name="precioUF" label="Precio de lista (UF)" rules={[{ required: true }]}>
              <InputNumber min={0} step={0.01} style={{ width: '100%' }} addonAfter="UF" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="descuentoUF" label="Descuento (UF)">
              <InputNumber min={0} step={0.01} style={{ width: '100%' }} addonAfter="UF" />
            </Form.Item>
          </Col>
        </Row>

        {/* Resumen promos */}
        {resumen.descuentoTotal > 0 && (
          <div style={{ background: '#f6ffed', borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontSize: 12 }}>
            {resumen.lineas.map((l, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 12, color: '#52c41a' }}>{l.nombre}</Text>
                <Text style={{ fontSize: 12, color: '#52c41a' }}>− {l.ahorro.toFixed(2)} UF total</Text>
              </div>
            ))}
          </div>
        )}

        {/* Precio final */}
        {precioFinal > 0 && (
          <div style={{ background: '#e6f4ff', borderRadius: 8, padding: '10px 14px', marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text strong>Precio final:</Text>
            <Text strong style={{ fontSize: 18, color: '#1677ff' }}>{precioFinal.toFixed(2)} UF</Text>
          </div>
        )}

        <Form.Item name="fechaReserva" label="Fecha de reserva" rules={[{ required: true }]}>
          <Input type="date" />
        </Form.Item>

        <Form.Item name="notas" label="Notas">
          <Input.TextArea rows={2} placeholder="Condiciones acordadas, observaciones..." />
        </Form.Item>
      </Form>
    </Modal>
  )
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
  const [promos, setPromos] = useState([])        // { promocionId, nombre, tipo, descripcion, aplicada, valorPorcentaje, valorUF, unidadesIds }
  const [notas, setNotas] = useState('')
  const [validezDias, setValidezDias] = useState(30)
  const [leadId, setLeadId] = useState(leadIdParam ? Number(leadIdParam) : null)
  const [modalVenta, setModalVenta] = useState(false)
  const [modalEmail, setModalEmail] = useState(false)
  const [pdfBase64, setPdfBase64] = useState(null)
  const [generandoPdf, setGenerandoPdf] = useState(false)

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
      setPromos(cotizacion.promociones.map(cp => ({
        promocionId: cp.promocionId,
        nombre: cp.promocion.nombre,
        tipo: cp.promocion.tipo,
        descripcion: cp.promocion.descripcion,
        aplicada: cp.aplicada,
        valorPorcentaje: cp.promocion.valorPorcentaje,
        valorUF: cp.promocion.valorUF,
        unidadesIds: (cp.promocion.unidades || []).map(u => u.unidadId),
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
    const newItem = {
      unidadId: unidad.id,
      precioListaUF: unidad.precioUF,
      numero: unidad.numero,
      tipo: unidad.tipo,
      edificio: unidad.edificio.nombre,
    }
    setItems(prev => [...prev, newItem])

    // Auto-agregar promos vinculadas que no estén ya en la lista
    const promoIds = new Set(promos.map(p => p.promocionId))
    const promosSugeridas = (unidad.promociones || [])
      .filter(up => !promoIds.has(up.promocion.id))
      .map(up => ({
        promocionId: up.promocion.id,
        nombre: up.promocion.nombre,
        tipo: up.promocion.tipo,
        descripcion: up.promocion.descripcion,
        aplicada: true,
        valorPorcentaje: up.promocion.valorPorcentaje,
        valorUF: up.promocion.valorUF,
        unidadesIds: (up.promocion.unidades || []).map(u => u.unidadId),
      }))
    if (promosSugeridas.length > 0) {
      setPromos(prev => [...prev, ...promosSugeridas])
    }
  }

  const quitarUnidad = (unidadId) => {
    setItems(prev => prev.filter(i => i.unidadId !== unidadId))
    // Auto-remove packs that required this unit
    setPromos(prev => {
      const packsAEliminar = prev.filter(p =>
        p.tipo === 'PAQUETE' &&
        Array.isArray(p.unidadesIds) &&
        p.unidadesIds.includes(unidadId)
      )
      if (packsAEliminar.length > 0) {
        const nombres = packsAEliminar.map(p => p.nombre).join(', ')
        message.warning(`Pack eliminado por quitar unidad requerida: ${nombres}`)
      }
      return prev.filter(p => !(
        p.tipo === 'PAQUETE' &&
        Array.isArray(p.unidadesIds) &&
        p.unidadesIds.includes(unidadId)
      ))
    })
  }

  const cambiarPrecio = (unidadId, precio) => {
    setItems(prev => prev.map(i => i.unidadId === unidadId ? { ...i, precioListaUF: precio } : i))
  }

  const togglePromo = (promocionId, aplicada) => {
    setPromos(prev => prev.map(p => p.promocionId === promocionId ? { ...p, aplicada } : p))
  }

  const agregarPromo = (promo) => {
    if (promos.some(p => p.promocionId === promo.id)) return

    // Si es un pack de unidades, todas deben estar disponibles o ya en la cotización
    if (promo.tipo === 'PAQUETE' && promo.unidades?.length > 0) {
      const unidadesNoDisponibles = promo.unidades.filter(
        pu => !items.some(i => i.unidadId === pu.unidadId) && pu.unidad?.estado !== 'DISPONIBLE'
      )
      if (unidadesNoDisponibles.length > 0) {
        const nums = unidadesNoDisponibles.map(pu => pu.unidad?.numero || pu.unidadId).join(', ')
        message.error(`No se puede agregar el pack: unidad(es) no disponible(s): ${nums}`)
        return
      }
      const nuevasUnidades = promo.unidades
        .filter(pu => !items.some(i => i.unidadId === pu.unidadId))
        .map(pu => ({
          unidadId: pu.unidadId,
          precioListaUF: pu.unidad.precioUF,
          numero: pu.unidad.numero,
          tipo: pu.unidad.tipo,
          edificio: pu.unidad.edificio?.nombre,
        }))
      if (nuevasUnidades.length > 0) {
        setItems(prev => [...prev, ...nuevasUnidades])
      }
    }

    setPromos(prev => [...prev, {
      promocionId: promo.id,
      nombre: promo.nombre,
      tipo: promo.tipo,
      descripcion: promo.descripcion,
      aplicada: true,
      valorPorcentaje: promo.valorPorcentaje,
      valorUF: promo.valorUF,
      minUnidades: promo.minUnidades,
      unidadesIds: (promo.unidades || []).map(u => u.unidadId),
    }])
  }

  const quitarPromo = (promocionId) => {
    setPromos(prev => prev.filter(p => p.promocionId !== promocionId))
  }

  // ─── Calcular ahorro final para guardar ────────────────────
  const resumen = useMemo(() => calcularResumen(items, promos), [items, promos])

  const buildPayload = () => ({
    leadId,
    notas,
    validezDias,
    items: items.map(i => ({ unidadId: i.unidadId, precioListaUF: i.precioListaUF })),
    promociones: promos.map(p => ({
      promocionId: p.promocionId,
      aplicada: p.aplicada,
      ahorroUF: p._ahorroCalculado || 0,
    })),
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

  if (cargando) return <div style={{ textAlign: 'center', padding: 60 }}><Spin /></div>

  const estado = cotizacion?.estado || 'BORRADOR'
  const soloLectura = ['ACEPTADA', 'RECHAZADA'].includes(estado)
  const unidadesBloqueadas = !esNueva // una vez guardada, las unidades no se pueden modificar
  const puedeConvertir = !esNueva && cotizacion && items.length > 0 && estado !== 'RECHAZADA' && estado !== 'ACEPTADA'

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
            <Button
              type="primary"
              icon={<ShoppingOutlined />}
              onClick={() => setModalVenta(true)}
            >
              Crear Venta
            </Button>
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
                document={<CotizacionDocumento cotizacion={{ ...cotizacion, items: cotizacion.items }} logoUrl={logoUrl} valorUF={valorUF} />}
                fileName={`Cotizacion-${id}-${cotizacion.lead?.contacto?.apellido || 'cliente'}.pdf`}
              >
                {({ loading }) => (
                  <Button icon={<FilePdfOutlined />} loading={loading}>
                    {loading ? 'Generando PDF...' : 'Exportar PDF'}
                  </Button>
                )}
              </PDFDownloadLink>
              {cotizacion.lead?.contacto?.email && (
                <Button
                  icon={<SendOutlined />}
                  loading={generandoPdf}
                  onClick={async () => {
                    setGenerandoPdf(true)
                    try {
                      const blob = await pdf(
                        <CotizacionDocumento cotizacion={{ ...cotizacion, items: cotizacion.items }} logoUrl={logoUrl} valorUF={valorUF} />
                      ).toBlob()
                      const base64 = await new Promise((resolve, reject) => {
                        const reader = new FileReader()
                        reader.onload = () => resolve(reader.result.split(',')[1])
                        reader.onerror = reject
                        reader.readAsDataURL(blob)
                      })
                      setPdfBase64(base64)
                      setGenerandoPdf(false)
                      setModalEmail(true)
                    } catch (err) {
                      setGenerandoPdf(false)
                      message.error('No se pudo generar el PDF. Intenta de nuevo.')
                      console.error('[PDF] Error generando PDF para email:', err)
                    }
                  }}
                >
                  {generandoPdf ? 'Preparando...' : 'Enviar por email'}
                </Button>
              )}
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

            <ResumenPrecio items={items} promos={promos} descuentoAprobadoUF={cotizacion?.descuentoAprobadoUF} />

            <PanelPromociones
              items={items}
              promos={promos}
              onToggle={togglePromo}
              onAddPromo={agregarPromo}
              onRemovePromo={quitarPromo}
            />

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

      {cotizacion && (
        <ModalConvertirVenta
          open={modalVenta}
          onClose={() => setModalVenta(false)}
          cotizacion={cotizacion}
          resumen={resumen}
        />
      )}

      {cotizacion?.lead?.contacto?.email && (
        <ModalEmail
          open={modalEmail}
          onClose={() => { setModalEmail(false); setPdfBase64(null) }}
          para={cotizacion.lead.contacto.email}
          nombre={`${cotizacion.lead.contacto.nombre} ${cotizacion.lead.contacto.apellido || ''}`.trim()}
          leadId={cotizacion.lead.id}
          cotizacionId={parseInt(id)}
          pdfBase64={pdfBase64}
          pdfNombre={`Cotizacion_BodeParking_${id}.pdf`}
        />
      )}
    </div>
  )
}
