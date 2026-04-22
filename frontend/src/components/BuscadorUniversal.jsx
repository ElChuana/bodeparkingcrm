import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Input, Tag, Typography, Spin } from 'antd'
import { SearchOutlined, TeamOutlined, AppstoreOutlined, ShoppingOutlined, UserOutlined } from '@ant-design/icons'
import api from '../services/api'

const { Text } = Typography

const ETAPA_LABEL = {
  NUEVO: 'Nuevo', NO_CONTESTA: 'No contesta', SEGUIMIENTO: 'Seguimiento',
  COTIZACION_ENVIADA: 'Cotización enviada', VISITA_AGENDADA: 'Visita agendada',
  VISITA_REALIZADA: 'Visita realizada', SEGUIMIENTO_POST_VISITA: 'Seguimiento post visita',
  NEGOCIACION: 'Negociación', RESERVA: 'Reserva', PROMESA: 'Promesa',
  ESCRITURA: 'Escritura', ENTREGA: 'Entrega', POSTVENTA: 'Postventa', PERDIDO: 'Perdido',
}
const ESTADO_VENTA_COLOR = { RESERVA: 'orange', PROMESA: 'blue', ESCRITURA: 'purple', ENTREGADO: 'green', ANULADO: 'red' }
const ESTADO_UNIDAD_COLOR = { DISPONIBLE: 'green', RESERVADO: 'orange', VENDIDO: 'red', ARRENDADO: 'blue' }

function GrupoResultados({ icono, titulo, color, items, renderItem }) {
  if (!items?.length) return null
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px 4px', background: '#fafafa', borderBottom: '1px solid #f0f0f0' }}>
        <span style={{ color, fontSize: 13 }}>{icono}</span>
        <Text style={{ fontSize: 12, fontWeight: 600, color: '#555' }}>{titulo}</Text>
        <Tag style={{ marginLeft: 'auto', fontSize: 11 }}>{items.length}</Tag>
      </div>
      {items.map((item, i) => renderItem(item, i))}
    </div>
  )
}

function FilaResultado({ onClick, children }) {
  const [hover, setHover] = useState(false)
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        padding: '8px 14px', cursor: 'pointer',
        background: hover ? '#f0f5ff' : '#fff',
        borderBottom: '1px solid #f5f5f5',
        transition: 'background 0.1s',
      }}
    >
      {children}
    </div>
  )
}

export default function BuscadorUniversal() {
  const [query, setQuery] = useState('')
  const [resultados, setResultados] = useState(null)
  const [cargando, setCargando] = useState(false)
  const [abierto, setAbierto] = useState(false)
  const navigate = useNavigate()
  const timerRef = useRef(null)
  const wrapperRef = useRef(null)

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setAbierto(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const buscar = useCallback(async (texto) => {
    if (texto.trim().length < 2) {
      setResultados(null)
      setCargando(false)
      return
    }
    setCargando(true)
    try {
      const res = await api.get('/buscar', { params: { q: texto } })
      setResultados(res.data)
    } catch {
      setResultados(null)
    } finally {
      setCargando(false)
    }
  }, [])

  const onChange = (e) => {
    const val = e.target.value
    setQuery(val)
    setAbierto(true)
    clearTimeout(timerRef.current)
    if (val.trim().length < 2) { setResultados(null); setCargando(false); return }
    setCargando(true)
    timerRef.current = setTimeout(() => buscar(val), 300)
  }

  const ir = (ruta) => {
    setAbierto(false)
    setQuery('')
    setResultados(null)
    navigate(ruta)
  }

  const hayResultados = resultados && (
    resultados.leads?.length || resultados.unidades?.length ||
    resultados.ventas?.length || resultados.contactos?.length
  )

  const mostrarDropdown = abierto && query.trim().length >= 2

  return (
    <div ref={wrapperRef} style={{ position: 'relative', width: '100%', maxWidth: 460 }}>
      <Input
        prefix={cargando ? <Spin size="small" /> : <SearchOutlined style={{ color: '#999' }} />}
        placeholder="Buscar leads, unidades, ventas, contactos..."
        value={query}
        onChange={onChange}
        onFocus={() => query.trim().length >= 2 && setAbierto(true)}
        allowClear
        onClear={() => { setQuery(''); setResultados(null); setAbierto(false) }}
        style={{ borderRadius: 20, fontSize: 13 }}
      />

      {mostrarDropdown && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
          background: '#fff', borderRadius: 8, zIndex: 1100,
          boxShadow: '0 6px 24px rgba(0,0,0,0.12)',
          border: '1px solid #e8e8e8',
          maxHeight: 480, overflowY: 'auto',
        }}>

          {cargando && !resultados && (
            <div style={{ padding: 20, textAlign: 'center' }}>
              <Spin size="small" /> <Text type="secondary" style={{ marginLeft: 8, fontSize: 13 }}>Buscando...</Text>
            </div>
          )}

          {!cargando && !hayResultados && resultados !== null && (
            <div style={{ padding: '16px 14px', textAlign: 'center' }}>
              <Text type="secondary" style={{ fontSize: 13 }}>Sin resultados para "{query}"</Text>
            </div>
          )}

          {/* ── Leads ── */}
          <GrupoResultados
            icono={<TeamOutlined />} titulo="Leads" color="#1677ff"
            items={resultados?.leads}
            renderItem={(l, i) => (
              <FilaResultado key={i} onClick={() => ir(`/leads/${l.id}`)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <Text strong style={{ fontSize: 13 }}>
                      {l.contacto.nombre} {l.contacto.apellido}
                    </Text>
                    <div style={{ display: 'flex', gap: 6, marginTop: 2, flexWrap: 'wrap' }}>
                      {l.contacto.email && <Text type="secondary" style={{ fontSize: 11 }}>{l.contacto.email}</Text>}
                      {l.contacto.telefono && <Text type="secondary" style={{ fontSize: 11 }}>{l.contacto.telefono}</Text>}
                    </div>
                  </div>
                  <Tag color="blue" style={{ fontSize: 11, flexShrink: 0 }}>
                    {ETAPA_LABEL[l.etapa] || l.etapa}
                  </Tag>
                </div>
              </FilaResultado>
            )}
          />

          {/* ── Unidades ── */}
          <GrupoResultados
            icono={<AppstoreOutlined />} titulo="Unidades" color="#52c41a"
            items={resultados?.unidades}
            renderItem={(u, i) => (
              <FilaResultado key={i} onClick={() => ir('/inventario')}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <Text strong style={{ fontSize: 13 }}>{u.edificio.nombre} — {u.numero}</Text>
                    <div style={{ marginTop: 2 }}>
                      <Text type="secondary" style={{ fontSize: 11 }}>{u.tipo?.toLowerCase()}</Text>
                      {u.precioUF && <Text type="secondary" style={{ fontSize: 11 }}> · {u.precioUF} UF</Text>}
                    </div>
                  </div>
                  <Tag color={ESTADO_UNIDAD_COLOR[u.estado]} style={{ fontSize: 11, flexShrink: 0 }}>
                    {u.estado?.toLowerCase()}
                  </Tag>
                </div>
              </FilaResultado>
            )}
          />

          {/* ── Ventas ── */}
          <GrupoResultados
            icono={<ShoppingOutlined />} titulo="Ventas" color="#722ed1"
            items={resultados?.ventas}
            renderItem={(v, i) => (
              <FilaResultado key={i} onClick={() => ir(`/ventas/${v.id}`)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <Text strong style={{ fontSize: 13 }}>
                      {v.comprador.nombre} {v.comprador.apellido}
                    </Text>
                    <div style={{ marginTop: 2 }}>
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        {v.unidades?.[0]?.edificio?.nombre}{v.unidades?.length > 0 ? ` — ${v.unidades.map(u => u.numero).join(', ')}` : ''} · {v.precioFinalUF} UF
                      </Text>
                    </div>
                  </div>
                  <Tag color={ESTADO_VENTA_COLOR[v.estado]} style={{ fontSize: 11, flexShrink: 0 }}>
                    {v.estado}
                  </Tag>
                </div>
              </FilaResultado>
            )}
          />

          {/* ── Contactos ── */}
          <GrupoResultados
            icono={<UserOutlined />} titulo="Contactos" color="#fa8c16"
            items={resultados?.contactos}
            renderItem={(c, i) => (
              <FilaResultado key={i} onClick={() => ir('/leads')}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <Text strong style={{ fontSize: 13 }}>{c.nombre} {c.apellido}</Text>
                    <div style={{ display: 'flex', gap: 6, marginTop: 2, flexWrap: 'wrap' }}>
                      {c.email && <Text type="secondary" style={{ fontSize: 11 }}>{c.email}</Text>}
                      {c.telefono && <Text type="secondary" style={{ fontSize: 11 }}>{c.telefono}</Text>}
                      {c.empresa && <Text type="secondary" style={{ fontSize: 11 }}>· {c.empresa}</Text>}
                    </div>
                  </div>
                  <Tag style={{ fontSize: 11, flexShrink: 0 }}>{c._count.leads} lead{c._count.leads !== 1 ? 's' : ''}</Tag>
                </div>
              </FilaResultado>
            )}
          />


        </div>
      )}
    </div>
  )
}
