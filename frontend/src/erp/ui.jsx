/**
 * Primitivas UI del modo ERP — sin Ant Design, a propósito.
 *
 * El ERP tiene identidad propia (referencia: clay.cl): denso pero limpio, montos
 * con dígitos tabulares alineados a la derecha, verde abono / rojo cargo, y cada
 * cifra explicable con un clic. Tokens en erp.css (@theme).
 */
import { useEffect } from 'react'

// ─── Formato ──────────────────────────────────────────────────

const fmtCLP = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 })
const fmtUF = new Intl.NumberFormat('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export const clp = (n) => {
  if (n == null || isNaN(n)) return '—'
  const v = Math.round(Number(n))
  return `${v < 0 ? '−' : ''}$${fmtCLP.format(Math.abs(v))}`
}
export const uf = (n) => (n == null || isNaN(n) ? '—' : `UF ${fmtUF.format(Number(n))}`)
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

/** Monto con signo semántico: verde entra, rojo sale. */
export function Monto({ valor, signo, className = '' }) {
  const v = Number(valor) || 0
  const lado = signo ?? (v >= 0 ? 'abono' : 'cargo')
  const color = lado === 'abono' ? 'text-abono' : lado === 'cargo' ? 'text-cargo' : ''
  return <span className={`monto ${color} ${className}`}>{lado === 'cargo' && v > 0 ? '−' : ''}{clp(Math.abs(v))}</span>
}

// ─── Contenedores ─────────────────────────────────────────────

export function Carta({ children, className = '', ...rest }) {
  return (
    <div className={`bg-carta border border-borde rounded-xl shadow-carta ${className}`} {...rest}>
      {children}
    </div>
  )
}

export function CartaTitulo({ children, extra }) {
  return (
    <div className="flex items-center justify-between px-4 pt-3.5 pb-2.5">
      <h3 className="text-[13px] font-semibold text-tinta">{children}</h3>
      {extra}
    </div>
  )
}

/** KPI grande del panel: la cifra manda, la etiqueta acompaña. */
export function Kpi({ etiqueta, valor, sub, tono = 'neutro', onClick }) {
  const colorValor = { neutro: 'text-tinta', abono: 'text-abono', cargo: 'text-cargo', alerta: 'text-alerta', bp: 'text-bp-dark' }[tono]
  return (
    <Carta
      className={`px-4 py-3.5 flex-1 min-w-[150px] ${onClick ? 'cursor-pointer hover:border-bp/40 transition-colors' : ''}`}
      onClick={onClick}
    >
      <div className="text-[10.5px] font-semibold uppercase tracking-wider text-sutil">{etiqueta}</div>
      <div className={`monto text-[21px] font-bold mt-1 leading-tight ${colorValor}`}>{valor}</div>
      {sub && <div className="text-[11px] text-gris mt-0.5">{sub}</div>}
    </Carta>
  )
}

// ─── Estado / badges ──────────────────────────────────────────

const TONOS_BADGE = {
  verde: 'bg-abono-soft text-abono',
  rojo: 'bg-cargo-soft text-cargo',
  ambar: 'bg-alerta-soft text-alerta',
  azul: 'bg-bp-soft text-bp-dark',
  gris: 'bg-borde-suave text-gris',
}

export function Badge({ tono = 'gris', children, title }) {
  return (
    <span title={title} className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10.5px] font-semibold whitespace-nowrap ${TONOS_BADGE[tono]}`}>
      {children}
    </span>
  )
}

/** El estado calculado de un documento, con su color. */
export const ESTADO_DOC = {
  ESPERADO: { label: 'Esperado', tono: 'gris' },
  VENCIDO_SIN_FACTURA: { label: 'Sin factura', tono: 'ambar' },
  FACTURADO_SIN_PAGO: { label: 'Facturado · sin pago', tono: 'azul' },
  PAGADO_SIN_FACTURA: { label: 'Pagado · sin factura', tono: 'ambar' },
  CERRADO: { label: 'Cerrado', tono: 'verde' },
}

export function EstadoDoc({ estado }) {
  const e = ESTADO_DOC[estado] || { label: estado, tono: 'gris' }
  return <Badge tono={e.tono}>{e.label}</Badge>
}

// ─── Botones ──────────────────────────────────────────────────

export function Boton({ variante = 'normal', size = 'md', className = '', ...rest }) {
  const base = 'inline-flex items-center justify-center gap-1.5 font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-bp focus-visible:outline-offset-2'
  const variantes = {
    primario: 'bg-bp text-white hover:bg-bp-dark',
    normal: 'bg-carta border border-borde text-tinta hover:bg-borde-suave',
    fantasma: 'text-gris hover:bg-borde-suave hover:text-tinta',
    peligro: 'bg-carta border border-borde text-cargo hover:bg-cargo-soft',
    verde: 'bg-abono text-white hover:brightness-95',
  }
  const sizes = { sm: 'text-[11.5px] px-2 py-1', md: 'text-[12.5px] px-3 py-1.5' }
  return <button type="button" className={`${base} ${variantes[variante]} ${sizes[size]} ${className}`} {...rest} />
}

// ─── Tabla ────────────────────────────────────────────────────

export function Tabla({ children, className = '' }) {
  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="w-full text-[12.5px]">{children}</table>
    </div>
  )
}

export function Th({ children, num, className = '' }) {
  return (
    <th className={`px-3 py-2 text-[10.5px] font-semibold uppercase tracking-wider text-sutil border-b border-borde whitespace-nowrap ${num ? 'text-right' : ''} ${className}`}>
      {children}
    </th>
  )
}

export function Td({ children, num, className = '', ...rest }) {
  return (
    <td className={`px-3 py-2 border-b border-borde-suave align-middle ${num ? 'num text-right' : ''} ${className}`} {...rest}>
      {children}
    </td>
  )
}

// ─── Formularios ──────────────────────────────────────────────

export function Campo({ label, children, hint }) {
  return (
    <label className="block">
      <span className="block text-[11px] font-semibold text-gris mb-1">{label}</span>
      {children}
      {hint && <span className="block text-[10.5px] text-sutil mt-1">{hint}</span>}
    </label>
  )
}

const inputBase = 'w-full bg-carta border border-borde rounded-lg px-2.5 py-1.5 text-[12.5px] text-tinta placeholder:text-sutil focus:outline-2 focus:outline-bp/60 focus:border-bp/50'

export function Input(props) {
  return <input className={inputBase} {...props} />
}

export function Select({ children, ...props }) {
  return <select className={`${inputBase} cursor-pointer`} {...props}>{children}</select>
}

// ─── Modal propio (sin AntD) ──────────────────────────────────

export function Modal({ abierto, onCerrar, titulo, children, ancho = 'max-w-lg' }) {
  useEffect(() => {
    if (!abierto) return
    const esc = (e) => { if (e.key === 'Escape') onCerrar() }
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [abierto, onCerrar])

  if (!abierto) return null
  return (
    <div className="fixed inset-0 z-[1000] flex items-start justify-center overflow-y-auto p-4 pt-[8vh]" role="dialog" aria-modal="true" aria-label={titulo}>
      <div className="fixed inset-0 bg-tinta/50" onClick={onCerrar} />
      <div className={`relative w-full ${ancho} bg-carta rounded-xl shadow-flotante border border-borde`}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-borde-suave">
          <h3 className="text-[13.5px] font-semibold">{titulo}</h3>
          <Boton variante="fantasma" size="sm" onClick={onCerrar} aria-label="Cerrar">✕</Boton>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  )
}

// ─── Estados vacíos / carga ───────────────────────────────────

export function Cargando({ alto = 'h-40' }) {
  return (
    <div className={`flex items-center justify-center ${alto}`}>
      <div className="w-5 h-5 rounded-full border-2 border-borde border-t-bp animate-spin" aria-label="Cargando" />
    </div>
  )
}

export function Vacio({ children, accion }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
      <div className="text-[12.5px] text-sutil max-w-sm">{children}</div>
      {accion}
    </div>
  )
}

/** Score del matcher: la sugerencia siempre dice por qué. */
export function Score({ valor, motivos }) {
  const tono = valor >= 80 ? 'verde' : valor >= 60 ? 'azul' : 'gris'
  return <Badge tono={tono} title={(motivos || []).join(' · ')}>{valor}</Badge>
}
