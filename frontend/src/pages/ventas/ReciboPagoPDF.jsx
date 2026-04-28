import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const BLUE    = '#1B5EA8'
const BLUE_LT = '#EBF3FB'
const WHITE   = '#FFFFFF'
const SMOKE   = '#F5F7FA'
const BORDER  = '#DDE4EF'
const TEXT    = '#1A2533'
const MUTED   = '#637083'
const GREEN   = '#0D7A3E'
const GREEN_BG= '#EDFAF3'
const GREEN_BD= '#A3D9B8'

const TIPO_LABEL = {
  RESERVA:   'Reserva',
  PIE:       'Pie',
  CUOTA:     'Cuota',
  ESCRITURA: 'Escritura',
}

const METODO_LABEL = {
  TRANSFERENCIA: 'Transferencia bancaria',
  VALE_VISTA:    'Vale vista',
  TARJETA:       'Tarjeta de crédito (Webpay)',
  CHEQUE:        'Cheque',
  EFECTIVO:      'Efectivo',
}

const fmtFecha = (d) => d ? format(new Date(d), "d 'de' MMMM yyyy", { locale: es }) : '—'
const fmtUF    = (v) => v != null ? `${Number(v).toLocaleString('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 4 })} UF` : null
const fmtCLP   = (v) => v != null ? `$${Math.round(v).toLocaleString('es-CL')}` : null

const s = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: TEXT,
    backgroundColor: WHITE,
    paddingBottom: 50,
  },
  topBar:  { height: 5, backgroundColor: BLUE },
  header:  {
    paddingTop: 22, paddingBottom: 18, paddingHorizontal: 44,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  logo:    { width: 130, height: 36, objectFit: 'contain' },
  logoTxt: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: BLUE },
  headerR: { alignItems: 'flex-end' },
  label:   { fontSize: 8, fontFamily: 'Helvetica-Bold', color: BLUE, letterSpacing: 2.5, marginBottom: 3 },
  num:     { fontSize: 22, fontFamily: 'Helvetica-Bold', color: TEXT, lineHeight: 1, marginBottom: 6 },
  meta:    { fontSize: 8.5, color: MUTED, marginBottom: 2 },
  paid:    {
    marginTop: 5, paddingHorizontal: 10, paddingVertical: 4,
    backgroundColor: GREEN_BG, borderRadius: 2,
    borderWidth: 1, borderColor: GREEN_BD,
  },
  paidTxt: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: GREEN, letterSpacing: 1.2 },

  body: { paddingHorizontal: 44, paddingTop: 22 },

  infoRow:  { flexDirection: 'row', gap: 12, marginBottom: 20 },
  infoCard: {
    flex: 1, backgroundColor: SMOKE, borderRadius: 4,
    borderTopWidth: 2, borderTopColor: BLUE,
    paddingHorizontal: 12, paddingVertical: 10,
  },
  infoEtiq: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: BLUE, letterSpacing: 1.8, marginBottom: 5 },
  infoName: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: TEXT, marginBottom: 3 },
  infoLine: { fontSize: 9, color: MUTED, marginBottom: 2 },

  sectionTitle: {
    fontSize: 8, fontFamily: 'Helvetica-Bold', color: BLUE,
    letterSpacing: 2, marginBottom: 10, paddingBottom: 5,
    borderBottomWidth: 1, borderBottomColor: BORDER,
  },

  // Cuadro destacado del monto
  montoBox: {
    backgroundColor: GREEN_BG, borderRadius: 6,
    borderWidth: 1, borderColor: GREEN_BD,
    paddingHorizontal: 20, paddingVertical: 16,
    alignItems: 'center', marginBottom: 20,
  },
  montoLabel:  { fontSize: 9, color: GREEN, fontFamily: 'Helvetica-Bold', letterSpacing: 1.5, marginBottom: 6 },
  montoUF:     { fontSize: 28, fontFamily: 'Helvetica-Bold', color: GREEN, lineHeight: 1, marginBottom: 4 },
  montoCLP:    { fontSize: 13, color: GREEN, marginBottom: 0 },

  // Grilla de detalles
  grid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 0, marginBottom: 20 },
  gridItem: {
    width: '50%', paddingVertical: 9, paddingHorizontal: 12,
    borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  gridKey:  { fontSize: 7.5, color: MUTED, marginBottom: 3, fontFamily: 'Helvetica-Bold', letterSpacing: 0.8 },
  gridVal:  { fontSize: 10, color: TEXT, fontFamily: 'Helvetica-Bold' },

  // Unidades
  unidadRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 7, paddingHorizontal: 12,
    borderBottomWidth: 1, borderBottomColor: BORDER,
    backgroundColor: SMOKE,
  },
  unidadDot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: BLUE, marginRight: 10,
  },
  unidadTxt: { fontSize: 10, color: TEXT },

  notas: {
    backgroundColor: BLUE_LT, borderRadius: 4, borderLeftWidth: 3,
    borderLeftColor: BLUE, padding: 12, marginBottom: 20,
  },
  notasTit: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: BLUE, letterSpacing: 1.2, marginBottom: 5 },
  notasTxt: { fontSize: 9.5, color: TEXT, lineHeight: 1.5 },

  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 44, paddingVertical: 14,
    borderTopWidth: 1, borderTopColor: BORDER,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: WHITE,
  },
  footerTxt: { fontSize: 8, color: MUTED },
  footerValid: { fontSize: 8, color: MUTED },
})

export function ReciboPagoDocumento({ cuota, venta, logoUrl }) {
  const comprador = venta?.comprador
  const unidades  = venta?.unidades || []
  const numeroCuota = cuota.numeroCuota
  const tipoCuota   = TIPO_LABEL[cuota.tipo] || cuota.tipo

  return (
    <Document title={`Recibo-Pago-${cuota.id}`} author="BodeParking">
      <Page size="A4" style={s.page}>
        {/* Franja azul top */}
        <View style={s.topBar} />

        {/* Header */}
        <View style={s.header}>
          <View>
            {logoUrl
              ? <Image src={logoUrl} style={s.logo} />
              : <Text style={s.logoTxt}>BodeParking</Text>}
          </View>
          <View style={s.headerR}>
            <Text style={s.label}>RECIBO DE PAGO</Text>
            <Text style={s.num}>N° {String(cuota.id).padStart(5, '0')}</Text>
            <Text style={s.meta}>Emisión: {fmtFecha(cuota.fechaPagoReal || new Date())}</Text>
            <Text style={s.meta}>Venta #{venta?.id}</Text>
            <View style={s.paid}>
              <Text style={s.paidTxt}>✓ PAGADO</Text>
            </View>
          </View>
        </View>

        {/* Cuerpo */}
        <View style={s.body}>

          {/* Cards comprador + unidad */}
          <View style={s.infoRow}>
            <View style={s.infoCard}>
              <Text style={s.infoEtiq}>COMPRADOR</Text>
              <Text style={s.infoName}>{comprador?.nombre} {comprador?.apellido}</Text>
              {comprador?.rut    && <Text style={s.infoLine}>RUT: {comprador.rut}</Text>}
              {comprador?.empresa && <Text style={s.infoLine}>{comprador.empresa}</Text>}
            </View>
            <View style={s.infoCard}>
              <Text style={s.infoEtiq}>UNIDADES</Text>
              {unidades.map((u, i) => (
                <Text key={i} style={[s.infoLine, { marginBottom: 3 }]}>
                  {u.tipo === 'BODEGA' ? 'Bodega' : 'Estacionamiento'} {u.numero}
                  {u.edificio?.nombre ? ` — ${u.edificio.nombre}` : ''}
                </Text>
              ))}
            </View>
          </View>

          {/* Monto destacado */}
          <View style={s.montoBox}>
            <Text style={s.montoLabel}>MONTO RECIBIDO</Text>
            {cuota.montoUF  != null && <Text style={s.montoUF}>{fmtUF(cuota.montoUF)}</Text>}
            {cuota.montoCLP != null && <Text style={s.montoCLP}>{fmtCLP(cuota.montoCLP)}</Text>}
            {!cuota.montoUF && !cuota.montoCLP && <Text style={s.montoUF}>—</Text>}
          </View>

          {/* Grilla detalle */}
          <Text style={s.sectionTitle}>DETALLE DEL PAGO</Text>
          <View style={s.grid}>
            <View style={s.gridItem}>
              <Text style={s.gridKey}>TIPO DE CUOTA</Text>
              <Text style={s.gridVal}>{tipoCuota} #{numeroCuota}</Text>
            </View>
            <View style={s.gridItem}>
              <Text style={s.gridKey}>FECHA DE PAGO</Text>
              <Text style={s.gridVal}>{fmtFecha(cuota.fechaPagoReal)}</Text>
            </View>
            <View style={s.gridItem}>
              <Text style={s.gridKey}>FECHA DE VENCIMIENTO</Text>
              <Text style={s.gridVal}>{fmtFecha(cuota.fechaVencimiento)}</Text>
            </View>
            <View style={s.gridItem}>
              <Text style={s.gridKey}>MÉTODO DE PAGO</Text>
              <Text style={s.gridVal}>{METODO_LABEL[cuota.metodoPago] || cuota.metodoPago || '—'}</Text>
            </View>
            {cuota.numeroComprobante && (
              <View style={s.gridItem}>
                <Text style={s.gridKey}>N° COMPROBANTE</Text>
                <Text style={s.gridVal}>{cuota.numeroComprobante}</Text>
              </View>
            )}
            {venta?.precioFinalUF && (
              <View style={s.gridItem}>
                <Text style={s.gridKey}>PRECIO TOTAL VENTA</Text>
                <Text style={s.gridVal}>{fmtUF(venta.precioFinalUF)}</Text>
              </View>
            )}
          </View>

          {/* Notas */}
          {cuota.notas && (
            <View style={s.notas}>
              <Text style={s.notasTit}>NOTAS</Text>
              <Text style={s.notasTxt}>{cuota.notas}</Text>
            </View>
          )}

        </View>

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text style={s.footerTxt}>BodeParking · bodeparking.cl</Text>
          <Text style={s.footerValid}>Recibo N° {String(cuota.id).padStart(5, '0')} — Generado el {fmtFecha(new Date())}</Text>
        </View>
      </Page>
    </Document>
  )
}
