import { useState } from 'react'
import { useNavigate, useLocation, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Layout as AntLayout, Menu, Button, Avatar, Typography, theme, Drawer } from 'antd'
import logo from '../assets/logo.png'
import {
  DashboardOutlined, AppstoreOutlined, TeamOutlined,
  ShoppingOutlined, AuditOutlined, CreditCardOutlined,
  DollarOutlined, TagOutlined, CarOutlined, KeyOutlined,
  BarChartOutlined, UserSwitchOutlined, ThunderboltOutlined,
  MenuOutlined, LogoutOutlined, CalendarOutlined, PercentageOutlined
} from '@ant-design/icons'
import { Badge } from 'antd'
import { useQuery } from '@tanstack/react-query'
import api from '../services/api'
import NotificacionesBadge from './NotificacionesBadge'
import CalendarioWidget from './CalendarioWidget'
import UFDisplay from './UFDisplay'
import BuscadorUniversal from './BuscadorUniversal'

const { Sider, Header, Content } = AntLayout
const { Text } = Typography

const navItems = [
  { key: '/dashboard',   label: 'Dashboard',    icon: <DashboardOutlined />,  roles: null },
  { key: '/inventario',  label: 'Inventario',   icon: <AppstoreOutlined />,   roles: ['GERENTE','JEFE_VENTAS'] },
  { key: '/leads',       label: 'Leads',        icon: <TeamOutlined />,       roles: null },
  { key: '/visitas',     label: 'Visitas',      icon: <CalendarOutlined />,   roles: ['GERENTE','JEFE_VENTAS'] },
  { key: '/ventas',      label: 'Ventas',       icon: <ShoppingOutlined />,   roles: ['GERENTE','JEFE_VENTAS','ABOGADO'] },
  { key: '/legal',       label: 'Legal',        icon: <AuditOutlined />,      roles: ['GERENTE','JEFE_VENTAS','ABOGADO'] },
  { key: '/pagos',       label: 'Pagos',        icon: <CreditCardOutlined />, roles: ['GERENTE','JEFE_VENTAS'] },
  { key: '/comisiones',  label: 'Comisiones',   icon: <DollarOutlined />,     roles: null },
  { key: '/promociones', label: 'Promociones',  icon: <TagOutlined />,        roles: null },
  { key: '/arriendos',   label: 'Arriendos',    icon: <CarOutlined />,        roles: ['GERENTE','JEFE_VENTAS'] },
  { key: '/llaves',      label: 'Llaves',       icon: <KeyOutlined />,        roles: ['GERENTE','JEFE_VENTAS'] },
  { key: '/equipo',          label: 'Equipo',          icon: <UserSwitchOutlined />,   roles: ['GERENTE'] },
  { key: '/reportes',        label: 'Reportes',        icon: <BarChartOutlined />,     roles: ['GERENTE','JEFE_VENTAS'] },
  { key: '/automatizaciones', label: 'Automatizaciones', icon: <ThunderboltOutlined />, roles: ['GERENTE','JEFE_VENTAS'] },
  { key: '/descuentos',      label: 'Descuentos',      icon: <PercentageOutlined />,   roles: null },
]

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

  const items = navItems
    .filter(item => !item.roles || item.roles.includes(usuario?.rol))
    .map(item => ({
      key: item.key,
      icon: item.icon,
      label: item.key === '/descuentos' && nPendientes > 0
        ? <Badge count={nPendientes} size="small" offset={[6, 0]}>{item.label}</Badge>
        : item.label,
    }))

  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#001529' }}>
      {/* Logo */}
      <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.1)', background: '#fff' }}>
        <img src={logo} alt="BodeParking" style={{ height: 36, width: '100%', objectFit: 'contain', objectPosition: 'left' }} />
      </div>

      {/* UF del día */}
      <div style={{ padding: '8px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <UFDisplay />
      </div>

      {/* Menú */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          onClick={({ key }) => onNavigate(key)}
          items={items}
          style={{ border: 'none', marginTop: 4 }}
        />
      </div>

      {/* Usuario */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <Avatar style={{ background: '#1677ff', fontWeight: 700, flexShrink: 0 }} size={32}>
            {usuario?.nombre?.[0]}{usuario?.apellido?.[0]}
          </Avatar>
          <div style={{ overflow: 'hidden' }}>
            <Text style={{ color: '#fff', fontSize: 13, display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {usuario?.nombre} {usuario?.apellido}
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11 }}>
              {usuario?.rol?.replace(/_/g, ' ')}
            </Text>
          </div>
        </div>
        <Button
          type="text"
          size="small"
          icon={<LogoutOutlined />}
          onClick={handleLogout}
          style={{ color: 'rgba(255,255,255,0.45)', padding: '0 4px' }}
        >
          Cerrar sesión
        </Button>
      </div>
    </div>
  )
}

export default function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const { token } = theme.useToken()

  // Match current route to menu key
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
        style={{ display: 'flex', flexDirection: 'column' }}
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
          padding: '0 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
          height: 56,
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}>
          <Button
            type="text"
            icon={<MenuOutlined />}
            onClick={() => setMobileOpen(true)}
            style={{ display: 'none' }}
            className="mobile-menu-btn"
          />
          <div style={{ flex: 1, display: 'flex', justifyContent: 'center', padding: '0 16px' }}>
            <BuscadorUniversal />
          </div>
          <CalendarioWidget />
          <NotificacionesBadge />
        </Header>

        {/* Page content */}
        <Content style={{ padding: '24px', background: token.colorBgLayout, minHeight: 'calc(100vh - 56px)' }}>
          <Outlet />
        </Content>
      </AntLayout>
    </AntLayout>
  )
}
