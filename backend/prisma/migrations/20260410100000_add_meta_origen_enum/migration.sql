-- This migration does not run within a transaction

-- Agregar nuevos valores al enum OrigenLead
ALTER TYPE "OrigenLead" ADD VALUE IF NOT EXISTS 'META';
ALTER TYPE "OrigenLead" ADD VALUE IF NOT EXISTS 'ORIGEN';
