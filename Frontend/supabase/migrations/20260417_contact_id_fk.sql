-- Add FK constraint: lyn_leads.contact_id → lyn_contacts.id
ALTER TABLE lyn_leads ADD COLUMN IF NOT EXISTS contact_id UUID;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'leads_contact_id_fkey' AND table_name = 'lyn_leads'
  ) THEN
    ALTER TABLE lyn_leads
      ADD CONSTRAINT leads_contact_id_fkey
      FOREIGN KEY (contact_id) REFERENCES lyn_contacts(id) ON DELETE SET NULL;
  END IF;
END $$;
