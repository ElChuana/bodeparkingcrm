-- AlterTable: agregar ventaId a unidades
ALTER TABLE "unidades" ADD COLUMN "ventaId" INTEGER;

-- AddForeignKey
ALTER TABLE "unidades" ADD CONSTRAINT "unidades_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "ventas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable: quitar unidadId de ventas
ALTER TABLE "ventas" DROP COLUMN IF EXISTS "unidadId";
