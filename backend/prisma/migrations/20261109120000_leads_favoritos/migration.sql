-- CreateTable
CREATE TABLE "leads_favoritos" (
    "id" SERIAL NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "leadId" INTEGER NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "leads_favoritos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "leads_favoritos_leadId_idx" ON "leads_favoritos"("leadId");

-- CreateIndex
CREATE UNIQUE INDEX "leads_favoritos_usuarioId_leadId_key" ON "leads_favoritos"("usuarioId", "leadId");

-- AddForeignKey
ALTER TABLE "leads_favoritos" ADD CONSTRAINT "leads_favoritos_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads_favoritos" ADD CONSTRAINT "leads_favoritos_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
