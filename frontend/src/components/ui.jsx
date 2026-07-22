// Shared constants used across the app (antd Tag color values)

export const ETAPA_LABEL = {
  NUEVO: 'Nuevo',
  REACTIVADO: 'Reactivado',
  NO_CONTESTA: 'No contesta',
  SEGUIMIENTO: 'Seguimiento',
  COTIZACION_ENVIADA: 'Cotización enviada',
  INTERESADO: 'Interesado',
  VISITA_AGENDADA: 'Visita agendada',
  VISITA_REALIZADA: 'Visita realizada',
  SEGUIMIENTO_POST_VISITA: 'Seguimiento post-visita',
  NEGOCIACION: 'Negociación',
  RESERVA: 'Reserva',
  PROMESA: 'Promesa',
  ESCRITURA: 'Escritura',
  ENTREGA: 'Entrega',
  POSTVENTA: 'Postventa',
  PERDIDO: 'Perdido',
}

export const ETAPA_COLOR = {
  NUEVO: 'default',
  REACTIVADO: 'magenta',
  NO_CONTESTA: 'orange',
  SEGUIMIENTO: 'blue',
  COTIZACION_ENVIADA: 'cyan',
  INTERESADO: 'gold',
  VISITA_AGENDADA: 'geekblue',
  VISITA_REALIZADA: 'purple',
  SEGUIMIENTO_POST_VISITA: 'blue',
  NEGOCIACION: 'volcano',
  RESERVA: 'orange',
  PROMESA: 'lime',
  ESCRITURA: 'green',
  ENTREGA: 'success',
  POSTVENTA: 'cyan',
  PERDIDO: 'red',
}

export const MOTIVO_PERDIDA_LABEL = {
  NO_CONTESTA:        'No contesta',
  PRECIO_ALTO:        'Precio alto',
  ELIGIO_COMPETENCIA: 'Eligió competencia',
  NO_CALIFICA_FINANC: 'No califica financ.',
  NO_GUSTO_PRODUCTO:  'No gustó producto',
  PERDIO_INTERES:     'Perdió interés',
  OTRO:               'Otro',
}

export const MOTIVO_PERDIDA_OPTIONS = Object.entries(MOTIVO_PERDIDA_LABEL).map(([value, label]) => ({ value, label }))

export const ESTADO_VENTA_COLOR = {
  RESERVA: 'orange',
  PROMESA: 'blue',
  ESCRITURA: 'purple',
  ENTREGADO: 'green',
  ANULADO: 'red',
}

// Semáforo del resumen legal (IA) recibido desde el proceso externo de correos
export const SEMAFORO_LEGAL = {
  AL_DIA:   { label: 'Al día',    color: 'green',  dot: '#52c41a' },
  ATENCION: { label: 'Atención',  color: 'gold',   dot: '#faad14' },
  ATRASADO: { label: 'Atrasado',  color: 'red',    dot: '#ff4d4f' },
}

export const ROL_LABEL = {
  GERENTE: 'Gerente',
  JEFE_VENTAS: 'Jefe de Ventas',
  VENDEDOR: 'Vendedor',
  BROKER_EXTERNO: 'Broker Externo',
  ABOGADO: 'Abogado',
}
