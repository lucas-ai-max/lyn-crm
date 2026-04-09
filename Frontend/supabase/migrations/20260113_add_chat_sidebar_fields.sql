-- Create tags table
CREATE TABLE IF NOT EXISTS public.tags (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    company_id UUID NOT NULL,
    name TEXT NOT NULL,
    color TEXT DEFAULT '#94a3b8',
    UNIQUE(company_id, name)
);

-- Add columns to leads table
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- Add RLS policies for tags
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tags from their company"
ON public.tags FOR SELECT
TO authenticated
USING (
    company_id IN (
        SELECT company_id FROM public.profiles 
        WHERE id = auth.uid()
    )
);

CREATE POLICY "Users can insert tags for their company"
ON public.tags FOR INSERT
TO authenticated
WITH CHECK (
    company_id IN (
        SELECT company_id FROM public.profiles 
        WHERE id = auth.uid()
    )
);

CREATE POLICY "Users can update tags for their company"
ON public.tags FOR UPDATE
TO authenticated
USING (
    company_id IN (
        SELECT company_id FROM public.profiles 
        WHERE id = auth.uid()
    )
);

CREATE POLICY "Users can delete tags for their company"
ON public.tags FOR DELETE
TO authenticated
USING (
    company_id IN (
        SELECT company_id FROM public.profiles 
        WHERE id = auth.uid()
    )
);
