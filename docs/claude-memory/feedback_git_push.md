---
name: feedback_git_push
description: Siempre hacer git push después de commitear cambios
type: feedback
---

Siempre hacer `git push origin main` inmediatamente después de cada commit, sin esperar confirmación del usuario.

**Why:** Railway despliega desde GitHub — si no se pushea, el código en producción queda desactualizado y el usuario ve errores o datos faltantes.

**How to apply:** Después de cada `git commit`, ejecutar `git push origin main` como parte del mismo flujo. No son pasos separados que requieren aprobación.
