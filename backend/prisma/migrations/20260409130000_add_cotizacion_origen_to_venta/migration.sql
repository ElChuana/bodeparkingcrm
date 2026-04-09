-- AlterTable
ALTER TABLE "ventas" ADD COLUMN "cotizacionOrigenId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "ventas_cotizacionOrigenId_key" ON "ventas"("cotizacionOrigenId");

-- AddForeignKey
ALTER TABLE "ventas" ADD CONSTRAINT "ventas_cotizacionOrigenId_fkey" FOREIGN KEY ("cotizacionOrigenId") REFERENCES "cotizaciones"("id") ON DELETE SET NULL ON UPDATE CASCADE;
