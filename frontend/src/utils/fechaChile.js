// Helpers para mostrar fechas/horas SIEMPRE en hora de Chile (America/Santiago),
// sin depender de la zona horaria del navegador. Usar en visitas/reuniones.
const TZ = 'America/Santiago'

// "HH:mm" en hora de Chile
export function horaChile(fecha) {
  return new Date(fecha).toLocaleTimeString('es-CL', {
    hour: '2-digit', minute: '2-digit', hour12: false, timeZone: TZ,
  })
}

// "YYYY-MM-DD" del día en Chile (para agrupar en el calendario)
export function diaChile(fecha) {
  // en-CA produce el formato YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric', month: '2-digit', day: '2-digit', timeZone: TZ,
  }).format(new Date(fecha))
}

// "d MMM yyyy · HH:mm" legible, en hora de Chile
export function fechaHoraChile(fecha) {
  return new Date(fecha).toLocaleString('es-CL', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false, timeZone: TZ,
  })
}

export function esHoyChile(fecha) {
  return diaChile(fecha) === diaChile(new Date())
}
