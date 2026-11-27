-- Todos los leads en SEGUIMIENTO pasan a CONTACTO_INICIAL.
UPDATE "leads" SET "etapa" = 'CONTACTO_INICIAL' WHERE "etapa" = 'SEGUIMIENTO';
UPDATE "leads" SET "etapaAntesDePerdido" = 'CONTACTO_INICIAL' WHERE "etapaAntesDePerdido" = 'SEGUIMIENTO';
