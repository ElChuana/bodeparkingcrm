-- AlterEnum
ALTER TYPE "TipoAlerta" ADD VALUE 'RECORDATORIO_LEAD';

-- CreateTable
CREATE TABLE IF NOT EXISTS "recordatorios" (
    "id" SERIAL NOT NULL,
    "leadId" INTEGER NOT NULL,
    "creadoPorId" INTEGER NOT NULL,
    "descripcion" TEXT NOT NULL,
    "fechaHora" TIMESTAMP(3) NOT NULL,
    "completado" BOOLEAN NOT NULL DEFAULT false,
    "notificado" BOOLEAN NOT NULL DEFAULT false,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recordatorios_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
-- Postgres no soporta ADD CONSTRAINT IF NOT EXISTS; se usa un bloque DO idempotente.
DO $$ BEGIN
  ALTER TABLE "recordatorios" ADD CONSTRAINT "recordatorios_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "recordatorios" ADD CONSTRAINT "recordatorios_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
