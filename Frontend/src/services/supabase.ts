/**
 * Serviço de integração com Supabase
 * Centraliza todas as operações de banco de dados
 */

import { supabase } from "@/integrations/supabase/client";
import type { Database } from '../integrations/supabase/types'
import { useAuth } from "@/contexts/AuthContext";
import { leadsApi } from "./crmApi";

/// Importa os tipos gerados automaticamente pelo Supabase
type Tables = Database['public']['Tables']

// Tipos auxiliares baseados nas tabelas do Supabase
export type Lead = Tables['lyn_leads']['Row'] & {
  last_message_at?: string | null;
  last_message?: string | null;
  source?: string | null;
  description?: string | null;
  tags?: string[] | null;
  pipeline_id?: string | null;
  stage_id?: string | null;
}
export type LeadInsert = Tables['lyn_leads']['Insert']
export type LeadUpdate = Tables['lyn_leads']['Update']

export type Profile = Tables['lyn_profiles']['Row']
export type ProfileInsert = Tables['lyn_profiles']['Insert']
export type ProfileUpdate = Tables['lyn_profiles']['Update']

export type Agenda = Tables['lyn_agenda']['Row']
export type AgendaInsert = Tables['lyn_agenda']['Insert']
export type AgendaUpdate = Tables['lyn_agenda']['Update']

export type Agent = Tables['lyn_agents']['Row']
export type AgentInsert = Tables['lyn_agents']['Insert']
export type AgentUpdate = Tables['lyn_agents']['Update']

export type AgentPrompt = Tables['lyn_agent_prompts']['Row']
export type AgentPromptInsert = Tables['lyn_agent_prompts']['Insert']
export type AgentPromptUpdate = Tables['lyn_agent_prompts']['Update']

export type Conversa = Tables['lyn_conversas']['Row']
export type ConversaInsert = Tables['lyn_conversas']['Insert']

export type HistoricoAtendimento = Tables['lyn_historico_atendimentos']['Row']
export type HistoricoAtendimentoInsert = Tables['lyn_historico_atendimentos']['Insert']

export type Message = Tables['lyn_messages']['Row']
export type MessageInsert = Tables['lyn_messages']['Insert']
export type MessageUpdate = Tables['lyn_messages']['Update']

export type IntegrationInstance = Tables['lyn_integration_instances']['Row']
export type IntegrationInstanceInsert = Tables['lyn_integration_instances']['Insert']
export type IntegrationInstanceUpdate = Tables['lyn_integration_instances']['Update']

export type Integration = Tables['lyn_integrations']['Row']
export type IntegrationInsert = Tables['lyn_integrations']['Insert']
export type IntegrationUpdate = Tables['lyn_integrations']['Update']

export type LeadNote = Tables['lyn_lead_notes']['Row'] & {
  profiles?: { first_name: string | null; last_name: string | null } | null;
}

/**
 * Serviço de Instâncias de Integração
 */
export const integrationInstancesService = {
  async listByCompany(companyId: string | null) {
    if (!companyId) return [] as IntegrationInstance[];

    const { data, error } = await supabase
      .from('lyn_integration_instances')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return (data || []) as IntegrationInstance[];
  },

  async getDefault(companyId: string | null) {
    const instances = await integrationInstancesService.listByCompany(companyId);
    const activeInstance = instances.find((instance) => instance.status === 'active');
    return activeInstance ?? instances[0] ?? null;
  },
};

/**
 * Serviço de Leads
 */
// Leads Service — uses REST API
export const leadsService = {
  async listByCompany(companyId: string, responsavelId?: string) {
    const leads = await leadsApi.list(companyId);
    // Filter by responsavel_id if provided
    if (responsavelId) {
      return leads.filter(lead => lead.responsavel_id === responsavelId);
    }
    return leads;
  },

  async getById(id: string, companyId?: string) {
    return leadsApi.getById(id);
  },

  async create(lead: LeadInsert & { company_id: string }) {
    return leadsApi.create(lead);
  },

  async update(id: string, updates: LeadUpdate, companyId?: string) {
    return leadsApi.update(id, updates);
  },

  async delete(id: string, companyId?: string) {
    return leadsApi.delete(id);
  }
};

/**
 * Serviço de Perfis
 */
export const profilesService = {
  async getProfile(userId: string) {
    const { data, error } = await supabase
      .from('lyn_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return data;
  },

  async updateProfile(userId: string, updates: ProfileUpdate) {
    const { data, error } = await supabase
      .from('lyn_profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};

/**
 * Serviço de Agenda
 */
export const agendaService = {
  async getAll(companyId: string) {
    const { data, error } = await supabase
      .from('lyn_agenda')
      .select(`
      *,
      lead:lyn_leads(company_id)
    `)
      .eq('lead.company_id', companyId)
      .order('data_inicio', { ascending: true });

    if (error) throw error;

    // Mapeia os dados para manter a compatibilidade com o código existente
    return data.map(item => ({
      ...item,
      lead: item.lead || null
    }));
  },

  async getByUserId(userId: string) {
    const { data, error } = await supabase
      .from('lyn_agenda')
      .select(`
        *,
        lead:lyn_leads!inner(
          id,
          nome,
          email,
          telefone,
          company_id
        )
      `)
      .eq('user_id', userId)
      .order('data_inicio', { ascending: true });

    if (error) throw error;

    // Mapeia os dados para manter a compatibilidade com o código existente
    return data.map(item => ({
      ...item,
      lead: item.lead || null
    }));
  },

  async create(item: AgendaInsert) {
    const { data, error } = await supabase
      .from('lyn_agenda')
      .insert(item)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async update(id: string, updates: AgendaUpdate) {
    const { data, error } = await supabase
      .from('lyn_agenda')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('lyn_agenda')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};

/**
 * Serviço de Conversas
 */
export const conversasService = {
  async getByLeadId(leadId: string) {
    const { data, error } = await supabase
      .from('lyn_conversas')
      .select('*, messages:lyn_messages(*)')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }
};

/**
 * Serviço de Mensagens
 */
export const messagesService = {
  async listByConversation(conversationId: string) {
    const { data, error } = await supabase
      .from('lyn_messages')
      .select('*')
      .eq('conversa_id', conversationId)
      .order('timestamp', { ascending: true });

    if (error) throw error;
    return (data || []) as Message[];
  },

  async send(payload: MessageInsert) {
    const messagePayload = {
      ...payload,
      media_type: payload.media_type || 'conversation',
    };

    const { data, error } = await supabase
      .from('lyn_messages')
      .insert(messagePayload)
      .select()
      .single();

    if (error) throw error;
    return data as Message;
  },

  async update(id: string, updates: MessageUpdate) {
    const { data, error } = await supabase
      .from('lyn_messages')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Message;
  }
};

export const insightsService = {
  async listByCompany(companyId: string) {
    const { data, error } = await supabase
      .from('lyn_insights')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  async createInsight(companyId: string, conteudo: string) {
    const { data, error } = await supabase
      .from('lyn_insights')
      .insert({ company_id: companyId, conteudo })
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};

/**
 * Serviço de Histórico de Atendimentos
 */
export const historicoService = {
  async getByLeadId(leadId: string) {
    const { data, error } = await supabase
      .from('lyn_historico_atendimentos')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  async create(item: HistoricoAtendimentoInsert) {
    const { data, error } = await supabase
      .from('lyn_historico_atendimentos')
      .insert(item)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};

export { supabase };