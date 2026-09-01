import { createContext, useContext, useCallback, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

/**
 * Modo de la aplicación: 'crm' o 'erp'.
 *
 * Es la misma app, el mismo login y los mismos datos: lo único que cambia es
 * qué shell se muestra. El CRM sigue las unidades (qué se vendió, a quién) y el
 * ERP sigue la plata (qué entró al banco, qué se debe, cómo va el presupuesto).
 *
 * El modo se DERIVA de la URL, no se guarda como estado aparte: con la ruta como
 * única fuente no puede quedar el menú de un modo sobre las pantallas del otro,
 * y de paso el modo queda compartible por link y con historial del navegador.
 *
 * Se recuerda la última elección solo para saber dónde aterrizar al entrar.
 */

const ModoContext = createContext(null)

const CLAVE = 'bodeparking:modo'
const RAIZ_ERP = '/erp'

/** Dónde entrar al abrir la app, según el último modo usado. */
export function rutaInicialSegunModo() {
  try {
    return localStorage.getItem(CLAVE) === 'erp' ? RAIZ_ERP : null
  } catch {
    return null // navegación privada o storage bloqueado
  }
}

export function ModoProvider({ children }) {
  const location = useLocation()
  const navigate = useNavigate()

  const esERP = location.pathname === RAIZ_ERP || location.pathname.startsWith(`${RAIZ_ERP}/`)
  const modo = esERP ? 'erp' : 'crm'

  // Solo para recordar dónde aterrizar la próxima vez. No manda sobre la URL.
  useEffect(() => {
    try { localStorage.setItem(CLAVE, modo) } catch { /* storage bloqueado */ }
  }, [modo])

  const setModo = useCallback((nuevo) => {
    if (nuevo === 'erp') navigate(RAIZ_ERP)
    else navigate('/leads')
  }, [navigate])

  return (
    <ModoContext.Provider value={{ modo, setModo, esERP }}>
      {children}
    </ModoContext.Provider>
  )
}

export function useModo() {
  const ctx = useContext(ModoContext)
  if (!ctx) throw new Error('useModo debe usarse dentro de <ModoProvider>')
  return ctx
}
