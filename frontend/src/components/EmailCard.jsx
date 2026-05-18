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
    label: 'Seguimiento',
    asunto: 'Seguimiento — BodeParking',
    cuerpo: 'Estimado/a {nombre},\n\nMe comunico desde BodeParking para hacer seguimiento sobre su consulta. ¿Tuvo oportunidad de revisar la información que le enviamos?\n\nQuedo atento a sus comentarios.\n\nSaludos cordiales,',
  },
  {
    key: 'presentacion',
    label: 'Presentación',
    asunto: 'Presentación de Bodega — BodeParking',
    cuerpo: 'Estimado/a {nombre},\n\nJunto a este mensaje le comparto información detallada sobre la bodega disponible. Quedamos disponibles para coordinar una visita cuando lo estime conveniente.\n\nSaludos cordiales,',
  },
  {
    key: 'cotizacion',
    label: 'Cotización',
    asunto: 'Cotización BodeParking',
    cuerpo: 'Estimado/a {nombre},\n\nAdjunto encontrará la cotización solicitada para nuestras bodegas. Quedo a su disposición para cualquier consulta.\n\nSaludos cordiales,',
  },
  {
    key: 'reunion',
    label: 'Reunión',
    asunto: 'Confirmación de reunión — BodeParking',
    cuerpo: 'Estimado/a {nombre},\n\nConfirmo nuestra reunión para el [FECHA] a las [HORA] en [LUGAR].\n\nSi necesita reagendar, no dude en escribirme.\n\nSaludos cordiales,',
  },
  {
    key: 'sin_contacto',
    label: 'Sin contacto',
    asunto: 'Contacto pendiente — BodeParking',
    cuerpo: 'Estimado/a {nombre},\n\nJunto con saludar, esperamos que se encuentre muy bien.\n\nLe comentamos que hemos intentado comunicarnos telefónicamente con usted durante el día, pero no nos ha sido posible tomar contacto.\n\nAgradeceríamos, por favor, si nos pudiera indicar un horario que le acomode o bien contactarnos directamente cuando tenga disponibilidad, para así poder conversar, resolver sus dudas y orientarlo/a de la mejor manera en su proceso de inversión.\n\nQuedamos atentos a sus comentarios.\n\nSaludos cordiales,',
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

function iniciales(nombre) {
  if (!nombre) return '?'
  const partes = nombre.trim().split(' ')
  return partes.length >= 2
    ? (partes[0][0] + partes[1][0]).toUpperCase()
    : partes[0][0].toUpperCase()
}

function BubbleAvatar({ label, sent }) {
  return (
    <div style={{
      width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
      background: sent ? '#0091c3' : '#e8f4fb',
      color: sent ? '#fff' : '#0091c3',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 10, fontWeight: 700, marginTop: 2,
      userSelect: 'none',
    }}>{label}</div>
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
  const avatarLabel = iniciales(remitente)
  const horaAbierto = e.abiertoEn ? format(new Date(e.abiertoEn), "HH:mm", { locale: es }) : null

  return (
    <div style={{
      display: 'flex',
      flexDirection: enviado ? 'row-reverse' : 'row',
      alignItems: 'flex-start',
      gap: 8,
    }}>
      <BubbleAvatar label={avatarLabel} sent={enviado} />

      <div style={{ maxWidth: '72%', minWidth: 0 }}>
        {/* Nombre + hora + badge leído */}
        <div style={{
          display: 'flex',
          justifyContent: enviado ? 'flex-end' : 'flex-start',
          alignItems: 'center',
          gap: 6,
          marginBottom: 3,
        }}>
          {esNoLeido && (
            <span style={{
              background: '#0091c3', color: '#fff',
              borderRadius: 99, padding: '1px 6px',
              fontSize: 9, fontWeight: 700, letterSpacing: '0.5px',
            }}>NUEVO</span>
          )}
          <span style={{ fontSize: 11, color: '#9ca3af' }}>{hora}</span>
          {enviado && e.abierto && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 3,
              background: '#f0fdf4', border: '1px solid #bbf7d0',
              borderRadius: 99, padding: '1px 7px',
              fontSize: 9, fontWeight: 600, color: '#16a34a',
            }}>
              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              Leído{horaAbierto ? ` · ${horaAbierto}` : ''}
            </span>
          )}
          {enviado && !e.abierto && (
            <span style={{ fontSize: 9, color: '#d1d5db' }}>
              <svg width="10" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </span>
          )}
        </div>

        {/* Burbuja */}
        <div
          onClick={() => setExpandido(v => !v)}
          style={{
            background: enviado ? '#0091c3' : '#fff',
            border: enviado ? 'none' : esNoLeido ? '1.5px solid #0091c3' : '1px solid #e5e7eb',
            borderRadius: enviado ? '12px 12px 3px 12px' : '12px 12px 12px 3px',
            overflow: 'hidden',
            boxShadow: enviado
              ? '0 2px 8px rgba(0,145,195,0.2)'
              : '0 1px 3px rgba(0,0,0,0.06)',
            cursor: 'pointer',
          }}
        >
          {/* Asunto colapsable */}
          <div style={{
            padding: '7px 13px',
            borderBottom: expandido
              ? (enviado ? '1px solid rgba(255,255,255,0.15)' : '1px solid #f3f4f6')
              : 'none',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            gap: 8,
          }}>
            <span style={{
              fontSize: 11, fontWeight: 600,
              color: enviado ? 'rgba(255,255,255,0.8)' : '#6b7280',
              userSelect: 'none',
            }}>
              {e.asunto}
            </span>
            <span style={{ fontSize: 9, color: enviado ? 'rgba(255,255,255,0.4)' : '#d1d5db', flexShrink: 0 }}>
              {expandido ? '▲' : '▼'}
            </span>
          </div>

          {/* Cuerpo */}
          {expandido && (
            <div style={{ padding: '10px 13px' }}>
              <div
                style={{ fontSize: 13, lineHeight: 1.65, color: enviado ? '#fff' : '#1f2937' }}
                dangerouslySetInnerHTML={{ __html: e.cuerpo }}
              />
              {!enviado && (
                <div style={{ marginTop: 10, display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    onClick={ev => { ev.stopPropagation(); onResponder(e.asunto) }}
                    style={{
                      background: 'none',
                      border: '1px solid #0091c3',
                      borderRadius: 7,
                      padding: '4px 11px',
                      fontSize: 11, fontWeight: 600,
                      color: '#0091c3', cursor: 'pointer',
                    }}
                    onMouseEnter={ev => { ev.currentTarget.style.background = '#0091c3'; ev.currentTarget.style.color = '#fff' }}
                    onMouseLeave={ev => { ev.currentTarget.style.background = 'none'; ev.currentTarget.style.color = '#0091c3' }}
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
  const leadIniciales = iniciales(nombreLead || emailPara || '?')

  return (
    <div style={{
      background: '#fff',
      border: '1px solid #e5e7eb',
      borderRadius: 12,
      marginTop: 16,
      overflow: 'hidden',
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      display: 'flex',
      flexDirection: 'column',
    }}>

      {/* ── Header blanco ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '12px 16px',
        background: '#fff',
        borderBottom: '1px solid #e5e7eb',
      }}>
        {/* Avatar del lead */}
        <div style={{
          width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
          background: '#e8f4fb',
          color: '#0091c3',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 700,
        }}>{leadIniciales}</div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#111827', lineHeight: 1.3 }}>
            {nombreLead || 'Sin nombre'}
          </div>
          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>
            {emailPara || 'Sin email'}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {noLeidos > 0 && (
            <div style={{
              background: '#ca3a36', color: '#fff',
              borderRadius: 99, padding: '2px 8px',
              fontSize: 10, fontWeight: 700,
            }}>
              {noLeidos} sin leer
            </div>
          )}
          <div style={{ fontSize: 10, color: '#9ca3af' }}>
            {emails.length} mensaje{emails.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* ── Hilo de mensajes ── */}
      <div style={{
        padding: '14px 14px',
        minHeight: 80,
        maxHeight: 380,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        background: '#f9fafb',
      }}>
        {cargandoEmails && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
            <Spin size="small" />
          </div>
        )}

        {!cargandoEmails && emails.length === 0 && (
          <div style={{ textAlign: 'center', padding: '32px 20px' }}>
            <div style={{
              width: 44, height: 44, borderRadius: '50%',
              background: '#e8f4fb', margin: '0 auto 10px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0091c3" strokeWidth="1.8">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
              Sin mensajes aún
            </div>
            <div style={{ fontSize: 11, color: '#9ca3af' }}>
              Usa una plantilla o redacta abajo para iniciar la conversación
            </div>
          </div>
        )}

        {!cargandoEmails && emails.map(e => (
          <MensajeEmail key={e.id} e={e} onResponder={responder} />
        ))}

        <div ref={bottomRef} />
      </div>

      {/* ── Plantillas rápidas ── */}
      {!mostrarComposer && (
        <div style={{
          padding: '10px 14px',
          borderTop: '1px solid #e5e7eb',
          background: '#fff',
          display: 'flex',
          gap: 6,
          flexWrap: 'wrap',
          alignItems: 'center',
        }}>
          {PLANTILLAS.map(p => (
            <button
              key={p.key}
              onClick={() => aplicarPlantilla(p.key)}
              style={{
                background: '#f9fafb',
                border: '1px solid #e5e7eb',
                borderRadius: 7,
                padding: '5px 11px',
                fontSize: 11, fontWeight: 500,
                color: '#4b5563', cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = '#eff6ff'
                e.currentTarget.style.borderColor = '#0091c3'
                e.currentTarget.style.color = '#0091c3'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = '#f9fafb'
                e.currentTarget.style.borderColor = '#e5e7eb'
                e.currentTarget.style.color = '#4b5563'
              }}
            >
              {p.label}
            </button>
          ))}
          <button
            onClick={() => { setMostrarComposer(true); setTimeout(() => asuntoRef.current?.focus(), 80) }}
            style={{
              background: '#0091c3', border: 'none',
              borderRadius: 7, padding: '5px 12px',
              fontSize: 11, fontWeight: 600, color: '#fff', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 5,
            }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Redactar
          </button>
        </div>
      )}

      {/* ── Composer ── */}
      {mostrarComposer && (
        <div style={{ borderTop: '1px solid #e5e7eb', background: '#fff' }}>

          {/* Fila Para */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '9px 16px',
            borderBottom: '1px solid #f3f4f6',
          }}>
            <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 500, minWidth: 40 }}>Para</span>
            <span style={{ fontSize: 13, color: '#374151', fontWeight: 500 }}>{emailPara}</span>
          </div>

          {/* Fila Asunto */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '9px 16px',
            borderBottom: '1px solid #f3f4f6',
          }}>
            <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 500, minWidth: 40 }}>Asunto</span>
            <input
              ref={asuntoRef}
              value={asunto}
              onChange={e => setAsunto(e.target.value)}
              placeholder="Asunto del email..."
              onKeyDown={e => e.key === 'Tab' && (e.preventDefault(), textareaRef.current?.focus())}
              style={{
                flex: 1, border: 'none', outline: 'none',
                fontSize: 13, color: '#1f2937', fontWeight: 500,
                background: 'transparent',
              }}
            />
          </div>

          {/* Textarea */}
          <div style={{ padding: '10px 16px' }}>
            <textarea
              ref={textareaRef}
              value={cuerpo}
              onChange={e => setCuerpo(e.target.value)}
              rows={6}
              placeholder="Escribe tu mensaje aquí..."
              style={{
                width: '100%', border: 'none', padding: 0,
                fontSize: 13, color: '#374151', lineHeight: 1.7,
                resize: 'none', fontFamily: 'inherit',
                outline: 'none', background: 'transparent',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Chips de adjuntos */}
          {(cotSeleccionadas.length > 0 || archivos.length > 0) && (
            <div style={{
              padding: '0 16px 10px',
              display: 'flex', gap: 6, flexWrap: 'wrap',
            }}>
              {cotSeleccionadas.map(id => {
                const cot = cotizaciones.find(c => c.id === id)
                return (
                  <div key={id} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    background: '#eff6ff', border: '1px solid #bfdbfe',
                    borderRadius: 99, padding: '3px 9px',
                    fontSize: 11, color: '#1d4ed8', fontWeight: 500,
                  }}>
                    <PaperClipOutlined style={{ fontSize: 10 }} />
                    Cot. #{id}{cot ? ` · ${cot.estado}` : ''}
                    <CloseOutlined
                      style={{ fontSize: 9, cursor: 'pointer', opacity: 0.7 }}
                      onClick={() => setCotSeleccionadas(p => p.filter(c => c !== id))}
                    />
                  </div>
                )
              })}
              {archivos.map(a => (
                <div key={a.nombre} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  background: '#f3f4f6', border: '1px solid #e5e7eb',
                  borderRadius: 99, padding: '3px 9px',
                  fontSize: 11, color: '#4b5563', fontWeight: 500,
                }}>
                  <FileOutlined style={{ fontSize: 10 }} />
                  {a.nombre}
                  <CloseOutlined
                    style={{ fontSize: 9, cursor: 'pointer', opacity: 0.7 }}
                    onClick={() => setArchivos(p => p.filter(x => x.nombre !== a.nombre))}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Toolbar ── */}
          <div style={{
            padding: '9px 16px',
            borderTop: '1px solid #f3f4f6',
            background: '#fafafa',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            flexWrap: 'wrap', gap: 8,
          }}>
            {/* Adjuntos */}
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
              <Select
                mode="multiple"
                placeholder="Cotizaciones"
                size="small"
                style={{ minWidth: 170 }}
                value={cotSeleccionadas}
                onChange={setCotSeleccionadas}
                allowClear
                maxTagCount={0}
                maxTagPlaceholder={n => `${n} cot.`}
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
                  background: '#fff', border: '1px solid #e5e7eb',
                  borderRadius: 6, padding: '4px 10px',
                  fontSize: 11, color: '#4b5563', cursor: 'pointer',
                }}>
                  <FileOutlined style={{ fontSize: 11 }} />
                  Archivos{archivos.length > 0 ? ` (${archivos.length})` : ''}
                </button>
              </Upload>
            </div>

            {/* Enviar / Cancelar */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button
                onClick={limpiar}
                style={{
                  background: 'none', border: 'none',
                  fontSize: 11, color: '#9ca3af', cursor: 'pointer',
                  padding: '5px 8px', borderRadius: 6,
                }}
              >
                Cancelar
              </button>
              <button
                onClick={enviar}
                disabled={enviando}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: enviando ? '#64a8c5' : '#0091c3',
                  border: 'none', borderRadius: 8,
                  padding: '7px 16px',
                  fontSize: 12, fontWeight: 700, color: '#fff',
                  cursor: enviando ? 'not-allowed' : 'pointer',
                  boxShadow: enviando ? 'none' : '0 2px 6px rgba(0,145,195,0.3)',
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
