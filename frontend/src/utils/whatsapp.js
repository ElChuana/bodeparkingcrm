// Normaliza un teléfono chileno a formato internacional sin símbolos (ej: 56912345678).
// WhatsApp requiere solo dígitos con código país.
export function normalizarTelefonoCL(raw) {
  let d = (raw || '').replace(/\D/g, '') // solo dígitos
  if (!d) return null
  d = d.replace(/^0+/, '')               // quita ceros iniciales
  if (d.startsWith('56')) return d       // ya trae código país
  if (d.length === 9 && d.startsWith('9')) return '56' + d // celular 9XXXXXXXX
  if (d.length === 8) return '569' + d   // celular sin el 9
  return '56' + d                        // fallback: anteponer país
}

// Devuelve la URL para abrir WhatsApp con un mensaje pre-escrito.
// Abre la cuenta logueada en el dispositivo (el propio número del vendedor).
// Devuelve null si el teléfono no es utilizable.
export function linkWhatsApp(telefono, mensaje = '') {
  const num = normalizarTelefonoCL(telefono)
  if (!num) return null
  const texto = mensaje ? `?text=${encodeURIComponent(mensaje)}` : ''
  return `https://wa.me/${num}${texto}`
}
