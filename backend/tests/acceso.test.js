const { test } = require('node:test')
const assert = require('node:assert')
const { filtroAcceso } = require('../src/lib/acceso')

// filtroAcceso construye el where de Prisma para acotar los leads que un usuario
// puede ver. Es la base para cerrar los IDOR del CRM, así que conviene fijarlo.

test('filtroAcceso: gerencia/JV/abogado ven todo (filtro vacío)', () => {
  for (const rol of ['GERENTE', 'JEFE_VENTAS', 'ABOGADO']) {
    assert.deepStrictEqual(filtroAcceso({ rol, id: 5 }), {}, `rol ${rol}`)
  }
})

test('filtroAcceso: un vendedor sin filtros solo ve sus propios leads', () => {
  assert.deepStrictEqual(
    filtroAcceso({ rol: 'VENDEDOR', id: 7 }),
    { OR: [{ vendedorId: 7 }] }
  )
})

test('filtroAcceso: suma la condición de campañas asignadas', () => {
  const f = filtroAcceso({ rol: 'VENDEDOR', id: 7, campanasFiltro: ['Webinar', 'Instagram'] })
  assert.deepStrictEqual(f.OR, [
    { vendedorId: 7 },
    { campana: { in: ['Webinar', 'Instagram'] } },
  ])
})

test('filtroAcceso: suma edificios y leads individuales asignados', () => {
  const f = filtroAcceso({
    rol: 'VENDEDOR', id: 7,
    edificiosFiltro: [1, 2],
    leadsIndividualesFiltro: [10, 11],
  })
  assert.deepStrictEqual(f.OR, [
    { vendedorId: 7 },
    { unidadInteres: { edificioId: { in: [1, 2] } } },
    { id: { in: [10, 11] } },
  ])
})

test('filtroAcceso: BROKER_EXTERNO también queda acotado a lo suyo (no es acceso total)', () => {
  const f = filtroAcceso({ rol: 'BROKER_EXTERNO', id: 3 })
  assert.deepStrictEqual(f, { OR: [{ vendedorId: 3 }] })
})
