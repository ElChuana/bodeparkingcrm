import React, { useState, useEffect } from 'react'
import { Card, Form, Input, Button, App, Space, Tag, Switch, Tabs, Typography } from 'antd'
import { MailOutlined, CheckCircleOutlined, SettingOutlined, BellOutlined, EditOutlined, FileTextOutlined } from '@ant-design/icons'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'

const { TextArea } = Input
const { Text } = Typography

const FIRMA_DEFAULT = `<table style="font-family: Arial, sans-serif; font-size: 13px; color: #333; border-collapse: collapse;">
  <tr>
    <td style="padding-right: 16px; border-right: 3px solid #1677ff; vertical-align: top;">
      <strong style="font-size: 15px;">Tu Nombre</strong><br>
      <span style="color: #666;">Ejecutivo de Ventas</span><br>
      <span style="color: #1677ff;">BodeParking</span>
    </td>
    <td style="padding-left: 16px; vertical-align: top; color: #555;">
      📞 +56 9 XXXX XXXX<br>
      ✉️ <a href="mailto:tuemail@bodeparking.cl" style="color: #1677ff;">tuemail@bodeparking.cl</a><br>
      🌐 <a href="https://bodeparking.cl" style="color: #1677ff;">bodeparking.cl</a>
    </td>
  </tr>
</table>`

const PLANTILLA_EMAIL_DEFAULT = `Estimado/a {nombre},

Me comunico desde BodeParking para...


Saludos cordiales,`

const PLANTILLA_COTIZACION_DEFAULT = `Estimado/a {nombre},

Adjunto encontrará la cotización solicitada para nuestras bodegas/estacionamientos.

Quedo a su disposición para cualquier consulta.

Saludos cordiales,`

export default function MiPerfil() {
  const { usuario } = useAuth()
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const [guardando, setGuardando] = useState(false)
  const [emailConfigurado, setEmailConfigurado] = useState(null)
  const [notificacionesActivas, setNotificacionesActivas] = useState(true)
  const [guardandoNotif, setGuardandoNotif] = useState(false)
  const [firmaHtml, setFirmaHtml] = useState('')
  const [guardandoFirma, setGuardandoFirma] = useState(false)
  const [firmaTab, setFirmaTab] = useState('editor')
  const [plantillaEmail, setPlantillaEmail] = useState(PLANTILLA_EMAIL_DEFAULT)
  const [plantillaCotizacion, setPlantillaCotizacion] = useState(PLANTILLA_COTIZACION_DEFAULT)
  const [guardandoPlantillas, setGuardandoPlantillas] = useState(false)

  useEffect(() => {
    api.get('/email/config').then(r => {
      setEmailConfigurado(r.data.smtpEmail)
      if (r.data.smtpEmail) form.setFieldValue('smtpEmail', r.data.smtpEmail)
      if (r.data.plantillaEmail) setPlantillaEmail(r.data.plantillaEmail)
      if (r.data.plantillaCotizacion) setPlantillaCotizacion(r.data.plantillaCotizacion)
    }).catch(() => {})

    api.get('/alertas/preferencias').then(r => {
      setNotificacionesActivas(r.data.notificacionesActivas)
    }).catch(() => {})

    api.get('/email/firma').then(r => {
      setFirmaHtml(r.data.firma || FIRMA_DEFAULT)
    }).catch(() => setFirmaHtml(FIRMA_DEFAULT))
  }, [])

  const handleGuardar = async () => {
    try {
      const valores = await form.validateFields()
      setGuardando(true)
      await api.put('/email/config', valores)
      message.success('Email configurado correctamente')
      setEmailConfigurado(valores.smtpEmail)
    } catch (err) {
      if (err?.errorFields) return
      message.error(err.response?.data?.error || 'No se pudo guardar')
    } finally {
      setGuardando(false)
    }
  }

  const handleGuardarPlantillas = async () => {
    setGuardandoPlantillas(true)
    try {
      const smtpEmail = form.getFieldValue('smtpEmail') || emailConfigurado
      await api.put('/email/config', { smtpEmail, plantillaEmail, plantillaCotizacion })
      message.success('Plantillas guardadas correctamente')
    } catch {
      message.error('No se pudo guardar las plantillas')
    } finally {
      setGuardandoPlantillas(false)
    }
  }

  const handleToggleNotif = async (valor) => {
    setGuardandoNotif(true)
    try {
      await api.put('/alertas/preferencias', { notificacionesActivas: valor })
      setNotificacionesActivas(valor)
      message.success(valor ? 'Notificaciones activadas' : 'Notificaciones desactivadas')
    } catch {
      message.error('No se pudo actualizar')
    } finally {
      setGuardandoNotif(false)
    }
  }

  const handleGuardarFirma = async () => {
    setGuardandoFirma(true)
    try {
      await api.put('/email/firma', { firma: firmaHtml })
      message.success('Firma guardada correctamente')
    } catch {
      message.error('No se pudo guardar la firma')
    } finally {
      setGuardandoFirma(false)
    }
  }

  return (
    <div style={{ maxWidth: 640, margin: '32px auto', padding: '0 16px' }}>
      <h2 style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 8 }}>
        <SettingOutlined /> Mi Perfil
      </h2>

      <Card title="Información de cuenta" style={{ marginBottom: 20 }}>
        <Space direction="vertical" size={4}>
          <div><strong>Nombre:</strong> {usuario?.nombre} {usuario?.apellido}</div>
          <div><strong>Email CRM:</strong> {usuario?.email}</div>
          <div><strong>Rol:</strong> <Tag>{usuario?.rol?.replace(/_/g, ' ')}</Tag></div>
        </Space>
      </Card>

      <Card
        title={<span><MailOutlined style={{ marginRight: 8, color: '#1677ff' }} />Email para envío de correos</span>}
        style={{ marginBottom: 20 }}
      >
        <p style={{ color: '#666', marginBottom: 16, fontSize: 13 }}>
          Configura el email desde el que se enviarán tus correos a clientes (ej: <strong>tuusuario@bodeparking.cl</strong>).
        </p>
        {emailConfigurado && (
          <div style={{ marginBottom: 16, padding: '8px 12px', background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
            <CheckCircleOutlined style={{ color: '#52c41a' }} />
            <span style={{ fontSize: 13 }}>Email configurado: <strong>{emailConfigurado}</strong></span>
          </div>
        )}
        <Form form={form} layout="vertical">
          <Form.Item
            label="Tu email (@bodeparking.cl)"
            name="smtpEmail"
            rules={[{ required: true, message: 'Ingresa tu email' }, { type: 'email', message: 'Email inválido' }]}
          >
            <Input prefix={<MailOutlined style={{ color: '#bbb' }} />} placeholder="tuusuario@bodeparking.cl" />
          </Form.Item>
          <Button type="primary" loading={guardando} onClick={handleGuardar}>Guardar</Button>
        </Form>
      </Card>

      <Card
        title={<span><FileTextOutlined style={{ marginRight: 8, color: '#13c2c2' }} />Plantillas de email</span>}
        style={{ marginBottom: 20 }}
      >
        <p style={{ color: '#666', marginBottom: 12, fontSize: 13 }}>
          Texto que se pre-carga al abrir el modal de email. Usa <Text code>{'{nombre}'}</Text> para insertar el nombre del destinatario.
        </p>
        <Tabs
          size="small"
          items={[
            {
              key: 'general',
              label: 'Email general',
              children: (
                <TextArea
                  value={plantillaEmail}
                  onChange={e => setPlantillaEmail(e.target.value)}
                  rows={8}
                  style={{ fontFamily: 'inherit', fontSize: 13 }}
                />
              ),
            },
            {
              key: 'cotizacion',
              label: 'Email con cotización',
              children: (
                <TextArea
                  value={plantillaCotizacion}
                  onChange={e => setPlantillaCotizacion(e.target.value)}
                  rows={8}
                  style={{ fontFamily: 'inherit', fontSize: 13 }}
                />
              ),
            },
          ]}
        />
        <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
          <Button type="primary" loading={guardandoPlantillas} onClick={handleGuardarPlantillas}>
            Guardar plantillas
          </Button>
          <Button onClick={() => { setPlantillaEmail(PLANTILLA_EMAIL_DEFAULT); setPlantillaCotizacion(PLANTILLA_COTIZACION_DEFAULT) }}>
            Restaurar por defecto
          </Button>
        </div>
      </Card>

      <Card
        title={<span><EditOutlined style={{ marginRight: 8, color: '#722ed1' }} />Firma de email</span>}
        style={{ marginBottom: 20 }}
      >
        <p style={{ color: '#666', marginBottom: 12, fontSize: 13 }}>
          Escribe tu firma en HTML. Se agrega automáticamente al pie de cada email que envíes.
        </p>
        <Tabs
          activeKey={firmaTab}
          onChange={setFirmaTab}
          size="small"
          items={[
            {
              key: 'editor',
              label: 'Editor HTML',
              children: (
                <TextArea
                  value={firmaHtml}
                  onChange={e => setFirmaHtml(e.target.value)}
                  rows={10}
                  style={{ fontFamily: 'monospace', fontSize: 12 }}
                  placeholder="<p>Tu firma en HTML...</p>"
                />
              ),
            },
            {
              key: 'preview',
              label: 'Vista previa',
              children: (
                <div
                  style={{
                    padding: 16,
                    border: '1px solid #f0f0f0',
                    borderRadius: 6,
                    background: '#fafafa',
                    minHeight: 100,
                  }}
                  dangerouslySetInnerHTML={{ __html: firmaHtml }}
                />
              ),
            },
          ]}
        />
        <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
          <Button type="primary" loading={guardandoFirma} onClick={handleGuardarFirma}>
            Guardar firma
          </Button>
          <Button onClick={() => setFirmaHtml(FIRMA_DEFAULT)}>
            Restaurar ejemplo
          </Button>
        </div>
      </Card>

      <Card title={<span><BellOutlined style={{ marginRight: 8, color: '#faad14' }} />Notificaciones</span>}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 500 }}>Notificaciones de leads</div>
            <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
              Recibe alertas cuando llegue un lead nuevo o cambie de etapa
            </div>
          </div>
          <Switch
            checked={notificacionesActivas}
            onChange={handleToggleNotif}
            loading={guardandoNotif}
          />
        </div>
      </Card>
    </div>
  )
}
