/**
 * Sugerencias desde el historial para clasificar un movimiento.
 *
 * La parte pura: proponer, a partir del HISTORIAL, qué es un movimiento que se va a
 * respaldar con un documento interno. La idea es simple y auditable — nada de modelos:
 * "la última vez que apareció esta misma glosa (o esta misma contraparte), ¿como qué se
 * clasificó?". Si el arriendo de diciembre se clasificó como Arriendo, el de enero con la
 * misma glosa se propone igual.
 *
 * El que decide sigue siendo la persona: esto solo pre-llena el formulario.
 */

const { nucleoGlosa, claveNombre } = require('./contraparte')

/** La clave con la que se agrupan movimientos "iguales": el núcleo de su glosa. */
function claveMovimiento(m) {
  return claveNombre(m?.nombreDetectado || '') || nucleoGlosa(m?.glosa || '')
}

/**
 * Propone descripción/cuenta/contraparte para un movimiento, mirando cómo se
 * clasificaron antes los movimientos parecidos.
 *
 * `historicos` son movimientos YA clasificados, aplanados a:
 *   { glosa, nombreDetectado, contactoId, proveedorId, clasificacion: {
 *       cuentaId, cuenta, descripcion, proveedorId, contactoId } }
 * donde `clasificacion` sale del documento que cada uno paga (factura de compra,
 * documento interno) — el controlador la arma.
 *
 * Orden de señales, de más fuerte a más débil:
 *   1. misma glosa (mismo núcleo) — es el mismo pago recurrente;
 *   2. misma contraparte identificada (contactoId/proveedorId).
 * Devuelve null si no hay historial que diga nada: proponer al azar es peor que no proponer.
 */
function sugerirDesdeHistorial(movimiento, historicos = []) {
  const clave = claveMovimiento(movimiento)

  const puntuados = []
  for (const h of historicos) {
    if (!h.clasificacion) continue
    let señal = null
    if (clave && claveMovimiento(h) === clave) señal = 'misma glosa'
    else if (movimiento.proveedorId && h.proveedorId === movimiento.proveedorId) señal = 'mismo proveedor'
    else if (movimiento.contactoId && h.contactoId === movimiento.contactoId) señal = 'mismo cliente'
    if (señal) puntuados.push({ h, señal })
  }
  if (!puntuados.length) return null

  // La clasificación más usada entre los parecidos gana; a igual uso, la más reciente.
  const porClasificacion = new Map()
  for (const { h, señal } of puntuados) {
    const c = h.clasificacion
    const k = `${c.cuentaId ?? ''}|${c.proveedorId ?? ''}|${c.contactoId ?? ''}|${c.descripcion ?? ''}`
    if (!porClasificacion.has(k)) porClasificacion.set(k, { ...c, veces: 0, señal, ejemplo: h.glosa, fecha: h.fecha })
    const g = porClasificacion.get(k)
    g.veces++
    if (señal === 'misma glosa') g.señal = 'misma glosa'
    if (h.fecha && (!g.fecha || h.fecha > g.fecha)) { g.fecha = h.fecha; g.ejemplo = h.glosa }
  }

  const pesoSeñal = (s) => (s === 'misma glosa' ? 2 : 1)
  const [mejor] = [...porClasificacion.values()]
    .sort((a, b) => pesoSeñal(b.señal) - pesoSeñal(a.señal) || b.veces - a.veces || new Date(b.fecha || 0) - new Date(a.fecha || 0))

  return {
    descripcion: mejor.descripcion || null,
    cuentaId: mejor.cuentaId ?? null,
    cuenta: mejor.cuenta ?? null,
    proveedorId: mejor.proveedorId ?? null,
    contactoId: mejor.contactoId ?? null,
    veces: mejor.veces,
    motivo: `${mejor.señal}: se clasificó así ${mejor.veces} vez${mejor.veces > 1 ? 'es' : ''} antes`,
    ejemplo: mejor.ejemplo,
  }
}

module.exports = { sugerirDesdeHistorial, claveMovimiento }
