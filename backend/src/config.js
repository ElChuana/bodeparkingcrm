// Configuración compartida del backend

// Vendedor fallback para leads/reuniones que llegan sin vendedor asignado
// (Felix Betancourtt, JEFE_VENTAS). Sobreescribible por entorno.
const VENDEDOR_FALLBACK_ID = Number(process.env.VENDEDOR_FALLBACK_ID || 8)

module.exports = { VENDEDOR_FALLBACK_ID }
