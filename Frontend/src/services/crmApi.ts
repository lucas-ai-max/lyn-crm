// REST API client for Lyn CRM Backend
import { supabase } from "./supabase";

const API_BASE = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");

// Get auth token from Supabase session
async function getAuthHeader() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error("Not authenticated");
  }
  return {
    "Authorization": `Bearer ${session.access_token}`,
    "Content-Type": "application/json"
  };
}

// Helper to make API calls
async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = await getAuthHeader();
  const url = `${API_BASE}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || `API error: ${response.statusText}`);
  }

  return response.json();
}

// --- Leads API ---
export const leadsApi = {
  async list(companyId: string, filters?: any) {
    const query = new URLSearchParams({ companyId });
    if (filters?.status) query.append("status", filters.status);
    if (filters?.source) query.append("source", filters.source);
    if (filters?.search) query.append("search", filters.search);

    const result = await apiFetch<{ data: any[] }>(
      `/api/leads?${query.toString()}`
    );
    return result.data || [];
  },

  async getById(id: string) {
    const result = await apiFetch<{ data: any }>(
      `/api/leads/${id}`
    );
    return result.data;
  },

  async create(payload: any) {
    const result = await apiFetch<{ data: any }>(
      `/api/leads`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );
    return result.data;
  },

  async update(id: string, payload: any) {
    const result = await apiFetch<{ data: any }>(
      `/api/leads/${id}`,
      {
        method: "PUT",
        body: JSON.stringify(payload),
      }
    );
    return result.data;
  },

  async delete(id: string) {
    await apiFetch(
      `/api/leads/${id}`,
      { method: "DELETE" }
    );
  },
};

// --- Contacts API ---
export const contactsApi = {
  async list(companyId: string) {
    const query = new URLSearchParams({ companyId });
    const result = await apiFetch<{ data: any[] }>(
      `/api/contacts?${query.toString()}`
    );
    return result.data || [];
  },

  async getById(id: string) {
    const result = await apiFetch<{ data: any }>(
      `/api/contacts/${id}`
    );
    return result.data;
  },

  async create(payload: any) {
    const result = await apiFetch<{ data: any }>(
      `/api/contacts`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );
    return result.data;
  },

  async update(id: string, payload: any) {
    const result = await apiFetch<{ data: any }>(
      `/api/contacts/${id}`,
      {
        method: "PUT",
        body: JSON.stringify(payload),
      }
    );
    return result.data;
  },

  async delete(id: string) {
    await apiFetch(
      `/api/contacts/${id}`,
      { method: "DELETE" }
    );
  },
};
