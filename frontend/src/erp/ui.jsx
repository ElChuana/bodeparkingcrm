/**
 * Helpers compartidos del modo ERP — mismo stack y estética que el CRM (Ant Design).
 *
 * Convenciones de plata: verde = entra, rojo = sale, dígitos tabulares para que
 * las columnas no bailen, y toda sugerencia del matcher explica sus motivos.
 */
import { Tag, Typography } from 'antd'

const { Text } = Typography

// ─── Colores semánticos (los mismos del CRM) ──────────────────
export const VERDE = '#3f8600'
export const ROJO = '#cf1322'
export const AMBAR = '#d46b08'
export const BP = '#0091C3' // celeste de marca BodeParking (identidad del modo ERP)

// ─── Formato ──────────────────────────────────────────────────
const fmtCLP = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 })
const fmtUF = new Intl.NumberFormat('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export const clp = (n) => {
  if (n == null || isNaN(n)) return '—'
  const v = Math.round(Number(n))
  return `${v < 0 ? '−' : ''}$${fmtCLP.format(Math.abs(v))}`
}
export const uf = (n) => (n == null || isNaN(n) ? '—' : `${fmtUF.format(Number(n))} UF`)
export const fecha = (d) => {
  if (!d) return '—'
  const f = new Date(d)
  return `${String(f.getUTCDate()).padStart(2, '0')}-${String(f.getUTCMonth() + 1).padStart(2, '0')}-${String(f.getUTCFullYear()).slice(2)}`
}
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
export const mesLabel = (periodo) => {
  if (!periodo) return '—'
  const [a, m] = String(periodo).split('-')
  return `${MESES[Number(m) - 1]} ${String(a).slice(2)}`
}

export const NUM = { fontVariantNumeric: 'tabular-nums' }

/** Monto con signo semántico: verde entra, rojo sale. */
export function Monto({ valor, signo, strong = true, style }) {
  const v = Number(valor) || 0
  const lado = signo ?? (v >= 0 ? 'abono' : 'cargo')
  const color = lado === 'abono' ? VERDE : lado === 'cargo' ? ROJO : undefined
  return (
    <Text strong={strong} style={{ color, ...NUM, whiteSpace: 'nowrap', ...style }}>
      {lado === 'cargo' && v > 0 ? '−' : ''}{clp(Math.abs(v))}
    </Text>
  )
}

// ─── Estados del documento (siempre calculados en el backend) ──
export const ESTADO_DOC = {
  ESPERADO: { label: 'Esperado', color: 'default' },
  VENCIDO_SIN_FACTURA: { label: '⚠ Sin factura', color: 'orange' },
  FACTURADO_SIN_PAGO: { label: 'Facturado · sin pago', color: 'blue' },
  PAGADO_SIN_FACTURA: { label: 'Pagado · sin factura', color: 'gold' },
  CERRADO: { label: 'Cerrado', color: 'green' },
}

export function EstadoDoc({ estado }) {
  const e = ESTADO_DOC[estado] || { label: estado, color: 'default' }
  return <Tag color={e.color} style={{ marginInlineEnd: 0 }}>{e.label}</Tag>
}

/** Score del matcher: la sugerencia siempre dice por qué (tooltip nativo). */
export function Score({ valor, motivos }) {
  const color = valor >= 80 ? 'green' : valor >= 60 ? 'blue' : 'default'
  return (
    <Tag color={color} title={(motivos || []).join(' · ')} style={{ marginInlineEnd: 0, ...NUM }}>
      {valor}
    </Tag>
  )
}
