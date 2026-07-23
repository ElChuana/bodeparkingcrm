// Script one-off: extrae estadísticas agregadas para la infografía.
// Solo lectura. No modifica nada.
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { PrismaClient } = require('@prisma/client');
// Producción vive en Railway; el DATABASE_URL local apunta a localhost.
const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL_RAILWAY } },
});

async function main() {
  const out = {};

  // ─── UNIDADES ───────────────────────────────────────────
  const unidadesPorTipoEstado = await prisma.unidad.groupBy({
    by: ['tipo', 'estado'],
    _count: { _all: true },
  });
  out.unidadesPorTipoEstado = unidadesPorTipoEstado.map(u => ({
    tipo: u.tipo, estado: u.estado, n: u._count._all,
  }));
  out.totalUnidades = await prisma.unidad.count();

  // ─── EDIFICIOS por comuna ───────────────────────────────
  const edificios = await prisma.edificio.findMany({
    where: { activo: true },
    select: { comuna: true, region: true, _count: { select: { unidades: true } } },
  });
  out.totalEdificios = edificios.length;
  const porComuna = {};
  for (const e of edificios) {
    porComuna[e.comuna] = (porComuna[e.comuna] || 0) + e._count.unidades;
  }
  out.unidadesPorComuna = porComuna;

  // ─── CONTACTOS / LEADS ──────────────────────────────────
  out.totalContactos = await prisma.contacto.count();
  out.totalLeads = await prisma.lead.count();

  const leadsPorEtapa = await prisma.lead.groupBy({
    by: ['etapa'], _count: { _all: true },
  });
  out.leadsPorEtapa = leadsPorEtapa.map(l => ({ etapa: l.etapa, n: l._count._all }));

  const leadsPorOrigen = await prisma.contacto.groupBy({
    by: ['origen'], _count: { _all: true },
  });
  out.leadsPorOrigen = leadsPorOrigen.map(l => ({ origen: l.origen, n: l._count._all }));

  // ─── VENTAS ─────────────────────────────────────────────
  out.totalVentas = await prisma.venta.count();
  const ventasPorEstado = await prisma.venta.groupBy({
    by: ['estado'], _count: { _all: true }, _sum: { precioFinalUF: true },
  });
  out.ventasPorEstado = ventasPorEstado.map(v => ({
    estado: v.estado, n: v._count._all, sumaUF: Number(v._sum.precioFinalUF || 0),
  }));

  const aggVenta = await prisma.venta.aggregate({
    where: { estado: { not: 'ANULADO' } },
    _sum: { precioFinalUF: true },
    _avg: { precioFinalUF: true },
  });
  out.ufTransadasTotal = Number(aggVenta._sum.precioFinalUF || 0);
  out.ticketPromedioVentaUF = Number(aggVenta._avg.precioFinalUF || 0);

  // ─── ARRIENDOS ──────────────────────────────────────────
  out.arriendosActivos = await prisma.arriendo.count({ where: { estado: 'ACTIVO' } });
  const aggArr = await prisma.arriendo.aggregate({
    where: { estado: 'ACTIVO' },
    _sum: { montoMensualUF: true }, _avg: { montoMensualUF: true },
  });
  out.arriendoMensualTotalUF = Number(aggArr._sum.montoMensualUF || 0);
  out.arriendoPromedioUF = Number(aggArr._avg.montoMensualUF || 0);

  // ─── UF vigente ─────────────────────────────────────────
  const uf = await prisma.uFDiaria.findFirst({ orderBy: { fecha: 'desc' } });
  out.ufVigente = uf ? Number(uf.valorPesos) : null;

  // ─── EQUIPO ─────────────────────────────────────────────
  out.usuariosActivos = await prisma.usuario.count({ where: { activo: true } });

  console.log(JSON.stringify(out, null, 2));
}

main().finally(() => prisma.$disconnect());
