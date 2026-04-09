-- Create lead_notes table for extensive history
CREATE TABLE IF NOT EXISTS public.lead_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID REFERENCES public.profiles(id)
);

-- Add RLS to lead_notes
ALTER TABLE public.lead_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view notes from their company" ON public.lead_notes
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.leads
            WHERE leads.id = lead_notes.lead_id
            AND leads.company_id IN (
                SELECT company_id FROM public.profiles
                WHERE profiles.id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can create notes for leads in their company" ON public.lead_notes
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.leads
            WHERE leads.id = lead_notes.lead_id
            AND leads.company_id IN (
                SELECT company_id FROM public.profiles
                WHERE profiles.id = auth.uid()
            )
        )
    );

-- Increase description limit by ensuring it is TEXT
ALTER TABLE public.leads ALTER COLUMN description TYPE TEXT;

-- Migrate existing notes to lead_notes
DO $$
DECLARE
    r RECORD;
    note_text TEXT;
BEGIN
    FOR r IN SELECT id, notas, responsavel_id, created_at FROM public.leads WHERE notas IS NOT NULL AND array_length(notas, 1) > 0 LOOP
        FOREACH note_text IN ARRAY r.notas LOOP
            INSERT INTO public.lead_notes (lead_id, content, created_by, created_at)
            VALUES (r.id, note_text, r.responsavel_id, r.created_at);
        END LOOP;
    END LOOP;
END $$;
