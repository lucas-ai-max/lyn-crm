import { supabase } from "../config/supabase.js";
import crypto from "crypto";

// Generate a secure random API key
function generateApiKey() {
  return `lyn_${crypto.randomBytes(32).toString("hex")}`;
}

// Hash API key for comparison
export function hashApiKey(key) {
  return crypto.createHash("sha256").update(key).digest("hex");
}

// Create new API key for company
export async function createApiKey(companyId, name = "API Key") {
  const key = generateApiKey();

  const { data, error } = await supabase
    .from("api_keys")
    .insert({ company_id: companyId, key, name })
    .select()
    .single();

  if (error) throw new Error(`Failed to create API key: ${error.message}`);

  return { ...data, key }; // Return the plain key (only shown once)
}

// List API keys for company (without showing full key)
export async function listApiKeys(companyId) {
  const { data, error } = await supabase
    .from("api_keys")
    .select("id, name, created_at, last_used_at, revoked_at")
    .eq("company_id", companyId)
    .is("revoked_at", null)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to list API keys: ${error.message}`);
  return data;
}

// Get API key info (without showing full key)
export async function getApiKeyInfo(id) {
  const { data, error } = await supabase
    .from("api_keys")
    .select("id, company_id, name, created_at, last_used_at, revoked_at")
    .eq("id", id)
    .single();

  if (error) throw new Error(`Failed to get API key: ${error.message}`);
  return data;
}

// Revoke API key (soft delete)
export async function revokeApiKey(id) {
  const { data, error } = await supabase
    .from("api_keys")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(`Failed to revoke API key: ${error.message}`);
  return data;
}

// Regenerate API key (revoke old, create new)
export async function regenerateApiKey(id, name) {
  // First, get the old key info
  const oldKey = await getApiKeyInfo(id);

  // Revoke the old one
  await revokeApiKey(id);

  // Create new one
  const newKey = await createApiKey(oldKey.company_id, name);

  return newKey;
}

// Verify API key and return company info
export async function verifyApiKey(key) {
  // Get the key from database
  const { data, error } = await supabase
    .from("api_keys")
    .select("id, company_id, name")
    .eq("key", key)
    .is("revoked_at", null)
    .single();

  if (error || !data) {
    return null;
  }

  // Update last_used_at
  supabase
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", data.id)
    .then()
    .catch((err) => console.error("Failed to update last_used_at:", err));

  return data;
}
