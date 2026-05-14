---
name: Estado del proyecto BodeParking CRM
description: Estado actual del CRM — stack, módulos, usuarios reales, BD Railway, tareas pendientes
type: project
originSessionId: 7c01c87d-da70-445a-ab15-df163bb8d180
---
Stack completo construido y funcionando:
- Backend: Node.js/Express + PostgreSQL + Prisma en `/backend`, puerto 3001
- Frontend: React + Vite + Ant Design en `/frontend`, puerto 5173

**Para iniciar local:**
```bash
cd /Users/juana/Documents/bodeparkingcrm/backend && node src/index.js &
cd /Users/juana/Documents/bodeparkingcrm/frontend && npm run dev
```

**Railway (producción):**
- Proxy: `monorail.proxy.rlwy.net:35865`
- DATABASE_URL_RAILWAY en `.env` ya actualizada
- Para scripts: `DATABASE_URL=[ver .env]`

**Estado actual de la BD Railway (abril 2026):**
- 4163 leads reales (jul 2025 → abr 2026, importados desde Facebook)
  - Hoja 1 Google Sheets (gid=0): ~2844 filas, ya importadas
  - Hoja 2 "Leads Preguntas" (gid=433849164): 1406 filas, 1088 nuevos importados el 15 abr
- 26 ventas cargadas con estados correctos (ESCRITURA/PROMESA/RESERVA)
- 80 unidades (VENDIDO/RESERVADO/DISPONIBLE según estado de venta)
- 0 visitas / 0 interacciones (se perdieron con el reset de Railway el 13 abril)

**Usuarios reales (contraseña: [ver .env]):**
- [ver .env] → Juan Valdivieso, GERENTE (ID 7)
- [ver .env] → Felix Betancourtt, JEFE_VENTAS (ID 8)
- Usuarios de prueba (IDs 1-6) BORRADOS

**Módulos completados con Ant Design:**
- Login, Dashboard, Inventario, Leads (Kanban + Lista), LeadDetalle
- Ventas, VentaDetalle, Legal, Pagos, Comisiones, Promociones
- Arriendos, Llaves, Equipo, Reportes, Cotizaciones, API Keys

**Seguridad aplicada (commit 688f640):**
- Endpoint temporal /api/importar-ventas-bp-2026 ELIMINADO
- JWT_SECRET cambiado a clave segura de 128 chars
- Script backup: `bash scripts/backup-railway.sh` (guarda pg_dump en backups/)
- Calendario: filtradas notas automáticas "Lead creado en el sistema."

**Cambios recientes (abril 2026):**
- Campos extendidos en modelo Contacto: fechaNacimiento, ciudadNacimiento, estadoCivil, profesion, nacionalidad, regimenMatrimonial, direccionParticular — editables desde LeadDetalle con DatePicker y Selects
- Buscador universal arreglado: eliminado query a prisma.promocion (modelo no existe), corregido precioUF → precioFinalUF en Venta
- Sistema de Recordatorios ELIMINADO — unificado con Actividades (Interacciones); el modal de actividad ahora tiene DatePicker con hora para agendar en futuro; las actividades ya aparecen en el calendario
- Leads auto-asignados a Felix Betancourtt (JEFE_VENTAS, ID 8) cuando ingresan por API pública
- Dashboard: KPI "Unidades vendidas" separado de "Ventas"; corregido precioFinalUF
- Leads lista: orden por actualizadoEn por defecto, sorters en columnas
- skill find-skills instalada globalmente en ~/.claude/skills/find-skills/SKILL.md

**COMPLETADO — Importación de leads desde Google Sheets (15 abr 2026):**
- Script: `scripts/importar-leads-sheets.js` (descarga CSV directo, dedup por email)
- Hoja 1 (gid=0): 2844 filas → 32 nuevos (resto ya existían)
- Hoja 2 "Leads Preguntas" (gid=433849164): 1406 filas → 1088 nuevos
- Total final: 4163 leads en Railway

**Why:** Railway re-inicializó BD el 13 abril 17:09 UTC borrando datos manuales. No hay backup. Se reconstruyó desde local + git.
**How to apply:** Siempre usar Railway para operaciones de BD. Nunca localhost para scripts que afecten producción.
