// Reglas de la reserva de la sala de reuniones (página pública /sala).
// Lógica pura, sin BD, para poder fijarla con tests: el endpoint es público
// (sin login) así que la validación del servidor es la única barrera real.

const HORA_APERTURA = '08:00'
const HORA_CIERRE = '19:00'

const RE_FECHA = /^\d{4}-\d{2}-\d{2}$/
// Horas en pasos de 30 minutos (08:00, 08:30, …); evita reservas de 7 minutos
// o con segundos que después no calzan con la grilla de la página.
const RE_HORA = /^([01]\d|2[0-3]):(00|30)$/

/**
 * Valida los datos de una reserva nueva. Devuelve un string con el error
 * (para mostrarlo tal cual al usuario) o null si está todo bien.
 */
function validarReserva({ fecha, inicio, fin, nombre } = {}) {
  if (!RE_FECHA.test(fecha || '')) return 'Fecha inválida.'
  const [a, m, d] = fecha.split('-').map(Number)
  const f = new Date(Date.UTC(a, m - 1, d))
  if (f.getUTCMonth() !== m - 1 || f.getUTCDate() !== d) return 'Fecha inválida.'

  if (!RE_HORA.test(inicio || '')) return 'Hora de inicio inválida (pasos de 30 minutos).'
  if (!RE_HORA.test(fin || '')) return 'Hora de término inválida (pasos de 30 minutos).'
  // Las horas HH:MM se comparan bien como strings
  if (inicio >= fin) return 'La hora de término debe ser después del inicio.'
  if (inicio < HORA_APERTURA || fin > HORA_CIERRE) {
    return `La sala se reserva entre las ${HORA_APERTURA} y las ${HORA_CIERRE}.`
  }

  const nom = (nombre || '').trim()
  if (!nom) return 'Falta tu nombre.'
  if (nom.length > 60) return 'El nombre es demasiado largo (máximo 60 caracteres).'

  return null
}

/** true si [inicioA, finA) y [inicioB, finB) se topan (strings HH:MM). */
function seSolapan(a, b) {
  return a.inicio < b.fin && a.fin > b.inicio
}

module.exports = { validarReserva, seSolapan, HORA_APERTURA, HORA_CIERRE }
