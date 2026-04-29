# Email Card Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar el módulo de email disperso por un único `EmailCard` con dos tabs (Nuevo email / Conversación) al final de `LeadDetalle`.

**Architecture:** Nuevo componente `EmailCard` en `frontend/src/components/`. El backend recibe un campo `leido` nuevo en `EmailConversacion` y un endpoint `PATCH /conversacion/:leadId/leer`. El resto del backend no cambia. Se eliminan `ModalEmail`, botones dispersos y el card viejo en `LeadDetalle`.

**Tech Stack:** React, Ant Design, TanStack Query v5, @react-pdf/renderer, Prisma, Express

---

### Task 1: Backend — campo `leido` + endpoint `PATCH /leer`

**Files:**
- Modify: `backend/prisma/schema.prisma` (línea ~880)
- Modify: `backend/src/routes/email.js`

- [ ] **Paso 1: Agregar campo `leido` al schema**

En `backend/prisma/schema.prisma`, en el model `EmailConversacion`, agregar la línea `leido` antes del cierre del bloque:

```prisma
model EmailConversacion {
  id          Int      @id @default(autoincrement())
  leadId      Int
  messageId   String?  @unique
  inReplyTo   String?
  direction   String
  asunto      String
  cuerpo      String   @db.Text
  de          String
  para        String
  usuarioId   Int?
  leido       Boolean  @default(false)
  creadoEn    DateTime @default(now())

  lead        Lead     @relation(fields: [leadId], references: [id], onDelete: Cascade)
  usuario     Usuario? @relation(fields: [usuarioId], references: [id])

  @@map("email_conversaciones")
}
```

- [ ] **Paso 2: Aplicar schema a la BD**

```bash
cd backend && npx prisma db push
```

Esperado: `Your database is now in sync with your Prisma schema.`

- [ ] **Paso 3: Marcar emails ENVIADOS como leido:true**

En `backend/src/routes/email.js`, en el `prisma.emailConversacion.create` del POST `/enviar` (línea ~117), agregar `leido: true`:

```js
await Promise.all([
  prisma.emailConversacion.create({
    data: {
      leadId,
      messageId: mensajeId,
      direction: 'ENVIADO',
      asunto,
      cuerpo: html,
      de: fromLabel,
      para,
      usuarioId: req.usuario.id,
      leido: true,
    }
  }),
  // ... interaccion.create igual que antes
])
```

- [ ] **Paso 4: Agregar endpoint PATCH `/conversacion/:leadId/leer`**

En `backend/src/routes/email.js`, después del GET `/conversacion/:leadId` (línea ~310), agregar:

```js
// ─── PATCH /api/email/conversacion/:leadId/leer ───────────────────────────────
router.patch('/conversacion/:leadId/leer', autenticar, async (req, res) => {
  const { leadId } = req.params
  try {
    await prisma.emailConversacion.updateMany({
      where: { leadId: parseInt(leadId), direction: 'RECIBIDO', leido: false },
      data: { leido: true },
    })
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: 'Error al marcar como leídos.' })
  }
})
```

- [ ] **Paso 5: Verificar que GET `/conversacion/:leadId` devuelve `leido`**

El campo `leido` ya es parte del modelo y `findMany` lo incluye automáticamente — no hay que cambiar nada en ese endpoint.

- [ ] **Paso 6: Commit**

```bash
git add backend/prisma/schema.prisma backend/src/routes/email.js
git commit -m "feat: campo leido en EmailConversacion + endpoint PATCH leer"
git push origin main
```

---

### Task 2: Crear `EmailCard.jsx`

**Files:**
- Create: `frontend/src/components/EmailCard.jsx`

- [ ] **Paso 1: Crear el archivo**

Crear `frontend/src/components/EmailCard.jsx` con el siguiente contenido completo:

```jsx
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
  const [adjuntoCot, setAdjuntoCot] = useState(null) // { id, nombre, base64 }
  const [adjuntoArchivo, setAdjuntoArchivo] = useState(null) // { nombre, base64 }
  const [generandoPdf, setGenerandoPdf] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const bottomRef = useRef(null)
  const { message } = App.useApp()
  const qc = useQueryClient()
  const { valorUF } = useUF()

  // ─── Conversación ───────────────────────────────────────────────
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

  // ─── Cotizaciones del lead ──────────────────────────────────────
  const { data: cotizaciones = [] } = useQuery({
    queryKey: ['cotizaciones-lead', leadId],
    queryFn: () => api.get(`/cotizaciones?leadId=${leadId}`).then(r => r.data),
    enabled: !!leadId,
  })

  // ─── Plantillas ────────────────────────────────────────────────
  const aplicarPlantilla = (key) => {
    const p = PLANTILLAS.find(x => x.key === key)
    if (!p) return
    setAsunto(p.asunto)
    setCuerpo(p.cuerpo.replace(/\{nombre\}/g, nombreLead || ''))
  }

  // ─── Adjuntar cotización ───────────────────────────────────────
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
        setAdjuntoCot({
          id: cotId,
          nombre: `Cotizacion_BodeParking_${cotId}.pdf`,
          base64,
        })
      }
      reader.readAsDataURL(blob)
    } catch {
      message.error('No se pudo generar el PDF de la cotización')
    } finally {
      setGenerandoPdf(false)
    }
  }

  // ─── Adjuntar archivo genérico ─────────────────────────────────
  const onArchivoChange = ({ file }) => {
    if (!file.originFileObj) return
    const reader = new FileReader()
    reader.onloadend = () => {
      const base64 = reader.result.split(',')[1]
      setAdjuntoArchivo({ nombre: file.name, base64 })
    }
    reader.readAsDataURL(file.originFileObj)
  }

  // ─── Enviar ────────────────────────────────────────────────────
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

  // ─── Responder desde conversación ─────────────────────────────
  const responder = (asuntoOriginal) => {
    setAsunto(asuntoOriginal.startsWith('Re:') ? asuntoOriginal : `Re: ${asuntoOriginal}`)
    setCuerpo('')
    setTab('nuevo')
  }

  // ─── Cambiar tab ───────────────────────────────────────────────
  const cambiarTab = (t) => {
    setTab(t)
    if (t === 'conv') marcarLeidos()
  }

  // ─── Render ────────────────────────────────────────────────────
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

      {/* ── Tab: Nuevo email ── */}
      {tab === 'nuevo' && (
        <div style={{ padding: 16 }}>
          {/* Para / Asunto */}
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

          {/* Plantillas */}
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

          {/* Mensaje */}
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

          {/* Adjuntos */}
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

          {/* Acciones */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button size="small" onClick={limpiar}>Limpiar</Button>
            <Button type="primary" size="small" loading={enviando} onClick={enviar} icon={<MailOutlined />}>
              Enviar
            </Button>
          </div>
        </div>
      )}

      {/* ── Tab: Conversación ── */}
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
```

- [ ] **Paso 2: Commit**

```bash
git add frontend/src/components/EmailCard.jsx
git commit -m "feat: EmailCard component — tabs Nuevo email / Conversación"
git push origin main
```

---

### Task 3: Actualizar `LeadDetalle.jsx`

**Files:**
- Modify: `frontend/src/pages/leads/LeadDetalle.jsx`

- [ ] **Paso 1: Reemplazar import de ModalEmail por EmailCard**

Buscar en la parte de imports (línea ~3):
```js
import ModalEmail from '../../components/ModalEmail'
```
Reemplazar por:
```js
import EmailCard from '../../components/EmailCard'
```

- [ ] **Paso 2: Eliminar state `modalEmail`**

Buscar (línea ~746):
```js
const [modalEmail, setModalEmail] = useState(false)
```
Eliminar esa línea.

- [ ] **Paso 3: Eliminar botón "Enviar email" del header**

Buscar y eliminar estas líneas (línea ~912-914):
```jsx
{lead.contacto.email && (
  <Button size="small" icon={<MailOutlined />} onClick={() => setModalEmail(true)}>Enviar email</Button>
)}
```

- [ ] **Paso 4: Eliminar botón "Enviar" del card de contacto**

En la línea ~982, dentro del bloque `{lead.contacto.email && <Space>...</Space>}`, eliminar SOLO el botón (dejar el `<MailOutlined />` decorativo y el `<Text>` con el email):

```jsx
// Eliminar solo esta línea:
<Button type="link" size="small" style={{ padding: 0, fontSize: 12 }} onClick={() => setModalEmail(true)}>Enviar</Button>
```

El bloque queda así después:
```jsx
{lead.contacto.email && (
  <Space>
    <MailOutlined />
    <Text style={{ fontSize: 13 }}>{lead.contacto.email}</Text>
  </Space>
)}

- [ ] **Paso 5: Reemplazar el card viejo de email por `<EmailCard>`**

Buscar y reemplazar el bloque completo (líneas ~1189-1210):

```jsx
{lead.contacto.email && (
  <Card
    title={<span style={{ fontSize: 14, fontWeight: 700 }}>Conversación por email</span>}
    extra={
      <Button size="small" icon={<MailOutlined />} onClick={() => setModalEmail(true)}>
        Nuevo email
      </Button>
    }
    style={{ marginTop: 16 }}
    bodyStyle={{ padding: '16px 20px' }}
  >
    <ConversacionEmail leadId={parseInt(id)} />
  </Card>
)}

<ModalEmail
  open={modalEmail}
  onClose={() => { setModalEmail(false); qc.invalidateQueries(['email-conversacion', parseInt(id)]) }}
  para={lead.contacto.email || ''}
  nombre={`${lead.contacto.nombre} ${lead.contacto.apellido}`.trim()}
  leadId={parseInt(id)}
/>
```

Por:

```jsx
{lead.contacto.email && (
  <EmailCard
    leadId={parseInt(id)}
    emailPara={lead.contacto.email}
    nombreLead={`${lead.contacto.nombre} ${lead.contacto.apellido}`.trim()}
  />
)}
```

- [ ] **Paso 6: Eliminar la función `ConversacionEmail` y el import de `useRef` si quedó sin usos**

Buscar y eliminar el bloque completo de la función `ConversacionEmail` (líneas ~673-730).

Verificar si `useRef` sigue siendo usado en otro lugar del archivo. Si no, eliminarlo del import de React.

- [ ] **Paso 7: Mantener `MailOutlined` en el import**

`MailOutlined` sigue siendo usado en dos lugares que NO se eliminan:
- Línea ~46: `EMAIL: <MailOutlined />` — icono del tipo de actividad en el timeline
- Línea ~980: `<MailOutlined />` — icono decorativo junto al email de contacto

No eliminar `MailOutlined` del import de `@ant-design/icons`.

- [ ] **Paso 8: Commit**

```bash
git add frontend/src/pages/leads/LeadDetalle.jsx
git commit -m "feat: integrar EmailCard en LeadDetalle, eliminar botones de email dispersos"
git push origin main
```

---

### Task 4: Limpiar `CotizacionEditor.jsx`

**Files:**
- Modify: `frontend/src/pages/cotizaciones/CotizacionEditor.jsx`

- [ ] **Paso 1: Eliminar import de ModalEmail**

Buscar (línea ~20):
```js
import ModalEmail from '../../components/ModalEmail'
```
Eliminar esa línea.

- [ ] **Paso 2: Eliminar state `pdfBase64` y `modalEmail`**

Buscar y eliminar:
```js
const [pdfBase64, setPdfBase64] = useState(null)
const [modalEmail, setModalEmail] = useState(false)
```

- [ ] **Paso 3: Eliminar el botón "Enviar por email"**

Buscar y eliminar el bloque del botón (aproximadamente):
```jsx
{cotizacion.lead?.contacto?.email && (
  <Button
    ...
    onClick={async () => {
      ...
      setModalEmail(true)
    }}
  >
    {generandoPdf ? 'Preparando...' : 'Enviar por email'}
  </Button>
)}
```

- [ ] **Paso 4: Eliminar el render de `<ModalEmail>` al final del componente**

Buscar y eliminar:
```jsx
{cotizacion?.lead?.contacto?.email && (
  <ModalEmail
    ...
    pdfBase64={pdfBase64}
    pdfNombre={`Cotizacion_BodeParking_${id}.pdf`}
  />
)}
```

- [ ] **Paso 5: Eliminar los 3 states que quedan sin uso**

Los tres states en las líneas ~587-589 quedan sin uso tras eliminar el botón y el modal:
```js
// Eliminar estas 3 líneas:
const [modalEmail, setModalEmail] = useState(false)
const [pdfBase64, setPdfBase64] = useState(null)
const [generandoPdf, setGenerandoPdf] = useState(false)
```

- [ ] **Paso 6: Commit**

```bash
git add frontend/src/pages/cotizaciones/CotizacionEditor.jsx
git commit -m "feat: eliminar botón enviar email de CotizacionEditor"
git push origin main
```

---

### Task 5: Eliminar `ModalEmail.jsx`

**Files:**
- Delete: `frontend/src/components/ModalEmail.jsx`

- [ ] **Paso 1: Verificar que ModalEmail no tiene más usos**

```bash
grep -r "ModalEmail" frontend/src --include="*.jsx" --include="*.js"
```

Esperado: sin resultados (solo el propio archivo).

- [ ] **Paso 2: Eliminar el archivo**

```bash
rm frontend/src/components/ModalEmail.jsx
```

- [ ] **Paso 3: Commit final**

```bash
git add -A
git commit -m "feat: eliminar ModalEmail — consolidado en EmailCard"
git push origin main
```
