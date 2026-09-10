// Datos de la venta que se adjuntan a la unidad para que el inventario pueda
// mostrar el avance real (reserva → promesa → escritura → entrega) y quién compró.
// La unidad solo guarda DISPONIBLE/RESERVADO/VENDIDO/ARRENDADO; el estado
// comercial fino se deriva de la venta en el frontend (components/ui.jsx).
const INCLUDE_VENTA = {
  select: {
    id: true, estado: true, leadId: true,
    fechaReserva: true, fechaPromesa: true, fechaEscritura: true, fechaEntrega: true,
    precioFinalUF: true,
    comprador: { select: { id: true, nombre: true, apellido: true, email: true, telefono: true, rut: true, empresa: true } },
    vendedor:  { select: { id: true, nombre: true, apellido: true } },
  }
}

// El precio pactado y los datos de contacto del comprador son sensibles: fuera
// de gerencia/JV solo se muestra el nombre y en qué etapa va la venta.
const podarVenta = (venta) => {
  if (!venta) return venta
  const { precioFinalUF, comprador, ...resto } = venta
  return {
    ...resto,
    comprador: comprador ? { id: comprador.id, nombre: comprador.nombre, apellido: comprador.apellido } : null,
  }
}

module.exports = { INCLUDE_VENTA, podarVenta }
