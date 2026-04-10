// Instagram Graph API — leitura de DMs via token IGAAS (Instagram Login)
// Envio desabilitado até App Review da Meta aprovar Advanced Access
import crypto from "crypto";
import { config } from "../config/env.js";
import { supabase } from "../config/supabase.js";

const { appId, appSecret, redirectUri } = config.instagram;
const IG = "https://graph.instagram.com/v25.0";

// === OAuth State Management ===
const pendingOAuth = new Map();

export function getOAuthUrl(companyId) {
  const nonce = crypto.randomUUID();
  pendingOAuth.set(nonce, { companyId, createdAt: Date.now() });

  for (const [key, val] of pendingOAuth) {
    if (Date.now() - val.createdAt > 10 * 60 * 1000) pendingOAuth.delete(key);
  }

  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "instagram_business_basic,instagram_business_manage_messages",
    state: nonce,
  });
  return `https://www.instagram.com/oauth/authorize?${params}`;
}

export async function handleCallback(code, state) {
  const entry = pendingOAuth.get(state);
  if (!entry) throw new Error("Estado OAuth invalido ou expirado");
  const { companyId } = entry;
  pendingOAuth.delete(state);

  // Troca code por token
  const form = new URLSearchParams({
    client_id: appId,
    client_secret: appSecret,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
    code,
  });

  const res = await fetch("https://api.instagram.com/oauth/access_token", {
    method: "POST",
    body: form,
  });
  const data = await res.json();
  if (data.error_message) throw new Error(data.error_message);

  const accessToken = data.data?.[0]?.access_token || data.access_token;
  const userId = data.data?.[0]?.user_id || data.user_id;
  if (!accessToken) throw new Error("Falha ao obter token");

  // Busca perfil
  let profile = {};
  try {
    const profileRes = await fetch(`${IG}/me?fields=user_id,username,name,profile_picture_url&access_token=${encodeURIComponent(accessToken)}`);
    profile = await profileRes.json();
  } catch {}

  const igUsername = profile.username || String(userId);

  // Salva no Supabase
  const igConfig = {
    access_token: accessToken,
    ig_user_id: String(profile.user_id || userId),
    ig_username: igUsername,
    ig_name: profile.name || null,
    ig_profile_pic: profile.profile_picture_url || null,
    token_expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
    connected_at: new Date().toISOString(),
  };

  const { data: existing } = await supabase
    .from("lyn_integration_instances")
    .select("id")
    .eq("company_id", companyId)
    .eq("provider", "instagram")
    .maybeSingle();

  if (existing) {
    await supabase
      .from("lyn_integration_instances")
      .update({ config: igConfig, status: "active", name: `@${igUsername}`, external_instance_id: igConfig.ig_user_id })
      .eq("id", existing.id);
  } else {
    await supabase.from("lyn_integration_instances").insert({
      company_id: companyId,
      provider: "instagram",
      config: igConfig,
      status: "active",
      name: `@${igUsername}`,
      external_instance_id: igConfig.ig_user_id,
    });
  }

  // Upsert lyn_integrations
  const { data: instance } = await supabase
    .from("lyn_integration_instances")
    .select("id")
    .eq("company_id", companyId)
    .eq("provider", "instagram")
    .single();

  const { data: existingInt } = await supabase
    .from("lyn_integrations")
    .select("id")
    .eq("company_id", companyId)
    .eq("type", "instagram")
    .maybeSingle();

  if (existingInt) {
    await supabase.from("lyn_integrations").update({ active: true, instance_id: instance.id }).eq("id", existingInt.id);
  } else {
    await supabase.from("lyn_integrations").insert({ company_id: companyId, type: "instagram", instance_id: instance.id, active: true });
  }

  console.log(`[instagram] Conta @${igUsername} conectada para company ${companyId}`);
  return { igUserId: igConfig.ig_user_id, igUsername };
}

// === Token Management ===
const tokenCache = new Map();

async function getTokenForCompany(companyId) {
  const cached = tokenCache.get(companyId);
  if (cached && Date.now() - cached.fetchedAt < 5 * 60 * 1000) return cached;

  const { data } = await supabase
    .from("lyn_integration_instances")
    .select("config")
    .eq("company_id", companyId)
    .eq("provider", "instagram")
    .eq("status", "active")
    .maybeSingle();

  if (!data?.config?.access_token) return null;

  const c = data.config;
  const tokenData = {
    accessToken: c.access_token,
    igUserId: c.ig_user_id,
    igUsername: c.ig_username,
    fetchedAt: Date.now(),
  };
  tokenCache.set(companyId, tokenData);
  return tokenData;
}

// === Graph API Calls (graph.instagram.com) ===

export async function listConversations(companyId) {
  const token = await getTokenForCompany(companyId);
  if (!token) throw new Error("Instagram nao conectado.");

  const res = await fetch(`${IG}/me/conversations?platform=instagram&access_token=${token.accessToken}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data;
}

export async function getConversationMessages(companyId, conversationId) {
  // Com Standard Access, não conseguimos ler mensagens individuais
  // Retornamos lista vazia com aviso
  return { data: [] };
}

export async function sendTextMessage(companyId, recipientId, text) {
  throw new Error("Envio de mensagens requer aprovacao do App Review da Meta. Em breve estara disponivel.");
}

export async function getMyProfile(companyId) {
  const token = await getTokenForCompany(companyId);
  if (!token) throw new Error("Instagram nao conectado.");

  const res = await fetch(`${IG}/me?fields=user_id,username,name,profile_picture_url&access_token=${token.accessToken}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data;
}

export async function getConnectedAccount(companyId) {
  const { data } = await supabase
    .from("lyn_integration_instances")
    .select("id, name, config, status, created_at")
    .eq("company_id", companyId)
    .eq("provider", "instagram")
    .eq("status", "active")
    .maybeSingle();

  if (!data) return null;
  return {
    id: data.id,
    status: "ACTIVE",
    instagram_username: data.config?.ig_username,
    instagram_id: data.config?.ig_user_id,
    instagram_name: data.config?.ig_name,
    instagram_pic: data.config?.ig_profile_pic,
    created_at: data.created_at,
  };
}

export async function disconnectAccount(companyId) {
  tokenCache.delete(companyId);
  await supabase.from("lyn_integration_instances").update({ status: "inactive" }).eq("company_id", companyId).eq("provider", "instagram");
  await supabase.from("lyn_integrations").update({ active: false }).eq("company_id", companyId).eq("type", "instagram");
}
