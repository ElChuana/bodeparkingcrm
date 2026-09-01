/**
 * Salud de los datos: los invariantes del ERP, verificados contra la base.
 *
 * Cada regla es algo que "debería ser imposible". Si alguna devuelve filas, hay un camino
 * que la rompió y hay que mirarlo — no es un error del usuario, es un hallazgo. Se muestra
 * en el panel financiero.
 *
 * `gravedad`: 'error' rompe la aritmética de la plata; 'aviso' es información que falta.
 */

const REGLAS = [
  {
    clave: 'imputado_supera_movimiento',
    titulo: 'Movimientos con más plata imputada que su monto',
    gravedad: 'error',
    sql: `select m.id, m.fecha, m.glosa, m.monto, sum(abs(c.monto)) as imputado
          from movimientos_banco m join conciliaciones c on c."movimientoId" = m.id
          group by m.id having sum(abs(c.monto)) > abs(m.monto) + 1`,
  },
  {
    clave: 'imputado_supera_factura_compra',
    titulo: 'Facturas de compra con más pagado que su total',
    gravedad: 'error',
    sql: `select f.id, f.folio, f.total, sum(abs(c.monto)) as imputado
          from facturas_compra f join conciliaciones c on c."facturaCompraId" = f.id
          group by f.id having sum(abs(c.monto)) > f.total + 1`,
  },
  {
    clave: 'imputado_supera_documento',
    titulo: 'Documentos internos con más pagado que su monto en pesos',
    gravedad: 'error',
    sql: `select d.id, d.descripcion, d."montoCLP", sum(abs(c.monto)) as imputado
          from documentos_internos d join conciliaciones c on c."documentoInternoId" = d.id
          where d."montoCLP" is not null
          group by d.id having sum(abs(c.monto)) > d."montoCLP" + 1`,
  },
  {
    clave: 'conciliacion_sin_destino_unico',
    titulo: 'Conciliaciones sin destino o con más de uno',
    gravedad: 'error',
    sql: `select id, "movimientoId", monto from conciliaciones
          where (("cuotaId" is not null)::int + ("pagoArriendoId" is not null)::int
               + ("facturaCompraId" is not null)::int + ("documentoInternoId" is not null)::int
               + ("contactoId" is not null)::int) <> 1`,
  },
  {
    clave: 'documento_doble_respaldo',
    titulo: 'Provisiones pagadas directo Y por su factura asociada',
    gravedad: 'error',
    sql: `select d.id, d.descripcion from documentos_internos d
          where d."facturaCompraId" is not null
          and exists (select 1 from conciliaciones c where c."documentoInternoId" = d.id)
          and exists (select 1 from conciliaciones c2 where c2."facturaCompraId" = d."facturaCompraId")`,
  },
  {
    clave: 'alias_dos_lados',
    titulo: 'Contrapartes que son cliente y proveedor a la vez',
    gravedad: 'error',
    sql: `select id, clave, "contactoId", "proveedorId" from alias_contraparte
          where ("contactoId" is not null and "proveedorId" is not null)
             or (interno and ("contactoId" is not null or "proveedorId" is not null))`,
  },
  {
    clave: 'vencimiento_antes_de_emision',
    titulo: 'Facturas de compra que vencen antes de emitirse',
    gravedad: 'aviso',
    sql: `select id, folio, "fechaEmision", "fechaVencimiento" from facturas_compra
          where "fechaVencimiento" < "fechaEmision"`,
  },
  {
    clave: 'provisiones_sin_factura',
    titulo: 'Provisiones vencidas sin factura asociada (¿no te han facturado?)',
    gravedad: 'aviso',
    sql: `select d.id, d.descripcion, d."fechaEsperada", d."montoUF", d."montoCLP"
          from documentos_internos d
          where d.tipo = 'PROVISION' and d."facturaCompraId" is null
          and d."fechaEsperada" < now()
          order by d."fechaEsperada"`,
  },
  {
    clave: 'documentos_sin_cuenta',
    titulo: 'Documentos sin cuenta del plan (gasto sin clasificar)',
    gravedad: 'aviso',
    soloConteo: true,
    sql: `select id, descripcion from documentos_internos where "cuentaId" is null
          union all
          select id, folio from facturas_compra where "cuentaId" is null`,
  },
  {
    clave: 'cargos_sin_documento',
    titulo: 'Cargos del banco sin documento que los explique (sin clasificar)',
    gravedad: 'aviso',
    soloConteo: true,
    sql: `select m.id, m.fecha, m.glosa, m.monto from movimientos_banco m
          where m.monto < 0 and not m.ignorado
          and not exists (select 1 from conciliaciones c where c."movimientoId" = m.id)`,
  },
  {
    clave: 'abonos_sin_imputar',
    titulo: 'Abonos del banco sin imputar a ninguna cuota, arriendo o cliente',
    gravedad: 'aviso',
    soloConteo: true,
    sql: `select m.id, m.fecha, m.glosa, m.monto from movimientos_banco m
          where m.monto > 0 and not m.ignorado
          and not exists (select 1 from conciliaciones c where c."movimientoId" = m.id)`,
  },
  {
    clave: 'meses_sin_banco',
    titulo: 'Meses sin ningún movimiento bancario cargado (huecos en la cobertura)',
    gravedad: 'aviso',
    sql: `with rango as (
            select date_trunc('month', min(fecha))::date as d, date_trunc('month', max(fecha))::date as h from movimientos_banco
          ), meses as (
            select generate_series(d, h, interval '1 month')::date as mes from rango
          )
          select to_char(mes, 'YYYY-MM') as mes from meses
          where not exists (select 1 from movimientos_banco m where date_trunc('month', m.fecha) = meses.mes)
          order by mes`,
  },
]

/**
 * Corre todas las reglas. Devuelve una lista con cantidad y ejemplos por regla, más un
 * resumen. Nunca lanza por una regla sola: si una consulta falla, se informa como tal.
 */
async function verificarSalud(prisma, { ejemplos = 5 } = {}) {
  const resultados = []
  for (const r of REGLAS) {
    try {
      const filas = await prisma.$queryRawUnsafe(r.sql)
      const cantidad = filas.length
      const monto = filas.reduce((a, f) => a + Math.abs(Number(f.monto ?? f.total ?? f.montoCLP ?? 0)), 0)
      resultados.push({
        clave: r.clave, titulo: r.titulo, gravedad: r.gravedad, cantidad, monto,
        ejemplos: filas.slice(0, ejemplos).map(serializar),
      })
    } catch (e) {
      resultados.push({ clave: r.clave, titulo: r.titulo, gravedad: 'error', cantidad: null, error: e.message.slice(0, 200), ejemplos: [] })
    }
  }
  const errores = resultados.filter((r) => r.gravedad === 'error' && (r.cantidad > 0 || r.cantidad === null)).length
  const avisos = resultados.filter((r) => r.gravedad === 'aviso' && r.cantidad > 0).length
  return { verificadoEn: new Date(), errores, avisos, reglas: resultados }
}

function serializar(f) {
  const o = {}
  for (const [k, v] of Object.entries(f)) {
    if (typeof v === 'bigint') o[k] = Number(v)
    else if (v instanceof Date) o[k] = v.toISOString().slice(0, 10)
    else if (v && typeof v === 'object' && typeof v.toNumber === 'function') o[k] = v.toNumber()
    else o[k] = v
  }
  return o
}

module.exports = { REGLAS, verificarSalud }
