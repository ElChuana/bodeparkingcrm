# Conversión UF/CLP en Plan de Pago — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Conversión automática bidireccional UF↔CLP en el formulario de plan de pago, usando el valor de la UF de la fecha específica de cada cuota, con formato numérico chileno `1.000,00`.

**Architecture:** Backend extiende `GET /api/uf` con query param `?fecha=YYYY-MM-DD`. Frontend agrega hook `useUFPorFecha(fecha)` usando React Query. El modal de plan de pago extrae cada fila en un componente `FilaCuota` que llama al hook y maneja la conversión bidireccional con indicador visual de campo derivado.

**Tech Stack:** Node.js/Express/Prisma (backend), React/Ant Design `InputNumber`/TanStack Query (frontend), mindicador.cl API histórica.

---

## Archivos a modificar

| Archivo | Cambio |
|---|---|
| `backend/src/controllers/ufController.js` | Aceptar `?fecha=YYYY-MM-DD` en `obtenerUF` |
| `frontend/src/hooks/useUFPorFecha.js` | Crear — hook que fetcha UF para una fecha específica |
| `frontend/src/pages/ventas/VentaDetalle.jsx` | Agregar `FilaCuota`; reescribir `ModalPlanPago`; actualizar imports |

---

### Task 1: Backend — extender GET /api/uf con ?fecha

**Files:**
- Modify: `backend/src/controllers/ufController.js`

- [ ] **Step 1: Reemplazar función obtenerUF completa**

En `backend/src/controllers/ufController.js`, reemplazar la función `obtenerUF` completa con:

```js
const obtenerUF = async (req, res) => {
  const { fecha } = req.query  // optional: 'YYYY-MM-DD'

  // === Path con fecha específica ===
  if (fecha) {
    try {
      const targetDate = new Date(fecha)
      const inicio = new Date(targetDate)
      inicio.setHours(0, 0, 0, 0)
      const fin = new Date(targetDate)
      fin.setHours(23, 59, 59, 999)

      // Buscar en cache primero
      const cache = await prisma.uFDiaria.findFirst({
        where: { fecha: { gte: inicio, lte: fin } }
      })
      if (cache) return res.json({ fecha: cache.fecha, valorPesos: cache.valorPesos, fuente: 'cache' })

      // Consultar mindicador.cl con fecha específica (formato DD-MM-YYYY)
      const [yyyy, mm, dd] = fecha.split('-')
      const resp = await axios.get(`https://mindicador.cl/api/uf/${dd}-${mm}-${yyyy}`, { timeout: 8000 })
      const serie = resp.data?.serie
      if (!serie?.length) return res.status(404).json({ error: 'UF no disponible para esa fecha.' })

      const { fecha: fRaw, valor } = serie[0]
      const fechaDate = new Date(fRaw)
      await prisma.uFDiaria.upsert({
        where: { fecha: fechaDate },
        update: { valorPesos: valor },
        create: { fecha: fechaDate, valorPesos: valor }
      })
      return res.json({ fecha: fechaDate, valorPesos: valor, fuente: 'mindicador' })
    } catch (err) {
      console.error('Error obteniendo UF por fecha:', err.message)
      return res.status(503).json({ error: 'No se pudo obtener la UF para esa fecha.' })
    }
  }

  // === UF de hoy (comportamiento original sin cambios) ===
  try {
    const hoy = new Date()
    const inicio = new Date(hoy)
    inicio.setHours(0, 0, 0, 0)
    const fin = new Date(hoy)
    fin.setHours(23, 59, 59, 999)

    const cache = await prisma.uFDiaria.findFirst({
      where: { fecha: { gte: inicio, lte: fin } }
    })
    if (cache) return res.json({ fecha: cache.fecha, valorPesos: cache.valorPesos, fuente: 'cache' })

    const resp = await axios.get('https://mindicador.cl/api/uf', { timeout: 8000 })
    const serie = resp.data?.serie
    if (!serie?.length) throw new Error('Sin datos en mindicador.cl')

    const { fecha: fRaw, valor } = serie[0]
    const fechaDate = new Date(fRaw)
    await prisma.uFDiaria.upsert({
      where: { fecha: fechaDate },
      update: { valorPesos: valor },
      create: { fecha: fechaDate, valorPesos: valor }
    })
    res.json({ fecha: fechaDate, valorPesos: valor, fuente: 'mindicador' })
  } catch (err) {
    console.error('Error obteniendo UF:', err.message)
    const ultima = await prisma.uFDiaria.findFirst({ orderBy: { fecha: 'desc' } })
    if (ultima) return res.json({ fecha: ultima.fecha, valorPesos: ultima.valorPesos, fuente: 'cache_fallback' })
    res.status(503).json({ error: 'No se pudo obtener el valor de la UF.' })
  }
}
```

- [ ] **Step 2: Verificar con node**

```bash
cd /Users/juana/Documents/bodeparkingcrm/backend
node -e "
const prisma = require('./src/lib/prisma')
const axios = require('axios')
async function test() {
  // Simular path de fecha específica
  const fecha = '2026-04-01'
  const [yyyy, mm, dd] = fecha.split('-')
  const resp = await axios.get('https://mindicador.cl/api/uf/' + dd + '-' + mm + '-' + yyyy, { timeout: 8000 })
  const serie = resp.data?.serie
  console.log('Respuesta mindicador fecha específica:', serie?.[0])
}
test().catch(e => console.error('ERROR:', e.message))
"
```
Expected: `{ fecha: '2026-04-01T...', valor: <número> }` — la UF de ese día.

- [ ] **Step 3: Commit**

```bash
cd /Users/juana/Documents/bodeparkingcrm
git add backend/src/controllers/ufController.js
git commit -m "feat: GET /api/uf acepta ?fecha=YYYY-MM-DD para UF histórica"
```

---

### Task 2: Frontend — hook useUFPorFecha

**Files:**
- Create: `frontend/src/hooks/useUFPorFecha.js`

- [ ] **Step 1: Crear el hook**

Crear archivo `frontend/src/hooks/useUFPorFecha.js`:

```js
import { useQuery } from '@tanstack/react-query'
import api from '../services/api'

/**
 * Retorna el valor de la UF para una fecha específica.
 * @param {string|null} fecha - Formato 'YYYY-MM-DD'. null/undefined → no hace fetch.
 * @returns {{ valorUF: number|null, isLoading: boolean }}
 */
export function useUFPorFecha(fecha) {
  const { data, isLoading } = useQuery({
    queryKey: ['uf', fecha],
    queryFn: () => api.get('/uf', { params: { fecha } }).then(r => r.data),
    enabled: Boolean(fecha && fecha.length === 10),
    staleTime: 1000 * 60 * 60 * 24, // 24h — UF histórica no cambia
    retry: false,
  })

  return {
    valorUF: data?.valorPesos ?? null,
    isLoading,
  }
}
```

- [ ] **Step 2: Verificar archivo creado**

```bash
cat /Users/juana/Documents/bodeparkingcrm/frontend/src/hooks/useUFPorFecha.js
```
Expected: archivo con export `useUFPorFecha`.

- [ ] **Step 3: Commit**

```bash
cd /Users/juana/Documents/bodeparkingcrm
git add frontend/src/hooks/useUFPorFecha.js
git commit -m "feat: hook useUFPorFecha para obtener UF de fecha específica"
```

---

### Task 3: Frontend — FilaCuota + ModalPlanPago

**Files:**
- Modify: `frontend/src/pages/ventas/VentaDetalle.jsx`

- [ ] **Step 1: Actualizar imports de React (línea 1)**

En `frontend/src/pages/ventas/VentaDetalle.jsx`, cambiar la línea 1:

```js
// ANTES:
import { useState } from 'react'

// DESPUÉS:
import { useState, useEffect, useRef } from 'react'
```

- [ ] **Step 2: Agregar import de useUFPorFecha (después de línea 7)**

Después de `import { useUF } from '../../hooks/useUF'` (línea 7), agregar:

```js
import { useUFPorFecha } from '../../hooks/useUFPorFecha'
```

- [ ] **Step 3: Insertar componente FilaCuota antes de ModalPlanPago**

Insertar el siguiente bloque **antes del comentario `// ─── Modal crear plan de pago`** (línea 107):

```js
// ─── Fila de cuota con conversión UF↔CLP ─────────────────────────
function FilaCuota({ cuota, index, onChange, onDelete, showDelete }) {
  const { valorUF } = useUFPorFecha(cuota.fechaVencimiento)

  // Latest-ref pattern: acceder a valores actuales desde effects sin deps adicionales
  const cuotaRef = useRef(cuota)
  cuotaRef.current = cuota
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  // Cuando valorUF cambia (fecha cambió y su UF cargó), recalcular campo derivado
  useEffect(() => {
    if (!valorUF) return
    const c = cuotaRef.current
    if (c._ultimoEditado === 'uf' && c.montoUF != null) {
      onChangeRef.current(index, { ...c, montoCLP: Math.round(c.montoUF * valorUF) })
    } else if (c._ultimoEditado === 'clp' && c.montoCLP != null) {
      onChangeRef.current(index, { ...c, montoUF: parseFloat((c.montoCLP / valorUF).toFixed(4)) })
    }
  }, [valorUF]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleUFChange = (value) => {
    const next = { ...cuota, montoUF: value ?? null, _ultimoEditado: 'uf' }
    if (value != null && valorUF) {
      next.montoCLP = Math.round(value * valorUF)
    }
    onChange(index, next)
  }

  const handleCLPChange = (value) => {
    const next = { ...cuota, montoCLP: value ?? null, _ultimoEditado: 'clp' }
    if (value != null && valorUF) {
      next.montoUF = parseFloat((value / valorUF).toFixed(4))
    }
    onChange(index, next)
  }

  const fmtUF = v => v != null ? Number(v).toLocaleString('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 4 }) : ''
  const parseUF = v => v ? parseFloat(v.replace(/\./g, '').replace(',', '.')) || null : null
  const fmtCLP = v => v != null ? Math.round(v).toLocaleString('es-CL') : ''
  const parseCLP = v => v ? parseInt(v.replace(/\./g, '').replace(',', ''), 10) || null : null

  const isDerivedUF = valorUF != null && cuota._ultimoEditado === 'clp' && cuota.montoCLP != null
  const isDerivedCLP = valorUF != null && cuota._ultimoEditado === 'uf' && cuota.montoUF != null

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, background: '#fafafa', padding: 10, borderRadius: 8 }}>
      <Select
        value={cuota.tipo}
        onChange={v => onChange(index, { ...cuota, tipo: v })}
        style={{ width: 110 }} size="small"
        options={[
          { value: 'RESERVA', label: 'Reserva' },
          { value: 'PIE', label: 'Pie' },
          { value: 'CUOTA', label: 'Cuota' },
          { value: 'ESCRITURA', label: 'Escritura' }
        ]}
      />
      <InputNumber
        size="small"
        placeholder="UF"
        value={cuota.montoUF}
        onChange={handleUFChange}
        formatter={fmtUF}
        parser={parseUF}
        min={0}
        style={{ width: 110, background: isDerivedUF ? '#f0f4f8' : undefined }}
      />
      <InputNumber
        size="small"
        placeholder="CLP"
        value={cuota.montoCLP}
        onChange={handleCLPChange}
        formatter={fmtCLP}
        parser={parseCLP}
        min={0}
        style={{ width: 130, background: isDerivedCLP ? '#f0f4f8' : undefined }}
      />
      <Input
        size="small"
        type="date"
        value={cuota.fechaVencimiento}
        onChange={e => onChange(index, { ...cuota, fechaVencimiento: e.target.value })}
        style={{ width: 140 }}
      />
      {showDelete && (
        <Button size="small" danger icon={<DeleteOutlined />} type="text" onClick={() => onDelete(index)} />
      )}
    </div>
  )
}

```

- [ ] **Step 4: Reemplazar ModalPlanPago completo (líneas 107-159)**

Reemplazar el bloque desde `// ─── Modal crear plan de pago` hasta el cierre `}` en la línea 159 (inclusive) con:

```js
// ─── Modal crear plan de pago ─────────────────────────────────────
function ModalPlanPago({ open, onClose, ventaId, precioUF }) {
  const qc = useQueryClient()
  const [cuotas, setCuotas] = useState([
    { tipo: 'RESERVA', montoUF: null, montoCLP: 200000, fechaVencimiento: '', _ultimoEditado: 'clp' }
  ])
  const { message } = App.useApp()

  const totalUF = cuotas.reduce((s, c) => s + (c.montoUF || 0), 0)

  const crear = useMutation({
    mutationFn: () => api.post('/pagos/plan', {
      ventaId,
      cuotas: cuotas.map(({ _ultimoEditado, ...c }) => c)
    }),
    onSuccess: () => {
      message.success('Plan de pago creado')
      qc.invalidateQueries(['venta', ventaId])
      onClose()
    },
    onError: err => message.error(err.response?.data?.error || 'Error')
  })

  const handleCuotaChange = (i, nuevaCuota) => {
    setCuotas(p => p.map((c, idx) => idx === i ? nuevaCuota : c))
  }

  const handleDelete = (i) => {
    setCuotas(p => p.filter((_, idx) => idx !== i))
  }

  return (
    <Modal title="Crear Plan de Pago" open={open} onCancel={onClose}
      onOk={() => crear.mutate()} okText="Crear Plan" cancelText="Cancelar"
      confirmLoading={crear.isPending} width={700}>
      <div style={{ marginTop: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Precio: <strong>{precioUF} UF</strong> · Total plan:{' '}
            <strong style={{ color: totalUF > precioUF ? '#ff4d4f' : '#52c41a' }}>{totalUF.toFixed(2)} UF</strong>
          </Text>
          <Button size="small" icon={<PlusOutlined />}
            onClick={() => setCuotas(p => [...p, { tipo: 'CUOTA', montoUF: null, montoCLP: null, fechaVencimiento: '', _ultimoEditado: null }])}>
            Cuota
          </Button>
        </div>
        {cuotas.map((c, i) => (
          <FilaCuota
            key={i}
            cuota={c}
            index={i}
            onChange={handleCuotaChange}
            onDelete={handleDelete}
            showDelete={cuotas.length > 1}
          />
        ))}
      </div>
    </Modal>
  )
}
```

- [ ] **Step 5: Verificar que el frontend compila sin errores**

```bash
cd /Users/juana/Documents/bodeparkingcrm/frontend
npm run build 2>&1 | tail -20
```
Expected: `✓ built in Xs` sin errores. Si hay errores de compilación, corregirlos antes de continuar.

- [ ] **Step 6: Commit**

```bash
cd /Users/juana/Documents/bodeparkingcrm
git add frontend/src/pages/ventas/VentaDetalle.jsx
git commit -m "feat: conversión UF↔CLP en plan de pago con formato chileno"
```

---

### Task 4: Deploy

**Files:** ninguno nuevo

- [ ] **Step 1: Push y deploy**

```bash
cd /Users/juana/Documents/bodeparkingcrm
git push origin main
railway up --detach
```

---

## Self-Review

**Spec coverage:**
- ✅ Backend `?fecha` param — Task 1
- ✅ Cache `UFDiaria` para fechas históricas — Task 1
- ✅ Fallback 404/503 si fecha no disponible → hook retorna `valorUF: null` → sin conversión — Task 1 + 2
- ✅ Hook `useUFPorFecha` con React Query, `staleTime` 24h, `enabled` solo si fecha válida — Task 2
- ✅ Conversión UF→CLP al editar UF — Task 3, `handleUFChange`
- ✅ Conversión CLP→UF al editar CLP — Task 3, `handleCLPChange`
- ✅ Recálculo al cambiar fecha (cuando UF carga) — Task 3, `useEffect([valorUF])`
- ✅ Indicador visual campo derivado (fondo `#f0f4f8`) — Task 3, `isDerivedUF/isDerivedCLP`
- ✅ Formato `1.000,00` con `InputNumber` formatter/parser — Task 3
- ✅ `_ultimoEditado` removido del payload al backend — Task 3, `cuotas.map(({ _ultimoEditado, ...c }) => c)`
- ✅ Sin fecha → sin conversión — Task 2 `enabled: Boolean(fecha && fecha.length === 10)`
- ✅ Deploy — Task 4

**Type consistency:**
- `montoUF: null | number` — consistente en `FilaCuota` (handlers, formatters) y estado inicial de `ModalPlanPago`
- `montoCLP: null | number` — ídem
- `_ultimoEditado: 'uf' | 'clp' | null` — definido en estado inicial, usado en `useEffect` y handlers
- `valorUF: number | null` — retornado por `useUFPorFecha`, usado en todos los cálculos
- `onChange(index: number, nuevaCuota: object)` — firma consistente entre `FilaCuota` y `handleCuotaChange`
