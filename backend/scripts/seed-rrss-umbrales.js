// Umbrales iniciales de los semáforos del módulo RRSS + texto didáctico. Idempotente (upsert por clave).
// Referencia de la sesión "facebook" (25-nov-2026). Los costos se evalúan RELATIVO a la mediana de la cuenta
// en los últimos 90 días (unidad "x mediana"); el resto en valor absoluto. Editables desde la pantalla RRSS.
require('dotenv').config()
const prisma = require('../src/lib/prisma')

const U = [
  // clave, nombre, unidad, menorEsMejor, verdeHasta, amarilloHasta, queEs, porQueImporta, cuantoEstaBien
  ['CPL', 'Costo por lead', 'x mediana', true, 1, 1.5,
    'Cuánto pagamos en pauta por cada persona que dejó sus datos en el formulario de Meta.',
    'Es el primer precio del embudo. Si sube, o el anuncio cansó, o la segmentación apunta mal, o el formulario pide demasiado.',
    'Compararlo entre campañas, no en absoluto. Verde si está en la mediana de la cuenta o bajo ella; rojo sobre 1,5 veces la mediana.'],
  ['COSTO_COTIZACION', 'Costo por cotización', 'x mediana', true, 1, 1.5,
    'Gasto de la campaña dividido por los leads que llegaron a recibir una cotización.',
    'Es el KPI que más importa para decidir presupuesto: un lead barato que nunca cotiza sale caro. Temuco Calidad tuvo CPL alto pero 52% cotizó; Plus NOV CPL bajo y 0,9% cotizó.',
    'Relativo a la mediana de la cuenta: verde en o bajo la mediana, rojo sobre 1,5 veces.'],
  ['COSTO_VISITA', 'Costo por visita presencial', 'x mediana', true, 1, 1.5,
    'Gasto dividido por los leads que fueron a ver la unidad.',
    'La visita presencial es el paso que más predice la venta.',
    'Relativo a la mediana de la cuenta.'],
  ['CAC', 'Costo por venta (CAC)', 'x mediana', true, 1, 1.5,
    'Gasto de la campaña dividido por las ventas que salieron de ella.',
    'Es lo que de verdad cuesta conseguir un cliente. Se compara con el margen por unidad.',
    'Relativo a la mediana de la cuenta; y siempre menor al margen de la unidad vendida.'],
  ['CPM', 'CPM (costo por mil impresiones)', 'x mediana', true, 1.2, 1.6,
    'Cuánto cuesta mostrar el anuncio mil veces.',
    'Si sube mucho, Meta está encontrando cara a la audiencia que pedimos (muy chica o muy competida).',
    'Hoy la cuenta anda en torno a $3.000. Verde hasta 1,2 veces la mediana, rojo sobre 1,6.'],
  ['CTR_ENLACE', 'CTR de enlace', '%', false, 1.0, 0.6,
    'De cada 100 personas que vieron el anuncio, cuántas hicieron clic en el enlace.',
    'Mide si el anuncio llama la atención. Bajo = creatividad o texto flojo, o audiencia equivocada.',
    'Referencia inmobiliaria: ≥ 1,0% bien; 0,6–1,0% regular; < 0,6% mal.'],
  ['FRECUENCIA_7D', 'Frecuencia (7 días)', 'veces', true, 2, 3.5,
    'Cuántas veces promedio vio el anuncio la misma persona en la semana.',
    'Sobre 3-4 veces la gente se cansa (fatiga): baja el CTR y sube el costo. Hay que rotar creatividades o ampliar audiencia.',
    '≤ 2 bien; 2–3,5 ojo; > 3,5 fatiga.'],
  ['FRECUENCIA_30D', 'Frecuencia (30 días)', 'veces', true, 3, 5,
    'Cuántas veces promedio vio el anuncio la misma persona en el mes.',
    'Igual que la semanal, mirada a un mes completo.',
    '≤ 3 bien; 3–5 ojo; > 5 fatiga.'],
  ['CONV_FORMULARIO', 'Conversión del formulario', '%', false, 10, 5,
    'De los que hicieron clic en el enlace, cuántos terminaron dejando sus datos.',
    'Si es baja, el formulario pide mucho o la promesa del anuncio no coincide con lo que ven.',
    '≥ 10% bien; 5–10% regular; < 5% mal.'],
  ['TASA_LEAD_COTIZACION', 'Lead → cotización', '%', false, 10, 3,
    'De los leads que llegaron al CRM, qué porcentaje recibió una cotización.',
    'Dice si los leads son de verdad (calidad) y si el equipo los está trabajando.',
    '≥ 10% bien; 3–10% regular; < 3% mal. Temuco Calidad: 52%. Plus NOV: 0,9%.'],
  ['TASA_COTIZACION_VISITA', 'Cotización → visita', '%', false, 30, 15,
    'De los que cotizaron, cuántos fueron a ver la unidad.',
    'La cotización sola no vende; la visita sí. Baja = precio fuera de rango o seguimiento débil.',
    '≥ 30% bien; 15–30% regular; < 15% mal.'],
  ['TIEMPO_PRIMER_CONTACTO', 'Tiempo al primer contacto (mediana)', 'h', true, 1, 24,
    'Cuánto pasa entre que el lead entra y la primera llamada, WhatsApp o nota del vendedor.',
    'Llamar en los primeros 5 minutos multiplica varias veces la probabilidad de contactar; después de 24 h el lead ya se enfrió o lo llamó la competencia.',
    '< 1 h bien; 1–24 h regular; > 24 h mal.'],
  ['LEADS_SIN_GESTION_48H', 'Leads sin gestión a 48 h', '%', true, 5, 15,
    'Porcentaje de leads con más de 48 h en el CRM y ninguna actividad registrada.',
    'Es plata de pauta tirada: el lead ya costó y nadie lo tocó.',
    '0–5% bien; 5–15% regular; > 15% mal.'],
  ['LEADS_PERDIDOS_ENTREGA', 'Leads perdidos en la entrega', '%', true, 0, 1,
    'Leads que Meta registró pero que nunca llegaron al CRM (el conector de la agencia no los entregó).',
    'Son leads pagados que nadie va a llamar. Si pasa, hay que reclamarle a la agencia.',
    '0 bien; hasta 1% tolerable; > 1% mal.'],
  ['PCT_AUDIENCE_NETWORK', 'Gasto en Audience Network', '%', true, 5, 15,
    'Parte del gasto que se fue a la red de apps y sitios externos de Meta (no Facebook ni Instagram).',
    'Suele traer clics y leads de baja calidad (clics por error en juegos y apps).',
    '< 5% bien; 5–15% ojo; > 15% pedir a la agencia que lo excluya.'],
  ['PCT_LEADS_65', 'Leads de 65 años o más', '%', true, null, null,
    'Porcentaje de las impresiones/leads que cayeron en el grupo 65+.',
    'Solo informativo: no es malo en sí, pero si es la mayoría (Plus NOV: 87%) conviene preguntarse si es el comprador que buscamos.',
    'Sin semáforo. Mirarlo junto con la tasa de cotización de esa campaña.'],
  ['WEB_CONVERSION', 'Conversión del sitio web', '%', false, 2, 1,
    'De cada 100 sesiones en bodeparking.cl, cuántas terminaron en un formulario enviado (generate_lead).',
    'Mide si el sitio convierte el tráfico que le mandamos.',
    '≥ 2% bien; 1–2% regular; < 1% mal.'],
  ['WEB_ABANDONO_FORM', 'Abandono del formulario web', '%', true, 40, 70,
    'De los que empezaron a llenar el formulario, cuántos no lo terminaron.',
    'Formularios largos o con errores pierden gente que ya estaba decidida a escribirnos.',
    '< 40% bien; 40–70% regular; > 70% mal.'],
  ['CLARITY_RAGE', 'Sesiones con rage clicks', '%', true, 2, 5,
    'Sesiones donde alguien hizo clic repetido y furioso en el mismo lugar (algo no respondió).',
    'Señal directa de frustración: botones que no funcionan, páginas lentas.',
    '< 2% bien; 2–5% revisar; > 5% hay algo roto.'],
  ['ROAS', 'Retorno de la pauta (ROAS)', 'x', false, 10, 3,
    'UF vendidas (al valor del día) dividido por lo gastado en pauta.',
    'Cuántos pesos vuelven por cada peso de publicidad. Se lee junto con el margen, no solo con la venta.',
    '≥ 10× bien; 3–10× regular; < 3× mal. Juan debería ajustarlo según el margen real por unidad.'],
]

async function main() {
  let i = 0
  for (const [clave, nombre, unidad, menorEsMejor, verdeHasta, amarilloHasta, queEs, porQueImporta, cuantoEstaBien] of U) {
    const data = { nombre, unidad, menorEsMejor, verdeHasta, amarilloHasta, queEs, porQueImporta, cuantoEstaBien, orden: i++ }
    await prisma.rrssUmbral.upsert({ where: { clave }, create: { clave, ...data }, update: data })
  }
  console.log(`Umbrales RRSS cargados: ${U.length}`)
}
main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1) })
