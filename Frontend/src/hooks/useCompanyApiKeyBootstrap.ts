import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface UseCompanyApiKeyBootstrapReturn {
  apiKey: string | null;
  hasKeys: boolean;
  needsReentry: boolean;
  isLoading: boolean;
  createFirstKey: () => Promise<void>;
}

const STORAGE_KEY = (companyId: string) => `lyn.apikey.${companyId}`;

const getBaseUrl = () => {
  let base = import.meta.env.VITE_API_URL || 'http://localhost:3001';
  // Ensure no trailing slash
  while (base.endsWith('/')) {
    base = base.slice(0, -1);
  }
  return base;
};

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

    const initializeKeys = async () => {
      try {
        // Check if key is in sessionStorage
        const storedKey = sessionStorage.getItem(STORAGE_KEY(companyId));
        if (storedKey) {
          setApiKey(storedKey);
          setHasKeys(true);
          setIsLoading(false);
          return;
        }

        // Call bootstrap endpoint
        const baseUrl = getBaseUrl();
        const url = baseUrl + '/api/api-keys/bootstrap';
        const response = await fetch(
          url,
          {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${session.access_token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          throw new Error(`Bootstrap failed: ${response.statusText}`);
        }

        const result = await response.json();

        if (result.data && result.data.key) {
          // New key was created
          setApiKey(result.data.key);
          sessionStorage.setItem(STORAGE_KEY(companyId), result.data.key);
          setHasKeys(false);
        } else if (result.hasKeys) {
          // Company already has keys, but session doesn't have a copy
          setHasKeys(true);
          setNeedsReentry(true);
        }
      } catch (error) {
        console.error("Error bootstrapping API key:", error);
        // Don't fail on bootstrap error, just set hasKeys to true
        setHasKeys(true);
      } finally {
        setIsLoading(false);
      }
    };

    initializeKeys();
  }, [companyId, session]);

  const createFirstKey = useCallback(async () => {
    if (!companyId || !session) {
      throw new Error("User not authenticated");
    }

    try {
      setIsLoading(true);
      const baseUrl = getBaseUrl();
      const url = baseUrl + '/api/api-keys/bootstrap';
      const response = await fetch(
        url,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to create API key: ${response.statusText}`);
      }

      const result = await response.json();
      if (result.data && result.data.key) {
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

  return {
    apiKey,
    hasKeys,
    needsReentry,
    isLoading,
    createFirstKey,
  };
}
