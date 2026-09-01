/**
 * Cobranza: a quién hay que llamar hoy.
 *
 * Antigüedad 30/60/90 por cliente ordenada por gravedad, y la matriz
 * Cliente × Mes — el excel de ventas en cuotas, ahora vivo.
 */
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronDownIcon, ChevronRightIcon, PhoneIcon } from '@heroicons/react/24/outline'
import api from '../../services/api'
import { Carta, Badge, clp, uf, fecha, mesLabel, Cargando, Vacio } from '../ui'

const TRAMO_TONO = { POR_VENCER: 'gris', D1_30: 'azul', D31_60: 'ambar', D61_90: 'ambar', D90_MAS: 'rojo' }
const TRAMO_LABEL = { POR_VENCER: 'Por vencer', D1_30: '1-30 días', D31_60: '31-60', D61_90: '61-90', D90_MAS: '+90 días' }

function FilaCliente({ cli }) {
  const [abierto, setAbierto] = useState(false)
  const Chevron = abierto ? ChevronDownIcon : ChevronRightIcon
  return (
    <>
      <tr className="cursor-pointer hover:bg-borde-suave/50" onClick={() => setAbierto(!abierto)} aria-expanded={abierto}>
        <td className="px-3 py-2 border-b border-borde-suave">
          <span className="flex items-center gap-1.5">
            <Chevron className="w-3.5 h-3.5 text-sutil shrink-0" aria-hidden="true" />
            <span>
              <span className="font-semibold text-[12.5px]">{cli.nombre}</span>
              {cli.rut && <span className="text-sutil text-[11px]"> · {cli.rut}</span>}
              {cli.cuotas?.[0]?.telefono && (
                <a href={`tel:${cli.cuotas[0].telefono}`} onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1 ml-2 text-[10.5px] text-bp-dark font-semibold hover:underline">
                  <PhoneIcon className="w-3 h-3" aria-hidden="true" />{cli.cuotas[0].telefono}
                </a>
              )}
            </span>
          </span>
        </td>
        <td className="px-3 py-2 border-b border-borde-suave"><Badge tono={TRAMO_TONO[cli.peorTramo]}>{TRAMO_LABEL[cli.peorTramo]}</Badge></td>
        <td className="num px-3 py-2 border-b border-borde-suave text-right monto text-sutil">{cli.diasMax || '—'}</td>
        <td className="num px-3 py-2 border-b border-borde-suave text-right monto text-cargo font-semibold">{cli.vencido ? clp(cli.vencido) : '—'}</td>
        <td className="num px-3 py-2 border-b border-borde-suave text-right monto font-semibold">{clp(cli.total)}</td>
      </tr>
      {abierto && (
        <tr><td colSpan={5} className="bg-fondo/60 border-b border-borde-suave px-4 py-2">
          <ul className="space-y-1">
            {cli.cuotas.map((c) => (
              <li key={c.id} className="flex items-baseline gap-2 text-[11.5px]">
                <span className="w-14 shrink-0 monto text-sutil">{fecha(c.fechaVencimiento)}</span>
                <span className="flex-1 truncate">
                  Cuota {c.numeroCuota} · {c.tipo?.toLowerCase()}
                  {c.edificio && <span className="text-sutil"> · {c.edificio}</span>}
                  {c.montoUF && <span className="text-sutil"> · {uf(c.montoUF)}</span>}
                  {c.origenMigracion && <Badge tono="gris" title="Cuota reconstruida por migración, no pactada">migrada</Badge>}
                </span>
                {c.diasAtraso > 0 && <span className="text-[10.5px] text-cargo">{c.diasAtraso} días</span>}
                <span className="monto font-medium whitespace-nowrap">{clp(c.saldoPorCobrar)}</span>
              </li>
            ))}
          </ul>
        </td></tr>
      )}
    </>
  )
}

function TabCobranza() {
  const { data, isLoading } = useQuery({
    queryKey: ['erp-cartera'],
    queryFn: () => api.get('/erp/cartera').then((r) => r.data),
    staleTime: 60000,
  })

  if (isLoading || !data) return <Cargando alto="h-56" />

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {data.tramos.map((t) => (
          <div key={t.clave} className="flex-1 min-w-[110px] bg-carta border border-borde rounded-xl px-3 py-2.5">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-sutil">{t.etiqueta}</div>
            <div className={`monto text-[15px] font-bold mt-0.5 ${t.clave === 'POR_VENCER' ? 'text-tinta' : t.clave === 'D90_MAS' ? 'text-cargo' : 'text-alerta'}`}>
              {clp(data.totales[t.clave])}
            </div>
          </div>
        ))}
        <div className="flex-1 min-w-[110px] bg-bp-soft border border-bp/30 rounded-xl px-3 py-2.5">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-bp-dark">Total por cobrar</div>
          <div className="monto text-[15px] font-bold mt-0.5 text-bp-dark">{clp(data.total)}</div>
        </div>
      </div>

      <Carta>
        {!data.clientes.length ? <Vacio>Nadie debe nada. 🎉</Vacio> : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12.5px]">
              <thead><tr>
                {['Cliente', 'Peor tramo', 'Días', 'Vencido', 'Total'].map((h, i) => (
                  <th key={h} className={`px-3 py-2 text-[10.5px] font-semibold uppercase tracking-wider text-sutil border-b border-borde ${i >= 2 ? 'text-right' : 'text-left'}`}>{h}</th>
                ))}
              </tr></thead>
              <tbody>{data.clientes.map((c) => <FilaCliente key={c.contactoId ?? c.nombre} cli={c} />)}</tbody>
            </table>
          </div>
        )}
        {data.migradas > 0 && (
          <p className="px-4 py-2 text-[10.5px] text-sutil border-t border-borde-suave">
            {data.migradas} cuota(s) marcadas "migradas": montos y fechas reconstruidos, no pactados.
          </p>
        )}
      </Carta>
    </div>
  )
}

function TabMatriz() {
  const { data, isLoading } = useQuery({
    queryKey: ['erp-cartera', 'matriz'],
    queryFn: () => api.get('/erp/cartera/matriz').then((r) => r.data),
    staleTime: 60000,
  })

  if (isLoading || !data) return <Cargando alto="h-56" />
  if (!data.clientes.length) return <Carta><Vacio>Sin ventas en cuotas todavía.</Vacio></Carta>

  return (
    <Carta>
      <div className="overflow-x-auto">
        <table className="text-[11.5px]">
          <thead><tr>
            <th className="px-3 py-2 text-left text-[10.5px] font-semibold uppercase tracking-wider text-sutil border-b border-borde sticky left-0 bg-carta min-w-[170px]">Cliente</th>
            {data.meses.map((m) => <th key={m} className="px-2 py-2 text-right text-[10.5px] font-semibold uppercase text-sutil border-b border-borde min-w-[86px] monto">{mesLabel(m)}</th>)}
            <th className="px-3 py-2 text-right text-[10.5px] font-semibold uppercase tracking-wider text-sutil border-b border-borde min-w-[96px]">Saldo</th>
          </tr></thead>
          <tbody>
            {data.clientes.map((cli) => (
              <tr key={cli.contactoId ?? cli.nombre} className="hover:bg-borde-suave/40">
                <td className="px-3 py-1.5 border-b border-borde-suave sticky left-0 bg-carta whitespace-nowrap">
                  <span className="font-medium">{cli.nombre}</span>
                  {cli.edificio && <span className="block text-[9.5px] text-sutil">{cli.edificio}</span>}
                </td>
                {data.meses.map((m) => {
                  const celda = cli.meses[m]
                  if (!celda) return <td key={m} className="px-2 py-1.5 border-b border-borde-suave text-right text-sutil">·</td>
                  const pagada = celda.saldo < 1000
                  return (
                    <td key={m} className="px-2 py-1.5 border-b border-borde-suave text-right monto"
                      title={celda.cuotas.map((c) => `Cuota ${c.numeroCuota} ${c.tipo} · ${clp(c.montoCLP)}${c.saldo < 1000 ? ' pagada' : ''}`).join('\n')}>
                      <span className={pagada ? 'text-abono' : 'text-tinta font-medium'}>{clp(celda.monto)}</span>
                      {pagada && <span className="text-abono text-[9px] block leading-none">✓</span>}
                    </td>
                  )
                })}
                <td className="num px-3 py-1.5 border-b border-borde-suave text-right monto font-semibold">
                  {cli.saldo < 1000 ? <span className="text-abono">al día</span> : clp(cli.saldo)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="px-4 py-2 text-[10.5px] text-sutil border-t border-borde-suave">
        Verde = pagada (conciliada con el banco). El valor UF del día: ${new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 }).format(data.valorUF)}.
      </p>
    </Carta>
  )
}

export default function Cartera() {
  const [tab, setTab] = useState('cobranza')
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 flex-wrap">
        <h1 className="text-[17px] font-bold tracking-tight">Cobranza</h1>
        <div className="flex items-center gap-1 bg-carta border border-borde rounded-lg p-0.5">
          {[['cobranza', 'A quién llamar'], ['matriz', 'Cliente × Mes']].map(([k, l]) => (
            <button key={k} type="button" onClick={() => setTab(k)}
              className={`px-2.5 py-1 rounded-md text-[11.5px] font-semibold cursor-pointer transition-colors ${tab === k ? 'bg-bp-soft text-bp-dark' : 'text-gris hover:text-tinta'}`}>
              {l}
            </button>
          ))}
        </div>
      </div>
      {tab === 'cobranza' ? <TabCobranza /> : <TabMatriz />}
    </div>
  )
}
