# Mapa del Sistema CRM - Bodegas & Estacionamientos

## 1. MAPA GENERAL DE MÓDULOS

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          CRM BODEPARKING                                │
├─────────────────┬───────────────────┬───────────────────────────────────┤
│   👥 EQUIPO     │   🏢 INVENTARIO   │        💰 COMERCIAL               │
│                 │                   │                                   │
│  · Vendedores   │  · Proyectos      │  PIPELINE DE VENTAS:              │
│  · Brokers      │  · Bodegas        │  Lead → Visita → Propuesta        │
│  · Jefe Ventas  │  · Estacionamtos  │       → Negociación → Venta       │
│  · Admin        │  · Precios        │                                   │
│                 │  · Descuentos     │  · Asignación vendedor/broker     │
│                 │  · Promociones    │  · Historial de interacciones     │
│                 │  · Estado unidad  │  · Documentos                     │
├─────────────────┴───────────────────┴───────────────────────────────────┤
│                         📋 CONTRATOS & POSTVENTA                        │
│                                                                         │
│  VENTA:                              ARRIENDO:                          │
│  · Promesa de compraventa            · Contrato de arriendo             │
│  · Escritura                         · Arrendatario                     │
│  · Entrega                           · Renovaciones                     │
│  · Postventa (reclamos, trámites)    · Término contrato                 │
├─────────────────────────────────────────────────────────────────────────┤
│                         🔑 LLAVES                    💳 PAGOS           │
│                                                                         │
│  · Inventario de llaves              · Cuotas de venta (pie, crédito)  │
│  · Préstamos (quién tiene qué)       · Arriendos mensuales             │
│  · Historial movimientos             · Estado: pendiente/pagado/atraso │
│                                      · Comprobantes                    │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. FLUJO DEL PIPELINE DE VENTAS

```
[CONTACTO ENTRA]
       │
       ▼
  ┌─────────┐
  │  LEAD   │ ← origen: web, referido, broker, redes, visita espontánea
  │  NUEVO  │   asignado a: vendedor / broker
  └────┬────┘
       │
       ▼
  ┌─────────┐
  │ VISITA  │ ← fecha, tipo (presencial/virtual), resultado
  │AGENDADA │
  └────┬────┘
       │
       ▼
  ┌─────────┐
  │VISITA   │ ← notas, interés, unidad vista
  │REALIZADA│
  └────┬────┘
       │
       ▼
  ┌─────────┐
  │PROPUESTA│ ← unidad específica, precio, descuento
  └────┬────┘
       │
       ▼
  ┌──────────────┐
  │ NEGOCIACIÓN  │ ← contraoferta, ajuste precio, condiciones
  └──────┬───────┘
         │
    ┌────┴────┐
    ▼         ▼
┌───────┐  ┌────────┐
│GANADO │  │PERDIDO │ ← motivo pérdida
└───┬───┘  └────────┘
    │
    ▼
┌──────────────────────────────────────┐
│             PROCESO DE VENTA         │
│  Promesa → Escritura → Entrega       │
└──────────────────────────────────────┘
    │
    ▼
┌──────────┐
│POSTVENTA │ ← reclamos, consultas, trámites
└──────────┘
```

---

## 3. ESTRUCTURA DE BASE DE DATOS

### MÓDULO: EQUIPO

```
USUARIOS
├── id
├── nombre
├── apellido
├── email (único)
├── teléfono
├── rol: [admin | jefe_ventas | vendedor | broker]
├── activo: boolean
└── fecha_ingreso
```

---

### MÓDULO: INVENTARIO

```
PROYECTOS
├── id
├── nombre
├── dirección
├── ciudad
├── descripción
├── imagen_portada
└── estado: [activo | en_venta | agotado | pausado]

UNIDADES  ←─── pertenece a PROYECTO
├── id
├── proyecto_id
├── tipo: [bodega | estacionamiento]
├── número / código
├── piso
├── tamaño_m2
├── precio_lista
├── precio_minimo        ← precio piso para negociación
├── estado: [disponible | reservado | vendido | arrendado]
└── notas

PROMOCIONES
├── id
├── nombre
├── descripción
├── tipo: [descuento_porcentaje | precio_especial | regalo]
├── valor
├── aplica_a: [todas | proyecto_id | tipo_unidad]
├── fecha_inicio
├── fecha_fin
└── activa: boolean
```

---

### MÓDULO: CONTACTOS & LEADS

```
CONTACTOS
├── id
├── nombre
├── apellido
├── rut / documento
├── email
├── teléfono
├── empresa (opcional)
├── origen: [web | referido | broker | redes | visita_directa | otro]
└── fecha_registro

LEADS  ←─── tiene CONTACTO, puede tener UNIDAD de interés
├── id
├── contacto_id
├── unidad_interes_id    ← opcional, puede no saber qué quiere aún
├── vendedor_id          ← vendedor asignado
├── broker_id            ← si vino por broker (opcional)
├── estado: [nuevo | contactado | visita_agendada | visita_realizada |
│            propuesta | negociacion | ganado | perdido]
├── presupuesto_aprox
├── motivo_perdida       ← solo si estado = perdido
├── notas
└── fecha_creacion

VISITAS  ←─── pertenece a LEAD
├── id
├── lead_id
├── fecha_hora
├── tipo: [presencial | virtual]
├── vendedor_id
├── resultado: [positivo | neutro | negativo]
└── notas

INTERACCIONES  ←─── historial de contactos con un lead
├── id
├── lead_id
├── tipo: [llamada | email | whatsapp | reunion]
├── descripcion
├── fecha
└── usuario_id           ← quién hizo el contacto
```

---

### MÓDULO: VENTAS

```
VENTAS  ←─── tiene LEAD, tiene UNIDAD
├── id
├── lead_id
├── unidad_id
├── comprador_id         ← contacto_id del comprador
├── vendedor_id
├── broker_id            ← opcional
├── jefe_ventas_id
├── precio_venta
├── descuento_aplicado
├── promocion_id         ← opcional
├── estado: [promesa | escritura | entregado | anulado]
├── fecha_promesa
├── fecha_escritura
├── fecha_entrega
└── notas

POSTVENTA  ←─── pertenece a VENTA
├── id
├── venta_id
├── tipo: [reclamo | consulta | tramite | garantia]
├── descripcion
├── estado: [abierto | en_proceso | cerrado]
├── prioridad: [baja | media | alta]
├── fecha_apertura
├── fecha_cierre
├── responsable_id
└── resolucion
```

---

### MÓDULO: ARRIENDOS

```
ARRENDATARIOS  ←─── tiene CONTACTO, tiene UNIDAD
├── id
├── contacto_id
├── unidad_id
├── fecha_inicio
├── fecha_fin
├── monto_mensual
├── dia_pago             ← ej: día 5 de cada mes
├── estado: [activo | terminado | moroso]
└── notas

CONTRATOS_ARRIENDO
├── id
├── arrendatario_id
├── archivo_url          ← documento firmado
├── fecha_firma
└── tipo: [nuevo | renovacion]
```

---

### MÓDULO: LLAVES

```
LLAVES  ←─── pertenece a UNIDAD
├── id
├── unidad_id
├── codigo / etiqueta
├── cantidad_copias
├── estado: [en_oficina | prestada | perdida]
└── notas

MOVIMIENTOS_LLAVES  ←─── pertenece a LLAVE
├── id
├── llave_id
├── tipo: [prestamo | devolucion]
├── persona_nombre
├── persona_contacto     ← teléfono o email
├── motivo               ← visita, propietario, etc.
├── fecha_prestamo
├── fecha_devolucion_esperada
├── fecha_devolucion_real
└── usuario_responsable_id  ← quién entregó la llave
```

---

### MÓDULO: PAGOS

```
PLANES_PAGO  ←─── pertenece a VENTA o ARRIENDO
├── id
├── referencia_tipo: [venta | arriendo]
├── referencia_id
├── total_cuotas
├── monto_total
└── fecha_inicio

CUOTAS  ←─── pertenece a PLAN_PAGO
├── id
├── plan_pago_id
├── numero_cuota
├── tipo: [reserva | pie | cuota | arriendo | escritura]
├── monto
├── fecha_vencimiento
├── fecha_pago_real
├── estado: [pendiente | pagado | atrasado | condonado]
├── metodo_pago: [transferencia | cheque | efectivo | credito]
├── numero_comprobante
└── notas
```

---

## 4. RELACIONES PRINCIPALES (resumen)

```
PROYECTO ──< UNIDAD ──< LEAD
                  │──< VENTA ──< POSTVENTA
                  │──< ARRENDATARIO
                  └──< LLAVE ──< MOVIMIENTOS_LLAVES

CONTACTO ──< LEAD ──< VISITA
         │        └──< INTERACCIONES
         ├──< VENTA (como comprador)
         └──< ARRENDATARIO

USUARIO (vendedor/broker) ──< LEAD
                          ──< VISITA
                          ──< VENTA

VENTA ──< PLAN_PAGO ──< CUOTAS
ARRENDATARIO ──< PLAN_PAGO ──< CUOTAS
```

---

## 5. MÓDULOS EN ORDEN DE CONSTRUCCIÓN SUGERIDO

| Fase | Módulo | Por qué primero |
|------|--------|-----------------|
| 1 | Usuarios / Login | Base de todo |
| 2 | Inventario (Proyectos + Unidades) | Es el catálogo central |
| 3 | Contactos + Leads + Pipeline | Corazón del CRM |
| 4 | Visitas e Interacciones | Parte del pipeline |
| 5 | Ventas + Postventa | Cierre del ciclo comercial |
| 6 | Pagos y Cuotas | Gestión financiera |
| 7 | Arriendos | Módulo paralelo |
| 8 | Llaves | Operacional |
| 9 | Reportes y Dashboard | Vista gerencial |
