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
  DeleteOutlined, FileTextOutlined, LeftOutlined, RightOutlined, ColumnWidthOutlined
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
  const [comparando, setComparando] = useState(false)
  const [fotoHero, setFotoHero] = useState(0)              // índice en la galería del edificio
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

  // Edificio en pantalla: cuando hay uno filtrado se muestra su portada grande,
  // con lo que le queda disponible y desde cuánto.
  const edificioActual = useMemo(() => {
    if (!filtroEdificio) return null
    const e = edificios.find(x => x.id === filtroEdificio)
    if (!e) return null
    const suyas = unidades.filter(u => u.edificio?.id === filtroEdificio)
    const m2 = suyas.map(u => u.m2).filter(Boolean)
    return {
      ...e,
      unidades: suyas,
      desdeUF: Math.min(...suyas.map(u => Number(u.precioUF))),
      m2Min: m2.length ? Math.min(...m2) : null,
      m2Max: m2.length ? Math.max(...m2) : null,
    }
  }, [filtroEdificio, edificios, unidades])

  const irAEdificio = (paso) => {
    if (!edificios.length) return
    const i = edificios.findIndex(e => e.id === filtroEdificio)
    const siguiente = edificios[(i + paso + edificios.length) % edificios.length]
    setFiltroEdificio(siguiente.id)
    setFotoHero(0)
  }

  // Comparador: al lado, cuál gana en cada fila. Con m² desconocido no se
  // calcula el precio por m² (los tándem, por ejemplo).
  const comparacion = useMemo(() => {
    if (elegidas.length < 2) return null
    const filas = elegidas.map(u => {
      const m2 = u.m2 ? Number(u.m2) : null
      return { unidad: u, precio: Number(u.precioUF), m2, porM2: m2 ? Number(u.precioUF) / m2 : null }
    })
    const conM2 = filas.filter(f => f.m2)
    return {
      filas,
      mejorPrecio: Math.min(...filas.map(f => f.precio)),
      mayorM2: conM2.length ? Math.max(...conM2.map(f => f.m2)) : null,
      mejorPorM2: conM2.length ? Math.min(...conM2.map(f => f.porM2)) : null,
    }
  }, [elegidas])

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
    flechaNav: {
      width: 44, height: 44, borderRadius: '50%', border: '1.5px solid #E4E9EE', background: '#fff',
      color: '#3D3D3D', display: 'grid', placeItems: 'center', cursor: 'pointer',
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

      {/* ── portada del edificio (al filtrar por uno) ── */}
      {edificioActual && !comparando && (() => {
        const galeria = edificioActual.fotos || []
        const foto = galeria[fotoHero % Math.max(galeria.length, 1)]
        return (
          <div style={{ padding: '16px 30px 0' }}>
            <div style={{
              position: 'relative', borderRadius: 18, overflow: 'hidden', minHeight: 300,
              display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
              background: 'linear-gradient(150deg,#2C3E4C,#16222C)', color: '#fff', padding: '32px 36px',
            }}>
              {foto
                ? <img src={foto.url} alt={`${edificioActual.nombre}`}
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                : <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: 'rgba(255,255,255,.16)' }}>
                    <PictureOutlined style={{ fontSize: 64 }} />
                  </div>}
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top,rgba(10,16,22,.88) 8%,rgba(10,16,22,.15) 62%)' }} />

              <div style={{ position: 'relative', zIndex: 2 }}>
                <div style={{ fontSize: 13, letterSpacing: '.14em', textTransform: 'uppercase', opacity: .75, fontWeight: 600 }}>
                  {edificioActual.comuna}
                </div>
                <h2 style={{ fontSize: 'clamp(32px,4.6vw,54px)', fontWeight: 800, letterSpacing: '-.035em', margin: '6px 0 8px', lineHeight: 1 }}>
                  {edificioActual.nombre}
                </h2>
                {edificioActual.direccion && <div style={{ fontSize: 16, opacity: .82 }}>{edificioActual.direccion}</div>}
                <div style={{ display: 'flex', gap: 34, marginTop: 22, flexWrap: 'wrap' }}>
                  <div>
                    <b style={{ display: 'block', fontSize: 26, fontWeight: 700 }}>{edificioActual.unidades.length}</b>
                    <span style={{ fontSize: 12.5, opacity: .72, letterSpacing: '.03em' }}>DISPONIBLES</span>
                  </div>
                  {edificioActual.m2Min && (
                    <div>
                      <b style={{ display: 'block', fontSize: 26, fontWeight: 700 }}>
                        {edificioActual.m2Min === edificioActual.m2Max
                          ? `${fmtM2(edificioActual.m2Min)} m²`
                          : `${fmtM2(edificioActual.m2Min)} – ${fmtM2(edificioActual.m2Max)} m²`}
                      </b>
                      <span style={{ fontSize: 12.5, opacity: .72, letterSpacing: '.03em' }}>SUPERFICIE</span>
                    </div>
                  )}
                  <div>
                    <b style={{ display: 'block', fontSize: 26, fontWeight: 700 }}>{fmtUF(edificioActual.desdeUF)} UF</b>
                    <span style={{ fontSize: 12.5, opacity: .72, letterSpacing: '.03em' }}>DESDE</span>
                  </div>
                  {valorUF && (
                    <div>
                      <b style={{ display: 'block', fontSize: 26, fontWeight: 700 }}>
                        ${Math.round(edificioActual.desdeUF * valorUF).toLocaleString('es-CL')}
                      </b>
                      <span style={{ fontSize: 12.5, opacity: .72, letterSpacing: '.03em' }}>APROX.</span>
                    </div>
                  )}
                </div>
              </div>

              {galeria.length > 1 && (
                <div style={{ position: 'absolute', bottom: 20, right: 24, zIndex: 3, display: 'flex', gap: 7 }}>
                  {galeria.slice(0, 8).map((_, i) => (
                    <button key={i} onClick={() => setFotoHero(i)} aria-label={`Foto ${i + 1}`}
                      style={{
                        width: i === fotoHero % galeria.length ? 26 : 9, height: 9, borderRadius: 5, border: 'none',
                        background: i === fotoHero % galeria.length ? AZUL : 'rgba(255,255,255,.5)', cursor: 'pointer',
                      }} />
                  ))}
                </div>
              )}
              {galeria.length > 0 && (
                <button onClick={() => setVisor({
                    titulo: `${edificioActual.nombre} · ${edificioActual.comuna}`,
                    fotos: galeria.map(f => ({ ...f, propia: false })), indice: fotoHero % galeria.length,
                  })}
                  style={{
                    position: 'absolute', top: 18, right: 20, zIndex: 3, border: 'none', cursor: 'pointer',
                    background: 'rgba(255,255,255,.9)', color: '#3D3D3D', borderRadius: 999,
                    padding: '8px 15px', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 7,
                  }}>
                  <PictureOutlined /> Ver las {galeria.length} fotos
                </button>
              )}
            </div>

            {/* pasar de un proyecto a otro sin volver a los filtros */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 14 }}>
              <button onClick={() => irAEdificio(-1)} aria-label="Edificio anterior" style={s.flechaNav}><LeftOutlined /></button>
              <button onClick={() => irAEdificio(1)} aria-label="Edificio siguiente" style={s.flechaNav}><RightOutlined /></button>
              <span style={{ fontSize: 14, color: '#5B6672' }}>
                Edificio {edificios.findIndex(e => e.id === filtroEdificio) + 1} de {edificios.length}
              </span>
              <button onClick={() => setFiltroEdificio(null)}
                style={{ marginLeft: 'auto', border: 'none', background: 'none', color: AZUL_OSC, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
                Ver todos los edificios
              </button>
            </div>
          </div>
        )
      })()}

      {/* ── comparador ── */}
      {comparando && comparacion && (
        <Comparador
          datos={comparacion}
          valorUF={valorUF}
          onCerrar={() => setComparando(false)}
          onElegir={(id) => { setSeleccion([id]); setComparando(false) }}
          onQuitar={(id) => {
            const quedan = seleccion.filter(x => x !== id)
            setSeleccion(quedan)
            if (quedan.length < 2) setComparando(false)
          }}
        />
      )}

      {/* ── catálogo + propuesta ── */}
      <div style={{ ...s.cuerpo, display: comparando ? 'none' : 'flex' }}>
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
                        onClick={e => {
                          e.stopPropagation()
                          setVisor({
                            titulo: `${u.tipo === 'BODEGA' ? 'Bodega' : 'Estacionamiento'} ${u.numero} · ${u.edificio?.nombre}`,
                            fotos: galeriaDe(u), indice: 0,
                          })
                        }}
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

          {elegidas.length >= 2 && (
            <button style={{ ...s.cta(false), background: '#fff', border: '1.5px solid #E4E9EE', color: '#3D3D3D', marginBottom: 0 }}
              onClick={() => setComparando(true)}>
              <ColumnWidthOutlined style={{ marginRight: 8 }} />
              Comparar las {elegidas.length}
            </button>
          )}

          <button
            style={{ ...s.cta(!elegidas.length || crearCotizacion.isPending), marginTop: elegidas.length >= 2 ? 0 : 14 }}
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
        title={visor?.titulo}
      >
        {visor && (() => {
          const fotos = visor.fotos
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

const Celda = ({ children, destacado, style }) => (
  <div style={{ padding: '15px 18px', borderBottom: '1px solid #F0F3F6', ...style }}>
    {children}
    {destacado && (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 700,
        color: '#15803d', background: '#F0FDF4', padding: '2px 8px', borderRadius: 20, marginTop: 6,
      }}><CheckOutlined style={{ fontSize: 10 }} />{destacado}</span>
    )}
  </div>
)

const Etiqueta = ({ children }) => (
  <div style={{
    padding: '15px 18px', borderBottom: '1px solid #F0F3F6', color: '#5B6672', fontSize: 13,
    fontWeight: 600, background: '#FAFBFC', borderRight: '1px solid #E4E9EE',
  }}>{children}</div>
)

// Las que el cliente está dudando, lado a lado. Marca quién gana en cada fila
// para que la conversación deje de ser "cuál me conviene" y pase a "cuál elijo".
function Comparador({ datos, valorUF, onCerrar, onElegir, onQuitar }) {
  const { filas, mejorPrecio, mayorM2, mejorPorM2 } = datos
  const cols = `170px repeat(${filas.length}, minmax(190px, 1fr))`

  return (
    <div style={{ padding: '20px 30px 30px', flex: 1 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap', marginBottom: 18 }}>
        <div>
          <h2 style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-.03em', margin: 0 }}>
            {filas.length === 2 ? 'Las dos que le sirven' : `Las ${filas.length} que le sirven`}
          </h2>
          <p style={{ margin: '5px 0 0', color: '#5B6672', fontSize: 14.5 }}>
            Lado a lado, para decidir mirando una sola pantalla.
          </p>
        </div>
        <button onClick={onCerrar} style={{
          border: '1.5px solid #E4E9EE', background: '#fff', borderRadius: 999, padding: '10px 18px',
          fontSize: 14, fontWeight: 600, color: '#3D3D3D', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
        }}><LeftOutlined /> Volver al catálogo</button>
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: cols, background: '#fff', border: '1.5px solid #E4E9EE',
        borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 2px rgba(16,24,40,.06), 0 4px 14px rgba(16,24,40,.05)',
      }}>
        {/* cabeceras */}
        <div style={{ borderBottom: '1px solid #E4E9EE', background: '#fff' }} />
        {filas.map(({ unidad: u }) => {
          const foto = fotoDe(u)
          return (
            <div key={u.id} style={{ borderBottom: '1px solid #E4E9EE', position: 'relative' }}>
              <div style={{ height: 120, background: 'linear-gradient(135deg,#EDF3F7,#DCE7EE)', display: 'grid', placeItems: 'center', color: '#9DB0BE', overflow: 'hidden' }}>
                {foto
                  ? <img src={foto.mini} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <PictureOutlined style={{ fontSize: 30 }} />}
              </div>
              <button onClick={() => onQuitar(u.id)} aria-label={`Sacar ${u.numero} de la comparación`}
                style={{
                  position: 'absolute', top: 8, right: 8, width: 26, height: 26, borderRadius: '50%', border: 'none',
                  background: 'rgba(255,255,255,.92)', color: '#8b96a3', cursor: 'pointer', display: 'grid', placeItems: 'center',
                }}><CloseOutlined style={{ fontSize: 11 }} /></button>
              <div style={{ padding: '13px 18px' }}>
                <b style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-.02em', display: 'block' }}>
                  {u.tipo === 'BODEGA' ? 'Bodega' : 'Estac.'} {u.numero}
                </b>
                <span style={{ fontSize: 13, color: '#5B6672' }}>{u.edificio?.nombre} · {u.edificio?.comuna}</span>
              </div>
            </div>
          )
        })}

        <Etiqueta>Precio</Etiqueta>
        {filas.map(f => (
          <Celda key={f.unidad.id} destacado={f.precio === mejorPrecio && filas.length > 1 ? 'menor entrada' : null}>
            <div style={{ fontSize: 24, fontWeight: 700, color: AZUL_OSC, letterSpacing: '-.02em' }}>{fmtUF(f.precio)} UF</div>
            {valorUF && <small style={{ display: 'block', fontSize: 13, color: '#5B6672', marginTop: 2 }}>
              ${Math.round(f.precio * valorUF).toLocaleString('es-CL')}
            </small>}
          </Celda>
        ))}

        <Etiqueta>Superficie</Etiqueta>
        {filas.map(f => (
          <Celda key={f.unidad.id} destacado={f.m2 && f.m2 === mayorM2 ? 'la más grande' : null}>
            <span style={{ fontSize: 16.5, fontWeight: 600 }}>{f.m2 ? `${fmtM2(f.m2)} m²` : '—'}</span>
          </Celda>
        ))}

        <Etiqueta>Precio por m²</Etiqueta>
        {filas.map(f => (
          <Celda key={f.unidad.id} destacado={f.porM2 && f.porM2 === mejorPorM2 ? 'mejor valor' : null}>
            <span style={{ fontSize: 16.5, fontWeight: 600 }}>{f.porM2 ? `${fmtUF(f.porM2)} UF` : '—'}</span>
          </Celda>
        ))}

        <Etiqueta>Ubicación</Etiqueta>
        {filas.map(f => (
          <Celda key={f.unidad.id}>
            <span style={{ fontSize: 14.5, fontWeight: 500 }}>
              {f.unidad.edificio?.direccion || f.unidad.edificio?.comuna}
              {f.unidad.piso ? ` · piso ${f.unidad.piso}` : ''}
            </span>
          </Celda>
        ))}

        <Etiqueta>Beneficios</Etiqueta>
        {filas.map(f => {
          const promos = [
            ...(f.unidad.packs || []).map(p => p.pack?.nombre),
            ...(f.unidad.beneficios || []).map(b => b.beneficio?.nombre),
            ...(f.unidad.promociones || []).map(p => p.promocion?.nombre),
          ].filter(Boolean)
          return (
            <Celda key={f.unidad.id}>
              {promos.length
                ? <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {promos.map((p, i) => <span key={i} style={{ ...etq, background: '#F0FDF4', color: '#166534' }}>{p}</span>)}
                  </div>
                : <span style={{ fontSize: 14.5, color: '#9AA5B1' }}>—</span>}
            </Celda>
          )
        })}

        <div style={{ background: '#FAFBFC', borderRight: '1px solid #E4E9EE' }} />
        {filas.map(f => (
          <div key={f.unidad.id} style={{ padding: '16px 18px' }}>
            <button onClick={() => onElegir(f.unidad.id)} style={{
              width: '100%', padding: 12, borderRadius: 9, background: AZUL, color: '#fff',
              fontWeight: 600, fontSize: 14.5, border: 'none', cursor: 'pointer', minHeight: 44,
            }}>Elegir esta</button>
          </div>
        ))}
      </div>
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
