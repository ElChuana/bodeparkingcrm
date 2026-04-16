import { PDFViewer, PDFDownloadLink } from '@react-pdf/renderer'
import { CotizacionDocumento } from './CotizacionPDF'
import { useUF } from '../../hooks/useUF'
import { Button } from 'antd'
import { DownloadOutlined } from '@ant-design/icons'
import logoUrl from '../../assets/logo.png'

// ── Datos de ejemplo ──────────────────────────────────────────────────────
const EJEMPLOS = {
  simple: {
    label: 'Simple — 1 unidad sin descuento',
    cotizacion: {
      id: 1,
      estado: 'ENVIADA',
      creadoEn: new Date().toISOString(),
      validezDias: 30,
      notas: '',
      items: [
        {
          id: 1,
          precioListaUF: 420,
          unidad: { numero: 'B-301', tipo: 'BODEGA', edificio: { nombre: 'Edificio Central Park' } },
        },
      ],
      promociones: [],
      lead: {
        id: 1,
        contacto: { nombre: 'María', apellido: 'González', email: 'mgonzalez@gmail.com', telefono: '+56 9 8765 4321' },
        vendedor: { nombre: 'Juan', apellido: 'Valdivieso', email: 'jvaldivieso@bodeparking.cl' },
      },
    },
  },
  conDescuento: {
    label: 'Con descuento + beneficios',
    cotizacion: {
      id: 42,
      estado: 'ENVIADA',
      creadoEn: new Date().toISOString(),
      validezDias: 15,
      notas: 'Precio especial válido solo para cierre este mes. Incluye estacionamiento de visitas.',
      items: [
        {
          id: 1,
          precioListaUF: 380,
          unidad: { numero: 'B-204', tipo: 'BODEGA', edificio: { nombre: 'Torre Poniente' } },
        },
        {
          id: 2,
          precioListaUF: 220,
          unidad: { numero: 'E-12', tipo: 'ESTACIONAMIENTO', edificio: { nombre: 'Torre Poniente' } },
        },
      ],
      promociones: [
        {
          aplicada: true,
          ahorroUF: 30,
          promocion: { nombre: 'Descuento cierre de mes', tipo: 'DESCUENTO_UF', valorUF: 30 },
        },
        {
          aplicada: true,
          ahorroUF: 0,
          promocion: { nombre: 'Gastos notariales incluidos', tipo: 'GASTOS_NOTARIALES' },
        },
        {
          aplicada: true,
          ahorroUF: 0,
          promocion: { nombre: 'Arriendo asegurado 6 meses', tipo: 'ARRIENDO_ASEGURADO' },
        },
      ],
      lead: {
        id: 2,
        contacto: { nombre: 'Carlos', apellido: 'Hernández', email: 'carlos.h@empresa.cl', telefono: '+56 9 1234 5678' },
        vendedor: { nombre: 'Felix', apellido: 'Betancourt', email: 'fbetancourtt@bodeparking.cl' },
      },
    },
  },
  multiple: {
    label: 'Pack 3 unidades + descuento %',
    cotizacion: {
      id: 87,
      estado: 'ACEPTADA',
      creadoEn: new Date(Date.now() - 5 * 86400000).toISOString(),
      validezDias: 10,
      notas: '',
      items: [
        {
          id: 1,
          precioListaUF: 410,
          unidad: { numero: 'B-501', tipo: 'BODEGA', edificio: { nombre: 'Edificio Alameda Norte' } },
        },
        {
          id: 2,
          precioListaUF: 415,
          unidad: { numero: 'B-502', tipo: 'BODEGA', edificio: { nombre: 'Edificio Alameda Norte' } },
        },
        {
          id: 3,
          precioListaUF: 240,
          unidad: { numero: 'E-07', tipo: 'ESTACIONAMIENTO', edificio: { nombre: 'Edificio Alameda Norte' } },
        },
      ],
      promociones: [
        {
          aplicada: true,
          ahorroUF: 106.5,
          promocion: { nombre: 'Descuento inversor 10%', tipo: 'DESCUENTO_PORCENTAJE', valorPorcentaje: 10 },
        },
        {
          aplicada: true,
          ahorroUF: 0,
          promocion: { nombre: 'Cuotas sin interés 12 meses', tipo: 'CUOTAS_SIN_INTERES' },
        },
      ],
      lead: {
        id: 3,
        contacto: { nombre: 'Inversiones', apellido: 'Santa Rosa SpA', email: 'gerencia@santarosa.cl', telefono: '+56 2 2345 6789' },
        vendedor: { nombre: 'Juan', apellido: 'Valdivieso', email: 'jvaldivieso@bodeparking.cl' },
      },
    },
  },
}

export default function PreviewPDF() {
  const { valorUF } = useUF()
  const [ejemplo, setEjemplo] = React.useState('conDescuento')

  const cotizacion = EJEMPLOS[ejemplo].cotizacion

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Barra de control */}
      <div style={{
        padding: '10px 20px',
        background: '#0C1A2E',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        flexShrink: 0,
      }}>
        <span style={{ color: '#C8963E', fontWeight: 700, fontSize: 14 }}>Preview PDF Cotización</span>
        <span style={{ color: '#7A8FA6', fontSize: 12 }}>
          UF hoy: {valorUF ? `$${Math.round(valorUF).toLocaleString('es-CL')}` : '...'}
        </span>
        <div style={{ display: 'flex', gap: 8, marginLeft: 8 }}>
          {Object.entries(EJEMPLOS).map(([key, val]) => (
            <button
              key={key}
              onClick={() => setEjemplo(key)}
              style={{
                padding: '5px 12px',
                borderRadius: 4,
                border: 'none',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 600,
                background: ejemplo === key ? '#C8963E' : '#1E3A5F',
                color: ejemplo === key ? '#0C1A2E' : '#A0B4C8',
                transition: 'all 0.15s',
              }}
            >
              {val.label}
            </button>
          ))}
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <PDFDownloadLink
            document={<CotizacionDocumento cotizacion={cotizacion} logoUrl={logoUrl} valorUF={valorUF} />}
            fileName={`preview-cotizacion-${cotizacion.id}.pdf`}
          >
            {({ loading }) => (
              <Button
                size="small"
                icon={<DownloadOutlined />}
                loading={loading}
                style={{ background: '#C8963E', border: 'none', color: '#0C1A2E', fontWeight: 700 }}
              >
                Descargar
              </Button>
            )}
          </PDFDownloadLink>
        </div>
      </div>

      {/* Visor PDF */}
      <PDFViewer style={{ flex: 1, border: 'none' }}>
        <CotizacionDocumento cotizacion={cotizacion} logoUrl={logoUrl} valorUF={valorUF} />
      </PDFViewer>
    </div>
  )
}

// Necesita React para useState
import React from 'react'
