BEGIN;

-- 1. Crear enum nuevo con valores correctos
CREATE TYPE "EstadoLegal_new" AS ENUM (
  'CONFECCION_PROMESA',
  'FIRMA_CLIENTE_PROMESA',
  'FIRMA_INMOBILIARIA_PROMESA',
  'CONFECCION_ESCRITURA',
  'FIRMA_CLIENTE_ESCRITURA',
  'FIRMA_INMOBILIARIA_ESCRITURA',
  'INSCRIPCION_CBR',
  'ENTREGADO'
);

-- 2. Quitar defaults antes de alterar columnas
ALTER TABLE procesos_legales ALTER COLUMN "estadoActual" DROP DEFAULT;

-- 3. Migrar procesos_legales.estadoActual
ALTER TABLE procesos_legales
  ALTER COLUMN "estadoActual" TYPE "EstadoLegal_new"
  USING (
    CASE "estadoActual"::text
      WHEN 'ESCRITURA_LISTA' THEN 'CONFECCION_ESCRITURA'
      WHEN 'FIRMADA_NOTARIA' THEN 'FIRMA_CLIENTE_ESCRITURA'
      ELSE "estadoActual"::text
    END
  )::"EstadoLegal_new";

-- 4. Migrar documentos_legales.etapa
ALTER TABLE documentos_legales
  ALTER COLUMN "etapa" TYPE "EstadoLegal_new"
  USING (
    CASE "etapa"::text
      WHEN 'ESCRITURA_LISTA' THEN 'CONFECCION_ESCRITURA'
      WHEN 'FIRMADA_NOTARIA' THEN 'FIRMA_CLIENTE_ESCRITURA'
      ELSE "etapa"::text
    END
  )::"EstadoLegal_new";

-- 5. Reemplazar enum viejo por el nuevo
DROP TYPE "EstadoLegal";
ALTER TYPE "EstadoLegal_new" RENAME TO "EstadoLegal";

COMMIT;
