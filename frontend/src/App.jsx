import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ConfigProvider, App as AntApp } from 'antd'
import esES from 'antd/locale/es_ES'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import Login from './pages/auth/Login'
import Dashboard from './pages/dashboard/Dashboard'
import Inventario from './pages/inventario/Inventario'
import Leads from './pages/leads/Leads'
import LeadDetalle from './pages/leads/LeadDetalle'
import Ventas from './pages/ventas/Ventas'
import VentaDetalle from './pages/ventas/VentaDetalle'
import Legal from './pages/ventas/Legal'
import Visitas from './pages/visitas/Visitas'
import Pagos from './pages/pagos/Pagos'
import Comisiones from './pages/comisiones/Comisiones'
import PacksBeneficios from './pages/configuracion/PacksBeneficios'
import Arriendos from './pages/arriendos/Arriendos'
import Llaves from './pages/llaves/Llaves'
import Equipo from './pages/equipo/Equipo'
import Reportes from './pages/reportes/Reportes'
import Automatizaciones from './pages/automatizaciones/Automatizaciones'
import CotizacionEditor from './pages/cotizaciones/CotizacionEditor'
import Descuentos from './pages/descuentos/Descuentos'
import ApiKeys from './pages/configuracion/ApiKeys'
import MiPerfil from './pages/perfil/MiPerfil'
import CentroAsignacion from './pages/asignacion/CentroAsignacion'
import PreviewPDF from './pages/cotizaciones/PreviewPDF'

const qc = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30000 } }
})

function rutaDefault(usuario) {
  const modulos = usuario?.modulosVisibles
  if (!modulos?.length) return '/leads'
  const prioridad = ['leads','dashboard','inventario','ventas','visitas','comisiones','descuentos']
  const primero = prioridad.find(m => modulos.includes(m))
  return primero ? `/${primero}` : `/${modulos[0]}`
}

function RutaProtegida({ children, roles, modulo }) {
  const { usuario, cargando } = useAuth()
  if (cargando) return null
  if (!usuario) return <Navigate to="/login" replace />

  const modulosCustom = usuario.modulosVisibles || []
  const tieneCustom = modulosCustom.length > 0

  // Usuario con módulos custom: solo puede acceder a módulos en su lista
  if (tieneCustom && modulo && !modulosCustom.includes(modulo)) {
    return <Navigate to={rutaDefault(usuario)} replace />
  }

  // Sin módulos custom: chequeo por rol
  if (roles && !tieneCustom && !roles.includes(usuario.rol)) {
    return <Navigate to={rutaDefault(usuario)} replace />
  }

  return children
}

export default function App() {
  return (
    <ConfigProvider
      locale={esES}
      theme={{
        token: {
          colorPrimary: '#1d4ed8',
          borderRadius: 8,
          fontFamily: 'Inter, sans-serif',
        },
      }}
    >
      <AntApp>
        <QueryClientProvider client={qc}>
          <AuthProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/" element={
                  <RutaProtegida>
                    <Layout />
                  </RutaProtegida>
                }>
                  <Route index element={<Navigate to="/leads" replace />} />
                  <Route path="dashboard"   element={<RutaProtegida modulo="dashboard"><Dashboard /></RutaProtegida>} />
                  <Route path="inventario"  element={<RutaProtegida roles={['GERENTE','JEFE_VENTAS']} modulo="inventario"><Inventario /></RutaProtegida>} />
                  <Route path="leads"       element={<RutaProtegida modulo="leads"><Leads /></RutaProtegida>} />
                  <Route path="leads/:id"   element={<RutaProtegida modulo="leads"><LeadDetalle /></RutaProtegida>} />
                  <Route path="asignacion"  element={<RutaProtegida roles={['GERENTE','JEFE_VENTAS']} modulo="asignacion"><CentroAsignacion /></RutaProtegida>} />
                  <Route path="cotizaciones/nueva"  element={<RutaProtegida modulo="leads"><CotizacionEditor /></RutaProtegida>} />
                  <Route path="cotizaciones/:id"    element={<RutaProtegida modulo="leads"><CotizacionEditor /></RutaProtegida>} />
                  <Route path="visitas"     element={<RutaProtegida roles={['GERENTE','JEFE_VENTAS']} modulo="visitas"><Visitas /></RutaProtegida>} />
                  <Route path="ventas"      element={<RutaProtegida roles={['GERENTE','JEFE_VENTAS','ABOGADO']} modulo="ventas"><Ventas /></RutaProtegida>} />
                  <Route path="ventas/:id"  element={<RutaProtegida roles={['GERENTE','JEFE_VENTAS','ABOGADO']} modulo="ventas"><VentaDetalle /></RutaProtegida>} />
                  <Route path="legal"       element={<RutaProtegida roles={['GERENTE','JEFE_VENTAS','ABOGADO']} modulo="legal"><Legal /></RutaProtegida>} />
                  <Route path="pagos"       element={<RutaProtegida roles={['GERENTE','JEFE_VENTAS']} modulo="pagos"><Pagos /></RutaProtegida>} />
                  <Route path="comisiones"  element={<RutaProtegida modulo="comisiones"><Comisiones /></RutaProtegida>} />
                  <Route path="configuracion/packs-beneficios" element={<RutaProtegida roles={['GERENTE','JEFE_VENTAS']} modulo="packs-beneficios"><PacksBeneficios /></RutaProtegida>} />
                  <Route path="arriendos"   element={<RutaProtegida roles={['GERENTE','JEFE_VENTAS']} modulo="arriendos"><Arriendos /></RutaProtegida>} />
                  <Route path="llaves"      element={<RutaProtegida roles={['GERENTE','JEFE_VENTAS']} modulo="llaves"><Llaves /></RutaProtegida>} />
                  <Route path="equipo"      element={<RutaProtegida roles={['GERENTE']} modulo="equipo"><Equipo /></RutaProtegida>} />
                  <Route path="reportes"    element={<RutaProtegida roles={['GERENTE','JEFE_VENTAS']} modulo="reportes"><Reportes /></RutaProtegida>} />
                  <Route path="automatizaciones" element={<RutaProtegida roles={['GERENTE','JEFE_VENTAS']} modulo="automatizaciones"><Automatizaciones /></RutaProtegida>} />
                  <Route path="descuentos"  element={<RutaProtegida modulo="descuentos"><Descuentos /></RutaProtegida>} />
                  <Route path="configuracion/api-keys" element={<RutaProtegida roles={['GERENTE']} modulo="api-keys"><ApiKeys /></RutaProtegida>} />
                  <Route path="perfil"      element={<RutaProtegida><MiPerfil /></RutaProtegida>} />
                  <Route path="cotizaciones/preview-pdf" element={<RutaProtegida><PreviewPDF /></RutaProtegida>} />
                </Route>
                <Route path="*" element={<Navigate to="/leads" replace />} />
              </Routes>
            </BrowserRouter>
          </AuthProvider>
        </QueryClientProvider>
      </AntApp>
    </ConfigProvider>
  )
}
