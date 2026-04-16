# Fix: PDF no se adjunta al enviar email — Design

## Problema

Al enviar email con cotización adjunta desde `CotizacionEditor`, el PDF no llega adjunto. La causa raíz es:

```js
// CotizacionEditor.jsx:1023 — ROTO para PDFs > ~500KB
const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)))
```

El spread `...new Uint8Array(arrayBuffer)` convierte el buffer en argumentos individuales de función. Para PDFs grandes supera el call stack de JavaScript (`Maximum call stack size exceeded`). El `catch` lo captura silenciosamente, `pdfBase64` queda `null`, y el modal abre sin adjunto.

## Solución

Reemplazar con `FileReader.readAsDataURL()`, la API nativa del browser para convertir blobs a base64, sin límite de tamaño.

## Archivo afectado

- `frontend/src/pages/cotizaciones/CotizacionEditor.jsx` — función del botón "Enviar por email"

## Cambio exacto

**Antes:**
```js
const arrayBuffer = await blob.arrayBuffer()
const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)))
setPdfBase64(base64)
```

**Después:**
```js
const base64 = await new Promise((resolve, reject) => {
  const reader = new FileReader()
  reader.onloadend = () => resolve(reader.result.split(',')[1])
  reader.onerror = reject
  reader.readAsDataURL(blob)
})
setPdfBase64(base64)
```

**Error handling:** si el `catch` externo atrapa un error, mostrar `message.error('No se pudo generar el PDF')` en lugar de fallar silenciosamente. El modal no debe abrirse si el PDF falla.
