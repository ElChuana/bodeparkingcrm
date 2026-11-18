// HTML seguro: limpia HTML que viene de afuera (correos que responden los
// clientes, firmas) antes de guardarlo o mandarlo. Quita <script>, iframes,
// formularios, atributos on*, y links javascript:/data:. Deja el formato normal
// de un correo: párrafos, negritas, listas, tablas, imágenes y estilos inline.
//
// El frontend vuelve a limpiar al mostrar (DOMPurify): esta es la segunda capa.
const sanitizeHtml = require('sanitize-html')

const OPCIONES = {
  allowedTags: [
    'a', 'abbr', 'b', 'blockquote', 'br', 'caption', 'center', 'code', 'col', 'colgroup',
    'dd', 'del', 'div', 'dl', 'dt', 'em', 'font', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr',
    'i', 'img', 'ins', 'li', 'ol', 'p', 'pre', 'q', 's', 'small', 'span', 'strike', 'strong',
    'sub', 'sup', 'table', 'tbody', 'td', 'tfoot', 'th', 'thead', 'tr', 'u', 'ul',
  ],
  allowedAttributes: {
    '*': ['style', 'align', 'valign', 'width', 'height', 'bgcolor', 'color', 'dir', 'title'],
    a: ['href', 'name', 'target', 'rel'],
    img: ['src', 'alt', 'border'],
    font: ['face', 'size', 'color'],
    table: ['border', 'cellpadding', 'cellspacing'],
    td: ['colspan', 'rowspan'],
    th: ['colspan', 'rowspan'],
  },
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  allowedSchemesByTag: { img: ['http', 'https', 'cid', 'data'] },
  allowProtocolRelative: false,
  // Contenido de estos se descarta entero (no solo la etiqueta)
  nonTextTags: ['script', 'style', 'textarea', 'option', 'noscript', 'title', 'head'],
  transformTags: {
    a: sanitizeHtml.simpleTransform('a', { target: '_blank', rel: 'noopener noreferrer' }),
  },
}

function limpiarHtml(html) {
  if (!html) return ''
  return sanitizeHtml(String(html), OPCIONES)
}

// Escapa texto para meterlo dentro de HTML (nombres, asuntos, etc.)
function escaparHtml(texto) {
  return String(texto ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// Texto plano → HTML: escapa y convierte saltos de línea en <br>
function textoAHtml(texto) {
  return escaparHtml(texto).replace(/\r?\n/g, '<br>')
}

module.exports = { limpiarHtml, escaparHtml, textoAHtml }
