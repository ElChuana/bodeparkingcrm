import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Form, Input, Button, Card, Typography, App } from 'antd'
import { LockOutlined, MailOutlined } from '@ant-design/icons'
import logo from '../../assets/logo.png'

const { Text } = Typography

export default function Login() {
  const [cargando, setCargando] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()
  const { message } = App.useApp()

  const handleSubmit = async (values) => {
    setCargando(true)
    try {
      await login(values.email, values.password)
      navigate('/dashboard')
    } catch (err) {
      message.error(err.response?.data?.error || 'Error al iniciar sesión')
    } finally {
      setCargando(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
    }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: '14px 24px', display: 'inline-block', marginBottom: 20 }}>
            <img src={logo} alt="BodeParking" style={{ height: 44, display: 'block' }} />
          </div>
          <div>
            <Text style={{ color: 'rgba(255,255,255,0.6)' }}>Ingresa a tu cuenta</Text>
          </div>
        </div>

        <Card bordered={false} style={{ borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }}>
          <Form layout="vertical" onFinish={handleSubmit} size="large">
            <Form.Item label="Email" name="email" rules={[{ required: true, type: 'email', message: 'Ingresa tu email' }]}>
              <Input prefix={<MailOutlined />} placeholder="tu@email.cl" />
            </Form.Item>
            <Form.Item label="Contraseña" name="password" rules={[{ required: true, message: 'Ingresa tu contraseña' }]}>
              <Input.Password prefix={<LockOutlined />} placeholder="••••••••" />
            </Form.Item>
            <Form.Item style={{ marginBottom: 0, marginTop: 8 }}>
              <Button type="primary" htmlType="submit" block loading={cargando}>
                Ingresar
              </Button>
            </Form.Item>
          </Form>
        </Card>
      </div>
    </div>
  )
}
