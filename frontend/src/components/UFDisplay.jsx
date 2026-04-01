import { useUF } from '../hooks/useUF'
import { Typography } from 'antd'

const { Text } = Typography

export default function UFDisplay() {
  const { valorUF } = useUF()
  if (!valorUF) return null
  return (
    <div>
      <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11 }}>UF hoy: </Text>
      <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: 500 }}>
        ${valorUF.toLocaleString('es-CL', { minimumFractionDigits: 2 })}
      </Text>
    </div>
  )
}
