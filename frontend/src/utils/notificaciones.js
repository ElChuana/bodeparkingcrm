// Config compartida de notificaciones (usada por la campana y la página).

// Categorías: "alertas" = cosas que requieren acción; "actividad" = informativo.
export const TIPOS_ALERTAS = [
  'LLAVE_NO_DEVUELTA', 'CUOTA_VENCIDA', 'LEAD_SIN_ACTIVIDAD', 'LEAD_ESTANCADO',
  'FECHA_LEGAL_PROXIMA', 'ARRIENDO_POR_VENCER', 'DESCUENTO_PENDIENTE',
  'LEAD_ETAPA_CAMBIO', 'LEAD_NUEVO', 'RECORDATORIO_LEAD', 'COMISION_ESCRITURA',
]
export const TIPOS_ACTIVIDAD = ['EMAIL_RECIBIDO', 'ACTIVIDAD_EN_LEAD', 'VISITA_PROXIMA', 'DESCUENTO_RESUELTO']

export const TIPO_CONFIG = {
  LLAVE_NO_DEVUELTA:   { color: 'red',    label: 'Llave',          emoji: '🔑' },
  CUOTA_VENCIDA:       { color: 'red',    label: 'Cuota vencida',  emoji: '💳' },
  LEAD_SIN_ACTIVIDAD:  { color: 'orange', label: 'Sin actividad',  emoji: '⏰' },
  LEAD_ESTANCADO:      { color: 'orange', label: 'Lead estancado', emoji: '⚠️' },
  FECHA_LEGAL_PROXIMA: { color: 'blue',   label: 'Legal',          emoji: '⚖️' },
  ARRIENDO_POR_VENCER: { color: 'orange', label: 'Arriendo',       emoji: '🏠' },
  DESCUENTO_PENDIENTE: { color: 'purple', label: 'Descuento',      emoji: '💰' },
  LEAD_ETAPA_CAMBIO:   { color: 'blue',   label: 'Etapa',          emoji: '🔄' },
  LEAD_NUEVO:          { color: 'green',  label: 'Nuevo lead',     emoji: '✨' },
  RECORDATORIO_LEAD:   { color: 'green',  label: 'Recordatorio',   emoji: '📅' },
  COMISION_ESCRITURA:  { color: 'gold',   label: 'Comisión',       emoji: '💵' },
  EMAIL_RECIBIDO:      { color: 'blue',   label: 'Email recibido', emoji: '✉️' },
  ACTIVIDAD_EN_LEAD:   { color: 'green',  label: 'Actividad',      emoji: '📝' },
  VISITA_PROXIMA:      { color: 'blue',   label: 'Visita',         emoji: '📅' },
  DESCUENTO_RESUELTO:  { color: 'purple', label: 'Descuento',      emoji: '✅' },
}

export const cfgTipo = (tipo) => TIPO_CONFIG[tipo] || { emoji: '🔔', color: 'blue', label: tipo }

// A dónde lleva una notificación al hacer click, según su referencia.
// Devuelve null si no tiene destino navegable.
export function rutaDeNotificacion(n) {
  if (!n?.referenciaId) return null
  switch (n.referenciaTipo) {
    case 'lead':       return `/leads/${n.referenciaId}`
    case 'venta':      return `/ventas/${n.referenciaId}`
    case 'cotizacion': return `/cotizaciones/${n.referenciaId}`
    case 'llave':      return '/llaves'
    case 'visita':     return '/visitas'
    default:           return null
  }
}
