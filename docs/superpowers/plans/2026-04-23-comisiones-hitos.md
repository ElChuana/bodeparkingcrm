# Comisiones con Hitos — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar plantillas de comisión predefinidas, campo `conPromesa` en venta, split automático de pagos en hitos (promesa/escritura), y notificación al llegar a escritura.

**Architecture:** El modelo `Comision` ya tiene `montoPrimera`/`montoSegunda` — se reutilizan. Se agrega `PlantillaComision` para templates y `conPromesa: Boolean` en `Venta`. El split se calcula al crear comisiones usando `pctPromesa`/`pctEscritura` de la plantilla y `conPromesa` de la venta. Notificación se dispara en `actualizarEstado` al llegar a ESCRITURA.

**Tech Stack:** Prisma (PostgreSQL Railway), Express, React + Ant Design, TanStack Query

---

## File Map

| Archivo | Cambio |
|---------|--------|
| `backend/prisma/schema.prisma` | Nuevo modelo `PlantillaComision`, campo `conPromesa` en `Venta`, valor `COMISION_ESCRITURA` en `TipoAlerta` |
| `backend/src/controllers/plantillasComisionController.js` | Nuevo — CRUD plantillas (GERENTE) |
| `backend/src/routes/plantillasComision.js` | Nuevo — rutas CRUD |
| `backend/src/index.js` | Registrar ruta `/api/plantillas-comision` |
| `backend/src/controllers/comisionesController.js` | Fix `precioUF`→`precioFinalUF`, permisos solo GERENTE en crear/editar/eliminar, calcular split con `conPromesa` |
| `backend/src/routes/comisiones.js` | Cambiar `autorizar` en POST/PUT/DELETE a solo `GERENTE` |
| `backend/src/controllers/cotizacionesController.js` | Aceptar `conPromesa` en `convertir`, pasar a `calcularComisiones`, usar `pctPromesa`/`pctEscritura` de plantilla o 50/50 default |
| `backend/src/controllers/ventasController.js` | Notificar GERENTE+JV cuando estado=ESCRITURA y hay comisiones pendientes |
| `frontend/src/pages/cotizaciones/CotizacionEditor.jsx` | Reemplazar Popconfirm de convertir por modal que pregunta `conPromesa` |
| `frontend/src/pages/ventas/VentaDetalle.jsx` | Badge con/sin promesa en header, selector de plantilla en `ModalComision`, split auto |
| `frontend/src/pages/comisiones/Comisiones.jsx` | Tab "Plantillas" solo GERENTE con CRUD de plantillas |

---

### Task 1: Schema — PlantillaComision + conPromesa + TipoAlerta

**Files:**
- Modify: `backend/prisma/schema.prisma`

- [ ] **Step 1: Agregar `COMISION_ESCRITURA` al enum `TipoAlerta`**

En `backend/prisma/schema.prisma`, localizar el enum (línea ~161):

```prisma
enum TipoAlerta {
  LLAVE_NO_DEVUELTA
  CUOTA_VENCIDA
  LEAD_SIN_ACTIVIDAD
  LEAD_ESTANCADO
  FECHA_LEGAL_PROXIMA
  ARRIENDO_POR_VENCER
  DESCUENTO_PENDIENTE
  LEAD_ETAPA_CAMBIO
  LEAD_NUEVO
  RECORDATORIO_LEAD
  COMISION_ESCRITURA
}
```

- [ ] **Step 2: Agregar campo `conPromesa` al modelo `Venta`**

En el modelo `Venta`, después de `notas  String?`:

```prisma
  notas                 String?
  conPromesa            Boolean     @default(true)
  creadoEn              DateTime    @default(now())
```

- [ ] **Step 3: Agregar modelo `PlantillaComision`**

Después del modelo `Comision` (línea ~530):

```prisma
model PlantillaComision {
  id           Int      @id @default(autoincrement())
  nombre       String
  concepto     String
  porcentaje   Float?
  montoFijo    Float?
  pctPromesa   Float    @default(50)
  pctEscritura Float    @default(50)
  activa       Boolean  @default(true)
  creadoEn     DateTime @default(now())

  @@map("plantillas_comision")
}
```

- [ ] **Step 4: Aplicar schema a BD**

```bash
cd /Users/juana/Documents/bodeparkingcrm/backend
DATABASE_URL="postgresql://bodeparking:bodeparking2026!@monorail.proxy.rlwy.net:35865/bodeparkingcrm" npx prisma db push
```

Expected: `Your database is now in sync with your Prisma schema.`

- [ ] **Step 5: Commit**

```bash
git add backend/prisma/schema.prisma
git commit -m "feat: schema PlantillaComision + conPromesa en Venta + TipoAlerta.COMISION_ESCRITURA"
```

---

### Task 2: Backend — PlantillaComision CRUD

**Files:**
- Create: `backend/src/controllers/plantillasComisionController.js`
- Create: `backend/src/routes/plantillasComision.js`
- Modify: `backend/src/index.js`

- [ ] **Step 1: Crear controlador**

Crear `backend/src/controllers/plantillasComisionController.js`:

```javascript
const prisma = require('../lib/prisma')

const listar = async (req, res) => {
  try {
    const plantillas = await prisma.plantillaComision.findMany({
      orderBy: { creadoEn: 'asc' }
    })
    res.json(plantillas)
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener plantillas.' })
  }
}

const crear = async (req, res) => {
  const { nombre, concepto, porcentaje, montoFijo, pctPromesa, pctEscritura, activa } = req.body
  if (!nombre || !concepto) return res.status(400).json({ error: 'nombre y concepto son requeridos.' })
  if (porcentaje == null && montoFijo == null) return res.status(400).json({ error: 'Debe indicar porcentaje o montoFijo.' })
  const pProm = pctPromesa != null ? Number(pctPromesa) : 50
  const pEsc = pctEscritura != null ? Number(pctEscritura) : 50
  if (Math.round(pProm + pEsc) !== 100) return res.status(400).json({ error: 'pctPromesa + pctEscritura debe sumar 100.' })
  try {
    const plantilla = await prisma.plantillaComision.create({
      data: {
        nombre,
        concepto,
        porcentaje: porcentaje != null ? Number(porcentaje) : null,
        montoFijo: montoFijo != null ? Number(montoFijo) : null,
        pctPromesa: pProm,
        pctEscritura: pEsc,
        activa: activa !== undefined ? Boolean(activa) : true
      }
    })
    res.status(201).json(plantilla)
  } catch (err) {
    res.status(500).json({ error: 'Error al crear plantilla.' })
  }
}

const actualizar = async (req, res) => {
  const { id } = req.params
  const { nombre, concepto, porcentaje, montoFijo, pctPromesa, pctEscritura, activa } = req.body
  if (pctPromesa != null && pctEscritura != null) {
    if (Math.round(Number(pctPromesa) + Number(pctEscritura)) !== 100) {
      return res.status(400).json({ error: 'pctPromesa + pctEscritura debe sumar 100.' })
    }
  }
  try {
    const plantilla = await prisma.plantillaComision.update({
      where: { id: Number(id) },
      data: {
        ...(nombre !== undefined && { nombre }),
        ...(concepto !== undefined && { concepto }),
        ...(porcentaje !== undefined && { porcentaje: porcentaje != null ? Number(porcentaje) : null }),
        ...(montoFijo !== undefined && { montoFijo: montoFijo != null ? Number(montoFijo) : null }),
        ...(pctPromesa !== undefined && { pctPromesa: Number(pctPromesa) }),
        ...(pctEscritura !== undefined && { pctEscritura: Number(pctEscritura) }),
        ...(activa !== undefined && { activa: Boolean(activa) }),
      }
    })
    res.json(plantilla)
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Plantilla no encontrada.' })
    res.status(500).json({ error: 'Error al actualizar plantilla.' })
  }
}

const eliminar = async (req, res) => {
  const { id } = req.params
  try {
    await prisma.plantillaComision.delete({ where: { id: Number(id) } })
    res.json({ ok: true })
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Plantilla no encontrada.' })
    res.status(500).json({ error: 'Error al eliminar plantilla.' })
  }
}

module.exports = { listar, crear, actualizar, eliminar }
```

- [ ] **Step 2: Crear rutas**

Crear `backend/src/routes/plantillasComision.js`:

```javascript
const express = require('express')
const router = express.Router()
const { listar, crear, actualizar, eliminar } = require('../controllers/plantillasComisionController')
const { autenticar, autorizar } = require('../middleware/auth')

router.use(autenticar)
router.use(autorizar('GERENTE', 'JEFE_VENTAS'))

router.get('/', listar)
router.post('/', autorizar('GERENTE'), crear)
router.put('/:id', autorizar('GERENTE'), actualizar)
router.delete('/:id', autorizar('GERENTE'), eliminar)

module.exports = router
```

- [ ] **Step 3: Registrar ruta en index.js**

En `backend/src/index.js`, buscar la línea `app.use('/api/ventas', ...)` y agregar debajo:

```javascript
app.use('/api/plantillas-comision', require('./routes/plantillasComision'))
```

- [ ] **Step 4: Verificar manualmente**

```bash
cd /Users/juana/Documents/bodeparkingcrm/backend
node -e "const p = require('./src/controllers/plantillasComisionController'); console.log(Object.keys(p))"
```

Expected: `[ 'listar', 'crear', 'actualizar', 'eliminar' ]`

- [ ] **Step 5: Commit**

```bash
git add backend/src/controllers/plantillasComisionController.js backend/src/routes/plantillasComision.js backend/src/index.js
git commit -m "feat: CRUD PlantillaComision solo GERENTE"
```

---

### Task 3: Fix comisionesController — permisos + campo precio + split con conPromesa

**Files:**
- Modify: `backend/src/controllers/comisionesController.js`
- Modify: `backend/src/routes/comisiones.js`

**Context:** `comisionesController.js` tiene un bug: usa `precioUF` y `descuentoUF` que ya no existen en el modelo `Venta`. El campo correcto es `precioFinalUF`. Además, el split `montoPrimera`/`montoSegunda` debe respetar `venta.conPromesa`: si es `false`, todo va a `montoSegunda`.

- [ ] **Step 1: Actualizar `listar` — fix campo precioUF**

En `comisionesController.js`, la función `listar` tiene `select: { precioUF: true }` en la línea ~27. Reemplazar:

```javascript
        venta: {
          select: {
            id: true, estado: true, precioFinalUF: true,
            unidades: { select: { numero: true, tipo: true, edificio: { select: { nombre: true } } } },
            comprador: { select: { nombre: true, apellido: true } }
          }
        }
```

- [ ] **Step 2: Actualizar `crear` — fix precio + permisos + conPromesa**

Reemplazar la función `crear` completa:

```javascript
const crear = async (req, res) => {
  const { ventaId, usuarioId, concepto, porcentaje, montoFijo, montoPrimera, montoSegunda } = req.body

  if (!ventaId || !usuarioId) {
    return res.status(400).json({ error: 'Se requiere ventaId y usuarioId.' })
  }
  if (porcentaje == null && montoFijo == null) {
    return res.status(400).json({ error: 'Debe indicar porcentaje o monto fijo.' })
  }

  try {
    const venta = await prisma.venta.findUnique({
      where: { id: Number(ventaId) },
      select: { precioFinalUF: true, estado: true, conPromesa: true }
    })
    if (!venta) return res.status(404).json({ error: 'Venta no encontrada.' })
    if (venta.estado === 'ANULADO') return res.status(400).json({ error: 'No se pueden crear comisiones para ventas anuladas.' })

    const total = calcularMontos(venta.precioFinalUF, porcentaje != null ? Number(porcentaje) : null, montoFijo != null ? Number(montoFijo) : null)

    let primera, segunda
    if (montoPrimera != null && montoSegunda != null) {
      // usuario pasó valores manuales explícitos
      primera = Number(montoPrimera)
      segunda = Number(montoSegunda)
    } else if (!venta.conPromesa) {
      // directo a escritura: 100% en segunda
      primera = 0
      segunda = total
    } else {
      // con promesa: 50/50 default (o lo que venga del frontend)
      primera = montoPrimera != null ? Number(montoPrimera) : total / 2
      segunda = montoSegunda != null ? Number(montoSegunda) : total / 2
    }

    const comision = await prisma.comision.create({
      data: {
        ventaId: Number(ventaId),
        usuarioId: Number(usuarioId),
        concepto: concepto || null,
        porcentaje: porcentaje != null ? Number(porcentaje) : null,
        montoFijo: montoFijo != null ? Number(montoFijo) : null,
        montoCalculadoUF: total,
        montoPrimera: primera,
        montoSegunda: segunda,
      },
      include: { usuario: { select: { nombre: true, apellido: true, rol: true } } }
    })
    res.status(201).json(comision)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al crear comisión.' })
  }
}
```

- [ ] **Step 3: Actualizar `editar` — fix precio**

Reemplazar el `include` en `editar` y el cálculo de `precioFinal`:

```javascript
    const comision = await prisma.comision.findUnique({
      where: { id: Number(id) },
      include: { venta: { select: { precioFinalUF: true, conPromesa: true } } }
    })
    if (!comision) return res.status(404).json({ error: 'Comisión no encontrada.' })

    const newPct = porcentaje != null ? Number(porcentaje) : null
    const newFijo = montoFijo != null ? Number(montoFijo) : null

    const total = (newPct != null || newFijo != null)
      ? calcularMontos(comision.venta.precioFinalUF, newPct, newFijo)
      : comision.montoCalculadoUF

    let primera, segunda
    if (montoPrimera != null && montoSegunda != null) {
      primera = Number(montoPrimera)
      segunda = Number(montoSegunda)
    } else if (!comision.venta.conPromesa) {
      primera = 0
      segunda = total
    } else {
      primera = montoPrimera != null ? Number(montoPrimera) : total / 2
      segunda = montoSegunda != null ? Number(montoSegunda) : total / 2
    }
```

- [ ] **Step 4: Actualizar `resumen` — fix campo precioUF (no usa precioUF, pero verificar)**

La función `resumen` no usa `precioUF` — no necesita cambio.

- [ ] **Step 5: Actualizar rutas — GERENTE solo para crear/editar/eliminar**

En `backend/src/routes/comisiones.js`, reemplazar el contenido completo:

```javascript
const express = require('express')
const router = express.Router()
const { listar, crear, editar, eliminar, marcarPrimeraPagada, marcarSegundaPagada, resumen } = require('../controllers/comisionesController')
const { autenticar, autorizar } = require('../middleware/auth')

router.use(autenticar)

router.get('/', autorizar('GERENTE', 'JEFE_VENTAS'), listar)
router.get('/resumen', autorizar('GERENTE', 'JEFE_VENTAS'), resumen)
router.post('/', autorizar('GERENTE'), crear)
router.put('/:id', autorizar('GERENTE'), editar)
router.delete('/:id', autorizar('GERENTE'), eliminar)
router.put('/:id/primera', autorizar('GERENTE', 'JEFE_VENTAS'), marcarPrimeraPagada)
router.put('/:id/segunda', autorizar('GERENTE', 'JEFE_VENTAS'), marcarSegundaPagada)

module.exports = router
```

- [ ] **Step 6: Eliminar checks de rol duplicados en el controlador**

En `comisionesController.js`, eliminar estas líneas de `crear`, `editar`, y `eliminar` (ya no son necesarias, el middleware de ruta lo maneja):

```javascript
// Eliminar de crear():
  if (!['GERENTE', 'JEFE_VENTAS'].includes(req.usuario.rol)) {
    return res.status(403).json({ error: 'Acceso denegado.' })
  }

// Eliminar de editar():
  if (!['GERENTE', 'JEFE_VENTAS'].includes(req.usuario.rol)) {
    return res.status(403).json({ error: 'Acceso denegado.' })
  }

// Eliminar de eliminar():
  if (!['GERENTE', 'JEFE_VENTAS'].includes(req.usuario.rol)) {
    return res.status(403).json({ error: 'Acceso denegado.' })
  }
```

- [ ] **Step 7: Commit**

```bash
git add backend/src/controllers/comisionesController.js backend/src/routes/comisiones.js
git commit -m "fix: comisionesController usa precioFinalUF, permisos GERENTE only, split respeta conPromesa"
```

---

### Task 4: Notificación al llegar a ESCRITURA

**Files:**
- Modify: `backend/src/controllers/ventasController.js`

**Context:** En `actualizarEstado`, cuando `estado === 'ESCRITURA'`, buscar comisiones con `estadoSegunda !== 'PAGADO'` y notificar a GERENTE + JEFE_VENTAS.

- [ ] **Step 1: Agregar import de prisma (ya existe) y agregar notificación**

En `ventasController.js`, en el bloque `actualizarEstado`, después de `await prisma.lead.update(...)` para el caso ESCRITURA:

Localizar:
```javascript
    } else if (estado === 'ESCRITURA') {
      await prisma.lead.update({ where: { id: venta.leadId }, data: { etapa: 'ESCRITURA' } })
    }
```

Reemplazar con:
```javascript
    } else if (estado === 'ESCRITURA') {
      await prisma.lead.update({ where: { id: venta.leadId }, data: { etapa: 'ESCRITURA' } })

      // Notificar comisiones pendientes de escritura
      const comisionesPendientes = await prisma.comision.findMany({
        where: { ventaId: Number(id), estadoSegunda: { not: 'PAGADO' } },
        select: { id: true }
      })
      if (comisionesPendientes.length > 0) {
        const destinatarios = await prisma.usuario.findMany({
          where: { activo: true, rol: { in: ['GERENTE', 'JEFE_VENTAS'] } },
          select: { id: true }
        })
        if (destinatarios.length > 0) {
          await prisma.notificacion.createMany({
            data: destinatarios.map(u => ({
              usuarioId: u.id,
              tipo: 'COMISION_ESCRITURA',
              mensaje: `Venta #${id} llegó a escritura. ${comisionesPendientes.length} comisión(es) pendiente(s) de pago.`,
              referenciaId: Number(id),
              referenciaTipo: 'venta'
            })),
            skipDuplicates: true
          })
        }
      }
    }
```

- [ ] **Step 2: Verificar sintaxis**

```bash
cd /Users/juana/Documents/bodeparkingcrm/backend
node -e "require('./src/controllers/ventasController'); console.log('OK')"
```

Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add backend/src/controllers/ventasController.js
git commit -m "feat: notificación COMISION_ESCRITURA al llegar a estado escritura"
```

---

### Task 5: convertir — aceptar conPromesa + usar en calcularComisiones

**Files:**
- Modify: `backend/src/controllers/cotizacionesController.js`

**Context:** La función `convertir` crea la venta y llama `calcularComisiones`. Debe aceptar `conPromesa` en el body y guardarlo en la venta. La función `calcularComisiones` debe usar `conPromesa` para el split (si `false` → 100% en montoSegunda).

- [ ] **Step 1: Agregar `conPromesa` al crear la venta en `convertir`**

En la función `convertir`, localizar:
```javascript
      const nuevaVenta = await tx.venta.create({
        data: {
          leadId: cotizacion.lead.id,
```

Agregar `conPromesa` en el destructuring del body al inicio de la función:
```javascript
const convertir = async (req, res) => {
  const { id } = req.params
  const { conPromesa = true } = req.body
```

Y en el `tx.venta.create`:
```javascript
      const nuevaVenta = await tx.venta.create({
        data: {
          leadId: cotizacion.lead.id,
          compradorId: cotizacion.lead.contactoId,
          vendedorId: cotizacion.lead.vendedorId || null,
          brokerId: cotizacion.lead.brokerId || null,
          gerenteId,
          cotizacionOrigenId: cotizacion.id,
          precioListaUF,
          descuentoPacksUF,
          descuentoAprobadoUF,
          precioFinalUF,
          estado: 'RESERVA',
          fechaReserva: new Date(),
          conPromesa: Boolean(conPromesa)
        }
      })
```

- [ ] **Step 2: Actualizar `calcularComisiones` para usar `conPromesa`**

Reemplazar la función `calcularComisiones` completa:

```javascript
async function calcularComisiones(ventaId, precioFinalUF, lead) {
  const venta = await prisma.venta.findUnique({
    where: { id: ventaId },
    select: { vendedorId: true, brokerId: true, gerenteId: true, conPromesa: true }
  })

  const conPromesa = venta.conPromesa

  const splitMontos = (total) => {
    if (!conPromesa) return { montoPrimera: 0, montoSegunda: total }
    return { montoPrimera: total / 2, montoSegunda: total / 2 }
  }

  const comisionesACrear = []

  if (venta.vendedorId) {
    const vendedor = await prisma.usuario.findUnique({ where: { id: venta.vendedorId }, select: { comisionPorcentaje: true } })
    if (vendedor?.comisionPorcentaje) {
      const total = (precioFinalUF * vendedor.comisionPorcentaje) / 100
      const { montoPrimera, montoSegunda } = splitMontos(total)
      comisionesACrear.push({ ventaId, usuarioId: venta.vendedorId, concepto: 'Vendedor', porcentaje: vendedor.comisionPorcentaje, montoCalculadoUF: total, montoPrimera, montoSegunda })
    }
  }

  if (venta.brokerId) {
    const broker = await prisma.usuario.findUnique({ where: { id: venta.brokerId }, select: { comisionPorcentaje: true } })
    if (broker?.comisionPorcentaje) {
      const total = (precioFinalUF * broker.comisionPorcentaje) / 100
      const { montoPrimera, montoSegunda } = splitMontos(total)
      comisionesACrear.push({ ventaId, usuarioId: venta.brokerId, concepto: 'Broker', porcentaje: broker.comisionPorcentaje, montoCalculadoUF: total, montoPrimera, montoSegunda })
    }
  }

  const jefes = await prisma.usuario.findMany({ where: { rol: 'JEFE_VENTAS', activo: true }, select: { id: true, comisionPorcentaje: true } })
  for (const jefe of jefes) {
    const pct = jefe.id === venta.vendedorId ? (jefe.comisionPorcentaje || 4) : 1
    const total = (precioFinalUF * pct) / 100
    const { montoPrimera, montoSegunda } = splitMontos(total)
    comisionesACrear.push({ ventaId, usuarioId: jefe.id, concepto: 'Jefe de Ventas', porcentaje: pct, montoCalculadoUF: total, montoPrimera, montoSegunda })
  }

  if (comisionesACrear.length > 0) {
    await prisma.comision.createMany({ data: comisionesACrear })
  }
}
```

- [ ] **Step 3: Verificar sintaxis**

```bash
cd /Users/juana/Documents/bodeparkingcrm/backend
node -e "require('./src/controllers/cotizacionesController'); console.log('OK')"
```

Expected: `OK`

- [ ] **Step 4: Commit**

```bash
git add backend/src/controllers/cotizacionesController.js
git commit -m "feat: convertir acepta conPromesa, calcularComisiones usa split basado en conPromesa"
```

---

### Task 6: Frontend — CotizacionEditor pregunta conPromesa al convertir

**Files:**
- Modify: `frontend/src/pages/cotizaciones/CotizacionEditor.jsx`

**Context:** La línea ~665 tiene `const convertir = useMutation(...)` que llama `api.post('/cotizaciones/${id}/convertir')` sin body. Hay un `Popconfirm` en línea ~713 que confirma la conversión. Necesitamos reemplazarlo por un modal que pregunta "¿Esta venta tiene promesa?".

- [ ] **Step 1: Agregar estado para modal de conversión**

En `CotizacionEditor.jsx`, en la sección de estados (cerca de los `useState` existentes), agregar:

```javascript
  const [modalConvertir, setModalConvertir] = useState(false)
  const [conPromesa, setConPromesa] = useState(true)
```

- [ ] **Step 2: Actualizar mutationFn de convertir para enviar conPromesa**

Localizar:
```javascript
  const convertir = useMutation({
    mutationFn: () => api.post(`/cotizaciones/${id}/convertir`),
```

Reemplazar:
```javascript
  const convertir = useMutation({
    mutationFn: (conPromesaVal) => api.post(`/cotizaciones/${id}/convertir`, { conPromesa: conPromesaVal }),
```

- [ ] **Step 3: Actualizar onConfirm para abrir modal en vez de Popconfirm**

Localizar el bloque Popconfirm (~línea 713):
```javascript
            <Popconfirm
              title="Convertir cotización a venta"
              description={`¿Confirmas la conversión? Se creará la venta con precio final ${(cotizacion?.precioFinalUF || 0).toFixed(2)} UF.`}
              onConfirm={() => convertir.mutate()}
              okText="Sí, convertir"
              cancelText="Cancelar"
            >
              <Button
                type="primary"
                icon={<ShoppingOutlined />}
                loading={convertir.isPending}
              >
                Convertir a Venta
              </Button>
            </Popconfirm>
```

Reemplazar con:
```javascript
            <>
              <Button
                type="primary"
                icon={<ShoppingOutlined />}
                loading={convertir.isPending}
                onClick={() => { setConPromesa(true); setModalConvertir(true) }}
              >
                Convertir a Venta
              </Button>
              <Modal
                title="Convertir cotización a venta"
                open={modalConvertir}
                onCancel={() => setModalConvertir(false)}
                onOk={() => { setModalConvertir(false); convertir.mutate(conPromesa) }}
                okText="Confirmar venta"
                cancelText="Cancelar"
                confirmLoading={convertir.isPending}
              >
                <p style={{ marginBottom: 16 }}>
                  Precio final: <strong>{(cotizacion?.precioFinalUF || 0).toFixed(2)} UF</strong>
                </p>
                <Form layout="vertical">
                  <Form.Item
                    label="¿Esta venta tiene etapa de promesa?"
                    help="Afecta cómo se dividen las comisiones entre promesa y escritura."
                  >
                    <Radio.Group value={conPromesa} onChange={e => setConPromesa(e.target.value)}>
                      <Radio value={true}>Sí, tiene promesa (split 50/50)</Radio>
                      <Radio value={false}>No, directo a escritura (100% en escritura)</Radio>
                    </Radio.Group>
                  </Form.Item>
                </Form>
              </Modal>
            </>
```

- [ ] **Step 4: Verificar que `Modal`, `Form`, `Radio` están importados**

Buscar la línea de imports de antd en `CotizacionEditor.jsx`. Agregar `Modal`, `Form`, `Radio` si no están:

```javascript
import { ..., Modal, Form, Radio } from 'antd'
```

- [ ] **Step 5: Verificar en browser**

Abrir una cotización en estado BORRADOR o ENVIADA con unidades. Hacer click en "Convertir a Venta". Debe aparecer un modal con la pregunta de promesa. Seleccionar una opción y confirmar. La venta debe crearse.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/cotizaciones/CotizacionEditor.jsx
git commit -m "feat: modal conPromesa al convertir cotización a venta"
```

---

### Task 7: Frontend — VentaDetalle: badge conPromesa + selector plantilla en ModalComision

**Files:**
- Modify: `frontend/src/pages/ventas/VentaDetalle.jsx`

**Context:** `VentaDetalle.jsx` tiene `ModalComision` (~línea 516) y `Comisiones` (~línea 662). El badge va en el header de la venta. El selector de plantilla va al inicio del modal.

- [ ] **Step 1: Agregar badge conPromesa en el header de VentaDetalle**

Buscar en `VentaDetalle.jsx` el área donde se muestra el estado de la venta (hay Tags con el estado). Agregar cerca del badge de estado:

```javascript
{venta.conPromesa !== undefined && (
  <Tag color={venta.conPromesa ? 'blue' : 'orange'}>
    {venta.conPromesa ? 'Con promesa' : 'Directo a escritura'}
  </Tag>
)}
```

Colocar junto a los otros Tags del header (buscar `<Tag color=` cerca del título de la venta).

- [ ] **Step 2: Agregar query de plantillas en ModalComision**

En la función `ModalComision` (~línea 516), después del `useQuery` de usuarios, agregar:

```javascript
  const { data: plantillas = [] } = useQuery({
    queryKey: ['plantillas-comision'],
    queryFn: () => api.get('/plantillas-comision').then(r => r.data.filter(p => p.activa)),
    enabled: open
  })
```

- [ ] **Step 3: Agregar selector de plantilla al formulario en ModalComision**

En el `<Form>` de `ModalComision`, ANTES del campo `usuarioId`, agregar:

```javascript
        {!comisionEditando && plantillas.length > 0 && (
          <Form.Item label="Aplicar plantilla (opcional)">
            <Select
              placeholder="Seleccionar plantilla..."
              allowClear
              onChange={(plantillaId) => {
                if (!plantillaId) return
                const p = plantillas.find(pl => pl.id === plantillaId)
                if (!p) return
                const tipo = p.porcentaje != null ? 'porcentaje' : 'fijo'
                setTipoCalculo(tipo)
                const precioFinal = venta?.precioFinalUF || 0
                const total = p.porcentaje != null ? (precioFinal * p.porcentaje) / 100 : (p.montoFijo || 0)
                const conPromesaVenta = venta?.conPromesa !== false
                const primera = conPromesaVenta ? +(total * p.pctPromesa / 100).toFixed(4) : 0
                const segunda = conPromesaVenta ? +(total * p.pctEscritura / 100).toFixed(4) : +total.toFixed(4)
                form.setFieldsValue({
                  concepto: p.concepto,
                  tipoCalculo: tipo,
                  porcentaje: p.porcentaje,
                  montoFijo: p.montoFijo,
                  montoPrimera: primera,
                  montoSegunda: segunda,
                })
              }}
              options={plantillas.map(p => ({
                value: p.id,
                label: `${p.nombre} — ${p.porcentaje != null ? `${p.porcentaje}%` : `${p.montoFijo} UF fijo`} (${p.pctPromesa}/${p.pctEscritura})`
              }))}
            />
          </Form.Item>
        )}
```

- [ ] **Step 4: Deshabilitar montoPrimera cuando conPromesa=false**

En el bloque de `Distribución del pago` en el formulario, modificar el campo `montoPrimera`:

```javascript
        <Row gutter={12}>
          <Col span={12}>
            <Form.Item name="montoPrimera" label="1ª parte (promesa)" rules={[{ required: true }]}>
              <InputNumber
                min={0} step={0.01} addonAfter="UF" style={{ width: '100%' }}
                disabled={venta?.conPromesa === false}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="montoSegunda" label="2ª parte (escritura)" rules={[{ required: true }]}>
              <InputNumber min={0} step={0.01} addonAfter="UF" style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>
        {venta?.conPromesa === false && (
          <Alert
            type="info"
            showIcon
            message="Esta venta no tiene promesa — el 100% se paga en escritura."
            style={{ marginBottom: 8 }}
          />
        )}
```

- [ ] **Step 5: Actualizar `recalcularSplit` para respetar conPromesa**

Localizar la función `recalcularSplit` (~línea 567):

```javascript
  const recalcularSplit = (valor, tipo) => {
    const total = tipo === 'porcentaje' ? (precioFinal * (valor || 0)) / 100 : (valor || 0)
    const conPromesaVenta = venta?.conPromesa !== false
    const primera = conPromesaVenta ? +(total / 2).toFixed(4) : 0
    const segunda = conPromesaVenta ? +(total / 2).toFixed(4) : +total.toFixed(4)
    form.setFieldsValue({ montoPrimera: primera, montoSegunda: segunda })
  }
```

- [ ] **Step 6: Verificar que `Alert` está importado en VentaDetalle.jsx**

Buscar la línea de imports de antd. `Alert` debería estar ya importado. Si no, agregarlo.

- [ ] **Step 7: Verificar en browser**

Abrir una venta. Verificar:
1. Badge "Con promesa" o "Directo a escritura" en header
2. En "Agregar comisión": dropdown de plantillas aparece, al seleccionar auto-rellena campos
3. Si venta es "Directo a escritura": campo 1ª parte está deshabilitado y en 0

- [ ] **Step 8: Commit**

```bash
git add frontend/src/pages/ventas/VentaDetalle.jsx
git commit -m "feat: badge conPromesa en VentaDetalle, selector plantilla y split automático en ModalComision"
```

---

### Task 8: Frontend — Comisiones.jsx: Tab Plantillas (solo GERENTE)

**Files:**
- Modify: `frontend/src/pages/comisiones/Comisiones.jsx`

**Context:** La página Comisiones.jsx muestra una tabla de comisiones. Agregar un tab "Plantillas" solo visible para GERENTE con tabla de plantillas + CRUD.

- [ ] **Step 1: Leer el archivo actual**

```bash
cat /Users/juana/Documents/bodeparkingcrm/frontend/src/pages/comisiones/Comisiones.jsx
```

Identificar la estructura actual (si ya tiene Tabs, agregar uno más; si no, envolver en Tabs).

- [ ] **Step 2: Agregar query de plantillas**

Al inicio del componente principal (donde se hace `useQuery`), agregar:

```javascript
  const { esGerente } = useAuth()

  const { data: plantillas = [], refetch: refetchPlantillas } = useQuery({
    queryKey: ['plantillas-comision'],
    queryFn: () => api.get('/plantillas-comision').then(r => r.data),
    enabled: esGerente
  })
```

Verificar si `useAuth` ya exporta `esGerente`. Si no, agregar:
- En `frontend/src/context/AuthContext.jsx` buscar `esGerenciaOJV` y agregar:
```javascript
  const esGerente = usuario?.rol === 'GERENTE'
```
- Exportar `esGerente` en el return del hook.

- [ ] **Step 3: Agregar mutaciones para plantillas**

```javascript
  const crearPlantilla = useMutation({
    mutationFn: (data) => api.post('/plantillas-comision', data),
    onSuccess: () => { message.success('Plantilla creada'); refetchPlantillas() },
    onError: err => message.error(err.response?.data?.error || 'Error')
  })

  const actualizarPlantilla = useMutation({
    mutationFn: ({ id, ...data }) => api.put(`/plantillas-comision/${id}`, data),
    onSuccess: () => { message.success('Plantilla actualizada'); refetchPlantillas() },
    onError: err => message.error(err.response?.data?.error || 'Error')
  })

  const eliminarPlantilla = useMutation({
    mutationFn: (id) => api.delete(`/plantillas-comision/${id}`),
    onSuccess: () => { message.success('Plantilla eliminada'); refetchPlantillas() },
    onError: err => message.error(err.response?.data?.error || 'Error')
  })
```

- [ ] **Step 4: Agregar componente ModalPlantilla**

Antes del componente principal de la página, agregar:

```javascript
function ModalPlantilla({ open, onClose, plantillaEditando, onGuardar }) {
  const [form] = Form.useForm()
  const [tipoCalculo, setTipoCalculo] = useState('porcentaje')

  const handleAfterOpen = () => {
    if (plantillaEditando) {
      const tipo = plantillaEditando.porcentaje != null ? 'porcentaje' : 'fijo'
      setTipoCalculo(tipo)
      form.setFieldsValue({
        nombre: plantillaEditando.nombre,
        concepto: plantillaEditando.concepto,
        tipoCalculo: tipo,
        porcentaje: plantillaEditando.porcentaje,
        montoFijo: plantillaEditando.montoFijo,
        pctPromesa: plantillaEditando.pctPromesa,
        pctEscritura: plantillaEditando.pctEscritura,
        activa: plantillaEditando.activa,
      })
    } else {
      setTipoCalculo('porcentaje')
      form.resetFields()
      form.setFieldsValue({ tipoCalculo: 'porcentaje', pctPromesa: 50, pctEscritura: 50, activa: true })
    }
  }

  const handleOk = () => {
    form.validateFields().then(values => {
      const data = {
        nombre: values.nombre,
        concepto: values.concepto,
        porcentaje: values.tipoCalculo === 'porcentaje' ? values.porcentaje : null,
        montoFijo: values.tipoCalculo === 'fijo' ? values.montoFijo : null,
        pctPromesa: values.pctPromesa,
        pctEscritura: values.pctEscritura,
        activa: values.activa,
      }
      onGuardar(data)
    })
  }

  return (
    <Modal
      title={plantillaEditando ? 'Editar plantilla' : 'Nueva plantilla de comisión'}
      open={open}
      onCancel={onClose}
      onOk={handleOk}
      afterOpenChange={o => o && handleAfterOpen()}
      okText="Guardar"
      cancelText="Cancelar"
    >
      <Form form={form} layout="vertical" style={{ marginTop: 12 }}>
        <Form.Item name="nombre" label="Nombre" rules={[{ required: true, message: 'Ingresa un nombre' }]}>
          <Input placeholder="Ej: Broker Estándar" />
        </Form.Item>
        <Form.Item name="concepto" label="Concepto (etiqueta)" rules={[{ required: true, message: 'Ingresa el concepto' }]}>
          <Input placeholder="Ej: BROKER, VENDEDOR INTERNO..." />
        </Form.Item>
        <Form.Item name="tipoCalculo" label="Tipo">
          <Radio.Group onChange={e => { setTipoCalculo(e.target.value); form.setFieldsValue({ porcentaje: undefined, montoFijo: undefined }) }}>
            <Radio value="porcentaje">% sobre precio venta</Radio>
            <Radio value="fijo">Monto fijo en UF</Radio>
          </Radio.Group>
        </Form.Item>
        {tipoCalculo === 'porcentaje' ? (
          <Form.Item name="porcentaje" label="Porcentaje" rules={[{ required: true, message: 'Ingresa el %' }]}>
            <InputNumber min={0} max={100} step={0.1} addonAfter="%" style={{ width: '100%' }} />
          </Form.Item>
        ) : (
          <Form.Item name="montoFijo" label="Monto fijo" rules={[{ required: true, message: 'Ingresa el monto' }]}>
            <InputNumber min={0} step={0.1} addonAfter="UF" style={{ width: '100%' }} />
          </Form.Item>
        )}
        <Divider style={{ margin: '8px 0' }}>Split de pago</Divider>
        <Row gutter={12}>
          <Col span={12}>
            <Form.Item name="pctPromesa" label="% en promesa" rules={[{ required: true }]}>
              <InputNumber
                min={0} max={100} step={5} addonAfter="%" style={{ width: '100%' }}
                onChange={v => form.setFieldValue('pctEscritura', 100 - (v || 0))}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="pctEscritura" label="% en escritura" rules={[{ required: true }]}>
              <InputNumber
                min={0} max={100} step={5} addonAfter="%" style={{ width: '100%' }}
                onChange={v => form.setFieldValue('pctPromesa', 100 - (v || 0))}
              />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item name="activa" label="Estado" valuePropName="checked">
          <Switch checkedChildren="Activa" unCheckedChildren="Inactiva" />
        </Form.Item>
      </Form>
    </Modal>
  )
}
```

- [ ] **Step 5: Agregar sección/tab de Plantillas en la UI**

Si la página usa `Tabs`, agregar un nuevo `TabPane`. Si no, envolver en `Tabs` o agregar una sección separada al final de la página.

Agregar estado para el modal:
```javascript
  const [modalPlantilla, setModalPlantilla] = useState(false)
  const [plantillaEditando, setPlantillaEditando] = useState(null)
```

Agregar JSX para la tabla de plantillas (solo si `esGerente`):

```javascript
{esGerente && (
  <Card
    title="Plantillas de comisión"
    extra={<Button size="small" icon={<PlusOutlined />} onClick={() => { setPlantillaEditando(null); setModalPlantilla(true) }}>Nueva plantilla</Button>}
    style={{ marginTop: 24 }}
  >
    <Table
      dataSource={plantillas}
      rowKey="id"
      size="small"
      columns={[
        { title: 'Nombre', dataIndex: 'nombre' },
        { title: 'Concepto', dataIndex: 'concepto' },
        { title: 'Comisión', render: (_, r) => r.porcentaje != null ? `${r.porcentaje}%` : `${r.montoFijo} UF` },
        { title: 'Split promesa/escritura', render: (_, r) => `${r.pctPromesa}% / ${r.pctEscritura}%` },
        { title: 'Estado', render: (_, r) => <Tag color={r.activa ? 'green' : 'default'}>{r.activa ? 'Activa' : 'Inactiva'}</Tag> },
        {
          title: 'Acciones', render: (_, r) => (
            <Space size={4}>
              <Button size="small" icon={<EditOutlined />} onClick={() => { setPlantillaEditando(r); setModalPlantilla(true) }} />
              <Popconfirm title="¿Eliminar esta plantilla?" onConfirm={() => eliminarPlantilla.mutate(r.id)} okText="Eliminar" cancelText="Cancelar" okButtonProps={{ danger: true }}>
                <Button size="small" danger icon={<DeleteOutlined />} />
              </Popconfirm>
            </Space>
          )
        }
      ]}
    />
    <ModalPlantilla
      open={modalPlantilla}
      onClose={() => { setModalPlantilla(false); setPlantillaEditando(null) }}
      plantillaEditando={plantillaEditando}
      onGuardar={(data) => {
        if (plantillaEditando) {
          actualizarPlantilla.mutate({ id: plantillaEditando.id, ...data }, { onSuccess: () => { setModalPlantilla(false); setPlantillaEditando(null) } })
        } else {
          crearPlantilla.mutate(data, { onSuccess: () => { setModalPlantilla(false) } })
        }
      }}
    />
  </Card>
)}
```

- [ ] **Step 6: Verificar imports necesarios**

Asegurarse que en `Comisiones.jsx` están importados: `Form`, `Input`, `InputNumber`, `Radio`, `Switch`, `Divider`, `Modal`, `Popconfirm`, `Tag`, `Row`, `Col`, `PlusOutlined`, `EditOutlined`, `DeleteOutlined`. Agregar los que falten.

- [ ] **Step 7: Verificar en browser**

Logear como GERENTE. En `/comisiones` debe verse la sección "Plantillas de comisión". Crear una plantilla, editarla, activar/desactivar. Como JEFE_VENTAS la sección no debe aparecer.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/pages/comisiones/Comisiones.jsx frontend/src/context/AuthContext.jsx
git commit -m "feat: gestión de plantillas de comisión en página Comisiones (solo GERENTE)"
```

---

### Task 9: Push y verificación final

- [ ] **Step 1: Push a Railway**

```bash
cd /Users/juana/Documents/bodeparkingcrm
git push origin main
```

- [ ] **Step 2: Verificar deploy en Railway**

Esperar 1-2 min y verificar en el dashboard de Railway que el deploy fue exitoso.

- [ ] **Step 3: Prueba de flujo completo en producción**

1. Ir a una cotización activa → click "Convertir a Venta" → aparece modal con pregunta promesa → seleccionar "No, directo a escritura" → confirmar
2. Verificar que la venta creada muestra badge "Directo a escritura"
3. En la venta, ir a Comisiones → "Agregar" → verificar que 1ª parte está en 0 y deshabilitada
4. Agregar una comisión con plantilla → verificar split automático
5. Ir a una venta existente → cambiar estado a ESCRITURA → verificar que llega notificación a GERENTE/JV
6. En `/comisiones` como GERENTE → verificar sección Plantillas → crear una plantilla

- [ ] **Step 4: Actualizar FUNCIONALIDADES.md**

Agregar en `docs/FUNCIONALIDADES.md` en la sección de Comisiones:
- PlantillaComision: CRUD solo GERENTE
- conPromesa en Venta: campo que controla split de comisiones
- Notificación COMISION_ESCRITURA al llegar a escritura
- Selector de plantilla en ModalComision con split automático
