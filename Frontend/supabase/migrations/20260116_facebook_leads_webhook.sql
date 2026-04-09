-- Migration: Facebook Lead Ads Webhook Integration
-- Adds support for receiving leads from Facebook Lead Ads webhooks
-- Each company gets a unique webhook URL and can configure Facebook credentials

-- ============================================
-- 1. ALTER COMPANY TABLE - Add Facebook integration fields
-- ============================================

ALTER TABLE public.company
ADD COLUMN IF NOT EXISTS facebook_webhook_token text UNIQUE,
ADD COLUMN IF NOT EXISTS facebook_verify_token text,
ADD COLUMN IF NOT EXISTS facebook_page_access_token text,
ADD COLUMN IF NOT EXISTS facebook_app_secret text,
ADD COLUMN IF NOT EXISTS facebook_last_lead_at timestamptz,
ADD COLUMN IF NOT EXISTS facebook_leads_count integer DEFAULT 0;

-- Index for fast webhook token lookup (used in every webhook call)
CREATE INDEX IF NOT EXISTS idx_company_facebook_webhook_token
ON public.company(facebook_webhook_token)
WHERE facebook_webhook_token IS NOT NULL;

-- ============================================
-- 2. ALTER LEADS TABLE - Add Facebook-specific fields
-- ============================================

ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS leadgen_id text,
ADD COLUMN IF NOT EXISTS form_id text,
ADD COLUMN IF NOT EXISTS ad_id text,
ADD COLUMN IF NOT EXISTS page_id text,
ADD COLUMN IF NOT EXISTS custom_fields jsonb,
ADD COLUMN IF NOT EXISTS raw_facebook_data jsonb,
ADD COLUMN IF NOT EXISTS email_valid boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS facebook_data_complete boolean DEFAULT false;

-- Unique constraint for deduplication (company_id, leadgen_id)
-- Prevents duplicate leads from Facebook retry mechanisms
CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_company_leadgen
ON public.leads(company_id, leadgen_id)
WHERE leadgen_id IS NOT NULL;

-- Index for filtering Facebook leads
CREATE INDEX IF NOT EXISTS idx_leads_source_facebook
ON public.leads(company_id, source)
WHERE source = 'facebook_lead_ads';

-- Index for form_id lookups (useful for analytics and filtering)
CREATE INDEX IF NOT EXISTS idx_leads_form_id
ON public.leads(company_id, form_id)
WHERE form_id IS NOT NULL;

-- ============================================
-- 3. FUNCTION - Generate secure random tokens
-- ============================================

CREATE OR REPLACE FUNCTION generate_secure_token(length integer DEFAULT 32)
RETURNS text
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN encode(gen_random_bytes(length), 'hex');
END;
$$;

-- ============================================
-- 4. FUNCTION - Auto-generate Facebook tokens on update
-- ============================================

CREATE OR REPLACE FUNCTION auto_generate_facebook_tokens()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Generate webhook token if setting page_access_token and webhook_token is null
  IF NEW.facebook_page_access_token IS NOT NULL
     AND OLD.facebook_page_access_token IS DISTINCT FROM NEW.facebook_page_access_token
     AND NEW.facebook_webhook_token IS NULL THEN
    NEW.facebook_webhook_token := generate_secure_token(32);
  END IF;

  -- Generate verify token if setting page_access_token and verify_token is null
  IF NEW.facebook_page_access_token IS NOT NULL
     AND OLD.facebook_page_access_token IS DISTINCT FROM NEW.facebook_page_access_token
     AND NEW.facebook_verify_token IS NULL THEN
    NEW.facebook_verify_token := generate_secure_token(16);
  END IF;

  RETURN NEW;
END;
$$;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trigger_auto_generate_facebook_tokens ON public.company;

CREATE TRIGGER trigger_auto_generate_facebook_tokens
BEFORE UPDATE ON public.company
FOR EACH ROW
EXECUTE FUNCTION auto_generate_facebook_tokens();

-- ============================================
-- 5. FUNCTION - Increment lead counter atomically
-- ============================================

CREATE OR REPLACE FUNCTION increment_facebook_leads_count(company_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.company
  SET
    facebook_leads_count = COALESCE(facebook_leads_count, 0) + 1,
    facebook_last_lead_at = NOW()
  WHERE id = company_uuid;
END;
$$;

-- ============================================
-- 6. FUNCTION - Regenerate Facebook tokens
-- ============================================

CREATE OR REPLACE FUNCTION regenerate_facebook_tokens(company_uuid uuid)
RETURNS TABLE(webhook_token text, verify_token text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_webhook_token text;
  new_verify_token text;
BEGIN
  new_webhook_token := generate_secure_token(32);
  new_verify_token := generate_secure_token(16);

  UPDATE public.company
  SET
    facebook_webhook_token = new_webhook_token,
    facebook_verify_token = new_verify_token
  WHERE id = company_uuid;

  RETURN QUERY SELECT new_webhook_token, new_verify_token;
END;
$$;

-- ============================================
-- 7. COMMENTS for documentation
-- ============================================

COMMENT ON COLUMN public.company.facebook_webhook_token IS 'Unique token used in webhook URL path for identifying the company';
COMMENT ON COLUMN public.company.facebook_verify_token IS 'Token used by Facebook to verify webhook subscription';
COMMENT ON COLUMN public.company.facebook_page_access_token IS 'Facebook Page Access Token for fetching complete lead data from Graph API';
COMMENT ON COLUMN public.company.facebook_app_secret IS 'Facebook App Secret for validating webhook request signatures (HMAC SHA256)';
COMMENT ON COLUMN public.company.facebook_last_lead_at IS 'Timestamp of the last lead received via Facebook webhook';
COMMENT ON COLUMN public.company.facebook_leads_count IS 'Total count of leads received via Facebook Lead Ads';

COMMENT ON COLUMN public.leads.leadgen_id IS 'Unique lead ID from Facebook (used for deduplication)';
COMMENT ON COLUMN public.leads.form_id IS 'Facebook form ID that generated this lead';
COMMENT ON COLUMN public.leads.ad_id IS 'Facebook ad ID that generated this lead';
COMMENT ON COLUMN public.leads.page_id IS 'Facebook page ID associated with this lead';
COMMENT ON COLUMN public.leads.custom_fields IS 'Additional custom form fields from Facebook form';
COMMENT ON COLUMN public.leads.raw_facebook_data IS 'Complete raw response from Facebook Graph API';
COMMENT ON COLUMN public.leads.email_valid IS 'Whether the email passed basic validation';
COMMENT ON COLUMN public.leads.facebook_data_complete IS 'Whether full lead data was fetched from Graph API';
