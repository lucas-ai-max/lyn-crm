-- Add new columns to mensagens table to support media
ALTER TABLE public.mensagens 
ADD COLUMN IF NOT EXISTS incoming boolean,
ADD COLUMN IF NOT EXISTS body text,
ADD COLUMN IF NOT EXISTS media_base64 text,
ADD COLUMN IF NOT EXISTS media_type text,
ADD COLUMN IF NOT EXISTS message_id text,
ADD COLUMN IF NOT EXISTS timestamp timestamp with time zone;

-- Migrate existing data: copy texto to body and set incoming based on remetente_id
UPDATE public.mensagens 
SET body = texto,
    timestamp = created_at,
    incoming = false
WHERE body IS NULL;

-- Add comment explaining the schema
COMMENT ON COLUMN public.mensagens.incoming IS 'True if message was received, false if sent';
COMMENT ON COLUMN public.mensagens.body IS 'Text content of the message';
COMMENT ON COLUMN public.mensagens.media_base64 IS 'Base64 encoded file content';
COMMENT ON COLUMN public.mensagens.media_type IS 'MIME type of the media (e.g., image/png, application/pdf, audio/mpeg)';
COMMENT ON COLUMN public.mensagens.message_id IS 'External message ID for tracking';
COMMENT ON COLUMN public.mensagens.timestamp IS 'Message timestamp';