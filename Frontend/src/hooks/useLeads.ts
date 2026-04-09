import { useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Lead } from "@/services/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState, useCallback } from "react";
import { useNotifications } from "@/hooks/useNotifications";

export type LeadWithLastMessage = Lead & {
  lastMessageDate?: Date;
  priority?: 'high' | 'medium' | 'low';
  pipeline?: { name: string } | null;
  stage?: { name: string; position?: number | null; is_final?: boolean | null } | null;
};

type LeadQueryRow = LeadWithLastMessage & {
  prioridade?: string | null;
  last_message_at?: string | null;
};

function mapLeadRow(lead: LeadQueryRow): LeadWithLastMessage {
  return {
    ...lead,
    lastMessageDate: lead.last_message_at ? new Date(lead.last_message_at) : undefined,
    priority: (lead.prioridade as 'high' | 'medium' | 'low') || 'medium'
  };
}

interface UseLeadsOptions {
  responsavelId?: string;
  page?: number;
  pageSize?: number;
  searchQuery?: string;
  segmentFilter?: string;
  sourceFilter?: string;
}

interface PaginatedLeadsResult {
  leads: LeadWithLastMessage[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
}

export const useLeads = ({
  responsavelId,
  page = 1,
  pageSize = 25,
  searchQuery = '',
  segmentFilter = 'All',
  sourceFilter = 'All'
}: UseLeadsOptions = {}) => {
  const { companyId } = useAuth();
  const queryClient = useQueryClient();
  const { notify } = useNotifications();

  useEffect(() => {
    if (!companyId) return;

    const channel = supabase
      .channel('leads-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lyn_leads',
          filter: `company_id=eq.${companyId}`
        },
        (payload) => {
          console.log('[Leads Realtime] Change received:', payload);
          // Invalidate all leads queries on any change
          queryClient.invalidateQueries({ queryKey: ["leads"] });
          queryClient.invalidateQueries({ queryKey: ["all-leads"] });

          // Notify on new lead creation
          if (payload.eventType === 'INSERT') {
            const newLead = payload.new as Lead;
            notify('Novo Lead!', newLead.nome || 'Novo contato adicionado');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId, queryClient, notify]);

  return useQuery({
    queryKey: ["leads", companyId, responsavelId, page, pageSize, searchQuery, segmentFilter, sourceFilter],
    enabled: !!companyId,
    placeholderData: keepPreviousData, // Keep showing previous data while fetching new page
    queryFn: async (): Promise<PaginatedLeadsResult> => {
      if (!companyId) return {
        leads: [],
        totalCount: 0,
        totalPages: 0,
        currentPage: page,
        pageSize
      };

      // Calculate offset for pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      // Build base query for counting
      let countQuery = supabase
        .from("lyn_leads")
        .select("*", { count: 'exact', head: true })
        .eq("company_id", companyId);

      // Build data query
      let dataQuery = supabase
        .from("lyn_leads")
        .select(`
          *,
          pipeline:lyn_pipelines(name),
          stage:lyn_pipeline_stages(name, position, is_final)
        `)
        .eq("company_id", companyId)
        .order("last_message_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
        .range(from, to);

      // Apply filters
      if (responsavelId) {
        countQuery = countQuery.eq("responsavel_id", responsavelId);
        dataQuery = dataQuery.eq("responsavel_id", responsavelId);
      }

      if (segmentFilter && segmentFilter !== 'All') {
        countQuery = countQuery.eq("segmento", segmentFilter);
        dataQuery = dataQuery.eq("segmento", segmentFilter);
      }

      if (sourceFilter && sourceFilter !== 'All') {
        countQuery = countQuery.eq("source", sourceFilter);
        dataQuery = dataQuery.eq("source", sourceFilter);
      }

      // Apply search filter (server-side)
      if (searchQuery && searchQuery.trim()) {
        const search = searchQuery.trim().toLowerCase();
        // Use Supabase's ilike for case-insensitive search
        const searchFilter = `nome.ilike.%${search}%,email.ilike.%${search}%,telefone.ilike.%${search}%,empresa.ilike.%${search}%`;
        countQuery = countQuery.or(searchFilter);
        dataQuery = dataQuery.or(searchFilter);
      }

      // Execute both queries in parallel
      const [countResult, dataResult] = await Promise.all([
        countQuery,
        dataQuery
      ]);

      if (dataResult.error) throw dataResult.error;

      const totalCount = countResult.count || 0;
      const totalPages = Math.ceil(totalCount / pageSize);

      // Cast to LeadWithLastMessage[] to handle mismatch with generated types
      const leads = ((dataResult.data as LeadQueryRow[] | null) || []).map(mapLeadRow);

      return {
        leads,
        totalCount,
        totalPages,
        currentPage: page,
        pageSize
      };
    },
  });
};

// Simplified hook for components that need all leads (e.g., Kanban, Dashboard stats)
// Uses a larger page size but still limits initial load
export const useAllLeads = ({ responsavelId }: Pick<UseLeadsOptions, 'responsavelId'> = {}) => {
  const { companyId } = useAuth();
  const queryClient = useQueryClient();
  const { notify } = useNotifications();

  useEffect(() => {
    if (!companyId) return;

    const channel = supabase
      .channel('leads-changes-all')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lyn_leads',
          filter: `company_id=eq.${companyId}`
        },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ["all-leads"] });

          if (payload.eventType === 'INSERT') {
            const newLead = payload.new as Lead;
            notify('Novo Lead!', newLead.nome || 'Novo contato adicionado');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId, queryClient, notify]);

  return useQuery({
    queryKey: ["all-leads", companyId, responsavelId],
    enabled: !!companyId,
    staleTime: 30000, // Cache for 30 seconds since this is a heavier query
    queryFn: async () => {
      if (!companyId) return [] as LeadWithLastMessage[];

      let query = supabase
        .from("lyn_leads")
        .select(`
          id, nome, email, telefone, empresa, source, status, segmento, prioridade, created_at, last_message_at, pipeline_id, stage_id,
          pipeline:lyn_pipelines(name),
          stage:lyn_pipeline_stages(name, position, is_final)
        `) // Included fields for client-side filtering + relation names
        .eq("company_id", companyId)
        .order("last_message_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });

      if (responsavelId) {
        query = query.eq("responsavel_id", responsavelId);
      }

      const { data: leads, error } = await query;

      if (error) throw error;

      return ((leads as LeadQueryRow[] | null) || []).map(mapLeadRow);
    },
  });
};
