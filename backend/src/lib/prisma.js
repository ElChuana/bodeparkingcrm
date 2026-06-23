const { PrismaClient, Prisma } = require('@prisma/client')

// Convierte recursivamente los Prisma.Decimal a Number en los resultados de
// lectura. Los montos se guardan como Decimal (exactos en BD) pero el resto del
// backend y el frontend trabajan con números, como antes de migrar a Decimal.
// Sin esto, sumas tipo `0 + decimal` concatenan (valueOf devuelve string).
function decimalToNumber(v) {
  if (v === null || v === undefined) return v
  if (v instanceof Prisma.Decimal) return v.toNumber()
  if (Array.isArray(v)) {
    for (let i = 0; i < v.length; i++) v[i] = decimalToNumber(v[i])
    return v
  }
  if (typeof v === 'object') {
    if (v instanceof Date || Buffer.isBuffer(v)) return v
    for (const k of Object.keys(v)) v[k] = decimalToNumber(v[k])
    return v
  }
  return v
}

const prisma = new PrismaClient().$extends({
  query: {
    async $allOperations({ args, query }) {
      return decimalToNumber(await query(args))
    }
  }
})

module.exports = prisma
