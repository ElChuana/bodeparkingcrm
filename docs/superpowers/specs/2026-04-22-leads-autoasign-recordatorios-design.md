# Leads Auto-asignación y Recordatorios — Design

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Auto-asignar leads de API al JEFE_VENTAS, quitar notificación de calendario en leads, y agregar recordatorios programados en leads con notificación automática vía cron.

**Architecture:** Tres cambios independientes: (1) patch en apiLeadsController, (2) remoción de una notificación en leadsController, (3) nuevo modelo Recordatorio + controller + cron + UI en LeadDetalle.

**Tech Stack:** Prisma + PostgreSQL (Railway), Express, React + Ant Design, node-cron (ya instalado)

---

## 1. Modelo de datos

Nuevo modelo `Recordatorio` en `prisma/schema.prisma`:

```prisma
model Recordatorio {
  id          Int      @id @default(autoincrement())
  leadId      Int
  creadoPorId Int
  descripcion String
  fechaHora   DateTime
  completado  Boolean  @default(false)
  notificado  Boolean  @default(false)
  creadoEn    DateTime @default(now())

  lead      Lead    @relation(fields: [leadId], references: [id])
  creadoPor Usuario @relation("RecordatoriosCreadosPor", fields: [creadoPorId], references: [id])

  @@map("recordatorios")
}
```

Agregar en `Lead`: `recordatorios Recordatorio[]`
Agregar en `Usuario`: `recordatoriosCreadosPor Recordatorio[] @relation("RecordatoriosCreadosPor")`

Nueva migración Prisma.

---

## 2. Auto-asignación API → JEFE_VENTAS

**Archivo:** `backend/src/controllers/apiLeadsController.js`

Al crear un lead vía API pública, antes de `prisma.lead.create`, buscar:
```js
const jefeVentas = await prisma.usuario.findFirst({
  where: { rol: 'JEFE_VENTAS', activo: true }
})
```
Usar `jefeVentas?.id` como `vendedorId` del nuevo lead. Si no hay JEFE_VENTAS activo, el lead queda con `vendedorId: null`.

---

## 3. Quitar notificación LEAD_NUEVO

**Archivo:** `backend/src/controllers/leadsController.js`

En la función `crear`, después de `res.status(201).json(lead)`, eliminar la llamada a `notificarLead({ tipo: 'LEAD_NUEVO', ... })`. No tocar otras llamadas a `notificarLead` (etapa, etc.).

---

## 4. Recordatorios — Backend

**Archivo nuevo:** `backend/src/controllers/recordatoriosController.js`

Endpoints:
- `POST /leads/:id/recordatorios` — crea recordatorio. Body: `{ descripcion, fechaHora }`. Solo usuarios con acceso al lead (vendedor asignado, JEFE_VENTAS, GERENTE).
- `GET /leads/:id/recordatorios` — lista todos los recordatorios del lead, ordenados por `fechaHora` asc.
- `PATCH /recordatorios/:id/completar` — marca `completado: true`.

**Archivo:** `backend/src/routes/recordatorios.js` — wiring de las rutas.

**Archivo:** `backend/src/index.js` — registrar rutas + nuevo cron job cada 15 min:
```js
cron.schedule('*/15 * * * *', async () => {
  const pendientes = await prisma.recordatorio.findMany({
    where: { fechaHora: { lte: new Date() }, completado: false, notificado: false },
    include: { lead: { select: { id: true, vendedorId: true, contacto: { select: { nombre: true, apellido: true } } } }, creadoPor: { select: { nombre: true } } }
  })
  for (const r of pendientes) {
    const destinatarioId = r.lead.vendedorId
    if (destinatarioId) {
      await prisma.notificacion.create({
        data: {
          usuarioId: destinatarioId,
          tipo: 'RECORDATORIO_LEAD',
          mensaje: `Recordatorio: ${r.descripcion} — ${r.lead.contacto.nombre} ${r.lead.contacto.apellido}`,
          referenciaId: r.leadId,
          referenciaTipo: 'lead'
        }
      })
    }
    await prisma.recordatorio.update({ where: { id: r.id }, data: { notificado: true } })
  }
})
```

Agregar `RECORDATORIO_LEAD` al enum `TipoAlerta` en `schema.prisma` (actualmente no existe, hay que añadirlo).

---

## 5. Recordatorios — Frontend

**Archivo:** `frontend/src/pages/leads/LeadDetalle.jsx`

Nueva sección "Recordatorios" al final del detalle del lead:

- Query: `GET /leads/:id/recordatorios`
- Lista: cada recordatorio muestra descripción, fecha/hora formateada, badge de estado:
  - Verde: completado
  - Naranja: pendiente y futuro
  - Rojo: vencido (fechaHora < ahora y no completado)
- Botón "Completar" en los pendientes (llama a `PATCH /recordatorios/:id/completar`)
- Formulario para agregar: `Input` para descripción + `DatePicker` con `showTime` para fecha/hora + botón "Agregar"
- Visible solo para `GERENTE`, `JEFE_VENTAS`, y el vendedor asignado al lead

Mutations con `react-query` (`useMutation` + `invalidateQueries`).

---

## Acceso y permisos

- Crear/ver/completar recordatorios: GERENTE, JEFE_VENTAS, y el vendedor asignado al lead
- El cron notifica al `vendedorId` del lead cuando vence un recordatorio

## Casos borde

- Si el lead no tiene vendedor asignado, el cron marca `notificado: true` pero no crea notificación (no hay a quién notificar)
- Si no hay JEFE_VENTAS activo al crear lead vía API, el lead queda sin asignar
- Un recordatorio vencido sigue visible (en rojo) hasta que se marque como completado
