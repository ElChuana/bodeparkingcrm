# BodeParking CRM — Mapa completo de funcionalidades

> **AGENTE**: Leer este archivo SIEMPRE antes de implementar algo nuevo o modificar código existente.
> Si la funcionalidad que se pide ya existe (total o parcialmente), avisar y proponer modificar lo existente en vez de crear algo nuevo.
> Actualizar este archivo cada vez que se implemente algo nuevo.

---

## Stack

- **Backend**: Node.js + Express + Prisma + PostgreSQL (Railway)
- **Frontend**: React + Vite + Ant Design
- **Auth**: JWT (middleware en `backend/src/middleware/auth.js`)
- **PDF**: @react-pdf/renderer
- **Email**: Resend API (`backend/src/lib/mailer.js`)
- **Archivos**: multer (`backend/src/lib/upload.js`)

---

## Roles del sistema

| Rol | Acceso |
|-----|--------|
| GERENTE | Todo sin restricciones |
| JEFE_VENTAS | Todo excepto CRUD de usuarios |
| VENDEDOR | Solo sus leads asignados, sus comisiones, cotizaciones propias |
| BROKER_EXTERNO | Solo leads donde es broker |
| ABOGADO | Solo procesos legales y ventas en etapa legal |

---

## Módulos y funcionalidades

### AUTH — `/api/auth`
- Archivos: `routes/auth.js`, `controllers/authController.js`
- `POST /login` — login con JWT
- `GET /me` — usuario autenticado
- `PUT /cambiar-password` — cambiar contraseña

### USUARIOS — `/api/usuarios`
- Archivos: `routes/usuarios.js`, `controllers/usuariosController.js`
- `GET /` — listar (GERENTE, JEFE_VENTAS)
- `GET /:id` — detalle
- `POST /` — crear (GERENTE)
- `PUT /:id` — editar (GERENTE)
- `DELETE /:id` — desactivar/soft-delete (GERENTE)
- Campos clave: telefono, rol, comisionPorcentaje, comisionFijo, modulosVisibles, campanasFiltro, edificiosFiltro, leadsIndividualesFiltro
- Frontend: `pages/equipo/Equipo.jsx`

### CONTACTOS — `/api/contactos`
- Archivos: `routes/contactos.js`, `controllers/contactosController.js`
- `GET /` — buscar por nombre, email, teléfono, RUT, empresa
- `GET /:id` — detalle con leads y compras
- `POST /` — crear contacto
- `PUT /:id` — editar contacto (incluye campos extendidos)
- Campos extendidos (agregados abr 2026): fechaNacimiento, ciudadNacimiento, estadoCivil, profesion, nacionalidad, regimenMatrimonial, direccionParticular
- **No tiene página dedicada** — se edita desde LeadDetalle

### EDIFICIOS — `/api/edificios`
- Archivos: `routes/edificios.js`, `controllers/edificiosController.js`
- `GET /` — listar todos
- `GET /:id` — detalle
- `POST /` — crear (GERENTE, JEFE_VENTAS)
- `PUT /:id` — editar (GERENTE, JEFE_VENTAS)
- Frontend: `pages/inventario/Inventario.jsx`

### UNIDADES — `/api/unidades`
- Archivos: `routes/unidades.js`, `controllers/unidadesController.js`
- `GET /` — listar con filtros (tipo, estado, edificio)
- `GET /:id` — detalle
- `POST /` — crear (GERENTE, JEFE_VENTAS)
- `PUT /:id` — editar (GERENTE, JEFE_VENTAS)
- `POST /:id/archivos` — subir archivo (plano, doc)
- `DELETE /:id/archivos/:archivoId` — eliminar archivo
- Tipos: BODEGA, ESTACIONAMIENTO
- Estados: DISPONIBLE, RESERVADO, VENDIDO, ARRENDADO
- Campos: precioUF, precioMinimoUF, precioCostoUF, m2, piso, techado, acceso
- Frontend: `pages/inventario/Inventario.jsx`

### LEADS — `/api/leads`
- Archivos: `routes/leads.js`, `controllers/leadsController.js`
- `GET /` — listar con filtros (etapa, vendedor, edificio, origen, búsqueda, fechas, `sinAsignar=true`). Orden: actualizadoEn DESC
- `GET /kanban` — vista Kanban por etapa
- `GET /kanban/por-vendedor` — Kanban agrupado por vendedor
- `GET /campanas` — campañas disponibles
- `POST /fusionar-duplicados` — fusionar leads duplicados
- `POST /asignar-masivo` — asignar vendedor masivamente
- `GET /:id` — detalle completo
- `POST /` — crear lead
- `PUT /:id` — editar lead
- `PUT /:id/etapa` — cambiar etapa (con motivo si es PERDIDO)
- `DELETE /:id` — eliminar (solo GERENTE)
- Etapas: NUEVO, NO_CONTESTA, SEGUIMIENTO, COTIZACION_ENVIADA, VISITA_AGENDADA, VISITA_REALIZADA, SEGUIMIENTO_POST_VISITA, NEGOCIACION, RESERVA, PROMESA, ESCRITURA, ENTREGA, POSTVENTA, PERDIDO
- Orígenes: INSTAGRAM, GOOGLE, REFERIDO, BROKER, VISITA_DIRECTA, WEB, META, ORIGEN, OTRO
- Acceso filtrado por rol: VENDEDOR/BROKER solo ven sus leads asignados o en sus filtros
- **Auto-asignación a JEFE_VENTAS** cuando ingresan por API sin vendedor asignado
- Frontend: `pages/leads/Leads.jsx`, `pages/leads/LeadDetalle.jsx`
- LeadDetalle muestra Select editable de vendedor para GERENTE/JEFE_VENTAS (usa `PUT /:id`)

### LEADS (API Comuro) — `POST /api/leads/upsert`
- Archivo: `routes/comuro.js`
- Auth: API Key
- Upsert de lead desde Comuro (chatbot externo)
- Deduplicación: por comuroUuid → teléfono+nombre → email → external_id
- Usa `lib/deduplication.js` (mismoNombre con Levenshtein)
- Usa `lib/notifications.js` (notificarLead)

### VISITAS — anidado en `/api/leads/:leadId/visitas`
- Archivos: `controllers/visitasController.js` (rutas en `leads.js`)
- `GET /` — listar visitas del lead
- `POST /` — agendar visita (cambia etapa a VISITA_AGENDADA)
- `PATCH /:id` — editar datos visita
- `PUT /:id` — marcar resultado (cambia etapa a VISITA_REALIZADA)
- `DELETE /:id` — eliminar visita
- También: `GET /api/visitas` — calendario global (página Visitas)
- Frontend: `pages/visitas/Visitas.jsx` (lista + calendario con actividades)

### INTERACCIONES (ACTIVIDADES) — anidado en `/api/leads/:leadId/interacciones`
- Archivo: `controllers/interaccionesController.js`
- `GET /` — listar interacciones del lead
- `POST /` — crear actividad (LLAMADA, EMAIL, WHATSAPP, REUNION, NOTA)
- Campo `fecha`: opcional, por defecto = now. Si es fecha futura, aparece en el calendario
- **Las actividades con fecha futura se muestran en el calendario** de Visitas
- También: `GET /api/interacciones` — listado global (GERENTE, JEFE_VENTAS)
- **NO confundir con Recordatorios** — las actividades son la fuente de verdad

### RECORDATORIOS — `/api/leads/:id/recordatorios` y `/api/recordatorios`
- Archivos: `routes/recordatorios.js`, `routes/recordatorios-completar.js`, `controllers/recordatoriosController.js`
- `GET /api/leads/:id/recordatorios` — listar recordatorios de lead
- `POST /api/leads/:id/recordatorios` — crear recordatorio
- `PATCH /api/recordatorios/:id/completar` — marcar como completado
- **Cron job** cada 15 min: genera notificaciones cuando fechaHora <= now
- **Frontend eliminado** — se unificó con el sistema de Actividades (abr 2026)
- Nota: El modelo sigue en BD pero la UI fue removida de LeadDetalle

### VENTAS — `/api/ventas`
- Archivos: `routes/ventas.js`, `controllers/ventasController.js`
- `GET /` — listar (GERENTE, JEFE_VENTAS, ABOGADO)
- `GET /:id` — detalle con legal, plan de pago, unidades, comisiones
- `PUT /:id/estado` — cambiar estado (GERENTE, JEFE_VENTAS)
- `PUT /:id` — editar precios (solo GERENTE, bloqueado si ENTREGADO)
- Estados: RESERVA, PROMESA, ESCRITURA, ENTREGADO, ANULADO
- Campos precio: precioListaUF, descuentoPacksUF, descuentoAprobadoUF, precioFinalUF
- `conPromesa: Boolean` — se fija al crear venta desde cotización (afecta split de comisiones)
- Al llegar a ESCRITURA: notificación COMISION_ESCRITURA a GERENTE+JV si hay comisiones pendientes
- Relaciones: Contacto (comprador), Usuario (vendedor/broker/gerente), Unidad[] (many-to-many)
- Frontend: `pages/ventas/Ventas.jsx`, `pages/ventas/VentaDetalle.jsx`

### LEGAL — `/api/legal`
- Archivos: `routes/legal.js`, `controllers/legalController.js`
- `GET /:ventaId` — proceso legal de una venta
- `PUT /:ventaId` — actualizar estado legal
- `POST /:ventaId/documentos` — subir documento
- Estados: FIRMA_CLIENTE_PROMESA → FIRMA_INMOBILIARIA_PROMESA → ESCRITURA_LISTA → FIRMADA_NOTARIA → INSCRIPCION_CBR → ENTREGADO
- Acceso: GERENTE, JEFE_VENTAS, ABOGADO
- Frontend: `pages/ventas/Legal.jsx`

### PAGOS — `/api/pagos`
- Archivos: `routes/pagos.js`, `controllers/pagosController.js`
- `POST /plan` — crear plan de pago
- `GET /plan/:ventaId` — obtener plan
- `PUT /cuotas/:id/pagar` — registrar pago de cuota (con comprobante)
- `POST /arriendos/:arriendoId/pagar` — pagar cuota de arriendo
- `GET /atrasados` — cuotas atrasadas
- Tipos de cuota: RESERVA, PIE, CUOTA, ESCRITURA
- Estados: PENDIENTE, PAGADO, ATRASADO, CONDONADO
- Acceso: GERENTE, JEFE_VENTAS
- Frontend: `pages/pagos/Pagos.jsx`

### COMISIONES — `/api/comisiones`
- Archivos: `routes/comisiones.js`, `controllers/comisionesController.js`
- `GET /` — listar (propias si VENDEDOR, todas si GERENTE/JV)
- `GET /resumen` — KPIs de comisiones (GERENTE, JEFE_VENTAS)
- `POST /` — crear (solo GERENTE)
- `PUT /:id` — editar (solo GERENTE)
- `DELETE /:id` — eliminar (solo GERENTE)
- `PUT /:id/primera` — marcar primera cuota pagada (GERENTE, JEFE_VENTAS)
- `PUT /:id/segunda` — marcar segunda cuota pagada (GERENTE, JEFE_VENTAS)
- Cálculo automático al convertir cotización en venta (respeta conPromesa de la venta)
- Modelo: montoPrimera (promesa) + montoSegunda (escritura); si conPromesa=false → montoPrimera=0, montoSegunda=total
- Frontend: `pages/comisiones/Comisiones.jsx`

### PLANTILLAS DE COMISIÓN — `/api/plantillas-comision`
- Archivos: `routes/plantillasComision.js`, `controllers/plantillasComisionController.js`
- `GET /` — listar (GERENTE, JEFE_VENTAS)
- `POST /` — crear (solo GERENTE)
- `PUT /:id` — actualizar (solo GERENTE)
- `DELETE /:id` — eliminar (solo GERENTE)
- Campos: nombre, concepto, porcentaje?, montoFijo?, pctPromesa (%), pctEscritura (%), activa
- pctPromesa + pctEscritura debe sumar 100
- Uso: en VentaDetalle > Agregar comisión → selector de plantilla auto-rellena campos y calcula split según conPromesa
- Frontend: sección "Plantillas de comisión" en `pages/comisiones/Comisiones.jsx` (solo GERENTE)

### PACKS — `/api/packs`
- Archivos: `routes/packs.js`, `controllers/packsController.js`
- `GET /` — listar packs activos
- `POST /` — crear pack (GERENTE, JEFE_VENTAS)
- `PUT /:id` — editar
- `DELETE /:id` — desactivar
- Tipos: COMBO_ESPECIFICO (unidades específicas), POR_CANTIDAD (por número de unidades)
- Se aplican en cotizaciones: `CotizacionPack`
- Frontend: `pages/configuracion/PacksBeneficios.jsx`

### BENEFICIOS — `/api/beneficios`
- Archivos: `routes/beneficios.js`, `controllers/beneficiosController.js`
- `GET /` — listar beneficios activos
- `POST /` — crear (GERENTE, JEFE_VENTAS)
- `PUT /:id` — editar
- `DELETE /:id` — desactivar
- Tipos: ARRIENDO_ASEGURADO, GASTOS_NOTARIALES, CUOTAS_SIN_INTERES, OTRO
- Se aplican en cotizaciones: `CotizacionBeneficio`
- Frontend: `pages/configuracion/PacksBeneficios.jsx`

### ARRIENDOS — `/api/arriendos`
- Archivos: `routes/arriendos.js`, `controllers/arrendosController.js`
- `GET /` — listar arriendos
- `GET /:id` — detalle
- `POST /` — crear arriendo
- `PUT /:id` — editar
- Estados: ACTIVO, TERMINADO
- Frontend: `pages/arriendos/Arriendos.jsx`

### LLAVES — `/api/llaves`
- Archivos: `routes/llaves.js`, `controllers/llavesController.js`
- `GET /` — listar llaves
- `GET /vencidas` — llaves prestadas sin devolver
- `POST /` — registrar llave
- `POST /:id/prestar` — prestar llave
- `PUT /:id/devolver` — devolver llave
- `GET /:id/historial` — historial de movimientos
- Estados: EN_OFICINA, PRESTADA, PERDIDA
- Frontend: `pages/llaves/Llaves.jsx`

### POSTVENTA — `/api/postventa`
- Archivos: `routes/postventa.js`, `controllers/postventaController.js`
- `GET /` — listar casos
- `POST /` — crear caso
- `PUT /:id` — actualizar
- Tipos: RECLAMO, CONSULTA, TRAMITE, GARANTIA
- Estados: ABIERTO, EN_PROCESO, CERRADO
- **Sin página frontend dedicada** actualmente

### UF — `/api/uf`
- Archivos: `routes/uf.js`, `controllers/ufController.js`
- `GET /` — UF del día
- `GET /:fecha` — UF de fecha específica
- **Cron job** diario 9:00 AM — actualiza desde mindicador.cl
- Componente: `components/UFDisplay.jsx`

### ALERTAS/NOTIFICACIONES — `/api/alertas`
- Archivos: `routes/alertas.js`, `controllers/alertasController.js`
- `GET /` — notificaciones no leídas del usuario
- `PUT /:id/leer` — marcar leída
- `PUT /leer-todas` — marcar todas leídas
- `GET /config`, `PUT /config/:tipo` — config de alertas (GERENTE)
- `GET /preferencias`, `PUT /preferencias` — preferencias del usuario
- Tipos de alerta: LLAVE_NO_DEVUELTA, CUOTA_VENCIDA, LEAD_SIN_ACTIVIDAD, LEAD_ESTANCADO, FECHA_LEGAL_PROXIMA, ARRIENDO_POR_VENCER, DESCUENTO_PENDIENTE, LEAD_ETAPA_CAMBIO, LEAD_NUEVO, RECORDATORIO_LEAD
- Componente: `components/NotificacionesBadge.jsx`

### DASHBOARD — `/api/dashboard`
- Archivos: `routes/dashboard.js`, `controllers/dashboardController.js`
- `GET /` — todos los KPIs del período
- KPIs: leads ingresados, ventas, unidades vendidas (con comparación período anterior)
- Embudo: todos los pasos cuentan leads por etapa (consistente)
- Gráficos: ingresos por semana, ventas por mes, leads por campaña, inventario por edificio
- Datos: visitas del período, visitas próximas, cuotas pendientes, proceso legal activo
- Frontend: `pages/dashboard/Dashboard.jsx`

### REPORTES — `/api/reportes`
- Archivos: `routes/reportes.js`, `controllers/reportesController.js`
- `GET /leads` — reporte de leads
- `GET /ventas` — reporte de ventas
- `GET /inventario` — reporte de inventario
- `GET /pagos-atrasados` — cuotas atrasadas
- `GET /comisiones` — reporte de comisiones
- Acceso: GERENTE, JEFE_VENTAS
- Frontend: `pages/reportes/Reportes.jsx`, `pages/reportes/ReportesPDF.jsx`

### COTIZACIONES — `/api/cotizaciones`
- Archivos: `routes/cotizaciones.js`, `controllers/cotizacionesController.js`
- `GET /unidades-disponibles` — unidades disponibles para cotizar (con m2, precioUF, packs disponibles)
- `GET /` — listar cotizaciones (propias si VENDEDOR)
- `GET /:id` — detalle completo
- `POST /` — crear cotización
- `PUT /:id` — editar
- `PUT /:id/estado` — cambiar estado (BORRADOR, ENVIADA, ACEPTADA, RECHAZADA)
- `DELETE /:id` — eliminar
- `POST /:id/convertir` — **convertir a venta** (crea Venta + PlanPago + Comisiones automáticas)
- `POST /:id/packs` / `DELETE /:id/packs/:packId` — agregar/quitar packs
- `POST /:id/beneficios` / `DELETE /:id/beneficios/:beneficioId` — agregar/quitar beneficios
- Totales calculados: precioListaUF - descuentoPacksUF - descuentoAprobadoUF = precioFinalUF
- PDF incluye: m2 de bodegas, teléfono y email del ejecutivo de ventas
- Frontend: `pages/cotizaciones/CotizacionEditor.jsx`, `pages/cotizaciones/CotizacionPDF.jsx`

### DESCUENTOS — `/api/descuentos`
- Archivos: `routes/descuentos.js`, `controllers/descuentosController.js`
- `GET /` — listar solicitudes
- `GET /cotizacion/:id` — solicitudes de una cotización
- `POST /` — crear solicitud
- `PUT /:id/revisar` — aprobar/rechazar
- `PUT /cotizacion/:id/directo` — descuento directo
- Estados: PENDIENTE, APROBADA, RECHAZADA
- Frontend: `pages/descuentos/Descuentos.jsx`

### API PÚBLICA — `/api/public`
- Archivo: `routes/public.js`
- Auth: API Key (header `X-Api-Key`)
- `POST /leads` — crear lead desde sistema externo
- Deduplicación: por email/teléfono + similitud nombre (Levenshtein ≥ 0.6)
- Auto-asigna a JEFE_VENTAS si no se especifica vendedor
- Usa `lib/deduplication.js`
- Gestión de API Keys: `pages/configuracion/ApiKeys.jsx`

### BÚSQUEDA UNIVERSAL — `/api/buscar`
- Archivo: `routes/buscar.js`
- `GET /?q=texto` — busca en leads, unidades, ventas, contactos simultáneamente
- Retorna hasta 5 resultados por categoría
- Componente: `components/BuscadorUniversal.jsx`

### EMAIL — `/api/email`
- Archivo: `routes/email.js`
- `POST /enviar` — enviar email (con adjuntos). Adjunta firma HTML del usuario al pie.
- `GET /verificar`, `GET /config`, `PUT /config` — configuración SMTP + plantillas por usuario
- `GET /firma`, `PUT /firma` — firma HTML personal por usuario
- Config incluye: `smtpEmail`, `plantillaEmail`, `plantillaCotizacion` (variable `{nombre}` reemplazada en frontend)
- Registra interacción automática en el lead si se pasa `leadId`
- Componente: `components/ModalEmail.jsx` (muestra preview de firma, carga plantilla del usuario)
- Configuración en `pages/perfil/MiPerfil.jsx`: email, plantillas (2 tabs), firma (editor HTML + preview)

### CENTRO DE ASIGNACIÓN — `/asignacion`
- Archivo: `pages/asignacion/CentroAsignacion.jsx`
- Acceso: GERENTE y JEFE_VENTAS únicamente
- Filtros: campaña (multiselect), origen, fecha (Hoy/Ayer/Esta semana/rango), toggle "solo sin asignar"
- Tabla con selección múltiple (checkbox)
- Barra flotante al seleccionar: elegir vendedor → `POST /api/leads/asignar-masivo`
- Usa endpoints existentes: `GET /api/leads`, `GET /api/leads/campanas`, `GET /api/usuarios`

---

## Librerías compartidas (backend/src/lib/)

| Archivo | Propósito |
|---------|-----------|
| `prisma.js` | Cliente Prisma singleton |
| `auth.js` (middleware) | JWT + verificación de rol |
| `upload.js` | Multer para archivos |
| `mailer.js` | Resend API para emails |
| `deduplication.js` | `mismoNombre()` + Levenshtein — usado en comuro.js y public.js |
| `notifications.js` | `notificarLead()` — usado en leadsController.js y comuro.js |

---

## Cron jobs (backend/src/index.js)

| Schedule | Acción |
|----------|--------|
| Diario 9:00 AM | Actualizar UF desde mindicador.cl |
| Cada 15 min | Procesar recordatorios vencidos → crear notificaciones |

---

## Componentes reutilizables (frontend)

| Componente | Uso |
|-----------|-----|
| `BuscadorUniversal.jsx` | Búsqueda en header |
| `NotificacionesBadge.jsx` | Badge de notificaciones en header |
| `UFDisplay.jsx` | Valor UF actual |
| `ModalEmail.jsx` | Enviar email desde cualquier contexto |
| `Layout.jsx` | Wrapper con sidebar + header |
| `ui.jsx` | ETAPA_COLOR, ETAPA_LABEL y constantes UI compartidas |

---

## Páginas sin módulo backend dedicado

- `pages/automatizaciones/Automatizaciones.jsx` — página de automatizaciones (UI solamente)
- `pages/promociones/Promociones.jsx` — gestión de packs/beneficios (usa `/api/packs` y `/api/beneficios`)
- `pages/perfil/MiPerfil.jsx` — perfil propio: email de envío, plantillas de email (general + cotización), firma HTML, notificaciones

---

## Decisiones de diseño importantes

1. **Precio en ventas**: `precioFinalUF` (NO `precioUF` que fue eliminado). Los campos son: `precioListaUF`, `descuentoPacksUF`, `descuentoAprobadoUF`, `precioFinalUF`
2. **Actividades vs Recordatorios**: Las actividades (Interaccion) son la fuente de verdad. Tienen campo `fecha` que puede ser futuro. El modelo Recordatorio existe en BD pero su UI fue eliminada.
3. **Embudo de ventas**: Todos los pasos cuentan leads por etapa, no mezcla con ventas.
4. **Deduplicación**: Centralizada en `lib/deduplication.js` (Levenshtein, similitud ≥ 0.6)
5. **Notificaciones**: Centralizadas en `lib/notifications.js`
6. **Schema migrations**: Se usa `prisma db push` (no `migrate dev`) por historial de migraciones con drift.

---

*Última actualización: 23 Abril 2026 — comisiones con hitos (PlantillaComision, conPromesa, notificación escritura)*
*Actualizar este archivo después de cada cambio significativo.*
