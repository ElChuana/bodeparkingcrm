const { Prisma } = require('@prisma/client')

// Convierte recursivamente los Prisma.Decimal a Number antes de serializar la
// respuesta JSON. Así el frontend sigue recibiendo números (como cuando los
// montos eran Float) y no hay que tocar la UI tras migrar a Decimal.
function convertir(valor) {
  if (valor === null || valor === undefined) return valor
  if (valor instanceof Prisma.Decimal) return valor.toNumber()
  if (Array.isArray(valor)) {
    for (let i = 0; i < valor.length; i++) valor[i] = convertir(valor[i])
    return valor
  }
  if (typeof valor === 'object') {
    // No tocar Date, Buffer, etc.
    if (valor instanceof Date || Buffer.isBuffer(valor)) return valor
    for (const k of Object.keys(valor)) valor[k] = convertir(valor[k])
    return valor
  }
  return valor
}

function decimalSerializer(req, res, next) {
  const jsonOriginal = res.json.bind(res)
  res.json = (body) => jsonOriginal(convertir(body))
  next()
}

module.exports = decimalSerializer
