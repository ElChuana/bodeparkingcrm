# Rediseño Proceso Legal — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar los 6 pasos del proceso legal por 8 nuevos (promesa en 3 sub-pasos, escritura en 3 sub-pasos, CBR, entrega), migrar datos existentes y corregir bug de creación.

**Architecture:** Migración SQL directa en Railway para recrear el enum limpio → `prisma db push` solo agrega 2 nuevas columnas → actualizar backend (controllers) → actualizar frontend (2 páginas).

**Tech Stack:** PostgreSQL (Railway), Prisma, Node.js, React + Ant Design

---

## Mapa de archivos

| Archivo | Acción |
|---|---|
| `scripts/migrar-enum-legal.sql` | CREAR — Script SQL único para Railway |
| `backend/prisma/schema.prisma` | MODIFICAR — Enum nuevo + 2 campos nuevos |
| `backend/src/controllers/legalController.js` | MODIFICAR — PASOS arrays + fechas nuevas |
| `backend/src/controllers/cotizacionesController.js` | MODIFICAR — Fix bug tienePromesa |
| `backend/src/controllers/dashboardController.js` | MODIFICAR — PASOS arrays |
| `frontend/src/pages/ventas/Legal.jsx` | MODIFICAR — Labels + PASOS + FECHA_POR_PASO |
| `frontend/src/pages/ventas/VentaDetalle.jsx` | MODIFICAR — Labels + PASOS + FECHA_POR_PASO + form |

---

## Task 1: Crear y ejecutar script SQL de migración

**Files:**
- Create: `scripts/migrar-enum-legal.sql`

- [ ] **Step 1: Crear el script SQL**

```sql
-- scripts/migrar-enum-legal.sql
BEGIN;

-- Paso 1: Crear enum nuevo con valores correctos
CREATE TYPE "EstadoLegal_new" AS ENUM (
  'CONFECCION_PROMESA',
  'FIRMA_CLIENTE_PROMESA',
  'FIRMA_INMOBILIARIA_PROMESA',
  'CONFECCION_ESCRITURA',
  'FIRMA_CLIENTE_ESCRITURA',
  'FIRMA_INMOBILIARIA_ESCRITURA',
  'INSCRIPCION_CBR',
  'ENTREGADO'
);

-- Paso 2: Quitar defaults antes de alterar columnas
ALTER TABLE procesos_legales ALTER COLUMN "estadoActual" DROP DEFAULT;

-- Paso 3: Migrar procesos_legales.estadoActual
ALTER TABLE procesos_legales
  ALTER COLUMN "estadoActual" TYPE "EstadoLegal_new"
  USING (
    CASE "estadoActual"::text
      WHEN 'ESCRITURA_LISTA' THEN 'CONFECCION_ESCRITURA'
      WHEN 'FIRMADA_NOTARIA' THEN 'FIRMA_CLIENTE_ESCRITURA'
      ELSE "estadoActual"::text
    END
  )::"EstadoLegal_new";

-- Paso 4: Migrar documentos_legales.etapa
ALTER TABLE documentos_legales
  ALTER COLUMN "etapa" TYPE "EstadoLegal_new"
  USING (
    CASE "etapa"::text
      WHEN 'ESCRITURA_LISTA' THEN 'CONFECCION_ESCRITURA'
      WHEN 'FIRMADA_NOTARIA' THEN 'FIRMA_CLIENTE_ESCRITURA'
      ELSE "etapa"::text
    END
  )::"EstadoLegal_new";

-- Paso 5: Reemplazar enum viejo por el nuevo
DROP TYPE "EstadoLegal";
ALTER TYPE "EstadoLegal_new" RENAME TO "EstadoLegal";

COMMIT;
```

- [ ] **Step 2: Ejecutar en Railway**

```bash
psql "postgresql://bodeparking:bodeparking2026!@monorail.proxy.rlwy.net:35865/bodeparkingcrm" \
  -f scripts/migrar-enum-legal.sql
```

Esperado: `COMMIT` sin errores.

- [ ] **Step 3: Verificar migración**

```bash
psql "postgresql://bodeparking:bodeparking2026!@monorail.proxy.rlwy.net:35865/bodeparkingcrm" \
  -c 'SELECT "estadoActual", COUNT(*) FROM procesos_legales GROUP BY "estadoActual";'
```

Esperado: ninguna fila con `ESCRITURA_LISTA` ni `FIRMADA_NOTARIA`. Las 8 que estaban en `ESCRITURA_LISTA` ahora deben aparecer como `CONFECCION_ESCRITURA`.

- [ ] **Step 4: Commit**

```bash
git add scripts/migrar-enum-legal.sql
git commit -m "chore: script SQL migración enum EstadoLegal — nuevos 8 pasos proceso legal"
```

---

## Task 2: Actualizar schema Prisma y hacer db push

**Files:**
- Modify: `backend/prisma/schema.prisma`

- [ ] **Step 1: Actualizar enum EstadoLegal**

Reemplazar el bloque del enum (líneas 88-95 aprox):

```prisma
enum EstadoLegal {
  CONFECCION_PROMESA
  FIRMA_CLIENTE_PROMESA
  FIRMA_INMOBILIARIA_PROMESA
  CONFECCION_ESCRITURA
  FIRMA_CLIENTE_ESCRITURA
  FIRMA_INMOBILIARIA_ESCRITURA
  INSCRIPCION_CBR
  ENTREGADO
}
```

- [ ] **Step 2: Agregar 2 nuevos campos a ProcesoLegal y cambiar default**

En el modelo `ProcesoLegal`, cambiar la línea de `estadoActual` y agregar los 2 campos nuevos:

```prisma
model ProcesoLegal {
  id                         Int         @id @default(autoincrement())
  ventaId                    Int         @unique
  tienePromesa               Boolean     @default(true)
  estadoActual               EstadoLegal @default(CONFECCION_PROMESA)
  fechaLimiteConfeccionPromesa   DateTime?
  fechaLimiteFirmaCliente    DateTime?
  fechaLimiteFirmaInmob      DateTime?
  fechaLimiteEscritura       DateTime?
  fechaLimiteFirmaNot        DateTime?
  fechaLimiteFirmaInmobEscritura DateTime?
  fechaLimiteCBR             DateTime?
  fechaLimiteEntrega         DateTime?
  notas                      String?
  creadoEn                   DateTime    @default(now())
  actualizadoEn              DateTime    @updatedAt

  venta                      Venta       @relation(fields: [ventaId], references: [id])
  documentos                 DocumentoLegal[]

  @@map("procesos_legales")
}
```

- [ ] **Step 3: Ejecutar db push**

```bash
cd /Users/juana/Documents/bodeparkingcrm/backend && npx prisma db push
```

Esperado: `Your database is now in sync with your Prisma schema.` Sin advertencia de pérdida de datos (el enum ya fue migrado en Task 1).

- [ ] **Step 4: Commit**

```bash
git add backend/prisma/schema.prisma
git commit -m "feat: schema — enum EstadoLegal 8 pasos, 2 nuevos campos fecha en ProcesoLegal"
```

---

## Task 3: Actualizar legalController.js

**Files:**
- Modify: `backend/src/controllers/legalController.js`

- [ ] **Step 1: Reemplazar PASOS y actualizar función actualizar**

Reemplazar el contenido completo del archivo:

```js
const prisma = require('../lib/prisma')

const PASOS_CON_PROMESA = [
  'CONFECCION_PROMESA',
  'FIRMA_CLIENTE_PROMESA',
  'FIRMA_INMOBILIARIA_PROMESA',
  'CONFECCION_ESCRITURA',
  'FIRMA_CLIENTE_ESCRITURA',
  'FIRMA_INMOBILIARIA_ESCRITURA',
  'INSCRIPCION_CBR',
  'ENTREGADO'
]

const PASOS_SIN_PROMESA = [
  'CONFECCION_ESCRITURA',
  'FIRMA_CLIENTE_ESCRITURA',
  'FIRMA_INMOBILIARIA_ESCRITURA',
  'INSCRIPCION_CBR',
  'ENTREGADO'
]

const obtener = async (req, res) => {
  const { ventaId } = req.params
  try {
    let proceso = await prisma.procesoLegal.findUnique({
      where: { ventaId: Number(ventaId) },
      include: {
        documentos: {
          include: { subidoPor: { select: { nombre: true, apellido: true } } },
          orderBy: { creadoEn: 'desc' }
        }
      }
    })

    if (!proceso) return res.status(404).json({ error: 'Proceso legal no encontrado.' })

    res.json(proceso)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al obtener proceso legal.' })
  }
}

const actualizar = async (req, res) => {
  const { ventaId } = req.params
  const {
    estadoActual, tienePromesa, notas,
    fechaLimiteConfeccionPromesa,
    fechaLimiteFirmaCliente, fechaLimiteFirmaInmob,
    fechaLimiteEscritura, fechaLimiteFirmaNot,
    fechaLimiteFirmaInmobEscritura,
    fechaLimiteCBR, fechaLimiteEntrega
  } = req.body

  const pasos = tienePromesa === false ? PASOS_SIN_PROMESA : PASOS_CON_PROMESA
  if (estadoActual && !pasos.includes(estadoActual)) {
    return res.status(400).json({ error: 'Estado legal inválido.' })
  }

  try {
    const proceso = await prisma.procesoLegal.update({
      where: { ventaId: Number(ventaId) },
      data: {
        ...(estadoActual && { estadoActual }),
        ...(tienePromesa !== undefined && { tienePromesa }),
        ...(notas !== undefined && { notas }),
        ...(fechaLimiteConfeccionPromesa !== undefined && {
          fechaLimiteConfeccionPromesa: fechaLimiteConfeccionPromesa ? new Date(fechaLimiteConfeccionPromesa) : null
        }),
        ...(fechaLimiteFirmaCliente !== undefined && {
          fechaLimiteFirmaCliente: fechaLimiteFirmaCliente ? new Date(fechaLimiteFirmaCliente) : null
        }),
        ...(fechaLimiteFirmaInmob !== undefined && {
          fechaLimiteFirmaInmob: fechaLimiteFirmaInmob ? new Date(fechaLimiteFirmaInmob) : null
        }),
        ...(fechaLimiteEscritura !== undefined && {
          fechaLimiteEscritura: fechaLimiteEscritura ? new Date(fechaLimiteEscritura) : null
        }),
        ...(fechaLimiteFirmaNot !== undefined && {
          fechaLimiteFirmaNot: fechaLimiteFirmaNot ? new Date(fechaLimiteFirmaNot) : null
        }),
        ...(fechaLimiteFirmaInmobEscritura !== undefined && {
          fechaLimiteFirmaInmobEscritura: fechaLimiteFirmaInmobEscritura ? new Date(fechaLimiteFirmaInmobEscritura) : null
        }),
        ...(fechaLimiteCBR !== undefined && {
          fechaLimiteCBR: fechaLimiteCBR ? new Date(fechaLimiteCBR) : null
        }),
        ...(fechaLimiteEntrega !== undefined && {
          fechaLimiteEntrega: fechaLimiteEntrega ? new Date(fechaLimiteEntrega) : null
        }),
      }
    })

    if (estadoActual === 'ENTREGADO') {
      await prisma.unidad.updateMany({ where: { ventaId: Number(ventaId) }, data: { estado: 'VENDIDO' } })
      await prisma.venta.update({ where: { id: Number(ventaId) }, data: { estado: 'ENTREGADO' } })
    }

    res.json(proceso)
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Proceso legal no encontrado.' })
    res.status(500).json({ error: 'Error al actualizar proceso legal.' })
  }
}

const subirDocumento = async (req, res) => {
  const { ventaId } = req.params
  const { nombre, etapa } = req.body

  if (!req.file || !nombre || !etapa) {
    return res.status(400).json({ error: 'Archivo, nombre y etapa son requeridos.' })
  }

  try {
    const proceso = await prisma.procesoLegal.findUnique({ where: { ventaId: Number(ventaId) } })
    if (!proceso) return res.status(404).json({ error: 'Proceso legal no encontrado.' })

    const doc = await prisma.documentoLegal.create({
      data: {
        procesoLegalId: proceso.id,
        subioPorId: req.usuario.id,
        nombre,
        url: `/uploads/${req.file.filename}`,
        etapa
      },
      include: { subidoPor: { select: { nombre: true, apellido: true } } }
    })
    res.status(201).json(doc)
  } catch (err) {
    res.status(500).json({ error: 'Error al subir documento.' })
  }
}

module.exports = { obtener, actualizar, subirDocumento }
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/controllers/legalController.js
git commit -m "feat: legalController — 8 nuevos pasos, campos fecha actualizados"
```

---

## Task 4: Corregir bug en cotizacionesController.js

**Files:**
- Modify: `backend/src/controllers/cotizacionesController.js`

- [ ] **Step 1: Localizar el bloque procesoLegal.create (línea ~422)**

Buscar el bloque:
```js
await tx.procesoLegal.create({
  data: {
    ventaId: nuevaVenta.id,
    tienePromesa: false,
    estadoActual: 'ESCRITURA_LISTA',
    fechaLimiteEscritura: hoy,
    fechaLimiteFirmaNot: hoy,
    fechaLimiteCBR: hoy,
    fechaLimiteEntrega: hoy
  }
})
```

- [ ] **Step 2: Reemplazar con versión correcta**

```js
await tx.procesoLegal.create({
  data: {
    ventaId: nuevaVenta.id,
    tienePromesa: Boolean(conPromesa),
    estadoActual: conPromesa ? 'CONFECCION_PROMESA' : 'CONFECCION_ESCRITURA',
  }
})
```

También eliminar la variable `const hoy = new Date()` si ya no se usa en otro lado del bloque.

- [ ] **Step 3: Commit**

```bash
git add backend/src/controllers/cotizacionesController.js
git commit -m "fix: crear proceso legal con tienePromesa y estadoActual correctos según conPromesa"
```

---

## Task 5: Actualizar dashboardController.js

**Files:**
- Modify: `backend/src/controllers/dashboardController.js`

- [ ] **Step 1: Localizar y reemplazar PASOS (línea ~343)**

Buscar:
```js
const PASOS_CON_PROMESA  = ['FIRMA_CLIENTE_PROMESA','FIRMA_INMOBILIARIA_PROMESA','ESCRITURA_LISTA','FIRMADA_NOTARIA','INSCRIPCION_CBR','ENTREGADO']
const procesoLegalPendiente = ventasActivas.filter(v => {
  if (!v.procesoLegal) return false
  const pasos = v.procesoLegal.tienePromesa === false
    ? ['ESCRITURA_LISTA','FIRMADA_NOTARIA','INSCRIPCION_CBR','ENTREGADO']
    : PASOS_CON_PROMESA
  const idx = pasos.indexOf(v.procesoLegal.estadoActual)
  return idx < pasos.length - 1
})
```

Reemplazar por:
```js
const PASOS_CON_PROMESA = ['CONFECCION_PROMESA','FIRMA_CLIENTE_PROMESA','FIRMA_INMOBILIARIA_PROMESA','CONFECCION_ESCRITURA','FIRMA_CLIENTE_ESCRITURA','FIRMA_INMOBILIARIA_ESCRITURA','INSCRIPCION_CBR','ENTREGADO']
const PASOS_SIN_PROMESA = ['CONFECCION_ESCRITURA','FIRMA_CLIENTE_ESCRITURA','FIRMA_INMOBILIARIA_ESCRITURA','INSCRIPCION_CBR','ENTREGADO']
const procesoLegalPendiente = ventasActivas.filter(v => {
  if (!v.procesoLegal) return false
  const pasos = v.procesoLegal.tienePromesa === false ? PASOS_SIN_PROMESA : PASOS_CON_PROMESA
  const idx = pasos.indexOf(v.procesoLegal.estadoActual)
  return idx < pasos.length - 1
})
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/controllers/dashboardController.js
git commit -m "feat: dashboardController — PASOS proceso legal actualizados"
```

---

## Task 6: Actualizar Legal.jsx

**Files:**
- Modify: `frontend/src/pages/ventas/Legal.jsx`

- [ ] **Step 1: Reemplazar constantes al inicio del archivo (líneas 15-34)**

```js
const ESTADO_LABEL = { PROMESA: 'Promesa', ESCRITURA: 'Escritura', ENTREGADO: 'Entregado' }

const LEGAL_LABEL = {
  CONFECCION_PROMESA:           'Confección promesa',
  FIRMA_CLIENTE_PROMESA:        'Firma cliente',
  FIRMA_INMOBILIARIA_PROMESA:   'Firma inmobiliaria',
  CONFECCION_ESCRITURA:         'Confección escritura',
  FIRMA_CLIENTE_ESCRITURA:      'Firma cliente',
  FIRMA_INMOBILIARIA_ESCRITURA: 'Firma inmobiliaria',
  INSCRIPCION_CBR:              'CBR',
  ENTREGADO:                    'Entregado',
}

const PASOS_CON_PROMESA = [
  'CONFECCION_PROMESA',
  'FIRMA_CLIENTE_PROMESA',
  'FIRMA_INMOBILIARIA_PROMESA',
  'CONFECCION_ESCRITURA',
  'FIRMA_CLIENTE_ESCRITURA',
  'FIRMA_INMOBILIARIA_ESCRITURA',
  'INSCRIPCION_CBR',
  'ENTREGADO'
]
const PASOS_SIN_PROMESA = [
  'CONFECCION_ESCRITURA',
  'FIRMA_CLIENTE_ESCRITURA',
  'FIRMA_INMOBILIARIA_ESCRITURA',
  'INSCRIPCION_CBR',
  'ENTREGADO'
]

const FECHA_POR_PASO = {
  CONFECCION_PROMESA:           'fechaLimiteConfeccionPromesa',
  FIRMA_CLIENTE_PROMESA:        'fechaLimiteFirmaCliente',
  FIRMA_INMOBILIARIA_PROMESA:   'fechaLimiteFirmaInmob',
  CONFECCION_ESCRITURA:         'fechaLimiteEscritura',
  FIRMA_CLIENTE_ESCRITURA:      'fechaLimiteFirmaNot',
  FIRMA_INMOBILIARIA_ESCRITURA: 'fechaLimiteFirmaInmobEscritura',
  INSCRIPCION_CBR:              'fechaLimiteCBR',
  ENTREGADO:                    'fechaLimiteEntrega',
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/ventas/Legal.jsx
git commit -m "feat: Legal.jsx — 8 nuevos pasos con labels y fechas actualizadas"
```

---

## Task 7: Actualizar VentaDetalle.jsx

**Files:**
- Modify: `frontend/src/pages/ventas/VentaDetalle.jsx`

- [ ] **Step 1: Reemplazar constantes al inicio del archivo (líneas 22-40)**

```js
const LEGAL_LABEL = {
  CONFECCION_PROMESA:           'Confección promesa',
  FIRMA_CLIENTE_PROMESA:        'Firma cliente',
  FIRMA_INMOBILIARIA_PROMESA:   'Firma inmobiliaria',
  CONFECCION_ESCRITURA:         'Confección escritura',
  FIRMA_CLIENTE_ESCRITURA:      'Firma cliente',
  FIRMA_INMOBILIARIA_ESCRITURA: 'Firma inmobiliaria',
  INSCRIPCION_CBR:              'CBR',
  ENTREGADO:                    'Entregado',
}
const PASOS_CON_PROMESA = [
  'CONFECCION_PROMESA',
  'FIRMA_CLIENTE_PROMESA',
  'FIRMA_INMOBILIARIA_PROMESA',
  'CONFECCION_ESCRITURA',
  'FIRMA_CLIENTE_ESCRITURA',
  'FIRMA_INMOBILIARIA_ESCRITURA',
  'INSCRIPCION_CBR',
  'ENTREGADO'
]
const PASOS_SIN_PROMESA = [
  'CONFECCION_ESCRITURA',
  'FIRMA_CLIENTE_ESCRITURA',
  'FIRMA_INMOBILIARIA_ESCRITURA',
  'INSCRIPCION_CBR',
  'ENTREGADO'
]

const FECHA_POR_PASO = {
  CONFECCION_PROMESA:           'fechaLimiteConfeccionPromesa',
  FIRMA_CLIENTE_PROMESA:        'fechaLimiteFirmaCliente',
  FIRMA_INMOBILIARIA_PROMESA:   'fechaLimiteFirmaInmob',
  CONFECCION_ESCRITURA:         'fechaLimiteEscritura',
  FIRMA_CLIENTE_ESCRITURA:      'fechaLimiteFirmaNot',
  FIRMA_INMOBILIARIA_ESCRITURA: 'fechaLimiteFirmaInmobEscritura',
  INSCRIPCION_CBR:              'fechaLimiteCBR',
  ENTREGADO:                    'fechaLimiteEntrega',
}
```

- [ ] **Step 2: Actualizar form del ModalLegal (líneas 283-344)**

Reemplazar el bloque `initialValues` y el JSX de fechas:

```jsx
<Form form={form} layout="vertical" style={{ marginTop: 16 }} initialValues={{
  estadoActual: proceso?.estadoActual,
  tienePromesa: proceso?.tienePromesa !== false,
  fechaLimiteConfeccionPromesa:  toDateStr(proceso?.fechaLimiteConfeccionPromesa),
  fechaLimiteFirmaCliente:       toDateStr(proceso?.fechaLimiteFirmaCliente),
  fechaLimiteFirmaInmob:         toDateStr(proceso?.fechaLimiteFirmaInmob),
  fechaLimiteEscritura:          toDateStr(proceso?.fechaLimiteEscritura),
  fechaLimiteFirmaNot:           toDateStr(proceso?.fechaLimiteFirmaNot),
  fechaLimiteFirmaInmobEscritura: toDateStr(proceso?.fechaLimiteFirmaInmobEscritura),
  fechaLimiteCBR:                toDateStr(proceso?.fechaLimiteCBR),
  fechaLimiteEntrega:            toDateStr(proceso?.fechaLimiteEntrega),
  notas: proceso?.notas,
}}>
  <Row gutter={12}>
    <Col span={16}>
      <Form.Item name="estadoActual" label="Paso actual">
        <Select options={pasos.map(p => ({ value: p, label: LEGAL_LABEL[p] }))} />
      </Form.Item>
    </Col>
    <Col span={8}>
      <Form.Item name="tienePromesa" label="¿Tiene promesa?">
        <Select options={[{ value: true, label: 'Sí' }, { value: false, label: 'No' }]} />
      </Form.Item>
    </Col>
  </Row>
  <Divider orientation="left" plain style={{ fontSize: 12, color: '#8c8c8c' }}>Promesa</Divider>
  {proceso?.tienePromesa !== false && (
    <Row gutter={12}>
      <Col span={8}>
        <Form.Item name="fechaLimiteConfeccionPromesa" label="Confección promesa">
          <Input type="date" />
        </Form.Item>
      </Col>
      <Col span={8}>
        <Form.Item name="fechaLimiteFirmaCliente" label="Firma cliente">
          <Input type="date" />
        </Form.Item>
      </Col>
      <Col span={8}>
        <Form.Item name="fechaLimiteFirmaInmob" label="Firma inmobiliaria">
          <Input type="date" />
        </Form.Item>
      </Col>
    </Row>
  )}
  <Divider orientation="left" plain style={{ fontSize: 12, color: '#8c8c8c' }}>Escritura</Divider>
  <Row gutter={12}>
    <Col span={8}>
      <Form.Item name="fechaLimiteEscritura" label="Confección escritura">
        <Input type="date" />
      </Form.Item>
    </Col>
    <Col span={8}>
      <Form.Item name="fechaLimiteFirmaNot" label="Firma cliente">
        <Input type="date" />
      </Form.Item>
    </Col>
    <Col span={8}>
      <Form.Item name="fechaLimiteFirmaInmobEscritura" label="Firma inmobiliaria">
        <Input type="date" />
      </Form.Item>
    </Col>
  </Row>
  <Divider orientation="left" plain style={{ fontSize: 12, color: '#8c8c8c' }}>Cierre</Divider>
  <Row gutter={12}>
    <Col span={12}>
      <Form.Item name="fechaLimiteCBR" label="Inscripción CBR">
        <Input type="date" />
      </Form.Item>
    </Col>
    <Col span={12}>
      <Form.Item name="fechaLimiteEntrega" label="Entrega">
        <Input type="date" />
      </Form.Item>
    </Col>
  </Row>
  <Form.Item name="notas" label="Notas">
    <Input.TextArea rows={2} />
  </Form.Item>
</Form>
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/ventas/VentaDetalle.jsx
git commit -m "feat: VentaDetalle — proceso legal con 8 pasos, form fechas reorganizado"
```

---

## Task 8: Push a Railway y verificar

- [ ] **Step 1: Push**

```bash
git push origin main
```

- [ ] **Step 2: Verificar en producción**

Abrir `Legal` en el CRM. Verificar que:
- Las 8 ventas en `CONFECCION_ESCRITURA` aparecen con el label "Confección escritura"
- Las 3 en `FIRMA_CLIENTE_PROMESA` y 3 en `FIRMA_INMOBILIARIA_PROMESA` muestran labels correctos
- El modal de actualizar proceso legal muestra las 3 secciones (Promesa / Escritura / Cierre)
- Al crear una venta nueva con promesa → proceso legal inicia en "Confección promesa"
- Al crear una venta sin promesa → proceso legal inicia en "Confección escritura"

- [ ] **Step 3: Actualizar FUNCIONALIDADES.md**

En `docs/FUNCIONALIDADES.md`, buscar la sección de Proceso Legal y actualizar los pasos:

```
## Proceso Legal
Pasos con promesa (8): Confección promesa → Firma cliente → Firma inmobiliaria → Confección escritura → Firma cliente → Firma inmobiliaria → CBR → Entregado
Pasos sin promesa (5): Confección escritura → Firma cliente → Firma inmobiliaria → CBR → Entregado
Fechas límite por paso en ProcesoLegal (8 campos).
Al crear venta con promesa → estadoActual = CONFECCION_PROMESA. Sin promesa → CONFECCION_ESCRITURA.
```

- [ ] **Step 4: Commit final**

```bash
git add docs/FUNCIONALIDADES.md
git commit -m "docs: actualizar FUNCIONALIDADES con nuevos pasos proceso legal"
git push origin main
```
