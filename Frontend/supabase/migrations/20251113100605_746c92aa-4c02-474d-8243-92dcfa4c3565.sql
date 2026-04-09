-- Update status_lead enum to match the kanban columns
ALTER TYPE status_lead ADD VALUE IF NOT EXISTS 'em_andamento';
ALTER TYPE status_lead ADD VALUE IF NOT EXISTS 'followup';
ALTER TYPE status_lead ADD VALUE IF NOT EXISTS 'concluido';