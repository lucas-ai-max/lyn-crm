-- Permitir que usuários editem suas próprias notas ou se forem admins
CREATE POLICY "Users can update notes from their company" ON public.lead_notes
    FOR UPDATE
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

-- Permitir que usuários deletem suas próprias notas
CREATE POLICY "Users can delete notes from their company" ON public.lead_notes
    FOR DELETE
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
