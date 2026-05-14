---
name: Actualizar FUNCIONALIDADES.md tras implementar
description: Después de cada implementación, actualizar docs/FUNCIONALIDADES.md para que el agente de revisión tenga contexto actualizado y no repita funcionalidades
type: feedback
---

Después de implementar cualquier feature nuevo, actualizar `docs/FUNCIONALIDADES.md` con los cambios realizados.

**Why:** El archivo es el mapa completo del sistema. Si no se actualiza, el agente de revisión no detecta duplicados y se pueden repetir funcionalidades. Está explícitamente indicado en CLAUDE.md como regla principal.

**How to apply:** Al terminar cada feature, editar `docs/FUNCIONALIDADES.md` para reflejar los nuevos endpoints, modelos, campos o páginas agregadas. Hacer esto antes del git push final.
