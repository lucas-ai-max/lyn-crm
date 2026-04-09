// Instagram API — calls go through our backend directly (no Composio)
const API = "/api/instagram";

// === Connection / OAuth ===

export async function initiateInstagramConnection(companyId: string, _callbackUrl?: string) {
  const res = await fetch(`${API}/connect`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ companyId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || err.message || "Failed to initiate connection");
  }
  return res.json();
}

export async function getConnectedAccounts(companyId: string) {
  const res = await fetch(`${API}/accounts?companyId=${encodeURIComponent(companyId)}`);
  if (!res.ok) throw new Error("Failed to fetch connected accounts");
  return res.json();
}

export async function deleteConnectedAccount(companyId: string) {
  const res = await fetch(`${API}/accounts/${companyId}?companyId=${encodeURIComponent(companyId)}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to disconnect account");
  return true;
}

// === Page Info ===

export async function getPageInfo(companyId: string) {
  const res = await fetch(`${API}/page-info?companyId=${encodeURIComponent(companyId)}`);
  if (!res.ok) return null;
  const data = await res.json();
  return data?.pageId ? data : null;
}

// === Instagram DM Actions ===

async function executeAction(action: string, companyId: string, params: Record<string, any> = {}) {
  const res = await fetch(`${API}/action`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, companyId, params }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || err.message || `Failed to execute ${action}`);
  }
  return res.json();
}

export async function listConversations(companyId: string) {
  return executeAction("INSTAGRAM_LIST_ALL_CONVERSATIONS", companyId);
}

export async function getConversationMessages(companyId: string, conversationId: string) {
  return executeAction("INSTAGRAM_LIST_ALL_MESSAGES", companyId, { conversation_id: conversationId });
}

export async function sendTextMessage(companyId: string, recipientId: string, message: string) {
  const res = await fetch(`${API}/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ companyId, recipientId, message }),
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
