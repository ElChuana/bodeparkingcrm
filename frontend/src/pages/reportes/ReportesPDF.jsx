import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const AZUL = '#1677ff'
const GRIS = '#888'
const GRIS_FILA = '#f5f7fa'

const s = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 8.5, padding: 32, color: '#333' },
  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 14, paddingBottom: 8, borderBottomWidth: 2, borderBottomColor: AZUL },
  titulo: { fontSize: 15, fontFamily: 'Helvetica-Bold', color: AZUL },
  subtitulo: { fontSize: 8, color: GRIS, marginTop: 3 },
  marca: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: AZUL },
  fecha: { fontSize: 7.5, color: GRIS, marginTop: 2, textAlign: 'right' },
  // Stats
  stats: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  stat: { flex: 1, backgroundColor: '#EEF5FF', borderRadius: 4, padding: 8, alignItems: 'center' },
  statNum: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: AZUL },
  statLabel: { fontSize: 7, color: GRIS, marginTop: 2 },
  // Tabla
  tabla: {},
  filaHead: { flexDirection: 'row', backgroundColor: AZUL, paddingVertical: 5, paddingHorizontal: 4 },
  fila: { flexDirection: 'row', paddingVertical: 4, paddingHorizontal: 4, borderBottomWidth: 0.5, borderBottomColor: '#e0e0e0' },
  filaPar: { backgroundColor: GRIS_FILA },
  celda: { fontSize: 7.5, flex: 1, paddingRight: 4 },
  celdaHead: { fontSize: 7.5, flex: 1, color: 'white', fontFamily: 'Helvetica-Bold', paddingRight: 4 },
  // Footer
  footer: { position: 'absolute', bottom: 20, left: 32, right: 32, borderTopWidth: 0.5, borderTopColor: '#ddd', paddingTop: 5, flexDirection: 'row', justifyContent: 'space-between' },
  footerText: { fontSize: 7, color: '#aaa' },
})

const Encabezado = ({ titulo, subtitulo }) => (
  <View style={s.header}>
    <View>
      <Text style={s.titulo}>{titulo}</Text>
      {subtitulo ? <Text style={s.subtitulo}>{subtitulo}</Text> : null}
    </View>
    <View>
      <Text style={s.marca}>BodeParking</Text>
      <Text style={s.fecha}>Generado {format(new Date(), "d 'de' MMMM yyyy", { locale: es })}</Text>
    </View>
  </View>
)

const Pie = () => (
  <View style={s.footer} fixed>
    <Text style={s.footerText}>BodeParking CRM — Confidencial</Text>
    <Text style={s.footerText} render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
  </View>
)

const Tabla = ({ columnas, filas }) => (
  <View style={s.tabla}>
    <View style={s.filaHead}>
      {columnas.map((c, i) => (
        <Text key={i} style={[s.celdaHead, c.flex ? { flex: c.flex } : {}]}>{c.label}</Text>
      ))}
    </View>
    {filas.map((fila, ri) => (
      <View key={ri} style={[s.fila, ri % 2 === 1 ? s.filaPar : {}]}>
        {columnas.map((c, ci) => (
          <Text key={ci} style={[s.celda, c.flex ? { flex: c.flex } : {}]}>{fila[c.key] ?? '—'}</Text>
        ))}
      </View>
    ))}
  </View>
)

const fmt = (date) => date ? format(new Date(date), 'd MMM yyyy', { locale: es }) : '—'
const uf = (n) => n != null ? `${Number(n).toFixed(2)} UF` : '—'

// ─── VENTAS ──────────────────────────────────────────────────────────
export function PDFVentas({ data }) {
  const { total = 0, totalUF = 0, porEstado = {}, detalle = [] } = data || {}
  const ESTADO_LABEL = { RESERVA: 'Reserva', PROMESA: 'Promesa', ESCRITURA: 'Escritura', ENTREGADO: 'Entregado', ANULADO: 'Anulado' }

  const columnas = [
    { key: 'comprador', label: 'Comprador', flex: 1.5 },
    { key: 'rut', label: 'RUT' },
    { key: 'edificio', label: 'Edificio', flex: 1.5 },
    { key: 'unidad', label: 'Unidad' },
    { key: 'precio', label: 'Precio UF' },
    { key: 'estado', label: 'Estado' },
    { key: 'vendedor', label: 'Vendedor', flex: 1.5 },
    { key: 'fecha', label: 'Fecha' },
  ]

  const filas = detalle.map(v => ({
    comprador: `${v.comprador?.nombre || ''} ${v.comprador?.apellido || ''}`.trim(),
    rut: v.comprador?.rut || '—',
    edificio: v.unidad?.edificio?.nombre || '—',
    unidad: v.unidad?.numero || '—',
    precio: uf(v.precioUF - (v.descuentoUF || 0)),
    estado: ESTADO_LABEL[v.estado] || v.estado,
    vendedor: v.vendedor ? `${v.vendedor.nombre} ${v.vendedor.apellido}` : '—',
    fecha: fmt(v.creadoEn),
  }))

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={s.page}>
        <Encabezado titulo="Reporte de Ventas" subtitulo={`${total} ventas registradas`} />
        <View style={s.stats}>
          <View style={s.stat}><Text style={s.statNum}>{total}</Text><Text style={s.statLabel}>Total ventas</Text></View>
          <View style={s.stat}><Text style={s.statNum}>{totalUF.toFixed(2)} UF</Text><Text style={s.statLabel}>Monto total</Text></View>
          {Object.entries(porEstado).map(([estado, n]) => (
            <View key={estado} style={s.stat}>
              <Text style={s.statNum}>{n}</Text>
              <Text style={s.statLabel}>{ESTADO_LABEL[estado] || estado}</Text>
            </View>
          ))}
        </View>
        <Tabla columnas={columnas} filas={filas} />
        <Pie />
      </Page>
    </Document>
  )
}

// ─── LEADS ───────────────────────────────────────────────────────────
export function PDFLeads({ data }) {
  const { total = 0, porEtapa = {}, detalle = [] } = data || {}
  const ETAPA_LABEL = {
    NUEVO: 'Nuevo', CONTACTADO: 'Contactado', VISITA_AGENDADA: 'Visita agendada',
    VISITA_REALIZADA: 'Visita realizada', NEGOCIACION: 'Negociación',
    RESERVADO: 'Reservado', GANADO: 'Ganado', PERDIDO: 'Perdido',
  }
  const ORIGEN_LABEL = {
    INSTAGRAM: 'Instagram', GOOGLE: 'Google', REFERIDO: 'Referido',
    BROKER: 'Broker', VISITA_DIRECTA: 'Visita directa', WEB: 'Web', OTRO: 'Otro',
  }

  const columnas = [
    { key: 'nombre', label: 'Cliente', flex: 1.5 },
    { key: 'email', label: 'Email', flex: 1.5 },
    { key: 'telefono', label: 'Teléfono' },
    { key: 'etapa', label: 'Etapa' },
    { key: 'origen', label: 'Origen' },
    { key: 'vendedor', label: 'Vendedor', flex: 1.5 },
    { key: 'fecha', label: 'Fecha' },
  ]

  const filas = detalle.map(l => ({
    nombre: `${l.contacto?.nombre || ''} ${l.contacto?.apellido || ''}`.trim(),
    email: l.contacto?.email || '—',
    telefono: l.contacto?.telefono || '—',
    etapa: ETAPA_LABEL[l.etapa] || l.etapa,
    origen: ORIGEN_LABEL[l.contacto?.origen] || l.contacto?.origen || '—',
    vendedor: l.vendedor ? `${l.vendedor.nombre} ${l.vendedor.apellido}` : '—',
    fecha: fmt(l.creadoEn),
  }))

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={s.page}>
        <Encabezado titulo="Reporte de Leads" subtitulo={`${total} leads en total`} />
        <View style={s.stats}>
          <View style={s.stat}><Text style={s.statNum}>{total}</Text><Text style={s.statLabel}>Total leads</Text></View>
          {Object.entries(porEtapa).slice(0, 5).map(([etapa, n]) => (
            <View key={etapa} style={s.stat}>
              <Text style={s.statNum}>{n}</Text>
              <Text style={s.statLabel}>{ETAPA_LABEL[etapa] || etapa}</Text>
            </View>
          ))}
        </View>
        <Tabla columnas={columnas} filas={filas} />
        <Pie />
      </Page>
    </Document>
  )
}

// ─── INVENTARIO ──────────────────────────────────────────────────────
export function PDFInventario({ data }) {
  const { total = 0, porEstado = {}, porTipo = {}, detalle = [] } = data || {}

  const columnas = [
    { key: 'edificio', label: 'Edificio', flex: 1.5 },
    { key: 'numero', label: 'Número' },
    { key: 'tipo', label: 'Tipo' },
    { key: 'estado', label: 'Estado' },
    { key: 'precio', label: 'Precio UF' },
    { key: 'superficie', label: 'Sup. m²' },
    { key: 'region', label: 'Región', flex: 1.5 },
  ]

  const filas = detalle.map(u => ({
    edificio: u.edificio?.nombre || '—',
    numero: u.numero,
    tipo: u.tipo?.toLowerCase() || '—',
    estado: u.estado?.toLowerCase() || '—',
    precio: uf(u.precioUF),
    superficie: u.superficie ? `${u.superficie} m²` : '—',
    region: u.edificio?.region || '—',
  }))

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={s.page}>
        <Encabezado titulo="Reporte de Inventario" subtitulo={`${total} unidades en total`} />
        <View style={s.stats}>
          <View style={s.stat}><Text style={s.statNum}>{total}</Text><Text style={s.statLabel}>Total unidades</Text></View>
          {Object.entries(porEstado).map(([estado, n]) => (
            <View key={estado} style={s.stat}>
              <Text style={s.statNum}>{n}</Text>
              <Text style={s.statLabel}>{estado.toLowerCase()}</Text>
            </View>
          ))}
          {Object.entries(porTipo).map(([tipo, n]) => (
            <View key={tipo} style={s.stat}>
              <Text style={s.statNum}>{n}</Text>
              <Text style={s.statLabel}>{tipo.toLowerCase()}</Text>
            </View>
          ))}
        </View>
        <Tabla columnas={columnas} filas={filas} />
        <Pie />
      </Page>
    </Document>
  )
}

// ─── COMISIONES ──────────────────────────────────────────────────────
export function PDFComisiones({ data }) {
  const { total = 0, totalUF = 0, pendienteUF = 0, pagadoUF = 0, detalle = [] } = data || {}
  const ROL_LABEL = { GERENTE: 'Gerente', JEFE_VENTAS: 'Jefe de Ventas', VENDEDOR: 'Vendedor', BROKER_EXTERNO: 'Broker', ABOGADO: 'Abogado' }

  const columnas = [
    { key: 'persona', label: 'Persona', flex: 1.5 },
    { key: 'rol', label: 'Rol' },
    { key: 'concepto', label: 'Concepto' },
    { key: 'unidad', label: 'Unidad', flex: 1.5 },
    { key: 'total', label: 'Total UF' },
    { key: 'primera', label: '1ª cuota' },
    { key: 'segunda', label: '2ª cuota' },
    { key: 'estadoP', label: 'Estado 1ª' },
    { key: 'estadoS', label: 'Estado 2ª' },
    { key: 'fecha', label: 'Fecha' },
  ]

  const filas = detalle.map(c => ({
    persona: c.usuario ? `${c.usuario.nombre} ${c.usuario.apellido}` : '—',
    rol: ROL_LABEL[c.usuario?.rol] || c.usuario?.rol || '—',
    concepto: c.concepto || '—',
    unidad: c.venta?.unidades?.[0] ? `${c.venta.unidades[0].edificio?.nombre} — ${c.venta.unidades[0].numero}` : '—',
    total: uf(c.montoCalculadoUF),
    primera: uf(c.montoPrimera),
    segunda: uf(c.montoSegunda),
    estadoP: c.estadoPrimera === 'PAGADO' ? 'Pagado' : 'Pendiente',
    estadoS: c.estadoSegunda === 'PAGADO' ? 'Pagado' : 'Pendiente',
    fecha: fmt(c.creadoEn),
  }))

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={s.page}>
        <Encabezado titulo="Reporte de Comisiones" subtitulo={`${total} comisiones`} />
        <View style={s.stats}>
          <View style={s.stat}><Text style={s.statNum}>{totalUF.toFixed(2)} UF</Text><Text style={s.statLabel}>Total comisiones</Text></View>
          <View style={s.stat}><Text style={s.statNum}>{pagadoUF.toFixed(2)} UF</Text><Text style={s.statLabel}>Pagado</Text></View>
          <View style={s.stat}><Text style={s.statNum}>{pendienteUF.toFixed(2)} UF</Text><Text style={s.statLabel}>Pendiente</Text></View>
        </View>
        <Tabla columnas={columnas} filas={filas} />
        <Pie />
      </Page>
    </Document>
  )
}

// ─── PAGOS ATRASADOS ─────────────────────────────────────────────────
export function PDFPagosAtrasados({ data }) {
  const { total = 0, totalUF = 0, detalle = [] } = data || {}

  const columnas = [
    { key: 'comprador', label: 'Comprador', flex: 1.5 },
    { key: 'telefono', label: 'Teléfono' },
    { key: 'edificio', label: 'Edificio', flex: 1.5 },
    { key: 'unidad', label: 'Unidad' },
    { key: 'cuota', label: 'N° cuota' },
    { key: 'monto', label: 'Monto UF' },
    { key: 'vencimiento', label: 'Vencimiento' },
    { key: 'dias', label: 'Días atraso' },
    { key: 'vendedor', label: 'Vendedor', flex: 1.5 },
  ]

  const hoy = new Date()
  const filas = detalle.map(c => {
    const venta = c.planPago?.venta
    const diasAtraso = Math.floor((hoy - new Date(c.fechaVencimiento)) / (1000 * 60 * 60 * 24))
    return {
      comprador: venta?.comprador ? `${venta.comprador.nombre} ${venta.comprador.apellido}` : '—',
      telefono: venta?.comprador?.telefono || '—',
      edificio: venta?.unidad?.edificio?.nombre || '—',
      unidad: venta?.unidad?.numero || '—',
      cuota: c.numeroCuota ?? '—',
      monto: uf(c.montoUF),
      vencimiento: fmt(c.fechaVencimiento),
      dias: `${diasAtraso} días`,
      vendedor: venta?.vendedor ? `${venta.vendedor.nombre} ${venta.vendedor.apellido}` : '—',
    }
  })

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={s.page}>
        <Encabezado titulo="Pagos Atrasados" subtitulo={`${total} cuotas vencidas`} />
        <View style={s.stats}>
          <View style={s.stat}><Text style={s.statNum}>{total}</Text><Text style={s.statLabel}>Cuotas vencidas</Text></View>
          <View style={s.stat}><Text style={s.statNum}>{totalUF.toFixed(2)} UF</Text><Text style={s.statLabel}>Monto total atrasado</Text></View>
        </View>
        <Tabla columnas={columnas} filas={filas} />
        <Pie />
      </Page>
    </Document>
  )
}
