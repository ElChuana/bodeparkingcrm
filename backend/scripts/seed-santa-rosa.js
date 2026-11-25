// Crea el edificio Santa Rosa 250 (Santiago Centro, Ingevec) y sus 3 estacionamientos (54, 66, 67).
// Fuente: correo de Carlos Pérez Cañizalez (Ingevec) del 10-sep-2026 — lista UF 341,65, contado UF 250. Precio de compra final negociado: UF 210.
// Idempotente: no duplica si ya existen. Ejecutar con DATABASE_URL apuntando a Railway.
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // 1) Edificio (buscar por dirección para no duplicar)
  let edificio = await prisma.edificio.findFirst({
    where: { direccion: 'Av. Santa Rosa 250' },
  });
  if (!edificio) {
    edificio = await prisma.edificio.create({
      data: {
        nombre: 'Santa Rosa 250',
        direccion: 'Av. Santa Rosa 250',
        region: 'Metropolitana',
        comuna: 'Santiago',
        inmobiliaria: 'Ingevec',
        contactoInmobiliaria: 'Carlos Pérez Cañizalez — cperezc@ingevec.cl — +56226743800',
        descripcion: 'Santiago Centro, cerca del futuro Mercado Urbano Santa Rosa. Edificio Ingevec.',
      },
    });
    console.log(`Edificio creado: id=${edificio.id} ${edificio.nombre}`);
  } else {
    console.log(`Edificio ya existe: id=${edificio.id} ${edificio.nombre}`);
  }

  // 2) Unidades — costo = precio de compra (UF 210); venta = UF 350 (definidos por Juan)
  const unidades = [
    { numero: '54', piso: '-2', m2: 12.5, precioUF: 350, precioCostoUF: 210, notas: 'Segundo subterráneo.' },
    { numero: '66', piso: '-3', m2: 12.5, precioUF: 350, precioCostoUF: 210, notas: 'Tercer subterráneo.' },
    { numero: '67', piso: '-3', m2: 12.5, precioUF: 350, precioCostoUF: 210, notas: 'Tercer subterráneo.' },
  ];

  for (const u of unidades) {
    const existe = await prisma.unidad.findFirst({
      where: { edificioId: edificio.id, numero: u.numero, tipo: 'ESTACIONAMIENTO' },
    });
    if (existe) {
      console.log(`  Unidad ${u.numero} ya existe (id=${existe.id}), omitida.`);
      continue;
    }
    const creada = await prisma.unidad.create({
      data: {
        edificioId: edificio.id,
        tipo: 'ESTACIONAMIENTO',
        subtipo: 'NORMAL',
        numero: u.numero,
        piso: u.piso,
        m2: u.m2,
        acceso: 'SUBTERRANEO',
        precioUF: u.precioUF,
        precioCostoUF: u.precioCostoUF,
        estado: 'DISPONIBLE',
        notas: u.notas,
      },
    });
    console.log(`  Unidad creada: id=${creada.id} N°${creada.numero} · ${creada.precioUF} UF`);
  }
}

main()
  .then(() => console.log('Listo.'))
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
