import React, { useState, useRef, useEffect } from 'react'
import { Select, Spin, Upload, App } from 'antd'
import { PaperClipOutlined, FileOutlined, CloseOutlined, SendOutlined, LoadingOutlined } from '@ant-design/icons'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { pdf } from '@react-pdf/renderer'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import api from '../services/api'
import { CotizacionDocumento } from '../pages/cotizaciones/CotizacionPDF'
import logoUrl from '../assets/logo.png'
import { useUF } from '../hooks/useUF'

const PLANTILLAS = [
  {
    key: 'seguimiento',
    emoji: '📋',
    label: 'Seguimiento',
    asunto: 'Seguimiento — BodeParking',
    cuerpo: 'Estimado/a {nombre},\n\nMe comunico desde BodeParking para hacer seguimiento sobre su consulta. ¿Tuvo oportunidad de revisar la información que le enviamos?\n\nQuedo atento a sus comentarios.\n\nSaludos cordiales,',
  },
  {
    key: 'presentacion',
    emoji: '🏠',
    label: 'Presentación',
    asunto: 'Presentación de Bodega — BodeParking',
    cuerpo: 'Estimado/a {nombre},\n\nJunto a este mensaje le comparto información detallada sobre la bodega disponible. Quedamos disponibles para coordinar una visita cuando lo estime conveniente.\n\nSaludos cordiales,',
  },
  {
    key: 'cotizacion',
    emoji: '📄',
    label: 'Cotización',
    asunto: 'Cotización BodeParking',
    cuerpo: 'Estimado/a {nombre},\n\nAdjunto encontrará la cotización solicitada para nuestras bodegas. Quedo a su disposición para cualquier consulta.\n\nSaludos cordiales,',
  },
  {
    key: 'reunion',
    emoji: '✅',
    label: 'Reunión',
    asunto: 'Confirmación de reunión — BodeParking',
    cuerpo: 'Estimado/a {nombre},\n\nConfirmo nuestra reunión para el [FECHA] a las [HORA] en [LUGAR].\n\nSi necesita reagendar, no dude en escribirme.\n\nSaludos cordiales,',
  },
]

function cotizacionParaPDF(cot) {
  const promociones = [
    ...(cot.packs || []).map(cp => ({
      aplicada: true,
      ahorroUF: cp.descuentoAplicadoUF,
      promocion: { nombre: cp.pack?.nombre || 'Pack', tipo: 'DESCUENTO_UF', valorUF: cp.descuentoAplicadoUF },
    })),
    ...(cot.beneficios || []).map(cb => ({
      aplicada: true,
      ahorroUF: 0,
      promocion: { nombre: cb.beneficio?.nombre || 'Beneficio', tipo: cb.beneficio?.tipo || 'OTRO' },
    })),
  ]
  return { ...cot, promociones }
}

function Avatar({ nombre, enviado }) {
  const inicial = (nombre || '?')[0].toUpperCase()
  return (
    <div style={{
      width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
      background: enviado ? '#005f8a' : '#e8f4fb',
      color: enviado ? '#a8d8f0' : '#0091c3',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 11, fontWeight: 700, letterSpacing: '-0.3px',
    }}>{inicial}</div>
  )
}

function MensajeEmail({ e, onResponder }) {
  const [expandido, setExpandido] = useState(true)
  const enviado = e.direction === 'ENVIADO'
  const esNoLeido = !enviado && !e.leido
  const remitente = enviado
    ? (e.usuario?.nombre || 'Tú')
    : (e.de?.replace(/<.*>/, '').trim() || e.de || 'Cliente')
  const hora = format(new Date(e.creadoEn), "d MMM · HH:mm", { locale: es })

  return (
    <div style={{
      display: 'flex',
      flexDirection: enviado ? 'row-reverse' : 'row',
      gap: 8,
      alignItems: 'flex-start',
    }}>
      <Avatar nombre={remitente} enviado={enviado} />

      <div style={{ flex: 1, minWidth: 0, maxWidth: 'calc(100% - 36px)' }}>
        {/* Cabecera del mensaje */}
        <div style={{
          display: 'flex',
          justifyContent: enviado ? 'flex-end' : 'flex-start',
          alignItems: 'center',
          gap: 8,
          marginBottom: 4,
        }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: enviado ? '#0091c3' : '#3d3d3d' }}>
            {remitente}
          </span>
          {esNoLeido && (
            <span style={{
              background: '#0091c3', color: '#fff',
              borderRadius: 6, padding: '1px 6px', fontSize: 9, fontWeight: 700,
              letterSpacing: '0.5px',
            }}>NUEVO</span>
          )}
          <span style={{ fontSize: 10, color: '#b0bec5' }}>{hora}</span>
        </div>

        {/* Tarjeta del mensaje */}
        <div style={{
          background: enviado ? '#0091c3' : '#fff',
          border: enviado ? 'none' : esNoLeido ? '1.5px solid #0091c3' : '1px solid #e8edf2',
          borderRadius: enviado ? '2px 14px 14px 14px' : '14px 14px 14px 2px',
          overflow: 'hidden',
          boxShadow: enviado
            ? '0 2px 8px rgba(0,145,195,0.25)'
            : '0 1px 4px rgba(0,0,0,0.06)',
        }}>
          {/* Asunto */}
          <div
            onClick={() => setExpandido(v => !v)}
            style={{
              padding: '8px 14px',
              borderBottom: expandido
                ? (enviado ? '1px solid rgba(255,255,255,0.15)' : '1px solid #f0f4f8')
                : 'none',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              cursor: 'pointer',
              userSelect: 'none',
            }}
          >
            <span style={{
              fontSize: 11, fontWeight: 700,
              color: enviado ? 'rgba(255,255,255,0.75)' : '#64748b',
              letterSpacing: '0.2px',
            }}>
              {e.asunto}
            </span>
            <span style={{ fontSize: 10, color: enviado ? 'rgba(255,255,255,0.4)' : '#b0bec5', marginLeft: 8 }}>
              {expandido ? '▲' : '▼'}
            </span>
          </div>

          {/* Cuerpo */}
          {expandido && (
            <div style={{ padding: '10px 14px' }}>
              <div
                style={{
                  fontSize: 13, lineHeight: 1.65,
                  color: enviado ? '#fff' : '#2d3748',
                }}
                dangerouslySetInnerHTML={{ __html: e.cuerpo }}
              />
              {!enviado && (
                <div style={{ marginTop: 10, display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => onResponder(e.asunto)}
                    style={{
                      background: 'none',
                      border: '1px solid #0091c3',
                      borderRadius: 8,
                      padding: '4px 12px',
                      fontSize: 11, fontWeight: 600,
                      color: '#0091c3', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 4,
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { e.target.style.background = '#0091c3'; e.target.style.color = '#fff' }}
                    onMouseLeave={e => { e.target.style.background = 'none'; e.target.style.color = '#0091c3' }}
                  >
                    ↩ Responder
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function EmailCard({ leadId, emailPara, nombreLead }) {
  const [asunto, setAsunto] = useState('')
  const [cuerpo, setCuerpo] = useState('')
  const [cotSeleccionadas, setCotSeleccionadas] = useState([])
  const [archivos, setArchivos] = useState([])
  const [generandoPdf, setGenerandoPdf] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [mostrarComposer, setMostrarComposer] = useState(false)
  const bottomRef = useRef(null)
  const textareaRef = useRef(null)
  const asuntoRef = useRef(null)
  const { message } = App.useApp()
  const qc = useQueryClient()
  const { valorUF } = useUF()

  const { data: emails = [], isLoading: cargandoEmails } = useQuery({
    queryKey: ['email-conversacion', leadId],
    queryFn: () => api.get(`/email/conversacion/${leadId}`).then(r => r.data),
    enabled: !!leadId,
    refetchInterval: 30000,
  })

  const { data: cotizaciones = [] } = useQuery({
    queryKey: ['cotizaciones-lead', leadId],
    queryFn: () => api.get(`/cotizaciones?leadId=${leadId}`).then(r => r.data),
    enabled: !!leadId,
  })

  const noLeidos = emails.filter(e => e.direction === 'RECIBIDO' && !e.leido).length

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [emails.length])

  useEffect(() => {
    if (noLeidos > 0) {
      api.patch(`/email/conversacion/${leadId}/leer`).catch(() => {})
    }
  }, [leadId, noLeidos])

  const aplicarPlantilla = (key) => {
    const p = PLANTILLAS.find(x => x.key === key)
    if (!p) return
    setAsunto(p.asunto)
    setCuerpo(p.cuerpo.replace(/\{nombre\}/g, nombreLead || ''))
    setMostrarComposer(true)
    setTimeout(() => textareaRef.current?.focus(), 80)
  }

  const onArchivoChange = ({ fileList }) => {
    fileList.forEach(f => {
      if (!f.originFileObj) return
      setArchivos(prev => {
        if (prev.find(a => a.nombre === f.name)) return prev
        const reader = new FileReader()
        reader.onloadend = () => {
          const base64 = reader.result.split(',')[1]
          setArchivos(p => p.find(a => a.nombre === f.name) ? p : [...p, { nombre: f.name, base64 }])
        }
        reader.readAsDataURL(f.originFileObj)
        return prev
      })
    })
  }

  const enviar = async () => {
    if (!asunto.trim()) { message.warning('Escribe un asunto'); asuntoRef.current?.focus(); return }
    if (!cuerpo.trim()) { message.warning('Escribe el mensaje'); textareaRef.current?.focus(); return }

    setEnviando(true)
    setGenerandoPdf(true)

    try {
      const adjuntosCot = []
      for (const cotId of cotSeleccionadas) {
        try {
          const { data: cot } = await api.get(`/cotizaciones/${cotId}`)
          const blob = await pdf(
            <CotizacionDocumento cotizacion={cotizacionParaPDF(cot)} logoUrl={logoUrl} valorUF={valorUF} />
          ).toBlob()
          const base64 = await new Promise(resolve => {
            const reader = new FileReader()
            reader.onloadend = () => resolve(reader.result.split(',')[1])
            reader.readAsDataURL(blob)
          })
          adjuntosCot.push({ nombre: `Cotizacion_BodeParking_${cotId}.pdf`, base64 })
        } catch {
          message.warning(`No se pudo generar PDF de cotización #${cotId}`)
        }
      }

      setGenerandoPdf(false)

      await api.post('/email/enviar', {
        para: emailPara,
        asunto,
        cuerpo,
        leadId,
        adjuntos: [...adjuntosCot, ...archivos],
      })

      message.success('Email enviado')
      limpiar()
      qc.invalidateQueries({ queryKey: ['email-conversacion', leadId] })
    } catch (err) {
      setGenerandoPdf(false)
      message.error(err.response?.data?.error || 'No se pudo enviar el email')
    } finally {
      setEnviando(false)
    }
  }

  const limpiar = () => {
    setAsunto('')
    setCuerpo('')
    setCotSeleccionadas([])
    setArchivos([])
    setMostrarComposer(false)
  }

  const responder = (asuntoOriginal) => {
    setAsunto(asuntoOriginal.startsWith('Re:') ? asuntoOriginal : `Re: ${asuntoOriginal}`)
    setCuerpo('')
    setMostrarComposer(true)
    setTimeout(() => textareaRef.current?.focus(), 80)
  }

  const totalAdjuntos = cotSeleccionadas.length + archivos.length

  return (
    <div style={{
      background: '#fff',
      border: '1px solid #e2e8f0',
      borderRadius: 12,
      marginTop: 16,
      overflow: 'hidden',
      boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    }}>

      {/* ── Header ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px',
        background: 'linear-gradient(135deg, #0091c3 0%, #006e97 100%)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'rgba(255,255,255,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 15,
          }}>✉</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: '#fff', letterSpacing: '-0.2px' }}>
              Conversación email
            </div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.65)', marginTop: 1 }}>
              {emailPara || 'Sin email configurado'}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {noLeidos > 0 && (
            <div style={{
              background: '#ca3a36', color: '#fff',
              borderRadius: 20, padding: '2px 9px',
              fontSize: 10, fontWeight: 700, letterSpacing: '0.3px',
            }}>
              {noLeidos} sin leer
            </div>
          )}
          <div style={{
            fontSize: 10, color: 'rgba(255,255,255,0.5)',
            background: 'rgba(255,255,255,0.1)',
            borderRadius: 6, padding: '3px 8px',
          }}>
            {emails.length} mensaje{emails.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* ── Hilo de mensajes ── */}
      <div style={{
        padding: '16px 14px',
        minHeight: 80,
        maxHeight: 380,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        background: '#f7f9fc',
        backgroundImage: 'radial-gradient(circle at 1px 1px, #e8edf2 1px, transparent 0)',
        backgroundSize: '20px 20px',
      }}>
        {cargandoEmails && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
            <Spin size="small" />
          </div>
        )}

        {!cargandoEmails && emails.length === 0 && (
          <div style={{ textAlign: 'center', padding: '32px 20px' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>
              Sin mensajes aún
            </div>
            <div style={{ fontSize: 11, color: '#94a3b8' }}>
              Usá una plantilla o redactá abajo para iniciar la conversación
            </div>
          </div>
        )}

        {!cargandoEmails && emails.map(e => (
          <MensajeEmail key={e.id} e={e} onResponder={responder} />
        ))}

        <div ref={bottomRef} />
      </div>

      {/* ── Plantillas rápidas (cuando composer cerrado) ── */}
      {!mostrarComposer && (
        <div style={{
          padding: '12px 16px',
          borderTop: '1px solid #e8edf2',
          background: '#fff',
        }}>
          <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: 8 }}>
            Enviar email
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            {PLANTILLAS.map(p => (
              <button
                key={p.key}
                onClick={() => aplicarPlantilla(p.key)}
                style={{
                  background: '#f1f5f9',
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  padding: '6px 12px',
                  fontSize: 11,
                  color: '#475569',
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 5,
                  fontWeight: 500,
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#e8f4fb'; e.currentTarget.style.borderColor = '#0091c3'; e.currentTarget.style.color = '#0091c3' }}
                onMouseLeave={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#475569' }}
              >
                <span>{p.emoji}</span> {p.label}
              </button>
            ))}
            <button
              onClick={() => { setMostrarComposer(true); setTimeout(() => asuntoRef.current?.focus(), 80) }}
              style={{
                background: '#0091c3',
                border: 'none',
                borderRadius: 8,
                padding: '6px 14px',
                fontSize: 11, fontWeight: 700,
                color: '#fff', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 5,
              }}
            >
              ✏ Redactar
            </button>
          </div>
        </div>
      )}

      {/* ── Composer ── */}
      {mostrarComposer && (
        <div style={{ borderTop: '2px solid #0091c3', background: '#fff' }}>

          {/* Para */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 16px',
            borderBottom: '1px solid #f0f4f8',
          }}>
            <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', minWidth: 42 }}>Para</span>
            <span style={{
              fontSize: 12.5, color: '#2d3748', fontWeight: 500,
              background: '#f1f5f9', borderRadius: 6, padding: '3px 10px',
            }}>{emailPara}</span>
          </div>

          {/* Asunto */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 16px',
            borderBottom: '1px solid #f0f4f8',
          }}>
            <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', minWidth: 42 }}>Asunto</span>
            <input
              ref={asuntoRef}
              value={asunto}
              onChange={e => setAsunto(e.target.value)}
              placeholder="Asunto del email..."
              onKeyDown={e => e.key === 'Tab' && (e.preventDefault(), textareaRef.current?.focus())}
              style={{
                flex: 1, border: 'none', fontSize: 13,
                fontWeight: 500, color: '#1a2533',
                outline: 'none', background: 'transparent',
              }}
            />
          </div>

          {/* Cuerpo */}
          <div style={{ padding: '12px 16px' }}>
            <textarea
              ref={textareaRef}
              value={cuerpo}
              onChange={e => setCuerpo(e.target.value)}
              rows={6}
              placeholder="Escribe tu mensaje aquí..."
              style={{
                width: '100%', border: 'none', padding: 0,
                fontSize: 13, color: '#2d3748', lineHeight: 1.7,
                resize: 'none', fontFamily: 'inherit',
                outline: 'none', background: 'transparent',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Chips de adjuntos */}
          {(cotSeleccionadas.length > 0 || archivos.length > 0) && (
            <div style={{
              padding: '0 16px 12px',
              display: 'flex', gap: 6, flexWrap: 'wrap',
            }}>
              {cotSeleccionadas.map(id => {
                const cot = cotizaciones.find(c => c.id === id)
                return (
                  <div key={id} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    background: '#e8f4fb',
                    border: '1px solid #b8dff0',
                    borderRadius: 8, padding: '4px 10px',
                    fontSize: 11, color: '#006e97', fontWeight: 500,
                  }}>
                    <PaperClipOutlined style={{ fontSize: 10, color: '#0091c3' }} />
                    <span>Cot. #{id}{cot ? ` · ${cot.estado}` : ''}</span>
                    <CloseOutlined
                      style={{ fontSize: 9, cursor: 'pointer', color: '#0091c3', opacity: 0.7 }}
                      onClick={() => setCotSeleccionadas(p => p.filter(c => c !== id))}
                    />
                  </div>
                )
              })}
              {archivos.map(a => (
                <div key={a.nombre} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  background: '#f1f5f9',
                  border: '1px solid #e2e8f0',
                  borderRadius: 8, padding: '4px 10px',
                  fontSize: 11, color: '#475569', fontWeight: 500,
                }}>
                  <FileOutlined style={{ fontSize: 10, color: '#64748b' }} />
                  <span>{a.nombre}</span>
                  <CloseOutlined
                    style={{ fontSize: 9, cursor: 'pointer', color: '#64748b', opacity: 0.7 }}
                    onClick={() => setArchivos(p => p.filter(x => x.nombre !== a.nombre))}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Toolbar */}
          <div style={{
            padding: '10px 16px',
            borderTop: '1px solid #f0f4f8',
            background: '#fafbfc',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            flexWrap: 'wrap', gap: 8,
          }}>
            {/* Adjuntos */}
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
              <Select
                mode="multiple"
                placeholder="📎 Adjuntar cotizaciones"
                size="small"
                style={{ minWidth: 185 }}
                value={cotSeleccionadas}
                onChange={setCotSeleccionadas}
                allowClear
                maxTagCount={0}
                maxTagPlaceholder={n => `${n} cot. adjunta${n > 1 ? 's' : ''}`}
                options={cotizaciones.map(c => ({
                  value: c.id,
                  label: `Cot. #${c.id} — ${c.estado}`,
                }))}
              />
              <Upload
                showUploadList={false}
                beforeUpload={() => false}
                multiple
                onChange={onArchivoChange}
              >
                <button style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  background: '#fff', border: '1px solid #e2e8f0',
                  borderRadius: 6, padding: '4px 10px',
                  fontSize: 11, color: '#475569', cursor: 'pointer',
                  fontWeight: 500,
                }}>
                  <FileOutlined style={{ fontSize: 11 }} />
                  Archivos{archivos.length > 0 ? ` (${archivos.length})` : ''}
                </button>
              </Upload>
              {totalAdjuntos > 0 && (
                <span style={{ fontSize: 10, color: '#0091c3', fontWeight: 600 }}>
                  {totalAdjuntos} adjunto{totalAdjuntos > 1 ? 's' : ''}
                </span>
              )}
            </div>

            {/* Acciones */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button
                onClick={limpiar}
                style={{
                  background: 'none', border: 'none',
                  fontSize: 11, color: '#94a3b8', cursor: 'pointer', padding: '5px 8px',
                  borderRadius: 6,
                }}
              >Cancelar</button>
              <button
                onClick={enviar}
                disabled={enviando}
                style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  background: enviando ? '#64a8c5' : '#0091c3',
                  border: 'none', borderRadius: 8,
                  padding: '7px 18px',
                  fontSize: 12, fontWeight: 700, color: '#fff',
                  cursor: enviando ? 'not-allowed' : 'pointer',
                  boxShadow: enviando ? 'none' : '0 2px 6px rgba(0,145,195,0.35)',
                  transition: 'all 0.15s',
                }}
              >
                {enviando
                  ? <><LoadingOutlined spin /> {generandoPdf ? 'Generando PDFs...' : 'Enviando...'}</>
                  : <><SendOutlined /> Enviar</>
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
