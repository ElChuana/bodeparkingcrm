-- Fix schema drift: add missing enum values and columns

-- TipoAlerta: add LEAD_ESTANCADO
ALTER TYPE "TipoAlerta" ADD VALUE IF NOT EXISTS 'LEAD_ESTANCADO';

-- TipoPromocion: add PAQUETE and BENEFICIO
ALTER TYPE "TipoPromocion" ADD VALUE IF NOT EXISTS 'PAQUETE';
ALTER TYPE "TipoPromocion" ADD VALUE IF NOT EXISTS 'BENEFICIO';

-- CategoriaPromocion enum (missing entirely from init migration)
DO $$ BEGIN
  CREATE TYPE "CategoriaPromocion" AS ENUM ('PROMOCION', 'PACK');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- promociones: add missing columns
ALTER TABLE "promociones" ADD COLUMN IF NOT EXISTS "detalle" TEXT;
ALTER TABLE "promociones" ADD COLUMN IF NOT EXISTS "minUnidades" INTEGER;
ALTER TABLE "promociones" ADD COLUMN IF NOT EXISTS "categoria" "CategoriaPromocion" NOT NULL DEFAULT 'PROMOCION';

-- comisiones: add missing concepto column
ALTER TABLE "comisiones" ADD COLUMN IF NOT EXISTS "concepto" TEXT;
