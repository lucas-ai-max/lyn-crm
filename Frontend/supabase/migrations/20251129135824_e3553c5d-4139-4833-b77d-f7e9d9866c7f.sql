-- Add status column to conversas table
ALTER TABLE public.conversas 
ADD COLUMN status text NOT NULL DEFAULT 'novo';

-- Add a check constraint for valid status values
ALTER TABLE public.conversas 
ADD CONSTRAINT conversas_status_check 
CHECK (status IN ('novo', 'em_andamento', 'nao_respondida', 'finalizados'));