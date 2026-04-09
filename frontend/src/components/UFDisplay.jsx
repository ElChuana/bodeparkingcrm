import { useUF } from '../hooks/useUF'

export default function UFDisplay() {
  const { valorUF } = useUF()
  if (!valorUF) return null
  return (
    <div style={{
      background: '#eff6ff',
      border: '1px solid #bfdbfe',
      borderRadius: 7,
      padding: '6px 10px',
      display: 'flex',
      alignItems: 'center',
      gap: 6,
    }}>
      <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#3b82f6', flexShrink: 0 }} />
      <span style={{ fontSize: 9, color: '#64748b', fontWeight: 500 }}>UF hoy</span>
      <span style={{ fontSize: 10, fontWeight: 700, color: '#1d4ed8', marginLeft: 'auto' }}>
        ${valorUF.toLocaleString('es-CL', { minimumFractionDigits: 2 })}
      </span>
    </div>
  )
}
