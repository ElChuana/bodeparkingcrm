# API de Ingreso de Leads — BodeParking CRM

Permite registrar prospectos (leads) en el CRM de BodeParking desde sistemas externos como formularios web, landing pages u otras plataformas.

---

## Autenticación

Todas las llamadas requieren una **API Key** en el header:

```
X-Api-Key: bp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

La API Key la entrega el equipo de BodeParking. Sin ella, recibirás un error `401`.

---

## URL base

```
https://backend-production-1c52.up.railway.app
```

---

## Endpoints

### 1. Crear un lead

**`POST /api/public/leads`**

Registra un nuevo prospecto en el CRM. Si el contacto ya existe (mismo email o teléfono), se usa el contacto existente. Si ya tiene un lead activo, se devuelve ese lead sin crear uno nuevo (evita duplicados).

#### Headers

| Header | Valor |
|---|---|
| `Content-Type` | `application/json` |
| `X-Api-Key` | Tu API Key |

#### Body (JSON)

| Campo | Tipo | Requerido | Descripción |
|---|---|---|---|
| `nombre` | string | **Sí** | Nombre del prospecto |
| `apellido` | string | **Sí** | Apellido del prospecto |
| `email` | string | No | Correo electrónico |
| `telefono` | string | No | Teléfono (ej: `+56912345678`) |
| `rut` | string | No | RUT (ej: `12.345.678-9`) |
| `empresa` | string | No | Nombre de la empresa (si aplica) |
| `tipoPersona` | string | No | `NATURAL` · `EMPRESA` · `SOCIEDAD` (default: `NATURAL`) |
| `origen` | string | No | `INSTAGRAM` · `GOOGLE` · `REFERIDO` · `BROKER` · `VISITA_DIRECTA` · `WEB` · `OTRO` (default: `WEB`) |
| `campana` | string | No | Nombre de la campaña de marketing (ej: `"Google Ads Abril"`) |
| `presupuestoAprox` | number | No | Presupuesto aproximado en UF |
| `notas` | string | No | Notas adicionales |
| `edificioNombre` | string | No | Nombre del edificio de interés (ej: `"Torre Norte"`) |
| `unidadNumero` | string | No | Número de la unidad de interés (ej: `"B-12"`) |
| `tipoUnidad` | string | No | `BODEGA` o `ESTACIONAMIENTO` |

> **Nota:** Se recomienda enviar al menos `email` o `telefono` para evitar duplicados.

#### Ejemplo de request

```bash
curl -X POST https://backend-production-1c52.up.railway.app/api/public/leads \
  -H "Content-Type: application/json" \
  -H "X-Api-Key: bp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" \
  -d '{
    "nombre": "María",
    "apellido": "González",
    "email": "maria@gmail.com",
    "telefono": "+56912345678",
    "origen": "INSTAGRAM",
    "campana": "Instagram Marzo 2026",
    "presupuestoAprox": 1500,
    "edificioNombre": "Torre Norte",
    "tipoUnidad": "BODEGA"
  }'
```

#### Respuesta exitosa — lead creado (`201`)

```json
{
  "ok": true,
  "duplicado": false,
  "leadId": 42,
  "contactoId": 18,
  "lead": {
    "id": 42,
    "etapa": "NUEVO",
    "campana": "Instagram Marzo 2026",
    "contacto": {
      "nombre": "María",
      "apellido": "González",
      "email": "maria@gmail.com",
      "telefono": "+56912345678"
    },
    "unidadInteres": {
      "numero": "B-12",
      "tipo": "BODEGA",
      "edificio": {
        "nombre": "Torre Norte"
      }
    }
  }
}
```

#### Respuesta — lead duplicado (`200`)

El contacto ya tiene un lead activo. No se crea uno nuevo.

```json
{
  "ok": true,
  "duplicado": true,
  "mensaje": "El contacto ya tiene un lead activo en el sistema.",
  "leadId": 42,
  "contactoId": 18
}
```

---

### 2. Consultar estado de un lead

**`GET /api/public/leads/:id`**

Permite verificar el estado actual de un lead previamente creado.

#### Ejemplo de request

```bash
curl https://backend-production-1c52.up.railway.app/api/public/leads/42 \
  -H "X-Api-Key: bp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

#### Respuesta exitosa (`200`)

```json
{
  "id": 42,
  "etapa": "SEGUIMIENTO",
  "campana": "Instagram Marzo 2026",
  "creadoEn": "2026-04-07T18:00:00.000Z",
  "contacto": {
    "nombre": "María",
    "apellido": "González",
    "email": "maria@gmail.com"
  },
  "venta": null
}
```

El campo `etapa` puede tomar los siguientes valores conforme avanza el proceso de venta:

| Etapa | Descripción |
|---|---|
| `NUEVO` | Recién ingresado |
| `NO_CONTESTA` | Se intentó contactar sin éxito |
| `SEGUIMIENTO` | En seguimiento activo |
| `COTIZACION_ENVIADA` | Se envió cotización |
| `VISITA_AGENDADA` | Visita programada |
| `VISITA_REALIZADA` | Visita completada |
| `SEGUIMIENTO_POST_VISITA` | Seguimiento tras la visita |
| `NEGOCIACION` | En negociación |
| `RESERVA` | Reserva concretada |
| `PROMESA` | Promesa de compraventa firmada |
| `ESCRITURA` | En proceso de escritura |
| `ENTREGA` | Unidad entregada |
| `POSTVENTA` | En atención postventa |
| `PERDIDO` | Lead perdido |

---

## Errores comunes

| Código | Causa |
|---|---|
| `400` | Faltan campos requeridos (`nombre` o `apellido`) |
| `401` | API Key ausente, inválida o desactivada |
| `404` | Lead no encontrado (al consultar por ID) |
| `500` | Error interno del servidor |

### Ejemplo de error `400`

```json
{
  "error": "nombre y apellido son requeridos.",
  "campos_requeridos": ["nombre", "apellido"],
  "campos_opcionales": ["email", "telefono", "rut", ...]
}
```

### Ejemplo de error `401`

```json
{
  "error": "API Key inválida o desactivada."
}
```

---

## Obtener una API Key

Para obtener o gestionar API Keys, contacta al administrador del sistema (GERENTE). Las keys tienen el formato:

```
bp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```
