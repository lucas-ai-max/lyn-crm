// Instagram API via Composio — leitura de DMs
const API_BASE = import.meta.env.VITE_API_URL || "";
const API = `${API_BASE}/api/instagram`;

// === Connection / OAuth ===

export async function initiateInstagramConnection(userId: string, callbackUrl: string) {
  const res = await fetch(`${API}/connect`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, callbackUrl }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || err.message || "Failed to initiate connection");
  }
  return res.json();
}

export async function getConnectedAccounts(userId: string) {
  const res = await fetch(`${API}/accounts?userId=${encodeURIComponent(userId)}`);
  if (!res.ok) throw new Error("Failed to fetch connected accounts");
  return res.json();
}

export async function deleteConnectedAccount(accountId: string) {
  const res = await fetch(`${API}/accounts/${accountId}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to disconnect account");
  return true;
}

// === Page Info ===

export async function getPageInfo(userId: string) {
  const res = await fetch(`${API}/page-info?userId=${encodeURIComponent(userId)}`);
  if (!res.ok) return null;
  const data = await res.json();
  return data?.pageId ? data : null;
}

// === Instagram DM Actions ===

async function executeAction(action: string, userId: string, params: Record<string, any> = {}) {
  const res = await fetch(`${API}/action`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, userId, params }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || err.message || `Failed to execute ${action}`);
  }
  return res.json();
}

export async function listConversations(userId: string) {
  return executeAction("INSTAGRAM_LIST_ALL_CONVERSATIONS", userId);
}

export async function getConversationMessages(userId: string, conversationId: string) {
  return executeAction("INSTAGRAM_LIST_ALL_MESSAGES", userId, { conversation_id: conversationId });
}

export async function sendTextMessage(_userId: string, recipientId: string, message: string) {
  const res = await fetch(`${API}/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ recipientId, message }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || err.message || "Failed to send message");
  }
  return res.json();
}

export function isComposioConfigured() {
  return true;
}
