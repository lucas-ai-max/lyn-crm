-- Fix Leads RLS to allow company-wide access
-- Existing policy restricted access to 'responsavel_id', which is null for auto-created leads.

DROP POLICY IF EXISTS "Leads: user can read/write only their own leads" ON public.leads;

CREATE POLICY "Users can access leads of their company"
ON public.leads
FOR ALL
USING (
  company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  )
);
