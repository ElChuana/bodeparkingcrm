/**
 * El shell del modo ERP: la misma app, el mismo login y la misma estética del
 * CRM (Ant Design) — solo cambia el menú. El CRM sigue las unidades; el ERP
 * sigue la plata. "Volver al CRM" te devuelve al otro mundo.
 */
import { useState } from 'react'
import { useNavigate, useLocation, Outlet } from 'react-router-dom'
import { Layout as AntLayout, Button, Drawer, Badge } from 'antd'
import {
  DashboardOutlined, BankOutlined, SwapOutlined, FileTextOutlined,
  PieChartOutlined, LineChartOutlined, TeamOutlined, SettingOutlined,
  MenuOutlined, LogoutOutlined, RollbackOutlined,
} from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import UFDisplay from '../components/UFDisplay'

const { Sider, Header, Content } = AntLayout

const NAV = [
  { key: '/erp', label: 'Panel financiero', icon: <DashboardOutlined /> },
  { key: '/erp/banco', label: 'Banco', icon: <BankOutlined /> },
  { key: '/erp/conciliacion', label: 'Conciliación', icon: <SwapOutlined /> },
  { key: '/erp/documentos', label: 'Documentos', icon: <FileTextOutlined /> },
  { key: '/erp/presupuesto', label: 'Presupuesto', icon: <PieChartOutlined /> },
  { key: '/erp/flujo', label: 'Flujo de caja', icon: <LineChartOutlined /> },
  { key: '/erp/cartera', label: 'Cobranza', icon: <TeamOutlined /> },
  { key: '/erp/configuracion', label: 'Configuración', icon: <SettingOutlined /> },
]

function SidebarContent({ selectedKey, onNavigate }) {
  const { usuario, logout } = useAuth()
  const navigate = useNavigate()

  const { data: salud } = useQuery({
    queryKey: ['erp-salud-badge'],
    queryFn: () => api.get('/erp/salud').then((r) => r.data),
    staleTime: 120000,
    refetchInterval: 300000,
  })

  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#fff' }}>
      {/* Logo — el mismo bloque del CRM, con la identidad Finanzas */}
      <div style={{ padding: '16px 18px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 30, height: 30, borderRadius: 7,
          background: 'linear-gradient(135deg, #0091C3, #00719a)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, color: '#fff', fontWeight: 800,
          fontFamily: "'Plus Jakarta Sans', sans-serif", flexShrink: 0,
        }}>BP</div>
        <div>
          <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 13, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.3px' }}>BodeParking</div>
          <div style={{ fontSize: 9, color: '#0091C3', fontWeight: 700, letterSpacing: '1px' }}>FINANZAS</div>
        </div>
      </div>

      {/* UF pill */}
      <div style={{ margin: '8px 12px' }}>
        <UFDisplay />
      </div>

      {/* Nav */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 8px' }}>
        <div style={{ fontSize: 9, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1.2px', padding: '8px 8px 3px' }}>
          Finanzas
        </div>
        {NAV.map(item => {
          const isActive = selectedKey === item.key
          return (
            <div
              key={item.key}
              onClick={() => onNavigate(item.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '7px 9px', borderRadius: 7, cursor: 'pointer',
                fontSize: 12, fontWeight: isActive ? 600 : 500,
                color: isActive ? '#0083b0' : '#475569',
                background: isActive ? '#e6f5fa' : 'transparent',
                marginBottom: 1, transition: 'all 0.15s',
              }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = '#f8fafc' }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
            >
              <span style={{ fontSize: 13, color: isActive ? '#0083b0' : '#94a3b8', width: 16, textAlign: 'center', flexShrink: 0 }}>
                {item.icon}
              </span>
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.key === '/erp' && salud?.errores > 0 && (
                <span style={{ background: '#ef4444', color: '#fff', fontSize: 8, fontWeight: 700, padding: '1px 5px', borderRadius: 99 }}>
                  {salud.errores}
                </span>
              )}
            </div>
          )
        })}
      </div>

      {/* Volver al CRM */}
      <div style={{ padding: '0 12px 8px' }}>
        <Button
          block
          icon={<RollbackOutlined />}
          onClick={() => navigate('/leads')}
          style={{ borderRadius: 7, fontSize: 12, fontWeight: 600 }}
        >
          Volver al CRM
        </Button>
      </div>

      {/* Usuario */}
      <div style={{ padding: '10px 12px', borderTop: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          width: 28, height: 28, borderRadius: '50%',
          background: 'linear-gradient(135deg, #0091C3, #00719a)',
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
          icon={<LogoutOutlined />}
          onClick={handleLogout}
          style={{ color: '#cbd5e1', padding: '0 4px', minWidth: 0 }}
        />
      </div>
    </div>
  )
}

export default function ErpLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  // /erp/banco → /erp/banco; /erp → /erp (el Panel)
  const partes = location.pathname.split('/')
  const selectedKey = partes[2] ? `/erp/${partes[2]}` : '/erp'

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
        styles={{ body: { padding: 0 }, header: { display: 'none' } }}
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
          <Badge color="#0091C3" text={<span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Modo ERP · financiero</span>} />
          <div style={{ flex: 1 }} />
          <Button
            size="small"
            icon={<RollbackOutlined />}
            onClick={() => navigate('/leads')}
            style={{ borderRadius: 999, fontWeight: 600, fontSize: 12 }}
          >
            CRM
          </Button>
        </Header>

        {/* Content */}
        <Content style={{ padding: '24px', background: '#f0f4f8', minHeight: 'calc(100vh - 52px)' }}>
          <Outlet />
        </Content>
      </AntLayout>
    </AntLayout>
  )
}
