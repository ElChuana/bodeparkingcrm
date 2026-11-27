-- Etapas nuevas que reemplazan a SEGUIMIENTO (va en una migración aparte:
-- Postgres no deja usar un valor de enum en la misma transacción que lo crea).
ALTER TYPE "EtapaLead" ADD VALUE IF NOT EXISTS 'CONTACTO_INICIAL' AFTER 'SEGUIMIENTO';
ALTER TYPE "EtapaLead" ADD VALUE IF NOT EXISTS 'RECONTACTO_2' AFTER 'CONTACTO_INICIAL';
ALTER TYPE "EtapaLead" ADD VALUE IF NOT EXISTS 'RECONTACTO_3' AFTER 'RECONTACTO_2';
ALTER TYPE "EtapaLead" ADD VALUE IF NOT EXISTS 'RECONTACTO_4' AFTER 'RECONTACTO_3';
