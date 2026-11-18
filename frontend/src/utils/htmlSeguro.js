// Limpia HTML que viene de afuera (correos de clientes, firmas) antes de
// mostrarlo con dangerouslySetInnerHTML. Quita scripts, atributos on*,
// links javascript:, iframes, formularios y <style> (que se filtraría al resto
// del CRM). El backend también limpia al guardar: esta es la capa del navegador,
// y la única que protege los correos guardados antes de nov-2026.
import DOMPurify from 'dompurify'

DOMPurify.addHook('afterSanitizeAttributes', nodo => {
  if (nodo.tagName === 'A' && nodo.hasAttribute('href')) {
    nodo.setAttribute('target', '_blank')
    nodo.setAttribute('rel', 'noopener noreferrer')
  }
})

const OPCIONES = {
  USE_PROFILES: { html: true },
  FORBID_TAGS: ['style', 'form', 'input', 'button', 'textarea', 'select', 'iframe', 'object', 'embed', 'base', 'meta', 'link'],
  FORBID_ATTR: ['srcset', 'action', 'formaction'],
}

export function htmlSeguro(html) {
  if (!html) return ''
  return DOMPurify.sanitize(String(html), OPCIONES)
}
