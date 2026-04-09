-- CreateIndex
CREATE UNIQUE INDEX "ventas_promociones_ventaId_promocionId_key" ON "ventas_promociones"("ventaId", "promocionId");
