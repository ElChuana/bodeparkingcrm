import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Table, Tag, Button, Typography, Space, Steps, Descriptions, Divider } from 'antd'
import { useNavigate } from 'react-router-dom'
import { WarningOutlined, EyeOutlined } from '@ant-design/icons'
import api from '../../services/api'
import { ESTADO_VENTA_COLOR } from '../../components/ui'
import { format, isPast } from 'date-fns'
import { es } from 'date-fns/locale'

const { Title, Text } = Typography

const ESTADO_LABEL = { PROMESA: 'Promesa', ESCRITURA: 'Escritura', ENTREGADO: 'Entregado' }

const LEGAL_LABEL = {
  FIRMA_CLIENTE_PROMESA:      'Firma cliente',
  FIRMA_INMOBILIARIA_PROMESA: 'Firma inmobiliaria',
  ESCRITURA_LISTA:            'Escritura lista',
  FIRMADA_NOTARIA:            'Notaría',
  INSCRIPCION_CBR:            'CBR',
  ENTREGADO:                  'Entregado',
}

const PASOS_CON_PROMESA = ['FIRMA_CLIENTE_PROMESA','FIRMA_INMOBILIARIA_PROMESA','ESCRITURA_LISTA','FIRMADA_NOTARIA','INSCRIPCION_CBR','ENTREGADO']
const PASOS_SIN_PROMESA = ['ESCRITURA_LISTA','FIRMADA_NOTARIA','INSCRIPCION_CBR','ENTREGADO']

const FECHA_POR_PASO = {
  FIRMA_CLIENTE_PROMESA:      'fechaLimiteFirmaCliente',
  FIRMA_INMOBILIARIA_PROMESA: 'fechaLimiteFirmaInmob',
  ESCRITURA_LISTA:            'fechaLimiteEscritura',
  FIRMADA_NOTARIA:            'fechaLimiteFirmaNot',
  INSCRIPCION_CBR:            'fechaLimiteCBR',
  ENTREGADO:                  'fechaLimiteEntrega',
}

function calcFaltantes(proceso) {
  if (!proceso) return [{ tipo: 'warning', texto: 'Proceso legal no iniciado' }]
  const pasos = proceso.tienePromesa === false ? PASOS_SIN_PROMESA : PASOS_CON_PROMESA
  const idx   = pasos.indexOf(proceso.estadoActual)
  const items = []

  const campoActual = FECHA_POR_PASO[proceso.estadoActual]
  if (campoActual && proceso[campoActual] && proceso.estadoActual !== 'ENTREGADO') {
    if (isPast(new Date(proceso[campoActual]))) {
      items.push({ tipo: 'error', texto: `Vencido: ${LEGAL_LABEL[proceso.estadoActual]}` })
    }
  }
  for (let i = Math.max(idx, 0); i < pasos.length; i++) {
    const campo = FECHA_POR_PASO[pasos[i]]
    if (campo && !proceso[campo]) {
      items.push({ tipo: 'warning', texto: `Sin fecha: ${LEGAL_LABEL[pasos[i]]}` })
    }
  }
  return items
}

function ResumenVenta({ v, proceso }) {
  const navigate = useNavigate()
  const unidades = v.unidades || []
  return (
    <div style={{ padding: '12px 24px 8px', background: '#fafafa', borderRadius: 8 }}>
      <Space direction="vertical" style={{ width: '100%' }} size={8}>
        <Descriptions size="small" column={3} bordered={false}>
          <Descriptions.Item label="Comprador">
            <Text strong>{v.comprador?.nombre} {v.comprador?.apellido}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="Precio">
            <Text strong>{(v.precioUF - (v.descuentoUF || 0)).toFixed(2)} UF</Text>
            {v.descuentoUF > 0 && <Text type="secondary" style={{ fontSize: 11, marginLeft: 6 }}>(-{v.descuentoUF} UF desc.)</Text>}
          </Descriptions.Item>
          <Descriptions.Item label="Reserva">
            {v.fechaReserva ? format(new Date(v.fechaReserva), "d MMM yyyy", { locale: es }) : '—'}
          </Descriptions.Item>
          <Descriptions.Item label={`Unidad${unidades.length > 1 ? 'es' : ''} (${unidades.length})`} span={3}>
            <Space wrap>
              {unidades.map(u => (
                <Tag key={u.id} color="geekblue">
                  {u.tipo === 'BODEGA' ? 'Bodega' : 'Est.'} {u.numero} — {u.edificio?.nombre}
                  {u.m2 ? ` · ${u.m2} m²` : ''}
                </Tag>
              ))}
            </Space>
          </Descriptions.Item>
        </Descriptions>
        <Divider style={{ margin: '4px 0' }} />
        <TimelineExpandida proceso={proceso} />
        <div style={{ textAlign: 'right' }}>
          <Button size="small" icon={<EyeOutlined />} onClick={() => navigate(`/ventas/${v.id}`)}>
            Ver venta completa
          </Button>
        </div>
      </Space>
    </div>
  )
}

function TimelineExpandida({ proceso }) {
  if (!proceso) return <Text type="secondary">Sin proceso legal iniciado.</Text>

  const pasos = proceso.tienePromesa === false ? PASOS_SIN_PROMESA : PASOS_CON_PROMESA
  const idx   = pasos.indexOf(proceso.estadoActual)

  const items = pasos.map((paso, i) => {
    const campo   = FECHA_POR_PASO[paso]
    const fecha   = campo && proceso[campo]
    const vencido = fecha && i === idx && isPast(new Date(fecha)) && paso !== 'ENTREGADO'
    const completado = i < idx

    return {
      status: completado ? 'finish' : i === idx ? (vencido ? 'error' : 'process') : 'wait',
      title: (
        <Text strong style={{ fontSize: 13, color: vencido ? '#ff4d4f' : undefined }}>
          {LEGAL_LABEL[paso]}
        </Text>
      ),
      description: fecha ? (
        <Text style={{ fontSize: 12, color: vencido ? '#ff4d4f' : completado ? '#52c41a' : '#8c8c8c' }}>
          {vencido ? '⚠ Vencido · ' : completado ? '✓ Límite fue ' : 'Límite: '}
          {format(new Date(fecha), "d 'de' MMMM yyyy", { locale: es })}
        </Text>
      ) : (
        i >= idx
          ? <Text style={{ fontSize: 12, color: '#faad14' }}>Sin fecha límite configurada</Text>
          : null
      ),
    }
  })

  return (
    <div style={{ padding: '12px 24px 8px' }}>
      <Steps
        direction="horizontal"
        size="small"
        current={idx}
        items={items}
        style={{ overflowX: 'auto' }}
      />
    </div>
  )
}

export default function Legal() {
  const navigate = useNavigate()
  const [mostrarTodo, setMostrarTodo] = useState(false)

  const { data: ventasRaw = [], isLoading } = useQuery({
    queryKey: ['ventas-legal'],
    queryFn: () => api.get('/ventas').then(r =>
      r.data.filter(v => ['PROMESA', 'ESCRITURA', 'ENTREGADO'].includes(v.estado))
    )
  })

  const ventas = mostrarTodo ? ventasRaw : ventasRaw.filter(v => v.procesoLegal?.estadoActual !== 'ENTREGADO')

  const columns = [
    {
      title: 'Comprador / Unidades', key: 'info',
      render: (_, v) => {
        const us = v.unidades || []
        return (
          <div>
            <Text strong style={{ fontSize: 13 }}>{v.comprador?.nombre} {v.comprador?.apellido}</Text>
            <div><Text type="secondary" style={{ fontSize: 12 }}>
              {us.length > 0 ? us.map(u => `${u.tipo === 'BODEGA' ? 'Bodega' : 'Est.'} ${u.numero}`).join(', ') : '—'}
              {us[0]?.edificio?.nombre ? ` — ${us[0].edificio.nombre}` : ''}
            </Text></div>
          </div>
        )
      }
    },
    {
      title: 'Estado', key: 'estado', width: 110,
      render: (_, v) => <Tag color={ESTADO_VENTA_COLOR[v.estado]}>{ESTADO_LABEL[v.estado]}</Tag>
    },
    {
      title: 'Paso actual', key: 'paso', width: 180,
      render: (_, v) => {
        if (!v.procesoLegal) return <Tag color="default">No iniciado</Tag>
        const campo   = FECHA_POR_PASO[v.procesoLegal.estadoActual]
        const fecha   = campo && v.procesoLegal[campo]
        const vencido = fecha && isPast(new Date(fecha)) && v.procesoLegal.estadoActual !== 'ENTREGADO'
        return (
          <div>
            <Tag color={vencido ? 'red' : 'blue'}>
              {vencido && <WarningOutlined style={{ marginRight: 4 }} />}
              {LEGAL_LABEL[v.procesoLegal.estadoActual]}
            </Tag>
            {fecha && (
              <div style={{ fontSize: 11, color: vencido ? '#ff4d4f' : '#8c8c8c', marginTop: 2 }}>
                Límite: {format(new Date(fecha), 'd MMM', { locale: es })}
              </div>
            )}
          </div>
        )
      }
    },
    {
      title: 'Qué falta', key: 'falta',
      render: (_, v) => {
        const faltantes = calcFaltantes(v.procesoLegal)
        if (faltantes.length === 0) return <Tag color="green">Al día</Tag>
        return (
          <Space size={2} wrap>
            {faltantes.slice(0, 2).map((f, i) => (
              <Tag key={i} color={f.tipo === 'error' ? 'red' : 'orange'} style={{ fontSize: 11 }}>
                {f.texto}
              </Tag>
            ))}
            {faltantes.length > 2 && (
              <Text type="secondary" style={{ fontSize: 11 }}>+{faltantes.length - 2} más</Text>
            )}
          </Space>
        )
      }
    },
  ]

  const entregados = ventasRaw.filter(v => v.procesoLegal?.estadoActual === 'ENTREGADO').length

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <Title level={4} style={{ margin: 0 }}>Legal — Procesos en curso</Title>
        {entregados > 0 && (
          <Button size="small" type="link" onClick={() => setMostrarTodo(p => !p)}>
            {mostrarTodo ? `Ocultar entregados (${entregados})` : `Mostrar todo (${entregados} entregados)`}
          </Button>
        )}
      </div>
      <Table
        dataSource={ventas}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        size="small"
        pagination={false}
        locale={{ emptyText: 'Sin procesos legales activos' }}
        expandable={{
          expandedRowRender: (v) => <ResumenVenta v={v} proceso={v.procesoLegal} />,
          expandRowByClick: true,
          rowExpandable: () => true,
        }}
      />
    </div>
  )
}
