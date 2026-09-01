/**
 * Banco: qué pasó en la cuenta. Movimientos (hechos, nunca editables) y cargas
 * de cartola con su cuadre contra los totales del banco.
 */
import { useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { ArrowUpTrayIcon } from '@heroicons/react/24/outline'
import api from '../../services/api'
import { Carta, CartaTitulo, Tabla, Th, Td, Badge, Monto, clp, fecha, Cargando, Vacio, Boton, Input, Select } from '../ui'

function SubirCartola() {
  const inputRef = useRef(null)
  const qc = useQueryClient()
  const subir = useMutation({
    mutationFn: (file) => {
      const fd = new FormData()
      fd.append('cartola', file)
      return api.post('/erp/banco/cargas', fd).then((r) => r.data)
    },
    onSuccess: ({ carga, cuadre }) => {
      qc.invalidateQueries({ queryKey: ['erp-banco'] })
      qc.invalidateQueries({ queryKey: ['erp-dashboard'] })
      toast.success(
        `Cartola cargada: ${carga.totalNuevos} nuevos, ${carga.totalRepetidos} repetidos${cuadre?.cuadra === false ? ' · ⚠ NO cuadra con los totales del banco' : cuadre?.cuadra ? ' · cuadra ✓' : ''}`,
        { duration: 6000 },
      )
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Error al subir la cartola.'),
  })

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".txt,.csv,text/plain"
        className="hidden"
        onChange={(e) => { if (e.target.files?.[0]) subir.mutate(e.target.files[0]); e.target.value = '' }}
      />
      <Boton variante="primario" size="sm" onClick={() => inputRef.current?.click()} disabled={subir.isPending}>
        <ArrowUpTrayIcon className="w-3.5 h-3.5" aria-hidden="true" />
        {subir.isPending ? 'Procesando…' : 'Subir cartola'}
      </Boton>
    </>
  )
}

function Movimientos() {
  const [filtro, setFiltro] = useState({ tipo: '', search: '', conciliado: '' })
  const params = {
    ...(filtro.tipo && { tipo: filtro.tipo }),
    ...(filtro.search && { search: filtro.search }),
    ...(filtro.conciliado !== '' && { conciliado: filtro.conciliado }),
  }

  const { data: resumen } = useQuery({
    queryKey: ['erp-banco', 'resumen', params],
    queryFn: () => api.get('/erp/banco/movimientos/resumen', { params }).then((r) => r.data),
    staleTime: 30000,
  })
  const { data: movimientos, isLoading } = useQuery({
    queryKey: ['erp-banco', 'movimientos', params],
    queryFn: () => api.get('/erp/banco/movimientos', { params }).then((r) => r.data),
    staleTime: 30000,
  })

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="w-56">
          <Input placeholder="Buscar en glosa o documento…" value={filtro.search}
            onChange={(e) => setFiltro((f) => ({ ...f, search: e.target.value }))} />
        </div>
        <div className="w-32">
          <Select value={filtro.tipo} onChange={(e) => setFiltro((f) => ({ ...f, tipo: e.target.value }))} aria-label="Tipo">
            <option value="">Todos</option>
            <option value="abono">Abonos</option>
            <option value="cargo">Cargos</option>
          </Select>
        </div>
        <div className="w-40">
          <Select value={filtro.conciliado} onChange={(e) => setFiltro((f) => ({ ...f, conciliado: e.target.value }))} aria-label="Estado">
            <option value="">Cualquier estado</option>
            <option value="false">Sin conciliar</option>
            <option value="true">Conciliados</option>
          </Select>
        </div>
        {resumen && (
          <div className="flex items-center gap-3 ml-auto text-[11.5px] text-gris">
            <span><span className="monto text-abono font-semibold">{clp(resumen.abonos.monto)}</span> en {resumen.abonos.cantidad} abonos</span>
            <span><span className="monto text-cargo font-semibold">{clp(resumen.cargos.monto)}</span> en {resumen.cargos.cantidad} cargos</span>
            <Badge tono={resumen.sinConciliar ? 'ambar' : 'verde'}>{resumen.sinConciliar} sin conciliar</Badge>
          </div>
        )}
      </div>

      <Carta>
        {isLoading ? <Cargando /> : !movimientos?.length ? (
          <Vacio>No hay movimientos con esos filtros. Los movimientos entran solo por cartola: del scraper o subida a mano.</Vacio>
        ) : (
          <Tabla>
            <thead><tr>
              <Th>Fecha</Th><Th>Glosa</Th><Th>Contraparte</Th><Th>Cuenta de gasto</Th><Th>Estado</Th><Th num>Monto</Th>
            </tr></thead>
            <tbody>
              {movimientos.map((m) => {
                const contraparte = m.contacto
                  ? `${m.contacto.nombre || ''} ${m.contacto.apellido || ''}`.trim()
                  : m.proveedor?.razonSocial || null
                return (
                  <tr key={m.id} className="hover:bg-borde-suave/50">
                    <Td className="whitespace-nowrap monto">{fecha(m.fecha)}</Td>
                    <Td className="max-w-[320px]"><span className="block truncate" title={m.glosa}>{m.glosa}</span></Td>
                    <Td>{contraparte || <span className="text-sutil">—</span>}</Td>
                    <Td>{m.cuentaGasto ? <Badge tono="azul">{m.cuentaGasto.nombre}</Badge> : <span className="text-sutil">—</span>}</Td>
                    <Td>
                      {m.ignorado ? <Badge tono="gris">Ignorado</Badge>
                        : m.conciliado ? <Badge tono="verde">Conciliado</Badge>
                        : m.conciliaciones?.length ? <Badge tono="azul">Parcial</Badge>
                        : <Badge tono="ambar">Pendiente</Badge>}
                    </Td>
                    <Td num><Monto valor={m.monto} className="font-semibold" /></Td>
                  </tr>
                )
              })}
            </tbody>
          </Tabla>
        )}
      </Carta>
    </div>
  )
}

function Cargas() {
  const { data: cargas, isLoading } = useQuery({
    queryKey: ['erp-banco', 'cargas'],
    queryFn: () => api.get('/erp/banco/cargas').then((r) => r.data),
    staleTime: 30000,
  })

  if (isLoading) return <Cargando />
  if (!cargas?.length) return <Carta><Vacio>Todavía no se carga ninguna cartola.</Vacio></Carta>

  return (
    <Carta>
      <Tabla>
        <thead><tr>
          <Th>Fecha carga</Th><Th>Origen</Th><Th>Rango</Th><Th num>Leídos</Th><Th num>Nuevos</Th><Th num>Repetidos</Th><Th>Cuadre</Th><Th>Subida por</Th>
        </tr></thead>
        <tbody>
          {cargas.map((c) => (
            <tr key={c.id} className="hover:bg-borde-suave/50">
              <Td className="monto whitespace-nowrap">{fecha(c.creadoEn)}</Td>
              <Td><Badge tono={c.origen === 'SCRAPER' ? 'azul' : 'gris'}>{c.origen === 'SCRAPER' ? 'Scraper' : c.origen === 'LIBRO_BANCO' ? 'Libro banco' : 'Manual'}</Badge></Td>
              <Td className="monto whitespace-nowrap">{c.desde || c.hasta ? `${fecha(c.desde)} → ${fecha(c.hasta)}` : '—'}</Td>
              <Td num>{c.totalLeidos}</Td>
              <Td num className="font-semibold">{c.totalNuevos}</Td>
              <Td num className="text-sutil">{c.totalRepetidos}</Td>
              <Td>{c.cuadra == null ? <Badge tono="gris">s/ totales</Badge> : c.cuadra ? <Badge tono="verde">Cuadra</Badge> : <Badge tono="rojo">No cuadra</Badge>}</Td>
              <Td className="text-gris">{c.subidoPor ? `${c.subidoPor.nombre}` : 'Scraper'}</Td>
            </tr>
          ))}
        </tbody>
      </Tabla>
    </Carta>
  )
}

export default function Banco() {
  const [tab, setTab] = useState('movimientos')
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-4">
          <h1 className="text-[17px] font-bold tracking-tight">Banco</h1>
          <div className="flex items-center gap-1 bg-carta border border-borde rounded-lg p-0.5">
            {[['movimientos', 'Movimientos'], ['cargas', 'Cargas']].map(([k, l]) => (
              <button key={k} type="button" onClick={() => setTab(k)}
                className={`px-2.5 py-1 rounded-md text-[11.5px] font-semibold cursor-pointer transition-colors ${tab === k ? 'bg-bp-soft text-bp-dark' : 'text-gris hover:text-tinta'}`}>
                {l}
              </button>
            ))}
          </div>
        </div>
        <SubirCartola />
      </div>
      {tab === 'movimientos' ? <Movimientos /> : <Cargas />}
    </div>
  )
}
