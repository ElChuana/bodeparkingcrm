// Vista de apoyo para revisar las ilustraciones del catálogo sin tener que
// buscar una unidad sin foto. Ruta: /reunion-ilustraciones
import { IlustracionBodega, IlustracionEstacionamiento, IlustracionEdificio } from './ilustraciones'

export default function PreviewIlustraciones() {
  const items = [
    ['Bodega', <IlustracionBodega key="b" alto={320} />],
    ['Estacionamiento', <IlustracionEstacionamiento key="e" alto={320} />],
    ['Edificio', <div key="d" style={{ height: 320 }}><IlustracionEdificio /></div>],
  ]
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: 18, padding: 26, background: '#F5F7F9', minHeight: '100vh' }}>
      {items.map(([titulo, el]) => (
        <div key={titulo} style={{ background: '#fff', borderRadius: 14, overflow: 'hidden', border: '1.5px solid #E4E9EE' }}>
          {el}
          <div style={{ padding: '12px 16px', fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>{titulo}</div>
        </div>
      ))}
    </div>
  )
}
