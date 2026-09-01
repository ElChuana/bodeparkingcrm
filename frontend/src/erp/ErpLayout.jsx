/**
 * El shell del modo ERP: misma app y mismo login que el CRM, otra piel.
 *
 * El CRM sigue las unidades; el ERP sigue la plata. El switch de arriba a la
 * izquierda vuelve al CRM; el modo se deriva de la URL (ver ModoContext).
 */
import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Squares2X2Icon, BuildingLibraryIcon, ArrowsRightLeftIcon, DocumentTextIcon,
  ChartPieIcon, PresentationChartLineIcon, UsersIcon, Cog6ToothIcon,
  ArrowUturnLeftIcon, Bars3Icon, XMarkIcon,
} from '@heroicons/react/24/outline'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import './erp.css'

const NAV = [
  { to: '/erp', fin: true, label: 'Panel', icon: Squares2X2Icon },
  { to: '/erp/banco', label: 'Banco', icon: BuildingLibraryIcon },
  { to: '/erp/conciliacion', label: 'Conciliación', icon: ArrowsRightLeftIcon },
  { to: '/erp/documentos', label: 'Documentos', icon: DocumentTextIcon },
  { to: '/erp/presupuesto', label: 'Presupuesto', icon: ChartPieIcon },
  { to: '/erp/flujo', label: 'Flujo de caja', icon: PresentationChartLineIcon },
  { to: '/erp/cartera', label: 'Cobranza', icon: UsersIcon },
  { to: '/erp/configuracion', label: 'Configuración', icon: Cog6ToothIcon },
]

function Nav({ onNavega }) {
  const { data: salud } = useQuery({
    queryKey: ['erp-salud-badge'],
    queryFn: () => api.get('/erp/salud').then((r) => r.data),
    staleTime: 120000,
    refetchInterval: 300000,
  })

  return (
    <nav className="flex-1 px-2 py-2 space-y-0.5 overflow-y-auto" aria-label="Navegación del ERP">
      {NAV.map((item) => {
        const Icon = item.icon
        const { to, fin, label } = item
        return (
        <NavLink
          key={to}
          to={to}
          end={fin}
          onClick={onNavega}
          className={({ isActive }) =>
            `flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[12.5px] font-medium transition-colors ${
              isActive ? 'bg-bp-soft text-bp-dark font-semibold' : 'text-gris hover:bg-borde-suave hover:text-tinta'
            }`
          }
        >
          <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span className="flex-1">{label}</span>
          {label === 'Panel' && salud?.errores > 0 && (
            <span className="bg-cargo text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">{salud.errores}</span>
          )}
        </NavLink>
        )
      })}
    </nav>
  )
}

function Marca() {
  return (
    <div className="flex items-center gap-2.5 px-4 py-3.5 border-b border-borde-suave">
      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-bp to-bp-dark flex items-center justify-center text-white text-[11px] font-extrabold shrink-0">
        BP
      </div>
      <div className="leading-tight">
        <div className="text-[13px] font-bold text-tinta tracking-tight">BodeParking</div>
        <div className="text-[9.5px] font-semibold uppercase tracking-widest text-bp-dark">Finanzas</div>
      </div>
    </div>
  )
}

function VolverAlCrm() {
  const navigate = useNavigate()
  return (
    <button
      type="button"
      onClick={() => navigate('/leads')}
      className="flex items-center gap-2 mx-2 mb-2 px-2.5 py-2 rounded-lg text-[11.5px] font-semibold text-gris hover:bg-borde-suave hover:text-tinta transition-colors cursor-pointer"
    >
      <ArrowUturnLeftIcon className="w-3.5 h-3.5" aria-hidden="true" />
      Volver al CRM
    </button>
  )
}

export default function ErpLayout() {
  const { usuario, logout } = useAuth()
  const navigate = useNavigate()
  const [menuAbierto, setMenuAbierto] = useState(false)

  const { data: ufHoy } = useQuery({
    queryKey: ['uf-actual'],
    queryFn: () => api.get('/uf').then((r) => r.data).catch(() => null),
    staleTime: 3600000,
  })

  const sidebar = (
    <div className="flex flex-col h-full bg-carta">
      <Marca />
      <Nav onNavega={() => setMenuAbierto(false)} />
      <VolverAlCrm />
      <div className="flex items-center gap-2 px-4 py-3 border-t border-borde-suave">
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-bp to-bp-dark text-white text-[10px] font-bold flex items-center justify-center shrink-0">
          {usuario?.nombre?.[0]}{usuario?.apellido?.[0]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[11.5px] font-semibold truncate">{usuario?.nombre} {usuario?.apellido}</div>
          <div className="text-[9.5px] text-sutil">{usuario?.rol?.replace(/_/g, ' ')}</div>
        </div>
        <button
          type="button"
          onClick={() => { logout(); navigate('/login') }}
          className="text-[10.5px] text-sutil hover:text-cargo cursor-pointer"
          title="Cerrar sesión"
        >
          Salir
        </button>
      </div>
    </div>
  )

  return (
    <div className="erp min-h-dvh flex">
      {/* Sidebar escritorio */}
      <aside className="hidden md:flex w-52 shrink-0 border-r border-borde flex-col sticky top-0 h-dvh">
        {sidebar}
      </aside>

      {/* Drawer móvil */}
      {menuAbierto && (
        <div className="fixed inset-0 z-[900] md:hidden">
          <div className="absolute inset-0 bg-tinta/50" onClick={() => setMenuAbierto(false)} />
          <aside className="absolute inset-y-0 left-0 w-60 shadow-flotante">
            {sidebar}
            <button
              type="button"
              onClick={() => setMenuAbierto(false)}
              className="absolute top-3 right-3 text-sutil cursor-pointer"
              aria-label="Cerrar menú"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </aside>
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Header fino */}
        <header className="sticky top-0 z-[100] bg-carta/90 backdrop-blur border-b border-borde h-11 flex items-center gap-3 px-4">
          <button
            type="button"
            className="md:hidden text-gris cursor-pointer"
            onClick={() => setMenuAbierto(true)}
            aria-label="Abrir menú"
          >
            <Bars3Icon className="w-5 h-5" />
          </button>
          <div className="text-[11px] text-sutil font-medium">Modo ERP · financiero</div>
          <div className="flex-1" />
          {ufHoy?.valorPesos && (
            <div className="text-[11px] text-gris monto">
              UF hoy <span className="font-semibold text-tinta">${new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 }).format(ufHoy.valorPesos)}</span>
            </div>
          )}
        </header>

        <main className="flex-1 p-4 md:p-5 max-w-[1400px] w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
