/**
 * Documentos y provisiones: la afirmación de "esta plata fue (o va a ser) esto".
 *
 * Provisiones ("sé que me van a facturar tal fecha"), respaldos (plata sin DTE) y
 * las facturas reales que cierran el ciclo. El estado siempre es calculado, y la
 * alerta que importa es "no te han facturado".
 */
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../../services/api'
import {
  Carta, Tabla, Th, Td, Badge, EstadoDoc, clp, uf, fecha, mesLabel,
  Cargando, Vacio, Boton, Modal, Campo, Input, Select,
} from '../ui'

const invalidar = (qc) => {
  qc.invalidateQueries({ queryKey: ['erp-documentos'] })
  qc.invalidateQueries({ queryKey: ['erp-dashboard'] })
  qc.invalidateQueries({ queryKey: ['erp-conciliacion'] })
}

function useCatalogos() {
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
  const subcuentas = (cuentas?.arbol || []).flatMap((r) => [
    ...(r.subcuentas.length ? [] : [r]),
    ...r.subcuentas.map((s) => ({ ...s, grupo: r.nombre })),
  ])
  return { subcuentas, proveedores: proveedores || [] }
}

function SelectCuenta({ value, onChange, subcuentas }) {
  return (
    <Select value={value} onChange={onChange}>
      <option value="">Sin clasificar</option>
      {subcuentas.map((c) => <option key={c.id} value={c.id}>{c.grupo ? `${c.grupo} · ` : ''}{c.nombre}</option>)}
    </Select>
  )
}

// ─── Provisiones y respaldos ──────────────────────────────────

function ModalProvision({ onCerrar }) {
  const qc = useQueryClient()
  const { subcuentas, proveedores } = useCatalogos()
  const [form, setForm] = useState({ descripcion: '', fechaEsperada: '', montoUF: '', montoCLP: '', cuentaId: '', proveedorId: '' })

  const crear = useMutation({
    mutationFn: () => api.post('/erp/documentos', form).then((r) => r.data),
    onSuccess: () => { invalidar(qc); toast.success('Provisión creada.'); onCerrar() },
    onError: (e) => toast.error(e.response?.data?.error || 'No se pudo crear.'),
  })

  return (
    <Modal abierto onCerrar={onCerrar} titulo="Nueva provisión">
      <p className="text-[11.5px] text-gris mb-3">
        "Sé que me van a facturar tal fecha tal cosa." Cuando llegue la factura real se asocia;
        si la fecha pasa sin factura, el sistema avisa.
      </p>
      <div className="space-y-3">
        <Campo label="Qué es"><Input autoFocus value={form.descripcion} onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))} placeholder="Ej: Asesoría legal septiembre" /></Campo>
        <div className="grid grid-cols-3 gap-3">
          <Campo label="Fecha esperada"><Input type="date" value={form.fechaEsperada} onChange={(e) => setForm((f) => ({ ...f, fechaEsperada: e.target.value }))} /></Campo>
          <Campo label="Monto UF"><Input type="number" step="0.01" value={form.montoUF} onChange={(e) => setForm((f) => ({ ...f, montoUF: e.target.value, montoCLP: '' }))} placeholder="—" /></Campo>
          <Campo label="o Monto $"><Input type="number" value={form.montoCLP} onChange={(e) => setForm((f) => ({ ...f, montoCLP: e.target.value, montoUF: '' }))} placeholder="—" /></Campo>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Campo label="Cuenta del plan"><SelectCuenta value={form.cuentaId} onChange={(e) => setForm((f) => ({ ...f, cuentaId: e.target.value }))} subcuentas={subcuentas} /></Campo>
          <Campo label="Proveedor (opcional)">
            <Select value={form.proveedorId} onChange={(e) => setForm((f) => ({ ...f, proveedorId: e.target.value }))}>
              <option value="">—</option>
              {proveedores.map((p) => <option key={p.id} value={p.id}>{p.razonSocial}</option>)}
            </Select>
          </Campo>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Boton onClick={onCerrar}>Cancelar</Boton>
          <Boton variante="primario" disabled={crear.isPending || !form.descripcion.trim() || !form.fechaEsperada || (!form.montoUF && !form.montoCLP)} onClick={() => crear.mutate()}>Crear provisión</Boton>
        </div>
      </div>
    </Modal>
  )
}

/** Asociar la factura real a una provisión (o registrarla al vuelo). */
function ModalAsociar({ doc, onCerrar }) {
  const qc = useQueryClient()
  const { subcuentas, proveedores } = useCatalogos()
  const [modo, setModo] = useState('nueva') // nueva | existente
  const [facturaId, setFacturaId] = useState('')
  const [form, setForm] = useState({
    folio: '', proveedorId: doc.proveedorId || '', fechaEmision: '', fechaVencimiento: '',
    total: doc.montoEstimadoCLP || '', iva: '', cuentaId: doc.cuentaId || '',
  })

  const { data: facturas } = useQuery({
    queryKey: ['erp-facturas'],
    queryFn: () => api.get('/erp/facturas-compra').then((r) => r.data),
    staleTime: 60000,
  })
  const sinDoc = (facturas || []).filter((f) => !f.documentoInterno)

  const asociar = useMutation({
    mutationFn: () => api.post(`/erp/documentos/${doc.id}/asociar-factura`, { facturaCompraId: Number(facturaId) }).then((r) => r.data),
    onSuccess: () => { invalidar(qc); toast.success('Factura asociada: la provisión quedó respaldada.'); onCerrar() },
    onError: (e) => toast.error(e.response?.data?.error || 'No se pudo asociar.'),
  })

  const crearYAsociar = useMutation({
    mutationFn: () => api.post('/erp/facturas-compra', { ...form, documentoInternoId: doc.id }).then((r) => r.data),
    onSuccess: () => { invalidar(qc); qc.invalidateQueries({ queryKey: ['erp-facturas'] }); toast.success('Factura registrada y asociada.'); onCerrar() },
    onError: (e) => toast.error(e.response?.data?.error || 'No se pudo registrar.'),
  })

  return (
    <Modal abierto onCerrar={onCerrar} titulo={`Ya me facturaron: ${doc.descripcion}`}>
      <div className="flex items-center gap-1 bg-fondo border border-borde rounded-lg p-0.5 mb-3 w-fit">
        {[['nueva', 'Registrar factura'], ['existente', 'Elegir una cargada']].map(([k, l]) => (
          <button key={k} type="button" onClick={() => setModo(k)}
            className={`px-2.5 py-1 rounded-md text-[11.5px] font-semibold cursor-pointer ${modo === k ? 'bg-carta shadow-carta text-bp-dark' : 'text-gris'}`}>
            {l}
          </button>
        ))}
      </div>

      {modo === 'existente' ? (
        <div className="space-y-3">
          <Campo label="Factura de compra">
            <Select value={facturaId} onChange={(e) => setFacturaId(e.target.value)}>
              <option value="">Elegir…</option>
              {sinDoc.map((f) => <option key={f.id} value={f.id}>N° {f.folio} · {f.proveedor?.razonSocial} · {clp(f.total)}</option>)}
            </Select>
          </Campo>
          <div className="flex justify-end gap-2"><Boton onClick={onCerrar}>Cancelar</Boton>
            <Boton variante="primario" disabled={!facturaId || asociar.isPending} onClick={() => asociar.mutate()}>Asociar</Boton></div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Campo label="Proveedor">
              <Select value={form.proveedorId} onChange={(e) => setForm((f) => ({ ...f, proveedorId: e.target.value }))}>
                <option value="">Elegir…</option>
                {proveedores.map((p) => <option key={p.id} value={p.id}>{p.razonSocial}</option>)}
              </Select>
            </Campo>
            <Campo label="Folio"><Input value={form.folio} onChange={(e) => setForm((f) => ({ ...f, folio: e.target.value }))} /></Campo>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Campo label="Emisión"><Input type="date" value={form.fechaEmision} onChange={(e) => setForm((f) => ({ ...f, fechaEmision: e.target.value }))} /></Campo>
            <Campo label="Vencimiento"><Input type="date" value={form.fechaVencimiento} onChange={(e) => setForm((f) => ({ ...f, fechaVencimiento: e.target.value }))} /></Campo>
            <Campo label="Total $"><Input type="number" value={form.total} onChange={(e) => setForm((f) => ({ ...f, total: e.target.value }))} /></Campo>
          </div>
          <Campo label="Cuenta del plan"><SelectCuenta value={form.cuentaId} onChange={(e) => setForm((f) => ({ ...f, cuentaId: e.target.value }))} subcuentas={subcuentas} /></Campo>
          <div className="flex justify-end gap-2"><Boton onClick={onCerrar}>Cancelar</Boton>
            <Boton variante="primario" disabled={crearYAsociar.isPending || !form.folio || !form.proveedorId || !form.fechaEmision || !form.total}
              onClick={() => crearYAsociar.mutate()}>Registrar y asociar</Boton></div>
        </div>
      )}
    </Modal>
  )
}

function TabDocumentos() {
  const [params, setParams] = useSearchParams()
  const estado = params.get('estado') || ''
  const [modalNueva, setModalNueva] = useState(false)
  const [asociando, setAsociando] = useState(null)
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['erp-documentos', 'lista'],
    queryFn: () => api.get('/erp/documentos').then((r) => r.data),
    staleTime: 30000,
  })

  const eliminar = useMutation({
    mutationFn: (id) => api.delete(`/erp/documentos/${id}`).then((r) => r.data),
    onSuccess: () => { invalidar(qc); toast.success('Documento eliminado.') },
    onError: (e) => toast.error(e.response?.data?.error || 'No se pudo eliminar.'),
  })

  const docs = (data?.documentos || []).filter((d) => !estado || d.estado === estado)
  const FILTROS = [['', 'Todos'], ['ESPERADO', 'Esperados'], ['VENCIDO_SIN_FACTURA', 'Sin factura ⚠'], ['FACTURADO_SIN_PAGO', 'Por pagar'], ['CERRADO', 'Cerrados']]

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1 bg-carta border border-borde rounded-lg p-0.5">
          {FILTROS.map(([k, l]) => (
            <button key={k} type="button" onClick={() => setParams(k ? { estado: k } : {})}
              className={`px-2.5 py-1 rounded-md text-[11.5px] font-semibold cursor-pointer transition-colors ${estado === k ? 'bg-bp-soft text-bp-dark' : 'text-gris hover:text-tinta'}`}>
              {l}
            </button>
          ))}
        </div>
        <Boton variante="primario" size="sm" onClick={() => setModalNueva(true)}>+ Provisión</Boton>
      </div>

      <Carta>
        {isLoading ? <Cargando /> : !docs.length ? (
          <Vacio>No hay documentos con ese estado. Las provisiones se generan solas desde los gastos programados.</Vacio>
        ) : (
          <Tabla>
            <thead><tr><Th>Documento</Th><Th>Cuenta</Th><Th>Período</Th><Th>Fecha esperada</Th><Th num>Monto</Th><Th num>Pagado</Th><Th>Estado</Th><Th /></tr></thead>
            <tbody>
              {docs.map((d) => (
                <tr key={d.id} className="hover:bg-borde-suave/50">
                  <Td>
                    <span className="font-medium">{d.descripcion}</span>
                    <span className="block text-[10.5px] text-sutil">
                      {d.tipo === 'PROVISION' ? 'Provisión' : 'Respaldo'}
                      {d.proveedor && ` · ${d.proveedor.razonSocial}`}
                      {d.facturaCompra && ` · Factura N° ${d.facturaCompra.folio}`}
                    </span>
                  </Td>
                  <Td>{d.cuenta ? <Badge tono="azul">{d.cuenta.nombre}</Badge> : <span className="text-sutil">—</span>}</Td>
                  <Td className="monto">{d.periodo ? mesLabel(d.periodo) : '—'}</Td>
                  <Td className="monto">{fecha(d.fechaEsperada)}</Td>
                  <Td num className="font-semibold">{d.montoUF ? uf(d.montoUF) : clp(d.montoCLP)}</Td>
                  <Td num className={d.pagado > 0 ? 'text-abono font-semibold' : 'text-sutil'}>{d.pagado > 0 ? clp(d.pagado) : '—'}</Td>
                  <Td><EstadoDoc estado={d.estado} /></Td>
                  <Td className="whitespace-nowrap">
                    {d.tipo === 'PROVISION' && !d.facturaCompraId && d.estado !== 'CERRADO' && (
                      <Boton size="sm" onClick={() => setAsociando(d)}>Ya me facturaron</Boton>
                    )}
                    {!d.conciliaciones?.length && !d.facturaCompraId && (
                      <Boton size="sm" variante="fantasma" onClick={() => { if (confirm('¿Eliminar este documento?')) eliminar.mutate(d.id) }}>✕</Boton>
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Tabla>
        )}
      </Carta>
      {modalNueva && <ModalProvision onCerrar={() => setModalNueva(false)} />}
      {asociando && <ModalAsociar doc={asociando} onCerrar={() => setAsociando(null)} />}
    </div>
  )
}

// ─── Gastos programados ───────────────────────────────────────

function ModalGasto({ gasto, onCerrar }) {
  const qc = useQueryClient()
  const { subcuentas, proveedores } = useCatalogos()
  const [form, setForm] = useState(gasto ? {
    nombre: gasto.nombre, cuentaId: gasto.cuentaId || '', proveedorId: gasto.proveedorId || '',
    montoUF: gasto.montoUF || '', montoCLP: gasto.montoCLP || '', periodicidad: gasto.periodicidad,
    diaVencimiento: gasto.diaVencimiento || '', fechaInicio: gasto.fechaInicio?.slice(0, 10) || '', fechaFin: gasto.fechaFin?.slice(0, 10) || '',
  } : { nombre: '', cuentaId: '', proveedorId: '', montoUF: '', montoCLP: '', periodicidad: 'MENSUAL', diaVencimiento: '', fechaInicio: '', fechaFin: '' })

  const guardar = useMutation({
    mutationFn: () => (gasto
      ? api.put(`/erp/gastos/${gasto.id}`, form)
      : api.post('/erp/gastos', form)
    ).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['erp-gastos'] }); invalidar(qc); toast.success('Gasto guardado; sus provisiones se generan solas.'); onCerrar() },
    onError: (e) => toast.error(e.response?.data?.error || 'No se pudo guardar.'),
  })

  return (
    <Modal abierto onCerrar={onCerrar} titulo={gasto ? `Editar: ${gasto.nombre}` : 'Nuevo gasto programado'}>
      <div className="space-y-3">
        <Campo label="Nombre"><Input autoFocus value={form.nombre} onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))} placeholder="Ej: Arriendo oficina" /></Campo>
        <div className="grid grid-cols-2 gap-3">
          <Campo label="Cuenta del plan"><SelectCuenta value={form.cuentaId} onChange={(e) => setForm((f) => ({ ...f, cuentaId: e.target.value }))} subcuentas={subcuentas} /></Campo>
          <Campo label="Proveedor">
            <Select value={form.proveedorId} onChange={(e) => setForm((f) => ({ ...f, proveedorId: e.target.value }))}>
              <option value="">—</option>
              {proveedores.map((p) => <option key={p.id} value={p.id}>{p.razonSocial}</option>)}
            </Select>
          </Campo>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Campo label="Monto UF"><Input type="number" step="0.01" value={form.montoUF} onChange={(e) => setForm((f) => ({ ...f, montoUF: e.target.value, montoCLP: '' }))} /></Campo>
          <Campo label="o Monto $"><Input type="number" value={form.montoCLP} onChange={(e) => setForm((f) => ({ ...f, montoCLP: e.target.value, montoUF: '' }))} /></Campo>
          <Campo label="Día de pago"><Input type="number" min={1} max={31} value={form.diaVencimiento} onChange={(e) => setForm((f) => ({ ...f, diaVencimiento: e.target.value }))} /></Campo>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Campo label="Periodicidad">
            <Select value={form.periodicidad} onChange={(e) => setForm((f) => ({ ...f, periodicidad: e.target.value }))}>
              {['MENSUAL', 'BIMESTRAL', 'TRIMESTRAL', 'SEMESTRAL', 'ANUAL', 'UNICO'].map((p) => <option key={p} value={p}>{p.toLowerCase()}</option>)}
            </Select>
          </Campo>
          <Campo label="Desde"><Input type="date" value={form.fechaInicio} onChange={(e) => setForm((f) => ({ ...f, fechaInicio: e.target.value }))} /></Campo>
          <Campo label="Hasta (opcional)"><Input type="date" value={form.fechaFin} onChange={(e) => setForm((f) => ({ ...f, fechaFin: e.target.value }))} /></Campo>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Boton onClick={onCerrar}>Cancelar</Boton>
          <Boton variante="primario" disabled={guardar.isPending || !form.nombre.trim() || !form.fechaInicio || (!form.montoUF && !form.montoCLP)} onClick={() => guardar.mutate()}>Guardar</Boton>
        </div>
      </div>
    </Modal>
  )
}

function TabGastos() {
  const [editando, setEditando] = useState(null) // null | 'nuevo' | gasto
  const { data: gastos, isLoading } = useQuery({
    queryKey: ['erp-gastos'],
    queryFn: () => api.get('/erp/gastos').then((r) => r.data),
    staleTime: 60000,
  })

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <p className="text-[11.5px] text-gris">Las plantillas de lo que se sabe que viene. Cada mes generan su provisión sola.</p>
        <Boton variante="primario" size="sm" onClick={() => setEditando('nuevo')}>+ Gasto programado</Boton>
      </div>
      <Carta>
        {isLoading ? <Cargando /> : !gastos?.length ? (
          <Vacio>Sin gastos programados. El arriendo, la contabilidad, un seguro: lo que llega todos los meses.</Vacio>
        ) : (
          <Tabla>
            <thead><tr><Th>Gasto</Th><Th>Cuenta</Th><Th>Periodicidad</Th><Th num>Monto</Th><Th num>≈ $</Th><Th /></tr></thead>
            <tbody>
              {gastos.map((g) => (
                <tr key={g.id} className={`hover:bg-borde-suave/50 ${!g.activo ? 'opacity-50' : ''}`}>
                  <Td>
                    <span className="font-medium">{g.nombre}</span>
                    <span className="block text-[10.5px] text-sutil">{g.proveedor?.razonSocial || g.proveedorTexto || ''}</span>
                  </Td>
                  <Td>{g.cuenta ? <Badge tono="azul">{g.cuenta.nombre}</Badge> : <span className="text-sutil">—</span>}</Td>
                  <Td className="lowercase">{g.periodicidad}{g.diaVencimiento ? ` · día ${g.diaVencimiento}` : ''}</Td>
                  <Td num className="font-semibold">{g.montoUF ? uf(g.montoUF) : clp(g.montoCLP)}</Td>
                  <Td num className="text-gris">{clp(g.montoEstimadoCLP)}</Td>
                  <Td><Boton size="sm" variante="fantasma" onClick={() => setEditando(g)}>Editar</Boton></Td>
                </tr>
              ))}
            </tbody>
          </Tabla>
        )}
      </Carta>
      {editando && <ModalGasto gasto={editando === 'nuevo' ? null : editando} onCerrar={() => setEditando(null)} />}
    </div>
  )
}

// ─── Facturas ─────────────────────────────────────────────────

function TabFacturas() {
  const { data: facturas, isLoading } = useQuery({
    queryKey: ['erp-facturas'],
    queryFn: () => api.get('/erp/facturas-compra').then((r) => r.data),
    staleTime: 30000,
  })

  return (
    <Carta>
      {isLoading ? <Cargando /> : !facturas?.length ? (
        <Vacio>Sin facturas registradas. Se registran desde una provisión ("Ya me facturaron") o acá cuando llegan sueltas.</Vacio>
      ) : (
        <Tabla>
          <thead><tr><Th>Folio</Th><Th>Proveedor</Th><Th>Cuenta</Th><Th>Emisión</Th><Th>Vence</Th><Th num>Total</Th><Th num>Saldo</Th><Th>Estado</Th></tr></thead>
          <tbody>
            {facturas.map((f) => (
              <tr key={f.id} className="hover:bg-borde-suave/50">
                <Td className="monto font-medium">N° {f.folio}</Td>
                <Td>{f.proveedor?.razonSocial}</Td>
                <Td>{f.cuenta ? <Badge tono="azul">{f.cuenta.nombre}</Badge> : <span className="text-sutil">—</span>}</Td>
                <Td className="monto">{fecha(f.fechaEmision)}</Td>
                <Td className="monto">{fecha(f.fechaVencimiento)}</Td>
                <Td num className="font-semibold">{clp(f.total)}</Td>
                <Td num className={f.saldoPorPagar > 0 ? 'text-cargo font-semibold' : 'text-sutil'}>{clp(f.saldoPorPagar)}</Td>
                <Td>
                  {f.pagada ? <Badge tono="verde">Pagada</Badge> : <Badge tono="ambar">Por pagar</Badge>}
                  {f.documentoInterno && <span className="block text-[10px] text-sutil mt-0.5">respalda: {f.documentoInterno.descripcion}</span>}
                </Td>
              </tr>
            ))}
          </tbody>
        </Tabla>
      )}
    </Carta>
  )
}

export default function Documentos() {
  const [tab, setTab] = useState('documentos')
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 flex-wrap">
        <h1 className="text-[17px] font-bold tracking-tight">Documentos</h1>
        <div className="flex items-center gap-1 bg-carta border border-borde rounded-lg p-0.5">
          {[['documentos', 'Provisiones y respaldos'], ['gastos', 'Gastos programados'], ['facturas', 'Facturas']].map(([k, l]) => (
            <button key={k} type="button" onClick={() => setTab(k)}
              className={`px-2.5 py-1 rounded-md text-[11.5px] font-semibold cursor-pointer transition-colors ${tab === k ? 'bg-bp-soft text-bp-dark' : 'text-gris hover:text-tinta'}`}>
              {l}
            </button>
          ))}
        </div>
      </div>
      {tab === 'documentos' ? <TabDocumentos /> : tab === 'gastos' ? <TabGastos /> : <TabFacturas />}
    </div>
  )
}
