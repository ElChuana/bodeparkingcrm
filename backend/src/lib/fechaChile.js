// Utilidades de zona horaria de Chile (America/Santiago), con horario de verano.

// Offset de America/Santiago (en minutos) para una fecha UTC dada.
function offsetSantiagoMin(utcDate) {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Santiago', hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
  const p = dtf.formatToParts(utcDate).reduce((a, x) => (a[x.type] = x.value, a), {})
  const asUTC = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second)
  return (asUTC - utcDate.getTime()) / 60000
}

// Interpreta componentes de hora LOCAL de Chile → Date (UTC correcto, con DST)
function desdeHoraChile(y, mo, d, h, mi) {
  const guess = Date.UTC(y, mo - 1, d, h, mi)
  const off = offsetSantiagoMin(new Date(guess))
  return new Date(guess - off * 60000)
}

module.exports = { offsetSantiagoMin, desdeHoraChile }
