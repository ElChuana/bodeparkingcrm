# Fix PDF Adjunto Email — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corregir que el PDF de cotización no se adjunta al enviar email, reemplazando `btoa(String.fromCharCode(...spread))` por `FileReader.readAsDataURL()`.

**Architecture:** Un solo cambio en el handler del botón "Enviar por email" en `CotizacionEditor.jsx`. El spread operator en `btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)))` explota el call stack para PDFs > ~500KB. `FileReader` es la API nativa del browser para esto, async, sin límite de tamaño. Si falla, mostrar error visible y NO abrir el modal.

**Tech Stack:** React, `@react-pdf/renderer` (pdf().toBlob()), FileReader API (nativa), Ant Design message.error

---

### Task 1: Reemplazar btoa/spread por FileReader y mejorar error handling

**Files:**
- Modify: `frontend/src/pages/cotizaciones/CotizacionEditor.jsx:1016-1031`

- [ ] **Step 1: Verificar que el bug existe**

Abrir una cotización en el CRM → "Enviar por email" → enviar → confirmar que el email llega SIN adjunto PDF.

- [ ] **Step 2: Aplicar el fix**

Reemplazar el bloque `onClick` del botón (líneas 1016-1031) con:

```jsx
onClick={async () => {
  setGenerandoPdf(true)
  try {
    const blob = await pdf(
      <CotizacionDocumento cotizacion={{ ...cotizacion, items: cotizacion.items }} logoUrl={logoUrl} valorUF={valorUF} />
    ).toBlob()
    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result.split(',')[1])
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
    setPdfBase64(base64)
    setGenerandoPdf(false)
    setModalEmail(true)
  } catch (err) {
    setGenerandoPdf(false)
    message.error('No se pudo generar el PDF. Intenta de nuevo.')
    console.error('[PDF] Error generando PDF para email:', err)
  }
}}
```

Notar que:
- Se eliminan `arrayBuffer` y `btoa/spread` completamente
- El bloque `finally` se reemplaza por manejo explícito en `try` y `catch`
- Si falla, el modal NO se abre (antes abría sin PDF)
- El error es visible para el usuario

- [ ] **Step 3: Verificar que `message` está disponible en el scope**

En `CotizacionEditor.jsx`, buscar que `message` ya está desestructurado de `App.useApp()`. Buscar:

```js
const { message } = App.useApp()
```

Si no existe, agregarlo junto a los otros hooks al inicio del componente funcional principal.

- [ ] **Step 4: Probar manualmente en el browser**

1. Abrir cotización con items
2. Clic "Enviar por email"
3. Verificar que el botón muestra "Preparando..." mientras genera
4. Verificar que el modal abre con el indicador de adjunto visible (`con cotización adjunta`)
5. Enviar el email
6. Verificar que el email llega CON el PDF adjunto

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/cotizaciones/CotizacionEditor.jsx
git commit -m "fix: usar FileReader para base64 PDF — corrige adjunto en email

btoa(String.fromCharCode(...spread)) explota el call stack para PDFs
grandes. FileReader.readAsDataURL es la API correcta para blobs."
git push
```
