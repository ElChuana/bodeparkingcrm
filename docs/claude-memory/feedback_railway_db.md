---
name: Siempre usar Railway para BD
description: Todos los comandos de base de datos deben ejecutarse contra Railway, nunca contra localhost
type: feedback
originSessionId: 7c01c87d-da70-445a-ab15-df163bb8d180
---
Siempre conectar a la BD de Railway y probar el API contra el servidor Railway, no localhost. Esto aplica hasta que el usuario diga lo contrario.

**Why:** El usuario opera en producción (Railway). Los comandos y pruebas ejecutados en local no se reflejan en la app real. El usuario confirmó explícitamente el 16 abril 2026.

**How to apply:**
- Scripts Prisma: siempre usar `DATABASE_URL=[ver .env]`
- Pruebas de API: usar `RAILWAY_BACKEND_URL=[ver .env]`, no `localhost:3001`
- Nunca usar el `.env` local que apunta a `localhost:5432`
- Deploy: el usuario usa `git push` para deployar a Railway — sugerir siempre hacer commit + push al terminar cambios
