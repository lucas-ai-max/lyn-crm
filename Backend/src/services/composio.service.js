// Composio API — OAuth e leitura de DMs do Instagram
import { config } from "../config/env.js";

const { apiKey, instagramAuthConfigId, baseUrlV2, baseUrlV3 } = config.composio;

const headers = () => ({
  "Content-Type": "application/json",
  "X-API-Key": apiKey,
});

// === OAuth ===

export async function initiateConnection(userId, callbackUrl) {
  // Limpa conexoes antigas primeiro
  try {
    const existing = await getRawConnectedAccounts(userId);
    for (const account of existing) {
      await deleteConnection(account.id).catch(() => {});
    }
  } catch {}

  const res = await fetch(`${baseUrlV3}/connected_accounts`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      auth_config: { id: instagramAuthConfigId },
      connection: { user_id: userId, callback_url: callbackUrl || "" },
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    const msg = typeof data.message === "string" ? data.message
              : typeof data.error === "string" ? data.error
              : JSON.stringify(data);
    throw new Error(msg);
  }
  return data;
}

// === Contas conectadas ===

async function getRawConnectedAccounts(userId) {
  const res = await fetch(
    `${baseUrlV3}/connected_accounts?user_id=${encodeURIComponent(userId)}`,
    { headers: headers() }
  );
  if (!res.ok) return [];
  const data = await res.json();
  const all = data?.items || [];
  return all.filter((a) => {
    const isInstagram = (a.toolkit?.slug || "").toLowerCase() === "instagram";
    const isThisProject = a.auth_config?.id === instagramAuthConfigId;
    return isInstagram && isThisProject;
  });
}

// Cache do perfil
const pageInfoCache = new Map();

export async function getConnectedAccounts(userId) {
  const accounts = await getRawConnectedAccounts(userId);
  const cached = pageInfoCache.get(userId);
  if (cached) {
    accounts.forEach((a) => {
      a.instagram_username = cached.pageUsername;
      a.instagram_id = cached.pageId;
    });
  }
  return accounts;
}

export async function getPageInfo(userId) {
  const cached = pageInfoCache.get(userId);
  if (cached && Date.now() - cached.ts < 10 * 60 * 1000) {
    return { pageId: cached.pageId, pageUsername: cached.pageUsername };
  }
  const profile = await fetchInstagramProfile(userId);
  if (profile) {
    pageInfoCache.set(userId, { ...profile, ts: Date.now() });
  }
  return profile;
}

export async function deleteConnection(accountId) {
  const res = await fetch(`${baseUrlV3}/connected_accounts/${accountId}`, {
    method: "DELETE",
    headers: headers(),
  });
  if (!res.ok) throw new Error("Failed to delete connection");
  return true;
}

// === Actions ===

export async function executeAction(actionName, userId, params = {}) {
  const res = await fetch(`${baseUrlV2}/actions/${actionName}/execute`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ appName: "instagram", entityId: userId, input: params }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || data.error || `Action ${actionName} failed`);
  return data;
}

// === Profile detection ===

async function fetchInstagramProfile(userId) {
  try {
    const convos = await executeAction("INSTAGRAM_LIST_ALL_CONVERSATIONS", userId);
    const convoList = convos?.data?.data || [];
    if (convoList.length === 0) return null;

    const idPerConvo = new Map();
    const toCheck = convoList.slice(0, Math.min(convoList.length, 3));

    for (const convo of toCheck) {
      try {
        const msgs = await executeAction("INSTAGRAM_LIST_ALL_MESSAGES", userId, {
          conversation_id: convo.id,
        });
        const msgList = msgs?.data?.data || [];
        const seenInConvo = new Set();
        for (const msg of msgList.slice(0, 5)) {
          const from = msg.from_ || msg.from || {};
          const to = msg.to?.data?.[0] || {};
          for (const user of [from, to]) {
            if (user.id && !seenInConvo.has(user.id)) {
              seenInConvo.add(user.id);
              const entry = idPerConvo.get(user.id) || { username: user.username, convoCount: 0 };
              entry.convoCount++;
              if (user.username) entry.username = user.username;
              idPerConvo.set(user.id, entry);
            }
          }
        }
      } catch {}
    }

    let pageId = null, pageUsername = null, maxConvos = 0;
    for (const [id, info] of idPerConvo) {
      if (info.convoCount > maxConvos) {
        maxConvos = info.convoCount;
        pageId = id;
        pageUsername = info.username;
      }
    }

    return pageId ? { pageId, pageUsername } : null;
  } catch {
    return null;
  }
}
