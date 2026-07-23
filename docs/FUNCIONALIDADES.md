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
- Seed del webinar: `backend/scripts/seedWebinar.js`. Migración packs/beneficios→promoción: `backend/scripts/migrarPromociones.js`.

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
- `GET /unidades-disponibles` — unidades disponibles para cotizar (con m2, precioUF, packs disponibles)
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
- Auth: API Key (header `X-Api-Key`)
- `POST /leads` — crear lead desde sistema externo (formato nombre+apellido, legacy/Comuro)
  - Si el contacto ya tiene lead y estaba frío (PERDIDO/NO_CONTESTA), reingreso lo pasa a etapa `REACTIVADO` (magenta en Kanban). La notificación de reactivación/reingreso va **solo al vendedor asignado** (`soloAVendedor` — gerencia pidió no recibirla, 2026-07-10); la señal para el resto es la etapa en el Kanban.
- `POST /webhooks/webinar` — **Webhook único del lanzamiento (tipo Calendly)** ⭐ enruta por `estado`
  - Payload: `nombre` (completo, req), `correo`/`email`, `telefono`, `estado` (`formulario-rellenado` | `agenda`), `inicio`/`fechaHora` (ISO 8601) o `fecha` "DD/MM/YYYY" + `hora` "HH:MM" (solo agenda), opcionales `vendedorId`, `campana`, `notas`
  - `estado: formulario-rellenado` → un lead **nuevo normal** (etapa NUEVO, campaña "Webinar"), notifica LEAD_NUEVO. Dedup.
  - `estado: agenda` → busca/crea el lead + **agenda la reunión como `Visita`** (aparece destacada en el calendario y en la lista de Visitas), etapa `VISITA_AGENDADA`, deja una NOTA en el timeline y notifica (`ACTIVIDAD_EN_LEAD`)
  - Acepta `enlace` (o `meetUrl`/`link`) → link del Meet/Zoom, se guarda en `Visita.enlace`
  - Hora: se interpreta **siempre como hora de Chile** (ignora Z/offset del ISO)
  - Usa el **modelo Visita** (no interacción REUNION) para que se vea/comporte como las visitas; el recordatorio 24h lo da el cron de visitas existente
  - Idempotente: no duplica la Visita si llega el mismo lead + fecha/hora
  - La entrada de timeline es NOTA (sin fecha futura) para no duplicar el evento en el calendario
  - Si no llega fecha/hora: deja el lead en VISITA_AGENDADA y notifica para coordinar
  - Vendedor fallback: Felix (ID 8) si el lead no tiene asignado
  - Doc para el proveedor: `docs/API_WEBHOOKS_LANZAMIENTO.html` · Test e2e: `backend/scripts/testWebhookWebinar.js`
- Deduplicación: por email/teléfono + similitud nombre (Levenshtein ≥ 0.6)
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
| `groq.js` | Wrapper REST a Groq API — Llama 3.3 70B (`GROQ_API_KEY`) — usado por reportes IA |
| `reportes.js` | Generador de reportes diarios con IA (agrega datos + llama a Groq) |
| `reportesSemanal.js` | Generador de reporte semanal del gerente (lunes a domingo, agrega datos por vendedor + IA) |

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
| `Layout.jsx` | Wrapper con sidebar + header |
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
