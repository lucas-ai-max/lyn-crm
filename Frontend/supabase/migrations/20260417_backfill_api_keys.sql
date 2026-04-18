-- Backfill API keys for companies that don't have any active key
INSERT INTO api_keys (company_id, key, name)
SELECT
  c.id,
  'lyn_' || encode(gen_random_bytes(32), 'hex'),
  'Chave Padrão'
FROM lyn_company c
WHERE NOT EXISTS (
  SELECT 1 FROM api_keys ak
  WHERE ak.company_id = c.id
  AND ak.revoked_at IS NULL
)
ON CONFLICT DO NOTHING;
