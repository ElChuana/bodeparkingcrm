/**
 * Flujo de caja: lo real en sólido, lo proyectado atenuado; el saldo como línea.
 * Cada mes se abre para ver qué lo explica, ordenado por monto.
 */
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ReferenceLine, Cell,
} from 'recharts'
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import api from '../../services/api'
import { Carta, CartaTitulo, Badge, clp, fecha, Cargando } from '../ui'

const ORIGEN = {
  BANCO: { label: 'Banco', tono: 'gris' },
  CUOTA: { label: 'Cuota', tono: 'azul' },
  ARRIENDO: { label: 'Arriendo', tono: 'azul' },
  COMISION: { label: 'Comisión', tono: 'ambar' },
  PROVISION: { label: 'Provisión', tono: 'ambar' },
  DOCUMENTO: { label: 'Documento', tono: 'gris' },
  COMPRA: { label: 'Factura', tono: 'ambar' },
  GASTO: { label: 'Gasto prog.', tono: 'gris' },
}

function TooltipFlujo({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const f = payload[0]?.payload
  if (!f) return null
  return (
    <div className="bg-carta border border-borde rounded-lg shadow-flotante px-3 py-2 text-[11.5px]">
      <div className="font-semibold mb-1">{label}{f.sinDatosBanco ? ' · sin datos del banco' : ''}</div>
      <div className="flex justify-between gap-4"><span className="text-gris">Entradas</span><span className="monto text-abono font-semibold">{clp(f.entradas)}</span></div>
      <div className="flex justify-between gap-4"><span className="text-gris">Salidas</span><span className="monto text-cargo font-semibold">{clp(f.salidas)}</span></div>
      <div className="flex justify-between gap-4 border-t border-borde-suave mt-1 pt-1"><span className="text-gris">Neto</span><span className={`monto font-semibold ${f.neto >= 0 ? 'text-abono' : 'text-cargo'}`}>{clp(f.neto)}</span></div>
      {f.saldoProyectado != null && (
        <div className="flex justify-between gap-4"><span className="text-gris">Saldo proy.</span><span className="monto font-semibold text-bp-dark">{clp(f.saldoProyectado)}</span></div>
      )}
    </div>
  )
}

function MesFila({ f }) {
  const [abierto, setAbierto] = useState(false)
  const Chevron = abierto ? ChevronDownIcon : ChevronRightIcon
  return (
    <>
      <tr
        className="cursor-pointer hover:bg-borde-suave/60"
        onClick={() => setAbierto(!abierto)}
        aria-expanded={abierto}
      >
        <td className="px-3 py-2 border-b border-borde-suave">
          <span className="flex items-center gap-1.5 font-semibold text-[12.5px]">
            <Chevron className="w-3.5 h-3.5 text-sutil" aria-hidden="true" />
            {f.etiqueta}
            {f.esActual && <Badge tono="azul">en curso</Badge>}
            {f.esFuturo && <span className="text-[10px] text-sutil font-normal">proyectado</span>}
            {f.sinDatosBanco && <Badge tono="ambar">sin cartola</Badge>}
          </span>
        </td>
        <td className="num px-3 py-2 border-b border-borde-suave text-right monto text-abono">{clp(f.entradas)}</td>
        <td className="num px-3 py-2 border-b border-borde-suave text-right monto text-cargo">{clp(f.salidas)}</td>
        <td className={`num px-3 py-2 border-b border-borde-suave text-right monto font-semibold ${f.neto >= 0 ? 'text-abono' : 'text-cargo'}`}>{clp(f.neto)}</td>
        <td className="num px-3 py-2 border-b border-borde-suave text-right monto text-bp-dark">{f.saldoProyectado != null ? clp(f.saldoProyectado) : '—'}</td>
      </tr>
      {abierto && (
        <tr>
          <td colSpan={5} className="bg-fondo/60 border-b border-borde-suave px-3 py-2">
            {f.detalle.length === 0 ? (
              <span className="text-[11.5px] text-sutil">Sin movimientos este mes.</span>
            ) : (
              <ul className="space-y-0.5 max-h-72 overflow-y-auto">
                {f.detalle.slice(0, 40).map((d, i) => {
                  const o = ORIGEN[d.origen] || { label: d.origen, tono: 'gris' }
                  return (
                    <li key={i} className="flex items-baseline gap-2 text-[11.5px]">
                      <span className="w-14 shrink-0 text-sutil monto">{d.fecha ? fecha(d.fecha) : '—'}</span>
                      <Badge tono={d.real ? 'gris' : o.tono}>{o.label}</Badge>
                      <span className="flex-1 truncate">{d.concepto}{d.nota && <span className="text-sutil"> · {d.nota}</span>}</span>
                      <span className={`monto font-medium whitespace-nowrap ${d.tipo === 'ENTRADA' ? 'text-abono' : 'text-cargo'}`}>
                        {d.tipo === 'SALIDA' ? '−' : ''}{clp(d.monto)}
                      </span>
                    </li>
                  )
                })}
                {f.detalle.length > 40 && <li className="text-[10.5px] text-sutil">… y {f.detalle.length - 40} más</li>}
              </ul>
            )}
          </td>
        </tr>
      )}
    </>
  )
}

export default function Flujo() {
  const [meses, setMeses] = useState(12)
  const { data, isLoading } = useQuery({
    queryKey: ['erp-flujo', meses],
    queryFn: () => api.get('/erp/flujo', { params: { meses } }).then((r) => r.data),
    staleTime: 60000,
  })

  if (isLoading || !data) return <Cargando alto="h-64" />

  const filas = data.filas.map((f) => ({ ...f, netoColor: f.neto >= 0 }))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-[17px] font-bold tracking-tight">Flujo de caja</h1>
        <div className="flex items-center gap-1 bg-carta border border-borde rounded-lg p-0.5">
          {[6, 12, 18].map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMeses(m)}
              className={`px-2.5 py-1 rounded-md text-[11.5px] font-semibold cursor-pointer transition-colors ${meses === m ? 'bg-bp-soft text-bp-dark' : 'text-gris hover:text-tinta'}`}
            >
              {m} meses
            </button>
          ))}
        </div>
      </div>

      <Carta className="p-4">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={filas} margin={{ top: 8, right: 8, bottom: 0, left: 8 }} barGap={1}>
              <XAxis dataKey="etiqueta" tick={{ fontSize: 10.5, fill: 'var(--color-sutil)' }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(v) => `${Math.round(v / 1e6)}M`} tick={{ fontSize: 10.5, fill: 'var(--color-sutil)' }} axisLine={false} tickLine={false} width={36} />
              <Tooltip content={<TooltipFlujo />} />
              <ReferenceLine y={0} stroke="var(--color-borde)" />
              <Bar dataKey="entradas" name="Entradas" radius={[3, 3, 0, 0]} maxBarSize={18}>
                {filas.map((f, i) => <Cell key={i} fill="var(--color-abono)" fillOpacity={f.esFuturo ? 0.35 : 0.9} />)}
              </Bar>
              <Bar dataKey="salidas" name="Salidas" radius={[3, 3, 0, 0]} maxBarSize={18}>
                {filas.map((f, i) => <Cell key={i} fill="var(--color-cargo)" fillOpacity={f.esFuturo ? 0.3 : 0.8} />)}
              </Bar>
              <Line dataKey="saldoProyectado" name="Saldo" stroke="var(--color-bp)" strokeWidth={2} strokeDasharray="5 4" dot={false} connectNulls />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center gap-4 mt-2 text-[10.5px] text-sutil">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-abono inline-block" /> Entradas</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-cargo/80 inline-block" /> Salidas</span>
          <span className="flex items-center gap-1"><span className="w-4 border-t-2 border-dashed border-bp inline-block" /> Saldo proyectado</span>
          <span>Lo proyectado va atenuado</span>
        </div>
      </Carta>

      <Carta>
        <CartaTitulo>Mes a mes</CartaTitulo>
        <div className="overflow-x-auto">
          <table className="w-full text-[12.5px]">
            <thead>
              <tr>
                <th className="px-3 py-2 text-left text-[10.5px] font-semibold uppercase tracking-wider text-sutil border-b border-borde">Mes</th>
                <th className="px-3 py-2 text-right text-[10.5px] font-semibold uppercase tracking-wider text-sutil border-b border-borde">Entradas</th>
                <th className="px-3 py-2 text-right text-[10.5px] font-semibold uppercase tracking-wider text-sutil border-b border-borde">Salidas</th>
                <th className="px-3 py-2 text-right text-[10.5px] font-semibold uppercase tracking-wider text-sutil border-b border-borde">Neto</th>
                <th className="px-3 py-2 text-right text-[10.5px] font-semibold uppercase tracking-wider text-sutil border-b border-borde">Saldo proy.</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((f) => <MesFila key={f.mes} f={f} />)}
            </tbody>
          </table>
        </div>
        {data.limitaciones?.length > 0 && (
          <div className="px-4 py-2.5 border-t border-borde-suave">
            {data.limitaciones.map((l, i) => (
              <p key={i} className="text-[10.5px] text-sutil leading-relaxed">· {l}</p>
            ))}
          </div>
        )}
      </Carta>
    </div>
  )
}
