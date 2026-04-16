import React, { useState, useEffect } from 'react'
import { Card, Form, Input, Button, App, Divider, Tag, Space } from 'antd'
import { MailOutlined, LockOutlined, CheckCircleOutlined, SettingOutlined } from '@ant-design/icons'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'

export default function MiPerfil() {
  const { usuario } = useAuth()
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const [guardando, setGuardando] = useState(false)
  const [verificando, setVerificando] = useState(false)
  const [config, setConfig] = useState(null) // { smtpEmail, tienePassword }

  useEffect(() => {
    api.get('/email/config').then(r => setConfig(r.data)).catch(() => {})
  }, [])

  const handleGuardar = async () => {
    try {
      const valores = await form.validateFields()
      setGuardando(true)
      await api.put('/email/config', valores)
      message.success('Credenciales guardadas y verificadas correctamente')
      setConfig({ smtpEmail: valores.smtpEmail, tienePassword: true })
      form.setFieldValue('smtpPassword', '')
    } catch (err) {
      if (err?.errorFields) return
      const msg = err.response?.data?.error || 'No se pudieron guardar las credenciales'
      const detalle = err.response?.data?.detalle || ''
      message.error(`${msg}${detalle ? ` — ${detalle}` : ''}`)
    } finally {
      setGuardando(false)
    }
  }

  const handleVerificar = async () => {
    setVerificando(true)
    try {
      const r = await api.get('/email/verificar')
      message.success(r.data.mensaje)
    } catch (err) {
      const msg = err.response?.data?.error || 'Error de conexión'
      message.error(msg)
    } finally {
      setVerificando(false)
    }
  }

  return (
    <div style={{ maxWidth: 560, margin: '32px auto', padding: '0 16px' }}>
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
        title={
          <span>
            <MailOutlined style={{ marginRight: 8, color: '#1677ff' }} />
            Configuración de correo saliente
          </span>
        }
      >
        <p style={{ color: '#666', marginBottom: 16, fontSize: 13 }}>
          Configura tu cuenta de correo <strong>@bodeparking.cl</strong> para poder enviar emails desde el CRM.
          Usa tu email y contraseña de cPanel.
        </p>

        {config?.smtpEmail && (
          <div style={{ marginBottom: 16, padding: '8px 12px', background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
            <CheckCircleOutlined style={{ color: '#52c41a' }} />
            <span style={{ fontSize: 13 }}>
              Correo configurado: <strong>{config.smtpEmail}</strong>
            </span>
          </div>
        )}

        <Form form={form} layout="vertical">
          <Form.Item
            label="Email (ej: tuusuario@bodeparking.cl)"
            name="smtpEmail"
            initialValue={config?.smtpEmail || ''}
            rules={[
              { required: true, message: 'Ingresa tu email' },
              { type: 'email', message: 'Email inválido' },
            ]}
          >
            <Input
              prefix={<MailOutlined style={{ color: '#bbb' }} />}
              placeholder="tuusuario@bodeparking.cl"
            />
          </Form.Item>

          <Form.Item
            label="Contraseña de correo"
            name="smtpPassword"
            rules={[{ required: true, message: 'Ingresa tu contraseña de correo' }]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: '#bbb' }} />}
              placeholder={config?.tienePassword ? '••••••••••• (dejar vacío para mantener)' : 'Contraseña de cPanel'}
            />
          </Form.Item>

          <Divider style={{ margin: '12px 0' }} />

          <div style={{ display: 'flex', gap: 8 }}>
            <Button
              type="primary"
              loading={guardando}
              onClick={handleGuardar}
            >
              Guardar y verificar
            </Button>
            {config?.smtpEmail && config?.tienePassword && (
              <Button loading={verificando} onClick={handleVerificar}>
                Verificar conexión
              </Button>
            )}
          </div>
        </Form>
      </Card>
    </div>
  )
}
