# Requisitos Completos del CRM - BodeParking

## PIPELINE DE VENTAS

```
Lead entra
  → ¿Contestó? [Sí / No / No localizable]
      → No: Seguimiento (intento 2, 3, 4...)
      → Sí:
          → Cotización enviada
              → Visita agendada
                  → Visita realizada
                      → Seguimiento post-visita
                          → Negociación / Propuesta
                              → Reserva ($200.000 - monto configurable)
                                  → [Puede ir directo a Escritura sin Promesa]
                                  → Promesa
                                      → Escritura
                                          → Entrega
                                              → Postventa
```

---

## ROLES Y PERMISOS

| Rol | Acceso |
|-----|--------|
| Gerente | Todo + configuración global, aprueba descuentos |
| Jefe de Ventas | Todo (sin config global) |
| Vendedor | Solo sus propios leads + promociones |
| Broker Externo | Solo sus propios leads + promociones |
| Abogado | Todo (enfocado en módulo legal) |

**Módulos por rol:**
- Vendedor / Broker: NO ven inventario completo, NO ven pagos, NO ven comisiones de otros, NO ven módulo legal
- El precio mínimo de negociación: solo Gerente y Jefe de Ventas

---

## COMISIONES

- Varían por rol y por persona (configurable)
- Ejemplos:
  - Jefe de Ventas: 1% sobre todas las ventas del equipo + 4% si vende él mismo
  - Broker externo: configurable (ej: 8% o 4%)
  - Vendedor: configurable (ej: 4%)
- **Pago:** 50% al firmar promesa / 50% al firmar escritura
- Si no llega a escritura: la comisión adelantada se descuenta de la siguiente comisión
- Sistema debe **calcular automáticamente** las comisiones

---

## PROCESO LEGAL

```
[Opción A - Con Promesa]
Firma cliente (promesa) → Firma inmobiliaria (promesa) → Escritura lista
  → Firmada notaría → Inscripción CBR → Entregado

[Opción B - Sin Promesa, directo escritura]
Escritura lista → Firmada notaría → Inscripción CBR → Entregado
```

- Abogado: actualiza estados + sube documentos
- Fechas límite por paso: **configurables**
- Alertas por fechas vencidas o próximas

---

## INVENTARIO

### Edificios
- Nombre
- Dirección, región, comuna
- Inmobiliaria (nombre + contacto)
- Puede tener bodegas Y estacionamientos al mismo tiempo
- Múltiples edificios en múltiples regiones

### Unidades
- Número / código
- Edificio al que pertenece
- Tipo: bodega | estacionamiento
  - Estacionamiento subtipo: normal | tándem
- Piso
- Tamaño (m2)
- Techado / descubierto (estacionamientos)
- Acceso: nivel | subterráneo
- Precio lista (UF)
- Precio mínimo / piso (UF) — solo visible para Gerente y Jefe de Ventas
- Precio de costo/compra (UF) — para calcular margen de ganancia
- Estado: disponible | reservado | vendido | arrendado
- Fotos y planos (archivos subibles)

### UF
- Precio en UF, conversión a pesos en tiempo real via **API CMF**

---

## PROMOCIONES

- Múltiples promociones activas por unidad al mismo tiempo
- Tipos:
  - Descuento en precio (UF o %)
  - Gastos notariales incluidos (registrar si se pagó o condonó)
  - Arriendo asegurado X meses: tú pagas al comprador mes a mes → registrar cada pago mes a mes
  - Cuotas sin interés (ej: 6 cuotas sin interés hasta mayo)
  - Combos (ej: lleva 3 bodegas a precio especial)
- Pueden tener fecha de vigencia
- Pueden aplicar a: unidad específica | edificio | todas

---

## PAGOS

### Estructura de pago de venta
- Reserva: $200.000 pesos (configurable)
- Resto: cuotas o contado
- Métodos: tarjeta | transferencia

### Registro
- Solo registrar pagos (no envío automático de cobros)
- Subir comprobante / factura
- Sin interés por mora

### Arriendos
- Registrar si pagó el mes
- Quién gestiona el arriendo
- Subir contrato de arriendo
- Sin estructura compleja (arriendo simple)

---

## LLAVES

- 2 copias por unidad
- Se prestan a corredores
- Registro: quién tiene la llave, desde cuándo, para qué
- Alerta si no se devuelve en X días (configurable)

---

## SISTEMA DE ALERTAS

- Canal: WhatsApp (si gratuito), sino email
- Tipos de alertas:
  - Llave no devuelta después de X días
  - Cuota de pago vencida
  - Lead sin actividad hace X días
  - Fecha límite legal próxima
  - Arriendo por vencer
  - Descuento/aprobación pendiente del Gerente

---

## KANBAN Y VISTAS

- Vista 1 (por etapa): columnas = etapas del pipeline
- Vista 2 (por vendedor): columnas = vendedores
- Gerente y Jefe de Ventas: ambas vistas
- Vendedor: solo vista por etapa (sus leads)
- Filtros disponibles: por vendedor, edificio, estado, fecha

---

## DASHBOARD

- Embudo de ventas (funnel)
- Estado de leads (por etapa, por vendedor)
- Pagos pendientes / al día / atrasados
- Estado legal de ventas
- Unidades disponibles / vendidas / arrendadas

---

## REPORTES

- Leads por vendedor
- Ventas del período
- Unidades disponibles
- Pagos atrasados
- Comisiones por vendedor/broker
- Exportable a Excel y PDF

---

## FILTROS (en todos los módulos)

- Propiedades: por edificio, tipo, estado, precio, región
- Leads: por vendedor, etapa, fecha, origen
- Ventas: por vendedor, período, edificio
- Vendedores / brokers: por rendimiento
- Pagos: por estado, período

---

## ARRENDATARIOS

- Registro simple: quién arrienda qué unidad
- Quién gestiona el arriendo
- Si pagó el mes (sí/no)
- Subir contrato
- Alerta por vencimiento

---

## ACTIVIDAD / LOG

- Registro de todo lo que hacen los usuarios
- Especialmente en leads: quién hizo qué y cuándo

---

## MIGRACIÓN

- 3.500 leads existentes
- Datos: nombre, teléfono, email
- Fuente: Instagram y Google

---

## TÉCNICO

- Frontend: React
- Hosting: nube (por definir: Vercel, Railway, DigitalOcean, etc.)
- API UF: CMF Chile (tiempo real)
- Alertas: WhatsApp API (gratuito si es posible) o email
- Sin modo offline
- Integraciones futuras (WhatsApp directo, email, calendar, portales)
