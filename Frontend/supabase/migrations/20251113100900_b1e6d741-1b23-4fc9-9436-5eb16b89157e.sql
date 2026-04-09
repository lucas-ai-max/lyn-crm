-- Add prioridade field to leads table
ALTER TABLE leads ADD COLUMN IF NOT EXISTS prioridade TEXT CHECK (prioridade IN ('high', 'medium', 'low'));

-- Set default value for existing leads
UPDATE leads SET prioridade = 'medium' WHERE prioridade IS NULL;