# Visitas Mejoradas + Fix Kanban Drag — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Arreglar el drag-and-drop del kanban y mejorar visitas con: eliminar visita (con permisos), registrar resultado (asistió + notas libres).

**Architecture:** Fix del sensor dnd-kit cambiando `delay` a `distance:5`. Backend agrega `DELETE /leads/:leadId/visitas/:id` con validación de permisos. Frontend agrega modal de resultado y botón eliminar en el timeline de visitas.

**Tech Stack:** Node.js/Express/Prisma (backend), React/Ant Design/@dnd-kit/core v6 (frontend)

---

## File Structure

| Archivo | Cambio |
|---|---|
| `frontend/src/pages/leads/Leads.jsx` | Cambiar sensor PointerSensor a `distance: 5` |
| `backend/src/controllers/visitasController.js` | Agregar función `eliminar` |
| `backend/src/routes/leads.js` | Agregar `DELETE /:leadId/visitas/:id` |
| `frontend/src/pages/leads/LeadDetalle.jsx` | Agregar `ModalResultadoVisita`, botón eliminar en timeline, botón "Registrar resultado" |

---

### Task 1: Fix kanban drag-and-drop sensor

**Files:**
- Modify: `frontend/src/pages/leads/Leads.jsx`

El problema: `activationConstraint: { delay: 200, tolerance: 8 }` cancela el drag si el usuario mueve más de 8px durante los 200ms de hold. En trackpad eso ocurre constantemente. La solución es `distance: 5` — el drag activa al mover 5px, sin espera.

- [ ] **Step 1: Cambiar el sensor en Leads.jsx**

Busca esta sección (alrededor de la línea 388):
```javascript
const sensors = useSensors(
  useSensor(PointerSensor, { activationConstraint: { delay: 200, tolerance: 8 } })
)
```

Reemplazar con:
```javascript
const sensors = useSensors(
  useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
)
```

- [ ] **Step 2: Verificar que el archivo compile sin errores**

```bash
cd /Users/juana/Documents/bodeparkingcrm/frontend
npm run build 2>&1 | head -30
```

Expected: sin errores de compilación relacionados con dnd-kit.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/leads/Leads.jsx
git commit -m "fix: kanban drag - cambiar sensor a distance:5 para evitar cancelacion prematura"
```

---

### Task 2: Backend — eliminar visita con control de permisos

**Files:**
- Modify: `backend/src/controllers/visitasController.js`
- Modify: `backend/src/routes/leads.js`

- [ ] **Step 1: Agregar función `eliminar` en visitasController.js**

Al final de `backend/src/controllers/visitasController.js`, antes del `module.exports`, agregar:

```javascript
const eliminar = async (req, res) => {
  const { id } = req.params
  const esGerenciaOJV = ['GERENTE', 'JEFE_VENTAS'].includes(req.usuario.rol)

  try {
    const visita = await prisma.visita.findUnique({
      where: { id: Number(id) }
    })
    if (!visita) return res.status(404).json({ error: 'Visita no encontrada.' })

    // Solo puede eliminar el creador o Gerente/JV
    if (!esGerenciaOJV && visita.vendedorId !== req.usuario.id) {
      return res.status(403).json({ error: 'Sin permiso para eliminar esta visita.' })
    }

    await prisma.visita.delete({ where: { id: Number(id) } })
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar visita.' })
  }
}
```

- [ ] **Step 2: Exportar `eliminar` en module.exports**

Cambiar la última línea del archivo de:
```javascript
module.exports = { listarPorLead, listarTodas, crear, actualizarResultado, actualizar }
```
A:
```javascript
module.exports = { listarPorLead, listarTodas, crear, actualizarResultado, actualizar, eliminar }
```

- [ ] **Step 3: Agregar la ruta DELETE en leads.js**

En `backend/src/routes/leads.js`, cambiar el import de visitasController:
```javascript
const { listarPorLead, listarTodas, crear: crearVisita, actualizarResultado, actualizar: actualizarVisita } = require('../controllers/visitasController')
```
A:
```javascript
const { listarPorLead, listarTodas, crear: crearVisita, actualizarResultado, actualizar: actualizarVisita, eliminar: eliminarVisita } = require('../controllers/visitasController')
```

Y agregar la ruta después de las visitas existentes (luego de la línea `router.patch('/:leadId/visitas/:id', actualizarVisita)`):
```javascript
router.delete('/:leadId/visitas/:id', eliminarVisita)
```

- [ ] **Step 4: Verificar que el servidor backend arranca sin errores**

```bash
cd /Users/juana/Documents/bodeparkingcrm/backend
node -e "require('./src/routes/leads'); console.log('OK')"
```
Expected: `OK`

- [ ] **Step 5: Commit**

```bash
git add backend/src/controllers/visitasController.js backend/src/routes/leads.js
git commit -m "feat: agregar DELETE /leads/:leadId/visitas/:id con validacion de permisos"
```

---

### Task 3: Frontend — modal resultado + botón eliminar en timeline

**Files:**
- Modify: `frontend/src/pages/leads/LeadDetalle.jsx`

Esta tarea agrega dos cosas al timeline de visitas:
1. **Botón "Registrar resultado"** — visible en visitas sin resultado. Abre `ModalResultadoVisita`.
2. **Botón eliminar** — visible según permisos. Pide confirmación antes de borrar.

También actualiza el tag de resultado para mostrar "Asistió" / "No asistió" en lugar de los valores antiguos.

- [ ] **Step 1: Agregar `ModalResultadoVisita` en LeadDetalle.jsx**

Buscar el comentario `// ─── Modal editar visita` en el archivo y agregar ANTES de él el siguiente componente nuevo:

```javascript
// ─── Modal registrar resultado de visita ──────────────────────────
function ModalResultadoVisita({ open, onClose, visita, leadId }) {
  const qc = useQueryClient()
  const [form] = Form.useForm()
  const { message } = App.useApp()

  const registrar = useMutation({
    mutationFn: (d) => api.put(`/leads/${leadId}/visitas/${visita.id}`, d),
    onSuccess: () => {
      message.success('Resultado registrado')
      qc.invalidateQueries(['lead', String(leadId)])
      qc.invalidateQueries(['visitas-todas'])
      onClose()
      form.resetFields()
    },
    onError: err => message.error(err.response?.data?.error || 'Error')
  })

  return (
    <Modal
      title="Registrar resultado de visita"
      open={open}
      onCancel={onClose}
      onOk={() => form.validateFields().then(registrar.mutate)}
      okText="Guardar"
      cancelText="Cancelar"
      confirmLoading={registrar.isPending}
    >
      <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
        <Form.Item name="resultado" label="¿Asistió el cliente?" rules={[{ required: true, message: 'Indica si asistió' }]}>
          <Select
            options={[
              { value: 'ASISTIO', label: '✅ Sí asistió' },
              { value: 'NO_ASISTIO', label: '❌ No asistió' },
            ]}
          />
        </Form.Item>
        <Form.Item name="notas" label="Notas de la visita" rules={[{ required: true, message: 'Agrega una nota' }]}>
          <Input.TextArea rows={4} placeholder="¿Cómo resultó la visita? ¿Próximos pasos?" />
        </Form.Item>
      </Form>
    </Modal>
  )
}
```

- [ ] **Step 2: Agregar estado `visitaResultando` en el componente principal**

Busca en el componente `LeadDetalle`:
```javascript
const [visitaEditando, setVisitaEditando] = useState(null)
```
Agregar debajo:
```javascript
const [visitaResultando, setVisitaResultando] = useState(null)
```

- [ ] **Step 3: Agregar función `eliminarVisita` con confirmación**

Busca `const { data: lead, isLoading } = useQuery({` en el componente `LeadDetalle` y agrega ANTES de esa línea:

```javascript
const qc = useQueryClient()
const { message, modal } = App.useApp()

const mutEliminarVisita = useMutation({
  mutationFn: (visitaId) => api.delete(`/leads/${id}/visitas/${visitaId}`),
  onSuccess: () => {
    message.success('Visita eliminada')
    qc.invalidateQueries(['lead', id])
    qc.invalidateQueries(['visitas-todas'])
  },
  onError: err => message.error(err.response?.data?.error || 'Sin permiso para eliminar')
})

const confirmarEliminarVisita = (visita) => {
  modal.confirm({
    title: 'Eliminar visita',
    content: `¿Seguro que quieres eliminar la visita del ${format(new Date(visita.fechaHora), "d MMM yyyy 'a las' HH:mm", { locale: es })}?`,
    okText: 'Eliminar',
    okType: 'danger',
    cancelText: 'Cancelar',
    onOk: () => mutEliminarVisita.mutate(visita.id)
  })
}
```

- [ ] **Step 4: Actualizar el timeline de visitas para mostrar botones y nuevo formato de resultado**

Busca el bloque que empieza con `if (item._tipo === 'visita') {` y reemplaza el children completo:

```javascript
    if (item._tipo === 'visita') {
      const puedeEliminar = esGerenciaOJV || item.vendedor?.id === usuario?.id
      const resultadoTag = item.resultado === 'ASISTIO'
        ? <Tag color="green">Asistió</Tag>
        : item.resultado === 'NO_ASISTIO'
        ? <Tag color="red">No asistió</Tag>
        : <Tag color="default">Pendiente</Tag>

      return {
        key: `v-${item.id}`,
        color: '#fa8c16',
        dot: <CalendarOutlined style={{ color: '#fa8c16' }} />,
        children: (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Space wrap>
                <Text strong style={{ fontSize: 13 }}>Visita {item.tipo}</Text>
                {resultadoTag}
              </Space>
              <Space size={4}>
                {!item.resultado && (
                  <Button size="small" type="primary" ghost onClick={() => setVisitaResultando(item)}>
                    Registrar resultado
                  </Button>
                )}
                <Button type="text" size="small" icon={<EditOutlined />} onClick={() => setVisitaEditando(item)} />
                {puedeEliminar && (
                  <Button
                    type="text"
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => confirmarEliminarVisita(item)}
                  />
                )}
              </Space>
            </div>
            <div><Text type="secondary" style={{ fontSize: 12 }}>
              {format(new Date(item.fechaHora), "d MMM yyyy 'a las' HH:mm", { locale: es })}
            </Text></div>
            {item.vendedor && (
              <div><Text type="secondary" style={{ fontSize: 12 }}>👤 {item.vendedor.nombre} {item.vendedor.apellido}</Text></div>
            )}
            {item.notas && <Text style={{ fontSize: 13, display: 'block', marginTop: 4 }}>{item.notas}</Text>}
          </div>
        )
      }
    }
```

- [ ] **Step 5: Agregar import de `DeleteOutlined` y `useQueryClient`/`useMutation` extra**

El import de ant-design icons ya tiene `EditOutlined`. Agregar `DeleteOutlined`:
```javascript
import {
  PhoneOutlined, MailOutlined, MessageOutlined, CalendarOutlined,
  EditOutlined, ArrowRightOutlined, ShoppingOutlined, UserOutlined,
  FileTextOutlined, PlusOutlined, DeleteOutlined
} from '@ant-design/icons'
```

Verificar que `useQueryClient` y `useMutation` ya están importados de `@tanstack/react-query` (sí están en la línea 3).

Verificar que `useAuth` ya se usa en el componente para obtener `usuario` y `esGerenciaOJV`:
```javascript
const { esGerenciaOJV, usuario } = useAuth()
```
(Actualmente solo desestructura `esGerenciaOJV` — agregar `usuario`.)

- [ ] **Step 6: Agregar `ModalResultadoVisita` al final del JSX de `LeadDetalle`**

Busca el bloque final de modales:
```javascript
      <ModalEditarVisita
        open={!!visitaEditando}
        onClose={() => setVisitaEditando(null)}
        visita={visitaEditando}
        leadId={id}
      />
```
Agregar después:
```javascript
      <ModalResultadoVisita
        open={!!visitaResultando}
        onClose={() => setVisitaResultando(null)}
        visita={visitaResultando}
        leadId={id}
      />
```

- [ ] **Step 7: Verificar que `modal` está disponible en el App.useApp()**

Busca donde se usa `App.useApp()` en el componente principal de `LeadDetalle` — actualmente no se usa ahí (los modales hijos lo usan). Necesitas agregar al inicio del componente:

```javascript
// Dentro de export default function LeadDetalle():
const { message, modal } = App.useApp()
```

Si ya hay una línea `const { message } = App.useApp()`, cambiarla a `const { message, modal } = App.useApp()`.

- [ ] **Step 8: Build y verificar sin errores**

```bash
cd /Users/juana/Documents/bodeparkingcrm/frontend
npm run build 2>&1 | grep -E "error|Error" | head -20
```
Expected: sin errores.

- [ ] **Step 9: Commit**

```bash
git add frontend/src/pages/leads/LeadDetalle.jsx
git commit -m "feat: registrar resultado visita (asistio/no) + eliminar visita con permisos"
```

---

### Task 4: Push y verificar deploy

- [ ] **Step 1: Push a main**

```bash
git push origin main
```

- [ ] **Step 2: Verificar que Railway despliega sin errores**

Revisar los logs del deploy en Railway dashboard. El deploy debería completarse exitosamente ya que no hay migraciones de DB (reutilizamos campos existentes).
