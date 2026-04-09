-- Migration for Automatic Lead Creation
-- Adds support for tracking source and last message interaction in leads
-- Ensures valid phone number uniqueness per company

-- 1. Add new columns if they don't exist
ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS source text DEFAULT 'system',
ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_message text;

-- 2. Create Unique Index for UPSERT operations (phone + company)
-- This allows us to use ON CONFLICT (telefone, company_id) DO UPDATE
CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_phone_company 
ON public.leads(telefone, company_id);

-- 3. Enable Realtime for leads table (so UI updates instantly)
ALTER PUBLICATION supabase_realtime ADD TABLE leads;
