import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { apiUrl } from "@/lib/api-url";

interface UseCompanyApiKeyBootstrapReturn {
  apiKey: string | null;
  hasKeys: boolean;
  needsReentry: boolean;
  isLoading: boolean;
  createFirstKey: () => Promise<void>;
}

interface BootstrapResult {
  data: { key: string } | null;
  hasKeys: boolean;
}

const STORAGE_KEY = (companyId: string) => `lyn.apikey.${companyId}`;

async function bootstrapRequest(
  accessToken: string,
  force = false
): Promise<BootstrapResult> {
  const res = await fetch(apiUrl("/api/api-keys/bootstrap"), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ force }),
  });

  if (!res.ok) {
    throw new Error(`Bootstrap failed: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export function useCompanyApiKeyBootstrap(): UseCompanyApiKeyBootstrapReturn {
  const { companyId, session } = useAuth();
  const { toast } = useToast();

  const [apiKey, setApiKey] = useState<string | null>(null);
  const [hasKeys, setHasKeys] = useState(false);
  const [needsReentry, setNeedsReentry] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!companyId || !session) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const initializeKeys = async () => {
      try {
        const storedKey = sessionStorage.getItem(STORAGE_KEY(companyId));
        if (storedKey) {
          if (cancelled) return;
          setApiKey(storedKey);
          setHasKeys(true);
          return;
        }

        const result = await bootstrapRequest(session.access_token, false);
        if (cancelled) return;

        if (result.data?.key) {
          setApiKey(result.data.key);
          sessionStorage.setItem(STORAGE_KEY(companyId), result.data.key);
          setHasKeys(false);
        } else if (result.hasKeys) {
          setHasKeys(true);
          setNeedsReentry(true);
        }
      } catch (error) {
        if (cancelled) return;
        console.error("Error bootstrapping API key:", error);
        setHasKeys(true);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    initializeKeys();
    return () => {
      cancelled = true;
    };
  }, [companyId, session]);

  const createFirstKey = useCallback(async () => {
    if (!companyId || !session) {
      throw new Error("User not authenticated");
    }

    try {
      setIsLoading(true);
      const result = await bootstrapRequest(session.access_token, true);

      if (result.data?.key) {
        setApiKey(result.data.key);
        setHasKeys(true);
        setNeedsReentry(false);
        sessionStorage.setItem(STORAGE_KEY(companyId), result.data.key);

        toast({
          title: "Sucesso",
          description: "Chave API criada com sucesso",
        });
      }
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Falha ao criar chave API",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [companyId, session, toast]);

  return { apiKey, hasKeys, needsReentry, isLoading, createFirstKey };
}
