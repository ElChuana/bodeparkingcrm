/**
 * Panel financiero: las preguntas que uno se hace al abrir el ERP.
 * ¿Cuánta plata hay? ¿Cuánto me deben? ¿Cómo viene el mes? ¿Qué espera decisión mía?
 */
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ExclamationTriangleIcon, CheckCircleIcon } from '@heroicons/react/24/solid'
import api from '../../services/api'
import { Carta, CartaTitulo, Kpi, Badge, Monto, clp, fecha, Cargando, Vacio, Boton } from '../ui'

function BarraPresupuesto({ cuenta }) {
  const usado = cuenta.ejecutado + cuenta.comprometido
  const pct = cuenta.presupuesto > 0 ? Math.min(100, Math.round((usado / cuenta.presupuesto) * 100)) : null
  const color = pct == null ? 'var(--color-sutil)' : pct > 100 ? 'var(--color-cargo)' : pct >= 85 ? 'var(--color-alerta)' : 'var(--color-abono)'
  return (
    <div className="py-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[12px] font-medium truncate">{cuenta.nombre}</span>
        <span className="monto text-[11.5px] text-gris whitespace-nowrap">
          {clp(usado)}{cuenta.presupuesto > 0 && <span className="text-sutil"> / {clp(cuenta.presupuesto)}</span>}
        </span>
      </div>
      <div className="barra mt-1" role="img" aria-label={pct != null ? `${pct}% del presupuesto` : 'sin presupuesto'}>
        <span style={{ width: `${pct == null ? (usado > 0 ? 100 : 0) : Math.min(pct, 100)}%`, background: color }} />
      </div>
    </div>
  )
}

export default function Panel() {
  const { data, isLoading } = useQuery({
    queryKey: ['erp-dashboard'],
    queryFn: () => api.get('/erp/dashboard').then((r) => r.data),
    staleTime: 60000,
  })

  if (isLoading || !data) return <Cargando alto="h-64" />

  const { caja, cxc, proximos30, provisiones, presupuestoMes, pendientes, salud } = data
  const cuentasConMovimiento = (presupuestoMes?.cuentas || []).filter((c) => c.presupuesto > 0 || c.ejecutado > 0 || c.comprometido > 0)

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h1 className="text-[17px] font-bold tracking-tight">Panel financiero</h1>
        <span className="text-[11px] text-sutil">
          {caja.saldoAl ? `Banco al ${fecha(caja.saldoAl)}` : 'Sin cartola cargada'}
        </span>
      </div>

      {/* Las cifras que mandan */}
      <div className="flex flex-wrap gap-3">
        <Kpi etiqueta="Saldo banco" valor={clp(caja.saldo)} sub={`${caja.cuentas} cuenta${caja.cuentas === 1 ? '' : 's'}`} tono="bp" />
        <Kpi etiqueta="Entradas del mes" valor={clp(caja.entradasMes)} tono="abono" />
        <Kpi etiqueta="Salidas del mes" valor={clp(caja.salidasMes)} tono="cargo" />
        <Kpi
          etiqueta="Por cobrar (cuotas)"
          valor={clp(cxc.total)}
          sub={cxc.vencido > 0 ? `${clp(cxc.vencido)} vencido` : 'nada vencido'}
          tono={cxc.vencido > 0 ? 'alerta' : 'neutro'}
        />
        <Kpi
          etiqueta="Próximos 30 días"
          valor={clp(proximos30.neto)}
          sub={`${clp(proximos30.porCobrar)} entra · ${clp(proximos30.porPagar)} sale`}
          tono={proximos30.neto >= 0 ? 'abono' : 'cargo'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Presupuesto del mes */}
        <Carta className="lg:col-span-1">
          <CartaTitulo extra={<Link to="/erp/presupuesto" className="text-[11px] font-semibold text-bp-dark hover:underline">Ver todo</Link>}>
            Presupuesto del mes
          </CartaTitulo>
          <div className="px-4 pb-3">
            {cuentasConMovimiento.length
              ? cuentasConMovimiento.map((c) => <BarraPresupuesto key={c.id} cuenta={c} />)
              : <Vacio>Sin presupuesto cargado este mes. <Link className="text-bp-dark font-semibold" to="/erp/presupuesto">Cárgalo acá</Link>.</Vacio>}
          </div>
        </Carta>

        {/* No te han facturado */}
        <Carta>
          <CartaTitulo extra={provisiones.vencidasSinFactura > 0 && <Badge tono="ambar">{provisiones.vencidasSinFactura}</Badge>}>
            ¿No te han facturado?
          </CartaTitulo>
          <div className="px-4 pb-3">
            {provisiones.vencidasSinFactura === 0 ? (
              <Vacio>Ninguna provisión vencida sin factura. Todo lo esperado está al día.</Vacio>
            ) : (
              <>
                <p className="text-[11.5px] text-gris mb-2">
                  {clp(provisiones.montoSinFactura)} en gastos cuya fecha pasó y la factura no ha llegado:
                </p>
                <ul className="space-y-1.5">
                  {provisiones.detalle.map((p) => (
                    <li key={p.documentoInternoId} className="flex items-baseline justify-between gap-2 text-[12px]">
                      <span className="truncate">
                        {p.concepto}
                        {p.proveedor && <span className="text-sutil"> · {p.proveedor}</span>}
                      </span>
                      <span className="monto text-alerta font-semibold whitespace-nowrap">{clp(p.monto)}</span>
                    </li>
                  ))}
                </ul>
                <Link to="/erp/documentos?estado=VENCIDO_SIN_FACTURA">
                  <Boton variante="normal" size="sm" className="mt-3 w-full">Ver provisiones vencidas</Boton>
                </Link>
              </>
            )}
          </div>
        </Carta>

        {/* Trabajo pendiente + salud */}
        <Carta>
          <CartaTitulo>Espera una decisión tuya</CartaTitulo>
          <div className="px-4 pb-3 space-y-2">
            <Link to="/erp/conciliacion" className="flex items-baseline justify-between gap-2 text-[12px] hover:bg-borde-suave rounded-md px-1.5 py-1 -mx-1.5">
              <span>Abonos sin imputar <Badge tono={pendientes.abonosSinImputar.cantidad ? 'azul' : 'gris'}>{pendientes.abonosSinImputar.cantidad}</Badge></span>
              <Monto valor={pendientes.abonosSinImputar.monto} signo="abono" className="font-semibold" />
            </Link>
            <Link to="/erp/conciliacion?lado=cargos" className="flex items-baseline justify-between gap-2 text-[12px] hover:bg-borde-suave rounded-md px-1.5 py-1 -mx-1.5">
              <span>Cargos sin documento <Badge tono={pendientes.cargosSinDocumento.cantidad ? 'ambar' : 'gris'}>{pendientes.cargosSinDocumento.cantidad}</Badge></span>
              <Monto valor={pendientes.cargosSinDocumento.monto} signo="cargo" className="font-semibold" />
            </Link>
            {cxc.peores.length > 0 && (
              <div className="pt-1 border-t border-borde-suave">
                <div className="text-[10.5px] font-semibold uppercase tracking-wider text-sutil mb-1">A quién llamar</div>
                {cxc.peores.map((c) => (
                  <Link key={c.contactoId} to={`/erp/cartera`} className="flex items-baseline justify-between gap-2 text-[12px] py-0.5 hover:text-bp-dark">
                    <span className="truncate">{c.nombre} <span className="text-sutil">· {c.diasMax} días</span></span>
                    <span className="monto font-semibold text-cargo">{clp(c.vencido || c.total)}</span>
                  </Link>
                ))}
              </div>
            )}
            <div className="pt-1 border-t border-borde-suave flex items-center gap-1.5 text-[11.5px]">
              {salud.errores > 0 ? (
                <>
                  <ExclamationTriangleIcon className="w-3.5 h-3.5 text-cargo" aria-hidden="true" />
                  <span className="text-cargo font-semibold">{salud.errores} error{salud.errores === 1 ? '' : 'es'} en los datos</span>
                  <span className="text-sutil">— las cifras no son confiables hasta revisarlo</span>
                </>
              ) : (
                <>
                  <CheckCircleIcon className="w-3.5 h-3.5 text-abono" aria-hidden="true" />
                  <span className="text-gris">Datos sanos{salud.avisos > 0 ? ` · ${salud.avisos} aviso${salud.avisos === 1 ? '' : 's'}` : ''}</span>
                </>
              )}
            </div>
          </div>
        </Carta>
      </div>
    </div>
  )
}
