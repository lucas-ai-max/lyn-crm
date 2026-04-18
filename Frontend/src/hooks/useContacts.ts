import { useQuery, useQueryClient, useMutation, keepPreviousData } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

export interface Contact {
  id: string;
  company_id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  telefone_2: string | null;
  empresa: string | null;
  segmento: string | null;
  source: string | null;
  tags: string[] | null;
  custom_fields: Record<string, any> | null;
  created_at: string | null;
  updated_at: string | null;
}

interface UseContactsOptions {
  page?: number;
  pageSize?: number;
  searchQuery?: string;
  segmentFilter?: string;
}

interface PaginatedContactsResult {
  contacts: Contact[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
}

export const useContacts = ({
  page = 1,
  pageSize = 25,
  searchQuery = '',
  segmentFilter = 'All'
}: UseContactsOptions = {}) => {
  const { companyId } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    if (!companyId) return;

    const channel = supabase
      .channel('contacts-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lyn_contacts',
          filter: `company_id=eq.${companyId}`
        },
        (payload) => {
          console.log('[Contacts Realtime] Change received:', payload);
          queryClient.invalidateQueries({ queryKey: ["contacts"] });
          queryClient.invalidateQueries({ queryKey: ["all-contacts"] });

          if (payload.eventType === 'INSERT') {
            const newContact = payload.new as Contact;
            toast({
              title: "Novo contato!",
              description: newContact.nome || 'Novo contato adicionado'
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId, queryClient, toast]);

  return useQuery({
    queryKey: ["contacts", companyId, page, pageSize, searchQuery, segmentFilter],
    enabled: !!companyId,
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<PaginatedContactsResult> => {
      if (!companyId) return {
        contacts: [],
        totalCount: 0,
        totalPages: 0,
        currentPage: page,
        pageSize
      };

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let countQuery = supabase
        .from("lyn_contacts")
        .select("*", { count: 'exact', head: true })
        .eq("company_id", companyId);

      let dataQuery = supabase
        .from("lyn_contacts")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (segmentFilter && segmentFilter !== 'All') {
        countQuery = countQuery.eq("segmento", segmentFilter);
        dataQuery = dataQuery.eq("segmento", segmentFilter);
      }

      if (searchQuery && searchQuery.trim()) {
        const search = searchQuery.trim().toLowerCase();
        const searchFilter = `nome.ilike.%${search}%,email.ilike.%${search}%,telefone.ilike.%${search}%,empresa.ilike.%${search}%`;
        countQuery = countQuery.or(searchFilter);
        dataQuery = dataQuery.or(searchFilter);
      }

      const [countResult, dataResult] = await Promise.all([
        countQuery,
        dataQuery
      ]);

      if (dataResult.error) throw dataResult.error;

      const totalCount = countResult.count || 0;
      const totalPages = Math.ceil(totalCount / pageSize);
      const contacts = (dataResult.data as Contact[] | null) || [];

      return {
        contacts,
        totalCount,
        totalPages,
        currentPage: page,
        pageSize
      };
    },
  });
};

// Lightweight hook for contact picker/dropdown (e.g., LeadModal)
// Fetches only essential fields to minimize payload
export const useAllContacts = () => {
  const { companyId } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!companyId) return;

    const channel = supabase
      .channel('contacts-changes-all')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lyn_contacts',
          filter: `company_id=eq.${companyId}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["all-contacts"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId, queryClient]);

  return useQuery({
    queryKey: ["all-contacts", companyId],
    enabled: !!companyId,
    staleTime: 30000,
    queryFn: async () => {
      if (!companyId) return [] as Contact[];

      // Fetch all contacts but limit to 200 and select minimal fields for the picker
      const { data: contacts, error } = await supabase
        .from("lyn_contacts")
        .select("id, nome, email, telefone, telefone_2, empresa, company_id, created_at")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) throw error;

      return (contacts as Contact[] | null) || [];
    },
  });
};

export const useCreateContact = () => {
  const { companyId } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contactData: Omit<Contact, 'id' | 'created_at' | 'updated_at'>) => {
      if (!companyId) throw new Error("No company ID");

      const { data, error } = await supabase
        .from("lyn_contacts")
        .insert({ ...contactData, company_id: companyId })
        .select()
        .single();

      if (error) throw error;
      return data as Contact;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["all-contacts"] });
      toast({
        title: "Sucesso",
        description: "Contato criado com sucesso"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Falha ao criar contato",
        variant: "destructive"
      });
    }
  });
};

export const useUpdateContact = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Contact> }) => {
      const { data: updated, error } = await supabase
        .from("lyn_contacts")
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return updated as Contact;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["all-contacts"] });
      toast({
        title: "Sucesso",
        description: "Contato atualizado com sucesso"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Falha ao atualizar contato",
        variant: "destructive"
      });
    }
  });
};

export const useDeleteContact = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("lyn_contacts")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["all-contacts"] });
      toast({
        title: "Sucesso",
        description: "Contato removido com sucesso"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Falha ao remover contato",
        variant: "destructive"
      });
    }
  });
};
