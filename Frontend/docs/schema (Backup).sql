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
CREATE TABLE public.company (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  funis ARRAY DEFAULT ARRAY['whatsapp'::text],
  status_type ARRAY DEFAULT ARRAY['Novos'::text, 'Qualificação'::text, 'Objeção'::text, 'Negociação'::text, 'Agendamento'::text],
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT company_pkey PRIMARY KEY (id)
);
CREATE TABLE public.conversas (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  lead_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT conversas_pkey PRIMARY KEY (id),
  CONSTRAINT conversas_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id)
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
  notas text,
  funil text,
  created_at timestamp with time zone DEFAULT now(),
  company_id uuid,
  valor_oportunidade numeric DEFAULT 0,
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