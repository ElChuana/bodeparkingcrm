import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Badge, Popover, Button, Typography, Empty, Tag, Space } from 'antd'
import { BellOutlined } from '@ant-design/icons'
import api from '../services/api'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { TIPOS_ALERTAS, cfgTipo, rutaDeNotificacion } from '../utils/notificaciones'

const { Text } = Typography

export default function NotificacionesBadge() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  const { data: notifs = [] } = useQuery({
    queryKey: ['notificaciones'],
    queryFn: () => api.get('/alertas').then(r => r.data),
    refetchInterval: 30000
  })

  const marcarTodas = useMutation({
    mutationFn: () => api.put('/alertas/leer-todas'),
    onSuccess: () => { qc.invalidateQueries(['notificaciones']); qc.invalidateQueries(['notificaciones-pagina']) }
  })

  const marcarUna = useMutation({
    mutationFn: (id) => api.put(`/alertas/${id}/leer`),
    onSuccess: () => { qc.invalidateQueries(['notificaciones']); qc.invalidateQueries(['notificaciones-pagina']) }
  })

  const sinLeer = notifs.filter(n => !n.leida)
  // Lo no leído, separado en "requieren acción" (alertas) y resto (actividad),
  // ordenado para que las alertas urgentes aparezcan primero.
  const alertas = sinLeer.filter(n => TIPOS_ALERTAS.includes(n.tipo))
  const actividad = sinLeer.filter(n => !TIPOS_ALERTAS.includes(n.tipo))

  const handleClick = (n) => {
    if (!n.leida) marcarUna.mutate(n.id)
    const ruta = rutaDeNotificacion(n)
    if (ruta) { setOpen(false); navigate(ruta) }
  }

  const renderItem = (n) => {
    const cfg = cfgTipo(n.tipo)
    const ruta = rutaDeNotificacion(n)
    return (
      <div
        key={n.id}
        onClick={() => handleClick(n)}
        style={{
          padding: '8px 10px', borderRadius: 6, marginBottom: 2,
          background: '#f0f5ff', cursor: ruta ? 'pointer' : 'default',
        }}
      >
        <Space size={6} style={{ marginBottom: 2 }}>
          <span>{cfg.emoji}</span>
          <Tag color={cfg.color} style={{ fontSize: 10, lineHeight: '16px', margin: 0 }}>{cfg.label}</Tag>
        </Space>
        <Text style={{ fontSize: 13, display: 'block' }}>{n.mensaje}</Text>
        <Text type="secondary" style={{ fontSize: 11 }}>
          {formatDistanceToNow(new Date(n.creadoEn), { addSuffix: true, locale: es })}
        </Text>
      </div>
    )
  }

  const seccion = (titulo, items) => items.length > 0 && (
    <div style={{ marginBottom: 8 }}>
      <Text type="secondary" style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px' }}>
        {titulo} · {items.length}
      </Text>
      <div style={{ marginTop: 4 }}>{items.slice(0, 8).map(renderItem)}</div>
    </div>
  )

  const content = (
    <div style={{ width: 340 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <Text strong>Notificaciones</Text>
        {sinLeer.length > 0 && (
          <Button type="link" size="small" onClick={() => marcarTodas.mutate()}>
            Marcar todas como leídas
          </Button>
        )}
      </div>
      {sinLeer.length === 0 ? (
        <Empty description="Sin notificaciones pendientes" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <div style={{ maxHeight: 400, overflow: 'auto' }}>
          {seccion('Requieren acción', alertas)}
          {seccion('Actividad', actividad)}
          <Button type="link" size="small" block onClick={() => { setOpen(false); navigate('/notificaciones') }}>
            Ver todas
          </Button>
        </div>
      )}
    </div>
  )

  return (
    <Popover content={content} trigger="click" placement="bottomRight" open={open} onOpenChange={setOpen}>
      <Badge count={sinLeer.length} size="small">
        <Button type="text" icon={<BellOutlined style={{ fontSize: 18 }} />} />
      </Badge>
    </Popover>
  )
}
