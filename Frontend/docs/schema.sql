-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.agenda (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  lead_id uuid,
  descricao text,
  created_at timestamp without time zone DEFAULT now(),
  data_inicio timestamp without time zone,
  data_fim timestamp without time zone,
  CONSTRAINT agenda_pkey PRIMARY KEY (id),
  CONSTRAINT agenda_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT agenda_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id)
);
CREATE TABLE public.agent_prompts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL,
  company_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  system_prompt text NOT NULL,
  user_prompt_template text,
  version integer NOT NULL DEFAULT 1,
  active boolean DEFAULT true,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT agent_prompts_pkey PRIMARY KEY (id),
  CONSTRAINT agent_prompts_agent_fkey FOREIGN KEY (agent_id) REFERENCES public.agents(id),
  CONSTRAINT agent_prompts_company_fkey FOREIGN KEY (company_id) REFERENCES public.company(id),
  CONSTRAINT agent_prompts_creator_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id)
);
CREATE TABLE public.agents (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  name text NOT NULL,
  type USER-DEFINED NOT NULL,
  system_prompt text,
  active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT agents_pkey PRIMARY KEY (id),
  CONSTRAINT agents_company_fkey FOREIGN KEY (company_id) REFERENCES public.company(id)
);
CREATE TABLE public.company (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  funis ARRAY DEFAULT ARRAY['whatsapp'::text],
  status_type ARRAY DEFAULT ARRAY['Novos'::text, 'Qualificação'::text, 'Objeção'::text, 'Negociação'::text, 'Agendamento'::text],
  created_at timestamp with time zone DEFAULT now(),
  evolution_url text,
  evolution_apikey text,
  CONSTRAINT company_pkey PRIMARY KEY (id)
);
CREATE TABLE public.conversas (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  lead_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  status text NOT NULL DEFAULT 'novo'::text CHECK (status = ANY (ARRAY['novo'::text, 'em_andamento'::text, 'nao_respondida'::text, 'finalizados'::text])),
  integration_instance_id uuid,
  agent_id uuid,
  CONSTRAINT conversas_pkey PRIMARY KEY (id),
  CONSTRAINT conversas_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id),
  CONSTRAINT conversas_instance_fkey FOREIGN KEY (integration_instance_id) REFERENCES public.integration_instances(id),
  CONSTRAINT conversas_agent_fkey FOREIGN KEY (agent_id) REFERENCES public.agents(id)
);
CREATE TABLE public.historico_atendimentos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL,
  user_id uuid NOT NULL,
  tipo USER-DEFINED NOT NULL,
  descricao text,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT historico_atendimentos_pkey PRIMARY KEY (id),
  CONSTRAINT historico_atendimentos_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id),
  CONSTRAINT historico_atendimentos_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.insights (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  conteudo text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT insights_pkey PRIMARY KEY (id),
  CONSTRAINT insights_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.company(id)
);
CREATE TABLE public.integration_instances (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  provider USER-DEFINED NOT NULL,
  name text NOT NULL,
  external_instance_id text NOT NULL,
  status USER-DEFINED DEFAULT 'active'::integration_status,
  config jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT integration_instances_pkey PRIMARY KEY (id),
  CONSTRAINT integration_instances_company_fkey FOREIGN KEY (company_id) REFERENCES public.company(id)
);
CREATE TABLE public.integrations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  type USER-DEFINED NOT NULL,
  instance_id uuid NOT NULL,
  active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT integrations_pkey PRIMARY KEY (id),
  CONSTRAINT integrations_company_fkey FOREIGN KEY (company_id) REFERENCES public.company(id),
  CONSTRAINT integrations_instance_fkey FOREIGN KEY (instance_id) REFERENCES public.integration_instances(id)
);
CREATE TABLE public.leads (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  responsavel_id uuid,
  nome text NOT NULL,
  email text,
  telefone text,
  empresa text,
  status text NOT NULL,
  segmento text,
  prioridade text,
  funil text,
  created_at timestamp with time zone DEFAULT now(),
  company_id uuid,
  valor_oportunidade numeric DEFAULT 0,
  notas ARRAY DEFAULT '{}'::text[],
  CONSTRAINT leads_pkey PRIMARY KEY (id),
  CONSTRAINT leads_responsavel_id_fkey FOREIGN KEY (responsavel_id) REFERENCES public.profiles(id),
  CONSTRAINT leads_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.company(id)
);
CREATE TABLE public.messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  conversa_id uuid,
  incoming boolean NOT NULL,
  body text,
  media_base64 text,
  media_type USER-DEFINED DEFAULT 'conversation'::message_media_type,
  message_id text,
  status text DEFAULT 'enviada'::text,
  timestamp timestamp with time zone DEFAULT now(),
  CONSTRAINT messages_pkey PRIMARY KEY (id),
  CONSTRAINT messages_conversation_id_fkey FOREIGN KEY (conversa_id) REFERENCES public.conversas(id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  first_name text,
  created_at timestamp with time zone DEFAULT now(),
  last_name text,
  avatar_url text,
  updated_at timestamp with time zone DEFAULT now(),
  role text DEFAULT 'user'::text,
  company_id uuid,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id),
  CONSTRAINT profiles_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.company(id)
);
CREATE TABLE public.user_roles (
  user_id uuid NOT NULL,
  company_id uuid NOT NULL,
  role USER-DEFINED NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_roles_pkey PRIMARY KEY (user_id, company_id),
  CONSTRAINT user_roles_user_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT user_roles_company_fkey FOREIGN KEY (company_id) REFERENCES public.company(id)
);
