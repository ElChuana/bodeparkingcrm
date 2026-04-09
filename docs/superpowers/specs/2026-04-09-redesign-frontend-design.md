# Rediseño Frontend BodeParking CRM — Design Spec

## Objetivo

Rediseñar el Layout, Dashboard, Login y página Legal del CRM para adoptar una estética "Clean & Claro": fondo blanco, azul corporativo, tipografía Plus Jakarta Sans + Inter, cards con sombra suave.

## Alcance

- `Layout.jsx` — sidebar y header
- `Login.jsx` — página de login
- `Dashboard.jsx` — embudo trapecio + tabla legal compacta + stats
- `Legal.jsx` — tabla compacta con barra de progreso por pasos

Las demás páginas (Leads, Ventas, Inventario, etc.) se benefician automáticamente del nuevo sidebar/header sin cambios adicionales.

## Decisiones de diseño aprobadas

### Paleta y tipografía

```css
/* Fuentes — cargar desde Google Fonts */
font-family: 'Plus Jakarta Sans' /* títulos, números grandes, logo */
font-family: 'Inter'             /* cuerpo, labels, navegación */

/* Colores base */
--bg:        #f0f4f8   /* fondo de página */
--surface:   #ffffff   /* cards, sidebar, header */
--border:    #e2e8f0   /* bordes */
--text:      #0f172a   /* texto principal */
--text-2:    #475569   /* texto secundario */
--text-3:    #94a3b8   /* texto terciario */

/* Acento azul */
--blue-900:  #1d4ed8   /* primario fuerte */
--blue-500:  #3b82f6   /* primario medio */
--blue-100:  #eff6ff   /* fondos activos */
--blue-200:  #bfdbfe   /* bordes activos */

/* Semánticos */
--green:     #10b981
--yellow:    #f59e0b
--red:       #ef4444
```

### Layout (sidebar + header)

**Sidebar:**
- Fondo blanco, ancho 220px, sombra sutil derecha
- Logo: ícono cuadrado azul "BP" + texto "BodeParking" / "CRM Inmobiliario"
- Pill UF del día: fondo `#eff6ff`, borde azul suave
- Navegación agrupada en secciones: General / Ventas / Gestión / Admin
- Item activo: fondo `#eff6ff`, texto + ícono azul
- Footer: avatar gradiente azul + nombre + rol + botón logout

**Header:**
- Fondo blanco, altura 52px, borde inferior
- Buscador centrado con fondo `#f8fafc`, label ⌘K
- Botones icono (calendario, notificaciones) a la derecha, 32×32px con borde

### Dashboard

**Stats (4 cards):**
- Primera card destacada: gradiente `#1d4ed8 → #3b82f6`, texto blanco
- Resto: blanco con borde, número grande Plus Jakarta Sans 24px
- Labels uppercase 9px, hints en color semántico

**Embudo de ventas (trapecio):**
- Columna izquierda del grid 2 columnas
- Pasos: Leads → Seguimiento → Visitas → Reservas → Escrituras
- Ancho decrece por paso: 100% → 90% → 78% → 60% → 40%
- Azul degradado oscuro → claro (último paso texto oscuro)
- Footer: "Conversión total X% · N leads → N escrituras"

**Proceso legal (tabla compacta):**
- Columna derecha (más ancha, 1.4fr)
- Columnas: Comprador + Unidad | Paso actual (badge coloreado) | Progreso
- Badge: rojo=vencido, amarillo=próximo vencer, azul=al día, gris=sin fecha
- Progreso: 4 segmentos de 3px, azul=completado, amarillo=activo, rojo=vencido

### Login

- Fondo: `linear-gradient(135deg, #0f172a, #1e3a5f)` (mantener actual)
- Card centrada, border-radius 16px, sombra fuerte
- Logo pill blanco arriba del card
- Inputs con prefix icon
- Botón primario full width

### Legal (página `/legal`)

Reemplazar tabla Ant Design con tabla custom:
- Mismas columnas actuales pero con progreso visual de 4 segmentos
- Badge coloreado para paso actual
- Sin cambios de datos ni lógica — solo presentación

## Implementación técnica

### Fuentes

En `index.html`:
```html
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
```

En `index.css`:
```css
body { font-family: 'Inter', sans-serif; }
```

### Ant Design theme token

En `main.jsx`, configurar `ConfigProvider`:
```js
theme: {
  token: {
    colorPrimary: '#1d4ed8',
    borderRadius: 8,
    fontFamily: 'Inter, sans-serif',
  }
}
```

### Archivos a modificar

| Archivo | Cambio |
|---|---|
| `frontend/index.html` | Agregar Google Fonts link |
| `frontend/src/main.jsx` | ConfigProvider theme token |
| `frontend/src/components/Layout.jsx` | Sidebar + header completo |
| `frontend/src/pages/auth/Login.jsx` | Pulir (ya está bien, pequeños ajustes) |
| `frontend/src/pages/dashboard/Dashboard.jsx` | Embudo trapecio + stats mejoradas |
| `frontend/src/pages/ventas/Legal.jsx` | Tabla compacta con progreso visual |

## Lo que NO cambia

- Lógica de datos, queries, estados, filtros
- Rutas y estructura de componentes
- Páginas: Leads, Ventas, Inventario, Comisiones, etc.
- Backend
