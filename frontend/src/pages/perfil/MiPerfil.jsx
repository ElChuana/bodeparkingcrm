import React, { useState, useEffect } from 'react'
import { Card, Form, Input, Button, App, Space, Tag } from 'antd'
import { MailOutlined, CheckCircleOutlined, SettingOutlined } from '@ant-design/icons'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'

export default function MiPerfil() {
  const { usuario } = useAuth()
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const [guardando, setGuardando] = useState(false)
  const [emailConfigurado, setEmailConfigurado] = useState(null)

  useEffect(() => {
    api.get('/email/config').then(r => {
      setEmailConfigurado(r.data.smtpEmail)
      if (r.data.smtpEmail) form.setFieldValue('smtpEmail', r.data.smtpEmail)
    }).catch(() => {})
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
      const msg = err.response?.data?.error || 'No se pudo guardar'
      message.error(msg)
    } finally {
      setGuardando(false)
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
            Email para envío de correos
          </span>
        }
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

          <Button type="primary" loading={guardando} onClick={handleGuardar}>
            Guardar
          </Button>
        </Form>
      </Card>
    </div>
  )
}
