export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      lyn_automation_flows: {
        Row: {
          config: Json | null
          company_id: string
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          description: string | null
          edges: Json | null
          execution_stats: Json | null
          id: string
          name: string
          nodes: Json | null
          priority: number | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          config?: Json | null
          company_id: string
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          edges?: Json | null
          execution_stats?: Json | null
          id?: string
          name: string
          nodes?: Json | null
          priority?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          config?: Json | null
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          edges?: Json | null
          execution_stats?: Json | null
          id?: string
          name?: string
          nodes?: Json | null
          priority?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "automation_flows_company_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "lyn_company"
            referencedColumns: ["id"]
          }
        ]
      }
      lyn_automation_pause_rules: {
        Row: {
          company_id: string
          created_at: string | null
          created_by: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          is_temporary: boolean | null
          reason: string | null
          scope: string
          scope_id: string | null
          scope_tag: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          is_temporary?: boolean | null
          reason?: string | null
          scope: string
          scope_id?: string | null
          scope_tag?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          is_temporary?: boolean | null
          reason?: string | null
          scope?: string
          scope_id?: string | null
          scope_tag?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "automation_pause_rules_company_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "lyn_company"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_pause_rules_flow_fkey"
            columns: ["scope_id"]
            isOneToOne: false
            referencedRelation: "lyn_automation_flows"
            referencedColumns: ["id"]
          }
        ]
      }
      lyn_agenda: {
        Row: {
          created_at: string | null
          data_fim: string | null
          data_inicio: string | null
          descricao: string | null
          id: string
          lead_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          descricao?: string | null
          id?: string
          lead_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          descricao?: string | null
          id?: string
          lead_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agenda_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "lyn_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lyn_agent_prompts: {
        Row: {
          active: boolean | null
          agent_id: string
          company_id: string
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          name: string
          system_prompt: string
          user_prompt_template: string | null
          version: number
        }
        Insert: {
          active?: boolean | null
          agent_id: string
          company_id: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          system_prompt: string
          user_prompt_template?: string | null
          version?: number
        }
        Update: {
          active?: boolean | null
          agent_id?: string
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          system_prompt?: string
          user_prompt_template?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "agent_prompts_agent_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "lyn_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_prompts_company_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "lyn_company"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_prompts_creator_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "lyn_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lyn_agents: {
        Row: {
          active: boolean | null
          company_id: string
          created_at: string | null
          id: string
          name: string
          system_prompt: string | null
          type: Database["public"]["Enums"]["lyn_agent_type"]
        }
        Insert: {
          active?: boolean | null
          company_id: string
          created_at?: string | null
          id?: string
          name: string
          system_prompt?: string | null
          type: Database["public"]["Enums"]["lyn_agent_type"]
        }
        Update: {
          active?: boolean | null
          company_id?: string
          created_at?: string | null
          id?: string
          name?: string
          system_prompt?: string | null
          type?: Database["public"]["Enums"]["lyn_agent_type"]
        }
        Relationships: [
          {
            foreignKeyName: "agents_company_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "lyn_company"
            referencedColumns: ["id"]
          },
        ]
      }
      lyn_antigravity_debug_logs: {
        Row: {
          content: string | null
          created_at: string | null
          id: string
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          id?: string
        }
        Update: {
          content?: string | null
          created_at?: string | null
          id?: string
        }
        Relationships: []
      }
      lyn_audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          company_id: string | null
          created_at: string | null
          id: string
          metadata: Json | null
          target_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          company_id?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          target_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          company_id?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          target_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "lyn_company"
            referencedColumns: ["id"]
          },
        ]
      }
      lyn_company: {
        Row: {
          composio_entity_id: string | null
          created_at: string | null
          evolution_apikey: string | null
          evolution_url: string | null
          facebook_app_secret: string | null
          facebook_last_lead_at: string | null
          facebook_leads_count: number | null
          facebook_page_access_token: string | null
          facebook_verify_token: string | null
          facebook_webhook_token: string | null
          funis: string[] | null
          id: string
          instagram_page_id: string | null
          name: string
          owner_id: string | null
          slug: string | null
          status_type: string[] | null
        }
        Insert: {
          composio_entity_id?: string | null
          created_at?: string | null
          evolution_apikey?: string | null
          evolution_url?: string | null
          facebook_app_secret?: string | null
          facebook_last_lead_at?: string | null
          facebook_leads_count?: number | null
          facebook_page_access_token?: string | null
          facebook_verify_token?: string | null
          facebook_webhook_token?: string | null
          funis?: string[] | null
          id?: string
          instagram_page_id?: string | null
          name: string
          owner_id?: string | null
          slug?: string | null
          status_type?: string[] | null
        }
        Update: {
          composio_entity_id?: string | null
          created_at?: string | null
          evolution_apikey?: string | null
          evolution_url?: string | null
          facebook_app_secret?: string | null
          facebook_last_lead_at?: string | null
          facebook_leads_count?: number | null
          facebook_page_access_token?: string | null
          facebook_verify_token?: string | null
          facebook_webhook_token?: string | null
          funis?: string[] | null
          id?: string
          instagram_page_id?: string | null
          name?: string
          owner_id?: string | null
          slug?: string | null
          status_type?: string[] | null
        }
        Relationships: []
      }
      lyn_conversas: {
        Row: {
          agent_id: string | null
          created_at: string | null
          id: string
          integration_instance_id: string | null
          lead_id: string | null
          status: string
        }
        Insert: {
          agent_id?: string | null
          created_at?: string | null
          id?: string
          integration_instance_id?: string | null
          lead_id?: string | null
          status?: string
        }
        Update: {
          agent_id?: string | null
          created_at?: string | null
          id?: string
          integration_instance_id?: string | null
          lead_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversas_agent_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "lyn_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversas_instance_fkey"
            columns: ["integration_instance_id"]
            isOneToOne: false
            referencedRelation: "lyn_integration_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversas_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "lyn_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lyn_debug_logs: {
        Row: {
          created_at: string | null
          details: Json | null
          id: number
          message: string
        }
        Insert: {
          created_at?: string | null
          details?: Json | null
          id?: number
          message: string
        }
        Update: {
          created_at?: string | null
          details?: Json | null
          id?: number
          message?: string
        }
        Relationships: []
      }
      lyn_historico_atendimentos: {
        Row: {
          created_at: string | null
          descricao: string | null
          id: string
          lead_id: string
          tipo: Database["public"]["Enums"]["lyn_tipo_atendimento"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          descricao?: string | null
          id?: string
          lead_id: string
          tipo: Database["public"]["Enums"]["lyn_tipo_atendimento"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          descricao?: string | null
          id?: string
          lead_id?: string
          tipo?: Database["public"]["Enums"]["lyn_tipo_atendimento"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "historico_atendimentos_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "lyn_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lyn_insights: {
        Row: {
          company_id: string
          conteudo: string | null
          created_at: string | null
          id: string
        }
        Insert: {
          company_id: string
          conteudo?: string | null
          created_at?: string | null
          id?: string
        }
        Update: {
          company_id?: string
          conteudo?: string | null
          created_at?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "insights_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "lyn_company"
            referencedColumns: ["id"]
          },
        ]
      }
      lyn_integration_instances: {
        Row: {
          company_id: string
          config: Json | null
          created_at: string | null
          external_instance_id: string
          id: string
          name: string
          provider: Database["public"]["Enums"]["lyn_integration_provider"]
          status: Database["public"]["Enums"]["lyn_integration_status"] | null
        }
        Insert: {
          company_id: string
          config?: Json | null
          created_at?: string | null
          external_instance_id: string
          id?: string
          name: string
          provider: Database["public"]["Enums"]["lyn_integration_provider"]
          status?: Database["public"]["Enums"]["lyn_integration_status"] | null
        }
        Update: {
          company_id?: string
          config?: Json | null
          created_at?: string | null
          external_instance_id?: string
          id?: string
          name?: string
          provider?: Database["public"]["Enums"]["lyn_integration_provider"]
          status?: Database["public"]["Enums"]["lyn_integration_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "integration_instances_company_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "lyn_company"
            referencedColumns: ["id"]
          },
        ]
      }
      lyn_integrations: {
        Row: {
          active: boolean | null
          company_id: string
          created_at: string | null
          id: string
          instance_id: string
          type: Database["public"]["Enums"]["lyn_integration_provider"]
        }
        Insert: {
          active?: boolean | null
          company_id: string
          created_at?: string | null
          id?: string
          instance_id: string
          type: Database["public"]["Enums"]["lyn_integration_provider"]
        }
        Update: {
          active?: boolean | null
          company_id?: string
          created_at?: string | null
          id?: string
          instance_id?: string
          type?: Database["public"]["Enums"]["lyn_integration_provider"]
        }
        Relationships: [
          {
            foreignKeyName: "integrations_company_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "lyn_company"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integrations_instance_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "lyn_integration_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      lyn_lead_notes: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          id: string
          lead_id: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          lead_id: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          lead_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_notes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "lyn_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_notes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "lyn_profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      lyn_patient_documents: {
        Row: {
          company_id: string
          description: string | null
          document_type: string
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string
          id: string
          patient_id: string
          uploaded_at: string
          uploaded_by: string | null
        }
        Insert: {
          company_id: string
          description?: string | null
          document_type?: string
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string
          id?: string
          patient_id: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Update: {
          company_id?: string
          description?: string | null
          document_type?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string
          id?: string
          patient_id?: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "lyn_company"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_documents_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "lyn_patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "lyn_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lyn_patients: {
        Row: {
          company_id: string
          cpf: string | null
          created_at: string
          created_by: string | null
          date_of_birth: string | null
          email: string | null
          full_name: string
          gender: string | null
          id: string
          notes: string | null
          phone: string | null
          professional_lead_id: string
          status: string
          updated_at: string
        }
        Insert: {
          company_id: string
          cpf?: string | null
          created_at?: string
          created_by?: string | null
          date_of_birth?: string | null
          email?: string | null
          full_name: string
          gender?: string | null
          id?: string
          notes?: string | null
          phone?: string | null
          professional_lead_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          cpf?: string | null
          created_at?: string
          created_by?: string | null
          date_of_birth?: string | null
          email?: string | null
          full_name?: string
          gender?: string | null
          id?: string
          notes?: string | null
          phone?: string | null
          professional_lead_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patients_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "lyn_company"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patients_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "lyn_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patients_professional_lead_id_fkey"
            columns: ["professional_lead_id"]
            isOneToOne: false
            referencedRelation: "lyn_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lyn_pipelines: {
        Row: {
          id: string
          company_id: string
          name: string
          description: string | null
          color: string | null
          is_default: boolean | null
          is_active: boolean | null
          position: number | null
          created_by: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          company_id: string
          name: string
          description?: string | null
          color?: string | null
          is_default?: boolean | null
          is_active?: boolean | null
          position?: number | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          company_id?: string
          name?: string
          description?: string | null
          color?: string | null
          is_default?: boolean | null
          is_active?: boolean | null
          position?: number | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pipelines_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "lyn_company"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pipelines_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "lyn_profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      lyn_pipeline_stages: {
        Row: {
          id: string
          pipeline_id: string
          company_id: string
          name: string
          color: string | null
          position: number
          is_active: boolean | null
          is_final: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          pipeline_id: string
          company_id: string
          name: string
          color?: string | null
          position?: number
          is_active?: boolean | null
          is_final?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          pipeline_id?: string
          company_id?: string
          name?: string
          color?: string | null
          position?: number
          is_active?: boolean | null
          is_final?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_stages_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "lyn_pipelines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pipeline_stages_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "lyn_company"
            referencedColumns: ["id"]
          }
        ]
      }
      lyn_leads: {
        Row: {
          ad_id: string | null
          company_id: string | null
          contact_id: string | null
          created_at: string | null
          custom_fields: Json | null
          description: string | null
          email: string | null
          email_valid: boolean | null
          empresa: string | null
          facebook_data_complete: boolean | null
          form_id: string | null
          funil: string | null
          id: string
          last_message: string | null
          last_message_at: string | null
          leadgen_id: string | null
          nome: string
          notas: string[] | null
          page_id: string | null
          pipeline_id: string | null
          prioridade: string | null
          raw_facebook_data: Json | null
          responsavel_id: string | null
          segmento: string | null
          source: string | null
          stage_id: string | null
          status: string
          tags: string[] | null
          telefone: string | null
          telefone_2?: string | null
          valor_oportunidade: number | null
        }
        Insert: {
          ad_id?: string | null
          company_id?: string | null
          contact_id?: string | null
          created_at?: string | null
          custom_fields?: Json | null
          description?: string | null
          email?: string | null
          email_valid?: boolean | null
          empresa?: string | null
          facebook_data_complete?: boolean | null
          form_id?: string | null
          funil?: string | null
          id?: string
          last_message?: string | null
          last_message_at?: string | null
          leadgen_id?: string | null
          nome: string
          notas?: string[] | null
          page_id?: string | null
          pipeline_id?: string | null
          prioridade?: string | null
          raw_facebook_data?: Json | null
          responsavel_id?: string | null
          segmento?: string | null
          source?: string | null
          stage_id?: string | null
          status: string
          tags?: string[] | null
          telefone?: string | null
          telefone_2?: string | null
          valor_oportunidade?: number | null
        }
        Update: {
          ad_id?: string | null
          company_id?: string | null
          contact_id?: string | null
          created_at?: string | null
          custom_fields?: Json | null
          description?: string | null
          email?: string | null
          email_valid?: boolean | null
          empresa?: string | null
          facebook_data_complete?: boolean | null
          form_id?: string | null
          funil?: string | null
          id?: string
          last_message?: string | null
          last_message_at?: string | null
          leadgen_id?: string | null
          nome?: string
          notas?: string[] | null
          page_id?: string | null
          pipeline_id?: string | null
          prioridade?: string | null
          raw_facebook_data?: Json | null
          responsavel_id?: string | null
          segmento?: string | null
          source?: string | null
          stage_id?: string | null
          status?: string
          tags?: string[] | null
          telefone?: string | null
          telefone_2?: string | null
          valor_oportunidade?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "lyn_company"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "lyn_pipelines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "lyn_pipeline_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "lyn_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "lyn_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      lyn_contacts: {
        Row: {
          company_id: string
          created_at: string | null
          custom_fields: Json | null
          email: string | null
          empresa: string | null
          id: string
          nome: string
          segmento: string | null
          source: string | null
          tags: string[] | null
          telefone: string | null
          telefone_2: string | null
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          custom_fields?: Json | null
          email?: string | null
          empresa?: string | null
          id?: string
          nome: string
          segmento?: string | null
          source?: string | null
          tags?: string[] | null
          telefone?: string | null
          telefone_2?: string | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          custom_fields?: Json | null
          email?: string | null
          empresa?: string | null
          id?: string
          nome?: string
          segmento?: string | null
          source?: string | null
          tags?: string[] | null
          telefone?: string | null
          telefone_2?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "lyn_company"
            referencedColumns: ["id"]
          }
        ]
      }
      lyn_messages: {
        Row: {
          body: string | null
          conversa_id: string | null
          id: string
          incoming: boolean
          media_base64: string | null
          media_type: Database["public"]["Enums"]["lyn_message_media_type"] | null
          message_id: string | null
          status: string | null
          timestamp: string | null
        }
        Insert: {
          body?: string | null
          conversa_id?: string | null
          id?: string
          incoming: boolean
          media_base64?: string | null
          media_type?: Database["public"]["Enums"]["lyn_message_media_type"] | null
          message_id?: string | null
          status?: string | null
          timestamp?: string | null
        }
        Update: {
          body?: string | null
          conversa_id?: string | null
          id?: string
          incoming?: boolean
          media_base64?: string | null
          media_type?: Database["public"]["Enums"]["lyn_message_media_type"] | null
          message_id?: string | null
          status?: string | null
          timestamp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversa_id"]
            isOneToOne: false
            referencedRelation: "lyn_conversas"
            referencedColumns: ["id"]
          },
        ]
      }
      lyn_profiles: {
        Row: {
          avatar_url: string | null
          company_id: string | null
          created_at: string | null
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          role: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          id: string
          last_name?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "lyn_company"
            referencedColumns: ["id"]
          },
        ]
      }
      lyn_quick_reply_templates: {
        Row: {
          category: string | null
          company_id: string
          content: string
          created_at: string | null
          created_by: string | null
          id: string
          shortcut: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          company_id: string
          content: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          shortcut?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          company_id?: string
          content?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          shortcut?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quick_reply_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "lyn_company"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quick_reply_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "lyn_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lyn_tags: {
        Row: {
          color: string | null
          company_id: string
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          color?: string | null
          company_id: string
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          color?: string | null
          company_id?: string
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      lyn_user_roles: {
        Row: {
          accepted_at: string | null
          company_id: string
          created_at: string | null
          invited_at: string | null
          invited_by: string | null
          role: Database["public"]["Enums"]["lyn_app_role"]
          status: string | null
          user_id: string
        }
        Insert: {
          accepted_at?: string | null
          company_id: string
          created_at?: string | null
          invited_at?: string | null
          invited_by?: string | null
          role: Database["public"]["Enums"]["lyn_app_role"]
          status?: string | null
          user_id: string
        }
        Update: {
          accepted_at?: string | null
          company_id?: string
          created_at?: string | null
          invited_at?: string | null
          invited_by?: string | null
          role?: Database["public"]["Enums"]["lyn_app_role"]
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_company_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "lyn_company"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_user_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "lyn_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lyn_webhook_debug_logs: {
        Row: {
          created_at: string
          event_type: string | null
          id: string
          instance_id: string | null
          payload: Json | null
        }
        Insert: {
          created_at?: string
          event_type?: string | null
          id?: string
          instance_id?: string | null
          payload?: Json | null
        }
        Update: {
          created_at?: string
          event_type?: string | null
          id?: string
          instance_id?: string | null
          payload?: Json | null
        }
        Relationships: []
      }
      lyn_whatsapp_chats: {
        Row: {
          contact_id: string | null
          created_at: string | null
          id: string
          instance_id: string
          last_message_at: string | null
          remote_jid: string
          status: string | null
          unread_count: number | null
        }
        Insert: {
          contact_id?: string | null
          created_at?: string | null
          id?: string
          instance_id: string
          last_message_at?: string | null
          remote_jid: string
          status?: string | null
          unread_count?: number | null
        }
        Update: {
          contact_id?: string | null
          created_at?: string | null
          id?: string
          instance_id?: string
          last_message_at?: string | null
          remote_jid?: string
          status?: string | null
          unread_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_chats_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "lyn_whatsapp_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_chats_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "lyn_whatsapp_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      lyn_whatsapp_contacts: {
        Row: {
          company_id: string
          created_at: string | null
          email: string | null
          id: string
          is_group: boolean | null
          name: string | null
          profile_pic_url: string | null
          remote_jid: string
        }
        Insert: {
          company_id: string
          created_at?: string | null
          email?: string | null
          id?: string
          is_group?: boolean | null
          name?: string | null
          profile_pic_url?: string | null
          remote_jid: string
        }
        Update: {
          company_id?: string
          created_at?: string | null
          email?: string | null
          id?: string
          is_group?: boolean | null
          name?: string | null
          profile_pic_url?: string | null
          remote_jid?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "lyn_company"
            referencedColumns: ["id"]
          },
        ]
      }
      lyn_whatsapp_instances: {
        Row: {
          company_id: string
          config: Json | null
          created_at: string | null
          evolution_instance_id: string
          evolution_token: string | null
          id: string
          name: string
          qr_code: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          company_id: string
          config?: Json | null
          created_at?: string | null
          evolution_instance_id: string
          evolution_token?: string | null
          id?: string
          name: string
          qr_code?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          config?: Json | null
          created_at?: string | null
          evolution_instance_id?: string
          evolution_token?: string | null
          id?: string
          name?: string
          qr_code?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_instances_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "lyn_company"
            referencedColumns: ["id"]
          },
        ]
      }
      lyn_whatsapp_messages: {
        Row: {
          chat_id: string
          content: string | null
          created_at: string | null
          direction: string
          evolution_message_id: string | null
          id: string
          instance_id: string
          media_type: string | null
          media_url: string | null
          sender_id: string | null
          status: string | null
        }
        Insert: {
          chat_id: string
          content?: string | null
          created_at?: string | null
          direction: string
          evolution_message_id?: string | null
          id?: string
          instance_id: string
          media_type?: string | null
          media_url?: string | null
          sender_id?: string | null
          status?: string | null
        }
        Update: {
          chat_id?: string
          content?: string | null
          created_at?: string | null
          direction?: string
          evolution_message_id?: string | null
          id?: string
          instance_id?: string
          media_type?: string | null
          media_url?: string | null
          sender_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "lyn_whatsapp_chats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "lyn_whatsapp_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "lyn_whatsapp_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_company_member: {
        Args: {
          p_email: string
          p_role?: Database["public"]["Enums"]["lyn_app_role"]
        }
        Returns: Json
      }
      current_user_company_id: { Args: never; Returns: string }
      generate_secure_token: { Args: { length?: number }; Returns: string }
      get_my_admin_company_ids: { Args: never; Returns: string[] }
      has_role:
      | {
        Args: {
          _role: Database["public"]["Enums"]["lyn_app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      | {
        Args: {
          p_company_id: string
          p_roles: Database["public"]["Enums"]["lyn_app_role"][]
        }
        Returns: boolean
      }
      | {
        Args: { p_company_id: string; p_roles: string[] }
        Returns: boolean
      }
      increment_facebook_leads_count: {
        Args: { company_uuid: string }
        Returns: undefined
      }
      regenerate_facebook_tokens: {
        Args: { company_uuid: string }
        Returns: {
          verify_token: string
          webhook_token: string
        }[]
      }
    }
    Enums: {
      lyn_agent_type: "qualificacao" | "vendas" | "suporte" | "marketing"
      lyn_app_role: "user" | "admin" | "superadmin"
      lyn_integration_provider:
      | "evolution"
      | "instagram"
      | "facebook"
      | "email"
      | "webchat"
      lyn_integration_status: "active" | "inactive" | "error"
      lyn_message_media_type:
      | "conversation"
      | "imageMessage"
      | "audioMessage"
      | "documentMessage"
      lyn_tipo_atendimento: "mensagem" | "ligacao" | "reuniao" | "outro"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
  | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
    DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
  : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
    DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
  ? R
  : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
    DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] &
    DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
  ? R
  : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
  | keyof DefaultSchema["Tables"]
  | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
  : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
    Insert: infer I
  }
  ? I
  : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
    Insert: infer I
  }
  ? I
  : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
  | keyof DefaultSchema["Tables"]
  | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
  : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
    Update: infer U
  }
  ? U
  : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
    Update: infer U
  }
  ? U
  : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
  | keyof DefaultSchema["Enums"]
  | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
  : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
  | keyof DefaultSchema["CompositeTypes"]
  | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
  : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  public: {
    Enums: {
      lyn_agent_type: ["qualificacao", "vendas", "suporte", "marketing"],
      lyn_app_role: ["user", "admin", "superadmin"],
      lyn_integration_provider: [
        "evolution",
        "instagram",
        "facebook",
        "email",
        "webchat",
      ],
      lyn_integration_status: ["active", "inactive", "error"],
      lyn_message_media_type: [
        "conversation",
        "imageMessage",
        "audioMessage",
        "documentMessage",
      ],
      lyn_tipo_atendimento: ["mensagem", "ligacao", "reuniao", "outro"],
    },
  },
} as const
