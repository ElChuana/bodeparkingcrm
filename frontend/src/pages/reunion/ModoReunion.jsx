// Modo reunión — la vista que el vendedor le muestra al cliente.
// Sin menú, sin notificaciones, sin comisiones ni etapas: solo el catálogo
// disponible con fotos y el armado de la propuesta. El botón de salida vuelve
// al CRM normal.
//
// Siempre se entra con un cliente: la reunión queda registrada (qué se mostró,
// qué quedó en la propuesta, si terminó en cotización) y al cerrarla aparece en
// el historial del lead como actividad REUNION_COMERCIAL.
import { useState, useMemo, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { App, Select, Modal, Spin, Empty, Input, Button, Popover } from 'antd'
import {
  CloseOutlined, CheckOutlined, PictureOutlined, ShoppingCartOutlined,
  DeleteOutlined, FileTextOutlined, LeftOutlined, RightOutlined, ColumnWidthOutlined,
  MailOutlined, DownloadOutlined, EditOutlined
} from '@ant-design/icons'
import { PDFViewer, pdf } from '@react-pdf/renderer'
import api from '../../services/api'
import { useUF } from '../../hooks/useUF'
import { useAuth } from '../../context/AuthContext'
import { CotizacionDocumento } from '../cotizaciones/CotizacionPDF'
import { cotizacionParaPDF } from '../cotizaciones/cotizacionParaPDF'
import logoUrl from '../../assets/logo.png'
import { Ilustracion, IlustracionEdificio } from './ilustraciones'

const AZUL = '#0091C3'
const AZUL_OSC = '#00719a'

const fmtUF = (n) => Number(n).toLocaleString('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtM2 = (n) => Number(n).toLocaleString('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// Foto que encabeza la ficha: solo la de la unidad. Sin foto propia va la
// ilustración: rellenar con fotos del edificio hacía que veinte bodegas
// distintas se vieran como la misma, y el cliente creía estar mirando dos veces
// lo mismo.
function fotoDe(unidad) {
  const propia = unidad.archivos?.[0]
  return propia ? { url: propia.url, mini: propia.urlMiniatura || propia.url } : null
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
  const [comparando, setComparando] = useState(false)
  const [fotoHero, setFotoHero] = useState(0)              // índice en la galería del edificio
  const leadId = leadIdParam ? Number(leadIdParam) : null

  const { data: unidades = [], isLoading } = useQuery({
    queryKey: ['reunion-catalogo'],
    queryFn: () => api.get('/cotizaciones/unidades-disponibles').then(r => r.data),
    staleTime: 60000,
  })

  // El buscador va contra el servidor: hay más de mil leads, cargarlos todos
  // en el Select dejaba la reunión esperando.
  const [busquedaLead, setBusquedaLead] = useState('')
  const { data: leadsBuscados = [], isFetching: buscandoLeads } = useQuery({
    queryKey: ['reunion-leads', busquedaLead],
    queryFn: () => api.get('/leads', { params: { search: busquedaLead } }).then(r => r.data.slice(0, 50)),
    enabled: busquedaLead.length >= 2,
  })

  const { data: lead } = useQuery({
    queryKey: ['lead', leadId],
    queryFn: () => api.get(`/leads/${leadId}`).then(r => r.data),
    enabled: !!leadId,
  })

  // ── registro de la reunión ────────────────────────────────
  const [sesionId, setSesionId] = useState(null)
  const vistas = useRef(new Set())     // lo que se le llegó a mostrar al cliente
  const cerrada = useRef(false)

  // Abre la sesión al entrar con un cliente. Si se recarga la página en plena
  // reunión, el backend devuelve la que ya estaba abierta.
  useEffect(() => {
    if (!leadId || sesionId) return
    let vigente = true
    api.post('/reuniones', { leadId })
      .then(r => { if (vigente) setSesionId(r.data.id) })
      .catch(() => {}) // que no se caiga la reunión por el registro
    return () => { vigente = false }
  }, [leadId, sesionId])

  const marcarVista = (unidadId) => {
    if (vistas.current.has(unidadId)) return
    vistas.current.add(unidadId)
    if (sesionId) api.patch(`/reuniones/${sesionId}`, { unidadesVistas: [unidadId] }).catch(() => {})
  }

  const cerrarSesion = async (cotizacionId) => {
    if (!sesionId || cerrada.current) return
    cerrada.current = true
    try {
      await api.post(`/reuniones/${sesionId}/cerrar`, {
        unidadesVistas: [...vistas.current],
        unidadesPropuestas: seleccion,
        ...(cotizacionId && { cotizacionId }),
      })
    } catch { /* la reunión ya terminó; no vale la pena molestar al vendedor */ }
  }

  const salir = async () => {
    await cerrarSesion()
    navigate(leadId ? `/leads/${leadId}` : '/leads')
  }

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

  const alternar = (id) => {
    marcarVista(id)
    setSeleccion(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])
  }

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
    setFiltroTipo('TODAS')
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

  // ── Beneficios ────────────────────────────────────────────
  // `POST /cotizaciones` no aplica nada solo: sin esto la cotización salía a
  // precio de lista (34 de 38 unidades tienen precio webinar cargado).
  // Además del que trae la unidad, el vendedor puede ofrecer cualquiera del
  // catálogo: las cuotas sin interés, los gastos operacionales o las repisas no
  // están ligados a ninguna unidad y son justo los que se negocian en la mesa.
  const { data: catalogoBeneficios = [] } = useQuery({
    queryKey: ['reunion-beneficios'],
    queryFn: async () => {
      const vigente = (x) => x.activa !== false && (!x.fechaFin || new Date(x.fechaFin) >= new Date())
      const [promos, packs, benes] = await Promise.all([
        api.get('/promociones').then(r => r.data).catch(() => []),
        api.get('/packs').then(r => r.data).catch(() => []),
        api.get('/beneficios').then(r => r.data).catch(() => []),
      ])
      // Los que están amarrados a unidades concretas (los precios webinar de
      // cada edificio) solo salen si la unidad elegida los trae; ofrecer el
      // "Precio Webinar Trinitarias" para una bodega de Temuco no tiene sentido.
      const general = (x) => !(x._count?.unidades > 0)
      const lista = [
        ...promos.filter(x => vigente(x) && general(x)).map(p => ({
          clave: `promocion-${p.id}`, clase: 'promociones', id: p.id, nombre: p.nombre,
          detalle: p.detalle || (p.minUnidades > 1 ? `Desde ${p.minUnidades} unidades` : null),
          minUnidades: p.minUnidades || 1,
        })),
        ...packs.filter(x => vigente(x) && general(x)).map(p => ({
          clave: `pack-${p.id}`, clase: 'packs', id: p.id, nombre: p.nombre,
          detalle: `Desde ${p.minUnidades || 2} unidades`, minUnidades: p.minUnidades || 2,
        })),
        ...benes.filter(x => vigente(x) && general(x)).map(b => ({
          clave: `beneficio-${b.id}`, clase: 'beneficios', id: b.id, nombre: b.nombre,
          detalle: null, minUnidades: 1,
        })),
      ]
      // El catálogo arrastra el modelo viejo (beneficios/packs) junto al nuevo
      // (promociones), y varios están con el mismo nombre en los dos. En la
      // reunión no se le puede mostrar al cliente "Gastos Operacionales" dos
      // veces: se deja uno solo, con preferencia por la promoción.
      const porNombre = new Map()
      for (const b of lista) {
        const k = b.nombre.trim().toLowerCase().replace(/\s+/g, ' ')
        const previo = porNombre.get(k)
        if (!previo || (previo.clase !== 'promociones' && b.clase === 'promociones')) porNombre.set(k, b)
      }
      return [...porNombre.values()]
    },
    staleTime: 5 * 60000,
  })

  // Los que vienen pegados a las unidades elegidas: se marcan solos
  const automaticos = useMemo(() => {
    const m = new Map()
    for (const u of elegidas) {
      for (const cp of u.promociones || []) if (cp.promocion) {
        m.set(`promocion-${cp.promocion.id}`, {
          clave: `promocion-${cp.promocion.id}`, clase: 'promociones', id: cp.promocion.id,
          nombre: cp.promocion.nombre, detalle: cp.promocion.detalle, minUnidades: cp.promocion.minUnidades || 1,
        })
      }
      for (const cp of u.packs || []) if (cp.pack) {
        m.set(`pack-${cp.pack.id}`, {
          clave: `pack-${cp.pack.id}`, clase: 'packs', id: cp.pack.id,
          nombre: cp.pack.nombre, detalle: `Desde ${cp.pack.minUnidades || 2} unidades`, minUnidades: cp.pack.minUnidades || 2,
        })
      }
      for (const cb of u.beneficios || []) if (cb.beneficio) {
        m.set(`beneficio-${cb.beneficio.id}`, {
          clave: `beneficio-${cb.beneficio.id}`, clase: 'beneficios', id: cb.beneficio.id,
          nombre: cb.beneficio.nombre, detalle: null, minUnidades: 1,
        })
      }
    }
    return [...m.values()]
  }, [elegidas])

  const clavesAutomaticas = useMemo(() => new Set(automaticos.map(b => b.clave)), [automaticos])

  // Lo que el vendedor tocó a mano manda sobre lo automático
  const [beneficiosManual, setBeneficiosManual] = useState({}) // clave → true | false
  const estaPuesto = (clave) => beneficiosManual[clave] ?? clavesAutomaticas.has(clave)
  const alternarBeneficio = (clave) =>
    setBeneficiosManual(p => ({ ...p, [clave]: !estaPuesto(clave) }))

  // Los que exigen 2+ unidades no se ofrecen con una sola
  const beneficiosOfrecibles = useMemo(() => {
    const claves = new Set(automaticos.map(b => b.clave))
    return [...automaticos, ...catalogoBeneficios.filter(b => !claves.has(b.clave))]
      .filter(b => elegidas.length >= (b.minUnidades || 1))
  }, [automaticos, catalogoBeneficios, elegidas.length])

  const beneficiosElegidos = beneficiosOfrecibles.filter(b => estaPuesto(b.clave))
  const [panelBeneficios, setPanelBeneficios] = useState(false)

  // La cotización se crea y se muestra ahí mismo como PDF: la reunión sigue,
  // no se va al editor.
  const [cotizacionPdf, setCotizacionPdf] = useState(null)
  const crearCotizacion = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/cotizaciones', {
        leadId,
        validezDias: 7,
        items: elegidas.map(u => ({ unidadId: u.id, precioListaUF: Number(u.precioUF) })),
      })
      // Los beneficios se agregan uno a uno; cada promoción dispara el
      // recálculo en el backend (lib/promociones.js), que es donde vive el
      // cálculo probado. Acá no se estima nada.
      for (const b of beneficiosElegidos) {
        const campo = b.clase === 'promociones' ? 'promocionId' : b.clase === 'packs' ? 'packId' : 'beneficioId'
        await api.post(`/cotizaciones/${data.id}/${b.clase}`, { [campo]: b.id })
          .catch(() => message.warning(`No se pudo aplicar "${b.nombre}"`))
      }
      // Se recarga completa: ya con promociones aplicadas y totales al día
      return api.get(`/cotizaciones/${data.id}`).then(r => r.data)
    },
    onSuccess: async (cot) => {
      if (sesionId) api.patch(`/reuniones/${sesionId}`, { cotizacionId: cot.id }).catch(() => {})
      setCotizacionPdf(cot)
    },
    onError: (err) => message.error(err.response?.data?.error || 'No se pudo crear la cotización'),
  })

  const alCotizar = () => {
    if (elegidas.length) crearCotizacion.mutate()
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

  // Sin cliente no se entra: la reunión se registra contra alguien.
  if (!leadId) {
    return (
      <div style={{ ...s.raiz, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{
          width: '100%', maxWidth: 480, background: '#fff', border: '1.5px solid #E4E9EE',
          borderRadius: 16, padding: '34px 32px', boxShadow: '0 8px 30px rgba(16,24,40,.08)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 6 }}>
            <span style={{ width: 38, height: 38, borderRadius: 10, background: '#E6F5FA', color: AZUL_OSC, display: 'grid', placeItems: 'center' }}>
              <ShoppingCartOutlined style={{ fontSize: 18 }} />
            </span>
            <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-.02em', margin: 0 }}>¿Con quién es la reunión?</h1>
          </div>
          <p style={{ color: '#5B6672', fontSize: 14.5, margin: '0 0 20px', lineHeight: 1.55 }}>
            Todo lo que le muestres y coticen queda guardado en la ficha del cliente.
          </p>
          <Select
            showSearch autoFocus
            style={{ width: '100%' }}
            size="large"
            placeholder="Escribe el nombre, correo o teléfono…"
            onSearch={setBusquedaLead}
            onChange={(id) => navigate(`/reunion/${id}`, { replace: true })}
            filterOption={false}
            loading={buscandoLeads}
            notFoundContent={
              busquedaLead.length < 2 ? 'Escribe al menos 2 letras'
                : buscandoLeads ? 'Buscando…' : 'Sin resultados'
            }
            options={leadsBuscados.map(l => ({
              value: l.id,
              label: [`${l.contacto?.nombre || ''} ${l.contacto?.apellido || ''}`.trim() || `Lead #${l.id}`,
                l.contacto?.email].filter(Boolean).join(' · '),
            }))}
          />
          <button
            onClick={() => navigate('/leads')}
            style={{
              marginTop: 22, border: 'none', background: 'none', color: '#5B6672',
              fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7,
            }}
          ><LeftOutlined style={{ fontSize: 11 }} /> Volver al CRM</button>
        </div>
      </div>
    )
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
        <button style={s.salir} onClick={salir}>
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
            onClick={() => {
              // Al entrar a un edificio se muestra todo lo suyo: quedarse con
              // "Bodegas" del edificio anterior escondía sus estacionamientos.
              setFiltroTipo('TODAS')
              setFiltroEdificio(filtroEdificio === e.id ? null : e.id)
            }}
          >
            {e.nombre}
            <span style={{ fontSize: 12.5, opacity: .65 }}>{unidades.filter(u => u.edificio?.id === e.id).length}</span>
          </button>
        ))}
      </div>

      {/* ── portada del edificio (al filtrar por uno) ──
          Dos columnas: la foto manda y se ve entera, sin texto encima ni
          degradados. Los datos van al lado, sobre blanco. */}
      {edificioActual && !comparando && (() => {
        const galeria = edificioActual.fotos || []
        const foto = galeria[fotoHero % Math.max(galeria.length, 1)]
        const abrirGaleria = (i = 0) => setVisor({
          titulo: `${edificioActual.nombre} · ${edificioActual.comuna}`,
          fotos: galeria.map(f => ({ ...f, propia: false })), indice: i,
        })
        const Dato = ({ valor, etiqueta }) => (
          <div>
            <b style={{ display: 'block', fontSize: 23, fontWeight: 700, letterSpacing: '-.02em', color: '#111827' }}>{valor}</b>
            <span style={{ fontSize: 11.5, color: '#7A8593', letterSpacing: '.06em', fontWeight: 600 }}>{etiqueta}</span>
          </div>
        )
        return (
          <div style={{ padding: '16px 30px 0' }}>
            <div style={{
              display: 'grid', gridTemplateColumns: 'minmax(0,1.35fr) minmax(280px,1fr)', gap: 22,
              background: '#fff', border: '1.5px solid #E4E9EE', borderRadius: 18, padding: 16,
              boxShadow: '0 1px 2px rgba(16,24,40,.06), 0 4px 14px rgba(16,24,40,.05)',
            }}>
              {/* foto grande + tira de miniaturas */}
              <div>
                <div
                  onClick={() => galeria.length && abrirGaleria(fotoHero % galeria.length)}
                  style={{
                    position: 'relative', height: 'clamp(230px, 36vh, 360px)', borderRadius: 12, overflow: 'hidden',
                    background: '#EDF3F7', cursor: galeria.length ? 'zoom-in' : 'default',
                  }}>
                  {foto
                    ? <img src={foto.url} alt={edificioActual.nombre}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    : <IlustracionEdificio />}
                  {galeria.length > 1 && (
                    <span style={{
                      position: 'absolute', bottom: 10, right: 10, background: 'rgba(17,24,39,.72)', color: '#fff',
                      fontSize: 12, fontWeight: 600, padding: '5px 11px', borderRadius: 999,
                      display: 'flex', alignItems: 'center', gap: 6,
                    }}><PictureOutlined style={{ fontSize: 12 }} /> {galeria.length} fotos</span>
                  )}
                </div>

                {galeria.length > 1 && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 10, overflowX: 'auto', paddingBottom: 2 }}>
                    {galeria.slice(0, 10).map((f, i) => (
                      <button key={f.id} onClick={() => setFotoHero(i)} aria-label={`Foto ${i + 1}`}
                        style={{
                          flex: '0 0 76px', height: 54, borderRadius: 8, overflow: 'hidden', padding: 0, cursor: 'pointer',
                          border: `2px solid ${i === fotoHero % galeria.length ? AZUL : 'transparent'}`,
                          opacity: i === fotoHero % galeria.length ? 1 : .72, background: '#EDF3F7',
                        }}>
                        <img src={f.urlMiniatura || f.url} alt=""
                          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* datos del proyecto */}
              <div style={{ display: 'flex', flexDirection: 'column', padding: '8px 8px 4px' }}>
                <div style={{ fontSize: 12, letterSpacing: '.14em', textTransform: 'uppercase', color: AZUL_OSC, fontWeight: 700 }}>
                  {edificioActual.comuna}
                </div>
                <h2 style={{ fontSize: 'clamp(28px,3.2vw,42px)', fontWeight: 800, letterSpacing: '-.035em', margin: '4px 0 6px', lineHeight: 1.02 }}>
                  {edificioActual.nombre}
                </h2>
                {edificioActual.direccion && (
                  <div style={{ fontSize: 15, color: '#5B6672' }}>{edificioActual.direccion}</div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px 20px', margin: '22px 0 0' }}>
                  <Dato valor={edificioActual.unidades.length} etiqueta="DISPONIBLES" />
                  {edificioActual.m2Min && (
                    <Dato
                      valor={edificioActual.m2Min === edificioActual.m2Max
                        ? `${fmtM2(edificioActual.m2Min)} m²`
                        : `${fmtM2(edificioActual.m2Min)} – ${fmtM2(edificioActual.m2Max)}`}
                      etiqueta="SUPERFICIE m²" />
                  )}
                  <Dato valor={`${fmtUF(edificioActual.desdeUF)} UF`} etiqueta="DESDE" />
                  {valorUF && (
                    <Dato valor={`$${Math.round(edificioActual.desdeUF * valorUF).toLocaleString('es-CL')}`} etiqueta="APROX. EN PESOS" />
                  )}
                </div>

                {/* pasar de un proyecto a otro sin volver a los filtros */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 'auto', paddingTop: 22 }}>
                  <button onClick={() => irAEdificio(-1)} aria-label="Edificio anterior" style={s.flechaNav}><LeftOutlined /></button>
                  <button onClick={() => irAEdificio(1)} aria-label="Edificio siguiente" style={s.flechaNav}><RightOutlined /></button>
                  <span style={{ fontSize: 13.5, color: '#7A8593' }}>
                    {edificios.findIndex(e => e.id === filtroEdificio) + 1} de {edificios.length}
                  </span>
                  <button onClick={() => setFiltroEdificio(null)}
                    style={{ marginLeft: 'auto', border: 'none', background: 'none', color: AZUL_OSC, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
                    Ver todos
                  </button>
                </div>
              </div>
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
                          marcarVista(u.id)
                          setVisor({
                            titulo: `${u.tipo === 'BODEGA' ? 'Bodega' : 'Estacionamiento'} ${u.numero} · ${u.edificio?.nombre}`,
                            fotos: galeriaDe(u), indice: 0,
                          })
                        }}
                      />
                    : <Ilustracion tipo={u.tipo} />}
                  
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
              {/* Beneficios: el cliente ve solo lo que se le está dando. La
                  lista completa de lo que se podría ofrecer queda detrás de un
                  botón discreto — mostrarla abierta era enseñarle la carta de
                  todo lo que puede pedir. */}
              {beneficiosOfrecibles.length > 0 && (
                <div style={{
                  display: 'flex', alignItems: 'flex-start', gap: 8,
                  padding: '11px 18px', borderTop: '1px solid #E4E9EE',
                }}>
                  <span style={{ flex: 1, minWidth: 0, fontSize: 13, lineHeight: 1.45 }}>
                    {beneficiosElegidos.length ? (
                      <>
                        <span style={{ color: '#15803d', fontWeight: 600 }}>Incluye </span>
                        <span style={{ color: '#5B6672' }}>
                          {beneficiosElegidos.map(b => b.nombre).join(' · ')}
                        </span>
                      </>
                    ) : (
                      <span style={{ color: '#9AA5B1' }}>Sin beneficios</span>
                    )}
                  </span>

                  <Popover
                    open={panelBeneficios}
                    onOpenChange={setPanelBeneficios}
                    trigger="click"
                    placement="leftBottom"
                    styles={{ body: { padding: 0 } }}
                    content={
                      <div style={{ width: 320, maxHeight: '60vh', overflow: 'auto', padding: '14px 16px' }}>
                        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Beneficios de la propuesta</div>
                        {[
                          ['Vienen con la unidad', beneficiosOfrecibles.filter(b => clavesAutomaticas.has(b.clave))],
                          ['Se pueden ofrecer', beneficiosOfrecibles.filter(b => !clavesAutomaticas.has(b.clave))],
                        ].map(([titulo, lista]) => lista.length > 0 && (
                          <div key={titulo} style={{ marginBottom: 10 }}>
                            <div style={{ fontSize: 11.5, fontWeight: 700, color: '#9AA5B1', letterSpacing: '.05em', margin: '6px 0 2px' }}>
                              {titulo.toUpperCase()}
                            </div>
                            {lista.map(b => (
                              <button key={b.clave} onClick={() => alternarBeneficio(b.clave)}
                                style={{
                                  display: 'flex', alignItems: 'flex-start', gap: 9, width: '100%', textAlign: 'left',
                                  padding: '6px 0', border: 'none', background: 'none', cursor: 'pointer',
                                }}>
                                <span style={{
                                  flexShrink: 0, width: 17, height: 17, borderRadius: 5, marginTop: 1,
                                  border: `1.5px solid ${estaPuesto(b.clave) ? '#15803d' : '#C9D2DB'}`,
                                  background: estaPuesto(b.clave) ? '#15803d' : '#fff',
                                  display: 'grid', placeItems: 'center', color: '#fff',
                                }}>{estaPuesto(b.clave) && <CheckOutlined style={{ fontSize: 9.5 }} />}</span>
                                <span style={{ minWidth: 0 }}>
                                  <span style={{ display: 'block', fontSize: 13.5, color: estaPuesto(b.clave) ? '#111827' : '#5B6672' }}>
                                    {b.nombre}
                                  </span>
                                  {b.detalle && <span style={{ display: 'block', fontSize: 12, color: '#9AA5B1' }}>{b.detalle}</span>}
                                </span>
                              </button>
                            ))}
                          </div>
                        ))}
                      </div>
                    }
                  >
                    <button
                      aria-label="Elegir beneficios"
                      title="Elegir beneficios"
                      style={{
                        flexShrink: 0, width: 26, height: 26, borderRadius: 7, border: 'none',
                        background: panelBeneficios ? '#E6F5FA' : 'none',
                        color: panelBeneficios ? AZUL_OSC : '#B7C4CE', cursor: 'pointer',
                        display: 'grid', placeItems: 'center',
                      }}
                    ><EditOutlined style={{ fontSize: 14 }} /></button>
                  </Popover>
                </div>
              )}

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
                  {beneficiosElegidos.length
                    ? 'Precios de lista: el descuento de los beneficios se aplica al generar la cotización y sale en el PDF.'
                    : 'Precios de lista.'}
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

      {/* ── la cotización recién creada, sin salir de la reunión ── */}
      {cotizacionPdf && (
        <ModalCotizacion
          cotizacion={cotizacionPdf}
          valorUF={valorUF}
          usuario={usuario}
          message={message}
          onCerrar={() => setCotizacionPdf(null)}
        />
      )}

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

    </div>
  )
}

// La cotización recién creada, en pantalla y lista para mandar. No saca al
// vendedor del modo reunión: se cierra y la conversación sigue.
function ModalCotizacion({ cotizacion, valorUF, usuario, onCerrar, message }) {
  const contacto = cotizacion.lead?.contacto
  const doc = <CotizacionDocumento cotizacion={cotizacionParaPDF(cotizacion)} logoUrl={logoUrl} valorUF={valorUF} />
  const archivo = `Cotizacion-${cotizacion.id}-${contacto?.apellido || 'cliente'}.pdf`

  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [para, setPara] = useState(contacto?.email || '')
  const [asunto, setAsunto] = useState(`Cotización BodeParking N°${cotizacion.id}`)
  const [cuerpo, setCuerpo] = useState('')

  // Sin correo propio configurado el envío falla. Se avisa antes de apretar,
  // no en medio de la reunión: hoy la mitad del equipo no lo tiene puesto.
  const [remitente, setRemitente] = useState(undefined) // undefined = cargando

  // Cuerpo sugerido: la plantilla del vendedor si la tiene configurada
  useEffect(() => {
    const nombre = contacto?.nombre || ''
    const porDefecto =
      `Hola ${nombre},\n\n` +
      `Adjunto la cotización que revisamos hoy. Queda vigente por ${cotizacion.validezDias} días.\n\n` +
      `Cualquier duda me escribes.\n\n${usuario?.nombre || ''}`
    api.get('/email/config')
      .then(r => {
        const plantilla = r.data?.plantillaCotizacion
        setCuerpo(plantilla ? plantilla.replace(/\{nombre\}/g, nombre) : porDefecto)
        setRemitente(r.data?.smtpEmail || null)
      })
      .catch(() => { setCuerpo(porDefecto); setRemitente(null) })
  }, [contacto?.nombre, cotizacion.validezDias, usuario?.nombre])

  const descargar = async () => {
    const blob = await pdf(doc).toBlob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = archivo; a.click()
    URL.revokeObjectURL(url)
  }

  const enviar = async () => {
    if (!para.trim()) return message.warning('Falta el correo del cliente')
    setEnviando(true)
    try {
      const blob = await pdf(doc).toBlob()
      const pdfBase64 = await new Promise((ok, err) => {
        const fr = new FileReader()
        fr.onload = () => ok(String(fr.result).split(',')[1])
        fr.onerror = err
        fr.readAsDataURL(blob)
      })
      await api.post('/email/enviar', {
        para: para.trim(),
        asunto,
        cuerpo: cuerpo.replace(/\n/g, '<br>'),
        pdfBase64,
        pdfNombre: archivo,
        leadId: cotizacion.leadId,
      })
      await api.put(`/cotizaciones/${cotizacion.id}/estado`, { estado: 'ENVIADA' }).catch(() => {})
      setEnviado(true)
      message.success(`Cotización enviada a ${para.trim()}`)
    } catch (err) {
      message.error(err.response?.data?.error || 'No se pudo enviar el correo')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Modal
      open
      onCancel={onCerrar}
      footer={null}
      width="min(1180px, 96vw)"
      centered
      styles={{ body: { padding: 0 } }}
      title={<span style={{ fontSize: 16 }}>Cotización N°{cotizacion.id} · {contacto?.nombre} {contacto?.apellido || ''}</span>}
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.5fr) minmax(320px,.9fr)', gap: 0, minHeight: '68vh' }}>
        <div style={{ background: '#525659' }}>
          <PDFViewer style={{ width: '100%', height: '100%', minHeight: '68vh', border: 'none' }} showToolbar={false}>
            {doc}
          </PDFViewer>
        </div>

        <div style={{ padding: '20px 22px', borderLeft: '1px solid #E4E9EE', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ margin: '0 0 3px', fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
            <MailOutlined style={{ color: AZUL }} /> Enviársela ahora
          </h3>
          <p style={{ margin: '0 0 16px', fontSize: 13.5, color: '#5B6672' }}>
            {remitente
              ? <>Sale desde <b>{remitente}</b> con el PDF adjunto y queda registrada en la ficha del cliente.</>
              : 'Sale con el PDF adjunto y queda registrada en la ficha del cliente.'}
          </p>

          {remitente === null && (
            <div style={{
              background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 9,
              padding: '10px 13px', fontSize: 13, color: '#92400E', marginBottom: 16, lineHeight: 1.5,
            }}>
              No tienes tu correo configurado, así que el envío no va a salir. Puedes
              descargar el PDF ahora y configurarlo después en <b>Mi perfil</b>.
            </div>
          )}

          <label style={etiquetaCampo}>Para</label>
          <Input value={para} onChange={e => setPara(e.target.value)} size="large"
            placeholder="correo@cliente.cl" status={!para.trim() ? 'warning' : ''} />
          {!contacto?.email && (
            <span style={{ fontSize: 12.5, color: '#b45309', marginTop: 5 }}>
              Este cliente no tiene correo guardado: escríbelo y se envía igual.
            </span>
          )}

          <label style={{ ...etiquetaCampo, marginTop: 14 }}>Asunto</label>
          <Input value={asunto} onChange={e => setAsunto(e.target.value)} />

          <label style={{ ...etiquetaCampo, marginTop: 14 }}>Mensaje</label>
          <Input.TextArea value={cuerpo} onChange={e => setCuerpo(e.target.value)} rows={7}
            style={{ resize: 'vertical' }} />

          <div style={{ marginTop: 'auto', paddingTop: 18, display: 'flex', flexDirection: 'column', gap: 9 }}>
            <Button type="primary" size="large" icon={<MailOutlined />} loading={enviando}
              onClick={enviar} disabled={enviado || remitente === null}
              style={{ height: 46, fontWeight: 600, background: enviado ? '#15803d' : undefined, borderColor: enviado ? '#15803d' : undefined }}>
              {enviado ? 'Enviada' : enviando ? 'Enviando…' : 'Enviar por correo'}
            </Button>
            <div style={{ display: 'flex', gap: 9 }}>
              <Button icon={<DownloadOutlined />} onClick={descargar} style={{ flex: 1, height: 40 }}>Descargar</Button>
              <Button onClick={onCerrar} style={{ flex: 1, height: 40 }}>Seguir en la reunión</Button>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  )
}

const etiquetaCampo = {
  display: 'block', fontSize: 12.5, fontWeight: 600, color: '#5B6672',
  marginBottom: 5, letterSpacing: '.02em',
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
