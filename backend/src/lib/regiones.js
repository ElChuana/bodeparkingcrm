// Normaliza nombres de región de Chile tal como los entregan Meta ("Araucanía Region"), GA4 ("Araucania") o el
// CRM ("Metropolitana", "Biobío") → código INE de 2 dígitos + nombre canónico. Tabla de la sesión "facebook".
const REGIONES = [
  { codigo: '15', nombre: 'Arica y Parinacota', claves: ['arica y parinacota', 'arica and parinacota', 'arica'] },
  { codigo: '01', nombre: 'Tarapacá', claves: ['tarapaca'] },
  { codigo: '02', nombre: 'Antofagasta', claves: ['antofagasta'] },
  { codigo: '03', nombre: 'Atacama', claves: ['atacama'] },
  { codigo: '04', nombre: 'Coquimbo', claves: ['coquimbo'] },
  { codigo: '05', nombre: 'Valparaíso', claves: ['valparaiso'] },
  { codigo: '13', nombre: 'Metropolitana de Santiago', claves: ['santiago metropolitan', 'metropolitana', 'metropolitana de santiago', 'region metropolitana', 'santiago', 'rm'] },
  { codigo: '06', nombre: "O'Higgins", claves: ['ohiggins', 'o higgins', 'libertador general bernardo ohiggins', 'libertador bernardo ohiggins', 'libertador'] },
  { codigo: '07', nombre: 'Maule', claves: ['maule'] },
  { codigo: '16', nombre: 'Ñuble', claves: ['nuble'] },
  { codigo: '08', nombre: 'Biobío', claves: ['bio bio', 'biobio', 'bio-bio', 'del bio bio'] },
  { codigo: '09', nombre: 'La Araucanía', claves: ['araucania', 'la araucania'] },
  { codigo: '14', nombre: 'Los Ríos', claves: ['los rios'] },
  { codigo: '10', nombre: 'Los Lagos', claves: ['los lagos'] },
  { codigo: '11', nombre: 'Aysén', claves: ['aysen', 'aisen', 'aysen del general carlos ibanez del campo'] },
  { codigo: '12', nombre: 'Magallanes', claves: ['magallanes', 'magallanes y la antartica chilena', 'magallanes y antartica chilena'] },
]

const limpiar = (s) => String(s || '')
  .normalize('NFD').replace(/[̀-ͯ]/g, '') // sin tildes
  .toLowerCase()
  .replace(/['’]/g, '')
  .replace(/\bregion\b/g, '').replace(/\bregion de\b/g, '').replace(/\bdel\b/g, '').replace(/\bde\b/g, '')
  .replace(/[^a-z0-9 ]/g, ' ')
  .replace(/\s+/g, ' ').trim()

const INDICE = new Map()
for (const r of REGIONES) for (const k of r.claves) INDICE.set(limpiar(k), r)

// → { codigo, nombre } o null (ej. "Unknown")
function normalizarRegion(nombre) {
  const k = limpiar(nombre)
  if (!k || k === 'unknown' || k === 'desconocida') return null
  if (INDICE.has(k)) return INDICE.get(k)
  // "metropolitana santiago", "bio bio" con variantes: buscar por inclusión
  for (const [clave, r] of INDICE) if (k.includes(clave) || clave.includes(k)) return r
  return null
}

module.exports = { REGIONES, normalizarRegion }
