// Crea el edificio Vicuña Mackenna 1796 (Metro Ñuble, Ñuñoa) y sus 3 estacionamientos.
// Idempotente: no duplica si ya existen. Ejecutar con DATABASE_URL apuntando a Railway.
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // 1) Edificio (buscar por dirección para no duplicar)
  let edificio = await prisma.edificio.findFirst({
    where: { direccion: 'Av. Vicuña Mackenna 1796' },
  });
  if (!edificio) {
    edificio = await prisma.edificio.create({
      data: {
        nombre: 'Vicuña Mackenna 1796',
        direccion: 'Av. Vicuña Mackenna 1796',
        region: 'Metropolitana',
        comuna: 'Ñuñoa',
        inmobiliaria: 'Ingevec',
        descripcion: 'Metro Ñuble (L5 + L6). Edificio Ingevec.',
      },
    });
    console.log(`Edificio creado: id=${edificio.id} ${edificio.nombre}`);
  } else {
    console.log(`Edificio ya existe: id=${edificio.id} ${edificio.nombre}`);
  }

  // 2) Unidades
  const unidades = [
    { numero: '36', piso: '-1', m2: 12.5, precioUF: 350, precioCostoUF: 225,   notas: 'Reemplaza al N°5 (mismo precio de compra).' },
    { numero: '31', piso: '-1', m2: 12.5, precioUF: 350, precioCostoUF: 208.5, notas: 'Primer subterráneo.' },
    { numero: '71', piso: '-2', m2: 12.5, precioUF: 350, precioCostoUF: 208.5, notas: 'Segundo subterráneo.' },
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
