# Automatizaciones Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar etapa INTERESADO, rastrear motivo/etapa de pérdida, marcar pérdidas automáticas, y configurar reglas de pipeline (X días en etapa → mover a otra).

**Architecture:** Se crea un nuevo modelo `ReglaPipeline` separado de `AlertaConfig` (para evitar romper el schema único existente), pero integrado en el mismo cron y la misma página de Automatizaciones. El modelo `Lead` recibe campos para rastrear pérdidas. Un nuevo componente `ModalPerdido` intercepta cualquier movimiento manual a PERDIDO para capturar el motivo.

**Tech Stack:** Node.js/Express/Prisma (backend), React/Ant Design/TanStack Query (frontend), PostgreSQL Railway.

---

## File Structure

| Archivo | Acción |
|---|---|
| `backend/prisma/schema.prisma` | Modificar: agregar INTERESADO al enum, campos en Lead, nuevo modelo ReglaPipeline |
| `backend/src/controllers/leadsController.js` | Modificar: ORDEN_ETAPAS + ETAPA_LABEL + cambiarEtapa captura etapaAntesDePerdido/motivoPerdidaCat |
| `backend/src/controllers/alertasController.js` | Modificar: _ejecutarChequeo + endpoints CRUD para ReglaPipeline |
| `backend/src/routes/alertas.js` | Modificar: agregar rutas CRUD /reglas-pipeline |
| `backend/src/seedData.js` | Modificar: insertar reglas de pipeline por defecto |
| `frontend/src/components/ui.jsx` | Modificar: agregar INTERESADO + MOTIVO_PERDIDA_LABEL |
| `frontend/src/components/ModalPerdido.jsx` | Crear: modal de motivo de pérdida |
| `frontend/src/pages/leads/LeadDetalle.jsx` | Modificar: ETAPAS_PIPELINE + banner auto + info pérdida + trigger ModalPerdido |
| `frontend/src/pages/leads/Leads.jsx` | Modificar: handleDragEnd intercepta PERDIDO + badge auto en LeadCard |
| `frontend/src/pages/automatizaciones/Automatizaciones.jsx` | Modificar: nueva sección reglas pipeline |

---

## Task 1: Schema — INTERESADO + campos Lead + ReglaPipeline

**Files:**
- Modify: `backend/prisma/schema.prisma`

- [ ] **Step 1: Agregar INTERESADO al enum EtapaLead**

En `schema.prisma`, el enum EtapaLead actualmente tiene COTIZACION_ENVIADA seguido de VISITA_AGENDADA. Agregar INTERESADO entre ellos:

```prisma
enum EtapaLead {
  NUEVO
  NO_CONTESTA
  SEGUIMIENTO
  COTIZACION_ENVIADA
  INTERESADO
  VISITA_AGENDADA
  VISITA_REALIZADA
  SEGUIMIENTO_POST_VISITA
  NEGOCIACION
  RESERVA
  PROMESA
  ESCRITURA
  ENTREGA
  POSTVENTA
  PERDIDO
}
```

- [ ] **Step 2: Agregar campos al modelo Lead**

Dentro del model Lead, después del campo `motivoPerdida String?`:

```prisma
  motivoPerdida         String?
  etapaAntesDePerdido   EtapaLead?
  motivoPerdidaCat      String?
  motivoPerdidaNota     String?
  perdidaAutomatica     Boolean    @default(false)
  perdidaAutomaticaEn   DateTime?
```

- [ ] **Step 3: Agregar modelo ReglaPipeline al final del schema**

Después del último modelo (antes del EOF):

```prisma
model ReglaPipeline {
  id            Int      @id @default(autoincrement())
  nombre        String
  etapaOrigen   String
  etapaDestino  String
  umbralDias    Int      @default(7)
  activa        Boolean  @default(false)
  motivoAuto    String?
  creadoEn      DateTime @default(now())
  actualizadoEn DateTime @updatedAt

  @@map("reglas_pipeline")
}
```

- [ ] **Step 4: Aplicar schema a Railway**

```bash
cd backend
DATABASE_URL="postgresql://bodeparking:bodeparking2026!@monorail.proxy.rlwy.net:35865/bodeparkingcrm" npx prisma db push
DATABASE_URL="postgresql://bodeparking:bodeparking2026!@monorail.proxy.rlwy.net:35865/bodeparkingcrm" npx prisma generate
```

Expected: "Your database is now in sync with your Prisma schema." Sin errores.

- [ ] **Step 5: Commit**

```bash
git add backend/prisma/schema.prisma
git commit -m "feat: schema — INTERESADO, campos perdida en Lead, modelo ReglaPipeline"
```

---

## Task 2: Backend — leadsController actualizar etapa + INTERESADO

**Files:**
- Modify: `backend/src/controllers/leadsController.js`

- [ ] **Step 1: Actualizar ORDEN_ETAPAS y ETAPA_LABEL**

Reemplazar las constantes al inicio del archivo (líneas 18-30):

```js
const ORDEN_ETAPAS = [
  'NUEVO', 'NO_CONTESTA', 'SEGUIMIENTO', 'COTIZACION_ENVIADA', 'INTERESADO',
  'VISITA_AGENDADA', 'VISITA_REALIZADA', 'SEGUIMIENTO_POST_VISITA',
  'NEGOCIACION', 'RESERVA', 'PROMESA', 'ESCRITURA', 'ENTREGA', 'POSTVENTA', 'PERDIDO'
]

const ETAPA_LABEL = {
  NUEVO: 'Nuevo', NO_CONTESTA: 'No contesta', SEGUIMIENTO: 'Seguimiento',
  COTIZACION_ENVIADA: 'Cotización enviada', INTERESADO: 'Interesado',
  VISITA_AGENDADA: 'Visita agendada', VISITA_REALIZADA: 'Visita realizada',
  SEGUIMIENTO_POST_VISITA: 'Seguimiento post visita', NEGOCIACION: 'Negociación',
  RESERVA: 'Reserva', PROMESA: 'Promesa', ESCRITURA: 'Escritura',
  ENTREGA: 'Entrega', POSTVENTA: 'Postventa', PERDIDO: 'Perdido'
}
```

- [ ] **Step 2: Actualizar cambiarEtapa para capturar campos de pérdida**

Reemplazar la función `cambiarEtapa` completa (líneas 284-330):

```js
const cambiarEtapa = async (req, res) => {
  const { id } = req.params
  const { etapa, motivoPerdida, motivoPerdidaCat, motivoPerdidaNota } = req.body

  if (!ORDEN_ETAPAS.includes(etapa)) {
    return res.status(400).json({ error: 'Etapa inválida.' })
  }

  if (etapa === 'PERDIDO' && !motivoPerdidaCat) {
    return res.status(400).json({ error: 'Debe indicar el motivo de pérdida (motivoPerdidaCat).' })
  }

  const MOTIVOS_VALIDOS = ['NO_CONTESTA','PRECIO_ALTO','ELIGIO_COMPETENCIA','NO_CALIFICA_FINANC','NO_GUSTO_PRODUCTO','PERDIO_INTERES','OTRO']
  if (etapa === 'PERDIDO' && !MOTIVOS_VALIDOS.includes(motivoPerdidaCat)) {
    return res.status(400).json({ error: `motivoPerdidaCat inválido. Válidos: ${MOTIVOS_VALIDOS.join(', ')}` })
  }

  try {
    const lead = await prisma.lead.findFirst({
      where: { id: Number(id), ...filtroAcceso(req.usuario) },
      include: { contacto: { select: { nombre: true, apellido: true } } }
    })
    if (!lead) return res.status(404).json({ error: 'Lead no encontrado.' })

    const etapaAnterior = lead.etapa

    const dataUpdate = {
      etapa,
      ...(etapa === 'PERDIDO' && {
        etapaAntesDePerdido: etapaAnterior,
        motivoPerdidaCat,
        motivoPerdidaNota: motivoPerdidaNota || null,
        motivoPerdida: motivoPerdida || motivoPerdidaCat,
        perdidaAutomatica: false,
      })
    }

    const actualizado = await prisma.lead.update({
      where: { id: Number(id) },
      data: dataUpdate
    })

    await prisma.interaccion.create({
      data: {
        leadId: Number(id),
        usuarioId: req.usuario.id,
        tipo: 'NOTA',
        descripcion: `Etapa cambiada: ${etapaAnterior} → ${etapa}${motivoPerdidaCat ? `. Motivo: ${motivoPerdidaCat}` : ''}${motivoPerdidaNota ? ` — ${motivoPerdidaNota}` : ''}`
      }
    })

    res.json(actualizado)
    notificarLead({
      leadId: Number(id),
      mensaje: `Lead ${lead.contacto?.nombre || ''} ${lead.contacto?.apellido || ''}`.trim() + ` → ${ETAPA_LABEL[etapa] || etapa}`,
      tipo: 'LEAD_ETAPA_CAMBIO',
      excluirUsuarioId: req.usuario.id
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al cambiar etapa.' })
  }
}
```

- [ ] **Step 3: Verificar en Railway que el endpoint sigue funcionando**

```bash
# Con un lead existente (reemplazar TOKEN y LEAD_ID con valores reales)
curl -X PUT https://tu-backend.railway.app/api/leads/LEAD_ID/etapa \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"etapa":"CONTACTADO"}'
# Expected: 200 con el lead actualizado
```

- [ ] **Step 4: Commit**

```bash
git add backend/src/controllers/leadsController.js
git commit -m "feat: cambiarEtapa captura etapaAntesDePerdido y motivoPerdidaCat"
```

---

## Task 3: Backend — CRUD ReglaPipeline + handler en chequeo

**Files:**
- Modify: `backend/src/controllers/alertasController.js`
- Modify: `backend/src/routes/alertas.js`

- [ ] **Step 1: Agregar funciones CRUD de ReglaPipeline en alertasController.js**

Al final del archivo, antes de `module.exports`:

```js
// ─── CRUD ReglaPipeline ────────────────────────────────────────────
const listarReglasPipeline = async (req, res) => {
  try {
    const reglas = await prisma.reglaPipeline.findMany({ orderBy: { id: 'asc' } })
    res.json(reglas)
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener reglas.' })
  }
}

const crearReglaPipeline = async (req, res) => {
  const { nombre, etapaOrigen, etapaDestino, umbralDias, activa, motivoAuto } = req.body
  if (!nombre || !etapaOrigen || !etapaDestino || !umbralDias) {
    return res.status(400).json({ error: 'nombre, etapaOrigen, etapaDestino y umbralDias son requeridos.' })
  }
  try {
    const regla = await prisma.reglaPipeline.create({
      data: { nombre, etapaOrigen, etapaDestino, umbralDias: Number(umbralDias), activa: !!activa, motivoAuto: motivoAuto || null }
    })
    res.status(201).json(regla)
  } catch (err) {
    res.status(500).json({ error: 'Error al crear regla.' })
  }
}

const actualizarReglaPipeline = async (req, res) => {
  const { id } = req.params
  const { nombre, etapaOrigen, etapaDestino, umbralDias, activa, motivoAuto } = req.body
  try {
    const regla = await prisma.reglaPipeline.update({
      where: { id: Number(id) },
      data: {
        ...(nombre !== undefined && { nombre }),
        ...(etapaOrigen !== undefined && { etapaOrigen }),
        ...(etapaDestino !== undefined && { etapaDestino }),
        ...(umbralDias !== undefined && { umbralDias: Number(umbralDias) }),
        ...(activa !== undefined && { activa }),
        ...(motivoAuto !== undefined && { motivoAuto: motivoAuto || null }),
      }
    })
    res.json(regla)
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Regla no encontrada.' })
    res.status(500).json({ error: 'Error al actualizar regla.' })
  }
}

const eliminarReglaPipeline = async (req, res) => {
  try {
    await prisma.reglaPipeline.delete({ where: { id: Number(req.params.id) } })
    res.json({ ok: true })
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Regla no encontrada.' })
    res.status(500).json({ error: 'Error al eliminar regla.' })
  }
}
```

- [ ] **Step 2: Actualizar module.exports en alertasController.js**

Reemplazar la línea `module.exports = { ... }` al final:

```js
module.exports = {
  misNotificaciones, marcarLeida, marcarTodasLeidas,
  obtenerConfig, actualizarConfig, ejecutarChequeo,
  obtenerPreferencias, actualizarPreferencias,
  listarReglasPipeline, crearReglaPipeline, actualizarReglaPipeline, eliminarReglaPipeline
}
```

- [ ] **Step 3: Agregar handler PIPELINE_TIMEOUT en _ejecutarChequeo**

Dentro de `_ejecutarChequeo()`, después del bloque `LEAD_ESTANCADO` (antes del `return`):

```js
  // ── Reglas de Pipeline (ReglaPipeline) ────────────────────────
  const reglasPipeline = await prisma.reglaPipeline.findMany({ where: { activa: true } })

  for (const regla of reglasPipeline) {
    const fechaLimite = new Date()
    fechaLimite.setDate(fechaLimite.getDate() - regla.umbralDias)

    const leads = await prisma.lead.findMany({
      where: {
        etapa: regla.etapaOrigen,
        actualizadoEn: { lt: fechaLimite },
        etapa_not_in: undefined, // prisma workaround below
      }
    })

    // Filtrar leads que no estén en etapas finales
    const etapasFinales = ['PERDIDO', 'ENTREGA', 'POSTVENTA']
    const leadsElegibles = leads.filter(l => !etapasFinales.includes(l.etapa))

    for (const lead of leadsElegibles) {
      const dataUpdate = { etapa: regla.etapaDestino }

      if (regla.etapaDestino === 'PERDIDO') {
        dataUpdate.etapaAntesDePerdido = regla.etapaOrigen
        dataUpdate.motivoPerdidaCat = regla.motivoAuto || 'NO_CONTESTA'
        dataUpdate.motivoPerdida = `Auto: ${regla.umbralDias} días en ${regla.etapaOrigen} sin avance`
        dataUpdate.perdidaAutomatica = true
        dataUpdate.perdidaAutomaticaEn = new Date()
      }

      await prisma.lead.update({ where: { id: lead.id }, data: dataUpdate })

      await prisma.interaccion.create({
        data: {
          leadId: lead.id,
          usuarioId: gerentes[0]?.id || null,
          tipo: 'NOTA',
          descripcion: `Automatización: lead movido de ${regla.etapaOrigen} a ${regla.etapaDestino} por inactividad de ${regla.umbralDias} días (regla: ${regla.nombre})`
        }
      })

      if (lead.vendedorId) {
        await prisma.notificacion.create({
          data: {
            usuarioId: lead.vendedorId,
            tipo: 'LEAD_ESTANCADO',
            mensaje: `Lead movido automáticamente: ${regla.etapaOrigen} → ${regla.etapaDestino} (${regla.nombre})`,
            referenciaId: lead.id,
            referenciaTipo: 'lead'
          }
        })
      }

      acciones.push({ tipo: 'PIPELINE_TIMEOUT', leadId: lead.id, de: regla.etapaOrigen, a: regla.etapaDestino })
    }
  }
```

**Nota:** El `where: { etapa: regla.etapaOrigen }` ya filtra por etapa. El filtro de etapas finales es redundante si etapaOrigen nunca es PERDIDO/ENTREGA/POSTVENTA, pero es un seguro. Simplificar la query eliminando el `etapa_not_in: undefined`:

```js
    const leads = await prisma.lead.findMany({
      where: {
        etapa: regla.etapaOrigen,
        actualizadoEn: { lt: fechaLimite },
      }
    })
    const etapasFinales = ['PERDIDO', 'ENTREGA', 'POSTVENTA']
    const leadsElegibles = leads.filter(l => !etapasFinales.includes(l.etapa))
```

- [ ] **Step 4: Agregar rutas en alertas.js**

Primero leer `backend/src/routes/alertas.js` para ver la estructura. Luego agregar al final (antes de `module.exports`):

```js
const {
  listarReglasPipeline, crearReglaPipeline,
  actualizarReglaPipeline, eliminarReglaPipeline
} = require('../controllers/alertasController')

// Rutas solo para GERENTE/JEFE_VENTAS
router.get('/reglas-pipeline', autenticar, autorizar('GERENTE', 'JEFE_VENTAS'), listarReglasPipeline)
router.post('/reglas-pipeline', autenticar, autorizar('GERENTE', 'JEFE_VENTAS'), crearReglaPipeline)
router.put('/reglas-pipeline/:id', autenticar, autorizar('GERENTE', 'JEFE_VENTAS'), actualizarReglaPipeline)
router.delete('/reglas-pipeline/:id', autenticar, autorizar('GERENTE', 'JEFE_VENTAS'), eliminarReglaPipeline)
```

- [ ] **Step 5: Commit**

```bash
git add backend/src/controllers/alertasController.js backend/src/routes/alertas.js
git commit -m "feat: CRUD ReglaPipeline + handler PIPELINE_TIMEOUT en chequeo automático"
```

---

## Task 4: Backend — Seed reglas pipeline por defecto

**Files:**
- Modify: `backend/src/seedData.js`

- [ ] **Step 1: Agregar seed de reglas pipeline**

En `seedData.js`, después del bloque de alertas (después de la línea con `DESCUENTO_PENDIENTE`):

```js
  // ─── REGLAS PIPELINE ──────────────────────────────────────────
  const reglasPipeline = [
    { nombre: 'Nuevo sin contacto', etapaOrigen: 'NUEVO', etapaDestino: 'NO_CONTESTA', umbralDias: 3, activa: false },
    { nombre: 'No contesta → Perdido', etapaOrigen: 'NO_CONTESTA', etapaDestino: 'PERDIDO', umbralDias: 14, activa: false, motivoAuto: 'NO_CONTESTA' },
    { nombre: 'Cotización sin respuesta → Interesado', etapaOrigen: 'COTIZACION_ENVIADA', etapaDestino: 'INTERESADO', umbralDias: 5, activa: false },
    { nombre: 'Visita sin seguimiento', etapaOrigen: 'VISITA_REALIZADA', etapaDestino: 'SEGUIMIENTO_POST_VISITA', umbralDias: 3, activa: false },
    { nombre: 'Negociación estancada', etapaOrigen: 'NEGOCIACION', etapaDestino: 'PERDIDO', umbralDias: 21, activa: false, motivoAuto: 'PERDIO_INTERES' },
  ]
  for (const r of reglasPipeline) {
    const existe = await prisma.reglaPipeline.findFirst({ where: { etapaOrigen: r.etapaOrigen, etapaDestino: r.etapaDestino } })
    if (!existe) await prisma.reglaPipeline.create({ data: r })
  }
  console.log('✅ Reglas pipeline creadas')
```

- [ ] **Step 2: Ejecutar seed en Railway**

```bash
cd backend
DATABASE_URL="postgresql://bodeparking:bodeparking2026!@monorail.proxy.rlwy.net:35865/bodeparkingcrm" node -e "
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
const reglas = [
  { nombre: 'Nuevo sin contacto', etapaOrigen: 'NUEVO', etapaDestino: 'NO_CONTESTA', umbralDias: 3, activa: false },
  { nombre: 'No contesta → Perdido', etapaOrigen: 'NO_CONTESTA', etapaDestino: 'PERDIDO', umbralDias: 14, activa: false, motivoAuto: 'NO_CONTESTA' },
  { nombre: 'Cotización sin respuesta', etapaOrigen: 'COTIZACION_ENVIADA', etapaDestino: 'INTERESADO', umbralDias: 5, activa: false },
  { nombre: 'Visita sin seguimiento', etapaOrigen: 'VISITA_REALIZADA', etapaDestino: 'SEGUIMIENTO_POST_VISITA', umbralDias: 3, activa: false },
  { nombre: 'Negociación estancada', etapaOrigen: 'NEGOCIACION', etapaDestino: 'PERDIDO', umbralDias: 21, activa: false, motivoAuto: 'PERDIO_INTERES' },
]
async function main() {
  for (const r of reglas) {
    const existe = await prisma.reglaPipeline.findFirst({ where: { etapaOrigen: r.etapaOrigen, etapaDestino: r.etapaDestino } })
    if (!existe) { await prisma.reglaPipeline.create({ data: r }); console.log('Creada:', r.nombre) }
    else console.log('Ya existe:', r.nombre)
  }
  await prisma.\$disconnect()
}
main().catch(e => { console.error(e); process.exit(1) })
"
```

Expected: 5 líneas con "Creada: ..." o "Ya existe: ..."

- [ ] **Step 3: Commit**

```bash
git add backend/src/seedData.js
git commit -m "feat: seed reglas pipeline por defecto (desactivadas)"
```

---

## Task 5: Frontend — Constantes ui.jsx

**Files:**
- Modify: `frontend/src/components/ui.jsx`

- [ ] **Step 1: Agregar INTERESADO a ETAPA_LABEL y ETAPA_COLOR, y MOTIVO_PERDIDA_LABEL**

Reemplazar el archivo completo:

```js
// Shared constants used across the app (antd Tag color values)

export const ETAPA_LABEL = {
  NUEVO: 'Nuevo',
  NO_CONTESTA: 'No contesta',
  SEGUIMIENTO: 'Seguimiento',
  COTIZACION_ENVIADA: 'Cotización enviada',
  INTERESADO: 'Interesado',
  VISITA_AGENDADA: 'Visita agendada',
  VISITA_REALIZADA: 'Visita realizada',
  SEGUIMIENTO_POST_VISITA: 'Seguimiento post-visita',
  NEGOCIACION: 'Negociación',
  RESERVA: 'Reserva',
  PROMESA: 'Promesa',
  ESCRITURA: 'Escritura',
  ENTREGA: 'Entrega',
  POSTVENTA: 'Postventa',
  PERDIDO: 'Perdido',
}

export const ETAPA_COLOR = {
  NUEVO: 'default',
  NO_CONTESTA: 'orange',
  SEGUIMIENTO: 'blue',
  COTIZACION_ENVIADA: 'cyan',
  INTERESADO: 'gold',
  VISITA_AGENDADA: 'geekblue',
  VISITA_REALIZADA: 'purple',
  SEGUIMIENTO_POST_VISITA: 'blue',
  NEGOCIACION: 'volcano',
  RESERVA: 'orange',
  PROMESA: 'lime',
  ESCRITURA: 'green',
  ENTREGA: 'success',
  POSTVENTA: 'cyan',
  PERDIDO: 'red',
}

export const MOTIVO_PERDIDA_LABEL = {
  NO_CONTESTA:        'No contesta',
  PRECIO_ALTO:        'Precio alto',
  ELIGIO_COMPETENCIA: 'Eligió competencia',
  NO_CALIFICA_FINANC: 'No califica financ.',
  NO_GUSTO_PRODUCTO:  'No gustó producto',
  PERDIO_INTERES:     'Perdió interés',
  OTRO:               'Otro',
}

export const MOTIVO_PERDIDA_OPTIONS = Object.entries(MOTIVO_PERDIDA_LABEL).map(([value, label]) => ({ value, label }))

export const ESTADO_VENTA_COLOR = {
  RESERVA: 'orange',
  PROMESA: 'blue',
  ESCRITURA: 'purple',
  ENTREGADO: 'green',
  ANULADO: 'red',
}

export const ROL_LABEL = {
  GERENTE: 'Gerente',
  JEFE_VENTAS: 'Jefe de Ventas',
  VENDEDOR: 'Vendedor',
  BROKER_EXTERNO: 'Broker Externo',
  ABOGADO: 'Abogado',
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/ui.jsx
git commit -m "feat: agregar INTERESADO y MOTIVO_PERDIDA_LABEL a constantes ui"
```

---

## Task 6: Frontend — Componente ModalPerdido

**Files:**
- Create: `frontend/src/components/ModalPerdido.jsx`

- [ ] **Step 1: Crear ModalPerdido.jsx**

```jsx
import { Modal, Form, Select, Input, Typography } from 'antd'
import { MOTIVO_PERDIDA_OPTIONS, ETAPA_LABEL } from './ui'

const { Text } = Typography

export default function ModalPerdido({ open, etapaActual, onConfirm, onCancel, loading }) {
  const [form] = Form.useForm()

  const handleOk = () => {
    form.validateFields().then(values => {
      onConfirm(values)
      form.resetFields()
    })
  }

  const handleCancel = () => {
    form.resetFields()
    onCancel()
  }

  return (
    <Modal
      title="Marcar como Perdido"
      open={open}
      onOk={handleOk}
      onCancel={handleCancel}
      okText="Confirmar pérdida"
      cancelText="Cancelar"
      confirmLoading={loading}
      okButtonProps={{ danger: true }}
      width={460}
    >
      {etapaActual && (
        <div style={{ background: '#f8fafc', borderRadius: 6, padding: '8px 12px', marginBottom: 16 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Etapa actual: <Text strong>{ETAPA_LABEL[etapaActual] || etapaActual}</Text> — se guardará automáticamente
          </Text>
        </div>
      )}
      <Form form={form} layout="vertical">
        <Form.Item
          name="motivoPerdidaCat"
          label="Motivo de pérdida"
          rules={[{ required: true, message: 'Selecciona el motivo' }]}
        >
          <Select
            placeholder="¿Por qué se perdió este lead?"
            options={MOTIVO_PERDIDA_OPTIONS}
          />
        </Form.Item>
        <Form.Item
          name="motivoPerdidaNota"
          label="Nota adicional (opcional)"
        >
          <Input.TextArea
            rows={2}
            placeholder="Detalle adicional..."
            maxLength={300}
            showCount
          />
        </Form.Item>
      </Form>
    </Modal>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/ModalPerdido.jsx
git commit -m "feat: componente ModalPerdido con categorías y nota"
```

---

## Task 7: Frontend — Leads.jsx (kanban + badge en tarjetas)

**Files:**
- Modify: `frontend/src/pages/leads/Leads.jsx`

- [ ] **Step 1: Actualizar ETAPAS y añadir INTERESADO**

Leer el archivo actual. Buscar la línea `const ETAPAS = Object.keys(ETAPA_LABEL).filter(e => e !== 'PERDIDO')`. Esta línea ya toma las claves de ETAPA_LABEL automáticamente, así que con el cambio en ui.jsx ya incluye INTERESADO. No requiere cambio manual.

Verificar que el import de ETAPA_LABEL viene de `../../components/ui` — ya lo tiene.

- [ ] **Step 2: Agregar import de ModalPerdido y useState para modal**

Agregar imports al inicio del archivo (junto a los imports existentes):

```js
import ModalPerdido from '../../components/ModalPerdido'
import { MOTIVO_PERDIDA_LABEL } from '../../components/ui'
```

- [ ] **Step 3: Agregar estado del modal en VistaKanban**

Dentro del componente `VistaKanban`, agregar estados después de `const [activeId, setActiveId] = useState(null)`:

```js
const [modalPerdido, setModalPerdido] = useState(null) // { leadId, etapaActual }
```

- [ ] **Step 4: Modificar handleDragEnd para interceptar PERDIDO**

Reemplazar el `handleDragEnd` actual:

```js
  const handleDragEnd = ({ active, over }) => {
    setActiveId(null)
    if (!over) return
    let etapaDestino = over.id
    if (!ETAPAS.includes(etapaDestino)) {
      for (const [etapa, col] of Object.entries(kanban)) {
        if ((col.leads || []).find(l => l.id === etapaDestino)) {
          etapaDestino = etapa
          break
        }
      }
    }
    const etapaOrigen = dragStartEtapa.current
    dragStartEtapa.current = null

    if (!ETAPAS.includes(etapaDestino) || etapaDestino === etapaOrigen) return

    if (etapaDestino === 'PERDIDO') {
      setModalPerdido({ leadId: active.id, etapaActual: etapaOrigen })
    } else {
      cambiarEtapa.mutate({ id: active.id, etapa: etapaDestino })
    }
  }
```

- [ ] **Step 5: Agregar handler de confirmación y el componente modal**

Agregar función `handleConfirmarPerdido` dentro de `VistaKanban`:

```js
  const handleConfirmarPerdido = (values) => {
    if (!modalPerdido) return
    cambiarEtapa.mutate(
      { id: modalPerdido.leadId, etapa: 'PERDIDO', ...values },
      { onSettled: () => setModalPerdido(null) }
    )
  }
```

Y actualizar la mutación `cambiarEtapa` para pasar los campos extra:

```js
  const cambiarEtapa = useMutation({
    mutationFn: ({ id, etapa, motivoPerdidaCat, motivoPerdidaNota }) =>
      api.put(`/leads/${id}/etapa`, { etapa, motivoPerdidaCat, motivoPerdidaNota }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leads-kanban'] }),
    onError: () => message.error('No se pudo cambiar la etapa')
  })
```

Agregar el modal al JSX de `VistaKanban`, antes del cierre del `<>`:

```jsx
      <ModalPerdido
        open={!!modalPerdido}
        etapaActual={modalPerdido?.etapaActual}
        onConfirm={handleConfirmarPerdido}
        onCancel={() => setModalPerdido(null)}
        loading={cambiarEtapa.isPending}
      />
```

- [ ] **Step 6: Agregar badge automático y motivo en LeadCard**

Dentro de `LeadCard`, buscar el JSX que renderiza la tarjeta. Agregar después del nombre/apellido del contacto:

```jsx
{lead.perdidaAutomatica && (
  <Tag color="blue" style={{ fontSize: 10, padding: '0 4px' }}>🤖 Auto</Tag>
)}
{lead.etapa === 'PERDIDO' && lead.motivoPerdidaCat && (
  <Tag color="red" style={{ fontSize: 10, padding: '0 4px' }}>
    {MOTIVO_PERDIDA_LABEL[lead.motivoPerdidaCat] || lead.motivoPerdidaCat}
  </Tag>
)}
```

- [ ] **Step 7: Verificar que kanban incluye los nuevos campos en el select**

Buscar el endpoint `/leads/kanban` en el backend. Verificar que incluye `perdidaAutomatica` y `motivoPerdidaCat` en el `select` del lead. Si no los incluye, leer el controller de kanban y agregar esos campos.

```bash
grep -n "perdidaAutomatica\|motivoPerdidaCat\|kanban" backend/src/controllers/leadsController.js | head -20
```

Si la query de kanban usa `include: { contacto: ... }` sin `select` explícito en lead, los nuevos campos ya estarán disponibles automáticamente (Prisma devuelve todos los campos del modelo por defecto cuando no se usa `select`).

- [ ] **Step 8: Commit**

```bash
git add frontend/src/pages/leads/Leads.jsx
git commit -m "feat: kanban intercepta PERDIDO con ModalPerdido + badge automático en tarjetas"
```

---

## Task 8: Frontend — LeadDetalle.jsx

**Files:**
- Modify: `frontend/src/pages/leads/LeadDetalle.jsx`

- [ ] **Step 1: Actualizar ETAPAS_PIPELINE para incluir INTERESADO**

Buscar y reemplazar la constante `ETAPAS_PIPELINE` (líneas 24-28):

```js
const ETAPAS_PIPELINE = [
  'NUEVO', 'NO_CONTESTA', 'SEGUIMIENTO', 'COTIZACION_ENVIADA', 'INTERESADO',
  'VISITA_AGENDADA', 'VISITA_REALIZADA', 'SEGUIMIENTO_POST_VISITA',
  'NEGOCIACION', 'RESERVA', 'PROMESA', 'ESCRITURA', 'ENTREGA', 'POSTVENTA', 'PERDIDO'
]
```

- [ ] **Step 2: Agregar imports**

Agregar al bloque de imports:

```js
import ModalPerdido from '../../components/ModalPerdido'
import { MOTIVO_PERDIDA_LABEL } from '../../components/ui'
```

- [ ] **Step 3: Agregar estado para modal PERDIDO**

Dentro del componente principal `LeadDetalle`, buscar donde están los otros `useState`. Agregar:

```js
const [modalPerdido, setModalPerdido] = useState(false)
```

- [ ] **Step 4: Reemplazar el Form/Modal de cambio de etapa para interceptar PERDIDO**

Buscar el componente interno `ModalCambiarEtapa` (que tiene el Form con `name="etapa"` y el campo `motivoPerdida`). La lógica actual pide texto libre. Reemplazar el `onOk` del modal y el campo `motivoPerdida` para:

1. Cuando `etapa === 'PERDIDO'`, no confirmar directamente sino abrir `ModalPerdido`
2. La mutation `cambiarEtapa` ya recibe `motivoPerdidaCat` y `motivoPerdidaNota`

Buscar la función que hace el submit del cambio de etapa y actualizarla:

```js
// En el handler de submit del modal de cambio de etapa:
const handleCambiarEtapa = (values) => {
  if (values.etapa === 'PERDIDO') {
    // Guardar la etapa seleccionada y abrir el modal de perdido
    setPendingEtapa('PERDIDO')
    setModalPerdido(true)
    // Cerrar el modal de cambio de etapa
    setModalEtapaOpen(false)
    return
  }
  cambiarEtapa.mutate({ etapa: values.etapa })
}
```

Agregar estado `pendingEtapa`:
```js
const [pendingEtapa, setPendingEtapa] = useState(null)
```

Handler de confirmación del ModalPerdido:
```js
const handleConfirmarPerdido = (values) => {
  cambiarEtapa.mutate(
    { etapa: 'PERDIDO', ...values },
    { onSettled: () => { setModalPerdido(false); setPendingEtapa(null) } }
  )
}
```

Actualizar la mutación cambiarEtapa del detalle:
```js
const cambiarEtapa = useMutation({
  mutationFn: ({ etapa, motivoPerdidaCat, motivoPerdidaNota }) =>
    api.put(`/leads/${id}/etapa`, { etapa, motivoPerdidaCat, motivoPerdidaNota }),
  onSuccess: () => {
    message.success('Etapa actualizada')
    qc.invalidateQueries(['lead', Number(id)])
  },
  onError: err => message.error(err.response?.data?.error || 'Error al cambiar etapa')
})
```

Agregar `<ModalPerdido>` al JSX (antes del cierre del return):
```jsx
<ModalPerdido
  open={modalPerdido}
  etapaActual={lead?.etapa}
  onConfirm={handleConfirmarPerdido}
  onCancel={() => { setModalPerdido(false); setPendingEtapa(null) }}
  loading={cambiarEtapa.isPending}
/>
```

- [ ] **Step 5: Agregar banner de pérdida automática en el JSX**

Buscar donde empieza el contenido principal del detalle del lead (después del Title con el nombre del contacto). Agregar antes del primer Card:

```jsx
{/* Banner pérdida automática */}
{lead.perdidaAutomatica && (
  <Alert
    type="info"
    showIcon
    icon={<span>🤖</span>}
    message="Perdido automáticamente"
    description={`Estaba en ${ETAPA_LABEL[lead.etapaAntesDePerdido] || lead.etapaAntesDePerdido} sin actividad. Regla aplicada el ${dayjs(lead.perdidaAutomaticaEn).format('DD/MM/YYYY HH:mm')}.`}
    style={{ marginBottom: 16 }}
  />
)}

{/* Info de pérdida (automática o manual) */}
{lead.etapa === 'PERDIDO' && lead.motivoPerdidaCat && (
  <Alert
    type="error"
    showIcon
    message={
      <span>
        Motivo: <Tag color="red">{MOTIVO_PERDIDA_LABEL[lead.motivoPerdidaCat] || lead.motivoPerdidaCat}</Tag>
        {lead.etapaAntesDePerdido && (
          <> · Desde: <Tag>{ETAPA_LABEL[lead.etapaAntesDePerdido] || lead.etapaAntesDePerdido}</Tag></>
        )}
      </span>
    }
    description={lead.motivoPerdidaNota || undefined}
    style={{ marginBottom: 16 }}
  />
)}
```

Asegurarse de tener `Alert` en los imports de antd y `dayjs` importado (ya debe estar).

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/leads/LeadDetalle.jsx
git commit -m "feat: LeadDetalle con INTERESADO, ModalPerdido y banner pérdida automática"
```

---

## Task 9: Frontend — Automatizaciones.jsx (sección reglas pipeline)

**Files:**
- Modify: `frontend/src/pages/automatizaciones/Automatizaciones.jsx`

- [ ] **Step 1: Agregar query de reglas pipeline**

Dentro del componente `Automatizaciones`, agregar query después de `const { data: configs = [] }`:

```js
const { data: reglasPipeline = [], isLoading: loadingReglas } = useQuery({
  queryKey: ['reglas-pipeline'],
  queryFn: () => api.get('/alertas/reglas-pipeline').then(r => r.data)
})
```

- [ ] **Step 2: Agregar componente ReglaPipelineCard**

Antes del componente `AutomatizacionCard`, agregar:

```jsx
import { ETAPA_LABEL } from '../../components/ui'

const MOTIVO_AUTO_OPTIONS = [
  { value: 'NO_CONTESTA', label: 'No contesta' },
  { value: 'PRECIO_ALTO', label: 'Precio alto' },
  { value: 'ELIGIO_COMPETENCIA', label: 'Eligió competencia' },
  { value: 'NO_CALIFICA_FINANC', label: 'No califica financ.' },
  { value: 'NO_GUSTO_PRODUCTO', label: 'No gustó producto' },
  { value: 'PERDIO_INTERES', label: 'Perdió interés' },
  { value: 'OTRO', label: 'Otro' },
]

const ETAPA_OPTIONS = Object.entries(ETAPA_LABEL).map(([k, v]) => ({ value: k, label: v }))

function ReglaPipelineCard({ regla, onEdit }) {
  const qc = useQueryClient()
  const { message } = App.useApp()

  const toggle = useMutation({
    mutationFn: (activa) => api.put(`/alertas/reglas-pipeline/${regla.id}`, { activa }),
    onSuccess: () => qc.invalidateQueries(['reglas-pipeline']),
    onError: () => message.error('Error al actualizar')
  })

  return (
    <Card
      style={{ borderLeft: `4px solid ${regla.activa ? '#1677ff' : '#d9d9d9'}` }}
      bodyStyle={{ padding: '14px 18px' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <Space align="center" wrap>
          <Tag color={regla.activa ? 'blue' : 'default'}>{ETAPA_LABEL[regla.etapaOrigen] || regla.etapaOrigen}</Tag>
          <span style={{ color: '#94a3b8', fontSize: 16 }}>→</span>
          <Tag color={regla.etapaDestino === 'PERDIDO' ? 'red' : 'green'}>{ETAPA_LABEL[regla.etapaDestino] || regla.etapaDestino}</Tag>
          <Text type="secondary" style={{ fontSize: 12 }}>si pasan <Text strong>{regla.umbralDias}</Text> días sin avance</Text>
          {regla.activa && <Tag color="green" style={{ fontSize: 11 }}>Activa</Tag>}
        </Space>
        <Space>
          <Button size="small" onClick={() => onEdit(regla)}>Configurar</Button>
          <Switch checked={regla.activa} size="small" loading={toggle.isPending} onChange={v => toggle.mutate(v)} />
        </Space>
      </div>
    </Card>
  )
}
```

- [ ] **Step 3: Agregar modal de configuración de regla pipeline**

```jsx
function ModalReglaPipeline({ regla, onClose }) {
  const qc = useQueryClient()
  const [form] = Form.useForm()
  const { message } = App.useApp()
  const etapaDestino = Form.useWatch('etapaDestino', form)

  const guardar = useMutation({
    mutationFn: (d) => api.put(`/alertas/reglas-pipeline/${regla.id}`, d),
    onSuccess: () => {
      message.success('Regla actualizada')
      qc.invalidateQueries(['reglas-pipeline'])
      onClose()
    },
    onError: () => message.error('Error al guardar')
  })

  if (!regla) return null

  return (
    <Modal
      title={`Configurar regla: ${regla.nombre}`}
      open={!!regla}
      onCancel={onClose}
      onOk={() => form.validateFields().then(guardar.mutate)}
      okText="Guardar"
      cancelText="Cancelar"
      confirmLoading={guardar.isPending}
      width={480}
    >
      <Form form={form} layout="vertical" initialValues={regla} style={{ marginTop: 16 }}>
        <Form.Item name="nombre" label="Nombre de la regla" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="etapaOrigen" label="Etapa origen" rules={[{ required: true }]}>
          <Select options={ETAPA_OPTIONS.filter(e => !['PERDIDO','ENTREGA','POSTVENTA'].includes(e.value))} />
        </Form.Item>
        <Form.Item name="etapaDestino" label="Etapa destino" rules={[{ required: true }]}>
          <Select options={ETAPA_OPTIONS} />
        </Form.Item>
        <Form.Item name="umbralDias" label="Días sin avance" rules={[{ required: true }, { type: 'number', min: 1, max: 365 }]}>
          <InputNumber min={1} max={365} style={{ width: '100%' }} addonAfter="días" />
        </Form.Item>
        {etapaDestino === 'PERDIDO' && (
          <Form.Item name="motivoAuto" label="Motivo automático asignado">
            <Select options={MOTIVO_AUTO_OPTIONS} allowClear />
          </Form.Item>
        )}
        <Form.Item name="activa" label="Estado" valuePropName="checked">
          <Switch checkedChildren="Activa" unCheckedChildren="Inactiva" />
        </Form.Item>
      </Form>
    </Modal>
  )
}
```

- [ ] **Step 4: Agregar estado y sección en el componente principal Automatizaciones**

Agregar estado en `Automatizaciones`:
```js
const [configurandoRegla, setConfigurandoRegla] = useState(null)
```

Agregar sección en el JSX después de las reglas de alertas existentes:

```jsx
{/* Reglas de pipeline */}
<div style={{ marginTop: 32 }}>
  <Title level={5} style={{ marginBottom: 4 }}>
    <ThunderboltOutlined style={{ marginRight: 6, color: '#1677ff' }} />
    Reglas de pipeline
  </Title>
  <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 12 }}>
    Si un lead lleva X días en una etapa sin avanzar, se mueve automáticamente.
  </Text>
  <Space direction="vertical" style={{ width: '100%' }} size={10}>
    {loadingReglas ? <Card loading /> : reglasPipeline.map(r => (
      <ReglaPipelineCard key={r.id} regla={r} onEdit={setConfigurandoRegla} />
    ))}
  </Space>
</div>

<ModalReglaPipeline regla={configurandoRegla} onClose={() => setConfigurandoRegla(null)} />
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/automatizaciones/Automatizaciones.jsx
git commit -m "feat: sección reglas pipeline en Automatizaciones con CRUD visual"
```

---

## Task 10: Push final y verificación

- [ ] **Step 1: Push a Railway**

```bash
git push origin main
```

- [ ] **Step 2: Verificar en producción**

Checklist manual:
- [ ] El kanban muestra columna INTERESADO entre COTIZACION_ENVIADA y VISITA_AGENDADA
- [ ] Arrastrar un lead a PERDIDO abre el ModalPerdido
- [ ] El lead perdido manualmente muestra tag de motivo en el kanban
- [ ] En LeadDetalle, cambiar etapa a PERDIDO abre ModalPerdido (no el campo de texto libre)
- [ ] Ejecutar chequeo manual en Automatizaciones → no arroja error
- [ ] Las reglas pipeline aparecen en Automatizaciones como cards con toggle
- [ ] Configurar una regla pipeline y guardar funciona

- [ ] **Step 3: Commit de verificación (si hubo ajustes)**

```bash
git add -A && git commit -m "fix: ajustes post-verificación pipeline automatizaciones"
git push origin main
```
