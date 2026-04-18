-- Create API keys table for company authentication
create table public.api_keys (
  id uuid not null default gen_random_uuid(),
  company_id uuid not null references public.company(id) on delete cascade,
  key text not null unique,
  name text,
  last_used_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  revoked_at timestamp with time zone,
  constraint api_keys_pkey primary key (id),
  constraint api_keys_company_fkey foreign key (company_id) references public.company(id)
);

-- Index for faster token lookups
create index api_keys_key_idx on public.api_keys(key) where revoked_at is null;
create index api_keys_company_id_idx on public.api_keys(company_id);

-- Enable RLS
alter table public.api_keys enable row level security;

-- RLS Policy: Users can manage their company's API keys
create policy "Users can view their company API keys"
  on public.api_keys for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.company_id = api_keys.company_id
    )
  );

create policy "Users can create API keys for their company"
  on public.api_keys for insert
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.company_id = api_keys.company_id
    )
  );

create policy "Users can revoke their company API keys"
  on public.api_keys for update
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.company_id = api_keys.company_id
    )
  );
