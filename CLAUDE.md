# BodeParking CRM — Instrucciones para Claude

## REGLA PRINCIPAL

**Antes de implementar cualquier cosa nueva o modificar código, leer `docs/FUNCIONALIDADES.md`.**

Si lo que se pide ya existe (total o parcialmente):
- Avisar al usuario que ya existe
- Proponer modificar lo existente en lugar de crear algo nuevo
- Si hay dos formas de hacer lo mismo, consolidar en una sola

Después de implementar algo nuevo, **actualizar `docs/FUNCIONALIDADES.md`** para reflejar el cambio.

---

## Reglas de desarrollo

1. **Siempre hacer `git push origin main` después de cada commit** — Railway despliega desde GitHub
2. **Usar Railway para la BD** — nunca localhost para scripts que afecten producción
   - La URL de conexión está en `backend/.env` (`DATABASE_URL`). **Nunca escribir credenciales en archivos trackeados por git.**
3. **Schema**: usar `prisma db push` (no `migrate dev`) — hay drift en historial de migraciones
4. **Precio en ventas**: usar `precioFinalUF` — el campo `precioUF` ya no existe en el modelo Venta
5. **Notificaciones**: usar `lib/notifications.js` — no duplicar la función `notificarLead`
6. **Deduplicación**: usar `lib/deduplication.js` — no duplicar Levenshtein/mismoNombre

---

## Usuarios de producción

- `jvaldivieso@bodeparking.cl` → Juan Valdivieso, GERENTE (ID 7)
- `fbetancourtt@bodeparking.cl` → Felix Betancourtt, JEFE_VENTAS (ID 8), tel: +56976149067

---

## Estructura del proyecto

```
bodeparkingcrm/
├── backend/
│   ├── prisma/schema.prisma      ← modelos de BD
│   ├── scripts/                  ← seeds, migraciones one-off, imports, backup (TODOS los scripts viven aquí)
│   ├── src/
│   │   ├── index.js              ← entry point, montaje de rutas
│   │   ├── config.js             ← config compartida (ej: VENDEDOR_FALLBACK_ID)
│   │   ├── jobs/                 ← cron jobs (UF, alertas, reportes, recordatorios)
│   │   ├── controllers/          ← lógica de negocio
│   │   ├── routes/               ← definición de endpoints (thin, solo wiring)
│   │   ├── middleware/           ← auth.js (JWT + roles), apiKey.js (integraciones externas)
│   │   └── lib/                  ← utilidades compartidas
│   ├── tests/                    ← tests (node:test) — correr con `npm test`
│   └── uploads/                  ← archivos subidos
├── frontend/
│   └── src/
│       ├── pages/                ← páginas React
│       ├── components/           ← componentes reutilizables
│       ├── hooks/                ← hooks personalizados
│       └── services/api.js       ← cliente axios
└── docs/
    └── FUNCIONALIDADES.md        ← mapa completo del sistema ← LEER SIEMPRE
```

## Seguridad del repo

- **Nunca** commitear: backups SQL, planillas con datos de clientes, credenciales, `.env`, `.claude/settings.local.json`
- La historia de git fue reescrita el 2026-06-12 para purgar credenciales y datos — no restaurar commits antiguos desde forks/clones viejos
