-- Enums (idempotent)
DO $$ BEGIN
  CREATE TYPE "EstadoCotizacion" AS ENUM ('BORRADOR', 'ENVIADA', 'ACEPTADA', 'RECHAZADA');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "EstadoSolicitudDescuento" AS ENUM ('PENDIENTE', 'APROBADA', 'RECHAZADA');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Cotizaciones
CREATE TABLE IF NOT EXISTS "cotizaciones" (
    "id" SERIAL NOT NULL,
    "leadId" INTEGER NOT NULL,
    "creadoPorId" INTEGER NOT NULL,
    "estado" "EstadoCotizacion" NOT NULL DEFAULT 'BORRADOR',
    "validezDias" INTEGER NOT NULL DEFAULT 30,
    "notas" TEXT,
    "descuentoAprobadoUF" DOUBLE PRECISION,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "cotizaciones_pkey" PRIMARY KEY ("id")
);

-- Cotizacion items
CREATE TABLE IF NOT EXISTS "cotizacion_items" (
    "id" SERIAL NOT NULL,
    "cotizacionId" INTEGER NOT NULL,
    "unidadId" INTEGER NOT NULL,
    "precioListaUF" DOUBLE PRECISION NOT NULL,
    "descuentoUF" DOUBLE PRECISION NOT NULL DEFAULT 0,
    CONSTRAINT "cotizacion_items_pkey" PRIMARY KEY ("id")
);

-- Cotizacion promociones
CREATE TABLE IF NOT EXISTS "cotizacion_promociones" (
    "id" SERIAL NOT NULL,
    "cotizacionId" INTEGER NOT NULL,
    "promocionId" INTEGER NOT NULL,
    "aplicada" BOOLEAN NOT NULL DEFAULT true,
    "ahorroUF" DOUBLE PRECISION NOT NULL DEFAULT 0,
    CONSTRAINT "cotizacion_promociones_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  CREATE UNIQUE INDEX "cotizacion_promociones_cotizacionId_promocionId_key" ON "cotizacion_promociones"("cotizacionId", "promocionId");
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

-- Solicitudes descuento
CREATE TABLE IF NOT EXISTS "solicitudes_descuento" (
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
CREATE TABLE IF NOT EXISTS "api_keys" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  CREATE UNIQUE INDEX "api_keys_key_key" ON "api_keys"("key");
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

-- Columna faltante en visitas
ALTER TABLE "visitas" ADD COLUMN IF NOT EXISTS "edificioId" INTEGER;
DO $$ BEGIN
  ALTER TABLE "visitas" ADD CONSTRAINT "visitas_edificioId_fkey" FOREIGN KEY ("edificioId") REFERENCES "edificios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Columna faltante en alertas_config
ALTER TABLE "alertas_config" ADD COLUMN IF NOT EXISTS "accionAutomatica" BOOLEAN NOT NULL DEFAULT false;

-- Unique en alertas_config.tipo
DO $$ BEGIN
  ALTER TABLE "alertas_config" ADD CONSTRAINT "alertas_config_tipo_key" UNIQUE ("tipo");
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

-- FKs cotizaciones
DO $$ BEGIN
  ALTER TABLE "cotizaciones" ADD CONSTRAINT "cotizaciones_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "cotizaciones" ADD CONSTRAINT "cotizaciones_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- FKs cotizacion_items
DO $$ BEGIN
  ALTER TABLE "cotizacion_items" ADD CONSTRAINT "cotizacion_items_cotizacionId_fkey" FOREIGN KEY ("cotizacionId") REFERENCES "cotizaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "cotizacion_items" ADD CONSTRAINT "cotizacion_items_unidadId_fkey" FOREIGN KEY ("unidadId") REFERENCES "unidades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- FKs cotizacion_promociones
DO $$ BEGIN
  ALTER TABLE "cotizacion_promociones" ADD CONSTRAINT "cotizacion_promociones_cotizacionId_fkey" FOREIGN KEY ("cotizacionId") REFERENCES "cotizaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "cotizacion_promociones" ADD CONSTRAINT "cotizacion_promociones_promocionId_fkey" FOREIGN KEY ("promocionId") REFERENCES "promociones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- FKs solicitudes_descuento
DO $$ BEGIN
  ALTER TABLE "solicitudes_descuento" ADD CONSTRAINT "solicitudes_descuento_cotizacionId_fkey" FOREIGN KEY ("cotizacionId") REFERENCES "cotizaciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "solicitudes_descuento" ADD CONSTRAINT "solicitudes_descuento_solicitadoPorId_fkey" FOREIGN KEY ("solicitadoPorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "solicitudes_descuento" ADD CONSTRAINT "solicitudes_descuento_revisadoPorId_fkey" FOREIGN KEY ("revisadoPorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
