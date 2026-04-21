import { useState } from 'react'
import { useNavigate, useLocation, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Layout as AntLayout, Button, Drawer } from 'antd'
import {
  DashboardOutlined, AppstoreOutlined, TeamOutlined,
  ShoppingOutlined, AuditOutlined, CreditCardOutlined,
  DollarOutlined, TagOutlined, CarOutlined, KeyOutlined,
  BarChartOutlined, UserSwitchOutlined, ThunderboltOutlined,
  MenuOutlined, LogoutOutlined, CalendarOutlined, PercentageOutlined, ApiOutlined, SettingOutlined
} from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import api from '../services/api'
import NotificacionesBadge from './NotificacionesBadge'
import CalendarioWidget from './CalendarioWidget'
import UFDisplay from './UFDisplay'
import BuscadorUniversal from './BuscadorUniversal'

const { Sider, Header, Content } = AntLayout

function SidebarContent({ selectedKey, onNavigate }) {
  const { usuario, logout } = useAuth()
  const navigate = useNavigate()

  const { data: solicitudesPendientes = [] } = useQuery({
    queryKey: ['solicitudes-descuento-pendientes-nav'],
    queryFn: () => api.get('/descuentos', { params: { estado: 'PENDIENTE' } }).then(r => r.data),
    refetchInterval: 30000,
    staleTime: 20000,
  })
  const nPendientes = solicitudesPendientes.length

  const handleLogout = () => { logout(); navigate('/login') }

  const NAV_SECTIONS = [
    {
      label: 'General',
      items: [
        { key: '/dashboard',  label: 'Dashboard',   icon: <DashboardOutlined />, roles: null,                              modulo: 'dashboard' },
        { key: '/inventario', label: 'Inventario',  icon: <AppstoreOutlined />,  roles: ['GERENTE','JEFE_VENTAS'],          modulo: 'inventario' },
        { key: '/leads',      label: 'Leads',       icon: <TeamOutlined />,      roles: null,                              modulo: 'leads' },
        { key: '/visitas',    label: 'Visitas',     icon: <CalendarOutlined />,  roles: ['GERENTE','JEFE_VENTAS'],          modulo: 'visitas' },
      ]
    },
    {
      label: 'Ventas',
      items: [
        { key: '/ventas',      label: 'Ventas',     icon: <ShoppingOutlined />,   roles: ['GERENTE','JEFE_VENTAS','ABOGADO'], modulo: 'ventas' },
        { key: '/legal',       label: 'Legal',      icon: <AuditOutlined />,      roles: ['GERENTE','JEFE_VENTAS','ABOGADO'], modulo: 'legal' },
        { key: '/pagos',       label: 'Pagos',      icon: <CreditCardOutlined />, roles: ['GERENTE','JEFE_VENTAS'],           modulo: 'pagos' },
        { key: '/comisiones',  label: 'Comisiones', icon: <DollarOutlined />,     roles: null,                               modulo: 'comisiones' },
      ]
    },
    {
      label: 'Gestión',
      items: [
        { key: '/configuracion/packs-beneficios', label: 'Packs y Beneficios', icon: <TagOutlined />, roles: ['GERENTE','JEFE_VENTAS'], modulo: 'packs-beneficios' },
        { key: '/descuentos',  label: 'Descuentos',   icon: <PercentageOutlined />, roles: null,                     modulo: 'descuentos',     badge: nPendientes },
        { key: '/arriendos',   label: 'Arriendos',    icon: <CarOutlined />,        roles: ['GERENTE','JEFE_VENTAS'], modulo: 'arriendos' },
        { key: '/llaves',      label: 'Llaves',       icon: <KeyOutlined />,        roles: ['GERENTE','JEFE_VENTAS'], modulo: 'llaves' },
      ]
    },
    {
      label: 'Admin',
      items: [
        { key: '/equipo',                label: 'Equipo',           icon: <UserSwitchOutlined />,  roles: ['GERENTE'],              modulo: 'equipo' },
        { key: '/reportes',              label: 'Reportes',         icon: <BarChartOutlined />,    roles: ['GERENTE','JEFE_VENTAS'], modulo: 'reportes' },
        { key: '/automatizaciones',      label: 'Automatizaciones', icon: <ThunderboltOutlined />, roles: ['GERENTE','JEFE_VENTAS'], modulo: 'automatizaciones' },
        { key: '/configuracion/api-keys',label: 'API Keys',         icon: <ApiOutlined />,         roles: ['GERENTE'],              modulo: 'api-keys' },
      ]
    },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#fff' }}>
      {/* Logo */}
      <div style={{ padding: '16px 18px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 30, height: 30, borderRadius: 7,
          background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, color: '#fff', fontWeight: 800,
          fontFamily: "'Plus Jakarta Sans', sans-serif", flexShrink: 0,
        }}>BP</div>
        <div>
          <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 13, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.3px' }}>BodeParking</div>
          <div style={{ fontSize: 9, color: '#94a3b8' }}>CRM Inmobiliario</div>
        </div>
      </div>

      {/* UF pill */}
      <div style={{ margin: '8px 12px' }}>
        <UFDisplay />
      </div>

      {/* Nav */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 8px' }}>
        {NAV_SECTIONS.map(section => {
          const modulosActivos = usuario?.modulosVisibles || []
          const visibles = section.items.filter(item => {
            if (modulosActivos.length > 0) return modulosActivos.includes(item.modulo)
            return !item.roles || item.roles.includes(usuario?.rol)
          })
          if (!visibles.length) return null
          return (
            <div key={section.label}>
              <div style={{ fontSize: 9, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1.2px', padding: '8px 8px 3px' }}>
                {section.label}
              </div>
              {visibles.map(item => {
                const isActive = selectedKey === item.key
                return (
                  <div
                    key={item.key}
                    onClick={() => onNavigate(item.key)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '7px 9px', borderRadius: 7, cursor: 'pointer',
                      fontSize: 12, fontWeight: isActive ? 600 : 500,
                      color: isActive ? '#1d4ed8' : '#475569',
                      background: isActive ? '#eff6ff' : 'transparent',
                      marginBottom: 1, transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = '#f8fafc' }}
                    onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
                  >
                    <span style={{ fontSize: 13, color: isActive ? '#1d4ed8' : '#94a3b8', width: 16, textAlign: 'center', flexShrink: 0 }}>
                      {item.icon}
                    </span>
                    <span style={{ flex: 1 }}>{item.label}</span>
                    {item.badge > 0 && (
                      <span style={{ background: '#ef4444', color: '#fff', fontSize: 8, fontWeight: 700, padding: '1px 5px', borderRadius: 99 }}>
                        {item.badge}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>

      {/* Usuario */}
      <div style={{ padding: '10px 12px', borderTop: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          width: 28, height: 28, borderRadius: '50%',
          background: 'linear-gradient(135deg, #1d4ed8, #60a5fa)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 10, fontWeight: 700, color: '#fff', flexShrink: 0,
        }}>
          {usuario?.nombre?.[0]}{usuario?.apellido?.[0]}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {usuario?.nombre} {usuario?.apellido}
          </div>
          <div style={{ fontSize: 9, color: '#94a3b8' }}>{usuario?.rol?.replace(/_/g, ' ')}</div>
        </div>
        <Button
          type="text"
          size="small"
          icon={<SettingOutlined />}
          onClick={() => navigate('/perfil')}
          title="Mi perfil / Configurar correo"
          style={{ color: '#cbd5e1', padding: '0 4px', minWidth: 0 }}
        />
        <Button
          type="text"
          size="small"
          icon={<LogoutOutlined />}
          onClick={handleLogout}
          style={{ color: '#cbd5e1', padding: '0 4px', minWidth: 0 }}
        />
      </div>
    </div>
  )
}

export default function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  const selectedKey = '/' + location.pathname.split('/')[1]

  const handleNavigate = (key) => {
    navigate(key)
    setMobileOpen(false)
  }

  return (
    <AntLayout style={{ minHeight: '100vh' }}>
      {/* Desktop sidebar */}
      <Sider
        width={220}
        style={{ background: '#fff', boxShadow: '2px 0 12px rgba(0,0,0,0.04)' }}
        breakpoint="md"
        collapsedWidth={0}
        trigger={null}
      >
        <SidebarContent selectedKey={selectedKey} onNavigate={handleNavigate} />
      </Sider>

      {/* Mobile drawer */}
      <Drawer
        placement="left"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        width={220}
        bodyStyle={{ padding: 0 }}
        headerStyle={{ display: 'none' }}
      >
        <SidebarContent selectedKey={selectedKey} onNavigate={handleNavigate} />
      </Drawer>

      <AntLayout>
        {/* Header */}
        <Header style={{
          background: '#fff',
          padding: '0 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          borderBottom: '1px solid #e2e8f0',
          height: 52,
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}>
          <Button
            type="text"
            icon={<MenuOutlined />}
            onClick={() => setMobileOpen(true)}
            className="mobile-menu-btn"
            style={{ display: 'none' }}
          />
          <div style={{ flex: 1, display: 'flex', justifyContent: 'center', padding: '0 16px' }}>
            <BuscadorUniversal />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <CalendarioWidget />
            <NotificacionesBadge />
          </div>
        </Header>

        {/* Content */}
        <Content style={{ padding: '24px', background: '#f0f4f8', minHeight: 'calc(100vh - 52px)' }}>
          <Outlet />
        </Content>
      </AntLayout>
    </AntLayout>
  )
}
