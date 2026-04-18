import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ApiKey {
  id: string;
  name: string;
  created_at: string;
  last_used_at?: string;
}

export interface CreateApiKeyResponse {
  id: string;
  name: string;
  key: string;
  created_at: string;
}

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export function useApiKeys() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get auth token
  const getAuthToken = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token;
  };

  // List API keys
  const listKeys = async (apiKey: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/api/api-keys`, {
        headers: {
          "X-API-Key": apiKey,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch API keys");
      }

      const { data } = await response.json();
      setKeys(data);
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Create new API key
  const createKey = async (
    apiKey: string,
    name?: string
  ): Promise<CreateApiKeyResponse> => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/api/api-keys`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": apiKey,
        },
        body: JSON.stringify({ name: name || "API Key" }),
      });

      if (!response.ok) {
        throw new Error("Failed to create API key");
      }

      const { data } = await response.json();
      setKeys([...keys, { id: data.id, name: data.name, created_at: data.created_at }]);
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Regenerate API key
  const regenerateKey = async (
    apiKey: string,
    keyId: string,
    name?: string
  ): Promise<CreateApiKeyResponse> => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/api/api-keys/${keyId}/regenerate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": apiKey,
        },
        body: JSON.stringify({ name }),
      });

      if (!response.ok) {
        throw new Error("Failed to regenerate API key");
      }

      const { data } = await response.json();
      setKeys(
        keys.map((k) =>
          k.id === keyId
            ? { ...k, created_at: data.created_at, last_used_at: undefined }
            : k
        )
      );
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Revoke API key
  const revokeKey = async (apiKey: string, keyId: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/api/api-keys/${keyId}`, {
        method: "DELETE",
        headers: {
          "X-API-Key": apiKey,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to revoke API key");
      }

      setKeys(keys.filter((k) => k.id !== keyId));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    keys,
    loading,
    error,
    listKeys,
    createKey,
    regenerateKey,
    revokeKey,
  };
}
