import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ConfigProvider, App as AntApp, Spin } from 'antd'
import esES from 'antd/locale/es_ES'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ModoProvider } from './context/ModoContext'

// Shell: eager (se necesita en el primer render)
import Layout from './components/Layout'
import Login from './pages/auth/Login'

// Modo ERP (financiero): otra piel sobre la misma app — chunk propio, no toca al CRM
const ErpLayout = lazy(() => import('./erp/ErpLayout'))
const ErpPanel = lazy(() => import('./erp/pages/Panel'))
const ErpBanco = lazy(() => import('./erp/pages/Banco'))
const ErpConciliacion = lazy(() => import('./erp/pages/Conciliacion'))
const ErpDocumentos = lazy(() => import('./erp/pages/Documentos'))
const ErpPresupuesto = lazy(() => import('./erp/pages/Presupuesto'))
const ErpFlujo = lazy(() => import('./erp/pages/Flujo'))
const ErpCartera = lazy(() => import('./erp/pages/Cartera'))
const ErpConfiguracion = lazy(() => import('./erp/pages/Configuracion'))

// Páginas: lazy → cada una en su propio chunk (Vite hace el split por ruta)
const Dashboard = lazy(() => import('./pages/dashboard/Dashboard'))
const Inventario = lazy(() => import('./pages/inventario/Inventario'))
const Leads = lazy(() => import('./pages/leads/Leads'))
const LeadDetalle = lazy(() => import('./pages/leads/LeadDetalle'))
const Ventas = lazy(() => import('./pages/ventas/Ventas'))
const VentaDetalle = lazy(() => import('./pages/ventas/VentaDetalle'))
const Legal = lazy(() => import('./pages/ventas/Legal'))
const Visitas = lazy(() => import('./pages/visitas/Visitas'))
const Pagos = lazy(() => import('./pages/pagos/Pagos'))
const Comisiones = lazy(() => import('./pages/comisiones/Comisiones'))
const PacksBeneficios = lazy(() => import('./pages/configuracion/PacksBeneficios'))
const Promociones = lazy(() => import('./pages/promociones/Promociones'))
const Arriendos = lazy(() => import('./pages/arriendos/Arriendos'))
const Llaves = lazy(() => import('./pages/llaves/Llaves'))
const Equipo = lazy(() => import('./pages/equipo/Equipo'))
const Reportes = lazy(() => import('./pages/reportes/Reportes'))
const Automatizaciones = lazy(() => import('./pages/automatizaciones/Automatizaciones'))
const CotizacionEditor = lazy(() => import('./pages/cotizaciones/CotizacionEditor'))
const Descuentos = lazy(() => import('./pages/descuentos/Descuentos'))
const ApiKeys = lazy(() => import('./pages/configuracion/ApiKeys'))
const MiPerfil = lazy(() => import('./pages/perfil/MiPerfil'))
const PlantillasEmail = lazy(() => import('./pages/plantillas/PlantillasEmail'))
const CentroAsignacion = lazy(() => import('./pages/asignacion/CentroAsignacion'))
const PreviewPDF = lazy(() => import('./pages/cotizaciones/PreviewPDF'))
const Notificaciones = lazy(() => import('./pages/notificaciones/Notificaciones'))
const MiReporte = lazy(() => import('./pages/mi-reporte/MiReporte'))
const ReporteSemanal = lazy(() => import('./pages/reporte-semanal/ReporteSemanal'))
const ModoReunion = lazy(() => import('./pages/reunion/ModoReunion'))
const PreviewIlustraciones = lazy(() => import('./pages/reunion/PreviewIlustraciones'))

function PageFallback() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
      <Spin size="large" />
    </div>
  )
}

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
              <ModoProvider>
              <Suspense fallback={<PageFallback />}>
              <Routes>
                <Route path="/login" element={<Login />} />
                {/* Modo reunión: fuera del Layout — va a pantalla completa, sin menú */}
                <Route path="/reunion" element={
                  <RutaProtegida roles={['GERENTE','JEFE_VENTAS','VENDEDOR','BROKER_EXTERNO']}><ModoReunion /></RutaProtegida>
                } />
                <Route path="/reunion/:leadId" element={
                  <RutaProtegida roles={['GERENTE','JEFE_VENTAS','VENDEDOR','BROKER_EXTERNO']}><ModoReunion /></RutaProtegida>
                } />
                <Route path="/reunion-ilustraciones" element={<RutaProtegida><PreviewIlustraciones /></RutaProtegida>} />
                {/* Modo ERP: mismo login, otra piel. Solo gerencia. */}
                <Route path="/erp" element={
                  <RutaProtegida roles={['GERENTE','JEFE_VENTAS']}><ErpLayout /></RutaProtegida>
                }>
                  <Route index element={<ErpPanel />} />
                  <Route path="banco" element={<ErpBanco />} />
                  <Route path="conciliacion" element={<ErpConciliacion />} />
                  <Route path="documentos" element={<ErpDocumentos />} />
                  <Route path="presupuesto" element={<ErpPresupuesto />} />
                  <Route path="flujo" element={<ErpFlujo />} />
                  <Route path="cartera" element={<ErpCartera />} />
                  <Route path="configuracion" element={<ErpConfiguracion />} />
                </Route>
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
                  <Route path="visitas"     element={<RutaProtegida modulo="visitas"><Visitas /></RutaProtegida>} />
                  <Route path="ventas"      element={<RutaProtegida roles={['GERENTE','JEFE_VENTAS','ABOGADO']} modulo="ventas"><Ventas /></RutaProtegida>} />
                  <Route path="ventas/:id"  element={<RutaProtegida roles={['GERENTE','JEFE_VENTAS','ABOGADO']} modulo="ventas"><VentaDetalle /></RutaProtegida>} />
                  <Route path="legal"       element={<RutaProtegida roles={['GERENTE','JEFE_VENTAS','ABOGADO']} modulo="legal"><Legal /></RutaProtegida>} />
                  <Route path="pagos"       element={<RutaProtegida roles={['GERENTE','JEFE_VENTAS']} modulo="pagos"><Pagos /></RutaProtegida>} />
                  <Route path="comisiones"  element={<RutaProtegida modulo="comisiones"><Comisiones /></RutaProtegida>} />
                  <Route path="promociones" element={<RutaProtegida roles={['GERENTE','JEFE_VENTAS']} modulo="promociones"><Promociones /></RutaProtegida>} />
                  <Route path="configuracion/packs-beneficios" element={<RutaProtegida roles={['GERENTE','JEFE_VENTAS']} modulo="packs-beneficios"><PacksBeneficios /></RutaProtegida>} />
                  <Route path="arriendos"   element={<RutaProtegida roles={['GERENTE','JEFE_VENTAS']} modulo="arriendos"><Arriendos /></RutaProtegida>} />
                  <Route path="llaves"      element={<RutaProtegida roles={['GERENTE','JEFE_VENTAS']} modulo="llaves"><Llaves /></RutaProtegida>} />
                  <Route path="equipo"      element={<RutaProtegida roles={['GERENTE']} modulo="equipo"><Equipo /></RutaProtegida>} />
                  <Route path="reportes"    element={<RutaProtegida roles={['GERENTE','JEFE_VENTAS']} modulo="reportes"><Reportes /></RutaProtegida>} />
                  <Route path="automatizaciones" element={<RutaProtegida roles={['GERENTE','JEFE_VENTAS']} modulo="automatizaciones"><Automatizaciones /></RutaProtegida>} />
                  <Route path="descuentos"  element={<RutaProtegida modulo="descuentos"><Descuentos /></RutaProtegida>} />
                  <Route path="configuracion/api-keys" element={<RutaProtegida roles={['GERENTE']} modulo="api-keys"><ApiKeys /></RutaProtegida>} />
                  <Route path="perfil"      element={<RutaProtegida><MiPerfil /></RutaProtegida>} />
                  <Route path="plantillas-email" element={<RutaProtegida><PlantillasEmail /></RutaProtegida>} />
                  <Route path="notificaciones" element={<RutaProtegida><Notificaciones /></RutaProtegida>} />
                  <Route path="mi-reporte" element={<RutaProtegida modulo="mi-reporte"><MiReporte /></RutaProtegida>} />
                  <Route path="reporte-semanal" element={<RutaProtegida roles={['GERENTE']} modulo="reporte-semanal"><ReporteSemanal /></RutaProtegida>} />
                  <Route path="cotizaciones/preview-pdf" element={<RutaProtegida><PreviewPDF /></RutaProtegida>} />
                </Route>
                <Route path="*" element={<Navigate to="/leads" replace />} />
              </Routes>
              </Suspense>
              </ModoProvider>
            </BrowserRouter>
          </AuthProvider>
        </QueryClientProvider>
      </AntApp>
    </ConfigProvider>
  )
}
