-- AlterTable: agregar ventaId a unidades (IF NOT EXISTS para idempotencia)
ALTER TABLE "unidades" ADD COLUMN IF NOT EXISTS "ventaId" INTEGER;

-- AddForeignKey (ignorar si ya existe)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'unidades_ventaId_fkey'
  ) THEN
    ALTER TABLE "unidades" ADD CONSTRAINT "unidades_ventaId_fkey"
      FOREIGN KEY ("ventaId") REFERENCES "ventas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- AlterTable: quitar unidadId de ventas
ALTER TABLE "ventas" DROP COLUMN IF EXISTS "unidadId";
