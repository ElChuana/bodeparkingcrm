import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

// ── Paleta ──────────────────────────────────────────────────────────────────
const NAVY    = '#0C1A2E'
const NAVY2   = '#152338'
const GOLD    = '#C8963E'
const GOLD_LT = '#EDD9A3'
const WHITE   = '#FFFFFF'
const SMOKE   = '#F7F9FC'
const BORDER  = '#DCE4EF'
const TEXT    = '#1E2D3D'
const MUTED   = '#7A8FA6'
const MUTED2  = '#A0B4C8'
const GREEN   = '#0D7A3E'
const GREEN_BG= '#EDFAF3'
const BLUE_BG = '#EEF4FD'
const BLUE_BD = '#1D4ED8'

const TIPOS_DESCUENTO = ['DESCUENTO_PORCENTAJE', 'DESCUENTO_UF', 'PAQUETE']

const TIPO_PROMO_LABEL = {
  DESCUENTO_PORCENTAJE: 'Dto. %',
  DESCUENTO_UF:         'Dto. UF',
  PAQUETE:              'Paquete',
  BENEFICIO:            'Beneficio',
  ARRIENDO_ASEGURADO:   'Arriendo aseg.',
  GASTOS_NOTARIALES:    'Gs. Notariales',
  CUOTAS_SIN_INTERES:   'Cuotas s/int.',
  COMBO:                'Combo',
  OTRO:                 'Otro',
}

const ESTADO_LABEL = {
  BORRADOR:  'Borrador',
  ENVIADA:   'Enviada',
  ACEPTADA:  'Aceptada',
  RECHAZADA: 'Rechazada',
}

// ── Estilos ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: TEXT,
    backgroundColor: WHITE,
    paddingTop: 0,
    paddingBottom: 52,
    paddingHorizontal: 0,
  },

  // ── Header navy ──
  header: {
    backgroundColor: NAVY,
    paddingTop: 26,
    paddingBottom: 26,
    paddingHorizontal: 44,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logoWrap: {
    backgroundColor: WHITE,
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  logo: { width: 130, height: 34, objectFit: 'contain' },
  logoText: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: WHITE, letterSpacing: 1 },
  headerRight: { alignItems: 'flex-end' },
  headerEtiqueta: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: GOLD,
    letterSpacing: 2.5,
    marginBottom: 5,
  },
  headerNumero: {
    fontSize: 24,
    fontFamily: 'Helvetica-Bold',
    color: WHITE,
    marginBottom: 7,
    lineHeight: 1,
  },
  headerMeta: { fontSize: 8.5, color: MUTED2, marginBottom: 2 },
  headerEstado: {
    marginTop: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: GOLD,
    borderRadius: 2,
  },
  headerEstadoText: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: NAVY, letterSpacing: 1 },

  // ── Franja dorada ──
  goldBar: { height: 4, backgroundColor: GOLD },

  // ── Contenido ──
  body: { paddingHorizontal: 44, paddingTop: 22 },

  // ── Cards info ──
  infoRow: { flexDirection: 'row', gap: 12, marginBottom: 22 },
  infoCard: {
    flex: 1,
    borderLeftWidth: 3,
    borderLeftColor: GOLD,
    paddingLeft: 11,
    paddingTop: 2,
    paddingBottom: 2,
  },
  infoEtiqueta: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: GOLD,
    letterSpacing: 1.8,
    marginBottom: 5,
  },
  infoNombre: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: TEXT,
    marginBottom: 3,
  },
  infoSub: { fontSize: 9, color: MUTED, marginBottom: 1 },

  // ── Divisor ──
  divider: { height: 1, backgroundColor: BORDER, marginBottom: 16 },

  // ── Título sección ──
  secTitle: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: MUTED,
    letterSpacing: 2,
    marginBottom: 8,
    marginTop: 2,
  },

  // ── Tabla unidades ──
  tHead: {
    flexDirection: 'row',
    backgroundColor: NAVY2,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 2,
    marginBottom: 0,
  },
  tHeadText: {
    color: WHITE,
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 0.5,
  },
  tRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  tRowAlt: { backgroundColor: SMOKE },
  cEdificio: { flex: 3 },
  cUnidad:   { flex: 2 },
  cTipo:     { flex: 1.5 },
  cPrecio:   { flex: 1.8, alignItems: 'flex-end' },
  tCell:     { fontSize: 10, color: TEXT },
  tCellBold: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: TEXT },
  tCellPesos: { fontSize: 8, color: MUTED, marginTop: 1 },

  // ── Promos ──
  promoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 3,
    marginBottom: 3,
  },
  promoDescuento: { backgroundColor: GREEN_BG, borderLeftWidth: 2, borderLeftColor: GREEN },
  promoBeneficio: { backgroundColor: BLUE_BG,  borderLeftWidth: 2, borderLeftColor: BLUE_BD },
  promoBadge: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 2,
    marginRight: 8,
  },
  badgeDescuento: { backgroundColor: '#D1FAE5', color: '#065F46' },
  badgeBeneficio: { backgroundColor: '#DBEAFE', color: '#1E40AF' },
  promoNombre: { fontSize: 10, flex: 1, color: TEXT },
  promoAhorro: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: GREEN },

  // ── Caja total ──
  totalBox: {
    backgroundColor: NAVY,
    borderRadius: 4,
    marginTop: 18,
    overflow: 'hidden',
  },
  totalBoxInner: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  totalGoldTop: { height: 3, backgroundColor: GOLD },
  totalLeft: { flex: 1 },
  totalLineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
    paddingRight: 20,
  },
  totalLineLabel: { fontSize: 9, color: MUTED2 },
  totalLineVal:   { fontSize: 9, color: MUTED2 },
  totalSaving:    { fontSize: 9, color: '#6EE7B7', fontFamily: 'Helvetica-Bold' },
  totalRight: { alignItems: 'flex-end' },
  totalEtiqueta: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: GOLD_LT,
    letterSpacing: 2,
    marginBottom: 5,
  },
  totalValor: {
    fontSize: 30,
    fontFamily: 'Helvetica-Bold',
    color: GOLD,
    lineHeight: 1,
  },
  totalUF: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: GOLD,
  },
  totalAhorro: {
    marginTop: 5,
    fontSize: 8.5,
    color: '#6EE7B7',
    fontFamily: 'Helvetica-Bold',
    textAlign: 'right',
  },

  // ── Notas ──
  notasBox: {
    marginTop: 16,
    backgroundColor: SMOKE,
    borderLeftWidth: 3,
    borderLeftColor: GOLD,
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  notasEtiqueta: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: GOLD,
    letterSpacing: 1.8,
    marginBottom: 5,
  },
  notasTexto: { fontSize: 10, color: MUTED, lineHeight: 1.5 },

  // ── Validez ──
  validezBox: {
    marginTop: 14,
    flexDirection: 'row',
    gap: 14,
  },
  validezItem: {
    flex: 1,
    backgroundColor: SMOKE,
    borderRadius: 3,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  validezLabel: { fontSize: 7.5, color: MUTED, letterSpacing: 1.2, marginBottom: 3 },
  validezVal: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: TEXT },

  // ── Footer ──
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 38,
    backgroundColor: NAVY,
    paddingHorizontal: 44,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerLeft:  { fontSize: 8, color: MUTED2 },
  footerRight: { fontSize: 8, color: MUTED2 },
  footerGold:  { fontSize: 8, fontFamily: 'Helvetica-Bold', color: GOLD },
})

// ── Helpers ────────────────────────────────────────────────────────────────
function calcularResumen(items, promociones) {
  const base = items.reduce((s, i) => s + i.precioListaUF, 0)
  const descuentos = []
  const beneficios = []
  let descuentoTotal = 0
  ;(promociones || []).filter(cp => cp.aplicada).forEach(cp => {
    const promo = cp.promocion
    if (TIPOS_DESCUENTO.includes(promo.tipo)) {
      const ahorro = cp.ahorroUF || 0
      if (ahorro > 0) {
        descuentos.push({ nombre: promo.nombre, tipo: promo.tipo, ahorro, label: TIPO_PROMO_LABEL[promo.tipo] })
        descuentoTotal += ahorro
      }
    } else {
      beneficios.push({ nombre: promo.nombre, tipo: promo.tipo, label: TIPO_PROMO_LABEL[promo.tipo] })
    }
  })
  return { base, descuentoTotal, final: Math.max(base - descuentoTotal, 0), descuentos, beneficios }
}

// ── Helpers de formato ──────────────────────────────────────────────────────
function fmtUF(uf) {
  return `${uf.toFixed(2)} UF`
}
function fmtPesos(uf, valorUF) {
  if (!valorUF) return null
  return `$${Math.round(uf * valorUF).toLocaleString('es-CL')}`
}

// ── Componente ─────────────────────────────────────────────────────────────
export function CotizacionDocumento({ cotizacion, logoUrl, valorUF }) {
  const { lead, items, promociones, notas, validezDias, creadoEn, id, estado } = cotizacion
  const resumen  = calcularResumen(items, promociones)
  const contacto = lead?.contacto
  const vendedor = lead?.vendedor || lead?.broker

  const fechaEmision = format(new Date(creadoEn), "d 'de' MMMM yyyy", { locale: es })
  const fechaVence   = format(
    new Date(new Date(creadoEn).getTime() + validezDias * 86400000),
    "d 'de' MMMM yyyy", { locale: es }
  )

  return (
    <Document title={`Cotización #${id} — BodeParking`} author="BodeParking">
      <Page size="A4" style={s.page}>

        {/* ══ HEADER NAVY ══ */}
        <View style={s.header}>
          {logoUrl
            ? <View style={s.logoWrap}><Image src={logoUrl} style={s.logo} /></View>
            : <Text style={s.logoText}>BODEPARKING</Text>
          }
          <View style={s.headerRight}>
            <Text style={s.headerEtiqueta}>COTIZACIÓN</Text>
            <Text style={s.headerNumero}>N° {String(id).padStart(4, '0')}</Text>
            <Text style={s.headerMeta}>Emisión: {fechaEmision}</Text>
            <Text style={s.headerMeta}>Válida hasta: {fechaVence}</Text>
            <View style={s.headerEstado}>
              <Text style={s.headerEstadoText}>{ESTADO_LABEL[estado] || estado}</Text>
            </View>
          </View>
        </View>

        {/* Franja dorada */}
        <View style={s.goldBar} />

        {/* ══ BODY ══ */}
        <View style={s.body}>

          {/* ── Cliente + Vendedor ── */}
          <View style={s.infoRow}>
            <View style={s.infoCard}>
              <Text style={s.infoEtiqueta}>PREPARADO PARA</Text>
              <Text style={s.infoNombre}>{contacto?.nombre} {contacto?.apellido}</Text>
              {contacto?.email    && <Text style={s.infoSub}>{contacto.email}</Text>}
              {contacto?.telefono && <Text style={s.infoSub}>{contacto.telefono}</Text>}
            </View>
            {vendedor && (
              <View style={s.infoCard}>
                <Text style={s.infoEtiqueta}>EJECUTIVO DE VENTAS</Text>
                <Text style={s.infoNombre}>{vendedor.nombre} {vendedor.apellido}</Text>
                {vendedor.email && <Text style={s.infoSub}>{vendedor.email}</Text>}
              </View>
            )}
          </View>

          {/* ── Tabla unidades ── */}
          <Text style={s.secTitle}>UNIDADES COTIZADAS</Text>
          <View style={s.tHead}>
            <Text style={[s.tHeadText, s.cEdificio]}>PROYECTO</Text>
            <Text style={[s.tHeadText, s.cUnidad]}>UNIDAD</Text>
            <Text style={[s.tHeadText, s.cTipo]}>TIPO</Text>
            <Text style={[s.tHeadText, s.cPrecio]}>PRECIO LISTA</Text>
          </View>
          {items.map((item, i) => (
            <View key={item.id} style={[s.tRow, i % 2 !== 0 && s.tRowAlt]}>
              <Text style={[s.tCell, s.cEdificio]}>{item.unidad.edificio.nombre}</Text>
              <Text style={[s.tCell, s.cUnidad]}>{item.unidad.numero}</Text>
              <Text style={[s.tCell, s.cTipo]}>
                {item.unidad.tipo === 'BODEGA' ? 'Bodega' : 'Estacionamiento'}
              </Text>
              <View style={[s.cPrecio, { alignItems: 'flex-end' }]}>
              <Text style={s.tCellBold}>{fmtUF(item.precioListaUF)}</Text>
              {fmtPesos(item.precioListaUF, valorUF) && (
                <Text style={s.tCellPesos}>{fmtPesos(item.precioListaUF, valorUF)}</Text>
              )}
            </View>
            </View>
          ))}

          {/* ── Descuentos ── */}
          {resumen.descuentos.length > 0 && (
            <View style={{ marginTop: 18 }}>
              <Text style={s.secTitle}>DESCUENTOS APLICADOS</Text>
              {resumen.descuentos.map((d, i) => (
                <View key={i} style={[s.promoRow, s.promoDescuento]}>
                  <Text style={[s.promoBadge, s.badgeDescuento]}>{d.label}</Text>
                  <Text style={s.promoNombre}>{d.nombre}</Text>
                  <Text style={s.promoAhorro}>− {d.ahorro.toFixed(2)} UF</Text>
                </View>
              ))}
            </View>
          )}

          {/* ── Beneficios ── */}
          {resumen.beneficios.length > 0 && (
            <View style={{ marginTop: resumen.descuentos.length > 0 ? 12 : 18 }}>
              <Text style={s.secTitle}>BENEFICIOS INCLUIDOS</Text>
              {resumen.beneficios.map((b, i) => (
                <View key={i} style={[s.promoRow, s.promoBeneficio]}>
                  <Text style={[s.promoBadge, s.badgeBeneficio]}>{b.label}</Text>
                  <Text style={s.promoNombre}>{b.nombre}</Text>
                </View>
              ))}
            </View>
          )}

          {/* ── Caja total ── */}
          <View style={s.totalBox}>
            <View style={s.totalGoldTop} />
            <View style={s.totalBoxInner}>
              {/* Izquierda: desglose */}
              <View style={s.totalLeft}>
                {items.length > 1 && (
                  <View style={s.totalLineRow}>
                    <Text style={s.totalLineLabel}>Subtotal ({items.length} unidades)</Text>
                    <Text style={s.totalLineVal}>
                      {fmtUF(resumen.base)}
                      {fmtPesos(resumen.base, valorUF) ? `  ·  ${fmtPesos(resumen.base, valorUF)}` : ''}
                    </Text>
                  </View>
                )}
                {resumen.descuentoTotal > 0 && (
                  <View style={s.totalLineRow}>
                    <Text style={s.totalLineLabel}>Total descuentos</Text>
                    <Text style={s.totalSaving}>
                      − {fmtUF(resumen.descuentoTotal)}
                      {fmtPesos(resumen.descuentoTotal, valorUF) ? `  (${fmtPesos(resumen.descuentoTotal, valorUF)})` : ''}
                    </Text>
                  </View>
                )}
              </View>
              {/* Derecha: precio final */}
              <View style={s.totalRight}>
                <Text style={s.totalEtiqueta}>PRECIO FINAL</Text>
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4 }}>
                  <Text style={s.totalValor}>{resumen.final.toFixed(2)}</Text>
                  <Text style={[s.totalUF, { marginBottom: 3 }]}>UF</Text>
                </View>
                {fmtPesos(resumen.final, valorUF) && (
                  <Text style={{ fontSize: 11, color: GOLD_LT, textAlign: 'right', marginTop: 2 }}>
                    {fmtPesos(resumen.final, valorUF)}
                  </Text>
                )}
                {resumen.descuentoTotal > 0 && (
                  <Text style={s.totalAhorro}>
                    Ahorro: {fmtUF(resumen.descuentoTotal)}
                    {fmtPesos(resumen.descuentoTotal, valorUF) ? `  (${fmtPesos(resumen.descuentoTotal, valorUF)})` : ''}
                  </Text>
                )}
              </View>
            </View>
          </View>

          {/* ── Validez ── */}
          <View style={s.validezBox}>
            <View style={s.validezItem}>
              <Text style={s.validezLabel}>VIGENCIA</Text>
              <Text style={s.validezVal}>{validezDias} días corridos</Text>
            </View>
            <View style={s.validezItem}>
              <Text style={s.validezLabel}>VENCE EL</Text>
              <Text style={s.validezVal}>{fechaVence}</Text>
            </View>
            <View style={[s.validezItem, { flex: 2 }]}>
              <Text style={s.validezLabel}>PRECIOS EN UF</Text>
              <Text style={[s.validezVal, { fontSize: 8.5, color: MUTED }]}>
                Valor UF al día de escrituración. Sujeto a disponibilidad.
              </Text>
            </View>
          </View>

          {/* ── Notas ── */}
          {notas && (
            <View style={s.notasBox}>
              <Text style={s.notasEtiqueta}>OBSERVACIONES</Text>
              <Text style={s.notasTexto}>{notas}</Text>
            </View>
          )}

        </View>

        {/* ══ FOOTER NAVY ══ */}
        <View style={s.footer} fixed>
          <Text style={s.footerLeft}>
            <Text style={s.footerGold}>BodeParking</Text>
            {'  ·  '}Cotización N° {String(id).padStart(4, '0')}
          </Text>
          <Text style={s.footerRight}>bodeparking.cl</Text>
        </View>

      </Page>
    </Document>
  )
}
