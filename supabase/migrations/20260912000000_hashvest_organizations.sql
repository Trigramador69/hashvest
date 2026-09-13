-- HashVest product context. Financial and permission truth remains on HSK.

create extension if not exists pgcrypto;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by_wallet text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organizations_name_valid check (
    name = btrim(name) and char_length(name) between 1 and 120
  ),
  constraint organizations_creator_wallet_valid check (
    created_by_wallet = lower(created_by_wallet)
    and created_by_wallet ~ '^0x[0-9a-f]{40}$'
  )
);

create table if not exists public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  wallet_address text not null,
  display_name text not null,
  role_label text,
  is_owner boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organization_members_wallet_valid check (
    wallet_address = lower(wallet_address)
    and wallet_address ~ '^0x[0-9a-f]{40}$'
  ),
  constraint organization_members_display_name_valid check (
    display_name = btrim(display_name)
    and char_length(display_name) between 1 and 100
  ),
  constraint organization_members_role_label_valid check (
    role_label is null
    or (
      role_label = btrim(role_label)
      and char_length(role_label) between 1 and 100
    )
  ),
  constraint organization_members_unique_wallet unique (organization_id, wallet_address)
);

comment on column public.organization_members.role_label is
  'Presentation metadata only; it has no onchain authority.';

create table if not exists public.organization_grants (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  chain_id integer not null,
  vault_address text not null,
  description text,
  template_key text,
  created_by_wallet text not null,
  created_at timestamptz not null default now(),
  constraint organization_grants_primary_key primary key (chain_id, vault_address),
  constraint organization_grants_chain_valid check (chain_id = 133),
  constraint organization_grants_vault_valid check (
    vault_address = lower(vault_address)
    and vault_address ~ '^0x[0-9a-f]{40}$'
  ),
  constraint organization_grants_creator_wallet_valid check (
    created_by_wallet = lower(created_by_wallet)
    and created_by_wallet ~ '^0x[0-9a-f]{40}$'
  ),
  constraint organization_grants_description_valid check (
    description is null
    or (
      description = btrim(description)
      and char_length(description) between 1 and 1000
    )
  ),
  constraint organization_grants_template_key_valid check (
    template_key is null
    or (
      template_key = btrim(template_key)
      and char_length(template_key) between 1 and 80
    )
  )
);

-- One-time SIWE challenges are server-only state. They are not organization data
-- and are never exposed to the browser after the challenge is issued.
create table if not exists public.auth_nonces (
  nonce text primary key,
  wallet_address text not null,
  domain text not null,
  uri text not null,
  chain_id integer not null default 133,
  message text not null,
  issued_at timestamptz not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  constraint auth_nonces_wallet_valid check (
    wallet_address = lower(wallet_address)
    and wallet_address ~ '^0x[0-9a-f]{40}$'
  ),
  constraint auth_nonces_chain_valid check (chain_id = 133),
  constraint auth_nonces_expiration_valid check (expires_at > issued_at)
);

create index if not exists organization_members_wallet_address_idx
  on public.organization_members(wallet_address);
create index if not exists organization_members_organization_id_idx
  on public.organization_members(organization_id);
create index if not exists organization_grants_organization_id_idx
  on public.organization_grants(organization_id);
create index if not exists auth_nonces_expires_at_idx
  on public.auth_nonces(expires_at);

-- The primary key on (chain_id, vault_address) is the canonical grant identity.

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.organization_grants enable row level security;
alter table public.auth_nonces enable row level security;

-- Product authorization is performed by authenticated server Route Handlers
-- using the Supabase service role. There are intentionally no anon or
-- authenticated policies and no direct browser write boundary.
revoke all on table public.organizations from public, anon, authenticated;
revoke all on table public.organization_members from public, anon, authenticated;
revoke all on table public.organization_grants from public, anon, authenticated;
revoke all on table public.auth_nonces from public, anon, authenticated;
