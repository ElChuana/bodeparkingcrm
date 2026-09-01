/**
 * Cuentas y presupuesto: ¿cómo vamos con el presupuesto de cada cuenta?
 *
 * Árbol cuenta grande → subcuenta con Presupuesto / Ejecutado / Comprometido /
 * Disponible y semáforo. La ejecución es calculada por lo devengado; el
 * presupuesto se carga en una grilla subcuenta × mes.
 */
import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import api from '../../services/api'
import { Carta, Badge, clp, mesLabel, Cargando, Vacio, Boton, Input } from '../ui'

const num = (v) => Number(v) || 0

function Semaforo({ fila }) {
  if (fila.pct == null) return fila.ejecutado + fila.comprometido > 0 ? <Badge tono="gris">s/ ppto</Badge> : null
  const tono = fila.pct > 100 ? 'rojo' : fila.pct >= 85 ? 'ambar' : 'verde'
  return <Badge tono={tono}>{fila.pct}%</Badge>
}

function FilaCuenta({ cuenta, periodo, nivel = 0 }) {
  const [abierta, setAbierta] = useState(true)
  const f = periodo ? cuenta.porPeriodo[periodo] : cuenta.total
  const tieneHijas = cuenta.subcuentas?.length > 0
  const Chevron = abierta ? ChevronDownIcon : ChevronRightIcon

  return (
    <>
      <tr className={`${nivel === 0 ? 'bg-fondo/70 font-semibold' : ''} hover:bg-borde-suave/50`}>
        <td className="px-3 py-1.5 border-b border-borde-suave">
          <span className="flex items-center gap-1" style={{ paddingLeft: nivel * 18 }}>
            {tieneHijas ? (
              <button type="button" onClick={() => setAbierta(!abierta)} className="cursor-pointer text-sutil" aria-label={abierta ? 'Colapsar' : 'Expandir'}>
                <Chevron className="w-3.5 h-3.5" />
              </button>
            ) : <span className="w-3.5" />}
            {cuenta.color && <span className="w-2 h-2 rounded-full shrink-0" style={{ background: cuenta.color }} />}
            <span className="text-[12.5px]">{cuenta.nombre}</span>
          </span>
        </td>
        <td className="num px-3 py-1.5 border-b border-borde-suave text-right monto">{f.presupuesto ? clp(f.presupuesto) : <span className="text-sutil">—</span>}</td>
        <td className="num px-3 py-1.5 border-b border-borde-suave text-right monto text-tinta">{f.ejecutado ? clp(f.ejecutado) : <span className="text-sutil">—</span>}</td>
        <td className="num px-3 py-1.5 border-b border-borde-suave text-right monto text-alerta">{f.comprometido ? clp(f.comprometido) : <span className="text-sutil">—</span>}</td>
        <td className={`num px-3 py-1.5 border-b border-borde-suave text-right monto font-semibold ${f.disponible < 0 ? 'text-cargo' : 'text-abono'}`}>
          {f.presupuesto || f.ejecutado || f.comprometido ? clp(f.disponible) : <span className="text-sutil font-normal">—</span>}
        </td>
        <td className="px-3 py-1.5 border-b border-borde-suave text-right"><Semaforo fila={f} /></td>
      </tr>
      {abierta && tieneHijas && cuenta.subcuentas.map((s) => (
        <FilaCuenta key={s.id} cuenta={{ ...s, subcuentas: [] }} periodo={periodo} nivel={1} />
      ))}
    </>
  )
}

function TabEjecucion({ anio }) {
  const [periodo, setPeriodo] = useState('') // '' = acumulado del año
  const { data, isLoading } = useQuery({
    queryKey: ['erp-presupuesto', 'ejecucion', anio],
    queryFn: () => api.get('/erp/presupuesto/ejecucion', { params: { anio } }).then((r) => r.data),
    staleTime: 60000,
  })

  if (isLoading || !data) return <Cargando alto="h-56" />

  const total = periodo ? data.porPeriodo[periodo] : data.total

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <button type="button" onClick={() => setPeriodo('')}
          className={`px-2 py-1 rounded-md text-[11px] font-semibold cursor-pointer ${!periodo ? 'bg-bp-soft text-bp-dark' : 'text-gris hover:text-tinta'}`}>
          Año completo
        </button>
        {data.periodos.map((p) => (
          <button key={p} type="button" onClick={() => setPeriodo(p)}
            className={`px-2 py-1 rounded-md text-[11px] font-semibold cursor-pointer ${periodo === p ? 'bg-bp-soft text-bp-dark' : 'text-gris hover:text-tinta'}`}>
            {mesLabel(p)}
          </button>
        ))}
      </div>

      <Carta>
        <div className="overflow-x-auto">
          <table className="w-full text-[12.5px]">
            <thead><tr>
              {['Cuenta', 'Presupuesto', 'Ejecutado', 'Comprometido', 'Disponible', ''].map((h, i) => (
                <th key={h || 'x'} className={`px-3 py-2 text-[10.5px] font-semibold uppercase tracking-wider text-sutil border-b border-borde ${i > 0 ? 'text-right' : 'text-left'}`}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {data.cuentas.map((c) => <FilaCuenta key={c.id} cuenta={c} periodo={periodo || null} />)}
              <tr className="font-bold bg-bp-soft/40">
                <td className="px-3 py-2">Total</td>
                <td className="num px-3 py-2 text-right monto">{clp(total.presupuesto)}</td>
                <td className="num px-3 py-2 text-right monto">{clp(total.ejecutado)}</td>
                <td className="num px-3 py-2 text-right monto text-alerta">{clp(total.comprometido)}</td>
                <td className={`num px-3 py-2 text-right monto ${total.disponible < 0 ? 'text-cargo' : 'text-abono'}`}>{clp(total.disponible)}</td>
                <td className="px-3 py-2 text-right"><Semaforo fila={total} /></td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="px-4 py-2 text-[10.5px] text-sutil border-t border-borde-suave">
          Ejecutado = pagado y conciliado con el banco · Comprometido = provisiones y facturas abiertas ·
          El período es el del documento (devengado), no el del pago.
        </p>
      </Carta>
    </div>
  )
}

function TabCargar({ anio }) {
  const qc = useQueryClient()
  const [celdas, setCeldas] = useState({}) // `${cuentaId}|${periodo}` → valor editado

  const { data: cuentas } = useQuery({
    queryKey: ['erp-cuentas'],
    queryFn: () => api.get('/erp/cuentas').then((r) => r.data),
    staleTime: 300000,
  })
  const { data: presupuesto, isLoading } = useQuery({
    queryKey: ['erp-presupuesto', 'grilla', anio],
    queryFn: () => api.get('/erp/presupuesto', { params: { anio } }).then((r) => r.data),
    staleTime: 30000,
  })

  const base = useMemo(() => {
    const m = new Map()
    for (const f of presupuesto?.filas || []) m.set(`${f.cuentaId}|${f.periodo}`, f)
    return m
  }, [presupuesto])

  const subcuentas = (cuentas?.arbol || []).flatMap((r) => r.subcuentas.length ? r.subcuentas.map((s) => ({ ...s, grupo: r.nombre })) : [{ ...r, grupo: null }])
  const periodos = presupuesto?.periodos || []

  const valorDe = (cuentaId, periodo) => {
    const k = `${cuentaId}|${periodo}`
    if (k in celdas) return celdas[k]
    const f = base.get(k)
    return f ? (num(f.montoCLP) || '') : ''
  }

  const guardar = useMutation({
    mutationFn: () => {
      const filas = Object.entries(celdas).map(([k, v]) => {
        const [cuentaId, periodo] = k.split('|')
        return { cuentaId: Number(cuentaId), periodo, montoCLP: v === '' ? null : Number(v) }
      })
      return api.put('/erp/presupuesto', { filas }).then((r) => r.data)
    },
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ['erp-presupuesto'] })
      setCeldas({})
      toast.success(`Presupuesto guardado (${r.guardadas} celdas).`)
    },
    onError: (e) => toast.error(e.response?.data?.error || 'No se pudo guardar.'),
  })

  const copiarAlAno = (cuentaId, desdePeriodo) => {
    const v = valorDe(cuentaId, desdePeriodo)
    if (v === '') return
    setCeldas((c) => {
      const nuevo = { ...c }
      for (const p of periodos) if (p !== desdePeriodo) nuevo[`${cuentaId}|${p}`] = v
      return nuevo
    })
    toast('Copiado al resto del año — guarda para confirmar.', { icon: '📋' })
  }

  if (isLoading || !cuentas) return <Cargando alto="h-56" />
  if (!subcuentas.length) return <Carta><Vacio>Primero crea el plan de cuentas en Configuración.</Vacio></Carta>

  const cambios = Object.keys(celdas).length

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[11.5px] text-gris">Montos en pesos por subcuenta y mes. Doble clic en una celda la copia al resto del año.</p>
        <Boton variante="primario" size="sm" disabled={!cambios || guardar.isPending} onClick={() => guardar.mutate()}>
          {guardar.isPending ? 'Guardando…' : cambios ? `Guardar ${cambios} cambio${cambios === 1 ? '' : 's'}` : 'Sin cambios'}
        </Boton>
      </div>
      <Carta>
        <div className="overflow-x-auto">
          <table className="text-[11.5px] w-full">
            <thead><tr>
              <th className="px-3 py-2 text-left text-[10.5px] font-semibold uppercase tracking-wider text-sutil border-b border-borde sticky left-0 bg-carta min-w-[160px]">Subcuenta</th>
              {periodos.map((p) => <th key={p} className="px-1 py-2 text-center text-[10.5px] font-semibold uppercase text-sutil border-b border-borde min-w-[84px]">{mesLabel(p)}</th>)}
            </tr></thead>
            <tbody>
              {subcuentas.map((s) => (
                <tr key={s.id} className="hover:bg-borde-suave/40">
                  <td className="px-3 py-1 border-b border-borde-suave sticky left-0 bg-carta whitespace-nowrap">
                    <span className="font-medium">{s.nombre}</span>
                    {s.grupo && <span className="block text-[9.5px] text-sutil">{s.grupo}</span>}
                  </td>
                  {periodos.map((p) => {
                    const k = `${s.id}|${p}`
                    const editada = k in celdas
                    return (
                      <td key={p} className="px-0.5 py-0.5 border-b border-borde-suave">
                        <input
                          type="number"
                          className={`w-full monto text-right text-[11px] px-1 py-1 rounded border ${editada ? 'border-bp bg-bp-soft/50' : 'border-transparent bg-transparent hover:border-borde'} focus:outline-1 focus:outline-bp`}
                          value={valorDe(s.id, p)}
                          placeholder="—"
                          aria-label={`${s.nombre} ${mesLabel(p)}`}
                          onChange={(e) => setCeldas((c) => ({ ...c, [k]: e.target.value }))}
                          onDoubleClick={() => copiarAlAno(s.id, p)}
                        />
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Carta>
    </div>
  )
}

export default function Presupuesto() {
  const [tab, setTab] = useState('ejecucion')
  const [anio, setAnio] = useState(new Date().getFullYear())

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-4">
          <h1 className="text-[17px] font-bold tracking-tight">Presupuesto</h1>
          <div className="flex items-center gap-1 bg-carta border border-borde rounded-lg p-0.5">
            {[['ejecucion', 'Cómo vamos'], ['cargar', 'Cargar presupuesto']].map(([k, l]) => (
              <button key={k} type="button" onClick={() => setTab(k)}
                className={`px-2.5 py-1 rounded-md text-[11.5px] font-semibold cursor-pointer transition-colors ${tab === k ? 'bg-bp-soft text-bp-dark' : 'text-gris hover:text-tinta'}`}>
                {l}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {[anio - 1, anio, anio + 1].map((a) => (
            <button key={a} type="button" onClick={() => setAnio(a)}
              className={`px-2 py-1 rounded-md text-[11.5px] font-semibold cursor-pointer monto ${a === anio ? 'bg-bp-soft text-bp-dark' : 'text-gris hover:text-tinta'}`}>
              {a}
            </button>
          ))}
        </div>
      </div>
      {tab === 'ejecucion' ? <TabEjecucion anio={anio} /> : <TabCargar anio={anio} />}
    </div>
  )
}
