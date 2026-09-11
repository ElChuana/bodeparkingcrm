// Forma de pago de una venta: se pueden combinar varias (ej: pie por
// transferencia + saldo en cuotas) y cada una lleva su monto, pactado EN UF
// O EN PESOS. Sin ninguna forma marcada, la venta es AL CONTADO.
//
// Lo pactado en pesos se guarda en pesos; el equivalente en UF se congela con
// la UF del día y es el que cuadra contra el precio final de la venta.
//
// La cantidad de cuotas sale del beneficio "cuotas sin interés"; solo se
// guarda en la forma cuando se pacta una cantidad distinta.
import { Checkbox, InputNumber, Typography, Tag, Segmented, Alert } from 'antd'
import { useUF } from '../hooks/useUF'

const { Text } = Typography

export const FORMAS_PAGO = [
  { value: 'TRANSFERENCIA', label: 'Transferencia' },
  { value: 'VALE_VISTA',    label: 'Vale vista' },
  { value: 'TARJETA',       label: 'Tarjeta' },
  { value: 'CUOTAS',        label: 'Cuotas' },
]

export const FORMA_PAGO_LABEL = Object.fromEntries(FORMAS_PAGO.map(f => [f.value, f.label]))

const TOLERANCIA = 0.01

// Miles con punto en el input de pesos
const fmtMiles = (v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
const parseMiles = (v) => `${v}`.replace(/[^\d]/g, '')

/** UF que representa una forma: la pactada en UF, o los pesos convertidos. */
export function montoUFDeForma(f = {}, valorUF = null) {
  if (f.moneda === 'CLP') {
    const pesos = Number(f.montoCLP) || 0
    // En lo ya guardado la equivalencia viene congelada desde el backend
    if (f.montoUF != null && !pesos) return Number(f.montoUF) || 0
    if (!pesos) return 0
    const uf = Number(f.valorUF) || Number(valorUF) || 0
    return uf > 0 ? pesos / uf : 0
  }
  return Number(f.montoUF) || 0
}

// Hay beneficios de cuotas cargados sin `meses`, con el número solo en el
// nombre ("Crédito directo 6 cuotas"): se lee de ahí como último recurso.
const cuotasDe = (b) => {
  if (!b) return null
  if (b.meses) return Number(b.meses)
  const m = /(\d+)\s*cuotas/i.exec(b.nombre || '')
  return m ? Number(m[1]) : null
}

/** Cuotas del beneficio de la venta o cotización (promoción o beneficio legacy). */
export function cuotasDelBeneficio(fuente = {}) {
  const promo = (fuente.promociones || []).find(p => p.promocion?.tipo === 'CUOTAS_SIN_INTERES')
  const dePromo = cuotasDe(promo?.promocion)
  if (dePromo) return dePromo
  const beneficio = (fuente.beneficios || []).find(b => b.beneficio?.tipo === 'CUOTAS_SIN_INTERES')
  return cuotasDe(beneficio?.beneficio)
}

/** Cantidad de cuotas efectiva: la pactada en la forma o la del beneficio. */
export function cuotasPactadas(fuente = {}) {
  const enForma = (fuente.formasPago || []).find(f => f.forma === 'CUOTAS')?.cuotas
  return enForma ? Number(enForma) : cuotasDelBeneficio(fuente)
}

/** Texto corto: "Al contado", "Transferencia + 12 cuotas". */
export function resumenFormasPago(fuente = {}) {
  const formas = fuente.formasPago || []
  if (formas.length === 0) return 'Al contado'
  const n = cuotasPactadas(fuente)
  return formas
    .map(f => (f.forma === 'CUOTAS' && n ? `${n} cuotas` : FORMA_PAGO_LABEL[f.forma] || f.forma))
    .join(' + ')
}

/**
 * Editor de formas de pago. `value` es [{ forma, moneda, montoUF, montoCLP,
 * cuotas }] y se reemplaza completo en cada cambio (onChange recibe el arreglo
 * nuevo). Cada forma se pacta en UF o en pesos; el cuadre contra el total de la
 * venta siempre se hace en UF.
 */
export function EditorFormasPago({ value = [], onChange, totalUF = 0, cuotasBeneficio = null }) {
  const { formatPesos, ufAPesos, valorUF } = useUF()

  const marcada = (forma) => value.some(f => f.forma === forma)
  const filaDe  = (forma) => value.find(f => f.forma === forma) || {}

  const toggle = (forma, checked) => {
    if (checked) onChange([...value, { forma, moneda: 'UF', montoUF: null, montoCLP: null, cuotas: null }])
    else onChange(value.filter(f => f.forma !== forma))
  }

  const setCampo = (forma, campo, val) =>
    onChange(value.map(f => f.forma === forma ? { ...f, [campo]: val } : f))

  // Al cambiar de moneda se arrastra lo ya escrito, convertido con la UF del día
  const setMoneda = (forma, moneda) => onChange(value.map(f => {
    if (f.forma !== forma) return f
    if (moneda === 'CLP') {
      const pesos = ufAPesos(Number(f.montoUF) || 0)
      return { ...f, moneda, montoCLP: pesos || null, montoUF: null }
    }
    const pesos = Number(f.montoCLP) || 0
    const uf = pesos && valorUF ? +(pesos / valorUF).toFixed(2) : null
    return { ...f, moneda, montoUF: uf, montoCLP: null }
  }))

  const asignado = value.reduce((s, f) => s + montoUFDeForma(f, valorUF), 0)
  const faltante = totalUF - asignado
  const calza    = Math.abs(faltante) <= TOLERANCIA
  const excede   = faltante < -TOLERANCIA
  const hayPesos = value.some(f => f.moneda === 'CLP')

  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {FORMAS_PAGO.map(({ value: forma, label }) => {
          const activa = marcada(forma)
          const fila = filaDe(forma)
          const enPesos = fila.moneda === 'CLP'
          const nCuotas = forma === 'CUOTAS' ? (fila.cuotas || cuotasBeneficio) : null
          const montoUF = montoUFDeForma(fila, valorUF)
          const pesos = enPesos ? (Number(fila.montoCLP) || 0) : ufAPesos(montoUF)
          return (
            <div key={forma} style={{
              display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
              padding: '8px 12px', borderRadius: 8,
              background: activa ? '#f0f7ff' : '#fafafa',
              border: `1px solid ${activa ? '#bfdbfe' : '#f0f0f0'}`,
            }}>
              <Checkbox checked={activa} onChange={e => toggle(forma, e.target.checked)} style={{ flex: '0 0 130px' }}>
                <span style={{ fontSize: 13, fontWeight: activa ? 600 : 400 }}>{label}</span>
              </Checkbox>

              {activa && forma === 'CUOTAS' && (
                <InputNumber
                  size="small"
                  min={1}
                  precision={0}
                  style={{ width: 110 }}
                  placeholder={cuotasBeneficio ? `${cuotasBeneficio} (benef.)` : 'N° cuotas'}
                  value={fila.cuotas ?? null}
                  onChange={v => setCampo(forma, 'cuotas', v)}
                  addonAfter="cuotas"
                />
              )}

              {activa && (
                <>
                  <Segmented
                    size="small"
                    options={[{ label: 'UF', value: 'UF' }, { label: '$', value: 'CLP' }]}
                    value={enPesos ? 'CLP' : 'UF'}
                    onChange={v => setMoneda(forma, v)}
                  />
                  {enPesos ? (
                    <InputNumber
                      size="small"
                      min={0}
                      step={10000}
                      precision={0}
                      style={{ width: 150 }}
                      placeholder="Monto en pesos"
                      prefix="$"
                      formatter={fmtMiles}
                      parser={parseMiles}
                      value={fila.montoCLP ?? null}
                      onChange={v => setCampo(forma, 'montoCLP', v)}
                    />
                  ) : (
                    <InputNumber
                      size="small"
                      min={0}
                      step={1}
                      precision={2}
                      style={{ width: 130 }}
                      placeholder="Monto"
                      value={fila.montoUF ?? null}
                      onChange={v => setCampo(forma, 'montoUF', v)}
                      addonAfter="UF"
                    />
                  )}
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {enPesos
                      ? (montoUF ? `≈ ${montoUF.toFixed(2)} UF` : '')
                      : (pesos ? formatPesos(pesos) : '')}
                    {nCuotas && (enPesos ? pesos : montoUF)
                      ? ` · ${nCuotas} × ${enPesos ? formatPesos(pesos / nCuotas) : `${(montoUF / nCuotas).toFixed(2)} UF`}`
                      : ''}
                  </Text>
                </>
              )}
            </div>
          )
        })}
      </div>

      {hayPesos && !valorUF && (
        <Alert
          type="warning"
          showIcon
          style={{ marginTop: 10 }}
          message="No se pudo leer la UF de hoy: los montos en pesos no se van a poder guardar."
        />
      )}

      {/* Resumen contra el total de la venta (siempre en UF) */}
      <div style={{
        marginTop: 12, padding: '8px 12px', borderRadius: 8,
        background: excede ? '#fff1f0' : calza ? '#f6ffed' : '#fffbeb',
        border: `1px solid ${excede ? '#ffccc7' : calza ? '#b7eb8f' : '#fde68a'}`,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap',
      }}>
        <Text style={{ fontSize: 13 }}>
          Asignado <strong>{asignado.toFixed(2)} UF</strong> de {Number(totalUF).toFixed(2)} UF
        </Text>
        {value.length === 0
          ? <Tag>Al contado</Tag>
          : excede
            ? <Text style={{ fontSize: 13, color: '#cf1322' }}>Se pasa por {Math.abs(faltante).toFixed(2)} UF</Text>
            : calza
              ? <Text style={{ fontSize: 13, color: '#389e0d' }}>✓ calza</Text>
              : <Text style={{ fontSize: 13, color: '#d97706' }}>Faltan {faltante.toFixed(2)} UF por asignar</Text>}
      </div>

      {hayPesos && valorUF && (
        <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 6 }}>
          Lo pactado en pesos queda fijo en pesos; su equivalente en UF se congela con la UF de hoy ({formatPesos(valorUF)}).
        </Text>
      )}

      {value.length === 0 && (
        <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 6 }}>
          Sin nada marcado la venta queda como pago al contado.
        </Text>
      )}
    </div>
  )
}

/** Vista de solo lectura: desglose de las formas con su monto. */
export function DetalleFormasPago({ venta }) {
  const { formatPesos, ufAPesos, valorUF } = useUF()
  const formas = venta?.formasPago || []
  const nCuotas = cuotasPactadas(venta)

  if (formas.length === 0) {
    return (
      <div style={{
        padding: '10px 12px', borderRadius: 8,
        background: '#f8fafc', border: '1px solid #e2e8f0',
      }}>
        <Text strong style={{ fontSize: 13 }}>Al contado</Text>
        <div><Text type="secondary" style={{ fontSize: 12 }}>No hay formas de pago registradas.</Text></div>
      </div>
    )
  }

  const asignado = formas.reduce((s, f) => s + montoUFDeForma(f, valorUF), 0)
  const total    = Number(venta?.precioFinalUF || 0)
  const faltante = total - asignado

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {formas.map(f => {
        const enPesos = f.moneda === 'CLP'
        const monto = montoUFDeForma(f, valorUF)
        const pesos = enPesos ? (Number(f.montoCLP) || 0) : ufAPesos(monto)
        const n = f.forma === 'CUOTAS' ? (f.cuotas || nCuotas) : null
        // Lo pactado manda: en pesos se muestra el peso arriba y la UF abajo
        const principal = enPesos ? formatPesos(pesos) : `${monto.toFixed(2)} UF`
        const secundario = enPesos
          ? (monto ? `≈ ${monto.toFixed(2)} UF` : null)
          : (pesos ? formatPesos(pesos) : null)
        const porCuota = n && (enPesos ? pesos : monto)
          ? (enPesos ? `${n} × ${formatPesos(pesos / n)}` : `${n} × ${(monto / n).toFixed(2)} UF`)
          : null
        return (
          <div key={f.forma} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8,
            padding: '8px 12px', borderRadius: 8, background: '#f0f7ff', border: '1px solid #bfdbfe',
          }}>
            <div>
              <Text strong style={{ fontSize: 13 }}>{FORMA_PAGO_LABEL[f.forma] || f.forma}</Text>
              {n ? <Tag color="blue" style={{ marginLeft: 8 }}>{n} cuotas</Tag> : null}
              {enPesos ? <Tag style={{ marginLeft: 4 }}>en pesos</Tag> : null}
              {porCuota ? <div><Text type="secondary" style={{ fontSize: 12 }}>{porCuota}</Text></div> : null}
              {f.notas ? <div><Text type="secondary" style={{ fontSize: 12 }}>{f.notas}</Text></div> : null}
            </div>
            {(enPesos ? pesos : monto) > 0 && (
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{principal}</div>
                {secundario ? <div style={{ fontSize: 11, color: '#8c8c8c' }}>{secundario}</div> : null}
              </div>
            )}
          </div>
        )
      })}
      {/* Las ventas históricas quedaron sin montos: ahí no se muestra el cuadre */}
      {asignado > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '0 4px' }}>
          <Text type="secondary">Asignado {asignado.toFixed(2)} UF de {total.toFixed(2)} UF</Text>
          {Math.abs(faltante) > TOLERANCIA && (
            <Text style={{ color: faltante > 0 ? '#d97706' : '#cf1322' }}>
              {faltante > 0 ? `Faltan ${faltante.toFixed(2)} UF` : `Se pasa por ${Math.abs(faltante).toFixed(2)} UF`}
            </Text>
          )}
        </div>
      )}
    </div>
  )
}
