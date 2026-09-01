/**
 * Configuración del ERP: contrapartes por identificar, plan de cuentas,
 * proveedores, reglas de conciliación automática y cuentas bancarias.
 */
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import api from '../../services/api'
import { Carta, Tabla, Th, Td, Badge, clp, fecha, Cargando, Vacio, Boton, Modal, Campo, Input, Select } from '../ui'

// ─── Contrapartes ─────────────────────────────────────────────

function TabContrapartes() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['erp-contrapartes'],
    queryFn: () => api.get('/erp/banco/contrapartes').then((r) => r.data),
    staleTime: 30000,
  })

  const invalidar = () => {
    qc.invalidateQueries({ queryKey: ['erp-contrapartes'] })
    qc.invalidateQueries({ queryKey: ['erp-banco'] })
    qc.invalidateQueries({ queryKey: ['erp-conciliacion'] })
  }

  const asignar = useMutation({
    mutationFn: (body) => api.post('/erp/banco/contrapartes', body).then((r) => r.data),
    onSuccess: (r) => { invalidar(); toast.success(`Aprendido: ${r.etiquetados} movimiento(s) etiquetados.`) },
    onError: (e) => toast.error(e.response?.data?.error || 'No se pudo asignar.'),
  })
  const reidentificar = useMutation({
    mutationFn: () => api.post('/erp/banco/contrapartes/reidentificar').then((r) => r.data),
    onSuccess: (r) => { invalidar(); toast.success(`${r.identificados} de ${r.revisados} identificados.`) },
  })

  if (isLoading || !data) return <Cargando />

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[11.5px] text-gris">
          {data.movimientosSinIdentificar} movimiento(s) sin contraparte. Identificar un nombre lo aprende para siempre.
        </p>
        <Boton size="sm" onClick={() => reidentificar.mutate()} disabled={reidentificar.isPending}>
          {reidentificar.isPending ? 'Cruzando…' : 'Identificar contrapartes'}
        </Boton>
      </div>
      <Carta>
        {!data.filas.length ? <Vacio>Todo el mundo está identificado.</Vacio> : (
          <Tabla>
            <thead><tr><Th>Nombre en el banco</Th><Th num>Veces</Th><Th num>Plata movida</Th><Th>Sugerencia</Th><Th /></tr></thead>
            <tbody>
              {data.filas.slice(0, 60).map((f) => (
                <tr key={f.clave} className="hover:bg-borde-suave/50">
                  <Td>
                    <span className="font-medium">{f.nombre}</span>
                    {f.pareceInterno && <Badge tono="gris" title="Entra y sale plata por el mismo nombre">¿interno?</Badge>}
                  </Td>
                  <Td num>{f.veces}</Td>
                  <Td num className="monto font-semibold">{clp(f.movido)}</Td>
                  <Td>
                    {f.sugerencia
                      ? <Badge tono="azul" title={f.sugerencia.como}>{f.sugerencia.tipo === 'CLIENTE' ? 'Cliente' : 'Proveedor'}: {f.sugerencia.nombre}</Badge>
                      : <span className="text-sutil">—</span>}
                  </Td>
                  <Td className="whitespace-nowrap">
                    {f.sugerencia && (
                      <Boton size="sm" variante="verde" disabled={asignar.isPending}
                        onClick={() => asignar.mutate({
                          nombre: f.nombre,
                          ...(f.sugerencia.tipo === 'CLIENTE' ? { contactoId: f.sugerencia.id } : { proveedorId: f.sugerencia.id }),
                        })}>
                        Confirmar
                      </Boton>
                    )}
                    <Boton size="sm" variante="fantasma" disabled={asignar.isPending}
                      onClick={() => asignar.mutate({ nombre: f.nombre, interno: true })}
                      title="Traspasos propios: ni cliente ni proveedor">
                      Interno
                    </Boton>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Tabla>
        )}
      </Carta>
    </div>
  )
}

// ─── Plan de cuentas ──────────────────────────────────────────

function TabCuentas() {
  const qc = useQueryClient()
  const [nueva, setNueva] = useState(null) // { padreId } | null
  const [nombre, setNombre] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['erp-cuentas'],
    queryFn: () => api.get('/erp/cuentas').then((r) => r.data),
    staleTime: 60000,
  })

  const crear = useMutation({
    mutationFn: (body) => api.post('/erp/cuentas', body).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['erp-cuentas'] }); setNueva(null); setNombre(''); toast.success('Cuenta creada.') },
    onError: (e) => toast.error(e.response?.data?.error || 'No se pudo crear.'),
  })

  if (isLoading || !data) return <Cargando />

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[11.5px] text-gris">Dos niveles: la cuenta grande y sus subcuentas. Cada documento se clasifica en una subcuenta.</p>
        <Boton size="sm" variante="primario" onClick={() => setNueva({ padreId: null })}>+ Cuenta grande</Boton>
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        {data.arbol.map((raiz) => (
          <Carta key={raiz.id} className="p-3.5">
            <div className="flex items-center justify-between mb-2">
              <span className="flex items-center gap-1.5 font-semibold text-[13px]">
                {raiz.color && <span className="w-2.5 h-2.5 rounded-full" style={{ background: raiz.color }} />}
                {raiz.nombre}
              </span>
              <Boton size="sm" variante="fantasma" onClick={() => setNueva({ padreId: raiz.id, grupo: raiz.nombre })}>+ subcuenta</Boton>
            </div>
            <ul className="space-y-1">
              {raiz.subcuentas.map((s) => (
                <li key={s.id} className="flex items-baseline justify-between text-[12px] px-2 py-1 rounded-md hover:bg-borde-suave">
                  <span>{s.nombre}</span>
                  <span className="text-[10px] text-sutil">
                    {(s._count?.documentosInternos || 0) + (s._count?.facturasCompra || 0)} docs
                  </span>
                </li>
              ))}
              {!raiz.subcuentas.length && <li className="text-[11px] text-sutil px-2">Sin subcuentas.</li>}
            </ul>
          </Carta>
        ))}
      </div>

      {nueva && (
        <Modal abierto onCerrar={() => setNueva(null)} titulo={nueva.padreId ? `Nueva subcuenta de ${nueva.grupo}` : 'Nueva cuenta grande'} ancho="max-w-sm">
          <div className="space-y-3">
            <Campo label="Nombre"><Input autoFocus value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder={nueva.padreId ? 'Ej: Seguros' : 'Ej: Operaciones'} /></Campo>
            <div className="flex justify-end gap-2">
              <Boton onClick={() => setNueva(null)}>Cancelar</Boton>
              <Boton variante="primario" disabled={!nombre.trim() || crear.isPending}
                onClick={() => crear.mutate({ nombre, padreId: nueva.padreId })}>Crear</Boton>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ─── Proveedores ──────────────────────────────────────────────

function TabProveedores() {
  const qc = useQueryClient()
  const [editando, setEditando] = useState(null) // null | 'nuevo' | proveedor
  const { data: proveedores, isLoading } = useQuery({
    queryKey: ['erp-proveedores'],
    queryFn: () => api.get('/erp/proveedores').then((r) => r.data),
    staleTime: 60000,
  })
  const { data: cuentas } = useQuery({
    queryKey: ['erp-cuentas'],
    queryFn: () => api.get('/erp/cuentas').then((r) => r.data),
    staleTime: 300000,
  })
  const subcuentas = (cuentas?.arbol || []).flatMap((r) => r.subcuentas.map((s) => ({ ...s, grupo: r.nombre })))

  const [form, setForm] = useState({ rut: '', razonSocial: '', cuentaId: '', diasPago: '' })
  const abrir = (p) => {
    setForm(p === 'nuevo' ? { rut: '', razonSocial: '', cuentaId: '', diasPago: '' } : { rut: p.rut, razonSocial: p.razonSocial, cuentaId: p.cuentaId || '', diasPago: p.diasPago || '' })
    setEditando(p)
  }

  const guardar = useMutation({
    mutationFn: () => (editando === 'nuevo'
      ? api.post('/erp/proveedores', form)
      : api.put(`/erp/proveedores/${editando.id}`, form)
    ).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['erp-proveedores'] }); setEditando(null); toast.success('Proveedor guardado.') },
    onError: (e) => toast.error(e.response?.data?.error || 'No se pudo guardar.'),
  })

  if (isLoading) return <Cargando />

  return (
    <div className="space-y-3">
      <div className="flex justify-end"><Boton size="sm" variante="primario" onClick={() => abrir('nuevo')}>+ Proveedor</Boton></div>
      <Carta>
        {!proveedores?.length ? <Vacio>Sin proveedores en el catálogo.</Vacio> : (
          <Tabla>
            <thead><tr><Th>Proveedor</Th><Th>RUT</Th><Th>Cuenta por defecto</Th><Th num>Facturado</Th><Th num>Por pagar</Th><Th /></tr></thead>
            <tbody>
              {proveedores.map((p) => (
                <tr key={p.id} className={`hover:bg-borde-suave/50 ${!p.activo ? 'opacity-50' : ''}`}>
                  <Td className="font-medium">{p.razonSocial}</Td>
                  <Td className="monto">{p.rut}</Td>
                  <Td>{p.cuenta ? <Badge tono="azul">{p.cuenta.nombre}</Badge> : <span className="text-sutil">—</span>}</Td>
                  <Td num className="monto">{clp(p.facturado)}</Td>
                  <Td num className={`monto ${p.porPagar > 0 ? 'text-cargo font-semibold' : 'text-sutil'}`}>{clp(p.porPagar)}</Td>
                  <Td><Boton size="sm" variante="fantasma" onClick={() => abrir(p)}>Editar</Boton></Td>
                </tr>
              ))}
            </tbody>
          </Tabla>
        )}
      </Carta>

      {editando && (
        <Modal abierto onCerrar={() => setEditando(null)} titulo={editando === 'nuevo' ? 'Nuevo proveedor' : editando.razonSocial} ancho="max-w-sm">
          <div className="space-y-3">
            <Campo label="RUT"><Input value={form.rut} onChange={(e) => setForm((f) => ({ ...f, rut: e.target.value }))} placeholder="76123456-7" /></Campo>
            <Campo label="Razón social"><Input value={form.razonSocial} onChange={(e) => setForm((f) => ({ ...f, razonSocial: e.target.value }))} /></Campo>
            <Campo label="Cuenta por defecto" hint="Sus documentos la heredan al clasificarse.">
              <Select value={form.cuentaId} onChange={(e) => setForm((f) => ({ ...f, cuentaId: e.target.value }))}>
                <option value="">—</option>
                {subcuentas.map((c) => <option key={c.id} value={c.id}>{c.grupo} · {c.nombre}</option>)}
              </Select>
            </Campo>
            <Campo label="Días de pago pactados"><Input type="number" value={form.diasPago} onChange={(e) => setForm((f) => ({ ...f, diasPago: e.target.value }))} placeholder="30" /></Campo>
            <div className="flex justify-end gap-2">
              <Boton onClick={() => setEditando(null)}>Cancelar</Boton>
              <Boton variante="primario" disabled={guardar.isPending || !form.rut || !form.razonSocial} onClick={() => guardar.mutate()}>Guardar</Boton>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ─── Reglas ───────────────────────────────────────────────────

function TabReglas() {
  const qc = useQueryClient()
  const [creando, setCreando] = useState(false)
  const [form, setForm] = useState({ nombre: '', patronGlosa: '', gastoProgramadoId: '', montoMin: '', montoMax: '', autoValidar: false })
  const [prueba, setPrueba] = useState(null)

  const { data: reglas, isLoading } = useQuery({
    queryKey: ['erp-reglas'],
    queryFn: () => api.get('/erp/reglas').then((r) => r.data),
    staleTime: 60000,
  })
  const { data: gastos } = useQuery({
    queryKey: ['erp-gastos'],
    queryFn: () => api.get('/erp/gastos').then((r) => r.data),
    staleTime: 60000,
  })

  const probar = useMutation({
    mutationFn: () => api.post('/erp/reglas/probar', form).then((r) => r.data),
    onSuccess: (r) => setPrueba(r),
    onError: (e) => toast.error(e.response?.data?.error || 'No se pudo probar.'),
  })
  const crear = useMutation({
    mutationFn: () => api.post('/erp/reglas', form).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['erp-reglas'] }); setCreando(false); setPrueba(null); toast.success('Regla creada.') },
    onError: (e) => toast.error(e.response?.data?.error || 'No se pudo crear.'),
  })

  if (isLoading) return <Cargando />

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[11.5px] text-gris">"Si la glosa trae esto y el monto anda por acá, es este gasto." La regla imputa a la provisión del período.</p>
        <Boton size="sm" variante="primario" onClick={() => setCreando(true)}>+ Regla</Boton>
      </div>
      <Carta>
        {!reglas?.length ? <Vacio>Sin reglas. El arriendo que llega igual todos los meses es el candidato perfecto.</Vacio> : (
          <Tabla>
            <thead><tr><Th>Regla</Th><Th>Patrón de glosa</Th><Th>Gasto</Th><Th num>Aplicada</Th><Th>Auto</Th></tr></thead>
            <tbody>
              {reglas.map((r) => (
                <tr key={r.id} className={`hover:bg-borde-suave/50 ${!r.activa ? 'opacity-50' : ''}`}>
                  <Td className="font-medium">{r.nombre}</Td>
                  <Td className="monto text-gris">"{r.patronGlosa}"</Td>
                  <Td>{r.gastoProgramado?.nombre}</Td>
                  <Td num>{r.vecesAplicada}×</Td>
                  <Td>{r.autoValidar ? <Badge tono="ambar">imputa sola</Badge> : <Badge tono="gris">propone</Badge>}</Td>
                </tr>
              ))}
            </tbody>
          </Tabla>
        )}
      </Carta>

      {creando && (
        <Modal abierto onCerrar={() => { setCreando(false); setPrueba(null) }} titulo="Nueva regla de conciliación">
          <div className="space-y-3">
            <Campo label="Nombre"><Input autoFocus value={form.nombre} onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))} placeholder="Ej: Arriendo oficina" /></Campo>
            <Campo label="La glosa debe contener"><Input value={form.patronGlosa} onChange={(e) => setForm((f) => ({ ...f, patronGlosa: e.target.value }))} placeholder="Ej: FENIX" /></Campo>
            <Campo label="Se imputa al gasto programado">
              <Select value={form.gastoProgramadoId} onChange={(e) => setForm((f) => ({ ...f, gastoProgramadoId: e.target.value }))}>
                <option value="">Elegir…</option>
                {(gastos || []).map((g) => <option key={g.id} value={g.id}>{g.nombre}</option>)}
              </Select>
            </Campo>
            <div className="grid grid-cols-2 gap-3">
              <Campo label="Monto mínimo (opcional)"><Input type="number" value={form.montoMin} onChange={(e) => setForm((f) => ({ ...f, montoMin: e.target.value }))} /></Campo>
              <Campo label="Monto máximo (opcional)"><Input type="number" value={form.montoMax} onChange={(e) => setForm((f) => ({ ...f, montoMax: e.target.value }))} /></Campo>
            </div>
            <label className="flex items-center gap-2 text-[12px] cursor-pointer">
              <input type="checkbox" checked={form.autoValidar} onChange={(e) => setForm((f) => ({ ...f, autoValidar: e.target.checked }))} />
              Imputar sola cuando la coincidencia sea única (con cuidado)
            </label>
            {prueba && (
              <p className="text-[11.5px] bg-fondo rounded-lg px-3 py-2">
                Calzaría con <span className="font-semibold">{prueba.total}</span> movimiento(s), {prueba.libres} libres.
                {prueba.movimientos.slice(0, 3).map((m) => <span key={m.id} className="block text-sutil truncate">· {fecha(m.fecha)} {m.glosa} ({clp(Math.abs(m.monto))})</span>)}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Boton onClick={() => probar.mutate()} disabled={!form.patronGlosa || probar.isPending}>Probar en seco</Boton>
              <Boton variante="primario" disabled={crear.isPending || !form.nombre || !form.patronGlosa || !form.gastoProgramadoId} onClick={() => crear.mutate()}>Crear regla</Boton>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ─── Cuentas bancarias ────────────────────────────────────────

function TabBancarias() {
  const { data: cuentas, isLoading } = useQuery({
    queryKey: ['erp-banco', 'cuentas'],
    queryFn: () => api.get('/erp/banco/cuentas').then((r) => r.data),
    staleTime: 60000,
  })
  if (isLoading) return <Cargando />
  return (
    <Carta>
      {!cuentas?.length ? <Vacio>Sin cuentas bancarias registradas.</Vacio> : (
        <Tabla>
          <thead><tr><Th>Banco</Th><Th>Cuenta</Th><Th>Titular</Th><Th num>Movimientos</Th></tr></thead>
          <tbody>
            {cuentas.map((c) => (
              <tr key={c.id}>
                <Td className="font-medium">{c.banco}{c.alias && <span className="text-sutil"> · {c.alias}</span>}</Td>
                <Td className="monto">{c.numeroCuenta}</Td>
                <Td>{c.razonSocial} <span className="text-sutil monto">{c.rutEmpresa}</span></Td>
                <Td num>{c._count?.movimientos ?? '—'}</Td>
              </tr>
            ))}
          </tbody>
        </Tabla>
      )}
    </Carta>
  )
}

export default function Configuracion() {
  const [tab, setTab] = useState('contrapartes')
  const TABS = [
    ['contrapartes', 'Contrapartes'],
    ['cuentas', 'Plan de cuentas'],
    ['proveedores', 'Proveedores'],
    ['reglas', 'Reglas'],
    ['bancarias', 'Cuentas bancarias'],
  ]
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 flex-wrap">
        <h1 className="text-[17px] font-bold tracking-tight">Configuración</h1>
        <div className="flex items-center gap-1 bg-carta border border-borde rounded-lg p-0.5 flex-wrap">
          {TABS.map(([k, l]) => (
            <button key={k} type="button" onClick={() => setTab(k)}
              className={`px-2.5 py-1 rounded-md text-[11.5px] font-semibold cursor-pointer transition-colors ${tab === k ? 'bg-bp-soft text-bp-dark' : 'text-gris hover:text-tinta'}`}>
              {l}
            </button>
          ))}
        </div>
      </div>
      {tab === 'contrapartes' && <TabContrapartes />}
      {tab === 'cuentas' && <TabCuentas />}
      {tab === 'proveedores' && <TabProveedores />}
      {tab === 'reglas' && <TabReglas />}
      {tab === 'bancarias' && <TabBancarias />}
    </div>
  )
}
