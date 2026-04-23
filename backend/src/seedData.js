require('dotenv').config()
const bcrypt = require('bcryptjs')
const prisma = require('./lib/prisma')

async function main() {
  console.log('🌱 Creando datos de prueba...')

  // ─── USUARIOS ─────────────────────────────────────────────────
  const hash = await bcrypt.hash('admin1234', 10)

  const [gerente, jefeVentas, vendedor1, vendedor2, broker, abogado] = await Promise.all([
    prisma.usuario.upsert({ where: { email: 'gerente@bodeparking.cl' }, update: {}, create: { nombre: 'Carlos', apellido: 'Mendoza', email: 'gerente@bodeparking.cl', password: hash, rol: 'GERENTE', telefono: '+56912345678', activo: true } }),
    prisma.usuario.upsert({ where: { email: 'jefe@bodeparking.cl' }, update: {}, create: { nombre: 'Ana', apellido: 'Rodríguez', email: 'jefe@bodeparking.cl', password: hash, rol: 'JEFE_VENTAS', telefono: '+56923456789', comisionPorcentaje: 1, activo: true } }),
    prisma.usuario.upsert({ where: { email: 'vendedor1@bodeparking.cl' }, update: {}, create: { nombre: 'Pedro', apellido: 'González', email: 'vendedor1@bodeparking.cl', password: hash, rol: 'VENDEDOR', telefono: '+56934567890', comisionPorcentaje: 4, activo: true } }),
    prisma.usuario.upsert({ where: { email: 'vendedor2@bodeparking.cl' }, update: {}, create: { nombre: 'María', apellido: 'López', email: 'vendedor2@bodeparking.cl', password: hash, rol: 'VENDEDOR', telefono: '+56945678901', comisionPorcentaje: 4, activo: true } }),
    prisma.usuario.upsert({ where: { email: 'broker@inmobiliaria.cl' }, update: {}, create: { nombre: 'Roberto', apellido: 'Vargas', email: 'broker@inmobiliaria.cl', password: hash, rol: 'BROKER_EXTERNO', telefono: '+56956789012', comisionPorcentaje: 8, activo: true } }),
    prisma.usuario.upsert({ where: { email: 'abogado@bodeparking.cl' }, update: {}, create: { nombre: 'Claudia', apellido: 'Torres', email: 'abogado@bodeparking.cl', password: hash, rol: 'ABOGADO', telefono: '+56967890123', activo: true } }),
  ])
  console.log('✅ Usuarios creados (contraseña: admin1234)')

  // ─── EDIFICIOS ────────────────────────────────────────────────
  const [edif1, edif2, edif3] = await Promise.all([
    prisma.edificio.create({ data: { nombre: 'Torre Bodegas Las Condes', direccion: 'Av. Apoquindo 4800', region: 'Región Metropolitana', comuna: 'Las Condes', inmobiliaria: 'Inmobiliaria Andes SpA', contactoInmobiliaria: 'Felipe Ruiz — +56922334455' } }),
    prisma.edificio.create({ data: { nombre: 'Centro Logístico Pudahuel', direccion: 'Av. El Colorado 1200', region: 'Región Metropolitana', comuna: 'Pudahuel', inmobiliaria: 'Desarrollos Sur Ltda.', contactoInmobiliaria: 'Javiera Pinto — +56933445566' } }),
    prisma.edificio.create({ data: { nombre: 'Parque Industrial Viña', direccion: 'Av. Libertad 3400', region: 'Región de Valparaíso', comuna: 'Viña del Mar', inmobiliaria: 'Costa Inversiones S.A.', contactoInmobiliaria: 'Marcelo Díaz — +56944556677' } }),
  ])
  console.log('✅ Edificios creados')

  // ─── UNIDADES ─────────────────────────────────────────────────
  const unidades = []

  // Edificio 1 — bodegas y estacionamientos
  for (let i = 1; i <= 8; i++) {
    unidades.push(await prisma.unidad.create({ data: {
      edificioId: edif1.id, tipo: 'BODEGA', numero: `B-${String(i).padStart(3,'0')}`,
      piso: String(Math.ceil(i/2)), m2: [12,15,18,20,25,30,12,15][i-1],
      precioUF: [450,520,580,620,750,890,450,520][i-1],
      precioMinimoUF: [400,470,530,570,700,840,400,470][i-1],
      precioCostoUF: [320,370,410,450,550,680,320,370][i-1],
      estado: i <= 3 ? 'DISPONIBLE' : i <= 5 ? 'RESERVADO' : i <= 7 ? 'VENDIDO' : 'ARRENDADO'
    }}))
  }
  for (let i = 1; i <= 4; i++) {
    unidades.push(await prisma.unidad.create({ data: {
      edificioId: edif1.id, tipo: 'ESTACIONAMIENTO',
      subtipo: i === 3 ? 'TANDEM' : 'NORMAL',
      numero: `E-${String(i).padStart(3,'0')}`,
      piso: 'Subterráneo -1', techado: true, acceso: 'SUBTERRANEO',
      precioUF: [280,280,350,280][i-1],
      precioMinimoUF: [250,250,310,250][i-1],
      precioCostoUF: [200,200,250,200][i-1],
      estado: i <= 2 ? 'DISPONIBLE' : 'VENDIDO'
    }}))
  }

  // Edificio 2
  for (let i = 1; i <= 6; i++) {
    unidades.push(await prisma.unidad.create({ data: {
      edificioId: edif2.id, tipo: 'BODEGA', numero: `B-${String(i).padStart(3,'0')}`,
      piso: String(i <= 3 ? 1 : 2), m2: [40,45,50,40,45,60][i-1],
      precioUF: [980,1100,1250,980,1100,1400][i-1],
      precioMinimoUF: [900,1000,1150,900,1000,1300][i-1],
      precioCostoUF: [700,800,900,700,800,1050][i-1],
      estado: i <= 4 ? 'DISPONIBLE' : 'RESERVADO'
    }}))
  }

  // Edificio 3
  for (let i = 1; i <= 5; i++) {
    unidades.push(await prisma.unidad.create({ data: {
      edificioId: edif3.id, tipo: 'BODEGA', numero: `B-${String(i).padStart(3,'0')}`,
      piso: '1', m2: [25,30,35,25,30][i-1],
      precioUF: [620,750,880,620,750][i-1],
      precioMinimoUF: [570,700,820,570,700][i-1],
      precioCostoUF: [450,560,660,450,560][i-1],
      estado: i <= 3 ? 'DISPONIBLE' : i === 4 ? 'ARRENDADO' : 'VENDIDO'
    }}))
  }
  console.log(`✅ ${unidades.length} unidades creadas`)

  // ─── LLAVES ───────────────────────────────────────────────────
  for (const u of unidades.slice(0, 10)) {
    await prisma.llave.createMany({ data: [
      { unidadId: u.id, codigo: `${u.numero}-A`, estado: 'EN_OFICINA' },
      { unidadId: u.id, codigo: `${u.numero}-B`, estado: 'EN_OFICINA' },
    ]})
  }
  // Una llave prestada
  const llavesPrestadas = await prisma.llave.findFirst({ where: { unidadId: unidades[0].id } })
  await prisma.llave.update({ where: { id: llavesPrestadas.id }, data: { estado: 'PRESTADA' } })
  await prisma.movimientoLlave.create({ data: {
    llaveId: llavesPrestadas.id, responsableId: vendedor1.id,
    tipo: 'prestamo', personaNombre: 'Roberto Vargas (broker)',
    personaContacto: '+56956789012', motivo: 'Visita cliente',
    fechaPrestamo: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
    fechaDevolucionEsperada: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
  }})
  console.log('✅ Llaves creadas')

  // ─── CONTACTOS ────────────────────────────────────────────────
  const contactosData = [
    { nombre: 'Juan', apellido: 'Pérez', rut: '12.345.678-9', email: 'juan.perez@gmail.com', telefono: '+56912340001', origen: 'INSTAGRAM', tipoPersona: 'NATURAL' },
    { nombre: 'Sofía', apellido: 'Muñoz', rut: '13.456.789-0', email: 'sofia.munoz@empresa.cl', telefono: '+56912340002', origen: 'GOOGLE', tipoPersona: 'NATURAL' },
    { nombre: 'Inversiones', apellido: 'Del Norte SpA', rut: '76.543.210-1', email: 'contacto@inversiones.cl', telefono: '+56912340003', origen: 'BROKER', tipoPersona: 'EMPRESA', empresa: 'Inversiones Del Norte SpA' },
    { nombre: 'Diego', apellido: 'Castro', rut: '15.678.901-2', email: 'diego.castro@hotmail.com', telefono: '+56912340004', origen: 'REFERIDO', tipoPersona: 'NATURAL' },
    { nombre: 'Valentina', apellido: 'Soto', rut: '16.789.012-3', email: 'vsoto@gmail.com', telefono: '+56912340005', origen: 'INSTAGRAM', tipoPersona: 'NATURAL' },
    { nombre: 'Rodrigo', apellido: 'Fuentes', rut: '17.890.123-4', email: 'rfuentes@empresa.cl', telefono: '+56912340006', origen: 'GOOGLE', tipoPersona: 'NATURAL' },
    { nombre: 'Constructora', apellido: 'Pacífico Ltda.', rut: '77.654.321-2', email: 'admin@constructorapac.cl', telefono: '+56912340007', origen: 'BROKER', tipoPersona: 'EMPRESA', empresa: 'Constructora Pacífico Ltda.' },
    { nombre: 'Camila', apellido: 'Herrera', rut: '18.901.234-5', email: 'camila.h@gmail.com', telefono: '+56912340008', origen: 'INSTAGRAM', tipoPersona: 'NATURAL' },
    { nombre: 'Felipe', apellido: 'Araya', rut: '19.012.345-6', email: 'faraya@outlook.com', telefono: '+56912340009', origen: 'WEB', tipoPersona: 'NATURAL' },
    { nombre: 'Logística', apellido: 'Central S.A.', rut: '78.765.432-3', email: 'logistica@central.cl', telefono: '+56912340010', origen: 'REFERIDO', tipoPersona: 'EMPRESA', empresa: 'Logística Central S.A.' },
    { nombre: 'Matías', apellido: 'Reyes', rut: '20.123.456-7', email: 'mreyes@gmail.com', telefono: '+56912340011', origen: 'INSTAGRAM', tipoPersona: 'NATURAL' },
    { nombre: 'Isidora', apellido: 'Vega', rut: '21.234.567-8', email: 'ivega@empresa.cl', telefono: '+56912340012', origen: 'GOOGLE', tipoPersona: 'NATURAL' },
  ]
  const contactos = await Promise.all(contactosData.map(c => prisma.contacto.create({ data: c })))
  console.log(`✅ ${contactos.length} contactos creados`)

  // ─── LEADS ────────────────────────────────────────────────────
  const leadsData = [
    { contactoId: contactos[0].id, vendedorId: vendedor1.id, etapa: 'NUEVO', unidadInteresId: unidades[0].id },
    { contactoId: contactos[1].id, vendedorId: vendedor1.id, etapa: 'COTIZACION_ENVIADA', unidadInteresId: unidades[1].id },
    { contactoId: contactos[2].id, vendedorId: vendedor1.id, brokerId: broker.id, etapa: 'VISITA_REALIZADA', unidadInteresId: unidades[2].id },
    { contactoId: contactos[3].id, vendedorId: vendedor2.id, etapa: 'NO_CONTESTA' },
    { contactoId: contactos[4].id, vendedorId: vendedor2.id, etapa: 'SEGUIMIENTO', unidadInteresId: unidades[6].id },
    { contactoId: contactos[5].id, vendedorId: vendedor1.id, etapa: 'NEGOCIACION', unidadInteresId: unidades[7].id },
    { contactoId: contactos[6].id, vendedorId: vendedor2.id, brokerId: broker.id, etapa: 'VISITA_AGENDADA', unidadInteresId: unidades[12].id },
    { contactoId: contactos[7].id, vendedorId: vendedor1.id, etapa: 'SEGUIMIENTO_POST_VISITA', unidadInteresId: unidades[13].id },
    { contactoId: contactos[8].id, vendedorId: vendedor2.id, etapa: 'COTIZACION_ENVIADA', unidadInteresId: unidades[14].id },
    { contactoId: contactos[9].id, vendedorId: vendedor1.id, etapa: 'PERDIDO', motivoPerdida: 'Encontró bodega más barata en otro edificio' },
    { contactoId: contactos[10].id, vendedorId: vendedor2.id, etapa: 'NUEVO' },
    { contactoId: contactos[11].id, vendedorId: vendedor1.id, etapa: 'SEGUIMIENTO' },
  ]
  const leads = await Promise.all(leadsData.map(l => prisma.lead.create({ data: l })))

  // Interacciones para algunos leads
  await prisma.interaccion.createMany({ data: [
    { leadId: leads[0].id, usuarioId: vendedor1.id, tipo: 'LLAMADA', descripcion: 'Primer contacto. Cliente interesado en bodega de 15m². Quiere cotización.', fecha: new Date(Date.now() - 3*24*3600*1000) },
    { leadId: leads[1].id, usuarioId: vendedor1.id, tipo: 'EMAIL', descripcion: 'Se envió cotización con precios de bodega B-002. Espera respuesta.', fecha: new Date(Date.now() - 2*24*3600*1000) },
    { leadId: leads[1].id, usuarioId: vendedor1.id, tipo: 'WHATSAPP', descripcion: 'Cliente consultó si hay descuento por pago al contado.', fecha: new Date(Date.now() - 1*24*3600*1000) },
    { leadId: leads[2].id, usuarioId: vendedor1.id, tipo: 'REUNION', descripcion: 'Visita realizada. Cliente muy interesado, pidió tiempo para hablar con socio.', fecha: new Date(Date.now() - 5*24*3600*1000) },
    { leadId: leads[5].id, usuarioId: vendedor1.id, tipo: 'LLAMADA', descripcion: 'Negociando precio. Cliente ofrece 580 UF al contado.', fecha: new Date(Date.now() - 1*24*3600*1000) },
  ]})

  // Visitas
  await prisma.visita.create({ data: {
    leadId: leads[2].id, vendedorId: vendedor1.id,
    fechaHora: new Date(Date.now() - 5*24*3600*1000),
    tipo: 'presencial', resultado: 'positivo',
    notas: 'Cliente llegó con su socio. Les gustó mucho la ubicación y el acceso.'
  }})
  await prisma.visita.create({ data: {
    leadId: leads[6].id, vendedorId: vendedor2.id,
    fechaHora: new Date(Date.now() + 2*24*3600*1000),
    tipo: 'presencial', notas: 'Visita agendada para ver bodega B-001 en Pudahuel'
  }})

  console.log(`✅ ${leads.length} leads creados con interacciones`)

  // ─── VENTAS ───────────────────────────────────────────────────
  // Venta 1: en proceso de promesa
  const venta1 = await prisma.venta.create({ data: {
    leadId: leads[3].id, // reutilizamos el lead perdido para no conflicto
    unidadId: unidades[5].id, // B-006 VENDIDO
    compradorId: contactos[3].id,
    vendedorId: vendedor1.id, gerenteId: gerente.id,
    precioUF: 580, descuentoUF: 10, estado: 'PROMESA',
    fechaReserva: new Date(Date.now() - 30*24*3600*1000),
    fechaPromesa: new Date(Date.now() - 15*24*3600*1000),
  }})

  // Venta 2: en escritura con broker
  const venta2 = await prisma.venta.create({ data: {
    leadId: leads[9].id,
    unidadId: unidades[6].id, // B-007 VENDIDO
    compradorId: contactos[9].id,
    vendedorId: vendedor2.id, brokerId: broker.id, gerenteId: gerente.id,
    precioUF: 1100, descuentoUF: 0, estado: 'ESCRITURA',
    fechaReserva: new Date(Date.now() - 60*24*3600*1000),
    fechaPromesa: new Date(Date.now() - 40*24*3600*1000),
    fechaEscritura: new Date(Date.now() - 5*24*3600*1000),
  }})

  // Venta 3: entregada (histórica)
  const venta3 = await prisma.venta.create({ data: {
    leadId: leads[10].id,
    unidadId: unidades[17].id, // Viña VENDIDO
    compradorId: contactos[10].id,
    vendedorId: vendedor1.id, gerenteId: gerente.id,
    precioUF: 750, descuentoUF: 0, estado: 'ENTREGADO',
    fechaReserva: new Date(Date.now() - 120*24*3600*1000),
    fechaPromesa: new Date(Date.now() - 100*24*3600*1000),
    fechaEscritura: new Date(Date.now() - 60*24*3600*1000),
    fechaEntrega: new Date(Date.now() - 30*24*3600*1000),
  }})

  // Procesos legales
  await prisma.procesoLegal.createMany({ data: [
    { ventaId: venta1.id, tienePromesa: true, estadoActual: 'FIRMA_INMOBILIARIA_PROMESA' },
    { ventaId: venta2.id, tienePromesa: true, estadoActual: 'FIRMADA_NOTARIA' },
    { ventaId: venta3.id, tienePromesa: true, estadoActual: 'ENTREGADO' },
  ]})

  // Planes de pago
  const plan1 = await prisma.planPago.create({ data: {
    ventaId: venta1.id, totalCuotas: 3, montoUF: 570,
    fechaInicio: new Date(Date.now() - 30*24*3600*1000),
    cuotas: { create: [
      { numeroCuota: 1, tipo: 'RESERVA', montoCLP: 200000, fechaVencimiento: new Date(Date.now() - 30*24*3600*1000), estado: 'PAGADO', metodoPago: 'TRANSFERENCIA', fechaPagoReal: new Date(Date.now() - 30*24*3600*1000) },
      { numeroCuota: 2, tipo: 'PIE', montoUF: 114, fechaVencimiento: new Date(Date.now() - 10*24*3600*1000), estado: 'PAGADO', metodoPago: 'TRANSFERENCIA', fechaPagoReal: new Date(Date.now() - 10*24*3600*1000) },
      { numeroCuota: 3, tipo: 'ESCRITURA', montoUF: 456, fechaVencimiento: new Date(Date.now() + 20*24*3600*1000), estado: 'PENDIENTE' },
    ]}
  }})

  const plan2 = await prisma.planPago.create({ data: {
    ventaId: venta2.id, totalCuotas: 3, montoUF: 1100,
    fechaInicio: new Date(Date.now() - 60*24*3600*1000),
    cuotas: { create: [
      { numeroCuota: 1, tipo: 'RESERVA', montoCLP: 200000, fechaVencimiento: new Date(Date.now() - 60*24*3600*1000), estado: 'PAGADO', metodoPago: 'TRANSFERENCIA', fechaPagoReal: new Date(Date.now() - 60*24*3600*1000) },
      { numeroCuota: 2, tipo: 'PIE', montoUF: 220, fechaVencimiento: new Date(Date.now() - 20*24*3600*1000), estado: 'ATRASADO' },
      { numeroCuota: 3, tipo: 'ESCRITURA', montoUF: 880, fechaVencimiento: new Date(Date.now() + 10*24*3600*1000), estado: 'PENDIENTE' },
    ]}
  }})

  // Comisiones
  await prisma.comision.createMany({ data: [
    { ventaId: venta1.id, usuarioId: vendedor1.id, porcentaje: 4, montoCalculadoUF: 23.2, montoPrimera: 11.6, montoSegunda: 11.6, estadoPrimera: 'PAGADO', fechaPagoPrimera: new Date(Date.now() - 15*24*3600*1000) },
    { ventaId: venta1.id, usuarioId: jefeVentas.id, porcentaje: 1, montoCalculadoUF: 5.8, montoPrimera: 2.9, montoSegunda: 2.9, estadoPrimera: 'PAGADO', fechaPagoPrimera: new Date(Date.now() - 15*24*3600*1000) },
    { ventaId: venta2.id, usuarioId: vendedor2.id, porcentaje: 4, montoCalculadoUF: 44, montoPrimera: 22, montoSegunda: 22, estadoPrimera: 'PAGADO', fechaPagoPrimera: new Date(Date.now() - 40*24*3600*1000) },
    { ventaId: venta2.id, usuarioId: broker.id, porcentaje: 8, montoCalculadoUF: 88, montoPrimera: 44, montoSegunda: 44, estadoPrimera: 'PAGADO', fechaPagoPrimera: new Date(Date.now() - 40*24*3600*1000) },
    { ventaId: venta2.id, usuarioId: jefeVentas.id, porcentaje: 1, montoCalculadoUF: 11, montoPrimera: 5.5, montoSegunda: 5.5, estadoPrimera: 'PAGADO', fechaPagoPrimera: new Date(Date.now() - 40*24*3600*1000) },
  ]})
  console.log('✅ Ventas, planes de pago y comisiones creados')

  // ─── ARRIENDOS ────────────────────────────────────────────────
  const arriendos = await prisma.arriendo.createMany({ data: [
    { unidadId: unidades[7].id, contactoId: contactos[7].id, gestorNombre: 'Administradora ProBodegas', montoMensualUF: 3.5, fechaInicio: new Date(Date.now() - 90*24*3600*1000), estado: 'ACTIVO' },
    { unidadId: unidades[15].id, contactoId: contactos[5].id, gestorNombre: 'Autogestión', montoMensualUF: 5.2, fechaInicio: new Date(Date.now() - 60*24*3600*1000), estado: 'ACTIVO' },
  ]})
  console.log('✅ Arriendos creados')

  // ─── PROMOCIONES ──────────────────────────────────────────────
  await prisma.promocion.createMany({ data: [
    { nombre: '6 cuotas sin interés', descripcion: 'Paga tu pie en 6 cuotas sin interés', tipo: 'CUOTAS_SIN_INTERES', cuotasSinInteres: 6, fechaFin: new Date(Date.now() + 60*24*3600*1000), activa: true },
    { nombre: 'Arriendo asegurado 3 meses', descripcion: 'Te aseguramos 3 meses de arriendo tras la compra', tipo: 'ARRIENDO_ASEGURADO', mesesArriendo: 3, montoMensualUF: 3.5, activa: true },
    { nombre: 'Gastos notariales incluidos', descripcion: 'Cubrimos todos los gastos de escrituración', tipo: 'GASTOS_NOTARIALES', activa: true },
    { nombre: 'Descuento 10 UF pago contado', descripcion: 'Descuento especial por pago al contado', tipo: 'DESCUENTO_UF', valorUF: 10, fechaFin: new Date(Date.now() + 30*24*3600*1000), activa: true },
  ]})
  console.log('✅ Promociones creadas')

  // ─── ALERTAS CONFIG ───────────────────────────────────────────
  const alertas = [
    { tipo: 'LLAVE_NO_DEVUELTA', umbralDias: 3 },
    { tipo: 'CUOTA_VENCIDA', umbralDias: 1 },
    { tipo: 'LEAD_SIN_ACTIVIDAD', umbralDias: 7 },
    { tipo: 'FECHA_LEGAL_PROXIMA', umbralDias: 5 },
    { tipo: 'ARRIENDO_POR_VENCER', umbralDias: 30 },
    { tipo: 'DESCUENTO_PENDIENTE', umbralDias: 1 },
  ]
  for (const a of alertas) {
    await prisma.alertaConfig.upsert({ where: { tipo: a.tipo }, update: {}, create: { ...a, activa: true, canalEmail: true } })
  }

  // ─── REGLAS PIPELINE ──────────────────────────────────────────
  const reglasPipeline = [
    { nombre: 'Nuevo sin contacto', etapaOrigen: 'NUEVO', etapaDestino: 'NO_CONTESTA', umbralDias: 3, activa: false },
    { nombre: 'No contesta → Perdido', etapaOrigen: 'NO_CONTESTA', etapaDestino: 'PERDIDO', umbralDias: 14, activa: false, motivoAuto: 'NO_CONTESTA' },
    { nombre: 'Cotización sin respuesta', etapaOrigen: 'COTIZACION_ENVIADA', etapaDestino: 'INTERESADO', umbralDias: 5, activa: false },
    { nombre: 'Visita sin seguimiento', etapaOrigen: 'VISITA_REALIZADA', etapaDestino: 'SEGUIMIENTO_POST_VISITA', umbralDias: 3, activa: false },
    { nombre: 'Negociación estancada', etapaOrigen: 'NEGOCIACION', etapaDestino: 'PERDIDO', umbralDias: 21, activa: false, motivoAuto: 'PERDIO_INTERES' },
  ]
  for (const r of reglasPipeline) {
    const existe = await prisma.reglaPipeline.findFirst({ where: { etapaOrigen: r.etapaOrigen, etapaDestino: r.etapaDestino } })
    if (!existe) await prisma.reglaPipeline.create({ data: r })
  }
  console.log('✅ Reglas pipeline creadas')

  // ─── UF DEL DÍA ───────────────────────────────────────────────
  const hoy = new Date(); hoy.setHours(0,0,0,0)
  await prisma.uFDiaria.upsert({ where: { fecha: hoy }, update: {}, create: { fecha: hoy, valorPesos: 38450.32 } })
  console.log('✅ UF del día cargada: $38.450,32')

  console.log('\n🎉 Datos de prueba creados exitosamente!')
  console.log('\nUsuarios disponibles (contraseña: admin1234):')
  console.log('  gerente@bodeparking.cl     → Gerente')
  console.log('  jefe@bodeparking.cl        → Jefe de Ventas')
  console.log('  vendedor1@bodeparking.cl   → Vendedor (Pedro González)')
  console.log('  vendedor2@bodeparking.cl   → Vendedor (María López)')
  console.log('  broker@inmobiliaria.cl     → Broker Externo')
  console.log('  abogado@bodeparking.cl     → Abogado')
}

main()
  .catch(e => { console.error('❌ Error:', e.message); process.exit(1) })
  .finally(() => prisma.$disconnect())
