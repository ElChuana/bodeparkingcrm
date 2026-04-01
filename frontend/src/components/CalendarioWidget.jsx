import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Badge, Popover, Button, Typography, Empty, Tag, Divider } from 'antd'
import { CalendarOutlined, EnvironmentOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { format, isToday, isTomorrow, startOfDay, addDays } from 'date-fns'
import { es } from 'date-fns/locale'
import api from '../services/api'

const { Text } = Typography

const TIPO_COLOR = { presencial: '#1677ff', virtual: '#722ed1', llamada: '#52c41a' }

function agruparPorDia(visitas) {
  const grupos = {}
  visitas.forEach(v => {
    const key = format(new Date(v.fechaHora), 'yyyy-MM-dd')
    if (!grupos[key]) grupos[key] = []
    grupos[key].push(v)
  })
  return grupos
}

function tituloGrupo(fechaStr) {
  const fecha = new Date(fechaStr + 'T12:00:00')
  if (isToday(fecha)) return 'Hoy'
  if (isTomorrow(fecha)) return 'Mañana'
  return format(fecha, "EEEE d 'de' MMMM", { locale: es })
}

export default function CalendarioWidget() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  const desde = startOfDay(new Date()).toISOString()
  const hasta = addDays(startOfDay(new Date()), 14).toISOString()

  const { data: visitas = [] } = useQuery({
    queryKey: ['visitas-propias', desde, hasta],
    queryFn: () => api.get('/visitas', { params: { desde, hasta } }).then(r => r.data),
    refetchInterval: 300000, // cada 5 min
  })

  const hoy = visitas.filter(v => isToday(new Date(v.fechaHora)))
  const grupos = agruparPorDia(visitas)
  const diasOrdenados = Object.keys(grupos).sort()

  const content = (
    <div style={{ width: 320 }}>
      <Text strong style={{ fontSize: 14 }}>Próximas visitas</Text>

      {visitas.length === 0 ? (
        <Empty description="Sin visitas agendadas" image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ margin: '16px 0' }} />
      ) : (
        <div style={{ maxHeight: 400, overflow: 'auto', marginTop: 10 }}>
          {diasOrdenados.map((dia, i) => (
            <div key={dia}>
              {i > 0 && <Divider style={{ margin: '8px 0' }} />}
              <Text type="secondary" style={{ fontSize: 11, textTransform: 'capitalize', fontWeight: 600 }}>
                {tituloGrupo(dia)}
              </Text>
              <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {grupos[dia].map(v => (
                  <div
                    key={v.id}
                    onClick={() => { navigate(`/leads/${v.lead.id}`); setOpen(false) }}
                    style={{
                      display: 'flex', gap: 10, alignItems: 'flex-start',
                      padding: '8px 10px', borderRadius: 8,
                      background: isToday(new Date(v.fechaHora)) ? '#e6f4ff' : '#fafafa',
                      border: `1px solid ${isToday(new Date(v.fechaHora)) ? '#91caff' : '#f0f0f0'}`,
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ minWidth: 42, textAlign: 'center' }}>
                      <div style={{ fontSize: 18, fontWeight: 700, color: '#1677ff', lineHeight: 1 }}>
                        {format(new Date(v.fechaHora), 'HH:mm')}
                      </div>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Text strong style={{ fontSize: 13, display: 'block' }}>
                        {v.lead?.contacto?.nombre} {v.lead?.contacto?.apellido}
                      </Text>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
                        <Tag
                          color={TIPO_COLOR[v.tipo] || 'default'}
                          style={{ fontSize: 11, margin: 0, lineHeight: '18px' }}
                        >
                          {v.tipo}
                        </Tag>
                        {v.edificio && (
                          <Text type="secondary" style={{ fontSize: 11 }}>
                            <EnvironmentOutlined /> {v.edificio.nombre}
                          </Text>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  return (
    <Popover
      content={content}
      trigger="click"
      placement="bottomRight"
      open={open}
      onOpenChange={setOpen}
    >
      <Badge count={hoy.length} size="small" color="#1677ff">
        <Button type="text" icon={<CalendarOutlined style={{ fontSize: 18 }} />} />
      </Badge>
    </Popover>
  )
}
