// Modo reunión — la vista que el vendedor le muestra al cliente.
// Sin menú, sin notificaciones, sin comisiones ni etapas: solo el catálogo
// disponible con fotos y el armado de la propuesta. El botón de salida vuelve
// al CRM normal.
import { useState, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { App, Select, Modal, Spin, Empty } from 'antd'
import {
  CloseOutlined, CheckOutlined, PictureOutlined, ShoppingCartOutlined,
  DeleteOutlined, FileTextOutlined, LeftOutlined, RightOutlined
} from '@ant-design/icons'
import api from '../../services/api'
import { useUF } from '../../hooks/useUF'
import { useAuth } from '../../context/AuthContext'

const AZUL = '#0091C3'
const AZUL_OSC = '#00719a'

const fmtUF = (n) => Number(n).toLocaleString('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtM2 = (n) => Number(n).toLocaleString('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// Foto que encabeza la ficha: la portada de la unidad; si no tiene, la galería
// del edificio; si tampoco, un marcador.
function fotoDe(unidad) {
  const propia = unidad.archivos?.[0]
  if (propia) return { url: propia.url, mini: propia.urlMiniatura || propia.url, propia: true }
  const edificio = unidad.edificio?.fotos?.[0]
  if (edificio) return { url: edificio.url, mini: edificio.urlMiniatura || edificio.url, propia: false }
  return null
}

const galeriaDe = (unidad) => [
  ...(unidad.archivos || []).map(a => ({ ...a, propia: true })),
  ...(unidad.edificio?.fotos || []).map(f => ({ ...f, propia: false })),
]

export default function ModoReunion() {
  const { leadId: leadIdParam } = useParams()
  const navigate = useNavigate()
  const { message } = App.useApp()
  const { usuario } = useAuth()
  const { valorUF } = useUF()

  const [filtroTipo, setFiltroTipo] = useState('TODAS')
  const [filtroEdificio, setFiltroEdificio] = useState(null)
  const [seleccion, setSeleccion] = useState([])           // ids de unidad
  const [visor, setVisor] = useState(null)                 // { unidad, indice }
  const [modalLead, setModalLead] = useState(false)
  const [leadId, setLeadId] = useState(leadIdParam ? Number(leadIdParam) : null)

  const { data: unidades = [], isLoading } = useQuery({
    queryKey: ['reunion-catalogo'],
    queryFn: () => api.get('/cotizaciones/unidades-disponibles').then(r => r.data),
    staleTime: 60000,
  })

  // El buscador va contra el servidor: hay más de mil leads, cargarlos todos
  // en el Select dejaba la reunión esperando.
  const [busquedaLead, setBusquedaLead] = useState('')
  const { data: leads = [], isFetching: buscandoLeads } = useQuery({
    queryKey: ['reunion-leads', busquedaLead],
    queryFn: () => api.get('/leads', { params: { search: busquedaLead } }).then(r => r.data.slice(0, 50)),
    enabled: modalLead && busquedaLead.length >= 2,
  })

  const { data: lead } = useQuery({
    queryKey: ['lead', leadId],
    queryFn: () => api.get(`/leads/${leadId}`).then(r => r.data),
    enabled: !!leadId,
  })

  const edificios = useMemo(() => {
    const m = new Map()
    unidades.forEach(u => u.edificio && m.set(u.edificio.id, u.edificio))
    return [...m.values()].sort((a, b) => a.nombre.localeCompare(b.nombre))
  }, [unidades])

  const visibles = useMemo(() => unidades.filter(u =>
    (filtroTipo === 'TODAS' || u.tipo === filtroTipo) &&
    (!filtroEdificio || u.edificio?.id === filtroEdificio)
  ), [unidades, filtroTipo, filtroEdificio])

  const elegidas = useMemo(
    () => seleccion.map(id => unidades.find(u => u.id === id)).filter(Boolean),
    [seleccion, unidades]
  )
  const totalUF = elegidas.reduce((a, u) => a + Number(u.precioUF), 0)

  const alternar = (id) => setSeleccion(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])

  const crearCotizacion = useMutation({
    mutationFn: () => api.post('/cotizaciones', {
      leadId,
      validezDias: 7,
      items: elegidas.map(u => ({ unidadId: u.id, precioListaUF: Number(u.precioUF) })),
    }),
    onSuccess: (res) => {
      message.success('Cotización creada')
      navigate(`/cotizaciones/${res.data.id}`)
    },
    onError: (err) => message.error(err.response?.data?.error || 'No se pudo crear la cotización'),
  })

  const alCotizar = () => {
    if (!elegidas.length) return
    if (!leadId) { setModalLead(true); return }
    crearCotizacion.mutate()
  }

  // ── estilos ──────────────────────────────────────────────
  const s = {
    raiz: { minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#F5F7F9', fontFamily: 'Inter, sans-serif' },
    barra: {
      display: 'flex', alignItems: 'center', gap: 14, padding: '14px 30px', background: '#fff',
      borderBottom: '1px solid #E4E9EE', position: 'sticky', top: 0, zIndex: 20,
    },
    salir: {
      display: 'flex', alignItems: 'center', gap: 8, padding: '9px 16px', borderRadius: 999,
      background: AZUL, color: '#fff', border: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer',
      boxShadow: '0 4px 14px rgba(0,145,195,.35)',
    },
    chip: (on) => ({
      padding: '9px 17px', borderRadius: 999, border: `1.5px solid ${on ? '#3D3D3D' : '#E4E9EE'}`,
      background: on ? '#3D3D3D' : '#fff', color: on ? '#fff' : '#5B6672', fontSize: 14.5,
      fontWeight: on ? 600 : 500, cursor: 'pointer', minHeight: 44, display: 'flex', alignItems: 'center', gap: 7,
    }),
    cuerpo: { display: 'flex', gap: 22, padding: '16px 30px 30px', alignItems: 'flex-start', flex: 1 },
    rejilla: { flex: 1, display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(258px,1fr))', gap: 16, alignContent: 'start' },
    ficha: (on) => ({
      background: '#fff', border: `1.5px solid ${on ? AZUL : '#E4E9EE'}`, borderRadius: 14, overflow: 'hidden',
      boxShadow: on ? `0 0 0 3px rgba(0,145,195,.16), 0 8px 30px rgba(16,24,40,.12)` : '0 1px 2px rgba(16,24,40,.06), 0 4px 14px rgba(16,24,40,.05)',
      cursor: 'pointer', display: 'flex', flexDirection: 'column', textAlign: 'left', padding: 0,
      transition: 'border-color .2s, box-shadow .2s',
    }),
    foto: { height: 152, position: 'relative', display: 'grid', placeItems: 'center', background: 'linear-gradient(135deg,#EDF3F7,#DCE7EE)', color: '#9DB0BE', overflow: 'hidden' },
    panel: {
      width: 322, flexShrink: 0, position: 'sticky', top: 96, background: '#fff',
      border: '1.5px solid #E4E9EE', borderRadius: 14, overflow: 'hidden',
      boxShadow: '0 1px 2px rgba(16,24,40,.06), 0 4px 14px rgba(16,24,40,.05)',
    },
    cta: (off) => ({
      display: 'block', width: 'calc(100% - 36px)', margin: '14px 18px 18px', padding: 15, borderRadius: 11,
      background: off ? '#DCE3E9' : AZUL, color: off ? '#9AA5B1' : '#fff', fontSize: 15.5, fontWeight: 600,
      textAlign: 'center', border: 'none', cursor: off ? 'not-allowed' : 'pointer', minHeight: 48,
    }),
    pie: {
      display: 'flex', alignItems: 'center', gap: 14, padding: '13px 30px', background: '#fff',
      borderTop: '1px solid #E4E9EE', position: 'sticky', bottom: 0, fontSize: 13.5, color: '#5B6672', zIndex: 10,
    },
  }

  if (isLoading) {
    return <div style={{ ...s.raiz, alignItems: 'center', justifyContent: 'center' }}><Spin size="large" /></div>
  }

  return (
    <div style={s.raiz}>
      {/* ── barra ── */}
      <div style={s.barra}>
        <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-.02em' }}>
          {lead
            ? <>Reunión con <span style={{ color: AZUL_OSC }}>{lead.contacto?.nombre} {lead.contacto?.apellido || ''}</span></>
            : 'Catálogo disponible'}
          <span style={{ fontWeight: 500, fontSize: 14, color: '#5B6672', marginLeft: 10 }}>
            {visibles.length} {visibles.length === 1 ? 'unidad' : 'unidades'}
          </span>
        </div>
        <div style={{ flex: 1 }} />
        <button style={s.salir} onClick={() => navigate(leadId ? `/leads/${leadId}` : '/leads')}>
          <CloseOutlined /> Salir del modo reunión
        </button>
      </div>

      {/* ── filtros ── */}
      <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap', padding: '18px 30px 4px' }}>
        {[
          { k: 'TODAS', t: 'Todas' },
          { k: 'BODEGA', t: 'Bodegas' },
          { k: 'ESTACIONAMIENTO', t: 'Estacionamientos' },
        ].map(f => (
          <button key={f.k} style={s.chip(filtroTipo === f.k)} onClick={() => setFiltroTipo(f.k)}>
            {f.t}
            <span style={{ fontSize: 12.5, opacity: .65 }}>
              {f.k === 'TODAS' ? unidades.length : unidades.filter(u => u.tipo === f.k).length}
            </span>
          </button>
        ))}
        <div style={{ width: 1, background: '#E4E9EE', margin: '0 5px' }} />
        {edificios.map(e => (
          <button
            key={e.id}
            style={s.chip(filtroEdificio === e.id)}
            onClick={() => setFiltroEdificio(filtroEdificio === e.id ? null : e.id)}
          >
            {e.nombre}
            <span style={{ fontSize: 12.5, opacity: .65 }}>{unidades.filter(u => u.edificio?.id === e.id).length}</span>
          </button>
        ))}
      </div>

      {/* ── catálogo + propuesta ── */}
      <div style={s.cuerpo}>
        <div style={s.rejilla}>
          {visibles.map(u => {
            const on = seleccion.includes(u.id)
            const foto = fotoDe(u)
            const promos = [
              ...(u.packs || []).map(p => p.pack?.nombre),
              ...(u.beneficios || []).map(b => b.beneficio?.nombre),
              ...(u.promociones || []).map(p => p.promocion?.nombre),
            ].filter(Boolean)
            return (
              <div key={u.id} style={s.ficha(on)} onClick={() => alternar(u.id)}
                role="button" tabIndex={0} aria-pressed={on}
                onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), alternar(u.id))}>
                <div style={s.foto}>
                  {foto
                    ? <img
                        src={foto.mini}
                        alt={`${u.tipo === 'BODEGA' ? 'Bodega' : 'Estacionamiento'} ${u.numero}`}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onClick={e => { e.stopPropagation(); setVisor({ unidad: u, indice: 0 }) }}
                      />
                    : <div style={{ textAlign: 'center' }}>
                        <PictureOutlined style={{ fontSize: 30 }} />
                        <div style={{ fontSize: 11, letterSpacing: '.05em', textTransform: 'uppercase', fontWeight: 600, marginTop: 6 }}>
                          Sin foto
                        </div>
                      </div>}
                  {foto && !foto.propia && (
                    <span style={{
                      position: 'absolute', bottom: 8, left: 8, background: 'rgba(17,24,39,.72)', color: '#fff',
                      fontSize: 10.5, fontWeight: 600, padding: '3px 8px', borderRadius: 6, letterSpacing: '.03em',
                    }}>FOTO DEL EDIFICIO</span>
                  )}
                  <span style={{
                    position: 'absolute', top: 10, right: 10, width: 28, height: 28, borderRadius: '50%',
                    background: on ? AZUL : 'rgba(255,255,255,.92)', color: on ? '#fff' : '#B7C4CE',
                    display: 'grid', placeItems: 'center',
                  }}>{on && <CheckOutlined style={{ fontSize: 14 }} />}</span>
                </div>
                <div style={{ padding: '14px 16px 16px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                  <span style={{ fontSize: 19, fontWeight: 700, letterSpacing: '-.02em' }}>
                    {u.tipo === 'BODEGA' ? 'Bodega' : 'Estac.'} {u.numero}
                  </span>
                  <span style={{ fontSize: 13, color: '#5B6672' }}>
                    {u.edificio?.nombre} · {u.edificio?.comuna}
                  </span>
                  <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginTop: 9 }}>
                    {u.m2 && <span style={etq}>{fmtM2(u.m2)} m²</span>}
                    {u.piso && <span style={etq}>Piso {u.piso}</span>}
                    {u.subtipo && <span style={etq}>{u.subtipo === 'TANDEM' ? 'Tándem' : 'Normal'}</span>}
                    {u.acceso && <span style={etq}>{u.acceso === 'SUBTERRANEO' ? 'Subterráneo' : 'Superficie'}</span>}
                  </div>
                  {promos.length > 0 && (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 7 }}>
                      {promos.slice(0, 2).map((p, i) => (
                        <span key={i} style={{ ...etq, background: '#F0FDF4', color: '#166534' }}>{p}</span>
                      ))}
                    </div>
                  )}
                  <div style={{ marginTop: 'auto', paddingTop: 13 }}>
                    <div style={{ fontSize: 25, fontWeight: 700, letterSpacing: '-.03em', color: AZUL_OSC }}>
                      {fmtUF(u.precioUF)}<small style={{ fontSize: 14, fontWeight: 600, color: '#5B6672', marginLeft: 3 }}>UF</small>
                    </div>
                    {valorUF && (
                      <div style={{ fontSize: 13.5, color: '#5B6672', marginTop: 1 }}>
                        ${Math.round(Number(u.precioUF) * valorUF).toLocaleString('es-CL')}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
          {!visibles.length && (
            <Empty description="No hay unidades con ese filtro" style={{ gridColumn: '1/-1', padding: 40 }} />
          )}
        </div>

        {/* ── propuesta ── */}
        <aside style={s.panel}>
          <h3 style={{ margin: 0, padding: '16px 18px 13px', fontSize: 15, fontWeight: 700, borderBottom: '1px solid #E4E9EE', display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShoppingCartOutlined /> Su propuesta
            <span style={{ marginLeft: 'auto', background: '#E6F5FA', color: AZUL_OSC, fontSize: 12.5, padding: '2px 9px', borderRadius: 20, fontWeight: 700 }}>
              {elegidas.length}
            </span>
          </h3>

          {!elegidas.length ? (
            <div style={{ padding: '34px 18px', textAlign: 'center', color: '#9AA5B1', fontSize: 13.5, lineHeight: 1.6 }}>
              Toca una unidad del catálogo<br />para armar la propuesta.
            </div>
          ) : (
            <>
              <div style={{ padding: '6px 18px', maxHeight: 290, overflow: 'auto' }}>
                {elegidas.map(u => (
                  <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 0', borderBottom: '1px solid #F1F4F7' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <b style={{ display: 'block', fontSize: 14.5, fontWeight: 600 }}>
                        {u.tipo === 'BODEGA' ? 'Bodega' : 'Estac.'} {u.numero}
                      </b>
                      <span style={{ display: 'block', fontSize: 12, color: '#5B6672', marginTop: 1 }}>
                        {u.edificio?.nombre}{u.m2 ? ` · ${fmtM2(u.m2)} m²` : ''}
                      </span>
                    </div>
                    <span style={{ fontSize: 14.5, fontWeight: 600, whiteSpace: 'nowrap' }}>{fmtUF(u.precioUF)}</span>
                    <button
                      onClick={() => alternar(u.id)}
                      aria-label={`Quitar ${u.numero}`}
                      style={{ width: 26, height: 26, borderRadius: 6, border: 'none', background: 'none', color: '#B7C4CE', cursor: 'pointer' }}
                    ><DeleteOutlined /></button>
                  </div>
                ))}
              </div>
              <div style={{ padding: '14px 18px', borderTop: '1px solid #E4E9EE', background: '#FAFBFC', fontSize: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1.5px solid #E4E9EE', paddingTop: 11, color: '#111827', fontSize: 16, fontWeight: 700 }}>
                  <span>Total</span>
                  <span style={{ fontSize: 22, letterSpacing: '-.02em', color: AZUL_OSC }}>{fmtUF(totalUF)} UF</span>
                </div>
                {valorUF && (
                  <div style={{ textAlign: 'right', fontSize: 13, color: '#5B6672', paddingTop: 2 }}>
                    ≈ ${Math.round(totalUF * valorUF).toLocaleString('es-CL')}
                  </div>
                )}
                <div style={{ fontSize: 12, color: '#7A8593', marginTop: 10, lineHeight: 1.5 }}>
                  Precios de lista. Los descuentos por volumen y promociones se aplican
                  al generar la cotización.
                </div>
              </div>
            </>
          )}

          <button
            style={s.cta(!elegidas.length || crearCotizacion.isPending)}
            disabled={!elegidas.length || crearCotizacion.isPending}
            onClick={alCotizar}
          >
            <FileTextOutlined style={{ marginRight: 8 }} />
            {crearCotizacion.isPending ? 'Creando…' : 'Crear cotización'}
          </button>
        </aside>
      </div>

      {/* ── pie ── */}
      <div style={s.pie}>
        Precios de catálogo, sujetos a disponibilidad al momento de la reserva.
        <span style={{ marginLeft: 'auto', fontSize: 13 }}>
          {valorUF && <>UF de hoy <b style={{ color: '#111827' }}>${valorUF.toLocaleString('es-CL', { minimumFractionDigits: 2 })}</b></>}
          <span style={{ marginLeft: 14, color: '#9AA5B1' }}>{usuario?.nombre}</span>
        </span>
      </div>

      {/* ── visor de fotos ── */}
      <Modal
        open={!!visor}
        onCancel={() => setVisor(null)}
        footer={null}
        width={880}
        centered
        title={visor && `${visor.unidad.tipo === 'BODEGA' ? 'Bodega' : 'Estacionamiento'} ${visor.unidad.numero} · ${visor.unidad.edificio?.nombre}`}
      >
        {visor && (() => {
          const fotos = galeriaDe(visor.unidad)
          const actual = fotos[visor.indice]
          if (!actual) return null
          const mover = (d) => setVisor(v => ({ ...v, indice: (v.indice + d + fotos.length) % fotos.length }))
          return (
            <div>
              <div style={{ position: 'relative', background: '#111', borderRadius: 10, overflow: 'hidden' }}>
                <img src={actual.url} alt={actual.nombre}
                  style={{ width: '100%', maxHeight: '68vh', objectFit: 'contain', display: 'block' }} />
                {fotos.length > 1 && (
                  <>
                    <button onClick={() => mover(-1)} aria-label="Anterior" style={flecha('left')}><LeftOutlined /></button>
                    <button onClick={() => mover(1)} aria-label="Siguiente" style={flecha('right')}><RightOutlined /></button>
                  </>
                )}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: 13, color: '#5B6672' }}>
                <span>{actual.propia ? 'Foto de la unidad' : 'Foto del edificio'}</span>
                <span>{visor.indice + 1} de {fotos.length}</span>
              </div>
            </div>
          )
        })()}
      </Modal>

      {/* ── elegir cliente antes de cotizar ── */}
      <Modal
        open={modalLead}
        onCancel={() => setModalLead(false)}
        onOk={() => { if (leadId) { setModalLead(false); crearCotizacion.mutate() } }}
        okText="Crear cotización"
        cancelText="Cancelar"
        okButtonProps={{ disabled: !leadId }}
        title="¿Para qué cliente es la cotización?"
      >
        <Select
          showSearch
          style={{ width: '100%', marginTop: 12 }}
          size="large"
          placeholder="Escribe el nombre, correo o teléfono…"
          value={leadId}
          onChange={setLeadId}
          onSearch={setBusquedaLead}
          filterOption={false}
          loading={buscandoLeads}
          notFoundContent={
            busquedaLead.length < 2 ? 'Escribe al menos 2 letras'
              : buscandoLeads ? 'Buscando…' : 'Sin resultados'
          }
          options={leads.map(l => ({
            value: l.id,
            label: [`${l.contacto?.nombre || ''} ${l.contacto?.apellido || ''}`.trim() || `Lead #${l.id}`,
              l.contacto?.email].filter(Boolean).join(' · '),
          }))}
        />
      </Modal>
    </div>
  )
}

const etq = {
  fontSize: 12, background: '#F2F6F8', color: '#5A6875',
  padding: '3px 9px', borderRadius: 6, fontWeight: 500,
}

const flecha = (lado) => ({
  position: 'absolute', top: '50%', [lado]: 12, transform: 'translateY(-50%)',
  width: 42, height: 42, borderRadius: '50%', border: 'none', cursor: 'pointer',
  background: 'rgba(255,255,255,.9)', color: '#3D3D3D', display: 'grid', placeItems: 'center',
})
