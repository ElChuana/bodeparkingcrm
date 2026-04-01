import { Document, Page, Text, View, StyleSheet, Image, Font } from '@react-pdf/renderer'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

// Colores de marca
const AZUL = '#1677ff'
const GRIS_OSCURO = '#3d3d3d'
const GRIS_MEDIO = '#6b7280'
const GRIS_CLARO = '#f3f4f6'
const VERDE = '#16a34a'
const BORDE = '#e5e7eb'

const TIPOS_DESCUENTO = ['DESCUENTO_PORCENTAJE', 'DESCUENTO_UF', 'PAQUETE']

const TIPO_PROMO_LABEL = {
  DESCUENTO_PORCENTAJE: 'Descuento %',
  DESCUENTO_UF: 'Descuento UF',
  PAQUETE: 'Precio paquete',
  BENEFICIO: 'Beneficio',
  ARRIENDO_ASEGURADO: 'Arriendo asegurado',
  GASTOS_NOTARIALES: 'Gastos notariales',
  CUOTAS_SIN_INTERES: 'Cuotas sin interés',
  COMBO: 'Combo',
  OTRO: 'Otro',
}

const s = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: GRIS_OSCURO,
    paddingTop: 40,
    paddingBottom: 50,
    paddingHorizontal: 45,
  },

  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 },
  logo: { width: 150, height: 40, objectFit: 'contain', objectPositionX: 'left' },
  headerRight: { alignItems: 'flex-end' },
  docTitle: { fontSize: 20, fontFamily: 'Helvetica-Bold', color: AZUL, marginBottom: 4 },
  docNum: { fontSize: 10, color: GRIS_MEDIO },
  docFecha: { fontSize: 10, color: GRIS_MEDIO, marginTop: 2 },

  // Separador
  divider: { borderBottomWidth: 1, borderBottomColor: BORDE, marginVertical: 14 },

  // Sección cliente
  seccionDos: { flexDirection: 'row', gap: 20, marginBottom: 20 },
  bloque: { flex: 1, backgroundColor: GRIS_CLARO, borderRadius: 6, padding: 12 },
  bloqueTitle: { fontSize: 9, color: GRIS_MEDIO, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  bloqueValor: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: GRIS_OSCURO, marginBottom: 2 },
  bloqueSubvalor: { fontSize: 10, color: GRIS_MEDIO },

  // Tabla unidades
  tablaHeader: { flexDirection: 'row', backgroundColor: AZUL, borderRadius: 4, paddingVertical: 7, paddingHorizontal: 10, marginBottom: 1 },
  tablaHeaderText: { color: '#ffffff', fontSize: 9, fontFamily: 'Helvetica-Bold' },
  tablaFila: { flexDirection: 'row', paddingVertical: 7, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: BORDE },
  tablaFilaImpar: { backgroundColor: '#f9fafb' },
  celdaProyecto: { flex: 3 },
  celdaUnidad: { flex: 2 },
  celdaTipo: { flex: 1.5 },
  celdaPrecio: { flex: 1.5, alignItems: 'flex-end' },

  // Sección descuentos / beneficios
  seccionTitle: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: GRIS_OSCURO, marginBottom: 8, marginTop: 16 },

  promoFila: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 5, paddingHorizontal: 10, borderRadius: 4, marginBottom: 3 },
  promoFilaDescuento: { backgroundColor: '#f0fdf4' },
  promoFilaBeneficio: { backgroundColor: '#eff6ff' },
  promoBadge: { fontSize: 8, fontFamily: 'Helvetica-Bold', paddingHorizontal: 5, paddingVertical: 2, borderRadius: 3, marginRight: 6 },
  promoBadgeDescuento: { backgroundColor: '#dcfce7', color: '#15803d' },
  promoBadgeBeneficio: { backgroundColor: '#dbeafe', color: '#1d4ed8' },
  promoNombre: { fontSize: 10, flex: 1 },
  promoAhorro: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: VERDE },

  beneficioCheck: { fontSize: 10, color: AZUL, marginRight: 5 },
  beneficioTexto: { fontSize: 10, color: GRIS_OSCURO, flex: 1 },

  // Resumen total
  resumenBox: { backgroundColor: GRIS_CLARO, borderRadius: 6, padding: 14, marginTop: 16 },
  resumenFila: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  resumenLabel: { fontSize: 10, color: GRIS_MEDIO },
  resumenValor: { fontSize: 10, color: GRIS_OSCURO },
  resumenDivider: { borderBottomWidth: 1, borderBottomColor: BORDE, marginVertical: 8 },
  resumenTotalLabel: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: AZUL },
  resumenTotalValor: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: AZUL },

  // Notas
  notasBox: { marginTop: 16, padding: 12, borderLeftWidth: 3, borderLeftColor: AZUL, backgroundColor: '#f0f5ff' },
  notasTitle: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: AZUL, marginBottom: 4 },
  notasTexto: { fontSize: 10, color: GRIS_OSCURO, lineHeight: 1.5 },

  // Footer
  footer: { position: 'absolute', bottom: 24, left: 45, right: 45, flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: BORDE, paddingTop: 8 },
  footerTexto: { fontSize: 8, color: GRIS_MEDIO },
  footerValidez: { fontSize: 8, color: GRIS_MEDIO },
})

// Calcular resumen de precios
function calcularResumen(items, promociones) {
  const base = items.reduce((s, i) => s + i.precioListaUF, 0)
  const descuentos = []
  const beneficios = []
  let descuentoTotal = 0

  promociones.filter(cp => cp.aplicada).forEach(cp => {
    const promo = cp.promocion
    if (TIPOS_DESCUENTO.includes(promo.tipo)) {
      let ahorro = cp.ahorroUF || 0
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

const ESTADO_LABEL = { BORRADOR: 'Borrador', ENVIADA: 'Enviada', ACEPTADA: 'Aceptada', RECHAZADA: 'Rechazada' }

export function CotizacionDocumento({ cotizacion, logoUrl }) {
  const { lead, items, promociones, notas, validezDias, creadoEn, id, estado } = cotizacion
  const resumen = calcularResumen(items, promociones)
  const contacto = lead?.contacto
  const vendedor = lead?.vendedor || lead?.broker

  const fechaEmision = format(new Date(creadoEn), "d 'de' MMMM yyyy", { locale: es })
  const fechaVence = format(
    new Date(new Date(creadoEn).getTime() + validezDias * 86400000),
    "d 'de' MMMM yyyy", { locale: es }
  )

  return (
    <Document title={`Cotización #${id} — BodeParking`} author="BodeParking CRM">
      <Page size="A4" style={s.page}>

        {/* ── Header ── */}
        <View style={s.header}>
          {logoUrl
            ? <Image src={logoUrl} style={s.logo} />
            : <Text style={{ fontSize: 18, fontFamily: 'Helvetica-Bold', color: AZUL }}>BodeParking</Text>
          }
          <View style={s.headerRight}>
            <Text style={s.docTitle}>COTIZACIÓN</Text>
            <Text style={s.docNum}>N° {String(id).padStart(4, '0')} · {ESTADO_LABEL[estado]}</Text>
            <Text style={s.docFecha}>Emisión: {fechaEmision}</Text>
            <Text style={s.docFecha}>Válida hasta: {fechaVence}</Text>
          </View>
        </View>

        <View style={s.divider} />

        {/* ── Cliente y vendedor ── */}
        <View style={s.seccionDos}>
          <View style={s.bloque}>
            <Text style={s.bloqueTitle}>Cliente</Text>
            <Text style={s.bloqueValor}>{contacto?.nombre} {contacto?.apellido}</Text>
            {contacto?.email    && <Text style={s.bloqueSubvalor}>{contacto.email}</Text>}
            {contacto?.telefono && <Text style={s.bloqueSubvalor}>{contacto.telefono}</Text>}
          </View>
          {vendedor && (
            <View style={s.bloque}>
              <Text style={s.bloqueTitle}>Ejecutivo de ventas</Text>
              <Text style={s.bloqueValor}>{vendedor.nombre} {vendedor.apellido}</Text>
            </View>
          )}
        </View>

        {/* ── Tabla de unidades ── */}
        <Text style={s.seccionTitle}>Unidades cotizadas</Text>
        <View style={s.tablaHeader}>
          <Text style={[s.tablaHeaderText, s.celdaProyecto]}>Proyecto</Text>
          <Text style={[s.tablaHeaderText, s.celdaUnidad]}>Unidad</Text>
          <Text style={[s.tablaHeaderText, s.celdaTipo]}>Tipo</Text>
          <Text style={[s.tablaHeaderText, s.celdaPrecio]}>Precio lista</Text>
        </View>
        {items.map((item, i) => (
          <View key={item.id} style={[s.tablaFila, i % 2 !== 0 && s.tablaFilaImpar]}>
            <Text style={[{ fontSize: 10 }, s.celdaProyecto]}>{item.unidad.edificio.nombre}</Text>
            <Text style={[{ fontSize: 10 }, s.celdaUnidad]}>{item.unidad.numero}</Text>
            <Text style={[{ fontSize: 10 }, s.celdaTipo]}>{item.unidad.tipo === 'BODEGA' ? 'Bodega' : 'Estacionamiento'}</Text>
            <Text style={[{ fontSize: 10, fontFamily: 'Helvetica-Bold' }, s.celdaPrecio]}>
              {item.precioListaUF.toFixed(2)} UF
            </Text>
          </View>
        ))}

        {/* ── Descuentos ── */}
        {resumen.descuentos.length > 0 && (
          <>
            <Text style={s.seccionTitle}>Descuentos aplicados</Text>
            {resumen.descuentos.map((d, i) => (
              <View key={i} style={[s.promoFila, s.promoFilaDescuento]}>
                <Text style={[s.promoBadge, s.promoBadgeDescuento]}>{d.label}</Text>
                <Text style={s.promoNombre}>{d.nombre}</Text>
                <Text style={s.promoAhorro}>− {d.ahorro.toFixed(2)} UF</Text>
              </View>
            ))}
          </>
        )}

        {/* ── Beneficios ── */}
        {resumen.beneficios.length > 0 && (
          <>
            <Text style={s.seccionTitle}>Beneficios incluidos</Text>
            {resumen.beneficios.map((b, i) => (
              <View key={i} style={[s.promoFila, s.promoFilaBeneficio]}>
                <Text style={[s.promoBadge, s.promoBadgeBeneficio]}>{b.label}</Text>
                <Text style={s.promoNombre}>{b.nombre}</Text>
              </View>
            ))}
          </>
        )}

        {/* ── Resumen total ── */}
        <View style={s.resumenBox}>
          {items.length > 1 && (
            <>
              <View style={s.resumenFila}>
                <Text style={s.resumenLabel}>Subtotal ({items.length} unidades)</Text>
                <Text style={s.resumenValor}>{resumen.base.toFixed(2)} UF</Text>
              </View>
            </>
          )}
          {resumen.descuentoTotal > 0 && (
            <View style={s.resumenFila}>
              <Text style={s.resumenLabel}>Total descuentos</Text>
              <Text style={[s.resumenValor, { color: VERDE }]}>− {resumen.descuentoTotal.toFixed(2)} UF</Text>
            </View>
          )}
          <View style={s.resumenDivider} />
          <View style={s.resumenFila}>
            <Text style={s.resumenTotalLabel}>PRECIO FINAL</Text>
            <Text style={s.resumenTotalValor}>{resumen.final.toFixed(2)} UF</Text>
          </View>
          {resumen.descuentoTotal > 0 && (
            <View style={{ alignItems: 'flex-end', marginTop: 2 }}>
              <Text style={{ fontSize: 9, color: VERDE }}>
                Ahorro total: {resumen.descuentoTotal.toFixed(2)} UF
              </Text>
            </View>
          )}
        </View>

        {/* ── Notas ── */}
        {notas && (
          <View style={s.notasBox}>
            <Text style={s.notasTitle}>OBSERVACIONES</Text>
            <Text style={s.notasTexto}>{notas}</Text>
          </View>
        )}

        {/* ── Footer ── */}
        <View style={s.footer} fixed>
          <Text style={s.footerTexto}>BodeParking CRM · Cotización N° {String(id).padStart(4, '0')}</Text>
          <Text style={s.footerValidez}>Válida por {validezDias} días · Vence {fechaVence}</Text>
        </View>

      </Page>
    </Document>
  )
}
