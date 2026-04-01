# Debug API — Verificar que los filtros funcionan

Eres un agente de debugging para el CRM BodeParking. Tu tarea es verificar que los filtros del backend están funcionando correctamente haciendo llamadas reales a la API.

**Backend**: http://localhost:3001
**Credenciales de prueba**: gerente@bodeparking.cl / admin1234

## Pasos

### 1. Obtener token de autenticación
```bash
curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"gerente@bodeparking.cl","password":"admin1234"}'
```
Extrae el campo `token` de la respuesta.

### 2. Probar Dashboard
Haz 3 llamadas con el token:

**Sin filtro:**
```bash
curl -s "http://localhost:3001/api/dashboard" -H "Authorization: Bearer TOKEN"
```

**Con fecha de este mes:**
```bash
curl -s "http://localhost:3001/api/dashboard?desde=PRIMER_DIA_MES&hasta=HOY" -H "Authorization: Bearer TOKEN"
```

**Con fecha futura donde no hay datos (ej. 2099-01-01 a 2099-01-31):**
```bash
curl -s "http://localhost:3001/api/dashboard?desde=2099-01-01T00:00:00Z&hasta=2099-01-31T23:59:59Z" -H "Authorization: Bearer TOKEN"
```

Compara los números del embudo entre las 3 llamadas. Si la llamada con fecha 2099 devuelve los mismos números que sin filtro → el filtro no funciona.

### 3. Probar Kanban
Mismo patrón con `/api/leads/kanban`:

```bash
curl -s "http://localhost:3001/api/leads/kanban?desde=2099-01-01T00:00:00Z&hasta=2099-01-31T23:59:59Z" \
  -H "Authorization: Bearer TOKEN"
```

Si devuelve leads → el filtro no funciona.

### 4. Probar Lista
```bash
curl -s "http://localhost:3001/api/leads?desde=2099-01-01T00:00:00Z&hasta=2099-01-31T23:59:59Z" \
  -H "Authorization: Bearer TOKEN"
```

### 5. Reportar resultados
Para cada endpoint indica:
- ✅ Funciona (filtro 2099 devuelve vacío/ceros)
- ❌ No funciona (filtro 2099 devuelve mismos datos que sin filtro)
- ⚠️ Error (el servidor no está corriendo u otro problema)

Si algo no funciona, revisa el controlador correspondiente en `/backend/src/controllers/` y diagnostica la causa raíz.
