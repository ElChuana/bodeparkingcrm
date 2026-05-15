import React, { useState, useRef, useEffect } from 'react'
import { Button, Select, Spin, Upload, App } from 'antd'
import { MailOutlined, PaperClipOutlined, FileOutlined, CloseOutlined, SendOutlined, LoadingOutlined } from '@ant-design/icons'
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
    label: '📋 Seguimiento',
    asunto: 'Seguimiento — BodeParking',
    cuerpo: 'Estimado/a {nombre},\n\nMe comunico desde BodeParking para hacer seguimiento sobre su consulta. ¿Tuvo oportunidad de revisar la información que le enviamos?\n\nQuedo atento a sus comentarios.\n\nSaludos cordiales,',
  },
  {
    key: 'presentacion',
    label: '🏠 Presentación',
    asunto: 'Presentación de Bodega — BodeParking',
    cuerpo: 'Estimado/a {nombre},\n\nJunto a este mensaje le comparto información detallada sobre la bodega disponible. Quedamos disponibles para coordinar una visita cuando lo estime conveniente.\n\nSaludos cordiales,',
  },
  {
    key: 'cotizacion',
    label: '📄 Cotización',
    asunto: 'Cotización BodeParking',
    cuerpo: 'Estimado/a {nombre},\n\nAdjunto encontrará la cotización solicitada para nuestras bodegas. Quedo a su disposición para cualquier consulta.\n\nSaludos cordiales,',
  },
  {
    key: 'reunion',
    label: '✅ Reunión',
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
    if (!asunto.trim()) { message.warning('Escribe un asunto'); return }
    if (!cuerpo.trim()) { message.warning('Escribe el mensaje'); return }

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

  return (
    <div style={{
      background: '#fff',
      border: '1px solid #e2e8f0',
      borderTop: '2px solid #0091c3',
      borderRadius: 10,
      marginTop: 16,
      overflow: 'hidden',
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '10px 14px', background: '#fafafa', borderBottom: '1px solid #f0f0f0',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <MailOutlined style={{ color: '#0091c3', fontSize: 15 }} />
          <span style={{ fontWeight: 700, fontSize: 13, color: '#0f172a' }}>Email</span>
          {noLeidos > 0 && (
            <span style={{
              background: '#ef4444', color: '#fff',
              borderRadius: 10, padding: '1px 7px', fontSize: 10, fontWeight: 700,
            }}>{noLeidos} nuevo{noLeidos > 1 ? 's' : ''}</span>
          )}
        </div>
        <span style={{ fontSize: 11, color: '#94a3b8' }}>{emailPara}</span>
      </div>

      {/* Conversación (chat) */}
      <div style={{
        padding: '12px 14px',
        minHeight: 60,
        maxHeight: 340,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        background: '#f8fafc',
      }}>
        {cargandoEmails && <Spin size="small" style={{ margin: '20px auto', display: 'block' }} />}

        {!cargandoEmails && emails.length === 0 && (
          <div style={{ textAlign: 'center', padding: '28px 0', color: '#94a3b8', fontSize: 12 }}>
            Sin conversación — escribí el primer email abajo
          </div>
        )}

        {!cargandoEmails && emails.map(e => {
          const enviado = e.direction === 'ENVIADO'
          const esNoLeido = !enviado && !e.leido
          return (
            <div key={e.id} style={{ display: 'flex', justifyContent: enviado ? 'flex-end' : 'flex-start' }}>
              <div style={{ maxWidth: '78%' }}>
                <div style={{
                  fontSize: 10, color: '#94a3b8', marginBottom: 3,
                  textAlign: enviado ? 'right' : 'left',
                }}>
                  {enviado
                    ? `${e.usuario?.nombre || 'Tú'} · ${format(new Date(e.creadoEn), "d MMM HH:mm", { locale: es })}`
                    : `${e.de?.replace(/<.*>/, '').trim() || e.de} · ${format(new Date(e.creadoEn), "d MMM HH:mm", { locale: es })}`
                  }
                </div>
                <div style={{
                  background: enviado ? '#0091c3' : '#fff',
                  color: enviado ? '#fff' : '#1a2533',
                  borderRadius: enviado ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                  padding: '9px 13px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                  border: esNoLeido ? '2px solid #fbbf24' : enviado ? 'none' : '1px solid #e2e8f0',
                }}>
                  <div style={{
                    fontSize: 10, fontWeight: 600, marginBottom: 5,
                    color: enviado ? 'rgba(255,255,255,0.65)' : '#64748b',
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}>
                    {e.asunto}
                    {esNoLeido && (
                      <span style={{
                        background: '#f59e0b', color: '#fff',
                        borderRadius: 8, padding: '1px 5px', fontSize: 9, fontWeight: 700,
                      }}>NUEVO</span>
                    )}
                  </div>
                  <div
                    style={{ fontSize: 12.5, lineHeight: 1.6 }}
                    dangerouslySetInnerHTML={{ __html: e.cuerpo }}
                  />
                  {!enviado && (
                    <div style={{ marginTop: 7, textAlign: 'right' }}>
                      <button
                        onClick={() => responder(e.asunto)}
                        style={{
                          background: '#e0f2fe', color: '#0284c7',
                          border: 'none', borderRadius: 10,
                          padding: '3px 10px', fontSize: 10, fontWeight: 600, cursor: 'pointer',
                        }}
                      >↩ Responder</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Botones rápidos cuando composer cerrado */}
      {!mostrarComposer && (
        <div style={{ padding: '10px 14px', borderTop: '1px solid #f0f0f0', background: '#fff' }}>
          <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 7, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Enviar email
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {PLANTILLAS.map(p => (
              <button
                key={p.key}
                onClick={() => aplicarPlantilla(p.key)}
                style={{
                  background: '#f1f5f9', border: '1px solid #e2e8f0',
                  borderRadius: 20, padding: '5px 13px', fontSize: 11,
                  color: '#475569', cursor: 'pointer',
                }}
              >{p.label}</button>
            ))}
            <button
              onClick={() => setMostrarComposer(true)}
              style={{
                background: '#0091c3', border: 'none',
                borderRadius: 20, padding: '5px 14px', fontSize: 11,
                color: '#fff', cursor: 'pointer', fontWeight: 600,
              }}
            >✏ Redactar</button>
          </div>
        </div>
      )}

      {/* Composer */}
      {mostrarComposer && (
        <div style={{ borderTop: '1px solid #e2e8f0', background: '#fff' }}>
          {/* Asunto */}
          <div style={{
            padding: '10px 14px 6px',
            display: 'flex', alignItems: 'center', gap: 8,
            borderBottom: '1px solid #f0f0f0',
          }}>
            <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px', minWidth: 46 }}>Asunto</span>
            <input
              value={asunto}
              onChange={e => setAsunto(e.target.value)}
              placeholder="Asunto del email..."
              style={{
                flex: 1, border: 'none', fontSize: 13, color: '#1a2533',
                outline: 'none', background: 'transparent',
              }}
            />
          </div>

          {/* Cuerpo */}
          <div style={{ padding: '10px 14px' }}>
            <textarea
              ref={textareaRef}
              value={cuerpo}
              onChange={e => setCuerpo(e.target.value)}
              rows={5}
              placeholder="Escribe tu mensaje..."
              style={{
                width: '100%', border: 'none', padding: 0,
                fontSize: 13, color: '#334155', lineHeight: 1.65,
                resize: 'none', fontFamily: 'inherit',
                outline: 'none', background: 'transparent', boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Chips de adjuntos */}
          {(cotSeleccionadas.length > 0 || archivos.length > 0) && (
            <div style={{ padding: '0 14px 10px', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {cotSeleccionadas.map(id => {
                const cot = cotizaciones.find(c => c.id === id)
                return (
                  <span key={id} style={{
                    background: '#e0f2fe', color: '#0284c7', borderRadius: 12,
                    padding: '3px 10px', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 5,
                  }}>
                    <PaperClipOutlined style={{ fontSize: 10 }} />
                    Cot. #{id}{cot ? ` · ${cot.estado}` : ''}
                    <CloseOutlined
                      style={{ fontSize: 9, cursor: 'pointer', opacity: 0.65 }}
                      onClick={() => setCotSeleccionadas(p => p.filter(c => c !== id))}
                    />
                  </span>
                )
              })}
              {archivos.map(a => (
                <span key={a.nombre} style={{
                  background: '#f1f5f9', color: '#475569', borderRadius: 12,
                  padding: '3px 10px', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 5,
                }}>
                  <FileOutlined style={{ fontSize: 10 }} />
                  {a.nombre}
                  <CloseOutlined
                    style={{ fontSize: 9, cursor: 'pointer', opacity: 0.65 }}
                    onClick={() => setArchivos(p => p.filter(x => x.nombre !== a.nombre))}
                  />
                </span>
              ))}
            </div>
          )}

          {/* Toolbar inferior */}
          <div style={{
            padding: '8px 14px',
            borderTop: '1px solid #f0f0f0',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8,
          }}>
            {/* Adjuntos */}
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
              <Select
                mode="multiple"
                placeholder="📎 Adjuntar cotizaciones"
                size="small"
                style={{ minWidth: 190 }}
                value={cotSeleccionadas}
                onChange={setCotSeleccionadas}
                allowClear
                maxTagCount={0}
                maxTagPlaceholder={n => `${n} cotización${n > 1 ? 'es' : ''} seleccionada${n > 1 ? 's' : ''}`}
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
                <Button size="small" icon={<FileOutlined />} style={{ fontSize: 11 }}>
                  Archivos{archivos.length > 0 ? ` (${archivos.length})` : ''}
                </Button>
              </Upload>
            </div>

            {/* Acciones */}
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <button
                onClick={limpiar}
                style={{
                  background: 'none', border: 'none', color: '#94a3b8',
                  fontSize: 11, cursor: 'pointer', padding: '4px 8px',
                }}
              >Cancelar</button>
              <Button
                type="primary"
                size="small"
                loading={enviando}
                onClick={enviar}
                icon={enviando
                  ? (generandoPdf ? <LoadingOutlined /> : undefined)
                  : <SendOutlined />
                }
                style={{ background: '#0091c3', borderColor: '#0091c3' }}
              >
                {generandoPdf ? 'Generando PDFs...' : 'Enviar'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
