-- Enums
CREATE TYPE "EstadoCotizacion" AS ENUM ('BORRADOR', 'ENVIADA', 'ACEPTADA', 'RECHAZADA');
CREATE TYPE "EstadoSolicitudDescuento" AS ENUM ('PENDIENTE', 'APROBADA', 'RECHAZADA');

-- Cotizaciones
CREATE TABLE "cotizaciones" (
    "id" SERIAL NOT NULL,
    "leadId" INTEGER NOT NULL,
    "creadoPorId" INTEGER NOT NULL,
    "estado" "EstadoCotizacion" NOT NULL DEFAULT 'BORRADOR',
    "validezDias" INTEGER NOT NULL DEFAULT 30,
    "notas" TEXT,
    "descuentoAprobadoUF" DOUBLE PRECISION,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "cotizaciones_pkey" PRIMARY KEY ("id")
);

-- Cotizacion items
CREATE TABLE "cotizacion_items" (
    "id" SERIAL NOT NULL,
    "cotizacionId" INTEGER NOT NULL,
    "unidadId" INTEGER NOT NULL,
    "precioListaUF" DOUBLE PRECISION NOT NULL,
    "descuentoUF" DOUBLE PRECISION NOT NULL DEFAULT 0,
    CONSTRAINT "cotizacion_items_pkey" PRIMARY KEY ("id")
);

-- Cotizacion promociones
CREATE TABLE "cotizacion_promociones" (
    "id" SERIAL NOT NULL,
    "cotizacionId" INTEGER NOT NULL,
    "promocionId" INTEGER NOT NULL,
    "aplicada" BOOLEAN NOT NULL DEFAULT true,
    "ahorroUF" DOUBLE PRECISION NOT NULL DEFAULT 0,
    CONSTRAINT "cotizacion_promociones_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "cotizacion_promociones_cotizacionId_promocionId_key" ON "cotizacion_promociones"("cotizacionId", "promocionId");

-- Solicitudes descuento
CREATE TABLE "solicitudes_descuento" (
    "id" SERIAL NOT NULL,
    "cotizacionId" INTEGER NOT NULL,
    "solicitadoPorId" INTEGER NOT NULL,
    "revisadoPorId" INTEGER,
    "tipo" TEXT NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "motivo" TEXT NOT NULL,
    "estado" "EstadoSolicitudDescuento" NOT NULL DEFAULT 'PENDIENTE',
    "comentario" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revisadoEn" TIMESTAMP(3),
    CONSTRAINT "solicitudes_descuento_pkey" PRIMARY KEY ("id")
);

-- API Keys
CREATE TABLE "api_keys" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "api_keys_key_key" ON "api_keys"("key");

-- Columna faltante en alertas_config
ALTER TABLE "alertas_config" ADD COLUMN IF NOT EXISTS "accionAutomatica" BOOLEAN NOT NULL DEFAULT false;

-- Unique en alertas_config.tipo (si no existe)
ALTER TABLE "alertas_config" DROP CONSTRAINT IF EXISTS "alertas_config_tipo_key";
ALTER TABLE "alertas_config" ADD CONSTRAINT "alertas_config_tipo_key" UNIQUE ("tipo");

-- FK cotizaciones
ALTER TABLE "cotizaciones" ADD CONSTRAINT "cotizaciones_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cotizaciones" ADD CONSTRAINT "cotizaciones_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- FK cotizacion_items
ALTER TABLE "cotizacion_items" ADD CONSTRAINT "cotizacion_items_cotizacionId_fkey" FOREIGN KEY ("cotizacionId") REFERENCES "cotizaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cotizacion_items" ADD CONSTRAINT "cotizacion_items_unidadId_fkey" FOREIGN KEY ("unidadId") REFERENCES "unidades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- FK cotizacion_promociones
ALTER TABLE "cotizacion_promociones" ADD CONSTRAINT "cotizacion_promociones_cotizacionId_fkey" FOREIGN KEY ("cotizacionId") REFERENCES "cotizaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cotizacion_promociones" ADD CONSTRAINT "cotizacion_promociones_promocionId_fkey" FOREIGN KEY ("promocionId") REFERENCES "promociones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- FK solicitudes_descuento
ALTER TABLE "solicitudes_descuento" ADD CONSTRAINT "solicitudes_descuento_cotizacionId_fkey" FOREIGN KEY ("cotizacionId") REFERENCES "cotizaciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "solicitudes_descuento" ADD CONSTRAINT "solicitudes_descuento_solicitadoPorId_fkey" FOREIGN KEY ("solicitadoPorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "solicitudes_descuento" ADD CONSTRAINT "solicitudes_descuento_revisadoPorId_fkey" FOREIGN KEY ("revisadoPorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
