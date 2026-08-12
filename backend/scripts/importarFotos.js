// Importa la carpeta de fotos (Drive → ~/Descargas) al CRM.
//
//   node scripts/importarFotos.js --origen "/ruta/BODEPARKING"          → simulación
//   node scripts/importarFotos.js --origen "/ruta/BODEPARKING" --ejecutar
//
// Qué hace:
//   · Convierte todo (incluido HEIC, que ningún navegador muestra) a WebP:
//     una versión grande de 1600px y una miniatura cuadrada de 480px.
//   · Mapea las carpetas a los edificios y unidades del CRM. Las carpetas
//     "Bodega 209" / "E. Bodega 23" se asocian a esa unidad; el resto queda
//     como galería del edificio.
//   · Es idempotente: no vuelve a importar una foto ya cargada (compara por
//     el nombre original).
//
// Requiere ImageMagick (`magick`) para leer HEIC.
require('dotenv').config()
process.env.DATABASE_URL = process.env.DATABASE_URL_RAILWAY || process.env.DATABASE_URL
const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')
const prisma = require('../src/lib/prisma')

const args = process.argv.slice(2)
const EJECUTAR = args.includes('--ejecutar')
const ORIGEN = (() => {
  const i = args.indexOf('--origen')
  return i >= 0 ? args[i + 1] : null
})()

const DESTINO = path.join(__dirname, '../uploads/catalogo')
const EXT_VALIDAS = /\.(heic|jpe?g|png|webp)$/i

// Carpeta del Drive → nombre del edificio en el CRM
const EDIFICIOS = {
  'Obispo Salas': 'Obispo Salas',
  'Trinitarias': 'Trinitarias',
  'Plus': 'Plus',
  'Aldunate': 'Aldunate',
  'Brasil': 'Brasil',
  'Neocisternas': 'Neocisterna', // en el CRM va sin "s" final
}

// "E. Bodega 23" → "23" · "Bodega 209" → "209" · "Edificio" → null
const numeroDeCarpeta = (nombre) => {
  if (/^edificio$/i.test(nombre.trim())) return null
  const m = nombre.match(/(?:bodega|estacionamiento|e)[\s.]*([\w-]+)$/i)
  return m ? m[1] : null
}

// Los estacionamientos de Brasil no tienen carpeta: el número va en el archivo,
// y con separadores distintos ("E2-E4.jpg", "E2_E4.jpg") o nombrando una sola
// plaza del tándem ("E14.jpg" → unidad "E14-E16"). Devuelve la unidad o null.
const unidadDeArchivo = (archivo, unidadPorNumero) => {
  const base = path.basename(archivo, path.extname(archivo)).toUpperCase()
  const par = base.match(/^(E\d+)[-_](E\d+)/)
  if (par) {
    const directa = unidadPorNumero.get(`${par[1]}-${par[2]}`)
    if (directa) return directa
  }
  // Una sola plaza: buscar el tándem que la contenga como componente exacto
  // (E1 no debe confundirse con E14).
  const sola = base.match(/^(E\d+)(?:[^0-9]|$)/)
  if (!sola) return null
  for (const [numero, unidad] of unidadPorNumero) {
    if (numero.split('-').includes(sola[1])) return unidad
  }
  return null
}

// Cuánto "cielo" hay en el tercio superior. Los nombres de archivo que vienen
// de WhatsApp no dicen nada, así que la fachada se detecta mirando la foto: al
// aire libre el cielo tira a azul (B > R) y bajo techo el tono es cálido.
// Sirve para que la portada del edificio sea la fachada y no una pared.
function puntajeExterior(archivo) {
  try {
    const azul = execFileSync('magick', [
      archivo, '-auto-orient', '-gravity', 'north', '-crop', '100%x33%+0+0', '+repage',
      '-resize', '1x1', '-format', '%[fx:int(255*(b-r))]', 'info:'
    ]).toString().trim()
    return Number(azul) || 0
  } catch {
    return 0
  }
}

const categoriaDe = (nombre, puntaje) => {
  const n = nombre.toLowerCase()
  if (/plano/.test(n)) return 'plano'
  if (/conserjeria|conserjería|acceso|entrada|hall/.test(n)) return 'acceso'
  if (/fachada|exterior/.test(n) || puntaje >= 10) return 'fachada'
  return 'interior'
}

function convertir(entrada, salidaBase) {
  const grande = `${salidaBase}.webp`
  const mini = `${salidaBase}-mini.webp`
  execFileSync('magick', [entrada, '-auto-orient', '-resize', '1600x1600>', '-quality', '82', grande])
  execFileSync('magick', [entrada, '-auto-orient', '-resize', '480x480^', '-gravity', 'center',
    '-extent', '480x480', '-quality', '78', mini])
  return {
    url: `/uploads/catalogo/${path.basename(grande)}`,
    urlMiniatura: `/uploads/catalogo/${path.basename(mini)}`,
    bytes: fs.statSync(grande).size + fs.statSync(mini).size,
  }
}

// Recorre un directorio y devuelve sus archivos de imagen (sin recursión)
const imagenesDe = (dir) => fs.readdirSync(dir, { withFileTypes: true })
  .filter(e => e.isFile() && EXT_VALIDAS.test(e.name))
  .map(e => path.join(dir, e.name))
  .sort()

const subcarpetas = (dir) => fs.readdirSync(dir, { withFileTypes: true })
  .filter(e => e.isDirectory())
  .map(e => e.name)
  .sort()

// Recalcula el orden y la categoría de las fotos ya importadas, mirando los
// WebP que están en uploads/. No reconvierte ni vuelve a bajar nada.
async function reordenar() {
  const fotos = await prisma.fotoEdificio.findMany({ orderBy: [{ edificioId: 'asc' }, { id: 'asc' }] })
  if (!fotos.length) { console.log('No hay fotos de edificio importadas.'); return }

  const porEdificio = {}
  for (const f of fotos) {
    const archivo = path.join(__dirname, '../uploads', f.url.replace(/^\/uploads\//, ''))
    const puntaje = fs.existsSync(archivo) ? puntajeExterior(archivo) : 0
    ;(porEdificio[f.edificioId] ||= []).push({ ...f, puntaje })
  }

  let cambios = 0
  for (const [edificioId, lista] of Object.entries(porEdificio)) {
    lista.sort((a, b) => b.puntaje - a.puntaje || a.nombre.localeCompare(b.nombre))
    for (let i = 0; i < lista.length; i++) {
      const categoria = categoriaDe(lista[i].nombre, lista[i].puntaje)
      if (lista[i].orden !== i || lista[i].categoria !== categoria) {
        if (EJECUTAR) await prisma.fotoEdificio.update({ where: { id: lista[i].id }, data: { orden: i, categoria } })
        cambios++
      }
    }
    const portada = lista[0]
    console.log(`  Edificio ${edificioId}: portada "${portada.nombre}" (${categoriaDe(portada.nombre, portada.puntaje)}, cielo ${portada.puntaje >= 0 ? '+' : ''}${portada.puntaje})`)
  }
  console.log(`\n  ${EJECUTAR ? '✅ Actualizadas' : 'Se actualizarían'} ${cambios} fotos\n`)
}

async function main() {
  if (args.includes('--reordenar')) {
    console.log(`\n${EJECUTAR ? 'REORDENANDO' : 'SIMULACIÓN (usar --ejecutar para aplicar)'}\n`)
    await reordenar()
    await prisma.$disconnect()
    return
  }
  if (!ORIGEN || !fs.existsSync(ORIGEN)) {
    console.error('Falta --origen con la ruta de la carpeta BODEPARKING.')
    process.exit(1)
  }
  try {
    execFileSync('magick', ['-version'], { stdio: 'ignore' })
  } catch {
    console.error('Falta ImageMagick (`magick`). Sin él no se pueden leer los HEIC.')
    process.exit(1)
  }

  const edificios = await prisma.edificio.findMany({ include: { unidades: { select: { id: true, numero: true } } } })
  const porNombre = new Map(edificios.map(e => [e.nombre, e]))

  // Ya importadas (por nombre original) para no duplicar
  const [yaUnidad, yaEdificio] = await Promise.all([
    prisma.archivo.findMany({ where: { tipo: 'foto' }, select: { nombre: true, unidadId: true } }),
    prisma.fotoEdificio.findMany({ select: { nombre: true, edificioId: true } }),
  ])
  const vistas = new Set([
    ...yaUnidad.map(a => `u${a.unidadId}:${a.nombre}`),
    ...yaEdificio.map(f => `e${f.edificioId}:${f.nombre}`),
  ])

  if (EJECUTAR) fs.mkdirSync(DESTINO, { recursive: true })

  const plan = { unidad: [], edificio: [], sinEdificio: [], sinUnidad: [], saltadas: 0 }
  let bytes = 0

  // El árbol es BODEPARKING/{Bodegas,Estacionamiento}/{Edificio}/...
  for (const grupo of subcarpetas(ORIGEN)) {
    const dirGrupo = path.join(ORIGEN, grupo)
    for (const carpetaEd of subcarpetas(dirGrupo)) {
      const nombreCrm = EDIFICIOS[carpetaEd]
      const edificio = nombreCrm && porNombre.get(nombreCrm)
      if (!edificio) { plan.sinEdificio.push(carpetaEd); continue }

      const dirEd = path.join(dirGrupo, carpetaEd)
      const unidadPorNumero = new Map(edificio.unidades.map(u => [String(u.numero).toUpperCase(), u]))

      // 1. Fotos sueltas en la raíz del edificio → galería del edificio,
      //    salvo que el nombre del archivo identifique una unidad (Brasil).
      for (const img of imagenesDe(dirEd)) {
        const unidad = unidadDeArchivo(img, unidadPorNumero)
        const destino = unidad
          ? { tipo: 'unidad', unidadId: unidad.id, etiqueta: `${edificio.nombre} · unidad ${unidad.numero}` }
          : { tipo: 'edificio', edificioId: edificio.id, etiqueta: `${edificio.nombre} · galería` }
        agregar(destino, img)
      }

      // 2. Subcarpetas: "Edificio" → galería; "Bodega 209" → esa unidad
      for (const sub of subcarpetas(dirEd)) {
        const num = numeroDeCarpeta(sub)
        const dirSub = path.join(dirEd, sub)
        if (num === null) {
          for (const img of imagenesDe(dirSub)) {
            agregar({ tipo: 'edificio', edificioId: edificio.id, etiqueta: `${edificio.nombre} · galería` }, img)
          }
          continue
        }
        // La unidad puede estar como "209" o como "B209" (Plus)
        const unidad = unidadPorNumero.get(num.toUpperCase()) || unidadPorNumero.get(`B${num}`.toUpperCase())
        if (!unidad) { plan.sinUnidad.push(`${edificio.nombre} / ${sub}`); continue }
        for (const img of imagenesDe(dirSub)) {
          agregar({ tipo: 'unidad', unidadId: unidad.id, etiqueta: `${edificio.nombre} · unidad ${unidad.numero}` }, img)
        }
      }
    }
  }

  function agregar(destino, imagen) {
    const nombre = path.basename(imagen)
    const clave = destino.tipo === 'unidad' ? `u${destino.unidadId}:${nombre}` : `e${destino.edificioId}:${nombre}`
    if (vistas.has(clave)) { plan.saltadas++; return }
    vistas.add(clave)
    plan[destino.tipo].push({ ...destino, imagen, nombre })
  }

  console.log(`\n${EJECUTAR ? 'IMPORTANDO' : 'SIMULACIÓN (usar --ejecutar para aplicar)'}\n`)
  console.log(`  Fotos de unidad   : ${plan.unidad.length}`)
  console.log(`  Fotos de edificio : ${plan.edificio.length}`)
  if (plan.saltadas) console.log(`  Ya importadas     : ${plan.saltadas} (se omiten)`)
  if (plan.sinEdificio.length) console.log(`  ⚠️  Carpetas sin edificio en el CRM: ${[...new Set(plan.sinEdificio)].join(', ')}`)
  if (plan.sinUnidad.length) console.log(`  ⚠️  Carpetas sin unidad en el CRM  : ${plan.sinUnidad.join(', ')}`)

  const resumen = {}
  for (const it of [...plan.unidad, ...plan.edificio]) resumen[it.etiqueta] = (resumen[it.etiqueta] || 0) + 1
  console.log('\n  Detalle:')
  for (const [k, v] of Object.entries(resumen).sort()) console.log(`    ${k}: ${v}`)

  if (!EJECUTAR) {
    console.log('\n(no se escribió nada — ni archivos ni base de datos)\n')
    await prisma.$disconnect()
    return
  }

  let n = 0
  for (const it of plan.unidad) {
    const base = path.join(DESTINO, `u${it.unidadId}-${Date.now()}-${n}`)
    const { url, urlMiniatura, bytes: b } = convertir(it.imagen, base)
    bytes += b
    await prisma.archivo.create({
      data: {
        unidadId: it.unidadId, url, urlMiniatura, nombre: it.nombre, tipo: 'foto',
        orden: n, esPortada: false,
      }
    })
    n++
    if (n % 10 === 0) process.stdout.write(`  ${n} fotos…\r`)
  }
  // La primera foto de cada unidad es la portada
  const conFotos = [...new Set(plan.unidad.map(u => u.unidadId))]
  for (const unidadId of conFotos) {
    const primera = await prisma.archivo.findFirst({
      where: { unidadId, tipo: 'foto' }, orderBy: [{ orden: 'asc' }, { id: 'asc' }]
    })
    if (primera) await prisma.archivo.update({ where: { id: primera.id }, data: { esPortada: true } })
  }

  // La galería del edificio se ordena con la fachada adelante: es la portada
  // que ve el cliente cuando el vendedor abre el proyecto.
  const conPuntaje = plan.edificio.map(it => ({ ...it, puntaje: puntajeExterior(it.imagen) }))
  conPuntaje.sort((a, b) =>
    a.edificioId - b.edificioId || b.puntaje - a.puntaje || a.nombre.localeCompare(b.nombre))

  let m = 0
  const ordenPorEdificio = {}
  for (const it of conPuntaje) {
    const base = path.join(DESTINO, `e${it.edificioId}-${Date.now()}-${m}`)
    const { url, urlMiniatura, bytes: b } = convertir(it.imagen, base)
    bytes += b
    ordenPorEdificio[it.edificioId] = (ordenPorEdificio[it.edificioId] ?? -1) + 1
    await prisma.fotoEdificio.create({
      data: {
        edificioId: it.edificioId, url, urlMiniatura, nombre: it.nombre,
        categoria: categoriaDe(it.nombre, it.puntaje), orden: ordenPorEdificio[it.edificioId],
      }
    })
    m++
  }

  console.log(`\n  ✅ ${n} fotos de unidad · ${m} de edificio · ${(bytes / 1048576).toFixed(1)} MB en disco`)
  console.log(`  Guardadas en ${DESTINO}\n`)
  await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
