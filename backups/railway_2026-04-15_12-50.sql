--
-- PostgreSQL database dump
--

\restrict wdioKcttrnMOAKWhIHy2Mae0FEeEf8x6iiRHBk4tQFBbs4UgDvb6fqlsG7ARdrP

-- Dumped from database version 16.13
-- Dumped by pg_dump version 16.10 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: unaccent; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA public;


--
-- Name: EXTENSION unaccent; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION unaccent IS 'text search dictionary that removes accents';


--
-- Name: AccesoUnidad; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."AccesoUnidad" AS ENUM (
    'NIVEL',
    'SUBTERRANEO'
);


--
-- Name: CategoriaPromocion; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."CategoriaPromocion" AS ENUM (
    'PROMOCION',
    'PACK'
);


--
-- Name: EstadoArriendo; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."EstadoArriendo" AS ENUM (
    'ACTIVO',
    'TERMINADO'
);


--
-- Name: EstadoCotizacion; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."EstadoCotizacion" AS ENUM (
    'BORRADOR',
    'ENVIADA',
    'ACEPTADA',
    'RECHAZADA'
);


--
-- Name: EstadoLegal; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."EstadoLegal" AS ENUM (
    'FIRMA_CLIENTE_PROMESA',
    'FIRMA_INMOBILIARIA_PROMESA',
    'ESCRITURA_LISTA',
    'FIRMADA_NOTARIA',
    'INSCRIPCION_CBR',
    'ENTREGADO'
);


--
-- Name: EstadoLlave; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."EstadoLlave" AS ENUM (
    'EN_OFICINA',
    'PRESTADA',
    'PERDIDA'
);


--
-- Name: EstadoPago; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."EstadoPago" AS ENUM (
    'PENDIENTE',
    'PAGADO',
    'ATRASADO',
    'CONDONADO'
);


--
-- Name: EstadoPostventa; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."EstadoPostventa" AS ENUM (
    'ABIERTO',
    'EN_PROCESO',
    'CERRADO'
);


--
-- Name: EstadoSolicitudDescuento; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."EstadoSolicitudDescuento" AS ENUM (
    'PENDIENTE',
    'APROBADA',
    'RECHAZADA'
);


--
-- Name: EstadoUnidad; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."EstadoUnidad" AS ENUM (
    'DISPONIBLE',
    'RESERVADO',
    'VENDIDO',
    'ARRENDADO'
);


--
-- Name: EstadoVenta; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."EstadoVenta" AS ENUM (
    'RESERVA',
    'PROMESA',
    'ESCRITURA',
    'ENTREGADO',
    'ANULADO'
);


--
-- Name: EtapaLead; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."EtapaLead" AS ENUM (
    'NUEVO',
    'NO_CONTESTA',
    'SEGUIMIENTO',
    'COTIZACION_ENVIADA',
    'VISITA_AGENDADA',
    'VISITA_REALIZADA',
    'SEGUIMIENTO_POST_VISITA',
    'NEGOCIACION',
    'RESERVA',
    'PROMESA',
    'ESCRITURA',
    'ENTREGA',
    'POSTVENTA',
    'PERDIDO'
);


--
-- Name: MetodoPago; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."MetodoPago" AS ENUM (
    'TRANSFERENCIA',
    'TARJETA',
    'CHEQUE',
    'EFECTIVO'
);


--
-- Name: OrigenLead; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."OrigenLead" AS ENUM (
    'INSTAGRAM',
    'GOOGLE',
    'REFERIDO',
    'BROKER',
    'VISITA_DIRECTA',
    'WEB',
    'OTRO',
    'META',
    'ORIGEN'
);


--
-- Name: Rol; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."Rol" AS ENUM (
    'GERENTE',
    'JEFE_VENTAS',
    'VENDEDOR',
    'BROKER_EXTERNO',
    'ABOGADO'
);


--
-- Name: SubtipoEstacionamiento; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."SubtipoEstacionamiento" AS ENUM (
    'NORMAL',
    'TANDEM'
);


--
-- Name: TipoAlerta; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."TipoAlerta" AS ENUM (
    'LLAVE_NO_DEVUELTA',
    'CUOTA_VENCIDA',
    'LEAD_SIN_ACTIVIDAD',
    'FECHA_LEGAL_PROXIMA',
    'ARRIENDO_POR_VENCER',
    'DESCUENTO_PENDIENTE',
    'LEAD_ESTANCADO'
);


--
-- Name: TipoCuota; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."TipoCuota" AS ENUM (
    'RESERVA',
    'PIE',
    'CUOTA',
    'ESCRITURA'
);


--
-- Name: TipoInteraccion; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."TipoInteraccion" AS ENUM (
    'LLAMADA',
    'EMAIL',
    'WHATSAPP',
    'REUNION',
    'NOTA'
);


--
-- Name: TipoPersona; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."TipoPersona" AS ENUM (
    'NATURAL',
    'EMPRESA',
    'SOCIEDAD'
);


--
-- Name: TipoPostventa; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."TipoPostventa" AS ENUM (
    'RECLAMO',
    'CONSULTA',
    'TRAMITE',
    'GARANTIA'
);


--
-- Name: TipoPromocion; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."TipoPromocion" AS ENUM (
    'DESCUENTO_PORCENTAJE',
    'DESCUENTO_UF',
    'ARRIENDO_ASEGURADO',
    'GASTOS_NOTARIALES',
    'CUOTAS_SIN_INTERES',
    'COMBO',
    'OTRO',
    'PAQUETE',
    'BENEFICIO'
);


--
-- Name: TipoUnidad; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."TipoUnidad" AS ENUM (
    'BODEGA',
    'ESTACIONAMIENTO'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


--
-- Name: alertas_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.alertas_config (
    id integer NOT NULL,
    tipo public."TipoAlerta" NOT NULL,
    "umbralDias" integer NOT NULL,
    activa boolean DEFAULT true NOT NULL,
    "canalEmail" boolean DEFAULT true NOT NULL,
    "canalWhatsapp" boolean DEFAULT false NOT NULL,
    "accionAutomatica" boolean DEFAULT false NOT NULL
);


--
-- Name: alertas_config_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.alertas_config_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: alertas_config_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.alertas_config_id_seq OWNED BY public.alertas_config.id;


--
-- Name: api_keys; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.api_keys (
    id integer NOT NULL,
    nombre text NOT NULL,
    key text NOT NULL,
    activa boolean DEFAULT true NOT NULL,
    "creadoEn" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: api_keys_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.api_keys_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: api_keys_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.api_keys_id_seq OWNED BY public.api_keys.id;


--
-- Name: archivos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.archivos (
    id integer NOT NULL,
    "unidadId" integer NOT NULL,
    url text NOT NULL,
    nombre text NOT NULL,
    tipo text NOT NULL,
    "creadoEn" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: archivos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.archivos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: archivos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.archivos_id_seq OWNED BY public.archivos.id;


--
-- Name: arriendos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.arriendos (
    id integer NOT NULL,
    "unidadId" integer NOT NULL,
    "contactoId" integer NOT NULL,
    "gestorNombre" text,
    "montoMensualUF" double precision,
    "fechaInicio" timestamp(3) without time zone NOT NULL,
    "fechaFin" timestamp(3) without time zone,
    estado public."EstadoArriendo" DEFAULT 'ACTIVO'::public."EstadoArriendo" NOT NULL,
    "contratoUrl" text,
    notas text,
    "creadoEn" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "actualizadoEn" timestamp(3) without time zone NOT NULL
);


--
-- Name: arriendos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.arriendos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: arriendos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.arriendos_id_seq OWNED BY public.arriendos.id;


--
-- Name: comisiones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.comisiones (
    id integer NOT NULL,
    "ventaId" integer NOT NULL,
    "usuarioId" integer NOT NULL,
    porcentaje double precision,
    "montoFijo" double precision,
    "montoCalculadoUF" double precision NOT NULL,
    "montoPrimera" double precision NOT NULL,
    "montoSegunda" double precision NOT NULL,
    "estadoPrimera" public."EstadoPago" DEFAULT 'PENDIENTE'::public."EstadoPago" NOT NULL,
    "estadoSegunda" public."EstadoPago" DEFAULT 'PENDIENTE'::public."EstadoPago" NOT NULL,
    "fechaPagoPrimera" timestamp(3) without time zone,
    "fechaPagoSegunda" timestamp(3) without time zone,
    notas text,
    "creadoEn" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "actualizadoEn" timestamp(3) without time zone NOT NULL,
    concepto text
);


--
-- Name: comisiones_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.comisiones_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: comisiones_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.comisiones_id_seq OWNED BY public.comisiones.id;


--
-- Name: contactos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contactos (
    id integer NOT NULL,
    nombre text NOT NULL,
    apellido text NOT NULL,
    rut text,
    email text,
    telefono text,
    empresa text,
    "tipoPersona" public."TipoPersona" DEFAULT 'NATURAL'::public."TipoPersona" NOT NULL,
    origen public."OrigenLead" DEFAULT 'OTRO'::public."OrigenLead" NOT NULL,
    notas text,
    "creadoEn" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "actualizadoEn" timestamp(3) without time zone NOT NULL
);


--
-- Name: contactos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.contactos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: contactos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.contactos_id_seq OWNED BY public.contactos.id;


--
-- Name: cotizacion_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cotizacion_items (
    id integer NOT NULL,
    "cotizacionId" integer NOT NULL,
    "unidadId" integer NOT NULL,
    "precioListaUF" double precision NOT NULL,
    "descuentoUF" double precision DEFAULT 0 NOT NULL
);


--
-- Name: cotizacion_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.cotizacion_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: cotizacion_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.cotizacion_items_id_seq OWNED BY public.cotizacion_items.id;


--
-- Name: cotizacion_promociones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cotizacion_promociones (
    id integer NOT NULL,
    "cotizacionId" integer NOT NULL,
    "promocionId" integer NOT NULL,
    aplicada boolean DEFAULT true NOT NULL,
    "ahorroUF" double precision DEFAULT 0 NOT NULL
);


--
-- Name: cotizacion_promociones_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.cotizacion_promociones_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: cotizacion_promociones_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.cotizacion_promociones_id_seq OWNED BY public.cotizacion_promociones.id;


--
-- Name: cotizaciones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cotizaciones (
    id integer NOT NULL,
    "leadId" integer NOT NULL,
    "creadoPorId" integer NOT NULL,
    estado public."EstadoCotizacion" DEFAULT 'BORRADOR'::public."EstadoCotizacion" NOT NULL,
    "validezDias" integer DEFAULT 30 NOT NULL,
    notas text,
    "descuentoAprobadoUF" double precision,
    "creadoEn" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "actualizadoEn" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: cotizaciones_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.cotizaciones_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: cotizaciones_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.cotizaciones_id_seq OWNED BY public.cotizaciones.id;


--
-- Name: cuotas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cuotas (
    id integer NOT NULL,
    "planPagoId" integer NOT NULL,
    "numeroCuota" integer NOT NULL,
    tipo public."TipoCuota" NOT NULL,
    "montoUF" double precision,
    "montoCLP" double precision,
    "fechaVencimiento" timestamp(3) without time zone NOT NULL,
    "fechaPagoReal" timestamp(3) without time zone,
    estado public."EstadoPago" DEFAULT 'PENDIENTE'::public."EstadoPago" NOT NULL,
    "metodoPago" public."MetodoPago",
    "numeroComprobante" text,
    "archivoUrl" text,
    notas text,
    "creadoEn" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "actualizadoEn" timestamp(3) without time zone NOT NULL
);


--
-- Name: cuotas_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.cuotas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: cuotas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.cuotas_id_seq OWNED BY public.cuotas.id;


--
-- Name: documentos_legales; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.documentos_legales (
    id integer NOT NULL,
    "procesoLegalId" integer NOT NULL,
    "subioPorId" integer,
    nombre text NOT NULL,
    url text NOT NULL,
    etapa public."EstadoLegal" NOT NULL,
    "creadoEn" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: documentos_legales_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.documentos_legales_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: documentos_legales_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.documentos_legales_id_seq OWNED BY public.documentos_legales.id;


--
-- Name: edificios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.edificios (
    id integer NOT NULL,
    nombre text NOT NULL,
    direccion text NOT NULL,
    region text NOT NULL,
    comuna text NOT NULL,
    inmobiliaria text,
    "contactoInmobiliaria" text,
    descripcion text,
    activo boolean DEFAULT true NOT NULL,
    "creadoEn" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "actualizadoEn" timestamp(3) without time zone NOT NULL
);


--
-- Name: edificios_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.edificios_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: edificios_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.edificios_id_seq OWNED BY public.edificios.id;


--
-- Name: interacciones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.interacciones (
    id integer NOT NULL,
    "leadId" integer NOT NULL,
    "usuarioId" integer,
    tipo public."TipoInteraccion" NOT NULL,
    descripcion text NOT NULL,
    fecha timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: interacciones_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.interacciones_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: interacciones_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.interacciones_id_seq OWNED BY public.interacciones.id;


--
-- Name: leads; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.leads (
    id integer NOT NULL,
    "contactoId" integer NOT NULL,
    "unidadInteresId" integer,
    "vendedorId" integer,
    "brokerId" integer,
    etapa public."EtapaLead" DEFAULT 'NUEVO'::public."EtapaLead" NOT NULL,
    "presupuestoAprox" double precision,
    "motivoPerdida" text,
    notas text,
    "creadoEn" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "actualizadoEn" timestamp(3) without time zone NOT NULL,
    campana text
);


--
-- Name: leads_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.leads_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: leads_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.leads_id_seq OWNED BY public.leads.id;


--
-- Name: llaves; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.llaves (
    id integer NOT NULL,
    "unidadId" integer NOT NULL,
    codigo text NOT NULL,
    estado public."EstadoLlave" DEFAULT 'EN_OFICINA'::public."EstadoLlave" NOT NULL,
    notas text,
    "creadoEn" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "actualizadoEn" timestamp(3) without time zone NOT NULL
);


--
-- Name: llaves_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.llaves_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: llaves_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.llaves_id_seq OWNED BY public.llaves.id;


--
-- Name: movimientos_llaves; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.movimientos_llaves (
    id integer NOT NULL,
    "llaveId" integer NOT NULL,
    "responsableId" integer,
    tipo text NOT NULL,
    "personaNombre" text,
    "personaContacto" text,
    motivo text,
    "fechaPrestamo" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "fechaDevolucionEsperada" timestamp(3) without time zone,
    "fechaDevolucionReal" timestamp(3) without time zone,
    "creadoEn" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: movimientos_llaves_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.movimientos_llaves_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: movimientos_llaves_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.movimientos_llaves_id_seq OWNED BY public.movimientos_llaves.id;


--
-- Name: notificaciones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notificaciones (
    id integer NOT NULL,
    "usuarioId" integer NOT NULL,
    tipo public."TipoAlerta" NOT NULL,
    mensaje text NOT NULL,
    "referenciaId" integer,
    "referenciaTipo" text,
    leida boolean DEFAULT false NOT NULL,
    "creadoEn" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: notificaciones_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.notificaciones_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: notificaciones_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.notificaciones_id_seq OWNED BY public.notificaciones.id;


--
-- Name: pagos_arriendo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pagos_arriendo (
    id integer NOT NULL,
    "arriendoId" integer NOT NULL,
    mes text NOT NULL,
    "montoUF" double precision,
    "montoCLP" double precision,
    estado public."EstadoPago" DEFAULT 'PENDIENTE'::public."EstadoPago" NOT NULL,
    "fechaPago" timestamp(3) without time zone,
    comprobante text,
    "creadoEn" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: pagos_arriendo_asegurado; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pagos_arriendo_asegurado (
    id integer NOT NULL,
    "ventaPromocionId" integer NOT NULL,
    mes integer NOT NULL,
    "montoUF" double precision NOT NULL,
    estado public."EstadoPago" DEFAULT 'PENDIENTE'::public."EstadoPago" NOT NULL,
    "fechaPago" timestamp(3) without time zone,
    comprobante text,
    "creadoEn" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: pagos_arriendo_asegurado_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pagos_arriendo_asegurado_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pagos_arriendo_asegurado_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pagos_arriendo_asegurado_id_seq OWNED BY public.pagos_arriendo_asegurado.id;


--
-- Name: pagos_arriendo_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pagos_arriendo_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pagos_arriendo_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pagos_arriendo_id_seq OWNED BY public.pagos_arriendo.id;


--
-- Name: planes_pago; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.planes_pago (
    id integer NOT NULL,
    "ventaId" integer NOT NULL,
    "totalCuotas" integer NOT NULL,
    "montoUF" double precision,
    "fechaInicio" timestamp(3) without time zone NOT NULL,
    "creadoEn" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: planes_pago_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.planes_pago_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: planes_pago_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.planes_pago_id_seq OWNED BY public.planes_pago.id;


--
-- Name: postventas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.postventas (
    id integer NOT NULL,
    "ventaId" integer NOT NULL,
    "responsableId" integer,
    tipo public."TipoPostventa" NOT NULL,
    descripcion text NOT NULL,
    estado public."EstadoPostventa" DEFAULT 'ABIERTO'::public."EstadoPostventa" NOT NULL,
    prioridad text DEFAULT 'media'::text NOT NULL,
    "fechaApertura" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "fechaCierre" timestamp(3) without time zone,
    resolucion text,
    "creadoEn" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "actualizadoEn" timestamp(3) without time zone NOT NULL
);


--
-- Name: postventas_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.postventas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: postventas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.postventas_id_seq OWNED BY public.postventas.id;


--
-- Name: procesos_legales; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.procesos_legales (
    id integer NOT NULL,
    "ventaId" integer NOT NULL,
    "tienePromesa" boolean DEFAULT true NOT NULL,
    "estadoActual" public."EstadoLegal" DEFAULT 'FIRMA_CLIENTE_PROMESA'::public."EstadoLegal" NOT NULL,
    "fechaLimiteFirmaCliente" timestamp(3) without time zone,
    "fechaLimiteFirmaInmob" timestamp(3) without time zone,
    "fechaLimiteEscritura" timestamp(3) without time zone,
    "fechaLimiteFirmaNot" timestamp(3) without time zone,
    "fechaLimiteCBR" timestamp(3) without time zone,
    "fechaLimiteEntrega" timestamp(3) without time zone,
    notas text,
    "creadoEn" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "actualizadoEn" timestamp(3) without time zone NOT NULL
);


--
-- Name: procesos_legales_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.procesos_legales_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: procesos_legales_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.procesos_legales_id_seq OWNED BY public.procesos_legales.id;


--
-- Name: promociones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.promociones (
    id integer NOT NULL,
    nombre text NOT NULL,
    descripcion text,
    tipo public."TipoPromocion" NOT NULL,
    "valorPorcentaje" double precision,
    "valorUF" double precision,
    "mesesArriendo" integer,
    "montoMensualUF" double precision,
    "cuotasSinInteres" integer,
    "fechaInicio" timestamp(3) without time zone,
    "fechaFin" timestamp(3) without time zone,
    activa boolean DEFAULT true NOT NULL,
    "creadoEn" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "actualizadoEn" timestamp(3) without time zone NOT NULL,
    detalle text,
    "minUnidades" integer,
    categoria public."CategoriaPromocion" DEFAULT 'PROMOCION'::public."CategoriaPromocion" NOT NULL
);


--
-- Name: promociones_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.promociones_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: promociones_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.promociones_id_seq OWNED BY public.promociones.id;


--
-- Name: solicitudes_descuento; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.solicitudes_descuento (
    id integer NOT NULL,
    "cotizacionId" integer NOT NULL,
    "solicitadoPorId" integer NOT NULL,
    "revisadoPorId" integer,
    tipo text NOT NULL,
    valor double precision NOT NULL,
    motivo text NOT NULL,
    estado public."EstadoSolicitudDescuento" DEFAULT 'PENDIENTE'::public."EstadoSolicitudDescuento" NOT NULL,
    comentario text,
    "creadoEn" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "revisadoEn" timestamp(3) without time zone
);


--
-- Name: solicitudes_descuento_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.solicitudes_descuento_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: solicitudes_descuento_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.solicitudes_descuento_id_seq OWNED BY public.solicitudes_descuento.id;


--
-- Name: uf_diaria; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.uf_diaria (
    fecha timestamp(3) without time zone NOT NULL,
    "valorPesos" double precision NOT NULL,
    "creadoEn" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: unidades; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.unidades (
    id integer NOT NULL,
    "edificioId" integer NOT NULL,
    tipo public."TipoUnidad" NOT NULL,
    subtipo public."SubtipoEstacionamiento",
    numero text NOT NULL,
    piso text,
    m2 double precision,
    techado boolean,
    acceso public."AccesoUnidad",
    "precioUF" double precision NOT NULL,
    "precioMinimoUF" double precision,
    "precioCostoUF" double precision,
    estado public."EstadoUnidad" DEFAULT 'DISPONIBLE'::public."EstadoUnidad" NOT NULL,
    notas text,
    "creadoEn" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "actualizadoEn" timestamp(3) without time zone NOT NULL,
    "ventaId" integer
);


--
-- Name: unidades_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.unidades_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: unidades_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.unidades_id_seq OWNED BY public.unidades.id;


--
-- Name: unidades_promociones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.unidades_promociones (
    "unidadId" integer NOT NULL,
    "promocionId" integer NOT NULL,
    "asignadoEn" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: usuarios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.usuarios (
    id integer NOT NULL,
    nombre text NOT NULL,
    apellido text NOT NULL,
    email text NOT NULL,
    password text NOT NULL,
    telefono text,
    rol public."Rol" NOT NULL,
    "comisionPorcentaje" double precision,
    "comisionFijo" double precision,
    activo boolean DEFAULT true NOT NULL,
    "creadoEn" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "actualizadoEn" timestamp(3) without time zone NOT NULL
);


--
-- Name: usuarios_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.usuarios_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: usuarios_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.usuarios_id_seq OWNED BY public.usuarios.id;


--
-- Name: ventas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ventas (
    id integer NOT NULL,
    "leadId" integer NOT NULL,
    "compradorId" integer NOT NULL,
    "vendedorId" integer,
    "brokerId" integer,
    "gerenteId" integer,
    "precioUF" double precision NOT NULL,
    "descuentoUF" double precision DEFAULT 0,
    estado public."EstadoVenta" DEFAULT 'RESERVA'::public."EstadoVenta" NOT NULL,
    "fechaReserva" timestamp(3) without time zone,
    "fechaPromesa" timestamp(3) without time zone,
    "fechaEscritura" timestamp(3) without time zone,
    "fechaEntrega" timestamp(3) without time zone,
    notas text,
    "creadoEn" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "actualizadoEn" timestamp(3) without time zone NOT NULL,
    "cotizacionOrigenId" integer
);


--
-- Name: ventas_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ventas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ventas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ventas_id_seq OWNED BY public.ventas.id;


--
-- Name: ventas_promociones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ventas_promociones (
    id integer NOT NULL,
    "ventaId" integer NOT NULL,
    "promocionId" integer NOT NULL,
    "gastosNotarialesPagados" boolean DEFAULT false,
    "gastosMonto" double precision
);


--
-- Name: ventas_promociones_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ventas_promociones_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ventas_promociones_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ventas_promociones_id_seq OWNED BY public.ventas_promociones.id;


--
-- Name: visitas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.visitas (
    id integer NOT NULL,
    "leadId" integer NOT NULL,
    "vendedorId" integer,
    "fechaHora" timestamp(3) without time zone NOT NULL,
    tipo text NOT NULL,
    resultado text,
    notas text,
    "creadoEn" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "edificioId" integer
);


--
-- Name: visitas_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.visitas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: visitas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.visitas_id_seq OWNED BY public.visitas.id;


--
-- Name: alertas_config id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alertas_config ALTER COLUMN id SET DEFAULT nextval('public.alertas_config_id_seq'::regclass);


--
-- Name: api_keys id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_keys ALTER COLUMN id SET DEFAULT nextval('public.api_keys_id_seq'::regclass);


--
-- Name: archivos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.archivos ALTER COLUMN id SET DEFAULT nextval('public.archivos_id_seq'::regclass);


--
-- Name: arriendos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.arriendos ALTER COLUMN id SET DEFAULT nextval('public.arriendos_id_seq'::regclass);


--
-- Name: comisiones id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comisiones ALTER COLUMN id SET DEFAULT nextval('public.comisiones_id_seq'::regclass);


--
-- Name: contactos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contactos ALTER COLUMN id SET DEFAULT nextval('public.contactos_id_seq'::regclass);


--
-- Name: cotizacion_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cotizacion_items ALTER COLUMN id SET DEFAULT nextval('public.cotizacion_items_id_seq'::regclass);


--
-- Name: cotizacion_promociones id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cotizacion_promociones ALTER COLUMN id SET DEFAULT nextval('public.cotizacion_promociones_id_seq'::regclass);


--
-- Name: cotizaciones id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cotizaciones ALTER COLUMN id SET DEFAULT nextval('public.cotizaciones_id_seq'::regclass);


--
-- Name: cuotas id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cuotas ALTER COLUMN id SET DEFAULT nextval('public.cuotas_id_seq'::regclass);


--
-- Name: documentos_legales id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documentos_legales ALTER COLUMN id SET DEFAULT nextval('public.documentos_legales_id_seq'::regclass);


--
-- Name: edificios id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.edificios ALTER COLUMN id SET DEFAULT nextval('public.edificios_id_seq'::regclass);


--
-- Name: interacciones id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interacciones ALTER COLUMN id SET DEFAULT nextval('public.interacciones_id_seq'::regclass);


--
-- Name: leads id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leads ALTER COLUMN id SET DEFAULT nextval('public.leads_id_seq'::regclass);


--
-- Name: llaves id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.llaves ALTER COLUMN id SET DEFAULT nextval('public.llaves_id_seq'::regclass);


--
-- Name: movimientos_llaves id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movimientos_llaves ALTER COLUMN id SET DEFAULT nextval('public.movimientos_llaves_id_seq'::regclass);


--
-- Name: notificaciones id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notificaciones ALTER COLUMN id SET DEFAULT nextval('public.notificaciones_id_seq'::regclass);


--
-- Name: pagos_arriendo id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pagos_arriendo ALTER COLUMN id SET DEFAULT nextval('public.pagos_arriendo_id_seq'::regclass);


--
-- Name: pagos_arriendo_asegurado id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pagos_arriendo_asegurado ALTER COLUMN id SET DEFAULT nextval('public.pagos_arriendo_asegurado_id_seq'::regclass);


--
-- Name: planes_pago id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.planes_pago ALTER COLUMN id SET DEFAULT nextval('public.planes_pago_id_seq'::regclass);


--
-- Name: postventas id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.postventas ALTER COLUMN id SET DEFAULT nextval('public.postventas_id_seq'::regclass);


--
-- Name: procesos_legales id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.procesos_legales ALTER COLUMN id SET DEFAULT nextval('public.procesos_legales_id_seq'::regclass);


--
-- Name: promociones id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promociones ALTER COLUMN id SET DEFAULT nextval('public.promociones_id_seq'::regclass);


--
-- Name: solicitudes_descuento id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.solicitudes_descuento ALTER COLUMN id SET DEFAULT nextval('public.solicitudes_descuento_id_seq'::regclass);


--
-- Name: unidades id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unidades ALTER COLUMN id SET DEFAULT nextval('public.unidades_id_seq'::regclass);


--
-- Name: usuarios id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios ALTER COLUMN id SET DEFAULT nextval('public.usuarios_id_seq'::regclass);


--
-- Name: ventas id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ventas ALTER COLUMN id SET DEFAULT nextval('public.ventas_id_seq'::regclass);


--
-- Name: ventas_promociones id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ventas_promociones ALTER COLUMN id SET DEFAULT nextval('public.ventas_promociones_id_seq'::regclass);


--
-- Name: visitas id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.visitas ALTER COLUMN id SET DEFAULT nextval('public.visitas_id_seq'::regclass);


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
f319081d-5f82-4a87-8ced-fdc448d773e8	6ddbfdd1707e3120273305d8f7d51fc48d013f3e68f8dbd0aeeb8679a17690f3	2026-04-13 17:23:43.561852+00	20260325185121_init	\N	\N	2026-04-13 17:23:42.493175+00	1
c127a77a-c02e-49da-ab66-3324e2a51979	3e0d6ef85217a64f0e9445f924c684a9b2aa5ebeea629e2827394b9d5c82ab24	2026-04-13 17:23:44.539766+00	20260326000000_unaccent	\N	\N	2026-04-13 17:23:43.835012+00	1
90e51d56-ff6f-46d4-8352-6a2538aa4e19	a50cb9e3337f5abeb67a6001084ec4c7fda21e2cdead987dc29547ecc735f1fc	2026-04-13 17:23:45.50865+00	20260402000000_add_campana_lead	\N	\N	2026-04-13 17:23:44.815009+00	1
c6c2c787-ec4b-44f0-a01c-688f241c7011	37930d563fc16b0880384d6d38147f09114c5f5a4ec0dce54ef7f4e4c406857c	2026-04-13 17:23:46.53864+00	20260406000000_add_cotizaciones_descuentos	\N	\N	2026-04-13 17:23:45.780772+00	1
50f70ffe-921a-4ed9-90dd-13674729d438	03286227eeacdf59b3a4f808588db7bb9fc2afa856607792541ad32ff87b3875	2026-04-13 17:23:47.509626+00	20260406010000_add_visitas_edificio_id	\N	\N	2026-04-13 17:23:46.810011+00	1
f76ba2fa-6c26-43a0-bb01-faa5f154f34b	1f48011ff8cdffb2f43d4875ee951dd52806587b2ee50a797834784dea9d38e0	2026-04-13 17:23:48.496188+00	20260407000000_fix_schema_drift	\N	\N	2026-04-13 17:23:47.784444+00	1
72de2725-b14d-433c-b824-4351137edab6	ae6f8b8c0d88ce64a10ebd74f6d0b86a240343aa8115ed4303cb35850acd33e3	2026-04-13 17:23:49.483571+00	20260408000000_venta_multiunidad	\N	\N	2026-04-13 17:23:48.779871+00	1
5b9d820d-7897-4e1c-9680-7faaf3009cd0	32b5a3a8b4d1b8b35facc296014bf63a77eba4fb68855d0d96b6aa3d16a2eb0e	2026-04-13 17:23:50.471149+00	20260409120000_add_unique_venta_promocion	\N	\N	2026-04-13 17:23:49.766742+00	1
ced4665c-06f6-49ec-81fb-293f3e175a25	98a5aee187dc420d908923b7a89728d8eb89f38fe898702198c84d8d8c34fdac	2026-04-13 17:23:51.453887+00	20260409130000_add_cotizacion_origen_to_venta	\N	\N	2026-04-13 17:23:50.745478+00	1
25cac9ea-d8b0-42ea-9ad6-20867b6aa6e0	76ecde5c2836dc2625ce9a2ca20f8c5dbca0ccb8700c807d596108dc228a41a4	2026-04-13 17:23:52.417694+00	20260410100000_add_meta_origen_enum	\N	\N	2026-04-13 17:23:51.726472+00	1
9ca50433-08b4-43d5-bbb4-26b15b614a2c	4b35bc37a58e6ba3c53daa801038525d3849aaf917b2b3cde2d1f06f0a3974b4	2026-04-13 17:23:53.401069+00	20260410110000_update_otro_to_meta	\N	\N	2026-04-13 17:23:52.706803+00	1
4a79f28d-1a8c-47ab-b238-2c9d35035f8b	6ddbfdd1707e3120273305d8f7d51fc48d013f3e68f8dbd0aeeb8679a17690f3	2026-03-25 18:51:21.83759+00	20260325185121_init	\N	\N	2026-03-25 18:51:21.806507+00	1
43028f6c-1987-4b87-856b-29c60fa05176	3e0d6ef85217a64f0e9445f924c684a9b2aa5ebeea629e2827394b9d5c82ab24	2026-03-26 13:02:35.183175+00	20260326000000_unaccent	\N	\N	2026-03-26 13:02:34.534979+00	1
f733b589-60a7-41c0-ba6b-9421fb7b7164	32b5a3a8b4d1b8b35facc296014bf63a77eba4fb68855d0d96b6aa3d16a2eb0e	2026-04-09 18:50:44.952998+00	20260409120000_add_unique_venta_promocion		\N	2026-04-09 18:50:44.952998+00	0
4bb73f44-a94b-4a85-9ad1-413408f0e63a	a50cb9e3337f5abeb67a6001084ec4c7fda21e2cdead987dc29547ecc735f1fc	2026-04-09 18:50:52.825587+00	20260402000000_add_campana_lead	\N	\N	2026-04-09 18:50:52.80847+00	1
9cfda777-8f8b-4ccc-b810-97adb69ba2af	37930d563fc16b0880384d6d38147f09114c5f5a4ec0dce54ef7f4e4c406857c	2026-04-09 18:50:52.849403+00	20260406000000_add_cotizaciones_descuentos	\N	\N	2026-04-09 18:50:52.826246+00	1
e05e518f-d5f0-451d-9f02-6c015880745a	03286227eeacdf59b3a4f808588db7bb9fc2afa856607792541ad32ff87b3875	2026-04-09 18:50:52.850946+00	20260406010000_add_visitas_edificio_id	\N	\N	2026-04-09 18:50:52.849835+00	1
1365e58e-5623-45c7-ad83-f3ce3a29c48e	1f48011ff8cdffb2f43d4875ee951dd52806587b2ee50a797834784dea9d38e0	2026-04-09 18:50:52.853078+00	20260407000000_fix_schema_drift	\N	\N	2026-04-09 18:50:52.851259+00	1
a97abc66-b650-426f-9320-e0a00326f4e3	ae6f8b8c0d88ce64a10ebd74f6d0b86a240343aa8115ed4303cb35850acd33e3	2026-04-09 18:50:52.859372+00	20260408000000_venta_multiunidad	\N	\N	2026-04-09 18:50:52.853516+00	1
7d8547c1-0eb3-4c72-a019-471f9750b7bc	98a5aee187dc420d908923b7a89728d8eb89f38fe898702198c84d8d8c34fdac	2026-04-09 18:54:11.295588+00	20260409130000_add_cotizacion_origen_to_venta		\N	2026-04-09 18:54:11.295588+00	0
\.


--
-- Data for Name: alertas_config; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.alertas_config (id, tipo, "umbralDias", activa, "canalEmail", "canalWhatsapp", "accionAutomatica") FROM stdin;
\.


--
-- Data for Name: api_keys; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.api_keys (id, nombre, key, activa, "creadoEn") FROM stdin;
1	Instagram	bp_9d5ce4a413bb7317b923dfa28eaa3253420fe580d98546e0	t	2026-04-07 19:41:38.633
2	Formulario Web Leads	bp_ee195871cab2224171cb926a77415d321006ee85a4e929c8	t	2026-04-09 21:39:23.574
\.


--
-- Data for Name: archivos; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.archivos (id, "unidadId", url, nombre, tipo, "creadoEn") FROM stdin;
\.


--
-- Data for Name: arriendos; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.arriendos (id, "unidadId", "contactoId", "gestorNombre", "montoMensualUF", "fechaInicio", "fechaFin", estado, "contratoUrl", notas, "creadoEn", "actualizadoEn") FROM stdin;
\.


--
-- Data for Name: comisiones; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.comisiones (id, "ventaId", "usuarioId", porcentaje, "montoFijo", "montoCalculadoUF", "montoPrimera", "montoSegunda", "estadoPrimera", "estadoSegunda", "fechaPagoPrimera", "fechaPagoSegunda", notas, "creadoEn", "actualizadoEn", concepto) FROM stdin;
\.


--
-- Data for Name: contactos; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.contactos (id, nombre, apellido, rut, email, telefono, empresa, "tipoPersona", origen, notas, "creadoEn", "actualizadoEn") FROM stdin;
2590	Marcela		\N	sandovalpropiedades@outlook.com	+56991478626	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:49.801	2026-04-01 19:44:49.801
2591	Marcelo		\N	darlo.tor@gmail.com	962674799	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:49.812	2026-04-01 19:44:49.812
2592	Hector		\N	hmut96@gmail.com	+56963649843	\N	NATURAL	OTRO	\N	2026-04-01 19:44:49.814	2026-04-01 19:44:49.814
2593	Adrián	Briones	\N	adrianbrionese@gmail.com	+56985460584	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:49.816	2026-04-01 19:44:49.816
2594	Carlo		\N	cdlillo@gmail.com	+56989889903	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:49.818	2026-04-01 19:44:49.818
2595	Luis		\N	luisgil66@gmail.com	+56996898889	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:49.819	2026-04-01 19:44:49.819
2596	Juana		\N	juanitadelrosario07@gmail.com	+56968152408	\N	NATURAL	OTRO	\N	2026-04-01 19:44:49.821	2026-04-01 19:44:49.821
2597	Monca		\N	herreramonica708@gmail.com	+56941208837	\N	NATURAL	OTRO	\N	2026-04-01 19:44:49.822	2026-04-01 19:44:49.822
2598	Ariel		\N	agalaz1950@gmail.com	+56978768948	\N	NATURAL	OTRO	\N	2026-04-01 19:44:49.822	2026-04-01 19:44:49.822
2599	Marcia		\N	marciacontrerasvenegas@gmail.com	+56944106649	\N	NATURAL	OTRO	\N	2026-04-01 19:44:49.823	2026-04-01 19:44:49.823
2600	Maithe	Milan	\N	maithemilan@gmail.com	+56954185663	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:49.824	2026-04-01 19:44:49.824
2601	Seferino		\N	teterodiaz@gmail.com	+56964774699	\N	NATURAL	OTRO	\N	2026-04-01 19:44:49.825	2026-04-01 19:44:49.825
2602	Raquel		\N	raquellopezcorrea@outlook.com	+56967172986	\N	NATURAL	OTRO	\N	2026-04-01 19:44:49.826	2026-04-01 19:44:49.826
2603	Jorge		\N	jorge.villalobos.moran@gmail.com	+56974258932	\N	NATURAL	OTRO	\N	2026-04-01 19:44:49.827	2026-04-01 19:44:49.827
2604	Cesar	García	\N	cegarchi5@gmail.com	978083337	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:49.828	2026-04-01 19:44:49.828
2605	Ivan		\N	ivillarroeltoro@gmail.com	+56966751833	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:49.829	2026-04-01 19:44:49.829
2606	Andres	Cobos	\N	acobosr@gmail.com	+56997380595	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:49.83	2026-04-01 19:44:49.83
2607	Ruth		\N	ruthpizarroolivares@gmail.com	+56962074082	\N	NATURAL	OTRO	\N	2026-04-01 19:44:49.831	2026-04-01 19:44:49.831
2608	Carlos		\N	cmdatacount@gmail.com	+56993649611	\N	NATURAL	OTRO	\N	2026-04-01 19:44:49.831	2026-04-01 19:44:49.831
2609	Francisco		\N	fcopenabustos@gmail.com	+56967348802	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:49.833	2026-04-01 19:44:49.833
2610	Fernando	Zavala	\N	Fzavalacisternas@hotmail.com	+56997011058	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:49.834	2026-04-01 19:44:49.834
2611	Romina	Patricia	\N	romiarriagada@gmail.com	+56222733092	\N	NATURAL	OTRO	\N	2026-04-01 19:44:49.834	2026-04-01 19:44:49.834
2612	Ignacio		\N	ignaciomolinareyes2@gmail.com	+56956048201	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:49.835	2026-04-01 19:44:49.835
2613	Juan	Carlos cortes pinto	\N	jccorte6spinto@gmail.co44m	+244937704518	\N	NATURAL	OTRO	\N	2026-04-01 19:44:49.837	2026-04-01 19:44:49.837
2614	Ricardo		\N	licavega1967@gmail.com	+56957924502	\N	NATURAL	OTRO	\N	2026-04-01 19:44:49.838	2026-04-01 19:44:49.838
2615	Adriana		\N	adrianacortes1942@gmail.com	+56994945316	\N	NATURAL	OTRO	\N	2026-04-01 19:44:49.839	2026-04-01 19:44:49.839
2616	Beno		\N	benoperro@hotmail.com	+56992181758	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:49.841	2026-04-01 19:44:49.841
2617	Eugenia		\N	andreahsj@hotmail.com	+56954898851	\N	NATURAL	OTRO	\N	2026-04-01 19:44:49.842	2026-04-01 19:44:49.842
2618	Nicole		\N	nicolenumkre@hotmail.com	+56998748328	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:49.843	2026-04-01 19:44:49.843
2619	Francisco		\N	fa3056657@gmail.com	+56999640669	\N	NATURAL	OTRO	\N	2026-04-01 19:44:49.844	2026-04-01 19:44:49.844
2620	Luis	Eduardo	\N	luiseduardovasquezvenegas@gmail.com	+56982554629	\N	NATURAL	OTRO	\N	2026-04-01 19:44:49.845	2026-04-01 19:44:49.845
2621	Luz	Estrella	\N	luzy9920@gmail.com	+56941817879	\N	NATURAL	OTRO	\N	2026-04-01 19:44:49.846	2026-04-01 19:44:49.846
2622	Leonel		\N	leonel.farfan.a@gmail.com	+56993298213	\N	NATURAL	OTRO	\N	2026-04-01 19:44:49.847	2026-04-01 19:44:49.847
2623	Felipe	Chahuán	\N	felipechahuan@gmail.com	+56999714185	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:49.849	2026-04-01 19:44:49.849
2624	Beatriz		\N	beatrizcastrobarriga@gmail.com	+56955126019	\N	NATURAL	OTRO	\N	2026-04-01 19:44:49.85	2026-04-01 19:44:49.85
2625	Angelica		\N	angelicamarquezzzzzzz@gmail.com	+56940287995	\N	NATURAL	OTRO	\N	2026-04-01 19:44:49.851	2026-04-01 19:44:49.851
2626	Pancho	Valenzuela Van De	\N	fcovalenzuelav@gmail.com	+56972132064	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:49.852	2026-04-01 19:44:49.852
2627	Berta		\N	bertaparra250@gmail.comyrbsllavor	+56999611607	\N	NATURAL	OTRO	\N	2026-04-01 19:44:49.853	2026-04-01 19:44:49.853
2628	Alvaro	Galindo	\N	alvarogalindomorales@gmail.com	+56961206814	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:49.854	2026-04-01 19:44:49.854
2629	Jenny	Prado Toro -	\N	ilchakona@gmail.com	+56989006961	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:49.855	2026-04-01 19:44:49.855
2630	Victor		\N	vgonzalezb@gmail.com	+56993260102	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:49.857	2026-04-01 19:44:49.857
2631	Loreto	Paredes	\N	rrhh.gestionadmn@gmail.com	+56974763887	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:49.858	2026-04-01 19:44:49.858
2632	Nicolás		\N	nicolasavilauno@gmail.com	+56988053290	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:49.859	2026-04-01 19:44:49.859
2633	Francisco	Javier Diaz	\N	fco.diaz.ret@gmail.com	+56975707159	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:49.86	2026-04-01 19:44:49.86
2634	Rodrigo		\N	rvarela75@gmail.com	+56989016445	\N	NATURAL	OTRO	\N	2026-04-01 19:44:49.861	2026-04-01 19:44:49.861
2635	Carlos	Gonzalez	\N	28.gonzalez.r@gmail.com	+56996233137	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:49.862	2026-04-01 19:44:49.862
2636	Francisco		\N	francisco.cuevas.a@gmail.com	+56971371273	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:49.863	2026-04-01 19:44:49.863
2637	Silvana		\N	luzsbarrios@hotmail.com	+56998957519	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:49.865	2026-04-01 19:44:49.865
2638	Juany		\N	juanytrigo09@gmail.com	+56948496015	\N	NATURAL	OTRO	\N	2026-04-01 19:44:49.866	2026-04-01 19:44:49.866
2639	Paula		\N	paulafried@gmail.com	+56997890143	\N	NATURAL	OTRO	\N	2026-04-01 19:44:49.866	2026-04-01 19:44:49.866
2640	Francisco	Javier Pollman	\N	fjpollman@hotmail.com	+56956660871	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:49.867	2026-04-01 19:44:49.867
2641	Belkenbawer		\N	bgap.acuario@gmail.com	+56948607344	\N	NATURAL	OTRO	\N	2026-04-01 19:44:49.869	2026-04-01 19:44:49.869
2642	Rodrigo	Miranda	\N	rodrigomirandav@gmail.com	+56993218984	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:49.87	2026-04-01 19:44:49.87
2643	Diego	Silva	\N	diego.2664@gmail.com	+56968346849	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:49.871	2026-04-01 19:44:49.871
2644	Mary		\N	maryraquel47@hotmail.com	+56992158650	\N	NATURAL	OTRO	\N	2026-04-01 19:44:49.872	2026-04-01 19:44:49.872
2645	Marc		\N	marc_kreutzmann@hotmail.com	+56951003013	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:49.874	2026-04-01 19:44:49.874
2646	Paulina		\N	paulinalimari@gmail.com	+56956753111	\N	NATURAL	OTRO	\N	2026-04-01 19:44:49.875	2026-04-01 19:44:49.875
2647	Marta		\N	martasaguez@gmail.com	+56223182638	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:49.876	2026-04-01 19:44:49.876
2648	Seba		\N	ramirezdiaz.sebastian@gmail.com	+56984923864	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:49.877	2026-04-01 19:44:49.877
2649	Alejandra	Betancourth López	\N	alejalopez17@hotmail.com	+56973472591	\N	NATURAL	OTRO	\N	2026-04-01 19:44:49.878	2026-04-01 19:44:49.878
2650	Jaime		\N	Jaimecontc@gmail.com	+56978546162	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:49.879	2026-04-01 19:44:49.879
2651	Cristóbal		\N	cristobal.mbayuk@gmail.com	+56964599305	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:49.88	2026-04-01 19:44:49.88
2652	Paola	Albornoz	\N	andrea.pollmann30@gmail.com	+56971093259	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:49.881	2026-04-01 19:44:49.881
2653	Arturo	Benjamin Bustos	\N	abustosramirez@gmail.com	+5697573134	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:49.882	2026-04-01 19:44:49.882
2654	Jose		\N	Jose30teran@gmail.con	+584242662286	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:49.883	2026-04-01 19:44:49.883
2655	Sandra		\N	secheverria.chile@gmail.com	944542022	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:49.883	2026-04-01 19:44:49.883
2656	Ignacio	Montecino	\N	ignaciomontecino65@gmail.com	+56951103100	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:49.884	2026-04-01 19:44:49.884
2657	Soledad		\N	solesilvavera@gmail.com	+56993346348	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:49.885	2026-04-01 19:44:49.885
2658	Rosa		\N	rosa.rodriguez.ga@gmail.comr	+56996231803	\N	NATURAL	OTRO	\N	2026-04-01 19:44:49.886	2026-04-01 19:44:49.886
5035	Jorge		\N	itaim@tie.cl	+56997835839	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.823	2026-04-01 19:44:51.823
2659	Pablo		\N	phamame@gmail.com	+56978569920	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:49.887	2026-04-01 19:44:49.887
2660	Eduardo		\N	ecosta_surgery@hotmail.com	+56995335475	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:49.888	2026-04-01 19:44:49.888
2661	Franco	Pezenti	\N	sociedadinversionessantamarta@gmail.com	+56956226521	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:49.889	2026-04-01 19:44:49.889
2662	Rigoberto		\N	transygruasrd@hotmail.com	+56994890104	\N	NATURAL	OTRO	\N	2026-04-01 19:44:49.89	2026-04-01 19:44:49.89
2663	Juan	Daza	\N	juandaza19@gmail.com	+56952525584	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:49.891	2026-04-01 19:44:49.891
2664	Vicky	O / vita	\N	vicky.ojedamedo@gmail.com	984281123	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:49.892	2026-04-01 19:44:49.892
2665	Esteban		\N	esteban.vasquez33@gmail.com	+56993490314	\N	NATURAL	OTRO	\N	2026-04-01 19:44:49.894	2026-04-01 19:44:49.894
2666	Jose	Joaquin Behar	\N	josebeharlatorre@gmail.com	+56959794865	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:49.895	2026-04-01 19:44:49.895
2667	Ivan		\N	ivo.munoz@gmail.com	+56998460776	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:49.896	2026-04-01 19:44:49.896
2668	Cristián		\N	cperaltat@gmail.com	+56995311881	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:49.897	2026-04-01 19:44:49.897
2669	Nicole		\N	ndelarze@gmail.com	+56988076189	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:49.898	2026-04-01 19:44:49.898
2670	Mario		\N	m.cespedes.salezzi@gmail.com	+56963243401	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:49.899	2026-04-01 19:44:49.899
2671	Sergio		\N	serg.munoza@gmail.com	+56972000749	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:49.9	2026-04-01 19:44:49.9
2672	Ricardo		\N	eneos1980@gmail.com	998839806	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:49.901	2026-04-01 19:44:49.901
2673	César	Rodríguez	\N	cesar.rodriguez.mv@gmail.com	+56973793262	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:49.903	2026-04-01 19:44:49.903
2674	Fabián	Campos	\N	fabian.alonso.c@gmail.com	+56986731473	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:49.904	2026-04-01 19:44:49.904
2675	AND	id you decide stai with the liter i	\N	abogadayanara.cjmgdl@gmail.com	+56984490378	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:49.905	2026-04-01 19:44:49.905
2676	Bernardita		\N	cbernardita67@gmail.com	+56975617759	\N	NATURAL	OTRO	\N	2026-04-01 19:44:49.906	2026-04-01 19:44:49.906
2677	Ana		\N	ana.hernandez.galarce@gmail.com	+56991383966	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:49.907	2026-04-01 19:44:49.907
2678	Diego	Muñoz	\N	diego.munozmardones@gmail.com	+5649847799	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:49.908	2026-04-01 19:44:49.908
2679	Sandra		\N	skauerc@gmail.com	+56998206088	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:49.909	2026-04-01 19:44:49.909
2680	Carola		\N	studiodermoesteticamedica@gmail.com	+56965990254	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:49.91	2026-04-01 19:44:49.91
2681	Gastón	Rozas	\N	gastonrozasdonoso@gmail.com	+56944495509	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:49.911	2026-04-01 19:44:49.911
2682	Paola		\N	paolillacristina@gmail.com	+56949242669	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:49.912	2026-04-01 19:44:49.912
2683	Boris		\N	b.eduardoff@gmail.com	+56956138037	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:49.913	2026-04-01 19:44:49.913
2684	Jonathan		\N	arq.jonathan.nc@gmail.com	+56979225632	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:49.914	2026-04-01 19:44:49.914
2685	Nicolás	Agustín	\N	nicolas.a.silva.m@gmail.com	+56986538927	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:49.915	2026-04-01 19:44:49.915
2686	Rodrigo	Alarcon	\N	realarcongarrido@gmail.com	+56996989058	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:49.915	2026-04-01 19:44:49.915
2687	marco		\N	marco.seguel.burgos@gmail.com	+56979796223	\N	NATURAL	OTRO	\N	2026-04-01 19:44:49.916	2026-04-01 19:44:49.916
2688	vilmaroman		\N	mhassit@gmail.com	+56998225232	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:49.917	2026-04-01 19:44:49.917
2689	Tamara	Palacios	\N	tamara@tamara.cl	+56991586578	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:49.918	2026-04-01 19:44:49.918
2690	Giselle	Bruna	\N	gbrunaf@gmail.com	+56995965824	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:49.919	2026-04-01 19:44:49.919
2691	Aprovecha		\N	aprovecha.oferton@gmail.com	+56992199198	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:49.92	2026-04-01 19:44:49.92
2692	Gabriel		\N	chanfle2.0@hotmail.com	+56975410497	\N	NATURAL	OTRO	\N	2026-04-01 19:44:49.921	2026-04-01 19:44:49.921
2693	Marlene		\N	marleneolivares.a@gmail.com	+56984759563	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:49.922	2026-04-01 19:44:49.922
2694	Tomas		\N	tomasimhoffp@gmail.com.com	+61483225462	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:49.923	2026-04-01 19:44:49.923
2695	Jocelyn		\N	jocelyn.fuentes@gmail.com	+56961610251	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:49.923	2026-04-01 19:44:49.923
2696	Alvaro	Muñoz	\N	alvaromunozfigueroa@gmail.com	+56987547960	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:49.924	2026-04-01 19:44:49.924
2697	Julmar		\N	j_karina94@hotmail.com	+56937304929	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:49.925	2026-04-01 19:44:49.925
2698	Manuel	balmaceda	\N	mjbalmacedae@gmail.com	+56986627081	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:49.926	2026-04-01 19:44:49.926
2699	Jose		\N	manejasanjosemaneja@gmail.com	+56977962548	\N	NATURAL	OTRO	\N	2026-04-01 19:44:49.927	2026-04-01 19:44:49.927
2700	Eduardo	Javier	\N	verita_fotolog@hotmail.com	+56973278089	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:49.927	2026-04-01 19:44:49.927
2701	Bárbara		\N	barbarita_mt@hotmail.com	+56954422240	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:49.928	2026-04-01 19:44:49.928
2702	Mauricio	Alfonso Poblete	\N	mauropoblete77@gmail.com	+56975383061	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:49.929	2026-04-01 19:44:49.929
2703	claudio	ulises gomez	\N	cgomezfiguero@gmail.com	+56962292711	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:49.93	2026-04-01 19:44:49.93
2704	Luis		\N	dominguezluis2815@gmail.com	+56955381294	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:49.931	2026-04-01 19:44:49.931
2705	Patricio		\N	pmartinezb@gmail.com	+56998450914	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:49.931	2026-04-01 19:44:49.931
2706	Cristián	Rodríguez	\N	rbinfa@gmail.com	+56996302064	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:49.932	2026-04-01 19:44:49.932
2707	Isabel	Messenger	\N	donosomessenger@hotmail.com	+56966186600	\N	NATURAL	OTRO	\N	2026-04-01 19:44:49.933	2026-04-01 19:44:49.933
2708	PazCuello		\N	pazcuello@hotmail.com	+56958741604	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:49.934	2026-04-01 19:44:49.934
2709	Danilo		\N	Danilo.solis.cerda@gmail.com	+56933850045	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:49.934	2026-04-01 19:44:49.934
2710	cxmusj		\N	carilyns.sarai@usach.cl	+56930618825	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:49.935	2026-04-01 19:44:49.935
2711	Cecilia		\N	ilihuen@gmail.com	+56984409974	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:49.936	2026-04-01 19:44:49.936
2712	Seba		\N	sebastian.espinoza.contreras1@gmail.com	+56958221037	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:49.937	2026-04-01 19:44:49.937
2713	Alfredo		\N	almarfu1985@gmail.com	+56973842930	\N	NATURAL	OTRO	\N	2026-04-01 19:44:49.938	2026-04-01 19:44:49.938
2714	Spradov		\N	sebastianpradocl@yahoo.com	+56990247523	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:49.939	2026-04-01 19:44:49.939
2715	Héctor		\N	hjarap@gmail.com	+56994791416	\N	NATURAL	OTRO	\N	2026-04-01 19:44:49.94	2026-04-01 19:44:49.94
2716	Katerinne	Muñoz	\N	katerinnemunozgonzalez@gmail.com	+56963006942	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:49.94	2026-04-01 19:44:49.94
2717	Domingo		\N	dvas.bertin@gmail.com	+56996559010	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:49.941	2026-04-01 19:44:49.941
2718	alejandra	cristina carrasco	\N	alexita45@gmail.com	+56986765047	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:49.942	2026-04-01 19:44:49.942
2719	Alejandra	Martin	\N	amartinaranda@gmail.com	+56965872244	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:49.943	2026-04-01 19:44:49.943
2720	Miguel	González de la	\N	migonzalezdlp@gmail.com	953633342	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:49.944	2026-04-01 19:44:49.944
2721	EliEl	Adrian	\N	elielfernandoy@outlook.com	933581199	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:49.945	2026-04-01 19:44:49.945
2722	Gabriela	Reveco	\N	Gabrielarevecoc@gmail.com	+56965688766	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:49.946	2026-04-01 19:44:49.946
2723	Marce		\N	marcela.benitov@gmail.com	944083932	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:49.947	2026-04-01 19:44:49.947
2724	M	Magdalena Guajardo	\N	magdalenaguajardoreyes@gmail.com	+56996898537	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:49.948	2026-04-01 19:44:49.948
2725	Mely	Maturana	\N	mely.maturana@gmail.com	+56961983032	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:49.949	2026-04-01 19:44:49.949
2726	Raul	Gustavo	\N	paredesraul@gmail.com	+56966533329	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:49.95	2026-04-01 19:44:49.95
2727	Antonio		\N	Supermercadoescorial@hotmail.com	+56993348518	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:49.951	2026-04-01 19:44:49.951
2728	Nicolas	fernando	\N	nicolaspechieu@hotmail.com	+56976942826	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:49.952	2026-04-01 19:44:49.952
2729	Maria	Patricia López	\N	mariapat.velasquez07@gmail.com	+56945538920	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:49.953	2026-04-01 19:44:49.953
2730	Manuel	Alexis Maureira	\N	manuel.alexis@gmail.com	+56990948158	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:49.954	2026-04-01 19:44:49.954
2731	Juan		\N	jcrisostomo@nortchile.cl	+56964259169	\N	NATURAL	OTRO	\N	2026-04-01 19:44:49.955	2026-04-01 19:44:49.955
2732	Gabo		\N	Torres.campana.g@gmail.com	979398817	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:49.956	2026-04-01 19:44:49.956
2733	Mauro	Lombardi	\N	mmaurolombardi@gmail.com	+56931024172	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:49.956	2026-04-01 19:44:49.956
2734	Pablo	López	\N	pabloasd_ac14@hotmail.com	+56962894983	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:49.958	2026-04-01 19:44:49.958
2735	B	A S T I A	\N	ba.aguilera.a@gmail.com	+56945618522	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:49.959	2026-04-01 19:44:49.959
2736	Carlos	Valenzuela	\N	vicarsociedad@gmail.com	+56942469702	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:49.96	2026-04-01 19:44:49.96
2737	Miguel		\N	Miguelw@live.com	+56988459949	\N	NATURAL	OTRO	\N	2026-04-01 19:44:49.961	2026-04-01 19:44:49.961
2738	keisy		\N	keisy5518@gmail.com	+56936887396	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:49.962	2026-04-01 19:44:49.962
2739	Manuel		\N	mavila@ingetrol.cl	+56954108321	\N	NATURAL	OTRO	\N	2026-04-01 19:44:49.963	2026-04-01 19:44:49.963
2740	Pablo	Sepulveda	\N	Pabs2141@gmail.com	+56954629201	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:49.964	2026-04-01 19:44:49.964
2741	Jonathan	Andres Rojas	\N	jonathan.rojas.lazo@hotmail.com	+56984207745	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:49.965	2026-04-01 19:44:49.965
2742	Luis	Hernández	\N	luis.hernandezo@daemtalca.cl	+56983462000	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:49.966	2026-04-01 19:44:49.966
2743	Stephanny	Alfaro	\N	alfarojopia.s@gmail.com	+56942295672	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:49.967	2026-04-01 19:44:49.967
2744	Carlos	Guzman	\N	cagupa53@gmail.com	+56976687219	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:49.968	2026-04-01 19:44:49.968
2745	Claudio		\N	irarrazaval.claudio@gmail.com	+56958585588	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:49.969	2026-04-01 19:44:49.969
2746	Sebastian		\N	sebastiangallardo335@gmail.com	+56933965585	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:49.97	2026-04-01 19:44:49.97
2747	Carolina		\N	carolinaespinoza2000@hotmail.com	+56994402060	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:49.971	2026-04-01 19:44:49.971
2748	Juan	pablo	\N	Jpdelsante@mvv.cl	+56997651500	\N	NATURAL	OTRO	\N	2026-04-01 19:44:49.972	2026-04-01 19:44:49.972
2749	Sol		\N	sayen2003@hotmail.com	+56997426342	\N	NATURAL	OTRO	\N	2026-04-01 19:44:49.973	2026-04-01 19:44:49.973
2750	Gerardo	Velazco	\N	gvelazco2012@gmail.com	+56934438607	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:49.974	2026-04-01 19:44:49.974
2751	Berta		\N	bvasquezpereira@hotmail.com	76893538	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:49.974	2026-04-01 19:44:49.974
2752	Cristian	Araya	\N	cristian.araya.wittke@gmail.com	956190274	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:49.975	2026-04-01 19:44:49.975
2753	Camilo		\N	camilo.erices07@gmail.com	+56993947901	\N	NATURAL	OTRO	\N	2026-04-01 19:44:49.976	2026-04-01 19:44:49.976
2754	Javiera		\N	javita_jp@hotmail.com	+56982328935	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:49.977	2026-04-01 19:44:49.977
2755	Felipe		\N	felipe.vega16@gmail.com	966568466	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:49.978	2026-04-01 19:44:49.978
2756	Violeta		\N	violetasofia@yahoo.es	+56990151287	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:49.979	2026-04-01 19:44:49.979
2757	Nestor	Italo Cayuleo	\N	nestorcayuleo@gmail.com	+56975509963	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:49.98	2026-04-01 19:44:49.98
2758	Berni	Cerda	\N	bernarditacerda@gmail.com	+56981953051	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:49.981	2026-04-01 19:44:49.981
2759	Fernando	Balbontin	\N	fernando.balbontin@gmail.com	+56985299288	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:49.982	2026-04-01 19:44:49.982
2760	Carlos		\N	carlitos.fm23@gmail.com	+56991287775	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:49.983	2026-04-01 19:44:49.983
2761	Jhonatan		\N	jhonatanlerma2@gmail.com	+56953914431	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:49.984	2026-04-01 19:44:49.984
2762	Jimmy		\N	jimmyrodriguez1515@gmail.com	+56998888221	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:49.986	2026-04-01 19:44:49.986
2763	Ricky-Rolly-Serhan-Taz		\N	pilar.andrea.sepulveda.madrid@gmail.com	+56964239463	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:49.987	2026-04-01 19:44:49.987
2764	Pedro	Bravo	\N	pedro.bravoval@gmail.com	+56994696020	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:49.988	2026-04-01 19:44:49.988
2765	Esteban	Roa	\N	estebanroafritz@gmail.com	945191908	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:49.989	2026-04-01 19:44:49.989
2766	juan		\N	jcrodriguez99@gmail.com	+56998636498	\N	NATURAL	OTRO	\N	2026-04-01 19:44:49.99	2026-04-01 19:44:49.99
2767	Fabrizio	Martin Pisani	\N	fpisanipezoa@gmail.com	+56989633090	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:49.991	2026-04-01 19:44:49.991
2768	rodrigo		\N	Rodrigoramosjaramillo@gmail.com	+56977907708	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:49.992	2026-04-01 19:44:49.992
2769	Leo	Fernandez	\N	leofernandezsabal@gmail.com	+56964667737	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:49.993	2026-04-01 19:44:49.993
2770	Rodrigo	Rivera	\N	abogadorodrigorivera@gmail.com	+56991291568	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:49.994	2026-04-01 19:44:49.994
2771	Eduardo	Andres Riquelme	\N	lalo3150@hotmail.com	+56993492156	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:49.995	2026-04-01 19:44:49.995
2772	Liliana		\N	liliana.abarca.t@gmail.com	999999999	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:49.995	2026-04-01 19:44:49.995
2773	Felipe	Espinoza	\N	felipe.iespinozaf@gmail.com	+56991252106	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:49.996	2026-04-01 19:44:49.996
2774	Oscar	Alejandro	\N	letelier85@gmail.com	+56968795817	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:49.997	2026-04-01 19:44:49.997
2775	Álvaro	Ibacache	\N	ibacache_d19@hotmail.com	933853972	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:49.998	2026-04-01 19:44:49.998
2776	Aliosha	Bertini	\N	alioshab@gmail.com	+56958434233	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:49.999	2026-04-01 19:44:49.999
2777	antonio		\N	jcbcandia@gmail.com	+56998180346	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50	2026-04-01 19:44:50
2778	Vicente		\N	vicentecarrasco720@gmail.com	+56987741561	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.001	2026-04-01 19:44:50.001
2779	Josefina		\N	josefina.abarzuav@gmail.com	+56939088403	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.002	2026-04-01 19:44:50.002
2780	Cristian	Muñoz	\N	cristianmunozsoto27@gmail.com	950907176	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.003	2026-04-01 19:44:50.003
2781	Juan		\N	juan.matus@mail.udp.cl	+56973686264	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.004	2026-04-01 19:44:50.004
2782	Eduardo		\N	contacto.eduardors@gmail.com	+56976859194	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.005	2026-04-01 19:44:50.005
2783	Lumbania	Sepúlveda	\N	lumbaniasepulveda@gmail.com	+56941217033	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.006	2026-04-01 19:44:50.006
2784	Luis	Perez	\N	L.perezmolina1607@gmail.com	+56963933728	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.007	2026-04-01 19:44:50.007
2785	Verena		\N	verena@mi.cl	+56993354131	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.008	2026-04-01 19:44:50.008
2786	Cesar		\N	cesar.valladares.s@gmail.com	+56999339690	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.009	2026-04-01 19:44:50.009
2787	Silvestre		\N	oculoplastico@hotmail.com	+56998473194	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.009	2026-04-01 19:44:50.009
2788	Pauli		\N	pauli204@hotmail.es	+56959840739	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.01	2026-04-01 19:44:50.01
2789	Bel		\N	maka245@gmail.com	+56958327619	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.011	2026-04-01 19:44:50.011
2790	Patricia		\N	patricia-iriartem@hotmail.com	+56994871532	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.012	2026-04-01 19:44:50.012
2791	Eric		\N	ereyesaraya@gmail.com	+56968455008	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.013	2026-04-01 19:44:50.013
2792	Marcelo	Contreras	\N	mce@nacase.cl	+56998266271	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.014	2026-04-01 19:44:50.014
2793	John	Lenin	\N	cristianosaccesorios@gmail.com	+56985777692	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.015	2026-04-01 19:44:50.015
2794	Paulina		\N	paulinatrivas@gmail.com	+56965523796	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.015	2026-04-01 19:44:50.015
2795	Michelle		\N	mgriman10@gmail.com	939669122	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.016	2026-04-01 19:44:50.016
2796	Camilo	Vidal	\N	drcamilovidala@gmail.com	+56962032088	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.017	2026-04-01 19:44:50.017
2797	Daniela	Cofré	\N	daniela2128@gmail.com	+56993716113	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.018	2026-04-01 19:44:50.018
2798	Anita		\N	otiliahernandez748@gmail.com	+56946578876	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.019	2026-04-01 19:44:50.019
2799	Karl	Araya	\N	karlarayaj@gmail.com	+56965748899	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.02	2026-04-01 19:44:50.02
2800	Vanessa		\N	vanessa.meneses.a@gmail.com	+56961185985	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.021	2026-04-01 19:44:50.021
2801	Hugo		\N	hjsalgado@gmail.com	+56957555500	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.022	2026-04-01 19:44:50.022
2802	Adolfo		\N	adolfo3336@hotmail.com	+56973373281	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.023	2026-04-01 19:44:50.023
2803	Ernesto		\N	erolavarria@gmail.com	+56998624796	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.024	2026-04-01 19:44:50.024
2804	guillermo		\N	ggonzalez83@hotmail.com	+56974377839	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.024	2026-04-01 19:44:50.024
2805	Diego	Sanchez	\N	Diego.sanfre10@gmail.com	+56965890064	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.025	2026-04-01 19:44:50.025
2806	Clau		\N	P.tapiapalma@gmail.com	+56998739743	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.026	2026-04-01 19:44:50.026
2807	Alvaro	Nava	\N	morpheus2488@gmail.com	+56989909221	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.027	2026-04-01 19:44:50.027
2808	Andrés	Zurita	\N	zurita.andres@gmail.com	+56988176967	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.027	2026-04-01 19:44:50.027
2809	Claudia		\N	clauauf@gmail.com	+56984365127	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.028	2026-04-01 19:44:50.028
2810	Germán		\N	ger.inal11@gmail.com	+56977997748	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.029	2026-04-01 19:44:50.029
2811	Inés	Recuero	\N	inesrecuero@gmail.com	+56991234567	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.03	2026-04-01 19:44:50.03
2812	Isabel	Alejandra Estrada	\N	ps.estrada@gmail.com	+56978871461	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.031	2026-04-01 19:44:50.031
2813	Ariana	Muñoz	\N	armunoz@alumnos.uai.cl	+56999392928	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.032	2026-04-01 19:44:50.032
2814	Maca		\N	macarena.rubioo@gmail.com	997777031	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.033	2026-04-01 19:44:50.033
2815	Ivan	V. S.	\N	inversionivs@gmail.com	+56995087576	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.033	2026-04-01 19:44:50.033
2816	Felipe		\N	fjeno.m@gmail.com	+56985710369	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.034	2026-04-01 19:44:50.034
2817	Jonathan	Jose Rodriguez	\N	jona.rodriguezt91@gmail.com	973740748	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.035	2026-04-01 19:44:50.035
2818	Fernando	Flores	\N	ffm_flores@hotmail.com	+56998424116	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.036	2026-04-01 19:44:50.036
2819	Constanza		\N	constanzaveracariga@gmail.com	+56973524431	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.036	2026-04-01 19:44:50.036
2820	Javiera	Rodríguez	\N	javiera.rodriguezs@usach.cl	+56964532869	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.037	2026-04-01 19:44:50.037
2821	Michael		\N	miruz3345@gmail.com	923841633	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.038	2026-04-01 19:44:50.038
2822	Nelson		\N	ingnortiz@gmail.com	+56935871259	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.039	2026-04-01 19:44:50.039
2823	Jorge	Restovic D.	\N	jrestovicdm@gmail.com	+56995213430	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.04	2026-04-01 19:44:50.04
2824	Claudio	Greve	\N	greveclaudo@gmail.com	+56991854028	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.041	2026-04-01 19:44:50.041
2825	Oscar		\N	napatoos@gmail.com	+56958924801	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.042	2026-04-01 19:44:50.042
2826	Miguel		\N	jimenez.m.miguel@gmail.com	+56981521954	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.043	2026-04-01 19:44:50.043
2827	Jennifer		\N	j.azuquinteros@gmail.com	+56982435028	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.043	2026-04-01 19:44:50.043
2828	Pecas		\N	Alemonti14@gmail.com	+56985959154	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.044	2026-04-01 19:44:50.044
2829	Antonino		\N	aalvear99@gmail.com	+56981887772	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.045	2026-04-01 19:44:50.045
2830	Jennifer		\N	arsotosanchez@gmail.com	+56986155069	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.046	2026-04-01 19:44:50.046
2831	Dayana	rojas	\N	rojas.espinoza.dayan@gmail.comr	+56921966971	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.046	2026-04-01 19:44:50.046
2832	Freddy		\N	freddyramirez39@yahoo.es	998063553	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.047	2026-04-01 19:44:50.047
2833	Carla	Bustos	\N	carla345.bustos@gmail.com	+56977958756	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.048	2026-04-01 19:44:50.048
2834	Francisco	Zelaya	\N	fignacio929@gmail.com	66641728	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.049	2026-04-01 19:44:50.049
2835	tomito		\N	tomidirceuz@gmail.com	951283161	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.049	2026-04-01 19:44:50.049
2836	Abiias		\N	abias.almonacidc@gmail.com	+56976461742	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.05	2026-04-01 19:44:50.05
2837	Camila	Angel	\N	camifer.angel@gmail.com	+56999110920	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.051	2026-04-01 19:44:50.051
2838	Sebastian		\N	rockseba01@hotmail.com	+56984211907	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.051	2026-04-01 19:44:50.051
2839	Marcelo		\N	marcelbass@gmail.com	+56982869079	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.052	2026-04-01 19:44:50.052
2840	Bernardo		\N	ubillaubilla@gmail.com	+56977645527	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.052	2026-04-01 19:44:50.052
2841	Carolina	Páez	\N	carolina.paez.m@gmail.com	+56984540248	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.053	2026-04-01 19:44:50.053
2842	Johnny	Yenes	\N	jbyenes@gmail.com	+56950985434	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.054	2026-04-01 19:44:50.054
2843	Paola		\N	paola.molina.a@gmail.com	+56999140802	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.055	2026-04-01 19:44:50.055
2844	Hector		\N	hletelier1993@gmail.com	+56930314518	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.055	2026-04-01 19:44:50.055
2845	Margarita___________________________		\N	Irma.carpediem@gmail.com	+56952585285	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.056	2026-04-01 19:44:50.056
2846	Diego	Fica	\N	diefiserrano@gmail.com	+56944017450	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.057	2026-04-01 19:44:50.057
2847	Ricardo		\N	ricardo.riquelme@outlook.com	+56954119309	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.057	2026-04-01 19:44:50.057
2848	Rodrigo	Duran	\N	rodrigodurancordova@gmail.com	+56942924754	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.058	2026-04-01 19:44:50.058
2849	Javiera	Peralta Prato	\N	javivalepera@gmail.com	+56953705815	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.059	2026-04-01 19:44:50.059
2850	Erika		\N	erika.fuentealba@gmail.com	+56981224467	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.059	2026-04-01 19:44:50.059
2851	Paloma	Andrea Valenzuela	\N	valenzuelapalomaa@gmail.com	+56978784636	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.06	2026-04-01 19:44:50.06
2852	Andrea	Dominguez	\N	adominguez@bcn.cl	+56985004706	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.061	2026-04-01 19:44:50.061
2853	Cote		\N	mariajose_19_69@hotmail.com	987406351	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.062	2026-04-01 19:44:50.062
2854	Joel.SAV_		\N	Svjv.201419@gmail.com	+56995290823	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.063	2026-04-01 19:44:50.063
2855	DMA		\N	mancilla.g.daniel@gmail.com	+56940411091	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.063	2026-04-01 19:44:50.063
2856	Fermin	Isla	\N	fislaurrutia@gmail.com	+56982743918	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.064	2026-04-01 19:44:50.064
2857	Rodrigo		\N	rodrigo.aviles1980@hotmail.com	+56954121893	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.065	2026-04-01 19:44:50.065
2858	Jorge	Miranda	\N	jorge.aguilera72@gmail.com	+56971339865	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.066	2026-04-01 19:44:50.066
2859	Tanchi		\N	certacuentas@gmail.com	+56972187457	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.067	2026-04-01 19:44:50.067
2860	Miguel	Andaur	\N	eandaurdesmond@gmail.com	+56999915022	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.067	2026-04-01 19:44:50.067
2861	Kevin		\N	kevu18@gmail.com	+56955110220	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.068	2026-04-01 19:44:50.068
2862	Carlos	Cancino	\N	carlos.cancinot@usach.cl	+56958457694	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.069	2026-04-01 19:44:50.069
2863	Andrés		\N	exkava@gmail.com	+56993620908	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.07	2026-04-01 19:44:50.07
2864	Jaime		\N	jfvillagrang@gmail.com	998877175	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.07	2026-04-01 19:44:50.07
2865	Rodrigo		\N	rodrigo.barrera@usach.cl	+56940296813	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.071	2026-04-01 19:44:50.071
2866	Alonso	Baeza	\N	alonssobaezag@gmail.com	+56972161102	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.072	2026-04-01 19:44:50.072
2867	Jaime	Patricio Beñaldo	\N	jbenaldo@gmail.com	+56991376573	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.072	2026-04-01 19:44:50.072
2868	Paula	Andrea	\N	paaulallanos@gmail.com	+56957754589	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.073	2026-04-01 19:44:50.073
2869	Fermín	Morales	\N	dmtorres90@gmail.com	+56932132198	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.074	2026-04-01 19:44:50.074
2870	Francisco	Mendoza	\N	mendozafra@gmail.com	+56977939107	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.074	2026-04-01 19:44:50.074
2871	Jaime	Antonio	\N	janrogo1412@hotmail.com	+56998563127	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.075	2026-04-01 19:44:50.075
2872	Cecilia		\N	ceciliasanhueza@hotmail.com	+56992451654	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.076	2026-04-01 19:44:50.076
2873	Hernán	Vielma	\N	hvielmae@gmail.com	+56994384279	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.076	2026-04-01 19:44:50.076
2874	Ismael	Maldonado	\N	ismael.maldonado@live.cl	+56968415316	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.077	2026-04-01 19:44:50.077
2875	Alex	Mellado	\N	alexsei21@gmail.com	990017281	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.078	2026-04-01 19:44:50.078
2876	Mario	D. Casanova	\N	mariocasanovaramirez@gmail.com	+56951282015	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.078	2026-04-01 19:44:50.078
2877	Coti		\N	cmcruzvial@gmail.com	+56942710746	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.079	2026-04-01 19:44:50.079
2878	Francisco	Javier Armijo	\N	francisco.j.armijo@gmail.com	+56930820964	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.08	2026-04-01 19:44:50.08
2879	Hernán		\N	hrivasf@hotmail.com	+56992183294	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.08	2026-04-01 19:44:50.08
2880	Ignacio		\N	igjowi@gmail.com	+56992404819	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.081	2026-04-01 19:44:50.081
2881	Ingeniería	De	\N	jose.prada@ingenieriadeincendios.com	+56972797263	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.082	2026-04-01 19:44:50.082
2882	Agustina		\N	ms.agus@gmail.com	+56956682326	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.082	2026-04-01 19:44:50.082
2883	Carol	Nunez	\N	carol.nunezg@gmail.com	+56942231160	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.083	2026-04-01 19:44:50.083
2884	Kevin		\N	kjva97@gmail.com	+56976508828	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.084	2026-04-01 19:44:50.084
2885	Vittorio	Capurro	\N	vcapurro56@gmail.com	+56986071957	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.084	2026-04-01 19:44:50.084
2886	Egor	Ulloa	\N	egorulloa@gmail.com	+56998223503	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.085	2026-04-01 19:44:50.085
2887	María	de la Concepción	\N	maria.concepcion09@gmail.com	+56957808417	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.086	2026-04-01 19:44:50.086
2888	Javier		\N	javier_pilasi@hotmail.com	+56972112339	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.086	2026-04-01 19:44:50.086
2889	JP		\N	jpom.chile@gmail.com	+56957384753	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.087	2026-04-01 19:44:50.087
2890	Patricio	Sepúlveda	\N	psepulvedahistoria@gmail.com	966888295	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.088	2026-04-01 19:44:50.088
2891	Pía		\N	pinkpoiioz@hotmail.com	+56976868959	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.088	2026-04-01 19:44:50.088
2892	Felipe		\N	feliperifo0147@gmail.com	93131609	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.089	2026-04-01 19:44:50.089
2893	Daniela	Paz Rojas	\N	dap.rojas@gmail.com	+56958290482	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.09	2026-04-01 19:44:50.09
2894	John	Alexander Leon	\N	johnaleleon@gmail.com	985896770	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.09	2026-04-01 19:44:50.09
2895	Danny		\N	dannylizamac@gmail.com	+56994567140	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.091	2026-04-01 19:44:50.091
2896	Betsy	Gonzalez	\N	betsybey@gmail.com	+56990191730	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.092	2026-04-01 19:44:50.092
2897	Ricardo		\N	isricardom@gmail.com	920366876	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.092	2026-04-01 19:44:50.092
2898	Abraham	Samit	\N	samitgallardoa@gmail.com	+56940491293	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.093	2026-04-01 19:44:50.093
2899	Juan	Diaz	\N	juan_cdp@hotmail.com	+56988471694	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.094	2026-04-01 19:44:50.094
2900	Plan		\N	oriettaff@yahoo.es	963199050	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.094	2026-04-01 19:44:50.094
2901	Gladys	Robledo	\N	gladysrobledo.modista@gmail.com	+56996472326	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.095	2026-04-01 19:44:50.095
2902	Christian		\N	ccastrochile@gmail.com	+56989423026	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.095	2026-04-01 19:44:50.095
2903	Christian	Gonzalez	\N	christianflo06@gmail.com	+56968352112	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.096	2026-04-01 19:44:50.096
2904	Benjamín		\N	benjaminalexis99@gmail.com	987621555	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.097	2026-04-01 19:44:50.097
2905	Francisco	Javier	\N	cano14@gmail.com	+56993271167	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.097	2026-04-01 19:44:50.097
2906	Nicolás	Alcayaga	\N	n.alcayaga.u@gmail.com	965646550	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.098	2026-04-01 19:44:50.098
2907	Veronica	Pérez	\N	chiquin13@gmail.com	+56987533807	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.099	2026-04-01 19:44:50.099
2908	Juan		\N	directorscelp@gmail.com	+56993972485	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.099	2026-04-01 19:44:50.099
2909	Marcelo	Pinto	\N	Pfeng1206@gmail.com	+56987478609	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.1	2026-04-01 19:44:50.1
2910	Eduardo		\N	ecerecedas@gmail.com	+56964952853	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.101	2026-04-01 19:44:50.101
2911	Nacho		\N	iaortiz@miuandes.cl	+56961908183	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.101	2026-04-01 19:44:50.101
2912	Vicente		\N	vichovargasrivas6@gmail.com	+56981380620	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.102	2026-04-01 19:44:50.102
2913	Cristian		\N	profesor.arellano@outlook.com	+56983840540	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.103	2026-04-01 19:44:50.103
2914	john		\N	Yurischcc@gmail.com	+56974084357	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.103	2026-04-01 19:44:50.103
2915	Teodoro	Araya	\N	teodoroaraya@hotmail.com	+56996961071	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.104	2026-04-01 19:44:50.104
2916	henis		\N	heniselizabeth42@gmail.com	964299811	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.105	2026-04-01 19:44:50.105
2917	Cristian		\N	c1101@hotmail.com	+56966173502	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.105	2026-04-01 19:44:50.105
2918	Juan		\N	portu106@gmail.com	+56922355754	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.106	2026-04-01 19:44:50.106
2919	Benjamin	Ignacio	\N	benjamin.rubio@live.com	+56955266753	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.107	2026-04-01 19:44:50.107
2920	Juan		\N	juan.huirimilla63@gmail.com	+56997765662	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.107	2026-04-01 19:44:50.107
2921	Maria	Jose Diaz	\N	pepitalive@hotmail.com	+56978787125	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.108	2026-04-01 19:44:50.108
2922	Cristóbal	Donoso	\N	cdonosoleyton@hotmail.com	+56989058488	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.108	2026-04-01 19:44:50.108
2923	Ariel		\N	areizin@fullprint.net	+56981391631	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.109	2026-04-01 19:44:50.109
2924	Juan	Carrasco Galindo	\N	carrascogalindo@yahoo.com	+56978067805	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.11	2026-04-01 19:44:50.11
2925	Claudio		\N	ch.reyesramos@gmail.com	+56990943850	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.11	2026-04-01 19:44:50.11
2926	Yerko		\N	yerkopalavicini@hotmail.com	+56989716793	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.111	2026-04-01 19:44:50.111
2927	Jaime	Prado	\N	jaimeprado5@hotmail.com	+56962297573	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.112	2026-04-01 19:44:50.112
2928	Carolina	Sepulveda	\N	csepulvedaubilla@gmail.com	+56954000970	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.112	2026-04-01 19:44:50.112
2929	Jaime	Arturo Medina	\N	jamedin63@gmail.com	+56956147242	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.113	2026-04-01 19:44:50.113
2930	Esteban	Ulloa	\N	esteban19.ulloa@gmail.com	+56934822519	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.114	2026-04-01 19:44:50.114
2931	Pablo		\N	pablocesarconsuegram@gmail.com	+56966372364	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.114	2026-04-01 19:44:50.114
2932	Pedro		\N	peyucoa@gmail.com	+56990474819	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.115	2026-04-01 19:44:50.115
2933	Moises		\N	ingnavalmoises@gmail.com	+56953403798	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.116	2026-04-01 19:44:50.116
2934	Santiago	Willie Montero	\N	santwilmont@hotmail.com	+56959988696	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.116	2026-04-01 19:44:50.116
2935	Jorge		\N	jorge.o.1995@gmail.com	+56984686174	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.117	2026-04-01 19:44:50.117
2936	Katy		\N	katherine.ruizabarzua1@gmail.com	+56966388611	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.118	2026-04-01 19:44:50.118
2937	Fernando	Barros	\N	fbarros.garcia@gmail.com	+56951897439	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.118	2026-04-01 19:44:50.118
2938	Luis	Villalobos	\N	luis.villalobos.herrera@gmail.com	+56956583345	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.119	2026-04-01 19:44:50.119
2939	Joel		\N	joelsolis1998@gmail.com	+56987003194	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.12	2026-04-01 19:44:50.12
2940	María	Angélica Cabello	\N	angelicacabello176@hotmail.com	+56968342500	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.12	2026-04-01 19:44:50.12
2941	Jonathan	Perez	\N	jjperezsalcedo1982@gmail.com	+56949687450	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.122	2026-04-01 19:44:50.122
2942	Luis	Ignacio Morales	\N	limbvet@yahoo.es	+56984996230	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.123	2026-04-01 19:44:50.123
2943	Kristhel		\N	kaes.12fr@gmail.com	+56967349628	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.123	2026-04-01 19:44:50.123
2944	Luis		\N	luiscifuentes31000@gmail.com	959269074	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.124	2026-04-01 19:44:50.124
2945	Javier		\N	Javierlabra9@gmail.com	+56985640792	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.125	2026-04-01 19:44:50.125
2946	Rodrigo		\N	Rodrigo.guzman.leiva@gmail.com	+56982095632	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.125	2026-04-01 19:44:50.125
2947	Henry	Jobel	\N	hjmq1982@gmail.com	+56988284934	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.126	2026-04-01 19:44:50.126
2948	SERVICIO	AUTOMOTRIZ CDF	\N	Automotrizcdf@gmail.con	+56957314067	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.127	2026-04-01 19:44:50.127
2949	Polard		\N	cpatagua415@gmail.com	56984673542	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.127	2026-04-01 19:44:50.127
2950	Yuleima		\N	yvivascl@gmail.com	+56935740701	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.128	2026-04-01 19:44:50.128
2951	Antonio		\N	tonof@live.cl	+56962406180	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.129	2026-04-01 19:44:50.129
2952	Coni		\N	constanza.gormaz3@gmail.com	+56997537087	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.13	2026-04-01 19:44:50.13
2953	Anabel		\N	anab199198@gmail.com	+58424996492849	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.13	2026-04-01 19:44:50.13
2954	stephanie		\N	Stephy_1245@hotmail.com	+56952461737	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.131	2026-04-01 19:44:50.131
2955	Francisco		\N	fpalomoazul7@gmail.com	+56961709608	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.132	2026-04-01 19:44:50.132
2956	Clara	Luz Henriquez	\N	drahenriquezfrings@gmail.com	+56998880187	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.132	2026-04-01 19:44:50.132
2957	Jose		\N	lacor2006@gmail.com	+56936725073	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.133	2026-04-01 19:44:50.133
2958	Bastian		\N	Bastian1.reyes@gmail.com	+56983688362	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.134	2026-04-01 19:44:50.134
2959	Maryorin		\N	maryorinvivas@gmail.com	+56931037980	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.135	2026-04-01 19:44:50.135
2960	Ana	Carmen Herrera	\N	anacarmenherrer@gmail.com	+56997923104	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.135	2026-04-01 19:44:50.135
2961	Elias	Valverde	\N	valverde.suazo@gmail.com	+56982392716	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.136	2026-04-01 19:44:50.136
2962	Maria		\N	mariajoseadonis@gmail.com	+56995930398	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.137	2026-04-01 19:44:50.137
2963	Hugo	Giovanni Soto	\N	hugo.sotova@gmail.com	+56992263311	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.137	2026-04-01 19:44:50.137
2964	Alan		\N	alanvillagran3@gmail.com	+56921892226	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.138	2026-04-01 19:44:50.138
2965	Claudio	Acevedo	\N	felythiele20@gmail.com	+56984714361	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.139	2026-04-01 19:44:50.139
2966	Ánggela	Barrientos Retamal	\N	anggela.br@gmail.com	+56990929351	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.139	2026-04-01 19:44:50.139
2967	Rox		\N	roxana.comite@gmail.com	+56977836514	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.14	2026-04-01 19:44:50.14
2968	Yerko		\N	yilmor.92@gmail.com	+56988883371	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.141	2026-04-01 19:44:50.141
2969	Luis	molina	\N	lmolinav88@gmail.com	+56928191069	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.142	2026-04-01 19:44:50.142
2970	Paula		\N	pagutierrez29@hotmail.com	+56992788627	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.142	2026-04-01 19:44:50.142
2971	Felipe	Andrés Baéz	\N	felipebaezriffo@gmail.com	+56993104848	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.143	2026-04-01 19:44:50.143
2972	Daniel		\N	da.dominguez@uandresbello.edu	+56945891875	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.144	2026-04-01 19:44:50.144
2973	Joan	Luis	\N	joanluismora@gmail.com	+56959388721	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.145	2026-04-01 19:44:50.145
2974	Francisco		\N	ecaceres3090@gmail.com	+56939298678	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.145	2026-04-01 19:44:50.145
2975	rpnautica		\N	rapv46@gmail.com	+56993265296	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.146	2026-04-01 19:44:50.146
2976	Josnelly		\N	josnelly_m@hotmail.com	+56967526790	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.147	2026-04-01 19:44:50.147
2977	Ana	Maria Higuera	\N	anahiguera559@hotmail.com	+56966239827	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.148	2026-04-01 19:44:50.148
2978	Juan		\N	juanms2314@gmail.com	+56977154371	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.148	2026-04-01 19:44:50.148
2979	Enrique	Medina	\N	emedinam11@gmail.com	+56993682888	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.149	2026-04-01 19:44:50.149
2980	Hugo	g	\N	hugo.essenza@gmail.com	+56993365976	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.15	2026-04-01 19:44:50.15
2981	Antonio	Otonel	\N	aozulu@gmail.com	+56968446195	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.151	2026-04-01 19:44:50.151
2982	Martin		\N	navarrete.martin@gmail.com	+56994440708	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.151	2026-04-01 19:44:50.151
2983	Franquito	Valentino	\N	fcocuadra@hotmail.com	+56933252002	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.152	2026-04-01 19:44:50.152
2984	Nora	Elena Molina	\N	nemolina200328@gmail.com	+56988324232	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.152	2026-04-01 19:44:50.152
2985	Darwin	Acevedo	\N	darwinacevedog23@gmail.com	+56956345994	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.153	2026-04-01 19:44:50.153
2986	Caro		\N	ctco1800@hotmail.com	+56944077161	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.153	2026-04-01 19:44:50.153
2987	Rodrigo		\N	roalcega@gmail.com	+56994691261	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.154	2026-04-01 19:44:50.154
2988	Victoria		\N	vvillanuevajim@gmail.com	+56963727156	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.154	2026-04-01 19:44:50.154
2989	maria		\N	trinitarias79@gmail.com	+56988960721	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.155	2026-04-01 19:44:50.155
2990	Pablo		\N	inversioneslabsaspa@gmail.com	+56964130159	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.156	2026-04-01 19:44:50.156
2991	Miguel		\N	miguelangelhp9@hotmail.com	+56985143659	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.156	2026-04-01 19:44:50.156
2992	Hector		\N	hsubterra@hotmail.com	+56967103870	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.157	2026-04-01 19:44:50.157
2993	John	Erices	\N	jrerices@hotmail.com	999399513	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.158	2026-04-01 19:44:50.158
2994	Tatiana		\N	stephan777_85@hotmail.com	+56974539251	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.158	2026-04-01 19:44:50.158
2995	Pedro		\N	pedro.arancibia.c@gmail.com	+56940292234	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.159	2026-04-01 19:44:50.159
2996	MElena	del Valle	\N	medvy2006@gmail.com	+56986735876	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.159	2026-04-01 19:44:50.159
2997	Eduardo		\N	edumadariagapinto@gmail.com	+56989878604	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.16	2026-04-01 19:44:50.16
2998	Daniel	Manríquez	\N	daniel_manriques@hotmail.com	+56988251395	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.161	2026-04-01 19:44:50.161
2999	Stephany		\N	sconleys@gmail.com	+56999697300	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.162	2026-04-01 19:44:50.162
3000	Jacinta		\N	jacintafanjul@yahoo.es	56993389705	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.163	2026-04-01 19:44:50.163
3001	Hugo		\N	hmellaisla@gmail.com	+56999999999	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.163	2026-04-01 19:44:50.163
3002	Emanuel		\N	emanuel.silvach@gmail.com	+56975990205	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.164	2026-04-01 19:44:50.164
3003	Loreley		\N	crucesastudillomaria@gmail.com	998205355	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.165	2026-04-01 19:44:50.165
3004	sirio		\N	luisrojasganzur@gmail.com	+56958564916	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.165	2026-04-01 19:44:50.165
3005	Adriana		\N	apino912@gmail.com	+56940016800	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.166	2026-04-01 19:44:50.166
3006	Sylvia	Fuenzalida	\N	sfuenza14@hotmail.com	+56995293821	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.167	2026-04-01 19:44:50.167
3007	Arquitectura	construccion	\N	cahupaa@gmail.com	+56948010778	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.167	2026-04-01 19:44:50.167
3008	Patricia		\N	patricia.pimentelg@gmail.com	+56981584297	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.168	2026-04-01 19:44:50.168
3009	Santiago		\N	sanpenn@gmail.com	+56990781755	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.169	2026-04-01 19:44:50.169
3010	P		\N	pegonzasel2@gmail.com	+56935238048	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.169	2026-04-01 19:44:50.169
3011	Georgina		\N	ahumadageorgina8@gmail.com	+56974160759	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.17	2026-04-01 19:44:50.17
3012	Urzula		\N	belmar_01@yahoo.es	+56998016328	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.171	2026-04-01 19:44:50.171
3013	Rodolfo	Vaccarezza	\N	rvaccarezza@gmail.com	+56976591131	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.172	2026-04-01 19:44:50.172
3014	Christian	Parodi	\N	christianparodi@gmail.com	+56942072395	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.172	2026-04-01 19:44:50.172
3015	Bonny		\N	bonnyorellana70@gmail.com	+56967487381	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.173	2026-04-01 19:44:50.173
3016	Pedro	Ramirez	\N	prg.ramirez@gmail.com	+56981703202	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.174	2026-04-01 19:44:50.174
3017	Mirella		\N	Gerencia@cenpadech.cl	990896542	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.174	2026-04-01 19:44:50.174
3018	Sergio		\N	antonio.retamales37@gmail.com	+56950533671	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.175	2026-04-01 19:44:50.175
3019	maria		\N	maria.jose.1984@hotmail.com	+56967593717	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.176	2026-04-01 19:44:50.176
3020	Matías	Ernesto Segovia	\N	matiase.segovia@gmail.com	+56983845003	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.176	2026-04-01 19:44:50.176
3021	Yobanina		\N	yobanina@gmail.com	56982321795	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.177	2026-04-01 19:44:50.177
3022	Janett		\N	janett_mn@hotmail.com	+56998270260	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.177	2026-04-01 19:44:50.177
3023	Alejandro	Manzur	\N	amanzurpizarro@gmail.com	+56979470722	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.178	2026-04-01 19:44:50.178
3024	Victor	Manuel	\N	mv.manuel17@gmail.com	930981102	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.179	2026-04-01 19:44:50.179
3025	Nathy		\N	natyvanegasarias@gmail.com	+56979601008	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.179	2026-04-01 19:44:50.179
3026	Paulo	Azasel	\N	sir_azasel@hotmail.com	+56986355717	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.18	2026-04-01 19:44:50.18
3027	Juan	Camilo	\N	juancamilogalaz@yahoo.es	+56993831132	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.181	2026-04-01 19:44:50.181
3028	Clau		\N	cmichea@codelco.cl	+56991425095	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.182	2026-04-01 19:44:50.182
3029	Jacqueline	Andrea	\N	andreacontreras84@hotmail.com	+56978541052	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.182	2026-04-01 19:44:50.182
3030	Alejandra		\N	alejandracontreras53@gmail.com	+56966028005	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.183	2026-04-01 19:44:50.183
3031	Marcelo		\N	bodafi@hotmail.cl	961246073	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.183	2026-04-01 19:44:50.183
3032	Luis	Bernales	\N	lebernales@gmail.com	+56971288908	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.185	2026-04-01 19:44:50.185
3033	Ignacio	calderon	\N	icalderon245@gmail.com	+56956745485	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.185	2026-04-01 19:44:50.185
3034	Nati		\N	naaaaty.v@gmail.com	933855425	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.186	2026-04-01 19:44:50.186
3035	Maria	Cecilia Lobos	\N	mariacecilialobosc@gmail.com	+56996568411	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.186	2026-04-01 19:44:50.186
3036	Fernando	Hernández	\N	fdo.hernandez62@hotmail.com	+56975375054	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.187	2026-04-01 19:44:50.187
3037	Robert		\N	erojaslamas@gmail.com	958584912	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.188	2026-04-01 19:44:50.188
3038	Lucas		\N	imlucastrike@gmail.com	+56995541726	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.188	2026-04-01 19:44:50.188
3039	Juan	Carlos Riveros	\N	juank_576@hotmail.com	+56988343835	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.189	2026-04-01 19:44:50.189
3040	Alejandra	Gonzalez	\N	alitagonzalezdonoso@gmail.com	+56968488951	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.19	2026-04-01 19:44:50.19
3041	Yoselin		\N	Yoselin.128@gmail.com	+56932653764	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.19	2026-04-01 19:44:50.19
3042	Damaris		\N	damarisinayao@gmail.com	+56944614141	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.191	2026-04-01 19:44:50.191
3043	Patricia		\N	patriciavargasp@gmail.com	+56920296328	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.192	2026-04-01 19:44:50.192
3044	Edwin		\N	ehv1992@gmail.com	+56998535770	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.192	2026-04-01 19:44:50.192
3045	Zulay	Coromoto Amaya	\N	zulydiesel@gmail.com	96611807	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.193	2026-04-01 19:44:50.193
3046	Tomás		\N	tomas@fraccional.cl	+56977075799	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.194	2026-04-01 19:44:50.194
3047	Alicia	Mundaca	\N	alyso18@yahoo.com	+56995014279	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.194	2026-04-01 19:44:50.194
3048	M	Lufi	\N	lufinorambuena@gmail.com	+56987008938	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.195	2026-04-01 19:44:50.195
3049	Nicolas		\N	nicomelendez@gmail.com	975891959	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.196	2026-04-01 19:44:50.196
3050	Cpinsil		\N	ceciliapinochetsilva@gmail.com	+56965710768	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.196	2026-04-01 19:44:50.196
3051	Actividades	Con	\N	Inesandreah@gmail.com	920218246	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.197	2026-04-01 19:44:50.197
3052	Pedro	Alfaro	\N	pedroalfaroorellana@gmail.com	+56977948718	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.198	2026-04-01 19:44:50.198
3053	angela		\N	katalinafajardo9@gmail.com	+56967280579	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.198	2026-04-01 19:44:50.198
3054	Ivette	Paola Ramírez	\N	defvetita1@hotmail.com	+56984094973	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.199	2026-04-01 19:44:50.199
3055	Maria	Angelica Ramirez	\N	angelica_1994@hotmail.cl	+56964384079	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.2	2026-04-01 19:44:50.2
3056	Paulina		\N	viruent@hotmail.com	990675700	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.2	2026-04-01 19:44:50.2
3057	Lilian	Lissette Tardon	\N	lilianlissette@hotmail.cl	+56974488674	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.201	2026-04-01 19:44:50.201
3058	Karina	Maureira	\N	karymau@gmail.com	+56995136555	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.202	2026-04-01 19:44:50.202
3059	www.reingenieriafinanciera.cl	Estudio	\N	mauricio.martinez@reingenieriafinanciera.cl	+56986760385	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.203	2026-04-01 19:44:50.203
3060	Pablo	Andres Reyes	\N	pabloandres25@hotmail.com	+56934320725	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.203	2026-04-01 19:44:50.203
3061	Anthony		\N	hangarcia24@gmail.com	+56986003036	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.204	2026-04-01 19:44:50.204
3062	Silvana		\N	tm_boccardo@yahoo.es	+56975787308	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.205	2026-04-01 19:44:50.205
3063	Mariela	González	\N	Mariegonzalez.industrial@gmail.com	+56942286428	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.205	2026-04-01 19:44:50.205
3064	miguel	mateos tributo	\N	ricardomaturanan@hotmail.com	+56991596428	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.206	2026-04-01 19:44:50.206
3065	Cote		\N	jorquera.mj@gmail.com	+56983330349	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.207	2026-04-01 19:44:50.207
3066	Christian	Contreras	\N	christiancontrerasnavarro@gmail.com	+56989349011	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.207	2026-04-01 19:44:50.207
3067	Damarisse		\N	damarisse.sas@gmail.com	+56963746260	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.208	2026-04-01 19:44:50.208
3068	Gabriel		\N	gabrielcdos@gmail.com	+56931917489	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.209	2026-04-01 19:44:50.209
3069	Juan	Luis Fernadez	\N	fernandezencina@gmail.com	+56981743629	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.209	2026-04-01 19:44:50.209
3070	Nico	Alarcón Conferencias	\N	nicolas.alarconv@gmail.com	+56977064482	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.21	2026-04-01 19:44:50.21
3071	Juan	Eduardo	\N	juan.burgos.salazar@gmail.com	+56995505164	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.211	2026-04-01 19:44:50.211
3072	𝕹𝖎𝖈𝖔𝖑𝖆𝖘		\N	nicolasperalta791@gmail.com	+56990898677	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.211	2026-04-01 19:44:50.211
3073	KANGATRAINING	| GIMNASIA POST PARTO JUNTO A TU	\N	profesoranataliaescobar@gmail.com	+56974661684	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.212	2026-04-01 19:44:50.212
3074	Carlos		\N	cagutie49@yahoo.es	+56999572354	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.213	2026-04-01 19:44:50.213
3075	María	José	\N	cotsanchezm@gmail.com	+56992270763	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.213	2026-04-01 19:44:50.213
3076	Angello		\N	angello.llorente.m@gmail.com	+56973611893	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.214	2026-04-01 19:44:50.214
3077	Edgar	Berbesi	\N	edgar.berbesi@gmail.com	963150793	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.215	2026-04-01 19:44:50.215
3078	Silvia		\N	silviapalmisano71@hotmail.com	+56991394475	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.215	2026-04-01 19:44:50.215
3079	Candia		\N	candia86@hotmail.com	+56979976057	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.216	2026-04-01 19:44:50.216
3080	Seba		\N	seb.construcciones@gmail.com	975690758	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.216	2026-04-01 19:44:50.216
3081	MVictoria		\N	tola0705@googlemail.com	+56995458422	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.217	2026-04-01 19:44:50.217
3082	olga	salcedo	\N	olgasalcedo0608@gmail.com	+56994944147	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.218	2026-04-01 19:44:50.218
3083	Marcelo		\N	bahiainglesaltda@gmail.com	+56989028309	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.218	2026-04-01 19:44:50.218
3084	Alejandro	Jose	\N	alej_gut@hotmail.com	+56935421678	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.219	2026-04-01 19:44:50.219
3085	Felipe	Valdes Del	\N	valdesdelrio@hotmail.com	+56935122116	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.22	2026-04-01 19:44:50.22
3086	Francisco		\N	akysoes@gmail.com	+56986624715	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.221	2026-04-01 19:44:50.221
3087	Mauricio	Laverhnie	\N	mauricio.lavergnie@yahoo.com	+56998215082	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.221	2026-04-01 19:44:50.221
3088	Patricia		\N	paty.quintero6@gmail.com	+56948601213	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.222	2026-04-01 19:44:50.222
3089	Jose	Francisco	\N	aguilaring@gmail.com	+56975796319	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.223	2026-04-01 19:44:50.223
3090	Felipe		\N	faquintas@gmail.com	+56995146529	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.223	2026-04-01 19:44:50.223
3091	Tania		\N	ainatmapu@hotmail.com	+56987258088	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.224	2026-04-01 19:44:50.224
3092	Jimena	Sepúlveda	\N	titadebarrena@gmail.com	+56949969799	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.225	2026-04-01 19:44:50.225
3093	Hernan		\N	chacon.acuna.hernan@gmail.com	+56942739796	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.226	2026-04-01 19:44:50.226
3094	Gracias		\N	marniebla@gmail.com	+56978884606	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.227	2026-04-01 19:44:50.227
3095	Victor	Caceres	\N	ivancondor_19@hotmail.com	+56977634005	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.229	2026-04-01 19:44:50.229
3096	Barbara		\N	bmezae@gmail.com	978461074	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.23	2026-04-01 19:44:50.23
3097	Carlos		\N	carlosrodriguez4@hotmail.com	+56951135563	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.249	2026-04-01 19:44:50.249
3098	Gladys	Villalobos	\N	gvm1165@gmail.com	79401244	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.267	2026-04-01 19:44:50.267
3099	Esteban		\N	jaraquemadajr@hotmail.com	+56977796342	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.269	2026-04-01 19:44:50.269
3100	Gustavo	Adolfo	\N	gpagep@gmail.com	+56972124151	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.27	2026-04-01 19:44:50.27
3101	Catherine	Aguila	\N	cata_2105@hotmail.com	+56993676850	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.271	2026-04-01 19:44:50.271
3102	Marcelo	Herrera	\N	marcelo.b.ch@gmail.com	+569953386794	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.271	2026-04-01 19:44:50.271
3103	Felipe	Prieto	\N	fprieto1962@gmail.com	+56993461638	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.272	2026-04-01 19:44:50.272
3104	Claudio	Bravo	\N	claudiob77@hotmail.com	+56971861800	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.273	2026-04-01 19:44:50.273
3105	WFCG		\N	wilsonfelipe6@gmail.com	+56968159361	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.273	2026-04-01 19:44:50.273
3106	Cla	Pi	\N	claudiopintoabudahan@gmail.com	+56985001864	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.274	2026-04-01 19:44:50.274
3107	Piia		\N	pia.briones.s@gmail.com	+56974520474	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.275	2026-04-01 19:44:50.275
3108	Ignacio		\N	nacho-h@hotmail.com	+56987214819	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.275	2026-04-01 19:44:50.275
3109	Erika	Alejandra Arellano	\N	eaarellanob@hotmail.com	+56989368444	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.276	2026-04-01 19:44:50.276
3110	Yael		\N	yaeltona@gmail.com	+56998130490	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.277	2026-04-01 19:44:50.277
3111	Giorgios		\N	m_giorgios6@hotmail.com	+56997310223	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.277	2026-04-01 19:44:50.277
3112	Pame	A	\N	pamegonzalezi@gmail.com	976178011	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.278	2026-04-01 19:44:50.278
3113	Claudio		\N	claudiosaez2@hotmail.com	+56982733505	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.278	2026-04-01 19:44:50.278
3114	Daniel		\N	danielenriquegd@gmail.com	+56996638099	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.279	2026-04-01 19:44:50.279
3115	Denise		\N	denisealvaradoh@hotmail.com	+56991452031	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.279	2026-04-01 19:44:50.279
3116	Marla		\N	edmarlyjose21@gmail.com	+56941359525	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.28	2026-04-01 19:44:50.28
3117	Maria	Carolina Zerené	\N	macazerhiz@gmail.com	+56997136539	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.281	2026-04-01 19:44:50.281
3118	Loreto	Vera	\N	loreto.veraperez@outlook.com	+56989210668	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.281	2026-04-01 19:44:50.281
3119	Artemio		\N	artemio.silva.lopez@gmail.com	+56995159492	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.282	2026-04-01 19:44:50.282
3120	Artemio		\N	vicenteyeomans.ar@gmail.com	+56947622914	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.283	2026-04-01 19:44:50.283
3121	Ruben		\N	rubernllerena1@gmail.com	+56967522338	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.283	2026-04-01 19:44:50.283
3122	TOMAS	ARELLANO	\N	tarellanoalvarado@gmail.com	+56993658099	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.285	2026-04-01 19:44:50.285
3123	Alvaro	Rodríguez	\N	alvarorodriguezbenavides@gmail.com	+56986014948	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.286	2026-04-01 19:44:50.286
3124	Carlos		\N	victoriamedals@gmail.com	56999610246	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.286	2026-04-01 19:44:50.286
3125	Cristian	Rodrigo	\N	jcletelier69@gmail.com	+56981596469	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.287	2026-04-01 19:44:50.287
3126	Orlando		\N	orlandopacheco1983@gmail.com	+56977088833	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.288	2026-04-01 19:44:50.288
3127	Marta	Tundidor	\N	tundidorcastellanos@gmail.com	+56961573061	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.288	2026-04-01 19:44:50.288
3128	Aldo	Ramello	\N	aramello@paradiso.cl	+56982281690	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.289	2026-04-01 19:44:50.289
3129	Marta	Díaz	\N	martadiazmoya@yahoo.es	+56994867281	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.29	2026-04-01 19:44:50.29
3130	Cristopher		\N	ceih2601@gmail.com	+56954134998	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.29	2026-04-01 19:44:50.29
3131	Mj		\N	jorquera.mj@gmail.con	+56983330	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.291	2026-04-01 19:44:50.291
3132	Cristopher	Nilo	\N	crisnilo@gmail.com	+56940064453	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.292	2026-04-01 19:44:50.292
3133	Rodó		\N	Rodolfo.silva@alumnos.sum.cl	+56978880157	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.292	2026-04-01 19:44:50.292
3134	Anabella	Linares	\N	anabellin09@hotmail.com	+56996935241	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.293	2026-04-01 19:44:50.293
3135	Catalina		\N	oficina.catalina@gmail.com	+56985305546	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.294	2026-04-01 19:44:50.294
3136	Sergio		\N	sergio.marguirot@gmail.c	+56958531028	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.294	2026-04-01 19:44:50.294
3137	Danilo	Leiva	\N	dano.leiva07@gmail.com	+56954142078	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.295	2026-04-01 19:44:50.295
3138	Gonzalo	Ortiz	\N	gonzalo2097o@gmail.com	+5645304007	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.296	2026-04-01 19:44:50.296
3139	E		\N	evitacuevas@gmail.com	992753567	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.297	2026-04-01 19:44:50.297
3140	claudia		\N	clauele.ablu@gmail.com	+56999146499	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.297	2026-04-01 19:44:50.297
3141	Marcelo		\N	marcelocarrasco.c@gmail.com	+56977903357	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.298	2026-04-01 19:44:50.298
3142	Karen		\N	Fdez.karen@gmail.com	+56988860536	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.299	2026-04-01 19:44:50.299
3143	Carolina	Troncoso	\N	troncoso.carolina@gmail.com	+56997995442	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.299	2026-04-01 19:44:50.299
3144	Sebastián	Eduardo	\N	sebarq1000@gmail.com	+56946977661	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.3	2026-04-01 19:44:50.3
3145	Patricio	Adrian	\N	gerencia@naturalherbal.cl	+56996431541	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.301	2026-04-01 19:44:50.301
3146	Michu	Brioni	\N	mbrionesf@hotmail.com	+56936743683	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.302	2026-04-01 19:44:50.302
3147	Sebastian	Vera	\N	sebastian.alberto.vf@gmail.com	+56921914401	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.302	2026-04-01 19:44:50.302
3148	Ana		\N	albamedina15@hotmail.com	+56992838199	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.303	2026-04-01 19:44:50.303
3149	Freddy	Rolando	\N	freddyrolandomondragonherrera@gmail.com	+56945940589	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.304	2026-04-01 19:44:50.304
3150	Abi		\N	mvsaenger@gmail.com	+56993367559	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.304	2026-04-01 19:44:50.304
3151	Juan		\N	juan.carlos.lepileo@gmail.com	+56951123583	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.305	2026-04-01 19:44:50.305
3152	Javier		\N	jiacevedof@gmail.com	+56993597877	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.306	2026-04-01 19:44:50.306
3153	Pierre	Sauré	\N	pierresaure@gmail.com	+56988691137	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.306	2026-04-01 19:44:50.306
3154	Nicole	Cornejo	\N	nicolecornejo@outlook.cl	+56996373607	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.307	2026-04-01 19:44:50.307
3155	Jacqueline		\N	jacco_2005@outlook.com	+56997675194	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.308	2026-04-01 19:44:50.308
3156	car0carocaro		\N	ruka.zuhause@gmail.com	+56959837804	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.308	2026-04-01 19:44:50.308
3157	Claudia		\N	claucampo22@gmail.com	+56990883555	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.309	2026-04-01 19:44:50.309
3158	Yerko	Mauricio Valdivia	\N	yerko.valdivia@live.com	+56982429439	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.31	2026-04-01 19:44:50.31
3159	jacks7		\N	jacquelinne.tpg@gmail.com	+56966259902	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.31	2026-04-01 19:44:50.31
3160	Celinda	Lara	\N	celaraduque@gmail.com	+56999042768	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.311	2026-04-01 19:44:50.311
3161	Carla		\N	carlaleivaarmijo@yahoo.es	+56988428156	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.312	2026-04-01 19:44:50.312
3162	Ulises	Andrés Varas	\N	ulises.varas@gmail.com	+56998020969	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.312	2026-04-01 19:44:50.312
3163	María	Pía Zúñiga	\N	mpzmonks@gmail.com	+56968999635	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.313	2026-04-01 19:44:50.313
3164	Omar		\N	omar.sellao@gmail.com	999999999	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.314	2026-04-01 19:44:50.314
3165	Paula		\N	pcofresm@gmail.com	992362835	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.315	2026-04-01 19:44:50.315
3166	Victor	Danilo Pereira	\N	Profe.Victorp@gmail.com	+56965616837	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.315	2026-04-01 19:44:50.315
3167	Sandra	González	\N	gonzalezalvarez.sandraangelica@gmail.com	+56937408383	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.316	2026-04-01 19:44:50.316
3168	Alfredo	Gomez	\N	agz3127@gmail.com	+56993271188	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.317	2026-04-01 19:44:50.317
3169	Uka	Von Jentschyk	\N	ukancino@gmail.com	+56964298836	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.317	2026-04-01 19:44:50.317
3170	Cʀɪsᴛᴛɪ	J. Cᴀʀʀᴀsᴄᴏ	\N	cristtina.cs@gmail.com	+56975445322	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.318	2026-04-01 19:44:50.318
3171	Domingo		\N	dvelasco22@hotmail.com	+56962553033	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.319	2026-04-01 19:44:50.319
3172	Rodolfo	Diaz	\N	hxs.electronica@gmail.com	+569	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.319	2026-04-01 19:44:50.319
3173	Jose	Pablo	\N	josepablocarrasco@gmail.com	+56994355361	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.32	2026-04-01 19:44:50.32
3174	carlos		\N	cdvb2002@hotmail.com	+56999375186	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.321	2026-04-01 19:44:50.321
3175	Ricardo		\N	rsr1963@yahoo.es	+56974316217	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.322	2026-04-01 19:44:50.322
3176	Jose		\N	Joseguilletmo.torrescarrillo@gmail.com	+56968652796	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.323	2026-04-01 19:44:50.323
3177	Nadia	López	\N	nadia.lopez.guerra@gmail.com	+56959950803	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.323	2026-04-01 19:44:50.323
3178	Eloy		\N	carlosreype@hotmail.com	+56999598788	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.324	2026-04-01 19:44:50.324
3179	felipecovarrubias		\N	felipe.covarrubias@gmail.com	+56965637418	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.325	2026-04-01 19:44:50.325
3180	VML		\N	v.lilloacevedo@gmail.cl	+56941695471	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.325	2026-04-01 19:44:50.325
3181	Federico		\N	luriadracul@gmail.com	988297365	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.326	2026-04-01 19:44:50.326
3182	Eli		\N	casaaccion@gmail.com	+56986505182	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.327	2026-04-01 19:44:50.327
3183	Williams	Sebastian Rivas	\N	williamsrivas98@gmail.com	66808707	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.327	2026-04-01 19:44:50.327
3184	Mundo		\N	morenocastro@gmail.com	+56992151881	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.328	2026-04-01 19:44:50.328
3185	Paola		\N	p_valevc@hotmail.com	+56975461192	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.329	2026-04-01 19:44:50.329
3186	Seba		\N	sebastianramireze@gmail.com	985937826	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.329	2026-04-01 19:44:50.329
3187	Jesus	la	\N	jeslaro87@gmail.com	+56948635490	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.33	2026-04-01 19:44:50.33
3188	Ayleen		\N	ayleen.carolinaescobedo@gmail.com	+56959537617	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.331	2026-04-01 19:44:50.331
3189	Daniel		\N	daniel.contreras.riquelme@gmail.com	+56998781200	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.331	2026-04-01 19:44:50.331
3190	EJ		\N	estelle.jourdan@gmail.com	992215102	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.332	2026-04-01 19:44:50.332
3191	Guillermo	Araya	\N	guiaraya@gmail.com	+56999990654	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.333	2026-04-01 19:44:50.333
3192	Ana	Maria Escobar	\N	amescobar_2000@hotmail.com	+56961688154	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.334	2026-04-01 19:44:50.334
3193	Jesús		\N	jesus.castro.r@gmail.com	+56995937871	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.334	2026-04-01 19:44:50.334
3194	Patty		\N	pfajardo@integra.cl	+56996119119	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.335	2026-04-01 19:44:50.335
3195	Andres		\N	adiazcl@gmail.com	+56995115623	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.336	2026-04-01 19:44:50.336
3196	Anyenett	Bachmann	\N	anybachmann@gmail.com	+56990931453	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.336	2026-04-01 19:44:50.336
3197	Sebastian		\N	maldonados795@gmail.com	+56956594437	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.337	2026-04-01 19:44:50.337
3198	Jose		\N	jose.martineza@yahoo.es	+56992004996	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.338	2026-04-01 19:44:50.338
3199	Ángel		\N	angelfcoponce@gmail.com	+56990763431	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.338	2026-04-01 19:44:50.338
3200	Paz		\N	paz_macaya@hotmail.com	+56991323453	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.339	2026-04-01 19:44:50.339
3201	Diego		\N	diaburto@gmail.com	+56951081276	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.34	2026-04-01 19:44:50.34
3202	Ángel		\N	agodoy79@yahoo.com	+56977905019	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.341	2026-04-01 19:44:50.341
3203	Lorena		\N	lorena.body@gmail.com	+56995840876	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.341	2026-04-01 19:44:50.341
3204	José	Luis Álvarez	\N	josealvarezm@gmail.com	+56984667971	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.342	2026-04-01 19:44:50.342
3205	YADIN		\N	yescares@gmail.com	+56973656617	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.344	2026-04-01 19:44:50.344
3206	Gerardo		\N	Gcamus74@gmail.com	+56999911523	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.345	2026-04-01 19:44:50.345
3207	Jorge	A. Manríquez	\N	jorge.manriquez.h@gmail.com	+56992506577	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.346	2026-04-01 19:44:50.346
3208	Esteban		\N	estebanulloarifo@gmail.com	+56963732605	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.346	2026-04-01 19:44:50.346
3209	Alfredo	Eduardo Martínez	\N	a.martinez.guerrero91@gmail.com	+56995554109	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.347	2026-04-01 19:44:50.347
3210	Yerdi	Tumala	\N	radekuz@yahoo.es	+56996921266	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.348	2026-04-01 19:44:50.348
3211	Fabiola	Rojas	\N	scoobycl@gmail.com	+56961723303	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.348	2026-04-01 19:44:50.348
3212	sebastian		\N	smandiolaa@gmail.com	+56940584784	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.349	2026-04-01 19:44:50.349
3213	Eduardo	Cardenas	\N	ecardenas@outlook.cl	+56964190560	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.35	2026-04-01 19:44:50.35
3214	Paula		\N	sebpab@gmail.com	+56982479895	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.351	2026-04-01 19:44:50.351
3215	Sergio	Erices	\N	sergioerices@gmail.com	+56961578152	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.351	2026-04-01 19:44:50.351
3216	Alexis		\N	alexiscortes@gmail.com	+56984399756	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.352	2026-04-01 19:44:50.352
3217	Tatiana		\N	tatianatroncoso@gmail.com	+56965677338	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.353	2026-04-01 19:44:50.353
3218	Daniel		\N	dgarridovasquez@gmail.com	+56961959838	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.353	2026-04-01 19:44:50.353
3219	Roberto		\N	rmunozp@fen.uchile.cl	+56982995206	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.354	2026-04-01 19:44:50.354
3220	Marcela	Migliaro	\N	marcela.migliaro@gmail.com	+56965074076	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.355	2026-04-01 19:44:50.355
3221	Adolfo	Gormaz	\N	adolfogos4@hoymail.com	+56971256530	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.355	2026-04-01 19:44:50.355
3222	Eduardo	Pavez	\N	pavezeduardo722@gmail.com	+56949311677	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.356	2026-04-01 19:44:50.356
3223	Delicias		\N	heydidulce@gmail.com	+56966684087	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.357	2026-04-01 19:44:50.357
3224	Gilda		\N	gpavat@hotmail.com	+56985961857	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.358	2026-04-01 19:44:50.358
3225	LHA		\N	lhardy@grupointer.cl	+56976683424	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.358	2026-04-01 19:44:50.358
3226	Manuel	Cortez	\N	manuel.cortez.castillo@hotmail.com	+56973987358	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.359	2026-04-01 19:44:50.359
3227	Eliane	Ballestero	\N	elianeballestero0@gmail.com	+56936531696	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.359	2026-04-01 19:44:50.359
3228	Pierina		\N	Pierina.urbani@yahoo.es	+56957887023	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.36	2026-04-01 19:44:50.36
3229	Bladimir		\N	bladimirdurangos@gmail.com	986893716	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.361	2026-04-01 19:44:50.361
3230	Piero		\N	piero.costar@gmail.com	+56997326836	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.361	2026-04-01 19:44:50.361
3231	Alex	Hernan	\N	alex.novoa@gmail.com	+56953307566	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.362	2026-04-01 19:44:50.362
3232	Viviana		\N	guajardoviviana@gmail.com	+56992761348	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.362	2026-04-01 19:44:50.362
3233	Claudia		\N	cmellibosky@gmail.com	+56993203094	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.363	2026-04-01 19:44:50.363
3234	Christian		\N	crra_1991@hotmail.com	+56977428600	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.363	2026-04-01 19:44:50.363
3235	Gianfranco	Enzo Cossani	\N	gianfranco753+tfin@gmail.com	+56942541587	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.364	2026-04-01 19:44:50.364
3236	Exequiel		\N	exequiell.english@gmail.com	+56949477681	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.365	2026-04-01 19:44:50.365
3237	Katherine		\N	katherineabarzua@hotmail.com	+56984791446	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.366	2026-04-01 19:44:50.366
3238	Karina	Maureira	\N	karymau@gmail.con	+56977011510	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.366	2026-04-01 19:44:50.366
3239	cristian	bembow	\N	Cristianbembow@yahoo.es	5696475978	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.367	2026-04-01 19:44:50.367
3240	Claudio	Hellmuth David	\N	csanchezvet@gmai.com	963481536	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.368	2026-04-01 19:44:50.368
3241	Monica	Tapia	\N	monica.tapia@yahoo.es	+56974075816	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.369	2026-04-01 19:44:50.369
3242	Marco	Antonio Alarcon	\N	pelaomarcotoledo@hotmail.com	+56994176528	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.369	2026-04-01 19:44:50.369
3243	Mauricio		\N	aeroponiente@gmail.com	+56985018155	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.37	2026-04-01 19:44:50.37
3244	Emilio		\N	emiliocarvajal@gmail.com	+56988663218	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.37	2026-04-01 19:44:50.37
3245	Cristian		\N	cvc_ingenieria@yahoo.es	+56966562943	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.371	2026-04-01 19:44:50.371
3246	Carlos		\N	carlos.castaneda@rebeca.cl	+56976672569	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.372	2026-04-01 19:44:50.372
3247	Ema	Javiera	\N	emajaviera@yahoo.com	+56961705586	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.372	2026-04-01 19:44:50.372
3248	Cristián		\N	irontrowax@gmail.com	+56992861343	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.373	2026-04-01 19:44:50.373
3249	Miguel	Cea	\N	miguelceam@gmail.com	+56986408868	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.373	2026-04-01 19:44:50.373
3250	Patricio		\N	pgallardop@gmail.com	+56994691778	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.374	2026-04-01 19:44:50.374
3251	elias	urbano	\N	elias.r.urbano@gmail.com	+56952414723	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.374	2026-04-01 19:44:50.374
3252	boris		\N	borisrg@hotmail.com	+56981535203	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.375	2026-04-01 19:44:50.375
3253	Rodrigo		\N	rodrigobascoli@gmail.com	+56989211455	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.376	2026-04-01 19:44:50.376
3254	Rimsky		\N	Rimskypavlov@gmail.com	+56998796715	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.376	2026-04-01 19:44:50.376
3255	Paulina	Lourdes	\N	pauligerr@gmail.com	+56991556686	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.377	2026-04-01 19:44:50.377
3256	Mauro	Gonzalez	\N	corredor@subercaseaux69.cl	+56999999999	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.377	2026-04-01 19:44:50.377
3257	Mariantonieta	om	\N	marianttonieta@gmail.com	+56982896945	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.378	2026-04-01 19:44:50.378
3258	Fernando	Lazo	\N	nano1936@hotmail.com	+56932440747	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.378	2026-04-01 19:44:50.378
3259	Jose	Francisco	\N	josefranciscojaimeborie@gmsil.com	+56951942851	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.379	2026-04-01 19:44:50.379
3260	Roberto		\N	kinerog@gmail.com	+56992373565	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.379	2026-04-01 19:44:50.379
3261	Ikki		\N	Ikkisaito@hotmail.com	+56971369421	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.38	2026-04-01 19:44:50.38
3262	~Andrea		\N	profe.andreaecheverria@gmail.com	987871595	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.381	2026-04-01 19:44:50.381
3263	Sil		\N	silpaz@yahoo.com	+56979668560	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.382	2026-04-01 19:44:50.382
3264	Makarena	Medina	\N	dra.makarenamedina@gmail.com	+56999915628	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.382	2026-04-01 19:44:50.382
3265	patricio		\N	patriciolovial@gmail.com	+56984793681	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.383	2026-04-01 19:44:50.383
3266	Liz		\N	1234laboral@gmail.com	+56956728365	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.384	2026-04-01 19:44:50.384
3267	Antonio		\N	antonio@glasslab.cl	+56994331172	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.384	2026-04-01 19:44:50.384
3268	AbesAñep		\N	sebastian.penao@gmail.com	+56954210439	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.385	2026-04-01 19:44:50.385
3269	jose		\N	pepevial@hotmail.com	+56975354490	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.386	2026-04-01 19:44:50.386
3270	Marisol		\N	marisol629@gmail.com	+56992231315	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.387	2026-04-01 19:44:50.387
3271	Eduardo		\N	eduardoccu16@gmail.com	+56988341101	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.387	2026-04-01 19:44:50.387
3272	Gloria	Denisse Bustos	\N	gloria.bustos.a@gmail.com	+56961392424	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.388	2026-04-01 19:44:50.388
3273	Alejandro	Espinosa	\N	aespinoe@gmail.com	999496042	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.389	2026-04-01 19:44:50.389
3274	Manolo		\N	manolo@manolo.cl	56956380702	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.39	2026-04-01 19:44:50.39
3275	Claudio		\N	ccardenasar@gmail.com	+56964935014	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.39	2026-04-01 19:44:50.39
3276	Macarena		\N	macaastete@gmail.com	+56950956606	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.391	2026-04-01 19:44:50.391
3277	mandala		\N	mandalalove87@gmail.com	+56973181335	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.392	2026-04-01 19:44:50.392
3278	Juan		\N	juan.villanueva.m@gmail.com	+56998865836	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.393	2026-04-01 19:44:50.393
3279	Francisco		\N	fpena@gracia.cl	+56995194852	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.393	2026-04-01 19:44:50.393
3280	Pili		\N	pd.asabag@gmail.com	+56999692354	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.394	2026-04-01 19:44:50.394
3281	Patricia	Maure	\N	pmaure@gmail.com	+56961202620	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.395	2026-04-01 19:44:50.395
3282	Lorena		\N	Lorena@rysrefrigeracion.cl	+56956791008	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.396	2026-04-01 19:44:50.396
3283	veronica	reyes	\N	vereyesmon2@gmail.com	+56995118802	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.396	2026-04-01 19:44:50.396
3284	Jaime	Rodriguez	\N	jaimerodriguez.y@gmail.com	+56997890762	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.397	2026-04-01 19:44:50.397
3285	William		\N	williammellaxg@gmail.com	+56940318201	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.398	2026-04-01 19:44:50.398
3286	Yesenia		\N	yeseniaherrerarebolledo@gmail.com	+56977503154	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.399	2026-04-01 19:44:50.399
3287	Veronica		\N	vneghmee@gmail.com	+56998217480	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.399	2026-04-01 19:44:50.399
3288	Bastian		\N	arenasbastian@hotmail.com	+5645785632	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.4	2026-04-01 19:44:50.4
3289	Nancy		\N	nqmoris@yahoo.es	+56979940293	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.401	2026-04-01 19:44:50.401
3290	Nayareth		\N	naya.ver.s@gmail.com	+56949707707	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.402	2026-04-01 19:44:50.402
3291	Dusty		\N	dusty.moran1@gmail.com	+56958118303	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.402	2026-04-01 19:44:50.402
3292	Pedro		\N	ploparan@gmail.com	+56977931880	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.403	2026-04-01 19:44:50.403
3293	Erich	Schlor	\N	eschlor@fitvalv.cl	+56976966011	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.404	2026-04-01 19:44:50.404
3294	Carolina		\N	carolinatoro.14@gmail.comc	+56982290510	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.405	2026-04-01 19:44:50.405
3295	Claudio		\N	profesorvila@gmail.com	+56998457402	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.406	2026-04-01 19:44:50.406
3296	Victor		\N	victor.garayu@gmail.com	+56993272043	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.407	2026-04-01 19:44:50.407
3297	Tulio	Valenzuela	\N	tvalenzuelapauval@gmail.com	+56993246316	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.407	2026-04-01 19:44:50.407
3298	Horacio	Castro	\N	Castro.horacio@gmail.com	965064241	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.408	2026-04-01 19:44:50.408
3299	Lusso		\N	marcocapelli25@hotmail.com	+56968398894	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.409	2026-04-01 19:44:50.409
3300	luis	ibarra	\N	gonzafran1@hotmail.com	+56955555555	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.41	2026-04-01 19:44:50.41
3301	Jose	L. Rodríguez	\N	jrodriguez594@gmail.com	+56949282817	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.411	2026-04-01 19:44:50.411
3302	Fernando	Fernández González	\N	fdo.fdez04@gmail.com	+56999202115	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.412	2026-04-01 19:44:50.412
3303	Chris	Aravena	\N	aravena.chris@gmail.com	990471047	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.412	2026-04-01 19:44:50.412
3304	Jonathan	Cesar	\N	jchacon71@hotmail.com	+56969186224	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.413	2026-04-01 19:44:50.413
3305	Cristian		\N	transportes@quinterosspa.com	+56968351256	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.414	2026-04-01 19:44:50.414
3306	Isaias		\N	isaiasmiranda861@gmail.com	+56964072112	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.415	2026-04-01 19:44:50.415
3307	Alex		\N	alexwhiteleyspa@gmail.com	+56998841530	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.416	2026-04-01 19:44:50.416
3308	Sebastian		\N	sebastian.figueroa@outlook.cl	956953075	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.417	2026-04-01 19:44:50.417
3309	Gladys	Cielo Reyes	\N	gladyscielo@gmail.com	979865133	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.418	2026-04-01 19:44:50.418
3310	Jose		\N	joseahumada28@gmail.com	+56989230233	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.419	2026-04-01 19:44:50.419
3311	Claudia	Jeria	\N	cjeria2006@hotmail.com	+56942261569	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.42	2026-04-01 19:44:50.42
3312	Esteban		\N	estebansaav@gmail.com	944110008	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.421	2026-04-01 19:44:50.421
3313	Mercedes		\N	lumy.quipato@gmail.com	+56991946720	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.422	2026-04-01 19:44:50.422
3314	David		\N	David.carrasco.an@gmail.com	+56932979706	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.422	2026-04-01 19:44:50.422
3315	Jorge		\N	jorgedavidoc@gmail.com	+56945538011	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.423	2026-04-01 19:44:50.423
3316	Juan		\N	Jib@bofillsa.cl	+56985282081	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.424	2026-04-01 19:44:50.424
3317	Alejandro		\N	alejandrosepul@gmail.com	+56942972084	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.424	2026-04-01 19:44:50.424
3318	Robert		\N	elsonrojas@gmail.com	+56942425552	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.425	2026-04-01 19:44:50.425
3319	Patricia		\N	zaldivar.patricia@gmail.com	+56979778672	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.426	2026-04-01 19:44:50.426
3320	Juan	Pablo Ortega	\N	j_ortegacofre1@hotmail.com	984812422	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.426	2026-04-01 19:44:50.426
3321	Pablo	Andres	\N	fariasm@gmail.com	+56942799325	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.427	2026-04-01 19:44:50.427
3322	Felipe	Iga	\N	feligulriksen@gmail.com	+56971252375	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.428	2026-04-01 19:44:50.428
3323	Harol	Alberto Gutierrez	\N	inmobiliariagupo@gmail.com	+56989214391	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.429	2026-04-01 19:44:50.429
3324	Maria	Carolina	\N	carolinagiltoro@hotmail.com	+56989212837	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.43	2026-04-01 19:44:50.43
3325	Roberto		\N	rguzman.igs@gmail.com	+56965747628	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.43	2026-04-01 19:44:50.43
3326	Darwin		\N	dparra@multiservicioslcr.cl	+56979969340	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.431	2026-04-01 19:44:50.431
3327	Beia		\N	paulinita.ordenes@gmail.com	+56981495487	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.432	2026-04-01 19:44:50.432
3328	Ivana		\N	ivamusso@hotmail.com.ar	+56998640719	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.433	2026-04-01 19:44:50.433
3329	Rubén	Godoy	\N	donkayser@msn.com	+56954453978	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.433	2026-04-01 19:44:50.433
3330	Claudia		\N	vitolaskar@hotmail.com	+56955637207	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.434	2026-04-01 19:44:50.434
3331	Luciano	Valenzuela Quintana	\N	luciano.valenzuela@yahoo.es	+56957380511	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.435	2026-04-01 19:44:50.435
3332	Alejandro		\N	alej.villa@hotmail.com	+56930755862	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.436	2026-04-01 19:44:50.436
3333	metro		\N	pablo.barra552@gmail.com	+56975124989	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.437	2026-04-01 19:44:50.437
3334	Kike	Sa	\N	kikext@gmail.com	+56954025870	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.437	2026-04-01 19:44:50.437
3335	Soledad	Castillo	\N	sole.dadita@hotmail.com	+56989868830	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.438	2026-04-01 19:44:50.438
3336	Cecilia	Díaz	\N	cdiazunanue@gmail.com	+56998276802	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.439	2026-04-01 19:44:50.439
3337	Freddy		\N	freddy@andler.cl	920043017	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.44	2026-04-01 19:44:50.44
3338	Alexa		\N	Santiagolexa14@gmail.com	+5644083359	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.44	2026-04-01 19:44:50.44
3339	Valeria	Quintanilla	\N	valeriaq2@gmail.com	+56972166116	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.441	2026-04-01 19:44:50.441
3340	Jenny	Prado Toro -	\N	ilchakona.store@gmail.com	+56989006961	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.442	2026-04-01 19:44:50.442
3341	Angel		\N	amila@mundocargo.cl	+56976672458	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.443	2026-04-01 19:44:50.443
3342	Alex		\N	alexchacoff@gmail.com	+56998463821	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.443	2026-04-01 19:44:50.443
3343	Fernando		\N	fm.muebles@hotmail.com	+56998410410	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.444	2026-04-01 19:44:50.444
3344	Alex		\N	alex.urtubia.contreras@gmail.com	+56997799779	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.445	2026-04-01 19:44:50.445
3345	Loreto	Paredes	\N	Lorero.paredes.val@gmail.com	+56973763887	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.445	2026-04-01 19:44:50.445
3346	Joaquín		\N	joaquinnunezleal@hotmail.com	979899528	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.446	2026-04-01 19:44:50.446
3347	Clau	Agüero	\N	claudiaaguero979@gmail.com	+56936792576	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.447	2026-04-01 19:44:50.447
3348	Jerson	Javier Placencia	\N	jerson.placencia@gmail.com	+56990570381	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.448	2026-04-01 19:44:50.448
3349	Juan		\N	Jmarcelogutierrez@gmail.com	+56982657345	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.448	2026-04-01 19:44:50.448
3350	Sergio		\N	syaez@live.cl	+56996002708	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.449	2026-04-01 19:44:50.449
3351	Catal	Luz	\N	catalinaluz@gmail.com	+56993327955	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.45	2026-04-01 19:44:50.45
3352	Juan	Carlos	\N	jc.munozan@gmail.com	+56994399656	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.451	2026-04-01 19:44:50.451
3353	Cristina	Jimenez	\N	cristyjimenez.rivas@gmail.com	+56944190718	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.451	2026-04-01 19:44:50.451
3354	Claudia	Poblete	\N	popopoblete@hotmail.com	+56966097183	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.452	2026-04-01 19:44:50.452
3355	Andrea		\N	andreaantunez@yahoo.com	+56993325075	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.453	2026-04-01 19:44:50.453
3356	Maria	Soledad Paz	\N	pazpropiedades@hotmail.com	+56995037733	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.454	2026-04-01 19:44:50.454
3357	David		\N	procuespinoza@gmail.com	+56974485421	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.455	2026-04-01 19:44:50.455
3358	Marco		\N	marco.sanchez.jana@gmail.com	+56982539673	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.455	2026-04-01 19:44:50.455
3359	Gilda		\N	gilda.pavat@gmail.com	+56985961857	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.456	2026-04-01 19:44:50.456
3360	Mauro	Gonzalez	\N	mauromaquillador@gmail.com	+56998177782	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.457	2026-04-01 19:44:50.457
3361	Jorge		\N	coke1960@gmail.com	+56993302416	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.457	2026-04-01 19:44:50.457
3362	Carola	Ruiz	\N	chruuzr@gmail.com	963521567	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.458	2026-04-01 19:44:50.458
3363	Jose	Luis Cifuentes	\N	pinmobiliarioyfinanciero@gmail.com	+56974087664	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.459	2026-04-01 19:44:50.459
3364	Pierina		\N	Purbani@yahoo.es	+56957887023	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.46	2026-04-01 19:44:50.46
3365	Omar		\N	omar.oportodd@gmail.com	+56995738894	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.46	2026-04-01 19:44:50.46
3366	Gonzalo		\N	canessa1@gmail.com	+56982291678	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.461	2026-04-01 19:44:50.461
3367	Victor		\N	Vfloresj@yahoo.com	+56998726576	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.462	2026-04-01 19:44:50.462
3368	Jeannette		\N	janet.ficher@gmail.com	+56971403050	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.463	2026-04-01 19:44:50.463
3369	ClAu		\N	Doctoralizama@gmail.con	998997079	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.463	2026-04-01 19:44:50.463
3370	Cristian	Durand	\N	cdurandquijada@gmail.com	+56942958039	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.464	2026-04-01 19:44:50.464
3371	Alex		\N	alexpedreroc@gmail.com	+56962236713	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.465	2026-04-01 19:44:50.465
3372	Javier	Andres	\N	jmontana@hotmail.cl	+56984061265	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.466	2026-04-01 19:44:50.466
3373	Leyla	Paz Constantino	\N	leyla_pcf@hotmail.com	+56994685941	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.467	2026-04-01 19:44:50.467
3374	Carolina		\N	carocjpo@hotmail.com	+56957463491	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.468	2026-04-01 19:44:50.468
3375	Paloma		\N	palomacantillana@gmail.com	992498649	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.468	2026-04-01 19:44:50.468
3376	Rodrigo		\N	rodrigobascoli@yahoo.com	+56989211455	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.469	2026-04-01 19:44:50.469
3377	Ana	Maria Pizarro	\N	Giustipizarro@yahoo.com	978099360	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.47	2026-04-01 19:44:50.47
3378	Eduardo		\N	epaulf.2017@gmail.com	+56967961696	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.47	2026-04-01 19:44:50.47
3379	Carolina	Eugenia	\N	araya.carolina.31@gmail.com	+56962301266	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.471	2026-04-01 19:44:50.471
3380	Francisco		\N	fcozapatatapia@gmail.com	+56974637866	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.472	2026-04-01 19:44:50.472
3381	Fresia		\N	faraneda@escuelaaraucarias.cl	+56983474430	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.472	2026-04-01 19:44:50.472
3382	Cristian		\N	adkdecoracion@gmail.com	+56987311611	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.473	2026-04-01 19:44:50.473
3383	Rodriguez		\N	lrodriguezv013@gmail.com	+56972109327	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.473	2026-04-01 19:44:50.473
3384	Jorge	Antonio	\N	jorgenavarretef@yahoo.es	+56992518500	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.474	2026-04-01 19:44:50.474
3385	Heidy		\N	heidyescalonakojic@artemedica.cl	+56994749422	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.475	2026-04-01 19:44:50.475
3386	María	Elena	\N	Mariopf2493@hotmail.com	+56968453777	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.476	2026-04-01 19:44:50.476
3387	Sandra	Marisol Montenegro	\N	sandramontenegrol68@gmail.com	+56978082852	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.476	2026-04-01 19:44:50.476
3388	Nadia		\N	nadia_taia@hotmail.com	+56985344714	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.477	2026-04-01 19:44:50.477
3389	Jorge		\N	jorgeomarvalenzuela@gmail.com	+56998797414	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.478	2026-04-01 19:44:50.478
3390	Maribel	Cariaga	\N	m_cariaga@hotmail.com	+56950958044	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.479	2026-04-01 19:44:50.479
3391	Angela		\N	adinamarca.prop@gmail.coml	+56946118740	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.48	2026-04-01 19:44:50.48
3392	alejandro		\N	wattsitof@gmail.com	+56989194315	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.48	2026-04-01 19:44:50.48
3393	Elizabeth		\N	elizabeth.riquelme999@gmail.com	+56992287523	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.481	2026-04-01 19:44:50.481
3394	juan		\N	salvemos2021@gmail.com	+56953612851	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.482	2026-04-01 19:44:50.482
3395	Tomas		\N	tomas.orellana.n@gmail.com	+56956696860	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.482	2026-04-01 19:44:50.482
3396	Juan	Díaz	\N	juandiaz@tajima.cl	+56982343214	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.483	2026-04-01 19:44:50.483
3397	Veronica	contreras	\N	verocontreras80@gmail.com	+56975321541	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.484	2026-04-01 19:44:50.484
3398	Daniel		\N	jdmb45@gmail.com	+56996396290	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.484	2026-04-01 19:44:50.484
3399	Jocelyn		\N	jpretamale@gmail.com	+56988896874	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.485	2026-04-01 19:44:50.485
3400	Marcelo		\N	marcelomontenegro09@gmail.com	+56961904718	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.486	2026-04-01 19:44:50.486
3401	Karina		\N	karinaara@yahoo.es	+56962099771	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.487	2026-04-01 19:44:50.487
3402	Ana	Maria Higuera	\N	anahigueraa559@gmail.com	+56966239827	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.487	2026-04-01 19:44:50.487
3403	Patricia		\N	p.duartes.c@hotmail.com	+56982122406	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.488	2026-04-01 19:44:50.488
3404	Cristian		\N	cmoyavalenzuela@gmail.com	+56978491379	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.488	2026-04-01 19:44:50.488
3405	MaríaAngelica		\N	cplasticahav@gmail.com	+56998403331	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.489	2026-04-01 19:44:50.489
3406	Cecilia		\N	ce.ange@hotmail.com	+56977931855	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.49	2026-04-01 19:44:50.49
3407	Carolina		\N	carolinar_r@hotmail.com	+56983881952	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.491	2026-04-01 19:44:50.491
3408	Claudio	Carrasco	\N	claudio.carrasco1994@gmail.com	+56978221605	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.491	2026-04-01 19:44:50.491
3409	Alexander		\N	pillacaizabandaalexander@gmail.com	+56951482888	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.492	2026-04-01 19:44:50.492
3410	Dana		\N	schwartz.dana@gmail.com	+56999494334	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.493	2026-04-01 19:44:50.493
3411	Guillermo	Andres Meza	\N	gmv.arquitecto@gmail.com	+56992917096	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.494	2026-04-01 19:44:50.494
3412	monica		\N	monicalopezcarreno@gmail.comail.com	+56993524112	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.494	2026-04-01 19:44:50.494
3413	Heiner	Montoya	\N	Drhrmontoya@gmail.com	+56997173754	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.495	2026-04-01 19:44:50.495
3414	Daniel		\N	daniel221998@hotmail.com	+56991288049	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.496	2026-04-01 19:44:50.496
3415	Victor		\N	vperezh@hotmail.com	+56979778333	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.496	2026-04-01 19:44:50.496
3416	Patricia	Vargas	\N	Pattyvargas@vtr.net	+56993825929	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.497	2026-04-01 19:44:50.497
3417	Juan	serey	\N	juan.serey.aguilera@gmail.com	+56990902320	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.498	2026-04-01 19:44:50.498
3418	Priscilla		\N	pavillavicenciocorrea@gmail.com	+56993268085	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.498	2026-04-01 19:44:50.498
3419	Barbara		\N	principalbarbara10@gmail.com	+56987913068	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.499	2026-04-01 19:44:50.499
3420	John		\N	johnmunoz@hotmail.com	+56998059026	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.499	2026-04-01 19:44:50.499
3421	jcnet		\N	jflorescontador@gmail.com	+56991387219	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.5	2026-04-01 19:44:50.5
3422	Tamara		\N	tam.marchant@gmail.com	+56997292975	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.501	2026-04-01 19:44:50.501
3423	Ricardo	González	\N	ricardogonzalez@pexin.cl	+56982347811	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.502	2026-04-01 19:44:50.502
3424	Fernando		\N	fsuazo21@gmail.com	+56984797346	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.502	2026-04-01 19:44:50.502
3425	Alejandro	Estay	\N	aefp@vtr.net	+56998411752	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.503	2026-04-01 19:44:50.503
3426	Gustavo		\N	gustavotorres@ug.uchile.cl	+56920959769	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.504	2026-04-01 19:44:50.504
3427	TodoPatin		\N	patintv@vtr.net	+56998412213	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.504	2026-04-01 19:44:50.504
3428	Hugo		\N	hugopobletei@hotmail.com	+56990879651	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.505	2026-04-01 19:44:50.505
3429	Sergio	Sánchez	\N	bazardenoe@gmail.com	+56965800659	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.506	2026-04-01 19:44:50.506
3430	Leticia		\N	leticia.marticorena@gmail.com	+56994164699	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.507	2026-04-01 19:44:50.507
3431	Pedro	Fernandez	\N	p.fernandez.scl@gmail.com	+56995964770	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.507	2026-04-01 19:44:50.507
3432	Javier		\N	javier_stari@hotmail.com	+56976599219	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.512	2026-04-01 19:44:50.512
3433	Ricardo	Alejandro Pohl	\N	ricardo.pohl@hotmail.com	+56999187791	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.513	2026-04-01 19:44:50.513
3434	Pedro		\N	obrasmenoresyservicios@gmail.com	+56998228577	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.514	2026-04-01 19:44:50.514
3435	Ceciliz	Cabezas	\N	singercecy@gmail.com	+56997952202	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.515	2026-04-01 19:44:50.515
3436	Andrea		\N	andreacarilaomarin@gmail.com	988435550	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.515	2026-04-01 19:44:50.515
3437	Tino		\N	tinodeconce@gmail.com	+56933397219	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.516	2026-04-01 19:44:50.516
3438	Alexia		\N	sandra.diazolivarez@gmail.com	+56978077236	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.517	2026-04-01 19:44:50.517
3439	Danilo		\N	daniloleivagodoy@gmail.com	+56954142078	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.518	2026-04-01 19:44:50.518
3440	Andrea		\N	a_domeisen@hotmail.com	+56977114137	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.52	2026-04-01 19:44:50.52
3441	Roberto		\N	rodominguez@gmail.com	+56984790296	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.52	2026-04-01 19:44:50.52
3442	Yubiza	María	\N	y.zizak@gmail.con	+56999999999	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.521	2026-04-01 19:44:50.521
3443	Jacqueline	Valdivieso	\N	jacquevaldi@gmail.com	94388053	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.522	2026-04-01 19:44:50.522
3444	Claudio		\N	vasquezgarau@yahoo.es	+56998382221	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.523	2026-04-01 19:44:50.523
3445	Alexis	Rodolfo	\N	a.almonacidt@gmail.com	+5698859649	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.523	2026-04-01 19:44:50.523
3446	Miguel		\N	miguel.larad@gmail.com	+56957820038	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.524	2026-04-01 19:44:50.524
3447	Patricio	Vásquez	\N	patriciovasquez@gmail.com	965960668	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.525	2026-04-01 19:44:50.525
3448	Fernando		\N	fernandofloresaifo@gmail.com	+56968578345	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.525	2026-04-01 19:44:50.525
3449	Cesar		\N	cesarcabrerag@gmail.com	+56994123349	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.526	2026-04-01 19:44:50.526
3450	Claudio		\N	claudio.tapia11@gmail.com	+56999009900	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.527	2026-04-01 19:44:50.527
3451	Monica	Castillo	\N	monicaegana1998@gmail.com	+56991252927	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.528	2026-04-01 19:44:50.528
3452	Paula		\N	paula_maria_pf@hotmail.com	+56998038808	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.528	2026-04-01 19:44:50.528
3453	Alfredo		\N	agz3127@icloud.com	+56993271188	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.529	2026-04-01 19:44:50.529
3454	Tania		\N	tlbrioness@yahoo.es	+56951014975	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.53	2026-04-01 19:44:50.53
3455	Jorge		\N	jorge.nunez.repairtop@gmail.com	+56963159304	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.53	2026-04-01 19:44:50.53
3456	Jimy		\N	jimyparram23@gmail.com	+56942505503	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.531	2026-04-01 19:44:50.531
3457	José	Rubén	\N	hermosillateran@gmail.com	+56974320371	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.532	2026-04-01 19:44:50.532
3458	Ada	Pamela	\N	adapamela@gmail.com	+56998397820	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.532	2026-04-01 19:44:50.532
3459	Fredy		\N	fredy.vejar@gmail.com	+56963032089	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.533	2026-04-01 19:44:50.533
3460	Beautiful		\N	ale7124@hotmail.com	+56990771687	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.534	2026-04-01 19:44:50.534
3461	Rodrigo		\N	rpenas73@gmail.com	+56998810085	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.535	2026-04-01 19:44:50.535
3462	Facundo		\N	facurtiv@hotmail.com	+56993457190	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.535	2026-04-01 19:44:50.535
3463	Carlosl		\N	carloslfg@gmail.com	+56973924112	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.536	2026-04-01 19:44:50.536
3464	Paula	Andrea	\N	paularojas979@gmail.com	+56961771387	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.537	2026-04-01 19:44:50.537
3465	Pauli		\N	pauliarq@hotmail.com	+56995884197	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.538	2026-04-01 19:44:50.538
3466	Ariel		\N	aesteban1003@live.cl	+56942755986	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.538	2026-04-01 19:44:50.538
3467	Sofía		\N	sofi_2s@hotmail.com	+56958313600	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.539	2026-04-01 19:44:50.539
3468	Andrea	Campos	\N	andreafotografica@gmail.com	+56997303701	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.54	2026-04-01 19:44:50.54
3469	Alexis		\N	alexis.moyapena@gmail.com	+56999315931	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.541	2026-04-01 19:44:50.541
3470	Rodolfo		\N	Rofetrofue@gmail.com	962484798	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.542	2026-04-01 19:44:50.542
3471	Matias	Falck	\N	falckfalck@gmail.com	+56995152236	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.542	2026-04-01 19:44:50.542
3472	Marisol	Meza	\N	marisol.meza.urrutia@gmail.com	+56999794535	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.543	2026-04-01 19:44:50.543
3473	Felipe	Eduardo Sepulveda	\N	felipesepulvedacasanova@gmail.com	+56979551429	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.544	2026-04-01 19:44:50.544
3474	Mario		\N	lopezmar1980@gmail.com	+56988395277	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.544	2026-04-01 19:44:50.544
3475	Ron		\N	p.martinez.salazar@gmail.com	+569946645493	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.545	2026-04-01 19:44:50.545
3476	Rodrigo		\N	rgomez.arratia@gmail.com	+56984348100	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.546	2026-04-01 19:44:50.546
3477	Ricardo		\N	esteban_1873@hotmail.com	+56982332327	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.546	2026-04-01 19:44:50.546
3478	Luis	Díaz	\N	lu.diaz.ac@gmail.com	998271583	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.547	2026-04-01 19:44:50.547
3479	Jae		\N	jaelhcartes1@gmail.com	+56964221801	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.548	2026-04-01 19:44:50.548
3480	Gustavo		\N	gmorales.n@hotmail.com	+56998791725	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.548	2026-04-01 19:44:50.548
3481	Lore		\N	lorenadcaceresf@gmail.com	+56993811336	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.549	2026-04-01 19:44:50.549
3482	Diego		\N	diegokajas25@hotmail.com	+56953617672	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.55	2026-04-01 19:44:50.55
3483	Robert		\N	gonzaloht6@hotmail.com	+56968765037	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.551	2026-04-01 19:44:50.551
3484	María	Rebeca del	\N	queca.delcampo@gmail.com	+56992403334	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.552	2026-04-01 19:44:50.552
3485	Sandra	Ivette Gamboa	\N	channysiac@yahoo.es	+56968792595	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.552	2026-04-01 19:44:50.552
3486	Maria	Paz Guaico	\N	mariapazguaico2@gmail.com	+56985546459	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.553	2026-04-01 19:44:50.553
3487	Emilio		\N	emilioromero64@gmail.com	+56987526352	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.555	2026-04-01 19:44:50.555
3488	Veronica		\N	vargandona@yahoo.com	+56984492019	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.555	2026-04-01 19:44:50.555
3489	Patricio	Sandoval	\N	patricio.sandoval@mail.com	+56933195211	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.556	2026-04-01 19:44:50.556
3490	Andres		\N	enfermerorespaldo@gmail.com	+56992237473	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.557	2026-04-01 19:44:50.557
3491	Alex		\N	heladeriaigloo@gmail.com	+56998442262	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.558	2026-04-01 19:44:50.558
3492	Marco		\N	mrcjmnz@gmail.com	+56996534442	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.559	2026-04-01 19:44:50.559
3493	Isabel		\N	plinacp@hotmail.com	+56993440337	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.559	2026-04-01 19:44:50.559
3494	Yonny		\N	zambranoyonny33@gmail.com	56941104875	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.56	2026-04-01 19:44:50.56
3495	Poli		\N	plunacid@gmail.com	+56991514487	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.561	2026-04-01 19:44:50.561
3496	pucky.2019		\N	karinnaconus@gmail.com	0452730122	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.561	2026-04-01 19:44:50.561
3497	Andre	Fonseca	\N	andreinafonsecab@gmail.com	+56964452069	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.562	2026-04-01 19:44:50.562
3498	M	Soledad Zuñiga	\N	maria.soledadmonks@gmail.com	+56984641882	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.562	2026-04-01 19:44:50.562
3499	Sergio		\N	sergiotemperoni@gmail.com	+56947920592	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.563	2026-04-01 19:44:50.563
3500	Claudia		\N	claudialcayaga@hotmail.com	+56982301487	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.564	2026-04-01 19:44:50.564
3501	Gabriel		\N	gamalorey@gmail.com	+56223774961	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.564	2026-04-01 19:44:50.564
3502	Tamara	Palacios	\N	Correspondenciatamara@gmail.com	+56991586579	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.565	2026-04-01 19:44:50.565
3503	Pablo		\N	pabloealvarezs@gmail.com	+56981783802	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.565	2026-04-01 19:44:50.565
3504	Marta		\N	m.riverosp65@gmail.com	+56975127833	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.566	2026-04-01 19:44:50.566
3505	Maria	Luisa	\N	psicomalu8@gmail.com	+56957533034	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.567	2026-04-01 19:44:50.567
3506	Felipe	G.	\N	felipe.gonzalez.jara@gmail.com	+56989561303	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.567	2026-04-01 19:44:50.567
3507	Peter	John Santis	\N	petersantissandoval@gmail.com	+56966611964	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.568	2026-04-01 19:44:50.568
3508	Cristian		\N	criscard_7@hotmail.com	+56945435679	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.568	2026-04-01 19:44:50.568
3509	Patricio		\N	patriciolave@gmail.com	+56999437530	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.569	2026-04-01 19:44:50.569
3510	Diego	Muñoz	\N	diego.munoz@hotmail.cl	+5649847799	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.57	2026-04-01 19:44:50.57
3511	Lorena		\N	lorenandrea.moraga@gmail.com	+56987979572	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.571	2026-04-01 19:44:50.571
3512	Marisol		\N	marisolheidi@gmail.com	+56993229453	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.571	2026-04-01 19:44:50.571
3513	Hugo		\N	hugoexposito@gmail.com	+56966183186	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.572	2026-04-01 19:44:50.572
3514	Rosario		\N	eltallerdecharosossa@gmail.com	+56976490829	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.573	2026-04-01 19:44:50.573
3515	Katita	Torres	\N	katherinetroncosotorres@gmail.com	+56961924714	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.574	2026-04-01 19:44:50.574
3516	Patricia		\N	patofern@gmail.com	+56927719269	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.574	2026-04-01 19:44:50.574
3517	Tomas	Marcos	\N	tmarcosg@hotmail.com	+56981561867	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.575	2026-04-01 19:44:50.575
3518	Claudio		\N	Cquiroz@racoonspa.cl	+56974691215	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.576	2026-04-01 19:44:50.576
3519	Jose		\N	lnv3152@gmail.com	+56989856863	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.576	2026-04-01 19:44:50.576
3520	Patricio	Córdova	\N	patriciocordova@altosur.cl	+56985963395	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.577	2026-04-01 19:44:50.577
3521	Marjorie		\N	Marjorie.naty@hotmail.com	+56953226253	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.578	2026-04-01 19:44:50.578
3522	Ernesto		\N	ernestodilas1930@hotmail.com	+56950607141	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.579	2026-04-01 19:44:50.579
3523	Claudia		\N	claudia.andrea.zavala.cadenas@gmail.com	+56979780568	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.579	2026-04-01 19:44:50.579
3524	Rose		\N	rose.barriga@gmail.com	+56994036323	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.58	2026-04-01 19:44:50.58
3525	Claudio		\N	claudiomoralesdur@gmail.com	+56989812452	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.581	2026-04-01 19:44:50.581
3526	Marisel		\N	marisel.cepeda2027@gmail.com	+5634427937	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.582	2026-04-01 19:44:50.582
3527	Felipe	Espinoza	\N	felipeespinozaj@gmail.com	+56979096938	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.583	2026-04-01 19:44:50.583
3528	Carla		\N	Carlacverdugo@gmail.com	+56976347616	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.583	2026-04-01 19:44:50.583
3529	italo		\N	faccone.italo@gmail.com	+56995292414	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.584	2026-04-01 19:44:50.584
3530	Nico		\N	nicolette.palma@gmail.com	+56986136647	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.585	2026-04-01 19:44:50.585
3531	Alvaro		\N	aduque02@gmail.com	+56992352186	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.586	2026-04-01 19:44:50.586
3532	Maca	Salamanca	\N	macasalamanca@gmail.com	984798276	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.587	2026-04-01 19:44:50.587
3533	Cesar		\N	tornacesar@hotmail.com	+56999339690	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.587	2026-04-01 19:44:50.587
3534	Jaime		\N	jaimesanhuezah@hotmail.com	+56981380288	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.588	2026-04-01 19:44:50.588
3535	Matías		\N	matjarac@gmail.com	95788641	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.589	2026-04-01 19:44:50.589
3536	Jorge		\N	jorgegonzalez9839@gmail.com	+56998435047	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.589	2026-04-01 19:44:50.589
3537	El	Viejo del	\N	Afvaldiv@uc.cl	+56968470655	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.59	2026-04-01 19:44:50.59
3538	Rebeca	Contreras	\N	rebe.contreras@hotmail.com	+56933895328	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.591	2026-04-01 19:44:50.591
3539	Erika	Magdalena	\N	erikamagdalenacarrasco@gmail.com	+56979960217	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.591	2026-04-01 19:44:50.591
3540	Marcela		\N	marcelaseguel@yahoo.es	+56982300111	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.592	2026-04-01 19:44:50.592
3541	Sebastián		\N	contabilidad.gyg@gmail.com	+56984211907	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.593	2026-04-01 19:44:50.593
3542	Pilar	Alegria	\N	pily28@gmail.com	+56994526221	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.593	2026-04-01 19:44:50.593
3543	Luis	Marcelo Concha	\N	lconchas@gmail.com	+56994691459	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.594	2026-04-01 19:44:50.594
3544	Peter	Loch	\N	Loch.peter.a@gmail.com	+56983418562	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.594	2026-04-01 19:44:50.594
3545	Carolina	Raquel Munoz	\N	munozr.carolina@gmail.com	+56977560999	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.595	2026-04-01 19:44:50.595
3546	Pablo		\N	Osoriso@gmail.com	+56993550554	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.595	2026-04-01 19:44:50.595
3547	Miguel	Antonio	\N	mbaeza.martinez@outlook.cl	+56956825907	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.596	2026-04-01 19:44:50.596
3548	Emilio		\N	evillanueva.cl@gmail.com	+56996824571	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.597	2026-04-01 19:44:50.597
3549	Sergio	R	\N	sgrc.1984@gmail.com	+56966491859	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.597	2026-04-01 19:44:50.597
3550	Alejandra	Ester Bobadilla	\N	alejandrarbj.pie@gmail.com	+56986581576	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.598	2026-04-01 19:44:50.598
3551	Patricia	Hidalgo	\N	phidalgoantonelli@gmail.com	+56968469444	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.598	2026-04-01 19:44:50.598
3552	elvis	cristian	\N	piscinasmanquegue@gmail.com	+56944380343	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.599	2026-04-01 19:44:50.599
3553	Julia	Isabel Bustamante	\N	juliaisabelbustamante@gmail.com	+56997890909	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.599	2026-04-01 19:44:50.599
3554	Eduardo	Illesca	\N	eduardo.illesca.l@gmail.com	+56968477251	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.6	2026-04-01 19:44:50.6
3555	mlunamacalusso		\N	mlunamacalusso@gmail.com	+56989464713	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.601	2026-04-01 19:44:50.601
3556	Felipe		\N	felbarra32@gmail.com	+56957605332	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.602	2026-04-01 19:44:50.602
3557	Mercedes		\N	mercedesvargaz@gmail.com	+56982005044	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.602	2026-04-01 19:44:50.602
3558	Marianna	Lazo	\N	marianna.lazo.s@gmail.com	+56996897277	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.603	2026-04-01 19:44:50.603
3559	Maria	Isabel	\N	miolcay@yahoo.com	+56997794662	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.604	2026-04-01 19:44:50.604
3560	Ernesto		\N	eecheverria23@gmail.com	+56994297585	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.605	2026-04-01 19:44:50.605
3561	Eliana		\N	eliana_j_navarro@hotmail.com	+56977094850	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.606	2026-04-01 19:44:50.606
3562	Susana	Jiménez	\N	prof.sj.comenius@gmail.com	+56976953736	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.606	2026-04-01 19:44:50.606
3563	ivan	Alonso Mora	\N	ivan_amb@hotmail.com	+56991763647	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.607	2026-04-01 19:44:50.607
3564	Damian	Muñoz	\N	dmunozrd@gmail.com	+56979216713	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.608	2026-04-01 19:44:50.608
3565	Angeles		\N	angeles.cahill@gmail.com	+56977316001	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.609	2026-04-01 19:44:50.609
3566	Mily	Vargas	\N	vargasmilizen@gmail.com	+56951571925	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.609	2026-04-01 19:44:50.609
3567	Julio	Ayancan	\N	jayancan@icloud.com	+56974965794	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.61	2026-04-01 19:44:50.61
3568	Carolina		\N	Ccarvajalnovoa@gmail.com	+56974322262	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.611	2026-04-01 19:44:50.611
3569	Marlys		\N	dra.marlysjara@gmail.com	+56993060593	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.611	2026-04-01 19:44:50.611
3570	Carla	Francisca Bravo	\N	carla.bravo.solar@gmail.com	+56984393325	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.612	2026-04-01 19:44:50.612
3571	Valeska		\N	valeska.andrea.rivera@gmail.com	+56941338236	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.613	2026-04-01 19:44:50.613
3572	Gina		\N	ginaferxs@gmail.com	+56961523620	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.613	2026-04-01 19:44:50.613
3573	Eduardo	Amigo	\N	eduardoamigo@ith.cl	998839281	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.614	2026-04-01 19:44:50.614
3574	Maria		\N	Abgmariamendoza@gmail.com	+584145664907	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.615	2026-04-01 19:44:50.615
3575	Yasna	rodriguez	\N	yrodriguez@cdsprovidencia.cl	+56994092214	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.616	2026-04-01 19:44:50.616
3576	Gervasio	Lafuente	\N	gerva.lfr@gmail.com	+56977195219	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.616	2026-04-01 19:44:50.616
3577	Martin		\N	maff1144@gmail.com	+56976351884	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.617	2026-04-01 19:44:50.617
3578	Mario		\N	jepsptealto@gmail.com	+56989588955	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.618	2026-04-01 19:44:50.618
3579	Sol		\N	solcito.medel42@gmail.com	933568334	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.618	2026-04-01 19:44:50.618
3580	Yerko		\N	reyko107@gmail.com	+56977384160	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.619	2026-04-01 19:44:50.619
3581	Stefanie		\N	stefff_333@hotmail.com	+56952022377	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.62	2026-04-01 19:44:50.62
3582	Ximena	Aguirre	\N	ximenascout@gmail.com	+56981347427	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.62	2026-04-01 19:44:50.62
3583	Felipe		\N	Felipecofreleon@gmail.com	+56982814876	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.621	2026-04-01 19:44:50.621
3584	Igor		\N	yperezveloso@yahoo.com	+56990964982	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.622	2026-04-01 19:44:50.622
3585	Hugo		\N	hug.soto.rodriguez@gmail.com	+56998389318	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.623	2026-04-01 19:44:50.623
3586	Viviana	Sandoval	\N	vivianto.sandoval@gmail.com	+56975487985	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.623	2026-04-01 19:44:50.623
3587	Paola		\N	paolaangulocanovas@gmail.com	+56977080071	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.624	2026-04-01 19:44:50.624
3588	Alexis		\N	abustoscj7@hotmail.com	+56982339237	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.625	2026-04-01 19:44:50.625
3589	Alejandro		\N	arios@uc.cll	+56992378583	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.626	2026-04-01 19:44:50.626
3590	John	jesus	\N	john.bodaleo2@gmail.com	964378403	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.626	2026-04-01 19:44:50.626
3591	Alfonso		\N	alfvallejos@hotmail.com	+56994330567	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.627	2026-04-01 19:44:50.627
3592	Macarena	Mellado	\N	Macarenadmellado@gmail.com	+56989415057	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.628	2026-04-01 19:44:50.628
3593	Maritza		\N	maritzavidalarriagada@gmail.com	+56996604675	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.628	2026-04-01 19:44:50.628
3594	Patricio	Inyaco	\N	pinyaco18@hotmail.com	+56995780181	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.629	2026-04-01 19:44:50.629
3595	Jorge	Quinteros	\N	inverticchile@gmail.com	+56996009912	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.63	2026-04-01 19:44:50.63
3596	Marite		\N	marite.aro@gmail.com	+56994626265	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.631	2026-04-01 19:44:50.631
3597	Karen	Nilo	\N	karennilohenriquez@gmail.com	+56979257328	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.631	2026-04-01 19:44:50.631
3598	Gonzalo		\N	gonzalosaffie@gmail.com	+56950198976	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.632	2026-04-01 19:44:50.632
3599	Eduardo		\N	openkart@gmail.com	+56974323768	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.633	2026-04-01 19:44:50.633
3600	Juan	Francisco Iturra	\N	juaiturra@gmail.com	+56987096446	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.634	2026-04-01 19:44:50.634
3601	Caro		\N	Caro.aviles000@gmail.com	+56997153999	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.635	2026-04-01 19:44:50.635
3602	Belén	Castro	\N	belenc1999@outlook.es	+56961326239	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.635	2026-04-01 19:44:50.635
3603	Edgardo		\N	edgardo.gutierrez@hrav.cl	+56994792475	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.636	2026-04-01 19:44:50.636
3604	Lorena		\N	lorena.parada@unce.cl	+56997708705	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.637	2026-04-01 19:44:50.637
3605	Eugenia		\N	amaliamedinayevenes@gmail.com	950846829	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.638	2026-04-01 19:44:50.638
3606	Pablo	Marchant	\N	pmarchantcontreras@gmail.com	+56950500591	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.638	2026-04-01 19:44:50.638
3607	Lorena		\N	lorenaelizabethsilvasanhueza@gmail.com	+569935676840	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.639	2026-04-01 19:44:50.639
3608	Jimena	Barra	\N	jimebarra@gmail.com	+56933279713	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.64	2026-04-01 19:44:50.64
3609	Francisco		\N	francisco.ugarteorellana@gmail.com	+56972101444	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.641	2026-04-01 19:44:50.641
3610	Genoveva	Alburquerque	\N	implalux@gmail.com	+56954206906	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.641	2026-04-01 19:44:50.641
3611	Mauro		\N	mauro.valdes.c@gmail.com	+56939556254	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.642	2026-04-01 19:44:50.642
3612	Sebastián		\N	digamelicenciado783@gmail.com	979850506	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.643	2026-04-01 19:44:50.643
3613	Jose	Alonso	\N	avaldebenito@interhaus.cl	+56994790931	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.644	2026-04-01 19:44:50.644
3614	Tomás		\N	tomas.urresty@gmail.com	+56979259712	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.644	2026-04-01 19:44:50.644
3615	Ivonne	Andrea Bravo	\N	ibrenet@yahoo.com	+56978061236	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.645	2026-04-01 19:44:50.645
3616	Patricio		\N	patricioivelic@gmail.com	+56972504261	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.646	2026-04-01 19:44:50.646
3617	Ignacio		\N	ignaciodonoso@gmail.com	+56988036334	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.647	2026-04-01 19:44:50.647
3618	Katalina		\N	cata.sagredov@gmail.com	+56921768279	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.648	2026-04-01 19:44:50.648
3619	Felipe	Andrés	\N	figlesiasd@gmail.com	+56945006148	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.648	2026-04-01 19:44:50.648
3620	Roberto	Alejandro	\N	lacasitaroberto@yahoo.es	+56995509328	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.649	2026-04-01 19:44:50.649
3621	Franco		\N	fbuscaglione@gmail.com	+56999490513	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.65	2026-04-01 19:44:50.65
3622	MJ		\N	social.mariajosepinto@gmail.com	+56950903446	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.651	2026-04-01 19:44:50.651
3623	Ruth		\N	revs6666@hotmail.com	+56959806679	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.651	2026-04-01 19:44:50.651
3624	Claudia		\N	claudiasalgadog@gmail.com	+56959025780	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.652	2026-04-01 19:44:50.652
3625	Matias	Ampuero	\N	mampueroj@gmail.com	+56964551065	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.653	2026-04-01 19:44:50.653
3626	Rossy	Melania Mercurio	\N	rmmv_@hotmail.com	+56957633612	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.654	2026-04-01 19:44:50.654
3627	Jorge		\N	jorge.simon56@gmail.com	+56954046596	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.654	2026-04-01 19:44:50.654
3628	Raul		\N	robustos64@hotmail.com	+56996794952	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.655	2026-04-01 19:44:50.655
3629	Estefania	Manosalva	\N	emanosalva@live.com	+56981565068	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.656	2026-04-01 19:44:50.656
3630	Kombienlocico		\N	erik.araya.s@gmail.com	+56956384024	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.657	2026-04-01 19:44:50.657
3631	Rajul		\N	tsraul.alfaro@gmail.com	+56944126321	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.657	2026-04-01 19:44:50.657
3632	Francisco		\N	vargasgarrido@gmail.com	+56959741954	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.658	2026-04-01 19:44:50.658
3633	Ivan		\N	ivan@separafilas.cl	987853609	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.659	2026-04-01 19:44:50.659
3634	Elizabeth		\N	eli.alcayaga1971@gmail.com	+56992022277	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.66	2026-04-01 19:44:50.66
3635	Patricio		\N	pescuderoh@gmail.com	+56992345052	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.661	2026-04-01 19:44:50.661
3636	Carlos		\N	wil1968der@gmail.com	+56998318098	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.661	2026-04-01 19:44:50.661
3637	Rodrigo	Araya	\N	rodrigoarayachandia@gmail.com	+56976536795	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.662	2026-04-01 19:44:50.662
3638	Daniela	Escalona	\N	danitac1984@gmail.com	+56958208271	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.663	2026-04-01 19:44:50.663
3639	Romina		\N	ro.leon.carrasco@gmail.com	+56978498621	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.664	2026-04-01 19:44:50.664
3640	Nicolas		\N	nicolas.moralesc@usach.cl	+56994405800	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.664	2026-04-01 19:44:50.664
3641	Vivian		\N	viviancerda@hotmail.com	+56984182030	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.665	2026-04-01 19:44:50.665
3642	Jose	Ramon	\N	pepemarimon@gmail.com	+56997776743	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.666	2026-04-01 19:44:50.666
3643	Edgardo	Rolando	\N	profed_21@yahoo.es	+56982893221	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.667	2026-04-01 19:44:50.667
3644	Enrique	Landeros	\N	mauriciolanderos.ml@gmail.com	+56983725246	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.667	2026-04-01 19:44:50.667
3645	Tarik		\N	abogado.lama@gmail.com	+56957193602	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.668	2026-04-01 19:44:50.668
3646	Gordana		\N	gordana151@gmail.com	+56992191564	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.669	2026-04-01 19:44:50.669
3647	Priscila		\N	priscila.nelsonm@gmail.com	+56942655614	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.67	2026-04-01 19:44:50.67
3648	Jorge		\N	yurochile@yahoo.com	+56996346047	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.671	2026-04-01 19:44:50.671
3649	Sergio	C	\N	Scampss@gmail.com	+56992239963	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.671	2026-04-01 19:44:50.671
3650	Janet		\N	jmirandao@gmail.com	+56997417565	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.672	2026-04-01 19:44:50.672
3651	CRBR_17		\N	christianbravor@gmail.com	+56982937434	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.673	2026-04-01 19:44:50.673
3652	Francisco		\N	ctasjfhenriquezh@gmail.com	+56981218055	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.674	2026-04-01 19:44:50.674
3653	Maria	Veronica	\N	vmoralesmaldonado@gmail.com	+56981387513	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.675	2026-04-01 19:44:50.675
3654	Luis	Raúl	\N	tataobrb@hotmail.com	+56956909987	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.675	2026-04-01 19:44:50.675
3655	Juan	Carlos	\N	juan.cofre.vera@gmail.com	+56950021864	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.676	2026-04-01 19:44:50.676
3656	Alfonso		\N	Alfonsoovalleo@gmail.com	+56999755644	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.677	2026-04-01 19:44:50.677
3657	Andrés	Salah Argandoña	\N	asalaharg@gmail.com	+56978872086	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.678	2026-04-01 19:44:50.678
3658	Iris		\N	irisoyarce.lrf@gmail.com	+56983614199	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.678	2026-04-01 19:44:50.678
3659	Hector	Opazo	\N	hectoropazop@yahoo.es	+56998447719	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.679	2026-04-01 19:44:50.679
3660	Yerko		\N	yerkorodriguez@yahoo.es	+56998859745	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.68	2026-04-01 19:44:50.68
3661	María	Eugenia del	\N	mariaeugeniadelpino@gmail.com	+56994371565	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.681	2026-04-01 19:44:50.681
3662	Ester		\N	estermora671@gmail.com	+56999983678	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.682	2026-04-01 19:44:50.682
3663	Andrea	Ortiz	\N	aortiz@grupoapacheta.cl	+56945499167	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.682	2026-04-01 19:44:50.682
3664	Martina	Baby &	\N	ursulavalenzuela@gmail.com	959215443	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.683	2026-04-01 19:44:50.683
3665	Eduardo		\N	eduardoperagallo@gmail.com	+56999391116	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.684	2026-04-01 19:44:50.684
3666	Enrique		\N	luarteycompania@gmail.com	+56996705780	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.685	2026-04-01 19:44:50.685
3667	Sergio	Victorino	\N	figueroa.ser@gmail.com	+56991427865	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.686	2026-04-01 19:44:50.686
3668	Manuel		\N	manuel.mujicas@hotmail.com	+56990025673	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.686	2026-04-01 19:44:50.686
3669	Miguel		\N	mmpinogar@gmail.com	+56922335366	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.687	2026-04-01 19:44:50.687
3670	erica		\N	0219ebas@gmail.com	+56978896403	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.688	2026-04-01 19:44:50.688
3671	José		\N	jp.salinas28@gmail.com	+56989970571	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.689	2026-04-01 19:44:50.689
3672	Ingrid	Sch	\N	ivschc@gmail.com	+56993441306	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.69	2026-04-01 19:44:50.69
3673	Rodrigo		\N	Rponce1985@me.com	+56968477963	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.691	2026-04-01 19:44:50.691
3674	Maria	eugenia	\N	m.eugenia.vega.cofre@gmail.com	+56963469754	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.691	2026-04-01 19:44:50.691
3675	Rodrigo		\N	Rodrigocanales.rca@gmail.com	+56974979760	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.692	2026-04-01 19:44:50.692
3676	Antonio		\N	antonio.escobarpalma@gmail.com	+56950944160	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.693	2026-04-01 19:44:50.693
3677	Juan	Pablo	\N	juanpabloandres@hotmail.cl	+56998085852	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.694	2026-04-01 19:44:50.694
3678	Juan	Carlos	\N	jcpabst@hotmail.com	+56976675098	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.695	2026-04-01 19:44:50.695
3679	Ruvén	Lopés	\N	nebur_l@hotmail.com	+56990461920	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.695	2026-04-01 19:44:50.695
3680	Jose		\N	jdom2704@gmail.com	+56941509756	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.696	2026-04-01 19:44:50.696
3681	Elizabeth		\N	elizabeth.lucero.mel@gmail.com	+56990445661	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.697	2026-04-01 19:44:50.697
3682	Cristián	Flores	\N	crfloresmarin@gmail.com	+56987654321	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.698	2026-04-01 19:44:50.698
3683	Cote		\N	mariajoseburgos25@yahoo.com	+56975889216	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.698	2026-04-01 19:44:50.698
3684	Karen		\N	combarbalitt@hotmail.com	+56993258578	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.699	2026-04-01 19:44:50.699
3685	Alex		\N	bitox24@hotmail.com	+56972026921	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.7	2026-04-01 19:44:50.7
3686	Eduardo		\N	eduardovasquezster@gmail.com	+56984232422	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.7	2026-04-01 19:44:50.7
3687	Pili		\N	pachapaf16@gmail.com	987686186	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.701	2026-04-01 19:44:50.701
3688	Marco	Santana	\N	marco.santana.folsch@gmail.com	+56999480939	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.702	2026-04-01 19:44:50.702
3689	Isabel		\N	isotapia@gmail.com	+56950433405	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.702	2026-04-01 19:44:50.702
3690	Fernanda	Ruíz hermosilla	\N	sergio.islasmorales@gmail.com	+56977904306	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.703	2026-04-01 19:44:50.703
3691	Carolina		\N	caroaguirrre1108@gmail.com	+56996674579	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.704	2026-04-01 19:44:50.704
3692	Magdalena		\N	mntapia@gmail.com	+56998844372	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.704	2026-04-01 19:44:50.704
3693	Catalina		\N	catalina.ramirez1@gmail.com	+5697398648	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.705	2026-04-01 19:44:50.705
3694	Daniela	Alejandra Sánchez	\N	daniela.sanchez@escuelanuevarepublica.com	+56971217422	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.706	2026-04-01 19:44:50.706
3695	Rony	Fernando	\N	ronybaezaluvecce@gmail.com	+56962086962	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.706	2026-04-01 19:44:50.706
3696	Rodrigo		\N	rormenom@gmail.com	992135139	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.707	2026-04-01 19:44:50.707
3697	Jaime		\N	jaimegodoyramirez@gmail.com	+56994169066	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.708	2026-04-01 19:44:50.708
3698	Marco		\N	marco.melo@gmail.com	+56990153352	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.708	2026-04-01 19:44:50.708
3699	Juan	Pablo	\N	juanpablo@gqconsultores.cl	+56952255559	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.709	2026-04-01 19:44:50.709
3700	José		\N	josse01@gmail.com	+56977552512	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.71	2026-04-01 19:44:50.71
3701	renzo		\N	renzohrazeto@yahoo.es	+56996443329	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.711	2026-04-01 19:44:50.711
3702	Esteban		\N	esessarego@gmail.com	+56962274086	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.711	2026-04-01 19:44:50.711
3703	Manuel		\N	manuel.herrera@forus.cl	+56979783257	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.712	2026-04-01 19:44:50.712
3704	Claudio		\N	cejorque@gmail.com	+56976999011	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.713	2026-04-01 19:44:50.713
3705	Ester		\N	estertenorio03@gimail.com	+56976735820	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.713	2026-04-01 19:44:50.713
3706	Jose		\N	bmx_sp_eric@hotmail.com	+56964167201	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.714	2026-04-01 19:44:50.714
3707	Patricio	Alonso	\N	patricio.zarate@gmail.com	+56998303950	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.715	2026-04-01 19:44:50.715
3708	Sandra		\N	sandrabenitez.m@gmail.com	+56932096759	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.715	2026-04-01 19:44:50.715
3709	Ramón		\N	ramoncandia01@gmail.com	+56993864922	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.716	2026-04-01 19:44:50.716
3710	Jose		\N	j.d.zamorano@gmail.com	56950587703	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.717	2026-04-01 19:44:50.717
3711	Marcelo		\N	marcelonajun8@gmail.com	+56966165621	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.717	2026-04-01 19:44:50.717
3712	María	José	\N	espinosamj@gmail.com	+56999491880	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.718	2026-04-01 19:44:50.718
3713	Yolanda		\N	seba_yoli@hotmail.com	+56959201577	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.719	2026-04-01 19:44:50.719
3714	Francisco		\N	francisco@cdyc.cl	+56998269215	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.719	2026-04-01 19:44:50.719
3715	Veronica	Alvarez	\N	veritosunshine@hotmail.com	+56990508064	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.72	2026-04-01 19:44:50.72
3716	Javier	Abdala	\N	jabdalar@gmail.com	942761027	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.721	2026-04-01 19:44:50.721
3717	maria	lorena	\N	encinahi@yahoo.es	+56983223621	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.722	2026-04-01 19:44:50.722
3718	claudia		\N	clauelenablu@gmail.com	+56999146499	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.722	2026-04-01 19:44:50.722
3719	Rosa	Maria Saavedra	\N	rosamariasaavedra@gmail.com	+56977574005	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.723	2026-04-01 19:44:50.723
3720	Fabian		\N	Fabian@autosyautos.cl	+56992589635	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.724	2026-04-01 19:44:50.724
3721	Rudan		\N	pizarrojamett@hotmail.com	+56968429352	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.724	2026-04-01 19:44:50.724
3722	Patricia	Moya	\N	r5moyagutierrez@gmail.com	+56982185553	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.725	2026-04-01 19:44:50.725
3723	Juan		\N	juanbozotoledo@hotmail.com	+56998430726	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.726	2026-04-01 19:44:50.726
3724	Vivi		\N	viviruizp@gmail.com	+56961735735	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.727	2026-04-01 19:44:50.727
3725	José	Sepúlveda	\N	josesochin@gmail.com	+56986454631	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.727	2026-04-01 19:44:50.727
3726	Catherine		\N	catherine.miranda7l@hotmail.com	+56985050160	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.728	2026-04-01 19:44:50.728
3727	Daniela	Glaser	\N	daniglaserg@gmail.com	+56977906485	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.729	2026-04-01 19:44:50.729
3728	Karen		\N	karensquella@hotmail.com	+56976687852	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.73	2026-04-01 19:44:50.73
3729	Luis	Alberto Arenas	\N	laomc5925@gmail.com	+56979922862	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.73	2026-04-01 19:44:50.73
3730	Litsbett		\N	liss.v.kine@gmail.com	+56991675328	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.731	2026-04-01 19:44:50.731
3731	Sergio		\N	smellas2040@hotmail.com	+56992374998	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.732	2026-04-01 19:44:50.732
3732	Alexis		\N	alexis.ibanezr@gmail.com	939082223	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.732	2026-04-01 19:44:50.732
3733	Héctor		\N	hriquelmc@hotmail.com	+56972126322	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.733	2026-04-01 19:44:50.733
3734	Magda		\N	magdalenaperezatf@gmail.com	+56974325252	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.734	2026-04-01 19:44:50.734
3735	Nora		\N	noraencinado@gmail.com	+56977032866	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.735	2026-04-01 19:44:50.735
3736	Medusa		\N	mememercado@gmail.com	+56988652327	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.736	2026-04-01 19:44:50.736
3737	Luis	Aranda	\N	luis.aranda_94@yahoo.com	+56957861247	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.737	2026-04-01 19:44:50.737
3738	Luis		\N	joselamilla1981@gmail.com	+56935973233	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.737	2026-04-01 19:44:50.737
3739	Sebastián		\N	sebamariqueo23@gmail.com	+56935609455	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.738	2026-04-01 19:44:50.738
3740	Jose		\N	jl.henriquezcolima@gmail.com	+56982986650	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.739	2026-04-01 19:44:50.739
3741	Guille		\N	Gmoeguiguren@gmsil.com	967795666	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.74	2026-04-01 19:44:50.74
3742	Oscar		\N	oscartol@gmail.com	+56974080265	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.74	2026-04-01 19:44:50.74
3743	Ignacio	Muñoz	\N	Imunozf@udd.cl	+56962280288	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.741	2026-04-01 19:44:50.741
3744	Andrea	Guarín	\N	yuyu.guarin@gmail.com	+56950253672	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.742	2026-04-01 19:44:50.742
3745	Mabel		\N	mabelsaldivia@gmail.com	+56949035889	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.743	2026-04-01 19:44:50.743
3746	Luis	Alejandro Gonzalez	\N	luisalejandro06@hotmail.com	+56993065229	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.744	2026-04-01 19:44:50.744
3747	Francisco		\N	francisco.jaec@gmail.com	+5698249085	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.744	2026-04-01 19:44:50.744
3748	Nicolas		\N	nikolira@gmail.com	+56994457726	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.745	2026-04-01 19:44:50.745
3749	Paulo		\N	pauloriquelme_arq@hotmail.com	56979869792	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.746	2026-04-01 19:44:50.746
3750	Carlos		\N	carlos.lencka@gmail.com	+56975186486	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.747	2026-04-01 19:44:50.747
3751	Jacqueline	Llanos Concha	\N	jacquelinellanosc@gmail.com	+56966313042	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.747	2026-04-01 19:44:50.747
3752	Rolando	Cortés	\N	rolandocortestoro@gmail.com	+56995408994	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.748	2026-04-01 19:44:50.748
3753	Claudio	Miguel	\N	cmigueldiazd@gmail.com	+56962666552	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.749	2026-04-01 19:44:50.749
3754	Felipe		\N	fseguel.spa@gmail.com	+56989794967	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.75	2026-04-01 19:44:50.75
3755	Lissette	Schuster	\N	lschusterneumann@yahoo.es	+56995111952	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.751	2026-04-01 19:44:50.751
3756	Jessica		\N	jlcossiom@yahoo.com	+56977579330	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.751	2026-04-01 19:44:50.751
3757	Keinel		\N	keinelaparicio@gmail.com	+56931024178	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.752	2026-04-01 19:44:50.752
3758	Rosé		\N	rosalop2008@hotmail.com	+56990759209	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.753	2026-04-01 19:44:50.753
3759	Sergio		\N	vonpilsener@hotmail.com	+56985137136	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.754	2026-04-01 19:44:50.754
3760	Carolina	Fuentes	\N	nasnay_2@hotmail.com	+56971066099	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.754	2026-04-01 19:44:50.754
3761	Hugo		\N	hmcard@hotmail.com	+56989710071	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.755	2026-04-01 19:44:50.755
3762	Claudia		\N	cperezmanriquez@gmail.com	+56977645723	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.756	2026-04-01 19:44:50.756
3763	alejandro		\N	alejandroparada123@gmail.com	+56923869728	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.757	2026-04-01 19:44:50.757
3764	Jaime		\N	janmesina@hotmail.com	+56971353180	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.758	2026-04-01 19:44:50.758
3765	Paola		\N	yfuentealbamunoz@gmail.com	+56932423935	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.759	2026-04-01 19:44:50.759
3766	Carlos		\N	carlospadilla001@yahoo.es	+56992015807	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.76	2026-04-01 19:44:50.76
3767	Bárbara	Olavarría	\N	psi.barbara1@gmail.com	+56998056732	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.76	2026-04-01 19:44:50.76
3768	Aaron		\N	atslis@hotmail.com	+56985009543	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.761	2026-04-01 19:44:50.761
3769	Ysabel		\N	ysabel2143@gmail.com	+56975654709	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.762	2026-04-01 19:44:50.762
3770	Oliver		\N	rdeij01@gmail.com	+56979580089	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.763	2026-04-01 19:44:50.763
3771	Felipe		\N	fponcealarcon@gmail.com	965586977	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.763	2026-04-01 19:44:50.763
3772	Mauro		\N	mauro2312@hotmail.com	+56982604094	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.764	2026-04-01 19:44:50.764
3773	Paparazzi		\N	pablojaraflores@gmail.com	+56987680774	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.765	2026-04-01 19:44:50.765
3774	Ricardo		\N	ricardoor286@gmail.com	+56975402092	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.766	2026-04-01 19:44:50.766
3775	Adis		\N	adisaltamirano@gmail.com	997002989	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.766	2026-04-01 19:44:50.766
3776	Silvia		\N	sielgm@gmail.com	+56982079085	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.767	2026-04-01 19:44:50.767
3777	Rocio		\N	laura.riverasepulveda.00@gmail.com	+56951009182	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.768	2026-04-01 19:44:50.768
3778	Lorena		\N	loremartinez_017@gmail.com	+56977819401	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.769	2026-04-01 19:44:50.769
3779	Veronica	Contreras	\N	vcontreras_67@hotmail.com	+56995493409	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.77	2026-04-01 19:44:50.77
3780	Ximena	Maldonado	\N	xmaldonados@gmail.com	+56998471188	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.771	2026-04-01 19:44:50.771
3781	Claudio	Esteban	\N	cdiazperetti7@gmail.com	+56977791267	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.772	2026-04-01 19:44:50.772
3782	Hernan		\N	hernancrd.ro@gmail.com	+56965415689	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.772	2026-04-01 19:44:50.772
3783	Christian		\N	christianramireztj@gmail.com	+56998464337	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.773	2026-04-01 19:44:50.773
3784	Rose	marie Mardones	\N	rose.marie6608@gmail.com	+56979452432	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.774	2026-04-01 19:44:50.774
3785	Jorge	Arturo	\N	paulach3@hotmail.com	+56990019900	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.775	2026-04-01 19:44:50.775
3786	Valentina		\N	sandra.duran.gacitua@gmail.com	+56996362393	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.775	2026-04-01 19:44:50.775
3787	Cristian	Canteros	\N	cricanterios@gmail.com	+56999999999	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.776	2026-04-01 19:44:50.776
3788	Jessica		\N	jessica.cuevas.a@gmail.com	+56971861367	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.777	2026-04-01 19:44:50.777
3789	Mariela		\N	marielaalejandra2012@gmail.com	+56968377654	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.778	2026-04-01 19:44:50.778
3790	Claudia		\N	claudiacaros@gmail.cl	+56985482525	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.779	2026-04-01 19:44:50.779
3791	Patto		\N	patricio32243@gmail.com	+56954714663	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.779	2026-04-01 19:44:50.779
3792	Clalfdio		\N	diazrojasclaudio@gmail.com	977682581	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.78	2026-04-01 19:44:50.78
3793	Pewen		\N	safn92@gmail.com	+56225185158	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.781	2026-04-01 19:44:50.781
3794	DT		\N	daniel.torrealba@me.com	+56987421675	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.782	2026-04-01 19:44:50.782
3795	Claudio		\N	cgodoysantana@gmail.com	+56998832820	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.783	2026-04-01 19:44:50.783
3796	Solange	Villegas	\N	solevil07@hotmail.com	+56944205923	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.784	2026-04-01 19:44:50.784
3797	Titi		\N	mbucareym@gmail.com	+56989549544	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.784	2026-04-01 19:44:50.784
3798	Jhonattan		\N	jhonattanmora@hotmail.com	+56979419662	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.785	2026-04-01 19:44:50.785
3799	Carolyn		\N	cmezag@socovesa.cl	+56985027640	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.786	2026-04-01 19:44:50.786
3800	Karen		\N	karen.a.almarza.g@gmail.com	+56968460291	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.787	2026-04-01 19:44:50.787
3801	Luis		\N	alberto.lobos.m@gmail.com	+56992066833	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.787	2026-04-01 19:44:50.787
3802	Jacqueline	Rojas	\N	jacqueline.r.rojas@gmail.com	990657201	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.788	2026-04-01 19:44:50.788
3803	Esteban	Ricke	\N	dr.esteban.ricke@gmail.com	+56979430751	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.789	2026-04-01 19:44:50.789
3804	Mesón	De	\N	claud.aguilera@gmail.com	+56998201112	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.79	2026-04-01 19:44:50.79
3805	Pedro	Carrillo | ПРЕПОДАВАТЕЛЬ ИСПАНСКОГО	\N	pcarrilloto@gmail.com	+79811587716	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.79	2026-04-01 19:44:50.79
3806	Jocelyn	San Martin	\N	jocelyn.sanmartin.soldini@gmail.com	+56996844792	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.791	2026-04-01 19:44:50.791
3807	Angelo		\N	d_angelo01@hotmail.com	+56983547719	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.792	2026-04-01 19:44:50.792
3808	Miguel		\N	mescobar77@hotmail.com	+56996791129	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.793	2026-04-01 19:44:50.793
3809	Claudia	Suárez Del	\N	csuarezdp@gmail.com	+56989223332	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.794	2026-04-01 19:44:50.794
3810	Claudia		\N	claudiamonjes@gmail.com	+56975588575	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.794	2026-04-01 19:44:50.794
3811	Erika		\N	kekita_h@hotmail.com	+56930279629	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.795	2026-04-01 19:44:50.795
3812	Viviana	Cordero	\N	vivianscordero@gmail.com	+56998984265	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.796	2026-04-01 19:44:50.796
3813	Nicolás		\N	nicolas.saez@gmail.com	+56991583429	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.797	2026-04-01 19:44:50.797
3814	Marco	Antonio	\N	mbarbagelatads@gmail.com	+56992183183	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.798	2026-04-01 19:44:50.798
3815	Pancho		\N	panchogatica@gmail.com	+56993185953	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.798	2026-04-01 19:44:50.798
3816	Alvaro		\N	ramirez.alvarofdo@gmail.com	+56958582652	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.799	2026-04-01 19:44:50.799
3817	Liliana		\N	liliana0723@gmail.com	+56992296649	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.8	2026-04-01 19:44:50.8
3818	Sandra	Victoria	\N	svictoriad@hotmail.com	+56984111375	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.801	2026-04-01 19:44:50.801
3819	Ana	Maria Molina	\N	anamariams2129@gmail.com	+56994971183	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.802	2026-04-01 19:44:50.802
3820	Reinaldo		\N	reinaldo@grupomoal.cl	+56978039523	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.802	2026-04-01 19:44:50.802
3821	Ramón	Cofré	\N	ramoncofre@gmail.com	+56989496069	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.803	2026-04-01 19:44:50.803
3822	José		\N	j.cespedesw93@gmail.com	+56953631088	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.804	2026-04-01 19:44:50.804
3823	Marcelo		\N	emmolinet@gmail.com	+56983609767	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.805	2026-04-01 19:44:50.805
3824	David		\N	dagaldames@hotmail.com	+56977744798	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.806	2026-04-01 19:44:50.806
3825	Hernán	Villagrán	\N	H.villagran@hotmail.com	+56988046692	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.806	2026-04-01 19:44:50.806
3826	Guido	Conejeros	\N	guidoconejeros@gmail.com	+56992003497	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.807	2026-04-01 19:44:50.807
3827	Claudia		\N	varaskiki@gmail.com	+56966087833	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.808	2026-04-01 19:44:50.808
3828	Maria	Jose Perez	\N	majoperezf@hotmail.com	+56920890392	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.809	2026-04-01 19:44:50.809
3829	Karina	Obreque	\N	karina.obrequel@gmail.com	+56978922659	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.81	2026-04-01 19:44:50.81
3830	Valentina		\N	vmcaneo@uc.cl	+56975633556	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.81	2026-04-01 19:44:50.81
3831	Pablo		\N	p.castro.hormazabal@mail.com	+56955395596	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.811	2026-04-01 19:44:50.811
3832	Pedro		\N	pgonzale782@gmail.com	+56988271592	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.812	2026-04-01 19:44:50.812
3833	Mercedes		\N	mechegimenezb@gmail.com	+56941119186	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.813	2026-04-01 19:44:50.813
3834	Luis	Alberto Portales	\N	Alberto.portalesh@gmail.com	+56990500220	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.814	2026-04-01 19:44:50.814
3835	Marcela		\N	marceligon@hotmail.com	+56998371492	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.814	2026-04-01 19:44:50.814
3836	Jorge		\N	jorgechaconcampos@gmail.com	+56978799504	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.815	2026-04-01 19:44:50.815
3837	Mario		\N	m.sepulveda.v@icloud.com	+56992239791	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.816	2026-04-01 19:44:50.816
3838	Ximena		\N	ximena.torres2170@gmail.com	+56935004887	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.817	2026-04-01 19:44:50.817
3839	Rodolfo		\N	bopodelvalle@gmail.com	+4917634681109	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.818	2026-04-01 19:44:50.818
3840	Victor		\N	vidalsaezvictor@gmail.com	+56998316359	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.818	2026-04-01 19:44:50.818
3841	Dario.		\N	darioyarzo@hotmail.com	+56950969797	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.819	2026-04-01 19:44:50.819
3842	Ivan		\N	ivanarielmunozv@gmail.com	+56941546560	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.82	2026-04-01 19:44:50.82
3843	Nicolás		\N	nicolasfelipeaguirre@gmail.com	+56975150609	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.821	2026-04-01 19:44:50.821
3844	Victor		\N	vrfiguerov@gmail.com	+56998749340	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.821	2026-04-01 19:44:50.821
5165	Marcia	Fuentes	\N	\N	\N	\N	NATURAL	OTRO	\N	2026-04-13 17:32:14.485	2026-04-13 17:32:14.485
3845	Antony		\N	saborclandestinocl@gmail.com	+56981416296	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.822	2026-04-01 19:44:50.822
3846	Pablo	Ignacio	\N	verarojasp@gmail.com	+56966585718	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.823	2026-04-01 19:44:50.823
3847	Mariela	Rodriguez	\N	marielasmc@gmail.com	998477061	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.824	2026-04-01 19:44:50.824
3848	Rodrigo		\N	superdrigo@hotmail.com	+56978066973	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.824	2026-04-01 19:44:50.824
3849	Raul		\N	alfripoll56@yahoo.es	+56993385621	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.825	2026-04-01 19:44:50.825
3850	Antonio		\N	antoniogiadalahaedo@gmail.com	+56988395343	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.826	2026-04-01 19:44:50.826
3851	Sergio		\N	sergioumella.85@gmail.com	+56971559038	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.827	2026-04-01 19:44:50.827
3852	Felipe		\N	Felipeotayza@gmail.com	+56999190243	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.828	2026-04-01 19:44:50.828
3853	Ximena		\N	Buscapro@hotmail.com	+56990999867	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.829	2026-04-01 19:44:50.829
3854	Koka		\N	carolinaing.comercial@gmail.com	+56985382129	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.83	2026-04-01 19:44:50.83
3855	Graciela		\N	Gracimati@hotmail.cl	+56944350560	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.831	2026-04-01 19:44:50.831
3856	Carolina		\N	carosandovalsepulveda84@gmail.com	+56983632703	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.831	2026-04-01 19:44:50.831
3857	Francisca		\N	fcastrof2023@gmail.com	+56999895052	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.832	2026-04-01 19:44:50.832
3858	Pablo	Gonzalez	\N	apagc2008@gmail.com	+56988888888	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.833	2026-04-01 19:44:50.833
3859	Marco	Antonio Lowen	\N	marco.lowen@gmail.com	+56998480868	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.834	2026-04-01 19:44:50.834
3860	Andrea	Donoso	\N	Andreadonoso2@gmail.com	+56	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.834	2026-04-01 19:44:50.834
3861	Monica		\N	monicafernandezpessoa@gmail.com	+56994351999	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.835	2026-04-01 19:44:50.835
3862	Fernanda	Rojas	\N	mafer_89_90@hotmail.com	+56989269164	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.836	2026-04-01 19:44:50.836
3863	Camila	Seguel	\N	c.seguel06@ufromail.cl	+56964371581	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.837	2026-04-01 19:44:50.837
3864	Gabriel	Fica	\N	gabfica@gmail.com	+56930045242	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.837	2026-04-01 19:44:50.837
3865	marcela	landero	\N	marcelandala@hotmail.com	+56999471240	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.838	2026-04-01 19:44:50.838
3866	Jose		\N	milhousepropiedades@gmail.com	+56996893611	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.839	2026-04-01 19:44:50.839
3867	Thiele		\N	edgardothiele@gmail.com	+56992983841	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.84	2026-04-01 19:44:50.84
3868	Héctor		\N	Hcabello122@gmail.com	+56992351605	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.841	2026-04-01 19:44:50.841
3869	María		\N	maluvenegas.s@gmail.com	+56968579905	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.841	2026-04-01 19:44:50.841
3870	Eve	[UNICA	\N	antilefnaomivivian@gmail.com	+56933418255	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.842	2026-04-01 19:44:50.842
3871	Lilian	Quevedo	\N	lilianquevedo@hotmail.com	+56961188283	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.843	2026-04-01 19:44:50.843
3872	Denisse		\N	dcolimam@gmail.com	+56974169071	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.844	2026-04-01 19:44:50.844
3873	Joaquin		\N	joaquin.sepulvedaruiz@gmail.com	+56995343673	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.845	2026-04-01 19:44:50.845
3874	Víctor		\N	vvelasquez64@gmail.com	+56989227148	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.845	2026-04-01 19:44:50.845
3875	Luisa	Mendez	\N	angelkmendz@gmail.com	+56978217801	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.846	2026-04-01 19:44:50.846
3876	Braulio	Muñoz	\N	vmhb3181@hotmail.cl	+56968397027	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.847	2026-04-01 19:44:50.847
3877	Rodrigo		\N	rapizarrovaldes@gmail.com	+56996427456	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.848	2026-04-01 19:44:50.848
3878	Paola		\N	Paola@grupovelvet.cl	+56990131031	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.848	2026-04-01 19:44:50.848
3879	Claudio		\N	Claudioignaciocampos@gmail.com	+56978402860	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.849	2026-04-01 19:44:50.849
3880	Fernando		\N	gfdo1800@gmail.com	+56982599803	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.85	2026-04-01 19:44:50.85
3881	Diego	Silva	\N	diego.silva010500@gmail.com	+56955370741	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.851	2026-04-01 19:44:50.851
3882	Raquel	Epullanca	\N	repullan@gmail.com	999255773	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.852	2026-04-01 19:44:50.852
3883	Marycarmen		\N	mvaldiviabellido@gmail.com	+56992378223	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.853	2026-04-01 19:44:50.853
3884	Gloria		\N	propiedadesgsepulveda@gmail.com	+56987471652	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.853	2026-04-01 19:44:50.853
3885	Iris	Troncoso	\N	catalinasilvatroncoso@gmail.com	+56984419984	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.854	2026-04-01 19:44:50.854
3886	AgendaNos		\N	agenda.nos.papeleria@gmail.com	+56988815449	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.855	2026-04-01 19:44:50.855
3887	Javier		\N	euskerra@gmail.com	978508083	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.856	2026-04-01 19:44:50.856
3888	Eliana		\N	manriquezcachicas@hotmail.com	+56962411149	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.856	2026-04-01 19:44:50.856
3889	Mauricio	Moreno	\N	mmorenolarre@gmail.com	+56942339830	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.857	2026-04-01 19:44:50.857
3890	Angel	Roco	\N	angel.roco.videla@gmail.com	+56979477167	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.858	2026-04-01 19:44:50.858
3891	Miriam	Rivera	\N	miriam.del.carmen.rivera.cea@gmail.com	979943632	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.859	2026-04-01 19:44:50.859
3892	Muebles		\N	cvelasquezp1977@gmail.com	+56995584618	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.86	2026-04-01 19:44:50.86
3893	Cristian	Marcelo Márquez	\N	cmarquezvalencia@gmail.com	+56976958695	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.86	2026-04-01 19:44:50.86
3894	Sandra	Ines Vergara	\N	vergaraverasandra@gmail.com	+56957848243	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.861	2026-04-01 19:44:50.861
3895	Carlos	Antonio	\N	krunan@gmail.com	+56979584153	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.862	2026-04-01 19:44:50.862
3896	annie		\N	annesigiacaman@gmail.com	+56952092048	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.863	2026-04-01 19:44:50.863
3897	Marioly		\N	mgm.vermussa@gmail.com	56962648419	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.864	2026-04-01 19:44:50.864
3898	Carla		\N	carla.p.hernandez@gmail.com	+56994535207	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.864	2026-04-01 19:44:50.864
3899	Ingrid		\N	ingridpereira22@gmail.com	+56998056465	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.865	2026-04-01 19:44:50.865
3900	Constanza		\N	lopezconstanzafrancisca@gmail.com	+56963725160	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.866	2026-04-01 19:44:50.866
3901	Francisco	Javier Salinas	\N	franciscosalinas2121@gmail.com	+56975299784	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.867	2026-04-01 19:44:50.867
3902	Rodrigo	Andrés	\N	raparada@hotmail.com	+56983611703	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.867	2026-04-01 19:44:50.867
3903	Jo		\N	jlcolmenares@hotmail.com	+56945057598	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.868	2026-04-01 19:44:50.868
3904	Cristian		\N	cfelisf@gmail.com	+56982535137	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.869	2026-04-01 19:44:50.869
3905	Pablo	Parada	\N	pablo.paradap@gmail.com	+56992431529	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.87	2026-04-01 19:44:50.87
3906	Jesica	Pamela Marchant	\N	pamarchant@gmail.com	+56940226201	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.871	2026-04-01 19:44:50.871
3907	Humberto		\N	Ventas@Multipropiedades.cl	+56932335286	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.871	2026-04-01 19:44:50.871
3908	Loreto		\N	loreto.lpn@gmail.com	+56930360932	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.872	2026-04-01 19:44:50.872
3909	Waldo		\N	wa.riveras@gmail.com	+56949664211	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.873	2026-04-01 19:44:50.873
3910	jaime		\N	jaimee.aguayom@gmail.com	+56996722758	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.874	2026-04-01 19:44:50.874
3911	Luis	Ortega Bustamante	\N	orbu64@hotmail.com	+56993328187	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.874	2026-04-01 19:44:50.874
3912	Cristian	Matus	\N	cristianmatus73@gmail.com	+56956090708	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.876	2026-04-01 19:44:50.876
3913	Violeta	Villena	\N	violetaivc@hotmail.com	+56994426778	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.876	2026-04-01 19:44:50.876
3914	Luis		\N	ljacques17@gmail.com	+56977903130	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.877	2026-04-01 19:44:50.877
3915	Pablo	Ramirez	\N	pablom.ramirezm@gmail.com	995644812	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.878	2026-04-01 19:44:50.878
3916	Viviana	Faundez	\N	vivifaundez@hotmail.com	+56950377490	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.879	2026-04-01 19:44:50.879
3917	Faby		\N	fabiolagarcia30@hotmail.com	+56953324845	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.88	2026-04-01 19:44:50.88
3918	Luisa	Acevedo	\N	luisa.acevedosilva@gmail.com	+56998185331	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.88	2026-04-01 19:44:50.88
3919	Susana		\N	susanacardenasb@gmail.com	+56971966833	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.881	2026-04-01 19:44:50.881
3920	Paula		\N	paulacontra@hotmail.com	+56982481350	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.882	2026-04-01 19:44:50.882
3921	Rodolfo		\N	rudy.elbelman.k@gmail.com	+56990138052	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.883	2026-04-01 19:44:50.883
3922	Janina		\N	elisajbarria@gmail.com	+56974902015	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.885	2026-04-01 19:44:50.885
3923	Paula	Mundaca	\N	pmundaca1378@gmail.com	+56951986185	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.886	2026-04-01 19:44:50.886
3924	Génesis		\N	alenu.inversiones@gmail.com	+56930188670	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.889	2026-04-01 19:44:50.889
3925	Fabiola		\N	fgaete36@hotmail.com	+56984521753	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.89	2026-04-01 19:44:50.89
3926	Javier		\N	javierlaras@hotmail.com	+56979787406	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.891	2026-04-01 19:44:50.891
3927	patricia	beasain	\N	nicasio52@yahoo.es	979735940	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.892	2026-04-01 19:44:50.892
3928	Pamela	Cifuentes	\N	Pame_cifuentes@hotmail.com	+56985096840	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.893	2026-04-01 19:44:50.893
3929	Max		\N	m.jablonowsky@gmail.com	+56987571864	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.894	2026-04-01 19:44:50.894
3930	Jose		\N	ardilesjoseluis@hotmail.com	71384115	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.895	2026-04-01 19:44:50.895
3931	José	Eduardo	\N	quinchalef2012@gmail.com	+56979269579	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.895	2026-04-01 19:44:50.895
3932	Javier	Andrés Martín	\N	javier.martin.albornoz@gmail.com	+56978566026	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.896	2026-04-01 19:44:50.896
3933	Nicole	Solange	\N	contatonicolemoller@gmail.com	968469168	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.897	2026-04-01 19:44:50.897
3934	Chefest		\N	estelasotob@hotmail.com	+56950692189	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.898	2026-04-01 19:44:50.898
3935	Katherine		\N	totalpies@gmail.com	+56947398281	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.898	2026-04-01 19:44:50.898
3936	Pablo		\N	pablojara.prevencion@gmail.com	+56963176321	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.899	2026-04-01 19:44:50.899
3937	Nelson		\N	nelson.ruiz.ortiz@gmail.com	+56955361003	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.9	2026-04-01 19:44:50.9
3938	Lorena	González	\N	ps.lorenagonzalezbowen@gmail.com	+56945281556	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.901	2026-04-01 19:44:50.901
3939	Sergio	Sánchez	\N	seconte.scl@gmail.com	+56995296187	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.901	2026-04-01 19:44:50.901
3940	Italo		\N	italoterrafe@hotmail.com	+56978507648	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.902	2026-04-01 19:44:50.902
3941	Maribel		\N	maribel_sanhueza@hotmail.com	+56967192577	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.903	2026-04-01 19:44:50.903
3942	Juan	Andres Giadalah	\N	juangiadalah@gmail.com	+56985017728	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.904	2026-04-01 19:44:50.904
3943	claudio		\N	claudiomoncada60@gmail.com	+56930719373	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.905	2026-04-01 19:44:50.905
3944	Bernardo		\N	bcampospublicidad@gmail.com	+56996401030	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.905	2026-04-01 19:44:50.905
3945	Noedvith	Rosendi	\N	noedvith3@gmail.com	+56978565631	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.906	2026-04-01 19:44:50.906
3946	Bárbara	Contesse	\N	hisakumi@hotmail.com	+56966189688	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.907	2026-04-01 19:44:50.907
3947	David	Villanueva	\N	Dvillanuevamassardo@gmail.com	+56940498817	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.907	2026-04-01 19:44:50.907
3948	Erling	Pablo	\N	eerling_@hotmail.com	+56954006191	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.908	2026-04-01 19:44:50.908
3949	David		\N	dbeckersch@gmail.com	+56993258079	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.909	2026-04-01 19:44:50.909
3950	La		\N	claudia_mujica@hotmail.com	+56977921721	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.909	2026-04-01 19:44:50.909
3951	Rodrigo		\N	rodrigo_h84@hotmail.com	+56978984498	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.91	2026-04-01 19:44:50.91
3952	Osbin		\N	comercialkrk@yahoo.com	+56977751017	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.911	2026-04-01 19:44:50.911
3953	Yasmina	Rubilar	\N	nina-benik5@hotmail.com	+56973090548	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.912	2026-04-01 19:44:50.912
3954	Rodolfo	Martinez	\N	rodolfomartinezreyes@gmail.com	944716846	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.913	2026-04-01 19:44:50.913
3955	Jose	Miguel	\N	jm.ugalden@gmail.com	+56954292155	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.913	2026-04-01 19:44:50.913
3956	mery		\N	ma78nada@gmail.com	+56950422546	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.914	2026-04-01 19:44:50.914
3957	domos		\N	emendezhh@gmail.com	+56972101645	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.915	2026-04-01 19:44:50.915
3958	Marcela	Andrea Aravena	\N	m.andreaaravena@gmail.com	+56992225422	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.916	2026-04-01 19:44:50.916
3959	Jimena	Beatriz Astorga	\N	jimena.astorga@gmail.com	+56988824794	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.916	2026-04-01 19:44:50.916
3960	Jorge		\N	jguajardomar@hotmail.com	+56996980134	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.917	2026-04-01 19:44:50.917
3961	Ingrid	Verónica	\N	s.espinoza04@ufromail.com	96825769	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.918	2026-04-01 19:44:50.918
3962	Jonathan	Guerrero	\N	jonathanguerreroherrera92@gmail.com	+56934955851	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.919	2026-04-01 19:44:50.919
3963	Marcelo	Rifo	\N	marceloantoniorifo@gmail.com	+56963073481	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.919	2026-04-01 19:44:50.919
3964	Gonzalo	Valderrama	\N	gvalderramatv@gmail.com	+56982890567	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.92	2026-04-01 19:44:50.92
3965	Casa	árbol	\N	Maxveramendoza@gmail.con	+56956687461	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.921	2026-04-01 19:44:50.921
3966	Mónica	Zapata	\N	Monicazapatag@yahoo.es	+56995761269	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.921	2026-04-01 19:44:50.921
3967	Fermín		\N	traumaimagen@yahoo.com	+56983550066	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.922	2026-04-01 19:44:50.922
3968	Claudia	Córdova	\N	cmcj30@hotmail.com	+56994032186	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.923	2026-04-01 19:44:50.923
3969	ª		\N	igansaga@gmail.com	990820526	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.924	2026-04-01 19:44:50.924
3970	Eduardo		\N	ecommentzc@gmail.com	+56993289594	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.924	2026-04-01 19:44:50.924
3971	Luis	Llanos	\N	gerencia@waitec.cl	+56972131575	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.925	2026-04-01 19:44:50.925
3972	marce		\N	msanhuezaflores@gmail.com	56942367573	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.926	2026-04-01 19:44:50.926
3973	Carlos		\N	carlosprietocruz1255@gmail.com	+56979926826	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.927	2026-04-01 19:44:50.927
3974	Pedro		\N	pedrojarpa777@gmail.com	+56989798694	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.928	2026-04-01 19:44:50.928
3975	Pamela		\N	pamelapamela1904@gmail.com	+56966077156	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.928	2026-04-01 19:44:50.928
3976	Carlos		\N	carlosdelarosajara@gmail.com	+56998349577	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.929	2026-04-01 19:44:50.929
3977	Angela	Proboste	\N	a_proboste@hotmail.com	+56966206467	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.93	2026-04-01 19:44:50.93
3978	Lorena		\N	lperezminte@gmail.com	+56999592412	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.931	2026-04-01 19:44:50.931
3979	Tomas		\N	contacto@tasahome.cl	+56978544254	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.931	2026-04-01 19:44:50.931
3980	Hugo	Almandoz	\N	halmandoz@hotmail.com	+56998629093	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.932	2026-04-01 19:44:50.932
3981	Carlos		\N	carloshuertaquinsacara@gmail.com	+56981211661	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.933	2026-04-01 19:44:50.933
3982	Alfredo		\N	alfredosanmartin@yahoo.com	+56983536522	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.934	2026-04-01 19:44:50.934
3983	Roxana	Huerta	\N	roxana.huerta@gmail.com	+56999392541	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.935	2026-04-01 19:44:50.935
3984	Jennifer		\N	jennifer.villarroel.carrasco@gmail.com	+56994815752	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.935	2026-04-01 19:44:50.935
3985	Gonzalo	Vera	\N	gonzalo.vera7@gmail.com	+56992151663	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.936	2026-04-01 19:44:50.936
3986	Silvia	Berrios	\N	silviaberrioscerda@gmail.com	+56994815712	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.937	2026-04-01 19:44:50.937
3987	María		\N	majoeetetica21@gmail.com	+56995415120	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.938	2026-04-01 19:44:50.938
3988	Eduardo		\N	styleventa@gmail.com	+56951050405	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.938	2026-04-01 19:44:50.938
3989	Orlando		\N	orlando_vedder@hotmail.com	+56975895256	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.939	2026-04-01 19:44:50.939
3990	Juan	Robledo	\N	juanrobledocani@gmail.com	+944329639	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.94	2026-04-01 19:44:50.94
3991	Rosmery	Jorquera	\N	rosmeryjorqueracr@gmail.com	+56988031799	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.941	2026-04-01 19:44:50.941
3992	Miguel		\N	miguelmatamala1975@hotmail.com	+56974849405	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.942	2026-04-01 19:44:50.942
3993	Priscila		\N	priscila.avila@gmail.com	+56997839971	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.942	2026-04-01 19:44:50.942
3994	Natalia	peña	\N	nataliap.nutricionista@gmail.com	989961787	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.943	2026-04-01 19:44:50.943
3995	Rodrigo	Castro Jurgensen	\N	rcj.aero@hotmail.com	+56998631260	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.944	2026-04-01 19:44:50.944
3996	Nohay		\N	sergionomas@gmail.com	+56994085353	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.945	2026-04-01 19:44:50.945
3997	Maria	de los Angeles Caceres	\N	zafi12002@hotmail.com	+56965468499	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.946	2026-04-01 19:44:50.946
3998	oscar		\N	navarrooscar383@gmail.com	+56971632737	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.946	2026-04-01 19:44:50.946
3999	Pabla	Pizarro	\N	pablitapg@hotmail.com	+56996096333	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.947	2026-04-01 19:44:50.947
4000	Rodrigo		\N	racunagallegos8@gmail.com	991044324	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.948	2026-04-01 19:44:50.948
4001	Roberto		\N	robertohp14@gmail.com	+56991300264	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.949	2026-04-01 19:44:50.949
4002	Yasmina		\N	pamela.cc021@gmail.com	+56979142017	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.95	2026-04-01 19:44:50.95
4003	Daniel	Ramos	\N	leondecollao87@gmail.com	+56978674100	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.951	2026-04-01 19:44:50.951
4004	Ernesto		\N	ernesto@puntonorte.cl	+56992112752	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.951	2026-04-01 19:44:50.951
4005	Robinson	Eduardo Rios	\N	rorioscornejo@gmail.com	+5642584204	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.952	2026-04-01 19:44:50.952
4006	Olivia	Pinto	\N	olypinto@live.cl	986294279	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.953	2026-04-01 19:44:50.953
4007	Felipe	Antonio Tapia	\N	climalys@live.com	+56982705970	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.954	2026-04-01 19:44:50.954
4008	Carmen		\N	ccaravena63@gmail.com	+579556266	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.955	2026-04-01 19:44:50.955
4009	Flavio		\N	flatorma@gmail.com	+56999982555	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.955	2026-04-01 19:44:50.955
4010	Maria	Angelica	\N	angelikahuerta@gmail.com	+56972164530	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.956	2026-04-01 19:44:50.956
4011	Monica	Andrea Bustos	\N	bustosmonica720@gmail.com	+56996791110	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.957	2026-04-01 19:44:50.957
4012	Aguilera		\N	susan17aguilera.valeria@gmail.com	+56987972174	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.958	2026-04-01 19:44:50.958
4013	Cristian		\N	crisianguardarossler@gmail.com	+56956287832	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.958	2026-04-01 19:44:50.958
4014	Alvaro		\N	alvarangar@hotmail.com	+56975187528	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.959	2026-04-01 19:44:50.959
4015	Gabriela	M	\N	gmillanj@hotmail.com	+56981381737	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.96	2026-04-01 19:44:50.96
4016	Mauricio	Campos	\N	macrigo_home@icloud.com	+56942548769	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.961	2026-04-01 19:44:50.961
4017	felipe		\N	fcornejoretamal@gmail.com	+56965873727	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.962	2026-04-01 19:44:50.962
4018	Oscar	Morales	\N	tordesilla@gmail.com	+56949984890	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.962	2026-04-01 19:44:50.962
4019	Jocelyn		\N	jocelyn.salinas@usach.cl	+56934818131	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.963	2026-04-01 19:44:50.963
4020	Elvira		\N	elvira_pastene@hotmail.com	+56963754658	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.964	2026-04-01 19:44:50.964
4021	Viviana	Daza	\N	viv.daza@gmail.com	+56997737079	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.965	2026-04-01 19:44:50.965
4022	Juan	Carlos	\N	juancarlos281966@gmail.com	+56994999752	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.966	2026-04-01 19:44:50.966
4023	Christopher		\N	christeban@live.cl	+56968323471	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.966	2026-04-01 19:44:50.966
4024	Claudia	B.V	\N	cbastidas1990@gmail.com	947568295	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.967	2026-04-01 19:44:50.967
4025	Sp	servicios integrales spa	\N	molinaarosj@gmail.com	+56991852976	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.968	2026-04-01 19:44:50.968
4026	Jorge	Campos	\N	jorge.camposguerra@gmail.com	+56994784804	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.969	2026-04-01 19:44:50.969
4027	Diego		\N	martinez.das@gmail.com	+569305896	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.969	2026-04-01 19:44:50.969
4028	Dra	Sophia Torrez • Estética y Rejuvenecimiento	\N	dra.sophiatorrez@hotmail.com	+56966637037	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.97	2026-04-01 19:44:50.97
4029	Rossana		\N	noemiheller@gmail.com	+56993966058	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.971	2026-04-01 19:44:50.971
4030	Soledad		\N	dije06es93@gmail.com	+56982934427	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.972	2026-04-01 19:44:50.972
4031	Miguel		\N	prambs@gmail.com	+56977932575	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.973	2026-04-01 19:44:50.973
4032	Rafael		\N	rafarojasrc@gmail.com	+56988321013	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.974	2026-04-01 19:44:50.974
4033	Maribel		\N	maribel.constanzo@gmail.com	+56997759636	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.975	2026-04-01 19:44:50.975
4034	Jovi	Sandoval	\N	jovislavsandoval@yahoo.com	+56961918084	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.976	2026-04-01 19:44:50.976
4035	Sergio		\N	sergiofamestica77@gmail.com	+56981748861	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.976	2026-04-01 19:44:50.976
4036	Mariela	Velazco - Escritora- Emprendedora	\N	mvelascos13@gmail.com	+56968026138	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.977	2026-04-01 19:44:50.977
4037	Ruben		\N	rubenriveradmarcia@gmail.com	+56993997835	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.978	2026-04-01 19:44:50.978
4038	Jaime	Pinto	\N	jaimepintogomez@gmail.com	+56995906486	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.979	2026-04-01 19:44:50.979
4039	Patricia	Gutiérrez	\N	epatigutierrezf@gmail.com	+56964973974	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.98	2026-04-01 19:44:50.98
4040	Ricardo		\N	r.bauer@vtr.net	+56998857222	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.981	2026-04-01 19:44:50.981
4041	Jonatan		\N	jzamoranocon@gmail.com	+56957899218	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.982	2026-04-01 19:44:50.982
4042	Javier		\N	javinri@hotmail.com	+56963205909	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.982	2026-04-01 19:44:50.982
4043	Luis		\N	Lernestopenac@gmail.com	+56994256270	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.983	2026-04-01 19:44:50.983
4044	Araneda		\N	etena_2002@yahoo.com.mx	+56987236910	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.984	2026-04-01 19:44:50.984
4045	Cristian	Aravena	\N	cristianaravenavillablanca@gmail.com	+56994694726	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.985	2026-04-01 19:44:50.985
4046	Susana	Mourad	\N	nassabay@gmail.com	+56977542463	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.986	2026-04-01 19:44:50.986
4047	Daniel		\N	danielnorambuena@hotmail.com	+56946118230	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.986	2026-04-01 19:44:50.986
4048	Cristian		\N	cado1@hotmail.es	+56953344581	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.987	2026-04-01 19:44:50.987
4049	Luis		\N	luisacostel@hotmail.com	+56993736397	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.988	2026-04-01 19:44:50.988
4050	Fredy		\N	Transportescgf@gmail.com	+56992684958	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.989	2026-04-01 19:44:50.989
4051	Ximena		\N	axsotomayor@gmail.com	+5684312369	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.99	2026-04-01 19:44:50.99
4052	Victor		\N	victor4536@gmail.com	+56990165455	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.99	2026-04-01 19:44:50.99
4053	Jaztbleyditt		\N	jazmorpa74@gmail.com	+56995269782	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.991	2026-04-01 19:44:50.991
4054	Gonzalo		\N	go.vega@me.com	+56969182052	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.992	2026-04-01 19:44:50.992
4055	Carmen		\N	carmenrojas236@hotmail.com	+56968957146	\N	NATURAL	OTRO	\N	2026-04-01 19:44:50.993	2026-04-01 19:44:50.993
4056	Raúl	Perroni	\N	rperroni74@gmail.com	56993275505	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.994	2026-04-01 19:44:50.994
4057	Alexis		\N	alesis1@gmail.com	+56954014602	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.994	2026-04-01 19:44:50.994
4058	Michele	Yañez	\N	micheleyanezmerino@gmail.com	+56962351495	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.995	2026-04-01 19:44:50.995
4059	Fabiola	Alicia Placencia	\N	fabiolaplacenciap@gmail.com	+56991277426	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.996	2026-04-01 19:44:50.996
4060	Jose	Perez	\N	josemarcelo34@hotmail.com	+56995412150	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.997	2026-04-01 19:44:50.997
4061	Leo		\N	leopenacl@gmail.com	+56992235159	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.998	2026-04-01 19:44:50.998
4062	Eduardo		\N	informaciones@hostalcasadepiedra.cl	+56998702432	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:50.999	2026-04-01 19:44:50.999
4063	Cristian		\N	clizana.aguirre@gmail.com	+56992761697	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51	2026-04-01 19:44:51
4064	erika		\N	maranminimarket@gmail.com	+56961925200	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51	2026-04-01 19:44:51
4065	Oscar	Rodrigo Blu	\N	oscarblul@hotmail.com	+56998860869	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.001	2026-04-01 19:44:51.001
4066	Rodrigo	Palacios	\N	rodrigopalaciosa@gmail.com	+56995938128	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.002	2026-04-01 19:44:51.002
4067	Monica		\N	monaplanells@hotmail.com	+56947383258	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.003	2026-04-01 19:44:51.003
4068	Ximena		\N	xila3120@yahoo.es	+56972758919	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.003	2026-04-01 19:44:51.003
4069	Evelyn		\N	segolimitada@gmail.com	+56977062709	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.004	2026-04-01 19:44:51.004
4070	Pamela	León	\N	Pleon.epr@gmail.com	+56991040666	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.004	2026-04-01 19:44:51.004
4071	La		\N	vilma.benitez.sepulveda@gmail.com	+56965283469	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.005	2026-04-01 19:44:51.005
4072	Debora		\N	coachdebbie.s@gmail.com	+56954990401	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.006	2026-04-01 19:44:51.006
4073	maria	teresa medina	\N	mt.medina.aguilar@gmail.com	+56982335878	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.007	2026-04-01 19:44:51.007
4074	Patricio		\N	r.parricio.medina@gmail.com	+56982234511	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.008	2026-04-01 19:44:51.008
4075	Felipe		\N	felipe.iniguez@gmail.com	+56984614352	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.008	2026-04-01 19:44:51.008
4076	Elizabeth		\N	elardlp@gmail.come	+56973856800	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.009	2026-04-01 19:44:51.009
4077	Mariana		\N	marianaga2025@gmail.com	+56981896435	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.01	2026-04-01 19:44:51.01
4078	Andrea		\N	apuebla.c@gmail.com	+56987976854	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.011	2026-04-01 19:44:51.011
4079	Marion		\N	marion.morales.n@gmail.com	+56967550985	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.011	2026-04-01 19:44:51.011
4080	Mario		\N	marioantoniocordova@gmail.com	+56981795935	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.012	2026-04-01 19:44:51.012
4081	Claudio		\N	claudioriveros@hotmail.com	+56997337860	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.013	2026-04-01 19:44:51.013
4082	Simón	Pérez	\N	simon.perez.diaz@gmail.com	+56997612361	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.014	2026-04-01 19:44:51.014
4083	Marcela		\N	marcelaanguloh@hotmail.com	+56942970410	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.014	2026-04-01 19:44:51.014
4084	Pinir		\N	Volkovamarsol@gmail.com	+56979913221	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.015	2026-04-01 19:44:51.015
4085	Nicolás		\N	nd.nicolasantonio@gmail.com	+56947399952	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.016	2026-04-01 19:44:51.016
4086	Cesar		\N	figueroacesar162@gmail.com	+56947960457	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.017	2026-04-01 19:44:51.017
4087	Alonso	Tapia	\N	alotapiadlj@gmail.com	+56995091068	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.017	2026-04-01 19:44:51.017
4088	Yamilett		\N	yamilettdunn@gmail.com	+56989217097	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.018	2026-04-01 19:44:51.018
4089	Accesorios		\N	paito.carvajal@gmail.com	+56971088741	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.019	2026-04-01 19:44:51.019
4090	Luis		\N	lfuentesacha@gmail.com	+56968360401	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.02	2026-04-01 19:44:51.02
4091	Priscila	Vasquez	\N	voluntariapriscila@gmail.com	+56933151923	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.021	2026-04-01 19:44:51.021
4092	Fabiana		\N	facontreras90@gmail.com	+56947305441	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.021	2026-04-01 19:44:51.021
4093	Nicolás		\N	ncazor@gmail.com	+56982061642	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.022	2026-04-01 19:44:51.022
4094	Paulina		\N	tiendaeducatoys@gmail.com	+56983615926	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.023	2026-04-01 19:44:51.023
4095	Maria	Eugenia	\N	monymeevv@gmail.com	+56964572663	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.024	2026-04-01 19:44:51.024
4096	Höllisch	Ich	\N	haitianoaustral@gmail.com	+56968992197	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.025	2026-04-01 19:44:51.025
4097	Pamela	Alejandra	\N	pamelasilvalagos@gmail.com	+56958092525	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.025	2026-04-01 19:44:51.025
4098	Marcelo		\N	marcelodgarcia.oyarzo@gmail.com	+56993171161	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.026	2026-04-01 19:44:51.026
4099	Alejandra		\N	alejandrapadilla2@gmail.com	+56977770578	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.027	2026-04-01 19:44:51.027
4100	Jimena	Paulina Vergara	\N	jimenapvergara@gmail.com	+56982499954	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.028	2026-04-01 19:44:51.028
4101	Pablo	García	\N	pgarciaas92@gmail.com	+56958110961	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.028	2026-04-01 19:44:51.028
4102	David		\N	dagonbar@gmail.com	+56996390333	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.029	2026-04-01 19:44:51.029
4103	Imanol		\N	dr.i.ballesteros@gmail.com	90002023	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.03	2026-04-01 19:44:51.03
4104	Vanessa	Jiménez Psicóloga del Emprendimiento Madre que	\N	vjimenes76@yahoo.es	+56998951423	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.031	2026-04-01 19:44:51.031
4105	Lorena	Yañez	\N	loreyava2@gmail.com	+56966037372	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.032	2026-04-01 19:44:51.032
4106	Gonzalo		\N	Eltrabajoahora@gmail.com	+56985113962	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.032	2026-04-01 19:44:51.032
4107	Waldo		\N	wjorquera@gmail.com	+56978871294	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.033	2026-04-01 19:44:51.033
4108	FrutosMartileu		\N	martileu@hotmail.com	+569983715277	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.034	2026-04-01 19:44:51.034
4109	Cristian		\N	crodriguezr2@uc.cl	+56965889630	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.035	2026-04-01 19:44:51.035
4110	Rita		\N	pylycita@yahoo.com	+56959383422	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.035	2026-04-01 19:44:51.035
4111	Andres		\N	arudloffalv@gmail.com	+56994792307	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.036	2026-04-01 19:44:51.036
4112	Claudio		\N	clausal23@gmail.com	+56966814899	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.037	2026-04-01 19:44:51.037
4113	Alexis		\N	Dr.alexis.dunay@gmail.com	+56995793804	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.038	2026-04-01 19:44:51.038
4114	Daniela		\N	flga.danielaleiva@gmail.com	+56951778779	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.038	2026-04-01 19:44:51.038
4115	Bessie	Zárate Araya	\N	bessiezaratea@gmail.com	+56993355258	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.039	2026-04-01 19:44:51.039
4116	Fernando		\N	fbriones195@gmail.com	+56974863818	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.04	2026-04-01 19:44:51.04
4117	Karen	Burgos	\N	karencitaburgos7@gmail.com	+56962695995	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.041	2026-04-01 19:44:51.041
4118	Ricardo		\N	ricardo.zunino.vz@gmail.com	+56962444676	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.041	2026-04-01 19:44:51.041
4119	Sebastian		\N	seba_gallardo@yahoo.com	+56942761721	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.042	2026-04-01 19:44:51.042
4120	Rodolfo		\N	ps.rcepeda@gmail.com	+56988473867	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.043	2026-04-01 19:44:51.043
4121	Marco	Antonio	\N	h.aguada@gmail.com	+56966785916	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.044	2026-04-01 19:44:51.044
4122	robert		\N	Yasna.vidal@panamerican.cl	+56964371056	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.045	2026-04-01 19:44:51.045
4123	Mauricio	Garcia	\N	garciapropiedades12@gmail.com	+56989956809	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.045	2026-04-01 19:44:51.045
4124	Yessenia	Soto	\N	yesenia_soto1@yahoo.es	+56966674645	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.046	2026-04-01 19:44:51.046
4125	Miguel	Allendes	\N	miguel.allendes@ug.uchile.cl	+56963532043	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.047	2026-04-01 19:44:51.047
4126	Carolina	De La Hoz	\N	delahoz.carolinah@gmail.com	+56977917169	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.048	2026-04-01 19:44:51.048
4127	Jose	Maria	\N	jbarjaa@outlook.com	+56995997649	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.049	2026-04-01 19:44:51.049
4128	Miguel	Guerrero	\N	miguelguerrer@gmail.com	+56968086288	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.049	2026-04-01 19:44:51.049
4129	Germán		\N	germanantonionavarrete7@gmail.com	+56999434843	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.05	2026-04-01 19:44:51.05
4130	Andrew		\N	camposmorales67@gmail.com	961008080	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.051	2026-04-01 19:44:51.051
4131	Leon		\N	wainer.leon@gmail.com	+56990227303	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.052	2026-04-01 19:44:51.052
4132	Fernando	Pimentel	\N	fpimentel@uc.cl	0	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.053	2026-04-01 19:44:51.053
4133	Frank		\N	frankmendez10@gmail.com	999999999	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.053	2026-04-01 19:44:51.053
4134	Juanpablo		\N	Jprivask@gmail.com	+56991405372	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.054	2026-04-01 19:44:51.054
4135	Tamara		\N	tsaldiviac@gmail.com	+56940016785	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.055	2026-04-01 19:44:51.055
4136	Mayra	Elizabeth Morales	\N	mayraemoralesm4@gmail.com	932942548	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.056	2026-04-01 19:44:51.056
4137	Carolina	Alfaro	\N	c.alfaro.yuste@gmail.com	+56958480100	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.057	2026-04-01 19:44:51.057
4138	Liliana		\N	lilianacabrera22@gmail.com	+5953592004	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.058	2026-04-01 19:44:51.058
4139	Fermín	Quevedo	\N	ferminquevedo@yahoo.com.ar	+56961931861	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.058	2026-04-01 19:44:51.058
4140	Victor		\N	victorcaro18@gmail.com	+56978701843	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.059	2026-04-01 19:44:51.059
4141	David		\N	dagonzale@gmail.com	+56972001971	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.06	2026-04-01 19:44:51.06
4142	Nancy		\N	nancy.antinao@gmail.com	+56991448793	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.061	2026-04-01 19:44:51.061
4143	Francisca	Andrea Lopez	\N	panchita_dulce@hotmail.com	+56966999041	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.062	2026-04-01 19:44:51.062
4144	Fernando		\N	luis120505@hotmail.com	+56942363804	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.063	2026-04-01 19:44:51.063
4145	Lorenzo		\N	loroviani@gmail.com	56969033536	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.063	2026-04-01 19:44:51.063
4146	Marcia.Allende.C		\N	eli.allendec@gmail.com	+56994302605	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.064	2026-04-01 19:44:51.064
4147	Edo		\N	eduardo.gaticad@gmail.com	+56991624099	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.065	2026-04-01 19:44:51.065
4148	Juan	Eduardo	\N	jmardonescovarrubias@gmail.com	+56995721206	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.066	2026-04-01 19:44:51.066
4149	Félix	Andrés	\N	fvaldesv@gmail.com	+56981595548	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.067	2026-04-01 19:44:51.067
4150	Rodrigo	Aguilar	\N	rgo.aguilar@gmail.com	973000370	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.068	2026-04-01 19:44:51.068
4151	Onofre	Oliva	\N	olivadecastro@gmail.com	+56634425180	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.069	2026-04-01 19:44:51.069
4152	Katty		\N	kattyboom17@hotmail.com	+56945798390	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.069	2026-04-01 19:44:51.069
4153	monich		\N	moni_valdearre@hotmail.com	+56956214643	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.07	2026-04-01 19:44:51.07
4154	Monica	Morales	\N	m.morales.t@hotmail.com	982699338	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.071	2026-04-01 19:44:51.071
4155	jesus		\N	chuit2122@gmail.com	+56961676678	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.072	2026-04-01 19:44:51.072
4156	Mariano	Ruperthuz	\N	marianoruperthuz@hotmail.com	+56956376358	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.073	2026-04-01 19:44:51.073
4157	Gálvez		\N	gabrielgalvez.2580@gmail.con	56959320308	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.073	2026-04-01 19:44:51.073
4158	Leonardo		\N	mattviolic@hotmail.com	+56966197640	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.074	2026-04-01 19:44:51.074
4159	Rosario		\N	rortuzarv@gmail.com	+56995393312	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.075	2026-04-01 19:44:51.075
4160	Francisco		\N	panchopizarroc@live.cl	+569962371264	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.076	2026-04-01 19:44:51.076
4161	Jessenia		\N	akire_1101@hotmail.com	+56977132307	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.077	2026-04-01 19:44:51.077
4162	Miguelina		\N	miguelina_sv17@hotmail.com	+56997185427	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.077	2026-04-01 19:44:51.077
4163	Nidia	Faúndez -	\N	nnidiafaundez@hotmail.com	+56998726110	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.078	2026-04-01 19:44:51.078
4164	Graci		\N	chelyn15@hotmail.com	+5642550895	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.079	2026-04-01 19:44:51.079
4165	Paola	Torrejon	\N	ptorrejon01@gmail.com	+56934508441	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.08	2026-04-01 19:44:51.08
4166	Leonardo		\N	leonardomadariaga@gmail.com	+56995395318	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.081	2026-04-01 19:44:51.081
4167	Marcela		\N	monpanive@hotmail.com	+56993447122	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.082	2026-04-01 19:44:51.082
4168	Elizabeth		\N	elizabeth.neira@gmail.com	+56986505182	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.082	2026-04-01 19:44:51.082
4169	Miguel	Angel	\N	mmachuca.sanpedro@gmail.com	973036292	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.083	2026-04-01 19:44:51.083
4170	luis		\N	grafitron5980@gmail.com	+56973779392	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.084	2026-04-01 19:44:51.084
4171	Maritza		\N	marvalvas@hotmail.com	+56998723287	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.085	2026-04-01 19:44:51.085
4172	Lorena		\N	diazrieloff@gmail.com	+56992991506	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.086	2026-04-01 19:44:51.086
4173	Juan	Pablo Vargas	\N	jpvn74@gmail.com	+56986627536	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.086	2026-04-01 19:44:51.086
4174	Manuel	Alejandro Lobos	\N	manuel-2012lobos@hotmail.com	+56998269029	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.087	2026-04-01 19:44:51.087
4175	Alejandro		\N	aleahumadao@gmail.com	+56997995834	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.088	2026-04-01 19:44:51.088
4176	Jorge	Lynch del	\N	jorge-lynch@hotmail.com	+56998953869	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.089	2026-04-01 19:44:51.089
4177	Horacio		\N	horaciogonzales174@gmail.com	+56974862567	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.09	2026-04-01 19:44:51.09
4178	Soledad		\N	soledad.alemany@gmail.com	+56957653705	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.091	2026-04-01 19:44:51.091
4179	Cristian		\N	covasquezf@gmail.com	+56985278696	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.092	2026-04-01 19:44:51.092
4180	Andrea		\N	andreasantana320@gmail.com	+56949881218	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.092	2026-04-01 19:44:51.092
4181	MariaAngelica	Hernández	\N	maho4075@glail.com	+56973785103	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.093	2026-04-01 19:44:51.093
4182	Claudia		\N	csqclaudita@gmail.com	+56988046232	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.094	2026-04-01 19:44:51.094
4183	Felipe		\N	felipecristiaan@hotmail.com	+56956182888	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.095	2026-04-01 19:44:51.095
4184	Francisco		\N	fjavier_22@hotmail.com	+5696836889	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.096	2026-04-01 19:44:51.096
4185	Marco	Soto	\N	dinosoto@yahoo.com	+56967163590	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.096	2026-04-01 19:44:51.096
4186	Paola		\N	andreagaja@hotmail.es	+56993879598	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.097	2026-04-01 19:44:51.097
4187	Cristian	Goetz	\N	cristian.goetz.carrasco@gmail.com	+56978767474	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.098	2026-04-01 19:44:51.098
4188	francisco		\N	firojaspe@gmail.com	+56958836662	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.099	2026-04-01 19:44:51.099
4189	Alejandra		\N	Alejandra.ylobos@gmail.com	+56954747403	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.1	2026-04-01 19:44:51.1
4190	Maricela	Ortiz	\N	maricela.ortiz.godoy@gmail.com	+56966770089	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.101	2026-04-01 19:44:51.101
4191	Marco		\N	mespinosan@gmail.com	+56973890183	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.101	2026-04-01 19:44:51.101
4192	Ema		\N	giselle.chavez.s@gmail.com	+56978646881	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.102	2026-04-01 19:44:51.102
4193	Verònica		\N	verogil21@gmail.com	+56987487254	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.103	2026-04-01 19:44:51.103
4194	Pilar	Valenzuela	\N	pillycordero@gmail.com	+56994520789	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.104	2026-04-01 19:44:51.104
4195	Gabriela	López	\N	gabrielalopez.l@gmail.com	+56989476334	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.105	2026-04-01 19:44:51.105
4196	Karen	Neumann	\N	karen.neumann.o@gmail.com	+56982776079	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.105	2026-04-01 19:44:51.105
4197	Patricia	Valenzuela	\N	Patricia.avalenzuelav@gmail.con	+56992377553	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.106	2026-04-01 19:44:51.106
4198	MHL		\N	mhernandez2206@gmail.com	+56968438003	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.107	2026-04-01 19:44:51.107
4199	alexander		\N	alexasydney71@gmail.com	0420716830	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.108	2026-04-01 19:44:51.108
4200	Malvi	Soto	\N	malvisoto66@gmail.com	+56956847741	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.109	2026-04-01 19:44:51.109
4201	Astrid		\N	astridcia@yahoo.es	+56996395499	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.11	2026-04-01 19:44:51.11
4202	Angela		\N	agomilaq@hotmail.com	+56951138725	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.11	2026-04-01 19:44:51.11
4203	J		\N	alejandrorodrigoaa@gmail.com	+56966350389	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.111	2026-04-01 19:44:51.111
4204	Claudio		\N	claudiocipol31@gmail.com	+56935134796	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.112	2026-04-01 19:44:51.112
4205	Verónica		\N	v.aranguizcorrea@gmail.com	+56977814368	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.113	2026-04-01 19:44:51.113
4206	Pamela	Patricia Sanchez	\N	ppsanchg@gmail.com	+56971392353	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.114	2026-04-01 19:44:51.114
4207	Negocio	Claro	\N	carlosaceiton@gmail.com	+56993246974	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.115	2026-04-01 19:44:51.115
4208	Gemita		\N	gemy_s@hotmail.com	990422558	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.115	2026-04-01 19:44:51.115
4209	Alberto	Pizarro	\N	albertopizarro74@gmail.com	974956458	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.116	2026-04-01 19:44:51.116
4210	Cristian		\N	cristianrivas@yahoo.com	+56963689486	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.117	2026-04-01 19:44:51.117
4211	Alberto	Flores	\N	albertof1309@gmail.com	+56977979981	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.118	2026-04-01 19:44:51.118
4212	Pamela		\N	claveluz33@gmail.com	+56983160501	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.118	2026-04-01 19:44:51.118
4213	Nelson		\N	nelsonvega.v@gmail.com	+56981748616	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.119	2026-04-01 19:44:51.119
4214	Carolina	Paz Almarza	\N	carpediempaz@gmail.com	+56986101647	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.12	2026-04-01 19:44:51.12
4215	Jhonatan		\N	jhonatan.arevaloscl@gmail.com	+56951042623	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.121	2026-04-01 19:44:51.121
4216	Sergio	Sepúlveda	\N	sasc4878@gmail.com	+56971212980	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.122	2026-04-01 19:44:51.122
4217	Aura	Salazar Cortés	\N	tete.salazar@hotmail.com	+56994695066	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.122	2026-04-01 19:44:51.122
4218	Pedro		\N	katperos@gmail.com	+56992405247	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.123	2026-04-01 19:44:51.123
4219	Erik		\N	e.jereztorres59@gmail.com	+56988237416	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.124	2026-04-01 19:44:51.124
4220	Pablo		\N	shimbe_17_pablo@hotmail.com	+56951157995	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.125	2026-04-01 19:44:51.125
4221	Agua	Del Pilar	\N	aguadelpilar.ventas@gmail.com	+56988886160	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.126	2026-04-01 19:44:51.126
4222	Viviana		\N	viviana_traiguen@hotmail.com	+56976762993	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.126	2026-04-01 19:44:51.126
4223	Patricio		\N	pgutierr@outlook.cl	+56996385971	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.128	2026-04-01 19:44:51.128
4224	Juan	CLAUDIO	\N	COMERCIALAGUILARLTDA@GMAIL.COM	+56993333060	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.128	2026-04-01 19:44:51.128
4225	Gina		\N	gina7junio@hotmail.com	+56986194447	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.129	2026-04-01 19:44:51.129
4226	Juris		\N	ctrujillocg@gmail.com	+56966315107	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.13	2026-04-01 19:44:51.13
4227	Hernan	Muñoz	\N	hernan.munoz@grupohyg.cl	+5692307680	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.131	2026-04-01 19:44:51.131
4228	Luli		\N	carmenespinosa079@gmail.com	+56982305574	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.132	2026-04-01 19:44:51.132
4229	Roberto	Javier	\N	achua1000@hotmail.com	+56972106804	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.132	2026-04-01 19:44:51.132
4230	Alberto_munozg		\N	amunoz@grindex.cl	+56944364714	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.133	2026-04-01 19:44:51.133
4231	Angello		\N	odentis2@hotmail.com	+5690000000	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.134	2026-04-01 19:44:51.134
4232	José		\N	josejoga5@gmail.com	+56973354107	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.135	2026-04-01 19:44:51.135
4233	Alvaro		\N	valenzuelaperroni.alvaro@gmail.com	+56968308027	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.136	2026-04-01 19:44:51.136
4234	robert		\N	Robertw@elbaulpro.com	+56998303189	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.136	2026-04-01 19:44:51.136
4235	Robinson	Isaac Segura	\N	robinsegura@gmail.com	988185961	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.137	2026-04-01 19:44:51.137
4236	Benja		\N	benjamin125@hotmail.es	+569	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.138	2026-04-01 19:44:51.138
4237	Marisol	Alexia Daroch	\N	mdaroch@gmail.com	+56995063633	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.139	2026-04-01 19:44:51.139
4238	Juan		\N	juan@gmail.com	+56995267618	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.14	2026-04-01 19:44:51.14
4239	maria		\N	mlvillalobosh1@gmail.com	+56999504085	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.141	2026-04-01 19:44:51.141
4240	Alaska	Iturra	\N	alaskaiturra@gmail.com	+56951131821	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.141	2026-04-01 19:44:51.141
4241	Ricardo		\N	ramb61@gmail.com	+56998022894	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.142	2026-04-01 19:44:51.142
4242	Jessica		\N	jessicahermosilla@gmail.com	+56992566367	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.143	2026-04-01 19:44:51.143
4243	Polette		\N	polettevalentina@gmail.com	+56975267006	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.144	2026-04-01 19:44:51.144
4244	Daniela	Zuaznabar	\N	dzuaznabar@uc.cl	+56964044407	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.145	2026-04-01 19:44:51.145
4245	Jorge	Antonio	\N	aranda.50@hotmail.com	+56982721377	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.146	2026-04-01 19:44:51.146
4246	sebsstian		\N	sevakreator@gmail.com	978034977	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.147	2026-04-01 19:44:51.147
4247	Carolina		\N	sandovalatorraca@gmail.com	+56998778498	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.147	2026-04-01 19:44:51.147
4248	Catherine		\N	cathyzamora@hotmail.com	+56975870062	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.148	2026-04-01 19:44:51.148
4249	Richard		\N	richardjtorrealba26@gmail.com	+56978940553	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.149	2026-04-01 19:44:51.149
4250	Eduardo		\N	impomaster@gmail.com	+56993183987	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.15	2026-04-01 19:44:51.15
4251	María	Eugenia Santibañez	\N	facomfer@hotmail.com	+56988693717	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.151	2026-04-01 19:44:51.151
4252	Cristian		\N	cristian.fernandezor@titulados.usm.cl	+56995061661	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.152	2026-04-01 19:44:51.152
4253	Sandra		\N	sandra@odontologia-clinica.cl	+56995494737	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.152	2026-04-01 19:44:51.152
4254	Verde		\N	mjleonlira@yahoo.es	+56993261433	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.153	2026-04-01 19:44:51.153
4255	Patricia		\N	patito0809@gmail.com	+56984957933	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.154	2026-04-01 19:44:51.154
4256	David		\N	d.olave.rojas@gmail.com	+56934665318	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.155	2026-04-01 19:44:51.155
4257	Vivivana		\N	vivianatroncoso111@gmail.com	+56942766138	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.156	2026-04-01 19:44:51.156
4258	Ana	Claudia	\N	claudia-leytonbasica@hotmail.com	+5693012772	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.157	2026-04-01 19:44:51.157
4259	Stella		\N	snovagomez@yahoo.es	+56981386432	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.157	2026-04-01 19:44:51.157
4260	Rodrigo	Muñoz	\N	rmunozc@gmail.com	+56950006251	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.158	2026-04-01 19:44:51.158
4261	Susana		\N	coni.retamalg@gmail.com	+56999149673	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.159	2026-04-01 19:44:51.159
4262	Edith		\N	edithcastilloma@gmail.com	+	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.16	2026-04-01 19:44:51.16
5166	Sara	Linares	\N	\N	\N	\N	NATURAL	OTRO	\N	2026-04-13 17:32:15.228	2026-04-13 17:32:15.228
4263	Esteban	Mondaca	\N	gemca05@hotmail.com	+56995093538	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.161	2026-04-01 19:44:51.161
4264	David		\N	david.o94@live.cl	+56972479623	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.161	2026-04-01 19:44:51.161
4265	Nebenka	Irene Ortiz	\N	nortizr@gmail.com	+56972160389	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.162	2026-04-01 19:44:51.162
4266	Christopher		\N	parkercpm@gmail.com	+56971736114	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.165	2026-04-01 19:44:51.165
4267	Karen	Bravo	\N	karen_cita@live.cl	+56945478474	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.166	2026-04-01 19:44:51.166
4268	Yuly		\N	ybarbieri3@hotmail.com	+56992342972	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.167	2026-04-01 19:44:51.167
4269	Manuel		\N	manuel.lagos.r@gmail.com	+56971087126	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.167	2026-04-01 19:44:51.167
4270	Hibert	Martinez	\N	hibert.martinez@gmail.com	+56984184447	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.168	2026-04-01 19:44:51.168
4271	Sandra		\N	sandra.echeverria@st-computacion.com	944542022	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.169	2026-04-01 19:44:51.169
4272	Ifernu		\N	grupocalafquen@gmail.com	+56987776641	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.17	2026-04-01 19:44:51.17
4273	Cristina		\N	cristinamorav@gmail.com	+56957660561	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.171	2026-04-01 19:44:51.171
4274	Cynthia		\N	cynthiaoteiza@yahoo.com	+56997162837	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.171	2026-04-01 19:44:51.171
4275	Gonzalo	Vergara	\N	vergararojasgonzalo@gmail.com	+56933776717	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.172	2026-04-01 19:44:51.172
4276	Cristian	Andrés Moraga	\N	moraga.cristian26@gmail.com	+569963591389	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.173	2026-04-01 19:44:51.173
4277	Paulina	Morales	\N	paulimorales92@gmail.com	+56977590874	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.174	2026-04-01 19:44:51.174
4278	Gladys	Espinoza	\N	monyebali349@gmail.com	+56992931909	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.175	2026-04-01 19:44:51.175
4279	Victor		\N	zuniga56@gmail.com	+56993227547	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.175	2026-04-01 19:44:51.175
4280	Rubén		\N	rjorquer@gmail.com	+56985098079	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.176	2026-04-01 19:44:51.176
4281	Luis		\N	lsozac@gmail.com	+56992400793	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.177	2026-04-01 19:44:51.177
4282	Denisse	Hernández	\N	dnhernandez@uc.cl	+56975352882	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.178	2026-04-01 19:44:51.178
4283	Alvaro	Izquierdo	\N	alvaroizquierdo@hotmail.com	+56989039913	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.179	2026-04-01 19:44:51.179
4284	sebastian		\N	sponce93611@gmail.com	+56992526246	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.179	2026-04-01 19:44:51.179
4285	Alejandra		\N	aletraub.tramites@gmail.com	+56950105942	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.18	2026-04-01 19:44:51.18
4286	Mac		\N	mac.grower@gmail.com	+56985057505	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.181	2026-04-01 19:44:51.181
4287	Sandra	Bujes	\N	sbujes@yahoo.Com	+56995999286	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.182	2026-04-01 19:44:51.182
4288	María	José	\N	Delabarra.asesoriasjuridicas@gmail.com	+56963529733	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.183	2026-04-01 19:44:51.183
4289	vladimir		\N	vladimir.flores.a@gmail.com	+56993139294	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.183	2026-04-01 19:44:51.183
4290	Alexis	Aguirre	\N	alexis.aguirre.f@gmail.com	+56994309419	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.185	2026-04-01 19:44:51.185
4291	Valentina		\N	vvieragonzalez@gmail.com	+56992929458	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.185	2026-04-01 19:44:51.185
4292	Mariana	Jara	\N	Marianajara11ajj@gmail.com	+56983164144	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.186	2026-04-01 19:44:51.186
4293	MARCOS	VERA	\N	mavoy18@hotmail.com	+56998681000	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.187	2026-04-01 19:44:51.187
4294	Jorge		\N	jescalonaconcha@gmail.com	+56990784702	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.188	2026-04-01 19:44:51.188
4295	Alejandra		\N	codocedoalejandra27@gmail.com	+56949397318	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.189	2026-04-01 19:44:51.189
4296	Fernando		\N	huayuken@gmail.com	+56998705472	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.19	2026-04-01 19:44:51.19
4297	Nieves		\N	francisco.rodriguezcampos02@gmail.com	+56994774528	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.191	2026-04-01 19:44:51.191
4298	David		\N	sierra.dis@gmail.com	+56995773577	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.191	2026-04-01 19:44:51.191
4299	Benedicta		\N	benedictajaragarabito@gmail.com	+56972747571	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.192	2026-04-01 19:44:51.192
4300	Luis		\N	Lonatep@gmail.com	+56993010739	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.193	2026-04-01 19:44:51.193
4301	Patricia	Retamal	\N	patricia.retamal7@gmail.com	+56988500582	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.194	2026-04-01 19:44:51.194
4302	Alejandro	Díaz	\N	a.diazbas@gmail.com	+56957618826	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.195	2026-04-01 19:44:51.195
4303	Ivonne		\N	ivonneghi@icloud.com	+56954173746	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.195	2026-04-01 19:44:51.195
4304	Claudia		\N	clamunozpalma@gmail.com	+56966127295	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.196	2026-04-01 19:44:51.196
4305	Nico		\N	nico.villablanca@gmail.com	+56952399878	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.197	2026-04-01 19:44:51.197
4306	Alvaro		\N	almaga80@hotmail.com	+56982411235	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.198	2026-04-01 19:44:51.198
4307	Rorro		\N	recepjud@yahoo.es	+56995461585	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.199	2026-04-01 19:44:51.199
4308	robinson	nuñez	\N	rrobinsonnuneza@gmail.com	+56996119409	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.199	2026-04-01 19:44:51.199
4309	Nani		\N	Nani.desing.03@gmail.com	+56922162999	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.2	2026-04-01 19:44:51.2
4310	Richard	Maturana	\N	rmaturana24@gmail.com	+56968499409	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.201	2026-04-01 19:44:51.201
4311	Victor	Eduardo	\N	vmuggioli@hotmail.com	+56999013587	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.202	2026-04-01 19:44:51.202
4312	John		\N	alelr249@gmail.com	+56990337738	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.203	2026-04-01 19:44:51.203
4313	Cristian		\N	cristian.hott@gmail.com	+56999171135	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.203	2026-04-01 19:44:51.203
4314	Alexis		\N	alexis.flores@acl-maquinarias.cl	+56976229036	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.204	2026-04-01 19:44:51.204
4315	Juan		\N	juan_valdivieso@live.com	+56993324677	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.205	2026-04-01 19:44:51.205
4316	Tommy		\N	tommy.martinez.g@gmail.com	+56991566693	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.206	2026-04-01 19:44:51.206
4317	Mara		\N	maltamir2@hotmail.com	+56966188425	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.207	2026-04-01 19:44:51.207
4318	Salvador		\N	jaime.uribe.diaz@hotmail.com	+56982397670	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.207	2026-04-01 19:44:51.207
4319	Gonzalo		\N	g_nilo_s@yahoo.es	+56996265023	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.208	2026-04-01 19:44:51.208
4320	Marcelo		\N	marcelocorreaayala@gmail.com	+56994019148	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.209	2026-04-01 19:44:51.209
4321	Manuel	Alexis Vargas	\N	manuelvargassanhueza@gmail.com	+56988999646	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.21	2026-04-01 19:44:51.21
4322	Oscar	Ivan Aravena	\N	oaravena59@gmail.com	+56968509705	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.211	2026-04-01 19:44:51.211
4323	Macarena		\N	mmoratinos7@yahoo.es	+56975183906	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.212	2026-04-01 19:44:51.212
4324	Veronica		\N	Mariaveronicaihle@gmail.com	+56996388496	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.212	2026-04-01 19:44:51.212
4325	Viviana		\N	mizzthyc@gmail.com	+56953712804	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.213	2026-04-01 19:44:51.213
4326	Ximena		\N	ximenaam@tie.cl	993446671	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.214	2026-04-01 19:44:51.214
4327	Angelica	Ruano	\N	angelicaruanoauditor@gmail.com	+56985960663	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.215	2026-04-01 19:44:51.215
4328	Jéssica		\N	je.herrera@hotmail.com	+56985585334	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.216	2026-04-01 19:44:51.216
4329	oscar		\N	o.abarca.pavez@gmail.com	+56989828377	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.216	2026-04-01 19:44:51.216
4330	Luis	Tapia	\N	ziasx1@gmail.com	+5698215021	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.217	2026-04-01 19:44:51.217
4331	Felipe		\N	froblesmery@gmail.com	+56979861693	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.218	2026-04-01 19:44:51.218
4332	Carla	Andrea Monasterio	\N	carla.monasterio@gmail.com	+56932657070	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.219	2026-04-01 19:44:51.219
4333	roberto	venegas	\N	roberto@venegas.com	+56993383333	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.22	2026-04-01 19:44:51.22
4334	Pelayo		\N	pelayo.pena@gmail.com	+56973832719	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.221	2026-04-01 19:44:51.221
4335	Catalina	Osorio	\N	Catalinaosoriocarrasco@gmail.com	+56996196775	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.222	2026-04-01 19:44:51.222
4336	Tomás	Pye	\N	tommypye@gmail.com	+56968321373	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.222	2026-04-01 19:44:51.222
4337	Cristian		\N	cristian.paredes.n@gmail.com	+56993386956	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.223	2026-04-01 19:44:51.223
4338	cristian		\N	cristianmoya.riffo@gmail.com	+56978625716	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.224	2026-04-01 19:44:51.224
4339	Gonzalo		\N	prisma.sanchez@gmail.com	+56977966263	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.225	2026-04-01 19:44:51.225
4340	Felix	Valecillos	\N	felixvalecillos@gmail.com	+56992978504	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.226	2026-04-01 19:44:51.226
4341	Caro		\N	anrivas79@gmail.com	+56996240852	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.227	2026-04-01 19:44:51.227
4342	Katherine		\N	profesora_katherine@hotmail.com	+56934871294	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.227	2026-04-01 19:44:51.227
4343	Camila		\N	camila.duarte.marcone@gmail.com	+56966567546	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.228	2026-04-01 19:44:51.228
4344	Juan	Pablo Decap	\N	juanpablodecap@gmail.com	+56332450630	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.229	2026-04-01 19:44:51.229
4345	Luz		\N	luz_gonzalezcampos@yahoo.es	+56961328908	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.23	2026-04-01 19:44:51.23
4346	Elias	David	\N	elias.munoz75@gmail.com	+56978787607	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.231	2026-04-01 19:44:51.231
4347	Mazuelos		\N	pmazuelos.baydir@gmail.com	+56983910840	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.232	2026-04-01 19:44:51.232
4348	Sole		\N	solefigueroa1@hotmail.com	+56990859625	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.232	2026-04-01 19:44:51.232
4349	Richard		\N	remodelacionesypaisajismo@gmail.com	946956065	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.233	2026-04-01 19:44:51.233
4350	Carlos		\N	arenas.c@gmail.com	+56994384136	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.234	2026-04-01 19:44:51.234
4351	Patricio		\N	ptrbadll94@gmail.com	+56999650242	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.235	2026-04-01 19:44:51.235
4352	David		\N	david110983@gmail.com	+56948928323	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.236	2026-04-01 19:44:51.236
4353	Alejandra		\N	leal.alejandra@gmail.com	+56998177653	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.236	2026-04-01 19:44:51.236
4354	Claudio		\N	claudicris2002@gmail.com	+56994486830	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.237	2026-04-01 19:44:51.237
4355	Karin		\N	karinjunchaya97@gnail.com	+56979087003	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.238	2026-04-01 19:44:51.238
4356	Nicolás		\N	nicolastota@gmail.com	+56993660533	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.239	2026-04-01 19:44:51.239
4357	Rodrigo		\N	mandiolaburgess@gmail.com	+56979763120	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.24	2026-04-01 19:44:51.24
4358	Juan		\N	jcarrizob@hotmail.com	+56985908154	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.241	2026-04-01 19:44:51.241
4359	Ma		\N	caroly_d@yahoo.com	+56978060739	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.242	2026-04-01 19:44:51.242
4360	Fernanda		\N	muribe.berlin@gmail.com	+56945581790	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.242	2026-04-01 19:44:51.242
4361	Pedro	Pablo	\N	ppro@localesyretail.cl	+56976881219	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.243	2026-04-01 19:44:51.243
4362	Cesar		\N	ccalomino@gmail.com	930500161	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.244	2026-04-01 19:44:51.244
4363	Mercedes	Magdalena	\N	mercedesmagdalena59@gmail.com	+56976327760	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.245	2026-04-01 19:44:51.245
4364	Angelica		\N	angelicrv@hotmail.com	+56989634986	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.246	2026-04-01 19:44:51.246
4365	Julio	Fernando Obreque	\N	jfobreque@gmail.com	+56977817183	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.247	2026-04-01 19:44:51.247
4366	Mariela		\N	marielahahn@yahoo.cl	+56990787662	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.247	2026-04-01 19:44:51.247
4367	Joceline		\N	joceline610@hotmail.com	+56981625280	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.248	2026-04-01 19:44:51.248
4368	CristianY		\N	ceyrarrazaval@gmail.com	+56982333082	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.249	2026-04-01 19:44:51.249
4369	sustentable		\N	elizabeth.barrera.rojas@gmail.com	+56986662986	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.25	2026-04-01 19:44:51.25
4370	Carlos	Enrique Freire	\N	freirecarlos@yahoo.es	+56964245866	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.251	2026-04-01 19:44:51.251
4371	Antonio		\N	correasaravia.a@gmail.com	+56945270628	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.252	2026-04-01 19:44:51.252
4372	Angelica		\N	Angee.Morales0870@gmail.com	998452599	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.252	2026-04-01 19:44:51.252
4373	Boris		\N	borisvega_84@hotmail.com	962274337	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.253	2026-04-01 19:44:51.253
4374	Rosemarie		\N	rosemariecarrasco@yahoo.com	+56974373691	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.254	2026-04-01 19:44:51.254
4375	Jo		\N	ruzseit@gmail.com	+56981495407	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.255	2026-04-01 19:44:51.255
4376	Jorge		\N	jorge1640@gmail.com	+56953395213	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.255	2026-04-01 19:44:51.255
4377	José	Fernando	\N	Fdo.poff@gmail.com	+56983680611	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.256	2026-04-01 19:44:51.256
4378	Andrea		\N	andrea.f.asenjo.z@gmail.com	+56992443536	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.257	2026-04-01 19:44:51.257
4379	Ivan		\N	ivanmansillal@gmail.com	+56992643620	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.258	2026-04-01 19:44:51.258
4380	Luisa		\N	lrondonaa@gmail.com	+56966552253	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.259	2026-04-01 19:44:51.259
4381	Jeanette		\N	jeanettepavezc@gmail.com	+56981296061	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.259	2026-04-01 19:44:51.259
4382	Rudy		\N	automoragonzalez.andrade@gmail.com	+56990510269	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.26	2026-04-01 19:44:51.26
4383	Guillermo	Bravo Zárate	\N	abogadobz@gmail.com	+56985909293	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.261	2026-04-01 19:44:51.261
4384	Héctor	Montecinos	\N	Montecinos.hm@gmail.com	+56989233230	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.262	2026-04-01 19:44:51.262
4385	Eduardo		\N	ebalboapacheco@gmail.com	+56986856429	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.262	2026-04-01 19:44:51.262
4386	Carla		\N	solicarla@gmail.com	921820862	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.263	2026-04-01 19:44:51.263
4387	Alexis		\N	alexisferrer.suarez@gmail.com	+56997166061	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.264	2026-04-01 19:44:51.264
4388	Cristóbal		\N	cristobal.silva1996@gmail.com	+56976985271	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.264	2026-04-01 19:44:51.264
4389	Graciela		\N	gracieladi_8@hotmail.com	+56990823564	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.265	2026-04-01 19:44:51.265
4390	Javi	Quijón De La	\N	javieraquijon1@gmail.com	+56957319990	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.266	2026-04-01 19:44:51.266
4391	Yasna	Orietta	\N	yasna.osorio.u@gmail.com	+56950457477	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.267	2026-04-01 19:44:51.267
4392	marisol		\N	marisollopezalvarez.09@gmail.com	+56954158926	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.268	2026-04-01 19:44:51.268
4393	Dante		\N	aguirrediazjosue@gmail.com	+56992053251	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.268	2026-04-01 19:44:51.268
4394	Vanessa		\N	vaneivo1975@gmail.com	+56985251939	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.269	2026-04-01 19:44:51.269
4395	Susana		\N	susvalle@gmail.com	+56977259387	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.27	2026-04-01 19:44:51.27
4396	Carolina		\N	carola_agui7@hotmail.com	+56974505413	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.271	2026-04-01 19:44:51.271
4397	Javier		\N	creadsgr@gmail.com	+56979670466	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.271	2026-04-01 19:44:51.271
4398	Nancy	L. Venegas	\N	nlvenega@bechtel.com	+56992890744	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.272	2026-04-01 19:44:51.272
4399	Juan	Ponce	\N	juanfernando9696@hotmail.com	+56967660814	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.273	2026-04-01 19:44:51.273
4400	Lucho		\N	luismonttlo@gmail.com	56992403073	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.274	2026-04-01 19:44:51.274
4401	Vj	Matias C. Soto	\N	sotomatias@hotmail.com	+56990885599	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.275	2026-04-01 19:44:51.275
4402	Luis	Ruben	\N	luisgonzalez@presman.cl	+56994516634	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.275	2026-04-01 19:44:51.275
4403	Nathilie		\N	na_titasa@hotmail.com	+56992210457	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.276	2026-04-01 19:44:51.276
4404	Fabian		\N	facp1888@hotmail.com	+56930574820	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.277	2026-04-01 19:44:51.277
4405	Samuel		\N	samuel.parra@gmail.com	+56996967168	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.278	2026-04-01 19:44:51.278
4406	Cristóbal		\N	cristobal.roldan@tantalum.cl	+56949826511	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.279	2026-04-01 19:44:51.279
4407	Jessica	Fabiola	\N	jessicafuentealba22.jf@gmail.com	+56964683715	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.28	2026-04-01 19:44:51.28
4408	Maria	Vega	\N	lefoyerhogar@gmail.com	+56987351780	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.281	2026-04-01 19:44:51.281
4409	.		\N	b.moraga02@gmail.com	+56967650783	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.281	2026-04-01 19:44:51.281
4410	Nicolas		\N	Nicolas.nesme@franchute.com	+56954082050	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.282	2026-04-01 19:44:51.282
4411	Adolfo		\N	adolfokorner.n@gmail.com	+56993266065	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.283	2026-04-01 19:44:51.283
4412	Cristián		\N	cristmaulenespin@gmail.com	+56998947193	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.284	2026-04-01 19:44:51.284
4413	Jimena		\N	jimenalabra@gmail.com	+56941886798	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.285	2026-04-01 19:44:51.285
4414	Mario	Araya	\N	mariomemo@hotmail.com	+56930730026	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.286	2026-04-01 19:44:51.286
4415	Elvira	Alejandra Hinojosa	\N	babylu29@hotmail.com	+56942229130	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.287	2026-04-01 19:44:51.287
4416	Iván		\N	itowers14@gmail.com	942852943	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.287	2026-04-01 19:44:51.287
4417	Marco		\N	contacto@envidiables.com	+56988124239	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.288	2026-04-01 19:44:51.288
4418	Pao		\N	Paolatorrejon@gmail.con	+56988858459	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.289	2026-04-01 19:44:51.289
4419	Carlos	H. Rivera	\N	carlos.rivma@gmail.com	+56953332600	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.29	2026-04-01 19:44:51.29
4420	Carlos	Felipe	\N	cfelipemorac@hotmail.com	+56992285979	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.291	2026-04-01 19:44:51.291
4421	nathaly		\N	nathalyponce38@gmail.com	+56926871850	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.292	2026-04-01 19:44:51.292
4422	Melba		\N	melbaboutique@gmail.com	+56967879941	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.293	2026-04-01 19:44:51.293
4423	Rodrigo		\N	rodrigo.gomez.canales31@gmail.cl	+56978630875	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.293	2026-04-01 19:44:51.293
4424	Cristian		\N	cristian_castaneda@hotmail.com	+56997470818	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.294	2026-04-01 19:44:51.294
4425	Nicolás		\N	Nta.nicolasfuentealba@gmail.com	+56982003853	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.295	2026-04-01 19:44:51.295
4426	Nedda		\N	mariettearos@gmail.com	+56998878216	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.296	2026-04-01 19:44:51.296
4427	Alejandra	Victoria Payeras	\N	alepayerasgayan@gmail.com	+56996796956	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.297	2026-04-01 19:44:51.297
4428	Alvarita		\N	alvaritacerecera@gmail.com	+56997193451	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.298	2026-04-01 19:44:51.298
4429	Elena	Gómez	\N	gomezerazo@gmail.com	56984795013	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.298	2026-04-01 19:44:51.298
4430	Rafael		\N	rdepablos@gmail.com	+56930388999	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.299	2026-04-01 19:44:51.299
4431	Robert		\N	rbsandovalc@gmail.com	+56996432199	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.3	2026-04-01 19:44:51.3
4432	Sofia	Vidal	\N	sophievieblanche@gmail.com	+56971259406	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.301	2026-04-01 19:44:51.301
4433	Reinaldo		\N	reinaldopedreros@gmail.com	+56996386396	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.302	2026-04-01 19:44:51.302
4434	Miguelito	Escobar	\N	escobar.mi@gmail.com	123456789	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.302	2026-04-01 19:44:51.302
4435	Rodrigo	González	\N	ragr1974@gmail.com	+56982096457	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.303	2026-04-01 19:44:51.303
4436	Familia		\N	cesar_iqq.chile@hotmail.cl	+56953315168	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.304	2026-04-01 19:44:51.304
4437	Lorena		\N	lorenamossoe@gmail.com	+56978791798	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.305	2026-04-01 19:44:51.305
4438	Magaly		\N	mguinez@minrel.gob.cl	+56962675271	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.306	2026-04-01 19:44:51.306
4439	Patricio		\N	director@nventrenamiento.cl	+56996954350	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.307	2026-04-01 19:44:51.307
4440	Ximena	Montoya	\N	ximemontoya@hotmail.com	+56995482768	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.307	2026-04-01 19:44:51.307
4441	Luis	Alejandro	\N	luispechuante1975@gmail.coml	+56973735577	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.308	2026-04-01 19:44:51.308
4442	Jazmeth	- Fitgeeks - Ropa	\N	yasmesita@gmail.com	56991030791	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.309	2026-04-01 19:44:51.309
4443	Juan	Zárate	\N	zarate_tco@hotmail.com	+56967624973	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.31	2026-04-01 19:44:51.31
4444	Maria	Paz	\N	mapazrojas@gmail.com	+56954043317	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.311	2026-04-01 19:44:51.311
4445	Víctor	Hugo	\N	hugol.caceres@gmail.com	+56932305969	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.312	2026-04-01 19:44:51.312
4446	Eduardo		\N	bossgrafica@gmail.com	+56944858185	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.313	2026-04-01 19:44:51.313
4447	Viviana		\N	viviana@comercializadoravp.cl	+56978256855	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.313	2026-04-01 19:44:51.313
4448	Pilar	Andrea	\N	pilaroyarzunjay@gmail.com	+56931106804	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.314	2026-04-01 19:44:51.314
4449	Raul		\N	emartanol@gmail.com	+56999868391	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.315	2026-04-01 19:44:51.315
4450	Mauro	Pimentel	\N	m.pimentel.guerrero@gmail.com	+56966162279	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.316	2026-04-01 19:44:51.316
4451	Nicole	Altmann	\N	nicole.altmann@gmail.com	+56994330271	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.317	2026-04-01 19:44:51.317
4452	Jaime	Agurto	\N	jaimepalto@gmail.com	+5692498314	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.318	2026-04-01 19:44:51.318
4453	Katherine		\N	krcarras@uc.cl	+56984646660	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.319	2026-04-01 19:44:51.319
4454	Francisco		\N	luisf.munozcastillo@gmail.com	+56963667282	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.319	2026-04-01 19:44:51.319
4455	marcela		\N	mibarraosorio@gmail.com	+56979017410	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.32	2026-04-01 19:44:51.32
4456	Andrés	Labadie	\N	alabadie@comtec-chile.cl	+56997310168	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.321	2026-04-01 19:44:51.321
4457	Ricardo	Diaz	\N	diazserani@outlook.com	+56992389203	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.322	2026-04-01 19:44:51.322
4458	Pamela		\N	administradora1390@gmail.com	+56979753210	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.323	2026-04-01 19:44:51.323
4459	Alejandro		\N	alejandrogomezj@gmail.com	+56954915611	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.323	2026-04-01 19:44:51.323
4460	ximena		\N	xptorres@gmail.com	+56992337918	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.324	2026-04-01 19:44:51.324
4461	Diego		\N	diegoantoniogutierrezflores@gmail.com	+56988698937	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.325	2026-04-01 19:44:51.325
4462	Ximena		\N	ximenafernandezo@gmail.com	+56951880971	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.326	2026-04-01 19:44:51.326
4463	Fernando		\N	fernando.christie@gmail.com	+56995340193	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.327	2026-04-01 19:44:51.327
4464	Francisco		\N	marianjel@gmail.com	+56982045951	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.328	2026-04-01 19:44:51.328
4465	Weñe		\N	madriaza59@hotmail.com	+56988999896	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.329	2026-04-01 19:44:51.329
4466	Paulina	Cuevas	\N	pancuri@gmail.com	+56965136814	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.329	2026-04-01 19:44:51.329
4467	Pelao		\N	alvarocastanos68@gmail.com	+56995094926	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.33	2026-04-01 19:44:51.33
4468	Maria		\N	isabelarosc@hotmail.com	+569831902351	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.331	2026-04-01 19:44:51.331
4469	Michael	Becerra	\N	micha_kane@hotmail.com	+56956348436	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.332	2026-04-01 19:44:51.332
4470	Claudia	Salinas	\N	claudiasalinasv@hotmail.com	+56994418392	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.333	2026-04-01 19:44:51.333
4471	Nicolas	Antonio Pino	\N	Pinotrittininicolas@gmail.com	+56959952763	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.334	2026-04-01 19:44:51.334
4472	Pablo	Rojas	\N	contactoprm@gmail.com	+56930753420	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.335	2026-04-01 19:44:51.335
4473	Ximena	Silva	\N	sil*******@gmail.com	988035050	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.335	2026-04-01 19:44:51.335
4474	Sergio		\N	No.correo@no.correo	+56996921112	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.336	2026-04-01 19:44:51.336
4475	Cecilia		\N	cecilia_rsk@hotmail.com	+56972169484	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.337	2026-04-01 19:44:51.337
4476	Roxana	Angelica Bravo	\N	roxana.bravo@ulagos.cl	+56989640975	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.338	2026-04-01 19:44:51.338
4477	Ricardo	Alejandro	\N	ricardomorenooroblanco@gmail.com	+56956199358	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.339	2026-04-01 19:44:51.339
4478	Max		\N	Max@depaya.cl	+5633826604	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.339	2026-04-01 19:44:51.339
4479	Gabriel		\N	Gabrielcuadrag@gmail.com	+56951780481	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.34	2026-04-01 19:44:51.34
4480	Pacofernandez		\N	fernandohales@hotmail.com	+56956880095	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.341	2026-04-01 19:44:51.341
4481	Ignacio		\N	ijbarriagada@gmail.com	+56965803618	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.342	2026-04-01 19:44:51.342
4482	cristihappy		\N	crisandrea.morales@gmail.com	+56982993920	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.343	2026-04-01 19:44:51.343
4483	Ramon	Lardiez	\N	rlardiez@hotmail.com	+56974775516	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.344	2026-04-01 19:44:51.344
4484	INI_Ugarte		\N	ivaleskasolorza@gmail.com	+56963104408	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.345	2026-04-01 19:44:51.345
4485	Guido		\N	guidoa_123@yahoo.es	+56985711714	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.345	2026-04-01 19:44:51.345
4486	Paulina	Muñoz De la	\N	pmunozdelapiedra@gmail.com	963061653	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.346	2026-04-01 19:44:51.346
4487	Alejandro		\N	alejandro.lopez_s@hotmail.com	+56985057540	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.347	2026-04-01 19:44:51.347
4488	Claudia		\N	c.lira1@hotmail.com	+56977072403	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.348	2026-04-01 19:44:51.348
4489	Ximena		\N	xnovara@hotmail.com	+56962485344	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.349	2026-04-01 19:44:51.349
4490	Rodrigo	Duran	\N	rodrigodurancordova@gmail.cm	+5642924754	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.35	2026-04-01 19:44:51.35
4491	Juan	Pino	\N	pinovillarroeljuansegundo@gmail.com	+56990148674	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.351	2026-04-01 19:44:51.351
4492	Cin		\N	cinthyaramirez027@gmail.com	+56963060944	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.351	2026-04-01 19:44:51.351
4493	Marcos		\N	marcos.otarola@hotmail.com	+56998250475	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.352	2026-04-01 19:44:51.352
4494	Jessika	Salazar	\N	jessikasalazar@gmail.com	+56932778181	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.353	2026-04-01 19:44:51.353
4495	Washington	Marcelo Castro	\N	wmarcelo_castro@yahoo.com	+56982948096	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.354	2026-04-01 19:44:51.354
4496	Dante		\N	dantegutierrezdomke@gmail.com	+56997675317	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.355	2026-04-01 19:44:51.355
4497	Raul		\N	raulruiz_no@hotmail.com	+56986006822	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.356	2026-04-01 19:44:51.356
4498	Raquel	Díaz	\N	raqueldiaz.dana@gmail.com	+56982089828	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.356	2026-04-01 19:44:51.356
4499	Iván.		\N	ivangodoy937@gmail.com	+56946169587	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.357	2026-04-01 19:44:51.357
4500	Alfredo		\N	acortinez0091@hotmail.com	992228237	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.358	2026-04-01 19:44:51.358
4501	Terepe		\N	terepe_1979@hotmail.cl	+56976485346	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.359	2026-04-01 19:44:51.359
4502	Fernando		\N	fdoorfali@gmail.com	+56988381110	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.36	2026-04-01 19:44:51.36
4503	Elizabeth	Fernández	\N	ellyf123@hotmail.com	+56998209645	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.361	2026-04-01 19:44:51.361
4504	Vale	Paz	\N	valentinah.vip@gmail.com	+56972663200	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.362	2026-04-01 19:44:51.362
4505	Elizabeth		\N	ellusg@gmail.com	+56956074275	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.363	2026-04-01 19:44:51.363
4506	Roberto		\N	robertovaldiviazamorano@gmail.com	+56964716622	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.364	2026-04-01 19:44:51.364
4507	Leonardo		\N	leonardo.troncoso409@gmail.com	+56984994854	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.364	2026-04-01 19:44:51.364
4508	Pedro	Gutierrez	\N	pedrogutierrez86@gmail.com	+56945807897	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.365	2026-04-01 19:44:51.365
4509	John	Erices	\N	johnerices.abogado@gmail.com	+56999399513	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.366	2026-04-01 19:44:51.366
4510	Julio	Galleguillos	\N	jgalleu58@gmail.com	974988938	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.367	2026-04-01 19:44:51.367
4511	Jorge	Valdes	\N	jorgevaldesyavar@gmail.com	+56992269124	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.368	2026-04-01 19:44:51.368
4512	Seba		\N	sebahuenchunao@gmail.com	+56965154144	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.369	2026-04-01 19:44:51.369
4513	Sergio		\N	sparrah@gmail.com	+56982943789	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.369	2026-04-01 19:44:51.369
4514	Kcrc		\N	kelitza_rangel@hotmail.com	+56962110839	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.37	2026-04-01 19:44:51.37
4515	Francisco		\N	tomafrostt@gmail.com	+56951582538	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.371	2026-04-01 19:44:51.371
4516	Juan•Joséh		\N	jjcomsser@gmail.con	+56935454486	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.372	2026-04-01 19:44:51.372
4517	Sylvia		\N	sylvia.segoviac@gmail.com	+56991443123	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.373	2026-04-01 19:44:51.373
4518	Hernán	Ordenes	\N	hordenes.arq@gmail.com	+56992296060	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.373	2026-04-01 19:44:51.373
4519	Tomas		\N	Sirtomasmartinez@gmail.com	+56961494926	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.374	2026-04-01 19:44:51.374
4520	Antonella		\N	asiclarib@yahoo.cl	+56994595015	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.375	2026-04-01 19:44:51.375
4521	Ximena		\N	ximenamatus@hotmail.com	+56992241345	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.376	2026-04-01 19:44:51.376
4522	Karen		\N	Karensantis123@gmail.com	+56923801396	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.377	2026-04-01 19:44:51.377
4523	Natalie	Germaine Dehn	\N	n.dehn@colegiopablodetarso.cl	+56999579338	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.378	2026-04-01 19:44:51.378
4524	Bárbara		\N	barbaratapiau@hotmail.com	+56973999118	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.379	2026-04-01 19:44:51.379
4525	Joel		\N	joelmunozadm@gmail.com	+56953865233	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.379	2026-04-01 19:44:51.379
4526	Jose	Luis Monardez	\N	jmonardez@gmail.com	+56998718070	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.38	2026-04-01 19:44:51.38
4527	Felipe		\N	felipesalazar2@gmail.com	+56942064224	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.381	2026-04-01 19:44:51.381
4528	Jamie		\N	jamiediazbrissos@gmail.com	+56993050502	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.382	2026-04-01 19:44:51.382
4529	Carolina		\N	caro_dobles@yahoo.com	+56962483180	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.383	2026-04-01 19:44:51.383
4530	Nahila	Hernandez San	\N	nahilautra@gmail.com	+56956492928	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.384	2026-04-01 19:44:51.384
4531	Elia	Isabel	\N	eliamelo56@gmail.com	+56967517997	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.385	2026-04-01 19:44:51.385
4532	M	Cecilia	\N	cegall.munoz@gmail.com	+56985292817	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.385	2026-04-01 19:44:51.385
4533	Paula		\N	paulahoysiempre@gmail.com	983259897	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.386	2026-04-01 19:44:51.386
4534	Clandestino		\N	cotizaciones.sa@gmail.com	+56991899851	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.387	2026-04-01 19:44:51.387
4535	Ricardo		\N	ricardogotera@hotmail.com	+56964641626	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.388	2026-04-01 19:44:51.388
4536	Aladino		\N	aladinoalfaroherrera@gmail.com	+56944000618	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.389	2026-04-01 19:44:51.389
4537	Pao		\N	pao.urzua@gmail.com	+56932052530	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.39	2026-04-01 19:44:51.39
4538	Jorge		\N	jorgea.guerra.figueroa@gmail.com	+56988434073	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.39	2026-04-01 19:44:51.39
4539	Gonzalo	Matias Jara	\N	gonzalo.jar@gmail.com	+56995000662	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.391	2026-04-01 19:44:51.391
4540	Cristian	Pizarro	\N	cristian.patricio.pizarro@gmail.com	+56999406855	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.392	2026-04-01 19:44:51.392
4541	Comuro		\N	hola@comuro.ai	+56975442059	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.393	2026-04-01 19:44:51.393
4542	Daniel		\N	dtekemora@gmail.com	+56956472560	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.394	2026-04-01 19:44:51.394
4543	Bernarda		\N	bmunozr7@gmail.com	+56990996783	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.395	2026-04-01 19:44:51.395
4544	Guillermo		\N	gmobusta@gmail.com	+56322595221	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.396	2026-04-01 19:44:51.396
4545	Matiz		\N	matiz.productos@gmail.com	+56973392571	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.396	2026-04-01 19:44:51.396
4546	Pancho		\N	fco.urra88@gmail.com	+56956471611	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.397	2026-04-01 19:44:51.397
4547	Pepe		\N	ppmoyano@gmail.com	+56993421590	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.398	2026-04-01 19:44:51.398
4548	Cristian		\N	crubioe@gmail.com	+56998268115	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.399	2026-04-01 19:44:51.399
4549	Cristian		\N	cristianh1@gmail.com	+56997050399	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.4	2026-04-01 19:44:51.4
4550	Sebastian	Martinez	\N	seba.martinez.moraga@gmail.com	+56999593035	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.4	2026-04-01 19:44:51.4
4551	América		\N	avdonoso8@gmail.com	+56996475115	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.401	2026-04-01 19:44:51.401
4552	Vivianne		\N	vgalazabogados@vtr.net	+5694416606	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.402	2026-04-01 19:44:51.402
4553	Lorena		\N	lorenajeriag@gmail.coml	56977788655	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.403	2026-04-01 19:44:51.403
4554	Sandra	Marisol Neira	\N	sandraneira983@gmail.com	+56940839009	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.404	2026-04-01 19:44:51.404
4555	Jorge		\N	jetrombert@gmail.com	+56966161852	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.405	2026-04-01 19:44:51.405
4556	Pablo	Mestre	\N	pablocmv@gmail.com	+56996890191	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.405	2026-04-01 19:44:51.405
4557	M	A G N O L I A	\N	loretogutierrezb@gmail.com	+56968345329	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.406	2026-04-01 19:44:51.406
4558	Wr		\N	Sergconomanch@hotmail.com	+56955353426	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.407	2026-04-01 19:44:51.407
4559	Angelica		\N	amdj0105@gmail.com	+56979314171	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.408	2026-04-01 19:44:51.408
4560	Iván		\N	ivan.zuniga@hotmail.es	+56945087392	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.409	2026-04-01 19:44:51.409
4561	Benjamin		\N	bpizarro@reservanativachiloe.cl	+56968483237	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.41	2026-04-01 19:44:51.41
4562	Jose		\N	jsvicente89@gmail.com	+56940861287	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.411	2026-04-01 19:44:51.411
4563	Cesar		\N	matusargel@gmail.com	+56974206318	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.412	2026-04-01 19:44:51.412
4564	Roberto	Nuñez	\N	robertonunez.finanzas@gmail.com	+56984534742	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.413	2026-04-01 19:44:51.413
4565	Juan	Pablo Figueroa	\N	jpfiguer@gmail.com	+56934344738	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.414	2026-04-01 19:44:51.414
4566	Vivianne		\N	vivilowi@gmail.com	+56981385650	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.414	2026-04-01 19:44:51.414
4567	Blanca	Aedo	\N	baedoferrero@gmail.com	+56990815796	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.415	2026-04-01 19:44:51.415
4568	Egon	Casanova	\N	ecasanov@udec.cl	+56998833786	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.416	2026-04-01 19:44:51.416
4569	Jorge		\N	danieljp2004@hotmail.com	+56964708578	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.417	2026-04-01 19:44:51.417
4570	Pilar		\N	piliappsysuscripciones@gmail.com	+56997448833	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.418	2026-04-01 19:44:51.418
4571	Alfredo		\N	alfredo.villarroel.v@gmail.com	+56954245268	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.418	2026-04-01 19:44:51.418
4572	Loreto		\N	Loretoniklitschek@gmail.com	+56975185508	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.419	2026-04-01 19:44:51.419
4573	Ricardo		\N	Ricardo.alvear01@gmail.con	+5642545497	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.42	2026-04-01 19:44:51.42
4574	Paola	Larach	\N	paolalarach1@gmail.com	+56998845895	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.421	2026-04-01 19:44:51.421
4575	Javier		\N	javier.loyola.r@gmail.com	+56961177799	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.422	2026-04-01 19:44:51.422
4576	Mauricio		\N	mpobleteolivares@gmail.com	+56992893318	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.423	2026-04-01 19:44:51.423
4577	Jorge		\N	jobelmar@gmail.com	+56968528948	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.423	2026-04-01 19:44:51.423
4578	Ana		\N	aniobregon@gmail.com	+56987696381	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.424	2026-04-01 19:44:51.424
4579	Pilar		\N	diazt.pilara@gmail.com	+56997450702	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.425	2026-04-01 19:44:51.425
4580	Sebastian		\N	sggsebastian@gmail.com	+56999991080	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.426	2026-04-01 19:44:51.426
4581	Margot		\N	margotalejandra@gmail.com	+56992313566	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.427	2026-04-01 19:44:51.427
4582	Camilo		\N	Saavedraherreracamilo@gmail.com	+56966957956	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.428	2026-04-01 19:44:51.428
4583	Luis	Rodriguez Lopez	\N	luisfrdoriguezl1990@gmail.com	+56954476629	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.429	2026-04-01 19:44:51.429
4584	Emporio	House	\N	cristinaveravas@gmail.com	+56966494676	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.429	2026-04-01 19:44:51.429
4585	Fred		\N	f.bustos.sebuinco@gmail.com	+56985839206	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.43	2026-04-01 19:44:51.43
4586	Jaime		\N	hernandez.hs@gmail.com	+569949288019	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.431	2026-04-01 19:44:51.431
4587	Manuel	José de	\N	mjcp@grupohelice.cl	+56998224729	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.432	2026-04-01 19:44:51.432
4588	Ramon	Diaz	\N	ramon.diaz.barros@gmail.com	+56991001377	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.433	2026-04-01 19:44:51.433
4589	Ernesto		\N	Ernestonebredaleroy@gmail.com	+56995393804	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.433	2026-04-01 19:44:51.433
4590	Juan	Carlos	\N	jcmartineznovoa@gmail.com	+56997920184	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.435	2026-04-01 19:44:51.435
4591	Seba		\N	Sebaage@gmail.com	+56992288093	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.435	2026-04-01 19:44:51.435
4592	elpulentoesmiguia		\N	elpulentoesmiguia@gmail.com	965303274	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.437	2026-04-01 19:44:51.437
4593	Desiree		\N	sebastianydesiree@gmail.com	+56971204858	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.437	2026-04-01 19:44:51.437
4594	Alejandro		\N	amarquesb@yahoo.com	+56971878188	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.438	2026-04-01 19:44:51.438
4595	Osvaldo		\N	osvaldomoarred@gmail.com	+56993316981	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.439	2026-04-01 19:44:51.439
4596	Martha		\N	castro.martha@hotmail.com	+56953893229	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.44	2026-04-01 19:44:51.44
4597	Jose	Guillermo	\N	abogadojgnf@gmail.com	+56992364768	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.441	2026-04-01 19:44:51.441
4598	Darling	O’dette Pincheira	\N	darling.pincheira2024@gmail.com	+5698715528009	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.441	2026-04-01 19:44:51.441
4599	Juan	Carlos	\N	schweikartpropiedades@gmail.com	+56981292311	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.442	2026-04-01 19:44:51.442
4600	Jose		\N	tomitoaraya@hotmail.com	+56975442059	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.443	2026-04-01 19:44:51.443
4601	Lucas		\N	valdepala7@gmail.com	+56994100519	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.444	2026-04-01 19:44:51.444
4602	Daniela		\N	pgs.asesorias@gmail.com	+56996769517	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.445	2026-04-01 19:44:51.445
4603	Manuel	comuro	\N	maldunate21@hotmail.com	+56956380702	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.446	2026-04-01 19:44:51.446
4604	Jose		\N	jt.araya@comuro.ai	+56975442059	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.447	2026-04-01 19:44:51.447
4605	Matias		\N	abdrul.rajam@jarjara.cl	+56966682220	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.447	2026-04-01 19:44:51.447
4606	Marcela		\N	marcela43espinoza@gmail.com	+56961411334	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.448	2026-04-01 19:44:51.448
4607	Daniel		\N	daniel.vegachsa@gmail.com	+56932257977	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.449	2026-04-01 19:44:51.449
4608	Roberto	Yañez	\N	ryanezlagunas@gmil.com	+56964193828	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.45	2026-04-01 19:44:51.45
4609	Eduardo		\N	Edolval@gmail.com	+56981880498	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.451	2026-04-01 19:44:51.451
4610	M.Ignacia		\N	m.ignacia.amaro@gmail.com	987216944	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.452	2026-04-01 19:44:51.452
4611	Ximena		\N	ximena.rosasmorales@gmail.com	+56995378536	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.453	2026-04-01 19:44:51.453
4612	Mauricio		\N	maestroazocar@hotmail.com	+56974069595	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.454	2026-04-01 19:44:51.454
5167	Gemenes	Rodriguez	\N	\N	\N	\N	NATURAL	OTRO	\N	2026-04-13 17:32:16.089	2026-04-13 17:32:16.089
4613	Jonathan		\N	J.andresguillen.b@gmail.com	+56997019228	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.455	2026-04-01 19:44:51.455
4614	Alejandra		\N	aleisariveros@gmail.com	+56997460786	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.455	2026-04-01 19:44:51.455
4615	Sergio		\N	piolofloyd@hotmail.com	+56922375097	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.456	2026-04-01 19:44:51.456
4616	carmen	gloria	\N	atuntaya2021@gmail.com	+56944002172	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.457	2026-04-01 19:44:51.457
4617	Eric		\N	ericgrc9@gmail.com	+56967969875	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.458	2026-04-01 19:44:51.458
4618	Ilia		\N	ipiccione@yahoo.es	+56996792415	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.459	2026-04-01 19:44:51.459
4619	Isaac		\N	freireisaac@gmail.com	+56982819243	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.459	2026-04-01 19:44:51.459
4620	Sebastian	Lever	\N	sebastian.lever@gmail.com	+56981375688	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.46	2026-04-01 19:44:51.46
4621	Alexander		\N	avaldivicont@gmail.com	+5226422406	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.461	2026-04-01 19:44:51.461
4622	Ilich		\N	Ilich.maureira@gendarmeria.cl	+56940915907	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.462	2026-04-01 19:44:51.462
4623	Daniela		\N	Danielariquelme@icloud.com	+56992393362	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.463	2026-04-01 19:44:51.463
4624	Felipe		\N	Felipe@deheeckeren.cl	+56974796771	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.463	2026-04-01 19:44:51.463
4625	Ronald		\N	ronaldteatre@gmail.com	+56957490944	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.464	2026-04-01 19:44:51.464
4626	gabriela		\N	otibag80@gmail.com	+56966172422	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.465	2026-04-01 19:44:51.465
4627	Jessica	Valentina Antúnez	\N	jessicantunez@gmail.com	+56982535214	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.466	2026-04-01 19:44:51.466
4628	Ricardo	Riffo	\N	geo.rriffo@gmail.com	+56982883853	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.467	2026-04-01 19:44:51.467
4629	Patricio		\N	cecal@capacitacionlaboralchile.cl	+56988859614	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.468	2026-04-01 19:44:51.468
4630	Verdugo		\N	andreita_yta@hotmail.com	+56991684736	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.468	2026-04-01 19:44:51.468
4631	Lucas	Alonso	\N	Valdepala7@gmail.com	+56944901613	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.469	2026-04-01 19:44:51.469
4632	Diego	TEST	\N	diegoyapurjara@hotmail.com	+56988032513	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.47	2026-04-01 19:44:51.47
4633	Carlos	sajami	\N	Csajami94@gmail.con	965709712	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.471	2026-04-01 19:44:51.471
4634	Alberto	Guillermo	\N	mamutromero@gmail.com	+56974536613	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.471	2026-04-01 19:44:51.471
4635	Jose	M	\N	Rojas.josemanuel@ymail.con	+56961022299	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.472	2026-04-01 19:44:51.472
4636	Ricardo	bozo	\N	ribozop224@gmail.com	+56965657702	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.473	2026-04-01 19:44:51.473
4637	Karla		\N	cecreju@gmail.com	+56958738366	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.474	2026-04-01 19:44:51.474
4638	Pedro		\N	pedroacosta21@gmail.com	+56982521114	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.474	2026-04-01 19:44:51.474
4639	Waldo	Saavedra	\N	Wasaavedraa@hotmail.com	+56995470544	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.475	2026-04-01 19:44:51.475
4640	Patricia	Rozas	\N	patty_rozas@hotmail.com	+56993224977	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.476	2026-04-01 19:44:51.476
4641	Tributarios		\N	rivas2030@gmail.com	+56986194019	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.477	2026-04-01 19:44:51.477
4642	Bastian		\N	contactoshiku@gmail.com	+56983912086	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.477	2026-04-01 19:44:51.477
4643	Martha		\N	marthavelasco_26@hotmail.com	+56983612917	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.478	2026-04-01 19:44:51.478
4644	Ximena		\N	ximena.jauregui@gmail.com	+56982048521	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.479	2026-04-01 19:44:51.479
4645	Juan	Jose	\N	jgonzalez@estudiojuridicobyg.cl	+56948185303	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.48	2026-04-01 19:44:51.48
4646	Marra		\N	mariangel.neira.b@gmail.com	+56986922825	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.481	2026-04-01 19:44:51.481
4647	Carolina		\N	jpclegal@outlook.com	+56934414122	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.481	2026-04-01 19:44:51.481
4648	Saray	Diaz	\N	saraynicole.sd@gmail.com	+56984053461	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.482	2026-04-01 19:44:51.482
4649	Marcelo		\N	marcelo.s.1902@gmail.com	+56965471639	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.483	2026-04-01 19:44:51.483
4650	Lorena	Palacios	\N	lpalacios@gelymar.com	+56998225528	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.484	2026-04-01 19:44:51.484
4651	Patricio		\N	pvalderrama@outlook.cl	+56957655017	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.485	2026-04-01 19:44:51.485
4652	Karen		\N	karen.ramirezt22@gmail.com	+56947625891	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.486	2026-04-01 19:44:51.486
4653	Luz	Ruby	\N	r.contardot@gmail.cl	+56991617006	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.487	2026-04-01 19:44:51.487
4654	Pablo		\N	pablo@spencergrafica.cl	+56961707812	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.487	2026-04-01 19:44:51.487
4655	Cristóbal	Cuevas	\N	crissrcd@gmail.com	+56957921757	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.488	2026-04-01 19:44:51.488
4656	Gerardo		\N	eelgerasanhueza@hotmail.com	+56990380193	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.489	2026-04-01 19:44:51.489
4657	Beuno		\N	bruno_seba@yahoo.cl	+56975175295	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.49	2026-04-01 19:44:51.49
4658	𝓡𝓸𝓬𝓲𝓸		\N	alejandravalencia2180@gmail.com	+56983569015	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.491	2026-04-01 19:44:51.491
4659	Eduardo		\N	camaraslucero90@gmail.com	+56333993781	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.492	2026-04-01 19:44:51.492
4660	María		\N	pepasalazar@gmail.com	+56998636130	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.493	2026-04-01 19:44:51.493
4661	Blanca		\N	blancainostrozasoto@gmail.com	+56976058260	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.495	2026-04-01 19:44:51.495
4662	Rodrigo		\N	aseodoncalbo@gmail.com	+56940187194	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.497	2026-04-01 19:44:51.497
4663	M	Angelica	\N	angelica_pay@hotmail.com	+56984780044	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.499	2026-04-01 19:44:51.499
4664	Pablo		\N	pablo.mosqueira.cs@gmail.com	+56933470165	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.499	2026-04-01 19:44:51.499
4665	Veronica		\N	Vyanezv44@gmail.com	+56996191044	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.5	2026-04-01 19:44:51.5
4666	Claudio		\N	claulapostol@gmail.com	+56999913827	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.501	2026-04-01 19:44:51.501
4667	Pedro	Amado	\N	Pedroa@acvictoria.cl	+56971061910	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.502	2026-04-01 19:44:51.502
4668	Lilian	Ruth Vial	\N	lvialp@gmail.com	+56954113189	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.503	2026-04-01 19:44:51.503
4669	Marcelo		\N	peraltascl@gmail.com	+56982893203	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.504	2026-04-01 19:44:51.504
4670	Christian		\N	Christianmunozjara@gmail.com	+56983264949	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.505	2026-04-01 19:44:51.505
4671	Agustin		\N	agustin.lomello@gmail.com	+56954176253	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.505	2026-04-01 19:44:51.505
4672	Cecilia	Barros	\N	Ceciliabarros12@gmail.com	+56963061543	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.506	2026-04-01 19:44:51.506
4673	Miguel		\N	miguelchubre@gmail.com	+56984561586	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.507	2026-04-01 19:44:51.507
4674	Luis	Ignacio Follador	\N	newpop360@hotmail.com	+56996797042	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.508	2026-04-01 19:44:51.508
4675	Jorge		\N	sanhueza.jorge@gmail.com	+56994332201	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.509	2026-04-01 19:44:51.509
4676	Maria		\N	mariadelosangelesramirez@gmail.com	+56950109931	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.509	2026-04-01 19:44:51.509
4677	Felipe		\N	ibanez3.0@hotmail.com	+56990036909	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.51	2026-04-01 19:44:51.51
4678	Cecilia		\N	ccr@mentoringpropiedades.cl	+56978812108	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.511	2026-04-01 19:44:51.511
4679	Rodrigo		\N	rmedelp@gmail.com	+56978075760	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.512	2026-04-01 19:44:51.512
4680	Ester		\N	esterbenoni@gmail.com	+56982937427	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.513	2026-04-01 19:44:51.513
4681	juan	pablo	\N	jpvillenav@gmail.com	+56999173291	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.514	2026-04-01 19:44:51.514
4682	Oscar		\N	oscar@mobki.cl	+56998347827	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.515	2026-04-01 19:44:51.515
4683	Marielza		\N	marielzalima@hotmail.com	+56998405331	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.515	2026-04-01 19:44:51.515
4684	Christian		\N	allendesjoyas@gmail.com	+56999059603	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.516	2026-04-01 19:44:51.516
4685	Clarice		\N	clacampinho@gmail.com	+56989004748	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.517	2026-04-01 19:44:51.517
4686	enzovespatesta		\N	e@rentaweb.cl	+56993371338	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.518	2026-04-01 19:44:51.518
4687	Luis	Andres Vargas	\N	lvargas@transportesluisvargas.cl	+56997793230	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.519	2026-04-01 19:44:51.519
4688	Ciro		\N	noeliafuenzalida88@hotmail.com	+5645083072	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.52	2026-04-01 19:44:51.52
4689	Christianjarac		\N	chjaracarrasco@gmail.com	+56998745888	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.521	2026-04-01 19:44:51.521
4690	Cristina		\N	olivares_cecilia@yahoo.cl	+56994092793	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.522	2026-04-01 19:44:51.522
4691	Jimena		\N	Jimenalirav@gmail.com	+56976489355	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.523	2026-04-01 19:44:51.523
4692	Simonne		\N	simonnevictorianor@gmail.com	+56999655795	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.524	2026-04-01 19:44:51.524
4693	Esteban		\N	estebanorregoeu13@gmail.com	+56989466711	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.524	2026-04-01 19:44:51.524
4694	Yannet		\N	ymp1424@gmail.com	+56984647216	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.525	2026-04-01 19:44:51.525
4695	....hgfhg		\N	rafitazavarce@gmail.com	+56947017222	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.526	2026-04-01 19:44:51.526
4696	Carlos		\N	carloszu66@gmail.com	+56984351306	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.527	2026-04-01 19:44:51.527
4697	Claudio		\N	cperezsebik@gmail.com	+56992973573	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.528	2026-04-01 19:44:51.528
4698	Vale		\N	vale.kinefigueroam@gmail.com	+56987357699	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.529	2026-04-01 19:44:51.529
4699	Mario		\N	marioxperez75@yahoo.es	+56990171536	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.53	2026-04-01 19:44:51.53
4700	Alejandro	Maureira	\N	amaureiram@hotmail.com	+56990997684	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.53	2026-04-01 19:44:51.53
4701	Wilma		\N	wilma_cv@hotmail.com	+56965645468	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.531	2026-04-01 19:44:51.531
4702	Michael		\N	mstuardo2002@hotmail.com	+56961573714	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.532	2026-04-01 19:44:51.532
4703	Francisco		\N	fruz@facar.cl	+56995578975	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.533	2026-04-01 19:44:51.533
4704	Pablo	Mesa	\N	pablo.mesa.a@gmail.com	+56982027069	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.534	2026-04-01 19:44:51.534
4705	Andrea		\N	andreaceciliagc23@gmail.com	+56993755293	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.535	2026-04-01 19:44:51.535
4706	Francisco		\N	jfranciscorp@gmail.com	+56978892895	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.536	2026-04-01 19:44:51.536
4707	Fernando		\N	fernando_diamante@hotmail.com	+56977949106	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.536	2026-04-01 19:44:51.536
4708	Hachii		\N	jos_kombat_@hotmail.com	+56995148142	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.537	2026-04-01 19:44:51.537
4709	Doris	Ly	\N	dorislymunoz@gmail.com	+56988873437	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.538	2026-04-01 19:44:51.538
4710	Tania		\N	taniad.castrof@gmail.com	+56988278283	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.539	2026-04-01 19:44:51.539
4711	rodrigo		\N	rodrigovasq@msn.com	+56999999999	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.54	2026-04-01 19:44:51.54
4712	Teresa		\N	Juanignaciogodoy@gmail.com	+56950642883	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.541	2026-04-01 19:44:51.541
4713	Javier		\N	javier.fontecilla@usach.cl	+56993184639	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.541	2026-04-01 19:44:51.541
4714	Gutierrez		\N	gutierrezmricardo@gmail.com	+56950115045	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.542	2026-04-01 19:44:51.542
4715	Juan	Carlos	\N	gonzalezsanchezjuancarlos77@gmail.com	+56992235090	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.543	2026-04-01 19:44:51.543
4716	Israel	Aguirre	\N	israel.aguirrev@gmail.com	+56999400842	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.544	2026-04-01 19:44:51.544
4717	Ana	Maria	\N	anamariapr1357@gmail.com	+56974600733	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.545	2026-04-01 19:44:51.545
4718	Juan	Paulo	\N	jovalle@labbe.legal	+56998733153	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.546	2026-04-01 19:44:51.546
4719	Cynthia		\N	flga.cynthiamartinez@gmail.com	+999240602	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.547	2026-04-01 19:44:51.547
4720	Félix		\N	ricardopatricioyanezfeliz2@gmail.com	+56920458754	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.547	2026-04-01 19:44:51.547
4721	Gladys		\N	penagladys8@gmail.com	+56979619962	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.548	2026-04-01 19:44:51.548
4722	Romy		\N	rmeyer@meyersa.cl	+56997794278	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.549	2026-04-01 19:44:51.549
4723	KeanuAvia		\N	keanuavia@gmail.com	+56986758207	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.551	2026-04-01 19:44:51.551
4724	Sol		\N	Sil.meneses@gmail.com	99158958	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.552	2026-04-01 19:44:51.552
4725	Jose		\N	jlmorales1967t@gmail.com	+56942499526	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.553	2026-04-01 19:44:51.553
4726	carmen	gloria	\N	brotopropiedades@gmail.com	+56998851135	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.554	2026-04-01 19:44:51.554
4727	Dany		\N	danisamoralesa@hotmail.com	+56978647113	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.555	2026-04-01 19:44:51.555
4728	Nahuel		\N	nahuel.torres2@gmail.com	+56975255313	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.555	2026-04-01 19:44:51.555
4729	Erika		\N	marrous37@hotmail.com	+56993438695	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.556	2026-04-01 19:44:51.556
4730	David		\N	martinezmndz.david@gmail.com	+56944954778	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.557	2026-04-01 19:44:51.557
4731	Viviana	Herrera	\N	viviana.isa81@gmail.com	+56997536973	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.558	2026-04-01 19:44:51.558
4732	Maria		\N	minesdelaf@gmail.com	991594414	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.559	2026-04-01 19:44:51.559
4733	Javiera	Ramirez	\N	maria.javiera.r@gmail.com	+56986117413	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.56	2026-04-01 19:44:51.56
4734	Ysaac		\N	icollsher@gmail.com	94931289	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.561	2026-04-01 19:44:51.561
4735	Sergio	Espinoza	\N	sergiof.espinozab@gmail.com	+56994796635	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.562	2026-04-01 19:44:51.562
4736	Alejandro		\N	cristianfuentesmor@gmail.com	+56979011449	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.562	2026-04-01 19:44:51.562
4737	Ropa		\N	paleontologia.p@gmail.com	+56963486855	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.563	2026-04-01 19:44:51.563
4738	Nerva	Torres	\N	torresnerva4@gmail.com	+56956307817	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.564	2026-04-01 19:44:51.564
4739	Javier	Arancibia	\N	Arancibia29.javier@gmail.com	+56968356397	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.565	2026-04-01 19:44:51.565
4740	Alvaro		\N	aiksing@gmail.com	971254705	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.566	2026-04-01 19:44:51.566
4741	Diego		\N	ignaciodiego.viveros@gmail.com	+56973726001	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.567	2026-04-01 19:44:51.567
4742	Teru	Ester	\N	teresa.araya.f@gmail.com	+56998202311	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.568	2026-04-01 19:44:51.568
4743	Rodrigo	Kehr	\N	rodrigokehr@hotmail.com	+56965878152	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.569	2026-04-01 19:44:51.569
4744	Oscar		\N	ocalffatellez@vtr.net	+56992338959	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.57	2026-04-01 19:44:51.57
4745	Ernesto	Lopez	\N	ernesto.lopez.ritz@gmail.com	+56952197402	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.571	2026-04-01 19:44:51.571
4746	Luis	Hernan	\N	Lsvalle14@gmail.com	+56977919860	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.571	2026-04-01 19:44:51.571
4747	Rodrigo	Ruiz	\N	rodrigo.ruiz.o@gmail.com	+56977767985	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.572	2026-04-01 19:44:51.572
4748	Dovier		\N	dovier.mac@gmail.com	+56973585343	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.573	2026-04-01 19:44:51.573
4749	Julio	Antonio	\N	antonio.quintana.caro@gmail.com	+56941367427	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.573	2026-04-01 19:44:51.573
4750	Sony	Aden	\N	RSONY5327@gmail.com	+56954399700	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.574	2026-04-01 19:44:51.574
4751	Ruth		\N	abuelitoscereceda2019@gmail.com	+56993109290	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.575	2026-04-01 19:44:51.575
4752	Victoria.Torres		\N	victoria.torres@usach.cl	+15306013296	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.576	2026-04-01 19:44:51.576
4753	Elena		\N	nubegris_flaca@hotmail.com	+56990788835	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.577	2026-04-01 19:44:51.577
4754	Carlos		\N	contadorpyme@mail.com	+56998214848	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.578	2026-04-01 19:44:51.578
4755	Maximiliano		\N	maximiliano.nunez.n@gmail.com	+5642815009	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.579	2026-04-01 19:44:51.579
4756	Luis		\N	luis_leon25@hotmail.com	+56954775220	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.58	2026-04-01 19:44:51.58
4757	Carolina		\N	cqueupan@gmail.com	+56988958615	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.581	2026-04-01 19:44:51.581
4758	Alfredo		\N	alcitec73@gmail.com	+56953594729	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.582	2026-04-01 19:44:51.582
4759	Maria	Angelica	\N	mabafer31@gmail.com	+56937714506	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.583	2026-04-01 19:44:51.583
4760	Verónica		\N	veronicagema@hotmail.com	+56998173732	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.583	2026-04-01 19:44:51.583
4761	Walter	Weber	\N	walterwb@gmail.com	+56978279305	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.584	2026-04-01 19:44:51.584
4762	Paulina		\N	paulina.erazo@hotmail.com	+56990547531	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.585	2026-04-01 19:44:51.585
4763	Fernando		\N	santibanez_fernando@hotmail.com	+56999948075	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.586	2026-04-01 19:44:51.586
4764	Jose	Alejandro	\N	jalejoperez18@hotmail.com	+56935041978	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.587	2026-04-01 19:44:51.587
4765	Verónica	R Sepúlveda	\N	veroge2410@hotmail.com	+56999149167	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.588	2026-04-01 19:44:51.588
4766	Luz	Maritza	\N	mari6141@hotmail.com	+5698174820	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.589	2026-04-01 19:44:51.589
4767	Jorge		\N	jorge.pedraza@gmail.com	+56998621097	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.59	2026-04-01 19:44:51.59
4768	Patricio		\N	pespinosav777@gmail.com	+56998873258	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.591	2026-04-01 19:44:51.591
4769	Diego		\N	diegonunezfer@gmail.com	+56954893311	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.592	2026-04-01 19:44:51.592
4770	Jorge	Lopendia	\N	jorgelopendia332@hotmail.com	+56994103801	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.593	2026-04-01 19:44:51.593
4771	Luis		\N	luis.perez.manriquez@gmail.com	+56982057053	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.593	2026-04-01 19:44:51.593
4772	Odhina	Tamara	\N	tamarapina12@gmail.com	+56990197906	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.594	2026-04-01 19:44:51.594
4773	Jorge	Luis	\N	jorgeluisespinoza@gmail.com	+56452314190	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.595	2026-04-01 19:44:51.595
4774	Luis		\N	Juincho2815@gmail.com	+56955381294	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.596	2026-04-01 19:44:51.596
4775	Leonardo		\N	lsanzm@outlook.com	+56993687739	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.597	2026-04-01 19:44:51.597
4776	Ginomuva		\N	Ginomuva@gmail.com	+56949228482	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.598	2026-04-01 19:44:51.598
4777	Lorena	Jara	\N	ljaras70@gmail.com	+56994387406	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.599	2026-04-01 19:44:51.599
4778	Enrique		\N	evilleg@gmail.com	+56995294407	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.6	2026-04-01 19:44:51.6
4779	Nathalie		\N	nathalie.collipal.a@gmail.com	+56984361070	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.601	2026-04-01 19:44:51.601
4780	Suzana		\N	suyed@hotmail.com	+56934375957	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.601	2026-04-01 19:44:51.601
4781	Felipe	Andrés Gálvez Maturana	\N	taskwolf.cargo@gmail.com	+56977844027	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.602	2026-04-01 19:44:51.602
4782	Alejandra		\N	alejandrapalmap@gmail.com	+56992444161	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.603	2026-04-01 19:44:51.603
4783	Eduardo		\N	Eleguer@leguer.cl	+56973347097	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.604	2026-04-01 19:44:51.604
4784	Fernando	Castro	\N	fernandocastroav@gmail.com	+56985295734	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.605	2026-04-01 19:44:51.605
4785	Juan	Guillermo Carrasco	\N	administracion@asesoriasdelsur.com	+56961257575	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.606	2026-04-01 19:44:51.606
4786	Marisol		\N	marisol273@gmail.com	+56995168450	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.607	2026-04-01 19:44:51.607
4787	Carolina		\N	carolynagm@hotmail.com	+56934076791	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.607	2026-04-01 19:44:51.607
4788	Juan	Pablo	\N	juanpablozepedanovoa@gmail.com	+56967083122	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.608	2026-04-01 19:44:51.608
4789	Evelin	Maribel Millacura	\N	evelin.millacura@gmail.come	89302909	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.609	2026-04-01 19:44:51.609
4790	David	Vargas	\N	davidvargasaravena@hotmail.com	+56979667682	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.61	2026-04-01 19:44:51.61
4791	Gonzalo		\N	gonzalomdeu@gmail.com	+56996797569	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.611	2026-04-01 19:44:51.611
4792	Carlos	Patricio	\N	carlospatriciosilvabustos@gmail.com	+56966061148	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.612	2026-04-01 19:44:51.612
4793	Jacqueline	Carrasco	\N	jacqui.carrasco@gmail.com	+56997020142	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.613	2026-04-01 19:44:51.613
4794	Mauricio		\N	hmcandiav@gmail.com	+56999699137	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.613	2026-04-01 19:44:51.613
4795	chito		\N	jona.pinam@gmail.com	+56926226462	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.614	2026-04-01 19:44:51.614
4796	Historias	de	\N	dr.avalos@gmail.com	+56222324019	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.615	2026-04-01 19:44:51.615
4797	Domingo	Benjamin	\N	Aridosfuturo@gmail.com	+56977645709	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.616	2026-04-01 19:44:51.616
4798	Cristian	vergara	\N	Vergara.cg@gmail.com	+56988802602	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.617	2026-04-01 19:44:51.617
4799	Cesar		\N	Cesar.ormeno@gmail.com	+56993995533	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.618	2026-04-01 19:44:51.618
4800	Veronica		\N	vronik_flores@hotmail.com	+56976484986	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.619	2026-04-01 19:44:51.619
4801	Jessica		\N	atrezzorental@gmail.com	+56968656559	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.62	2026-04-01 19:44:51.62
4802	Dr.	Cristian Vilches/ Dr.	\N	drvrrss@gmail.com	+56999534198	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.621	2026-04-01 19:44:51.621
4803	Claudio	Álvarez	\N	jc.alvarezlagos@gmail.com	+56956493601	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.621	2026-04-01 19:44:51.621
4804	Julio		\N	jseguel7201@gmail.com	+56995339463	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.622	2026-04-01 19:44:51.622
4805	Gonzalo	V. Irarrázaval	\N	girarrazavalr@hotmail.com	+56934067935	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.623	2026-04-01 19:44:51.623
4806	Uwe		\N	uwe.rohrborn@gmail.ecom	+56995487609	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.624	2026-04-01 19:44:51.624
4807	Mirta	Carvajal	\N	mirticm@hotmail.com	+56988228564	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.625	2026-04-01 19:44:51.625
4808	Cristián		\N	cri.munoz.g@gmail.com	+56998837015	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.626	2026-04-01 19:44:51.626
4809	Jaime		\N	jferna01@gmail.com	+56966185147	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.626	2026-04-01 19:44:51.626
4810	Freddy		\N	kine.fguerrero@gmail.com	+56998435424	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.627	2026-04-01 19:44:51.627
4811	Juan		\N	jc.cortesrivera@gmail.com	+56968469463	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.628	2026-04-01 19:44:51.628
4812	Miguel	A. Gómez	\N	Magg1704@hotmail.com	+56995195738	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.629	2026-04-01 19:44:51.629
4813	Patricia		\N	patmeri@yahoo.com	+56994996704	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.63	2026-04-01 19:44:51.63
4814	Jorge		\N	josalaza@gmail.com	+56998410033	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.631	2026-04-01 19:44:51.631
4815	Rodrigo		\N	r.barrosb@yahoo.com	+56988191551	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.632	2026-04-01 19:44:51.632
4816	Ale		\N	alepachecoocayo@hotmail.com	+56978542404	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.633	2026-04-01 19:44:51.633
4817	Francisco		\N	hernandezdiaz@gmail.com	+56979686313	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.633	2026-04-01 19:44:51.633
4818	Felipe	Aravena	\N	felipearavenag.personal@gmail.com	+56987983904	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.634	2026-04-01 19:44:51.634
4819	Andrea	Frésard	\N	afresard@gmail.com	+56979593891	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.635	2026-04-01 19:44:51.635
4820	Victor		\N	v_albornoz@live.cl	+56954206881	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.636	2026-04-01 19:44:51.636
4821	Iván		\N	ivancona@gmail.com	+56979970413	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.637	2026-04-01 19:44:51.637
4822	Raul		\N	raulrojasp@rmaquinaria.cl	0000000	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.638	2026-04-01 19:44:51.638
4823	Nicolas		\N	nabravo@uc.cl	56975598634	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.639	2026-04-01 19:44:51.639
4824	Johanna	Maria	\N	johannasotelo@gmail.com	+56942818145	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.639	2026-04-01 19:44:51.639
4825	Matias	Serey Guerra	\N	matserey.guerra@gmail.com	+56984291817	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.64	2026-04-01 19:44:51.64
4826	Nelson		\N	nelsoncabello9@gmail.com	+56986697303	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.641	2026-04-01 19:44:51.641
4827	Lorena	Jiménez	\N	ljponce@gmail.com	+56971735355	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.642	2026-04-01 19:44:51.642
4828	Viviana		\N	vivianaborlando@gmail.com	56977081715	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.643	2026-04-01 19:44:51.643
4829	Emmy	Olivares	\N	emmyolivares963@gmail.com	995373110	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.644	2026-04-01 19:44:51.644
4830	Ivan		\N	itgj28@yahoo.com	+34635220238	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.645	2026-04-01 19:44:51.645
4831	Katherine		\N	katherinemiluska7@gmail.com	+56986153797	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.646	2026-04-01 19:44:51.646
4832	Eduardo		\N	edorios@vtr.net	+56982949395	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.647	2026-04-01 19:44:51.647
4833	Edu		\N	Saeprrhh@gmail.com	964744166	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.647	2026-04-01 19:44:51.647
4834	Emilio		\N	emilio.cariaga@gmail.com	+56987050799	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.648	2026-04-01 19:44:51.648
4835	Marigen	Moore	\N	mmoore547@gmail.com	+56995028064	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.649	2026-04-01 19:44:51.649
4836	Pablo		\N	pmontero2@gmail.com	+56981332881	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.65	2026-04-01 19:44:51.65
4837	William		\N	williamcva@gmail.com	+56982890916	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.651	2026-04-01 19:44:51.651
4838	Néstor	Bello	\N	nestorbello@gmail.com	+56999795351	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.652	2026-04-01 19:44:51.652
4839	Luz		\N	alevema@yahoo.com	+56988878616	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.653	2026-04-01 19:44:51.653
4840	Juan		\N	jcg5850@gmail.com	+56969188936	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.654	2026-04-01 19:44:51.654
4841	José	Ignacio	\N	jvalenzuela@inversionessanignacio.cl	+56995093418	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.655	2026-04-01 19:44:51.655
4842	Mauricio		\N	mauricioutreras@hotmail.com	+56987096896	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.655	2026-04-01 19:44:51.655
4843	Agustin		\N	tazramos@hotmail.com	+56992816408	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.656	2026-04-01 19:44:51.656
4844	Carolina	Lizama	\N	carolinalizamaoffen@gmail.com	999956726	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.657	2026-04-01 19:44:51.657
4845	Cesar		\N	stalkervillage@gmail.com	+56936100937	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.658	2026-04-01 19:44:51.658
4846	Soledad	Medina	\N	soledadmedinac@gmail.com	+56992848498	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.659	2026-04-01 19:44:51.659
4847	Anto		\N	antonelacp26@gmail.com	+56961112511	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.66	2026-04-01 19:44:51.66
4848	Edward		\N	eortega1977@gmail.com	+56984105390	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.661	2026-04-01 19:44:51.661
4849	Carlos	Villanueva	\N	carvillafer@outlook.com	+56992992979	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.662	2026-04-01 19:44:51.662
4850	Hector		\N	hectorrodrigocastillopalma@gmail.com	+56976808151	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.663	2026-04-01 19:44:51.663
4851	Celso	Antonio	\N	Celso_navarrete@hotmail.com	+56992496709	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.663	2026-04-01 19:44:51.663
4852	Philip		\N	pkrumm@vtr.net	+56992254682	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.664	2026-04-01 19:44:51.664
4853	Leessyn	Lee Miranda	\N	lee.mir@hotmail.com	+56955855024	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.665	2026-04-01 19:44:51.665
4854	Rodviano		\N	rpalominosn@gmail.com	+56987902007	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.666	2026-04-01 19:44:51.666
4855	Eduardo	Sepùlveda	\N	edo.sepulveda.j@gmail.com	+56956071083	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.667	2026-04-01 19:44:51.667
4856	Andrea		\N	andreaa294@gmail.com	+56985002086	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.668	2026-04-01 19:44:51.668
4857	Sixto		\N	Ulloaeduardo@gmail.com	+56966671955	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.669	2026-04-01 19:44:51.669
4858	Mario	Flores	\N	mariofloresmm@gmail.com	+964(890)005	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.67	2026-04-01 19:44:51.67
4859	Cora	Maria	\N	cora.perezrojas@gmail.com	+56997790056	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.671	2026-04-01 19:44:51.671
4860	Ana		\N	ana16748433@yahoo.es	+56929900344	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.672	2026-04-01 19:44:51.672
4861	Willy	Antonio Vargas	\N	wavargas@puc.cl	+56982333200	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.673	2026-04-01 19:44:51.673
4862	Hector	Patricio	\N	harias018@gmail.com	+56982677908	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.673	2026-04-01 19:44:51.673
4863	Carolina		\N	profecaro88@gmail.com	+56998141056	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.674	2026-04-01 19:44:51.674
4864	Giuliano	La Rosa	\N	glarosav@gmail.com	+56991388810	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.675	2026-04-01 19:44:51.675
4865	Pedro	Cristian Mundaca	\N	pdromundaca@hotmail.com	+56994486721	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.676	2026-04-01 19:44:51.676
4866	Rosanna		\N	igna.ros.cla@gmail.com	+5673242443	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.677	2026-04-01 19:44:51.677
4867	ClaudIo		\N	Claudiotejosr@hotmail.com	+56998846107	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.677	2026-04-01 19:44:51.677
4868	Mane		\N	mane.lara@gmail.com	+56990947853	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.678	2026-04-01 19:44:51.678
4869	Juan		\N	j.melladojimenez@hotmail.com	+56945753889	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.679	2026-04-01 19:44:51.679
4870	Marcos		\N	mavoy18@gmail.com	+56998681061	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.68	2026-04-01 19:44:51.68
4871	Rodrigo		\N	Rodrigogallarsorebolledo@gmail.com	+56976718862	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.681	2026-04-01 19:44:51.681
4872	Leslie		\N	L_vironneau@hotmail.com	+56998250462	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.681	2026-04-01 19:44:51.681
4873	Marco		\N	mriverac@liceobicentenariocoronel.cl	+56965117165	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.682	2026-04-01 19:44:51.682
4874	Loreto		\N	lmoyag@me.com	+56944088833	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.683	2026-04-01 19:44:51.683
4875	Luis	Antonio	\N	leviopayllalluisantonio@gmail.com	+19388651393	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.684	2026-04-01 19:44:51.684
4876	Claudia	L	\N	claudiazubra@gmail.com	+56999395502	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.684	2026-04-01 19:44:51.684
4877	ximena		\N	guajardoximena.11@gmail.com	+56966942349	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.685	2026-04-01 19:44:51.685
4878	Jorge	zenteno	\N	jippycosmico@gmail.com	+5696363528935288	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.686	2026-04-01 19:44:51.686
4879	Carlos		\N	Todoventasortiz@gmail.com	+56999999999	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.687	2026-04-01 19:44:51.687
4880	laamigacris		\N	ocfilms@live.cl	+56963712921	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.687	2026-04-01 19:44:51.687
4881	Jacques	Mora	\N	jacquesmoras@gmail.com	+56992404268	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.688	2026-04-01 19:44:51.688
4882	Andrea	Panayotti • Marca	\N	apanayotti80@hotmail.com	+56963008352	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.689	2026-04-01 19:44:51.689
4883	Cristian		\N	carp1973@hotmail.com	+56991398549	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.689	2026-04-01 19:44:51.689
4884	Sonia		\N	sonia.tapia18@gmail.com	+56979503398	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.69	2026-04-01 19:44:51.69
4885	Alejandro	serpa	\N	Aaserpa77@gmail.com	+56996548057	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.691	2026-04-01 19:44:51.691
4886	Milu		\N	masajesmilu1985@gmail.com	+56962883299	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.692	2026-04-01 19:44:51.692
4887	Candrea		\N	cabadilla8028@gmail.com	+56998614899	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.693	2026-04-01 19:44:51.693
4888	Gustavo	fernandez	\N	Gustavof@vtr.net	+56993201743	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.694	2026-04-01 19:44:51.694
4889	Cristian		\N	cristian_car80@hotmail.com	+56992347957	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.695	2026-04-01 19:44:51.695
4890	Rita		\N	ritagonzalezg@hotmail.com	+56994184968	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.696	2026-04-01 19:44:51.696
4891	lily		\N	ljustiniano@segurosbroker.cl	+56988194572	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.696	2026-04-01 19:44:51.696
4892	Sandro	Canevari	\N	scanevaric@yahoo.es	+56998295835	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.697	2026-04-01 19:44:51.697
4893	David		\N	disd.87.ds@gmail.com	+56937836101	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.698	2026-04-01 19:44:51.698
4894	Javier		\N	hlgr6875@yahoo.com	+56976688400	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.699	2026-04-01 19:44:51.699
4895	AuroraMagdalena		\N	aurorahernandezro@gmail.com	+56993184567	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.7	2026-04-01 19:44:51.7
4896	Julio		\N	Jmelelli@icloud.com	+56998298098	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.701	2026-04-01 19:44:51.701
4897	Pedro		\N	pedrospedroig@gmail.com	+56998834704	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.702	2026-04-01 19:44:51.702
4898	Ale		\N	acasalicapurro@gmail.com	+56976372768	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.702	2026-04-01 19:44:51.702
4899	Luis		\N	luis.gallardo.n@gmail.com	+56942373144	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.703	2026-04-01 19:44:51.703
4900	Ramon	Riveros	\N	ramonrc33@gmail.com	+56984398706	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.704	2026-04-01 19:44:51.704
4901	Caterina		\N	catapet@gmail.com	+56992781120	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.705	2026-04-01 19:44:51.705
4902	Angela		\N	angela.lefenda@gmail.com	+56991098673	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.706	2026-04-01 19:44:51.706
4903	Antonio		\N	hawkshotchile@gmail.com	+56987743692	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.707	2026-04-01 19:44:51.707
4904	Gloria		\N	gespinosaase@hotmail.com	+56923933459	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.708	2026-04-01 19:44:51.708
4905	Karina	Del	\N	karinadelcanto@gmail.com	+56978400977	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.708	2026-04-01 19:44:51.708
4906	Francisco		\N	allendesjf@gmail.com	+56991948783	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.709	2026-04-01 19:44:51.709
4907	José		\N	001gregorio@gmail.com	+584121806481	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.71	2026-04-01 19:44:51.71
4908	Sergio		\N	sergiomoscoso.sm@gmail.com	+56992379188	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.711	2026-04-01 19:44:51.711
4909	Jacqueline	Capurro	\N	j_capurro_o@hotmail.com	+56983600871	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.712	2026-04-01 19:44:51.712
4910	Sebastian		\N	sebasrosero@gmail.com	+56992602044	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.713	2026-04-01 19:44:51.713
4911	Roger		\N	rogercortesaraya@gmail.com	+56940000000	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.713	2026-04-01 19:44:51.713
4912	Victor	Hugo	\N	tarugotropa.1965@gmail.com	+56998113707	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.714	2026-04-01 19:44:51.714
4913	Nicolás		\N	neroman.g@gmail.com	+56996601924	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.715	2026-04-01 19:44:51.715
4914	Cristina		\N	dominga29@hotmail.com	+56930516078	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.716	2026-04-01 19:44:51.716
4915	Pablo		\N	Pablo.madariagap@gmail.com	+56978629980	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.717	2026-04-01 19:44:51.717
4916	conrubiovivesano		\N	leonardorubiomendoza@gmail.com	+56981837352	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.718	2026-04-01 19:44:51.718
4917	Ana	Pia Araya	\N	anirayae@yahoo.com	+56954100572	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.719	2026-04-01 19:44:51.719
4918	Marcelo		\N	mortiz709@gmail.com	+56992404208	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.719	2026-04-01 19:44:51.719
4919	Carola		\N	carolamaass@gmail.com	+56976493457	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.72	2026-04-01 19:44:51.72
4920	Andreina		\N	andreinamendoza2@gmail.com	+56977527142	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.721	2026-04-01 19:44:51.721
4921	Carol	Rosales	\N	isabelcarol.rosalesramirez@gmail.com	+56940362722	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.722	2026-04-01 19:44:51.722
4922	Carolina		\N	Carolina.123454321@outlook.es	+56998192029	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.723	2026-04-01 19:44:51.723
4923	Naldo		\N	monje.a@hotmail.com	+56982938596	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.724	2026-04-01 19:44:51.724
4924	Luis		\N	luis_parada@hotmail.com	+56976090676	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.724	2026-04-01 19:44:51.724
4925	Julio		\N	damian-aaron-1992@hotmail.com	+56993368596	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.725	2026-04-01 19:44:51.725
4926	Sebastian		\N	sebastianromosamaniego@gmail.com	+56984264951	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.726	2026-04-01 19:44:51.726
4927	Percival		\N	percival@linacre.cl	+56978065925	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.727	2026-04-01 19:44:51.727
4928	Marisol		\N	marisoljaraguerrero@gmail.com	+56951353627	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.728	2026-04-01 19:44:51.728
4929	Marcelo	Alejandro	\N	elfarricardimarcelo@gmail.com	+56959966964	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.729	2026-04-01 19:44:51.729
4930	Ana	Gloria	\N	anagloriaquiroga@gmail.com	+56993137881	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.729	2026-04-01 19:44:51.729
4931	gladys		\N	gladyscaballerouribe@gmail.com	+56992009665	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.73	2026-04-01 19:44:51.73
4932	Paula		\N	paulaquintrel@hotmail.com	+56945965407	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.731	2026-04-01 19:44:51.731
4933	CBN	SAN	\N	arancibia2812@gmail.com	+56979778701	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.732	2026-04-01 19:44:51.732
4934	Gastón	Cabezas	\N	gastoncabezas78@gmail.com	+56990182175	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.733	2026-04-01 19:44:51.733
4935	Felipe		\N	felipe.chandia@sodexo.com	+56979671716	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.734	2026-04-01 19:44:51.734
4936	Isabel		\N	veronicavillacanto@gmail.com	+56989060139	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.734	2026-04-01 19:44:51.734
4937	Felipe	Ignacio	\N	ignaciohurtadog5@gmail.com	+56965135074	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.735	2026-04-01 19:44:51.735
4938	Eduardo		\N	Elcucu1958@gmail.com	+56991759895	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.736	2026-04-01 19:44:51.736
4939	Gerardo		\N	gjurrutia@gmail.com	+56948037059	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.737	2026-04-01 19:44:51.737
4940	Daniela		\N	danielaforster@gmail.com	+56989030715	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.738	2026-04-01 19:44:51.738
4941	Pilar	Valencia	\N	torresgorka900@gmail.com	+56984230700	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.739	2026-04-01 19:44:51.739
4942	Hernan		\N	seguelseguelhernan@gmail.com	+56953071215	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.739	2026-04-01 19:44:51.739
4943	MariaJose		\N	mariajosechuescasg@gmail.com	+56951166781	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.74	2026-04-01 19:44:51.74
4944	Oscar		\N	oscarvillablanca@hotmail.com	+56993219425	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.741	2026-04-01 19:44:51.741
4945	Alejandra		\N	Alejandra.gsmbini@yahoo.cl	+56999645900	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.742	2026-04-01 19:44:51.742
4946	Gabriel	Rivera	\N	gabriel.eriveran@gmail.com	+56981376425	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.743	2026-04-01 19:44:51.743
4947	Miguel	Carvajal	\N	mcdelmauco@gmail.com	+56990508526	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.744	2026-04-01 19:44:51.744
4948	Maria	T	\N	amtoemi@gmail.com	+56989105058	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.745	2026-04-01 19:44:51.745
4949	jaime		\N	jaimeleiva@hotmail.com	+56998272051	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.746	2026-04-01 19:44:51.746
4950	Andres		\N	Andresmeloa@gmail.com	+56976673083	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.747	2026-04-01 19:44:51.747
4951	Jacqueline		\N	jacquelinealvarezb@gmail.com	+56983004589	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.748	2026-04-01 19:44:51.748
4952	Loretto	Soledad Beltran	\N	loretto.beltran@gmail.com	988890449	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.748	2026-04-01 19:44:51.748
4953	Rodrigo	Ojeda	\N	rola289@hotmail.com	+56966796461	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.749	2026-04-01 19:44:51.749
4954	Angelo		\N	angelo.astete@gmail.com	+56956861928	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.75	2026-04-01 19:44:51.75
4955	Juan	Andrés	\N	juan.yanez.r@usach.cl	+56930191905	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.751	2026-04-01 19:44:51.751
4956	Carolina		\N	Carolina.fernandez.bustos@gmail.com	+56982011941	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.752	2026-04-01 19:44:51.752
4957	Rodrigo	Bravo	\N	rodrigoabravog@gmail.com	+56998170708	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.753	2026-04-01 19:44:51.753
4958	Carlos	Olea	\N	carlos.olea@camionero.cl	+56985953440	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.754	2026-04-01 19:44:51.754
4959	Teodoro		\N	tbenario2@gmail.comt	+56999995814	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.755	2026-04-01 19:44:51.755
4960	Katy	Virot	\N	kvirot@hotmail.com	+56957688344	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.756	2026-04-01 19:44:51.756
4961	chicop		\N	chicop.27@gmail.com	+56962808505	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.756	2026-04-01 19:44:51.756
4962	Agustín	Vargas	\N	agustin.uabm@gmail.com	+56982788251	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.757	2026-04-01 19:44:51.757
4963	Ames63		\N	anafuentessoto@gmail.com	+56986186552	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.758	2026-04-01 19:44:51.758
4964	ROXANA	GALLARDO	\N	roxgala29@gmail.com	+56982368037	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.759	2026-04-01 19:44:51.759
4965	Juan	Carlos	\N	juancarlosorell@gmail.com	+56988193639	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.76	2026-04-01 19:44:51.76
4966	Carolina	Matamala	\N	matamala.c@gmail.com	+56962199548	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.761	2026-04-01 19:44:51.761
4967	Sara		\N	saraelebrossard@yahoo.es	+56957837800	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.762	2026-04-01 19:44:51.762
4968	Roberto	Andrés Cárcamo	\N	carcamop.roberto@gmail.com	77939060	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.762	2026-04-01 19:44:51.762
4969	Paula	Villa	\N	paula.villacastro@gmail.com	+56997450327	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.763	2026-04-01 19:44:51.763
4970	Matias		\N	matias.munoz.gayoso14@gmail.com	+56982976099	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.764	2026-04-01 19:44:51.764
4971	Jorge		\N	jorge.ignaciofuente@gmail.com	+56962683201	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.765	2026-04-01 19:44:51.765
4972	Maruja		\N	pehuen1932@hotmail.com	+56997807997	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.766	2026-04-01 19:44:51.766
4973	Beatriz		\N	carolinacarrascoalvarez@yahoo.es	+56989726660	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.767	2026-04-01 19:44:51.767
4974	Sebastián		\N	sbalutr@gmail.com	+56978088342	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.77	2026-04-01 19:44:51.77
4975	Pamela	Macarena Guerra	\N	pame.guerra1997@gmail.com	+56937184093	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.771	2026-04-01 19:44:51.771
4976	María	José	\N	mari.diaz.di@gnail.com	+56957628167	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.772	2026-04-01 19:44:51.772
4977	Maria		\N	cristinaelmesutibe@gmail.com	+56945902837	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.773	2026-04-01 19:44:51.773
4978	Sergio		\N	Sesantibanez@gmail.com	+56930863310	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.773	2026-04-01 19:44:51.773
4979	Elkelina		\N	eeuteneier@gmail.com	+56990943708	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.774	2026-04-01 19:44:51.774
4980	Esteban		\N	stebn.gonzalez.l@gmail.com	+56998743559	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.775	2026-04-01 19:44:51.775
4981	Alejandra	Echeverria	\N	aleyoa@yahoo.com	+56940070194	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.776	2026-04-01 19:44:51.776
4982	Fabiola		\N	f.lealreyes@gmail.com	+56959706450	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.777	2026-04-01 19:44:51.777
4983	Paula		\N	panguitaaguilera@gmail.com	+56969081107	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.777	2026-04-01 19:44:51.777
4984	Juan		\N	jpablovergara1@hotmail.com	+56966415663	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.778	2026-04-01 19:44:51.778
4985	B	R Y A	\N	bryanvarelabevs@gmail.com	+56934146344	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.779	2026-04-01 19:44:51.779
4986	Caroll	Sinclair	\N	sinclair@live.cl	+56998472202	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.78	2026-04-01 19:44:51.78
4987	Patricia		\N	Patpoz@hotmail.com	+56974736336	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.781	2026-04-01 19:44:51.781
4988	Faustino		\N	faustinovaldebenito@gmail.com	+56971062077	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.782	2026-04-01 19:44:51.782
4989	Mirta		\N	mirta27041948@gmail.com	+56979607746	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.782	2026-04-01 19:44:51.782
4990	Sebastián	Felipe	\N	sebastian.bravo.ponce@gmail.com	+56993430911	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.783	2026-04-01 19:44:51.783
4991	Arturo	Valerio	\N	nahuelpanarturo@gmail.com	+56964253418	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.784	2026-04-01 19:44:51.784
4992	Alejandra	Cornejo	\N	acornejoanselmo@gmail.com	+56978642496	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.785	2026-04-01 19:44:51.785
4993	Piedad	González	\N	lapieta2012@gmail.com	+56950703939	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.786	2026-04-01 19:44:51.786
4994	Gerardo		\N	gecam74@hotmail.com	+56999911523	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.787	2026-04-01 19:44:51.787
4995	Jenny		\N	j.jenniffer@gmail.com	+56996304743	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.788	2026-04-01 19:44:51.788
4996	Tama		\N	tamarita.lopez007@gmail.com	+56950163982	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.789	2026-04-01 19:44:51.789
4997	Claudia		\N	14claudiagonzalezsaez@gmail.com	+56961391782	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.79	2026-04-01 19:44:51.79
4998	Colomba	Gonzalez	\N	colombagonzalez@hotmail.com	+56982992843	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.79	2026-04-01 19:44:51.79
4999	Francisco	Javier	\N	fco.larenas@gmail.com	+56988880307	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.791	2026-04-01 19:44:51.791
5000	Francisco		\N	francisco@rialis.cl	+56991063033	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.792	2026-04-01 19:44:51.792
5001	Dorita		\N	acunadoris@hotmail.com	+56993427112	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.793	2026-04-01 19:44:51.793
5002	Diana		\N	Dra.dianapiedrahitaacevedo@gmail.com	+56962745988	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.794	2026-04-01 19:44:51.794
5003	David		\N	david.dabaco@gmail.com	+56998385741	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.795	2026-04-01 19:44:51.795
5004	Hernan		\N	hazpublicidad@gmail.com	+56997003303	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.796	2026-04-01 19:44:51.796
5005	Alejandro		\N	jaimeflores3862@gmail.com	+56940419869	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.797	2026-04-01 19:44:51.797
5006	Guillermina		\N	guillerminareynado@gmail.com	+56949598586	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.798	2026-04-01 19:44:51.798
5007	Rene		\N	renemella705@gmail.com	+56975591715	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.799	2026-04-01 19:44:51.799
5008	Stephanny	Alfaro	\N	Alfarojopia.s@gmail.com	+5642295672	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.8	2026-04-01 19:44:51.8
5009	Maria	del	\N	madelmarc@hotmail.com	+56988880314	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.801	2026-04-01 19:44:51.801
5010	MiriamContreras		\N	miriamandrea100@gmail.cm	998657543	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.801	2026-04-01 19:44:51.801
5011	Claudio	Villavicencio	\N	villanzon@gmail.com	+56990006536	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.802	2026-04-01 19:44:51.802
5012	Juanfrancisco		\N	juanfranciscocayulao1@gmail.com	+56942357286	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.803	2026-04-01 19:44:51.803
5013	Pupy		\N	pupymilo@hotmail.com	+56984299853	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.804	2026-04-01 19:44:51.804
5014	Antonio		\N	antoniogaete@gmail.com	988193880	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.805	2026-04-01 19:44:51.805
5015	Luz		\N	luz_erazom@hotmail.com	+56974316625	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.806	2026-04-01 19:44:51.806
5016	Rodolfo		\N	rodo.gebauer@gmail.com	+56993007133	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.807	2026-04-01 19:44:51.807
5017	María	Loreto Lema	\N	Loretolema@gmail.com	+56985345224	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.807	2026-04-01 19:44:51.807
5018	Pia		\N	piaonellbravo@gmail.com	+56998879663	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.808	2026-04-01 19:44:51.808
5019	Alejandra	Linoska Villouta	\N	alejandravillouta31@gmail.com	+56957498243	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.809	2026-04-01 19:44:51.809
5020	Carolina		\N	carolinacortesg2022@gmail.com	+56953341707	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.81	2026-04-01 19:44:51.81
5021	JOSE		\N	josemartinez457@gmail.com	+56945176770	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.811	2026-04-01 19:44:51.811
5022	Andres	Cristobal Perez	\N	andres.prepfisico@gmail.com	+56984391441	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.812	2026-04-01 19:44:51.812
5023	Leonel		\N	Jesusangulo4978@gmail.com	+56965026558	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.813	2026-04-01 19:44:51.813
5024	BELKIS		\N	belkiscontreras1402@gmail.com	+56944727894	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.814	2026-04-01 19:44:51.814
5025	Lucrecia	M.Flores	\N	lucmayi@hotmail.com	+56996824296	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.814	2026-04-01 19:44:51.814
5026	Pedro		\N	Pcampodonicolc@gmail.com	+56984046482	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.815	2026-04-01 19:44:51.815
5027	Carlos	Israel	\N	carloschaura.edific@gmail.com	+56995541868	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.816	2026-04-01 19:44:51.816
5028	Cecilia		\N	ceciliarevalo17@gmail.com	+56972187031	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.817	2026-04-01 19:44:51.817
5029	Sebastián		\N	cucholix@gmail.com	+56965543410	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.818	2026-04-01 19:44:51.818
5030	Daniel		\N	danielarmitano@hotmail.com	+56951816361	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.819	2026-04-01 19:44:51.819
5031	Hermogened		\N	Multitiendacostablanca@gmail.com	+56948849578	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.819	2026-04-01 19:44:51.819
5032	vinicio		\N	viniciofernando1958@gmail.com	+56995475987	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.82	2026-04-01 19:44:51.82
5033	Katerinne	Muñoz	\N	katerinnemunozgonzalez@gmail.coml	+56963006942	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.821	2026-04-01 19:44:51.821
5034	Carlos		\N	carloseric.gomez23@gmail.com	+56997885637	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.823	2026-04-01 19:44:51.823
5036	Hernan		\N	hgianini@gmail.com	+56978083557	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.824	2026-04-01 19:44:51.824
5037	Claudio	Tapia	\N	claudiotapiarojas@gmail.com	+56950249719	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.825	2026-04-01 19:44:51.825
5038	Eduardo		\N	Ewillisms@forcenter.cl	+56949212080	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.826	2026-04-01 19:44:51.826
5039	Marcela	Navarreten mi amor mi mi mi mi mi mi	\N	mgnavarretec@gmail.com	+5694058668	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.827	2026-04-01 19:44:51.827
5040	Carla	Bustos	\N	carla345.bustos@gmail.con	+56977958756	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.828	2026-04-01 19:44:51.828
5041	Felipe		\N	fbeckerg@hotmail.com	+56982347189	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.828	2026-04-01 19:44:51.828
5042	Sara		\N	sara.duarte.lopez@gmail.com	+56963408325	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.829	2026-04-01 19:44:51.829
5043	Ka		\N	Kattiasoliz@gmail.com	+59167879179	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.83	2026-04-01 19:44:51.83
5044	Millaray		\N	millaray.fonseca@gmail.com	+56977911511	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.831	2026-04-01 19:44:51.831
5045	Gabriel		\N	gabrielhuenuvil@gmail.com	+56971032472	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.832	2026-04-01 19:44:51.832
5046	Marco	Antonio	\N	ossandonarrosmarco@gmail.com	+56973298017	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.833	2026-04-01 19:44:51.833
5047	Lindalucita		\N	yanet.lepe@gmail.com	+56990646293	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.833	2026-04-01 19:44:51.833
5048	Andre		\N	pilar.avb@gmail.com	+56994788588	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.834	2026-04-01 19:44:51.834
5049	Rodrigo		\N	rorro84@hotmail.com	+5699999999	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.835	2026-04-01 19:44:51.835
5050	Rossy		\N	rossyhrd85@gmail.com	+56953275030	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.836	2026-04-01 19:44:51.836
5051	CLAU		\N	claudia.bernal.martinez@gmail.com	+56956858719	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.837	2026-04-01 19:44:51.837
5052	Guadalupe	Pérez	\N	g.perez.y@gmail.com	+56946630798	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.838	2026-04-01 19:44:51.838
5053	Rodrigo	Cárdenas Chambilla	\N	rodrigocardenas.tm@gmail.com	+56989077536	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.839	2026-04-01 19:44:51.839
5054	Sergio	Iván	\N	sielguetas@gmail.com	+56965410232	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.84	2026-04-01 19:44:51.84
5055	Andres		\N	godoynavarro@gmail.com	+56993448100	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.84	2026-04-01 19:44:51.84
5056	Bastian	Muñoz	\N	bastyanseverino@gmail.com	+56994421013	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.841	2026-04-01 19:44:51.841
5057	elisabeth	palma	\N	epalmb@yahoo.com	56+978061788	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.842	2026-04-01 19:44:51.842
5058	Victor	Manuel	\N	volivar65@hotmail.com	+56992442388	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.843	2026-04-01 19:44:51.843
5059	Rafael		\N	rampimg2@gmail.com	+56993998749	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.844	2026-04-01 19:44:51.844
5060	Nelson		\N	nelsonmorales3@gmail.com	+56945125564	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.845	2026-04-01 19:44:51.845
5061	𝑷𝒂𝒐𝒍𝒂	𝑽𝒂𝒍𝒆𝒏𝒕𝒊𝒏𝒂	\N	pvalderramaro@gmal.com	+56983925302	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.846	2026-04-01 19:44:51.846
5062	Sussan		\N	reedsus@gmail.com	+56989034786	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.847	2026-04-01 19:44:51.847
5063	Raul	Rios	\N	raulriosvillablanca@gmail.com	+56994338185	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.847	2026-04-01 19:44:51.847
5064	Daniel		\N	danogodoy@gmail.com	+56941401418	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.848	2026-04-01 19:44:51.848
5065	Jose	Luis	\N	jlpgox@gmail.com	+56978272142	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.849	2026-04-01 19:44:51.849
5066	Marilú		\N	marfr1970@gmail.com	+56994545067	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.85	2026-04-01 19:44:51.85
5067	Patricia		\N	patriciaquiroz531@gmail.com	+56989097757	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.851	2026-04-01 19:44:51.851
5068	Danisa		\N	Danisaaguilar.77@gmail.com	+56995791574	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.852	2026-04-01 19:44:51.852
5069	Khristian		\N	ibarraconstructor@gmail.com	+56962473022	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.853	2026-04-01 19:44:51.853
5070	𝐵á𝑟𝑏𝑎𝑟𝑎	𝑀𝑎𝑟𝑡𝑖𝑛𝑒𝑧	\N	prof_martinez@hotmail.com	+56986090083	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.854	2026-04-01 19:44:51.854
5071	Valentina	Rios Sobarzo	\N	valentinarios61@gmail.com	+56996412863	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.855	2026-04-01 19:44:51.855
5072	Constanza		\N	Constanzamacchiavello1@gmail.com	+56975796902	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.855	2026-04-01 19:44:51.855
5073	Pablo		\N	pperezo@gmail.com	+56981893158	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.856	2026-04-01 19:44:51.856
5074	Manuel	Jesus Opazo	\N	Mopazo@ingemoc.cl	+56992006017	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.857	2026-04-01 19:44:51.857
5075	Francisca		\N	evelyn2192@gmail.com	+56997443065	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.858	2026-04-01 19:44:51.858
5076	Wladimir	Vergara H	\N	wladimir.vergara@yahoo.com	+569967163699	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.859	2026-04-01 19:44:51.859
5077	Raimundo		\N	raimundo.zamora.v@gmail.com	+56998229317	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.86	2026-04-01 19:44:51.86
5078	Thomas		\N	thomashaufe7@gmail.com	+56998953451	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.861	2026-04-01 19:44:51.861
5079	Veronica		\N	veronicacaceres1190@gmail.com	+56982266328	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.862	2026-04-01 19:44:51.862
5080	Daniel		\N	daniel_farias433@hotmail.com	+584147038438	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.863	2026-04-01 19:44:51.863
5081	Gisella		\N	gireveco@gmail.com	+56964246862	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.863	2026-04-01 19:44:51.863
5082	Maria	Alicia Carrasco	\N	aliciack.66@gmail.com	+56944560572	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.864	2026-04-01 19:44:51.864
5083	Tomas		\N	tcpena@uc.cl	+56978969085	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.865	2026-04-01 19:44:51.865
5084	Bryan		\N	bryan.reyes7502@gmail.com	989177502	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.866	2026-04-01 19:44:51.866
5085	Arturo		\N	arturosalinasjara@gmail.com	+56974513651	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.867	2026-04-01 19:44:51.867
5086	Nick		\N	nickramirezvargas1@gmail.com	967401150	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.868	2026-04-01 19:44:51.868
5087	Marcela		\N	miavello@gmail.com	+56966376063	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.869	2026-04-01 19:44:51.869
5088	Liliana		\N	lilianaandreahl68@gmail.com	+56982600394	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.87	2026-04-01 19:44:51.87
5089	Kevin	Alexander	\N	kevinmunoz3190@gmail.com	+56965848049	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.87	2026-04-01 19:44:51.87
5090	mooseih	knucklesh	\N	cristobal.reygadas2@gmail.com	+56944174972	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.871	2026-04-01 19:44:51.871
5091	Eduardo		\N	edu.orellana@gmail.com	+56957995012	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.872	2026-04-01 19:44:51.872
5092	Rene	Mella	\N	rene.mella16@gmail.com	+56991847521	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.873	2026-04-01 19:44:51.873
5093	Guillermo		\N	gmovillanuevap@gmail.com	+56955151404	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.874	2026-04-01 19:44:51.874
5094	Daniel		\N	darhch_hdez@hotmail.com	+56959762782	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.875	2026-04-01 19:44:51.875
5095	Gisela	Noemi	\N	gise.chilenita@gmail.com	+56972754788	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.876	2026-04-01 19:44:51.876
5096	Carlos		\N	calazcano2@gmail.com	+56982448130	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.877	2026-04-01 19:44:51.877
5097	Diego		\N	diegoportino@gmail.com	+5697583968	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.878	2026-04-01 19:44:51.878
5098	Jaime	cruz	\N	cruzgreen@hotmail.com	+56963711001	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.879	2026-04-01 19:44:51.879
5099	Gerson		\N	gdggerson@hotmail.com	+569993185312	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.88	2026-04-01 19:44:51.88
5100	roxana		\N	roxana_av_tj@hotmail.com	+569NNNNN84041736	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.881	2026-04-01 19:44:51.881
5101	Angelo		\N	angelo_coria@yahoo.com	+56957818232	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.881	2026-04-01 19:44:51.881
5102	Hector		\N	hencina1@hotmail.com	+56995729686	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.882	2026-04-01 19:44:51.882
5103	Camilo		\N	camilo.villagran02@gmail.com	+56983541279	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.883	2026-04-01 19:44:51.883
5104	Lorena		\N	escobedo.mlorena@gmail.com	+56986957575	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.884	2026-04-01 19:44:51.884
5105	Sofia		\N	sevtm.98@gmail.com	+56974730144	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.885	2026-04-01 19:44:51.885
5106	Ignacio		\N	ifaundezh@gmail.com	+56955255265	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.886	2026-04-01 19:44:51.886
5107	Rodrigo	Estay	\N	jrestay@gmail.com	+56956406501	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.887	2026-04-01 19:44:51.887
5108	Gilbert	Diaz	\N	givdiaz@gmail.com	+56974275267	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.888	2026-04-01 19:44:51.888
5109	Juan		\N	juancarlos.pumalin@gmail.com	+56973015770	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.888	2026-04-01 19:44:51.888
5110	david		\N	davidgonzaloantiman@gmail.com	+56948625421	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.889	2026-04-01 19:44:51.889
5111	Susana	Ivonnesolar Araya Solar	\N	susanaivonnesolararaya@gmail.com	+56977905627	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.89	2026-04-01 19:44:51.89
5112	Pamela	Yupanqui	\N	p_yupanqui@yahoo.com	+56976030766	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.891	2026-04-01 19:44:51.891
5113	Orlando		\N	orlandocstrobastias@gmail.com	+56958990217	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.892	2026-04-01 19:44:51.892
5114	𝐽𝑒𝑟𝑒𝑚𝑦		\N	jeremymery@gmail.com	+56957428375	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.893	2026-04-01 19:44:51.893
5115	Luis		\N	luisosvaldozepedacastro@gmail.com	+56992496890	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.894	2026-04-01 19:44:51.894
5116	Cristina	Natalia	\N	cristinabravolemus@gmail.com	+56973984337	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.895	2026-04-01 19:44:51.895
5117	Victor		\N	victorandresrp1@gmail.com	+56947712614	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.895	2026-04-01 19:44:51.895
5118	Ivan		\N	truckservice@live.cl	+56992454115	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.896	2026-04-01 19:44:51.896
5119	Roberto		\N	rbarrueto@gmail.com	+56962383268	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.897	2026-04-01 19:44:51.897
5120	Bernardita	Sánchez	\N	berny.karmen@gmail.com	+56968475688	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.898	2026-04-01 19:44:51.898
5121	Erminda		\N	erminda.ramirez.h@gmail.com	+56977619888	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.899	2026-04-01 19:44:51.899
5122	Guido		\N	Guidocarrillo@gmail.com	+56998207381	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.9	2026-04-01 19:44:51.9
5123	Alejandra	Vivi Sena	\N	asena@cmf.cl	+56992289845	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.901	2026-04-01 19:44:51.901
5124	Coto		\N	oscaryunge@gmail.com	+56977907313	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.902	2026-04-01 19:44:51.902
5125	Suculentas	y	\N	rositatroncoso2016@gmail.com	+56997321134	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.903	2026-04-01 19:44:51.903
5126	Felipe	Gálvez	\N	felipe.galvezz96@gmail.com	+56961911666	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.904	2026-04-01 19:44:51.904
5127	Jose	Manuel Lobo	\N	mlobo@jardinmodular.cl	+56994439469	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.904	2026-04-01 19:44:51.904
5128	Sefe		\N	sebastian.mondaca.olivares@gmail.com	+56963518248	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.905	2026-04-01 19:44:51.905
5129	Luis	Vásquez	\N	luis@centralparabrisas.net	+56996342862	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.906	2026-04-01 19:44:51.906
5130	Horacio		\N	mitamella@hotmail.com	+56979348851	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.907	2026-04-01 19:44:51.907
5131	Robinson	Alejandro Videla	\N	robin_videla@hotmail.com	+56995435103	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.908	2026-04-01 19:44:51.908
5132	Luis	reyes	\N	Luisreyes.lex.1985@gmail.com	+56958051125	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.909	2026-04-01 19:44:51.909
5133	Miguel		\N	miguelestudio31@gmail.com	+56984740165	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.91	2026-04-01 19:44:51.91
5134	Pablo	Martinez	\N	pabloandresmartinezssg36@gmail.com	+56967363964	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.911	2026-04-01 19:44:51.911
5135	Vivianne	Torres	\N	viviannetorresrodriguez@gmail.com	56953347432	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.912	2026-04-01 19:44:51.912
5136	Graciela		\N	gracielamelgarejo1943@gmail.com	+56979537972	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.913	2026-04-01 19:44:51.913
5137	Rodrigo	Escudero	\N	rescuderovargas@gmail.com	+56990792753	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.914	2026-04-01 19:44:51.914
5138	Jorge		\N	jorgecifuentesvidal1955@gmail.com	+56991742424	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.914	2026-04-01 19:44:51.914
5139	Eduardo		\N	andressaavedraoliva@gmail.com	+56994393977	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.915	2026-04-01 19:44:51.915
5140	Maria		\N	mariacartes78@gmail.com	+56946382459	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.916	2026-04-01 19:44:51.916
5141	Maritza		\N	maritzacarrascoulloa@gmail.com	+56995435430	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.917	2026-04-01 19:44:51.917
5142	Jorge	Enrique	\N	jorgeramirezloyola90@gmail.com	+56995584596	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.918	2026-04-01 19:44:51.918
5143	Eder		\N	Insumostodosalud1@gmail.com	+56945532727	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.919	2026-04-01 19:44:51.919
5144	Fabricio		\N	fabriciovaccaro4@gmail.com	+56966686515	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.919	2026-04-01 19:44:51.919
5145	Hernan	Pablo	\N	h.pabloul@gmqil.com	+56953090479	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.92	2026-04-01 19:44:51.92
5146	Patricia		\N	patriciajzurita@gmail.com	+56984359397	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.921	2026-04-01 19:44:51.921
5147	Sebastián		\N	seba1727@hotmail.es	988887777	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.922	2026-04-01 19:44:51.922
5148	José		\N	jpinto18_5@hotmail.com	+56974770824	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.923	2026-04-01 19:44:51.923
5149	Carlos		\N	carlos.matias.oliver@hotmail.com	+56974873037	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.924	2026-04-01 19:44:51.924
5150	Pablo	Carrasco	\N	cpablo.ignaciog@gmail.com	+56953310499	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.925	2026-04-01 19:44:51.925
5151	Francisca	Vega	\N	fvegaj@gmail.com	981566944	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.926	2026-04-01 19:44:51.926
5152	Franco		\N	francomaturanabignotti@gmail.com	+56961247277	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.926	2026-04-01 19:44:51.926
5153	ANNY		\N	annais_belen@hotmail.com	+56956525287	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.927	2026-04-01 19:44:51.927
5154	Maria	Teresa	\N	Pastoramariateresa1942@gmail.comoilu	+56940810049	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.928	2026-04-01 19:44:51.928
5155	Ricardo		\N	ricardocoloma1958@gmail.com	+56973521070	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.929	2026-04-01 19:44:51.929
5156	Pedro		\N	pedro.ormazabal@gmail.com	+56942465111	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.93	2026-04-01 19:44:51.93
5157	jhorby		\N	jhorby@gmail.com	+56950580837	\N	NATURAL	INSTAGRAM	\N	2026-04-01 19:44:51.931	2026-04-01 19:44:51.931
5158	Maria	Antonieta	\N	mariaantomatamala@gmail.com	+56984834407	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.932	2026-04-01 19:44:51.932
5159	Norma		\N	normaadriana.0503@gmail.com	+56963024488	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.933	2026-04-01 19:44:51.933
5160	Arturo	Fernando	\N	Vargasarturo1274@gmail.com	+56975458147	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.933	2026-04-01 19:44:51.933
5161	lo	de de r	\N	ca.olivares.2022@gmail.com	+56949777776	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.934	2026-04-01 19:44:51.934
5162	Disa		\N	Disa.oxa.gallegos@gmail.com	+56993169478	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.935	2026-04-01 19:44:51.935
5163	Raul		\N	florleyraedo.56@gmail.com	+56982995276	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.936	2026-04-01 19:44:51.936
5164	Ignacio	Jose	\N	ignacio.gutierrez.minguet@gmail.com	+56998715661	\N	NATURAL	OTRO	\N	2026-04-01 19:44:51.937	2026-04-01 19:44:51.937
5168	Carolina	Toro	\N	carolinatoro14@gmail.com	\N	\N	NATURAL	OTRO	\N	2026-04-13 17:32:17.84	2026-04-13 17:32:17.84
5169	Nathalia	De La Barra	\N	nathalia.delabarra.m@gmail.com	\N	\N	NATURAL	OTRO	\N	2026-04-13 17:32:19.691	2026-04-13 17:32:19.691
5170	Daniel	Altamirano	\N	danielarmitano@gmail.com	\N	\N	NATURAL	OTRO	\N	2026-04-13 17:32:20.859	2026-04-13 17:32:20.859
\.


--
-- Data for Name: cotizacion_items; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cotizacion_items (id, "cotizacionId", "unidadId", "precioListaUF", "descuentoUF") FROM stdin;
\.


--
-- Data for Name: cotizacion_promociones; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cotizacion_promociones (id, "cotizacionId", "promocionId", aplicada, "ahorroUF") FROM stdin;
\.


--
-- Data for Name: cotizaciones; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cotizaciones (id, "leadId", "creadoPorId", estado, "validezDias", notas, "descuentoAprobadoUF", "creadoEn", "actualizadoEn") FROM stdin;
\.


--
-- Data for Name: cuotas; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cuotas (id, "planPagoId", "numeroCuota", tipo, "montoUF", "montoCLP", "fechaVencimiento", "fechaPagoReal", estado, "metodoPago", "numeroComprobante", "archivoUrl", notas, "creadoEn", "actualizadoEn") FROM stdin;
\.


--
-- Data for Name: documentos_legales; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.documentos_legales (id, "procesoLegalId", "subioPorId", nombre, url, etapa, "creadoEn") FROM stdin;
\.


--
-- Data for Name: edificios; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.edificios (id, nombre, direccion, region, comuna, inmobiliaria, "contactoInmobiliaria", descripcion, activo, "creadoEn", "actualizadoEn") FROM stdin;
4	Obispo Salas	Obispo Hipólito Salas 445	Biobío	Concepción	\N	\N	\N	t	2026-04-01 19:41:29.074	2026-04-01 19:41:29.074
5	Trinitarias	Las Trinitarias 7047	Metropolitana	Las Condes	\N	\N	\N	t	2026-04-01 19:41:29.082	2026-04-01 19:41:29.082
6	Plus	Conde Del Maule 4325	Metropolitana	Estación Central	\N	\N	\N	t	2026-04-01 19:41:29.083	2026-04-01 19:41:29.083
7	Neocisterna	Lo Ovalle 150	Metropolitana	La Cisterna	\N	\N	\N	t	2026-04-01 19:41:29.084	2026-04-01 19:41:29.084
8	Brasil	Brasil 601	Metropolitana	Santiago	\N	\N	\N	t	2026-04-01 19:41:29.085	2026-04-01 19:41:29.085
9	Aldunate	Pedro León Gallo 1050	Araucanía	Temuco	\N	\N	\N	t	2026-04-01 19:41:29.086	2026-04-01 19:41:29.086
\.


--
-- Data for Name: interacciones; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.interacciones (id, "leadId", "usuarioId", tipo, descripcion, fecha) FROM stdin;
\.


--
-- Data for Name: leads; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.leads (id, "contactoId", "unidadInteresId", "vendedorId", "brokerId", etapa, "presupuestoAprox", "motivoPerdida", notas, "creadoEn", "actualizadoEn", campana) FROM stdin;
2590	2590	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-07-19 00:36:55	2026-04-01 19:44:49.809	Carrusel_Sin bancos
2591	2591	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-07-19 01:26:39	2026-04-01 19:44:49.813	Llevas 2 años Inv
2592	2592	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-07-19 01:34:01	2026-04-01 19:44:49.815	Carrusel_Sin bancos
2593	2593	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-07-19 02:11:38	2026-04-01 19:44:49.818	Carrusel_Sin bancos
2596	2596	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-07-20 02:00:19	2026-04-01 19:44:49.821	Llevas 2 años Inv
2597	2597	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-07-20 08:50:41	2026-04-01 19:44:49.822	Carrusel_Sin bancos
2598	2598	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-07-20 11:30:26	2026-04-01 19:44:49.823	Llevas 2 años Inv
2599	2599	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-07-20 12:00:31	2026-04-01 19:44:49.824	Como tu dinero pierde
2601	2601	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-07-20 20:03:57	2026-04-01 19:44:49.825	Llevas 2 años Inv
2602	2602	\N	\N	\N	PERDIDO	\N	\N	Plataforma: an	2025-07-20 22:25:17	2026-04-01 19:44:49.826	Llevas 2 años Inv
2603	2603	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-07-21 02:35:00	2026-04-01 19:44:49.827	Como tu dinero pierde
2604	2604	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-07-21 15:47:36	2026-04-01 19:44:49.828	Carrusel_Sin bancos
2605	2605	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-07-21 23:27:52	2026-04-01 19:44:49.829	Carrusel_Sin bancos
2606	2606	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-07-22 03:21:08	2026-04-01 19:44:49.83	Carrusel_Sin bancos
2607	2607	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-07-22 03:40:36	2026-04-01 19:44:49.831	Como tu dinero pierde
2609	2609	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-07-22 12:55:24	2026-04-01 19:44:49.833	Carrusel_Sin bancos
2611	2611	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-07-22 16:00:04	2026-04-01 19:44:49.835	Carrusel_Sin bancos
2612	2612	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-07-22 23:01:04	2026-04-01 19:44:49.836	Carrusel_Sin bancos
2613	2613	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-07-23 00:05:31	2026-04-01 19:44:49.837	Carrusel_Sin bancos
2614	2614	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-07-23 00:29:25	2026-04-01 19:44:49.838	Como tu dinero pierde
2615	2615	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-07-23 02:15:22	2026-04-01 19:44:49.84	Como tu dinero pierde
2616	2616	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-07-23 03:06:18	2026-04-01 19:44:49.841	Carrusel_Sin bancos
2617	2617	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-07-23 03:56:32	2026-04-01 19:44:49.842	Llevas 2 años Inv
2619	2619	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-07-23 18:57:14	2026-04-01 19:44:49.844	Como tu dinero pierde
2620	2620	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-07-23 22:40:04	2026-04-01 19:44:49.845	Llevas 2 años Inv
2621	2621	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-07-23 23:15:09	2026-04-01 19:44:49.847	Llevas 2 años Inv
2622	2622	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-07-24 01:01:23	2026-04-01 19:44:49.848	Carrusel_Sin bancos
2623	2623	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-07-24 02:21:18	2026-04-01 19:44:49.849	Carrusel_Sin bancos
2624	2624	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-07-24 04:24:06	2026-04-01 19:44:49.85	Como tu dinero pierde
2625	2625	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-07-24 05:09:58	2026-04-01 19:44:49.851	Como tu dinero pierde
2626	2626	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-07-24 05:10:35	2026-04-01 19:44:49.852	Carrusel_Sin bancos
2627	2627	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-07-24 05:56:28	2026-04-01 19:44:49.854	Como tu dinero pierde
2628	2628	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-07-24 16:56:55	2026-04-01 19:44:49.855	Carrusel_Sin bancos
2630	2630	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-07-24 22:09:40	2026-04-01 19:44:49.857	Carrusel_Sin bancos
2631	2631	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-07-25 23:29:59	2026-04-01 19:44:49.858	Carrusel_Sin bancos
2632	2632	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-07-26 02:40:58	2026-04-01 19:44:49.859	Carrusel_Sin bancos
2634	2634	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-07-27 02:04:18	2026-04-01 19:44:49.862	Carrusel_Sin bancos
2635	2635	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-07-27 02:14:38	2026-04-01 19:44:49.863	Carrusel_Sin bancos
2637	2637	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-07-27 02:49:12	2026-04-01 19:44:49.865	Carrusel_Sin bancos
2638	2638	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-07-27 05:02:01	2026-04-01 19:44:49.866	Carrusel_Sin bancos
2639	2639	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-07-27 13:07:28	2026-04-01 19:44:49.867	Carrusel_Sin bancos
2640	2640	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-07-27 17:22:34	2026-04-01 19:44:49.868	Carrusel_Sin bancos
2641	2641	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-07-27 17:29:14	2026-04-01 19:44:49.869	Carrusel_Sin bancos
2643	2643	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-07-27 18:56:46	2026-04-01 19:44:49.871	Carrusel_Sin bancos
2644	2644	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-07-27 22:18:52	2026-04-01 19:44:49.873	Como tu dinero pierde
2645	2645	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-07-27 22:40:39	2026-04-01 19:44:49.874	Carrusel_Sin bancos
2646	2646	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-07-27 22:43:39	2026-04-01 19:44:49.876	Carrusel_Sin bancos
2649	2649	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-07-28 02:00:19	2026-04-01 19:44:49.879	Carrusel_Sin bancos
2652	2652	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-07-28 02:15:02	2026-04-01 19:44:49.881	Carrusel_Sin bancos
2656	2656	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-07-28 04:57:18	2026-04-01 19:44:49.885	Carrusel_Sin bancos
2657	2657	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-07-28 05:10:48	2026-04-01 19:44:49.885	Carrusel_Sin bancos
2658	2658	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-07-28 10:31:20	2026-04-01 19:44:49.886	Carrusel_Sin bancos
2659	2659	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-07-28 11:48:26	2026-04-01 19:44:49.888	Carrusel_Sin bancos
2660	2660	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-07-28 12:20:15	2026-04-01 19:44:49.888	Carrusel_Sin bancos
2661	2661	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-07-28 13:15:39	2026-04-01 19:44:49.889	Carrusel_Sin bancos
2662	2662	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-07-28 18:39:10	2026-04-01 19:44:49.89	Como tu dinero pierde
2663	2663	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-07-28 18:45:35	2026-04-01 19:44:49.892	Carrusel_Sin bancos
2664	2664	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-07-28 19:34:10	2026-04-01 19:44:49.893	Carrusel_Sin bancos
4242	4242	\N	\N	\N	PERDIDO	\N	\N	\N	2026-01-31 02:09:37	2026-04-01 19:44:51.143	\N
2654	2654	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-30 12:19:11	2026-04-13 16:01:16.834	Carrusel_Sin bancos
2629	2629	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-30 18:25:29	2026-04-13 16:01:16.853	Carrusel_Sin bancos
2648	2648	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-31 21:20:23	2026-04-13 16:01:16.902	Carrusel_Sin bancos
2618	2618	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-09-02 02:30:39	2026-04-13 16:01:16.979	Carrusel_Sin bancos
2647	2647	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-09-05 01:19:03	2026-04-13 16:01:17.077	Carrusel_Sin bancos
2595	2595	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-09-07 23:36:57	2026-04-13 16:01:17.181	Carrusel_Sin bancos
2650	2650	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-09-10 19:27:00	2026-04-13 16:01:17.249	Carrusel_Sin bancos
2600	2600	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-09-10 20:13:36	2026-04-13 16:01:17.251	Carrusel_Sin bancos
2651	2651	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-09-11 10:32:45	2026-04-13 16:01:17.276	Carrusel_Sin bancos
2653	2653	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-09-17 14:00:04	2026-04-13 16:01:17.462	Carrusel_Sin bancos
2633	2633	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-09-26 01:44:22	2026-04-13 16:01:17.711	Carrusel_Sin bancos
2610	2610	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-09-30 15:32:35	2026-04-13 16:01:17.848	Carrusel_Sin bancos
2608	2608	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-10-31 04:56:10	2026-04-13 16:01:18.643	Carrusel_Sin bancos
2636	2636	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-11-04 03:20:45	2026-04-13 16:01:18.752	Carrusel_Sin bancos
2642	2642	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-01 04:06:19	2026-04-13 16:01:19.095	Carrusel_Sin bancos
2666	2666	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-07-28 20:38:55	2026-04-01 19:44:49.896	Carrusel_Sin bancos
2668	2668	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-07-28 23:22:39	2026-04-01 19:44:49.898	Carrusel_Sin bancos
2669	2669	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-07-29 00:06:37	2026-04-01 19:44:49.899	Carrusel_Sin bancos
2670	2670	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-07-29 00:41:44	2026-04-01 19:44:49.9	Carrusel_Sin bancos
2671	2671	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-07-29 01:05:29	2026-04-01 19:44:49.901	Carrusel_Sin bancos
2672	2672	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-07-29 02:52:06	2026-04-01 19:44:49.902	Carrusel_Sin bancos
2673	2673	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-07-29 03:37:41	2026-04-01 19:44:49.903	Carrusel_Sin bancos
2674	2674	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-07-29 04:14:39	2026-04-01 19:44:49.905	Carrusel_Sin bancos
2675	2675	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-07-29 07:22:07	2026-04-01 19:44:49.906	Carrusel_Sin bancos
2676	2676	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-07-29 07:57:09	2026-04-01 19:44:49.906	Llevas 2 años Inv
2677	2677	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-07-29 09:39:38	2026-04-01 19:44:49.907	Carrusel_Sin bancos
2678	2678	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-07-29 10:38:48	2026-04-01 19:44:49.908	Carrusel_Sin bancos
2679	2679	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-07-29 10:45:57	2026-04-01 19:44:49.909	Carrusel_Sin bancos
2680	2680	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-07-29 10:52:40	2026-04-01 19:44:49.91	Carrusel_Sin bancos
2681	2681	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-07-29 11:02:10	2026-04-01 19:44:49.911	Carrusel_Sin bancos
2682	2682	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-07-29 11:42:53	2026-04-01 19:44:49.912	Carrusel_Sin bancos
2683	2683	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-07-29 13:45:45	2026-04-01 19:44:49.913	Carrusel_Sin bancos
2684	2684	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-07-29 15:57:11	2026-04-01 19:44:49.914	Carrusel_Sin bancos
2685	2685	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-07-29 18:06:42	2026-04-01 19:44:49.915	Carrusel_Sin bancos
2686	2686	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-07-29 19:27:06	2026-04-01 19:44:49.916	Carrusel_Sin bancos
2687	2687	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-07-29 20:37:46	2026-04-01 19:44:49.917	Carrusel_Sin bancos
2690	2690	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-07-30 00:01:29	2026-04-01 19:44:49.919	Carrusel_Sin bancos
2692	2692	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-07-30 02:19:51	2026-04-01 19:44:49.921	Carrusel_Sin bancos
2693	2693	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-07-30 02:26:51	2026-04-01 19:44:49.922	Carrusel_Sin bancos
2694	2694	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-07-30 06:38:31	2026-04-01 19:44:49.923	Carrusel_Sin bancos
2695	2695	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-07-30 09:34:33	2026-04-01 19:44:49.924	Carrusel_Sin bancos
2696	2696	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-07-30 10:13:14	2026-04-01 19:44:49.925	Carrusel_Sin bancos
2697	2697	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-07-30 12:30:58	2026-04-01 19:44:49.925	Carrusel_Sin bancos
2698	2698	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-07-30 15:43:47	2026-04-01 19:44:49.926	Carrusel_Sin bancos
2699	2699	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-07-30 19:05:18	2026-04-01 19:44:49.927	Carrusel_Sin bancos
2700	2700	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-07-30 21:11:54	2026-04-01 19:44:49.928	Carrusel_Sin bancos
2701	2701	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-07-31 00:48:24	2026-04-01 19:44:49.928	Carrusel_Sin bancos
2702	2702	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-07-31 01:18:42	2026-04-01 19:44:49.929	Carrusel_Sin bancos
2703	2703	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-07-31 01:58:33	2026-04-01 19:44:49.93	Carrusel_Sin bancos
2704	2704	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-07-31 02:05:28	2026-04-01 19:44:49.931	Carrusel_Sin bancos
2705	2705	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-07-31 02:07:05	2026-04-01 19:44:49.932	Carrusel_Sin bancos
2706	2706	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-07-31 02:19:28	2026-04-01 19:44:49.932	Carrusel_Sin bancos
2707	2707	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-07-31 02:25:23	2026-04-01 19:44:49.933	Carrusel_Sin bancos
2708	2708	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-07-31 02:30:40	2026-04-01 19:44:49.934	Carrusel_Sin bancos
2709	2709	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-07-31 02:41:35	2026-04-01 19:44:49.935	Carrusel_Sin bancos
2710	2710	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-07-31 02:57:53	2026-04-01 19:44:49.936	Carrusel_Sin bancos
2711	2711	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-07-31 03:13:25	2026-04-01 19:44:49.936	Carrusel_Sin bancos
2712	2712	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-07-31 03:30:39	2026-04-01 19:44:49.937	Carrusel_Sin bancos
2713	2713	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-07-31 03:45:09	2026-04-01 19:44:49.938	Carrusel_Sin bancos
2714	2714	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-07-31 03:57:57	2026-04-01 19:44:49.939	Carrusel_Sin bancos
2715	2715	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-07-31 17:42:04	2026-04-01 19:44:49.94	Carrusel_Sin bancos
2717	2717	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-07-31 20:25:03	2026-04-01 19:44:49.941	Carrusel_Sin bancos
2718	2718	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-01 01:35:25	2026-04-01 19:44:49.942	Carrusel_Sin bancos
2720	2720	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-01 02:38:53	2026-04-01 19:44:49.944	Carrusel_Sin bancos
2721	2721	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-01 02:46:39	2026-04-01 19:44:49.945	Carrusel_Sin bancos
2722	2722	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-01 02:58:38	2026-04-01 19:44:49.946	Carrusel_Sin bancos
2723	2723	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-01 03:13:36	2026-04-01 19:44:49.947	Carrusel_Sin bancos
2724	2724	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-01 03:22:11	2026-04-01 19:44:49.948	Carrusel_Sin bancos
2725	2725	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-01 03:37:24	2026-04-01 19:44:49.949	Carrusel_Sin bancos
2726	2726	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-01 03:48:27	2026-04-01 19:44:49.95	Carrusel_Sin bancos
2727	2727	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-01 03:50:21	2026-04-01 19:44:49.951	Carrusel_Sin bancos
2728	2728	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-01 04:52:35	2026-04-01 19:44:49.952	Carrusel_Sin bancos
2729	2729	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-01 11:26:19	2026-04-01 19:44:49.953	Carrusel_Sin bancos
2730	2730	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-01 11:32:03	2026-04-01 19:44:49.954	Carrusel_Sin bancos
2731	2731	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-08-01 12:13:20	2026-04-01 19:44:49.955	Carrusel_Sin bancos
2732	2732	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-01 12:49:13	2026-04-01 19:44:49.956	Carrusel_Sin bancos
2733	2733	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-01 14:03:10	2026-04-01 19:44:49.957	Carrusel_Sin bancos
2734	2734	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-01 15:14:54	2026-04-01 19:44:49.958	Carrusel_Sin bancos
2735	2735	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-01 16:40:51	2026-04-01 19:44:49.959	Carrusel_Sin bancos
2737	2737	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-08-01 18:30:53	2026-04-01 19:44:49.961	Carrusel_Sin bancos
2739	2739	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-08-01 20:09:22	2026-04-01 19:44:49.963	Carrusel_Sin bancos
2738	2738	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-30 08:48:58	2026-04-13 16:01:16.819	Carrusel_Sin bancos
2667	2667	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-30 11:41:38	2026-04-13 16:01:16.832	Carrusel_Sin bancos
2689	2689	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-31 12:15:01	2026-04-13 16:01:16.891	Carrusel_Sin bancos
2688	2688	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-09-05 11:11:42	2026-04-13 16:01:17.092	Carrusel_Sin bancos
2716	2716	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-09-07 05:08:03	2026-04-13 16:01:17.142	Carrusel_Sin bancos
2691	2691	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-09-08 11:16:19	2026-04-13 16:01:17.198	Carrusel_Sin bancos
2719	2719	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-11-08 19:01:38	2026-04-13 16:01:18.789	Carrusel_Sin bancos
2736	2736	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-04-02 16:51:19	2026-04-13 16:01:19.39	Carrusel_Sin bancos
2740	2740	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-01 20:57:34	2026-04-01 19:44:49.964	Carrusel_Sin bancos
2741	2741	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-01 23:24:37	2026-04-01 19:44:49.965	Carrusel_Sin bancos
2742	2742	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-02 02:14:19	2026-04-01 19:44:49.966	Carrusel_Sin bancos
2743	2743	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-02 02:24:32	2026-04-01 19:44:49.967	Carrusel_Sin bancos
2744	2744	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-02 02:53:05	2026-04-01 19:44:49.968	Carrusel_Sin bancos
2745	2745	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-02 04:05:05	2026-04-01 19:44:49.969	Carrusel_Sin bancos
2746	2746	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-02 05:21:17	2026-04-01 19:44:49.97	Carrusel_Sin bancos
2747	2747	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-02 05:58:29	2026-04-01 19:44:49.971	Carrusel_Sin bancos
2748	2748	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-08-02 05:59:00	2026-04-01 19:44:49.972	Carrusel_Sin bancos
2749	2749	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-08-02 06:41:13	2026-04-01 19:44:49.973	Carrusel_Sin bancos
2750	2750	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-02 12:42:53	2026-04-01 19:44:49.974	Carrusel_Sin bancos
2751	2751	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-02 13:17:37	2026-04-01 19:44:49.975	Carrusel_Sin bancos
2752	2752	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-02 14:32:07	2026-04-01 19:44:49.976	Carrusel_Sin bancos
2753	2753	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-08-02 16:01:42	2026-04-01 19:44:49.977	Carrusel_Sin bancos
2754	2754	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-02 17:30:47	2026-04-01 19:44:49.978	Carrusel_Sin bancos
2755	2755	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-02 19:04:21	2026-04-01 19:44:49.979	Carrusel_Sin bancos
2756	2756	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-02 20:11:15	2026-04-01 19:44:49.98	Carrusel_Sin bancos
2757	2757	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-02 20:22:16	2026-04-01 19:44:49.981	Carrusel_Sin bancos
2758	2758	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-02 20:26:57	2026-04-01 19:44:49.982	Carrusel_Sin bancos
2759	2759	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-02 22:36:32	2026-04-01 19:44:49.983	Carrusel_Sin bancos
2760	2760	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-03 00:11:58	2026-04-01 19:44:49.984	Carrusel_Sin bancos
2761	2761	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-03 00:22:27	2026-04-01 19:44:49.985	Carrusel_Sin bancos
2762	2762	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-03 00:42:05	2026-04-01 19:44:49.986	Carrusel_Sin bancos
2763	2763	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-03 01:00:13	2026-04-01 19:44:49.987	Carrusel_Sin bancos
2764	2764	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-03 01:28:05	2026-04-01 19:44:49.988	Carrusel_Sin bancos
2765	2765	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-03 01:37:11	2026-04-01 19:44:49.989	Carrusel_Sin bancos
2766	2766	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-08-03 02:35:03	2026-04-01 19:44:49.99	Carrusel_Sin bancos
2770	2770	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-03 13:08:48	2026-04-01 19:44:49.994	Carrusel_Sin bancos
2772	2772	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-03 15:44:37	2026-04-01 19:44:49.996	Carrusel_Sin bancos
2773	2773	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-03 16:25:48	2026-04-01 19:44:49.997	Carrusel_Sin bancos
2774	2774	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-03 16:57:08	2026-04-01 19:44:49.998	Carrusel_Sin bancos
2775	2775	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-03 19:44:18	2026-04-01 19:44:49.999	Carrusel_Sin bancos
2776	2776	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-03 20:21:15	2026-04-01 19:44:50	Carrusel_Sin bancos
2777	2777	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-03 21:29:17	2026-04-01 19:44:50.001	Carrusel_Sin bancos
2778	2778	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-03 21:51:45	2026-04-01 19:44:50.002	Carrusel_Sin bancos
2780	2780	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-03 23:03:27	2026-04-01 19:44:50.004	Carrusel_Sin bancos
2782	2782	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-03 23:18:12	2026-04-01 19:44:50.006	Carrusel_Sin bancos
2783	2783	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-03 23:41:17	2026-04-01 19:44:50.006	Carrusel_Sin bancos
2784	2784	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-04 00:00:51	2026-04-01 19:44:50.007	Carrusel_Sin bancos
2785	2785	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-04 00:11:44	2026-04-01 19:44:50.008	Carrusel_Sin bancos
2786	2786	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-04 00:33:19	2026-04-01 19:44:50.009	Carrusel_Sin bancos
2787	2787	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-04 01:12:32	2026-04-01 19:44:50.01	Carrusel_Sin bancos
2788	2788	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-04 01:29:02	2026-04-01 19:44:50.011	Carrusel_Sin bancos
2789	2789	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-04 02:17:59	2026-04-01 19:44:50.011	Carrusel_Sin bancos
2790	2790	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-04 02:20:20	2026-04-01 19:44:50.012	Carrusel_Sin bancos
2792	2792	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-04 04:05:52	2026-04-01 19:44:50.014	Carrusel_Sin bancos
2793	2793	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-04 05:36:17	2026-04-01 19:44:50.015	Carrusel_Sin bancos
2794	2794	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-04 06:14:03	2026-04-01 19:44:50.016	Carrusel_Sin bancos
2795	2795	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-04 08:45:19	2026-04-01 19:44:50.017	Carrusel_Sin bancos
2797	2797	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-04 11:09:00	2026-04-01 19:44:50.019	Carrusel_Sin bancos
2798	2798	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-08-04 11:18:32	2026-04-01 19:44:50.02	Como tu dinero pierde
2799	2799	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-04 12:22:34	2026-04-01 19:44:50.021	Carrusel_Sin bancos
2800	2800	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-04 12:29:41	2026-04-01 19:44:50.021	Carrusel_Sin bancos
2801	2801	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-04 17:41:31	2026-04-01 19:44:50.022	Carrusel_Sin bancos
2802	2802	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-04 21:08:38	2026-04-01 19:44:50.023	Carrusel_Sin bancos
2803	2803	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-08-05 00:05:48	2026-04-01 19:44:50.024	Carrusel_Sin bancos
2804	2804	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-05 01:03:22	2026-04-01 19:44:50.025	Carrusel_Sin bancos
2805	2805	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-05 02:31:54	2026-04-01 19:44:50.025	Carrusel_Sin bancos
2806	2806	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-05 02:41:55	2026-04-01 19:44:50.026	Carrusel_Sin bancos
2807	2807	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-05 03:07:59	2026-04-01 19:44:50.027	Carrusel_Sin bancos
2808	2808	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-05 03:08:41	2026-04-01 19:44:50.028	Carrusel_Sin bancos
2810	2810	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-08-05 03:53:12	2026-04-01 19:44:50.03	Carrusel_Sin bancos
2811	2811	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-05 07:33:04	2026-04-01 19:44:50.031	Carrusel_Sin bancos
2812	2812	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-05 08:19:36	2026-04-01 19:44:50.031	Carrusel_Sin bancos
2813	2813	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-05 10:16:51	2026-04-01 19:44:50.032	Carrusel_Sin bancos
2781	2781	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-09-04 13:31:57	2026-04-13 16:01:17.044	Carrusel_Sin bancos
2796	2796	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-09-05 07:07:12	2026-04-13 16:01:17.088	Carrusel_Sin bancos
2779	2779	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-09-19 16:03:55	2026-04-13 16:01:17.528	Carrusel_Sin bancos
2768	2768	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-09-20 21:52:23	2026-04-13 16:01:17.557	Carrusel_Sin bancos
2809	2809	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-09-22 11:56:45	2026-04-13 16:01:17.617	Carrusel_Sin bancos
2771	2771	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-09-26 13:03:38	2026-04-13 16:01:17.722	Carrusel_Sin bancos
2769	2769	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-11-09 05:17:15	2026-04-13 16:01:18.799	Carrusel_Sin bancos
2767	2767	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-11-09 16:01:27	2026-04-13 16:01:18.809	Carrusel_Sin bancos
2814	2814	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-04-07 12:06:03	2026-04-13 16:01:19.545	Carrusel_Sin bancos
2815	2815	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-05 11:48:46	2026-04-01 19:44:50.034	Carrusel_Sin bancos
2816	2816	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-05 13:06:09	2026-04-01 19:44:50.034	Carrusel_Sin bancos
2817	2817	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-05 13:20:54	2026-04-01 19:44:50.035	Carrusel_Sin bancos
2818	2818	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-05 13:28:58	2026-04-01 19:44:50.036	Carrusel_Sin bancos
2819	2819	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-05 14:32:45	2026-04-01 19:44:50.037	Carrusel_Sin bancos
2820	2820	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-05 17:42:56	2026-04-01 19:44:50.038	Carrusel_Sin bancos
2821	2821	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-05 18:12:28	2026-04-01 19:44:50.039	Carrusel_Sin bancos
2822	2822	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-05 19:18:31	2026-04-01 19:44:50.04	Carrusel_Sin bancos
2823	2823	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-05 19:30:36	2026-04-01 19:44:50.04	Carrusel_Sin bancos
2824	2824	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-05 20:37:16	2026-04-01 19:44:50.041	Carrusel_Sin bancos
2825	2825	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-05 21:06:17	2026-04-01 19:44:50.042	Carrusel_Sin bancos
2826	2826	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-05 21:18:44	2026-04-01 19:44:50.043	Carrusel_Sin bancos
2827	2827	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-05 22:14:46	2026-04-01 19:44:50.044	Carrusel_Sin bancos
2829	2829	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-06 00:01:09	2026-04-01 19:44:50.045	Carrusel_Sin bancos
2830	2830	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-08-06 07:30:11	2026-04-01 19:44:50.046	Carrusel_Sin bancos
2831	2831	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-06 09:58:51	2026-04-01 19:44:50.047	Carrusel_Sin bancos
2832	2832	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-06 12:53:34	2026-04-01 19:44:50.047	Carrusel_Sin bancos
2833	2833	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-06 13:30:58	2026-04-01 19:44:50.048	Carrusel_Sin bancos
2834	2834	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-06 15:03:59	2026-04-01 19:44:50.049	Carrusel_Sin bancos
2835	2835	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-06 18:14:53	2026-04-01 19:44:50.05	Carrusel_Sin bancos
2836	2836	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-06 22:04:37	2026-04-01 19:44:50.05	Carrusel_Sin bancos
2837	2837	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-06 22:46:02	2026-04-01 19:44:50.051	Carrusel_Sin bancos
2838	2838	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-08-06 23:10:03	2026-04-01 19:44:50.051	Carrusel_Sin bancos
2839	2839	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-07 03:09:47	2026-04-01 19:44:50.052	Carrusel_Sin bancos
2840	2840	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-07 03:22:10	2026-04-01 19:44:50.053	Carrusel_Sin bancos
2841	2841	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-07 11:02:02	2026-04-01 19:44:50.053	Carrusel_Sin bancos
2842	2842	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-07 18:14:06	2026-04-01 19:44:50.054	Carrusel_Sin bancos
2843	2843	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-07 19:26:18	2026-04-01 19:44:50.055	Carrusel_Sin bancos
2844	2844	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-07 20:21:48	2026-04-01 19:44:50.055	Carrusel_Sin bancos
2845	2845	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-07 21:57:19	2026-04-01 19:44:50.056	Carrusel_Sin bancos
2846	2846	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-07 22:59:37	2026-04-01 19:44:50.057	Carrusel_Sin bancos
2847	2847	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-07 23:23:13	2026-04-01 19:44:50.057	Carrusel_Sin bancos
2848	2848	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-07 23:43:31	2026-04-01 19:44:50.058	Carrusel_Sin bancos
2849	2849	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-08 00:23:44	2026-04-01 19:44:50.059	Carrusel_Sin bancos
2851	2851	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-08 01:13:18	2026-04-01 19:44:50.061	Carrusel_Sin bancos
2852	2852	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-08 01:20:47	2026-04-01 19:44:50.061	Carrusel_Sin bancos
2853	2853	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-08 01:46:34	2026-04-01 19:44:50.062	Carrusel_Sin bancos
2854	2854	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-08 01:59:27	2026-04-01 19:44:50.063	Carrusel_Sin bancos
2856	2856	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-08 03:13:36	2026-04-01 19:44:50.064	Carrusel_Sin bancos
2857	2857	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-08 04:43:43	2026-04-01 19:44:50.065	Carrusel_Sin bancos
2858	2858	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-08 04:51:32	2026-04-01 19:44:50.066	Carrusel_Sin bancos
2859	2859	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-08 12:36:07	2026-04-01 19:44:50.067	Carrusel_Sin bancos
2862	2862	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-08 22:43:45	2026-04-01 19:44:50.069	Carrusel_Sin bancos
2863	2863	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-08-08 22:52:57	2026-04-01 19:44:50.07	Carrusel_Sin bancos
2864	2864	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-09 00:26:25	2026-04-01 19:44:50.07	Carrusel_Sin bancos
2865	2865	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-09 03:05:23	2026-04-01 19:44:50.071	Carrusel_Sin bancos
2866	2866	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-09 03:51:24	2026-04-01 19:44:50.072	Carrusel_Sin bancos
2867	2867	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-09 04:21:00	2026-04-01 19:44:50.073	Carrusel_Sin bancos
2868	2868	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-09 05:24:36	2026-04-01 19:44:50.073	Carrusel_Sin bancos
2869	2869	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-09 09:58:12	2026-04-01 19:44:50.074	Carrusel_Sin bancos
2870	2870	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-09 10:31:08	2026-04-01 19:44:50.075	Carrusel_Sin bancos
2871	2871	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-09 13:22:27	2026-04-01 19:44:50.075	Carrusel_Sin bancos
2872	2872	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-09 13:37:39	2026-04-01 19:44:50.076	Carrusel_Sin bancos
2873	2873	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-09 14:46:40	2026-04-01 19:44:50.077	Carrusel_Sin bancos
2874	2874	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-09 16:23:48	2026-04-01 19:44:50.077	Carrusel_Sin bancos
2875	2875	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-09 22:22:16	2026-04-01 19:44:50.078	Carrusel_Sin bancos
2876	2876	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-09 23:36:30	2026-04-01 19:44:50.079	Carrusel_Sin bancos
2877	2877	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-10 00:17:34	2026-04-01 19:44:50.079	Carrusel_Sin bancos
2878	2878	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-10 00:31:53	2026-04-01 19:44:50.08	Carrusel_Sin bancos
2879	2879	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-08-10 00:36:34	2026-04-01 19:44:50.08	Carrusel_Sin bancos
2882	2882	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-10 02:56:20	2026-04-01 19:44:50.083	Carrusel_Sin bancos
2883	2883	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-10 03:11:14	2026-04-01 19:44:50.083	Carrusel_Sin bancos
2884	2884	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-10 07:03:46	2026-04-01 19:44:50.084	Carrusel_Sin bancos
2886	2886	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-10 12:06:00	2026-04-01 19:44:50.085	Carrusel_Sin bancos
2887	2887	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-10 12:28:11	2026-04-01 19:44:50.086	Carrusel_Sin bancos
2888	2888	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-10 14:24:00	2026-04-01 19:44:50.086	Carrusel_Sin bancos
2880	2880	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-29 00:28:52	2026-04-13 16:01:16.792	Carrusel_Sin bancos
2855	2855	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-28 22:29:52	2026-04-13 16:01:16.795	Carrusel_Sin bancos
2850	2850	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-30 14:48:28	2026-04-13 16:01:16.851	Carrusel_Sin bancos
2885	2885	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-09-02 12:38:15	2026-04-13 16:01:16.993	Carrusel_Sin bancos
2860	2860	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-09-02 14:28:10	2026-04-13 16:01:16.996	Carrusel_Sin bancos
2828	2828	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-09-05 03:03:31	2026-04-13 16:01:17.083	Carrusel_Sin bancos
2881	2881	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-10-19 21:23:45	2026-04-13 16:01:18.337	Carrusel_Sin bancos
2861	2861	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-19 23:46:00	2026-04-13 16:01:19.195	Carrusel_Sin bancos
2890	2890	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-10 19:27:05	2026-04-01 19:44:50.088	Carrusel_Sin bancos
2891	2891	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-10 20:12:29	2026-04-01 19:44:50.089	Carrusel_Sin bancos
2892	2892	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-10 20:14:24	2026-04-01 19:44:50.089	Carrusel_Sin bancos
2894	2894	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-11 05:43:05	2026-04-01 19:44:50.091	Carrusel_Sin bancos
2895	2895	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-08-11 14:51:36	2026-04-01 19:44:50.091	Carrusel_Sin bancos
2897	2897	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-12 00:04:20	2026-04-01 19:44:50.093	Carrusel_Sin bancos
2900	2900	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-12 02:59:54	2026-04-01 19:44:50.094	Carrusel_Sin bancos
2901	2901	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-12 03:11:58	2026-04-01 19:44:50.095	Carrusel_Sin bancos
2902	2902	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-12 08:50:18	2026-04-01 19:44:50.096	Carrusel_Sin bancos
2904	2904	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-12 13:04:07	2026-04-01 19:44:50.097	Carrusel_Sin bancos
2905	2905	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-12 15:30:57	2026-04-01 19:44:50.098	Carrusel_Sin bancos
2906	2906	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-12 17:09:35	2026-04-01 19:44:50.098	Carrusel_Sin bancos
2908	2908	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-12 21:17:40	2026-04-01 19:44:50.1	Carrusel_Sin bancos
2910	2910	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-13 02:18:11	2026-04-01 19:44:50.101	Carrusel_Sin bancos
2911	2911	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-13 02:49:43	2026-04-01 19:44:50.102	Carrusel_Sin bancos
2912	2912	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-13 12:17:43	2026-04-01 19:44:50.102	Carrusel_Sin bancos
2913	2913	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-13 16:27:06	2026-04-01 19:44:50.103	Carrusel_Sin bancos
2914	2914	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-13 16:51:42	2026-04-01 19:44:50.104	Carrusel_Sin bancos
2915	2915	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-13 20:35:02	2026-04-01 19:44:50.104	Carrusel_Sin bancos
2916	2916	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-13 21:35:29	2026-04-01 19:44:50.105	Carrusel_Sin bancos
2917	2917	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-13 22:02:14	2026-04-01 19:44:50.105	Carrusel_Sin bancos
2919	2919	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-14 01:09:12	2026-04-01 19:44:50.107	Carrusel_Sin bancos
2920	2920	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-08-14 01:43:40	2026-04-01 19:44:50.107	Como tu dinero pierde
2921	2921	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-14 02:09:41	2026-04-01 19:44:50.108	Carrusel_Sin bancos
2922	2922	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-14 02:19:52	2026-04-01 19:44:50.109	Carrusel_Sin bancos
2923	2923	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-14 04:55:28	2026-04-01 19:44:50.109	Carrusel_Sin bancos
2924	2924	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-08-14 06:23:29	2026-04-01 19:44:50.11	Carrusel_Sin bancos
2925	2925	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-08-14 11:02:18	2026-04-01 19:44:50.111	Carrusel_Sin bancos
2926	2926	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-14 11:56:58	2026-04-01 19:44:50.111	Carrusel_Sin bancos
2928	2928	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-14 15:11:24	2026-04-01 19:44:50.113	Carrusel_Sin bancos
2929	2929	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-14 16:51:37	2026-04-01 19:44:50.113	Carrusel_Sin bancos
2930	2930	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-14 17:11:18	2026-04-01 19:44:50.114	Carrusel_Sin bancos
2931	2931	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-14 17:13:06	2026-04-01 19:44:50.114	Carrusel_Sin bancos
2932	2932	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-14 20:01:04	2026-04-01 19:44:50.115	Carrusel_Sin bancos
2933	2933	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-14 20:07:56	2026-04-01 19:44:50.116	Carrusel_Sin bancos
2934	2934	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-14 21:04:12	2026-04-01 19:44:50.116	Carrusel_Sin bancos
2938	2938	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-15 02:50:55	2026-04-01 19:44:50.119	Carrusel_Sin bancos
2939	2939	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-15 13:39:23	2026-04-01 19:44:50.12	Carrusel_Sin bancos
2940	2940	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-15 15:52:48	2026-04-01 19:44:50.121	Carrusel_Sin bancos
2941	2941	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-15 16:49:20	2026-04-01 19:44:50.122	Carrusel_Sin bancos
2942	2942	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-15 17:55:43	2026-04-01 19:44:50.123	Carrusel_Sin bancos
2943	2943	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-15 19:40:56	2026-04-01 19:44:50.124	Carrusel_Sin bancos
2944	2944	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-15 21:28:17	2026-04-01 19:44:50.124	Carrusel_Sin bancos
2945	2945	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-15 23:01:35	2026-04-01 19:44:50.125	Carrusel_Sin bancos
2947	2947	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-08-16 03:43:33	2026-04-01 19:44:50.126	Carrusel_Sin bancos
2948	2948	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-16 03:56:46	2026-04-01 19:44:50.127	Carrusel_Sin bancos
2949	2949	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-16 03:59:49	2026-04-01 19:44:50.128	Carrusel_Sin bancos
2950	2950	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-16 04:07:03	2026-04-01 19:44:50.128	Carrusel_Sin bancos
2951	2951	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-16 04:29:48	2026-04-01 19:44:50.129	Carrusel_Sin bancos
2952	2952	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-16 06:32:21	2026-04-01 19:44:50.13	Carrusel_Sin bancos
2953	2953	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-16 11:18:31	2026-04-01 19:44:50.131	Carrusel_Sin bancos
2954	2954	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-16 14:04:05	2026-04-01 19:44:50.131	Carrusel_Sin bancos
2955	2955	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-16 14:16:13	2026-04-01 19:44:50.132	Carrusel_Sin bancos
2956	2956	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-16 16:03:25	2026-04-01 19:44:50.133	Carrusel_Sin bancos
2957	2957	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-16 17:00:31	2026-04-01 19:44:50.133	Carrusel_Sin bancos
2958	2958	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-16 21:33:01	2026-04-01 19:44:50.134	Carrusel_Sin bancos
2959	2959	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-16 23:59:10	2026-04-01 19:44:50.135	Carrusel_Sin bancos
2960	2960	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-17 01:45:33	2026-04-01 19:44:50.135	Carrusel_Sin bancos
2962	2962	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-17 03:37:42	2026-04-01 19:44:50.137	Carrusel_Sin bancos
2963	2963	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-17 03:39:30	2026-04-01 19:44:50.138	Carrusel_Sin bancos
2964	2964	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-17 03:42:00	2026-04-01 19:44:50.138	Carrusel_Sin bancos
2899	2899	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-30 14:46:58	2026-04-13 16:01:16.849	Carrusel_Sin bancos
2909	2909	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-09-03 00:14:21	2026-04-13 16:01:17.017	Carrusel_Sin bancos
2927	2927	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-09-04 03:50:51	2026-04-13 16:01:17.039	Carrusel_Sin bancos
2907	2907	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-09-07 00:21:56	2026-04-13 16:01:17.133	Carrusel_Sin bancos
2937	2937	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-09-15 22:10:35	2026-04-13 16:01:17.417	Carrusel_Sin bancos
2946	2946	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-09-26 16:43:27	2026-04-13 16:01:17.725	Carrusel_Sin bancos
2893	2893	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-10-01 20:44:49	2026-04-13 16:01:17.879	Carrusel_Sin bancos
2918	2918	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-10-02 02:28:11	2026-04-13 16:01:17.893	Carrusel_Sin bancos
2903	2903	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-10-02 16:49:16	2026-04-13 16:01:17.915	Carrusel_Sin bancos
2898	2898	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-10-03 00:45:07	2026-04-13 16:01:17.932	Carrusel_Sin bancos
2936	2936	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-10-17 03:09:15	2026-04-13 16:01:18.294	Carrusel_Sin bancos
2896	2896	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-11-13 01:19:16	2026-04-13 16:01:18.887	Carrusel_Sin bancos
2965	2965	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-17 05:13:12	2026-04-01 19:44:50.139	Carrusel_Sin bancos
2966	2966	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-08-17 08:24:56	2026-04-01 19:44:50.14	Carrusel_Sin bancos
2967	2967	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-17 09:40:02	2026-04-01 19:44:50.14	Carrusel_Sin bancos
2968	2968	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-17 12:43:18	2026-04-01 19:44:50.141	Carrusel_Sin bancos
2969	2969	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-17 13:27:13	2026-04-01 19:44:50.142	Carrusel_Sin bancos
2970	2970	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-17 13:39:16	2026-04-01 19:44:50.143	Carrusel_Sin bancos
2971	2971	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-17 14:29:40	2026-04-01 19:44:50.144	Carrusel_Sin bancos
2972	2972	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-17 15:39:13	2026-04-01 19:44:50.144	Carrusel_Sin bancos
2974	2974	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-17 16:39:18	2026-04-01 19:44:50.146	Carrusel_Sin bancos
2975	2975	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-17 20:49:19	2026-04-01 19:44:50.146	Carrusel_Sin bancos
2977	2977	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-17 22:00:56	2026-04-01 19:44:50.148	Carrusel_Sin bancos
2978	2978	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-18 03:01:02	2026-04-01 19:44:50.149	Carrusel_Sin bancos
2979	2979	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-08-18 05:12:44	2026-04-01 19:44:50.149	Carrusel_Sin bancos
2980	2980	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-18 07:41:14	2026-04-01 19:44:50.15	Carrusel_Sin bancos
2982	2982	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-18 12:47:52	2026-04-01 19:44:50.151	Carrusel_Sin bancos
2983	2983	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-18 12:49:50	2026-04-01 19:44:50.152	Carrusel_Sin bancos
2984	2984	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-18 17:11:13	2026-04-01 19:44:50.152	Carrusel_Sin bancos
2985	2985	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-18 17:34:34	2026-04-01 19:44:50.153	Carrusel_Sin bancos
2986	2986	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-18 18:02:22	2026-04-01 19:44:50.153	Carrusel_Sin bancos
2987	2987	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-18 22:34:28	2026-04-01 19:44:50.154	Carrusel_Sin bancos
2988	2988	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-19 04:53:30	2026-04-01 19:44:50.154	Carrusel_Sin bancos
2989	2989	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-19 10:31:14	2026-04-01 19:44:50.155	Carrusel_Sin bancos
2991	2991	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-19 13:00:20	2026-04-01 19:44:50.156	Carrusel_Sin bancos
2992	2992	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-19 19:38:55	2026-04-01 19:44:50.157	Carrusel_Sin bancos
2993	2993	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-19 19:39:56	2026-04-01 19:44:50.158	Carrusel_Sin bancos
2994	2994	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-19 23:23:09	2026-04-01 19:44:50.158	Carrusel_Sin bancos
2995	2995	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-19 23:49:25	2026-04-01 19:44:50.159	Carrusel_Sin bancos
2996	2996	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-20 00:49:34	2026-04-01 19:44:50.16	Carrusel_Sin bancos
2998	2998	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-20 02:03:05	2026-04-01 19:44:50.162	Carrusel_Sin bancos
2999	2999	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-20 02:15:48	2026-04-01 19:44:50.162	Carrusel_Sin bancos
3001	3001	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-20 02:56:51	2026-04-01 19:44:50.164	Carrusel_Sin bancos
3003	3003	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-20 12:12:09	2026-04-01 19:44:50.165	Carrusel_Sin bancos
3004	3004	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-20 14:16:36	2026-04-01 19:44:50.166	Carrusel_Sin bancos
3005	3005	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-20 15:51:05	2026-04-01 19:44:50.166	Carrusel_Sin bancos
3007	3007	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-20 21:15:35	2026-04-01 19:44:50.168	Carrusel_Sin bancos
3008	3008	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-20 21:48:16	2026-04-01 19:44:50.168	Carrusel_Sin bancos
3010	3010	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-20 23:58:43	2026-04-01 19:44:50.17	Carrusel_Sin bancos
3011	3011	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-08-21 00:24:13	2026-04-01 19:44:50.17	Carrusel_Sin bancos
3013	3013	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-21 02:45:21	2026-04-01 19:44:50.172	Carrusel_Sin bancos
3015	3015	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-21 06:19:45	2026-04-01 19:44:50.173	Carrusel_Sin bancos
3016	3016	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-21 07:21:17	2026-04-01 19:44:50.174	Carrusel_Sin bancos
3017	3017	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-21 11:05:58	2026-04-01 19:44:50.174	Carrusel_Sin bancos
3018	3018	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-21 11:30:39	2026-04-01 19:44:50.175	Carrusel_Sin bancos
3019	3019	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-21 13:30:47	2026-04-01 19:44:50.176	Carrusel_Sin bancos
3020	3020	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-21 18:30:43	2026-04-01 19:44:50.176	Carrusel_Sin bancos
3021	3021	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-21 20:06:53	2026-04-01 19:44:50.177	Carrusel_Sin bancos
3022	3022	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-21 20:51:21	2026-04-01 19:44:50.178	Carrusel_Sin bancos
3023	3023	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-21 23:04:22	2026-04-01 19:44:50.178	Carrusel_Sin bancos
3025	3025	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-21 23:45:52	2026-04-01 19:44:50.18	Carrusel_Sin bancos
3026	3026	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-22 02:29:04	2026-04-01 19:44:50.18	Carrusel_Sin bancos
3027	3027	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-22 03:05:50	2026-04-01 19:44:50.181	Carrusel_Sin bancos
3028	3028	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-22 04:18:51	2026-04-01 19:44:50.182	Carrusel_Sin bancos
3030	3030	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-22 16:04:42	2026-04-01 19:44:50.183	Carrusel_Sin bancos
3031	3031	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-22 16:49:03	2026-04-01 19:44:50.184	Carrusel_Sin bancos
3032	3032	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-22 17:42:08	2026-04-01 19:44:50.185	Carrusel_Sin bancos
3033	3033	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-22 19:48:00	2026-04-01 19:44:50.185	Carrusel_Sin bancos
3034	3034	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-22 20:20:25	2026-04-01 19:44:50.186	Carrusel_Sin bancos
3035	3035	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-22 21:50:34	2026-04-01 19:44:50.187	Carrusel_Sin bancos
3036	3036	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-22 22:28:11	2026-04-01 19:44:50.187	Carrusel_Sin bancos
3038	3038	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-23 00:14:58	2026-04-01 19:44:50.189	Carrusel_Sin bancos
3039	3039	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-23 00:23:29	2026-04-01 19:44:50.189	Carrusel_Sin bancos
2990	2990	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-08-28 22:00:23	2026-04-13 16:01:16.798	Carrusel_Sin bancos
3012	3012	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-30 12:53:44	2026-04-13 16:01:16.838	Carrusel_Sin bancos
3000	3000	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-30 12:59:31	2026-04-13 16:01:16.839	Carrusel_Sin bancos
3014	3014	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-31 23:46:25	2026-04-13 16:01:16.91	Carrusel_Sin bancos
3024	3024	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-09-01 23:48:42	2026-04-13 16:01:16.958	Carrusel_Sin bancos
3002	3002	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-09-02 21:34:47	2026-04-13 16:01:17.012	Carrusel_Sin bancos
2973	2973	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-09-04 17:17:04	2026-04-13 16:01:17.063	Carrusel_Sin bancos
2997	2997	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-09-05 21:55:36	2026-04-13 16:01:17.104	Carrusel_Sin bancos
2976	2976	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-09-10 11:53:49	2026-04-13 16:01:17.219	Carrusel_Sin bancos
3006	3006	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-09-11 18:11:18	2026-04-13 16:01:17.287	Carrusel_Sin bancos
3037	3037	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-09-27 17:32:14	2026-04-13 16:01:17.759	Carrusel_Sin bancos
3029	3029	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-11-04 18:06:04	2026-04-13 16:01:18.765	Carrusel_Sin bancos
3040	3040	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-23 00:54:46	2026-04-01 19:44:50.19	Carrusel_Sin bancos
3041	3041	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-23 01:30:03	2026-04-01 19:44:50.191	Carrusel_Sin bancos
3042	3042	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-23 02:07:33	2026-04-01 19:44:50.191	Carrusel_Sin bancos
3044	3044	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-23 02:22:40	2026-04-01 19:44:50.193	Carrusel_Sin bancos
3045	3045	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-23 03:54:42	2026-04-01 19:44:50.193	Carrusel_Sin bancos
3046	3046	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-23 06:42:51	2026-04-01 19:44:50.194	Carrusel_Sin bancos
3048	3048	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-23 11:40:10	2026-04-01 19:44:50.195	Carrusel_Sin bancos
3050	3050	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-23 12:35:03	2026-04-01 19:44:50.197	Carrusel_Sin bancos
3051	3051	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-23 15:51:22	2026-04-01 19:44:50.197	Carrusel_Sin bancos
3053	3053	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-23 19:53:24	2026-04-01 19:44:50.199	Carrusel_Sin bancos
3054	3054	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-23 21:39:02	2026-04-01 19:44:50.199	Carrusel_Sin bancos
3056	3056	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-24 00:54:13	2026-04-01 19:44:50.201	Carrusel_Sin bancos
3057	3057	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-24 02:11:21	2026-04-01 19:44:50.201	Carrusel_Sin bancos
3058	3058	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-24 02:15:09	2026-04-01 19:44:50.202	Carrusel_Sin bancos
3059	3059	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-24 02:33:26	2026-04-01 19:44:50.203	Carrusel_Sin bancos
3060	3060	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-24 04:13:07	2026-04-01 19:44:50.203	Carrusel_Sin bancos
3061	3061	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-24 04:36:09	2026-04-01 19:44:50.204	Carrusel_Sin bancos
3062	3062	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-24 04:51:25	2026-04-01 19:44:50.205	Carrusel_Sin bancos
3063	3063	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-24 05:19:51	2026-04-01 19:44:50.205	Carrusel_Sin bancos
3064	3064	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-24 07:37:13	2026-04-01 19:44:50.206	Carrusel_Sin bancos
3066	3066	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-24 12:51:42	2026-04-01 19:44:50.208	Carrusel_Sin bancos
3067	3067	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-24 13:40:13	2026-04-01 19:44:50.208	Carrusel_Sin bancos
3068	3068	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-24 14:13:24	2026-04-01 19:44:50.209	Carrusel_Sin bancos
3069	3069	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-24 14:51:37	2026-04-01 19:44:50.21	Carrusel_Sin bancos
3072	3072	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-24 19:24:21	2026-04-01 19:44:50.212	Carrusel_Sin bancos
3073	3073	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-24 20:06:49	2026-04-01 19:44:50.212	Carrusel_Sin bancos
3074	3074	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-08-24 21:03:45	2026-04-01 19:44:50.213	Carrusel_Sin bancos
3075	3075	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-24 21:34:18	2026-04-01 19:44:50.214	Carrusel_Sin bancos
3076	3076	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-25 01:20:56	2026-04-01 19:44:50.214	Carrusel_Sin bancos
3077	3077	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-25 01:53:57	2026-04-01 19:44:50.215	Carrusel_Sin bancos
3078	3078	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-25 02:55:42	2026-04-01 19:44:50.215	Carrusel_Sin bancos
3080	3080	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-25 03:52:07	2026-04-01 19:44:50.217	Carrusel_Sin bancos
3081	3081	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-25 07:59:02	2026-04-01 19:44:50.217	Carrusel_Sin bancos
3082	3082	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-25 10:47:53	2026-04-01 19:44:50.218	Carrusel_Sin bancos
3083	3083	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-25 13:18:24	2026-04-01 19:44:50.219	Carrusel_Sin bancos
3084	3084	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-25 15:27:26	2026-04-01 19:44:50.219	Carrusel_Sin bancos
3085	3085	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-25 16:45:40	2026-04-01 19:44:50.22	Carrusel_Sin bancos
3087	3087	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-25 19:16:46	2026-04-01 19:44:50.221	Carrusel_Sin bancos
3088	3088	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-25 19:37:34	2026-04-01 19:44:50.222	Carrusel_Sin bancos
3089	3089	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-25 20:58:42	2026-04-01 19:44:50.223	Carrusel_Sin bancos
3090	3090	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-25 23:45:36	2026-04-01 19:44:50.224	Carrusel_Sin bancos
3091	3091	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-26 00:01:34	2026-04-01 19:44:50.224	Carrusel_Sin bancos
3092	3092	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-26 00:08:04	2026-04-01 19:44:50.225	Carrusel_Sin bancos
3093	3093	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-26 01:56:19	2026-04-01 19:44:50.226	Carrusel_Sin bancos
3094	3094	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-26 02:33:02	2026-04-01 19:44:50.228	Carrusel_Sin bancos
3095	3095	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-26 02:41:06	2026-04-01 19:44:50.23	Carrusel_Sin bancos
3098	3098	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-26 12:42:42	2026-04-01 19:44:50.268	Carrusel_Sin bancos
3099	3099	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-26 12:44:50	2026-04-01 19:44:50.269	Carrusel_Sin bancos
3100	3100	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-08-26 15:00:29	2026-04-01 19:44:50.27	Carrusel_Sin bancos
3101	3101	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-26 15:55:30	2026-04-01 19:44:50.271	Carrusel_Sin bancos
3102	3102	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-26 19:55:22	2026-04-01 19:44:50.272	Carrusel_Sin bancos
3103	3103	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-27 00:56:51	2026-04-01 19:44:50.272	Carrusel_Sin bancos
3104	3104	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-27 02:42:55	2026-04-01 19:44:50.273	Carrusel_Sin bancos
3105	3105	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-27 02:51:56	2026-04-01 19:44:50.274	Carrusel_Sin bancos
3106	3106	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-27 04:14:29	2026-04-01 19:44:50.274	Carrusel_Sin bancos
3107	3107	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-27 17:19:52	2026-04-01 19:44:50.275	Carrusel_Sin bancos
3108	3108	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-27 19:51:12	2026-04-01 19:44:50.276	Carrusel_Sin bancos
3109	3109	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-27 20:20:44	2026-04-01 19:44:50.276	Carrusel_Sin bancos
3110	3110	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-27 20:40:47	2026-04-01 19:44:50.277	Carrusel_Sin bancos
3111	3111	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-27 21:00:52	2026-04-01 19:44:50.277	Carrusel_Sin bancos
3112	3112	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-27 21:56:49	2026-04-01 19:44:50.278	Carrusel_Sin bancos
3113	3113	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-28 01:12:35	2026-04-01 19:44:50.278	Carrusel_Sin bancos
3114	3114	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-28 01:17:26	2026-04-01 19:44:50.279	Carrusel_Sin bancos
3079	3079	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-31 03:15:28	2026-04-13 16:01:16.876	Carrusel_Sin bancos
3043	3043	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-31 03:27:26	2026-04-13 16:01:16.879	Carrusel_Sin bancos
3065	3065	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-31 11:19:55	2026-04-13 16:01:16.888	Carrusel_Sin bancos
3071	3071	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-09-04 13:41:41	2026-04-13 16:01:17.047	Carrusel_Sin bancos
3052	3052	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-09-11 22:09:17	2026-04-13 16:01:17.296	Carrusel_Sin bancos
3070	3070	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-09-19 00:58:44	2026-04-13 16:01:17.499	Carrusel_Sin bancos
3055	3055	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-09-25 20:45:41	2026-04-13 16:01:17.707	Carrusel_Sin bancos
3049	3049	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-09-28 17:38:19	2026-04-13 16:01:17.784	Carrusel_Sin bancos
3097	3097	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-09-29 01:02:30	2026-04-13 16:01:17.799	Carrusel_Sin bancos
3086	3086	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-10-06 02:42:51	2026-04-13 16:01:18.003	Carrusel_Sin bancos
3096	3096	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-11-09 23:40:16	2026-04-13 16:01:18.813	Carrusel_Sin bancos
3115	3115	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-28 02:55:07	2026-04-01 19:44:50.28	Carrusel_Sin bancos
3116	3116	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-28 03:39:35	2026-04-01 19:44:50.28	Carrusel_Sin bancos
3117	3117	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-28 03:52:14	2026-04-01 19:44:50.281	Carrusel_Sin bancos
3119	3119	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-28 12:11:57	2026-04-01 19:44:50.282	Carrusel_Sin bancos
3120	3120	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-28 12:11:57	2026-04-01 19:44:50.283	Carrusel_Sin bancos
3121	3121	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-12-02 22:52:31	2026-04-01 19:44:50.284	Inversion_Bodegas
3122	3122	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-03 00:02:51	2026-04-01 19:44:50.285	Inversion_Bodegas
3124	3124	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-04 15:28:22	2026-04-01 19:44:50.286	Inversion_Bodegas
3125	3125	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-12-04 16:25:30	2026-04-01 19:44:50.287	Inversion_Bodegas
3127	3127	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-07 23:22:46	2026-04-01 19:44:50.289	Inversion_Bodegas
3128	3128	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-07 23:44:31	2026-04-01 19:44:50.289	Inversion_Bodegas
3130	3130	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-12-08 05:19:55	2026-04-01 19:44:50.291	Inversion_Bodegas
3131	3131	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-08 10:05:28	2026-04-01 19:44:50.291	Inversion_Bodegas
3132	3132	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-08 10:15:52	2026-04-01 19:44:50.292	Inversion_Bodegas
3133	3133	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-09 01:10:12	2026-04-01 19:44:50.293	Inversion_Bodegas
3135	3135	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-09 02:01:47	2026-04-01 19:44:50.294	Inversion_Bodegas
3136	3136	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-12-09 02:04:21	2026-04-01 19:44:50.295	Inversion_Bodegas
3137	3137	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-09 02:05:22	2026-04-01 19:44:50.295	Inversion_Bodegas
3138	3138	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-09 02:18:42	2026-04-01 19:44:50.296	Inversion_Bodegas
3140	3140	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-09 02:31:23	2026-04-01 19:44:50.297	Inversion_Bodegas
3143	3143	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-09 03:40:21	2026-04-01 19:44:50.299	Inversion_Bodegas
3144	3144	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-09 10:56:24	2026-04-01 19:44:50.3	Inversion_Bodegas
3147	3147	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-09 16:45:10	2026-04-01 19:44:50.302	Inversion_Bodegas
3149	3149	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-12-09 20:11:41	2026-04-01 19:44:50.304	Inversion_Bodegas
3152	3152	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-09 23:02:52	2026-04-01 19:44:50.306	Inversion_Bodegas
3154	3154	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-10 00:16:04	2026-04-01 19:44:50.307	Inversion_Bodegas
3156	3156	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-10 03:03:13	2026-04-01 19:44:50.308	Inversion_Bodegas
3157	3157	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-10 03:49:25	2026-04-01 19:44:50.309	Inversion_Bodegas
3158	3158	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-10 04:51:55	2026-04-01 19:44:50.31	Inversion_Bodegas
3159	3159	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-10 10:19:08	2026-04-01 19:44:50.31	Inversion_Bodegas
3165	3165	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-10 18:11:23	2026-04-01 19:44:50.315	Inversion_Bodegas
3166	3166	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-10 18:29:12	2026-04-01 19:44:50.316	Inversion_Bodegas
3167	3167	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-10 23:39:01	2026-04-01 19:44:50.316	Inversion_Bodegas
3170	3170	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-11 16:06:23	2026-04-01 19:44:50.318	Inversion_Bodegas
3171	3171	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-11 16:14:25	2026-04-01 19:44:50.319	Inversion_Bodegas
3174	3174	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-11 18:06:59	2026-04-01 19:44:50.321	Inversion_Bodegas
3176	3176	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-11 22:25:20	2026-04-01 19:44:50.323	Inversion_Bodegas
3177	3177	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-11 23:16:29	2026-04-01 19:44:50.323	Inversion_Bodegas
3178	3178	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-12 01:39:53	2026-04-01 19:44:50.324	Inversion_Bodegas
3179	3179	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-12 02:58:31	2026-04-01 19:44:50.325	Inversion_Bodegas
3180	3180	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-12 10:10:09	2026-04-01 19:44:50.325	Inversion_Bodegas
3181	3181	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-12 13:04:35	2026-04-01 19:44:50.326	Inversion_Bodegas
3182	3182	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-12-12 15:18:20	2026-04-01 19:44:50.327	Inversion_Bodegas
3183	3183	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-12 15:37:42	2026-04-01 19:44:50.327	Inversion_Bodegas
3184	3184	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-12 17:27:17	2026-04-01 19:44:50.328	Inversion_Bodegas
3185	3185	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-12 17:27:46	2026-04-01 19:44:50.329	Inversion_Bodegas
3186	3186	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-12 18:09:51	2026-04-01 19:44:50.33	Inversion_Bodegas
3187	3187	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-12 21:33:09	2026-04-01 19:44:50.33	Inversion_Bodegas
3188	3188	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-12 22:01:53	2026-04-01 19:44:50.331	Inversion_Bodegas
3139	3139	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-30 23:43:47	2026-04-13 16:01:16.864	Inversion_Bodegas
3151	3151	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-09-11 00:22:52	2026-04-13 16:01:17.261	Inversion_Bodegas
3172	3172	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-09-19 22:22:14	2026-04-13 16:01:17.536	Inversion_Bodegas
3168	3168	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-09-23 00:53:11	2026-04-13 16:01:17.628	Inversion_Bodegas
3189	3189	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-09-24 17:00:53	2026-04-13 16:01:17.677	Inversion_Bodegas
3169	3169	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-09-28 20:35:04	2026-04-13 16:01:17.788	Inversion_Bodegas
3164	3164	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-10-01 03:38:56	2026-04-13 16:01:17.864	Inversion_Bodegas
3123	3123	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-10-03 00:18:20	2026-04-13 16:01:17.928	Inversion_Bodegas
3150	3150	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-10-15 16:22:49	2026-04-13 16:01:18.22	Inversion_Bodegas
3175	3175	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-10-20 00:17:26	2026-04-13 16:01:18.344	Inversion_Bodegas
3155	3155	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-10-22 05:46:56	2026-04-13 16:01:18.396	Inversion_Bodegas
3153	3153	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-10-25 05:43:37	2026-04-13 16:01:18.482	Inversion_Bodegas
3148	3148	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-11-03 12:57:49	2026-04-13 16:01:18.733	Inversion_Bodegas
3129	3129	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-11-05 14:24:59	2026-04-13 16:01:18.77	Inversion_Bodegas
3142	3142	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-11-08 03:57:32	2026-04-13 16:01:18.784	Inversion_Bodegas
3145	3145	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-11-16 14:02:27	2026-04-13 16:01:18.966	Inversion_Bodegas
3134	3134	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-11-17 02:03:32	2026-04-13 16:01:18.975	Inversion_Bodegas
3162	3162	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-11-18 18:03:43	2026-04-13 16:01:18.991	Inversion_Bodegas
3163	3163	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-11-19 01:40:19	2026-04-13 16:01:18.996	Inversion_Bodegas
3161	3161	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-11-19 04:01:07	2026-04-13 16:01:19	Inversion_Bodegas
3126	3126	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-11-24 16:27:21	2026-04-13 16:01:19.036	Inversion_Bodegas
3141	3141	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-11-27 10:38:31	2026-04-13 16:01:19.074	Inversion_Bodegas
3146	3146	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-01 04:32:25	2026-04-13 16:01:19.098	Inversion_Bodegas
3173	3173	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-04 10:44:58	2026-04-13 16:01:19.149	Inversion_Bodegas
3190	3190	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-12 22:22:05	2026-04-01 19:44:50.332	Inversion_Bodegas
3191	3191	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-12 23:46:11	2026-04-01 19:44:50.333	Inversion_Bodegas
3192	3192	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-12 23:56:35	2026-04-01 19:44:50.334	Inversion_Bodegas
3193	3193	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-13 00:06:10	2026-04-01 19:44:50.335	Inversion_Bodegas
3194	3194	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-13 00:23:56	2026-04-01 19:44:50.335	Inversion_Bodegas
3196	3196	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-13 02:38:50	2026-04-01 19:44:50.337	Inversion_Bodegas
3197	3197	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-12-13 03:05:45	2026-04-01 19:44:50.337	Inversion_Bodegas
3198	3198	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-12-13 03:40:05	2026-04-01 19:44:50.338	Tandem_Carrusel_UF+8%
3199	3199	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-13 04:07:39	2026-04-01 19:44:50.339	Tandem_Carrusel_UF+8%
3200	3200	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-13 04:27:53	2026-04-01 19:44:50.339	Inversion_Bodegas
3201	3201	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-13 08:38:04	2026-04-01 19:44:50.34	Tandem_Carrusel_UF+8%
3203	3203	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-12-13 10:05:13	2026-04-01 19:44:50.341	Tandem_Carrusel_UF+8%
3205	3205	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-13 12:08:55	2026-04-01 19:44:50.344	Inversion_Bodegas
3207	3207	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-13 15:44:55	2026-04-01 19:44:50.346	Tandem_Carrusel_UF+8%
3208	3208	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-13 16:13:43	2026-04-01 19:44:50.347	Inversion_Bodegas
3209	3209	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-13 16:18:15	2026-04-01 19:44:50.347	Inversion_Bodegas
3210	3210	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-13 18:35:28	2026-04-01 19:44:50.348	Tandem_Carrusel_UF+8%
3211	3211	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-13 19:13:51	2026-04-01 19:44:50.349	Inversion_Bodegas
3212	3212	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-13 21:03:30	2026-04-01 19:44:50.349	Inversion_Bodegas
3214	3214	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-13 22:34:25	2026-04-01 19:44:50.351	Inversion_Bodegas
3215	3215	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-13 23:11:02	2026-04-01 19:44:50.351	Tandem_Carrusel_UF+8%
3216	3216	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-12-14 01:13:53	2026-04-01 19:44:50.352	Tandem_Carrusel_UF+8%
3218	3218	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-12-14 01:58:10	2026-04-01 19:44:50.353	Tandem_Carrusel_UF+8%
3219	3219	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-14 02:36:52	2026-04-01 19:44:50.354	Tandem_Carrusel_UF+8%
3220	3220	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-14 02:45:41	2026-04-01 19:44:50.355	Inversion_Bodegas
3221	3221	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-12-14 03:20:17	2026-04-01 19:44:50.356	Tandem_Carrusel_UF+8%
3222	3222	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-14 03:27:12	2026-04-01 19:44:50.356	Tandem_Carrusel_UF+8%
3223	3223	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-14 03:55:29	2026-04-01 19:44:50.357	Inversion_Bodegas
3224	3224	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-14 11:03:27	2026-04-01 19:44:50.358	Inversion_Bodegas
3225	3225	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-14 11:21:44	2026-04-01 19:44:50.358	Tandem_Carrusel_UF+8%
3226	3226	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-14 11:22:16	2026-04-01 19:44:50.359	Inversion_Bodegas
3227	3227	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-14 11:49:22	2026-04-01 19:44:50.36	Inversion_Bodegas
3230	3230	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-14 15:22:06	2026-04-01 19:44:50.361	Tandem_Carrusel_UF+8%
3232	3232	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-14 17:33:20	2026-04-01 19:44:50.362	Inversion_Bodegas
3233	3233	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-14 18:21:24	2026-04-01 19:44:50.363	Inversion_Bodegas
3234	3234	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-14 18:21:52	2026-04-01 19:44:50.364	Inversion_Bodegas
3235	3235	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-14 20:21:56	2026-04-01 19:44:50.365	Tandem_Carrusel_UF+8%
3236	3236	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-14 20:32:12	2026-04-01 19:44:50.365	Inversion_Bodegas
3238	3238	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-14 22:45:15	2026-04-01 19:44:50.367	Inversion_Bodegas
3239	3239	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-14 23:06:21	2026-04-01 19:44:50.367	Inversion_Bodegas
3240	3240	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-14 23:46:05	2026-04-01 19:44:50.368	Tandem_Carrusel_UF+8%
3241	3241	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-15 00:00:06	2026-04-01 19:44:50.369	Inversion_Bodegas
3242	3242	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-15 00:11:30	2026-04-01 19:44:50.369	Inversion_Bodegas
3243	3243	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-12-15 00:38:13	2026-04-01 19:44:50.37	Tandem_Carrusel_UF+8%
3244	3244	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-15 01:05:16	2026-04-01 19:44:50.371	Tandem_Carrusel_UF+8%
3245	3245	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-12-15 01:05:40	2026-04-01 19:44:50.371	Tandem_Carrusel_UF+8%
3246	3246	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-15 01:10:58	2026-04-01 19:44:50.372	Tandem_Carrusel_UF+8%
3247	3247	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-15 03:13:52	2026-04-01 19:44:50.372	Inversion_Bodegas
3248	3248	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-15 03:20:29	2026-04-01 19:44:50.373	Tandem_Carrusel_UF+8%
3249	3249	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-15 05:54:20	2026-04-01 19:44:50.374	Tandem_Carrusel_UF+8%
3250	3250	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-15 06:57:55	2026-04-01 19:44:50.374	Tandem_Carrusel_UF+8%
3252	3252	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-15 12:04:17	2026-04-01 19:44:50.375	Tandem_Carrusel_UF+8%
3253	3253	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-15 12:15:45	2026-04-01 19:44:50.376	Tandem_Carrusel_UF+8%
3254	3254	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-12-15 12:43:00	2026-04-01 19:44:50.376	Tandem_Carrusel_UF+8%
3255	3255	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-15 12:57:22	2026-04-01 19:44:50.377	Tandem_Carrusel_UF+8%
3256	3256	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-15 13:22:22	2026-04-01 19:44:50.377	Inversion_Bodegas
3257	3257	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-15 15:05:12	2026-04-01 19:44:50.378	Inversion_Bodegas
3258	3258	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-15 15:49:44	2026-04-01 19:44:50.378	Tandem_Carrusel_UF+8%
3259	3259	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-12-15 16:20:36	2026-04-01 19:44:50.379	Tandem_Carrusel_UF+8%
3261	3261	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-15 17:09:45	2026-04-01 19:44:50.38	Inversion_Bodegas
3262	3262	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-15 18:32:14	2026-04-01 19:44:50.381	Inversion_Bodegas
3263	3263	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-09-21 03:27:34	2026-04-13 16:01:17.572	Tandem_Carrusel_UF+8%
3260	3260	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-09-21 14:13:20	2026-04-13 16:01:17.586	Tandem_Carrusel_UF+8%
3251	3251	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-09-26 18:19:27	2026-04-13 16:01:17.731	Tandem_Carrusel_UF+8%
3264	3264	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-09-29 00:40:46	2026-04-13 16:01:17.797	Inversion_Bodegas
3217	3217	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-09-29 23:53:54	2026-04-13 16:01:17.841	Inversion_Bodegas
3229	3229	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-10-02 20:39:35	2026-04-13 16:01:17.923	Inversion_Bodegas
3204	3204	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-10-31 20:03:44	2026-04-13 16:01:18.651	Tandem_Carrusel_UF+8%
3213	3213	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-11-26 01:20:08	2026-04-13 16:01:19.054	Inversion_Bodegas
3206	3206	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-11-27 01:40:09	2026-04-13 16:01:19.069	Tandem_Carrusel_UF+8%
3237	3237	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-17 10:49:11	2026-04-13 16:01:19.177	Inversion_Bodegas
3195	3195	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-29 02:14:38	2026-04-13 16:01:19.187	Tandem_Carrusel_UF+8%
3231	3231	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-10-06 19:19:00	2026-04-13 16:01:19.23	Tandem_Carrusel_UF+8%
3228	3228	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-04-01 01:19:02	2026-04-13 16:01:19.348	Inversion_Bodegas
3265	3265	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-12-15 19:44:52	2026-04-01 19:44:50.383	Tandem_Carrusel_UF+8%
3266	3266	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-15 20:12:31	2026-04-01 19:44:50.384	Inversion_Bodegas
3267	3267	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-15 20:32:09	2026-04-01 19:44:50.385	Inversion_Bodegas
3268	3268	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-15 20:48:40	2026-04-01 19:44:50.385	Inversion_Bodegas
3269	3269	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-15 21:29:37	2026-04-01 19:44:50.386	Inversion_Bodegas
3270	3270	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-15 21:30:29	2026-04-01 19:44:50.387	Inversion_Bodegas
3271	3271	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-12-15 21:31:03	2026-04-01 19:44:50.388	Tandem_Carrusel_UF+8%
3272	3272	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-15 22:03:46	2026-04-01 19:44:50.388	Inversion_Bodegas
3273	3273	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-12-15 23:19:56	2026-04-01 19:44:50.389	Tandem_Carrusel_UF+8%
3274	3274	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-12-15 23:19:56	2026-04-01 19:44:50.39	Tandem_Carrusel_UF+8%
3276	3276	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-16 00:25:20	2026-04-01 19:44:50.391	Inversion_Bodegas
3277	3277	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-16 00:45:17	2026-04-01 19:44:50.392	Inversion_Bodegas
3278	3278	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-16 01:21:34	2026-04-01 19:44:50.393	Inversion_Bodegas
3279	3279	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-12-16 01:52:26	2026-04-01 19:44:50.394	Tandem_Carrusel_UF+8%
3280	3280	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-16 01:55:38	2026-04-01 19:44:50.394	Inversion_Bodegas
3281	3281	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-16 02:23:06	2026-04-01 19:44:50.395	Tandem_Carrusel_UF+8%
3282	3282	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-16 02:28:51	2026-04-01 19:44:50.396	Inversion_Bodegas
3284	3284	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-16 03:27:17	2026-04-01 19:44:50.397	Inversion_Bodegas
3285	3285	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-12-16 09:53:59	2026-04-01 19:44:50.398	Tandem_Carrusel_UF+8%
3286	3286	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-16 11:26:14	2026-04-01 19:44:50.399	Inversion_Bodegas
3287	3287	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-16 11:29:42	2026-04-01 19:44:50.4	Inversion_Bodegas
3288	3288	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-16 11:49:13	2026-04-01 19:44:50.4	Inversion_Bodegas
3292	3292	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-16 23:38:21	2026-04-01 19:44:50.403	Tandem_Carrusel_UF+8%
3293	3293	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-17 00:47:53	2026-04-01 19:44:50.404	Tandem_Carrusel_UF+8%
3294	3294	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-17 01:36:28	2026-04-01 19:44:50.405	Tandem_Carrusel_UF+8%
3295	3295	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-12-17 10:29:19	2026-04-01 19:44:50.406	Tandem_Carrusel_UF+8%
3297	3297	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-12-17 10:41:02	2026-04-01 19:44:50.408	Tandem_Carrusel_UF+8%
3298	3298	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-17 17:01:25	2026-04-01 19:44:50.409	Tandem_Carrusel_UF+8%
3299	3299	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-17 19:57:53	2026-04-01 19:44:50.409	Tandem_Carrusel_UF+8%
3300	3300	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-12-17 21:05:16	2026-04-01 19:44:50.41	Tandem_Carrusel_UF+8%
3303	3303	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-18 02:56:54	2026-04-01 19:44:50.413	Tandem_Carrusel_UF+8%
3304	3304	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-18 07:33:41	2026-04-01 19:44:50.414	Tandem_Carrusel_UF+8%
3305	3305	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-18 12:57:15	2026-04-01 19:44:50.415	Tandem_Carrusel_UF+8%
3306	3306	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-12-18 13:17:15	2026-04-01 19:44:50.415	Tandem_Carrusel_UF+8%
3307	3307	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-12-18 22:56:53	2026-04-01 19:44:50.416	Inversion_Bodegas
3308	3308	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-19 00:53:09	2026-04-01 19:44:50.418	Inversion_Bodegas
3310	3310	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-12-19 03:47:18	2026-04-01 19:44:50.419	Tandem_Carrusel_UF+8%
3311	3311	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-19 10:43:48	2026-04-01 19:44:50.42	Inversion_Bodegas
3312	3312	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-19 10:48:40	2026-04-01 19:44:50.421	Inversion_Bodegas
3314	3314	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-19 14:30:36	2026-04-01 19:44:50.422	Inversion_Bodegas
3315	3315	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-12-19 14:38:00	2026-04-01 19:44:50.423	Tandem_Carrusel_UF+8%
3317	3317	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-19 16:58:55	2026-04-01 19:44:50.425	Tandem_Carrusel_UF+8%
3318	3318	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-19 23:02:26	2026-04-01 19:44:50.425	Inversion_Bodegas
3320	3320	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-20 00:13:04	2026-04-01 19:44:50.427	Inversion_Bodegas
3321	3321	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-20 00:41:08	2026-04-01 19:44:50.427	Inversion_Bodegas
3322	3322	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-20 01:18:11	2026-04-01 19:44:50.428	Inversion_Bodegas
3323	3323	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-20 01:35:04	2026-04-01 19:44:50.429	Inversion_Bodegas
3325	3325	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-20 02:19:05	2026-04-01 19:44:50.431	Inversion_Bodegas
3326	3326	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-20 02:25:39	2026-04-01 19:44:50.431	Inversion_Bodegas
3327	3327	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-20 02:56:12	2026-04-01 19:44:50.432	Inversion_Bodegas
3329	3329	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-20 03:25:11	2026-04-01 19:44:50.434	Inversion_Bodegas
3330	3330	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-20 04:02:31	2026-04-01 19:44:50.435	Inversion_Bodegas
3331	3331	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-20 04:48:09	2026-04-01 19:44:50.435	Inversion_Bodegas
3332	3332	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-20 16:54:33	2026-04-01 19:44:50.436	Inversion_Bodegas
3333	3333	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-20 18:17:06	2026-04-01 19:44:50.437	Inversion_Bodegas
3334	3334	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-20 18:27:00	2026-04-01 19:44:50.438	Tandem_Carrusel_UF+8%
3335	3335	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-20 18:48:18	2026-04-01 19:44:50.438	Inversion_Bodegas
3336	3336	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-20 20:00:02	2026-04-01 19:44:50.439	Tandem_Carrusel_UF+8%
3338	3338	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-20 22:17:02	2026-04-01 19:44:50.441	Inversion_Bodegas
3339	3339	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-12-20 22:36:09	2026-04-01 19:44:50.441	Tandem_Carrusel_UF+8%
3289	3289	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-09-13 00:05:27	2026-04-13 16:01:17.346	Inversion_Bodegas
3275	3275	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-09-13 14:09:46	2026-04-13 16:01:17.354	Tandem_Carrusel_UF+8%
3283	3283	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-09-25 13:52:28	2026-04-13 16:01:17.7	Inversion_Bodegas
3337	3337	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-10-02 05:03:31	2026-04-13 16:01:17.903	Tandem_Carrusel_UF+8%
3296	3296	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-10-04 10:48:19	2026-04-13 16:01:17.959	Tandem_Carrusel_UF+8%
3309	3309	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-10-26 12:10:15	2026-04-13 16:01:18.517	Inversion_Bodegas
3301	3301	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-11-11 04:02:38	2026-04-13 16:01:18.839	Tandem_Carrusel_UF+8%
3328	3328	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-11-11 11:12:01	2026-04-13 16:01:18.846	Tandem_Carrusel_UF+8%
3290	3290	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-11-11 12:01:44	2026-04-13 16:01:18.854	Tandem_Carrusel_UF+8%
3324	3324	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-03 00:57:42	2026-04-13 16:01:19.246	Inversion_Bodegas
3319	3319	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-04-01 01:10:20	2026-04-13 16:01:19.344	Inversion_Bodegas
3291	3291	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-04-03 16:16:04	2026-04-13 16:01:19.419	Tandem_Carrusel_UF+8%
3302	3302	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-04-08 15:53:23	2026-04-13 16:01:19.595	Tandem_Carrusel_UF+8%
3316	3316	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-04-09 23:27:48	2026-04-13 16:01:19.63	Tandem_Carrusel_UF+8%
3340	3340	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-20 22:58:43	2026-04-01 19:44:50.442	Inversion_Bodegas
3341	3341	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-12-20 23:15:12	2026-04-01 19:44:50.443	Tandem_Carrusel_UF+8%
3342	3342	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-12-21 00:11:19	2026-04-01 19:44:50.444	Tandem_Carrusel_UF+8%
3343	3343	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-12-21 00:17:02	2026-04-01 19:44:50.444	Tandem_Carrusel_UF+8%
3344	3344	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-21 00:29:15	2026-04-01 19:44:50.445	Inversion_Bodegas
3345	3345	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-21 01:09:31	2026-04-01 19:44:50.446	Inversion_Bodegas
3346	3346	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-21 01:44:45	2026-04-01 19:44:50.446	Inversion_Bodegas
3347	3347	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-21 01:59:53	2026-04-01 19:44:50.447	Inversion_Bodegas
3348	3348	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-21 02:09:49	2026-04-01 19:44:50.448	Inversion_Bodegas
3349	3349	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-12-21 02:24:33	2026-04-01 19:44:50.449	Inversion_Bodegas
3350	3350	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-12-21 02:32:06	2026-04-01 19:44:50.449	Inversion_Bodegas
3351	3351	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-21 04:04:19	2026-04-01 19:44:50.45	Inversion_Bodegas
3352	3352	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-21 04:37:10	2026-04-01 19:44:50.451	Inversion_Bodegas
3353	3353	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-21 05:09:39	2026-04-01 19:44:50.452	Inversion_Bodegas
3354	3354	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-21 09:41:19	2026-04-01 19:44:50.453	Inversion_Bodegas
3356	3356	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-21 10:56:18	2026-04-01 19:44:50.454	Inversion_Bodegas
3357	3357	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-12-21 11:03:25	2026-04-01 19:44:50.455	Inversion_Bodegas
3358	3358	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-12-21 11:56:40	2026-04-01 19:44:50.456	Tandem_Carrusel_UF+8%
3360	3360	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-12-21 13:39:24	2026-04-01 19:44:50.457	Tandem_Carrusel_UF+8%
3361	3361	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-12-21 13:43:51	2026-04-01 19:44:50.458	Tandem_Carrusel_UF+8%
3362	3362	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-21 13:50:56	2026-04-01 19:44:50.458	Inversion_Bodegas
3363	3363	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-21 15:53:51	2026-04-01 19:44:50.459	Inversion_Bodegas
3364	3364	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-21 16:34:59	2026-04-01 19:44:50.46	Inversion_Bodegas
3365	3365	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-21 16:46:49	2026-04-01 19:44:50.461	Inversion_Bodegas
3366	3366	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-21 16:55:30	2026-04-01 19:44:50.461	Inversion_Bodegas
3367	3367	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-12-21 17:26:31	2026-04-01 19:44:50.462	Tandem_Carrusel_UF+8%
3368	3368	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-12-21 18:05:56	2026-04-01 19:44:50.463	Tandem_Carrusel_UF+8%
3369	3369	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-21 18:55:59	2026-04-01 19:44:50.464	Inversion_Bodegas
3371	3371	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-12-21 20:12:22	2026-04-01 19:44:50.465	Tandem_Carrusel_UF+8%
3372	3372	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-12-21 21:05:21	2026-04-01 19:44:50.466	Tandem_Carrusel_UF+8%
3373	3373	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-21 22:45:57	2026-04-01 19:44:50.467	Inversion_Bodegas
3374	3374	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-21 22:56:35	2026-04-01 19:44:50.468	Inversion_Bodegas
3375	3375	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-21 23:06:38	2026-04-01 19:44:50.469	Inversion_Bodegas
3376	3376	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-21 23:09:50	2026-04-01 19:44:50.469	Tandem_Carrusel_UF+8%
3377	3377	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-21 23:26:03	2026-04-01 19:44:50.47	Inversion_Bodegas
3378	3378	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-12-21 23:56:46	2026-04-01 19:44:50.471	Tandem_Carrusel_UF+8%
3379	3379	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-22 00:12:19	2026-04-01 19:44:50.471	Inversion_Bodegas
3380	3380	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-22 01:00:55	2026-04-01 19:44:50.472	Inversion_Bodegas
3381	3381	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-12-22 01:26:01	2026-04-01 19:44:50.472	Inversion_Bodegas
3382	3382	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-22 01:31:41	2026-04-01 19:44:50.473	Inversion_Bodegas
3383	3383	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-22 02:09:16	2026-04-01 19:44:50.474	Inversion_Bodegas
3384	3384	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-12-22 02:15:04	2026-04-01 19:44:50.474	Tandem_Carrusel_UF+8%
3385	3385	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-22 02:27:36	2026-04-01 19:44:50.475	Inversion_Bodegas
3386	3386	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-12-22 02:29:25	2026-04-01 19:44:50.476	Inversion_Bodegas
3388	3388	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-22 03:02:55	2026-04-01 19:44:50.477	Inversion_Bodegas
3389	3389	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-12-22 03:07:42	2026-04-01 19:44:50.478	Tandem_Carrusel_UF+8%
3392	3392	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-12-22 12:55:33	2026-04-01 19:44:50.48	Tandem_Carrusel_UF+8%
3393	3393	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-22 13:43:42	2026-04-01 19:44:50.481	Inversion_Bodegas
3394	3394	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-22 14:46:51	2026-04-01 19:44:50.482	Inversion_Bodegas
3395	3395	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-12-22 18:16:28	2026-04-01 19:44:50.483	Tandem_Carrusel_UF+8%
3396	3396	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-22 19:37:16	2026-04-01 19:44:50.483	Tandem_Carrusel_UF+8%
3397	3397	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-22 20:37:13	2026-04-01 19:44:50.484	Inversion_Bodegas
3398	3398	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-12-22 21:32:32	2026-04-01 19:44:50.485	Inversion_Bodegas
3400	3400	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-12-23 00:34:24	2026-04-01 19:44:50.486	Tandem_Carrusel_UF+8%
3401	3401	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-12-23 01:47:40	2026-04-01 19:44:50.487	Inversion_Bodegas
3402	3402	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-23 01:52:26	2026-04-01 19:44:50.487	Inversion_Bodegas
3407	3407	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-23 13:28:51	2026-04-01 19:44:50.491	Inversion_Bodegas
3408	3408	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-23 14:29:21	2026-04-01 19:44:50.492	Inversion_Bodegas
3409	3409	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-12-23 16:50:02	2026-04-01 19:44:50.492	Tandem_Carrusel_UF+8%
3410	3410	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-23 17:19:42	2026-04-01 19:44:50.493	Inversion_Bodegas
3411	3411	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-23 18:10:50	2026-04-01 19:44:50.494	Inversion_Bodegas
3413	3413	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-23 18:43:40	2026-04-01 19:44:50.495	Inversion_Bodegas
3414	3414	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-12-23 19:44:53	2026-04-01 19:44:50.496	Tandem_Carrusel_UF+8%
3355	3355	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-09-26 01:46:16	2026-04-13 16:01:17.713	Inversion_Bodegas
3405	3405	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-09-28 21:33:59	2026-04-13 16:01:17.791	Inversion_Bodegas
3404	3404	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-10-13 16:51:25	2026-04-13 16:01:18.147	Inversion_Bodegas
3359	3359	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-10-25 01:16:04	2026-04-13 16:01:18.475	Tandem_Carrusel_UF+8%
3387	3387	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-10-28 22:26:39	2026-04-13 16:01:18.588	Inversion_Bodegas
3399	3399	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-10-30 02:27:04	2026-04-13 16:01:18.607	Inversion_Bodegas
3370	3370	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-02 11:35:09	2026-04-13 16:01:19.121	Inversion_Bodegas
3412	3412	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-12-04 14:29:16	2026-04-13 16:01:19.152	Tandem_Carrusel_UF+8%
3403	3403	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-12-07 12:52:40	2026-04-13 16:01:19.159	Inversion_Bodegas
3406	3406	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-22 02:27:57	2026-04-13 16:01:19.218	Inversion_Bodegas
3391	3391	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-04-10 17:44:57	2026-04-13 16:01:19.664	Inversion_Bodegas
3415	3415	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-23 19:47:26	2026-04-01 19:44:50.497	Inversion_Bodegas
3416	3416	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-23 20:45:31	2026-04-01 19:44:50.497	Inversion_Bodegas
3417	3417	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-23 21:56:33	2026-04-01 19:44:50.498	Inversion_Bodegas
3418	3418	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-24 01:36:36	2026-04-01 19:44:50.498	Inversion_Bodegas
3420	3420	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-12-24 02:12:01	2026-04-01 19:44:50.5	Inversion_Bodegas
3421	3421	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-24 02:16:53	2026-04-01 19:44:50.5	Inversion_Bodegas
3423	3423	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-24 02:25:05	2026-04-01 19:44:50.502	Tandem_Carrusel_UF+8%
3424	3424	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-12-24 02:36:15	2026-04-01 19:44:50.502	Tandem_Carrusel_UF+8%
3425	3425	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-24 02:56:10	2026-04-01 19:44:50.503	Tandem_Carrusel_UF+8%
3426	3426	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-24 03:11:51	2026-04-01 19:44:50.504	Inversion_Bodegas
3427	3427	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-24 03:18:22	2026-04-01 19:44:50.505	Tandem_Carrusel_UF+8%
3428	3428	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-12-24 04:42:26	2026-04-01 19:44:50.505	Inversion_Bodegas
3429	3429	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-12-24 09:41:26	2026-04-01 19:44:50.506	Inversion_Bodegas
3431	3431	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-24 16:08:52	2026-04-01 19:44:50.508	Tandem_Carrusel_UF+8%
3432	3432	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-24 18:50:30	2026-04-01 19:44:50.513	Tandem_Carrusel_UF+8%
3433	3433	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-24 19:22:30	2026-04-01 19:44:50.513	Inversion_Bodegas
3434	3434	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-12-24 20:38:05	2026-04-01 19:44:50.514	Inversion_Bodegas
3435	3435	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-24 21:04:02	2026-04-01 19:44:50.515	Inversion_Bodegas
3436	3436	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-24 21:37:50	2026-04-01 19:44:50.516	Inversion_Bodegas
3437	3437	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-25 00:00:23	2026-04-01 19:44:50.516	Inversion_Bodegas
3438	3438	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-12-25 02:17:39	2026-04-01 19:44:50.517	Inversion_Bodegas
3440	3440	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-25 07:40:57	2026-04-01 19:44:50.52	Inversion_Bodegas
3441	3441	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-25 10:47:01	2026-04-01 19:44:50.521	Inversion_Bodegas
3442	3442	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-25 13:09:08	2026-04-01 19:44:50.521	Inversion_Bodegas
3443	3443	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-25 13:43:00	2026-04-01 19:44:50.522	Inversion_Bodegas
3444	3444	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-12-25 15:07:08	2026-04-01 19:44:50.523	Inversion_Bodegas
3445	3445	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-25 16:00:03	2026-04-01 19:44:50.524	Inversion_Bodegas
3446	3446	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-12-25 17:04:00	2026-04-01 19:44:50.524	Inversion_Bodegas
3447	3447	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-25 17:17:51	2026-04-01 19:44:50.525	Tandem_Carrusel_UF+8%
3448	3448	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-12-25 18:07:38	2026-04-01 19:44:50.526	Inversion_Bodegas
3449	3449	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-25 18:41:05	2026-04-01 19:44:50.526	Tandem_Carrusel_UF+8%
3450	3450	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-25 20:40:31	2026-04-01 19:44:50.527	Tandem_Carrusel_UF+8%
3451	3451	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-25 20:59:15	2026-04-01 19:44:50.528	Inversion_Bodegas
3453	3453	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-25 21:55:52	2026-04-01 19:44:50.529	Inversion_Bodegas
3455	3455	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-12-25 23:28:33	2026-04-01 19:44:50.531	Tandem_Carrusel_UF+8%
3456	3456	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-12-26 00:02:08	2026-04-01 19:44:50.531	Inversion_Bodegas
3457	3457	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-12-26 00:08:59	2026-04-01 19:44:50.532	Inversion_Bodegas
3458	3458	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-26 00:22:57	2026-04-01 19:44:50.533	Inversion_Bodegas
3459	3459	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-12-26 01:20:47	2026-04-01 19:44:50.533	Tandem_Carrusel_UF+8%
3460	3460	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-26 01:22:36	2026-04-01 19:44:50.534	Inversion_Bodegas
3461	3461	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-12-26 01:29:36	2026-04-01 19:44:50.535	Inversion_Bodegas
3462	3462	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-26 03:06:38	2026-04-01 19:44:50.536	Tandem_Carrusel_UF+8%
3463	3463	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-12-26 03:48:55	2026-04-01 19:44:50.536	Tandem_Carrusel_UF+8%
3464	3464	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-12-26 03:55:45	2026-04-01 19:44:50.537	Tandem_Carrusel_UF+8%
3467	3467	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-26 10:34:30	2026-04-01 19:44:50.539	Inversion_Bodegas
3468	3468	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-26 12:47:57	2026-04-01 19:44:50.54	Inversion_Bodegas
3469	3469	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-26 14:13:04	2026-04-01 19:44:50.541	Tandem_Carrusel_UF+8%
3470	3470	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-26 14:28:09	2026-04-01 19:44:50.542	Inversion_Bodegas
3471	3471	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-26 14:33:12	2026-04-01 19:44:50.542	Tandem_Carrusel_UF+8%
3472	3472	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-26 15:08:51	2026-04-01 19:44:50.543	Inversion_Bodegas
3473	3473	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-26 15:46:42	2026-04-01 19:44:50.544	Inversion_Bodegas
3474	3474	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-12-26 16:31:54	2026-04-01 19:44:50.544	Inversion_Bodegas
3475	3475	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-26 16:41:18	2026-04-01 19:44:50.545	Inversion_Bodegas
3476	3476	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-26 17:16:56	2026-04-01 19:44:50.546	Tandem_Carrusel_UF+8%
3478	3478	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-26 18:01:45	2026-04-01 19:44:50.547	Inversion_Bodegas
3479	3479	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-26 18:55:38	2026-04-01 19:44:50.548	Inversion_Bodegas
3481	3481	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-26 21:08:59	2026-04-01 19:44:50.549	Inversion_Bodegas
3482	3482	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-12-26 23:46:01	2026-04-01 19:44:50.55	Tandem_Carrusel_UF+8%
3483	3483	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-12-27 00:52:43	2026-04-01 19:44:50.551	Inversion_Bodegas
3484	3484	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-27 00:57:08	2026-04-01 19:44:50.552	Inversion_Bodegas
3485	3485	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-27 01:29:28	2026-04-01 19:44:50.553	Inversion_Bodegas
3486	3486	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-27 01:40:30	2026-04-01 19:44:50.554	Inversion_Bodegas
3487	3487	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-12-27 01:47:50	2026-04-01 19:44:50.555	Tandem_Carrusel_UF+8%
3488	3488	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-27 01:59:57	2026-04-01 19:44:50.556	Inversion_Bodegas
3489	3489	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-27 02:29:57	2026-04-01 19:44:50.556	Inversion_Bodegas
3430	3430	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-09-12 01:40:11	2026-04-13 16:01:17.308	Inversion_Bodegas
3452	3452	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-09-13 16:48:28	2026-04-13 16:01:17.364	Inversion_Bodegas
3454	3454	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-09-21 09:08:31	2026-04-13 16:01:17.577	Inversion_Bodegas
3466	3466	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-10-14 21:14:46	2026-04-13 16:01:18.195	Tandem_Carrusel_UF+8%
3422	3422	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-10-19 11:59:04	2026-04-13 16:01:18.325	Tandem_Carrusel_UF+8%
3439	3439	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-11-09 10:04:09	2026-04-13 16:01:18.801	Tandem_Carrusel_UF+8%
3419	3419	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-11-19 19:48:17	2026-04-13 16:01:19.006	Inversion_Bodegas
3465	3465	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-31 01:28:22	2026-04-13 16:01:19.189	Inversion_Bodegas
3480	3480	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-04-02 21:37:25	2026-04-13 16:01:19.398	Inversion_Bodegas
3490	3490	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-12-27 02:38:24	2026-04-01 19:44:50.557	Tandem_Carrusel_UF+8%
3491	3491	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-12-27 03:11:05	2026-04-01 19:44:50.558	Inversion_Bodegas
3492	3492	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-12-27 06:23:15	2026-04-01 19:44:50.559	Tandem_Carrusel_UF+8%
3496	3496	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-27 13:56:29	2026-04-01 19:44:50.561	Inversion_Bodegas
3497	3497	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-27 13:57:45	2026-04-01 19:44:50.562	Inversion_Bodegas
3498	3498	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-27 15:12:33	2026-04-01 19:44:50.563	Inversion_Bodegas
3500	3500	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-27 15:41:20	2026-04-01 19:44:50.564	Tandem_Carrusel_UF+8%
3501	3501	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-12-27 17:23:29	2026-04-01 19:44:50.564	Inversion_Bodegas
3502	3502	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-27 17:59:16	2026-04-01 19:44:50.565	Inversion_Bodegas
3503	3503	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-12-27 18:09:31	2026-04-01 19:44:50.566	Inversion_Bodegas
3505	3505	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-27 20:20:46	2026-04-01 19:44:50.567	Tandem_Carrusel_UF+8%
3506	3506	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-27 21:56:38	2026-04-01 19:44:50.567	Inversion_Bodegas
3507	3507	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-27 22:32:36	2026-04-01 19:44:50.568	Tandem_Carrusel_UF+8%
3508	3508	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-12-27 22:42:12	2026-04-01 19:44:50.569	Inversion_Bodegas
3509	3509	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-27 22:58:36	2026-04-01 19:44:50.569	Inversion_Bodegas
3510	3510	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-27 23:15:22	2026-04-01 19:44:50.57	Inversion_Bodegas
3511	3511	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-27 23:55:37	2026-04-01 19:44:50.571	Inversion_Bodegas
3512	3512	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-12-28 00:53:59	2026-04-01 19:44:50.572	Inversion_Bodegas
3513	3513	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-28 00:58:57	2026-04-01 19:44:50.572	Inversion_Bodegas
3514	3514	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-28 01:03:15	2026-04-01 19:44:50.573	Inversion_Bodegas
3515	3515	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-28 01:05:14	2026-04-01 19:44:50.574	Tandem_Carrusel_UF+8%
3516	3516	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-28 01:11:41	2026-04-01 19:44:50.575	Inversion_Bodegas
3517	3517	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-28 01:20:37	2026-04-01 19:44:50.575	Inversion_Bodegas
3518	3518	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-12-28 01:21:19	2026-04-01 19:44:50.576	Inversion_Bodegas
3520	3520	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-28 01:26:14	2026-04-01 19:44:50.577	Inversion_Bodegas
3521	3521	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-12-28 01:33:55	2026-04-01 19:44:50.578	Tandem_Carrusel_UF+8%
3522	3522	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-12-28 01:49:33	2026-04-01 19:44:50.579	Tandem_Carrusel_UF+8%
3523	3523	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-12-28 03:09:53	2026-04-01 19:44:50.58	Inversion_Bodegas
3524	3524	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-12-28 03:23:07	2026-04-01 19:44:50.58	Inversion_Bodegas
3525	3525	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-28 03:32:13	2026-04-01 19:44:50.581	Inversion_Bodegas
3526	3526	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-28 04:42:52	2026-04-01 19:44:50.582	Tandem_Carrusel_UF+8%
3527	3527	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-28 06:54:25	2026-04-01 19:44:50.583	Inversion_Bodegas
3528	3528	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-28 07:24:48	2026-04-01 19:44:50.583	Inversion_Bodegas
3529	3529	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-12-28 08:53:22	2026-04-01 19:44:50.585	Inversion_Bodegas
3530	3530	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-28 09:10:25	2026-04-01 19:44:50.585	Inversion_Bodegas
3531	3531	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-12-28 11:16:27	2026-04-01 19:44:50.586	Tandem_Carrusel_UF+8%
3533	3533	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-28 13:09:30	2026-04-01 19:44:50.587	Tandem_Carrusel_UF+8%
3534	3534	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-12-28 13:36:50	2026-04-01 19:44:50.588	Tandem_Carrusel_UF+8%
3535	3535	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-28 13:39:00	2026-04-01 19:44:50.589	Tandem_Carrusel_UF+8%
3536	3536	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-12-28 14:42:24	2026-04-01 19:44:50.59	Tandem_Carrusel_UF+8%
3537	3537	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-28 15:27:36	2026-04-01 19:44:50.59	Inversion_Bodegas
3539	3539	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-12-28 16:10:30	2026-04-01 19:44:50.592	Inversion_Bodegas
3541	3541	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-28 19:09:17	2026-04-01 19:44:50.593	Inversion_Bodegas
3542	3542	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-28 19:17:29	2026-04-01 19:44:50.593	Inversion_Bodegas
3543	3543	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-28 20:12:46	2026-04-01 19:44:50.594	Tandem_Carrusel_UF+8%
3544	3544	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-28 20:14:18	2026-04-01 19:44:50.594	Tandem_Carrusel_UF+8%
3546	3546	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-12-28 20:51:34	2026-04-01 19:44:50.596	Inversion_Bodegas
3547	3547	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-28 20:56:31	2026-04-01 19:44:50.596	Inversion_Bodegas
3549	3549	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-28 22:10:58	2026-04-01 19:44:50.597	Tandem_Carrusel_UF+8%
3550	3550	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-28 23:55:35	2026-04-01 19:44:50.598	Inversion_Bodegas
3551	3551	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-29 00:04:06	2026-04-01 19:44:50.598	Inversion_Bodegas
3552	3552	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-29 00:37:56	2026-04-01 19:44:50.599	Inversion_Bodegas
3553	3553	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-29 00:57:24	2026-04-01 19:44:50.6	Inversion_Bodegas
3554	3554	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-29 00:58:20	2026-04-01 19:44:50.6	Inversion_Bodegas
3555	3555	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-29 02:22:32	2026-04-01 19:44:50.601	Inversion_Bodegas
3556	3556	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-29 04:09:18	2026-04-01 19:44:50.602	Tandem_Carrusel_UF+8%
3557	3557	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-29 04:19:24	2026-04-01 19:44:50.603	Inversion_Bodegas
3558	3558	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-29 04:50:13	2026-04-01 19:44:50.604	Tandem_Carrusel_UF+8%
3559	3559	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-12-29 05:53:48	2026-04-01 19:44:50.604	Inversion_Bodegas
3560	3560	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-12-29 11:20:36	2026-04-01 19:44:50.605	Tandem_Carrusel_UF+8%
3561	3561	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-12-29 14:06:08	2026-04-01 19:44:50.606	Inversion_Bodegas
3562	3562	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-29 14:42:15	2026-04-01 19:44:50.607	Inversion_Bodegas
3563	3563	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-29 15:12:18	2026-04-01 19:44:50.607	Inversion_Bodegas
3564	3564	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-29 15:43:04	2026-04-01 19:44:50.608	Tandem_Carrusel_UF+8%
3493	3493	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-09-12 21:41:28	2026-04-13 16:01:17.34	Tandem_Carrusel_UF+8%
3548	3548	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-09-14 00:05:50	2026-04-13 16:01:17.371	Inversion_Bodegas
3540	3540	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-09-17 11:56:45	2026-04-13 16:01:17.461	Inversion_Bodegas
3499	3499	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-10-14 09:47:46	2026-04-13 16:01:18.176	Tandem_Carrusel_UF+8%
3538	3538	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-02 23:46:40	2026-04-13 16:01:19.191	Inversion_Bodegas
3504	3504	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-20 21:30:00	2026-04-13 16:01:19.206	Inversion_Bodegas
3495	3495	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-01 22:35:26	2026-04-13 16:01:19.236	Inversion_Bodegas
3519	3519	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-02 02:23:29	2026-04-13 16:01:19.239	Tandem_Carrusel_UF+8%
3494	3494	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-04-11 11:06:44	2026-04-13 16:01:19.684	Inversion_Bodegas
3565	3565	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-12-29 16:45:49	2026-04-01 19:44:50.609	Inversion_Bodegas
3566	3566	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-29 16:48:07	2026-04-01 19:44:50.609	Inversion_Bodegas
3567	3567	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-29 19:36:33	2026-04-01 19:44:50.61	Inversion_Bodegas
3568	3568	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-29 20:53:51	2026-04-01 19:44:50.611	Tandem_Carrusel_UF+8%
3569	3569	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-29 21:36:44	2026-04-01 19:44:50.612	Inversion_Bodegas
3570	3570	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-29 21:55:33	2026-04-01 19:44:50.612	Inversion_Bodegas
3571	3571	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-29 22:42:42	2026-04-01 19:44:50.613	Inversion_Bodegas
3572	3572	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-29 23:00:57	2026-04-01 19:44:50.614	Inversion_Bodegas
3573	3573	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-29 23:46:48	2026-04-01 19:44:50.614	Inversion_Bodegas
3574	3574	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-29 23:59:10	2026-04-01 19:44:50.615	Inversion_Bodegas
3576	3576	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-30 00:13:55	2026-04-01 19:44:50.616	Tandem_Carrusel_UF+8%
3578	3578	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-12-30 01:36:52	2026-04-01 19:44:50.618	Tandem_Carrusel_UF+8%
3579	3579	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-30 02:46:53	2026-04-01 19:44:50.619	Inversion_Bodegas
3580	3580	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-12-30 03:15:48	2026-04-01 19:44:50.619	Tandem_Carrusel_UF+8%
3581	3581	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-30 06:31:32	2026-04-01 19:44:50.62	Inversion_Bodegas
3582	3582	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-30 10:03:20	2026-04-01 19:44:50.621	Inversion_Bodegas
3583	3583	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-12-30 10:37:58	2026-04-01 19:44:50.622	Inversion_Bodegas
3584	3584	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-12-30 11:30:55	2026-04-01 19:44:50.622	Inversion_Bodegas
3585	3585	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-12-30 13:04:12	2026-04-01 19:44:50.623	Inversion_Bodegas
3586	3586	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-30 15:21:12	2026-04-01 19:44:50.624	Inversion_Bodegas
3587	3587	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-30 16:47:27	2026-04-01 19:44:50.624	Inversion_Bodegas
3588	3588	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-30 17:27:04	2026-04-01 19:44:50.625	Tandem_Carrusel_UF+8%
3589	3589	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-30 18:07:08	2026-04-01 19:44:50.626	Tandem_Carrusel_UF+8%
3590	3590	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-30 18:29:36	2026-04-01 19:44:50.626	Tandem_Carrusel_UF+8%
3591	3591	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-12-30 19:32:42	2026-04-01 19:44:50.627	Tandem_Carrusel_UF+8%
3592	3592	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-30 19:50:06	2026-04-01 19:44:50.628	Inversion_Bodegas
3593	3593	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-30 20:06:11	2026-04-01 19:44:50.629	Inversion_Bodegas
3594	3594	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-12-30 20:19:53	2026-04-01 19:44:50.629	Inversion_Bodegas
3595	3595	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-30 21:16:05	2026-04-01 19:44:50.63	Inversion_Bodegas
3596	3596	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-12-30 21:43:42	2026-04-01 19:44:50.631	Inversion_Bodegas
3597	3597	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-30 21:49:13	2026-04-01 19:44:50.632	Inversion_Bodegas
3598	3598	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-30 22:55:58	2026-04-01 19:44:50.632	Tandem_Carrusel_UF+8%
3599	3599	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-31 01:00:14	2026-04-01 19:44:50.633	Tandem_Carrusel_UF+8%
3600	3600	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-31 02:28:49	2026-04-01 19:44:50.634	Inversion_Bodegas
3601	3601	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-31 02:42:45	2026-04-01 19:44:50.635	Inversion_Bodegas
3602	3602	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-31 02:55:31	2026-04-01 19:44:50.636	Inversion_Bodegas
3603	3603	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-31 03:58:36	2026-04-01 19:44:50.636	Inversion_Bodegas
3604	3604	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-31 11:37:39	2026-04-01 19:44:50.637	Inversion_Bodegas
3605	3605	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-31 12:19:31	2026-04-01 19:44:50.638	Inversion_Bodegas
3606	3606	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-31 13:06:20	2026-04-01 19:44:50.639	Inversion_Bodegas
3607	3607	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-31 13:14:34	2026-04-01 19:44:50.639	Inversion_Bodegas
3608	3608	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-31 14:10:36	2026-04-01 19:44:50.64	Inversion_Bodegas
3610	3610	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-31 14:50:09	2026-04-01 19:44:50.642	Inversion_Bodegas
3611	3611	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-31 16:33:17	2026-04-01 19:44:50.642	Inversion_Bodegas
3612	3612	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-31 16:54:32	2026-04-01 19:44:50.643	Tandem_Carrusel_UF+8%
3613	3613	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-31 17:02:23	2026-04-01 19:44:50.644	Tandem_Carrusel_UF+8%
3614	3614	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-31 18:04:35	2026-04-01 19:44:50.645	Tandem_Carrusel_UF+8%
3615	3615	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-31 20:23:52	2026-04-01 19:44:50.645	Tandem_Carrusel_UF+8%
3616	3616	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-12-31 20:24:55	2026-04-01 19:44:50.646	Inversion_Bodegas
3617	3617	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-12-31 20:55:28	2026-04-01 19:44:50.647	Tandem_Carrusel_UF+8%
3618	3618	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-31 21:31:23	2026-04-01 19:44:50.648	Inversion_Bodegas
3619	3619	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-31 22:27:59	2026-04-01 19:44:50.649	Tandem_Carrusel_UF+8%
3620	3620	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-12-31 23:13:17	2026-04-01 19:44:50.649	Tandem_Carrusel_UF+8%
3621	3621	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-31 23:23:24	2026-04-01 19:44:50.65	Inversion_Bodegas
3622	3622	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-31 23:39:59	2026-04-01 19:44:50.651	Inversion_Bodegas
3623	3623	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-31 23:50:19	2026-04-01 19:44:50.652	Inversion_Bodegas
3624	3624	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-01 00:50:10	2026-04-01 19:44:50.652	Inversion_Bodegas
3625	3625	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-01 02:28:58	2026-04-01 19:44:50.653	Inversion_Bodegas
3626	3626	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-01 04:28:37	2026-04-01 19:44:50.654	Inversion_Bodegas
3627	3627	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-01 11:27:43	2026-04-01 19:44:50.655	Inversion_Bodegas
3628	3628	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-01 11:35:39	2026-04-01 19:44:50.655	Inversion_Bodegas
3629	3629	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-01 13:32:17	2026-04-01 19:44:50.656	Inversion_Bodegas
3630	3630	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-01 13:33:43	2026-04-01 19:44:50.657	Tandem_Carrusel_UF+8%
3631	3631	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-01 13:35:16	2026-04-01 19:44:50.658	Tandem_Carrusel_UF+8%
3632	3632	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-01 13:42:08	2026-04-01 19:44:50.658	Tandem_Carrusel_UF+8%
3633	3633	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-01 13:43:10	2026-04-01 19:44:50.659	Tandem_Carrusel_UF+8%
3634	3634	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-01 14:09:53	2026-04-01 19:44:50.66	Inversion_Bodegas
3635	3635	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-01 14:46:11	2026-04-01 19:44:50.661	Tandem_Carrusel_UF+8%
3636	3636	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-01 14:55:57	2026-04-01 19:44:50.662	Inversion_Bodegas
3637	3637	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-01 15:20:33	2026-04-01 19:44:50.662	Tandem_Carrusel_UF+8%
3638	3638	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-01 18:40:47	2026-04-01 19:44:50.663	Inversion_Bodegas
3639	3639	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-01 18:59:28	2026-04-01 19:44:50.664	Inversion_Bodegas
3577	3577	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-09-12 03:19:24	2026-04-13 16:01:17.312	Tandem_Carrusel_UF+8%
3609	3609	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-10-13 02:16:46	2026-04-13 16:01:18.137	Tandem_Carrusel_UF+8%
3640	3640	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-01 19:16:38	2026-04-01 19:44:50.665	Tandem_Carrusel_UF+8%
3643	3643	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-01 20:24:14	2026-04-01 19:44:50.667	Tandem_Carrusel_UF+8%
3644	3644	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-01 20:41:26	2026-04-01 19:44:50.668	Inversion_Bodegas
3645	3645	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-01 20:55:53	2026-04-01 19:44:50.668	Tandem_Carrusel_UF+8%
3646	3646	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-01 20:59:54	2026-04-01 19:44:50.669	Inversion_Bodegas
3647	3647	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-01 21:03:01	2026-04-01 19:44:50.67	Inversion_Bodegas
3648	3648	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-01 21:52:34	2026-04-01 19:44:50.671	Tandem_Carrusel_UF+8%
3649	3649	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-02 01:06:10	2026-04-01 19:44:50.672	Tandem_Carrusel_UF+8%
3650	3650	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-02 01:22:56	2026-04-01 19:44:50.672	Inversion_Bodegas
3651	3651	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-02 01:39:31	2026-04-01 19:44:50.673	Inversion_Bodegas
3652	3652	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-02 02:58:40	2026-04-01 19:44:50.674	Tandem_Carrusel_UF+8%
3654	3654	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-02 05:25:27	2026-04-01 19:44:50.676	Inversion_Bodegas
3655	3655	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-02 09:46:36	2026-04-01 19:44:50.676	Tandem_Carrusel_UF+8%
3656	3656	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-02 10:00:55	2026-04-01 19:44:50.677	Inversion_Bodegas
3657	3657	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-02 11:05:39	2026-04-01 19:44:50.678	Tandem_Carrusel_UF+8%
3658	3658	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-02 11:31:33	2026-04-01 19:44:50.679	Inversion_Bodegas
3659	3659	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-02 13:11:27	2026-04-01 19:44:50.679	Inversion_Bodegas
3660	3660	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-02 13:18:33	2026-04-01 19:44:50.68	Tandem_Carrusel_UF+8%
3661	3661	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-02 15:31:33	2026-04-01 19:44:50.681	Tandem_Carrusel_UF+8%
3662	3662	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-02 15:41:46	2026-04-01 19:44:50.682	Inversion_Bodegas
3663	3663	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-02 16:32:51	2026-04-01 19:44:50.683	Inversion_Bodegas
3664	3664	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-02 18:05:26	2026-04-01 19:44:50.683	Inversion_Bodegas
3665	3665	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-02 18:13:46	2026-04-01 19:44:50.684	Inversion_Bodegas
3666	3666	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-02 18:19:15	2026-04-01 19:44:50.685	Inversion_Bodegas
3667	3667	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-02 19:44:15	2026-04-01 19:44:50.686	Inversion_Bodegas
3668	3668	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-02 20:58:18	2026-04-01 19:44:50.687	Tandem_Carrusel_UF+8%
3669	3669	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-02 22:14:24	2026-04-01 19:44:50.687	Inversion_Bodegas
3670	3670	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-02 22:57:47	2026-04-01 19:44:50.689	Inversion_Bodegas
3671	3671	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-02 22:59:14	2026-04-01 19:44:50.689	Tandem_Carrusel_UF+8%
3672	3672	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-02 23:13:06	2026-04-01 19:44:50.69	Inversion_Bodegas
3673	3673	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-03 00:08:08	2026-04-01 19:44:50.691	Tandem_Carrusel_UF+8%
3674	3674	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-03 01:05:43	2026-04-01 19:44:50.692	Inversion_Bodegas
3675	3675	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-03 01:14:24	2026-04-01 19:44:50.692	Tandem_Carrusel_UF+8%
3676	3676	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-03 01:24:57	2026-04-01 19:44:50.693	Tandem_Carrusel_UF+8%
3677	3677	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-03 01:47:11	2026-04-01 19:44:50.694	Inversion_Bodegas
3678	3678	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-03 01:48:41	2026-04-01 19:44:50.695	Inversion_Bodegas
3680	3680	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-03 02:30:22	2026-04-01 19:44:50.696	Inversion_Bodegas
3681	3681	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-03 03:26:09	2026-04-01 19:44:50.697	Inversion_Bodegas
3682	3682	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-03 05:04:19	2026-04-01 19:44:50.698	Tandem_Carrusel_UF+8%
3683	3683	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-03 12:36:11	2026-04-01 19:44:50.699	Inversion_Bodegas
3684	3684	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-03 13:03:08	2026-04-01 19:44:50.699	Inversion_Bodegas
3685	3685	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-03 16:08:41	2026-04-01 19:44:50.7	Inversion_Bodegas
3686	3686	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-03 16:44:40	2026-04-01 19:44:50.701	Tandem_Carrusel_UF+8%
3688	3688	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-03 17:47:49	2026-04-01 19:44:50.702	Inversion_Bodegas
3689	3689	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-03 17:48:56	2026-04-01 19:44:50.702	Inversion_Bodegas
3690	3690	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-03 17:53:51	2026-04-01 19:44:50.703	Inversion_Bodegas
3691	3691	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-03 18:46:49	2026-04-01 19:44:50.704	Tandem_Carrusel_UF+8%
3692	3692	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-03 18:47:09	2026-04-01 19:44:50.705	Inversion_Bodegas
3693	3693	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-03 20:59:36	2026-04-01 19:44:50.705	Inversion_Bodegas
3694	3694	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-03 21:06:46	2026-04-01 19:44:50.706	Inversion_Bodegas
3695	3695	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-04 00:48:56	2026-04-01 19:44:50.707	Tandem_Carrusel_UF+8%
3696	3696	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-04 01:06:19	2026-04-01 19:44:50.707	Inversion_Bodegas
3698	3698	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-04 01:41:09	2026-04-01 19:44:50.709	Tandem_Carrusel_UF+8%
3699	3699	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-04 02:27:55	2026-04-01 19:44:50.709	Tandem_Carrusel_UF+8%
3700	3700	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-04 04:47:09	2026-04-01 19:44:50.71	Inversion_Bodegas
3701	3701	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-04 05:19:21	2026-04-01 19:44:50.711	Tandem_Carrusel_UF+8%
3703	3703	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-04 11:22:10	2026-04-01 19:44:50.712	Inversion_Bodegas
3704	3704	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-04 11:59:53	2026-04-01 19:44:50.713	Inversion_Bodegas
3705	3705	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-04 12:35:46	2026-04-01 19:44:50.714	Inversion_Bodegas
3706	3706	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-04 13:05:48	2026-04-01 19:44:50.714	Inversion_Bodegas
3707	3707	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-04 14:01:45	2026-04-01 19:44:50.715	Inversion_Bodegas
3709	3709	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-04 14:26:56	2026-04-01 19:44:50.716	Inversion_Bodegas
3710	3710	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-04 14:54:47	2026-04-01 19:44:50.717	Inversion_Bodegas
3711	3711	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-04 15:02:05	2026-04-01 19:44:50.718	Tandem_Carrusel_UF+8%
3712	3712	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-04 15:05:18	2026-04-01 19:44:50.718	Inversion_Bodegas
3713	3713	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-04 15:56:00	2026-04-01 19:44:50.719	Tandem_Carrusel_UF+8%
3714	3714	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-04 16:15:17	2026-04-01 19:44:50.72	Tandem_Carrusel_UF+8%
3653	3653	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-09-15 13:12:27	2026-04-13 16:01:17.404	Inversion_Bodegas
3641	3641	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-09-20 04:10:32	2026-04-13 16:01:17.542	Tandem_Carrusel_UF+8%
3708	3708	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-09-29 01:21:14	2026-04-13 16:01:17.801	Tandem_Carrusel_UF+8%
3687	3687	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-10-13 22:21:48	2026-04-13 16:01:18.159	Tandem_Carrusel_UF+8%
3697	3697	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-10-17 02:03:43	2026-04-13 16:01:18.29	Tandem_Carrusel_UF+8%
3702	3702	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-03-31 03:44:44	2026-04-13 16:01:19.316	Tandem_Carrusel_UF+8%
3642	3642	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-04-06 12:32:00	2026-04-13 16:01:19.514	Tandem_Carrusel_UF+8%
3715	3715	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-04 16:56:47	2026-04-01 19:44:50.72	Inversion_Bodegas
3716	3716	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-04 17:52:54	2026-04-01 19:44:50.721	Inversion_Bodegas
3720	3720	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-04 19:53:16	2026-04-01 19:44:50.724	Tandem_Carrusel_UF+8%
3721	3721	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-04 20:00:05	2026-04-01 19:44:50.725	Tandem_Carrusel_UF+8%
3722	3722	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-04 20:01:24	2026-04-01 19:44:50.725	Inversion_Bodegas
3723	3723	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-04 20:51:42	2026-04-01 19:44:50.726	Tandem_Carrusel_UF+8%
3724	3724	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-04 20:54:39	2026-04-01 19:44:50.727	Inversion_Bodegas
3725	3725	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-04 21:11:55	2026-04-01 19:44:50.728	Inversion_Bodegas
3726	3726	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-04 21:33:44	2026-04-01 19:44:50.728	Inversion_Bodegas
3727	3727	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-04 22:08:55	2026-04-01 19:44:50.729	Inversion_Bodegas
3728	3728	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-05 01:06:37	2026-04-01 19:44:50.73	Inversion_Bodegas
3729	3729	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-05 01:36:03	2026-04-01 19:44:50.731	Inversion_Bodegas
3732	3732	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-05 02:00:53	2026-04-01 19:44:50.733	Inversion_Bodegas
3734	3734	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-05 02:34:40	2026-04-01 19:44:50.734	Inversion_Bodegas
3735	3735	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-05 02:39:25	2026-04-01 19:44:50.735	Inversion_Bodegas
3736	3736	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-05 03:12:25	2026-04-01 19:44:50.736	Inversion_Bodegas
3738	3738	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-05 04:42:13	2026-04-01 19:44:50.738	Inversion_Bodegas
3739	3739	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-05 08:35:47	2026-04-01 19:44:50.738	Inversion_Bodegas
3740	3740	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-05 09:46:30	2026-04-01 19:44:50.739	Inversion_Bodegas
3741	3741	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-05 11:12:42	2026-04-01 19:44:50.74	Tandem_Carrusel_UF+8%
3742	3742	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-05 13:52:50	2026-04-01 19:44:50.741	Inversion_Bodegas
3743	3743	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-05 16:37:28	2026-04-01 19:44:50.741	Inversion_Bodegas
3744	3744	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-05 16:53:49	2026-04-01 19:44:50.742	Inversion_Bodegas
3745	3745	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-05 17:14:21	2026-04-01 19:44:50.743	Inversion_Bodegas
3746	3746	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-05 19:03:20	2026-04-01 19:44:50.744	Inversion_Bodegas
3747	3747	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-05 22:54:53	2026-04-01 19:44:50.744	Inversion_Bodegas
3748	3748	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-05 22:55:51	2026-04-01 19:44:50.745	Tandem_Carrusel_UF+8%
3749	3749	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-06 00:35:44	2026-04-01 19:44:50.746	Inversion_Bodegas
3750	3750	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-06 02:37:05	2026-04-01 19:44:50.747	Tandem_Carrusel_UF+8%
3751	3751	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-06 03:57:16	2026-04-01 19:44:50.748	Inversion_Bodegas
3752	3752	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-06 08:46:58	2026-04-01 19:44:50.748	Inversion_Bodegas
3753	3753	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-06 11:50:42	2026-04-01 19:44:50.749	Tandem_Carrusel_UF+8%
3754	3754	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-06 11:53:20	2026-04-01 19:44:50.75	Tandem_Carrusel_UF+8%
3756	3756	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-06 12:35:40	2026-04-01 19:44:50.752	Inversion_Bodegas
3758	3758	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-06 16:22:51	2026-04-01 19:44:50.753	Inversion_Bodegas
3759	3759	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-06 19:16:48	2026-04-01 19:44:50.754	Tandem_Carrusel_UF+8%
3760	3760	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-06 21:57:57	2026-04-01 19:44:50.755	Inversion_Bodegas
3761	3761	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-06 22:40:17	2026-04-01 19:44:50.755	Tandem_Carrusel_UF+8%
3762	3762	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-06 23:42:08	2026-04-01 19:44:50.756	Inversion_Bodegas
3763	3763	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-07 00:09:36	2026-04-01 19:44:50.757	Inversion_Bodegas
3764	3764	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-07 00:31:19	2026-04-01 19:44:50.758	Inversion_Bodegas
3765	3765	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-07 00:52:19	2026-04-01 19:44:50.759	Inversion_Bodegas
3766	3766	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-07 01:36:12	2026-04-01 19:44:50.76	Inversion_Bodegas
3767	3767	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-07 01:40:52	2026-04-01 19:44:50.761	Inversion_Bodegas
3768	3768	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-07 01:41:20	2026-04-01 19:44:50.761	Tandem_Carrusel_UF+8%
3769	3769	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-07 02:13:36	2026-04-01 19:44:50.762	Inversion_Bodegas
3770	3770	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-07 02:48:10	2026-04-01 19:44:50.763	Tandem_Carrusel_UF+8%
3771	3771	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-07 02:49:57	2026-04-01 19:44:50.764	Inversion_Bodegas
3772	3772	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-07 10:28:04	2026-04-01 19:44:50.764	Tandem_Carrusel_UF+8%
3773	3773	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-07 11:20:11	2026-04-01 19:44:50.765	Inversion_Bodegas
3775	3775	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-07 13:36:22	2026-04-01 19:44:50.767	Inversion_Bodegas
3776	3776	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-07 13:58:19	2026-04-01 19:44:50.768	Tandem_Carrusel_UF+8%
3777	3777	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-07 16:39:44	2026-04-01 19:44:50.769	Inversion_Bodegas
3778	3778	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-07 17:02:50	2026-04-01 19:44:50.769	Inversion_Bodegas
3779	3779	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-07 17:21:20	2026-04-01 19:44:50.77	Inversion_Bodegas
3780	3780	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-07 19:44:28	2026-04-01 19:44:50.771	Inversion_Bodegas
3781	3781	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-07 20:25:03	2026-04-01 19:44:50.772	Tandem_Carrusel_UF+8%
3782	3782	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-07 22:08:40	2026-04-01 19:44:50.773	Inversion_Bodegas
3783	3783	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-07 22:14:07	2026-04-01 19:44:50.773	Tandem_Carrusel_UF+8%
3784	3784	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-07 22:22:57	2026-04-01 19:44:50.774	Inversion_Bodegas
3785	3785	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-07 22:35:30	2026-04-01 19:44:50.775	Tandem_Carrusel_UF+8%
3786	3786	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-07 22:42:20	2026-04-01 19:44:50.776	Inversion_Bodegas
3787	3787	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-07 23:55:08	2026-04-01 19:44:50.776	Inversion_Bodegas
3788	3788	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-07 23:59:35	2026-04-01 19:44:50.777	Inversion_Bodegas
3789	3789	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-08 00:37:46	2026-04-01 19:44:50.778	Inversion_Bodegas
3719	3719	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-09-04 17:45:06	2026-04-13 16:01:17.068	Tandem_Carrusel_UF+8%
3733	3733	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-09-14 12:02:31	2026-04-13 16:01:17.378	Inversion_Bodegas
3718	3718	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-09-16 01:58:13	2026-04-13 16:01:17.423	Tandem_Carrusel_UF+8%
3730	3730	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-09-20 08:03:16	2026-04-13 16:01:17.547	Inversion_Bodegas
3731	3731	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-10-02 01:05:26	2026-04-13 16:01:17.886	Tandem_Carrusel_UF+8%
3757	3757	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-10-13 11:39:20	2026-04-13 16:01:18.142	Tandem_Carrusel_UF+8%
3774	3774	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-11-02 19:27:57	2026-04-13 16:01:18.713	Tandem_Carrusel_UF+8%
3717	3717	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-11-25 20:46:13	2026-04-13 16:01:19.051	Tandem_Carrusel_UF+8%
3737	3737	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-04-06 21:59:43	2026-04-13 16:01:19.533	Inversion_Bodegas
3790	3790	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-08 00:58:36	2026-04-01 19:44:50.779	Tandem_Carrusel_UF+8%
3791	3791	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-08 01:13:14	2026-04-01 19:44:50.78	Tandem_Carrusel_UF+8%
3793	3793	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-08 02:09:19	2026-04-01 19:44:50.781	Inversion_Bodegas
3794	3794	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-08 02:29:44	2026-04-01 19:44:50.782	Tandem_Carrusel_UF+8%
3795	3795	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-08 03:19:55	2026-04-01 19:44:50.783	Inversion_Bodegas
3796	3796	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-08 03:29:25	2026-04-01 19:44:50.784	Inversion_Bodegas
3797	3797	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-08 03:38:32	2026-04-01 19:44:50.785	Inversion_Bodegas
3798	3798	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-08 06:20:32	2026-04-01 19:44:50.785	Tandem_Carrusel_UF+8%
3799	3799	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-08 07:15:52	2026-04-01 19:44:50.786	Inversion_Bodegas
3800	3800	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-08 09:07:33	2026-04-01 19:44:50.787	Tandem_Carrusel_UF+8%
3801	3801	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-08 10:54:40	2026-04-01 19:44:50.788	Tandem_Carrusel_UF+8%
3802	3802	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-08 11:52:10	2026-04-01 19:44:50.788	Inversion_Bodegas
3803	3803	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-08 11:54:47	2026-04-01 19:44:50.789	Inversion_Bodegas
3804	3804	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-08 12:05:05	2026-04-01 19:44:50.79	Tandem_Carrusel_UF+8%
3805	3805	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-08 12:24:57	2026-04-01 19:44:50.791	Inversion_Bodegas
3806	3806	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-08 13:33:35	2026-04-01 19:44:50.791	Inversion_Bodegas
3807	3807	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-08 14:23:03	2026-04-01 19:44:50.792	Tandem_Carrusel_UF+8%
3808	3808	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-08 18:25:36	2026-04-01 19:44:50.793	Inversion_Bodegas
3810	3810	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-08 21:54:58	2026-04-01 19:44:50.795	Tandem_Carrusel_UF+8%
3811	3811	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-08 22:10:00	2026-04-01 19:44:50.795	Inversion_Bodegas
3812	3812	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-08 23:04:19	2026-04-01 19:44:50.796	Tandem_Carrusel_UF+8%
3813	3813	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-09 00:04:02	2026-04-01 19:44:50.797	Inversion_Bodegas
3814	3814	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-09 00:12:39	2026-04-01 19:44:50.798	Inversion_Bodegas
3815	3815	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-09 00:19:10	2026-04-01 19:44:50.799	Inversion_Bodegas
3816	3816	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-09 01:37:52	2026-04-01 19:44:50.799	Tandem_Carrusel_UF+8%
3817	3817	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-09 02:24:51	2026-04-01 19:44:50.8	Tandem_Carrusel_UF+8%
3818	3818	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-09 03:51:34	2026-04-01 19:44:50.801	Inversion_Bodegas
3819	3819	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-09 07:34:46	2026-04-01 19:44:50.802	Inversion_Bodegas
3820	3820	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-09 11:15:50	2026-04-01 19:44:50.803	Tandem_Carrusel_UF+8%
3822	3822	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-09 12:42:16	2026-04-01 19:44:50.804	Tandem_Carrusel_UF+8%
3823	3823	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-09 13:19:17	2026-04-01 19:44:50.805	Tandem_Carrusel_UF+8%
3824	3824	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-09 13:31:57	2026-04-01 19:44:50.806	Inversion_Bodegas
3825	3825	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-09 13:39:58	2026-04-01 19:44:50.807	Inversion_Bodegas
3826	3826	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-09 13:42:09	2026-04-01 19:44:50.807	Inversion_Bodegas
3828	3828	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-09 14:26:10	2026-04-01 19:44:50.809	Inversion_Bodegas
3829	3829	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-09 15:03:12	2026-04-01 19:44:50.81	Inversion_Bodegas
3830	3830	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-09 15:07:25	2026-04-01 19:44:50.811	Tandem_Carrusel_UF+8%
3831	3831	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-09 16:30:03	2026-04-01 19:44:50.811	Tandem_Carrusel_UF+8%
3832	3832	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-09 19:23:14	2026-04-01 19:44:50.812	Tandem_Carrusel_UF+8%
3833	3833	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-09 23:34:00	2026-04-01 19:44:50.813	Inversion_Bodegas
3834	3834	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-10 00:03:25	2026-04-01 19:44:50.814	Tandem_Carrusel_UF+8%
3835	3835	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-10 01:36:19	2026-04-01 19:44:50.815	Tandem_Carrusel_UF+8%
3836	3836	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-10 02:26:07	2026-04-01 19:44:50.816	Tandem_Carrusel_UF+8%
3837	3837	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-10 03:16:44	2026-04-01 19:44:50.816	Inversion_Bodegas
3838	3838	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-10 03:26:14	2026-04-01 19:44:50.817	Inversion_Bodegas
3839	3839	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-10 04:35:30	2026-04-01 19:44:50.818	Inversion_Bodegas
3840	3840	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-10 04:57:15	2026-04-01 19:44:50.819	Tandem_Carrusel_UF+8%
3841	3841	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-10 09:12:55	2026-04-01 19:44:50.819	Inversion_Bodegas
3842	3842	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-10 15:02:33	2026-04-01 19:44:50.82	Inversion_Bodegas
3843	3843	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-10 15:42:25	2026-04-01 19:44:50.821	Tandem_Carrusel_UF+8%
3844	3844	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-10 17:10:49	2026-04-01 19:44:50.822	Tandem_Carrusel_UF+8%
3845	3845	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-10 17:18:11	2026-04-01 19:44:50.822	Inversion_Bodegas
3846	3846	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-10 17:23:01	2026-04-01 19:44:50.823	Tandem_Carrusel_UF+8%
3847	3847	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-10 18:28:12	2026-04-01 19:44:50.824	Inversion_Bodegas
3848	3848	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-10 18:34:48	2026-04-01 19:44:50.825	Tandem_Carrusel_UF+8%
3849	3849	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-10 18:53:34	2026-04-01 19:44:50.825	Tandem_Carrusel_UF+8%
3850	3850	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-10 20:55:16	2026-04-01 19:44:50.826	Tandem_Carrusel_UF+8%
3851	3851	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-10 21:06:05	2026-04-01 19:44:50.827	Tandem_Carrusel_UF+8%
3852	3852	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-10 21:22:24	2026-04-01 19:44:50.828	Tandem_Carrusel_UF+8%
3853	3853	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-10 22:16:33	2026-04-01 19:44:50.829	Inversion_Bodegas
3854	3854	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-10 23:10:46	2026-04-01 19:44:50.83	Inversion_Bodegas
3855	3855	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-11 01:36:08	2026-04-01 19:44:50.831	Inversion_Bodegas
3858	3858	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-11 09:56:40	2026-04-01 19:44:50.833	Tandem_Carrusel_UF+8%
3859	3859	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-11 13:30:49	2026-04-01 19:44:50.834	Inversion_Bodegas
3860	3860	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-11 14:08:05	2026-04-01 19:44:50.835	Inversion_Bodegas
3861	3861	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-11 14:13:03	2026-04-01 19:44:50.835	Tandem_Carrusel_UF+8%
3862	3862	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-11 14:17:46	2026-04-01 19:44:50.836	Inversion_Bodegas
3863	3863	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-11 14:20:37	2026-04-01 19:44:50.837	Inversion_Bodegas
3864	3864	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-11 14:21:16	2026-04-01 19:44:50.838	Inversion_Bodegas
3827	3827	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-10-23 20:19:18	2026-04-13 16:01:18.438	Tandem_Carrusel_UF+8%
3857	3857	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-12 04:58:37	2026-04-13 16:01:19.193	Inversion_Bodegas
3821	3821	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-04-06 23:04:10	2026-04-13 16:01:19.536	Inversion_Bodegas
3865	3865	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-11 16:41:37	2026-04-01 19:44:50.839	Inversion_Bodegas
3866	3866	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-11 17:51:37	2026-04-01 19:44:50.839	Inversion_Bodegas
3867	3867	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-11 18:25:04	2026-04-01 19:44:50.84	Inversion_Bodegas
3868	3868	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-11 18:57:22	2026-04-01 19:44:50.841	Tandem_Carrusel_UF+8%
3869	3869	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-11 21:00:27	2026-04-01 19:44:50.842	Inversion_Bodegas
3870	3870	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-11 21:08:23	2026-04-01 19:44:50.843	Inversion_Bodegas
3871	3871	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-11 21:10:13	2026-04-01 19:44:50.843	Inversion_Bodegas
3872	3872	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-11 21:11:57	2026-04-01 19:44:50.844	Inversion_Bodegas
3873	3873	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-11 21:53:02	2026-04-01 19:44:50.845	Tandem_Carrusel_UF+8%
3874	3874	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-11 22:23:59	2026-04-01 19:44:50.846	Tandem_Carrusel_UF+8%
3875	3875	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-11 22:40:22	2026-04-01 19:44:50.846	Inversion_Bodegas
3876	3876	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-12 00:55:14	2026-04-01 19:44:50.847	Inversion_Bodegas
3877	3877	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-12 01:20:27	2026-04-01 19:44:50.848	Tandem_Carrusel_UF+8%
3878	3878	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-12 01:56:04	2026-04-01 19:44:50.849	Tandem_Carrusel_UF+8%
3879	3879	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-12 02:09:57	2026-04-01 19:44:50.849	Inversion_Bodegas
3880	3880	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-12 03:47:16	2026-04-01 19:44:50.85	Tandem_Carrusel_UF+8%
3881	3881	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-12 13:12:34	2026-04-01 19:44:50.851	Inversion_Bodegas
3882	3882	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-12 13:35:18	2026-04-01 19:44:50.852	Inversion_Bodegas
3883	3883	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-12 15:57:38	2026-04-01 19:44:50.853	Inversion_Bodegas
3884	3884	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-12 17:08:30	2026-04-01 19:44:50.854	Inversion_Bodegas
3885	3885	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-12 17:27:11	2026-04-01 19:44:50.854	Inversion_Bodegas
3886	3886	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-12 17:28:36	2026-04-01 19:44:50.855	Inversion_Bodegas
3887	3887	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-12 19:16:12	2026-04-01 19:44:50.856	Tandem_Carrusel_UF+8%
3888	3888	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-12 20:20:56	2026-04-01 19:44:50.857	Tandem_Carrusel_UF+8%
3889	3889	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-12 20:37:51	2026-04-01 19:44:50.857	Tandem_Carrusel_UF+8%
3890	3890	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-12 20:43:13	2026-04-01 19:44:50.858	Inversion_Bodegas
3891	3891	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-12 21:47:06	2026-04-01 19:44:50.859	Inversion_Bodegas
3892	3892	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-12 22:07:43	2026-04-01 19:44:50.86	Tandem_Carrusel_UF+8%
3893	3893	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-12 22:22:36	2026-04-01 19:44:50.861	Inversion_Bodegas
3894	3894	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-12 23:10:03	2026-04-01 19:44:50.861	Inversion_Bodegas
3895	3895	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-12 23:52:05	2026-04-01 19:44:50.862	Tandem_Carrusel_UF+8%
3896	3896	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-13 01:31:41	2026-04-01 19:44:50.863	Inversion_Bodegas
3897	3897	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-13 01:52:33	2026-04-01 19:44:50.864	Inversion_Bodegas
3898	3898	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-13 09:57:13	2026-04-01 19:44:50.865	Inversion_Bodegas
3899	3899	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-13 10:36:08	2026-04-01 19:44:50.865	Inversion_Bodegas
3900	3900	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-13 12:54:34	2026-04-01 19:44:50.866	Inversion_Bodegas
3901	3901	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-13 13:01:48	2026-04-01 19:44:50.867	Inversion_Bodegas
3902	3902	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-13 14:53:16	2026-04-01 19:44:50.868	Tandem_Carrusel_UF+8%
3903	3903	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-13 15:00:19	2026-04-01 19:44:50.868	Inversion_Bodegas
3904	3904	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-13 15:09:09	2026-04-01 19:44:50.869	Inversion_Bodegas
3905	3905	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-13 16:31:00	2026-04-01 19:44:50.87	Tandem_Carrusel_UF+8%
3906	3906	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-13 17:38:33	2026-04-01 19:44:50.871	Inversion_Bodegas
3907	3907	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-13 18:49:04	2026-04-01 19:44:50.872	Inversion_Bodegas
3908	3908	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-13 20:00:33	2026-04-01 19:44:50.872	Inversion_Bodegas
3909	3909	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-13 21:02:33	2026-04-01 19:44:50.873	Inversion_Bodegas
3910	3910	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-13 21:16:14	2026-04-01 19:44:50.874	Inversion_Bodegas
3911	3911	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-13 21:31:06	2026-04-01 19:44:50.875	Inversion_Bodegas
3912	3912	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-13 22:06:47	2026-04-01 19:44:50.876	Tandem_Carrusel_UF+8%
3913	3913	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-13 23:14:20	2026-04-01 19:44:50.877	Tandem_Carrusel_UF+8%
3914	3914	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-13 23:44:32	2026-04-01 19:44:50.877	Tandem_Carrusel_UF+8%
3915	3915	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-13 23:49:25	2026-04-01 19:44:50.878	Tandem_Carrusel_UF+8%
3916	3916	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-14 00:16:16	2026-04-01 19:44:50.879	Inversion_Bodegas
3917	3917	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-14 00:16:29	2026-04-01 19:44:50.88	Inversion_Bodegas
3918	3918	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-14 00:53:56	2026-04-01 19:44:50.881	Inversion_Bodegas
3919	3919	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-14 04:17:39	2026-04-01 19:44:50.881	Inversion_Bodegas
3920	3920	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-14 04:24:26	2026-04-01 19:44:50.882	Inversion_Bodegas
3921	3921	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-14 09:00:53	2026-04-01 19:44:50.883	Tandem_Carrusel_UF+8%
3922	3922	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-14 11:12:44	2026-04-01 19:44:50.885	Inversion_Bodegas
3923	3923	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-14 11:34:40	2026-04-01 19:44:50.887	Inversion_Bodegas
3924	3924	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-14 11:55:29	2026-04-01 19:44:50.889	Inversion_Bodegas
3925	3925	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-14 12:44:26	2026-04-01 19:44:50.89	Inversion_Bodegas
3926	3926	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-14 14:36:36	2026-04-01 19:44:50.891	Tandem_Carrusel_UF+8%
3928	3928	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-14 16:55:23	2026-04-01 19:44:50.893	Inversion_Bodegas
3929	3929	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-14 17:12:50	2026-04-01 19:44:50.894	Tandem_Carrusel_UF+8%
3930	3930	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-14 19:57:22	2026-04-01 19:44:50.895	Tandem_Carrusel_UF+8%
3931	3931	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-14 20:07:39	2026-04-01 19:44:50.896	Tandem_Carrusel_UF+8%
3932	3932	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-14 20:08:04	2026-04-01 19:44:50.896	Inversion_Bodegas
3933	3933	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-14 20:25:07	2026-04-01 19:44:50.897	Inversion_Bodegas
3934	3934	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-14 20:42:39	2026-04-01 19:44:50.898	Inversion_Bodegas
3936	3936	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-14 21:50:13	2026-04-01 19:44:50.899	Inversion_Bodegas
3937	3937	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-14 22:37:11	2026-04-01 19:44:50.9	Tandem_Carrusel_UF+8%
3938	3938	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-15 00:09:36	2026-04-01 19:44:50.901	Inversion_Bodegas
3939	3939	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-15 01:31:00	2026-04-01 19:44:50.902	Tandem_Carrusel_UF+8%
3927	3927	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-04-10 14:55:06	2026-04-13 16:01:19.661	Tandem_Carrusel_UF+8%
3940	3940	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-15 01:45:17	2026-04-01 19:44:50.902	Tandem_Carrusel_UF+8%
3941	3941	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-15 02:56:23	2026-04-01 19:44:50.903	Inversion_Bodegas
3942	3942	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-15 02:56:47	2026-04-01 19:44:50.904	Tandem_Carrusel_UF+8%
3943	3943	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-15 03:29:10	2026-04-01 19:44:50.905	Inversion_Bodegas
3944	3944	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-15 03:48:44	2026-04-01 19:44:50.906	Inversion_Bodegas
3945	3945	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-15 03:55:19	2026-04-01 19:44:50.906	Inversion_Bodegas
3946	3946	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-15 10:46:45	2026-04-01 19:44:50.907	Inversion_Bodegas
3947	3947	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-15 11:57:33	2026-04-01 19:44:50.908	Tandem_Carrusel_UF+8%
3948	3948	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-15 13:40:23	2026-04-01 19:44:50.908	Inversion_Bodegas
3949	3949	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-15 14:55:09	2026-04-01 19:44:50.909	Tandem_Carrusel_UF+8%
3950	3950	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-15 15:41:47	2026-04-01 19:44:50.91	Tandem_Carrusel_UF+8%
3951	3951	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-15 20:57:11	2026-04-01 19:44:50.91	Inversion_Bodegas
3952	3952	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-15 23:27:48	2026-04-01 19:44:50.911	Tandem_Carrusel_UF+8%
3953	3953	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-15 23:34:54	2026-04-01 19:44:50.912	Inversion_Bodegas
3954	3954	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-15 23:54:44	2026-04-01 19:44:50.913	Tandem_Carrusel_UF+8%
3955	3955	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-16 02:16:59	2026-04-01 19:44:50.914	Inversion_Bodegas
3956	3956	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-16 02:23:20	2026-04-01 19:44:50.914	Inversion_Bodegas
3957	3957	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-16 02:45:07	2026-04-01 19:44:50.915	Inversion_Bodegas
3958	3958	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-16 02:46:31	2026-04-01 19:44:50.916	Inversion_Bodegas
3959	3959	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-16 02:49:50	2026-04-01 19:44:50.917	Inversion_Bodegas
3960	3960	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-16 03:37:56	2026-04-01 19:44:50.917	Tandem_Carrusel_UF+8%
3961	3961	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-16 08:36:30	2026-04-01 19:44:50.918	Inversion_Bodegas
3962	3962	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-16 08:46:35	2026-04-01 19:44:50.919	Inversion_Bodegas
3963	3963	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-16 08:59:14	2026-04-01 19:44:50.919	Inversion_Bodegas
3964	3964	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-16 10:49:23	2026-04-01 19:44:50.92	Inversion_Bodegas
3965	3965	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-16 11:13:45	2026-04-01 19:44:50.921	Tandem_Carrusel_UF+8%
3966	3966	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-16 15:01:49	2026-04-01 19:44:50.922	Inversion_Bodegas
3967	3967	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-16 15:52:32	2026-04-01 19:44:50.922	Tandem_Carrusel_UF+8%
3968	3968	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-16 16:52:11	2026-04-01 19:44:50.923	Inversion_Bodegas
3969	3969	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-16 17:31:20	2026-04-01 19:44:50.924	Inversion_Bodegas
3970	3970	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-16 20:16:34	2026-04-01 19:44:50.925	Tandem_Carrusel_UF+8%
3971	3971	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-16 21:09:07	2026-04-01 19:44:50.925	Inversion_Bodegas
3972	3972	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-16 21:51:54	2026-04-01 19:44:50.926	Inversion_Bodegas
3973	3973	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-16 22:30:38	2026-04-01 19:44:50.927	Inversion_Bodegas
3974	3974	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-16 23:43:13	2026-04-01 19:44:50.928	Tandem_Carrusel_UF+8%
3975	3975	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-16 23:55:02	2026-04-01 19:44:50.929	Inversion_Bodegas
3976	3976	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-17 01:30:30	2026-04-01 19:44:50.929	Inversion_Bodegas
3977	3977	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-17 02:36:36	2026-04-01 19:44:50.93	Inversion_Bodegas
3978	3978	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-17 03:01:24	2026-04-01 19:44:50.931	Inversion_Bodegas
3979	3979	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-17 11:25:06	2026-04-01 19:44:50.932	Tandem_Carrusel_UF+8%
3980	3980	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-17 14:23:50	2026-04-01 19:44:50.932	Tandem_Carrusel_UF+8%
3981	3981	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-17 14:30:51	2026-04-01 19:44:50.933	Inversion_Bodegas
3982	3982	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-17 15:59:00	2026-04-01 19:44:50.934	Tandem_Carrusel_UF+8%
3983	3983	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-17 16:21:59	2026-04-01 19:44:50.935	Inversion_Bodegas
3984	3984	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-17 16:27:05	2026-04-01 19:44:50.936	Inversion_Bodegas
3986	3986	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-17 18:25:13	2026-04-01 19:44:50.937	Tandem_Carrusel_UF+8%
3987	3987	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-17 18:30:42	2026-04-01 19:44:50.938	Inversion_Bodegas
3988	3988	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-17 18:36:19	2026-04-01 19:44:50.939	Tandem_Carrusel_UF+8%
3989	3989	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-17 18:51:48	2026-04-01 19:44:50.939	Tandem_Carrusel_UF+8%
3990	3990	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-17 19:55:44	2026-04-01 19:44:50.94	Tandem_Carrusel_UF+8%
3991	3991	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-17 20:57:33	2026-04-01 19:44:50.941	Inversion_Bodegas
3992	3992	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-17 21:24:16	2026-04-01 19:44:50.942	Inversion_Bodegas
3994	3994	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-17 23:52:08	2026-04-01 19:44:50.943	Tandem_Carrusel_UF+8%
3995	3995	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-17 23:57:53	2026-04-01 19:44:50.944	Inversion_Bodegas
3996	3996	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-18 00:38:25	2026-04-01 19:44:50.945	Inversion_Bodegas
3997	3997	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-18 01:00:24	2026-04-01 19:44:50.946	Inversion_Bodegas
3999	3999	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-18 09:16:31	2026-04-01 19:44:50.947	Inversion_Bodegas
4000	4000	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-18 10:02:44	2026-04-01 19:44:50.948	Inversion_Bodegas
4001	4001	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-18 15:31:32	2026-04-01 19:44:50.949	Tandem_Carrusel_UF+8%
4002	4002	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-18 15:48:49	2026-04-01 19:44:50.95	Inversion_Bodegas
4003	4003	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-18 16:40:29	2026-04-01 19:44:50.951	Inversion_Bodegas
4004	4004	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-18 17:22:26	2026-04-01 19:44:50.952	Tandem_Carrusel_UF+8%
4005	4005	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-18 18:21:34	2026-04-01 19:44:50.952	Tandem_Carrusel_UF+8%
4006	4006	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-18 19:04:02	2026-04-01 19:44:50.953	Inversion_Bodegas
4007	4007	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-18 19:04:58	2026-04-01 19:44:50.954	Tandem_Carrusel_UF+8%
4008	4008	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-18 19:44:22	2026-04-01 19:44:50.955	Inversion_Bodegas
4009	4009	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-18 20:15:46	2026-04-01 19:44:50.956	Tandem_Carrusel_UF+8%
4010	4010	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-18 20:18:42	2026-04-01 19:44:50.956	Inversion_Bodegas
4011	4011	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-18 20:30:01	2026-04-01 19:44:50.957	Inversion_Bodegas
4012	4012	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-18 20:48:54	2026-04-01 19:44:50.958	Inversion_Bodegas
4013	4013	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-18 20:53:07	2026-04-01 19:44:50.959	Tandem_Carrusel_UF+8%
3985	3985	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-09-20 02:09:03	2026-04-13 16:01:17.538	Tandem_Carrusel_UF+8%
4014	4014	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-10-04 11:24:04	2026-04-13 16:01:17.964	Tandem_Carrusel_UF+8%
3993	3993	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-04 23:45:06	2026-04-13 16:01:19.261	Tandem_Carrusel_UF+8%
4015	4015	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-18 23:05:48	2026-04-01 19:44:50.96	Inversion_Bodegas
4016	4016	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-18 23:16:09	2026-04-01 19:44:50.961	Inversion_Bodegas
4017	4017	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-18 23:31:29	2026-04-01 19:44:50.962	Inversion_Bodegas
4018	4018	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-19 00:10:22	2026-04-01 19:44:50.963	Tandem_Carrusel_UF+8%
4019	4019	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-19 00:21:24	2026-04-01 19:44:50.963	Tandem_Carrusel_UF+8%
4020	4020	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-19 00:53:50	2026-04-01 19:44:50.964	Inversion_Bodegas
4021	4021	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-19 01:29:20	2026-04-01 19:44:50.965	Tandem_Carrusel_UF+8%
4022	4022	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-19 01:45:18	2026-04-01 19:44:50.966	Tandem_Carrusel_UF+8%
4023	4023	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-19 01:47:04	2026-04-01 19:44:50.967	Tandem_Carrusel_UF+8%
4024	4024	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-19 02:08:47	2026-04-01 19:44:50.967	Inversion_Bodegas
4025	4025	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-19 02:46:35	2026-04-01 19:44:50.968	Tandem_Carrusel_UF+8%
4026	4026	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-19 03:12:39	2026-04-01 19:44:50.969	Tandem_Carrusel_UF+8%
4028	4028	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-19 03:40:55	2026-04-01 19:44:50.971	Inversion_Bodegas
4029	4029	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-19 04:08:08	2026-04-01 19:44:50.971	Inversion_Bodegas
4030	4030	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-19 05:03:48	2026-04-01 19:44:50.972	Inversion_Bodegas
4032	4032	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-19 12:08:01	2026-04-01 19:44:50.974	Inversion_Bodegas
4033	4033	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-19 12:35:53	2026-04-01 19:44:50.975	Inversion_Bodegas
4034	4034	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-19 13:09:48	2026-04-01 19:44:50.976	Inversion_Bodegas
4035	4035	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-19 15:51:02	2026-04-01 19:44:50.977	Inversion_Bodegas
4036	4036	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-19 21:26:20	2026-04-01 19:44:50.977	Tandem_Carrusel_UF+8%
4037	4037	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-19 22:40:32	2026-04-01 19:44:50.978	Tandem_Carrusel_UF+8%
4038	4038	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-19 23:33:49	2026-04-01 19:44:50.98	Tandem_Carrusel_UF+8%
4039	4039	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-20 01:03:00	2026-04-01 19:44:50.98	Inversion_Bodegas
4040	4040	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-20 03:26:34	2026-04-01 19:44:50.981	Inversion_Bodegas
4041	4041	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-20 16:40:31	2026-04-01 19:44:50.982	Inversion_Bodegas
4042	4042	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-20 19:50:17	2026-04-01 19:44:50.983	Inversion_Bodegas
4043	4043	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-20 19:57:55	2026-04-01 19:44:50.983	Tandem_Carrusel_UF+8%
4044	4044	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-20 20:15:40	2026-04-01 19:44:50.984	Tandem_Carrusel_UF+8%
4045	4045	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-20 20:22:42	2026-04-01 19:44:50.985	Inversion_Bodegas
4046	4046	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-20 22:52:00	2026-04-01 19:44:50.986	Tandem_Carrusel_UF+8%
4047	4047	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-21 00:08:38	2026-04-01 19:44:50.987	Tandem_Carrusel_UF+8%
4048	4048	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-21 01:45:42	2026-04-01 19:44:50.987	Tandem_Carrusel_UF+8%
4049	4049	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-21 01:48:10	2026-04-01 19:44:50.988	Inversion_Bodegas
4050	4050	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-21 02:55:25	2026-04-01 19:44:50.989	Tandem_Carrusel_UF+8%
4052	4052	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-21 05:39:39	2026-04-01 19:44:50.991	Tandem_Carrusel_UF+8%
4053	4053	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-21 14:05:08	2026-04-01 19:44:50.991	Tandem_Carrusel_UF+8%
4054	4054	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-21 14:26:38	2026-04-01 19:44:50.992	Tandem_Carrusel_UF+8%
4055	4055	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-21 17:44:02	2026-04-01 19:44:50.993	Tandem_Carrusel_UF+8%
4056	4056	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-21 18:38:11	2026-04-01 19:44:50.994	Tandem_Carrusel_UF+8%
4057	4057	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-21 18:52:01	2026-04-01 19:44:50.995	Tandem_Carrusel_UF+8%
4058	4058	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-21 19:57:09	2026-04-01 19:44:50.995	Inversion_Bodegas
4059	4059	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-21 20:15:23	2026-04-01 19:44:50.996	Inversion_Bodegas
4060	4060	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-21 23:54:45	2026-04-01 19:44:50.997	Tandem_Carrusel_UF+8%
4063	4063	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-22 01:29:52	2026-04-01 19:44:51	Tandem_Carrusel_UF+8%
4064	4064	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-22 01:34:04	2026-04-01 19:44:51.001	Tandem_Carrusel_UF+8%
4065	4065	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-22 02:17:40	2026-04-01 19:44:51.002	Tandem_Carrusel_UF+8%
4066	4066	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-22 03:49:42	2026-04-01 19:44:51.002	Inversion_Bodegas
4067	4067	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-22 05:57:52	2026-04-01 19:44:51.003	Tandem_Carrusel_UF+8%
4068	4068	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-22 07:37:19	2026-04-01 19:44:51.003	Inversion_Bodegas
4069	4069	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-22 08:50:33	2026-04-01 19:44:51.004	Inversion_Bodegas
4070	4070	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-22 14:34:27	2026-04-01 19:44:51.005	Tandem_Carrusel_UF+8%
4071	4071	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-22 19:46:22	2026-04-01 19:44:51.005	Inversion_Bodegas
4072	4072	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-22 21:58:40	2026-04-01 19:44:51.006	Tandem_Carrusel_UF+8%
4073	4073	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-23 00:29:38	2026-04-01 19:44:51.007	Inversion_Bodegas
4074	4074	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-23 01:35:51	2026-04-01 19:44:51.008	Tandem_Carrusel_UF+8%
4076	4076	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-23 02:48:08	2026-04-01 19:44:51.009	Inversion_Bodegas
4077	4077	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-23 03:08:18	2026-04-01 19:44:51.01	Inversion_Bodegas
4078	4078	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-23 03:12:16	2026-04-01 19:44:51.011	Inversion_Bodegas
4079	4079	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-23 03:31:52	2026-04-01 19:44:51.012	Inversion_Bodegas
4080	4080	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-23 03:49:50	2026-04-01 19:44:51.012	Inversion_Bodegas
4081	4081	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-23 07:31:02	2026-04-01 19:44:51.013	Tandem_Carrusel_UF+8%
4082	4082	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-23 14:46:05	2026-04-01 19:44:51.014	Tandem_Carrusel_UF+8%
4084	4084	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-23 15:47:48	2026-04-01 19:44:51.015	Inversion_Bodegas
4085	4085	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-23 19:32:16	2026-04-01 19:44:51.016	Tandem_Carrusel_UF+8%
4086	4086	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-23 21:16:50	2026-04-01 19:44:51.017	Tandem_Carrusel_UF+8%
4087	4087	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-23 21:37:24	2026-04-01 19:44:51.018	Tandem_Carrusel_UF+8%
4088	4088	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-23 21:40:26	2026-04-01 19:44:51.018	Inversion_Bodegas
4089	4089	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-23 21:54:30	2026-04-01 19:44:51.019	Tandem_Carrusel_UF+8%
4031	4031	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-22 01:19:33	2026-04-13 16:01:19.215	Tandem_Carrusel_UF+8%
4051	4051	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-22 11:31:55	2026-04-13 16:01:19.22	Inversion_Bodegas
4090	4090	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-24 00:22:35	2026-04-13 16:01:19.234	Tandem_Carrusel_UF+8%
4061	4061	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-04-01 14:46:09	2026-04-13 16:01:19.365	Tandem_Carrusel_UF+8%
4062	4062	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-04-11 14:46:37	2026-04-13 16:01:19.689	Tandem_Carrusel_UF+8%
4091	4091	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-24 02:03:49	2026-04-01 19:44:51.021	Inversion_Bodegas
4092	4092	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-24 03:27:49	2026-04-01 19:44:51.022	Tandem_Carrusel_UF+8%
4093	4093	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-24 04:07:31	2026-04-01 19:44:51.022	Tandem_Carrusel_UF+8%
4094	4094	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-24 04:11:19	2026-04-01 19:44:51.023	Inversion_Bodegas
4095	4095	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-24 10:17:56	2026-04-01 19:44:51.024	Inversion_Bodegas
4096	4096	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-24 11:17:08	2026-04-01 19:44:51.025	Tandem_Carrusel_UF+8%
4097	4097	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-24 12:40:51	2026-04-01 19:44:51.026	Inversion_Bodegas
4098	4098	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-24 13:21:16	2026-04-01 19:44:51.026	Inversion_Bodegas
4099	4099	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-24 13:35:21	2026-04-01 19:44:51.027	Inversion_Bodegas
4100	4100	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-24 16:43:46	2026-04-01 19:44:51.028	Inversion_Bodegas
4101	4101	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-24 17:13:55	2026-04-01 19:44:51.029	Inversion_Bodegas
4103	4103	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-24 17:54:34	2026-04-01 19:44:51.03	Tandem_Carrusel_UF+8%
4104	4104	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-24 18:05:17	2026-04-01 19:44:51.031	Tandem_Carrusel_UF+8%
4105	4105	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-24 18:13:45	2026-04-01 19:44:51.032	Inversion_Bodegas
4106	4106	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-24 20:39:01	2026-04-01 19:44:51.033	Tandem_Carrusel_UF+8%
4107	4107	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-24 21:25:14	2026-04-01 19:44:51.033	Tandem_Carrusel_UF+8%
4108	4108	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-24 21:25:30	2026-04-01 19:44:51.034	Inversion_Bodegas
4109	4109	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-24 22:11:00	2026-04-01 19:44:51.035	Inversion_Bodegas
4110	4110	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-24 22:16:36	2026-04-01 19:44:51.036	Inversion_Bodegas
4111	4111	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-25 01:11:22	2026-04-01 19:44:51.036	Inversion_Bodegas
4112	4112	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-25 01:28:54	2026-04-01 19:44:51.037	Tandem_Carrusel_UF+8%
4113	4113	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-25 01:58:12	2026-04-01 19:44:51.038	Inversion_Bodegas
4114	4114	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-25 02:48:08	2026-04-01 19:44:51.039	Inversion_Bodegas
4115	4115	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-25 03:17:49	2026-04-01 19:44:51.039	Inversion_Bodegas
4116	4116	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-25 03:43:07	2026-04-01 19:44:51.04	Tandem_Carrusel_UF+8%
4117	4117	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-25 10:24:33	2026-04-01 19:44:51.041	Inversion_Bodegas
4118	4118	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-25 10:58:47	2026-04-01 19:44:51.042	Tandem_Carrusel_UF+8%
4119	4119	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-25 12:46:06	2026-04-01 19:44:51.042	Tandem_Carrusel_UF+8%
4120	4120	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-25 12:48:44	2026-04-01 19:44:51.043	Tandem_Carrusel_UF+8%
4121	4121	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-25 13:04:24	2026-04-01 19:44:51.044	Tandem_Carrusel_UF+8%
4122	4122	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-25 13:25:39	2026-04-01 19:44:51.045	Tandem_Carrusel_UF+8%
4123	4123	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-25 13:27:40	2026-04-01 19:44:51.046	Inversion_Bodegas
4124	4124	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-25 13:51:06	2026-04-01 19:44:51.047	Inversion_Bodegas
4125	4125	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-25 14:05:28	2026-04-01 19:44:51.047	Tandem_Carrusel_UF+8%
4126	4126	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-25 14:53:04	2026-04-01 19:44:51.048	Inversion_Bodegas
4127	4127	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-25 16:22:14	2026-04-01 19:44:51.049	Inversion_Bodegas
4130	4130	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-25 18:17:42	2026-04-01 19:44:51.051	Inversion_Bodegas
4131	4131	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-25 20:08:08	2026-04-01 19:44:51.052	Inversion_Bodegas
4132	4132	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-25 20:26:19	2026-04-01 19:44:51.053	Inversion_Bodegas
4133	4133	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-25 21:27:52	2026-04-01 19:44:51.054	Inversion_Bodegas
4134	4134	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-25 21:42:07	2026-04-01 19:44:51.054	Inversion_Bodegas
4135	4135	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-25 23:12:42	2026-04-01 19:44:51.055	Inversion_Bodegas
4136	4136	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-26 00:39:50	2026-04-01 19:44:51.056	Inversion_Bodegas
4137	4137	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-26 01:33:21	2026-04-01 19:44:51.057	Tandem_Carrusel_UF+8%
4138	4138	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-26 01:46:12	2026-04-01 19:44:51.058	Tandem_Carrusel_UF+8%
4139	4139	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-26 02:12:10	2026-04-01 19:44:51.059	Inversion_Bodegas
4140	4140	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-26 03:45:11	2026-04-01 19:44:51.059	Tandem_Carrusel_UF+8%
4141	4141	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-26 07:24:20	2026-04-01 19:44:51.06	Tandem_Carrusel_UF+8%
4142	4142	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-26 10:15:40	2026-04-01 19:44:51.061	Tandem_Carrusel_UF+8%
4143	4143	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-26 10:32:53	2026-04-01 19:44:51.062	Inversion_Bodegas
4144	4144	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-26 11:18:35	2026-04-01 19:44:51.063	Tandem_Carrusel_UF+8%
4145	4145	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-26 13:27:01	2026-04-01 19:44:51.064	Tandem_Carrusel_UF+8%
4146	4146	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-26 13:28:33	2026-04-01 19:44:51.065	Inversion_Bodegas
4148	4148	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-26 14:41:17	2026-04-01 19:44:51.066	Tandem_Carrusel_UF+8%
4149	4149	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-26 15:00:03	2026-04-01 19:44:51.067	Inversion_Bodegas
4150	4150	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-26 15:27:04	2026-04-01 19:44:51.068	Tandem_Carrusel_UF+8%
4151	4151	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-26 15:40:04	2026-04-01 19:44:51.069	Inversion_Bodegas
4153	4153	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-26 16:23:22	2026-04-01 19:44:51.07	Inversion_Bodegas
4154	4154	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-26 17:49:27	2026-04-01 19:44:51.071	Inversion_Bodegas
4155	4155	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-26 18:08:27	2026-04-01 19:44:51.072	Tandem_Carrusel_UF+8%
4156	4156	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-26 18:34:23	2026-04-01 19:44:51.073	Tandem_Carrusel_UF+8%
4157	4157	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-26 18:59:57	2026-04-01 19:44:51.074	Inversion_Bodegas
4158	4158	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-26 20:33:16	2026-04-01 19:44:51.074	Tandem_Carrusel_UF+8%
4159	4159	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-26 21:02:37	2026-04-01 19:44:51.075	Inversion_Bodegas
4160	4160	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-26 22:15:47	2026-04-01 19:44:51.076	Inversion_Bodegas
4162	4162	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-26 23:15:18	2026-04-01 19:44:51.078	Inversion_Bodegas
4163	4163	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-26 23:16:01	2026-04-01 19:44:51.078	Inversion_Bodegas
4164	4164	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-26 23:57:44	2026-04-01 19:44:51.079	Inversion_Bodegas
4165	4165	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-27 00:42:36	2026-04-01 19:44:51.08	Inversion_Bodegas
4102	4102	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-09-08 17:33:35	2026-04-13 16:01:17.209	Tandem_Carrusel_UF+8%
4128	4128	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-10-12 11:23:03	2026-04-13 16:01:18.116	Tandem_Carrusel_UF+8%
4147	4147	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-11-02 03:58:19	2026-04-13 16:01:18.681	Tandem_Carrusel_UF+8%
4152	4152	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-02 15:14:42	2026-04-13 16:01:19.242	Inversion_Bodegas
4166	4166	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-27 01:16:33	2026-04-01 19:44:51.081	Tandem_Carrusel_UF+8%
4167	4167	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-27 02:17:01	2026-04-01 19:44:51.082	Inversion_Bodegas
4169	4169	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-27 03:10:05	2026-04-01 19:44:51.083	Inversion_Bodegas
4170	4170	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-27 03:13:57	2026-04-01 19:44:51.084	Tandem_Carrusel_UF+8%
4171	4171	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-27 03:37:47	2026-04-01 19:44:51.085	Tandem_Carrusel_UF+8%
4172	4172	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-27 11:42:24	2026-04-01 19:44:51.086	Inversion_Bodegas
4173	4173	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-27 15:00:20	2026-04-01 19:44:51.087	Tandem_Carrusel_UF+8%
4174	4174	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-27 16:00:31	2026-04-01 19:44:51.088	Tandem_Carrusel_UF+8%
4175	4175	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-27 16:20:24	2026-04-01 19:44:51.088	Tandem_Carrusel_UF+8%
4177	4177	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-27 19:20:33	2026-04-01 19:44:51.09	Tandem_Carrusel_UF+8%
4178	4178	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-27 19:25:22	2026-04-01 19:44:51.091	Inversion_Bodegas
4179	4179	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-28 02:21:57	2026-04-01 19:44:51.092	Inversion_Bodegas
4181	4181	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-28 05:54:38	2026-04-01 19:44:51.093	Tandem_Carrusel_UF+8%
4182	4182	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-28 08:52:56	2026-04-01 19:44:51.094	Tandem_Carrusel_UF+8%
4183	4183	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-28 10:00:17	2026-04-01 19:44:51.095	Tandem_Carrusel_UF+8%
4184	4184	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-28 10:05:21	2026-04-01 19:44:51.096	Tandem_Carrusel_UF+8%
4185	4185	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-28 11:41:10	2026-04-01 19:44:51.097	Tandem_Carrusel_UF+8%
4186	4186	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-28 12:53:00	2026-04-01 19:44:51.097	Inversion_Bodegas
4187	4187	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-28 13:11:27	2026-04-01 19:44:51.098	Tandem_Carrusel_UF+8%
4190	4190	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-28 16:45:17	2026-04-01 19:44:51.101	Inversion_Bodegas
4191	4191	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-28 17:55:38	2026-04-01 19:44:51.102	Tandem_Carrusel_UF+8%
4192	4192	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-28 18:21:08	2026-04-01 19:44:51.102	Inversion_Bodegas
4193	4193	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-28 19:03:55	2026-04-01 19:44:51.103	Inversion_Bodegas
4194	4194	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-28 20:23:45	2026-04-01 19:44:51.104	Inversion_Bodegas
4195	4195	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-28 22:06:12	2026-04-01 19:44:51.105	Inversion_Bodegas
4196	4196	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-28 22:31:18	2026-04-01 19:44:51.106	Tandem_Carrusel_UF+8%
4197	4197	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-28 22:43:41	2026-04-01 19:44:51.106	Inversion_Bodegas
4198	4198	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-29 00:49:02	2026-04-01 19:44:51.107	Inversion_Bodegas
4199	4199	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-29 00:54:13	2026-04-01 19:44:51.108	Tandem_Carrusel_UF+8%
4200	4200	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-29 01:44:47	2026-04-01 19:44:51.109	Inversion_Bodegas
4201	4201	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-29 02:48:54	2026-04-01 19:44:51.11	Inversion_Bodegas
4202	4202	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-29 02:57:28	2026-04-01 19:44:51.111	Inversion_Bodegas
4203	4203	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-29 03:07:02	2026-04-01 19:44:51.111	Tandem_Carrusel_UF+8%
4204	4204	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-29 03:37:25	2026-04-01 19:44:51.112	Tandem_Carrusel_UF+8%
4205	4205	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-29 04:21:13	2026-04-01 19:44:51.113	Tandem_Carrusel_UF+8%
4206	4206	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-29 11:28:32	2026-04-01 19:44:51.114	Tandem_Carrusel_UF+8%
4207	4207	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-29 12:37:43	2026-04-01 19:44:51.115	Tandem_Carrusel_UF+8%
4208	4208	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-29 13:42:11	2026-04-01 19:44:51.116	Tandem_Carrusel_UF+8%
4209	4209	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-29 15:22:06	2026-04-01 19:44:51.116	Tandem_Carrusel_UF+8%
4210	4210	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-29 17:27:00	2026-04-01 19:44:51.117	Tandem_Carrusel_UF+8%
4211	4211	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-29 18:27:08	2026-04-01 19:44:51.118	Tandem_Carrusel_UF+8%
4212	4212	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-29 18:53:21	2026-04-01 19:44:51.119	Inversion_Bodegas
4213	4213	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-29 19:24:35	2026-04-01 19:44:51.119	Inversion_Bodegas
4214	4214	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-29 23:31:43	2026-04-01 19:44:51.12	Inversion_Bodegas
4215	4215	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-29 23:57:19	2026-04-01 19:44:51.121	Tandem_Carrusel_UF+8%
4216	4216	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-30 01:53:33	2026-04-01 19:44:51.122	Tandem_Carrusel_UF+8%
4217	4217	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-30 02:30:39	2026-04-01 19:44:51.123	Inversion_Bodegas
4218	4218	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-30 02:44:09	2026-04-01 19:44:51.123	Inversion_Bodegas
4219	4219	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-30 02:46:03	2026-04-01 19:44:51.124	Inversion_Bodegas
4220	4220	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-30 03:19:47	2026-04-01 19:44:51.125	Inversion_Bodegas
4221	4221	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-30 03:20:58	2026-04-01 19:44:51.126	Inversion_Bodegas
4222	4222	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-30 03:36:12	2026-04-01 19:44:51.127	Inversion_Bodegas
4223	4223	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-30 03:51:34	2026-04-01 19:44:51.128	Inversion_Bodegas
4224	4224	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-30 03:56:27	2026-04-01 19:44:51.129	Tandem_Carrusel_UF+8%
4225	4225	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-30 05:16:52	2026-04-01 19:44:51.129	Inversion_Bodegas
4226	4226	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-30 05:47:50	2026-04-01 19:44:51.13	Inversion_Bodegas
4227	4227	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-30 07:13:49	2026-04-01 19:44:51.131	Tandem_Carrusel_UF+8%
4228	4228	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-30 09:16:28	2026-04-01 19:44:51.132	Tandem_Carrusel_UF+8%
4229	4229	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-30 09:30:08	2026-04-01 19:44:51.133	Tandem_Carrusel_UF+8%
4230	4230	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-30 11:02:15	2026-04-01 19:44:51.133	Tandem_Carrusel_UF+8%
4231	4231	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-30 11:08:18	2026-04-01 19:44:51.134	Tandem_Carrusel_UF+8%
4232	4232	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-30 11:14:27	2026-04-01 19:44:51.135	Inversion_Bodegas
4233	4233	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-30 11:51:41	2026-04-01 19:44:51.136	Tandem_Carrusel_UF+8%
4234	4234	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-30 13:05:33	2026-04-01 19:44:51.137	Tandem_Carrusel_UF+8%
4235	4235	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-30 14:50:44	2026-04-01 19:44:51.137	Tandem_Carrusel_UF+8%
4236	4236	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-30 14:54:57	2026-04-01 19:44:51.138	Tandem_Carrusel_UF+8%
4237	4237	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-30 15:19:09	2026-04-01 19:44:51.139	Inversion_Bodegas
4238	4238	\N	\N	\N	PERDIDO	\N	\N	\N	2026-01-30 17:15:30	2026-04-01 19:44:51.14	\N
4241	4241	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-30 22:15:26	2026-04-01 19:44:51.142	Tandem_Carrusel_UF+8%
4189	4189	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-11-07 18:34:11	2026-04-13 16:01:18.778	Inversion_Bodegas
4240	4240	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-20 01:59:15	2026-04-13 16:01:19.199	Inversion_Bodegas
4168	4168	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-22 13:46:01	2026-04-13 16:01:19.223	Inversion_Bodegas
4176	4176	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-02 21:15:31	2026-04-13 16:01:19.244	Tandem_Carrusel_UF+8%
4239	4239	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-25 17:35:46	2026-04-13 16:01:19.283	Tandem_Carrusel_UF+8%
4243	4243	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-31 02:46:36	2026-04-01 19:44:51.144	Inversion_Bodegas
4244	4244	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-31 11:23:50	2026-04-01 19:44:51.145	Inversion_Bodegas
4245	4245	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-31 12:02:11	2026-04-01 19:44:51.146	Tandem_Carrusel_UF+8%
4247	4247	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-31 13:32:58	2026-04-01 19:44:51.148	Inversion_Bodegas
4248	4248	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-31 14:14:28	2026-04-01 19:44:51.149	Inversion_Bodegas
4249	4249	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-31 14:31:17	2026-04-01 19:44:51.149	Inversion_Bodegas
4250	4250	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-31 16:29:14	2026-04-01 19:44:51.15	Inversion_Bodegas
4251	4251	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-31 17:21:55	2026-04-01 19:44:51.151	Tandem_Carrusel_UF+8%
4252	4252	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-31 17:23:18	2026-04-01 19:44:51.152	Inversion_Bodegas
4253	4253	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-31 18:47:54	2026-04-01 19:44:51.153	Inversion_Bodegas
4254	4254	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-31 20:28:58	2026-04-01 19:44:51.154	Inversion_Bodegas
4255	4255	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-31 20:58:54	2026-04-01 19:44:51.154	Inversion_Bodegas
4256	4256	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-31 21:31:47	2026-04-01 19:44:51.155	Inversion_Bodegas
4257	4257	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-01-31 21:45:19	2026-04-01 19:44:51.156	Inversion_Bodegas
4258	4258	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-01-31 23:21:09	2026-04-01 19:44:51.157	Tandem_Carrusel_UF+8%
4259	4259	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-01 03:28:36	2026-04-01 19:44:51.158	Inversion_Bodegas
4260	4260	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-01 04:37:16	2026-04-01 19:44:51.158	Tandem_Carrusel_UF+8%
4261	4261	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-01 04:58:57	2026-04-01 19:44:51.159	Inversion_Bodegas
4262	4262	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-01 08:30:37	2026-04-01 19:44:51.16	Inversion_Bodegas
4263	4263	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-01 11:11:00	2026-04-01 19:44:51.161	Tandem_Carrusel_UF+8%
4264	4264	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-01 13:10:02	2026-04-01 19:44:51.162	Tandem_Carrusel_UF+8%
4265	4265	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-01 13:15:28	2026-04-01 19:44:51.162	Inversion_Bodegas
4266	4266	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-01 13:30:47	2026-04-01 19:44:51.165	Inversion_Bodegas
4267	4267	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-01 13:31:08	2026-04-01 19:44:51.166	Inversion_Bodegas
4268	4268	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-01 13:48:21	2026-04-01 19:44:51.167	Tandem_Carrusel_UF+8%
4269	4269	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-01 16:59:59	2026-04-01 19:44:51.168	Inversion_Bodegas
4270	4270	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-01 18:40:39	2026-04-01 19:44:51.169	Tandem_Carrusel_UF+8%
4272	4272	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-01 22:16:03	2026-04-01 19:44:51.17	Inversion_Bodegas
4273	4273	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-01 23:45:48	2026-04-01 19:44:51.171	Inversion_Bodegas
4275	4275	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-02 01:48:55	2026-04-01 19:44:51.172	Tandem_Carrusel_UF+8%
4276	4276	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-02 02:02:04	2026-04-01 19:44:51.173	Tandem_Carrusel_UF+8%
4277	4277	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-02 02:58:52	2026-04-01 19:44:51.174	Inversion_Bodegas
4279	4279	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-02-02 12:45:35	2026-04-01 19:44:51.176	Tandem_Carrusel_UF+8%
4280	4280	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-02 14:02:35	2026-04-01 19:44:51.176	Tandem_Carrusel_UF+8%
4281	4281	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-02 14:53:39	2026-04-01 19:44:51.177	Tandem_Carrusel_UF+8%
4282	4282	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-02 16:26:39	2026-04-01 19:44:51.178	Tandem_Carrusel_UF+8%
4283	4283	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-02 16:50:04	2026-04-01 19:44:51.179	Tandem_Carrusel_UF+8%
4284	4284	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-02 20:37:44	2026-04-01 19:44:51.18	Tandem_Carrusel_UF+8%
4285	4285	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-03 00:40:37	2026-04-01 19:44:51.18	Tandem_Carrusel_UF+8%
4286	4286	\N	\N	\N	PERDIDO	\N	\N	\N	2026-02-03 01:51:15	2026-04-01 19:44:51.181	\N
4287	4287	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-03 01:57:44	2026-04-01 19:44:51.182	Inversion_Bodegas
4288	4288	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-03 02:43:53	2026-04-01 19:44:51.183	Tandem_Carrusel_UF+8%
4289	4289	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-03 03:04:14	2026-04-01 19:44:51.184	Tandem_Carrusel_UF+8%
4290	4290	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-03 08:41:54	2026-04-01 19:44:51.185	Tandem_Carrusel_UF+8%
4291	4291	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-02-03 10:19:45	2026-04-01 19:44:51.186	Inversion_Bodegas
4292	4292	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-03 14:47:28	2026-04-01 19:44:51.186	Tandem_Carrusel_UF+8%
4293	4293	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-03 17:46:26	2026-04-01 19:44:51.187	Inversion_Bodegas
4294	4294	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-02-03 18:19:36	2026-04-01 19:44:51.188	Tandem_Carrusel_UF+8%
4295	4295	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-03 19:03:50	2026-04-01 19:44:51.189	Inversion_Bodegas
4296	4296	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-04 02:02:52	2026-04-01 19:44:51.19	Tandem_Carrusel_UF+8%
4297	4297	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-04 04:27:31	2026-04-01 19:44:51.191	Inversion_Bodegas
4298	4298	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-04 18:13:55	2026-04-01 19:44:51.192	Tandem_Carrusel_UF+8%
4299	4299	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-02-04 19:03:11	2026-04-01 19:44:51.192	Inversion_Bodegas
4300	4300	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-02-04 19:43:17	2026-04-01 19:44:51.193	Tandem_Carrusel_UF+8%
4301	4301	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-04 22:16:55	2026-04-01 19:44:51.194	Inversion_Bodegas
4302	4302	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-04 22:59:51	2026-04-01 19:44:51.195	Tandem_Carrusel_UF+8%
4303	4303	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-04 23:53:22	2026-04-01 19:44:51.196	Tandem_Carrusel_UF+8%
4304	4304	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-02-05 00:39:00	2026-04-01 19:44:51.197	Inversion_Bodegas
4305	4305	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-05 02:05:43	2026-04-01 19:44:51.197	Tandem_Carrusel_UF+8%
4306	4306	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-05 09:04:19	2026-04-01 19:44:51.198	Tandem_Carrusel_UF+8%
4307	4307	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-05 09:17:32	2026-04-01 19:44:51.199	Tandem_Carrusel_UF+8%
4308	4308	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-02-05 16:00:13	2026-04-01 19:44:51.2	Tandem_Carrusel_UF+8%
4309	4309	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-05 20:02:26	2026-04-01 19:44:51.2	Inversion_Bodegas
4310	4310	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-05 21:27:06	2026-04-01 19:44:51.201	Tandem_Carrusel_UF+8%
4311	4311	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-02-06 00:18:52	2026-04-01 19:44:51.202	Tandem_Carrusel_UF+8%
4312	4312	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-02-06 00:19:27	2026-04-01 19:44:51.203	Inversion_Bodegas
4313	4313	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-06 02:11:34	2026-04-01 19:44:51.204	Inversion_Bodegas
4314	4314	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-02-06 03:06:46	2026-04-01 19:44:51.204	Inversion_Bodegas
4316	4316	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-06 06:09:41	2026-04-01 19:44:51.206	Inversion_Bodegas
4317	4317	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-02-06 10:57:51	2026-04-01 19:44:51.207	Inversion_Bodegas
4318	4318	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-06 11:17:08	2026-04-01 19:44:51.208	Inversion_Bodegas
4278	4278	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-31 01:58:56	2026-04-13 16:01:19.313	Tandem_Carrusel_UF+8%
4246	4246	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-04-03 20:15:56	2026-04-13 16:01:19.423	Inversion_Bodegas
4319	4319	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-02-06 12:07:20	2026-04-01 19:44:51.208	Inversion_Bodegas
4320	4320	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-06 12:08:46	2026-04-01 19:44:51.209	Tandem_Carrusel_UF+8%
4321	4321	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-06 13:56:41	2026-04-01 19:44:51.21	Inversion_Bodegas
4322	4322	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-06 16:18:51	2026-04-01 19:44:51.211	Inversion_Bodegas
4323	4323	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-02-06 16:44:02	2026-04-01 19:44:51.212	Inversion_Bodegas
4324	4324	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-06 19:00:11	2026-04-01 19:44:51.213	Inversion_Bodegas
4325	4325	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-02-06 19:26:53	2026-04-01 19:44:51.214	Inversion_Bodegas
4326	4326	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-06 20:03:41	2026-04-01 19:44:51.214	Inversion_Bodegas
4327	4327	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-06 21:02:32	2026-04-01 19:44:51.215	Inversion_Bodegas
4328	4328	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-02-07 05:23:36	2026-04-01 19:44:51.216	Inversion_Bodegas
4329	4329	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-07 10:36:38	2026-04-01 19:44:51.217	Tandem_Carrusel_UF+8%
4330	4330	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-07 11:39:01	2026-04-01 19:44:51.218	Tandem_Carrusel_UF+8%
4331	4331	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-02-07 12:17:02	2026-04-01 19:44:51.218	Tandem_Carrusel_UF+8%
4332	4332	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-07 12:25:31	2026-04-01 19:44:51.219	Inversion_Bodegas
4333	4333	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-07 13:21:24	2026-04-01 19:44:51.22	Tandem_Carrusel_UF+8%
4334	4334	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-07 14:01:04	2026-04-01 19:44:51.221	Tandem_Carrusel_UF+8%
4335	4335	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-07 14:03:30	2026-04-01 19:44:51.222	Tandem_Carrusel_UF+8%
4337	4337	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-07 14:54:21	2026-04-01 19:44:51.224	Tandem_Carrusel_UF+8%
4339	4339	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-02-07 15:47:08	2026-04-01 19:44:51.225	Inversion_Bodegas
4340	4340	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-07 16:28:36	2026-04-01 19:44:51.226	Inversion_Bodegas
4341	4341	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-07 17:09:39	2026-04-01 19:44:51.227	Inversion_Bodegas
4342	4342	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-07 21:26:28	2026-04-01 19:44:51.228	Tandem_Carrusel_UF+8%
4343	4343	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-08 01:51:17	2026-04-01 19:44:51.228	Inversion_Bodegas
4344	4344	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-08 02:40:29	2026-04-01 19:44:51.229	Tandem_Carrusel_UF+8%
4345	4345	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-02-08 05:23:51	2026-04-01 19:44:51.23	Inversion_Bodegas
4346	4346	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-02-08 06:05:31	2026-04-01 19:44:51.231	Inversion_Bodegas
4347	4347	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-08 09:25:26	2026-04-01 19:44:51.232	Inversion_Bodegas
4348	4348	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-02-08 12:02:12	2026-04-01 19:44:51.233	Inversion_Bodegas
4349	4349	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-08 13:07:25	2026-04-01 19:44:51.233	Inversion_Bodegas
4350	4350	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-08 13:12:35	2026-04-01 19:44:51.234	Tandem_Carrusel_UF+8%
4351	4351	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-02-08 13:17:25	2026-04-01 19:44:51.235	Inversion_Bodegas
4352	4352	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-08 14:42:53	2026-04-01 19:44:51.236	Tandem_Carrusel_UF+8%
4353	4353	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-08 14:53:38	2026-04-01 19:44:51.237	Inversion_Bodegas
4354	4354	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-08 15:08:00	2026-04-01 19:44:51.237	Inversion_Bodegas
4355	4355	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-02-08 16:34:19	2026-04-01 19:44:51.238	Inversion_Bodegas
4356	4356	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-08 17:15:04	2026-04-01 19:44:51.239	Inversion_Bodegas
4357	4357	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-02-08 17:18:21	2026-04-01 19:44:51.24	Inversion_Bodegas
4358	4358	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-08 17:23:14	2026-04-01 19:44:51.241	Inversion_Bodegas
4359	4359	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-08 17:48:49	2026-04-01 19:44:51.242	Inversion_Bodegas
4360	4360	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-02-08 17:50:04	2026-04-01 19:44:51.243	Inversion_Bodegas
4361	4361	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-02-08 20:34:06	2026-04-01 19:44:51.244	Tandem_Carrusel_UF+8%
4362	4362	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-08 20:45:51	2026-04-01 19:44:51.244	Tandem_Carrusel_UF+8%
4363	4363	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-09 02:07:56	2026-04-01 19:44:51.245	Inversion_Bodegas
4364	4364	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-02-09 04:17:02	2026-04-01 19:44:51.246	Tandem_Carrusel_UF+8%
4365	4365	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-09 04:45:11	2026-04-01 19:44:51.247	Inversion_Bodegas
4366	4366	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-09 10:31:28	2026-04-01 19:44:51.248	Inversion_Bodegas
4367	4367	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-02-09 11:53:37	2026-04-01 19:44:51.248	Inversion_Bodegas
4368	4368	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-09 13:26:13	2026-04-01 19:44:51.249	Inversion_Bodegas
4369	4369	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-09 15:08:28	2026-04-01 19:44:51.25	Inversion_Bodegas
4370	4370	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-09 15:20:23	2026-04-01 19:44:51.251	Tandem_Carrusel_UF+8%
4371	4371	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-09 18:20:57	2026-04-01 19:44:51.252	Inversion_Bodegas
4372	4372	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-09 20:47:40	2026-04-01 19:44:51.253	Inversion_Bodegas
4373	4373	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-09 20:53:06	2026-04-01 19:44:51.253	Inversion_Bodegas
4374	4374	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-02-09 22:47:00	2026-04-01 19:44:51.254	Tandem_Carrusel_UF+8%
4375	4375	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-09 23:16:30	2026-04-01 19:44:51.255	Tandem_Carrusel_UF+8%
4376	4376	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-02-10 00:14:40	2026-04-01 19:44:51.256	Tandem_Carrusel_UF+8%
4377	4377	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-02-10 02:36:16	2026-04-01 19:44:51.256	Tandem_Carrusel_UF+8%
4378	4378	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-02-10 03:22:59	2026-04-01 19:44:51.257	Inversion_Bodegas
4379	4379	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-02-10 07:20:49	2026-04-01 19:44:51.258	Tandem_Carrusel_UF+8%
4380	4380	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-10 10:15:47	2026-04-01 19:44:51.259	Tandem_Carrusel_UF+8%
4381	4381	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-10 11:00:39	2026-04-01 19:44:51.26	Tandem_Carrusel_UF+8%
4382	4382	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-02-10 12:25:39	2026-04-01 19:44:51.26	Tandem_Carrusel_UF+8%
4383	4383	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-10 18:28:16	2026-04-01 19:44:51.261	Tandem_Carrusel_UF+8%
4384	4384	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-10 18:49:14	2026-04-01 19:44:51.262	Inversion_Bodegas
4385	4385	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-02-10 21:07:24	2026-04-01 19:44:51.263	Inversion_Bodegas
4386	4386	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-10 21:11:53	2026-04-01 19:44:51.263	Inversion_Bodegas
4387	4387	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-02-10 21:33:48	2026-04-01 19:44:51.264	Tandem_Carrusel_UF+8%
4388	4388	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-02-10 22:06:11	2026-04-01 19:44:51.265	Inversion_Bodegas
4389	4389	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-02-11 01:31:15	2026-04-01 19:44:51.265	Inversion_Bodegas
4390	4390	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-11 02:08:51	2026-04-01 19:44:51.266	Inversion_Bodegas
4391	4391	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-11 02:25:34	2026-04-01 19:44:51.267	Inversion_Bodegas
4392	4392	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-11 02:26:39	2026-04-01 19:44:51.268	Inversion_Bodegas
4393	4393	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-11 02:54:38	2026-04-01 19:44:51.269	Inversion_Bodegas
4338	4338	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-11-26 22:59:04	2026-04-13 16:01:19.066	Tandem_Carrusel_UF+8%
4394	4394	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-11 03:12:23	2026-04-01 19:44:51.269	Inversion_Bodegas
4395	4395	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-11 09:11:40	2026-04-01 19:44:51.27	Inversion_Bodegas
4396	4396	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-11 10:49:43	2026-04-01 19:44:51.271	Inversion_Bodegas
4397	4397	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-11 11:34:18	2026-04-01 19:44:51.272	Inversion_Bodegas
4398	4398	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-11 13:08:39	2026-04-01 19:44:51.273	Inversion_Bodegas
4399	4399	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-11 13:25:51	2026-04-01 19:44:51.273	Inversion_Bodegas
4400	4400	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-11 13:40:55	2026-04-01 19:44:51.274	Inversion_Bodegas
4401	4401	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-11 14:25:49	2026-04-01 19:44:51.275	Tandem_Carrusel_UF+8%
4403	4403	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-11 17:19:37	2026-04-01 19:44:51.276	Inversion_Bodegas
4405	4405	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-12 02:33:39	2026-04-01 19:44:51.278	Inversion_Bodegas
4406	4406	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-12 02:53:37	2026-04-01 19:44:51.279	Inversion_Bodegas
4407	4407	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-02-12 05:41:06	2026-04-01 19:44:51.28	Inversion_Bodegas
4408	4408	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-12 07:04:01	2026-04-01 19:44:51.281	Inversion_Bodegas
4409	4409	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-12 08:05:51	2026-04-01 19:44:51.282	Inversion_Bodegas
4410	4410	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-02-12 12:51:52	2026-04-01 19:44:51.283	Inversion_Bodegas
4411	4411	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-02-12 13:53:54	2026-04-01 19:44:51.283	Tandem_Carrusel_UF+8%
4412	4412	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-02-12 14:58:04	2026-04-01 19:44:51.284	Inversion_Bodegas
4415	4415	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-12 18:39:59	2026-04-01 19:44:51.287	Inversion_Bodegas
4416	4416	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-12 19:08:34	2026-04-01 19:44:51.288	Tandem_Carrusel_UF+8%
4417	4417	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-12 20:24:20	2026-04-01 19:44:51.289	Inversion_Bodegas
4418	4418	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-12 20:34:19	2026-04-01 19:44:51.289	Inversion_Bodegas
4419	4419	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-12 21:11:07	2026-04-01 19:44:51.29	Inversion_Bodegas
4420	4420	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-02-12 21:40:04	2026-04-01 19:44:51.291	Tandem_Carrusel_UF+8%
4421	4421	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-12 21:40:13	2026-04-01 19:44:51.292	Inversion_Bodegas
4422	4422	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-12 21:53:57	2026-04-01 19:44:51.293	Inversion_Bodegas
4423	4423	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-02-12 22:56:05	2026-04-01 19:44:51.294	Inversion_Bodegas
4424	4424	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-02-12 23:24:54	2026-04-01 19:44:51.294	Tandem_Carrusel_UF+8%
4425	4425	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-12 23:50:32	2026-04-01 19:44:51.295	Inversion_Bodegas
4426	4426	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-13 01:20:00	2026-04-01 19:44:51.296	Tandem_Carrusel_UF+8%
4427	4427	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-13 01:44:06	2026-04-01 19:44:51.297	Inversion_Bodegas
4428	4428	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-13 02:31:28	2026-04-01 19:44:51.298	Inversion_Bodegas
4430	4430	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-13 03:16:10	2026-04-01 19:44:51.299	Inversion_Bodegas
4431	4431	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-02-13 03:49:43	2026-04-01 19:44:51.3	Inversion_Bodegas
4432	4432	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-13 11:38:30	2026-04-01 19:44:51.301	Inversion_Bodegas
4433	4433	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-02-13 15:10:00	2026-04-01 19:44:51.302	Inversion_Bodegas
4434	4434	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-13 18:50:29	2026-04-01 19:44:51.303	Tandem_Carrusel_UF+8%
4435	4435	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-13 19:51:44	2026-04-01 19:44:51.304	Inversion_Bodegas
4436	4436	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-02-13 20:17:01	2026-04-01 19:44:51.304	Inversion_Bodegas
4438	4438	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-13 21:41:32	2026-04-01 19:44:51.306	Inversion_Bodegas
4439	4439	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-14 03:04:28	2026-04-01 19:44:51.307	Inversion_Bodegas
4440	4440	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-14 04:19:40	2026-04-01 19:44:51.308	Inversion_Bodegas
4441	4441	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-14 05:34:32	2026-04-01 19:44:51.309	Tandem_Carrusel_UF+8%
4442	4442	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-14 10:54:46	2026-04-01 19:44:51.309	Inversion_Bodegas
4443	4443	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-14 11:18:38	2026-04-01 19:44:51.31	Inversion_Bodegas
4444	4444	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-14 13:25:04	2026-04-01 19:44:51.311	Inversion_Bodegas
4445	4445	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-14 14:06:26	2026-04-01 19:44:51.312	Tandem_Carrusel_UF+8%
4446	4446	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-14 15:23:31	2026-04-01 19:44:51.313	Tandem_Carrusel_UF+8%
4447	4447	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-14 15:37:51	2026-04-01 19:44:51.314	Inversion_Bodegas
4448	4448	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-14 16:10:41	2026-04-01 19:44:51.314	Inversion_Bodegas
4449	4449	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-14 16:26:39	2026-04-01 19:44:51.315	Inversion_Bodegas
4450	4450	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-14 16:38:44	2026-04-01 19:44:51.316	Inversion_Bodegas
4452	4452	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-14 18:34:10	2026-04-01 19:44:51.318	Inversion_Bodegas
4453	4453	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-14 23:26:29	2026-04-01 19:44:51.319	Inversion_Bodegas
4454	4454	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-02-15 00:50:34	2026-04-01 19:44:51.32	Inversion_Bodegas
4455	4455	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-02-15 01:01:11	2026-04-01 19:44:51.32	Inversion_Bodegas
4456	4456	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-02-15 01:39:44	2026-04-01 19:44:51.321	Inversion_Bodegas
4457	4457	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-15 01:40:11	2026-04-01 19:44:51.322	Inversion_Bodegas
4458	4458	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-02-15 02:56:37	2026-04-01 19:44:51.323	Inversion_Bodegas
4459	4459	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-02-15 03:57:22	2026-04-01 19:44:51.324	Tandem_Carrusel_UF+8%
4460	4460	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-15 04:39:18	2026-04-01 19:44:51.325	Inversion_Bodegas
4461	4461	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-02-15 05:05:31	2026-04-01 19:44:51.326	Inversion_Bodegas
4462	4462	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-15 05:35:25	2026-04-01 19:44:51.326	Tandem_Carrusel_UF+8%
4463	4463	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-15 08:12:13	2026-04-01 19:44:51.327	Tandem_Carrusel_UF+8%
4464	4464	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-15 10:45:58	2026-04-01 19:44:51.328	Inversion_Bodegas
4465	4465	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-15 10:57:09	2026-04-01 19:44:51.329	Tandem_Carrusel_UF+8%
4466	4466	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-15 12:22:07	2026-04-01 19:44:51.33	Tandem_Carrusel_UF+8%
4467	4467	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-15 14:48:07	2026-04-01 19:44:51.331	Tandem_Carrusel_UF+8%
4468	4468	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-15 16:49:57	2026-04-01 19:44:51.331	Inversion_Bodegas
4451	4451	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-09-04 16:56:39	2026-04-13 16:01:17.06	Inversion_Bodegas
4414	4414	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-09-29 01:56:59	2026-04-13 16:01:17.811	Inversion_Bodegas
4429	4429	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-04-08 01:29:11	2026-04-13 16:01:19.567	Inversion_Bodegas
4402	4402	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-04-08 02:43:55	2026-04-13 16:01:19.574	Tandem_Carrusel_UF+8%
4413	4413	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-04-09 00:40:26	2026-04-13 16:01:19.613	Inversion_Bodegas
4404	4404	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-04-12 18:05:07	2026-04-13 16:01:19.716	Inversion_Bodegas
4469	4469	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-15 17:00:15	2026-04-01 19:44:51.332	Tandem_Carrusel_UF+8%
4470	4470	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-15 18:41:54	2026-04-01 19:44:51.333	Inversion_Bodegas
4471	4471	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-15 20:15:19	2026-04-01 19:44:51.334	Tandem_Carrusel_UF+8%
4472	4472	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-15 22:20:41	2026-04-01 19:44:51.335	Inversion_Bodegas
4473	4473	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-15 23:33:57	2026-04-01 19:44:51.336	Inversion_Bodegas
4474	4474	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-02-15 23:47:32	2026-04-01 19:44:51.337	Tandem_Carrusel_UF+8%
4476	4476	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-16 01:15:20	2026-04-01 19:44:51.338	Inversion_Bodegas
4477	4477	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-16 01:34:30	2026-04-01 19:44:51.339	Tandem_Carrusel_UF+8%
4478	4478	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-16 02:27:15	2026-04-01 19:44:51.34	Tandem_Carrusel_UF+8%
4479	4479	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-02-16 09:02:13	2026-04-01 19:44:51.341	Inversion_Bodegas
4480	4480	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-16 12:53:40	2026-04-01 19:44:51.341	Tandem_Carrusel_UF+8%
4481	4481	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-16 13:46:59	2026-04-01 19:44:51.342	Tandem_Carrusel_UF+8%
4484	4484	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-16 16:00:29	2026-04-01 19:44:51.345	Tandem_Carrusel_UF+8%
4485	4485	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-16 18:47:00	2026-04-01 19:44:51.346	Inversion_Bodegas
4486	4486	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-16 19:13:42	2026-04-01 19:44:51.346	Inversion_Bodegas
4487	4487	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-02-16 20:55:05	2026-04-01 19:44:51.348	Inversion_Bodegas
4488	4488	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-02-16 22:42:35	2026-04-01 19:44:51.348	Inversion_Bodegas
4489	4489	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-17 01:17:20	2026-04-01 19:44:51.349	Inversion_Bodegas
4490	4490	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-17 02:46:48	2026-04-01 19:44:51.35	Inversion_Bodegas
4491	4491	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-17 03:15:10	2026-04-01 19:44:51.351	Inversion_Bodegas
4492	4492	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-17 03:24:48	2026-04-01 19:44:51.352	Inversion_Bodegas
4493	4493	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-02-17 04:17:54	2026-04-01 19:44:51.353	Tandem_Carrusel_UF+8%
4494	4494	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-17 11:03:27	2026-04-01 19:44:51.353	Inversion_Bodegas
4495	4495	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-17 11:20:42	2026-04-01 19:44:51.354	Inversion_Bodegas
4496	4496	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-17 12:06:33	2026-04-01 19:44:51.355	Tandem_Carrusel_UF+8%
4497	4497	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-17 12:26:48	2026-04-01 19:44:51.356	Inversion_Bodegas
4498	4498	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-17 13:08:19	2026-04-01 19:44:51.357	Inversion_Bodegas
4499	4499	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-17 13:29:49	2026-04-01 19:44:51.357	Inversion_Bodegas
4500	4500	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-17 13:47:05	2026-04-01 19:44:51.359	Inversion_Bodegas
4501	4501	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-17 15:45:36	2026-04-01 19:44:51.36	Inversion_Bodegas
4502	4502	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-17 17:26:16	2026-04-01 19:44:51.36	Inversion_Bodegas
4503	4503	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-17 18:46:57	2026-04-01 19:44:51.361	Inversion_Bodegas
4504	4504	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-17 19:21:28	2026-04-01 19:44:51.362	Inversion_Bodegas
4505	4505	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-02-17 20:07:27	2026-04-01 19:44:51.363	Inversion_Bodegas
4506	4506	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-02-17 20:51:19	2026-04-01 19:44:51.364	Tandem_Carrusel_UF+8%
4507	4507	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-02-17 20:58:44	2026-04-01 19:44:51.365	Inversion_Bodegas
4509	4509	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-17 22:41:10	2026-04-01 19:44:51.366	Inversion_Bodegas
4510	4510	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-17 23:23:43	2026-04-01 19:44:51.367	Tandem_Carrusel_UF+8%
4511	4511	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-17 23:52:23	2026-04-01 19:44:51.368	Tandem_Carrusel_UF+8%
4512	4512	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-18 01:05:52	2026-04-01 19:44:51.369	Tandem_Carrusel_UF+8%
4513	4513	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-02-18 01:07:38	2026-04-01 19:44:51.37	Tandem_Carrusel_UF+8%
4514	4514	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-18 01:30:58	2026-04-01 19:44:51.37	Inversion_Bodegas
4515	4515	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-18 01:53:15	2026-04-01 19:44:51.371	Inversion_Bodegas
4516	4516	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-18 03:48:59	2026-04-01 19:44:51.372	Inversion_Bodegas
4517	4517	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-18 04:37:32	2026-04-01 19:44:51.373	Inversion_Bodegas
4518	4518	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-18 09:25:32	2026-04-01 19:44:51.374	Inversion_Bodegas
4519	4519	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-18 11:40:06	2026-04-01 19:44:51.374	Tandem_Carrusel_UF+8%
4520	4520	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-18 11:58:53	2026-04-01 19:44:51.375	Inversion_Bodegas
4521	4521	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-18 15:12:18	2026-04-01 19:44:51.376	Tandem_Carrusel_UF+8%
4522	4522	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-18 19:23:05	2026-04-01 19:44:51.377	Inversion_Bodegas
4523	4523	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-18 19:55:12	2026-04-01 19:44:51.378	Inversion_Bodegas
4524	4524	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-18 20:17:11	2026-04-01 19:44:51.379	Tandem_Carrusel_UF+8%
4525	4525	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-02-19 00:08:21	2026-04-01 19:44:51.38	Inversion_Bodegas
4526	4526	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-19 00:49:59	2026-04-01 19:44:51.38	Inversion_Bodegas
4527	4527	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-19 00:55:24	2026-04-01 19:44:51.381	Inversion_Bodegas
4528	4528	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-19 01:11:22	2026-04-01 19:44:51.382	Inversion_Bodegas
4529	4529	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-19 01:14:50	2026-04-01 19:44:51.383	Inversion_Bodegas
4530	4530	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-19 02:07:25	2026-04-01 19:44:51.384	Inversion_Bodegas
4531	4531	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-02-19 03:23:51	2026-04-01 19:44:51.385	Inversion_Bodegas
4532	4532	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-19 03:29:29	2026-04-01 19:44:51.386	Inversion_Bodegas
4534	4534	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-02-19 06:22:25	2026-04-01 19:44:51.387	Tandem_Carrusel_UF+8%
4535	4535	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-19 12:13:01	2026-04-01 19:44:51.388	Tandem_Carrusel_UF+8%
4536	4536	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-02-19 12:42:44	2026-04-01 19:44:51.389	Inversion_Bodegas
4537	4537	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-19 13:46:30	2026-04-01 19:44:51.39	Tandem_Carrusel_UF+8%
4538	4538	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-19 15:13:24	2026-04-01 19:44:51.391	Inversion_Bodegas
4539	4539	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-19 16:34:20	2026-04-01 19:44:51.391	Tandem_Carrusel_UF+8%
4540	4540	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-02-19 18:02:39	2026-04-01 19:44:51.392	Tandem_Carrusel_UF+8%
4541	4541	\N	\N	\N	PERDIDO	\N	\N	\N	2026-02-19 19:10:47	2026-04-01 19:44:51.393	\N
4542	4542	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-02-19 19:37:18	2026-04-01 19:44:51.394	Inversion_Bodegas
4543	4543	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-02-19 23:28:10	2026-04-01 19:44:51.395	Inversion_Bodegas
4544	4544	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-02-20 00:06:55	2026-04-01 19:44:51.396	Tandem_Carrusel_UF+8%
4533	4533	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-04-01 02:55:34	2026-04-13 16:01:19.359	Inversion_Bodegas
4475	4475	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-04-08 01:28:37	2026-04-13 16:01:19.564	Inversion_Bodegas
4482	4482	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-04-08 02:40:00	2026-04-13 16:01:19.571	Inversion_Bodegas
4545	4545	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-20 01:37:50	2026-04-01 19:44:51.397	Inversion_Bodegas
4546	4546	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-20 02:38:00	2026-04-01 19:44:51.397	Inversion_Bodegas
4547	4547	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-02-20 02:57:04	2026-04-01 19:44:51.398	Tandem_Carrusel_UF+8%
4548	4548	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-02-20 11:26:11	2026-04-01 19:44:51.399	Inversion_Bodegas
4550	4550	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-20 12:11:36	2026-04-01 19:44:51.401	Inversion_Bodegas
4551	4551	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-02-20 12:15:05	2026-04-01 19:44:51.402	Inversion_Bodegas
4552	4552	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-20 13:04:27	2026-04-01 19:44:51.402	Inversion_Bodegas
4553	4553	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-20 13:14:49	2026-04-01 19:44:51.403	Inversion_Bodegas
4554	4554	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-20 13:52:46	2026-04-01 19:44:51.404	Inversion_Bodegas
4555	4555	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-20 13:58:21	2026-04-01 19:44:51.405	Tandem_Carrusel_UF+8%
4556	4556	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-20 14:47:29	2026-04-01 19:44:51.406	Tandem_Carrusel_UF+8%
4557	4557	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-20 15:06:01	2026-04-01 19:44:51.406	Inversion_Bodegas
4558	4558	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-20 15:12:58	2026-04-01 19:44:51.407	Tandem_Carrusel_UF+8%
4559	4559	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-20 17:54:28	2026-04-01 19:44:51.409	Inversion_Bodegas
4560	4560	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-20 20:18:17	2026-04-01 19:44:51.41	Tandem_Carrusel_UF+8%
4561	4561	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-20 22:09:19	2026-04-01 19:44:51.41	Inversion_Bodegas
4562	4562	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-02-20 23:08:39	2026-04-01 19:44:51.411	Inversion_Bodegas
4563	4563	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-02-20 23:43:47	2026-04-01 19:44:51.412	Inversion_Bodegas
4564	4564	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-21 02:04:41	2026-04-01 19:44:51.413	Inversion_Bodegas
4565	4565	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-21 02:05:57	2026-04-01 19:44:51.414	Tandem_Carrusel_UF+8%
4566	4566	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-21 12:20:59	2026-04-01 19:44:51.415	Inversion_Bodegas
4567	4567	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-21 13:26:25	2026-04-01 19:44:51.415	Tandem_Carrusel_UF+8%
4568	4568	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-21 15:09:25	2026-04-01 19:44:51.416	Inversion_Bodegas
4569	4569	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-21 15:20:08	2026-04-01 19:44:51.417	Tandem_Carrusel_UF+8%
4570	4570	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-21 16:21:13	2026-04-01 19:44:51.418	Inversion_Bodegas
4571	4571	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-21 16:50:32	2026-04-01 19:44:51.419	Tandem_Carrusel_UF+8%
4572	4572	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-21 19:33:44	2026-04-01 19:44:51.42	Inversion_Bodegas
4573	4573	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-21 20:16:36	2026-04-01 19:44:51.42	Tandem_Carrusel_UF+8%
4575	4575	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-21 22:31:14	2026-04-01 19:44:51.422	Tandem_Carrusel_UF+8%
4576	4576	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-21 23:28:04	2026-04-01 19:44:51.423	Tandem_Carrusel_UF+8%
4577	4577	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-22 00:42:31	2026-04-01 19:44:51.424	Inversion_Bodegas
4578	4578	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-02-22 01:28:15	2026-04-01 19:44:51.425	Inversion_Bodegas
4579	4579	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-22 01:54:43	2026-04-01 19:44:51.425	Inversion_Bodegas
4580	4580	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-02-22 03:10:50	2026-04-01 19:44:51.426	Tandem_Carrusel_UF+8%
4581	4581	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-02-22 06:12:10	2026-04-01 19:44:51.427	Inversion_Bodegas
4582	4582	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-02-22 11:41:20	2026-04-01 19:44:51.428	Inversion_Bodegas
4583	4583	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-22 12:23:48	2026-04-01 19:44:51.429	Inversion_Bodegas
4584	4584	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-22 12:54:23	2026-04-01 19:44:51.43	Inversion_Bodegas
4585	4585	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-22 13:47:44	2026-04-01 19:44:51.43	Inversion_Bodegas
4586	4586	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-22 14:49:13	2026-04-01 19:44:51.431	Inversion_Bodegas
4587	4587	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-22 15:38:56	2026-04-01 19:44:51.432	Tandem_Carrusel_UF+8%
4588	4588	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-22 16:32:23	2026-04-01 19:44:51.433	Tandem_Carrusel_UF+8%
4589	4589	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-02-22 18:26:00	2026-04-01 19:44:51.434	Tandem_Carrusel_UF+8%
4590	4590	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-22 19:32:54	2026-04-01 19:44:51.435	Inversion_Bodegas
4591	4591	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-22 20:14:56	2026-04-01 19:44:51.436	Tandem_Carrusel_UF+8%
4592	4592	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-22 21:25:05	2026-04-01 19:44:51.437	Inversion_Bodegas
4593	4593	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-22 22:42:04	2026-04-01 19:44:51.438	Inversion_Bodegas
4594	4594	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-02-23 00:10:24	2026-04-01 19:44:51.438	Tandem_Carrusel_UF+8%
4595	4595	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-23 01:09:10	2026-04-01 19:44:51.439	Inversion_Bodegas
4597	4597	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-02-23 02:57:23	2026-04-01 19:44:51.441	Tandem_Carrusel_UF+8%
4598	4598	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-23 04:41:01	2026-04-01 19:44:51.442	Inversion_Bodegas
4599	4599	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-02-23 12:51:36	2026-04-01 19:44:51.443	Tandem_Carrusel_UF+8%
4600	4600	\N	\N	\N	PERDIDO	\N	\N	\N	2026-02-23 13:49:50	2026-04-01 19:44:51.443	\N
4601	4601	\N	\N	\N	PERDIDO	\N	\N	\N	2026-02-23 13:59:48	2026-04-01 19:44:51.444	\N
4602	4602	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-23 15:38:21	2026-04-01 19:44:51.445	Inversion_Bodegas
4604	4604	\N	\N	\N	PERDIDO	\N	\N	\N	2026-02-23 16:50:17	2026-04-01 19:44:51.447	\N
4605	4605	\N	\N	\N	PERDIDO	\N	\N	\N	2026-02-23 17:03:13	2026-04-01 19:44:51.448	\N
4606	4606	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-02-23 17:49:49	2026-04-01 19:44:51.449	Inversion_Bodegas
4607	4607	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-23 18:46:46	2026-04-01 19:44:51.45	Inversion_Bodegas
4608	4608	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-23 20:52:15	2026-04-01 19:44:51.451	Tandem_Carrusel_UF+8%
4609	4609	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-23 21:55:06	2026-04-01 19:44:51.452	Tandem_Carrusel_UF+8%
4610	4610	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-23 22:00:39	2026-04-01 19:44:51.452	Inversion_Bodegas
4611	4611	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-23 22:08:29	2026-04-01 19:44:51.453	Tandem_Carrusel_UF+8%
4612	4612	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-23 23:17:53	2026-04-01 19:44:51.454	Tandem_Carrusel_UF+8%
4613	4613	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-23 23:59:41	2026-04-01 19:44:51.455	Inversion_Bodegas
4614	4614	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-24 01:03:36	2026-04-01 19:44:51.456	Inversion_Bodegas
4615	4615	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-24 07:53:51	2026-04-01 19:44:51.456	Inversion_Bodegas
4616	4616	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-24 09:34:27	2026-04-01 19:44:51.457	Inversion_Bodegas
4617	4617	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-24 10:26:15	2026-04-01 19:44:51.458	Inversion_Bodegas
4618	4618	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-24 10:50:22	2026-04-01 19:44:51.459	Inversion_Bodegas
4619	4619	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-02-24 12:50:22	2026-04-01 19:44:51.46	Inversion_Bodegas
4620	4620	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-24 13:09:20	2026-04-01 19:44:51.461	Tandem_Carrusel_UF+8%
4621	4621	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-24 14:13:51	2026-04-01 19:44:51.461	Inversion_Bodegas
4549	4549	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-03-14 02:23:27	2026-04-13 16:01:19.278	Inversion_Bodegas
4574	4574	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-04-10 02:43:36	2026-04-13 16:01:19.646	Inversion_Bodegas
4596	4596	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-04-13 03:33:53	2026-04-13 16:01:19.756	Inversion_Bodegas
4622	4622	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-02-24 18:05:39	2026-04-01 19:44:51.462	Inversion_Bodegas
4623	4623	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-24 18:07:31	2026-04-01 19:44:51.463	Inversion_Bodegas
4624	4624	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-02-24 18:39:41	2026-04-01 19:44:51.464	Inversion_Bodegas
4625	4625	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-24 19:42:41	2026-04-01 19:44:51.464	Inversion_Bodegas
4626	4626	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-02-25 00:00:32	2026-04-01 19:44:51.465	Inversion_Bodegas
4627	4627	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-25 01:03:07	2026-04-01 19:44:51.466	Inversion_Bodegas
4628	4628	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-25 02:53:38	2026-04-01 19:44:51.467	Inversion_Bodegas
4629	4629	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-25 11:24:03	2026-04-01 19:44:51.468	Inversion_Bodegas
4630	4630	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-25 11:33:42	2026-04-01 19:44:51.469	Tandem_Carrusel_UF+8%
4631	4631	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-25 12:42:03	2026-04-01 19:44:51.469	Inversion_Bodegas
4632	4632	\N	\N	\N	PERDIDO	\N	\N	\N	2026-02-25 14:29:06	2026-04-01 19:44:51.47	\N
4633	4633	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-25 17:12:29	2026-04-01 19:44:51.471	Inversion_Bodegas
4634	4634	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-02-25 20:01:44	2026-04-01 19:44:51.472	Tandem_Carrusel_UF+8%
4635	4635	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-25 20:07:57	2026-04-01 19:44:51.472	Inversion_Bodegas
4636	4636	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-25 22:28:42	2026-04-01 19:44:51.473	Tandem_Carrusel_UF+8%
4637	4637	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-26 01:42:06	2026-04-01 19:44:51.474	Inversion_Bodegas
4638	4638	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-02-26 01:48:26	2026-04-01 19:44:51.474	Inversion_Bodegas
4639	4639	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-26 02:57:09	2026-04-01 19:44:51.475	Inversion_Bodegas
4640	4640	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-26 03:40:03	2026-04-01 19:44:51.476	Inversion_Bodegas
4641	4641	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-26 04:22:33	2026-04-01 19:44:51.477	Inversion_Bodegas
4642	4642	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-02-26 10:11:07	2026-04-01 19:44:51.478	Inversion_Bodegas
4643	4643	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-02-26 12:02:40	2026-04-01 19:44:51.478	Tandem_Carrusel_UF+8%
4644	4644	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-02-26 12:29:10	2026-04-01 19:44:51.479	Inversion_Bodegas
4645	4645	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-02-26 12:54:21	2026-04-01 19:44:51.48	Inversion_Bodegas
4646	4646	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-26 15:33:57	2026-04-01 19:44:51.481	Inversion_Bodegas
4647	4647	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-26 17:49:39	2026-04-01 19:44:51.482	Inversion_Bodegas
4648	4648	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-26 18:02:26	2026-04-01 19:44:51.482	Inversion_Bodegas
4649	4649	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-02-26 18:49:25	2026-04-01 19:44:51.484	Inversion_Bodegas
4650	4650	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-26 21:52:11	2026-04-01 19:44:51.484	Inversion_Bodegas
4651	4651	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-02-26 22:32:36	2026-04-01 19:44:51.485	Inversion_Bodegas
4652	4652	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-02-26 22:37:26	2026-04-01 19:44:51.486	Inversion_Bodegas
4653	4653	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-02-26 23:06:01	2026-04-01 19:44:51.487	Tandem_Carrusel_UF+8%
4654	4654	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-02-26 23:39:25	2026-04-01 19:44:51.488	Tandem_Carrusel_UF+8%
4655	4655	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-27 00:52:25	2026-04-01 19:44:51.489	Inversion_Bodegas
4656	4656	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-02-27 00:52:35	2026-04-01 19:44:51.49	Inversion_Bodegas
4657	4657	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-02-27 01:37:35	2026-04-01 19:44:51.49	Tandem_Carrusel_UF+8%
4658	4658	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-02-27 02:04:56	2026-04-01 19:44:51.491	Tandem_Carrusel_UF+8%
4659	4659	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-02-27 03:04:43	2026-04-01 19:44:51.492	Inversion_Bodegas
4660	4660	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-27 04:16:08	2026-04-01 19:44:51.493	Inversion_Bodegas
4661	4661	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-27 09:49:07	2026-04-01 19:44:51.496	Inversion_Bodegas
4662	4662	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-02-27 13:21:25	2026-04-01 19:44:51.498	Inversion_Bodegas
4663	4663	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-27 15:01:40	2026-04-01 19:44:51.499	Inversion_Bodegas
4664	4664	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-27 16:05:20	2026-04-01 19:44:51.5	Inversion_Bodegas
4665	4665	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-02-27 18:16:42	2026-04-01 19:44:51.501	Tandem_Carrusel_UF+8%
4666	4666	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-02-27 18:35:53	2026-04-01 19:44:51.501	Inversion_Bodegas
4667	4667	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-27 21:13:17	2026-04-01 19:44:51.502	Inversion_Bodegas
4668	4668	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-27 21:29:58	2026-04-01 19:44:51.503	Inversion_Bodegas
4669	4669	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-27 22:07:23	2026-04-01 19:44:51.504	Inversion_Bodegas
4670	4670	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-02-27 23:09:11	2026-04-01 19:44:51.505	Inversion_Bodegas
4671	4671	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-27 23:36:36	2026-04-01 19:44:51.506	Tandem_Carrusel_UF+8%
4672	4672	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-28 00:08:35	2026-04-01 19:44:51.506	Inversion_Bodegas
4673	4673	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-02-28 00:39:13	2026-04-01 19:44:51.507	Tandem_Carrusel_UF+8%
4674	4674	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-28 01:48:25	2026-04-01 19:44:51.508	Tandem_Carrusel_UF+8%
4675	4675	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-02-28 02:07:57	2026-04-01 19:44:51.509	Tandem_Carrusel_UF+8%
4676	4676	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-02-28 07:05:15	2026-04-01 19:44:51.51	Tandem_Carrusel_UF+8%
4677	4677	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-02-28 08:37:03	2026-04-01 19:44:51.511	Inversion_Bodegas
4678	4678	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-28 11:15:42	2026-04-01 19:44:51.511	Inversion_Bodegas
4679	4679	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-28 12:10:43	2026-04-01 19:44:51.512	Tandem_Carrusel_UF+8%
4681	4681	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-28 16:39:14	2026-04-01 19:44:51.514	Tandem_Carrusel_UF+8%
4682	4682	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-02-28 17:10:03	2026-04-01 19:44:51.515	Tandem_Carrusel_UF+8%
4683	4683	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-28 17:34:34	2026-04-01 19:44:51.516	Inversion_Bodegas
4684	4684	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-02-28 17:53:04	2026-04-01 19:44:51.517	Tandem_Carrusel_UF+8%
4685	4685	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-28 18:21:44	2026-04-01 19:44:51.518	Inversion_Bodegas
4686	4686	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-28 18:52:33	2026-04-01 19:44:51.519	Inversion_Bodegas
4687	4687	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-28 23:39:28	2026-04-01 19:44:51.519	Inversion_Bodegas
4688	4688	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-03-01 00:40:24	2026-04-01 19:44:51.52	Tandem_Carrusel_UF+8%
4689	4689	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-01 00:56:04	2026-04-01 19:44:51.521	Inversion_Bodegas
4690	4690	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-01 01:31:03	2026-04-01 19:44:51.522	Inversion_Bodegas
4691	4691	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-03-01 03:59:26	2026-04-01 19:44:51.523	Inversion_Bodegas
4692	4692	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-03-01 04:01:15	2026-04-01 19:44:51.524	Tandem_Carrusel_UF+8%
4694	4694	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-03-01 05:13:58	2026-04-01 19:44:51.525	Inversion_Bodegas
4695	4695	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-01 10:20:13	2026-04-01 19:44:51.526	Tandem_Carrusel_UF+8%
4696	4696	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-01 10:56:13	2026-04-01 19:44:51.527	Inversion_Bodegas
4697	4697	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-03-01 11:45:27	2026-04-01 19:44:51.528	Inversion_Bodegas
4698	4698	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-01 12:43:00	2026-04-01 19:44:51.529	Inversion_Bodegas
4699	4699	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-03-01 13:14:47	2026-04-01 19:44:51.53	Tandem_Carrusel_UF+8%
4700	4700	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-01 13:24:38	2026-04-01 19:44:51.531	Inversion_Bodegas
4701	4701	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-03-01 13:29:36	2026-04-01 19:44:51.531	Tandem_Carrusel_UF+8%
4702	4702	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-03-01 13:47:50	2026-04-01 19:44:51.532	Tandem_Carrusel_UF+8%
4703	4703	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-03-01 15:00:22	2026-04-01 19:44:51.533	Tandem_Carrusel_UF+8%
4704	4704	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-01 15:43:27	2026-04-01 19:44:51.534	Tandem_Carrusel_UF+8%
4705	4705	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-01 16:18:14	2026-04-01 19:44:51.535	Inversion_Bodegas
4706	4706	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-01 16:42:51	2026-04-01 19:44:51.536	Inversion_Bodegas
4707	4707	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-03-01 19:47:26	2026-04-01 19:44:51.537	Tandem_Carrusel_UF+8%
4708	4708	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-01 22:15:46	2026-04-01 19:44:51.537	Inversion_Bodegas
4709	4709	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-01 22:20:48	2026-04-01 19:44:51.538	Inversion_Bodegas
4710	4710	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-01 23:28:53	2026-04-01 19:44:51.539	Tandem_Carrusel_UF+8%
4711	4711	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-02 00:51:37	2026-04-01 19:44:51.54	Inversion_Bodegas
4712	4712	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-03-02 01:09:07	2026-04-01 19:44:51.541	Tandem_Carrusel_UF+8%
4713	4713	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-03-02 01:30:45	2026-04-01 19:44:51.542	Tandem_Carrusel_UF+8%
4714	4714	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-02 01:41:15	2026-04-01 19:44:51.542	Inversion_Bodegas
4715	4715	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-03-02 02:28:00	2026-04-01 19:44:51.543	Tandem_Carrusel_UF+8%
4716	4716	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-02 04:23:58	2026-04-01 19:44:51.544	Tandem_Carrusel_UF+8%
4718	4718	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-02 07:45:13	2026-04-01 19:44:51.546	Inversion_Bodegas
4720	4720	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-02 12:52:05	2026-04-01 19:44:51.548	Inversion_Bodegas
4721	4721	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-02 14:34:24	2026-04-01 19:44:51.548	Inversion_Bodegas
4722	4722	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-02 15:11:01	2026-04-01 19:44:51.549	Tandem_Carrusel_UF+8%
4723	4723	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-02 15:22:22	2026-04-01 19:44:51.551	Tandem_Carrusel_UF+8%
4724	4724	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-02 16:39:20	2026-04-01 19:44:51.552	Inversion_Bodegas
4725	4725	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-02 23:55:27	2026-04-01 19:44:51.553	Inversion_Bodegas
4726	4726	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-03 00:41:46	2026-04-01 19:44:51.554	Inversion_Bodegas
4727	4727	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-03-03 01:37:42	2026-04-01 19:44:51.555	Inversion_Bodegas
4728	4728	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-03-03 01:38:37	2026-04-01 19:44:51.556	Tandem_Carrusel_UF+8%
4729	4729	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-03-03 03:44:24	2026-04-01 19:44:51.557	Inversion_Bodegas
4730	4730	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-03-03 04:18:34	2026-04-01 19:44:51.558	Inversion_Bodegas
4731	4731	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-03 11:08:12	2026-04-01 19:44:51.558	Inversion_Bodegas
4732	4732	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-03 12:45:47	2026-04-01 19:44:51.559	Inversion_Bodegas
4733	4733	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-03 13:26:53	2026-04-01 19:44:51.56	Inversion_Bodegas
4734	4734	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-03 14:23:33	2026-04-01 19:44:51.561	Inversion_Bodegas
4735	4735	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-03 14:27:07	2026-04-01 19:44:51.562	Tandem_Carrusel_UF+8%
4736	4736	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-03 14:59:04	2026-04-01 19:44:51.563	Tandem_Carrusel_UF+8%
4737	4737	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-03 15:04:56	2026-04-01 19:44:51.564	Inversion_Bodegas
4738	4738	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-03 15:10:22	2026-04-01 19:44:51.565	Inversion_Bodegas
4739	4739	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-03 17:01:21	2026-04-01 19:44:51.566	Tandem_Carrusel_UF+8%
4740	4740	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-03 17:37:24	2026-04-01 19:44:51.566	Inversion_Bodegas
4741	4741	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-03 18:55:33	2026-04-01 19:44:51.567	Inversion_Bodegas
4742	4742	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-03 20:51:12	2026-04-01 19:44:51.568	Tandem_Carrusel_UF+8%
4743	4743	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-03 21:03:06	2026-04-01 19:44:51.569	Tandem_Carrusel_UF+8%
4744	4744	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-03-03 21:54:29	2026-04-01 19:44:51.57	Inversion_Bodegas
4745	4745	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-03 22:01:28	2026-04-01 19:44:51.571	Tandem_Carrusel_UF+8%
4746	4746	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-03-03 22:12:22	2026-04-01 19:44:51.571	Tandem_Carrusel_UF+8%
4747	4747	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-03 22:14:42	2026-04-01 19:44:51.572	Inversion_Bodegas
4748	4748	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-03-03 22:31:32	2026-04-01 19:44:51.573	Inversion_Bodegas
4749	4749	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-03-03 23:04:37	2026-04-01 19:44:51.574	Inversion_Bodegas
4750	4750	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-03-04 02:34:20	2026-04-01 19:44:51.574	Inversion_Bodegas
4751	4751	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-04 03:16:10	2026-04-01 19:44:51.575	Inversion_Bodegas
4752	4752	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-04 03:17:58	2026-04-01 19:44:51.576	Inversion_Bodegas
4753	4753	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-03-04 03:33:13	2026-04-01 19:44:51.577	Inversion_Bodegas
4754	4754	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-03-04 03:35:04	2026-04-01 19:44:51.578	Tandem_Carrusel_UF+8%
4755	4755	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-03-04 12:27:19	2026-04-01 19:44:51.579	Tandem_Carrusel_UF+8%
4756	4756	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-03-04 13:09:14	2026-04-01 19:44:51.58	Inversion_Bodegas
4757	4757	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-04 14:13:20	2026-04-01 19:44:51.581	Inversion_Bodegas
4758	4758	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-04 15:29:44	2026-04-01 19:44:51.582	Inversion_Bodegas
4759	4759	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-03-04 22:49:36	2026-04-01 19:44:51.583	Inversion_Bodegas
4760	4760	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-05 00:02:56	2026-04-01 19:44:51.584	Inversion_Bodegas
4761	4761	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-05 01:17:28	2026-04-01 19:44:51.585	Tandem_Carrusel_UF+8%
4762	4762	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-05 03:21:48	2026-04-01 19:44:51.586	Inversion_Bodegas
4763	4763	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-05 11:40:22	2026-04-01 19:44:51.586	Inversion_Bodegas
4764	4764	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-05 15:08:07	2026-04-01 19:44:51.587	Tandem_Carrusel_UF+8%
4765	4765	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-05 17:44:23	2026-04-01 19:44:51.588	Inversion_Bodegas
4766	4766	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-05 18:53:05	2026-04-01 19:44:51.589	Inversion_Bodegas
4767	4767	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-05 22:02:45	2026-04-01 19:44:51.59	Inversion_Bodegas
4768	4768	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-03-05 22:29:08	2026-04-01 19:44:51.591	Inversion_Bodegas
4769	4769	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-05 22:53:46	2026-04-01 19:44:51.592	Tandem_Carrusel_UF+8%
4770	4770	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-05 22:57:10	2026-04-01 19:44:51.593	Inversion_Bodegas
4771	4771	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-05 23:48:23	2026-04-01 19:44:51.594	Inversion_Bodegas
4772	4772	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-03-06 00:56:03	2026-04-01 19:44:51.595	Inversion_Bodegas
4717	4717	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-04-06 13:30:13	2026-04-13 16:01:19.52	Inversion_Bodegas
4773	4773	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-03-06 08:50:58	2026-04-01 19:44:51.595	Inversion_Bodegas
4774	4774	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-06 11:40:50	2026-04-01 19:44:51.596	Inversion_Bodegas
4775	4775	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-03-06 14:56:00	2026-04-01 19:44:51.597	Tandem_Carrusel_UF+8%
4776	4776	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-06 15:53:24	2026-04-01 19:44:51.598	Tandem_Carrusel_UF+8%
4777	4777	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-06 16:21:38	2026-04-01 19:44:51.599	Inversion_Bodegas
4778	4778	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-06 17:03:23	2026-04-01 19:44:51.6	Inversion_Bodegas
4779	4779	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-06 17:11:48	2026-04-01 19:44:51.601	Inversion_Bodegas
4780	4780	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-06 17:58:21	2026-04-01 19:44:51.602	Inversion_Bodegas
4781	4781	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-03-06 18:27:43	2026-04-01 19:44:51.603	Inversion_Bodegas
4782	4782	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-06 19:24:11	2026-04-01 19:44:51.603	Inversion_Bodegas
4783	4783	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-06 23:02:57	2026-04-01 19:44:51.604	Inversion_Bodegas
4784	4784	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-06 23:56:40	2026-04-01 19:44:51.605	Tandem_Carrusel_UF+8%
4785	4785	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-07 00:36:56	2026-04-01 19:44:51.606	Promo Bodega
4786	4786	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-03-07 04:13:29	2026-04-01 19:44:51.607	Tandem_Carrusel_UF+8%
4787	4787	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-07 11:13:37	2026-04-01 19:44:51.608	Inversion_Bodegas
4788	4788	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-07 11:25:53	2026-04-01 19:44:51.608	Promo Bodega
4789	4789	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-07 11:53:49	2026-04-01 19:44:51.609	Promo Bodega
4790	4790	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-07 13:53:25	2026-04-01 19:44:51.61	Promo Bodega
4791	4791	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-07 14:41:52	2026-04-01 19:44:51.611	Tandem_Carrusel_UF+8%
4792	4792	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-03-07 15:29:48	2026-04-01 19:44:51.612	Promo Bodega
4793	4793	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-07 16:06:09	2026-04-01 19:44:51.613	Inversion_Bodegas
4794	4794	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-07 18:45:23	2026-04-01 19:44:51.614	Tandem_Carrusel_UF+8%
4795	4795	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-07 21:20:44	2026-04-01 19:44:51.615	Tandem_Carrusel_UF+8%
4796	4796	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-07 23:22:09	2026-04-01 19:44:51.615	Tandem_Carrusel_UF+8%
4797	4797	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-07 23:27:27	2026-04-01 19:44:51.616	Promo Bodega
4798	4798	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-03-08 00:58:31	2026-04-01 19:44:51.617	Tandem_Carrusel_UF+8%
4799	4799	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-03-08 01:09:09	2026-04-01 19:44:51.618	Tandem_Carrusel_UF+8%
4800	4800	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-03-08 01:29:52	2026-04-01 19:44:51.619	Promo Bodega
4801	4801	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-03-08 04:15:43	2026-04-01 19:44:51.62	Tandem_Carrusel_UF+8%
4802	4802	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-08 04:46:45	2026-04-01 19:44:51.621	Tandem_Carrusel_UF+8%
4803	4803	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-08 06:29:14	2026-04-01 19:44:51.622	Inversion_Bodegas
4804	4804	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-03-08 10:02:40	2026-04-01 19:44:51.622	Tandem_Carrusel_UF+8%
4806	4806	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-08 12:39:39	2026-04-01 19:44:51.624	Tandem_Carrusel_UF+8%
4807	4807	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-08 12:50:31	2026-04-01 19:44:51.625	Promo Bodega
4808	4808	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-03-08 14:04:23	2026-04-01 19:44:51.626	Tandem_Carrusel_UF+8%
4809	4809	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-03-08 14:16:27	2026-04-01 19:44:51.627	Promo Bodega
4810	4810	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-08 15:50:40	2026-04-01 19:44:51.628	Tandem_Carrusel_UF+8%
4812	4812	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-08 17:44:54	2026-04-01 19:44:51.629	Tandem_Carrusel_UF+8%
4813	4813	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-08 18:27:01	2026-04-01 19:44:51.63	Inversion_Bodegas
4814	4814	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-03-08 18:28:39	2026-04-01 19:44:51.631	Promo Bodega
4815	4815	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-08 19:55:27	2026-04-01 19:44:51.632	Tandem_Carrusel_UF+8%
4816	4816	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-08 21:11:46	2026-04-01 19:44:51.633	Inversion_Bodegas
4817	4817	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-03-08 22:57:48	2026-04-01 19:44:51.634	Tandem_Carrusel_UF+8%
4818	4818	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-09 00:39:04	2026-04-01 19:44:51.634	Promo Bodega
4819	4819	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-09 02:06:07	2026-04-01 19:44:51.635	Tandem_Carrusel_UF+8%
4820	4820	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-03-09 03:03:19	2026-04-01 19:44:51.636	Promo Bodega
4821	4821	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-03-09 03:18:48	2026-04-01 19:44:51.637	Promo Bodega
4822	4822	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-09 04:30:36	2026-04-01 19:44:51.638	Tandem_Carrusel_UF+8%
4823	4823	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-09 05:01:40	2026-04-01 19:44:51.639	Inversion_Bodegas
4824	4824	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-09 06:38:37	2026-04-01 19:44:51.64	Inversion_Bodegas
4825	4825	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-09 09:56:49	2026-04-01 19:44:51.641	Tandem_Carrusel_UF+8%
4826	4826	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-03-09 10:37:08	2026-04-01 19:44:51.641	Tandem_Carrusel_UF+8%
4827	4827	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-09 13:00:50	2026-04-01 19:44:51.643	Tandem_Carrusel_UF+8%
4828	4828	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-09 13:32:40	2026-04-01 19:44:51.643	Inversion_Bodegas
4829	4829	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-09 15:24:36	2026-04-01 19:44:51.644	Inversion_Bodegas
4830	4830	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-03-09 15:45:19	2026-04-01 19:44:51.645	Inversion_Bodegas
4831	4831	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-09 16:29:35	2026-04-01 19:44:51.646	Inversion_Bodegas
4832	4832	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-03-09 18:03:34	2026-04-01 19:44:51.647	Tandem_Carrusel_UF+8%
4833	4833	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-09 19:05:35	2026-04-01 19:44:51.648	Tandem_Carrusel_UF+8%
4834	4834	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-03-09 20:14:32	2026-04-01 19:44:51.649	Temuco Bodega
4835	4835	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-09 22:31:44	2026-04-01 19:44:51.649	Promo Bodega
4836	4836	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-03-09 22:34:36	2026-04-01 19:44:51.65	Tandem_Carrusel_UF+8%
4837	4837	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-09 23:53:18	2026-04-01 19:44:51.651	Inversion_Bodegas
4838	4838	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-10 00:01:39	2026-04-01 19:44:51.652	Promo Bodega
4840	4840	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-03-10 01:02:36	2026-04-01 19:44:51.654	Inversion_Bodegas
4841	4841	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-10 01:56:45	2026-04-01 19:44:51.655	Tandem_Carrusel_UF+8%
4842	4842	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-10 02:00:21	2026-04-01 19:44:51.656	Tandem_Carrusel_UF+8%
4843	4843	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-10 03:44:56	2026-04-01 19:44:51.657	Inversion_Bodegas
4844	4844	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-10 05:03:53	2026-04-01 19:44:51.657	Inversion_Bodegas
4845	4845	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-10 08:24:27	2026-04-01 19:44:51.658	Inversion_Bodegas
4846	4846	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-10 11:02:04	2026-04-01 19:44:51.659	Inversion_Bodegas
4847	4847	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-10 12:16:41	2026-04-01 19:44:51.66	Inversion_Bodegas
4848	4848	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-10 14:33:46	2026-04-01 19:44:51.661	Promo Bodega
4805	4805	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-11-23 05:27:43	2026-04-13 16:01:19.026	Inversion_Bodegas
4839	4839	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-04-04 18:01:41	2026-04-13 16:01:19.461	Tandem_Carrusel_UF+8%
4849	4849	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-10 14:59:36	2026-04-01 19:44:51.662	Inversion_Bodegas
4850	4850	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-10 17:07:37	2026-04-01 19:44:51.663	Tandem_Carrusel_UF+8%
4851	4851	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-03-10 17:26:14	2026-04-01 19:44:51.664	Tandem_Carrusel_UF+8%
4852	4852	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-10 17:51:09	2026-04-01 19:44:51.665	Tandem_Carrusel_UF+8%
4853	4853	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-10 19:22:13	2026-04-01 19:44:51.665	Temuco Bodega
4854	4854	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-10 21:00:27	2026-04-01 19:44:51.666	Tandem_Carrusel_UF+8%
4855	4855	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-10 21:48:36	2026-04-01 19:44:51.667	Temuco Bodega
4857	4857	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-10 23:17:33	2026-04-01 19:44:51.669	Tandem_Carrusel_UF+8%
4858	4858	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-11 00:16:25	2026-04-01 19:44:51.67	Temuco Bodega
4859	4859	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-03-11 01:28:07	2026-04-01 19:44:51.671	Temuco Bodega
4860	4860	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-11 01:59:44	2026-04-01 19:44:51.672	Inversion_Bodegas
4861	4861	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-11 03:18:47	2026-04-01 19:44:51.673	Tandem_Carrusel_UF+8%
4862	4862	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-03-11 03:31:34	2026-04-01 19:44:51.674	Tandem_Carrusel_UF+8%
4863	4863	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-11 06:37:44	2026-04-01 19:44:51.674	Promo Bodega
4864	4864	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-11 13:58:56	2026-04-01 19:44:51.675	Inversion_Bodegas
4865	4865	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-11 16:07:31	2026-04-01 19:44:51.676	Tandem_Carrusel_UF+8%
4866	4866	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-11 17:47:09	2026-04-01 19:44:51.677	Tandem_Carrusel_UF+8%
4867	4867	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-11 18:32:38	2026-04-01 19:44:51.678	Tandem_Carrusel_UF+8%
4868	4868	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-11 19:04:17	2026-04-01 19:44:51.679	Inversion_Bodegas
4869	4869	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-11 19:20:52	2026-04-01 19:44:51.679	Promo Bodega
4870	4870	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-03-11 19:44:46	2026-04-01 19:44:51.68	Temuco Bodega
4871	4871	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-11 19:52:41	2026-04-01 19:44:51.681	Tandem_Carrusel_UF+8%
4872	4872	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-03-11 22:18:23	2026-04-01 19:44:51.682	Tandem_Carrusel_UF+8%
4873	4873	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-12 00:09:17	2026-04-01 19:44:51.682	Promo Bodega
4874	4874	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-03-12 03:56:05	2026-04-01 19:44:51.683	Temuco Bodega
4875	4875	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-03-12 11:05:36	2026-04-01 19:44:51.684	Temuco Bodega
4876	4876	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-03-12 12:06:05	2026-04-01 19:44:51.685	Inversion_Bodegas
4877	4877	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-03-12 14:19:46	2026-04-01 19:44:51.685	Promo Bodega
4878	4878	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-12 14:36:10	2026-04-01 19:44:51.686	Inversion_Bodegas
4879	4879	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-12 15:39:18	2026-04-01 19:44:51.687	Tandem_Carrusel_UF+8%
4880	4880	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-12 18:00:37	2026-04-01 19:44:51.687	Inversion_Bodegas
4881	4881	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-12 18:36:19	2026-04-01 19:44:51.688	Tandem_Carrusel_UF+8%
4882	4882	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-12 19:34:58	2026-04-01 19:44:51.689	Inversion_Bodegas
4883	4883	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-12 23:52:19	2026-04-01 19:44:51.69	Tandem_Carrusel_UF+8%
4884	4884	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-03-13 01:37:28	2026-04-01 19:44:51.69	Temuco Bodega
4885	4885	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-13 02:03:09	2026-04-01 19:44:51.692	Tandem_Carrusel_UF+8%
4886	4886	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-13 02:11:27	2026-04-01 19:44:51.692	Inversion_Bodegas
4887	4887	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-13 02:11:33	2026-04-01 19:44:51.693	Inversion_Bodegas
4888	4888	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-03-13 03:18:49	2026-04-01 19:44:51.694	Inversion_Bodegas
4889	4889	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-03-13 10:58:21	2026-04-01 19:44:51.695	Tandem_Carrusel_UF+8%
4890	4890	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-13 12:36:28	2026-04-01 19:44:51.696	Tandem_Carrusel_UF+8%
4891	4891	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-03-13 13:50:50	2026-04-01 19:44:51.697	Tandem_Carrusel_UF+8%
4892	4892	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-13 14:19:29	2026-04-01 19:44:51.698	Tandem_Carrusel_UF+8%
4893	4893	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-13 16:19:38	2026-04-01 19:44:51.698	Inversion_Bodegas
4894	4894	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-03-13 16:42:24	2026-04-01 19:44:51.699	Tandem_Carrusel_UF+8%
4895	4895	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-13 17:53:36	2026-04-01 19:44:51.7	Tandem_Carrusel_UF+8%
4896	4896	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-03-13 18:42:32	2026-04-01 19:44:51.701	Tandem_Carrusel_UF+8%
4897	4897	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-03-13 19:07:17	2026-04-01 19:44:51.702	Tandem_Carrusel_UF+8%
4898	4898	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-13 20:14:34	2026-04-01 19:44:51.703	Inversion_Bodegas
4899	4899	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-03-13 23:25:16	2026-04-01 19:44:51.703	Tandem_Carrusel_UF+8%
4900	4900	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-14 00:18:46	2026-04-01 19:44:51.704	Inversion_Bodegas
4901	4901	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-14 00:45:24	2026-04-01 19:44:51.705	Inversion_Bodegas
4902	4902	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-03-14 02:22:44	2026-04-01 19:44:51.706	Inversion_Bodegas
4903	4903	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-14 05:34:54	2026-04-01 19:44:51.707	Promo Bodega
4904	4904	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-14 07:53:13	2026-04-01 19:44:51.708	Inversion_Bodegas
4905	4905	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-14 10:51:58	2026-04-01 19:44:51.709	Promo Bodega
4906	4906	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-14 12:36:21	2026-04-01 19:44:51.71	Inversion_Bodegas
4907	4907	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-03-14 12:44:20	2026-04-01 19:44:51.71	Inversion_Bodegas
4908	4908	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-03-14 13:34:13	2026-04-01 19:44:51.711	Tandem_Carrusel_UF+8%
4909	4909	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-14 15:47:35	2026-04-01 19:44:51.712	Promo Bodega
4910	4910	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-14 16:08:19	2026-04-01 19:44:51.713	Tandem_Carrusel_UF+8%
4911	4911	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-03-14 17:46:38	2026-04-01 19:44:51.714	Tandem_Carrusel_UF+8%
4912	4912	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-03-14 17:48:11	2026-04-01 19:44:51.714	Temuco Bodega
4913	4913	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-14 17:53:37	2026-04-01 19:44:51.715	Tandem_Carrusel_UF+8%
4914	4914	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-14 19:43:10	2026-04-01 19:44:51.716	Inversion_Bodegas
4915	4915	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-03-14 20:12:57	2026-04-01 19:44:51.717	Tandem_Carrusel_UF+8%
4916	4916	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-14 21:53:28	2026-04-01 19:44:51.718	Inversion_Bodegas
4917	4917	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-14 23:59:54	2026-04-01 19:44:51.719	Inversion_Bodegas
4918	4918	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-03-15 00:07:14	2026-04-01 19:44:51.72	Tandem_Carrusel_UF+8%
4919	4919	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-15 01:41:45	2026-04-01 19:44:51.72	Inversion_Bodegas
4920	4920	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-15 02:09:29	2026-04-01 19:44:51.721	Promo Bodega
4921	4921	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-15 03:43:00	2026-04-01 19:44:51.722	Inversion_Bodegas
4922	4922	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-15 04:04:30	2026-04-01 19:44:51.723	Promo Bodega
4923	4923	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-03-15 04:59:19	2026-04-01 19:44:51.724	Tandem_Carrusel_UF+8%
4924	4924	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-03-15 11:49:32	2026-04-01 19:44:51.725	Tandem_Carrusel_UF+8%
5078	5078	\N	\N	\N	NUEVO	\N	\N	Plataforma: ig	2026-03-25 19:58:05	2026-04-01 19:44:51.861	Promo Bodega
4925	4925	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-03-15 11:59:41	2026-04-01 19:44:51.725	Inversion_Bodegas
4926	4926	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-03-15 14:08:38	2026-04-01 19:44:51.726	Tandem_Carrusel_UF+8%
4927	4927	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-15 14:10:18	2026-04-01 19:44:51.727	Inversion_Bodegas
4928	4928	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-15 15:48:37	2026-04-01 19:44:51.728	Inversion_Bodegas
4929	4929	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-03-15 16:55:07	2026-04-01 19:44:51.729	Tandem_Carrusel_UF+8%
4930	4930	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-03-15 18:40:47	2026-04-01 19:44:51.73	Inversion_Bodegas
4931	4931	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-15 19:00:13	2026-04-01 19:44:51.731	Inversion_Bodegas
4932	4932	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-03-15 19:17:53	2026-04-01 19:44:51.731	Inversion_Bodegas
4933	4933	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-15 20:42:48	2026-04-01 19:44:51.732	Inversion_Bodegas
4934	4934	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-03-15 20:57:40	2026-04-01 19:44:51.733	Tandem_Carrusel_UF+8%
4935	4935	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-03-15 21:31:18	2026-04-01 19:44:51.734	Inversion_Bodegas
4936	4936	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-15 21:38:31	2026-04-01 19:44:51.735	Promo Bodega
4937	4937	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-03-15 21:48:22	2026-04-01 19:44:51.736	Inversion_Bodegas
4938	4938	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-03-15 22:43:19	2026-04-01 19:44:51.736	Tandem_Carrusel_UF+8%
4939	4939	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-03-16 00:03:06	2026-04-01 19:44:51.737	Inversion_Bodegas
4940	4940	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-03-16 07:25:47	2026-04-01 19:44:51.738	Tandem_Carrusel_UF+8%
4941	4941	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-03-16 07:42:19	2026-04-01 19:44:51.739	Inversion_Bodegas
4942	4942	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-03-16 09:09:35	2026-04-01 19:44:51.74	Promo Bodega
4943	4943	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-03-16 13:19:31	2026-04-01 19:44:51.741	Tandem_Carrusel_UF+8%
4944	4944	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-03-16 13:24:15	2026-04-01 19:44:51.742	Inversion_Bodegas
4945	4945	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-16 17:04:38	2026-04-01 19:44:51.743	Inversion_Bodegas
4946	4946	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-16 18:08:14	2026-04-01 19:44:51.744	Inversion_Bodegas
4947	4947	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-16 19:03:23	2026-04-01 19:44:51.744	Tandem_Carrusel_UF+8%
4948	4948	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-03-16 20:19:53	2026-04-01 19:44:51.745	Temuco Bodega
4949	4949	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-03-16 20:51:00	2026-04-01 19:44:51.746	Inversion_Bodegas
4950	4950	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-16 21:32:42	2026-04-01 19:44:51.747	Inversion_Bodegas
4951	4951	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-03-16 23:18:19	2026-04-01 19:44:51.748	Inversion_Bodegas
4952	4952	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-17 00:20:52	2026-04-01 19:44:51.749	Tandem_Carrusel_UF+8%
4953	4953	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-17 01:07:12	2026-04-01 19:44:51.75	Inversion_Bodegas
4954	4954	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-17 01:44:50	2026-04-01 19:44:51.75	Promo Bodega
4955	4955	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-17 01:49:56	2026-04-01 19:44:51.751	Inversion_Bodegas
4956	4956	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-03-17 02:21:17	2026-04-01 19:44:51.752	Tandem_Carrusel_UF+8%
4958	4958	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-03-17 11:29:11	2026-04-01 19:44:51.754	Tandem_Carrusel_UF+8%
4959	4959	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-17 11:59:16	2026-04-01 19:44:51.755	Inversion_Bodegas
4960	4960	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-17 15:17:45	2026-04-01 19:44:51.756	Inversion_Bodegas
4961	4961	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-17 15:54:45	2026-04-01 19:44:51.757	Inversion_Bodegas
4962	4962	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-17 17:15:59	2026-04-01 19:44:51.757	Tandem_Carrusel_UF+8%
4963	4963	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-17 18:22:18	2026-04-01 19:44:51.758	Inversion_Bodegas
4964	4964	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-17 22:33:05	2026-04-01 19:44:51.759	Inversion_Bodegas
4965	4965	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-03-17 23:26:51	2026-04-01 19:44:51.76	Tandem_Carrusel_UF+8%
4966	4966	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-17 23:54:48	2026-04-01 19:44:51.761	Promo Bodega
4967	4967	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-18 00:13:36	2026-04-01 19:44:51.762	Inversion_Bodegas
4968	4968	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-18 00:49:13	2026-04-01 19:44:51.763	Tandem_Carrusel_UF+8%
4969	4969	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-18 01:15:46	2026-04-01 19:44:51.764	Inversion_Bodegas
4970	4970	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-03-18 01:48:09	2026-04-01 19:44:51.764	Inversion_Bodegas
4971	4971	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-03-18 02:32:39	2026-04-01 19:44:51.766	Tandem_Carrusel_UF+8%
4972	4972	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-03-18 03:53:14	2026-04-01 19:44:51.767	Temuco Bodega
4973	4973	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-03-18 05:27:02	2026-04-01 19:44:51.768	Inversion_Bodegas
4974	4974	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-18 12:37:36	2026-04-01 19:44:51.77	Inversion_Bodegas
4975	4975	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-18 13:23:01	2026-04-01 19:44:51.771	Inversion_Bodegas
4976	4976	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-18 13:31:57	2026-04-01 19:44:51.772	Inversion_Bodegas
4978	4978	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-03-18 14:35:57	2026-04-01 19:44:51.774	Tandem_Carrusel_UF+8%
4979	4979	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-18 14:53:52	2026-04-01 19:44:51.774	Inversion_Bodegas
4980	4980	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-03-18 15:49:35	2026-04-01 19:44:51.775	Tandem_Carrusel_UF+8%
4981	4981	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2026-03-18 17:51:07	2026-04-01 19:44:51.776	Temuco Bodega
4982	4982	\N	\N	\N	NUEVO	\N	\N	Plataforma: fb	2026-03-18 22:36:12	2026-04-01 19:44:51.777	Tandem_Carrusel_UF+8%
4983	4983	\N	\N	\N	NUEVO	\N	\N	Plataforma: fb	2026-03-18 23:24:01	2026-04-01 19:44:51.778	Inversion_Bodegas
4984	4984	\N	\N	\N	NUEVO	\N	\N	Plataforma: fb	2026-03-19 00:56:56	2026-04-01 19:44:51.778	Inversion_Bodegas
4986	4986	\N	\N	\N	NUEVO	\N	\N	Plataforma: ig	2026-03-19 02:17:09	2026-04-01 19:44:51.78	Inversion_Bodegas
4987	4987	\N	\N	\N	NUEVO	\N	\N	Plataforma: ig	2026-03-19 02:20:46	2026-04-01 19:44:51.781	Tandem_Carrusel_UF+8%
4988	4988	\N	\N	\N	NUEVO	\N	\N	Plataforma: fb	2026-03-19 04:42:51	2026-04-01 19:44:51.782	Temuco Bodega
4989	4989	\N	\N	\N	NUEVO	\N	\N	Plataforma: fb	2026-03-19 05:13:38	2026-04-01 19:44:51.783	Temuco Bodega
4990	4990	\N	\N	\N	NUEVO	\N	\N	Plataforma: fb	2026-03-19 10:18:47	2026-04-01 19:44:51.784	Tandem_Carrusel_UF+8%
4991	4991	\N	\N	\N	NUEVO	\N	\N	Plataforma: fb	2026-03-19 11:15:21	2026-04-01 19:44:51.785	Temuco Bodega
4992	4992	\N	\N	\N	NUEVO	\N	\N	Plataforma: ig	2026-03-19 11:20:53	2026-04-01 19:44:51.785	Inversion_Bodegas
4993	4993	\N	\N	\N	NUEVO	\N	\N	Plataforma: ig	2026-03-19 11:57:43	2026-04-01 19:44:51.786	Inversion_Bodegas
4995	4995	\N	\N	\N	NUEVO	\N	\N	Plataforma: ig	2026-03-19 13:13:11	2026-04-01 19:44:51.788	Inversion_Bodegas
4996	4996	\N	\N	\N	NUEVO	\N	\N	Plataforma: ig	2026-03-19 14:31:18	2026-04-01 19:44:51.789	Temuco Bodega
4997	4997	\N	\N	\N	NUEVO	\N	\N	Plataforma: ig	2026-03-19 18:35:55	2026-04-01 19:44:51.79	Inversion_Bodegas
4998	4998	\N	\N	\N	NUEVO	\N	\N	Plataforma: ig	2026-03-19 19:08:55	2026-04-01 19:44:51.791	Inversion_Bodegas
4999	4999	\N	\N	\N	NUEVO	\N	\N	Plataforma: ig	2026-03-19 22:40:03	2026-04-01 19:44:51.791	Promo Bodega
5000	5000	\N	\N	\N	NUEVO	\N	\N	Plataforma: fb	2026-03-19 22:41:44	2026-04-01 19:44:51.792	Tandem_Carrusel_UF+8%
4994	4994	\N	\N	\N	NUEVO	\N	\N	Plataforma: ig	2026-04-08 01:18:24	2026-04-13 16:01:19.56	Tandem_Carrusel_UF+8%
4977	4977	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-04-08 12:04:13	2026-04-13 16:01:19.587	Inversion_Bodegas
4985	4985	\N	\N	\N	NUEVO	\N	\N	Plataforma: ig	2026-04-08 20:49:53	2026-04-13 16:01:19.607	Inversion_Bodegas
5001	5001	\N	\N	\N	NUEVO	\N	\N	Plataforma: ig	2026-03-19 22:55:52	2026-04-01 19:44:51.793	Tandem_Carrusel_UF+8%
5002	5002	\N	\N	\N	NUEVO	\N	\N	Plataforma: fb	2026-03-20 01:31:42	2026-04-01 19:44:51.794	Inversion_Bodegas
5003	5003	\N	\N	\N	NUEVO	\N	\N	Plataforma: fb	2026-03-20 02:57:54	2026-04-01 19:44:51.795	Tandem_Carrusel_UF+8%
5004	5004	\N	\N	\N	NUEVO	\N	\N	Plataforma: fb	2026-03-20 03:48:34	2026-04-01 19:44:51.796	Tandem_Carrusel_UF+8%
5005	5005	\N	\N	\N	NUEVO	\N	\N	Plataforma: fb	2026-03-20 12:48:32	2026-04-01 19:44:51.797	Promo Bodega
5006	5006	\N	\N	\N	NUEVO	\N	\N	Plataforma: fb	2026-03-20 18:55:29	2026-04-01 19:44:51.798	Temuco Bodega
5007	5007	\N	\N	\N	NUEVO	\N	\N	Plataforma: fb	2026-03-20 20:58:19	2026-04-01 19:44:51.799	Promo Bodega
5008	5008	\N	\N	\N	NUEVO	\N	\N	Plataforma: ig	2026-03-20 21:42:01	2026-04-01 19:44:51.8	Inversion_Bodegas
5009	5009	\N	\N	\N	NUEVO	\N	\N	Plataforma: ig	2026-03-20 22:54:41	2026-04-01 19:44:51.801	Inversion_Bodegas
5010	5010	\N	\N	\N	NUEVO	\N	\N	Plataforma: ig	2026-03-21 00:31:15	2026-04-01 19:44:51.802	Promo Bodega
5011	5011	\N	\N	\N	NUEVO	\N	\N	Plataforma: ig	2026-03-21 00:41:45	2026-04-01 19:44:51.803	Tandem_Carrusel_UF+8%
5012	5012	\N	\N	\N	NUEVO	\N	\N	Plataforma: fb	2026-03-21 00:53:30	2026-04-01 19:44:51.803	Temuco Bodega
5013	5013	\N	\N	\N	NUEVO	\N	\N	Plataforma: ig	2026-03-21 06:15:53	2026-04-01 19:44:51.804	Inversion_Bodegas
5014	5014	\N	\N	\N	NUEVO	\N	\N	Plataforma: ig	2026-03-21 11:08:02	2026-04-01 19:44:51.805	Inversion_Bodegas
5015	5015	\N	\N	\N	NUEVO	\N	\N	Plataforma: ig	2026-03-21 11:14:02	2026-04-01 19:44:51.806	Inversion_Bodegas
5016	5016	\N	\N	\N	NUEVO	\N	\N	Plataforma: ig	2026-03-21 13:03:08	2026-04-01 19:44:51.807	Promo Bodega
5017	5017	\N	\N	\N	NUEVO	\N	\N	Plataforma: ig	2026-03-21 13:06:32	2026-04-01 19:44:51.808	Inversion_Bodegas
5018	5018	\N	\N	\N	NUEVO	\N	\N	Plataforma: ig	2026-03-21 13:31:16	2026-04-01 19:44:51.809	Inversion_Bodegas
5019	5019	\N	\N	\N	NUEVO	\N	\N	Plataforma: ig	2026-03-21 13:42:00	2026-04-01 19:44:51.809	Promo Bodega
5020	5020	\N	\N	\N	NUEVO	\N	\N	Plataforma: fb	2026-03-21 17:49:04	2026-04-01 19:44:51.81	Inversion_Bodegas
5021	5021	\N	\N	\N	NUEVO	\N	\N	Plataforma: ig	2026-03-21 19:39:55	2026-04-01 19:44:51.811	Inversion_Bodegas
5023	5023	\N	\N	\N	NUEVO	\N	\N	Plataforma: fb	2026-03-22 02:01:21	2026-04-01 19:44:51.813	Tandem_Carrusel_UF+8%
5024	5024	\N	\N	\N	NUEVO	\N	\N	Plataforma: ig	2026-03-22 03:08:32	2026-04-01 19:44:51.814	Promo Bodega
5025	5025	\N	\N	\N	NUEVO	\N	\N	Plataforma: ig	2026-03-22 03:25:26	2026-04-01 19:44:51.815	Temuco Bodega
5026	5026	\N	\N	\N	NUEVO	\N	\N	Plataforma: fb	2026-03-22 04:21:27	2026-04-01 19:44:51.816	Tandem_Carrusel_UF+8%
5027	5027	\N	\N	\N	NUEVO	\N	\N	Plataforma: fb	2026-03-22 04:23:15	2026-04-01 19:44:51.816	Tandem_Carrusel_UF+8%
5028	5028	\N	\N	\N	NUEVO	\N	\N	Plataforma: fb	2026-03-22 07:37:39	2026-04-01 19:44:51.817	Promo Bodega
5029	5029	\N	\N	\N	NUEVO	\N	\N	Plataforma: ig	2026-03-22 11:15:42	2026-04-01 19:44:51.818	Inversion_Bodegas
5030	5030	\N	\N	\N	NUEVO	\N	\N	Plataforma: ig	2026-03-22 12:50:57	2026-04-01 19:44:51.819	Tandem_Carrusel_UF+8%
5031	5031	\N	\N	\N	NUEVO	\N	\N	Plataforma: ig	2026-03-22 12:55:06	2026-04-01 19:44:51.82	Inversion_Bodegas
5033	5033	\N	\N	\N	NUEVO	\N	\N	Plataforma: ig	2026-03-22 16:19:00	2026-04-01 19:44:51.822	Inversion_Bodegas
5034	5034	\N	\N	\N	NUEVO	\N	\N	Plataforma: ig	2026-03-22 17:16:52	2026-04-01 19:44:51.823	Inversion_Bodegas
5035	5035	\N	\N	\N	NUEVO	\N	\N	Plataforma: ig	2026-03-22 17:44:19	2026-04-01 19:44:51.824	Promo Bodega
5036	5036	\N	\N	\N	NUEVO	\N	\N	Plataforma: ig	2026-03-22 18:00:21	2026-04-01 19:44:51.824	Inversion_Bodegas
5037	5037	\N	\N	\N	NUEVO	\N	\N	Plataforma: ig	2026-03-22 19:31:30	2026-04-01 19:44:51.825	Inversion_Bodegas
5038	5038	\N	\N	\N	NUEVO	\N	\N	Plataforma: ig	2026-03-22 22:34:08	2026-04-01 19:44:51.826	Tandem_Carrusel_UF+8%
5039	5039	\N	\N	\N	NUEVO	\N	\N	Plataforma: ig	2026-03-22 23:23:11	2026-04-01 19:44:51.827	Promo Bodega
5040	5040	\N	\N	\N	NUEVO	\N	\N	Plataforma: ig	2026-03-22 23:33:29	2026-04-01 19:44:51.828	Inversion_Bodegas
5041	5041	\N	\N	\N	NUEVO	\N	\N	Plataforma: ig	2026-03-23 00:52:43	2026-04-01 19:44:51.829	Inversion_Bodegas
5042	5042	\N	\N	\N	NUEVO	\N	\N	Plataforma: fb	2026-03-23 00:57:48	2026-04-01 19:44:51.83	Promo Bodega
5043	5043	\N	\N	\N	NUEVO	\N	\N	Plataforma: fb	2026-03-23 01:02:19	2026-04-01 19:44:51.83	Inversion_Bodegas
5044	5044	\N	\N	\N	NUEVO	\N	\N	Plataforma: fb	2026-03-23 01:31:25	2026-04-01 19:44:51.831	Promo Bodega
5045	5045	\N	\N	\N	NUEVO	\N	\N	Plataforma: fb	2026-03-23 04:59:16	2026-04-01 19:44:51.832	Temuco Bodega
5046	5046	\N	\N	\N	NUEVO	\N	\N	Plataforma: fb	2026-03-23 08:48:17	2026-04-01 19:44:51.833	Inversion_Bodegas
5047	5047	\N	\N	\N	NUEVO	\N	\N	Plataforma: fb	2026-03-23 13:30:41	2026-04-01 19:44:51.834	Inversion_Bodegas
5048	5048	\N	\N	\N	NUEVO	\N	\N	Plataforma: ig	2026-03-23 14:17:32	2026-04-01 19:44:51.835	Inversion_Bodegas
5049	5049	\N	\N	\N	NUEVO	\N	\N	Plataforma: ig	2026-03-23 14:19:23	2026-04-01 19:44:51.835	Tandem_Carrusel_UF+8%
5050	5050	\N	\N	\N	NUEVO	\N	\N	Plataforma: fb	2026-03-23 15:18:54	2026-04-01 19:44:51.836	Inversion_Bodegas
5051	5051	\N	\N	\N	NUEVO	\N	\N	Plataforma: ig	2026-03-23 15:23:47	2026-04-01 19:44:51.837	Inversion_Bodegas
5052	5052	\N	\N	\N	NUEVO	\N	\N	Plataforma: ig	2026-03-23 16:28:21	2026-04-01 19:44:51.838	Inversion_Bodegas
5053	5053	\N	\N	\N	NUEVO	\N	\N	Plataforma: fb	2026-03-23 18:54:43	2026-04-01 19:44:51.839	Inversion_Bodegas
5054	5054	\N	\N	\N	NUEVO	\N	\N	Plataforma: ig	2026-03-23 19:17:35	2026-04-01 19:44:51.84	Inversion_Bodegas
5056	5056	\N	\N	\N	NUEVO	\N	\N	Plataforma: ig	2026-03-23 20:30:29	2026-04-01 19:44:51.842	Tandem_Carrusel_UF+8%
5057	5057	\N	\N	\N	NUEVO	\N	\N	Plataforma: ig	2026-03-23 21:19:59	2026-04-01 19:44:51.842	Inversion_Bodegas
5058	5058	\N	\N	\N	NUEVO	\N	\N	Plataforma: ig	2026-03-23 21:43:42	2026-04-01 19:44:51.843	Inversion_Bodegas
5059	5059	\N	\N	\N	NUEVO	\N	\N	Plataforma: fb	2026-03-23 23:39:17	2026-04-01 19:44:51.844	Tandem_Carrusel_UF+8%
5060	5060	\N	\N	\N	NUEVO	\N	\N	Plataforma: ig	2026-03-24 03:28:52	2026-04-01 19:44:51.845	Tandem_Carrusel_UF+8%
5061	5061	\N	\N	\N	NUEVO	\N	\N	Plataforma: ig	2026-03-24 10:17:14	2026-04-01 19:44:51.846	Inversion_Bodegas
5062	5062	\N	\N	\N	NUEVO	\N	\N	Plataforma: ig	2026-03-24 10:25:20	2026-04-01 19:44:51.847	Promo Bodega
5063	5063	\N	\N	\N	NUEVO	\N	\N	Plataforma: ig	2026-03-24 16:03:31	2026-04-01 19:44:51.848	Temuco Bodega
5064	5064	\N	\N	\N	NUEVO	\N	\N	Plataforma: ig	2026-03-24 17:08:24	2026-04-01 19:44:51.849	Tandem_Carrusel_UF+8%
5065	5065	\N	\N	\N	NUEVO	\N	\N	Plataforma: ig	2026-03-24 17:41:31	2026-04-01 19:44:51.85	Inversion_Bodegas
5066	5066	\N	\N	\N	NUEVO	\N	\N	Plataforma: fb	2026-03-24 17:46:17	2026-04-01 19:44:51.85	Inversion_Bodegas
5067	5067	\N	\N	\N	NUEVO	\N	\N	Plataforma: fb	2026-03-24 19:16:45	2026-04-01 19:44:51.851	Temuco Bodega
5068	5068	\N	\N	\N	NUEVO	\N	\N	Plataforma: ig	2026-03-24 20:11:35	2026-04-01 19:44:51.852	Inversion_Bodegas
5069	5069	\N	\N	\N	NUEVO	\N	\N	Plataforma: fb	2026-03-24 20:19:20	2026-04-01 19:44:51.853	Tandem_Carrusel_UF+8%
5070	5070	\N	\N	\N	NUEVO	\N	\N	Plataforma: ig	2026-03-24 21:08:19	2026-04-01 19:44:51.854	Inversion_Bodegas
5071	5071	\N	\N	\N	NUEVO	\N	\N	Plataforma: fb	2026-03-24 22:19:31	2026-04-01 19:44:51.855	Promo Bodega
5073	5073	\N	\N	\N	NUEVO	\N	\N	Plataforma: ig	2026-03-25 00:53:53	2026-04-01 19:44:51.857	Inversion_Bodegas
5074	5074	\N	\N	\N	NUEVO	\N	\N	Plataforma: ig	2026-03-25 02:01:43	2026-04-01 19:44:51.857	Tandem_Carrusel_UF+8%
5075	5075	\N	\N	\N	NUEVO	\N	\N	Plataforma: ig	2026-03-25 05:39:58	2026-04-01 19:44:51.858	Tandem_Carrusel_UF+8%
5076	5076	\N	\N	\N	NUEVO	\N	\N	Plataforma: ig	2026-03-25 16:58:57	2026-04-01 19:44:51.859	Tandem_Carrusel_UF+8%
5077	5077	\N	\N	\N	NUEVO	\N	\N	Plataforma: fb	2026-03-25 19:00:21	2026-04-01 19:44:51.86	Tandem_Carrusel_UF+8%
5072	5072	\N	\N	\N	NUEVO	\N	\N	Plataforma: ig	2025-09-12 18:25:57	2026-04-13 16:01:17.33	Inversion_Bodegas
5032	5032	\N	\N	\N	NUEVO	\N	\N	Plataforma: ig	2026-04-03 14:08:03	2026-04-13 16:01:19.413	Tandem_Carrusel_UF+8%
5079	5079	\N	\N	\N	NUEVO	\N	\N	Plataforma: fb	2026-03-26 00:32:30	2026-04-01 19:44:51.862	Promo Bodega
5080	5080	\N	\N	\N	NUEVO	\N	\N	Plataforma: fb	2026-03-26 01:22:36	2026-04-01 19:44:51.863	Inversion_Bodegas
5081	5081	\N	\N	\N	NUEVO	\N	\N	Plataforma: fb	2026-03-26 01:31:39	2026-04-01 19:44:51.864	Inversion_Bodegas
5082	5082	\N	\N	\N	NUEVO	\N	\N	Plataforma: ig	2026-03-26 03:01:50	2026-04-01 19:44:51.865	Promo Bodega
5083	5083	\N	\N	\N	NUEVO	\N	\N	Plataforma: ig	2026-03-26 03:29:40	2026-04-01 19:44:51.865	Inversion_Bodegas
5084	5084	\N	\N	\N	NUEVO	\N	\N	Plataforma: ig	2026-03-26 10:12:10	2026-04-01 19:44:51.866	Inversion_Bodegas
5085	5085	\N	\N	\N	NUEVO	\N	\N	Plataforma: fb	2026-03-26 11:29:56	2026-04-01 19:44:51.867	Tandem_Carrusel_UF+8%
5086	5086	\N	\N	\N	NUEVO	\N	\N	Plataforma: ig	2026-03-26 12:32:14	2026-04-01 19:44:51.868	Seminuevo C3 live vs C-elysee
5087	5087	\N	\N	\N	NUEVO	\N	\N	Plataforma: ig	2026-03-26 14:03:10	2026-04-01 19:44:51.869	Promo Bodega
5088	5088	\N	\N	\N	NUEVO	\N	\N	Plataforma: ig	2026-03-26 14:36:32	2026-04-01 19:44:51.87	Inversion_Bodegas
5089	5089	\N	\N	\N	NUEVO	\N	\N	Plataforma: ig	2026-03-26 15:20:40	2026-04-01 19:44:51.871	Inversion_Bodegas
5090	5090	\N	\N	\N	NUEVO	\N	\N	Plataforma: ig	2026-03-26 15:42:40	2026-04-01 19:44:51.872	Tandem_Carrusel_UF+8%
5091	5091	\N	\N	\N	NUEVO	\N	\N	Plataforma: fb	2026-03-26 18:14:27	2026-04-01 19:44:51.873	Tandem_Carrusel_UF+8%
5092	5092	\N	\N	\N	NUEVO	\N	\N	Plataforma: ig	2026-03-26 20:11:56	2026-04-01 19:44:51.873	Tandem_Carrusel_UF+8%
5093	5093	\N	\N	\N	NUEVO	\N	\N	Plataforma: fb	2026-03-26 20:28:04	2026-04-01 19:44:51.875	Tandem_Carrusel_UF+8%
5094	5094	\N	\N	\N	NUEVO	\N	\N	Plataforma: fb	2026-03-26 20:37:03	2026-04-01 19:44:51.876	Inversion_Bodegas
5095	5095	\N	\N	\N	NUEVO	\N	\N	Plataforma: fb	2026-03-26 23:36:32	2026-04-01 19:44:51.876	Inversion_Bodegas
5096	5096	\N	\N	\N	NUEVO	\N	\N	Plataforma: fb	2026-03-27 01:54:44	2026-04-01 19:44:51.877	Tandem_Carrusel_UF+8%
5097	5097	\N	\N	\N	NUEVO	\N	\N	Plataforma: ig	2026-03-27 02:14:51	2026-04-01 19:44:51.878	Tandem_Carrusel_UF+8%
5098	5098	\N	\N	\N	NUEVO	\N	\N	Plataforma: ig	2026-03-27 02:52:30	2026-04-01 19:44:51.879	Inversion_Bodegas
5099	5099	\N	\N	\N	NUEVO	\N	\N	Plataforma: ig	2026-03-27 03:16:52	2026-04-01 19:44:51.88	Tandem_Carrusel_UF+8%
5100	5100	\N	\N	\N	NUEVO	\N	\N	Plataforma: ig	2026-03-27 04:39:11	2026-04-01 19:44:51.881	Temuco Bodega
5101	5101	\N	\N	\N	NUEVO	\N	\N	Plataforma: fb	2026-03-27 12:10:29	2026-04-01 19:44:51.882	Tandem_Carrusel_UF+8%
5102	5102	\N	\N	\N	NUEVO	\N	\N	Plataforma: fb	2026-03-27 18:47:40	2026-04-01 19:44:51.883	Tandem_Carrusel_UF+8%
5103	5103	\N	\N	\N	NUEVO	\N	\N	Plataforma: ig	2026-03-27 18:54:36	2026-04-01 19:44:51.884	Tandem_Carrusel_UF+8%
5104	5104	\N	\N	\N	NUEVO	\N	\N	Plataforma: fb	2026-03-27 19:29:00	2026-04-01 19:44:51.884	Inversion_Bodegas
5105	5105	\N	\N	\N	NUEVO	\N	\N	Plataforma: ig	2026-03-27 20:15:18	2026-04-01 19:44:51.885	Promo Bodega
5106	5106	\N	\N	\N	NUEVO	\N	\N	Plataforma: fb	2026-03-28 00:47:34	2026-04-01 19:44:51.886	Tandem_Carrusel_UF+8%
5107	5107	\N	\N	\N	NUEVO	\N	\N	Plataforma: ig	2026-03-28 00:51:30	2026-04-01 19:44:51.887	Tandem_Carrusel_UF+8%
5108	5108	\N	\N	\N	NUEVO	\N	\N	Plataforma: ig	2026-03-28 01:24:32	2026-04-01 19:44:51.888	Tandem_Carrusel_UF+8%
5109	5109	\N	\N	\N	NUEVO	\N	\N	Plataforma: fb	2026-03-28 02:24:18	2026-04-01 19:44:51.889	Tandem_Carrusel_UF+8%
5110	5110	\N	\N	\N	NUEVO	\N	\N	Plataforma: ig	2026-03-28 03:00:35	2026-04-01 19:44:51.89	Inversion_Bodegas
5111	5111	\N	\N	\N	NUEVO	\N	\N	Plataforma: ig	2026-03-28 04:09:58	2026-04-01 19:44:51.89	Temuco Bodega
5112	5112	\N	\N	\N	NUEVO	\N	\N	Plataforma: ig	2026-03-28 09:58:09	2026-04-01 19:44:51.891	Inversion_Bodegas
5113	5113	\N	\N	\N	NUEVO	\N	\N	Plataforma: ig	2026-03-28 19:11:39	2026-04-01 19:44:51.892	Promo Bodega
5114	5114	\N	\N	\N	NUEVO	\N	\N	Plataforma: ig	2026-03-28 21:29:12	2026-04-01 19:44:51.893	Tandem_Carrusel_UF+8%
5115	5115	\N	\N	\N	NUEVO	\N	\N	Plataforma: fb	2026-03-28 22:00:31	2026-04-01 19:44:51.894	Tandem_Carrusel_UF+8%
5116	5116	\N	\N	\N	NUEVO	\N	\N	Plataforma: ig	2026-03-29 00:00:45	2026-04-01 19:44:51.895	Temuco Bodega
5117	5117	\N	\N	\N	NUEVO	\N	\N	Plataforma: ig	2026-03-29 00:06:55	2026-04-01 19:44:51.896	Tandem_Carrusel_UF+8%
5118	5118	\N	\N	\N	NUEVO	\N	\N	Plataforma: fb	2026-03-29 00:30:22	2026-04-01 19:44:51.897	Temuco Bodega
5119	5119	\N	\N	\N	NUEVO	\N	\N	Plataforma: ig	2026-03-29 02:07:15	2026-04-01 19:44:51.897	Promo Bodega
5120	5120	\N	\N	\N	NUEVO	\N	\N	Plataforma: ig	2026-03-29 02:30:10	2026-04-01 19:44:51.898	Inversion_Bodegas
5121	5121	\N	\N	\N	NUEVO	\N	\N	Plataforma: fb	2026-03-29 02:46:53	2026-04-01 19:44:51.899	Temuco Bodega
5122	5122	\N	\N	\N	NUEVO	\N	\N	Plataforma: fb	2026-03-29 03:12:47	2026-04-01 19:44:51.9	Tandem_Carrusel_UF+8%
5123	5123	\N	\N	\N	NUEVO	\N	\N	Plataforma: ig	2026-03-29 05:19:57	2026-04-01 19:44:51.901	Inversion_Bodegas
5124	5124	\N	\N	\N	NUEVO	\N	\N	Plataforma: fb	2026-03-29 06:23:51	2026-04-01 19:44:51.902	Tandem_Carrusel_UF+8%
5126	5126	\N	\N	\N	NUEVO	\N	\N	Plataforma: ig	2026-03-29 14:02:21	2026-04-01 19:44:51.904	Tandem_Carrusel_UF+8%
5127	5127	\N	\N	\N	NUEVO	\N	\N	Plataforma: ig	2026-03-29 17:42:34	2026-04-01 19:44:51.905	Inversion_Bodegas
5128	5128	\N	\N	\N	NUEVO	\N	\N	Plataforma: ig	2026-03-29 18:09:35	2026-04-01 19:44:51.906	Tandem_Carrusel_UF+8%
5129	5129	\N	\N	\N	NUEVO	\N	\N	Plataforma: ig	2026-03-29 21:39:36	2026-04-01 19:44:51.906	Tandem_Carrusel_UF+8%
5130	5130	\N	\N	\N	NUEVO	\N	\N	Plataforma: fb	2026-03-29 23:40:19	2026-04-01 19:44:51.908	Tandem_Carrusel_UF+8%
5131	5131	\N	\N	\N	NUEVO	\N	\N	Plataforma: ig	2026-03-30 00:56:41	2026-04-01 19:44:51.908	Tandem_Carrusel_UF+8%
5132	5132	\N	\N	\N	NUEVO	\N	\N	Plataforma: fb	2026-03-30 00:59:30	2026-04-01 19:44:51.909	Tandem_Carrusel_UF+8%
5133	5133	\N	\N	\N	NUEVO	\N	\N	Plataforma: ig	2026-03-30 01:13:05	2026-04-01 19:44:51.91	Tandem_Carrusel_UF+8%
5134	5134	\N	\N	\N	NUEVO	\N	\N	Plataforma: ig	2026-03-30 04:28:28	2026-04-01 19:44:51.911	Promo Bodega
5136	5136	\N	\N	\N	NUEVO	\N	\N	Plataforma: fb	2026-03-30 10:04:47	2026-04-01 19:44:51.913	Promo Bodega
5137	5137	\N	\N	\N	NUEVO	\N	\N	Plataforma: ig	2026-03-30 13:52:50	2026-04-01 19:44:51.914	Tandem_Carrusel_UF+8%
5138	5138	\N	\N	\N	NUEVO	\N	\N	Plataforma: fb	2026-03-30 16:34:08	2026-04-01 19:44:51.915	Promo Bodega
5139	5139	\N	\N	\N	NUEVO	\N	\N	Plataforma: ig	2026-03-30 17:07:29	2026-04-01 19:44:51.916	Tandem_Carrusel_UF+8%
5140	5140	\N	\N	\N	NUEVO	\N	\N	Plataforma: fb	2026-03-30 18:44:48	2026-04-01 19:44:51.916	Promo Bodega
5141	5141	\N	\N	\N	NUEVO	\N	\N	Plataforma: ig	2026-03-30 19:44:58	2026-04-01 19:44:51.917	Promo Bodega
5142	5142	\N	\N	\N	NUEVO	\N	\N	Plataforma: fb	2026-03-30 20:59:16	2026-04-01 19:44:51.918	Temuco Bodega
5143	5143	\N	\N	\N	NUEVO	\N	\N	Plataforma: fb	2026-03-30 21:06:54	2026-04-01 19:44:51.919	Tandem_Carrusel_UF+8%
5144	5144	\N	\N	\N	NUEVO	\N	\N	Plataforma: fb	2026-03-30 22:40:47	2026-04-01 19:44:51.92	Tandem_Carrusel_UF+8%
5145	5145	\N	\N	\N	NUEVO	\N	\N	Plataforma: fb	2026-03-30 23:19:04	2026-04-01 19:44:51.921	Tandem_Carrusel_UF+8%
5146	5146	\N	\N	\N	NUEVO	\N	\N	Plataforma: fb	2026-03-30 23:38:32	2026-04-01 19:44:51.921	Promo Bodega
5147	5147	\N	\N	\N	NUEVO	\N	\N	Plataforma: ig	2026-03-30 23:55:56	2026-04-01 19:44:51.922	Tandem_Carrusel_UF+8%
5148	5148	\N	\N	\N	NUEVO	\N	\N	Plataforma: ig	2026-03-31 00:18:17	2026-04-01 19:44:51.923	Temuco Bodega
5149	5149	\N	\N	\N	NUEVO	\N	\N	Plataforma: fb	2026-03-31 00:40:31	2026-04-01 19:44:51.924	Tandem_Carrusel_UF+8%
5150	5150	\N	\N	\N	NUEVO	\N	\N	Plataforma: ig	2026-03-31 02:24:16	2026-04-01 19:44:51.925	Promo Bodega
5151	5151	\N	\N	\N	NUEVO	\N	\N	Plataforma: ig	2026-03-31 11:30:18	2026-04-01 19:44:51.926	Promo Bodega
5152	5152	\N	\N	\N	NUEVO	\N	\N	Plataforma: fb	2026-03-31 11:33:33	2026-04-01 19:44:51.927	Tandem_Carrusel_UF+8%
5153	5153	\N	\N	\N	NUEVO	\N	\N	Plataforma: ig	2026-03-31 14:38:38	2026-04-01 19:44:51.928	Promo Bodega
5154	5154	\N	\N	\N	NUEVO	\N	\N	Plataforma: fb	2026-03-31 15:20:20	2026-04-01 19:44:51.929	Promo Bodega
5155	5155	\N	\N	\N	NUEVO	\N	\N	Plataforma: fb	2026-03-31 15:40:01	2026-04-01 19:44:51.929	Tandem_Carrusel_UF+8%
5135	5135	\N	\N	\N	NUEVO	\N	\N	Plataforma: ig	2026-04-06 00:35:52	2026-04-13 16:01:19.493	Tandem_Carrusel_UF+8%
5156	5156	\N	\N	\N	NUEVO	\N	\N	Plataforma: fb	2026-03-31 17:34:27	2026-04-01 19:44:51.93	Tandem_Carrusel_UF+8%
5157	5157	\N	\N	\N	NUEVO	\N	\N	Plataforma: ig	2026-03-31 18:44:25	2026-04-01 19:44:51.931	Tandem_Carrusel_UF+8%
5158	5158	\N	\N	\N	NUEVO	\N	\N	Plataforma: fb	2026-04-01 00:33:14	2026-04-01 19:44:51.932	Promo Bodega
5159	5159	\N	\N	\N	NUEVO	\N	\N	Plataforma: fb	2026-04-01 01:30:16	2026-04-01 19:44:51.933	Temuco Bodega
5160	5160	\N	\N	\N	NUEVO	\N	\N	Plataforma: fb	2026-04-01 02:01:48	2026-04-01 19:44:51.934	Tandem_Carrusel_UF+8%
5161	5161	\N	\N	\N	NUEVO	\N	\N	Plataforma: fb	2026-04-01 03:27:42	2026-04-01 19:44:51.934	Promo Bodega
5162	5162	\N	\N	\N	NUEVO	\N	\N	Plataforma: fb	2026-04-01 11:14:05	2026-04-01 19:44:51.935	Tandem_Carrusel_UF+8%
5164	5164	\N	\N	\N	NUEVO	\N	\N	Plataforma: fb	2026-04-01 14:28:11	2026-04-01 19:44:51.938	Tandem_Carrusel_UF+8%
3532	3532	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-29 20:36:15	2026-04-13 16:01:16.755	Inversion_Bodegas
2889	2889	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-29 23:41:01	2026-04-13 16:01:16.773	Carrusel_Sin bancos
3009	3009	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-29 13:53:27	2026-04-13 16:01:16.781	Carrusel_Sin bancos
3047	3047	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-29 00:46:17	2026-04-13 16:01:16.79	Carrusel_Sin bancos
2935	2935	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-28 21:47:01	2026-04-13 16:01:16.8	Carrusel_Sin bancos
2791	2791	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-08-28 17:49:02	2026-04-13 16:01:16.803	Carrusel_Sin bancos
2594	2594	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-30 00:32:57	2026-04-13 16:01:16.804	Llevas 2 años Inv
2665	2665	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-08-30 01:06:36	2026-04-13 16:01:16.805	Carrusel_Sin bancos
2655	2655	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-30 06:26:42	2026-04-13 16:01:16.815	Carrusel_Sin bancos
4437	4437	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-08-30 08:36:27	2026-04-13 16:01:16.818	Inversion_Bodegas
3118	3118	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-30 09:15:22	2026-04-13 16:01:16.823	Carrusel_Sin bancos
3575	3575	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-30 13:34:03	2026-04-13 16:01:16.842	Inversion_Bodegas
4161	4161	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-30 13:49:43	2026-04-13 16:01:16.847	Tandem_Carrusel_UF+8%
3755	3755	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-08-31 23:00:37	2026-04-13 16:01:16.905	Inversion_Bodegas
3998	3998	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-09-02 12:16:13	2026-04-13 16:01:16.991	Tandem_Carrusel_UF+8%
3679	3679	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-09-05 20:23:30	2026-04-13 16:01:17.1	Inversion_Bodegas
3792	3792	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-09-05 23:12:22	2026-04-13 16:01:17.106	Tandem_Carrusel_UF+8%
3390	3390	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-09-07 13:27:27	2026-04-13 16:01:17.155	Inversion_Bodegas
4180	4180	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-09-07 23:47:22	2026-04-13 16:01:17.185	Inversion_Bodegas
3313	3313	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-09-08 11:51:55	2026-04-13 16:01:17.201	Inversion_Bodegas
3477	3477	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-09-08 13:17:23	2026-04-13 16:01:17.207	Tandem_Carrusel_UF+8%
5055	5055	\N	\N	\N	NUEVO	\N	\N	Plataforma: ig	2025-09-11 19:03:54	2026-04-13 16:01:17.292	Tandem_Carrusel_UF+8%
3202	3202	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-09-12 09:05:03	2026-04-13 16:01:17.315	Tandem_Carrusel_UF+8%
4811	4811	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-09-17 11:42:09	2026-04-13 16:01:17.458	Tandem_Carrusel_UF+8%
4719	4719	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-09-19 22:10:38	2026-04-13 16:01:17.534	Inversion_Bodegas
4188	4188	\N	\N	\N	PERDIDO	\N	\N	Plataforma: fb	2025-09-21 00:12:46	2026-04-13 16:01:17.563	Inversion_Bodegas
4508	4508	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-09-24 09:49:59	2026-04-13 16:01:17.672	Tandem_Carrusel_UF+8%
4083	4083	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-09-29 16:32:03	2026-04-13 16:01:17.824	Tandem_Carrusel_UF+8%
4483	4483	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-09-30 21:45:42	2026-04-13 16:01:17.855	Tandem_Carrusel_UF+8%
4680	4680	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-10-08 19:22:42	2026-04-13 16:01:18.058	Tandem_Carrusel_UF+8%
4027	4027	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-10-22 00:33:17	2026-04-13 16:01:18.381	Tandem_Carrusel_UF+8%
4603	4603	\N	\N	\N	PERDIDO	\N	\N	\N	2025-10-25 15:07:19	2026-04-13 16:01:18.489	\N
4336	4336	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-10-30 22:49:04	2026-04-13 16:01:18.621	Tandem_Carrusel_UF+8%
3160	3160	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-11-17 18:07:08	2026-04-13 16:01:18.98	Inversion_Bodegas
4957	4957	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2025-12-02 18:58:30	2026-04-13 16:01:19.131	Inversion_Bodegas
4315	4315	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-04 22:45:03	2026-04-13 16:01:19.258	Inversion_Bodegas
4271	4271	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-02-05 03:16:44	2026-04-13 16:01:19.263	Tandem_Carrusel_UF+8%
4856	4856	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-03-29 08:05:50	2026-04-13 16:01:19.288	Inversion_Bodegas
5125	5125	\N	\N	\N	NUEVO	\N	\N	Plataforma: ig	2026-03-30 01:46:49	2026-04-13 16:01:19.298	Inversion_Bodegas
5022	5022	\N	\N	\N	NUEVO	\N	\N	Plataforma: ig	2026-04-01 02:10:57	2026-04-13 16:01:19.353	Inversion_Bodegas
3935	3935	\N	\N	\N	PERDIDO	\N	\N	Plataforma: ig	2026-04-06 14:24:52	2026-04-13 16:01:19.523	Inversion_Bodegas
5163	5163	\N	\N	\N	NUEVO	\N	\N	Plataforma: fb	2026-04-08 19:04:44	2026-04-13 16:01:19.602	Tandem_Carrusel_UF+8%
2961	2961	\N	\N	\N	ESCRITURA	\N	\N	Plataforma: ig	2025-08-17 02:07:59	2026-04-13 20:22:55.647	Carrusel_Sin bancos
2981	2981	\N	\N	\N	ESCRITURA	\N	\N	Plataforma: ig	2025-08-18 10:11:50	2026-04-13 20:22:58.009	Carrusel_Sin bancos
3545	3545	\N	3	\N	ESCRITURA	\N	\N	Plataforma: ig	2025-12-28 20:34:56	2026-04-13 20:23:00.835	Inversion_Bodegas
3856	3856	\N	\N	\N	RESERVA	\N	\N	Plataforma: ig	2026-01-11 02:25:41	2026-04-13 20:23:02.933	Inversion_Bodegas
4075	4075	\N	\N	\N	PROMESA	\N	\N	\N	2026-01-23 01:38:46	2026-04-13 20:23:05.32	\N
4129	4129	\N	\N	\N	PROMESA	\N	\N	Plataforma: ig	2026-01-25 18:06:55	2026-04-13 20:23:07.682	Tandem_Carrusel_UF+8%
4274	4274	\N	\N	\N	RESERVA	\N	\N	Plataforma: ig	2026-02-02 00:17:14	2026-04-13 20:23:09.632	Inversion_Bodegas
3809	3809	\N	\N	\N	RESERVA	\N	\N	Plataforma: ig	2026-01-08 19:55:12	2026-04-13 20:23:11.588	Inversion_Bodegas
4693	4693	\N	3	\N	PROMESA	\N	\N	Plataforma: ig	2026-03-01 04:30:13	2026-04-13 20:23:13.983	Inversion_Bodegas
\.


--
-- Data for Name: llaves; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.llaves (id, "unidadId", codigo, estado, notas, "creadoEn", "actualizadoEn") FROM stdin;
\.


--
-- Data for Name: movimientos_llaves; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.movimientos_llaves (id, "llaveId", "responsableId", tipo, "personaNombre", "personaContacto", motivo, "fechaPrestamo", "fechaDevolucionEsperada", "fechaDevolucionReal", "creadoEn") FROM stdin;
\.


--
-- Data for Name: notificaciones; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.notificaciones (id, "usuarioId", tipo, mensaje, "referenciaId", "referenciaTipo", leida, "creadoEn") FROM stdin;
\.


--
-- Data for Name: pagos_arriendo; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.pagos_arriendo (id, "arriendoId", mes, "montoUF", "montoCLP", estado, "fechaPago", comprobante, "creadoEn") FROM stdin;
\.


--
-- Data for Name: pagos_arriendo_asegurado; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.pagos_arriendo_asegurado (id, "ventaPromocionId", mes, "montoUF", estado, "fechaPago", comprobante, "creadoEn") FROM stdin;
\.


--
-- Data for Name: planes_pago; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.planes_pago (id, "ventaId", "totalCuotas", "montoUF", "fechaInicio", "creadoEn") FROM stdin;
\.


--
-- Data for Name: postventas; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.postventas (id, "ventaId", "responsableId", tipo, descripcion, estado, prioridad, "fechaApertura", "fechaCierre", resolucion, "creadoEn", "actualizadoEn") FROM stdin;
\.


--
-- Data for Name: procesos_legales; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.procesos_legales (id, "ventaId", "tienePromesa", "estadoActual", "fechaLimiteFirmaCliente", "fechaLimiteFirmaInmob", "fechaLimiteEscritura", "fechaLimiteFirmaNot", "fechaLimiteCBR", "fechaLimiteEntrega", notas, "creadoEn", "actualizadoEn") FROM stdin;
\.


--
-- Data for Name: promociones; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.promociones (id, nombre, descripcion, tipo, "valorPorcentaje", "valorUF", "mesesArriendo", "montoMensualUF", "cuotasSinInteres", "fechaInicio", "fechaFin", activa, "creadoEn", "actualizadoEn", detalle, "minUnidades", categoria) FROM stdin;
\.


--
-- Data for Name: solicitudes_descuento; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.solicitudes_descuento (id, "cotizacionId", "solicitadoPorId", "revisadoPorId", tipo, valor, motivo, estado, comentario, "creadoEn", "revisadoEn") FROM stdin;
\.


--
-- Data for Name: uf_diaria; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.uf_diaria (fecha, "valorPesos", "creadoEn") FROM stdin;
2026-04-01 03:00:00	39841.72	2026-04-01 19:39:59.191
2026-04-02 03:00:00	39841.72	2026-04-02 14:54:42.437
2026-04-03 03:00:00	39841.72	2026-04-03 12:35:07.334
2026-04-04 03:00:00	39841.72	2026-04-04 04:35:26.057
2026-04-06 04:00:00	39841.72	2026-04-06 16:18:22.491
2026-04-07 04:00:00	39841.72	2026-04-07 15:44:37.199
2026-04-13 04:00:00	39894.61	2026-04-13 19:45:56.023
2026-04-14 04:00:00	39907.85	2026-04-14 09:00:06.752
2026-04-15 04:00:00	39921.09	2026-04-15 09:00:04.979
\.


--
-- Data for Name: unidades; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.unidades (id, "edificioId", tipo, subtipo, numero, piso, m2, techado, acceso, "precioUF", "precioMinimoUF", "precioCostoUF", estado, notas, "creadoEn", "actualizadoEn", "ventaId") FROM stdin;
49	5	BODEGA	\N	205	\N	2.42	\N	\N	149	\N	72	DISPONIBLE	\N	2026-04-01 19:41:29.11	2026-04-15 16:27:14	\N
50	5	BODEGA	\N	204	\N	2.37	\N	\N	149	\N	72	DISPONIBLE	\N	2026-04-01 19:41:29.11	2026-04-15 16:27:14	\N
51	5	BODEGA	\N	31	\N	2.48	\N	\N	149	\N	72	DISPONIBLE	\N	2026-04-01 19:41:29.111	2026-04-15 16:27:14	\N
70	9	BODEGA	\N	65	\N	2.32	\N	\N	99	\N	38	DISPONIBLE	\N	2026-04-01 19:41:29.12	2026-04-15 16:27:14	\N
68	9	BODEGA	\N	73	\N	2.29	\N	\N	99	\N	38	DISPONIBLE	\N	2026-04-01 19:41:29.119	2026-04-15 16:27:14	\N
78	4	BODEGA	\N	158	\N	2.56	\N	\N	91	\N	25	DISPONIBLE	\N	2026-04-01 19:41:29.124	2026-04-15 16:27:14	\N
52	5	BODEGA	\N	28	\N	2.48	\N	\N	149	\N	72	DISPONIBLE	\N	2026-04-01 19:41:29.111	2026-04-15 16:27:14	\N
53	5	BODEGA	\N	23	\N	2.48	\N	\N	149	\N	72	DISPONIBLE	\N	2026-04-01 19:41:29.112	2026-04-15 16:27:14	\N
24	4	BODEGA	\N	154	\N	2.18	\N	\N	102	\N	25	DISPONIBLE	\N	2026-04-01 19:41:29.087	2026-04-15 16:27:14	\N
25	4	BODEGA	\N	153	\N	1.96	\N	\N	92	\N	25	DISPONIBLE	\N	2026-04-01 19:41:29.096	2026-04-15 16:27:14	\N
26	4	BODEGA	\N	87	\N	1.47	\N	\N	69	\N	25	DISPONIBLE	\N	2026-04-01 19:41:29.097	2026-04-15 16:27:14	\N
27	4	BODEGA	\N	86	\N	1.98	\N	\N	93	\N	25	DISPONIBLE	\N	2026-04-01 19:41:29.098	2026-04-15 16:27:14	\N
28	4	BODEGA	\N	80	\N	2.38	\N	\N	112	\N	25	DISPONIBLE	\N	2026-04-01 19:41:29.099	2026-04-15 16:27:14	\N
29	4	BODEGA	\N	75	\N	2.51	\N	\N	118	\N	25	DISPONIBLE	\N	2026-04-01 19:41:29.099	2026-04-15 16:27:14	\N
30	4	BODEGA	\N	58	\N	1.66	\N	\N	78	\N	25	DISPONIBLE	\N	2026-04-01 19:41:29.099	2026-04-15 16:27:14	\N
31	4	BODEGA	\N	45	\N	1.47	\N	\N	69	\N	25	DISPONIBLE	\N	2026-04-01 19:41:29.1	2026-04-15 16:27:14	\N
32	4	BODEGA	\N	43	\N	1.66	\N	\N	78	\N	25	DISPONIBLE	\N	2026-04-01 19:41:29.101	2026-04-15 16:27:14	\N
33	4	BODEGA	\N	42	\N	1.66	\N	\N	78	\N	25	DISPONIBLE	\N	2026-04-01 19:41:29.101	2026-04-15 16:27:14	\N
34	4	BODEGA	\N	41	\N	1.66	\N	\N	78	\N	25	DISPONIBLE	\N	2026-04-01 19:41:29.102	2026-04-15 16:27:14	\N
54	6	BODEGA	\N	B55	\N	3.51	\N	\N	106	\N	53	DISPONIBLE	\N	2026-04-01 19:41:29.112	2026-04-15 16:27:14	\N
57	6	BODEGA	\N	B289	\N	3.15	\N	\N	94	\N	47	DISPONIBLE	\N	2026-04-01 19:41:29.114	2026-04-15 16:27:14	\N
83	5	BODEGA	\N	35	\N	2.48	\N	\N	144	\N	72	DISPONIBLE	\N	2026-04-01 19:41:29.129	2026-04-15 16:27:14	\N
84	5	BODEGA	\N	34	\N	2.48	\N	\N	144	\N	72	DISPONIBLE	\N	2026-04-01 19:41:29.129	2026-04-15 16:27:14	\N
85	5	BODEGA	\N	33	\N	2.48	\N	\N	149	\N	72	DISPONIBLE	\N	2026-04-01 19:41:29.13	2026-04-15 16:27:14	\N
86	5	BODEGA	\N	32	\N	2.48	\N	\N	139	\N	72	DISPONIBLE	\N	2026-04-01 19:41:29.13	2026-04-15 16:27:14	\N
87	5	BODEGA	\N	27	\N	2.48	\N	\N	149	\N	72	DISPONIBLE	\N	2026-04-01 19:41:29.131	2026-04-15 16:27:14	\N
88	5	BODEGA	\N	26	\N	2.48	\N	\N	149	\N	72	DISPONIBLE	\N	2026-04-01 19:41:29.131	2026-04-15 16:27:14	\N
89	5	BODEGA	\N	20	\N	2.56	\N	\N	149	\N	72	DISPONIBLE	\N	2026-04-01 19:41:29.131	2026-04-15 16:27:14	\N
90	5	BODEGA	\N	17	\N	2.53	\N	\N	149	\N	72	DISPONIBLE	\N	2026-04-01 19:41:29.132	2026-04-15 16:27:14	\N
91	5	BODEGA	\N	15	\N	2.53	\N	\N	149	\N	72	DISPONIBLE	\N	2026-04-01 19:41:29.132	2026-04-15 16:27:14	\N
92	5	BODEGA	\N	11	\N	2.61	\N	\N	149	\N	72	DISPONIBLE	\N	2026-04-01 19:41:29.133	2026-04-15 16:27:14	\N
99	9	BODEGA	\N	82	\N	2.4	\N	\N	94	\N	38	DISPONIBLE	\N	2026-04-01 19:41:29.141	2026-04-15 16:27:14	\N
100	9	BODEGA	\N	79	\N	3.08	\N	\N	99	\N	38	DISPONIBLE	\N	2026-04-01 19:41:29.141	2026-04-15 16:27:14	\N
101	9	BODEGA	\N	57	\N	3.08	\N	\N	99	\N	38	DISPONIBLE	\N	2026-04-01 19:41:29.142	2026-04-15 16:27:14	\N
102	9	BODEGA	\N	50	\N	3.12	\N	\N	94	\N	38	DISPONIBLE	\N	2026-04-01 19:41:29.142	2026-04-15 16:27:14	\N
103	9	BODEGA	\N	48	\N	2.48	\N	\N	99	\N	38	DISPONIBLE	\N	2026-04-01 19:41:29.143	2026-04-15 16:27:14	\N
35	4	BODEGA	\N	40	\N	1.77	\N	\N	83	\N	25	DISPONIBLE	\N	2026-04-01 19:41:29.102	2026-04-15 16:27:14	\N
36	4	BODEGA	\N	28	\N	2.12	\N	\N	100	\N	25	DISPONIBLE	\N	2026-04-01 19:41:29.103	2026-04-15 16:27:14	\N
37	4	BODEGA	\N	24	\N	1.87	\N	\N	88	\N	25	DISPONIBLE	\N	2026-04-01 19:41:29.103	2026-04-15 16:27:14	\N
38	4	BODEGA	\N	159	\N	1.6	\N	\N	75	\N	25	DISPONIBLE	\N	2026-04-01 19:41:29.104	2026-04-15 16:27:14	\N
39	4	BODEGA	\N	152	\N	1.85	\N	\N	87	\N	25	DISPONIBLE	\N	2026-04-01 19:41:29.104	2026-04-15 16:27:14	\N
40	4	BODEGA	\N	151	\N	1.6	\N	\N	75	\N	25	DISPONIBLE	\N	2026-04-01 19:41:29.105	2026-04-15 16:27:14	\N
41	4	BODEGA	\N	139	\N	2.51	\N	\N	118	\N	25	DISPONIBLE	\N	2026-04-01 19:41:29.106	2026-04-15 16:27:14	\N
42	4	BODEGA	\N	133	\N	2.02	\N	\N	95	\N	25	DISPONIBLE	\N	2026-04-01 19:41:29.106	2026-04-15 16:27:14	\N
43	4	BODEGA	\N	128	\N	1.96	\N	\N	92	\N	25	DISPONIBLE	\N	2026-04-01 19:41:29.107	2026-04-15 16:27:14	\N
44	4	BODEGA	\N	126	\N	1.76	\N	\N	83	\N	25	DISPONIBLE	\N	2026-04-01 19:41:29.107	2026-04-15 16:27:14	\N
45	4	BODEGA	\N	120	\N	1.66	\N	\N	78	\N	25	DISPONIBLE	\N	2026-04-01 19:41:29.107	2026-04-15 16:27:14	\N
47	4	BODEGA	\N	106	\N	1.66	\N	\N	78	\N	25	DISPONIBLE	\N	2026-04-01 19:41:29.108	2026-04-15 16:27:14	\N
48	4	BODEGA	\N	105	\N	1.66	\N	\N	78	\N	25	DISPONIBLE	\N	2026-04-01 19:41:29.109	2026-04-15 16:27:14	\N
81	4	BODEGA	\N	150	\N	1.76	\N	\N	83	\N	25	DISPONIBLE	\N	2026-04-01 19:41:29.128	2026-04-15 16:27:14	\N
82	4	BODEGA	\N	143	\N	1.89	\N	\N	89	\N	25	DISPONIBLE	\N	2026-04-01 19:41:29.128	2026-04-15 16:27:14	\N
93	6	BODEGA	\N	B142	\N	2.04	\N	\N	62	\N	31	DISPONIBLE	\N	2026-04-01 19:41:29.133	2026-04-15 16:27:14	\N
94	6	BODEGA	\N	B298	\N	2.33	\N	\N	70	\N	35	DISPONIBLE	\N	2026-04-01 19:41:29.133	2026-04-15 16:27:14	\N
95	6	BODEGA	\N	B251	\N	2.33	\N	\N	70	\N	35	DISPONIBLE	\N	2026-04-01 19:41:29.134	2026-04-15 16:27:14	\N
96	6	BODEGA	\N	B56	\N	4.26	\N	\N	128	\N	64	DISPONIBLE	\N	2026-04-01 19:41:29.134	2026-04-15 16:27:14	\N
97	7	ESTACIONAMIENTO	\N	E58	\N	12.5	\N	\N	249	\N	150	DISPONIBLE	\N	2026-04-01 19:41:29.135	2026-04-15 16:27:14	\N
98	7	ESTACIONAMIENTO	TANDEM	95-96	\N	25	\N	\N	349	\N	250	DISPONIBLE	\N	2026-04-01 19:41:29.14	2026-04-15 16:27:14	\N
73	9	BODEGA	\N	58	\N	3.08	\N	\N	99	\N	38	DISPONIBLE	\N	2026-04-01 19:41:29.122	2026-04-15 16:27:14	\N
64	8	ESTACIONAMIENTO	TANDEM	E14-E16	\N	25	\N	\N	419	\N	250	DISPONIBLE	\N	2026-04-01 19:41:29.117	2026-04-15 16:27:14	\N
65	8	ESTACIONAMIENTO	TANDEM	E1-E3	\N	25	\N	\N	419	\N	250	DISPONIBLE	\N	2026-04-01 19:41:29.118	2026-04-15 16:27:14	\N
69	9	BODEGA	\N	72	\N	3.01	\N	\N	99	\N	38	DISPONIBLE	\N	2026-04-01 19:41:29.12	2026-04-15 16:27:14	\N
67	9	BODEGA	\N	1	\N	2.65	\N	\N	99	\N	38	DISPONIBLE	\N	2026-04-01 19:41:29.119	2026-04-15 16:27:14	\N
63	8	ESTACIONAMIENTO	TANDEM	E2-E4	\N	25	\N	\N	419	\N	250	DISPONIBLE	\N	2026-04-01 19:41:29.117	2026-04-15 16:27:14	\N
61	6	BODEGA	\N	B149	\N	9.87	\N	\N	296	\N	148	DISPONIBLE	\N	2026-04-01 19:41:29.116	2026-04-15 16:27:14	\N
79	4	BODEGA	\N	89	\N	1.23	\N	\N	58	\N	25	DISPONIBLE	\N	2026-04-01 19:41:29.124	2026-04-15 16:27:14	\N
77	9	BODEGA	\N	15	\N	2.97	\N	\N	99	\N	38	DISPONIBLE	\N	2026-04-01 19:41:29.124	2026-04-15 16:27:14	\N
55	6	BODEGA	\N	B91	\N	3.39	\N	\N	102	\N	51	DISPONIBLE	\N	2026-04-01 19:41:29.113	2026-04-15 16:27:14	\N
80	4	BODEGA	\N	79	\N	1.89	\N	\N	89	\N	25	DISPONIBLE	\N	2026-04-01 19:41:29.125	2026-04-15 16:27:14	\N
58	6	BODEGA	\N	B171	\N	5.35	\N	\N	160	\N	80	DISPONIBLE	\N	2026-04-01 19:41:29.114	2026-04-15 16:27:14	\N
46	4	BODEGA	\N	110	\N	1.87	\N	\N	88	\N	25	DISPONIBLE	\N	2026-04-01 19:41:29.108	2026-04-15 16:27:14	\N
74	9	BODEGA	\N	46	\N	2.39	\N	\N	99	\N	38	DISPONIBLE	\N	2026-04-01 19:41:29.122	2026-04-15 16:27:14	\N
66	9	BODEGA	\N	2	\N	2.84	\N	\N	99	\N	38	DISPONIBLE	\N	2026-04-01 19:41:29.118	2026-04-15 16:27:14	\N
56	6	BODEGA	\N	B107	\N	4	\N	\N	120	\N	60	DISPONIBLE	\N	2026-04-01 19:41:29.113	2026-04-15 16:27:14	\N
59	6	BODEGA	\N	B209	\N	6.15	\N	\N	184	\N	92	DISPONIBLE	\N	2026-04-01 19:41:29.115	2026-04-15 16:27:14	\N
72	9	BODEGA	\N	61	\N	2.83	\N	\N	99	\N	38	DISPONIBLE	\N	2026-04-01 19:41:29.121	2026-04-15 16:27:14	\N
62	7	ESTACIONAMIENTO	TANDEM	50-51	\N	25	\N	\N	349	\N	200	DISPONIBLE	\N	2026-04-01 19:41:29.116	2026-04-15 16:27:14	\N
75	9	BODEGA	\N	43	\N	2.8	\N	\N	99	\N	38	DISPONIBLE	\N	2026-04-01 19:41:29.123	2026-04-15 16:27:14	\N
60	6	BODEGA	\N	B208	\N	10.38	\N	\N	312	\N	156	DISPONIBLE	\N	2026-04-01 19:41:29.115	2026-04-15 16:27:14	\N
76	9	BODEGA	\N	34	\N	2.86	\N	\N	99	\N	38	DISPONIBLE	\N	2026-04-01 19:41:29.123	2026-04-15 16:27:14	\N
71	9	BODEGA	\N	63	\N	2.33	\N	\N	99	\N	38	DISPONIBLE	\N	2026-04-01 19:41:29.121	2026-04-15 16:27:14	\N
\.


--
-- Data for Name: unidades_promociones; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.unidades_promociones ("unidadId", "promocionId", "asignadoEn") FROM stdin;
\.


--
-- Data for Name: usuarios; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.usuarios (id, nombre, apellido, email, password, telefono, rol, "comisionPorcentaje", "comisionFijo", activo, "creadoEn", "actualizadoEn") FROM stdin;
1	Admin	Gerente	gerente@bodeparking.cl	$2b$10$f8IO7ezaa9.bTYTjCbsM/.TcqdTCU3xFxFg0x2TLdSQ9h1gWSC7UG	\N	GERENTE	\N	\N	t	2026-03-25 18:51:42.447	2026-03-25 18:51:42.447
5	Pedro	González	vendedor1@bodeparking.cl	$2b$10$Fm6U5cvTcPW1CM77Z/Ukw.hiIctsCLKERPRwGJdfjb4lsT16t5qqC	+56934567890	VENDEDOR	4	\N	t	2026-03-25 19:29:13.259	2026-03-25 19:29:13.259
6	Roberto	Vargas	broker@inmobiliaria.cl	$2b$10$Fm6U5cvTcPW1CM77Z/Ukw.hiIctsCLKERPRwGJdfjb4lsT16t5qqC	+56956789012	BROKER_EXTERNO	8	\N	t	2026-03-25 19:29:13.259	2026-03-25 19:29:13.259
4	Claudia	Torres	abogado@bodeparking.cl	$2b$10$Fm6U5cvTcPW1CM77Z/Ukw.hiIctsCLKERPRwGJdfjb4lsT16t5qqC	+56967890123	ABOGADO	\N	\N	t	2026-03-25 19:29:13.259	2026-03-25 19:29:13.259
2	Ana	Rodríguez	jefe@bodeparking.cl	$2b$10$Fm6U5cvTcPW1CM77Z/Ukw.hiIctsCLKERPRwGJdfjb4lsT16t5qqC	+56923456789	JEFE_VENTAS	1	\N	t	2026-03-25 19:29:13.259	2026-03-25 19:29:13.259
3	María	López	vendedor2@bodeparking.cl	$2b$10$Fm6U5cvTcPW1CM77Z/Ukw.hiIctsCLKERPRwGJdfjb4lsT16t5qqC	+56945678901	VENDEDOR	4	\N	t	2026-03-25 19:29:13.259	2026-03-25 19:29:13.259
\.


--
-- Data for Name: ventas; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.ventas (id, "leadId", "compradorId", "vendedorId", "brokerId", "gerenteId", "precioUF", "descuentoUF", estado, "fechaReserva", "fechaPromesa", "fechaEscritura", "fechaEntrega", notas, "creadoEn", "actualizadoEn", "cotizacionOrigenId") FROM stdin;
\.


--
-- Data for Name: ventas_promociones; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.ventas_promociones (id, "ventaId", "promocionId", "gastosNotarialesPagados", "gastosMonto") FROM stdin;
\.


--
-- Data for Name: visitas; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.visitas (id, "leadId", "vendedorId", "fechaHora", tipo, resultado, notas, "creadoEn", "edificioId") FROM stdin;
\.


--
-- Name: alertas_config_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.alertas_config_id_seq', 7, true);


--
-- Name: api_keys_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.api_keys_id_seq', 2, true);


--
-- Name: archivos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.archivos_id_seq', 1, false);


--
-- Name: arriendos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.arriendos_id_seq', 2, true);


--
-- Name: comisiones_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.comisiones_id_seq', 5, true);


--
-- Name: contactos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.contactos_id_seq', 5170, true);


--
-- Name: cotizacion_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.cotizacion_items_id_seq', 20, true);


--
-- Name: cotizacion_promociones_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.cotizacion_promociones_id_seq', 8, true);


--
-- Name: cotizaciones_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.cotizaciones_id_seq', 8, true);


--
-- Name: cuotas_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.cuotas_id_seq', 13, true);


--
-- Name: documentos_legales_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.documentos_legales_id_seq', 1, false);


--
-- Name: edificios_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.edificios_id_seq', 9, true);


--
-- Name: interacciones_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.interacciones_id_seq', 30, true);


--
-- Name: leads_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.leads_id_seq', 5233, true);


--
-- Name: llaves_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.llaves_id_seq', 20, true);


--
-- Name: movimientos_llaves_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.movimientos_llaves_id_seq', 1, true);


--
-- Name: notificaciones_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.notificaciones_id_seq', 2, true);


--
-- Name: pagos_arriendo_asegurado_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.pagos_arriendo_asegurado_id_seq', 1, false);


--
-- Name: pagos_arriendo_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.pagos_arriendo_id_seq', 1, false);


--
-- Name: planes_pago_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.planes_pago_id_seq', 4, true);


--
-- Name: postventas_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.postventas_id_seq', 1, false);


--
-- Name: procesos_legales_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.procesos_legales_id_seq', 4, true);


--
-- Name: promociones_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.promociones_id_seq', 6, true);


--
-- Name: solicitudes_descuento_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.solicitudes_descuento_id_seq', 2, true);


--
-- Name: unidades_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.unidades_id_seq', 103, true);


--
-- Name: usuarios_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.usuarios_id_seq', 6, true);


--
-- Name: ventas_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.ventas_id_seq', 40, true);


--
-- Name: ventas_promociones_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.ventas_promociones_id_seq', 1, false);


--
-- Name: visitas_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.visitas_id_seq', 4, true);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: alertas_config alertas_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alertas_config
    ADD CONSTRAINT alertas_config_pkey PRIMARY KEY (id);


--
-- Name: api_keys api_keys_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_keys
    ADD CONSTRAINT api_keys_pkey PRIMARY KEY (id);


--
-- Name: archivos archivos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.archivos
    ADD CONSTRAINT archivos_pkey PRIMARY KEY (id);


--
-- Name: arriendos arriendos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.arriendos
    ADD CONSTRAINT arriendos_pkey PRIMARY KEY (id);


--
-- Name: comisiones comisiones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comisiones
    ADD CONSTRAINT comisiones_pkey PRIMARY KEY (id);


--
-- Name: contactos contactos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contactos
    ADD CONSTRAINT contactos_pkey PRIMARY KEY (id);


--
-- Name: cotizacion_items cotizacion_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cotizacion_items
    ADD CONSTRAINT cotizacion_items_pkey PRIMARY KEY (id);


--
-- Name: cotizacion_promociones cotizacion_promociones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cotizacion_promociones
    ADD CONSTRAINT cotizacion_promociones_pkey PRIMARY KEY (id);


--
-- Name: cotizaciones cotizaciones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cotizaciones
    ADD CONSTRAINT cotizaciones_pkey PRIMARY KEY (id);


--
-- Name: cuotas cuotas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cuotas
    ADD CONSTRAINT cuotas_pkey PRIMARY KEY (id);


--
-- Name: documentos_legales documentos_legales_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documentos_legales
    ADD CONSTRAINT documentos_legales_pkey PRIMARY KEY (id);


--
-- Name: edificios edificios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.edificios
    ADD CONSTRAINT edificios_pkey PRIMARY KEY (id);


--
-- Name: interacciones interacciones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interacciones
    ADD CONSTRAINT interacciones_pkey PRIMARY KEY (id);


--
-- Name: leads leads_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_pkey PRIMARY KEY (id);


--
-- Name: llaves llaves_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.llaves
    ADD CONSTRAINT llaves_pkey PRIMARY KEY (id);


--
-- Name: movimientos_llaves movimientos_llaves_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movimientos_llaves
    ADD CONSTRAINT movimientos_llaves_pkey PRIMARY KEY (id);


--
-- Name: notificaciones notificaciones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notificaciones
    ADD CONSTRAINT notificaciones_pkey PRIMARY KEY (id);


--
-- Name: pagos_arriendo_asegurado pagos_arriendo_asegurado_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pagos_arriendo_asegurado
    ADD CONSTRAINT pagos_arriendo_asegurado_pkey PRIMARY KEY (id);


--
-- Name: pagos_arriendo pagos_arriendo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pagos_arriendo
    ADD CONSTRAINT pagos_arriendo_pkey PRIMARY KEY (id);


--
-- Name: planes_pago planes_pago_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.planes_pago
    ADD CONSTRAINT planes_pago_pkey PRIMARY KEY (id);


--
-- Name: postventas postventas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.postventas
    ADD CONSTRAINT postventas_pkey PRIMARY KEY (id);


--
-- Name: procesos_legales procesos_legales_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.procesos_legales
    ADD CONSTRAINT procesos_legales_pkey PRIMARY KEY (id);


--
-- Name: promociones promociones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promociones
    ADD CONSTRAINT promociones_pkey PRIMARY KEY (id);


--
-- Name: solicitudes_descuento solicitudes_descuento_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.solicitudes_descuento
    ADD CONSTRAINT solicitudes_descuento_pkey PRIMARY KEY (id);


--
-- Name: uf_diaria uf_diaria_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.uf_diaria
    ADD CONSTRAINT uf_diaria_pkey PRIMARY KEY (fecha);


--
-- Name: unidades unidades_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unidades
    ADD CONSTRAINT unidades_pkey PRIMARY KEY (id);


--
-- Name: unidades_promociones unidades_promociones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unidades_promociones
    ADD CONSTRAINT unidades_promociones_pkey PRIMARY KEY ("unidadId", "promocionId");


--
-- Name: usuarios usuarios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_pkey PRIMARY KEY (id);


--
-- Name: ventas ventas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ventas
    ADD CONSTRAINT ventas_pkey PRIMARY KEY (id);


--
-- Name: ventas_promociones ventas_promociones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ventas_promociones
    ADD CONSTRAINT ventas_promociones_pkey PRIMARY KEY (id);


--
-- Name: visitas visitas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.visitas
    ADD CONSTRAINT visitas_pkey PRIMARY KEY (id);


--
-- Name: alertas_config_tipo_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX alertas_config_tipo_key ON public.alertas_config USING btree (tipo);


--
-- Name: api_keys_key_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX api_keys_key_key ON public.api_keys USING btree (key);


--
-- Name: cotizacion_promociones_cotizacionId_promocionId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "cotizacion_promociones_cotizacionId_promocionId_key" ON public.cotizacion_promociones USING btree ("cotizacionId", "promocionId");


--
-- Name: planes_pago_ventaId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "planes_pago_ventaId_key" ON public.planes_pago USING btree ("ventaId");


--
-- Name: procesos_legales_ventaId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "procesos_legales_ventaId_key" ON public.procesos_legales USING btree ("ventaId");


--
-- Name: usuarios_email_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX usuarios_email_key ON public.usuarios USING btree (email);


--
-- Name: ventas_cotizacionOrigenId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ventas_cotizacionOrigenId_key" ON public.ventas USING btree ("cotizacionOrigenId");


--
-- Name: ventas_leadId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ventas_leadId_key" ON public.ventas USING btree ("leadId");


--
-- Name: ventas_promociones_ventaId_promocionId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ventas_promociones_ventaId_promocionId_key" ON public.ventas_promociones USING btree ("ventaId", "promocionId");


--
-- Name: archivos archivos_unidadId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.archivos
    ADD CONSTRAINT "archivos_unidadId_fkey" FOREIGN KEY ("unidadId") REFERENCES public.unidades(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: arriendos arriendos_contactoId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.arriendos
    ADD CONSTRAINT "arriendos_contactoId_fkey" FOREIGN KEY ("contactoId") REFERENCES public.contactos(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: arriendos arriendos_unidadId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.arriendos
    ADD CONSTRAINT "arriendos_unidadId_fkey" FOREIGN KEY ("unidadId") REFERENCES public.unidades(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: comisiones comisiones_usuarioId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comisiones
    ADD CONSTRAINT "comisiones_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES public.usuarios(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: comisiones comisiones_ventaId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comisiones
    ADD CONSTRAINT "comisiones_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES public.ventas(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cotizacion_items cotizacion_items_cotizacionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cotizacion_items
    ADD CONSTRAINT "cotizacion_items_cotizacionId_fkey" FOREIGN KEY ("cotizacionId") REFERENCES public.cotizaciones(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: cotizacion_items cotizacion_items_unidadId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cotizacion_items
    ADD CONSTRAINT "cotizacion_items_unidadId_fkey" FOREIGN KEY ("unidadId") REFERENCES public.unidades(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cotizacion_promociones cotizacion_promociones_cotizacionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cotizacion_promociones
    ADD CONSTRAINT "cotizacion_promociones_cotizacionId_fkey" FOREIGN KEY ("cotizacionId") REFERENCES public.cotizaciones(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: cotizacion_promociones cotizacion_promociones_promocionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cotizacion_promociones
    ADD CONSTRAINT "cotizacion_promociones_promocionId_fkey" FOREIGN KEY ("promocionId") REFERENCES public.promociones(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cotizaciones cotizaciones_creadoPorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cotizaciones
    ADD CONSTRAINT "cotizaciones_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES public.usuarios(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cotizaciones cotizaciones_leadId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cotizaciones
    ADD CONSTRAINT "cotizaciones_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES public.leads(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cuotas cuotas_planPagoId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cuotas
    ADD CONSTRAINT "cuotas_planPagoId_fkey" FOREIGN KEY ("planPagoId") REFERENCES public.planes_pago(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: documentos_legales documentos_legales_procesoLegalId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documentos_legales
    ADD CONSTRAINT "documentos_legales_procesoLegalId_fkey" FOREIGN KEY ("procesoLegalId") REFERENCES public.procesos_legales(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: documentos_legales documentos_legales_subioPorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documentos_legales
    ADD CONSTRAINT "documentos_legales_subioPorId_fkey" FOREIGN KEY ("subioPorId") REFERENCES public.usuarios(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: interacciones interacciones_leadId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interacciones
    ADD CONSTRAINT "interacciones_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES public.leads(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: interacciones interacciones_usuarioId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interacciones
    ADD CONSTRAINT "interacciones_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES public.usuarios(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: leads leads_brokerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT "leads_brokerId_fkey" FOREIGN KEY ("brokerId") REFERENCES public.usuarios(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: leads leads_contactoId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT "leads_contactoId_fkey" FOREIGN KEY ("contactoId") REFERENCES public.contactos(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: leads leads_unidadInteresId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT "leads_unidadInteresId_fkey" FOREIGN KEY ("unidadInteresId") REFERENCES public.unidades(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: leads leads_vendedorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT "leads_vendedorId_fkey" FOREIGN KEY ("vendedorId") REFERENCES public.usuarios(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: llaves llaves_unidadId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.llaves
    ADD CONSTRAINT "llaves_unidadId_fkey" FOREIGN KEY ("unidadId") REFERENCES public.unidades(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: movimientos_llaves movimientos_llaves_llaveId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movimientos_llaves
    ADD CONSTRAINT "movimientos_llaves_llaveId_fkey" FOREIGN KEY ("llaveId") REFERENCES public.llaves(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: movimientos_llaves movimientos_llaves_responsableId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movimientos_llaves
    ADD CONSTRAINT "movimientos_llaves_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES public.usuarios(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: notificaciones notificaciones_usuarioId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notificaciones
    ADD CONSTRAINT "notificaciones_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES public.usuarios(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: pagos_arriendo pagos_arriendo_arriendoId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pagos_arriendo
    ADD CONSTRAINT "pagos_arriendo_arriendoId_fkey" FOREIGN KEY ("arriendoId") REFERENCES public.arriendos(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: pagos_arriendo_asegurado pagos_arriendo_asegurado_ventaPromocionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pagos_arriendo_asegurado
    ADD CONSTRAINT "pagos_arriendo_asegurado_ventaPromocionId_fkey" FOREIGN KEY ("ventaPromocionId") REFERENCES public.ventas_promociones(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: planes_pago planes_pago_ventaId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.planes_pago
    ADD CONSTRAINT "planes_pago_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES public.ventas(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: postventas postventas_responsableId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.postventas
    ADD CONSTRAINT "postventas_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES public.usuarios(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: postventas postventas_ventaId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.postventas
    ADD CONSTRAINT "postventas_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES public.ventas(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: procesos_legales procesos_legales_ventaId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.procesos_legales
    ADD CONSTRAINT "procesos_legales_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES public.ventas(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: solicitudes_descuento solicitudes_descuento_cotizacionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.solicitudes_descuento
    ADD CONSTRAINT "solicitudes_descuento_cotizacionId_fkey" FOREIGN KEY ("cotizacionId") REFERENCES public.cotizaciones(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: solicitudes_descuento solicitudes_descuento_revisadoPorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.solicitudes_descuento
    ADD CONSTRAINT "solicitudes_descuento_revisadoPorId_fkey" FOREIGN KEY ("revisadoPorId") REFERENCES public.usuarios(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: solicitudes_descuento solicitudes_descuento_solicitadoPorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.solicitudes_descuento
    ADD CONSTRAINT "solicitudes_descuento_solicitadoPorId_fkey" FOREIGN KEY ("solicitadoPorId") REFERENCES public.usuarios(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: unidades unidades_edificioId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unidades
    ADD CONSTRAINT "unidades_edificioId_fkey" FOREIGN KEY ("edificioId") REFERENCES public.edificios(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: unidades_promociones unidades_promociones_promocionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unidades_promociones
    ADD CONSTRAINT "unidades_promociones_promocionId_fkey" FOREIGN KEY ("promocionId") REFERENCES public.promociones(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: unidades_promociones unidades_promociones_unidadId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unidades_promociones
    ADD CONSTRAINT "unidades_promociones_unidadId_fkey" FOREIGN KEY ("unidadId") REFERENCES public.unidades(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: unidades unidades_ventaId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unidades
    ADD CONSTRAINT "unidades_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES public.ventas(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ventas ventas_brokerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ventas
    ADD CONSTRAINT "ventas_brokerId_fkey" FOREIGN KEY ("brokerId") REFERENCES public.usuarios(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ventas ventas_compradorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ventas
    ADD CONSTRAINT "ventas_compradorId_fkey" FOREIGN KEY ("compradorId") REFERENCES public.contactos(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ventas ventas_cotizacionOrigenId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ventas
    ADD CONSTRAINT "ventas_cotizacionOrigenId_fkey" FOREIGN KEY ("cotizacionOrigenId") REFERENCES public.cotizaciones(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ventas ventas_gerenteId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ventas
    ADD CONSTRAINT "ventas_gerenteId_fkey" FOREIGN KEY ("gerenteId") REFERENCES public.usuarios(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ventas ventas_leadId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ventas
    ADD CONSTRAINT "ventas_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES public.leads(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ventas_promociones ventas_promociones_promocionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ventas_promociones
    ADD CONSTRAINT "ventas_promociones_promocionId_fkey" FOREIGN KEY ("promocionId") REFERENCES public.promociones(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ventas_promociones ventas_promociones_ventaId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ventas_promociones
    ADD CONSTRAINT "ventas_promociones_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES public.ventas(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ventas ventas_vendedorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ventas
    ADD CONSTRAINT "ventas_vendedorId_fkey" FOREIGN KEY ("vendedorId") REFERENCES public.usuarios(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: visitas visitas_edificioId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.visitas
    ADD CONSTRAINT "visitas_edificioId_fkey" FOREIGN KEY ("edificioId") REFERENCES public.edificios(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: visitas visitas_leadId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.visitas
    ADD CONSTRAINT "visitas_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES public.leads(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: visitas visitas_vendedorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.visitas
    ADD CONSTRAINT "visitas_vendedorId_fkey" FOREIGN KEY ("vendedorId") REFERENCES public.usuarios(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

\unrestrict wdioKcttrnMOAKWhIHy2Mae0FEeEf8x6iiRHBk4tQFBbs4UgDvb6fqlsG7ARdrP

