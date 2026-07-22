import { Tag, Typography, Collapse } from 'antd'
import { SEMAFORO_LEGAL } from './ui'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const { Text } = Typography

// Muestra el último resumen legal (IA) destacado + historial colapsable.
// `resumenes` viene ordenado del más reciente al más antiguo (del backend).
export default function ResumenLegal({ resumenes }) {
  const lista = resumenes || []
  if (lista.length === 0) {
    return (
      <Text type="secondary" style={{ fontSize: 12 }}>
        Sin resúmenes aún. Llegan automáticamente desde el proceso externo de correos.
      </Text>
    )
  }

  const [ultimo, ...previos] = lista
  const s = SEMAFORO_LEGAL[ultimo.semaforo]

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        {s && <Tag color={s.color} style={{ margin: 0 }}>{s.label}</Tag>}
        <Text type="secondary" style={{ fontSize: 11 }}>
          Actualizado {format(new Date(ultimo.creadoEn), "d MMM yyyy HH:mm", { locale: es })}
          {ultimo.fuente ? ` · ${ultimo.fuente}` : ''}
        </Text>
      </div>
      <Text style={{ fontSize: 13 }}>{ultimo.resumen}</Text>
      {ultimo.proximaAccion && (
        <div style={{ marginTop: 8, padding: '6px 10px', background: '#f0f7ff', borderRadius: 6 }}>
          <Text strong style={{ fontSize: 12 }}>Próxima acción: </Text>
          <Text style={{ fontSize: 12 }}>{ultimo.proximaAccion}</Text>
        </div>
      )}
      {previos.length > 0 && (
        <Collapse
          ghost
          size="small"
          style={{ marginTop: 4 }}
          items={[{
            key: 'hist',
            label: <Text style={{ fontSize: 12 }}>Historial ({previos.length})</Text>,
            children: (
              <div>
                {previos.map(r => {
                  const rs = SEMAFORO_LEGAL[r.semaforo]
                  return (
                    <div key={r.id} style={{ marginBottom: 10, paddingBottom: 8, borderBottom: '1px solid #f0f0f0' }}>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 2 }}>
                        {rs && <Tag color={rs.color} style={{ margin: 0, fontSize: 10 }}>{rs.label}</Tag>}
                        <Text type="secondary" style={{ fontSize: 10 }}>
                          {format(new Date(r.creadoEn), "d MMM yyyy HH:mm", { locale: es })}
                        </Text>
                      </div>
                      <Text style={{ fontSize: 12 }}>{r.resumen}</Text>
                      {r.proximaAccion && (
                        <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>→ {r.proximaAccion}</div>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          }]}
        />
      )}
    </div>
  )
}
