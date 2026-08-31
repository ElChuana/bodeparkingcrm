// Forma de pago de una venta: se pueden combinar varias (ej: pie por
// transferencia + saldo en cuotas) y cada una lleva su monto en UF.
// Sin ninguna forma marcada, la venta es AL CONTADO.
//
// La cantidad de cuotas sale del beneficio "cuotas sin interés"; solo se
// guarda en la forma cuando se pacta una cantidad distinta.
import { Checkbox, InputNumber, Typography, Tag } from 'antd'
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
 * Editor de formas de pago. `value` es [{ forma, montoUF, cuotas }] y se
 * reemplaza completo en cada cambio (onChange recibe el arreglo nuevo).
 */
export function EditorFormasPago({ value = [], onChange, totalUF = 0, cuotasBeneficio = null }) {
  const { formatPesos, ufAPesos } = useUF()

  const marcada = (forma) => value.some(f => f.forma === forma)
  const filaDe  = (forma) => value.find(f => f.forma === forma) || {}

  const toggle = (forma, checked) => {
    if (checked) onChange([...value, { forma, montoUF: null, cuotas: null }])
    else onChange(value.filter(f => f.forma !== forma))
  }

  const setCampo = (forma, campo, val) =>
    onChange(value.map(f => f.forma === forma ? { ...f, [campo]: val } : f))

  const asignado = value.reduce((s, f) => s + (Number(f.montoUF) || 0), 0)
  const faltante = totalUF - asignado
  const calza    = Math.abs(faltante) <= TOLERANCIA
  const excede   = faltante < -TOLERANCIA

  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {FORMAS_PAGO.map(({ value: forma, label }) => {
          const activa = marcada(forma)
          const fila = filaDe(forma)
          const pesos = ufAPesos(Number(fila.montoUF) || 0)
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
                  {pesos ? <Text type="secondary" style={{ fontSize: 12 }}>{formatPesos(pesos)}</Text> : null}
                </>
              )}
            </div>
          )
        })}
      </div>

      {/* Resumen contra el total de la venta */}
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
  const { formatPesos, ufAPesos } = useUF()
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

  const asignado = formas.reduce((s, f) => s + (Number(f.montoUF) || 0), 0)
  const total    = Number(venta?.precioFinalUF || 0)
  const faltante = total - asignado

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {formas.map(f => {
        const monto = Number(f.montoUF) || 0
        const pesos = ufAPesos(monto)
        const n = f.forma === 'CUOTAS' ? (f.cuotas || nCuotas) : null
        return (
          <div key={f.forma} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8,
            padding: '8px 12px', borderRadius: 8, background: '#f0f7ff', border: '1px solid #bfdbfe',
          }}>
            <div>
              <Text strong style={{ fontSize: 13 }}>{FORMA_PAGO_LABEL[f.forma] || f.forma}</Text>
              {n ? <Tag color="blue" style={{ marginLeft: 8 }}>{n} cuotas</Tag> : null}
              {f.notas ? <div><Text type="secondary" style={{ fontSize: 12 }}>{f.notas}</Text></div> : null}
            </div>
            {monto > 0 && (
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{monto.toFixed(2)} UF</div>
                {pesos ? <div style={{ fontSize: 11, color: '#8c8c8c' }}>{formatPesos(pesos)}</div> : null}
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
