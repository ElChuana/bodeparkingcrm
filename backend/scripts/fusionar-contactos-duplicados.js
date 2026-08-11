// Fusiona contactos duplicados (misma persona guardada 2+ veces).
// Criterio: mismo email exacto, o mismo teléfono normalizado + nombre similar
// (lib/deduplication). Teléfonos de relleno (912345678, dígitos repetidos) se ignoran.
// El sobreviviente es el contacto más completo; hereda campos vacíos y todas las
// referencias (leads, ventas, arriendos) de los duplicados, que se eliminan.
//
// Uso:
//   DATABASE_URL="$RAILWAY_URL" node scripts/fusionar-contactos-duplicados.js            → dry-run
//   DATABASE_URL="$RAILWAY_URL" node scripts/fusionar-contactos-duplicados.js --ejecutar → aplica (respalda antes en ~/backups/bodeparking/)
//
// Para fusionar un caso puntual en vez de todos los grupos detectados:
//   --solo 2819,8594       → solo los grupos que contengan alguno de esos contactos
//   --sobrevive 8594       → fuerza quién sobrevive (por defecto gana el más completo,
//                            que ante empate es el de id menor — no siempre el de mejores datos)
const fs = require('fs')
const path = require('path')
const os = require('os')
const prisma = require('../src/lib/prisma')
const { mismoNombre, normalizarNombre } = require('../src/lib/deduplication')

// Mismo teléfono + mismo primer nombre alcanza ("Pabla Pizarro" vs "Pabla Pizarro Gonzalez")
function nombresCompatibles(a, b) {
  if (mismoNombre(a, b)) return true
  const pa = normalizarNombre(a).split(/\s+/)[0]
  const pb = normalizarNombre(b).split(/\s+/)[0]
  return pa.length >= 3 && pa === pb
}

const EJECUTAR = process.argv.includes('--ejecutar')

const argValor = nombre => {
  const i = process.argv.indexOf(nombre)
  return i === -1 ? null : process.argv[i + 1]
}
const SOLO = (argValor('--solo') || '').split(',').map(n => Number(n.trim())).filter(Boolean)
const SOBREVIVE = Number(argValor('--sobrevive')) || null

const normTel = t => (t || '').replace(/\D/g, '').replace(/^56/, '')
const telFalso = t => !t || t.length < 8 || /^(\d)\1+$/.test(t) || t.includes('12345678')
const normEmail = e => (e || '').trim().toLowerCase()

const CAMPOS_HEREDABLES = [
  'rut', 'email', 'telefono', 'empresa', 'fechaNacimiento', 'ciudadNacimiento',
  'estadoCivil', 'profesion', 'nacionalidad', 'regimenMatrimonial', 'direccionParticular'
]

function nombreCompleto(c) {
  return `${c.nombre || ''} ${c.apellido || ''}`.trim()
}

function puntaje(c) {
  let p = 0
  if (c.rut) p += 10
  p += c._count.compras * 5 + c._count.arriendos * 5 + c._count.leads
  p += CAMPOS_HEREDABLES.filter(k => c[k]).length
  return p
}

async function main() {
  const contactos = await prisma.contacto.findMany({
    include: { _count: { select: { leads: true, compras: true, arriendos: true } } }
  })
  const porId = new Map(contactos.map(c => [c.id, c]))

  // Agrupar candidatos: email exacto siempre; teléfono solo si el nombre calza
  const padre = new Map()
  const find = id => (padre.get(id) === id ? id : (padre.set(id, find(padre.get(id))), padre.get(id)))
  const unir = (a, b) => { padre.set(find(a), find(b)) }
  contactos.forEach(c => padre.set(c.id, c.id))

  const porEmail = new Map()
  const porTel = new Map()
  for (const c of contactos) {
    const e = normEmail(c.email)
    if (e) (porEmail.get(e) || porEmail.set(e, []).get(e)).push(c)
    const t = normTel(c.telefono)
    if (!telFalso(t)) (porTel.get(t) || porTel.set(t, []).get(t)).push(c)
  }
  for (const grupo of porEmail.values()) {
    for (let i = 1; i < grupo.length; i++) unir(grupo[i].id, grupo[0].id)
  }
  const descartadosTel = []
  for (const [tel, grupo] of porTel.entries()) {
    for (let i = 1; i < grupo.length; i++) {
      if (nombresCompatibles(nombreCompleto(grupo[i]), nombreCompleto(grupo[0]))) unir(grupo[i].id, grupo[0].id)
      else if (find(grupo[i].id) !== find(grupo[0].id)) descartadosTel.push({ tel, a: grupo[0], b: grupo[i] })
    }
  }

  const grupos = new Map()
  for (const c of contactos) {
    const raiz = find(c.id)
    if (!grupos.has(raiz)) grupos.set(raiz, [])
    grupos.get(raiz).push(c)
  }
  let fusiones = [...grupos.values()].filter(g => g.length > 1)
  if (SOLO.length) fusiones = fusiones.filter(g => g.some(c => SOLO.includes(c.id)))

  console.log(`Grupos a fusionar: ${fusiones.length}${SOLO.length ? ` (filtrado por --solo ${SOLO.join(',')})` : ''}${EJECUTAR ? '' : '  (DRY-RUN — nada se modifica; usa --ejecutar)'}\n`)

  if (EJECUTAR && fusiones.length) {
    const dir = path.join(os.homedir(), 'backups', 'bodeparking')
    fs.mkdirSync(dir, { recursive: true })
    const archivo = path.join(dir, `contactos-fusion-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`)
    fs.writeFileSync(archivo, JSON.stringify(fusiones, null, 2))
    console.log(`Respaldo de los contactos afectados: ${archivo}\n`)
  }

  for (const grupo of fusiones) {
    grupo.sort((a, b) => {
      if (SOBREVIVE) {
        if (a.id === SOBREVIVE) return -1
        if (b.id === SOBREVIVE) return 1
      }
      return puntaje(b) - puntaje(a) || a.id - b.id
    })
    const [sobreviviente, ...duplicados] = grupo
    console.log(`── Sobrevive #${sobreviviente.id} ${nombreCompleto(sobreviviente)} (${sobreviviente.email || sobreviviente.telefono})`)

    for (const dup of duplicados) {
      console.log(`   absorbe #${dup.id} ${nombreCompleto(dup)} (leads:${dup._count.leads}, ventas:${dup._count.compras}, arriendos:${dup._count.arriendos})`)
      if (!EJECUTAR) continue

      await prisma.$transaction(async tx => {
        await tx.lead.updateMany({ where: { contactoId: dup.id }, data: { contactoId: sobreviviente.id } })
        await tx.venta.updateMany({ where: { compradorId: dup.id }, data: { compradorId: sobreviviente.id } })
        await tx.arriendo.updateMany({ where: { contactoId: dup.id }, data: { contactoId: sobreviviente.id } })

        const herencia = {}
        for (const k of CAMPOS_HEREDABLES) {
          if (!sobreviviente[k] && dup[k]) herencia[k] = dup[k]
        }
        if (dup.notas) {
          herencia.notas = [sobreviviente.notas, `[fusionado de contacto #${dup.id}] ${dup.notas}`].filter(Boolean).join('\n')
        }

        await tx.contacto.delete({ where: { id: dup.id } })
        if (Object.keys(herencia).length) {
          await tx.contacto.update({ where: { id: sobreviviente.id }, data: herencia })
          Object.assign(sobreviviente, herencia)
        }
      })
    }
  }

  if (descartadosTel.length) {
    console.log(`\nNo fusionados (mismo teléfono pero nombre distinto — revisar a mano):`)
    for (const d of descartadosTel) {
      console.log(`   tel ${d.tel}: #${d.a.id} "${nombreCompleto(d.a)}" vs #${d.b.id} "${nombreCompleto(d.b)}"`)
    }
  }
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
