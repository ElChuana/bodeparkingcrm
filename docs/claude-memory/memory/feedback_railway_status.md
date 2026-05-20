---
name: feedback-railway-status
description: "Antes de diagnosticar errores del servidor o BD, siempre revisar status.railway.com primero"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 19ac9846-c6d1-40c2-899c-16b27363a3ce
---

Ante cualquier error de servidor (500, BD sin respuesta, login caído), revisar primero `https://status.railway.com` antes de tocar código o BD.

**Why:** En mayo 2026 el login falló por error 500 — parecía un bug de código o drift de schema, pero era un incidente de Railway (Google Cloud bloqueó su cuenta). Perder tiempo diagnosticando código cuando el problema es la infraestructura.

**How to apply:** Si el backend responde en `/api/health` pero la BD no responde (`pg_isready` sin respuesta), ir directo a `status.railway.com`. Si hay incidente activo, informar al usuario y esperar — no modificar nada.
