import React, { useState, useEffect, useRef } from 'react'
import { Button, Select, Spin, Upload, App } from 'antd'
import { MailOutlined, PaperClipOutlined, FileOutlined, CloseOutlined } from '@ant-design/icons'
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
    label: '🏠 Presentación bodega',
    asunto: 'Presentación de Bodega — BodeParking',
    cuerpo: 'Estimado/a {nombre},\n\nJunto a este mensaje le comparto información detallada sobre la bodega disponible. Quedamos disponibles para coordinar una visita cuando lo estime conveniente.\n\nSaludos cordiales,',
  },
  {
    key: 'cotizacion',
    label: '📄 Enviar cotización',
    asunto: 'Cotización BodeParking',
    cuerpo: 'Estimado/a {nombre},\n\nAdjunto encontrará la cotización solicitada para nuestras bodegas. Quedo a su disposición para cualquier consulta.\n\nSaludos cordiales,',
  },
  {
    key: 'reunion',
    label: '✅ Confirmar reunión',
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
  const [tab, setTab] = useState('nuevo')
  const [asunto, setAsunto] = useState('')
  const [cuerpo, setCuerpo] = useState('')
  const [adjuntoCot, setAdjuntoCot] = useState(null)
  const [adjuntoArchivo, setAdjuntoArchivo] = useState(null)
  const [generandoPdf, setGenerandoPdf] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const bottomRef = useRef(null)
  const { message } = App.useApp()
  const qc = useQueryClient()
  const { valorUF } = useUF()

  const { data: emails = [], isLoading: cargandoEmails } = useQuery({
    queryKey: ['email-conversacion', leadId],
    queryFn: () => api.get(`/email/conversacion/${leadId}`).then(r => r.data),
    enabled: !!leadId,
    refetchInterval: 30000,
  })

  const noLeidos = emails.filter(e => e.direction === 'RECIBIDO' && !e.leido).length

  useEffect(() => {
    if (tab === 'conv' && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [tab, emails.length])

  const marcarLeidos = () => {
    if (noLeidos === 0) return
    api.patch(`/email/conversacion/${leadId}/leer`).then(() => {
      qc.invalidateQueries({ queryKey: ['email-conversacion', leadId] })
    }).catch(() => {})
  }

  const { data: cotizaciones = [] } = useQuery({
    queryKey: ['cotizaciones-lead', leadId],
    queryFn: () => api.get(`/cotizaciones?leadId=${leadId}`).then(r => r.data),
    enabled: !!leadId,
  })

  const aplicarPlantilla = (key) => {
    const p = PLANTILLAS.find(x => x.key === key)
    if (!p) return
    setAsunto(p.asunto)
    setCuerpo(p.cuerpo.replace(/\{nombre\}/g, nombreLead || ''))
  }

  const adjuntarCotizacion = async (cotId) => {
    if (!cotId) { setAdjuntoCot(null); return }
    setGenerandoPdf(true)
    try {
      const { data: cot } = await api.get(`/cotizaciones/${cotId}`)
      const blob = await pdf(
        <CotizacionDocumento cotizacion={cotizacionParaPDF(cot)} logoUrl={logoUrl} valorUF={valorUF} />
      ).toBlob()
      const reader = new FileReader()
      reader.onloadend = () => {
        const base64 = reader.result.split(',')[1]
        setAdjuntoCot({ id: cotId, nombre: `Cotizacion_BodeParking_${cotId}.pdf`, base64 })
      }
      reader.readAsDataURL(blob)
    } catch {
      message.error('No se pudo generar el PDF de la cotización')
    } finally {
      setGenerandoPdf(false)
    }
  }

  const onArchivoChange = ({ file }) => {
    if (!file.originFileObj) return
    const reader = new FileReader()
    reader.onloadend = () => {
      const base64 = reader.result.split(',')[1]
      setAdjuntoArchivo({ nombre: file.name, base64 })
    }
    reader.readAsDataURL(file.originFileObj)
  }

  const enviar = async () => {
    if (!asunto.trim()) { message.warning('Escribe un asunto'); return }
    if (!cuerpo.trim()) { message.warning('Escribe el mensaje'); return }
    setEnviando(true)
    try {
      await api.post('/email/enviar', {
        para: emailPara,
        asunto,
        cuerpo,
        leadId,
        ...(adjuntoCot && { pdfBase64: adjuntoCot.base64, pdfNombre: adjuntoCot.nombre }),
        ...(adjuntoArchivo && { pdfBase64: adjuntoArchivo.base64, pdfNombre: adjuntoArchivo.nombre }),
      })
      message.success('Email enviado')
      limpiar()
      qc.invalidateQueries({ queryKey: ['email-conversacion', leadId] })
    } catch (err) {
      const msg = err.response?.data?.error || 'No se pudo enviar el email'
      message.error(msg)
    } finally {
      setEnviando(false)
    }
  }

  const limpiar = () => {
    setAsunto('')
    setCuerpo('')
    setAdjuntoCot(null)
    setAdjuntoArchivo(null)
  }

  const responder = (asuntoOriginal) => {
    setAsunto(asuntoOriginal.startsWith('Re:') ? asuntoOriginal : `Re: ${asuntoOriginal}`)
    setCuerpo('')
    setTab('nuevo')
  }

  const cambiarTab = (t) => {
    setTab(t)
    if (t === 'conv') marcarLeidos()
  }

  return (
    <div style={{
      background: '#fff',
      borderTop: '2px solid #1B5EA8',
      borderRadius: '0 0 8px 8px',
      marginTop: 16,
      boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
    }}>
      {/* Header con tabs */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '12px 16px', borderBottom: '1px solid #e2e8f0', background: '#fafafa',
      }}>
        <span style={{ fontWeight: 700, fontSize: 14, color: '#1a2533' }}>
          <MailOutlined style={{ marginRight: 6, color: '#1B5EA8' }} />Email
        </span>
        <div style={{ display: 'flex', border: '1px solid #e2e8f0', borderRadius: 6, overflow: 'hidden' }}>
          <button
            onClick={() => cambiarTab('nuevo')}
            style={{
              padding: '5px 16px', fontSize: 12, fontWeight: tab === 'nuevo' ? 600 : 400,
              background: tab === 'nuevo' ? '#1B5EA8' : '#fff',
              color: tab === 'nuevo' ? '#fff' : '#64748b',
              border: 'none', cursor: 'pointer',
            }}
          >
            Nuevo email
          </button>
          <button
            onClick={() => cambiarTab('conv')}
            style={{
              padding: '5px 16px', fontSize: 12, fontWeight: tab === 'conv' ? 600 : 400,
              background: tab === 'conv' ? '#1B5EA8' : '#fff',
              color: tab === 'conv' ? '#fff' : '#64748b',
              border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            Conversación
            {noLeidos > 0 && (
              <span style={{
                background: tab === 'conv' ? 'rgba(255,255,255,0.3)' : '#ef4444',
                color: '#fff', borderRadius: 10, padding: '1px 6px', fontSize: 10, fontWeight: 700,
              }}>{noLeidos}</span>
            )}
          </button>
        </div>
      </div>

      {/* Tab: Nuevo email */}
      {tab === 'nuevo' && (
        <div style={{ padding: 16 }}>
          <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', letterSpacing: '.5px', marginBottom: 4 }}>PARA</div>
              <div style={{
                background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 5,
                padding: '7px 10px', fontSize: 12, color: '#334155',
              }}>{emailPara}</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', letterSpacing: '.5px', marginBottom: 4 }}>ASUNTO</div>
              <input
                value={asunto}
                onChange={e => setAsunto(e.target.value)}
                placeholder="Asunto del email..."
                style={{
                  width: '100%', border: '1px solid #e2e8f0', borderRadius: 5,
                  padding: '7px 10px', fontSize: 12, color: '#334155', boxSizing: 'border-box',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', letterSpacing: '.5px', marginBottom: 6 }}>PLANTILLA RÁPIDA</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {PLANTILLAS.map(p => (
                <button
                  key={p.key}
                  onClick={() => aplicarPlantilla(p.key)}
                  style={{
                    background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 20,
                    padding: '4px 12px', fontSize: 11, color: '#475569', cursor: 'pointer',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', letterSpacing: '.5px', marginBottom: 4 }}>MENSAJE</div>
            <textarea
              value={cuerpo}
              onChange={e => setCuerpo(e.target.value)}
              rows={6}
              placeholder="Escribe tu mensaje aquí..."
              style={{
                width: '100%', border: '1px solid #e2e8f0', borderRadius: 5, padding: 10,
                fontSize: 13, color: '#334155', lineHeight: 1.6, resize: 'vertical',
                fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none',
              }}
            />
          </div>

          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', letterSpacing: '.5px', marginBottom: 6 }}>ADJUNTOS</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              {adjuntoCot ? (
                <div style={{
                  background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 4,
                  padding: '4px 10px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  <PaperClipOutlined style={{ color: '#64748b' }} />
                  {adjuntoCot.nombre}
                  <CloseOutlined
                    style={{ color: '#94a3b8', cursor: 'pointer', fontSize: 10 }}
                    onClick={() => setAdjuntoCot(null)}
                  />
                </div>
              ) : (
                <Select
                  placeholder="📎 Adjuntar cotización"
                  size="small"
                  style={{ width: 200 }}
                  loading={generandoPdf}
                  allowClear
                  onChange={adjuntarCotizacion}
                  options={cotizaciones.map(c => ({
                    value: c.id,
                    label: `Cot. #${c.id} — ${c.estado}`,
                  }))}
                />
              )}
              {adjuntoArchivo ? (
                <div style={{
                  background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 4,
                  padding: '4px 10px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  <FileOutlined style={{ color: '#64748b' }} />
                  {adjuntoArchivo.nombre}
                  <CloseOutlined
                    style={{ color: '#94a3b8', cursor: 'pointer', fontSize: 10 }}
                    onClick={() => setAdjuntoArchivo(null)}
                  />
                </div>
              ) : (
                <Upload
                  showUploadList={false}
                  beforeUpload={() => false}
                  onChange={onArchivoChange}
                >
                  <Button size="small" icon={<FileOutlined />} style={{ fontSize: 11 }}>Archivo</Button>
                </Upload>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button size="small" onClick={limpiar}>Limpiar</Button>
            <Button type="primary" size="small" loading={enviando} onClick={enviar} icon={<MailOutlined />}>
              Enviar
            </Button>
          </div>
        </div>
      )}

      {/* Tab: Conversación */}
      {tab === 'conv' && (
        <div>
          {cargandoEmails && <Spin size="small" style={{ display: 'block', margin: '20px auto' }} />}
          {!cargandoEmails && emails.length === 0 && (
            <div style={{ textAlign: 'center', padding: '32px 0', color: '#9ca3af', fontSize: 13 }}>
              Sin emails aún — usa "Nuevo email" para iniciar la conversación.
            </div>
          )}
          {!cargandoEmails && emails.length > 0 && (
            <div style={{
              padding: '14px 16px', display: 'flex', flexDirection: 'column',
              gap: 10, maxHeight: 360, overflowY: 'auto',
            }}>
              {emails.map(e => {
                const enviado = e.direction === 'ENVIADO'
                const esNoLeido = !enviado && !e.leido
                return (
                  <div key={e.id} style={{ display: 'flex', justifyContent: enviado ? 'flex-end' : 'flex-start' }}>
                    <div style={{
                      maxWidth: '75%',
                      background: enviado ? '#1B5EA8' : '#f3f4f6',
                      color: enviado ? '#fff' : '#1a2533',
                      borderRadius: enviado ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                      padding: '10px 14px',
                      border: esNoLeido ? '1.5px solid #fbbf24' : 'none',
                      boxShadow: esNoLeido ? '0 0 0 3px #fef3c7' : '0 1px 3px rgba(0,0,0,0.08)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                        <div style={{ fontSize: 10, opacity: enviado ? 0.65 : 1, color: enviado ? 'inherit' : '#94a3b8' }}>
                          {enviado
                            ? `Tú${e.usuario ? ` (${e.usuario.nombre})` : ''} · ${e.asunto}`
                            : `${e.de.replace(/<.*>/, '').trim() || e.de} · ${e.asunto}`}
                        </div>
                        {esNoLeido && (
                          <span style={{
                            background: '#f59e0b', color: '#fff',
                            borderRadius: 10, padding: '1px 6px', fontSize: 9, fontWeight: 700,
                          }}>NUEVO</span>
                        )}
                      </div>
                      <div
                        style={{ fontSize: 12.5, lineHeight: 1.55 }}
                        dangerouslySetInnerHTML={{ __html: e.cuerpo }}
                      />
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                        <div style={{ fontSize: 10, opacity: 0.5 }}>
                          {format(new Date(e.creadoEn), "d MMM HH:mm", { locale: es })}
                        </div>
                        {!enviado && (
                          <button
                            onClick={() => responder(e.asunto)}
                            style={{
                              background: '#e0edff', color: '#1B5EA8', border: 'none',
                              borderRadius: 10, padding: '3px 10px', fontSize: 10,
                              fontWeight: 600, cursor: 'pointer',
                            }}
                          >
                            ↩ Responder
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
              <div ref={bottomRef} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
