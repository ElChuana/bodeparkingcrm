-- Drop dependent tables (FK order)
DROP TABLE IF EXISTS "pagos_arriendo_asegurado";
DROP TABLE IF EXISTS "ventas_promociones";
DROP TABLE IF EXISTS "cotizacion_promociones";
DROP TABLE IF EXISTS "unidades_promociones";
DROP TABLE IF EXISTS "promociones";

-- Drop old enums
DROP TYPE IF EXISTS "TipoPromocion";
DROP TYPE IF EXISTS "CategoriaPromocion";

-- Remove old columns from cotizacion_items
ALTER TABLE "cotizacion_items" DROP COLUMN IF EXISTS "descuentoUF";

-- Fix descuentoAprobadoUF on cotizaciones (make non-nullable)
UPDATE "cotizaciones" SET "descuentoAprobadoUF" = 0 WHERE "descuentoAprobadoUF" IS NULL;
ALTER TABLE "cotizaciones" ALTER COLUMN "descuentoAprobadoUF" SET NOT NULL;
ALTER TABLE "cotizaciones" ALTER COLUMN "descuentoAprobadoUF" SET DEFAULT 0;

-- Modify ventas: replace precioUF/descuentoUF with breakdown
ALTER TABLE "ventas" DROP COLUMN IF EXISTS "precioUF";
ALTER TABLE "ventas" DROP COLUMN IF EXISTS "descuentoUF";
ALTER TABLE "ventas" ADD COLUMN "precioListaUF" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "ventas" ADD COLUMN "descuentoPacksUF" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "ventas" ADD COLUMN "descuentoAprobadoUF" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "ventas" ADD COLUMN "precioFinalUF" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "ventas" ALTER COLUMN "cotizacionOrigenId" SET NOT NULL;

-- Create new enums
CREATE TYPE "TipoPack" AS ENUM ('COMBO_ESPECIFICO', 'POR_CANTIDAD');
CREATE TYPE "TipoBeneficio" AS ENUM ('ARRIENDO_ASEGURADO', 'GASTOS_NOTARIALES', 'CUOTAS_SIN_INTERES', 'OTRO');
CREATE TYPE "EstadoBeneficio" AS ENUM ('PENDIENTE', 'EN_CURSO', 'COMPLETADO', 'CANCELADO');

-- Create Pack
CREATE TABLE "packs" (
  "id" SERIAL PRIMARY KEY,
  "nombre" TEXT NOT NULL,
  "descripcion" TEXT,
  "tipo" "TipoPack" NOT NULL,
  "descuentoUF" DOUBLE PRECISION NOT NULL,
  "minUnidades" INTEGER NOT NULL DEFAULT 2,
  "fechaInicio" TIMESTAMP(3),
  "fechaFin" TIMESTAMP(3),
  "activa" BOOLEAN NOT NULL DEFAULT true,
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create UnidadPack
CREATE TABLE "unidades_packs" (
  "unidadId" INTEGER NOT NULL,
  "packId" INTEGER NOT NULL,
  PRIMARY KEY ("unidadId", "packId"),
  FOREIGN KEY ("unidadId") REFERENCES "unidades"("id"),
  FOREIGN KEY ("packId") REFERENCES "packs"("id")
);

-- Create CotizacionPack
CREATE TABLE "cotizacion_packs" (
  "id" SERIAL PRIMARY KEY,
  "cotizacionId" INTEGER NOT NULL,
  "packId" INTEGER NOT NULL,
  "descuentoAplicadoUF" DOUBLE PRECISION NOT NULL,
  UNIQUE ("cotizacionId", "packId"),
  FOREIGN KEY ("cotizacionId") REFERENCES "cotizaciones"("id") ON DELETE CASCADE,
  FOREIGN KEY ("packId") REFERENCES "packs"("id")
);

-- Create Beneficio
CREATE TABLE "beneficios" (
  "id" SERIAL PRIMARY KEY,
  "nombre" TEXT NOT NULL,
  "descripcion" TEXT,
  "tipo" "TipoBeneficio" NOT NULL,
  "meses" INTEGER,
  "montoMensualUF" DOUBLE PRECISION,
  "detalle" TEXT,
  "fechaInicio" TIMESTAMP(3),
  "fechaFin" TIMESTAMP(3),
  "activa" BOOLEAN NOT NULL DEFAULT true,
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create UnidadBeneficio
CREATE TABLE "unidades_beneficios" (
  "unidadId" INTEGER NOT NULL,
  "beneficioId" INTEGER NOT NULL,
  PRIMARY KEY ("unidadId", "beneficioId"),
  FOREIGN KEY ("unidadId") REFERENCES "unidades"("id"),
  FOREIGN KEY ("beneficioId") REFERENCES "beneficios"("id")
);

-- Create CotizacionBeneficio
CREATE TABLE "cotizacion_beneficios" (
  "cotizacionId" INTEGER NOT NULL,
  "beneficioId" INTEGER NOT NULL,
  PRIMARY KEY ("cotizacionId", "beneficioId"),
  FOREIGN KEY ("cotizacionId") REFERENCES "cotizaciones"("id") ON DELETE CASCADE,
  FOREIGN KEY ("beneficioId") REFERENCES "beneficios"("id")
);

-- Create VentaBeneficio
CREATE TABLE "ventas_beneficios" (
  "id" SERIAL PRIMARY KEY,
  "ventaId" INTEGER NOT NULL,
  "beneficioId" INTEGER NOT NULL,
  "estado" "EstadoBeneficio" NOT NULL DEFAULT 'PENDIENTE',
  "notas" TEXT,
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("ventaId", "beneficioId"),
  FOREIGN KEY ("ventaId") REFERENCES "ventas"("id"),
  FOREIGN KEY ("beneficioId") REFERENCES "beneficios"("id")
);
