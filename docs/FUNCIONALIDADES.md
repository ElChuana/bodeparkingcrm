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
- **Anti-duplicados (jul 2026)**: `POST /` rechaza con 409 si ya existe un contacto con el mismo email o teléfono (devuelve `contactoExistente`); Comuro reutiliza el contacto existente aunque su lead esté PERDIDO. Fusión histórica: `scripts/fusionar-contactos-duplicados.js` (dry-run por defecto, `--ejecutar` respalda en ~/backups/bodeparking/)
- **No tiene página dedicada** — se edita desde LeadDetalle

### EDIFICIOS — `/api/edificios`
- Archivos: `routes/edificios.js`, `controllers/edificiosController.js`
- Campos: nombre, dirección, región, comuna, inmobiliaria, contactoInmobiliaria, descripción, `fechaEscritura` (fecha de compra/escritura del proyecto), activo
- `GET /` — listar todos
- `GET /:id` — detalle
- `POST /` — crear (GERENTE, JEFE_VENTAS)
- `PUT /:id` — editar (GERENTE, JEFE_VENTAS)
- Galería del edificio: relación `fotos` → `FotoEdificio` (ver **FOTOS DEL CATÁLOGO**)
- Frontend: `pages/inventario/Inventario.jsx`

### UNIDADES — `/api/unidades`
- Archivos: `routes/unidades.js`, `controllers/unidadesController.js`
- `GET /` — listar con filtros (tipo, estado, edificio)
- `GET /:id` — detalle
- `POST /` — crear (GERENTE, JEFE_VENTAS)
- `PUT /:id` — editar (GERENTE, JEFE_VENTAS)
- `POST /:id/archivos` — subir archivo (`tipo`: "foto" | "plano")
- `DELETE /:id/archivos/:archivoId` — eliminar archivo
- `Archivo` tiene `urlMiniatura`, `orden` y `esPortada` (ver **FOTOS DEL CATÁLOGO**)
- Tipos: BODEGA, ESTACIONAMIENTO
- Estados: DISPONIBLE, RESERVADO, VENDIDO, ARRENDADO
- Campos: precioUF, precioVentaUF, precioMinimoUF, precioCostoUF, m2, piso, techado, acceso
- Frontend: `pages/inventario/Inventario.jsx`
- **Precio catálogo vs precio venta** (jul 2026): `precioUF` = precio de catálogo; `precioVentaUF` = precio pactado en la venta (con descuento), **congelado** al convertir la cotización (prorrateo del `precioFinalUF` proporcional al lista de cada unidad). Son independientes.
  - El catálogo (`precioUF`) se **bloquea** cuando la unidad está RESERVADO/VENDIDO (backend rechaza el cambio; input deshabilitado en el modal). Los descuentos van a la venta, nunca bajando el catálogo.
  - Al **anular** una venta las unidades vuelven a DISPONIBLE con `precioVentaUF = null`.
  - `GET /unidades` devuelve `precioVentaUF` (el congelado; para disponibles cae al catálogo). Oculto a roles fuera de GERENTE/JEFE_VENTAS.
  - Resuelve el descuadre cabecera↔suma-unidades (antes el precio de venta se calculaba al vuelo y se editaba el catálogo para descontar). Datos históricos migrados 2026-07-27.

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
- **Campañas (jul 2026)**: `lead.campana` (texto legacy) ahora se vincula automáticamente al catálogo `campanas` vía `lead.campanaId` (`lib/campanas.js: vincularCampana`, usado en leads/public/comuro). `Campana.esWebinar` define si las ventas comisionan como webinar — el motor de comisiones usa el flag del catálogo (fallback: el texto contiene "webinar"). Backfill: `scripts/backfill-campanas.js`
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
- `POST /` — agendar visita (cambia etapa a VISITA_AGENDADA). Campos: fechaHora, tipo, notas, edificioId, vendedorId, **enlace** (link Meet/Zoom)
- `PATCH /:id` — editar datos visita
- `PUT /:id` — marcar resultado (cambia etapa a VISITA_REALIZADA)
- `DELETE /:id` — eliminar visita
- También: `GET /api/visitas` — calendario global (página Visitas)
- Frontend: `pages/visitas/Visitas.jsx` (lista + calendario con actividades)

### ACTIVIDADES — anidado en `/api/leads/:leadId/actividades`
- Modelo `Actividad` (tabla `actividades`) — **separado de las Notas** (jun 2026)
- Archivo: `controllers/actividadesController.js` (rutas en `leads.js`)
- Tipos (`TipoActividad`): `REUNION_COMERCIAL`, `LLAMADA`, `WHATSAPP`, `EMAIL`, `OTRO`
- `GET /` — listar actividades del lead · `POST /` — crear (acepta `resultado`) · `PATCH /:id` — editar · `DELETE /:id` — eliminar
- **Acciones rápidas** (LeadDetalle, header): botón **WhatsApp** (abre wa.me + registra actividad WHATSAPP con hora) y botón **Llamar** (popover: ¿contestó? sí/no + qué dijo → registra LLAMADA con `resultado` CONTESTO/NO_CONTESTO). El resultado se muestra como tag en el timeline.
- Campo `fecha`: opcional, por defecto = now. **Las actividades aparecen en el calendario** de Visitas (pasadas y futuras según el mes visible)
- También: `GET /api/actividades` — listado global / calendario (filtros desde/hasta/usuarioId; GERENTE/JEFE_VENTAS ven todo)
- Las crean también: visitas (REUNION_COMERCIAL), Comuro (REUNION_COMERCIAL), email enviado/recibido (EMAIL)
- Fuente de actividad para: alerta `LEAD_SIN_ACTIVIDAD` (`lib/reportes.js`), reportes diario/semanal e IA
- **NO confundir con Recordatorios** — las actividades son la fuente de verdad

### NOTAS — anidado en `/api/leads/:leadId/interacciones`
- Modelo `Interaccion` (tabla `interacciones`) — quedó **solo para comentarios** (tipo `NOTA`)
- Archivo: `controllers/interaccionesController.js`
- `GET /` — listar notas del lead · `POST /` — crear nota (fuerza tipo `NOTA`)
- También: `GET /api/interacciones` — listado global de notas (GERENTE, JEFE_VENTAS)
- Las notas **no** aparecen en el calendario
- Logs de sistema que quedan como NOTA: cambios de etapa, reingresos/altas vía API, automatizaciones, `PAGÓ reserva Webinar` (lo usan los reportes), resúmenes `📋`
- **Nota rápida inline** en LeadDetalle: cuadro dentro del cuadro "Notas", sin modal. Crea NOTA con descripción + contexto de edificio/unidades (opcionales). Cmd+Enter para guardar rápido.
- **@menciones**: escribir `@` etiqueta a un usuario (notificación `MENCION_NOTA` + email). Opciones desde `GET /usuarios/mencionables`.
- **Reacciones (emoji)**: `POST /api/interacciones/:id/reacciones` `{ emoji }` — toggle (agrega/quita). Modelo `ReaccionNota` (tabla `reacciones_nota`), único por (nota, usuario, emoji). Notifica al autor de la nota (`REACCION_NOTA`, solo in-app). UI: chips agrupados por emoji con tooltip de quién reaccionó + paleta `😊 +`.
- **Respuestas (comentarios anidados)**: `POST /api/interacciones/:id/respuestas` `{ descripcion, mencionados }` · `DELETE /api/interacciones/respuestas/:respuestaId` (autor o gerencia). Modelo `RespuestaNota` (tabla `respuestas_nota`), soporta @menciones. Notifica al autor de la nota (`RESPUESTA_NOTA` + email) y a mencionados. UI: hilo indentado bajo la nota con botón "Responder".
- Reacciones y respuestas vienen incluidas en el detalle del lead (`GET /api/leads/:id`).
- En LeadDetalle, tab "Actividades": cuadro **💬 Notas** (comentarios) separado del cuadro **📋 Actividades** (timeline con fecha).

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
- Pasos con promesa (8): CONFECCION_PROMESA → FIRMA_CLIENTE_PROMESA → FIRMA_INMOBILIARIA_PROMESA → CONFECCION_ESCRITURA → FIRMA_CLIENTE_ESCRITURA → FIRMA_INMOBILIARIA_ESCRITURA → INSCRIPCION_CBR → ENTREGADO
- Pasos sin promesa (5): CONFECCION_ESCRITURA → FIRMA_CLIENTE_ESCRITURA → FIRMA_INMOBILIARIA_ESCRITURA → INSCRIPCION_CBR → ENTREGADO
- Al crear venta con promesa → estadoActual = CONFECCION_PROMESA; sin promesa → CONFECCION_ESCRITURA
- Auto-sincronización paso legal → estado de venta: la CONFECCIÓN **no** cambia el estado (la venta sigue en RESERVA/PROMESA); la promesa/escritura existe recién con la FIRMA_CLIENTE. Mapeo: FIRMA_CLIENTE_PROMESA y FIRMA_INMOBILIARIA_PROMESA → PROMESA; FIRMA_CLIENTE_ESCRITURA, FIRMA_INMOBILIARIA_ESCRITURA e INSCRIPCION_CBR → ESCRITURA; ENTREGADO → ENTREGADO
- Al pasar a PROMESA/ESCRITURA/ENTREGADO por firma, se setea automáticamente `venta.fechaPromesa`/`venta.fechaEscritura`/`venta.fechaEntrega` (si estaban vacías) — esa fecha define el mes de devengo de comisiones. Lo mismo aplica al cambiar el estado a mano en la venta sin pasar fecha
- **Historial legal** (`historial_legal`): cada cambio de paso queda registrado automáticamente con fecha y usuario que lo movió (también el paso inicial al convertir cotización). Se muestra en el timeline de VentaDetalle ("✓ fecha · usuario") y viene incluido en `GET /legal/:ventaId` y `GET /ventas/:id`
- **Chequeo de consistencia** (frontend, `Legal.jsx`): la página Legal muestra una alerta con las ventas donde el estado no calza con el paso legal (ej: venta en ESCRITURA con escritura recién en confección), con link a cada venta
- ProcesoLegal tiene 8 campos de fecha límite por paso (incluyendo fechaLimiteConfeccionPromesa y fechaLimiteFirmaInmobEscritura)
- Acceso: GERENTE, JEFE_VENTAS, ABOGADO
- Frontend: `pages/ventas/Legal.jsx`

### LEGAL — Integración externa (bot de emails) — `/api/legal` (API Key)
- Archivos: `routes/legalIntegracion.js`, `controllers/legalController.js` (montado ANTES del router JWT en `index.js`)
- Un proceso EXTERNO lee correos de notaría/inmobiliaria/CBR y envía resúmenes; el CRM solo recibe y guarda
- `GET /ventas-activas` — lista ventas en RESERVA/PROMESA/ESCRITURA (ventaId, comprador, unidades, estado legal, último resumen) para que el bot mapee cada correo a su venta. Auth: API Key de **lectura** (rechaza `soloEscritura`)
- `POST /resumenes` — recibe `[{ ventaId, resumen, semaforo?, proximaAccion?, fuente? }]` (o `{ resumenes: [...] }`). Crea una fila por resumen. Auth: API Key (acepta `soloEscritura`). Responde `{ recibidos, creados, noEncontrados, errores }`
- Modelo `ResumenLegal` (`resumenes_legales`): historial completo, una fila por resumen recibido (relación a Venta, `onDelete: Cascade`). `semaforo` enum `SemaforoLegal` = AL_DIA | ATENCION | ATRASADO
- El último resumen por venta se obtiene con `orderBy creadoEn desc take 1` (viene en `GET /ventas-activas`)
- **Frontend**: el resumen se muestra en 2 lugares (componente compartido `components/ResumenLegal.jsx`, semáforo en `components/ui.jsx:SEMAFORO_LEGAL`): (1) página **Legal** — columna "Situación (IA)" con badge de semáforo + resumen (tooltip) y el detalle en la fila expandida; (2) **VentaDetalle** — bloque "Resumen de la situación (IA)" dentro de la card Proceso Legal, con último resumen + historial colapsable. Los datos llegan en `GET /ventas` (último, `resumenesLegales take 1`) y `GET /ventas/:id` (historial completo)

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
- `GET /resumen` — KPIs de comisiones (GERENTE, JEFE_VENTAS); devuelve `{totalPendienteUF, totalPagadoUF, porUsuario[]}`
- `GET /mensual?mes=YYYY-MM&usuarioId=` — tramos devengados del mes + resumen por usuario (vendedor ve solo lo suyo; usuarioId filtra para gerencia)
- `GET /export?mes=YYYY-MM&usuarioId=` — Excel .xlsx del mes (GERENTE, JEFE_VENTAS; hoja Resumen por usuario con fila TOTAL + hoja Detalle; librería `xlsx`)
- `POST /` — crear (solo GERENTE)
- `PUT /:id` — editar (solo GERENTE)
- `DELETE /:id` — eliminar (solo GERENTE)
- `PUT /:id/primera` — marcar primera cuota pagada (GERENTE, JEFE_VENTAS)
- `PUT /:id/segunda` — marcar segunda cuota pagada (GERENTE, JEFE_VENTAS)
- Cálculo automático al convertir cotización en venta vía **reglas de comisión** (`lib/comisiones.js` → `aplicarReglasComision`)
- Modelo: montoPrimera (promesa) + montoSegunda (escritura); si conPromesa=false → montoPrimera=0, montoSegunda=total
- `Comision.ventaId` es opcional: una comisión puede ser de venta O de arriendo (`arriendoId`)
- **Comisión de arriendo**: al crear/editar un arriendo con `vendedorId` + `montoMensualUF`, se genera automáticamente una comisión "Arriendo 1er mes" = canon del primer mes (tramo único, devengado en el mes de `fechaInicio`); ver `arrendosController`
- Devengo: tramo promesa se devenga en el mes de `venta.fechaPromesa`; tramo escritura en el mes de `venta.fechaEscritura` (fallback `creadoEn` si la venta ya está en ese estado sin fecha); tramo ARRIENDO en el mes de `arriendo.fechaInicio`
- Script `scripts/regenerar-comisiones-ventas.js <ids>` — borra y regenera comisiones de ventas según reglas vigentes (aborta si hay tramos PAGADOS)
- Frontend: `pages/comisiones/Comisiones.jsx` (vista mensual con export + tabla completa + reglas + plantillas)

### REGLAS DE COMISIÓN — `/api/reglas-comision`
- Archivos: `routes/reglasComision.js`, `controllers/reglasComisionController.js`, motor en `lib/comisiones.js`
- `GET /` — listar (GERENTE, JEFE_VENTAS); `POST /`, `PUT /:id`, `DELETE /:id` — solo GERENTE
- Modelo `ReglaComision`: nombre, usuarioId? XOR rol?, ambito (VENDE | VENTAS_DE_OTROS | TODAS), origen (CUALQUIERA | SOLO_WEBINAR | NO_WEBINAR), porcentaje, pctPromesa+pctEscritura (suman 100), activa
- Motor (`aplicarReglasComision`, se ejecuta al convertir cotización en venta):
  - Venta "webinar" = `lead.campana` contiene "webinar" (case-insensitive)
  - Ámbito VENDE: se aplica UNA regla al vendedor — regla por usuario > regla por rol; origen específico > CUALQUIERA
  - Ámbito VENTAS_DE_OTROS: aplica a todos los usuarios del rol/usuario cuando NO son el vendedor (ej: jefe de ventas 1%)
  - Ámbito TODAS: se suma siempre que el origen calce (ej: ChileParadise 4% en ventas webinar)
  - Broker asignado a la venta: comportamiento histórico (su `comisionPorcentaje` personal, split 50/50)
- Reglas vigentes (seed `scripts/seed-reglas-comision.js`): Vendedor 4% (100% promesa) · Christian Godoy 8% no-webinar / 4% webinar (100% promesa) · JV vende 4% (100% promesa) · JV 1% ventas del equipo (50/50) · ChileParadise (usuario 18, agencia webinar sin acceso) 4% ventas webinar (50/50)
- Frontend: sección "Reglas de comisión automáticas" en `pages/comisiones/Comisiones.jsx` (ver GERENTE/JV, editar solo GERENTE)

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

### PROMOCIONES — `/api/promociones` ⭐ MODELO UNIFICADO (descuentos + packs + beneficios)
- Archivos: `routes/promociones.js`, `controllers/promocionesController.js`
- Unifica packs, beneficios y descuentos por unidad en un solo modelo `Promocion`. Reemplaza el uso de `/api/packs` y `/api/beneficios` (que siguen existiendo solo por compatibilidad con cotizaciones antiguas).
- `GET /` — listar (acepta `?activa=true`, `?campanaId=X`)
- `GET /:id` — obtener
- `POST /` — crear (GERENTE, JEFE_VENTAS)
- `PUT /:id` — editar
- `DELETE /:id` — desactivar
- `POST /:id/unidades` / `DELETE /:id/unidades/:unidadId` — asociar/quitar unidades a la promo
- **Categoría** (discriminador): `DESCUENTO` (afecta precio) | `BENEFICIO` (no afecta precio, es regalo, mantiene seguimiento post-venta)
- **Tipos**: `DESCUENTO_UF`, `DESCUENTO_PORCENTAJE`, `PAQUETE`, `BENEFICIO`, `ARRIENDO_ASEGURADO`, `GASTOS_NOTARIALES`, `CUOTAS_SIN_INTERES`, `OTRO`
- **DESCUENTO_UF con unidades asociadas = descuento POR UNIDAD** → se snapshotea en `CotizacionItem.descuentoUF` → habilita el **precio tachado por unidad** en la cotización (precio webinar). Sin unidades = descuento fijo por volumen (si items ≥ `minUnidades`).
- Campos: nombre, descripcion, categoria, tipo, valorUF, valorPorcentaje, minUnidades, meses, montoMensualUF, detalle, fechaInicio, fechaFin, activa, campanaId (nullable), unidades[]
- Alias para el frontend: `mesesArriendo` y `cuotasSinInteres` = `meses`
- Se aplican en cotizaciones: `CotizacionPromocion` (con `descuentoAplicadoUF` recalculado)
- Frontend: `pages/promociones/Promociones.jsx`

### CAMPAÑAS DE PROMOCIÓN — `/api/campanas` ⭐
- Archivos: `routes/campanas.js`, `controllers/campanasController.js`
- Agrupan promociones (ej: "Webinar Junio 2026"). `campanaId` es **opcional** en una promo: un beneficio permanente o de otra ocasión tiene `campanaId=null` y su vigencia vive en la propia `Promocion`.
- CRUD con `autorizar('GERENTE','JEFE_VENTAS')` para escrituras.
- Seeds de webinar: `backend/scripts/seed-webinar-ago2026.js` (el vigente: sube el precio de lista al **ancla** del excel comercial, crea los descuentos por tier con `precioObjetivoPesos`, reactiva el Pack 2+ y baja las promos del webinar anterior) · `backend/scripts/seedWebinar.js` (junio 2026, histórico). Migración packs/beneficios→promoción: `backend/scripts/migrarPromociones.js`.
- **Mecánica del precio webinar**: el precio de lista de la unidad se sube al ancla (el precio tachado) y la promo lleva el precio final al objetivo en $. Como el descuento se calcula con la UF vigente al cotizar (`precioObjetivoPesos / UF`), el precio final en pesos cae exacto aunque la UF cambie.

### PACKS — `/api/packs` (LEGACY, solo compat)
- Archivos: `routes/packs.js`, `controllers/packsController.js`. Migrados a `Promocion`. Crear nuevos vía `/api/promociones`.
- Tipos: COMBO_ESPECIFICO (unidades específicas), POR_CANTIDAD (por número de unidades)
- Se aplican en cotizaciones antiguas: `CotizacionPack`

### BENEFICIOS — `/api/beneficios` (LEGACY, solo compat)
- Archivos: `routes/beneficios.js`, `controllers/beneficiosController.js`. Migrados a `Promocion`. Crear nuevos vía `/api/promociones`.
- Tipos: ARRIENDO_ASEGURADO, GASTOS_NOTARIALES, CUOTAS_SIN_INTERES, OTRO
- Se aplican en cotizaciones antiguas: `CotizacionBeneficio`

### ARRIENDOS — `/api/arriendos`
- Archivos: `routes/arriendos.js`, `controllers/arrendosController.js`
- `GET /` — listar arriendos
- `GET /:id` — detalle
- `POST /` — crear arriendo
- `PUT /:id` — editar
- Estados: ACTIVO, TERMINADO
- Campo `vendedorId` (opcional): quien cerró el arriendo — al guardar con vendedor + canon se crea la comisión "Arriendo 1er mes" (100% del canon, si no existe ya para ese arriendo)
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
- `GET /` — notificaciones del usuario. GERENTE acepta `?vendedorId=X` para ver de otro usuario (sin vendedorId = todas).
- `PUT /:id/leer` — marcar leída
- `PUT /leer-todas` — marcar todas leídas. GERENTE acepta `?vendedorId=X`.
- `GET /config`, `PUT /config/:tipo` — config de alertas (GERENTE)
- `GET /preferencias`, `PUT /preferencias` — preferencias del usuario
- `GET /leads-sin-atencion` — leads en SEGUIMIENTO/COTIZACION_ENVIADA/NO_CONTESTA/SEGUIMIENTO_POST_VISITA con >2 días sin interacción. Acepta `?vendedorId=X&dias=N`.
- Tipos de alerta: LLAVE_NO_DEVUELTA, CUOTA_VENCIDA, LEAD_SIN_ACTIVIDAD, LEAD_ESTANCADO, FECHA_LEGAL_PROXIMA, ARRIENDO_POR_VENCER, DESCUENTO_PENDIENTE, LEAD_ETAPA_CAMBIO, LEAD_NUEVO, RECORDATORIO_LEAD, COMISION_ESCRITURA, EMAIL_RECIBIDO, ACTIVIDAD_EN_LEAD, VISITA_PROXIMA, DESCUENTO_RESUELTO
- Notificaciones en tiempo real: EMAIL_RECIBIDO (webhook inbound email), ACTIVIDAD_EN_LEAD (crear interacción por otro usuario), DESCUENTO_RESUELTO (aprobar/rechazar solicitud)
- VISITA_PROXIMA: cron cada 15 min, ventana 23h–25h antes de la visita, anti-duplicado por 2h
- `GET /api/email/sin-responder` — EmailConversacion RECIBIDO + leido=false por vendedor. GERENTE acepta `?vendedorId=X`.
- Componentes: `components/NotificacionesBadge.jsx` (badge header), `pages/notificaciones/Notificaciones.jsx` (página /notificaciones con 4 tabs)

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
- `GET /unidades-disponibles` — unidades disponibles para cotizar (con m2, precioUF, packs/beneficios/promos vigentes, **fotos de la unidad y del edificio**). Oculta `precioMinimoUF`/`precioCostoUF`/`precioVentaUF` fuera de GERENTE/JEFE_VENTAS. Lo usan el `CotizacionEditor` y el **modo reunión** — no crear otro endpoint de catálogo
- `GET /` — listar cotizaciones (propias si VENDEDOR)
- `GET /:id` — detalle completo
- `POST /` — crear cotización
- `PUT /:id` — editar
- `PUT /:id/estado` — cambiar estado (BORRADOR, ENVIADA, ACEPTADA, RECHAZADA)
- `DELETE /:id` — eliminar
- `POST /:id/convertir` — **convertir a venta** (crea Venta + PlanPago + Comisiones + `VentaPromocion` para seguimiento post-venta de beneficios)
- `POST /:id/promociones` / `DELETE /:id/promociones/:promocionId` — agregar/quitar promociones (modelo unificado) ⭐
- `POST /:id/packs` / `DELETE /:id/packs/:packId` — agregar/quitar packs (legacy)
- `POST /:id/beneficios` / `DELETE /:id/beneficios/:beneficioId` — agregar/quitar beneficios (legacy)
- Al cambiar items o promociones se llama `recalcularPromociones(cotizacionId)`: recalcula `CotizacionPromocion.descuentoAplicadoUF` y el snapshot por ítem `CotizacionItem.descuentoUF` (precio tachado).
- Totales calculados: precioListaUF − (Σ item.descuentoUF) − descuentoPromosUF − descuentoPacksUF − descuentoAprobadoUF = precioFinalUF
- ⚠️ **Sumar montos siempre con `num()` de `lib/precios.js`**: Prisma entrega los campos `@db.Decimal` como objetos, y `0 + Decimal` los concatena como texto. El middleware `decimalSerializer` solo convierte al serializar la respuesta, así que toda aritmética previa en el backend debe coercionar. Bug corregido en ago-2026 (los totales de cotizaciones de 2+ unidades salían absurdos); cubierto por tests en `tests/precios.test.js`.
- **Cotización vendedora**: el PDF (`CotizacionPDF.jsx`) muestra el precio lista **tachado** por unidad cuando hay descuento por-unidad, con el precio webinar destacado en verde. Las promos de volumen y beneficios se listan aparte.
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
- **Tipos de solicitud** (`SolicitudDescuento.tipo`): `UF`, `PESOS`, `PORCENTAJE` (monto de descuento) y `TOTAL_UF`, `TOTAL_PESOS` (precio final deseado). El vendedor elige modo (descuento o total) y moneda (UF o pesos) en el formulario.
- Conversión centralizada en `calcularDescuentoUF(tipo, valor, cotizacion)`: pesos se convierten con la **UF vigente al momento de aprobar** (tabla `uf_diaria`); los tipos TOTAL_* se comparan contra el **total actual** de la cotización (base − packs − promos − descuentos previos) y se rechazan si el precio pedido no es menor.
- `SolicitudDescuento.descuentoAplicadoUF`: monto en UF efectivamente aplicado al aprobar (auditoría — el valor pedido en pesos/% queda separado del resultado en UF). Se valida al crear (rechazo temprano de solicitudes imposibles) y se recalcula al aprobar.
- Frontend: `pages/descuentos/Descuentos.jsx` (revisión gerente: total actual, equivalencias en pesos con `useUF`, nota "estimado con UF de hoy" para pesos) y `PanelDescuento` en `pages/cotizaciones/CotizacionEditor.jsx` (radio modo/moneda, preview del total con descuento, `fmtSolicitudDescuento`)

### API PÚBLICA — `/api/public`
- Archivo: `routes/public.js`
- Auth: API Key (header `X-Api-Key` o `Authorization`). **La key por query param `?api_key=` se eliminó (2026-08-10)**: quedaba en texto plano en `logs_integraciones.endpoint` y en logs de proxy. `middleware/logIntegraciones.js: redactarUrl` además enmascara cualquier secreto que llegue en la query.
- **Rate limit** (`middleware/rateLimit.js`, en memoria — el backend es un solo proceso): 60 req/min por key en escritura (`/leads`, `/webhooks/webinar`), 120 en lectura (`/disponibilidad`). Excedido → `429` con `reintentar_en_segundos`. Identifica por API Key, o por IP si la key es inválida.
- `POST /leads` — crear lead desde sistema externo (formato nombre+apellido, legacy/Comuro)
  - Si el contacto ya tiene lead y estaba frío (PERDIDO/NO_CONTESTA), reingreso lo pasa a etapa `REACTIVADO` (magenta en Kanban). La notificación de reactivación/reingreso va **solo al vendedor asignado** (`soloAVendedor` — gerencia pidió no recibirla, 2026-07-10); la señal para el resto es la etapa en el Kanban.
- `POST /webhooks/webinar` — **Webhook único del lanzamiento (tipo Calendly)** ⭐ enruta por `estado`
  - Payload: `nombre` (completo, req), `correo`/`email`, `telefono`, `estado` (`formulario-rellenado` | `agenda` | `cancela`), `inicio`/`fechaHora` o `fecha` "DD/MM/YYYY" + `hora` "HH:MM" (solo agenda), opcionales `vendedorId`, `campana`, `notas`, `tipo`
  - `estado: formulario-rellenado` → un lead **nuevo normal** (etapa NUEVO, campaña "Webinar"), notifica LEAD_NUEVO. Dedup. Si el lead existente estaba frío (PERDIDO/NO_CONTESTA) pasa a **`REACTIVADO`** con aviso `soloAVendedor` (misma regla que `POST /leads`); además mergea `campana`/`notas` nuevas del reingreso
  - `estado: agenda` → busca/crea el lead + **agenda la reunión como `Visita`** (aparece destacada en el calendario y en la lista de Visitas), etapa `VISITA_AGENDADA`, deja una NOTA en el timeline y notifica (`ACTIVIDAD_EN_LEAD`)
  - `estado: cancela` → **borra la Visita** (con `inicio` cancela esa; sin él, las futuras sin resultado), NOTA en el timeline, notifica, y la etapa vuelve a `SEGUIMIENTO` solo si estaba en `VISITA_AGENDADA`. Antes caía en la rama "formulario" y la cita quedaba viva en el calendario disparando el recordatorio de 24h
  - Acepta `enlace` (o `meetUrl`/`link`) → link del Meet/Zoom, se guarda en `Visita.enlace`
  - Hora: se interpreta **siempre como hora de Chile** (ignora Z/offset del ISO)
  - Usa el **modelo Visita** (no interacción REUNION) para que se vea/comporte como las visitas; el recordatorio 24h lo da el cron de visitas existente
  - Idempotente: no duplica la Visita si llega el mismo lead + fecha/hora. **Reagendamiento**: si llega otra fecha y ya había cita futura pendiente (`tipo reunion_comercial`, `resultado: null`), se **mueve** esa visita en vez de crear una segunda
  - **La etapa no retrocede** (`lib/webinar.js: etapaTrasAgendar`): un lead en NEGOCIACION/RESERVA/PROMESA/ESCRITURA… que agenda otra reunión mantiene su etapa. PERDIDO sí se mueve a VISITA_AGENDADA (agendar = revivió)
  - `vendedorId` inexistente → `400` (antes reventaba con error de FK → 500)
  - La entrada de timeline es NOTA (sin fecha futura) para no duplicar el evento en el calendario
  - Si no llega fecha/hora: deja el lead en VISITA_AGENDADA y notifica para coordinar
  - Vendedor fallback: Felix (ID 8) si el lead no tiene asignado
  - Doc para el proveedor: `docs/API_WEBHOOKS_LANZAMIENTO.html` · Test e2e: `backend/scripts/testWebhookWebinar.js` (22 checks) · Unitarios: `backend/tests/webinar.test.js`
  - ⚠️ **`Visita.tipo` es un enum de Prisma**: los valores válidos son `presencial | virtual | reunion_comercial`. El `@map("Reunión comercial")` es el valor en la BD, **no** el que acepta el cliente — mandarlo tiraba `PrismaClientValidationError` → 500 en toda agenda (bug 2026-08-10, ninguna agenda del webinar llegó a registrarse). Usar `lib/webinar.js: tipoVisita()`
- Deduplicación: por email/teléfono + similitud nombre (Levenshtein ≥ 0.6). El **teléfono se compara normalizado** (solo dígitos, últimos 9) vía `regexp_replace` en Postgres: el proveedor manda el mismo número como "9 7641 7336" y "+56976417336"
- `lib/webinar.js` — funciones puras del webhook (nombre "Apellido, Nombre", teléfono, parseo de fecha independiente de la TZ del proceso, enlace, tipo de visita, enrutado por `estado`, etapas). Testeadas sin BD en `tests/webinar.test.js`
- Auto-asigna a JEFE_VENTAS si no se especifica vendedor
- Usa `lib/deduplication.js`
- Gestión de API Keys: `pages/configuracion/ApiKeys.jsx`
- **Log de integraciones** (`middleware/logIntegraciones.js` → tabla `logs_integraciones`): registra cada request a `/api/leads/upsert` y `/api/public/*` con status, key usada, IP, payload y error devuelto. Va antes de `autenticarApiKey` para capturar también los 401. Diagnóstico de caídas del flujo de leads (agregado 2026-07-09 tras el corte del 7 jul).

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

### PLANTILLAS DE EMAIL PERSONALES — `/api/plantillas-email`
- Archivos: `routes/plantillasEmail.js`, `controllers/plantillasEmailController.js`
- Modelo `PlantillaEmail` (tabla `plantillas_email`): id, usuarioId, nombre, asunto, cuerpo, orden. **Personales** — cada usuario solo ve/edita las suyas.
- `GET /` — mis plantillas · `POST /` — crear · `PUT /:id` — editar · `DELETE /:id` — eliminar · `POST /sembrar-base` — cargar 5 plantillas de ejemplo (solo si no tiene ninguna)
- Frontend: página `pages/plantillas/PlantillasEmail.jsx` (ruta `/plantillas-email`, menú General). Variable `{nombre}` = nombre del lead.
- **Compositor** (`EmailCard.jsx`): las plantillas rápidas ahora salen de las del usuario; si no tiene ninguna, usa las 5 de ejemplo hardcodeadas como fallback.

### CENTRO DE ASIGNACIÓN — `/asignacion`
- Archivo: `pages/asignacion/CentroAsignacion.jsx`
- Acceso: GERENTE y JEFE_VENTAS únicamente
- Filtros: campaña (multiselect), origen, fecha (Hoy/Ayer/Esta semana/rango), toggle "solo sin asignar"
- Tabla con selección múltiple (checkbox)
- Barra flotante al seleccionar: elegir vendedor → `POST /api/leads/asignar-masivo`
- Usa endpoints existentes: `GET /api/leads`, `GET /api/leads/campanas`, `GET /api/usuarios`

### Reporte semanal del gerente (`/reporte-semanal`)
- Solo GERENTE. Cubre semana anterior (lun-dom, hora Chile UTC-4).
- Cron lunes 11 UTC (7 AM Chile) genera para todos los gerentes activos.
- Tabla de actividad diaria por vendedor (lun a dom con totales).
- KPIs por vendedor: llamadas/emails/wsp/reuniones/cambios etapa/cotizaciones enviadas/perdidos/ventas/UF vendido.
- Pipeline snapshot al cierre (cuántos leads en cada etapa).
- IA genera: resumen ejecutivo, vendedor destacado, vendedor en caída, patrones, alertas (warning/info/critico), plan recomendado.
- Tabla `reportes_semanales` (unique gerenteId+fechaInicio).
- Endpoints:
  - `GET /api/reportes-semanal/mi-reporte` — más reciente
  - `GET /api/reportes-semanal` — histórico
  - `POST /api/reportes-semanal/generar` — manual

### Mi reporte IA (`/mi-reporte`)
- Reporte diario personalizado generado con Groq (Llama 3.3 70B, gratis: 14.400 req/día)
- Agrega leads parados (≥3 días) en SEGUIMIENTO, COTIZACION_ENVIADA, etc.
- IA genera: saludo, insights (warning/info/ok), cotizaciones urgentes con sugerencias por lead, promesas vencidas, otros seguimientos, plan recomendado del día
- Tabla `reportes_diarios` (unique vendedorId+fecha) — un reporte por vendedor por día
- Cron: 11 UTC genera para todos los vendedores activos (VENDEDOR, JEFE_VENTAS)
- Endpoints:
  - `GET /api/reportes-ia/mi-reporte` — propio (hoy o el más reciente)
  - `GET /api/reportes-ia/vendedor/:id` — específico (GERENTE/JEFE_VENTAS)
  - `POST /api/reportes-ia/generar` — manual, body `{ vendedorId? }` (GERENTE)
- Variable de entorno requerida: `GROQ_API_KEY` (en Railway)
- Vista: gerentes/jefes pueden cambiar de vendedor con selector en el header

### MODO REUNIÓN (`/reunion` y `/reunion/:leadId`) — ago 2026
- Archivo: `pages/reunion/ModoReunion.jsx`. Entradas: botón en el header (`components/Layout.jsx: BotonModoReunion`) y botón en `LeadDetalle`
- **Ruta fuera del `Layout`**: va a pantalla completa, sin menú, sin notificaciones, sin badges
- Acceso: GERENTE, JEFE_VENTAS, VENDEDOR, BROKER_EXTERNO
- Para qué: es la vista que el vendedor le muestra al cliente en la reunión. Solo catálogo disponible, fotos y precios; nada de gestión interna
- **Siempre se entra con un cliente**: `/reunion` sin lead muestra un buscador ("¿Con quién es la reunión?") y no deja pasar hasta elegirlo, porque la reunión se registra contra alguien. Desde `/leads/:id` entra directo con ese cliente
- **No tiene endpoint propio**: usa `GET /api/cotizaciones/unidades-disponibles`, que ya filtra DISPONIBLE y oculta `precioMinimoUF`/`precioCostoUF`/`precioVentaUF` a quien no es GERENTE/JEFE_VENTAS
- Flujo: filtrar (tipo/edificio) → tocar unidades → panel "Su propuesta" con total en UF y pesos (UF del día) → **Crear cotización** hace `POST /api/cotizaciones` y navega al `CotizacionEditor`
- **Portada del edificio**: al filtrar por un edificio aparece arriba, en **dos columnas** — la foto grande a la izquierda (limpia, sin texto ni degradado encima, con tira de miniaturas) y los datos a la derecha sobre blanco: comuna, dirección, cuántas quedan, rango de m² y desde cuánto (en UF y pesos). Se probó primero con la foto de fondo y el texto encima, pero tapaba justo el edificio, que es lo que el vendedor quiere mostrar
- **Ilustraciones** (`pages/reunion/ilustraciones.jsx`): isométricas, armadas por composición de cajas sobre una proyección propia (no hay dependencia de dibujo). Bodega con cajas y muebles, estacionamiento con auto, y edificio para la portada sin fotos. Se usan cuando la unidad **no tiene foto propia**: rellenar con fotos del edificio hacía que veinte bodegas distintas se vieran como la misma. Vista de apoyo para revisarlas: `/reunion-ilustraciones`
- **Beneficios** (el vendedor elige cuáles van):
  - *Beneficios que aplican*: los que la unidad trae asociados (los "Precio Webinar" de cada edificio). Vienen marcados y se pueden desmarcar
  - *Puedes agregar*: el resto del catálogo vigente (`GET /promociones`, `/packs`, `/beneficios`) — cuotas sin interés, gastos operacionales, notariales, CBR, repisas… Se muestran **solo los generales** (`_count.unidades === 0`): los que están amarrados a unidades concretas no se ofrecen para otra unidad (no tiene sentido dar el "Precio Webinar Trinitarias" a una bodega de Temuco). Los que exigen 2+ unidades (`minUnidades`) no aparecen con una sola
  - El catálogo arrastra el modelo viejo (packs/beneficios) junto al nuevo (promociones) con varios nombres repetidos: se deduplica por nombre, con preferencia por la promoción, para no mostrarle "Gastos Operacionales" dos veces al cliente
  - `POST /cotizaciones` **no aplica nada solo**, así que sin esto la cotización salía a precio de lista — 34 de 38 unidades disponibles tienen precio webinar cargado. Se agregan con `POST /cotizaciones/:id/{promociones|packs|beneficios}`, que dispara `recalcularPromociones`; el frontend **no estima** el descuento: recarga la cotización y muestra los totales reales. Verificado: Bodega 2 de 122,17 UF a 97,68 UF, y los beneficios elegidos salen en el PDF bajo "Beneficios incluidos"
- **Comparador** (`Comparador` en el mismo archivo): con 2 o más unidades elegidas aparece "Comparar las N". Muestra precio, superficie, precio por m², ubicación y beneficios lado a lado, y marca cuál gana en cada fila (menor entrada / la más grande / mejor valor). El precio por m² se omite si la unidad no tiene m² cargados (los tándem). "Elegir esta" deja esa sola en la propuesta
- Muestra precios de **lista**. Los descuentos por volumen y promociones los aplica el backend al crear la cotización (`recalcularPromociones`) — la pantalla no los estima para no prometer un número que después no cuadre
- **La cotización se ve y se manda sin salir de la reunión** (`ModalCotizacion` en el mismo archivo): al crearla se recarga completa (`GET /cotizaciones/:id`, ya con promociones aplicadas) y se muestra el PDF en pantalla con `PDFViewer`. Al lado: destinatario prellenado con el correo del contacto **y editable**, asunto y mensaje sugeridos (usa `plantillaCotizacion` del vendedor si la tiene). "Enviar por correo" adjunta el PDF (`POST /email/enviar` con `pdfBase64` + `leadId`) y marca la cotización como ENVIADA. También se puede descargar. El botón "Seguir en la reunión" cierra el modal y devuelve al catálogo — no se navega al editor
  - Si el vendedor no tiene `smtpEmail` configurado se le avisa **al abrir** el modal y el botón queda deshabilitado (antes reventaba con un 400 recién al apretar, en plena reunión). Hoy 3 de 5 vendedores no lo tienen puesto
- `cotizacionParaPDF` vive en `pages/cotizaciones/cotizacionParaPDF.js` — estaba duplicada en `CotizacionEditor` y `EmailCard`; ahora la comparten los tres
- El selector de cliente busca contra el servidor (`GET /leads?search=`, mínimo 2 letras, tope 50): hay más de 1.000 leads y cargarlos todos colgaba el modal
- Visor de fotos: galería de la unidad y, a continuación, la del edificio

### SESIONES DE REUNIÓN — `/api/reuniones` — ago 2026
- Archivos: `routes/reuniones.js`, `controllers/reunionesController.js`. Modelo **`SesionReunion`** (tabla `sesiones_reunion`)
- Deja registro de qué se le mostró al cliente en el modo reunión, qué quedó en la propuesta y si terminó en cotización
- `POST /` — abre la reunión (`{ leadId }`). Si el vendedor ya tenía una abierta con ese cliente **la retoma**: recargar la página en plena reunión no debe abrir una segunda
- `PATCH /:id` — `unidadesVistas` se **acumulan** (lo mostrado no se desmuestra), `unidadesPropuestas` se reemplaza (refleja el estado actual)
- `POST /:id/cerrar` — marca `fin` y crea una **`Actividad` REUNION_COMERCIAL** en el lead: `descripcion` con el resumen ("Reunión de 12 min · 8 unidades mostradas · 2 en la propuesta · cotización #41") y `resultado` con el detalle ("Bodega 209 (Plus) · Estac. E2-E4 (Brasil)"). Es idempotente: cerrar dos veces no duplica la actividad. Una reunión donde no se mostró nada no ensucia el historial
- `GET /?leadId=` — historial de reuniones (acotado por `filtroAcceso`)
- Se cierra sola al salir del modo reunión y al crear la cotización
- Acceso por `puedeAccederLead` (lib/acceso.js); el ABOGADO queda fuera
- `LeadDetalle` muestra el `resultado` bajo la actividad cuando el tipo es REUNION_COMERCIAL

### FOTOS DEL CATÁLOGO — ago 2026
- `Edificio.fotos` → modelo **`FotoEdificio`** (tabla `fotos_edificio`): url, urlMiniatura, nombre, categoria (fachada/acceso/interior/plano), orden
- `Archivo` (fotos de unidad) sumó `urlMiniatura`, `orden` y `esPortada`
- **Jerarquía de la foto que se muestra**: portada de la unidad → primera foto del edificio → marcador "sin foto". Cuando cae al edificio, la ficha lo dice con una etiqueta ("FOTO DEL EDIFICIO") para no hacer pasar una foto genérica por la de la unidad
- Import masivo: `scripts/importarFotos.js --origen <carpeta> [--ejecutar]`
  - Sin `--ejecutar` es **simulación**: no escribe ni archivos ni BD
  - Convierte todo a **WebP** (1600px + miniatura cuadrada de 480px) con ImageMagick. **Los HEIC de iPhone no los muestra ningún navegador**: convertir no es opcional. La conversión baja el peso ~10x (129 MB → ~15 MB)
  - Mapea `Bodegas|Estacionamiento/<Edificio>/<Bodega N>` a la unidad, y las sueltas a la galería del edificio. En Brasil el número va en el nombre del archivo (`E2-E4.jpg`, `E14.jpg` → tándem `E14-E16`)
  - Idempotente: no reimporta una foto ya cargada (compara por nombre original)
  - `--reordenar` recalcula orden y categoría sin reconvertir. `--portada "Edificio=parte-del-archivo"` fija la portada a mano: la detección por cielo acierta con día despejado, pero con cielo nublado una fachada se parece demasiado a un pasillo iluminado (fue el caso de Trinitarias)
- ⚠️ Las fotos se guardan en `backend/uploads/catalogo/`, que en Railway es **disco efímero**: se pierden en cada deploy si no se monta un volumen

---

## Librerías compartidas (backend/src/lib/)

| Archivo | Propósito |
|---------|-----------|
| `prisma.js` | Cliente Prisma singleton |
| `auth.js` (middleware) | JWT + verificación de rol |
| `upload.js` | Multer para archivos |
| `mailer.js` | Resend API para emails |
| `deduplication.js` | `mismoNombre()` + Levenshtein — usado en comuro.js y public.js |
| `webinar.js` | Utilidades puras del webhook del webinar: `splitNombre`, `normalizarTelefono`, `parsearFechaHoraCita`, `detectarEnlaceReunion`, `tipoVisita`, `clasificarEstado`, `etapaTrasAgendar`, `esFrio` (con tests) |
| `rateLimit.js` (middleware) | `rateLimit({max, ventanaMs, nombre})` — tope de requests en memoria para la API pública |
| `notifications.js` | `notificarLead()` — usado en leadsController.js y comuro.js |
| `groq.js` | Wrapper REST a Groq API — Llama 3.3 70B (`GROQ_API_KEY`) — usado por reportes IA |
| `reportes.js` | Generador de reportes diarios con IA (agrega datos + llama a Groq) |
| `reportesSemanal.js` | Generador de reporte semanal del gerente (lunes a domingo, agrega datos por vendedor + IA) |
| `precios.js` | `calcularTotalesVenta`, `prorratearPrecioVenta`, `verificarCuadratura` — lógica de precios/cuadratura (con tests) |
| `comisiones.js` | `aplicarReglasComision` (acepta `tx`), `esVentaWebinar`, `montoComision` (cálculo por tramos, con tests) |
| `acceso.js` | `filtroAcceso` + `puedeAccederLead` — control de acceso por rol reutilizable; base para cerrar IDOR (con tests) |
| `fechaChile.js` | `desdeHoraChile` / `offsetSantiagoMin` — interpreta hora local de Chile con DST (con tests) |

## Calidad (tests + lint)
- **Tests**: `cd backend && npm test` (node:test). Cubren precios/prorrateo/cuadratura, dedup, acceso por rol, fecha Chile y cálculo de comisiones. También un e2e cotización→venta (`tests/e2e/`).
- **Lint**: `npm run lint` en `backend/` y `frontend/` (ESLint 9 flat config). Frontend sin errores; reglas nuevas de hooks (`set-state-in-effect`, `refs`) y `react-refresh` quedan como *warning*.
- **Acceso/seguridad**: los endpoints con `:id` o subrecursos de lead verifican pertenencia vía `lib/acceso`. Roles GERENTE/JEFE_VENTAS ven precios de costo/mínimo/venta; el resto no (backend los quita y la UI los oculta).

---

## Cron jobs (backend/src/jobs/ — registrados desde index.js)

| Schedule | Acción |
|----------|--------|
| Diario 9:00 AM | Actualizar UF desde mindicador.cl |
| Cada 15 min | Procesar recordatorios vencidos → crear notificaciones |
| Diario 12:00 UTC | Chequeo de alertas (LEAD_SIN_ACTIVIDAD, LEAD_ESTANCADO) |
| Diario 11:00 UTC (7-8 AM Chile) | Generar reportes IA del día para vendedores activos |
| Lunes 11:00 UTC (7 AM Chile) | Generar reporte semanal del gerente (cubre lun-dom anterior) |

---

## Componentes reutilizables (frontend)

| Componente | Uso |
|-----------|-----|
| `BuscadorUniversal.jsx` | Búsqueda en header |
| `NotificacionesBadge.jsx` | Badge de notificaciones en header |
| `UFDisplay.jsx` | Valor UF actual |
| `ModalEmail.jsx` | Enviar email desde cualquier contexto |
| `Layout.jsx` | Wrapper con sidebar + header; incluye `BotonModoReunion` |
| `ui.jsx` | ETAPA_COLOR, ETAPA_LABEL y constantes UI compartidas |

---

## Páginas sin módulo backend dedicado

- `pages/automatizaciones/Automatizaciones.jsx` — página de automatizaciones (UI solamente)
- `pages/promociones/Promociones.jsx` — gestión de promociones unificadas (descuentos, packs y beneficios; usa `/api/promociones` y `/api/campanas`)
- `pages/perfil/MiPerfil.jsx` — perfil propio: email de envío, plantillas de email (general + cotización), firma HTML, notificaciones

---

## Decisiones de diseño importantes

1. **Precio en ventas**: `precioFinalUF` (NO `precioUF` que fue eliminado). Los campos son: `precioListaUF`, `descuentoPacksUF`, `descuentoAprobadoUF`, `precioFinalUF`
2. **Actividades vs Recordatorios**: Las actividades (Interaccion) son la fuente de verdad. Tienen campo `fecha` que puede ser futuro. El modelo Recordatorio existe en BD pero su UI fue eliminada.
3. **Embudo de ventas**: Todos los pasos cuentan leads por etapa, no mezcla con ventas.
4. **Deduplicación**: Centralizada en `lib/deduplication.js` (Levenshtein, similitud ≥ 0.6)
5. **Notificaciones**: Centralizadas en `lib/notifications.js`
6. **Schema migrations**: Se usa `prisma db push` (no `migrate dev`) por historial de migraciones con drift.
7. **Montos en Decimal**: Los campos de dinero (UF/pesos) son `Decimal` (`@db.Decimal(18,6)` UF, `(18,2)` pesos), no Float. El middleware `middleware/decimalSerializer.js` convierte `Prisma.Decimal → number` antes de `res.json`, así el frontend recibe números como siempre. Hacer aritmética en backend coerciona bien; al escribir se aceptan `Number(...)`.
8. **Integridad referencial**: FKs con `@@index`; `onDelete: Cascade` en hijos efímeros del lead (interaccion/actividad/visita/recordatorio/email) — ventas y cotizaciones quedan protegidas (Restrict). Uniques de negocio: `Unidad(edificioId,numero)`, `Contacto.rut`, `Llave.codigo` (errores P2002 → 409 con mensaje).
9. **Enums de integridad**: `Visita.tipo` (TipoVisita), `EmailConversacion.direction` (DireccionEmail), `Postventa.prioridad` (PrioridadPostventa), `MovimientoLlave.tipo` (TipoMovimientoLlave). Los nombres de los enums coinciden con los valores históricos para no migrar datos ni tocar el frontend.
10. **Filtros de acceso por usuario**: `Usuario.edificiosFiltro` / `leadsIndividualesFiltro` / `campanasFiltro` son arrays usados por `leadsController.filtroAcceso` (control de visibilidad de leads, cargados en `auth.js` por request). Se mantienen como arrays a propósito (un ID obsoleto es inofensivo; migrar a tablas puente agregaría overhead por request sin beneficio real).

---

*Última actualización: 23 Junio 2026 — auditoría BBDD: índices/onDelete, uniques de negocio, montos en Decimal + serializador, enums de integridad*
*Actualizar este archivo después de cada cambio significativo.*
