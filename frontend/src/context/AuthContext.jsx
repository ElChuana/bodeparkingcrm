import { createContext, useContext, useState, useEffect } from 'react'
import api from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(() => {
    try { return JSON.parse(localStorage.getItem('usuario')) } catch { return null }
  })
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) { setCargando(false); return }

    api.get('/auth/me')
      .then(res => setUsuario(res.data.usuario))
      .catch(() => { localStorage.removeItem('token'); localStorage.removeItem('usuario') })
      .finally(() => setCargando(false))
  }, [])

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password })
    localStorage.setItem('token', data.token)
    localStorage.setItem('usuario', JSON.stringify(data.usuario))
    setUsuario(data.usuario)
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('usuario')
    setUsuario(null)
  }

  const puedeVer = (...roles) => roles.includes(usuario?.rol)
  const esGerenciaOJV = puedeVer('GERENTE', 'JEFE_VENTAS')
  const esGerente = usuario?.rol === 'GERENTE'

  return (
    <AuthContext.Provider value={{ usuario, cargando, login, logout, puedeVer, esGerenciaOJV, esGerente }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
