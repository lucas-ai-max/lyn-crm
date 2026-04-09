// Instagram via Facebook Login for Business
// O token do Facebook funciona com a Messaging API do Instagram
import crypto from "crypto";
import { config } from "../config/env.js";
import { supabase } from "../config/supabase.js";

const { appId, appSecret, redirectUri } = config.instagram;
const FB = "https://graph.facebook.com/v25.0";

// === OAuth State Management ===
const pendingOAuth = new Map();

export function getOAuthUrl(companyId) {
  const nonce = crypto.randomUUID();
  pendingOAuth.set(nonce, { companyId, createdAt: Date.now() });

  // Limpa entradas antigas (>10 min)
  for (const [key, val] of pendingOAuth) {
    if (Date.now() - val.createdAt > 10 * 60 * 1000) pendingOAuth.delete(key);
  }

  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "instagram_basic,instagram_manage_messages,pages_show_list",
    state: nonce,
  });
  return `https://www.facebook.com/v25.0/dialog/oauth?${params}`;
}

export async function handleCallback(code, state) {
  const entry = pendingOAuth.get(state);
  if (!entry) throw new Error("Estado OAuth invalido ou expirado");
  const { companyId } = entry;
  pendingOAuth.delete(state);

  // 1. Troca code por Facebook User token
  console.log("[instagram] Exchanging code for Facebook token...");
  const tokenRes = await fetch(
    `${FB}/oauth/access_token?client_id=${appId}&client_secret=${appSecret}&redirect_uri=${encodeURIComponent(redirectUri)}&code=${code}`
  );
  const tokenData = await tokenRes.json();
  if (tokenData.error) throw new Error(tokenData.error.message);
  const userToken = tokenData.access_token;
  console.log("[instagram] Facebook user token obtained");

  // 2. Get long-lived user token
  console.log("[instagram] Exchanging for long-lived token...");
  const longRes = await fetch(
    `${FB}/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${userToken}`
  );
  const longData = await longRes.json();
  const longToken = longData.access_token || userToken;
  const expiresIn = longData.expires_in || 3600;
  console.log("[instagram] Long-lived token:", longData.error ? "failed, using short" : "ok");

  // 3. Get Facebook Pages with Instagram Business Account
  console.log("[instagram] Fetching pages...");
  const pagesRes = await fetch(
    `${FB}/me/accounts?fields=id,name,access_token,instagram_business_account{id,username,name,profile_picture_url}&access_token=${longToken}`
  );
  const pagesData = await pagesRes.json();
  if (pagesData.error) throw new Error(pagesData.error.message);

  // Find the page with an Instagram Business account
  const pages = pagesData.data || [];
  let pageToken = null;
  let igAccount = null;

  for (const page of pages) {
    if (page.instagram_business_account) {
      pageToken = page.access_token;
      igAccount = page.instagram_business_account;
      console.log(`[instagram] Found IG account: @${igAccount.username} via page "${page.name}"`);
      break;
    }
  }

  if (!igAccount || !pageToken) {
    throw new Error("Nenhuma conta Instagram Business vinculada a uma Facebook Page encontrada. Vincule sua conta Instagram a uma Pagina no Facebook.");
  }

  // 4. Salva no Supabase
  const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
  const igConfig = {
    access_token: pageToken, // Page token nao expira enquanto o user token for valido
    ig_user_id: igAccount.id,
    ig_username: igAccount.username,
    ig_name: igAccount.name || null,
    ig_profile_pic: igAccount.profile_picture_url || null,
    token_expires_at: tokenExpiresAt,
    connected_at: new Date().toISOString(),
  };

  // Upsert na lyn_integration_instances
  const { data: existing } = await supabase
    .from("lyn_integration_instances")
    .select("id")
    .eq("company_id", companyId)
    .eq("provider", "instagram")
    .maybeSingle();

  if (existing) {
    await supabase
      .from("lyn_integration_instances")
      .update({ config: igConfig, status: "active", name: `@${igAccount.username}`, external_instance_id: igAccount.id })
      .eq("id", existing.id);
  } else {
    await supabase.from("lyn_integration_instances").insert({
      company_id: companyId,
      provider: "instagram",
      config: igConfig,
      status: "active",
      name: `@${igAccount.username}`,
      external_instance_id: igAccount.id,
    });
  }

  // Upsert na lyn_integrations
  const { data: instance } = await supabase
    .from("lyn_integration_instances")
    .select("id")
    .eq("company_id", companyId)
    .eq("provider", "instagram")
    .single();

  const { data: existingIntegration } = await supabase
    .from("lyn_integrations")
    .select("id")
    .eq("company_id", companyId)
    .eq("type", "instagram")
    .maybeSingle();

  if (existingIntegration) {
    await supabase
      .from("lyn_integrations")
      .update({ active: true, instance_id: instance.id })
      .eq("id", existingIntegration.id);
  } else {
    await supabase.from("lyn_integrations").insert({
      company_id: companyId,
      type: "instagram",
      instance_id: instance.id,
      active: true,
    });
  }

  console.log(`[instagram] Conta @${igAccount.username} conectada para company ${companyId}`);
  return { igUserId: igAccount.id, igUsername: igAccount.username };
}

// === Token Management ===
const tokenCache = new Map();

async function getTokenForCompany(companyId) {
  const cached = tokenCache.get(companyId);
  if (cached && Date.now() - cached.fetchedAt < 5 * 60 * 1000) return cached;

  const { data, error } = await supabase
    .from("lyn_integration_instances")
    .select("config")
    .eq("company_id", companyId)
    .eq("provider", "instagram")
    .eq("status", "active")
    .maybeSingle();

  if (error || !data?.config?.access_token) return null;

  const c = data.config;
  const tokenData = {
    accessToken: c.access_token,
    igUserId: c.ig_user_id,
    igUsername: c.ig_username,
    tokenExpiresAt: c.token_expires_at,
    fetchedAt: Date.now(),
  };

  tokenCache.set(companyId, tokenData);
  return tokenData;
}

async function authFetch(companyId, url, options = {}) {
  const token = await getTokenForCompany(companyId);
  if (!token) throw new Error("Instagram nao conectado. Conecte em Instagram Admin.");

  const separator = url.includes("?") ? "&" : "?";
  const fullUrl = `${url}${separator}access_token=${token.accessToken}`;

  const res = await fetch(fullUrl, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
  });
  const data = await res.json();

  if (!res.ok) {
    if (data?.error?.code === 190) {
      tokenCache.delete(companyId);
      await supabase
        .from("lyn_integration_instances")
        .update({ status: "error" })
        .eq("company_id", companyId)
        .eq("provider", "instagram");
      throw new Error("Token do Instagram expirado. Reconecte em Instagram Admin.");
    }
    throw new Error(data?.error?.message || JSON.stringify(data));
  }
  return data;
}

// === Graph API Calls (via Facebook Graph API) ===

export async function sendTextMessage(companyId, recipientId, text) {
  const token = await getTokenForCompany(companyId);
  if (!token) throw new Error("Instagram nao conectado.");

  return authFetch(companyId, `${FB}/${token.igUserId}/messages`, {
    method: "POST",
    body: JSON.stringify({
      recipient: { id: recipientId },
      message: { text },
    }),
  });
}

export async function listConversations(companyId) {
  const token = await getTokenForCompany(companyId);
  if (!token) throw new Error("Instagram nao conectado.");

  return authFetch(companyId, `${FB}/${token.igUserId}/conversations?fields=id,participants,updated_time&platform=instagram`);
}

export async function getConversationMessages(companyId, conversationId) {
  // 1. Get message IDs
  const convo = await authFetch(companyId, `${FB}/${conversationId}?fields=messages`);
  const messageIds = convo?.messages?.data || [];

  // 2. Fetch details for each message
  const messages = await Promise.all(
    messageIds.slice(0, 20).map(async (msg) => {
      try {
        return await authFetch(companyId, `${FB}/${msg.id}?fields=id,created_time,from,to,message`);
      } catch {
        return { id: msg.id, message: "" };
      }
    })
  );

  return { data: messages };
}

export async function getMyProfile(companyId) {
  const token = await getTokenForCompany(companyId);
  if (!token) throw new Error("Instagram nao conectado.");

  return authFetch(companyId, `${FB}/${token.igUserId}?fields=id,username,name,profile_picture_url`);
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
  await supabase
    .from("lyn_integration_instances")
    .update({ status: "inactive" })
    .eq("company_id", companyId)
    .eq("provider", "instagram");
  await supabase
    .from("lyn_integrations")
    .update({ active: false })
    .eq("company_id", companyId)
    .eq("type", "instagram");
}
