---
name: feedback-memory-sync
description: "Cada vez que se guarda o actualiza una memoria, sincronizar a docs/claude-memory/ y hacer commit+push"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 19ac9846-c6d1-40c2-899c-16b27363a3ce
---

Después de escribir o actualizar cualquier archivo en la carpeta de memoria local, copiar los cambios a `docs/claude-memory/memory/` dentro del repo y hacer commit + push inmediatamente.

**Why:** El usuario trabaja desde múltiples computadores. Las memorias deben estar siempre en GitHub para que estén disponibles en cualquier equipo.

**How to apply:** Flujo obligatorio al guardar memoria:
1. Escribir/actualizar el archivo en `~/.claude/projects/.../memory/`
2. Copiar a `docs/claude-memory/memory/`
3. `git add docs/claude-memory/ && git commit -m "memory: ..." && git push origin main`
