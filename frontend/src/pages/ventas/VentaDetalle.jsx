import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import api from '../../services/api'
import { useUF } from '../../hooks/useUF'
import { useUFPorFecha } from '../../hooks/useUFPorFecha'
import { useAuth } from '../../context/AuthContext'
import { ESTADO_VENTA_COLOR } from '../../components/ui'
import {
  Card, Button, Tag, Modal, Form, Input, Select, Typography,
  Space, Spin, Row, Col, Steps, Table, App, Alert, Divider, Tooltip, Popconfirm,
  InputNumber, Radio
} from 'antd'
import { PlusOutlined, DeleteOutlined, WarningOutlined, CheckCircleOutlined, GiftOutlined, AppstoreOutlined, EditOutlined, HomeOutlined, ExpandOutlined } from '@ant-design/icons'
import { isPast } from 'date-fns'

const { Title, Text } = Typography

const ESTADO_LABEL = { RESERVA:'Reserva', PROMESA:'Promesa', ESCRITURA:'Escritura', ENTREGADO:'Entregado', ANULADO:'Anulado' }
const LEGAL_LABEL = {
  CONFECCION_PROMESA:           'Confección promesa',
  FIRMA_CLIENTE_PROMESA:        'Firma cliente (promesa)',
  FIRMA_INMOBILIARIA_PROMESA:   'Firma inmob. (promesa)',
  CONFECCION_ESCRITURA:         'Confección escritura',
  FIRMA_CLIENTE_ESCRITURA:      'Firma cliente (escritura)',
  FIRMA_INMOBILIARIA_ESCRITURA: 'Firma inmob. (escritura)',
  INSCRIPCION_CBR:              'Inscripción CBR',
  ENTREGADO:                    'Entregado',
}
const PASOS_CON_PROMESA = [
  'CONFECCION_PROMESA',
  'FIRMA_CLIENTE_PROMESA',
  'FIRMA_INMOBILIARIA_PROMESA',
  'CONFECCION_ESCRITURA',
  'FIRMA_CLIENTE_ESCRITURA',
  'FIRMA_INMOBILIARIA_ESCRITURA',
  'INSCRIPCION_CBR',
  'ENTREGADO'
]
const PASOS_SIN_PROMESA = [
  'CONFECCION_ESCRITURA',
  'FIRMA_CLIENTE_ESCRITURA',
  'FIRMA_INMOBILIARIA_ESCRITURA',
  'INSCRIPCION_CBR',
  'ENTREGADO'
]

const FECHA_POR_PASO = {
  CONFECCION_PROMESA:           'fechaLimiteConfeccionPromesa',
  FIRMA_CLIENTE_PROMESA:        'fechaLimiteFirmaCliente',
  FIRMA_INMOBILIARIA_PROMESA:   'fechaLimiteFirmaInmob',
  CONFECCION_ESCRITURA:         'fechaLimiteEscritura',
  FIRMA_CLIENTE_ESCRITURA:      'fechaLimiteFirmaNot',
  FIRMA_INMOBILIARIA_ESCRITURA: 'fechaLimiteFirmaInmobEscritura',
  INSCRIPCION_CBR:              'fechaLimiteCBR',
  ENTREGADO:                    'fechaLimiteEntrega',
}

function calcFaltantes(proceso) {
  if (!proceso) return []
  const pasos = proceso.tienePromesa === false ? PASOS_SIN_PROMESA : PASOS_CON_PROMESA
  const idx   = pasos.indexOf(proceso.estadoActual)
  const items = []

  const campoActual = FECHA_POR_PASO[proceso.estadoActual]
  if (campoActual && proceso[campoActual] && proceso.estadoActual !== 'ENTREGADO') {
    if (isPast(new Date(proceso[campoActual]))) {
      items.push({ tipo: 'error', texto: `Paso vencido: ${LEGAL_LABEL[proceso.estadoActual]}` })
    }
  }

  for (let i = Math.max(idx, 0); i < pasos.length; i++) {
    const campo = FECHA_POR_PASO[pasos[i]]
    if (campo && !proceso[campo]) {
      items.push({ tipo: 'warning', texto: `Sin fecha límite: ${LEGAL_LABEL[pasos[i]]}` })
    }
  }
  return items
}

// ─── Hook anular venta ────────────────────────────────────────────
function useAnularVenta(ventaId) {
  const qc = useQueryClient()
  const { message } = App.useApp()
  return useMutation({
    mutationFn: () => api.put(`/ventas/${ventaId}/estado`, { estado: 'ANULADO' }),
    onSuccess: () => {
      message.success('Venta anulada')
      qc.invalidateQueries(['venta', ventaId])
      qc.invalidateQueries(['ventas'])
    },
    onError: err => message.error(err.response?.data?.error || 'Error al anular'),
  })
}

// ─── Fila de cuota con conversión UF↔CLP ─────────────────────────
function FilaCuota({ cuota, index, onChange, onDelete, showDelete }) {
  const { valorUF } = useUFPorFecha(cuota.fechaVencimiento)

  // Latest-ref pattern: acceder a valores actuales desde effects sin deps adicionales
  const cuotaRef = useRef(cuota)
  cuotaRef.current = cuota
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  // Cuando valorUF cambia (fecha cambió y su UF cargó), recalcular campo derivado
  useEffect(() => {
    if (!valorUF) return
    const c = cuotaRef.current
    if (c._ultimoEditado === 'uf' && c.montoUF != null) {
      onChangeRef.current(index, { ...c, montoCLP: Math.round(c.montoUF * valorUF) })
    } else if (c._ultimoEditado === 'clp' && c.montoCLP != null) {
      onChangeRef.current(index, { ...c, montoUF: parseFloat((c.montoCLP / valorUF).toFixed(4)) })
    }
  }, [valorUF]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleUFChange = (value) => {
    const next = { ...cuota, montoUF: value ?? null, _ultimoEditado: 'uf' }
    if (value != null && valorUF) {
      next.montoCLP = Math.round(value * valorUF)
    }
    onChange(index, next)
  }

  const handleCLPChange = (value) => {
    const next = { ...cuota, montoCLP: value ?? null, _ultimoEditado: 'clp' }
    if (value != null && valorUF) {
      next.montoUF = parseFloat((value / valorUF).toFixed(4))
    }
    onChange(index, next)
  }

  const fmtUF = v => v != null ? Number(v).toLocaleString('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 4 }) : ''
  const parseUF = v => { if (!v) return null; const n = parseFloat(v.replace(/\./g, '').replace(',', '.')); return isNaN(n) ? null : n }
  const fmtCLP = v => v != null ? Math.round(v).toLocaleString('es-CL') : ''
  const parseCLP = v => { if (!v) return null; const n = parseInt(v.replace(/\./g, '').replace(',', ''), 10); return isNaN(n) ? null : n }

  const isDerivedUF = valorUF != null && cuota._ultimoEditado === 'clp' && cuota.montoCLP != null
  const isDerivedCLP = valorUF != null && cuota._ultimoEditado === 'uf' && cuota.montoUF != null

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, background: '#fafafa', padding: 10, borderRadius: 8 }}>
      <Select
        value={cuota.tipo}
        onChange={v => onChange(index, { ...cuota, tipo: v })}
        style={{ width: 110 }} size="small"
        options={[
          { value: 'RESERVA', label: 'Reserva' },
          { value: 'PIE', label: 'Pie' },
          { value: 'CUOTA', label: 'Cuota' },
          { value: 'ESCRITURA', label: 'Escritura' }
        ]}
      />
      <InputNumber
        size="small"
        placeholder="UF"
        value={cuota.montoUF}
        onChange={handleUFChange}
        formatter={fmtUF}
        parser={parseUF}
        min={0}
        style={{ width: 110, background: isDerivedUF ? '#f0f4f8' : undefined }}
      />
      <InputNumber
        size="small"
        placeholder="CLP"
        value={cuota.montoCLP}
        onChange={handleCLPChange}
        formatter={fmtCLP}
        parser={parseCLP}
        min={0}
        style={{ width: 130, background: isDerivedCLP ? '#f0f4f8' : undefined }}
      />
      <Input
        size="small"
        type="date"
        value={cuota.fechaVencimiento}
        onChange={e => onChange(index, { ...cuota, fechaVencimiento: e.target.value })}
        style={{ width: 140 }}
      />
      {showDelete && (
        <Button size="small" danger icon={<DeleteOutlined />} type="text" onClick={() => onDelete(index)} />
      )}
    </div>
  )
}

// ─── Modal crear plan de pago ─────────────────────────────────────
function ModalPlanPago({ open, onClose, ventaId, precioUF }) {
  const qc = useQueryClient()
  const [cuotas, setCuotas] = useState([
    { tipo: 'RESERVA', montoUF: null, montoCLP: 200000, fechaVencimiento: '', _ultimoEditado: 'clp' }
  ])
  const { message } = App.useApp()

  const totalUF = cuotas.reduce((s, c) => s + (c.montoUF || 0), 0)

  const crear = useMutation({
    mutationFn: () => api.post('/pagos/plan', {
      ventaId,
      cuotas: cuotas.map(({ _ultimoEditado, ...c }) => c)
    }),
    onSuccess: () => {
      message.success('Plan de pago creado')
      qc.invalidateQueries(['venta', ventaId])
      onClose()
    },
    onError: err => message.error(err.response?.data?.error || 'Error')
  })

  const handleCuotaChange = (i, nuevaCuota) => {
    setCuotas(p => p.map((c, idx) => idx === i ? nuevaCuota : c))
  }

  const handleDelete = (i) => {
    setCuotas(p => p.filter((_, idx) => idx !== i))
  }

  return (
    <Modal title="Crear Plan de Pago" open={open} onCancel={onClose}
      onOk={() => crear.mutate()} okText="Crear Plan" cancelText="Cancelar"
      confirmLoading={crear.isPending} width={700}>
      <div style={{ marginTop: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Precio: <strong>{precioUF} UF</strong> · Total plan:{' '}
            <strong style={{ color: totalUF > precioUF ? '#ff4d4f' : '#52c41a' }}>{totalUF.toFixed(2)} UF</strong>
          </Text>
          <Button size="small" icon={<PlusOutlined />}
            onClick={() => setCuotas(p => [...p, { tipo: 'CUOTA', montoUF: null, montoCLP: null, fechaVencimiento: '', _ultimoEditado: null }])}>
            Cuota
          </Button>
        </div>
        {cuotas.map((c, i) => (
          <FilaCuota
            key={i}
            cuota={c}
            index={i}
            onChange={handleCuotaChange}
            onDelete={handleDelete}
            showDelete={cuotas.length > 1}
          />
        ))}
      </div>
    </Modal>
  )
}

// ─── Modal actualizar proceso legal ──────────────────────────────
function ModalLegal({ open, onClose, ventaId, proceso }) {
  const qc = useQueryClient()
  const [form] = Form.useForm()
  const { message } = App.useApp()
  const toDateStr = (d) => d ? d.substring(0, 10) : ''

  const tienePromesaWatch = Form.useWatch('tienePromesa', form)
  const estadoActualWatch  = Form.useWatch('estadoActual', form)
  const conPromesa    = tienePromesaWatch !== false
  const pasosActuales = conPromesa ? PASOS_CON_PROMESA : PASOS_SIN_PROMESA
  const idxActual     = pasosActuales.indexOf(estadoActualWatch)

  const retroceder = () => {
    if (idxActual > 0) form.setFieldValue('estadoActual', pasosActuales[idxActual - 1])
  }
  const avanzar = () => {
    if (idxActual < pasosActuales.length - 1) form.setFieldValue('estadoActual', pasosActuales[idxActual + 1])
  }

  const actualizar = useMutation({
    mutationFn: (d) => api.put(`/legal/${ventaId}`, d),
    onSuccess: () => {
      message.success('Proceso legal actualizado')
      qc.invalidateQueries(['venta', ventaId])
      onClose()
    },
    onError: err => message.error(err.response?.data?.error || 'Error')
  })

  return (
    <Modal
      title="Proceso Legal — Actualizar"
      open={open} onCancel={onClose}
      onOk={() => form.validateFields().then(actualizar.mutate)}
      okText="Guardar cambios" cancelText="Cancelar"
      confirmLoading={actualizar.isPending} width={560}
    >
      <Form form={form} layout="vertical" style={{ marginTop: 12 }} initialValues={{
        estadoActual:                   proceso?.estadoActual,
        tienePromesa:                   proceso?.tienePromesa !== false,
        fechaLimiteConfeccionPromesa:   toDateStr(proceso?.fechaLimiteConfeccionPromesa),
        fechaLimiteFirmaCliente:        toDateStr(proceso?.fechaLimiteFirmaCliente),
        fechaLimiteFirmaInmob:          toDateStr(proceso?.fechaLimiteFirmaInmob),
        fechaLimiteEscritura:           toDateStr(proceso?.fechaLimiteEscritura),
        fechaLimiteFirmaNot:            toDateStr(proceso?.fechaLimiteFirmaNot),
        fechaLimiteFirmaInmobEscritura: toDateStr(proceso?.fechaLimiteFirmaInmobEscritura),
        fechaLimiteCBR:                 toDateStr(proceso?.fechaLimiteCBR),
        fechaLimiteEntrega:             toDateStr(proceso?.fechaLimiteEntrega),
        notas: proceso?.notas,
      }}>

        {/* Tipo de proceso */}
        <Form.Item name="tienePromesa" label="Tipo de proceso" style={{ marginBottom: 14 }}>
          <Select
            options={[
              { value: true,  label: 'Con promesa (promesa → escritura → CBR → entrega)' },
              { value: false, label: 'Sin promesa (directo escritura → CBR → entrega)' },
            ]}
            onChange={(val) => {
              const pasos = val === false ? PASOS_SIN_PROMESA : PASOS_CON_PROMESA
              form.setFieldValue('estadoActual', pasos[0])
            }}
          />
        </Form.Item>

        {/* Campo oculto estadoActual — registrado en el form */}
        <Form.Item name="estadoActual" hidden><Input /></Form.Item>

        {/* Navegación de paso actual */}
        <div style={{
          background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10,
          padding: '14px 16px', marginBottom: 16,
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 10 }}>
            Paso actual — mover con flechas
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Button size="small" disabled={idxActual <= 0} onClick={retroceder}>
              ← Anterior
            </Button>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#1d4ed8' }}>
                {LEGAL_LABEL[estadoActualWatch] || '—'}
              </div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                Paso {idxActual + 1} de {pasosActuales.length}
              </div>
            </div>
            <Button
              size="small"
              type="primary"
              disabled={idxActual >= pasosActuales.length - 1}
              onClick={avanzar}
            >
              Siguiente →
            </Button>
          </div>
        </div>

        {/* Fechas límite — una fila por paso */}
        <div style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 8 }}>
          Fechas límite por paso
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
          {pasosActuales.map((paso, i) => {
            const campo      = FECHA_POR_PASO[paso]
            const esActual   = i === idxActual
            const completado = i < idxActual
            const rowBg      = esActual ? '#eff6ff' : completado ? '#f0fdf4' : '#f9fafb'
            const rowBorde   = esActual ? '#bfdbfe' : completado ? '#bbf7d0' : '#f3f4f6'
            const icono      = completado ? '✓' : esActual ? '▶' : '○'
            const iconColor  = completado ? '#16a34a' : esActual ? '#1d4ed8' : '#94a3b8'
            return (
              <div key={paso} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '6px 10px', borderRadius: 8,
                background: rowBg, border: `1px solid ${rowBorde}`,
              }}>
                <span style={{ fontSize: 13, color: iconColor, width: 16, textAlign: 'center', flexShrink: 0 }}>
                  {icono}
                </span>
                <span style={{
                  flex: 1, fontSize: 12,
                  fontWeight: esActual ? 700 : 400,
                  color: completado ? '#16a34a' : esActual ? '#1d4ed8' : '#374151',
                }}>
                  {LEGAL_LABEL[paso]}
                </span>
                <Form.Item name={campo} style={{ margin: 0 }}>
                  <Input type="date" size="small" style={{ width: 136, fontSize: 12 }} />
                </Form.Item>
              </div>
            )
          })}
        </div>

        <Form.Item name="notas" label="Notas" style={{ marginBottom: 0 }}>
          <Input.TextArea rows={2} placeholder="Observaciones del proceso legal..." />
        </Form.Item>
      </Form>
    </Modal>
  )
}

// ─── Sección Proceso Legal ────────────────────────────────────────
function ProcesoLegal({ ventaId, venta }) {
  const [modalLegal, setModalLegal] = useState(false)
  const { usuario } = useAuth()
  const puedeEditar = ['GERENTE','JEFE_VENTAS','ABOGADO'].includes(usuario?.rol)

  const proceso = venta?.procesoLegal
  if (!proceso) return (
    <Card title="Proceso Legal">
      <Text type="secondary">No hay proceso legal iniciado para esta venta.</Text>
      {puedeEditar && (
        <div style={{ marginTop: 12 }}>
          <Button size="small" onClick={() => setModalLegal(true)}>Iniciar proceso</Button>
          <ModalLegal open={modalLegal} onClose={() => setModalLegal(false)} ventaId={ventaId} proceso={null} />
        </div>
      )}
    </Card>
  )

  const pasos        = proceso.tienePromesa === false ? PASOS_SIN_PROMESA : PASOS_CON_PROMESA
  const indiceActual = pasos.indexOf(proceso.estadoActual)
  const faltantes    = calcFaltantes(proceso)
  const tieneErrores = faltantes.some(f => f.tipo === 'error')

  const stepsItems = pasos.map((paso, i) => {
    const campo     = FECHA_POR_PASO[paso]
    const fecha     = campo && proceso[campo]
    const vencido   = fecha && i === indiceActual && isPast(new Date(fecha)) && paso !== 'ENTREGADO'
    return {
      title: LEGAL_LABEL[paso],
      description: fecha
        ? <span style={{ fontSize: 11, color: vencido ? '#ff4d4f' : '#8c8c8c' }}>
            {vencido ? '⚠ ' : ''}Límite: {format(new Date(fecha), 'd MMM yyyy', { locale: es })}
          </span>
        : (i >= indiceActual
            ? <span style={{ fontSize: 11, color: '#faad14' }}>Sin fecha límite</span>
            : null),
      status: i < indiceActual ? 'finish' : i === indiceActual ? (vencido ? 'error' : 'process') : 'wait',
    }
  })

  return (
    <Card
      title="Proceso Legal"
      extra={puedeEditar && <Button size="small" onClick={() => setModalLegal(true)}>Actualizar</Button>}
    >
      {/* Qué falta */}
      {faltantes.length > 0 && (
        <Alert
          type={tieneErrores ? 'error' : 'warning'}
          icon={tieneErrores ? <WarningOutlined /> : null}
          showIcon
          style={{ marginBottom: 16 }}
          message={<Text strong style={{ fontSize: 13 }}>Qué falta ({faltantes.length})</Text>}
          description={
            <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
              {faltantes.map((f, i) => (
                <li key={i} style={{ fontSize: 12 }}>{f.texto}</li>
              ))}
            </ul>
          }
        />
      )}
      {faltantes.length === 0 && proceso.estadoActual === 'ENTREGADO' && (
        <Alert type="success" showIcon icon={<CheckCircleOutlined />}
          message="Proceso legal completado" style={{ marginBottom: 16 }} />
      )}

      {/* Timeline */}
      <Steps items={stepsItems} direction="vertical" size="small" current={indiceActual} />

      {/* Documentos */}
      {proceso.documentos?.length > 0 && (
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #f0f0f0' }}>
          <Text strong style={{ fontSize: 13 }}>Documentos adjuntos</Text>
          <div style={{ marginTop: 8 }}>
            {proceso.documentos.map(doc => (
              <a key={doc.id} href={doc.url} target="_blank" rel="noreferrer"
                style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>
                📄 {doc.nombre}
                <Text type="secondary" style={{ fontSize: 11, marginLeft: 8 }}>
                  {LEGAL_LABEL[doc.etapa]}
                </Text>
              </a>
            ))}
          </div>
        </div>
      )}

      <ModalLegal open={modalLegal} onClose={() => setModalLegal(false)} ventaId={ventaId} proceso={proceso} />
    </Card>
  )
}

const METODOS_PAGO = [
  { value: 'TRANSFERENCIA', label: 'Transferencia bancaria' },
  { value: 'VALE_VISTA',    label: 'Vale vista' },
  { value: 'TARJETA',       label: 'Tarjeta de crédito (Webpay)' },
  { value: 'CHEQUE',        label: 'Cheque' },
  { value: 'EFECTIVO',      label: 'Efectivo' },
]
const METODO_LABEL = Object.fromEntries(METODOS_PAGO.map(m => [m.value, m.label]))

// ─── Modal registrar pago ─────────────────────────────────────────
function ModalPagarCuota({ open, onClose, cuota, ventaId }) {
  const qc = useQueryClient()
  const { message } = App.useApp()
  const [metodoPago, setMetodoPago] = useState('TRANSFERENCIA')
  const [fechaPago, setFechaPago]   = useState(new Date().toISOString().slice(0, 10))
  const [notas, setNotas]           = useState('')

  const pagar = useMutation({
    mutationFn: () => api.put(`/pagos/cuotas/${cuota?.id}/pagar`, { metodoPago, fechaPagoReal: fechaPago, notas: notas || undefined }),
    onSuccess: () => { message.success('Pago registrado'); qc.invalidateQueries(['venta', ventaId]); onClose() },
    onError: err => message.error(err.response?.data?.error || 'Error'),
  })

  return (
    <Modal title="Registrar pago" open={open} onCancel={onClose}
      onOk={() => pagar.mutate()} okText="Registrar pago" cancelText="Cancelar"
      confirmLoading={pagar.isPending} width={420}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 14 }}>
        <div>
          <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Método de pago</div>
          <Select value={metodoPago} onChange={setMetodoPago} style={{ width: '100%' }} options={METODOS_PAGO} />
        </div>
        <div>
          <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Fecha de pago</div>
          <Input type="date" value={fechaPago} onChange={e => setFechaPago(e.target.value)} />
        </div>
        <div>
          <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Notas (opcional)</div>
          <Input.TextArea value={notas} onChange={e => setNotas(e.target.value)} rows={2} placeholder="Comprobante, referencia, etc." />
        </div>
      </div>
    </Modal>
  )
}

// ─── Modal agregar cuota a plan existente ─────────────────────────
function ModalAgregarCuota({ open, onClose, ventaId }) {
  const qc = useQueryClient()
  const { message } = App.useApp()
  const EMPTY = { tipo: 'CUOTA', montoUF: null, montoCLP: null, fechaVencimiento: '', metodoPago: null, _ultimoEditado: null }
  const [cuota, setCuota] = useState(EMPTY)
  const { valorUF } = useUFPorFecha(cuota.fechaVencimiento)

  const set = (key, val) => setCuota(p => ({ ...p, [key]: val }))

  const handleUFChange = (value) => {
    setCuota(p => ({ ...p, montoUF: value ?? null, _ultimoEditado: 'uf', montoCLP: value != null && valorUF ? Math.round(value * valorUF) : p.montoCLP }))
  }
  const handleCLPChange = (value) => {
    setCuota(p => ({ ...p, montoCLP: value ?? null, _ultimoEditado: 'clp', montoUF: value != null && valorUF ? parseFloat((value / valorUF).toFixed(4)) : p.montoUF }))
  }

  const fmtUF  = v => v != null ? Number(v).toLocaleString('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 4 }) : ''
  const parseUF = v => { if (!v) return null; const n = parseFloat(v.replace(/\./g, '').replace(',', '.')); return isNaN(n) ? null : n }
  const fmtCLP  = v => v != null ? Math.round(v).toLocaleString('es-CL') : ''
  const parseCLP = v => { if (!v) return null; const n = parseInt(v.replace(/\./g, '').replace(',', ''), 10); return isNaN(n) ? null : n }

  const agregar = useMutation({
    mutationFn: () => {
      const { _ultimoEditado, ...data } = cuota
      return api.post(`/pagos/plan/${ventaId}/cuota`, data)
    },
    onSuccess: () => { message.success('Cuota agregada'); qc.invalidateQueries(['venta', ventaId]); onClose(); setCuota(EMPTY) },
    onError: err => message.error(err.response?.data?.error || 'Error'),
  })

  const label = (txt) => <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>{txt}</div>

  return (
    <Modal title="Agregar cuota" open={open} onCancel={onClose}
      onOk={() => agregar.mutate()} okText="Agregar cuota" cancelText="Cancelar"
      confirmLoading={agregar.isPending} width={460}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 14 }}>
        <div>
          {label('Tipo de cuota')}
          <Select value={cuota.tipo} onChange={v => set('tipo', v)} style={{ width: '100%' }}
            options={[
              { value: 'RESERVA',   label: 'Reserva' },
              { value: 'PIE',       label: 'Pie' },
              { value: 'CUOTA',     label: 'Cuota' },
              { value: 'ESCRITURA', label: 'Escritura' },
            ]}
          />
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 1 }}>
            {label('Monto UF')}
            <InputNumber size="small" style={{ width: '100%' }} placeholder="Ej: 10.50"
              value={cuota.montoUF} onChange={handleUFChange} formatter={fmtUF} parser={parseUF} min={0} />
          </div>
          <div style={{ flex: 1 }}>
            {label('Monto CLP')}
            <InputNumber size="small" style={{ width: '100%' }} placeholder="Ej: 350.000"
              value={cuota.montoCLP} onChange={handleCLPChange} formatter={fmtCLP} parser={parseCLP} min={0} />
          </div>
        </div>
        <div>
          {label('Fecha de vencimiento')}
          <Input type="date" value={cuota.fechaVencimiento} onChange={e => set('fechaVencimiento', e.target.value)} />
        </div>
        <div>
          {label('Método de pago (opcional — si ya está pagado)')}
          <Select allowClear value={cuota.metodoPago} onChange={v => set('metodoPago', v || null)}
            style={{ width: '100%' }} placeholder="Sin método — cuota pendiente"
            options={METODOS_PAGO} />
        </div>
      </div>
    </Modal>
  )
}

// ─── Sección Plan de Pagos ────────────────────────────────────────
function PlanDePagos({ venta }) {
  const qc = useQueryClient()
  const [modalPlan, setModalPlan]       = useState(false)
  const [modalAgregar, setModalAgregar] = useState(false)
  const [cuotaPagar, setCuotaPagar]     = useState(null)
  const { esGerenciaOJV } = useAuth()
  const { formatUF, formatPesos } = useUF()

  const plan = venta?.planPago
  const cuotas = plan?.cuotas || []

  const pagadas   = cuotas.filter(c => c.estado === 'PAGADO').length
  const pendientes = cuotas.filter(c => c.estado === 'PENDIENTE').length
  const atrasadas  = cuotas.filter(c => c.estado === 'ATRASADO').length
  const montoPagado   = cuotas.filter(c => c.estado === 'PAGADO').reduce((s, c) => s + (c.montoUF || 0), 0)
  const montoPendiente = cuotas.filter(c => c.estado !== 'PAGADO' && c.estado !== 'CONDONADO').reduce((s, c) => s + (c.montoUF || 0), 0)

  const ESTADO_CUOTA_COLOR = { PENDIENTE: 'orange', PAGADO: 'green', ATRASADO: 'red', CONDONADO: 'default' }
  const TIPO_CUOTA = { RESERVA: 'Reserva', PIE: 'Pie', CUOTA: 'Cuota', ESCRITURA: 'Escritura' }

  const columns = [
    {
      title: 'Cuota', key: 'tipo',
      render: (_, c) => <Text style={{ fontSize: 12 }}>{TIPO_CUOTA[c.tipo]} #{c.numeroCuota}</Text>
    },
    {
      title: 'Monto', key: 'monto',
      render: (_, c) => (
        <div>
          {c.montoUF  && <div style={{ fontWeight: 600, fontSize: 12 }}>{formatUF(c.montoUF)}</div>}
          {c.montoCLP && <div style={{ fontSize: 11, color: '#8c8c8c' }}>{formatPesos(c.montoCLP)}</div>}
        </div>
      )
    },
    {
      title: 'Vence', key: 'vence',
      render: (_, c) => {
        const vencido = c.estado !== 'PAGADO' && c.estado !== 'CONDONADO' && isPast(new Date(c.fechaVencimiento))
        return (
          <Text style={{ fontSize: 12, color: vencido ? '#dc2626' : undefined }}>
            {format(new Date(c.fechaVencimiento), 'd MMM yyyy', { locale: es })}
          </Text>
        )
      }
    },
    {
      title: 'Fecha pago', key: 'fechaPago',
      render: (_, c) => c.fechaPagoReal
        ? <Text style={{ fontSize: 12, color: '#16a34a' }}>{format(new Date(c.fechaPagoReal), 'd MMM yyyy', { locale: es })}</Text>
        : <Text type="secondary" style={{ fontSize: 12 }}>—</Text>
    },
    {
      title: 'Método', key: 'metodo',
      render: (_, c) => c.metodoPago
        ? <Text style={{ fontSize: 11 }}>{METODO_LABEL[c.metodoPago] || c.metodoPago}</Text>
        : <Text type="secondary" style={{ fontSize: 11 }}>—</Text>
    },
    {
      title: 'Estado', key: 'estado',
      render: (_, c) => <Tag color={ESTADO_CUOTA_COLOR[c.estado]} style={{ fontSize: 11 }}>{c.estado.toLowerCase()}</Tag>
    },
    {
      title: '', key: 'accion', width: 120,
      render: (_, c) => esGerenciaOJV && (c.estado === 'PENDIENTE' || c.estado === 'ATRASADO') ? (
        <Button type="link" size="small" onClick={() => setCuotaPagar(c)}>
          Marcar pagado
        </Button>
      ) : null
    },
  ]

  return (
    <Card
      title="Plan de Pagos"
      extra={esGerenciaOJV && (
        <Space size={6}>
          {plan && <Button size="small" icon={<PlusOutlined />} onClick={() => setModalAgregar(true)}>Agregar cuota</Button>}
          {!plan && <Button size="small" onClick={() => setModalPlan(true)}>Crear plan</Button>}
        </Space>
      )}
    >
      {!plan ? (
        <Text type="secondary" style={{ display: 'block', textAlign: 'center', padding: '16px 0' }}>
          Sin plan de pagos creado.
        </Text>
      ) : (
        <>
          {/* Resumen */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
            {[
              { label: 'Pagadas',   val: pagadas,   color: '#16a34a', bg: '#f0fdf4' },
              { label: 'Pendientes',val: pendientes, color: '#d97706', bg: '#fffbeb' },
              { label: 'Atrasadas', val: atrasadas,  color: '#dc2626', bg: '#fef2f2' },
            ].map(({ label, val, color, bg }) => (
              <div key={label} style={{ background: bg, border: `1px solid ${color}22`, borderRadius: 8, padding: '8px 14px', minWidth: 90, textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 800, color, lineHeight: 1 }}>{val}</div>
                <div style={{ fontSize: 10, color, marginTop: 2 }}>{label}</div>
              </div>
            ))}
            {montoPagado > 0 && (
              <div style={{ background: '#f0fdf4', border: '1px solid #16a34a22', borderRadius: 8, padding: '8px 14px', textAlign: 'center' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#16a34a', lineHeight: 1 }}>{montoPagado.toFixed(2)} UF</div>
                <div style={{ fontSize: 10, color: '#16a34a', marginTop: 2 }}>Cobrado</div>
              </div>
            )}
            {montoPendiente > 0 && (
              <div style={{ background: '#fffbeb', border: '1px solid #d9770622', borderRadius: 8, padding: '8px 14px', textAlign: 'center' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#d97706', lineHeight: 1 }}>{montoPendiente.toFixed(2)} UF</div>
                <div style={{ fontSize: 10, color: '#d97706', marginTop: 2 }}>Por cobrar</div>
              </div>
            )}
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 14px', textAlign: 'center' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#475569', lineHeight: 1 }}>{cuotas.length}</div>
              <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>Total cuotas</div>
            </div>
          </div>

          <Table
            dataSource={cuotas}
            columns={columns}
            rowKey="id"
            pagination={false}
            size="small"
            rowClassName={(c) => c.estado === 'ATRASADO' ? 'ant-table-row-danger' : ''}
          />
        </>
      )}

      <ModalPlanPago open={modalPlan} onClose={() => setModalPlan(false)}
        ventaId={venta?.id} precioUF={venta?.precioFinalUF || 0} />
      <ModalAgregarCuota open={modalAgregar} onClose={() => setModalAgregar(false)} ventaId={venta?.id} />
      <ModalPagarCuota open={!!cuotaPagar} onClose={() => setCuotaPagar(null)} cuota={cuotaPagar} ventaId={venta?.id} />
    </Card>
  )
}

// ─── Modal agregar/editar comisión ────────────────────────────────
function ModalComision({ open, onClose, venta, comisionEditando }) {
  const [form] = Form.useForm()
  const { message } = App.useApp()
  const qc = useQueryClient()
  const [tipoCalculo, setTipoCalculo] = useState('porcentaje')

  const { data: usuarios = [] } = useQuery({
    queryKey: ['usuarios-todos'],
    queryFn: () => api.get('/usuarios').then(r => r.data.filter(u => u.activo)),
    enabled: open
  })

  const { data: plantillas = [] } = useQuery({
    queryKey: ['plantillas-comision'],
    queryFn: () => api.get('/plantillas-comision').then(r => r.data.filter(p => p.activa)),
    enabled: open
  })

  const guardar = useMutation({
    mutationFn: (data) => comisionEditando
      ? api.put(`/comisiones/${comisionEditando.id}`, data)
      : api.post('/comisiones', { ...data, ventaId: venta.id }),
    onSuccess: () => {
      message.success(comisionEditando ? 'Comisión actualizada' : 'Comisión agregada')
      qc.invalidateQueries({ queryKey: ['venta', venta.id] })
      qc.invalidateQueries({ queryKey: ['comisiones'] })
      onClose()
    },
    onError: err => message.error(err.response?.data?.error || 'Error')
  })

  const precioFinal = venta?.precioFinalUF || 0

  // Al abrir: precargar si estamos editando
  const handleAfterOpen = () => {
    if (comisionEditando) {
      const tipo = comisionEditando.porcentaje != null ? 'porcentaje' : 'fijo'
      setTipoCalculo(tipo)
      form.setFieldsValue({
        usuarioId: comisionEditando.usuarioId,
        concepto: comisionEditando.concepto || '',
        tipoCalculo: tipo,
        porcentaje: comisionEditando.porcentaje,
        montoFijo: comisionEditando.montoFijo,
        montoPrimera: comisionEditando.montoPrimera,
        montoSegunda: comisionEditando.montoSegunda,
      })
    } else {
      setTipoCalculo('porcentaje')
      form.resetFields()
      form.setFieldValue('tipoCalculo', 'porcentaje')
    }
  }

  // Recalcular split al cambiar valor
  const recalcularSplit = (valor, tipo) => {
    const total = tipo === 'porcentaje' ? (precioFinal * (valor || 0)) / 100 : (valor || 0)
    const conPromesaVenta = venta?.conPromesa !== false
    const primera = conPromesaVenta ? +(total / 2).toFixed(4) : 0
    const segunda = conPromesaVenta ? +(total / 2).toFixed(4) : +total.toFixed(4)
    form.setFieldsValue({ montoPrimera: primera, montoSegunda: segunda })
  }

  const handleOk = () => {
    form.validateFields().then(values => {
      const data = {
        concepto: values.concepto || undefined,
        porcentaje: values.tipoCalculo === 'porcentaje' ? values.porcentaje : null,
        montoFijo: values.tipoCalculo === 'fijo' ? values.montoFijo : null,
        montoPrimera: values.montoPrimera,
        montoSegunda: values.montoSegunda,
      }
      if (!comisionEditando) data.usuarioId = values.usuarioId
      guardar.mutate(data)
    })
  }

  const rolLabel = (rol) => ({ VENDEDOR: 'Vendedor', BROKER_EXTERNO: 'Broker', JEFE_VENTAS: 'Jefe ventas', GERENTE: 'Gerente', ABOGADO: 'Abogado' }[rol] || rol)

  return (
    <Modal
      title={comisionEditando ? 'Editar comisión' : 'Agregar comisión'}
      open={open}
      onCancel={onClose}
      onOk={handleOk}
      afterOpenChange={o => o && handleAfterOpen()}
      okText="Guardar"
      cancelText="Cancelar"
      confirmLoading={guardar.isPending}
    >
      <Form form={form} layout="vertical" style={{ marginTop: 12 }}
        initialValues={{ tipoCalculo: 'porcentaje' }}>
        {!comisionEditando && plantillas.length > 0 && (
          <Form.Item label="Aplicar plantilla (opcional)">
            <Select
              placeholder="Seleccionar plantilla..."
              allowClear
              onChange={(plantillaId) => {
                if (!plantillaId) return
                const p = plantillas.find(pl => pl.id === plantillaId)
                if (!p) return
                const tipo = p.porcentaje != null ? 'porcentaje' : 'fijo'
                setTipoCalculo(tipo)
                const total = p.porcentaje != null ? (precioFinal * p.porcentaje) / 100 : (p.montoFijo || 0)
                const conPromesaVenta = venta?.conPromesa !== false
                const primera = conPromesaVenta ? +(total * p.pctPromesa / 100).toFixed(4) : 0
                const segunda = conPromesaVenta ? +(total * p.pctEscritura / 100).toFixed(4) : +total.toFixed(4)
                form.setFieldsValue({
                  concepto: p.concepto,
                  tipoCalculo: tipo,
                  porcentaje: p.porcentaje,
                  montoFijo: p.montoFijo,
                  montoPrimera: primera,
                  montoSegunda: segunda,
                })
              }}
              options={plantillas.map(p => ({
                value: p.id,
                label: `${p.nombre} — ${p.porcentaje != null ? `${p.porcentaje}%` : `${p.montoFijo} UF fijo`} (${p.pctPromesa}/${p.pctEscritura})`
              }))}
            />
          </Form.Item>
        )}

        {!comisionEditando && (
          <Form.Item name="usuarioId" label="Persona" rules={[{ required: true, message: 'Selecciona una persona' }]}>
            <Select
              showSearch
              placeholder="Seleccionar..."
              filterOption={(input, opt) => opt.search.toLowerCase().includes(input.toLowerCase())}
              options={usuarios.map(u => ({
                value: u.id,
                search: `${u.nombre} ${u.apellido}`,
                label: <span>{u.nombre} {u.apellido} <Text type="secondary" style={{ fontSize: 11 }}>({rolLabel(u.rol)})</Text></span>
              }))}
            />
          </Form.Item>
        )}

        <Form.Item name="concepto" label="Concepto (etiqueta)">
          <Input placeholder="Ej: Vendedor, Broker, Bono cierre..." />
        </Form.Item>

        <Form.Item name="tipoCalculo" label="Tipo de comisión">
          <Radio.Group onChange={e => { setTipoCalculo(e.target.value); form.setFieldsValue({ porcentaje: undefined, montoFijo: undefined, montoPrimera: undefined, montoSegunda: undefined }) }}>
            <Radio value="porcentaje">% sobre precio venta</Radio>
            <Radio value="fijo">Monto fijo en UF</Radio>
          </Radio.Group>
        </Form.Item>

        {tipoCalculo === 'porcentaje' ? (
          <Form.Item name="porcentaje" label={`Porcentaje (precio final: ${precioFinal.toFixed(2)} UF)`} rules={[{ required: true, message: 'Ingresa el porcentaje' }]}>
            <InputNumber
              min={0} max={100} step={0.1} addonAfter="%"
              style={{ width: '100%' }}
              onChange={v => recalcularSplit(v, 'porcentaje')}
            />
          </Form.Item>
        ) : (
          <Form.Item name="montoFijo" label="Monto en UF" rules={[{ required: true, message: 'Ingresa el monto' }]}>
            <InputNumber
              min={0} step={0.1} addonAfter="UF"
              style={{ width: '100%' }}
              onChange={v => recalcularSplit(v, 'fijo')}
            />
          </Form.Item>
        )}

        <Divider style={{ margin: '8px 0' }}>Distribución del pago</Divider>
        {venta?.conPromesa === false && (
          <Alert
            type="info"
            showIcon
            message="Esta venta no tiene promesa — el 100% se paga en escritura."
            style={{ marginBottom: 8 }}
          />
        )}
        <Row gutter={12}>
          <Col span={12}>
            <Form.Item name="montoPrimera" label="1ª parte (promesa)" rules={[{ required: true }]}>
              <InputNumber min={0} step={0.01} addonAfter="UF" style={{ width: '100%' }} disabled={venta?.conPromesa === false} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="montoSegunda" label="2ª parte (escritura)" rules={[{ required: true }]}>
              <InputNumber min={0} step={0.01} addonAfter="UF" style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  )
}

// ─── Comisiones ───────────────────────────────────────────────────
function Comisiones({ venta }) {
  const { esGerenciaOJV } = useAuth()
  const qc = useQueryClient()
  const { message } = App.useApp()
  const [modalOpen, setModalOpen] = useState(false)
  const [editando, setEditando] = useState(null)

  const marcar = useMutation({
    mutationFn: ({ id, tramo }) => api.put(`/comisiones/${id}/${tramo}`, {}),
    onSuccess: () => { message.success('Comisión actualizada'); qc.invalidateQueries(['venta', venta.id]) },
    onError: err => message.error(err.response?.data?.error || 'Error')
  })

  const eliminar = useMutation({
    mutationFn: (id) => api.delete(`/comisiones/${id}`),
    onSuccess: () => { message.success('Comisión eliminada'); qc.invalidateQueries(['venta', venta.id]) },
    onError: err => message.error(err.response?.data?.error || 'Error')
  })

  if (!esGerenciaOJV) return null

  const comisiones = venta?.comisiones || []
  const totalUF = comisiones.reduce((s, c) => s + c.montoCalculadoUF, 0)

  const abrirEditar = (c) => { setEditando(c); setModalOpen(true) }
  const abrirNuevo = () => { setEditando(null); setModalOpen(true) }
  const cerrarModal = () => { setModalOpen(false); setEditando(null) }

  return (
    <Card
      title={<span>Comisiones <Text type="secondary" style={{ fontSize: 13, fontWeight: 400 }}>— total: {totalUF.toFixed(2)} UF</Text></span>}
      extra={<Button size="small" icon={<PlusOutlined />} onClick={abrirNuevo}>Agregar</Button>}
    >
      {comisiones.length === 0 ? (
        <Text type="secondary" style={{ display: 'block', textAlign: 'center', padding: '16px 0' }}>
          Sin comisiones. Usa "Agregar" para crear una.
        </Text>
      ) : (
        <Space direction="vertical" style={{ width: '100%' }} size={10}>
          {comisiones.map(c => (
            <Card key={c.id} size="small" style={{ background: '#fafafa' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div>
                  <Text strong>{c.usuario.nombre} {c.usuario.apellido}</Text>
                  {c.concepto && <Tag style={{ marginLeft: 8, fontSize: 11 }}>{c.concepto}</Tag>}
                  <div>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {c.porcentaje != null ? `${c.porcentaje}% del precio` : `Fijo`}
                      {' · '}
                      <Text strong style={{ fontSize: 12 }}>{c.montoCalculadoUF.toFixed(2)} UF total</Text>
                    </Text>
                  </div>
                </div>
                <Space size={4}>
                  <Button size="small" icon={<EditOutlined />} onClick={() => abrirEditar(c)} />
                  <Popconfirm
                    title="¿Eliminar esta comisión?"
                    onConfirm={() => eliminar.mutate(c.id)}
                    okText="Eliminar" cancelText="Cancelar" okButtonProps={{ danger: true }}
                  >
                    <Button size="small" danger icon={<DeleteOutlined />} />
                  </Popconfirm>
                </Space>
              </div>
              <Row gutter={8}>
                <Col span={12}>
                  <div style={{ background: c.estadoPrimera === 'PAGADO' ? '#f6ffed' : '#fffbe6', borderRadius: 6, padding: '8px 10px' }}>
                    <Text strong style={{ fontSize: 12 }}>1ª parte — promesa</Text>
                    <div><Text style={{ fontSize: 13 }}>{c.montoPrimera.toFixed(2)} UF</Text></div>
                    <Tag color={c.estadoPrimera === 'PAGADO' ? 'green' : 'orange'} style={{ fontSize: 11, marginTop: 4 }}>
                      {c.estadoPrimera === 'PAGADO' ? 'Pagado' : 'Pendiente'}
                    </Tag>
                    {c.estadoPrimera === 'PENDIENTE' && (
                      <div><Button type="link" size="small" style={{ padding: 0 }} onClick={() => marcar.mutate({ id: c.id, tramo: 'primera' })}>
                        Marcar pagada
                      </Button></div>
                    )}
                  </div>
                </Col>
                <Col span={12}>
                  <div style={{ background: c.estadoSegunda === 'PAGADO' ? '#f6ffed' : '#fffbe6', borderRadius: 6, padding: '8px 10px' }}>
                    <Text strong style={{ fontSize: 12 }}>2ª parte — escritura</Text>
                    <div><Text style={{ fontSize: 13 }}>{c.montoSegunda.toFixed(2)} UF</Text></div>
                    <Tag color={c.estadoSegunda === 'PAGADO' ? 'green' : 'orange'} style={{ fontSize: 11, marginTop: 4 }}>
                      {c.estadoSegunda === 'PAGADO' ? 'Pagado' : 'Pendiente'}
                    </Tag>
                    {c.estadoSegunda === 'PENDIENTE' && (
                      <div><Button type="link" size="small" style={{ padding: 0 }} onClick={() => marcar.mutate({ id: c.id, tramo: 'segunda' })}>
                        Marcar pagada
                      </Button></div>
                    )}
                  </div>
                </Col>
              </Row>
            </Card>
          ))}
        </Space>
      )}

      <ModalComision
        open={modalOpen}
        onClose={cerrarModal}
        venta={venta}
        comisionEditando={editando}
      />
    </Card>
  )
}

// ─── Modal agregar promoción ──────────────────────────────────────
function ModalAgregarPromocion({ open, onClose, ventaId }) {
  const qc = useQueryClient()
  const [form] = Form.useForm()
  const { message } = App.useApp()

  const { data: disponibles = [] } = useQuery({
    queryKey: ['promociones-activas'],
    queryFn: () => api.get('/promociones', { params: { activa: true } }).then(r => r.data),
    enabled: open
  })

  const agregar = useMutation({
    mutationFn: (d) => api.post(`/promociones/${d.promocionId}/aplicar-venta`, { ventaId }),
    onSuccess: () => {
      message.success('Promoción agregada')
      qc.invalidateQueries(['venta', String(ventaId)])
      onClose()
      form.resetFields()
    },
    onError: err => message.error(err.response?.data?.error || 'Error')
  })

  return (
    <Modal title="Agregar Promoción" open={open} onCancel={() => { onClose(); form.resetFields() }}
      onOk={() => form.validateFields().then(agregar.mutate)}
      okText="Agregar" cancelText="Cancelar" confirmLoading={agregar.isPending}>
      <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
        <Form.Item name="promocionId" label="Seleccionar promoción" rules={[{ required: true }]}>
          <Select
            showSearch
            optionFilterProp="label"
            placeholder="Buscar promoción..."
            options={disponibles.map(p => ({
              value: p.id,
              label: p.nombre,
              p,
            }))}
            optionRender={({ data }) => (
              <div>
                <Tag color={TIPO_PROMO_COLOR[data.p?.tipo]} style={{ fontSize: 11 }}>
                  {TIPO_PROMO_LABEL[data.p?.tipo]}
                </Tag>
                <Text style={{ fontSize: 13 }}>{data.label}</Text>
                <div><Text type="secondary" style={{ fontSize: 11 }}>{resumenPromo(data.p || {})}</Text></div>
              </div>
            )}
          />
        </Form.Item>
      </Form>
    </Modal>
  )
}

// ─── Card promociones en venta ────────────────────────────────────
function PromocionesVenta({ venta }) {
  const { esGerenciaOJV } = useAuth()
  const qc = useQueryClient()
  const { message } = App.useApp()
  const [modal, setModal] = useState(false)

  const quitar = useMutation({
    mutationFn: (vpId) => api.delete(`/promociones/venta-promo/${vpId}`),
    onSuccess: () => {
      message.success('Promoción quitada')
      qc.invalidateQueries(['venta', String(venta.id)])
    },
    onError: err => message.error(err.response?.data?.error || 'Error')
  })

  const aplicadas = venta?.promociones || []

  return (
    <Card
      title="Promociones"
      extra={esGerenciaOJV && (
        <Button size="small" icon={<PlusOutlined />} type="primary" ghost onClick={() => setModal(true)}>
          Agregar
        </Button>
      )}
    >
      {aplicadas.length === 0 ? (
        <Text type="secondary" style={{ display: 'block', textAlign: 'center', padding: '12px 0' }}>
          Sin promociones asociadas.
        </Text>
      ) : (
        <Space direction="vertical" style={{ width: '100%' }} size={8}>
          {aplicadas.map(vp => {
            const p = vp.promocion
            const icono = p.tipo === 'PAQUETE' ? <AppstoreOutlined /> : p.tipo === 'BENEFICIO' ? <GiftOutlined /> : null
            return (
              <div key={vp.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                background: '#fafafa', padding: '10px 14px', borderRadius: 8,
                border: '1px solid #f0f0f0'
              }}>
                <div>
                  <Space size={6}>
                    <Tag color={TIPO_PROMO_COLOR[p.tipo]} icon={icono} style={{ fontSize: 11 }}>
                      {TIPO_PROMO_LABEL[p.tipo]}
                    </Tag>
                    <Text strong style={{ fontSize: 13 }}>{p.nombre}</Text>
                  </Space>
                  <div style={{ marginTop: 2 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>{resumenPromo(p)}</Text>
                  </div>
                  {p.tipo === 'ARRIENDO_ASEGURADO' && vp.pagosArriendoAsegurado?.length > 0 && (
                    <div style={{ marginTop: 4 }}>
                      <Text style={{ fontSize: 11, color: '#8c8c8c' }}>
                        {vp.pagosArriendoAsegurado.filter(pg => pg.estado === 'PAGADO').length} / {vp.pagosArriendoAsegurado.length} pagos completados
                      </Text>
                    </div>
                  )}
                </div>
                {esGerenciaOJV && (
                  <Popconfirm
                    title="¿Quitar esta promoción?"
                    onConfirm={() => quitar.mutate(vp.id)}
                    okText="Sí" cancelText="No"
                  >
                    <Button size="small" type="text" danger icon={<DeleteOutlined />} />
                  </Popconfirm>
                )}
              </div>
            )
          })}
        </Space>
      )}
      <ModalAgregarPromocion open={modal} onClose={() => setModal(false)} ventaId={venta?.id} />
    </Card>
  )
}

// ─── Unidades Card ─────────────────────────────────────────────────
const ACCESO_LABEL = { RAMPA: 'Rampa', ASCENSOR: 'Ascensor', ESCALERA: 'Escalera' }
const ESTADO_UNIDAD_COLOR = { DISPONIBLE: 'green', RESERVADO: 'orange', VENDIDO: 'red', ARRENDADO: 'blue' }
const ESTADO_UNIDAD_LABEL = { DISPONIBLE: 'Disponible', RESERVADO: 'Reservado', VENDIDO: 'Vendido', ARRENDADO: 'Arrendado' }

function UnidadesCard({ unidades }) {
  const { formatUF, ufAPesos, formatPesos } = useUF()
  const [unidadVer, setUnidadVer] = useState(null)

  return (
    <>
      <Card
        size="small"
        title={<Space><HomeOutlined />{`Unidad${unidades.length !== 1 ? 'es' : ''} compradas (${unidades.length})`}</Space>}
      >
        <Row gutter={[8, 8]}>
          {unidades.map(u => (
            <Col key={u.id} span={unidades.length === 1 ? 24 : 12}>
              <Card
                size="small"
                hoverable
                onClick={() => setUnidadVer(u)}
                style={{ cursor: 'pointer', background: '#f9f9f9' }}
                extra={<ExpandOutlined style={{ color: '#8c8c8c', fontSize: 11 }} />}
                title={
                  <Space size={4}>
                    <span>{u.tipo === 'BODEGA' ? '📦' : '🚗'}</span>
                    <Text strong style={{ fontSize: 13 }}>{u.tipo === 'BODEGA' ? 'Bodega' : 'Est.'} {u.numero}</Text>
                    {u.subtipo === 'TANDEM' && <Tag color="purple" style={{ fontSize: 10 }}>Tándem</Tag>}
                  </Space>
                }
              >
                <Tag color={ESTADO_UNIDAD_COLOR[u.estado]} style={{ marginBottom: 6 }}>{ESTADO_UNIDAD_LABEL[u.estado]}</Tag>
                {u.m2 && <div><Text type="secondary" style={{ fontSize: 12 }}>{u.m2} m²</Text></div>}
                {u.piso && <div><Text type="secondary" style={{ fontSize: 12 }}>Piso {u.piso}</Text></div>}
                <div style={{ marginTop: 4 }}>
                  <Text type="secondary" style={{ fontSize: 11 }}>Lista: </Text>
                  <Text strong style={{ fontSize: 13, color: '#1677ff' }}>{formatUF(u.precioUF)}</Text>
                </div>
                <div><Text type="secondary" style={{ fontSize: 11 }}>{u.edificio?.nombre}</Text></div>
              </Card>
            </Col>
          ))}
        </Row>
      </Card>

      <Modal
        open={!!unidadVer}
        onCancel={() => setUnidadVer(null)}
        footer={null}
        title={
          <Space>
            <span>{unidadVer?.tipo === 'BODEGA' ? '📦' : '🚗'}</span>
            <span>{unidadVer?.tipo === 'BODEGA' ? 'Bodega' : 'Est.'} {unidadVer?.numero}</span>
            {unidadVer?.subtipo === 'TANDEM' && <Tag color="purple">Tándem</Tag>}
          </Space>
        }
        width={420}
      >
        {unidadVer && (
          <Space direction="vertical" style={{ width: '100%' }} size={0}>
            <Tag color={ESTADO_UNIDAD_COLOR[unidadVer.estado]} style={{ marginBottom: 12 }}>
              {ESTADO_UNIDAD_LABEL[unidadVer.estado]}
            </Tag>

            <Row gutter={[0, 6]}>
              <Col span={12}><Text type="secondary">Edificio</Text></Col>
              <Col span={12}><Text strong>{unidadVer.edificio?.nombre}</Text></Col>

              <Col span={12}><Text type="secondary">Dirección</Text></Col>
              <Col span={12}><Text>{unidadVer.edificio?.direccion || '—'}</Text></Col>

              <Col span={12}><Text type="secondary">Región</Text></Col>
              <Col span={12}><Text>{unidadVer.edificio?.region} · {unidadVer.edificio?.comuna}</Text></Col>

              {unidadVer.piso && <>
                <Col span={12}><Text type="secondary">Piso</Text></Col>
                <Col span={12}><Text>{unidadVer.piso}</Text></Col>
              </>}

              {unidadVer.m2 && <>
                <Col span={12}><Text type="secondary">Superficie</Text></Col>
                <Col span={12}><Text>{unidadVer.m2} m²</Text></Col>
              </>}

              {unidadVer.techado !== null && unidadVer.techado !== undefined && <>
                <Col span={12}><Text type="secondary">Techado</Text></Col>
                <Col span={12}><Text>{unidadVer.techado ? 'Sí' : 'No'}</Text></Col>
              </>}

              {unidadVer.acceso && <>
                <Col span={12}><Text type="secondary">Acceso</Text></Col>
                <Col span={12}><Text>{ACCESO_LABEL[unidadVer.acceso] || unidadVer.acceso}</Text></Col>
              </>}

              <Col span={24}><Divider style={{ margin: '8px 0' }} /></Col>

              <Col span={12}><Text type="secondary">Precio lista</Text></Col>
              <Col span={12}><Text strong style={{ color: '#1677ff' }}>{formatUF(unidadVer.precioUF)}</Text></Col>

              {ufAPesos(unidadVer.precioUF) && <>
                <Col span={12}></Col>
                <Col span={12}><Text type="secondary" style={{ fontSize: 12 }}>{formatPesos(ufAPesos(unidadVer.precioUF))}</Text></Col>
              </>}

              {unidadVer.precioMinimoUF && <>
                <Col span={12}><Text type="secondary">Precio mínimo</Text></Col>
                <Col span={12}><Text type="secondary">{formatUF(unidadVer.precioMinimoUF)}</Text></Col>
              </>}

              {unidadVer.notas && <>
                <Col span={24}><Divider style={{ margin: '8px 0' }} /></Col>
                <Col span={24}><Text type="secondary" style={{ fontSize: 12 }}>{unidadVer.notas}</Text></Col>
              </>}
            </Row>
          </Space>
        )}
      </Modal>
    </>
  )
}

// ─── Modal editar venta ───────────────────────────────────────────
function ModalEditarVenta({ open, onClose, venta }) {
  const qc = useQueryClient()
  const [form] = Form.useForm()
  const { message } = App.useApp()

  const editar = useMutation({
    mutationFn: (d) => api.put(`/ventas/${venta.id}`, d),
    onSuccess: () => {
      message.success('Venta actualizada')
      qc.invalidateQueries(['venta', String(venta.id)])
      onClose()
    },
    onError: err => message.error(err.response?.data?.error || 'Error al editar')
  })

  return (
    <Modal
      title="Editar venta"
      open={open}
      onCancel={onClose}
      onOk={() => form.validateFields().then(editar.mutate)}
      okText="Guardar"
      cancelText="Cancelar"
      confirmLoading={editar.isPending}
      width={460}
    >
      <Form form={form} layout="vertical" style={{ marginTop: 16 }} initialValues={{
        precioListaUF: venta?.precioListaUF,
        descuentoPacksUF: venta?.descuentoPacksUF,
        descuentoAprobadoUF: venta?.descuentoAprobadoUF,
        precioFinalUF: venta?.precioFinalUF,
        notas: venta?.notas,
      }}>
        <Form.Item name="precioListaUF" label="Precio de lista (UF)" rules={[{ required: true }]}>
          <InputNumber min={0} step={0.01} style={{ width: '100%' }} addonAfter="UF" />
        </Form.Item>
        <Form.Item name="descuentoPacksUF" label="Descuento packs (UF)">
          <InputNumber min={0} step={0.01} style={{ width: '100%' }} addonAfter="UF" />
        </Form.Item>
        <Form.Item name="descuentoAprobadoUF" label="Descuento aprobado (UF)">
          <InputNumber min={0} step={0.01} style={{ width: '100%' }} addonAfter="UF" />
        </Form.Item>
        <Form.Item name="precioFinalUF" label="Precio final (UF)" rules={[{ required: true }]}>
          <InputNumber min={0} step={0.01} style={{ width: '100%' }} addonAfter="UF" />
        </Form.Item>
        <Form.Item name="notas" label="Notas">
          <Input.TextArea rows={2} />
        </Form.Item>
      </Form>
    </Modal>
  )
}

// ─── Página principal ──────────────────────────────────────────────
export default function VentaDetalle() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { esGerenciaOJV, usuario } = useAuth()
  const { formatUF, formatPesos, ufAPesos } = useUF()
  const [modalEditar, setModalEditar] = useState(false)
  const anular = useAnularVenta(Number(id))

  const { data: venta, isLoading } = useQuery({
    queryKey: ['venta', id],
    queryFn: () => api.get(`/ventas/${id}`).then(r => r.data)
  })

  if (isLoading) return <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>
  if (!venta) return <Text type="secondary" style={{ padding: 24, display: 'block' }}>Venta no encontrada.</Text>

  const precioFinal = venta.precioFinalUF || 0

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      {/* Breadcrumb */}
      <Space style={{ marginBottom: 16 }}>
        <Button type="link" style={{ padding: 0 }} onClick={() => navigate('/ventas')}>← Ventas</Button>
        <Text type="secondary">/</Text>
        <Text type="secondary">Venta #{venta.id}</Text>
        {venta.lead?.id && (
          <>
            <Text type="secondary">/</Text>
            <Button type="link" style={{ padding: 0 }} onClick={() => navigate(`/leads/${venta.lead.id}`)}>
              Lead #{venta.lead.id}
            </Button>
          </>
        )}
      </Space>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <div>
          <Space align="center">
            <Title level={4} style={{ margin: 0 }}>Venta #{venta.id}</Title>
            <Tag color={ESTADO_VENTA_COLOR[venta.estado]}>{ESTADO_LABEL[venta.estado]}</Tag>
            {venta.conPromesa !== undefined && (
              <Tag color={venta.conPromesa ? 'blue' : 'orange'}>
                {venta.conPromesa ? 'Con promesa' : 'Directo a escritura'}
              </Tag>
            )}
          </Space>
          <div style={{ marginTop: 4 }}>
            <Text type="secondary" style={{ fontSize: 13 }}>
              {venta.comprador?.nombre} {venta.comprador?.apellido}
            </Text>
          </div>
          <div style={{ marginTop: 2 }}>
            {(venta.unidades || []).map(u => (
              <Tag key={u.id} color="geekblue" style={{ marginBottom: 2 }}>
                {u.tipo === 'BODEGA' ? 'Bodega' : 'Est.'} {u.numero}{u.m2 ? ` · ${u.m2}m²` : ''} — {u.edificio?.nombre}
              </Tag>
            ))}
          </div>
        </div>
        <Space wrap>
          {usuario?.rol === 'GERENTE' && venta.estado !== 'ENTREGADO' && (
            <Button icon={<EditOutlined />} onClick={() => setModalEditar(true)}>Editar precios</Button>
          )}
          {usuario?.rol === 'GERENTE' && !['ENTREGADO','ANULADO'].includes(venta.estado) && (
            <Popconfirm
              title="¿Anular esta venta?"
              description="Libera las unidades y marca el lead como perdido. No se puede deshacer."
              onConfirm={() => anular.mutate()}
              okText="Sí, anular"
              cancelText="Cancelar"
              okButtonProps={{ danger: true, loading: anular.isPending }}
            >
              <Button danger>Anular venta</Button>
            </Popconfirm>
          )}
        </Space>
      </div>

      <Row gutter={[16, 16]}>
        {/* Columna izquierda */}
        <Col xs={24} md={8}>
          <Space direction="vertical" style={{ width: '100%' }} size={12}>
            <Card size="small" title="Precio">
              <div style={{ background: '#f8faff', border: '1px solid #d6e4ff', borderRadius: 8, padding: '12px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                  <Text type="secondary">Precio de lista</Text>
                  <Text>{(venta.precioListaUF || 0).toFixed(2)} UF</Text>
                </div>
                {venta.descuentoPacksUF > 0 && (
                  <>
                    {(venta.cotizacionOrigen?.packs?.length > 0
                      ? venta.cotizacionOrigen.packs
                      : [{ pack: { nombre: 'Descuento packs' }, descuentoAplicadoUF: venta.descuentoPacksUF }]
                    ).map((cp, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                        <Text style={{ color: '#d46b08' }}>− {cp.pack.nombre}</Text>
                        <Text style={{ color: '#d46b08' }}>−{cp.descuentoAplicadoUF.toFixed(2)} UF</Text>
                      </div>
                    ))}
                  </>
                )}
                {venta.descuentoAprobadoUF > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                    <Text style={{ color: '#d46b08' }}>− Desc. aprobado</Text>
                    <Text style={{ color: '#d46b08' }}>−{venta.descuentoAprobadoUF.toFixed(2)} UF</Text>
                  </div>
                )}
                <Divider style={{ margin: '8px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text strong>Precio final</Text>
                  <Text strong style={{ fontSize: 16, color: '#1677ff' }}>{precioFinal.toFixed(2)} UF</Text>
                </div>
              </div>
              <Text type="secondary" style={{ fontSize: 12, marginTop: 6, display: 'block' }}>{formatPesos(ufAPesos(precioFinal))}</Text>
              {venta.cotizacionOrigen && (
                <div style={{ marginTop: 8, fontSize: 12 }}>
                  <Text type="secondary">Cotización: </Text>
                  <a href={`/cotizaciones/${venta.cotizacionOrigen.id}`}>#{venta.cotizacionOrigen.id}</a>
                  <Tag style={{ marginLeft: 8 }} color={venta.cotizacionOrigen.estado === 'ACEPTADA' ? 'green' : 'blue'}>
                    {venta.cotizacionOrigen.estado}
                  </Tag>
                </div>
              )}
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #f0f0f0' }}>
                {venta.fechaReserva && <div style={{ fontSize: 12, color: '#8c8c8c' }}>Reserva: {format(new Date(venta.fechaReserva), 'd MMM yyyy', { locale: es })}</div>}
                {venta.fechaPromesa && <div style={{ fontSize: 12, color: '#8c8c8c' }}>Promesa: {format(new Date(venta.fechaPromesa), 'd MMM yyyy', { locale: es })}</div>}
                {venta.fechaEscritura && <div style={{ fontSize: 12, color: '#8c8c8c' }}>Escritura: {format(new Date(venta.fechaEscritura), 'd MMM yyyy', { locale: es })}</div>}
                {venta.fechaEntrega && <div style={{ fontSize: 12, color: '#8c8c8c' }}>Entrega: {format(new Date(venta.fechaEntrega), 'd MMM yyyy', { locale: es })}</div>}
              </div>
            </Card>

            <Card size="small" title="Comprador">
              <Text strong>{venta.comprador?.nombre} {venta.comprador?.apellido}</Text>
              {venta.comprador?.rut && <div><Text type="secondary" style={{ fontSize: 13 }}>RUT: {venta.comprador.rut}</Text></div>}
              {venta.comprador?.empresa && <div><Text type="secondary" style={{ fontSize: 13 }}>{venta.comprador.empresa}</Text></div>}
            </Card>

            <Card size="small" title="Equipo">
              <Space direction="vertical" size={4}>
                {venta.vendedor && <Text style={{ fontSize: 13 }}>👤 <Text strong>{venta.vendedor.nombre} {venta.vendedor.apellido}</Text> <Text type="secondary">· Vendedor</Text></Text>}
                {venta.broker && <Text style={{ fontSize: 13 }}>🤝 <Text strong>{venta.broker.nombre} {venta.broker.apellido}</Text> <Text type="secondary">· Broker</Text></Text>}
                {venta.gerente && <Text style={{ fontSize: 13 }}>⭐ <Text strong>{venta.gerente.nombre} {venta.gerente.apellido}</Text> <Text type="secondary">· Gerente</Text></Text>}
              </Space>
            </Card>

            <UnidadesCard unidades={venta.unidades || []} />
          </Space>
        </Col>

        {/* Columna derecha */}
        <Col xs={24} md={16}>
          <Space direction="vertical" style={{ width: '100%' }} size={16}>
            <ProcesoLegal ventaId={id} venta={venta} />
            <PlanDePagos venta={venta} />
            {venta.beneficios?.length > 0 && (
              <Card title="Beneficios" size="small">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {venta.beneficios.map(vb => (
                    <div key={vb.id} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '8px 12px', borderRadius: 8, background: '#f6ffed', border: '1px solid #b7eb8f'
                    }}>
                      <div>
                        <Tag color="green">{vb.beneficio.tipo}</Tag>
                        <Text strong style={{ fontSize: 13 }}>{vb.beneficio.nombre}</Text>
                        {vb.beneficio.descripcion && <div><Text type="secondary" style={{ fontSize: 12 }}>{vb.beneficio.descripcion}</Text></div>}
                      </div>
                      <Tag color={
                        vb.estado === 'COMPLETADO' ? 'green' :
                        vb.estado === 'EN_CURSO' ? 'blue' :
                        vb.estado === 'CANCELADO' ? 'red' : 'orange'
                      }>{vb.estado}</Tag>
                    </div>
                  ))}
                </div>
              </Card>
            )}
            <Comisiones venta={venta} />

            {venta.postventa?.length > 0 && (
              <Card title={`Postventa (${venta.postventa.length})`}>
                <Space direction="vertical" style={{ width: '100%' }} size={8}>
                  {venta.postventa.map(pv => (
                    <Card key={pv.id} size="small" style={{ background: '#fafafa' }}>
                      <Space>
                        <Tag color={pv.estado === 'CERRADO' ? 'green' : pv.prioridad === 'alta' ? 'red' : 'orange'}>
                          {pv.estado.toLowerCase()}
                        </Tag>
                        <Text style={{ fontSize: 13 }}>{pv.tipo.toLowerCase()}</Text>
                      </Space>
                      <div><Text style={{ fontSize: 13 }}>{pv.descripcion}</Text></div>
                    </Card>
                  ))}
                </Space>
              </Card>
            )}
          </Space>
        </Col>
      </Row>

      <ModalEditarVenta open={modalEditar} onClose={() => setModalEditar(false)} venta={venta} />
    </div>
  )
}
