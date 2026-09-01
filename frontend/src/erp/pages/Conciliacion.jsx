/**
 * La bandeja de conciliación — el corazón del ERP.
 *
 * Cada movimiento sin destino, con su contraparte y las sugerencias del matcher
 * (score + motivos). Todo movimiento tiene un camino: una sugerencia, un
 * documento creado al vuelo (el caso notaría), la cuenta de un cliente, o
 * marcarlo interno. El matcher propone; la persona confirma.
 */
import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { BoltIcon } from '@heroicons/react/24/outline'
import api from '../../services/api'
import { Carta, Badge, Score, Monto, clp, fecha, Cargando, Vacio, Boton, Modal, Campo, Input, Select } from '../ui'

const invalidar = (qc) => {
  qc.invalidateQueries({ queryKey: ['erp-conciliacion'] })
  qc.invalidateQueries({ queryKey: ['erp-banco'] })
  qc.invalidateQueries({ queryKey: ['erp-dashboard'] })
  qc.invalidateQueries({ queryKey: ['erp-documentos'] })
}

/** Modal "crear documento y conciliar": pagué algo y no tengo documento que subir. */
function ModalDocumento({ mov, onCerrar }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({ descripcion: '', cuentaId: '', proveedorId: '', monto: Math.round(mov.saldoPendiente) })

  const { data: cuentas } = useQuery({
    queryKey: ['erp-cuentas'],
    queryFn: () => api.get('/erp/cuentas').then((r) => r.data),
    staleTime: 300000,
  })
  const { data: proveedores } = useQuery({
    queryKey: ['erp-proveedores'],
    queryFn: () => api.get('/erp/proveedores').then((r) => r.data),
    staleTime: 300000,
  })
  // El formulario se pre-llena según el historial: "esta misma glosa se clasificó antes como…"
  useQuery({
    queryKey: ['erp-conciliacion', 'historial', mov.id],
    queryFn: async () => {
      const { data } = await api.get('/erp/conciliacion/historial-sugerencia', { params: { movimientoId: mov.id } })
      const s = data?.sugerencia
      if (s) {
        setForm((f) => ({
          ...f,
          descripcion: f.descripcion || s.descripcion || '',
          cuentaId: f.cuentaId || (s.cuentaId ?? ''),
          proveedorId: f.proveedorId || (s.proveedorId ?? ''),
        }))
        toast(s.motivo, { icon: '💡', id: `hist-${mov.id}` })
      }
      return data
    },
    staleTime: Infinity,
  })

  const crear = useMutation({
    mutationFn: () => api.post('/erp/conciliacion/documento', {
      movimientoId: mov.id,
      descripcion: form.descripcion,
      cuentaId: form.cuentaId || null,
      proveedorId: form.proveedorId || null,
      monto: Number(form.monto),
    }).then((r) => r.data),
    onSuccess: () => { invalidar(qc); toast.success('Documento creado y conciliado.'); onCerrar() },
    onError: (e) => toast.error(e.response?.data?.error || 'No se pudo crear el documento.'),
  })

  const subcuentas = (cuentas?.arbol || []).flatMap((r) => [
    ...(r.subcuentas.length ? [] : [r]),
    ...r.subcuentas.map((s) => ({ ...s, grupo: r.nombre })),
  ])

  return (
    <Modal abierto onCerrar={onCerrar} titulo="Crear documento y conciliar">
      <p className="text-[11.5px] text-gris mb-3">
        El documento ficticio para la plata sin factura (una notaría, una comisión bancaria).
        Queda amarrado a este movimiento: <span className="font-medium text-tinta">{mov.glosa}</span>
      </p>
      <div className="space-y-3">
        <Campo label="Qué fue esta plata">
          <Input autoFocus value={form.descripcion} placeholder="Ej: Gastos notariales promesa Aldunate"
            onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))} />
        </Campo>
        <div className="grid grid-cols-2 gap-3">
          <Campo label="Cuenta del plan">
            <Select value={form.cuentaId} onChange={(e) => setForm((f) => ({ ...f, cuentaId: e.target.value }))}>
              <option value="">Sin clasificar</option>
              {subcuentas.map((c) => <option key={c.id} value={c.id}>{c.grupo ? `${c.grupo} · ` : ''}{c.nombre}</option>)}
            </Select>
          </Campo>
          <Campo label="Proveedor (opcional)">
            <Select value={form.proveedorId} onChange={(e) => setForm((f) => ({ ...f, proveedorId: e.target.value }))}>
              <option value="">—</option>
              {(proveedores || []).map((p) => <option key={p.id} value={p.id}>{p.razonSocial}</option>)}
            </Select>
          </Campo>
        </div>
        <Campo label={`Monto a imputar (disponible ${clp(mov.saldoPendiente)})`}>
          <Input type="number" value={form.monto} min={1} max={Math.round(mov.saldoPendiente)}
            onChange={(e) => setForm((f) => ({ ...f, monto: e.target.value }))} />
        </Campo>
        <div className="flex justify-end gap-2 pt-1">
          <Boton onClick={onCerrar}>Cancelar</Boton>
          <Boton variante="primario" disabled={!form.descripcion.trim() || crear.isPending} onClick={() => crear.mutate()}>
            {crear.isPending ? 'Guardando…' : 'Crear y conciliar'}
          </Boton>
        </div>
      </div>
    </Modal>
  )
}

function FilaMovimiento({ mov }) {
  const qc = useQueryClient()
  const [modalDoc, setModalDoc] = useState(false)

  const conciliarSug = useMutation({
    mutationFn: (s) => api.post('/erp/conciliacion', {
      movimientoId: mov.id,
      cuotaId: s.cuotaId, pagoArriendoId: s.pagoArriendoId,
      facturaCompraId: s.facturaCompraId, documentoInternoId: s.documentoInternoId,
      confianza: s.score,
    }).then((r) => r.data),
    onSuccess: () => { invalidar(qc); toast.success('Conciliado.') },
    onError: (e) => toast.error(e.response?.data?.error || 'No se pudo conciliar.'),
  })

  const aCuenta = useMutation({
    mutationFn: () => api.post('/erp/conciliacion', { movimientoId: mov.id, contactoId: mov.contraparte?.id }).then((r) => r.data),
    onSuccess: () => { invalidar(qc); toast.success('Imputado a la cuenta del cliente.') },
    onError: (e) => toast.error(e.response?.data?.error || 'No se pudo imputar.'),
  })

  const ignorar = useMutation({
    mutationFn: () => api.patch(`/erp/banco/movimientos/${mov.id}`, { ignorado: true }).then((r) => r.data),
    onSuccess: () => { invalidar(qc); toast.success('Fuera del radar de conciliación.') },
  })

  const c = mov.contraparte

  return (
    <div className="border-b border-borde-suave last:border-0 px-4 py-3 hover:bg-borde-suave/40">
      <div className="flex items-start gap-3 flex-wrap">
        <div className="w-16 shrink-0">
          <div className="monto text-[11.5px] text-sutil">{fecha(mov.fecha)}</div>
          <Monto valor={mov.monto} className="text-[14px] font-bold block" />
          {mov.saldoPendiente < Math.abs(mov.monto) - 500 && (
            <div className="text-[10px] text-sutil monto">quedan {clp(mov.saldoPendiente)}</div>
          )}
        </div>
        <div className="flex-1 min-w-[240px]">
          <div className="text-[12.5px] truncate" title={mov.glosa}>{mov.glosa}</div>
          <div className="mt-0.5 flex items-center gap-1.5 flex-wrap text-[11px]">
            {c ? (
              <>
                <Badge tono={c.sugerida ? 'gris' : 'azul'} title={c.sugerida ? `Propuesta (${c.como})` : 'Identificada'}>
                  {c.sugerida ? '¿' : ''}{c.nombre}{c.sugerida ? '?' : ''}
                </Badge>
                {c.telefono && <span className="text-sutil monto">{c.telefono}</span>}
              </>
            ) : <span className="text-sutil">Contraparte sin identificar</span>}
          </div>
          {/* Sugerencias */}
          {mov.sugerencias?.length > 0 && (
            <ul className="mt-2 space-y-1">
              {mov.sugerencias.slice(0, 3).map((s, i) => (
                <li key={i} className="flex items-center gap-2 text-[11.5px]">
                  <Score valor={s.score} motivos={s.motivos} />
                  <span className="flex-1 truncate">
                    {s.etiqueta} · {s.nombre}
                    {s.cuenta && <span className="text-sutil"> · {s.cuenta}</span>}
                    <span className="text-sutil monto"> · {clp(s.saldoPorCobrar)}</span>
                  </span>
                  <Boton size="sm" variante={i === 0 ? 'verde' : 'normal'} disabled={conciliarSug.isPending}
                    onClick={() => conciliarSug.mutate(s)}>
                    Conciliar
                  </Boton>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {mov.lado === 'CARGO' && (
            <Boton size="sm" onClick={() => setModalDoc(true)}>+ Documento</Boton>
          )}
          {mov.lado === 'ABONO' && c && !c.sugerida && c.tipo === 'cliente' && (
            <Boton size="sm" onClick={() => aCuenta.mutate()} disabled={aCuenta.isPending} title="Plata del cliente sin destino todavía">
              A cuenta
            </Boton>
          )}
          {mov.lado === 'ABONO' && (!c || c.sugerida) && (
            <Boton size="sm" onClick={() => setModalDoc(true)}>+ Documento</Boton>
          )}
          <Boton size="sm" variante="fantasma" onClick={() => ignorar.mutate()} title="Traspasos propios, fuera del radar">
            Ignorar
          </Boton>
        </div>
      </div>
      {modalDoc && <ModalDocumento mov={mov} onCerrar={() => setModalDoc(false)} />}
    </div>
  )
}

export default function Conciliacion() {
  const [params, setParams] = useSearchParams()
  const lado = params.get('lado') || 'todos'
  const qc = useQueryClient()

  const { data: resumen } = useQuery({
    queryKey: ['erp-conciliacion', 'resumen'],
    queryFn: () => api.get('/erp/conciliacion/resumen').then((r) => r.data),
    staleTime: 30000,
  })
  const { data: bandeja, isLoading } = useQuery({
    queryKey: ['erp-conciliacion', 'bandeja', lado],
    queryFn: () => api.get('/erp/conciliacion/por-conciliar', { params: lado !== 'todos' ? { lado } : {} }).then((r) => r.data),
    staleTime: 30000,
  })

  const automatica = useMutation({
    mutationFn: () => api.post('/erp/conciliacion/automatica', {}).then((r) => r.data),
    onSuccess: (r) => {
      invalidar(qc)
      toast.success(`${r.conciliadas} conciliadas solas (${r.ambiguos} ambiguas quedaron para ti).`, { duration: 6000 })
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Error en la conciliación automática.'),
  })

  const filas = useMemo(() => bandeja || [], [bandeja])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-4">
          <h1 className="text-[17px] font-bold tracking-tight">Conciliación</h1>
          <div className="flex items-center gap-1 bg-carta border border-borde rounded-lg p-0.5">
            {[['todos', 'Todos'], ['abonos', 'Abonos'], ['cargos', 'Cargos']].map(([k, l]) => (
              <button key={k} type="button" onClick={() => setParams(k === 'todos' ? {} : { lado: k })}
                className={`px-2.5 py-1 rounded-md text-[11.5px] font-semibold cursor-pointer transition-colors ${lado === k ? 'bg-bp-soft text-bp-dark' : 'text-gris hover:text-tinta'}`}>
                {l}
              </button>
            ))}
          </div>
        </div>
        <Boton variante="primario" size="sm" onClick={() => automatica.mutate()} disabled={automatica.isPending}>
          <BoltIcon className="w-3.5 h-3.5" aria-hidden="true" />
          {automatica.isPending ? 'Cruzando…' : 'Conciliar automático'}
        </Boton>
      </div>

      {resumen && (
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-[11.5px] text-gris">
          <span><span className="monto font-semibold text-abono">{clp(resumen.abonosSinConciliar.monto)}</span> en {resumen.abonosSinConciliar.cantidad} abonos sin conciliar</span>
          <span><span className="monto font-semibold text-cargo">{clp(resumen.cargosSinDocumento.monto)}</span> en {resumen.cargosSinDocumento.cantidad} cargos sin documento</span>
          <span><span className="monto font-semibold">{clp(resumen.cuotasPorCobrar.monto)}</span> en cuotas por cobrar</span>
          <span><span className="monto font-semibold">{clp(resumen.documentosAbiertos.monto + resumen.comprasAbiertas.monto)}</span> en documentos abiertos</span>
        </div>
      )}

      <Carta>
        {isLoading ? <Cargando alto="h-56" /> : !filas.length ? (
          <Vacio>Nada por conciliar con este filtro. Cada peso del banco tiene su documento. 🎯</Vacio>
        ) : (
          filas.map((m) => <FilaMovimiento key={m.id} mov={m} />)
        )}
      </Carta>
    </div>
  )
}
