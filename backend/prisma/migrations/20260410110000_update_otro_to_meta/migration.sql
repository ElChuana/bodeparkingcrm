-- Cambiar todos los contactos con origen OTRO a META
UPDATE "contactos" SET "origen" = 'META' WHERE "origen" = 'OTRO';
