-- Add composio and instagram integration fields to lyn_company
ALTER TABLE lyn_company
  ADD COLUMN IF NOT EXISTS composio_entity_id TEXT,
  ADD COLUMN IF NOT EXISTS instagram_page_id TEXT;

COMMENT ON COLUMN lyn_company.composio_entity_id IS
  'Composio entityId used for Instagram OAuth (typically = user UUID or company UUID)';
COMMENT ON COLUMN lyn_company.instagram_page_id IS
  'Instagram Business page ID retrieved from Composio getPageInfo';
