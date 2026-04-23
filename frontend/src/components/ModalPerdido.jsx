import { Modal, Form, Select, Input, Typography } from 'antd'
import { MOTIVO_PERDIDA_OPTIONS, ETAPA_LABEL } from './ui'

const { Text } = Typography

export default function ModalPerdido({ open, etapaActual, onConfirm, onCancel, loading }) {
  const [form] = Form.useForm()

  const handleOk = () => {
    form.validateFields().then(values => {
      onConfirm(values)
      form.resetFields()
    })
  }

  const handleCancel = () => {
    form.resetFields()
    onCancel()
  }

  return (
    <Modal
      title="Marcar como Perdido"
      open={open}
      onOk={handleOk}
      onCancel={handleCancel}
      okText="Confirmar pérdida"
      cancelText="Cancelar"
      confirmLoading={loading}
      okButtonProps={{ danger: true }}
      width={460}
    >
      {etapaActual && (
        <div style={{ background: '#f8fafc', borderRadius: 6, padding: '8px 12px', marginBottom: 16 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Etapa actual: <Text strong>{ETAPA_LABEL[etapaActual] || etapaActual}</Text> — se guardará automáticamente
          </Text>
        </div>
      )}
      <Form form={form} layout="vertical">
        <Form.Item
          name="motivoPerdidaCat"
          label="Motivo de pérdida"
          rules={[{ required: true, message: 'Selecciona el motivo' }]}
        >
          <Select
            placeholder="¿Por qué se perdió este lead?"
            options={MOTIVO_PERDIDA_OPTIONS}
          />
        </Form.Item>
        <Form.Item
          name="motivoPerdidaNota"
          label="Nota adicional (opcional)"
        >
          <Input.TextArea
            rows={2}
            placeholder="Detalle adicional..."
            maxLength={300}
            showCount
          />
        </Form.Item>
      </Form>
    </Modal>
  )
}
