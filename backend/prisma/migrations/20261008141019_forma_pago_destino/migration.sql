-- Separa qué parte del precio cubre cada forma de pago: hasta ahora una
-- transferencia podía ser el pie o la venta completa y nada lo distinguía.

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "DestinoPago" AS ENUM ('CONTADO', 'PIE', 'SALDO');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- AlterTable
ALTER TABLE "venta_formas_pago"
  ADD COLUMN IF NOT EXISTS "destino" "DestinoPago" NOT NULL DEFAULT 'CONTADO';

-- Backfill de lo ya cargado, deducido del mix de cada venta:
--   la forma CUOTAS es siempre el saldo diferido;
--   si la venta tiene CUOTAS, el resto de sus formas es el pie;
--   si no las tiene, el resto queda al contado (el default).
UPDATE "venta_formas_pago" SET "destino" = 'SALDO'
 WHERE "forma" = 'CUOTAS';

UPDATE "venta_formas_pago" f SET "destino" = 'PIE'
 WHERE f."forma" <> 'CUOTAS'
   AND EXISTS (
     SELECT 1 FROM "venta_formas_pago" c
      WHERE c."ventaId" = f."ventaId" AND c."forma" = 'CUOTAS'
   );
