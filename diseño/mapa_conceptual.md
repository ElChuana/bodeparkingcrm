# Mapa Conceptual — CRM BodeParking

---

## 1. ARQUITECTURA TÉCNICA

```
┌─────────────────────────────────────────────────────────────────┐
│                        USUARIO (Navegador)                      │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │              FRONTEND — React                           │   │
│   │  (lo que ve y usa el usuario en el navegador web)       │   │
│   └───────────────────────┬─────────────────────────────────┘   │
└───────────────────────────┼─────────────────────────────────────┘
                            │ HTTP / API REST
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                   BACKEND — Node.js + Express                   │
│         (el servidor que procesa la lógica del negocio)         │
│                                                                 │
│   · Autenticación y permisos por rol                           │
│   · Cálculo de comisiones                                       │
│   · Motor de alertas (email / WhatsApp)                        │
│   · Conversión UF → Pesos (API CMF)                            │
└──────────┬──────────────────────────────────┬───────────────────┘
           │                                  │
           ▼                                  ▼
┌─────────────────────┐            ┌─────────────────────────┐
│  BASE DE DATOS      │            │   SERVICIOS EXTERNOS    │
│  PostgreSQL         │            │                         │
│                     │            │  · API CMF (UF diaria)  │
│  · Todos los datos  │            │  · WhatsApp / Email     │
│    del negocio      │            │    (alertas)            │
│  · Archivos en      │            │  · Almacenamiento de    │
│    almacenamiento   │            │    archivos (fotos,     │
│    en la nube       │            │    planos, contratos)   │
└─────────────────────┘            └─────────────────────────┘

      TODO DESPLEGADO EN RAILWAY (nube)
```

---

## 2. MAPA DE PANTALLAS DE LA APLICACIÓN

```
LOGIN
  └── Dashboard Principal
        │
        ├── 🏢 INVENTARIO
        │     ├── Lista de Edificios
        │     │     └── Detalle Edificio
        │     │           └── Lista de Unidades del edificio
        │     │                 └── Detalle Unidad
        │     │                       ├── Fotos y planos
        │     │                       ├── Promociones activas
        │     │                       ├── Historial (vendida/arrendada/libre)
        │     │                       └── Llave asignada
        │     └── Agregar / Editar Edificio o Unidad
        │
        ├── 👥 LEADS & PIPELINE
        │     ├── Vista Kanban por Etapa  ←── todos o filtrado por vendedor
        │     ├── Vista Kanban por Vendedor
        │     ├── Lista de Leads (tabla con filtros)
        │     └── Detalle Lead
        │           ├── Info del contacto
        │           ├── Unidad de interés
        │           ├── Historial de actividad (llamadas, emails, visitas)
        │           ├── Cambiar etapa del pipeline
        │           ├── Agendar visita
        │           └── Botón: "Convertir a Venta"
        │
        ├── 📋 VENTAS
        │     ├── Lista de Ventas (con filtros)
        │     └── Detalle Venta
        │           ├── Datos del comprador (persona/empresa/sociedad)
        │           ├── Unidad vendida
        │           ├── Precio, descuento, promociones aplicadas
        │           ├── Vendedor + Broker asignado
        │           ├── Plan de pagos y cuotas
        │           ├── Módulo Legal (estados + documentos)
        │           ├── Comisiones calculadas
        │           └── Postventa
        │
        ├── ⚖️  LEGAL
        │     ├── Lista de operaciones en proceso legal
        │     └── Detalle Legal (por venta)
        │           ├── Flujo: Promesa → Escritura → CBR → Entrega
        │           │         (o directo escritura)
        │           ├── Estado actual + fechas límite
        │           ├── Documentos subidos (promesa, escritura, etc.)
        │           └── Solo el abogado puede actualizar estados
        │
        ├── 💳 PAGOS
        │     ├── Resumen de cobros (pendientes, pagados, atrasados)
        │     ├── Por venta: cuotas y estado de cada una
        │     ├── Por arriendo: pagos mensuales
        │     ├── Registrar pago + subir comprobante
        │     └── Promociones: seguimiento de "arriendos asegurados" pagados
        │
        ├── 🔑 LLAVES
        │     ├── Lista de llaves por edificio/unidad
        │     ├── Estado actual: en oficina / prestada
        │     └── Registro de préstamos
        │           ├── A quién se prestó + cuándo
        │           └── Registrar devolución
        │
        ├── 🏠 ARRIENDOS
        │     ├── Lista de unidades arrendadas
        │     └── Detalle Arriendo
        │           ├── Datos arrendatario
        │           ├── Quién gestiona
        │           ├── Registro de pagos mensuales
        │           └── Contrato subido
        │
        ├── 💰 COMISIONES
        │     ├── Resumen por vendedor/broker (período)
        │     ├── Detalle por venta
        │     │     ├── 50% promesa + 50% escritura
        │     │     └── Estado: pendiente / pagado / descontado
        │     └── (Solo visible para Gerente y Jefe de Ventas)
        │
        ├── 🎯 PROMOCIONES
        │     ├── Lista de promociones activas
        │     ├── Crear / editar promoción
        │     │     ├── Tipo: descuento, arriendo asegurado, gastos notariales, combo
        │     │     ├── Vigencia (fechas)
        │     │     └── A qué aplica (unidad, edificio, todas)
        │     └── Seguimiento por promoción (cuántas ventas usaron esta promo)
        │
        ├── 👤 EQUIPO
        │     ├── Lista de usuarios (vendedores, brokers, etc.)
        │     ├── Detalle usuario
        │     │     ├── Datos personales
        │     │     ├── Rol y permisos
        │     │     └── % comisión configurado
        │     └── (Solo Gerente puede crear/editar usuarios)
        │
        ├── 🔔 ALERTAS
        │     ├── Centro de notificaciones (campana)
        │     └── Configuración de alertas (umbrales en días)
        │
        └── 📊 REPORTES
              ├── Embudo de ventas
              ├── Leads por vendedor
              ├── Ventas del período
              ├── Unidades disponibles
              ├── Pagos atrasados
              ├── Comisiones
              └── Exportar a Excel / PDF
```

---

## 3. BASE DE DATOS — TABLAS Y RELACIONES

```
 EDIFICIOS ──────────────────────────────────────────────────────┐
  id, nombre, dirección, región, comuna,                         │
  inmobiliaria, contacto_inmobiliaria                            │
        │                                                        │
        └──< UNIDADES                                            │
              id, edificio_id, tipo, subtipo,                    │
              número, piso, m2, techado, acceso,                 │
              precio_uf, precio_minimo_uf,                       │
              precio_costo_uf, estado                            │
                    │                                            │
                    ├──< ARCHIVOS (fotos, planos)                │
                    ├──< LLAVES                                  │
                    │       └──< MOVIMIENTOS_LLAVES              │
                    ├──< UNIDAD_PROMOCION (relación)             │
                    └──< ARRIENDO                                │
                                                                 │
 CONTACTOS                                                       │
  id, nombre, apellido, rut, email,                              │
  teléfono, empresa, origen, tipo_persona                        │
        │                                                        │
        └──< LEADS ──────────────────────────────── UNIDADES     │
              id, contacto_id, unidad_interes_id,                │
              vendedor_id, broker_id,                            │
              etapa, fecha_creacion                              │
                    │                                            │
                    ├──< VISITAS                                 │
                    ├──< INTERACCIONES (log de actividad)        │
                    └──< VENTA ──────────────────── UNIDADES     │
                          id, lead_id, unidad_id,                │
                          comprador_id, vendedor_id,             │
                          broker_id, gerente_id,                 │
                          precio_uf, descuento,                  │
                          estado_venta                           │
                                │                                │
                                ├──< PROCESO_LEGAL               │
                                │       ├── estado, fechas       │
                                │       └──< DOCUMENTOS_LEGALES  │
                                ├──< PLAN_PAGO                   │
                                │       └──< CUOTAS              │
                                ├──< COMISIONES                  │
                                │       (por vendedor/broker)    │
                                ├──< VENTA_PROMOCION             │
                                │       └── seguimiento promo    │
                                └──< POSTVENTA                   │
                                                                 │
 USUARIOS                                                        │
  id, nombre, email, rol,                                        │
  comision_porcentaje, comision_fijo                             │
        │                                                        │
        └── asignado a LEADS, VISITAS, VENTAS, LLAVES           │
                                                                 │
 PROMOCIONES                                                     │
  id, nombre, tipo, valor,                                       │
  aplica_a, fecha_inicio, fecha_fin, activa                      │
                                                                 │
 UF_DIARIA (cache)                                               │
  fecha, valor_pesos  ← se actualiza desde API CMF              │
                                                                 │
 ALERTAS_CONFIG                                                  │
  tipo, umbral_dias, activa, canal                              │
                                                                 │
 NOTIFICACIONES                                                  │
  usuario_id, tipo, mensaje, leida, fecha                       │
└────────────────────────────────────────────────────────────────┘
```

---

## 4. PANTALLA: QUIÉN VE QUÉ

```
MÓDULO              Gerente  Jte.Vtas  Vendedor  Broker Ext  Abogado
─────────────────────────────────────────────────────────────────────
Dashboard             ✅       ✅        ✅         ✅         ✅
Inventario            ✅       ✅        ─          ─          ─
  └ Precio mínimo     ✅       ✅        ✗          ✗          ─
  └ Precio costo      ✅       ✅        ✗          ✗          ─
Leads (todos)         ✅       ✅        ✗          ✗          ─
Leads (propios)       ✅       ✅        ✅         ✅          ─
Kanban (ambas vistas) ✅       ✅        ✗          ✗          ─
Kanban (por etapa)    ✅       ✅        ✅         ✅          ─
Ventas                ✅       ✅        ✗          ✗          ─
Legal                 ✅       ✅        ✗          ✗          ✅
Pagos                 ✅       ✅        ✗          ✗          ─
Llaves                ✅       ✅        ✗          ✗          ─
Arriendos             ✅       ✅        ✗          ✗          ─
Comisiones (todas)    ✅       ✅        ✗          ✗          ─
Comisiones (propias)  ✅       ✅        ✅         ✅          ─
Promociones           ✅       ✅        ✅ (ver)   ✅ (ver)    ─
Equipo / Usuarios     ✅       ─         ─          ─          ─
Alertas config        ✅       ─         ─          ─          ─
Reportes              ✅       ✅        ─          ─          ─
─────────────────────────────────────────────────────────────────────
✅ = acceso completo  ✗ = sin acceso  ─ = no aplica / solo lectura
```

---

## 5. FLUJO DE APROBACIÓN DE DESCUENTO

```
Vendedor quiere aplicar descuento bajo precio mínimo
        │
        ▼
  Sistema bloquea el descuento
  Envía notificación al Gerente
        │
        ▼
  Gerente recibe alerta (en sistema + email/WhatsApp)
  Revisa la solicitud con detalle de la venta
        │
    ┌───┴───┐
    ▼       ▼
 APRUEBA  RECHAZA
    │       │
    ▼       ▼
Sistema  Sistema
habilita notifica
descuento al vendedor
```

---

## 6. FLUJO DE COMISIONES

```
VENTA CREADA
    │
    ▼
Sistema calcula automáticamente:
  ─ Vendedor: X% del precio de venta
  ─ Broker: Y% del precio de venta  (si aplica)
  ─ Jefe de Ventas: 1% de la venta  (override: 4% si él vendió)
    │
    ▼
PROMESA FIRMADA → Se marca 50% de cada comisión como "por pagar"
    │
    ▼
ESCRITURA FIRMADA → Se marca 50% restante como "por pagar"
    │
    ▼
Si la venta NO llega a escritura:
  → El 50% adelantado se descuenta de la próxima comisión
```

---

## 7. FLUJO DE PROMOCIÓN "ARRIENDO ASEGURADO"

```
Promoción: "Arriendo asegurado 3 meses"
Asignada a venta X
    │
    ▼
Sistema crea 3 registros de pago pendiente:
  ─ Mes 1: $XXX.XXX → pendiente
  ─ Mes 2: $XXX.XXX → pendiente
  ─ Mes 3: $XXX.XXX → pendiente
    │
    ▼
Cada mes: marcar como pagado + subir comprobante
    │
    ▼
Alerta si un mes se vence sin marcar como pagado
```

---

## 8. STACK TECNOLÓGICO FINAL

| Componente | Tecnología |
|------------|-----------|
| Frontend | React + Tailwind CSS |
| Backend | Node.js + Express |
| Base de datos | PostgreSQL |
| ORM | Prisma |
| Autenticación | JWT (tokens) |
| Almacenamiento archivos | Cloudinary o AWS S3 |
| Hosting completo | Railway |
| UF en tiempo real | API CMF Chile |
| Alertas | Email (SendGrid) + WhatsApp (Twilio - plan gratuito) |
| Exportar reportes | React-PDF + ExcelJS |

---

## 9. ORDEN DE CONSTRUCCIÓN

| Fase | Qué se construye | Por qué |
|------|-----------------|---------|
| 1 | Login + Usuarios + Roles | Base de todo |
| 2 | Edificios + Unidades (Inventario) | El catálogo central |
| 3 | Contactos + Leads + Pipeline + Kanban | Corazón del CRM |
| 4 | Visitas + Interacciones + Log | Parte del pipeline |
| 5 | Ventas + Proceso Legal | Cierre comercial |
| 6 | Pagos + Cuotas | Gestión financiera |
| 7 | Comisiones | Cálculo automático |
| 8 | Promociones + Seguimiento | Incentivos de venta |
| 9 | Arriendos + Llaves | Módulo operativo |
| 10 | Alertas + Notificaciones | Sistema de avisos |
| 11 | Reportes + Dashboard + Exportación | Vista gerencial |
| 12 | Migración de 3.500 leads | Importar Excel |
