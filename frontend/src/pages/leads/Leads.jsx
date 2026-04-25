import React, { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  Button, Modal, Form, Input, Select, Tag, Table, Spin,
  Typography, Space, Card, App, Segmented, Drawer,
  Timeline, Descriptions, Divider, Avatar, DatePicker,
  InputNumber
} from 'antd'
import {
  PlusOutlined, AppstoreOutlined, UnorderedListOutlined,
  PhoneOutlined, MailOutlined, CalendarOutlined, ArrowRightOutlined,
  EditOutlined, MessageOutlined, ClockCircleOutlined, FilterOutlined,
  UserSwitchOutlined, CloseOutlined
} from '@ant-design/icons'
import {
  DndContext, PointerSensor, useSensor, useSensors,
  DragOverlay, useDroppable, useDraggable, closestCenter
} from '@dnd-kit/core'
import { formatDistanceToNow, format } from 'date-fns'
import { es } from 'date-fns/locale'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import { ETAPA_COLOR, ETAPA_LABEL, MOTIVO_PERDIDA_LABEL } from '../../components/ui'
import ModalPerdido from '../../components/ModalPerdido'

const { Title, Text } = Typography
const { RangePicker } = DatePicker

const ETAPAS = Object.keys(ETAPA_LABEL)

const TIPO_ICON = {
  LLAMADA: <PhoneOutlined />, EMAIL: <MailOutlined />,
  WHATSAPP: <MessageOutlined />, REUNION: <CalendarOutlined />, NOTA: <EditOutlined />,
}
const TIPO_COLOR_MAP = {
  LLAMADA: '#1677ff', EMAIL: '#722ed1', WHATSAPP: '#52c41a',
  REUNION: '#fa8c16', NOTA: '#8c8c8c',
}

const ORIGEN_OPTIONS = [
  { value: 'INSTAGRAM', label: 'Instagram' }, { value: 'GOOGLE', label: 'Google' },
  { value: 'REFERIDO', label: 'Referido' }, { value: 'BROKER', label: 'Broker' },
  { value: 'VISITA_DIRECTA', label: 'Visita directa' }, { value: 'WEB', label: 'Web' },
  { value: 'META', label: 'Meta' }, { value: 'ORIGEN', label: 'Origen' },
  { value: 'OTRO', label: 'Otro' },
]

// ─── Panel de filtros ────────────────────────────────────────────
function FiltrosLeads({ filtros, onChange, vendedores, edificios, esGerenciaOJV, vista }) {
  const activeCount = [filtros.search, filtros.vendedorId, filtros.etapa, filtros.origen,
    filtros.edificioId, filtros.tipoUnidad, filtros.desde, filtros.sinActividad, filtros.campana
  ].filter(Boolean).length

  return (
    <Card
      size="small"
      style={{ marginBottom: 16, background: '#fafafa' }}
      bodyStyle={{ padding: '10px 14px' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <FilterOutlined style={{ color: '#8c8c8c' }} />
        <Text style={{ fontSize: 13, fontWeight: 500 }}>Filtros</Text>
        {activeCount > 0 && (
          <Tag color="blue" style={{ fontSize: 11 }}>{activeCount} activo{activeCount > 1 ? 's' : ''}</Tag>
        )}
        {activeCount > 0 && (
          <Button size="small" type="link" style={{ padding: 0, marginLeft: 'auto', fontSize: 12 }} onClick={() => onChange({})}>
            Limpiar
          </Button>
        )}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <Input.Search
          placeholder="Buscar nombre, email, teléfono..."
          value={filtros.search || ''}
          onChange={e => onChange({ ...filtros, search: e.target.value || undefined })}
          allowClear size="small"
          style={{ width: 240 }}
        />
        {esGerenciaOJV && (
          <Select
            placeholder="Vendedor"
            value={filtros.vendedorId}
            onChange={v => onChange({ ...filtros, vendedorId: v })}
            allowClear size="small" style={{ width: 160 }}
            options={vendedores.map(v => ({ value: v.id, label: `${v.nombre} ${v.apellido}` }))}
          />
        )}
        {vista === 'lista' && (
          <Select
            placeholder="Etapa"
            value={filtros.etapa}
            onChange={v => onChange({ ...filtros, etapa: v })}
            allowClear size="small" style={{ width: 160 }}
            options={Object.entries(ETAPA_LABEL).map(([k, v]) => ({ value: k, label: v }))}
          />
        )}
        <Select
          placeholder="Origen"
          value={filtros.origen}
          onChange={v => onChange({ ...filtros, origen: v })}
          allowClear size="small" style={{ width: 140 }}
          options={ORIGEN_OPTIONS}
        />
        <Select
          placeholder="Edificio"
          value={filtros.edificioId}
          onChange={v => onChange({ ...filtros, edificioId: v })}
          allowClear size="small" style={{ width: 150 }}
          options={edificios.map(e => ({ value: e.id, label: e.nombre }))}
        />
        <Select
          placeholder="Tipo unidad"
          value={filtros.tipoUnidad}
          onChange={v => onChange({ ...filtros, tipoUnidad: v })}
          allowClear size="small" style={{ width: 140 }}
          options={[{ value: 'BODEGA', label: 'Bodega' }, { value: 'ESTACIONAMIENTO', label: 'Estacionamiento' }]}
        />
        <Input
          placeholder="Campaña"
          value={filtros.campana || ''}
          onChange={e => onChange({ ...filtros, campana: e.target.value || undefined })}
          allowClear size="small" style={{ width: 160 }}
        />
        <DatePicker.RangePicker
          placeholder={['Ingreso desde', 'hasta']}
          size="small" style={{ width: 230 }}
          value={filtros._rango || null}
          onChange={(dates) => onChange({
            ...filtros,
            _rango: dates,
            desde: dates?.[0]?.startOf('day').toISOString(),
            hasta: dates?.[1]?.endOf('day').toISOString()
          })}
        />
        {esGerenciaOJV && (
          <InputNumber
            placeholder="Días sin actividad"
            value={filtros.sinActividad}
            onChange={v => onChange({ ...filtros, sinActividad: v || undefined })}
            min={1} max={365} size="small" style={{ width: 160 }}
            addonAfter="días"
          />
        )}
      </div>
    </Card>
  )
}

// ─── Drawer de vista previa del lead ─────────────────────────────
function LeadPreviewDrawer({ leadId, onClose }) {
  const navigate = useNavigate()

  const { data: lead, isLoading } = useQuery({
    queryKey: ['lead', leadId],
    queryFn: () => api.get(`/leads/${leadId}`).then(r => r.data),
    enabled: !!leadId
  })

  const timeline = lead ? [
    ...(lead.interacciones || []).map(i => ({ ...i, _tipo: 'interaccion' })),
    ...(lead.visitas || []).map(v => ({ ...v, _tipo: 'visita', fecha: v.fechaHora }))
  ].sort((a, b) => new Date(a.fecha) - new Date(b.fecha)) : []

  const esEtapa = (desc) => desc?.startsWith('Etapa cambiada:') || desc?.startsWith('Automatización:')

  const timelineItems = timeline.map(item => {
    const isEtapaCambio = item._tipo === 'interaccion' && esEtapa(item.descripcion)
    const isVisita = item._tipo === 'visita'

    let color = '#d9d9d9'
    let dot = <ClockCircleOutlined />
    if (isEtapaCambio) { color = '#faad14'; dot = <ArrowRightOutlined /> }
    else if (isVisita) { color = '#fa8c16'; dot = <CalendarOutlined /> }
    else if (item.tipo) { color = TIPO_COLOR_MAP[item.tipo] || '#8c8c8c'; dot = TIPO_ICON[item.tipo] }

    return {
      key: item.id,
      color,
      dot,
      children: (
        <div style={{ paddingBottom: 4 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
            <Text style={{ fontSize: 12, fontWeight: isEtapaCambio ? 600 : 400, color: isEtapaCambio ? '#faad14' : undefined }}>
              {isVisita ? `Visita ${item.tipo}` : isEtapaCambio ? item.descripcion : `${item.tipo?.charAt(0)}${item.tipo?.slice(1).toLowerCase()}`}
            </Text>
            <Text type="secondary" style={{ fontSize: 11, whiteSpace: 'nowrap', flexShrink: 0 }}>
              {format(new Date(item.fecha || item.fechaHora), 'd MMM yyyy', { locale: es })}
            </Text>
          </div>
          {!isEtapaCambio && item.descripcion && (
            <Text style={{ fontSize: 12, color: '#595959' }}>{item.descripcion}</Text>
          )}
          {isVisita && item.resultado && (
            <Tag color={item.resultado === 'positivo' ? 'green' : 'red'} style={{ fontSize: 11, marginTop: 2 }}>
              {item.resultado}
            </Tag>
          )}
        </div>
      )
    }
  })

  return (
    <Drawer
      open={!!leadId}
      onClose={onClose}
      width={420}
      title={
        isLoading ? 'Cargando...' : (
          <Space>
            <Avatar style={{ background: '#1677ff' }}>{lead?.contacto?.nombre?.[0]}</Avatar>
            <div>
              <div style={{ fontWeight: 600 }}>{lead?.contacto?.nombre} {lead?.contacto?.apellido}</div>
              <Tag color={ETAPA_COLOR[lead?.etapa]} style={{ marginTop: 2 }}>{ETAPA_LABEL[lead?.etapa]}</Tag>
            </div>
          </Space>
        )
      }
      extra={
        <Button type="primary" size="small" onClick={() => { onClose(); navigate(`/leads/${leadId}`) }}>
          Ver detalle completo
        </Button>
      }
    >
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
      ) : !lead ? null : (
        <div>
          <Descriptions column={1} size="small" style={{ marginBottom: 16 }}>
            {lead.contacto.telefono && (
              <Descriptions.Item label="Teléfono">
                <a href={`tel:${lead.contacto.telefono}`}><PhoneOutlined /> {lead.contacto.telefono}</a>
              </Descriptions.Item>
            )}
            {lead.contacto.email && (
              <Descriptions.Item label="Email">
                <a href={`mailto:${lead.contacto.email}`}>{lead.contacto.email}</a>
              </Descriptions.Item>
            )}
            {lead.contacto.origen && (
              <Descriptions.Item label="Origen">
                <Tag>{lead.contacto.origen.toLowerCase().replace('_', ' ')}</Tag>
                {lead.campana && <Text type="secondary" style={{ fontSize: 12, marginLeft: 6 }}>{lead.campana}</Text>}
              </Descriptions.Item>
            )}
            <Descriptions.Item label="Ingresó">
              {format(new Date(lead.creadoEn), "d 'de' MMMM yyyy", { locale: es })}
              <Text type="secondary" style={{ fontSize: 11, marginLeft: 6 }}>
                ({formatDistanceToNow(new Date(lead.creadoEn), { addSuffix: true, locale: es })})
              </Text>
            </Descriptions.Item>
            {lead.vendedor && (
              <Descriptions.Item label="Vendedor">
                {lead.vendedor.nombre} {lead.vendedor.apellido}
              </Descriptions.Item>
            )}
            {lead.unidadInteres && (
              <Descriptions.Item label="Unidad de interés">
                {lead.unidadInteres.edificio?.nombre} — {lead.unidadInteres.tipo === 'BODEGA' ? 'Bodega' : 'Est.'} {lead.unidadInteres.numero}
              </Descriptions.Item>
            )}
          </Descriptions>

          <Divider style={{ margin: '12px 0' }}>
            <Text type="secondary" style={{ fontSize: 12 }}>Historial ({timeline.length})</Text>
          </Divider>

          {timeline.length === 0 ? (
            <Text type="secondary" style={{ display: 'block', textAlign: 'center', padding: 16 }}>
              Sin actividad registrada
            </Text>
          ) : (
            <Timeline items={timelineItems} />
          )}
        </div>
      )}
    </Drawer>
  )
}

// ─── Tarjeta del Kanban (draggable) ─────────────────────────────
const LeadCard = React.memo(function LeadCard({ lead, onPreview }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: lead.id })

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{ opacity: isDragging ? 0.4 : 1, touchAction: 'none', marginBottom: 8 }}
    >
      <Card
        size="small"
        style={{ cursor: 'grab', fontSize: 13, userSelect: 'none', boxShadow: isDragging ? '0 4px 12px rgba(0,0,0,0.15)' : undefined }}
        onClick={() => { if (!isDragging) onPreview(lead.id) }}
        bodyStyle={{ padding: '8px 10px' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap', marginBottom: 2 }}>
          <Text strong style={{ fontSize: 13 }}>
            {lead.contacto.nombre} {lead.contacto.apellido}
          </Text>
          {lead.perdidaAutomatica && (
            <Tag color="blue" style={{ fontSize: 10, padding: '0 4px', margin: 0 }}>🤖 Auto</Tag>
          )}
          {lead.etapa === 'PERDIDO' && lead.motivoPerdidaCat && (
            <Tag color="red" style={{ fontSize: 10, padding: '0 4px', margin: 0 }}>
              {MOTIVO_PERDIDA_LABEL[lead.motivoPerdidaCat] || lead.motivoPerdidaCat}
            </Tag>
          )}
        </div>
        <Text type="secondary" style={{ fontSize: 12 }}>
          {lead.contacto.telefono || lead.contacto.email || '-'}
        </Text>
        {lead.unidadInteres && (
          <div style={{ color: '#1677ff', fontSize: 12, marginTop: 4 }}>
            {lead.unidadInteres.edificio?.nombre} — {lead.unidadInteres.tipo === 'BODEGA' ? 'Bodega' : 'Est.'} {lead.unidadInteres.numero}
          </div>
        )}
        {lead.campana && (
          <div style={{ color: '#722ed1', fontSize: 11, marginTop: 2 }}>{lead.campana}</div>
        )}
        {lead.vendedor && (
          <div style={{ color: '#aaa', fontSize: 11, marginTop: 2 }}>
            {lead.vendedor.nombre} {lead.vendedor.apellido}
          </div>
        )}
        <div style={{ marginTop: 6, paddingTop: 5, borderTop: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', gap: 4 }}>
          <ClockCircleOutlined style={{ fontSize: 10, color: '#bfbfbf' }} />
          <Text type="secondary" style={{ fontSize: 11 }}>
            {format(new Date(lead.creadoEn), "d MMM yyyy", { locale: es })}
          </Text>
        </div>
      </Card>
    </div>
  )
})

// ─── Columna del Kanban (droppable) ─────────────────────────────
const KanbanColumn = React.memo(function KanbanColumn({ etapa, leads, total, onPreview }) {
  const { setNodeRef, isOver } = useDroppable({ id: etapa })
  const masLeads = total - leads.length

  return (
    <div
      ref={setNodeRef}
      className="kanban-col"
      style={{
        borderRadius: 8,
        background: isOver ? '#e6f4ff' : 'transparent',
        border: isOver ? '1.5px dashed #1677ff' : '1.5px solid transparent',
        transition: 'background 0.15s',
        padding: 4,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <Tag color={ETAPA_COLOR[etapa]} style={{ margin: 0 }}>{ETAPA_LABEL[etapa]}</Tag>
        <Text type="secondary" style={{ fontSize: 12 }}>{total}</Text>
      </div>
      <div className="kanban-col-body">
        {leads.map(lead => (
          <LeadCard key={lead.id} lead={lead} onPreview={onPreview} />
        ))}
        {masLeads > 0 && (
          <div style={{ textAlign: 'center', padding: '8px 4px', color: '#8c8c8c', fontSize: 12 }}>
            y {masLeads} más — filtra para ver todos
          </div>
        )}
      </div>
    </div>
  )
})

// ─── Vista Kanban con DnD ─────────────────────────────────────────
function VistaKanban({ filtros, onPreview }) {
  const { message } = App.useApp()
  const qc = useQueryClient()
  const [activeId, setActiveId] = useState(null)
  const [modalPerdido, setModalPerdido] = useState(null) // { leadId, etapaActual }
  const dragStartEtapa = useRef(null)

  const params = {
    ...(filtros.vendedorId && { vendedorId: filtros.vendedorId }),
    ...(filtros.edificioId && { edificioId: filtros.edificioId }),
    ...(filtros.origen     && { origen:     filtros.origen }),
    ...(filtros.tipoUnidad && { tipoUnidad: filtros.tipoUnidad }),
    ...(filtros.search     && { search:     filtros.search }),
    ...(filtros.campana    && { campana:    filtros.campana }),
    ...(filtros.desde      && { desde:      filtros.desde }),
    ...(filtros.hasta      && { hasta:      filtros.hasta }),
  }

  const { data: kanban = {}, isLoading } = useQuery({
    queryKey: ['leads-kanban', params],
    queryFn: ({ queryKey }) => api.get('/leads/kanban', { params: queryKey[1] }).then(r => r.data),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  })

  const cambiarEtapa = useMutation({
    mutationFn: ({ id, etapa, motivoPerdidaCat, motivoPerdidaNota }) =>
      api.put(`/leads/${id}/etapa`, { etapa, motivoPerdidaCat, motivoPerdidaNota }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leads-kanban'] }),
    onError: () => message.error('No se pudo cambiar la etapa')
  })

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const activeLead = activeId
    ? Object.values(kanban).flatMap(c => c.leads || []).find(l => l.id === activeId)
    : null

  const handleDragStart = ({ active }) => {
    setActiveId(active.id)
    for (const [etapa, col] of Object.entries(kanban)) {
      if ((col.leads || []).find(l => l.id === active.id)) {
        dragStartEtapa.current = etapa
        break
      }
    }
  }

  const handleDragCancel = () => {
    setActiveId(null)
    dragStartEtapa.current = null
  }

  const handleDragEnd = ({ active, over }) => {
    setActiveId(null)
    if (!over) return
    let etapaDestino = over.id
    // If dropped on another card (over.id is a number), find its column
    if (!ETAPAS.includes(etapaDestino)) {
      for (const [etapa, col] of Object.entries(kanban)) {
        if ((col.leads || []).find(l => l.id === etapaDestino)) {
          etapaDestino = etapa
          break
        }
      }
    }
    const etapaOrigen = dragStartEtapa.current
    dragStartEtapa.current = null

    if (!ETAPAS.includes(etapaDestino) || etapaDestino === etapaOrigen) return

    if (etapaDestino === 'PERDIDO') {
      setModalPerdido({ leadId: active.id, etapaActual: etapaOrigen })
    } else {
      cambiarEtapa.mutate({ id: active.id, etapa: etapaDestino })
    }
  }

  const handleConfirmarPerdido = (values) => {
    if (!modalPerdido) return
    cambiarEtapa.mutate(
      { id: modalPerdido.leadId, etapa: 'PERDIDO', ...values },
      { onSettled: () => setModalPerdido(null) }
    )
  }

  if (isLoading) return <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>

  return (
    <>
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={handleDragCancel}>
      <div className="kanban-board">
        {ETAPAS.map(etapa => (
          <KanbanColumn
            key={etapa}
            etapa={etapa}
            leads={kanban[etapa]?.leads || []}
            total={kanban[etapa]?.total || 0}
            onPreview={onPreview}
          />
        ))}
      </div>

      <DragOverlay>
        {activeLead ? (
          <Card size="small" style={{ width: 240, opacity: 0.85, boxShadow: '0 8px 20px rgba(0,0,0,0.2)', cursor: 'grabbing' }} bodyStyle={{ padding: '8px 10px' }}>
            <Text strong style={{ fontSize: 13 }}>{activeLead.contacto.nombre} {activeLead.contacto.apellido}</Text>
          </Card>
        ) : null}
      </DragOverlay>
    </DndContext>
    <ModalPerdido
      open={!!modalPerdido}
      etapaActual={modalPerdido?.etapaActual}
      onConfirm={handleConfirmarPerdido}
      onCancel={() => setModalPerdido(null)}
      loading={cambiarEtapa.isPending}
    />
    </>
  )
}

// ─── Modal asignación masiva ────────────────────────────────────
function ModalAsignarMasivo({ open, onClose, selectedIds, vendedores, onSuccess }) {
  const [form] = Form.useForm()
  const { message } = App.useApp()
  const qc = useQueryClient()

  const asignar = useMutation({
    mutationFn: (data) => api.post('/leads/asignar-masivo', { leadIds: selectedIds, ...data }),
    onSuccess: (res) => {
      message.success(`${res.data.actualizados} lead(s) asignados correctamente`)
      qc.invalidateQueries({ queryKey: ['leads'] })
      qc.invalidateQueries({ queryKey: ['leads-kanban'] })
      form.resetFields()
      onSuccess()
      onClose()
    },
    onError: err => message.error(err.response?.data?.error || 'Error al asignar leads')
  })

  const handleOk = () => {
    form.validateFields().then(values => {
      if (!values.asignadoId) {
        message.warning('Debe seleccionar una persona')
        return
      }
      asignar.mutate({ vendedorId: values.asignadoId })
    })
  }

  return (
    <Modal
      title={<><UserSwitchOutlined /> Asignar {selectedIds.length} lead(s)</>}
      open={open}
      onCancel={onClose}
      onOk={handleOk}
      okText="Asignar"
      cancelText="Cancelar"
      confirmLoading={asignar.isPending}
    >
      <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
        <Form.Item name="asignadoId" label="Asignar a" rules={[{ required: true, message: 'Selecciona una persona' }]}>
          <Select
            placeholder="Seleccionar vendedor..."
            showSearch
            filterOption={(input, option) => option.search.toLowerCase().includes(input.toLowerCase())}
            options={vendedores.map(v => {
              const rolLabel = v.rol === 'BROKER_EXTERNO' ? 'Broker' : v.rol === 'JEFE_VENTAS' ? 'Jefe ventas' : 'Vendedor'
              const nombre = `${v.nombre} ${v.apellido}`
              return {
                value: v.id,
                search: nombre,
                label: <span>{nombre} <Text type="secondary" style={{ fontSize: 11 }}>({rolLabel})</Text></span>
              }
            })}
          />
        </Form.Item>
      </Form>
    </Modal>
  )
}

// ─── Vista Lista ────────────────────────────────────────────────
function VistaLista({ filtros, onPreview, esGerenciaOJV, vendedores, selectedRowKeys, setSelectedRowKeys }) {
  const navigate = useNavigate()

  const params = {
    ...(filtros.search && { search: filtros.search }),
    ...(filtros.etapa && { etapa: filtros.etapa }),
    ...(filtros.vendedorId && { vendedorId: filtros.vendedorId }),
    ...(filtros.edificioId && { edificioId: filtros.edificioId }),
    ...(filtros.origen && { origen: filtros.origen }),
    ...(filtros.tipoUnidad && { tipoUnidad: filtros.tipoUnidad }),
    ...(filtros.campana && { campana: filtros.campana }),
    ...(filtros.desde && { desde: filtros.desde }),
    ...(filtros.hasta && { hasta: filtros.hasta }),
    ...(filtros.sinActividad && { sinActividad: filtros.sinActividad }),
  }

  const [modalAsignar, setModalAsignar] = useState(false)

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ['leads', params],
    queryFn: ({ queryKey }) => api.get('/leads', { params: queryKey[1] }).then(r => r.data)
  })

  const rowSelection = esGerenciaOJV ? {
    selectedRowKeys,
    onChange: setSelectedRowKeys,
    preserveSelectedRowKeys: false,
  } : undefined

  const columns = [
    {
      title: 'Contacto', key: 'contacto', width: 200,
      render: (_, lead) => (
        <div>
          <Text strong style={{ fontSize: 13 }}>{lead.contacto.nombre} {lead.contacto.apellido}</Text>
          <div style={{ display: 'flex', gap: 8, marginTop: 2, flexWrap: 'wrap' }}>
            {lead.contacto.telefono && <Text type="secondary" style={{ fontSize: 12 }}>{lead.contacto.telefono}</Text>}
            {lead.contacto.email && <Text type="secondary" style={{ fontSize: 12 }}>{lead.contacto.email}</Text>}
          </div>
        </div>
      )
    },
    {
      title: 'Etapa', dataIndex: 'etapa', key: 'etapa', width: 150,
      sorter: (a, b) => a.etapa.localeCompare(b.etapa),
      render: (e) => <Tag color={ETAPA_COLOR[e]}>{ETAPA_LABEL[e]}</Tag>
    },
    {
      title: 'Unidad de interés', key: 'unidad', width: 180,
      render: (_, lead) => lead.unidadInteres ? (
        <div>
          <div style={{ fontSize: 13 }}>{lead.unidadInteres.edificio?.nombre}</div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {lead.unidadInteres.tipo === 'BODEGA' ? 'Bodega' : 'Est.'} {lead.unidadInteres.numero}
          </Text>
        </div>
      ) : <Text type="secondary">—</Text>
    },
    {
      title: 'Vendedor', key: 'vendedor', width: 140,
      sorter: (a, b) => {
        const na = a.vendedor ? `${a.vendedor.nombre} ${a.vendedor.apellido}` : ''
        const nb = b.vendedor ? `${b.vendedor.nombre} ${b.vendedor.apellido}` : ''
        return na.localeCompare(nb)
      },
      render: (_, lead) => lead.vendedor
        ? <span style={{ fontSize: 13 }}>{lead.vendedor.nombre} {lead.vendedor.apellido}</span>
        : <Text type="secondary">—</Text>
    },
    {
      title: 'Origen / Campaña', key: 'origen', width: 160,
      render: (_, lead) => (
        <div>
          {lead.contacto.origen && <Tag style={{ fontSize: 11 }}>{lead.contacto.origen.toLowerCase().replace(/_/g, ' ')}</Tag>}
          {lead.campana && <div><Text type="secondary" style={{ fontSize: 11 }}>{lead.campana}</Text></div>}
        </div>
      )
    },
    {
      title: 'Última actividad', key: 'fechas', width: 130,
      defaultSortOrder: 'descend',
      sorter: (a, b) => new Date(a.actualizadoEn || a.creadoEn) - new Date(b.actualizadoEn || b.creadoEn),
      render: (_, lead) => (
        <div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {format(new Date(lead.actualizadoEn || lead.creadoEn), "d MMM yyyy", { locale: es })}
          </Text>
          {lead.actualizadoEn && lead.actualizadoEn !== lead.creadoEn && (
            <div style={{ fontSize: 11, color: '#cbd5e1' }}>
              Ingreso: {format(new Date(lead.creadoEn), "d MMM yyyy", { locale: es })}
            </div>
          )}
        </div>
      )
    },
    {
      title: 'Actividades', dataIndex: '_count', key: 'acciones', width: 80, align: 'center',
      sorter: (a, b) => (a._count?.interacciones || 0) - (b._count?.interacciones || 0),
      render: (c) => <Text type="secondary" style={{ fontSize: 13 }}>{c?.interacciones || 0}</Text>
    },
  ]

  return (
    <>
      {esGerenciaOJV && selectedRowKeys.length > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          background: '#e6f4ff', border: '1px solid #91caff',
          borderRadius: 8, padding: '8px 14px', marginBottom: 12
        }}>
          <Text style={{ fontSize: 13 }}>
            <strong>{selectedRowKeys.length}</strong> lead(s) seleccionado(s)
          </Text>
          <Button
            type="primary"
            size="small"
            icon={<UserSwitchOutlined />}
            onClick={() => setModalAsignar(true)}
          >
            Asignar
          </Button>
          <Button
            size="small"
            icon={<CloseOutlined />}
            onClick={() => setSelectedRowKeys([])}
          >
            Limpiar selección
          </Button>
        </div>
      )}

      <Table
        dataSource={leads}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        rowSelection={rowSelection}
        onRow={(lead) => ({
          onClick: (e) => {
            if (e.shiftKey) navigate(`/leads/${lead.id}`)
            else if (!esGerenciaOJV) onPreview(lead.id)
            else onPreview(lead.id)
          },
          style: { cursor: 'pointer' }
        })}
        size="small"
        locale={{ emptyText: 'Sin leads' }}
      />

      <ModalAsignarMasivo
        open={modalAsignar}
        onClose={() => setModalAsignar(false)}
        selectedIds={selectedRowKeys}
        vendedores={vendedores}
        onSuccess={() => setSelectedRowKeys([])}
      />
    </>
  )
}

// ─── Modal nuevo lead ───────────────────────────────────────────
function ModalNuevoLead({ open, onClose }) {
  const qc = useQueryClient()
  const { usuario } = useAuth()
  const [form] = Form.useForm()
  const { message } = App.useApp()

  const { data: vendedores = [] } = useQuery({
    queryKey: ['usuarios-vendedores'],
    queryFn: () => api.get('/usuarios').then(r => r.data.filter(u =>
      ['VENDEDOR', 'BROKER_EXTERNO', 'JEFE_VENTAS'].includes(u.rol)
    )),
    enabled: ['GERENTE', 'JEFE_VENTAS'].includes(usuario?.rol)
  })

  const crear = useMutation({
    mutationFn: async (data) => {
      const contacto = await api.post('/contactos', {
        nombre: data.nombre, apellido: data.apellido,
        telefono: data.telefono, email: data.email, origen: data.origen
      })
      return api.post('/leads', { contactoId: contacto.data.id, vendedorId: data.vendedorId || undefined, notas: data.notas, campana: data.campana || undefined })
    },
    onSuccess: () => {
      message.success('Lead creado')
      qc.invalidateQueries(['leads-kanban'])
      qc.invalidateQueries(['leads'])
      onClose()
      form.resetFields()
    },
    onError: err => message.error(err.response?.data?.error || 'Error al crear lead')
  })

  return (
    <Modal title="Nuevo Lead" open={open} onCancel={onClose}
      onOk={() => form.validateFields().then(crear.mutate)}
      okText="Crear Lead" cancelText="Cancelar" confirmLoading={crear.isPending}>
      <Form form={form} layout="vertical" style={{ marginTop: 16 }} initialValues={{ origen: 'OTRO' }}>
        <Space.Compact style={{ width: '100%' }}>
          <Form.Item name="nombre" label="Nombre" rules={[{ required: true }]} style={{ width: '50%', marginBottom: 12 }}>
            <Input />
          </Form.Item>
          <Form.Item name="apellido" label="Apellido" rules={[{ required: true }]} style={{ width: '50%', marginBottom: 12 }}>
            <Input />
          </Form.Item>
        </Space.Compact>
        <Space.Compact style={{ width: '100%' }}>
          <Form.Item name="telefono" label="Teléfono" style={{ width: '50%', marginBottom: 12 }}>
            <Input />
          </Form.Item>
          <Form.Item name="email" label="Email" style={{ width: '50%', marginBottom: 12 }}>
            <Input type="email" />
          </Form.Item>
        </Space.Compact>
        <Space.Compact style={{ width: '100%' }}>
          <Form.Item name="origen" label="Origen" style={{ width: '50%', marginBottom: 12 }}>
            <Select options={ORIGEN_OPTIONS} />
          </Form.Item>
          <Form.Item name="campana" label="Campaña" style={{ width: '50%', marginBottom: 12 }}>
            <Input placeholder="Ej: Google Ads Marzo" />
          </Form.Item>
        </Space.Compact>
        {['GERENTE', 'JEFE_VENTAS'].includes(usuario?.rol) && (
          <Form.Item name="vendedorId" label="Asignar a vendedor">
            <Select placeholder="Sin asignar" allowClear
              options={vendedores.map(v => ({ value: v.id, label: `${v.nombre} ${v.apellido}` }))} />
          </Form.Item>
        )}
        <Form.Item name="notas" label="Notas"><Input /></Form.Item>
      </Form>
    </Modal>
  )
}

// ─── Página principal ───────────────────────────────────────────
export default function Leads() {
  const [vista, setVista] = useState('kanban')
  const [modalNuevo, setModalNuevo] = useState(false)
  const [filtros, setFiltros] = useState({})
  const [previewId, setPreviewId] = useState(null)
  const [selectedRowKeys, setSelectedRowKeys] = useState([])
  const { esGerenciaOJV, usuario } = useAuth()

  const { data: vendedores = [] } = useQuery({
    queryKey: ['usuarios-vendedores'],
    queryFn: () => api.get('/usuarios').then(r => r.data.filter(u =>
      ['VENDEDOR', 'BROKER_EXTERNO', 'JEFE_VENTAS'].includes(u.rol)
    )),
    enabled: esGerenciaOJV
  })

  const { data: edificios = [] } = useQuery({
    queryKey: ['edificios-lista'],
    queryFn: () => api.get('/edificios').then(r => r.data)
  })

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <Title level={4} style={{ margin: 0 }}>Leads & Pipeline</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalNuevo(true)}>
          Nuevo Lead
        </Button>
      </div>

      <div style={{ marginBottom: 12 }}>
        <Segmented
          value={vista}
          onChange={(v) => { setVista(v); setSelectedRowKeys([]) }}
          options={[
            { value: 'kanban', label: 'Kanban', icon: <AppstoreOutlined /> },
            { value: 'lista', label: 'Lista', icon: <UnorderedListOutlined /> },
          ]}
        />
      </div>

      <FiltrosLeads
        filtros={filtros}
        onChange={setFiltros}
        vendedores={vendedores}
        edificios={edificios}
        esGerenciaOJV={esGerenciaOJV}
        vista={vista}
      />

      {vista === 'kanban'
        ? <VistaKanban filtros={filtros} onPreview={setPreviewId} />
        : <VistaLista
            filtros={filtros}
            onPreview={setPreviewId}
            esGerenciaOJV={esGerenciaOJV}
            vendedores={vendedores}
            selectedRowKeys={selectedRowKeys}
            setSelectedRowKeys={setSelectedRowKeys}
          />
      }

      <ModalNuevoLead open={modalNuevo} onClose={() => setModalNuevo(false)} />
      <LeadPreviewDrawer leadId={previewId} onClose={() => setPreviewId(null)} />
    </div>
  )
}
