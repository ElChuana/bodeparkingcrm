import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

// ── Paleta clara ────────────────────────────────────────────────────────────
const BLUE    = '#1B5EA8'   // azul principal
const BLUE_LT = '#EBF3FB'  // fondo azul muy claro
const BLUE_HD = '#E1EDF9'  // cabecera tabla
const WHITE   = '#FFFFFF'
const SMOKE   = '#F5F7FA'  // gris muy claro
const BORDER  = '#DDE4EF'
const TEXT    = '#1A2533'
const MUTED   = '#637083'
const MUTED2  = '#8A9BB0'
const GREEN   = '#0D7A3E'
const GREEN_BG= '#EDFAF3'
const BLUE_BG = '#EBF3FB'
const BLUE_BD = '#1B5EA8'

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
    paddingBottom: 46,
    paddingHorizontal: 0,
  },

  // ── Franja azul top ──
  topBar: { height: 5, backgroundColor: BLUE },

  // ── Header blanco ──
  header: {
    backgroundColor: WHITE,
    paddingTop: 20,
    paddingBottom: 18,
    paddingHorizontal: 44,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  logo: { width: 140, height: 38, objectFit: 'contain' },
  logoText: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: BLUE },
  headerRight: { alignItems: 'flex-end' },
  headerEtiqueta: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: BLUE,
    letterSpacing: 2.5,
    marginBottom: 4,
  },
  headerNumero: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    color: TEXT,
    marginBottom: 6,
    lineHeight: 1,
  },
  headerMeta: { fontSize: 8.5, color: MUTED, marginBottom: 2 },
  headerEstado: {
    marginTop: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: BLUE_LT,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: BLUE,
  },
  headerEstadoText: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: BLUE, letterSpacing: 1 },

  // ── Contenido ──
  body: { paddingHorizontal: 44, paddingTop: 20 },

  // ── Cards info ──
  infoRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  infoCard: {
    flex: 1,
    backgroundColor: SMOKE,
    borderRadius: 4,
    borderTopWidth: 2,
    borderTopColor: BLUE,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  infoEtiqueta: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: BLUE,
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

  // ── Título sección ──
  secTitle: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: BLUE,
    letterSpacing: 2,
    marginBottom: 7,
    marginTop: 2,
  },

  // ── Tabla unidades ──
  tHead: {
    flexDirection: 'row',
    backgroundColor: BLUE_HD,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderTopWidth: 1,
    borderTopColor: BLUE,
    borderBottomWidth: 1,
    borderBottomColor: BLUE,
  },
  tHeadText: {
    color: BLUE,
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
    backgroundColor: BLUE_LT,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: BLUE,
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
  totalBlueTop: { height: 3, backgroundColor: BLUE },
  totalLeft: { flex: 1 },
  totalLineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
    paddingRight: 20,
  },
  totalLineLabel: { fontSize: 9, color: MUTED },
  totalLineVal:   { fontSize: 9, color: MUTED },
  totalSaving:    { fontSize: 9, color: GREEN, fontFamily: 'Helvetica-Bold' },
  totalRight: { alignItems: 'flex-end' },
  totalEtiqueta: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: BLUE,
    letterSpacing: 2,
    marginBottom: 5,
  },
  totalValorPesos: {
    fontSize: 28,
    fontFamily: 'Helvetica-Bold',
    color: BLUE,
    lineHeight: 1,
  },
  totalValorUF: {
    fontSize: 11,
    color: MUTED,
    marginTop: 4,
    textAlign: 'right',
  },
  totalAhorro: {
    marginTop: 4,
    fontSize: 8.5,
    color: GREEN,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'right',
  },

  // ── Notas ──
  notasBox: {
    marginTop: 16,
    backgroundColor: SMOKE,
    borderLeftWidth: 3,
    borderLeftColor: BLUE,
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  notasEtiqueta: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: BLUE,
    letterSpacing: 1.8,
    marginBottom: 5,
  },
  notasTexto: { fontSize: 10, color: MUTED, lineHeight: 1.5 },

  // ── Validez ──
  validezBox: { marginTop: 14, flexDirection: 'row', gap: 12 },
  validezItem: {
    flex: 1,
    backgroundColor: SMOKE,
    borderRadius: 3,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 2,
    borderTopColor: BORDER,
  },
  validezLabel: { fontSize: 7.5, color: MUTED, letterSpacing: 1.2, marginBottom: 3 },
  validezVal:   { fontSize: 10, fontFamily: 'Helvetica-Bold', color: TEXT },

  // ── Footer ──
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 36,
    backgroundColor: SMOKE,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    paddingHorizontal: 44,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerLeft:  { fontSize: 8, color: MUTED },
  footerRight: { fontSize: 8, color: MUTED },
  footerBlue:  { fontSize: 8, fontFamily: 'Helvetica-Bold', color: BLUE },
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
  const { lead, items, promociones, notas, validezDias, creadoEn, id, estado, descuentoAprobadoUF } = cotizacion
  const resumen  = calcularResumen(items, promociones)
  const aprobado = descuentoAprobadoUF || 0
  const totalFinal = Math.max(resumen.final - aprobado, 0)
  const ahorroTotal = resumen.descuentoTotal + aprobado
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

        {/* ══ FRANJA AZUL TOP ══ */}
        <View style={s.topBar} />

        {/* ══ HEADER BLANCO ══ */}
        <View style={s.header}>
          {logoUrl
            ? <Image src={logoUrl} style={s.logo} />
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
          {(resumen.descuentos.length > 0 || aprobado > 0) && (
            <View style={{ marginTop: 18 }}>
              <Text style={s.secTitle}>DESCUENTOS APLICADOS</Text>
              {resumen.descuentos.map((d, i) => (
                <View key={i} style={[s.promoRow, s.promoDescuento]}>
                  <Text style={[s.promoBadge, s.badgeDescuento]}>{d.label}</Text>
                  <Text style={s.promoNombre}>{d.nombre}</Text>
                  <Text style={s.promoAhorro}>− {d.ahorro.toFixed(2)} UF</Text>
                </View>
              ))}
              {aprobado > 0 && (
                <View style={[s.promoRow, s.promoDescuento]}>
                  <Text style={[s.promoBadge, s.badgeDescuento]}>Dto. aprobado</Text>
                  <Text style={s.promoNombre}>Descuento especial aprobado</Text>
                  <Text style={s.promoAhorro}>− {aprobado.toFixed(2)} UF</Text>
                </View>
              )}
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
            <View style={s.totalBlueTop} />
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
                {ahorroTotal > 0 && (
                  <View style={s.totalLineRow}>
                    <Text style={s.totalLineLabel}>Total descuentos</Text>
                    <Text style={s.totalSaving}>
                      − {fmtUF(ahorroTotal)}
                      {fmtPesos(ahorroTotal, valorUF) ? `  (${fmtPesos(ahorroTotal, valorUF)})` : ''}
                    </Text>
                  </View>
                )}
              </View>
              {/* Derecha: precio final en PESOS grande, UF secundario */}
              <View style={s.totalRight}>
                <Text style={s.totalEtiqueta}>PRECIO FINAL</Text>
                {fmtPesos(totalFinal, valorUF)
                  ? <Text style={s.totalValorPesos}>{fmtPesos(totalFinal, valorUF)}</Text>
                  : <Text style={s.totalValorPesos}>{fmtUF(totalFinal)}</Text>
                }
                {fmtPesos(totalFinal, valorUF) && (
                  <Text style={s.totalValorUF}>{fmtUF(totalFinal)}</Text>
                )}
                {ahorroTotal > 0 && (
                  <Text style={s.totalAhorro}>
                    Ahorro: {fmtPesos(ahorroTotal, valorUF) || fmtUF(ahorroTotal)}
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

        {/* ══ FOOTER CLARO ══ */}
        <View style={s.footer} fixed>
          <Text style={s.footerLeft}>
            <Text style={s.footerBlue}>BodeParking</Text>
            {'  ·  '}Cotización N° {String(id).padStart(4, '0')}
          </Text>
          <Text style={s.footerRight}>bodeparking.cl</Text>
        </View>

      </Page>
    </Document>
  )
}
