// Ilustraciones isométricas para el catálogo del modo reunión.
//
// Se usan cuando la unidad no tiene foto propia. Antes se repetía una foto del
// edificio en cada tarjeta y el catálogo parecía cargado con la misma bodega
// veinte veces; una ilustración deja claro que es un espacio de referencia y no
// una foto de esa unidad.
//
// Proyección isométrica: x va hacia la derecha-abajo, y hacia la izquierda-abajo
// y z hacia arriba. Todo se arma con cajas, así que los objetos se declaran por
// posición y tamaño en vez de escribir paths a mano.

const K = 0.866 // cos(30°)
const iso = (x, y, z) => [(x - y) * K, (x + y) * 0.5 - z]
const pto = (x, y, z) => iso(x, y, z).join(',')

// Aclara u oscurece un color para simular la luz en cada cara.
// Acepta hex y rgb() porque el resultado se vuelve a pasar por acá al anidar
// (pasarle un rgb() a la versión que solo leía hex devolvía NaN y la cara salía
// negra).
function tono(color, factor) {
  const ajusta = (c) => Math.max(0, Math.min(255, Math.round(c * factor)))
  const rgb = String(color).match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i)
  const [r, g, b] = rgb
    ? [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])]
    : (() => { const n = parseInt(String(color).slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255] })()
  return `rgb(${ajusta(r)},${ajusta(g)},${ajusta(b)})`
}

// Un prisma: cara superior, cara derecha (x+w) y cara izquierda (y+d)
function Caja({ x, y, z, w, d, h, color, tapa }) {
  const arriba = [pto(x, y, z + h), pto(x + w, y, z + h), pto(x + w, y + d, z + h), pto(x, y + d, z + h)].join(' ')
  const derecha = [pto(x + w, y, z), pto(x + w, y + d, z), pto(x + w, y + d, z + h), pto(x + w, y, z + h)].join(' ')
  const izquierda = [pto(x, y + d, z), pto(x + w, y + d, z), pto(x + w, y + d, z + h), pto(x, y + d, z + h)].join(' ')
  return (
    <g>
      <polygon points={izquierda} fill={tono(color, 0.78)} />
      <polygon points={derecha} fill={tono(color, 0.9)} />
      <polygon points={arriba} fill={tapa || tono(color, 1.08)} />
    </g>
  )
}

// Panel plano (colchón, cuadro, sommier): una caja muy delgada
const Panel = (p) => <Caja {...p} />

const CARTON = '#D9A66C'
const CARTON_OSC = '#C08E52'

// Cinta y solapas de una caja de cartón, sobre su cara superior
function CintaCaja({ x, y, z, w, d }) {
  const a = pto(x + w / 2, y, z)
  const b = pto(x + w / 2, y + d, z)
  const c = pto(x, y + d / 2, z)
  const e = pto(x + w, y + d / 2, z)
  return (
    <g stroke={tono(CARTON, 0.72)} strokeWidth=".18" fill="none">
      <line x1={a.split(',')[0]} y1={a.split(',')[1]} x2={b.split(',')[0]} y2={b.split(',')[1]} />
      <line x1={c.split(',')[0]} y1={c.split(',')[1]} x2={e.split(',')[0]} y2={e.split(',')[1]} />
    </g>
  )
}

// ── Sala vacía: piso + dos paredes ────────────────────────────────
function Recinto({ lado = 11, alto = 7.5, pared = '#E8E2D2', piso = '#CFC9BF' }) {
  const grosor = 0.45
  return (
    <g>
      {/* piso */}
      <polygon points={[pto(0, 0, 0), pto(lado, 0, 0), pto(lado, lado, 0), pto(0, lado, 0)].join(' ')} fill={piso} />
      {/* pared del fondo derecho (y = 0) */}
      <polygon points={[pto(0, 0, 0), pto(lado, 0, 0), pto(lado, 0, alto), pto(0, 0, alto)].join(' ')} fill={tono(pared, 0.88)} />
      <polygon points={[pto(0, 0, alto), pto(lado, 0, alto), pto(lado, -grosor, alto), pto(0, -grosor, alto)].join(' ')} fill={tono(pared, 1.06)} />
      {/* pared del fondo izquierdo (x = 0) */}
      <polygon points={[pto(0, 0, 0), pto(0, lado, 0), pto(0, lado, alto), pto(0, 0, alto)].join(' ')} fill={pared} />
      <polygon points={[pto(0, 0, alto), pto(0, lado, alto), pto(-grosor, lado, alto), pto(-grosor, 0, alto)].join(' ')} fill={tono(pared, 1.12)} />
    </g>
  )
}

// ── BODEGA ────────────────────────────────────────────────────────
// Una bodega de verdad: lo que el cliente se imagina guardando adentro.
export function IlustracionBodega({ alto = '100%', fondo = '#EEF3F7' }) {
  return (
    <svg viewBox="-10.4 -7.6 20.8 19.4" style={{ width: '100%', height: alto, display: 'block' }}
      role="img" aria-label="Bodega con cajas y muebles guardados">
      <rect x="-10.4" y="-7.6" width="20.8" height="19.4" fill={fondo} />
      <Recinto />

      {/* estante alto en la pared del fondo */}
      <Caja x={1.2} y={0.2} z={5.4} w={5.4} d={0.35} h={0.25} color="#B9B3A8" />
      <Caja x={1.6} y={0.25} z={5.65} w={1.6} d={0.3} h={0.9} color="#8FC5D8" />
      <Caja x={3.6} y={0.25} z={5.65} w={1.2} d={0.3} h={0.7} color={CARTON} />

      {/* cuadro apoyado en la pared izquierda */}
      <Panel x={0.35} y={2.2} z={0} w={0.18} d={3} h={3.4} color="#F2EDE4" tapa="#EFE9DE" />
      <g opacity=".75">
        <polygon points={[pto(0.5, 2.7, 0.6), pto(0.5, 4.4, 1.4), pto(0.5, 4.4, 2.6), pto(0.5, 2.7, 2.1)].join(' ')} fill="#F09B93" />
      </g>

      {/* pila de cajas de cartón, izquierda */}
      <Caja x={0.9} y={5.6} z={0} w={2.4} d={2.4} h={1.7} color={CARTON} />
      <CintaCaja x={0.9} y={5.6} z={1.7} w={2.4} d={2.4} />
      <Caja x={1} y={5.9} z={1.7} w={2} d={2} h={1.5} color={CARTON_OSC} />
      <CintaCaja x={1} y={5.9} z={3.2} w={2} d={2} />
      <Caja x={1.2} y={6.2} z={3.2} w={1.5} d={1.5} h={1.1} color={CARTON} />
      <CintaCaja x={1.2} y={6.2} z={4.3} w={1.5} d={1.5} />

      {/* sofá rojo al fondo */}
      <Caja x={3.4} y={0.5} z={0} w={4.2} d={1.9} h={0.75} color="#E0574F" />
      <Caja x={3.4} y={0.5} z={0.75} w={4.2} d={0.55} h={0.85} color="#C9463F" />
      <Caja x={3.4} y={0.5} z={0.75} w={0.5} d={1.9} h={0.6} color="#CE4A43" />
      <Caja x={7.1} y={0.5} z={0.75} w={0.5} d={1.9} h={0.6} color="#CE4A43" />

      {/* silla naranja */}
      <Caja x={2.6} y={3.4} z={1.3} w={1.5} d={1.5} h={0.22} color="#EF9A4A" />
      <Caja x={2.6} y={3.4} z={1.52} w={0.22} d={1.5} h={1.5} color="#E08C3E" />
      {[[2.65, 3.45], [3.95, 3.45], [2.65, 4.75], [3.95, 4.75]].map(([cx, cy], i) => (
        <Caja key={i} x={cx} y={cy} z={0} w={0.16} d={0.16} h={1.3} color="#B9B3A8" />
      ))}

      {/* mueble de cajones, derecha */}
      <Caja x={7.3} y={1.4} z={0} w={2.4} d={2.2} h={2.6} color="#EDE7DC" />
      <Panel x={7.28} y={1.6} z={0.4} w={0.06} d={1.8} h={0.7} color="#CFC7B8" />
      <Panel x={7.28} y={1.6} z={1.4} w={0.06} d={1.8} h={0.7} color="#CFC7B8" />

      {/* cajas a la derecha */}
      <Caja x={7.6} y={4.6} z={0} w={2.2} d={2.2} h={1.6} color={CARTON} />
      <CintaCaja x={7.6} y={4.6} z={1.6} w={2.2} d={2.2} />
      <Caja x={7.8} y={4.9} z={1.6} w={1.7} d={1.7} h={1.2} color={CARTON_OSC} />
      <CintaCaja x={7.8} y={4.9} z={2.8} w={1.7} d={1.7} />

      {/* colchón apoyado al frente: el volumen que ordena la escena */}
      <Panel x={3.9} y={6.2} z={0.05} w={5} d={0.5} h={4.6} color="#F7FAFC" tapa="#EAF1F5" />
      <polygon
        points={[pto(4.3, 6.18, 0.5), pto(8.5, 6.18, 0.5), pto(8.5, 6.18, 4.3), pto(4.3, 6.18, 4.3)].join(' ')}
        fill="none" stroke="#D6E2EA" strokeWidth=".16" />
      <circle cx={iso(4.6, 6.15, 2.4)[0]} cy={iso(4.6, 6.15, 2.4)[1]} r=".22" fill="#D6E2EA" />

      {/* caja suelta adelante */}
      <Caja x={5.6} y={8.6} z={0} w={1.7} d={1.7} h={1.3} color={CARTON} />
      <CintaCaja x={5.6} y={8.6} z={1.3} w={1.7} d={1.7} />
    </svg>
  )
}

// ── ESTACIONAMIENTO ───────────────────────────────────────────────
export function IlustracionEstacionamiento({ alto = '100%', fondo = '#EEF3F7' }) {
  const AUTO = '#4E86B8'
  return (
    <svg viewBox="-10.4 -7.6 20.8 19.4" style={{ width: '100%', height: alto, display: 'block' }}
      role="img" aria-label="Estacionamiento con un auto">
      <rect x="-10.4" y="-7.6" width="20.8" height="19.4" fill={fondo} />
      <Recinto piso="#C6C9CC" pared="#E4E7EA" />

      {/* demarcación de la plaza */}
      <g fill="#EFC24E">
        <polygon points={[pto(1.4, 1.4, .02), pto(1.75, 1.4, .02), pto(1.75, 9.6, .02), pto(1.4, 9.6, .02)].join(' ')} />
        <polygon points={[pto(9.3, 1.4, .02), pto(9.65, 1.4, .02), pto(9.65, 9.6, .02), pto(9.3, 9.6, .02)].join(' ')} />
        <polygon points={[pto(1.4, 1.4, .02), pto(9.65, 1.4, .02), pto(9.65, 1.75, .02), pto(1.4, 1.75, .02)].join(' ')} />
      </g>

      {/* tope de rueda */}
      <Caja x={2.4} y={2.1} z={0} w={6.2} d={0.5} h={0.35} color="#B0B5BA" />

      {/* ruedas del lado oculto: van antes de la carrocería o quedan encima */}
      {[[2.9, 2.9], [7.4, 2.9]].map(([cx, cy], i) => (
        <Caja key={i} x={cx} y={cy} z={0} w={1.1} d={0.35} h={0.85} color="#3F464C" />
      ))}

      {/* auto */}
      <Caja x={2.3} y={3.2} z={0.35} w={6.4} d={3.4} h={1.15} color={AUTO} />
      <Caja x={3.5} y={3.5} z={1.5} w={3.6} d={2.8} h={1.2} color={tono(AUTO, 1.1)} tapa={tono(AUTO, 1.22)} />
      {/* ventanas: la lateral y la del frente */}
      <polygon points={[pto(3.56, 3.56, 1.62), pto(3.56, 6.24, 1.62), pto(3.56, 6.24, 2.6), pto(3.56, 3.56, 2.6)].join(' ')} fill="#D5E9F5" />
      <polygon points={[pto(3.62, 6.32, 1.62), pto(7.0, 6.32, 1.62), pto(7.0, 6.32, 2.6), pto(3.62, 6.32, 2.6)].join(' ')} fill="#C2DCEC" />
      {/* luces */}
      <Caja x={2.25} y={3.5} z={0.85} w={0.12} d={0.9} h={0.35} color="#F7EFD4" />
      <Caja x={2.25} y={5.6} z={0.85} w={0.12} d={0.9} h={0.35} color="#F7EFD4" />
      {/* ruedas del lado visible */}
      {[[2.9, 6.55], [7.4, 6.55]].map(([cx, cy], i) => (
        <Caja key={i} x={cx} y={cy} z={0} w={1.1} d={0.35} h={0.85} color="#3F464C" />
      ))}

      {/* número de plaza pintado en el piso */}
      <polygon points={[pto(3.4, 8.4, .02), pto(7.6, 8.4, .02), pto(7.6, 9.2, .02), pto(3.4, 9.2, .02)].join(' ')} fill="#DADDE0" />
    </svg>
  )
}

export const Ilustracion = ({ tipo, alto }) =>
  tipo === 'ESTACIONAMIENTO'
    ? <IlustracionEstacionamiento alto={alto} />
    : <IlustracionBodega alto={alto} />

// ── EDIFICIO (para la portada cuando no hay foto) ─────────────────
export function IlustracionEdificio({ fondo = '#EEF3F7' }) {
  return (
    <svg viewBox="-15 -13 30 26" style={{ width: '100%', height: '100%', display: 'block' }}
      preserveAspectRatio="xMidYMid meet" role="img" aria-label="Edificio">
      <rect x="-15" y="-13" width="30" height="26" fill={fondo} />
      {/* vereda */}
      <polygon points={[pto(-1, -1, 0), pto(12, -1, 0), pto(12, 12, 0), pto(-1, 12, 0)].join(' ')} fill="#DDE4E9" />
      {/* torre */}
      <Caja x={1.5} y={1.5} z={0} w={5} d={5} h={10} color="#E6ECF1" />
      {[0, 1, 2, 3].map(p => (
        <g key={p}>
          <polygon points={[pto(6.52, 2.1, 1.2 + p * 2.2), pto(6.52, 5.9, 1.2 + p * 2.2), pto(6.52, 5.9, 2.5 + p * 2.2), pto(6.52, 2.1, 2.5 + p * 2.2)].join(' ')}
            fill={p % 2 ? '#9EC9DE' : '#BBD7E6'} />
          <polygon points={[pto(2.1, 6.52, 1.2 + p * 2.2), pto(5.9, 6.52, 1.2 + p * 2.2), pto(5.9, 6.52, 2.5 + p * 2.2), pto(2.1, 6.52, 2.5 + p * 2.2)].join(' ')}
            fill={p % 2 ? '#ACD0E2' : '#C6DEEA'} />
        </g>
      ))}
      {/* cuerpo bajo */}
      <Caja x={6.6} y={2} z={0} w={3.4} d={4} h={4.4} color="#EDF1F4" />
      <Caja x={1.8} y={6.8} z={0} w={4} d={3} h={3.2} color="#EDF1F4" />
      {/* acceso */}
      <polygon points={[pto(3.2, 9.82, 0), pto(4.6, 9.82, 0), pto(4.6, 9.82, 1.9), pto(3.2, 9.82, 1.9)].join(' ')} fill="#7FA9C2" />
      {/* árbol */}
      <Caja x={9.4} y={8.4} z={0} w={0.35} d={0.35} h={1.2} color="#B9A48C" />
      <circle cx={iso(9.57, 8.57, 2.2)[0]} cy={iso(9.57, 8.57, 2.2)[1]} r="1.5" fill="#AFCBB4" />
    </svg>
  )
}
