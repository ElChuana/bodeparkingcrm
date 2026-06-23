import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Tabs, Select, Typography, Empty, Tag, Button, Space, Badge } from 'antd'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { TIPOS_ALERTAS, TIPOS_ACTIVIDAD, cfgTipo, rutaDeNotificacion } from '../../utils/notificaciones'

const { Text, Title } = Typography

const ETAPA_COLOR = {
  SEGUIMIENTO:             'blue',
  COTIZACION_ENVIADA:      'gold',
  NO_CONTESTA:             'default',
  SEGUIMIENTO_POST_VISITA: 'purple',
}

function CardItem({ children, unread, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: unread ? '#f0f5ff' : '#fff',
        border: `1px solid ${unread ? '#91caff' : '#e5e7eb'}`,
        borderLeft: `3px solid ${unread ? '#1677ff' : 'transparent'}`,
        borderRadius: 8,
        padding: '12px 16px',
        marginBottom: 8,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'box-shadow .15s',
      }}
      onMouseEnter={e => onClick && (e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,.08)')}
      onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
    >
      {children}
    </div>
  )
}

export default function Notificaciones() {
  const { usuario } = useAuth()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const esGerente = usuario?.rol === 'GERENTE'
  const [vendedorId, setVendedorId] = useState(null)

  const { data: equipo = [] } = useQuery({
    queryKey: ['usuarios-equipo'],
    queryFn: () => api.get('/usuarios').then(r => r.data),
    enabled: esGerente,
    staleTime: 60000,
  })

  const params = vendedorId ? { vendedorId } : {}

  const { data: emails = [] } = useQuery({
    queryKey: ['emails-sin-responder', vendedorId],
    queryFn: () => api.get('/email/sin-responder', { params }).then(r => r.data),
    refetchInterval: 30000,
  })

  const { data: leadsSinAtencion = [] } = useQuery({
    queryKey: ['leads-sin-atencion', vendedorId],
    queryFn: () => api.get('/alertas/leads-sin-atencion', { params }).then(r => r.data),
    refetchInterval: 60000,
  })

  const { data: todasNotifs = [] } = useQuery({
    queryKey: ['notificaciones-pagina'],
    queryFn: () => api.get('/alertas').then(r => r.data),
    refetchInterval: 30000,
  })

  const alertas = todasNotifs.filter(n => TIPOS_ALERTAS.includes(n.tipo) && !n.leida)
  const actividad = todasNotifs.filter(n => TIPOS_ACTIVIDAD.includes(n.tipo))
  const actividadSinLeer = actividad.filter(n => !n.leida).length

  const marcarTodasLeidas = useMutation({
    // tipos opcional: marca solo esa categoría (Alertas o Actividad), no todo
    mutationFn: (tipos) => api.put('/alertas/leer-todas', tipos ? { tipos } : {}),
    onSuccess: () => {
      qc.invalidateQueries(['notificaciones-pagina'])
      qc.invalidateQueries(['notificaciones'])
    }
  })

  const marcarLeida = useMutation({
    mutationFn: (id) => api.put(`/alertas/${id}/leer`),
    onSuccess: () => {
      qc.invalidateQueries(['notificaciones-pagina'])
      qc.invalidateQueries(['notificaciones'])
    }
  })

  const marcarEmailLeido = useMutation({
    mutationFn: (leadId) => api.patch(`/email/conversacion/${leadId}/leer`),
    onSuccess: () => qc.invalidateQueries(['emails-sin-responder'])
  })

  const tiempoRelativo = (fecha) =>
    formatDistanceToNow(new Date(fecha), { addSuffix: true, locale: es })

  // ── Tab 1: Emails ──────────────────────────────────────────────────
  const tabEmails = (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Text type="secondary">{emails.length} email{emails.length !== 1 ? 's' : ''} sin responder</Text>
        {emails.length > 0 && (
          <Button size="small" onClick={() => {
            const uniqueLeadIds = [...new Set(emails.map(e => e.leadId))]
            uniqueLeadIds.forEach(lid => marcarEmailLeido.mutate(lid))
          }}>
            Marcar todos como vistos
          </Button>
        )}
      </div>
      {emails.length === 0 && <Empty description="Sin emails pendientes" image={Empty.PRESENTED_IMAGE_SIMPLE} />}
      {emails.map(email => (
        <CardItem key={email.id} unread onClick={() => {
          marcarEmailLeido.mutate(email.leadId)
          navigate(`/leads/${email.leadId}`)
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <Text strong>{email.lead?.contacto?.nombre} {email.lead?.contacto?.apellido}</Text>
              <div style={{ fontSize: 13, color: '#444', margin: '3px 0' }}>{email.asunto}</div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                De: {email.de.split('<')[0].trim()}
                {esGerente && email.lead?.vendedor && ` · ${email.lead.vendedor.nombre} ${email.lead.vendedor.apellido}`}
              </Text>
            </div>
            <Text type="secondary" style={{ fontSize: 12, flexShrink: 0, marginLeft: 12 }}>
              {tiempoRelativo(email.creadoEn)}
            </Text>
          </div>
        </CardItem>
      ))}
    </div>
  )

  // ── Tab 2: Leads sin atención ──────────────────────────────────────
  const cotizaciones = leadsSinAtencion.filter(l => l.etapa === 'COTIZACION_ENVIADA')
  const enSeguimiento = leadsSinAtencion.filter(l => l.etapa !== 'COTIZACION_ENVIADA')

  const renderLead = (lead) => (
    <CardItem key={lead.id} unread={lead.diasSinActividad >= 5} onClick={() => navigate(`/leads/${lead.id}`)}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <Text strong>{lead.contacto.nombre} {lead.contacto.apellido}</Text>
          <div style={{ fontSize: 13, color: '#444', margin: '3px 0' }}>
            Sin actividad en {lead.diasSinActividad} día{lead.diasSinActividad !== 1 ? 's' : ''}
          </div>
          {esGerente && lead.vendedor && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              {lead.vendedor.nombre} {lead.vendedor.apellido}
            </Text>
          )}
        </div>
        <div style={{ flexShrink: 0, marginLeft: 12, textAlign: 'right' }}>
          <Tag color={lead.diasSinActividad >= 5 ? 'red' : 'orange'} style={{ fontWeight: 600 }}>
            {lead.diasSinActividad}d
          </Tag>
          <div style={{ marginTop: 4 }}>
            <Tag color={ETAPA_COLOR[lead.etapa] || 'default'} style={{ fontSize: 11 }}>
              {lead.etapa.replace(/_/g, ' ')}
            </Tag>
          </div>
        </div>
      </div>
    </CardItem>
  )

  const tabLeads = (
    <div>
      <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
        {leadsSinAtencion.length} lead{leadsSinAtencion.length !== 1 ? 's' : ''} requieren atención
      </Text>
      {leadsSinAtencion.length === 0 && (
        <Empty description="Todos los leads están al día" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      )}
      {cotizaciones.length > 0 && (
        <>
          <Text type="secondary" style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px', display: 'block', marginBottom: 8 }}>
            Cotización enviada
          </Text>
          {cotizaciones.map(renderLead)}
        </>
      )}
      {enSeguimiento.length > 0 && (
        <>
          <Text type="secondary" style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px', display: 'block', marginTop: cotizaciones.length ? 16 : 0, marginBottom: 8 }}>
            En seguimiento
          </Text>
          {enSeguimiento.map(renderLead)}
        </>
      )}
    </div>
  )

  // ── Tab 3: Alertas ─────────────────────────────────────────────────
  const tabAlertas = (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Text type="secondary">{alertas.length} alerta{alertas.length !== 1 ? 's' : ''} sin leer</Text>
        {alertas.length > 0 && (
          <Button size="small" onClick={() => marcarTodasLeidas.mutate(TIPOS_ALERTAS)}>
            Marcar todas como leídas
          </Button>
        )}
      </div>
      {alertas.length === 0 && <Empty description="Sin alertas" image={Empty.PRESENTED_IMAGE_SIMPLE} />}
      {alertas.map(n => {
        const cfg = cfgTipo(n.tipo)
        return (
          <CardItem key={n.id} unread onClick={() => {
            marcarLeida.mutate(n.id)
            const ruta = rutaDeNotificacion(n)
            if (ruta) navigate(ruta)
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <Space size={6}>
                  <span>{cfg.emoji}</span>
                  <Tag color={cfg.color} style={{ fontSize: 11 }}>{cfg.label}</Tag>
                </Space>
                <div style={{ fontSize: 13, color: '#333', marginTop: 4 }}>{n.mensaje}</div>
              </div>
              <Text type="secondary" style={{ fontSize: 12, flexShrink: 0, marginLeft: 12 }}>
                {tiempoRelativo(n.creadoEn)}
              </Text>
            </div>
          </CardItem>
        )
      })}
    </div>
  )

  // ── Tab 4: Actividad reciente ──────────────────────────────────────
  const tabActividad = (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Text type="secondary">{actividad.length} evento{actividad.length !== 1 ? 's' : ''} recientes</Text>
        {actividadSinLeer > 0 && (
          <Button size="small" onClick={() => marcarTodasLeidas.mutate(TIPOS_ACTIVIDAD)}>
            Marcar todo como leído
          </Button>
        )}
      </div>
      {actividad.length === 0 && <Empty description="Sin actividad reciente" image={Empty.PRESENTED_IMAGE_SIMPLE} />}
      {actividad.map(n => {
        const cfg = cfgTipo(n.tipo)
        return (
          <CardItem key={n.id} unread={!n.leida} onClick={() => {
            if (!n.leida) marcarLeida.mutate(n.id)
            const ruta = rutaDeNotificacion(n)
            if (ruta) navigate(ruta)
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <Space size={6}>
                  <span>{cfg.emoji}</span>
                  <Tag color={cfg.color} style={{ fontSize: 11 }}>{cfg.label}</Tag>
                </Space>
                <div style={{ fontSize: 13, color: '#333', marginTop: 4 }}>{n.mensaje}</div>
              </div>
              <Text type="secondary" style={{ fontSize: 12, flexShrink: 0, marginLeft: 12 }}>
                {tiempoRelativo(n.creadoEn)}
              </Text>
            </div>
          </CardItem>
        )
      })}
    </div>
  )

  const tabItems = [
    {
      key: 'emails',
      label: <span>✉️ Emails <Badge count={emails.length} size="small" /></span>,
      children: tabEmails,
    },
    {
      key: 'leads',
      label: <span>⏰ Leads sin atención <Badge count={leadsSinAtencion.length} size="small" color="orange" /></span>,
      children: tabLeads,
    },
    {
      key: 'alertas',
      label: <span>🔔 Alertas <Badge count={alertas.length} size="small" /></span>,
      children: tabAlertas,
    },
    {
      key: 'actividad',
      label: <span>📋 Actividad reciente <Badge count={actividadSinLeer} size="small" color="default" /></span>,
      children: tabActividad,
    },
  ]

  return (
    <div style={{ padding: '24px', maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <Title level={4} style={{ margin: 0 }}>Notificaciones</Title>
        {esGerente && (
          <Space>
            <Text type="secondary" style={{ fontSize: 13 }}>Ver vendedor:</Text>
            <Select
              allowClear
              placeholder="Todo el equipo"
              style={{ width: 200 }}
              value={vendedorId}
              onChange={setVendedorId}
              options={equipo.map(u => ({ value: u.id, label: `${u.nombre} ${u.apellido}` }))}
            />
          </Space>
        )}
      </div>
      <Tabs items={tabItems} />
    </div>
  )
}
