import React, { useState, useEffect } from 'react'
import { Modal, Form, Input, Button, App, Divider } from 'antd'
import { MailOutlined, SendOutlined, PaperClipOutlined } from '@ant-design/icons'
import api from '../services/api'

const { TextArea } = Input

const PLANTILLA_EMAIL_DEFAULT = `Estimado/a {nombre},\n\nMe comunico desde BodeParking para...\n\n\nSaludos cordiales,`
const PLANTILLA_COTIZACION_DEFAULT = `Estimado/a {nombre},\n\nAdjunto encontrará la cotización solicitada para nuestras bodegas/estacionamientos.\n\nQuedo a su disposición para cualquier consulta.\n\nSaludos cordiales,`

function aplicarNombre(plantilla, nombre) {
  return plantilla.replace(/\{nombre\}/g, nombre || '')
}

/**
 * Modal para enviar emails desde el CRM.
 *
 * Props:
 *   open        boolean
 *   onClose     () => void
 *   para        string  (email destino pre-cargado)
 *   nombre      string  (nombre del destinatario, para el asunto)
 *   leadId      number  (opcional, registra interacción)
 *   cotizacionId number (opcional, adjunta PDF de cotización)
 */
export default function ModalEmail({ open, onClose, para = '', nombre = '', leadId, cotizacionId, pdfBase64, pdfNombre }) {
  const [form] = Form.useForm()
  const [enviando, setEnviando] = useState(false)
  const [firma, setFirma] = useState(null)
  const [plantillas, setPlantillas] = useState({ email: null, cotizacion: null })
  const { message } = App.useApp()

  useEffect(() => {
    api.get('/email/firma').then(r => setFirma(r.data.firma)).catch(() => {})
    api.get('/email/config').then(r => {
      setPlantillas({
        email: r.data.plantillaEmail || null,
        cotizacion: r.data.plantillaCotizacion || null,
      })
    }).catch(() => {})
  }, [])

  const handleOpen = () => {
    const plantilla = cotizacionId
      ? (plantillas.cotizacion || PLANTILLA_COTIZACION_DEFAULT)
      : (plantillas.email || PLANTILLA_EMAIL_DEFAULT)

    form.setFieldsValue({
      para,
      cc: '',
      asunto: cotizacionId
        ? `BodeParking — Cotización para ${nombre}`
        : (nombre ? `BodeParking — Información para ${nombre}` : 'BodeParking — Información'),
      cuerpo: aplicarNombre(plantilla, nombre),
    })
  }

  const handleEnviar = async () => {
    try {
      const valores = await form.validateFields()
      setEnviando(true)
      await api.post('/email/enviar', {
        ...valores,
        leadId,
        cotizacionId,
        pdfBase64: pdfBase64 || undefined,
        pdfNombre: pdfNombre || undefined,
      })
      message.success('Email enviado correctamente')
      form.resetFields()
      onClose()
    } catch (err) {
      if (err?.errorFields) return
      const msg = err.response?.data?.error || 'No se pudo enviar el email'
      const detalle = err.response?.data?.detalle || ''
      message.error(`${msg}${detalle ? `: ${detalle}` : ''}`)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Modal
      title={
        <span>
          <MailOutlined style={{ marginRight: 8, color: '#1677ff' }} />
          Enviar Email
          {cotizacionId && (
            <span style={{ fontSize: 12, color: '#722ed1', marginLeft: 8, fontWeight: 400 }}>
              <PaperClipOutlined /> con cotización adjunta
            </span>
          )}
        </span>
      }
      open={open}
      onCancel={onClose}
      afterOpenChange={isOpen => { if (isOpen) handleOpen() }}
      width={640}
      footer={null}
      destroyOnHide
    >
      <Form form={form} layout="vertical" style={{ marginTop: 8 }}>
        <Form.Item
          label="Para"
          name="para"
          rules={[
            { required: true, message: 'Ingresa el email' },
            { type: 'email', message: 'Email inválido' },
          ]}
        >
          <Input prefix={<MailOutlined style={{ color: '#bbb' }} />} placeholder="destinatario@email.com" />
        </Form.Item>

        <Form.Item label="CC (opcional)" name="cc">
          <Input placeholder="copia@email.com" />
        </Form.Item>

        <Form.Item
          label="Asunto"
          name="asunto"
          rules={[{ required: true, message: 'Ingresa el asunto' }]}
        >
          <Input />
        </Form.Item>

        <Form.Item
          label="Mensaje"
          name="cuerpo"
          rules={[{ required: true, message: 'Escribe el mensaje' }]}
        >
          <TextArea
            rows={8}
            placeholder="Escribe tu mensaje aquí..."
            style={{ fontFamily: 'inherit', fontSize: 14 }}
          />
        </Form.Item>

        {firma && (
          <>
            <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>Vista previa firma:</div>
            <div
              style={{
                padding: '10px 12px',
                background: '#fafafa',
                border: '1px solid #f0f0f0',
                borderRadius: 6,
                marginBottom: 16,
              }}
              dangerouslySetInnerHTML={{ __html: firma }}
            />
          </>
        )}

        <Divider style={{ margin: '8px 0 16px' }} />

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button onClick={onClose}>Cancelar</Button>
          <Button
            type="primary"
            icon={<SendOutlined />}
            loading={enviando}
            onClick={handleEnviar}
          >
            Enviar
          </Button>
        </div>
      </Form>
    </Modal>
  )
}
