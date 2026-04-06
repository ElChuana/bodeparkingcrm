ALTER TABLE "visitas" ADD COLUMN IF NOT EXISTS "edificioId" INTEGER;

DO $$ BEGIN
  ALTER TABLE "visitas" ADD CONSTRAINT "visitas_edificioId_fkey"
    FOREIGN KEY ("edificioId") REFERENCES "edificios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
