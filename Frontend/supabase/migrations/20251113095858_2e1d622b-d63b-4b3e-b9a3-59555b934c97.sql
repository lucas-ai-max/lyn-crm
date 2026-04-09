-- Add missing fields to leads table
ALTER TABLE leads ADD COLUMN IF NOT EXISTS telefone TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS segmento TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS notas TEXT;