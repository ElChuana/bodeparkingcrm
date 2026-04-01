import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Badge, Popover, List, Button, Typography, Empty } from 'antd'
import { BellOutlined } from '@ant-design/icons'
import api from '../services/api'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

const { Text } = Typography

export default function NotificacionesBadge() {
  const qc = useQueryClient()

  const { data: notifs = [] } = useQuery({
    queryKey: ['notificaciones'],
    queryFn: () => api.get('/alertas').then(r => r.data),
    refetchInterval: 60000
  })

  const marcarTodas = useMutation({
    mutationFn: () => api.put('/alertas/leer-todas'),
    onSuccess: () => qc.invalidateQueries(['notificaciones'])
  })

  const sinLeer = notifs.filter(n => !n.leida).length

  const content = (
    <div style={{ width: 300 }}>
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
          dataSource={notifs.slice(0, 10)}
          style={{ maxHeight: 320, overflow: 'auto' }}
          renderItem={n => (
            <List.Item style={{ padding: '8px 0', background: !n.leida ? '#f0f5ff' : 'transparent', borderRadius: 4, paddingLeft: !n.leida ? 8 : 0 }}>
              <div>
                <Text style={{ fontSize: 13 }}>{n.mensaje}</Text>
                <br />
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
    <Popover content={content} trigger="click" placement="bottomRight">
      <Badge count={sinLeer} size="small">
        <Button type="text" icon={<BellOutlined style={{ fontSize: 18 }} />} />
      </Badge>
    </Popover>
  )
}
