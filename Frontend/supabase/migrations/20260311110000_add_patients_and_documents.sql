CREATE TABLE IF NOT EXISTS public.patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.company(id) ON DELETE CASCADE,
    professional_lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    date_of_birth DATE,
    cpf TEXT,
    gender TEXT CHECK (gender IN ('male', 'female', 'other')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'prospect')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID DEFAULT auth.uid() REFERENCES public.profiles(id)
);

CREATE TABLE IF NOT EXISTS public.patient_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.company(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL UNIQUE,
    file_size INTEGER,
    file_type TEXT NOT NULL DEFAULT 'application/pdf' CHECK (file_type = 'application/pdf'),
    document_type TEXT NOT NULL DEFAULT 'other' CHECK (
        document_type IN (
            'acceptance_form',
            'consent_form',
            'medical_record',
            'exam',
            'contract',
            'other'
        )
    ),
    description TEXT,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    uploaded_by UUID DEFAULT auth.uid() REFERENCES public.profiles(id)
);

CREATE INDEX IF NOT EXISTS idx_patients_company_id
    ON public.patients(company_id);

CREATE INDEX IF NOT EXISTS idx_patients_professional_lead_id
    ON public.patients(professional_lead_id);

CREATE INDEX IF NOT EXISTS idx_patient_documents_company_id
    ON public.patient_documents(company_id);

CREATE INDEX IF NOT EXISTS idx_patient_documents_patient_id
    ON public.patient_documents(patient_id);

CREATE OR REPLACE FUNCTION public.set_patients_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_patients_set_updated_at ON public.patients;

CREATE TRIGGER trigger_patients_set_updated_at
    BEFORE UPDATE ON public.patients
    FOR EACH ROW
    EXECUTE FUNCTION public.set_patients_updated_at();

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'patient-documents',
    'patient-documents',
    false,
    10485760,
    ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage patients in their company" ON public.patients;

CREATE POLICY "Users can manage patients in their company"
ON public.patients
FOR ALL
TO authenticated
USING (
    company_id IN (
        SELECT company_id
        FROM public.profiles
        WHERE id = auth.uid()
    )
    AND EXISTS (
        SELECT 1
        FROM public.leads
        WHERE leads.id = patients.professional_lead_id
          AND leads.company_id = patients.company_id
    )
)
WITH CHECK (
    company_id IN (
        SELECT company_id
        FROM public.profiles
        WHERE id = auth.uid()
    )
    AND EXISTS (
        SELECT 1
        FROM public.leads
        WHERE leads.id = patients.professional_lead_id
          AND leads.company_id = patients.company_id
    )
);

DROP POLICY IF EXISTS "Users can manage patient documents in their company" ON public.patient_documents;

CREATE POLICY "Users can manage patient documents in their company"
ON public.patient_documents
FOR ALL
TO authenticated
USING (
    company_id IN (
        SELECT company_id
        FROM public.profiles
        WHERE id = auth.uid()
    )
    AND EXISTS (
        SELECT 1
        FROM public.patients
        WHERE patients.id = patient_documents.patient_id
          AND patients.company_id = patient_documents.company_id
    )
)
WITH CHECK (
    company_id IN (
        SELECT company_id
        FROM public.profiles
        WHERE id = auth.uid()
    )
    AND EXISTS (
        SELECT 1
        FROM public.patients
        WHERE patients.id = patient_documents.patient_id
          AND patients.company_id = patient_documents.company_id
    )
);

DROP POLICY IF EXISTS "Company members can upload patient documents" ON storage.objects;
DROP POLICY IF EXISTS "Company members can read patient documents" ON storage.objects;
DROP POLICY IF EXISTS "Company members can update patient documents" ON storage.objects;
DROP POLICY IF EXISTS "Company members can delete patient documents" ON storage.objects;

CREATE POLICY "Company members can upload patient documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'patient-documents'
    AND (storage.foldername(name))[1] IN (
        SELECT company_id::text
        FROM public.profiles
        WHERE id = auth.uid()
    )
);

CREATE POLICY "Company members can read patient documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
    bucket_id = 'patient-documents'
    AND (storage.foldername(name))[1] IN (
        SELECT company_id::text
        FROM public.profiles
        WHERE id = auth.uid()
    )
);

CREATE POLICY "Company members can update patient documents"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
    bucket_id = 'patient-documents'
    AND (storage.foldername(name))[1] IN (
        SELECT company_id::text
        FROM public.profiles
        WHERE id = auth.uid()
    )
)
WITH CHECK (
    bucket_id = 'patient-documents'
    AND (storage.foldername(name))[1] IN (
        SELECT company_id::text
        FROM public.profiles
        WHERE id = auth.uid()
    )
);

CREATE POLICY "Company members can delete patient documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (
    bucket_id = 'patient-documents'
    AND (storage.foldername(name))[1] IN (
        SELECT company_id::text
        FROM public.profiles
        WHERE id = auth.uid()
    )
);

CREATE OR REPLACE FUNCTION public.delete_patient_document_storage_object()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
BEGIN
    DELETE FROM storage.objects
    WHERE bucket_id = 'patient-documents'
      AND name = OLD.file_path;

    RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trigger_delete_patient_document_storage_object ON public.patient_documents;

CREATE TRIGGER trigger_delete_patient_document_storage_object
    AFTER DELETE ON public.patient_documents
    FOR EACH ROW
    EXECUTE FUNCTION public.delete_patient_document_storage_object();
