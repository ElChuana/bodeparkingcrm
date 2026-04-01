-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('GERENTE', 'JEFE_VENTAS', 'VENDEDOR', 'BROKER_EXTERNO', 'ABOGADO');

-- CreateEnum
CREATE TYPE "TipoUnidad" AS ENUM ('BODEGA', 'ESTACIONAMIENTO');

-- CreateEnum
CREATE TYPE "SubtipoEstacionamiento" AS ENUM ('NORMAL', 'TANDEM');

-- CreateEnum
CREATE TYPE "AccesoUnidad" AS ENUM ('NIVEL', 'SUBTERRANEO');

-- CreateEnum
CREATE TYPE "EstadoUnidad" AS ENUM ('DISPONIBLE', 'RESERVADO', 'VENDIDO', 'ARRENDADO');

-- CreateEnum
CREATE TYPE "EtapaLead" AS ENUM ('NUEVO', 'NO_CONTESTA', 'SEGUIMIENTO', 'COTIZACION_ENVIADA', 'VISITA_AGENDADA', 'VISITA_REALIZADA', 'SEGUIMIENTO_POST_VISITA', 'NEGOCIACION', 'RESERVA', 'PROMESA', 'ESCRITURA', 'ENTREGA', 'POSTVENTA', 'PERDIDO');

-- CreateEnum
CREATE TYPE "OrigenLead" AS ENUM ('INSTAGRAM', 'GOOGLE', 'REFERIDO', 'BROKER', 'VISITA_DIRECTA', 'WEB', 'OTRO');

-- CreateEnum
CREATE TYPE "TipoInteraccion" AS ENUM ('LLAMADA', 'EMAIL', 'WHATSAPP', 'REUNION', 'NOTA');

-- CreateEnum
CREATE TYPE "EstadoVenta" AS ENUM ('RESERVA', 'PROMESA', 'ESCRITURA', 'ENTREGADO', 'ANULADO');

-- CreateEnum
CREATE TYPE "EstadoLegal" AS ENUM ('FIRMA_CLIENTE_PROMESA', 'FIRMA_INMOBILIARIA_PROMESA', 'ESCRITURA_LISTA', 'FIRMADA_NOTARIA', 'INSCRIPCION_CBR', 'ENTREGADO');

-- CreateEnum
CREATE TYPE "TipoPersona" AS ENUM ('NATURAL', 'EMPRESA', 'SOCIEDAD');

-- CreateEnum
CREATE TYPE "EstadoPago" AS ENUM ('PENDIENTE', 'PAGADO', 'ATRASADO', 'CONDONADO');

-- CreateEnum
CREATE TYPE "MetodoPago" AS ENUM ('TRANSFERENCIA', 'TARJETA', 'CHEQUE', 'EFECTIVO');

-- CreateEnum
CREATE TYPE "TipoCuota" AS ENUM ('RESERVA', 'PIE', 'CUOTA', 'ESCRITURA');

-- CreateEnum
CREATE TYPE "TipoPromocion" AS ENUM ('DESCUENTO_PORCENTAJE', 'DESCUENTO_UF', 'ARRIENDO_ASEGURADO', 'GASTOS_NOTARIALES', 'CUOTAS_SIN_INTERES', 'COMBO', 'OTRO');

-- CreateEnum
CREATE TYPE "EstadoArriendo" AS ENUM ('ACTIVO', 'TERMINADO');

-- CreateEnum
CREATE TYPE "EstadoLlave" AS ENUM ('EN_OFICINA', 'PRESTADA', 'PERDIDA');

-- CreateEnum
CREATE TYPE "TipoPostventa" AS ENUM ('RECLAMO', 'CONSULTA', 'TRAMITE', 'GARANTIA');

-- CreateEnum
CREATE TYPE "EstadoPostventa" AS ENUM ('ABIERTO', 'EN_PROCESO', 'CERRADO');

-- CreateEnum
CREATE TYPE "TipoAlerta" AS ENUM ('LLAVE_NO_DEVUELTA', 'CUOTA_VENCIDA', 'LEAD_SIN_ACTIVIDAD', 'FECHA_LEGAL_PROXIMA', 'ARRIENDO_POR_VENCER', 'DESCUENTO_PENDIENTE');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellido" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "telefono" TEXT,
    "rol" "Rol" NOT NULL,
    "comisionPorcentaje" DOUBLE PRECISION,
    "comisionFijo" DOUBLE PRECISION,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "edificios" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "direccion" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "comuna" TEXT NOT NULL,
    "inmobiliaria" TEXT,
    "contactoInmobiliaria" TEXT,
    "descripcion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "edificios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unidades" (
    "id" SERIAL NOT NULL,
    "edificioId" INTEGER NOT NULL,
    "tipo" "TipoUnidad" NOT NULL,
    "subtipo" "SubtipoEstacionamiento",
    "numero" TEXT NOT NULL,
    "piso" TEXT,
    "m2" DOUBLE PRECISION,
    "techado" BOOLEAN,
    "acceso" "AccesoUnidad",
    "precioUF" DOUBLE PRECISION NOT NULL,
    "precioMinimoUF" DOUBLE PRECISION,
    "precioCostoUF" DOUBLE PRECISION,
    "estado" "EstadoUnidad" NOT NULL DEFAULT 'DISPONIBLE',
    "notas" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "unidades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "archivos" (
    "id" SERIAL NOT NULL,
    "unidadId" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "archivos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contactos" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellido" TEXT NOT NULL,
    "rut" TEXT,
    "email" TEXT,
    "telefono" TEXT,
    "empresa" TEXT,
    "tipoPersona" "TipoPersona" NOT NULL DEFAULT 'NATURAL',
    "origen" "OrigenLead" NOT NULL DEFAULT 'OTRO',
    "notas" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contactos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads" (
    "id" SERIAL NOT NULL,
    "contactoId" INTEGER NOT NULL,
    "unidadInteresId" INTEGER,
    "vendedorId" INTEGER,
    "brokerId" INTEGER,
    "etapa" "EtapaLead" NOT NULL DEFAULT 'NUEVO',
    "presupuestoAprox" DOUBLE PRECISION,
    "motivoPerdida" TEXT,
    "notas" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visitas" (
    "id" SERIAL NOT NULL,
    "leadId" INTEGER NOT NULL,
    "vendedorId" INTEGER,
    "fechaHora" TIMESTAMP(3) NOT NULL,
    "tipo" TEXT NOT NULL,
    "resultado" TEXT,
    "notas" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "visitas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interacciones" (
    "id" SERIAL NOT NULL,
    "leadId" INTEGER NOT NULL,
    "usuarioId" INTEGER,
    "tipo" "TipoInteraccion" NOT NULL,
    "descripcion" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "interacciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ventas" (
    "id" SERIAL NOT NULL,
    "leadId" INTEGER NOT NULL,
    "unidadId" INTEGER NOT NULL,
    "compradorId" INTEGER NOT NULL,
    "vendedorId" INTEGER,
    "brokerId" INTEGER,
    "gerenteId" INTEGER,
    "precioUF" DOUBLE PRECISION NOT NULL,
    "descuentoUF" DOUBLE PRECISION DEFAULT 0,
    "estado" "EstadoVenta" NOT NULL DEFAULT 'RESERVA',
    "fechaReserva" TIMESTAMP(3),
    "fechaPromesa" TIMESTAMP(3),
    "fechaEscritura" TIMESTAMP(3),
    "fechaEntrega" TIMESTAMP(3),
    "notas" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ventas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "procesos_legales" (
    "id" SERIAL NOT NULL,
    "ventaId" INTEGER NOT NULL,
    "tienePromesa" BOOLEAN NOT NULL DEFAULT true,
    "estadoActual" "EstadoLegal" NOT NULL DEFAULT 'FIRMA_CLIENTE_PROMESA',
    "fechaLimiteFirmaCliente" TIMESTAMP(3),
    "fechaLimiteFirmaInmob" TIMESTAMP(3),
    "fechaLimiteEscritura" TIMESTAMP(3),
    "fechaLimiteFirmaNot" TIMESTAMP(3),
    "fechaLimiteCBR" TIMESTAMP(3),
    "fechaLimiteEntrega" TIMESTAMP(3),
    "notas" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "procesos_legales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documentos_legales" (
    "id" SERIAL NOT NULL,
    "procesoLegalId" INTEGER NOT NULL,
    "subioPorId" INTEGER,
    "nombre" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "etapa" "EstadoLegal" NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documentos_legales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "planes_pago" (
    "id" SERIAL NOT NULL,
    "ventaId" INTEGER NOT NULL,
    "totalCuotas" INTEGER NOT NULL,
    "montoUF" DOUBLE PRECISION,
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "planes_pago_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cuotas" (
    "id" SERIAL NOT NULL,
    "planPagoId" INTEGER NOT NULL,
    "numeroCuota" INTEGER NOT NULL,
    "tipo" "TipoCuota" NOT NULL,
    "montoUF" DOUBLE PRECISION,
    "montoCLP" DOUBLE PRECISION,
    "fechaVencimiento" TIMESTAMP(3) NOT NULL,
    "fechaPagoReal" TIMESTAMP(3),
    "estado" "EstadoPago" NOT NULL DEFAULT 'PENDIENTE',
    "metodoPago" "MetodoPago",
    "numeroComprobante" TEXT,
    "archivoUrl" TEXT,
    "notas" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cuotas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comisiones" (
    "id" SERIAL NOT NULL,
    "ventaId" INTEGER NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "porcentaje" DOUBLE PRECISION,
    "montoFijo" DOUBLE PRECISION,
    "montoCalculadoUF" DOUBLE PRECISION NOT NULL,
    "montoPrimera" DOUBLE PRECISION NOT NULL,
    "montoSegunda" DOUBLE PRECISION NOT NULL,
    "estadoPrimera" "EstadoPago" NOT NULL DEFAULT 'PENDIENTE',
    "estadoSegunda" "EstadoPago" NOT NULL DEFAULT 'PENDIENTE',
    "fechaPagoPrimera" TIMESTAMP(3),
    "fechaPagoSegunda" TIMESTAMP(3),
    "notas" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "comisiones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promociones" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "tipo" "TipoPromocion" NOT NULL,
    "valorPorcentaje" DOUBLE PRECISION,
    "valorUF" DOUBLE PRECISION,
    "mesesArriendo" INTEGER,
    "montoMensualUF" DOUBLE PRECISION,
    "cuotasSinInteres" INTEGER,
    "fechaInicio" TIMESTAMP(3),
    "fechaFin" TIMESTAMP(3),
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "promociones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unidades_promociones" (
    "unidadId" INTEGER NOT NULL,
    "promocionId" INTEGER NOT NULL,
    "asignadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "unidades_promociones_pkey" PRIMARY KEY ("unidadId","promocionId")
);

-- CreateTable
CREATE TABLE "ventas_promociones" (
    "id" SERIAL NOT NULL,
    "ventaId" INTEGER NOT NULL,
    "promocionId" INTEGER NOT NULL,
    "gastosNotarialesPagados" BOOLEAN DEFAULT false,
    "gastosMonto" DOUBLE PRECISION,

    CONSTRAINT "ventas_promociones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pagos_arriendo_asegurado" (
    "id" SERIAL NOT NULL,
    "ventaPromocionId" INTEGER NOT NULL,
    "mes" INTEGER NOT NULL,
    "montoUF" DOUBLE PRECISION NOT NULL,
    "estado" "EstadoPago" NOT NULL DEFAULT 'PENDIENTE',
    "fechaPago" TIMESTAMP(3),
    "comprobante" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pagos_arriendo_asegurado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "arriendos" (
    "id" SERIAL NOT NULL,
    "unidadId" INTEGER NOT NULL,
    "contactoId" INTEGER NOT NULL,
    "gestorNombre" TEXT,
    "montoMensualUF" DOUBLE PRECISION,
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "fechaFin" TIMESTAMP(3),
    "estado" "EstadoArriendo" NOT NULL DEFAULT 'ACTIVO',
    "contratoUrl" TEXT,
    "notas" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "arriendos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pagos_arriendo" (
    "id" SERIAL NOT NULL,
    "arriendoId" INTEGER NOT NULL,
    "mes" TEXT NOT NULL,
    "montoUF" DOUBLE PRECISION,
    "montoCLP" DOUBLE PRECISION,
    "estado" "EstadoPago" NOT NULL DEFAULT 'PENDIENTE',
    "fechaPago" TIMESTAMP(3),
    "comprobante" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pagos_arriendo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "llaves" (
    "id" SERIAL NOT NULL,
    "unidadId" INTEGER NOT NULL,
    "codigo" TEXT NOT NULL,
    "estado" "EstadoLlave" NOT NULL DEFAULT 'EN_OFICINA',
    "notas" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "llaves_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimientos_llaves" (
    "id" SERIAL NOT NULL,
    "llaveId" INTEGER NOT NULL,
    "responsableId" INTEGER,
    "tipo" TEXT NOT NULL,
    "personaNombre" TEXT,
    "personaContacto" TEXT,
    "motivo" TEXT,
    "fechaPrestamo" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaDevolucionEsperada" TIMESTAMP(3),
    "fechaDevolucionReal" TIMESTAMP(3),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movimientos_llaves_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "postventas" (
    "id" SERIAL NOT NULL,
    "ventaId" INTEGER NOT NULL,
    "responsableId" INTEGER,
    "tipo" "TipoPostventa" NOT NULL,
    "descripcion" TEXT NOT NULL,
    "estado" "EstadoPostventa" NOT NULL DEFAULT 'ABIERTO',
    "prioridad" TEXT NOT NULL DEFAULT 'media',
    "fechaApertura" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaCierre" TIMESTAMP(3),
    "resolucion" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "postventas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "uf_diaria" (
    "fecha" TIMESTAMP(3) NOT NULL,
    "valorPesos" DOUBLE PRECISION NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "uf_diaria_pkey" PRIMARY KEY ("fecha")
);

-- CreateTable
CREATE TABLE "alertas_config" (
    "id" SERIAL NOT NULL,
    "tipo" "TipoAlerta" NOT NULL,
    "umbralDias" INTEGER NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "canalEmail" BOOLEAN NOT NULL DEFAULT true,
    "canalWhatsapp" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "alertas_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notificaciones" (
    "id" SERIAL NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "tipo" "TipoAlerta" NOT NULL,
    "mensaje" TEXT NOT NULL,
    "referenciaId" INTEGER,
    "referenciaTipo" TEXT,
    "leida" BOOLEAN NOT NULL DEFAULT false,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notificaciones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "ventas_leadId_key" ON "ventas"("leadId");

-- CreateIndex
CREATE UNIQUE INDEX "procesos_legales_ventaId_key" ON "procesos_legales"("ventaId");

-- CreateIndex
CREATE UNIQUE INDEX "planes_pago_ventaId_key" ON "planes_pago"("ventaId");

-- CreateIndex
CREATE UNIQUE INDEX "alertas_config_tipo_key" ON "alertas_config"("tipo");

-- AddForeignKey
ALTER TABLE "unidades" ADD CONSTRAINT "unidades_edificioId_fkey" FOREIGN KEY ("edificioId") REFERENCES "edificios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "archivos" ADD CONSTRAINT "archivos_unidadId_fkey" FOREIGN KEY ("unidadId") REFERENCES "unidades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_contactoId_fkey" FOREIGN KEY ("contactoId") REFERENCES "contactos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_unidadInteresId_fkey" FOREIGN KEY ("unidadInteresId") REFERENCES "unidades"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_vendedorId_fkey" FOREIGN KEY ("vendedorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_brokerId_fkey" FOREIGN KEY ("brokerId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visitas" ADD CONSTRAINT "visitas_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visitas" ADD CONSTRAINT "visitas_vendedorId_fkey" FOREIGN KEY ("vendedorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interacciones" ADD CONSTRAINT "interacciones_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interacciones" ADD CONSTRAINT "interacciones_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventas" ADD CONSTRAINT "ventas_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventas" ADD CONSTRAINT "ventas_unidadId_fkey" FOREIGN KEY ("unidadId") REFERENCES "unidades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventas" ADD CONSTRAINT "ventas_compradorId_fkey" FOREIGN KEY ("compradorId") REFERENCES "contactos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventas" ADD CONSTRAINT "ventas_vendedorId_fkey" FOREIGN KEY ("vendedorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventas" ADD CONSTRAINT "ventas_brokerId_fkey" FOREIGN KEY ("brokerId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventas" ADD CONSTRAINT "ventas_gerenteId_fkey" FOREIGN KEY ("gerenteId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procesos_legales" ADD CONSTRAINT "procesos_legales_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "ventas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos_legales" ADD CONSTRAINT "documentos_legales_procesoLegalId_fkey" FOREIGN KEY ("procesoLegalId") REFERENCES "procesos_legales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos_legales" ADD CONSTRAINT "documentos_legales_subioPorId_fkey" FOREIGN KEY ("subioPorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planes_pago" ADD CONSTRAINT "planes_pago_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "ventas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cuotas" ADD CONSTRAINT "cuotas_planPagoId_fkey" FOREIGN KEY ("planPagoId") REFERENCES "planes_pago"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comisiones" ADD CONSTRAINT "comisiones_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "ventas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comisiones" ADD CONSTRAINT "comisiones_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unidades_promociones" ADD CONSTRAINT "unidades_promociones_unidadId_fkey" FOREIGN KEY ("unidadId") REFERENCES "unidades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unidades_promociones" ADD CONSTRAINT "unidades_promociones_promocionId_fkey" FOREIGN KEY ("promocionId") REFERENCES "promociones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventas_promociones" ADD CONSTRAINT "ventas_promociones_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "ventas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventas_promociones" ADD CONSTRAINT "ventas_promociones_promocionId_fkey" FOREIGN KEY ("promocionId") REFERENCES "promociones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos_arriendo_asegurado" ADD CONSTRAINT "pagos_arriendo_asegurado_ventaPromocionId_fkey" FOREIGN KEY ("ventaPromocionId") REFERENCES "ventas_promociones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "arriendos" ADD CONSTRAINT "arriendos_unidadId_fkey" FOREIGN KEY ("unidadId") REFERENCES "unidades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "arriendos" ADD CONSTRAINT "arriendos_contactoId_fkey" FOREIGN KEY ("contactoId") REFERENCES "contactos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos_arriendo" ADD CONSTRAINT "pagos_arriendo_arriendoId_fkey" FOREIGN KEY ("arriendoId") REFERENCES "arriendos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "llaves" ADD CONSTRAINT "llaves_unidadId_fkey" FOREIGN KEY ("unidadId") REFERENCES "unidades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_llaves" ADD CONSTRAINT "movimientos_llaves_llaveId_fkey" FOREIGN KEY ("llaveId") REFERENCES "llaves"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_llaves" ADD CONSTRAINT "movimientos_llaves_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "postventas" ADD CONSTRAINT "postventas_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "ventas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "postventas" ADD CONSTRAINT "postventas_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificaciones" ADD CONSTRAINT "notificaciones_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
