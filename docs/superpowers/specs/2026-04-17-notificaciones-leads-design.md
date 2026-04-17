# Notificaciones de Leads — Design

## Problema

El CRM no avisa cuando llega un lead nuevo o cambia de etapa. Los vendedores, jefes de ventas y gerentes tienen que entrar manualmente para enterarse.

## Solución

Crear notificaciones in-app automáticas en dos eventos:
1. **Nuevo lead** — creado manualmente o llegado de Comuro
2. **Cambio de etapa** — cualquier transición de etapa en un lead

La infraestructura (modelo `Notificacion`, badge en sidebar, endpoints de lectura) ya existe. Solo falta el trigger backend y mejoras menores al frontend.

## Receptores

- Todos los usuarios con rol `GERENTE`
- Todos los usuarios con rol `JEFE_VENTAS`
- El vendedor asignado al lead (si tiene uno y es distinto al que hizo el cambio)
- Solo usuarios con `notificacionesActivas: true`

## Archivos afectados

- **Modify:** `backend/prisma/schema.prisma` — agregar `LEAD_ETAPA_CAMBIO`, `LEAD_NUEVO` al enum `TipoAlerta`; agregar `notificacionesActivas Boolean @default(true)` al modelo `Usuario`
- **Modify:** `backend/src/controllers/leadsController.js` — helper `notificarLead` + triggers en `cambiarEtapa` y `crear`
- **Modify:** `backend/src/routes/comuro.js` — trigger en upsert cuando status === 'created'
- **Modify:** `backend/src/routes/alertas.js` — nuevo endpoint `PUT /api/alertas/preferencias`
- **Modify:** `frontend/src/components/NotificacionesBadge.jsx` — notificaciones clickeables + refetch 30s
- **Modify:** `frontend/src/pages/perfil/MiPerfil.jsx` — toggle "Recibir notificaciones de leads"

## Cambio exacto — schema

```prisma
// TipoAlerta enum: agregar
LEAD_ETAPA_CAMBIO
LEAD_NUEVO

// Usuario model: agregar
notificacionesActivas Boolean @default(true)
```

## Helper notificarLead

```js
async function notificarLead({ leadId, mensaje, tipo, excluirUsuarioId }) {
  const destinatarios = await prisma.usuario.findMany({
    where: {
      notificacionesActivas: true,
      activo: true,
      OR: [
        { rol: 'GERENTE' },
        { rol: 'JEFE_VENTAS' },
        { leadsAsignados: { some: { id: leadId } } }
      ],
      ...(excluirUsuarioId && { id: { not: excluirUsuarioId } })
    },
    select: { id: true }
  })
  await prisma.notificacion.createMany({
    data: destinatarios.map(u => ({
      usuarioId: u.id,
      tipo,
      mensaje,
      referenciaId: leadId,
      referenciaTipo: 'lead'
    }))
  })
}
```

## Mensajes

- Nuevo lead manual: `"Nuevo lead: {nombre} {apellido}"`
- Nuevo lead Comuro: `"Nuevo lead de Comuro: {nombre} {apellido}"`
- Cambio de etapa: `"Lead {nombre} {apellido} → {etapa_label}"`

## Endpoint preferencias

`PUT /api/alertas/preferencias`  
Body: `{ notificacionesActivas: true | false }`  
Actualiza `usuario.notificacionesActivas` del usuario autenticado.

## Frontend — NotificacionesBadge

- `refetchInterval: 30000` (antes 60000)
- Cada item clickeable: `onClick → navigate('/leads/' + n.referenciaId)` si `referenciaTipo === 'lead'`
- Cerrar el Popover al navegar

## Frontend — MiPerfil

Toggle Ant Design `Switch` con label "Recibir notificaciones de leads":
- Lee el estado inicial desde `GET /api/email/config` o un nuevo endpoint `GET /api/alertas/preferencias`
- Al cambiar llama `PUT /api/alertas/preferencias`
