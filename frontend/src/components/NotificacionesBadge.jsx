import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Badge, Popover, List, Button, Typography, Empty } from 'antd'
import { BellOutlined } from '@ant-design/icons'
import api from '../services/api'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

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
    onSuccess: () => qc.invalidateQueries(['notificaciones'])
  })

  const marcarUna = useMutation({
    mutationFn: (id) => api.put(`/alertas/${id}/leer`),
    onSuccess: () => qc.invalidateQueries(['notificaciones'])
  })

  const sinLeer = notifs.filter(n => !n.leida).length

  const handleClick = (n) => {
    if (!n.leida) marcarUna.mutate(n.id)
    if (n.referenciaTipo === 'lead' && n.referenciaId) {
      setOpen(false)
      navigate(`/leads/${n.referenciaId}`)
    }
  }

  const content = (
    <div style={{ width: 320 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <Text strong>Notificaciones</Text>
        {sinLeer > 0 && (
          <Button type="link" size="small" onClick={() => marcarTodas.mutate()}>
            Marcar todas como leídas
          </Button>
        )}
      </div>
      {notifs.length === 0 ? (
        <Empty description="Sin notificaciones" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <List
          dataSource={notifs.slice(0, 15)}
          style={{ maxHeight: 360, overflow: 'auto' }}
          renderItem={n => (
            <List.Item
              style={{
                padding: '8px 10px',
                background: !n.leida ? '#f0f5ff' : 'transparent',
                borderRadius: 6,
                marginBottom: 2,
                cursor: n.referenciaTipo === 'lead' ? 'pointer' : 'default',
                border: 'none'
              }}
              onClick={() => handleClick(n)}
            >
              <div style={{ width: '100%' }}>
                <Text style={{ fontSize: 13, display: 'block' }}>{n.mensaje}</Text>
                <Text type="secondary" style={{ fontSize: 11 }}>
                  {formatDistanceToNow(new Date(n.creadoEn), { addSuffix: true, locale: es })}
                </Text>
              </div>
            </List.Item>
          )}
        />
      )}
    </div>
  )

  return (
    <Popover content={content} trigger="click" placement="bottomRight" open={open} onOpenChange={setOpen}>
      <Badge count={sinLeer} size="small">
        <Button type="text" icon={<BellOutlined style={{ fontSize: 18 }} />} />
      </Badge>
    </Popover>
  )
}
