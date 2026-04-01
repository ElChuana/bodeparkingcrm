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
import Promociones from './pages/promociones/Promociones'
import Arriendos from './pages/arriendos/Arriendos'
import Llaves from './pages/llaves/Llaves'
import Equipo from './pages/equipo/Equipo'
import Reportes from './pages/reportes/Reportes'
import Automatizaciones from './pages/automatizaciones/Automatizaciones'
import CotizacionEditor from './pages/cotizaciones/CotizacionEditor'
import Descuentos from './pages/descuentos/Descuentos'

const qc = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30000 } }
})

function RutaProtegida({ children, roles }) {
  const { usuario, cargando } = useAuth()
  if (cargando) return null
  if (!usuario) return <Navigate to="/login" replace />
  if (roles && !roles.includes(usuario.rol)) return <Navigate to="/dashboard" replace />
  return children
}

export default function App() {
  return (
    <ConfigProvider
      locale={esES}
      theme={{
        token: {
          colorPrimary: '#1677ff',
          borderRadius: 8,
          fontFamily: 'system-ui, -apple-system, sans-serif',
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
                  <Route index element={<Navigate to="/dashboard" replace />} />
                  <Route path="dashboard"   element={<Dashboard />} />
                  <Route path="inventario"  element={<RutaProtegida roles={['GERENTE','JEFE_VENTAS']}><Inventario /></RutaProtegida>} />
                  <Route path="leads"       element={<Leads />} />
                  <Route path="leads/:id"   element={<LeadDetalle />} />
                  <Route path="cotizaciones/nueva"  element={<CotizacionEditor />} />
                  <Route path="cotizaciones/:id"    element={<CotizacionEditor />} />
                  <Route path="visitas"     element={<RutaProtegida roles={['GERENTE','JEFE_VENTAS']}><Visitas /></RutaProtegida>} />
                  <Route path="ventas"      element={<RutaProtegida roles={['GERENTE','JEFE_VENTAS','ABOGADO']}><Ventas /></RutaProtegida>} />
                  <Route path="ventas/:id"  element={<RutaProtegida roles={['GERENTE','JEFE_VENTAS','ABOGADO']}><VentaDetalle /></RutaProtegida>} />
                  <Route path="legal"       element={<RutaProtegida roles={['GERENTE','JEFE_VENTAS','ABOGADO']}><Legal /></RutaProtegida>} />
                  <Route path="pagos"       element={<RutaProtegida roles={['GERENTE','JEFE_VENTAS']}><Pagos /></RutaProtegida>} />
                  <Route path="comisiones"  element={<Comisiones />} />
                  <Route path="promociones" element={<Promociones />} />
                  <Route path="arriendos"   element={<RutaProtegida roles={['GERENTE','JEFE_VENTAS']}><Arriendos /></RutaProtegida>} />
                  <Route path="llaves"      element={<RutaProtegida roles={['GERENTE','JEFE_VENTAS']}><Llaves /></RutaProtegida>} />
                  <Route path="equipo"      element={<RutaProtegida roles={['GERENTE']}><Equipo /></RutaProtegida>} />
                  <Route path="reportes"         element={<RutaProtegida roles={['GERENTE','JEFE_VENTAS']}><Reportes /></RutaProtegida>} />
              <Route path="automatizaciones" element={<RutaProtegida roles={['GERENTE','JEFE_VENTAS']}><Automatizaciones /></RutaProtegida>} />
              <Route path="descuentos" element={<RutaProtegida><Descuentos /></RutaProtegida>} />
                </Route>
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </BrowserRouter>
          </AuthProvider>
        </QueryClientProvider>
      </AntApp>
    </ConfigProvider>
  )
}
