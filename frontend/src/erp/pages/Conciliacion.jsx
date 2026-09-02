/**
 * La bandeja de conciliación — el corazón del ERP.
 *
 * Cada movimiento sin destino, con su contraparte y las sugerencias del matcher
 * (score + motivos). Todo movimiento tiene un camino: una sugerencia, un
 * documento creado al vuelo (el caso notaría), la cuenta de un cliente, o
 * marcarlo interno. El matcher propone; la persona confirma.
 */
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { Card, Tag, Typography, Button, Space, Segmented, Modal, Form, Input, InputNumber, Select, Empty, Spin, App } from 'antd'
import { ThunderboltOutlined, FileAddOutlined } from '@ant-design/icons'
import api from '../../services/api'
import { clp, fecha, Monto, Score, VERDE, ROJO, NUM } from '../ui'

const { Title, Text } = Typography

const invalidar = (qc) => {
  qc.invalidateQueries({ queryKey: ['erp-conciliacion'] })
  qc.invalidateQueries({ queryKey: ['erp-banco'] })
  qc.invalidateQueries({ queryKey: ['erp-dashboard'] })
  qc.invalidateQueries({ queryKey: ['erp-documentos'] })
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

/** Modal "crear documento y conciliar": pagué algo y no tengo documento que subir. */
function ModalDocumento({ mov, onCerrar }) {
  const qc = useQueryClient()
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const { opcionesCuenta, opcionesProveedor } = useCatalogos()

  // El formulario se pre-llena según el historial: "esta misma glosa se clasificó antes como…"
  useQuery({
    queryKey: ['erp-conciliacion', 'historial', mov.id],
    queryFn: async () => {
      const { data } = await api.get('/erp/conciliacion/historial-sugerencia', { params: { movimientoId: mov.id } })
      const s = data?.sugerencia
      if (s) {
        const actual = form.getFieldsValue()
        form.setFieldsValue({
          descripcion: actual.descripcion || s.descripcion || undefined,
          cuentaId: actual.cuentaId ?? s.cuentaId ?? undefined,
          proveedorId: actual.proveedorId ?? s.proveedorId ?? undefined,
        })
        message.info(s.motivo, 4)
      }
      return data
    },
    staleTime: Infinity,
  })

  const crear = useMutation({
    mutationFn: (valores) => api.post('/erp/conciliacion/documento', { movimientoId: mov.id, ...valores }).then((r) => r.data),
    onSuccess: () => { invalidar(qc); message.success('Documento creado y conciliado.'); onCerrar() },
    onError: (e) => message.error(e.response?.data?.error || 'No se pudo crear el documento.'),
  })

  return (
    <Modal open title="Crear documento y conciliar" onCancel={onCerrar} footer={null} destroyOnHidden>
      <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 12 }}>
        El documento ficticio para la plata sin factura (una notaría, una comisión bancaria).
        Queda amarrado a este movimiento: <Text strong>{mov.glosa}</Text>
      </Text>
      <Form
        form={form}
        layout="vertical"
        size="middle"
        initialValues={{ monto: Math.round(mov.saldoPendiente) }}
        onFinish={(v) => crear.mutate(v)}
      >
        <Form.Item name="descripcion" label="Qué fue esta plata" rules={[{ required: true, message: 'Describe qué fue' }]}>
          <Input autoFocus placeholder="Ej: Gastos notariales promesa Aldunate" />
        </Form.Item>
        <Space.Compact block>
          <Form.Item name="cuentaId" label="Cuenta del plan" style={{ flex: 1, marginRight: 8 }}>
            <Select allowClear showSearch optionFilterProp="label" placeholder="Sin clasificar" options={opcionesCuenta} />
          </Form.Item>
          <Form.Item name="proveedorId" label="Proveedor (opcional)" style={{ flex: 1 }}>
            <Select allowClear showSearch optionFilterProp="label" placeholder="—" options={opcionesProveedor} />
          </Form.Item>
        </Space.Compact>
        <Form.Item name="monto" label={`Monto a imputar (disponible ${clp(mov.saldoPendiente)})`}
          rules={[{ required: true, message: 'Indica el monto' }]}>
          <InputNumber style={{ width: '100%' }} min={1} max={Math.round(mov.saldoPendiente)} formatter={(v) => `$ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')} parser={(v) => v.replace(/[^\d]/g, '')} />
        </Form.Item>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button onClick={onCerrar}>Cancelar</Button>
          <Button type="primary" htmlType="submit" loading={crear.isPending}>Crear y conciliar</Button>
        </div>
      </Form>
    </Modal>
  )
}

function FilaMovimiento({ mov }) {
  const qc = useQueryClient()
  const { message, modal } = App.useApp()
  const [modalDoc, setModalDoc] = useState(false)

  const conciliarSug = useMutation({
    mutationFn: (s) => api.post('/erp/conciliacion', {
      movimientoId: mov.id,
      cuotaId: s.cuotaId, pagoArriendoId: s.pagoArriendoId,
      facturaCompraId: s.facturaCompraId, documentoInternoId: s.documentoInternoId,
      confianza: s.score,
    }).then((r) => r.data),
    onSuccess: () => { invalidar(qc); message.success('Conciliado.') },
    onError: (e) => message.error(e.response?.data?.error || 'No se pudo conciliar.'),
  })

  const aCuenta = useMutation({
    mutationFn: () => api.post('/erp/conciliacion', { movimientoId: mov.id, contactoId: mov.contraparte?.id }).then((r) => r.data),
    onSuccess: () => { invalidar(qc); message.success('Imputado a la cuenta del cliente.') },
    onError: (e) => message.error(e.response?.data?.error || 'No se pudo imputar.'),
  })

  const ignorar = useMutation({
    mutationFn: () => api.patch(`/erp/banco/movimientos/${mov.id}`, { ignorado: true }).then((r) => r.data),
    onSuccess: () => { invalidar(qc); message.success('Fuera del radar de conciliación.') },
  })

  const c = mov.contraparte

  return (
    <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0' }}>
      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {/* Monto y fecha */}
        <div style={{ width: 110, flexShrink: 0 }}>
          <Text type="secondary" style={{ fontSize: 11, ...NUM }}>{fecha(mov.fecha)}</Text>
          <div><Monto valor={mov.monto} style={{ fontSize: 15 }} /></div>
          {mov.saldoPendiente < Math.abs(mov.monto) - 500 && (
            <Text type="secondary" style={{ fontSize: 10, ...NUM }}>quedan {clp(mov.saldoPendiente)}</Text>
          )}
        </div>

        {/* Glosa + contraparte + sugerencias */}
        <div style={{ flex: 1, minWidth: 260 }}>
          <Text style={{ fontSize: 13 }} ellipsis={{ tooltip: mov.glosa }}>{mov.glosa}</Text>
          <div style={{ marginTop: 2 }}>
            {c ? (
              <Space size={6}>
                <Tag color={c.sugerida ? 'default' : 'blue'} title={c.sugerida ? `Propuesta (${c.como})` : 'Identificada'}>
                  {c.sugerida ? `¿${c.nombre}?` : c.nombre}
                </Tag>
                {c.telefono && <Text type="secondary" style={{ fontSize: 11, ...NUM }}>{c.telefono}</Text>}
              </Space>
            ) : <Text type="secondary" style={{ fontSize: 11 }}>Contraparte sin identificar</Text>}
          </div>

          {mov.sugerencias?.length > 0 && (
            <div style={{ marginTop: 8 }}>
              {mov.sugerencias.slice(0, 3).map((s, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '2px 0' }}>
                  <Score valor={s.score} motivos={s.motivos} />
                  <Text style={{ fontSize: 12, flex: 1 }} ellipsis>
                    {s.etiqueta} · {s.nombre}
                    {s.cuenta ? <Text type="secondary"> · {s.cuenta}</Text> : null}
                    <Text type="secondary" style={NUM}> · {clp(s.saldoPorCobrar)}</Text>
                  </Text>
                  <Button size="small" type={i === 0 ? 'primary' : 'default'} loading={conciliarSug.isPending}
                    onClick={() => conciliarSug.mutate(s)}>
                    Conciliar
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Acciones */}
        <Space style={{ flexShrink: 0 }}>
          <Button size="small" icon={<FileAddOutlined />} onClick={() => setModalDoc(true)}>Documento</Button>
          {mov.lado === 'ABONO' && c && !c.sugerida && c.tipo === 'cliente' && (
            <Button size="small" onClick={() => aCuenta.mutate()} loading={aCuenta.isPending}
              title="Plata del cliente sin destino todavía">
              A cuenta
            </Button>
          )}
          <Button size="small" type="text"
            onClick={() => modal.confirm({
              title: '¿Sacar este movimiento del radar?',
              content: 'Para traspasos entre cuentas propias o cosas que no hay que conciliar.',
              okText: 'Ignorar', cancelText: 'Cancelar',
              onOk: () => ignorar.mutate(),
            })}>
            Ignorar
          </Button>
        </Space>
      </div>
      {modalDoc && <ModalDocumento mov={mov} onCerrar={() => setModalDoc(false)} />}
    </div>
  )
}

export default function Conciliacion() {
  const [params, setParams] = useSearchParams()
  const lado = params.get('lado') || 'todos'
  const qc = useQueryClient()
  const { message } = App.useApp()

  const { data: resumen } = useQuery({
    queryKey: ['erp-conciliacion', 'resumen'],
    queryFn: () => api.get('/erp/conciliacion/resumen').then((r) => r.data),
    staleTime: 30000,
  })
  const { data: bandeja, isLoading } = useQuery({
    queryKey: ['erp-conciliacion', 'bandeja', lado],
    queryFn: () => api.get('/erp/conciliacion/por-conciliar', { params: lado !== 'todos' ? { lado } : {} }).then((r) => r.data),
    staleTime: 30000,
  })

  const automatica = useMutation({
    mutationFn: () => api.post('/erp/conciliacion/automatica', {}).then((r) => r.data),
    onSuccess: (r) => {
      invalidar(qc)
      message.success(`${r.conciliadas} conciliadas solas (${r.ambiguos} ambiguas quedaron para ti).`, 6)
    },
    onError: (e) => message.error(e.response?.data?.error || 'Error en la conciliación automática.'),
  })

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <Space size="large">
          <Title level={4} style={{ margin: 0 }}>Conciliación</Title>
          <Segmented
            options={[{ label: 'Todos', value: 'todos' }, { label: 'Abonos', value: 'abonos' }, { label: 'Cargos', value: 'cargos' }]}
            value={lado}
            onChange={(v) => setParams(v === 'todos' ? {} : { lado: v })}
          />
        </Space>
        <Button type="primary" icon={<ThunderboltOutlined />} loading={automatica.isPending} onClick={() => automatica.mutate()}>
          Conciliar automático
        </Button>
      </div>

      {resumen && (
        <Space size="large" wrap style={{ marginBottom: 12 }}>
          <Text style={{ fontSize: 12 }}><Text strong style={{ color: VERDE, ...NUM }}>{clp(resumen.abonosSinConciliar.monto)}</Text> en {resumen.abonosSinConciliar.cantidad} abonos sin conciliar</Text>
          <Text style={{ fontSize: 12 }}><Text strong style={{ color: ROJO, ...NUM }}>{clp(resumen.cargosSinDocumento.monto)}</Text> en {resumen.cargosSinDocumento.cantidad} cargos sin documento</Text>
          <Text style={{ fontSize: 12 }}><Text strong style={NUM}>{clp(resumen.cuotasPorCobrar.monto)}</Text> en cuotas por cobrar</Text>
          <Text style={{ fontSize: 12 }}><Text strong style={NUM}>{clp(resumen.documentosAbiertos.monto + resumen.comprasAbiertas.monto)}</Text> en documentos abiertos</Text>
        </Space>
      )}

      <Card styles={{ body: { padding: 0 } }}>
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spin size="large" /></div>
        ) : !bandeja?.length ? (
          <Empty style={{ padding: 40 }} description="Nada por conciliar con este filtro. Cada peso del banco tiene su documento. 🎯" />
        ) : (
          bandeja.map((m) => <FilaMovimiento key={m.id} mov={m} />)
        )}
      </Card>
    </div>
  )
}
