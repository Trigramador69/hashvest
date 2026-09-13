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

-- Sponsorship is an opt-in organization policy, never an onchain permission.
-- The used counter is reserved transactionally before a relayer broadcast.
create table if not exists public.sponsored_claim_policies (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  enabled boolean not null default false,
  max_claims integer not null default 0,
  used_claims integer not null default 0,
  updated_by_wallet text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sponsored_claim_policies_max_valid check (max_claims between 0 and 10000),
  constraint sponsored_claim_policies_used_valid check (used_claims between 0 and max_claims),
  constraint sponsored_claim_policies_wallet_valid check (
    updated_by_wallet is null
    or (
      updated_by_wallet = lower(updated_by_wallet)
      and updated_by_wallet ~ '^0x[0-9a-f]{40}$'
    )
  )
);

create table if not exists public.sponsored_claim_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  chain_id integer not null,
  vault_address text not null,
  beneficiary_wallet text not null,
  amount numeric(78, 0) not null,
  nonce numeric(78, 0) not null,
  deadline numeric(78, 0) not null,
  relayer_address text not null,
  signature text not null,
  status text not null default 'requested',
  attempts integer not null default 0,
  processing_at timestamptz,
  tx_hash text,
  failure_code text,
  failure_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sponsored_claim_requests_chain_valid check (chain_id = 133),
  constraint sponsored_claim_requests_vault_valid check (
    vault_address = lower(vault_address)
    and vault_address ~ '^0x[0-9a-f]{40}$'
  ),
  constraint sponsored_claim_requests_beneficiary_valid check (
    beneficiary_wallet = lower(beneficiary_wallet)
    and beneficiary_wallet ~ '^0x[0-9a-f]{40}$'
  ),
  constraint sponsored_claim_requests_amount_valid check (amount > 0),
  constraint sponsored_claim_requests_nonce_valid check (nonce >= 0),
  constraint sponsored_claim_requests_deadline_valid check (deadline > 0),
  constraint sponsored_claim_requests_relayer_valid check (
    relayer_address = lower(relayer_address)
    and relayer_address ~ '^0x[0-9a-f]{40}$'
  ),
  constraint sponsored_claim_requests_signature_valid check (
    signature ~ '^0x[0-9a-fA-F]{130}$'
  ),
  constraint sponsored_claim_requests_status_valid check (
    status in ('requested', 'processing', 'submitted', 'confirmed', 'failed')
  ),
  constraint sponsored_claim_requests_attempts_valid check (attempts >= 0),
  constraint sponsored_claim_requests_tx_hash_valid check (
    tx_hash is null or tx_hash ~ '^0x[0-9a-fA-F]{64}$'
  ),
  constraint sponsored_claim_requests_failure_message_valid check (
    failure_message is null or char_length(failure_message) between 1 and 500
  )
);

create unique index if not exists sponsored_claim_requests_vault_nonce_idx
  on public.sponsored_claim_requests(chain_id, vault_address, nonce);
create index if not exists sponsored_claim_requests_organization_idx
  on public.sponsored_claim_requests(organization_id, created_at desc);

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

-- Reserve one organization sponsorship slot and make retries idempotent by the
-- immutable (chain, vault, nonce) identity. This function is callable only by
-- the server service role; it does not trust browser authorization.
create or replace function public.reserve_sponsored_claim(
  p_organization_id uuid,
  p_chain_id integer,
  p_vault_address text,
  p_beneficiary_wallet text,
  p_amount numeric,
  p_nonce numeric,
  p_deadline numeric,
  p_relayer_address text,
  p_signature text
)
returns setof public.sponsored_claim_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  existing public.sponsored_claim_requests%rowtype;
  policy public.sponsored_claim_policies%rowtype;
begin
  select * into existing
  from public.sponsored_claim_requests
  where chain_id = p_chain_id
    and vault_address = p_vault_address
    and nonce = p_nonce;

  if found then
    if existing.organization_id <> p_organization_id
      or existing.beneficiary_wallet <> p_beneficiary_wallet
      or existing.amount <> p_amount
      or existing.deadline <> p_deadline
      or existing.relayer_address <> p_relayer_address
      or lower(existing.signature) <> lower(p_signature) then
      raise exception using message = 'CLAIM_BINDING_MISMATCH';
    end if;
    return next existing;
    return;
  end if;

  select * into policy
  from public.sponsored_claim_policies
  where organization_id = p_organization_id
  for update;

  if not found or not policy.enabled then
    raise exception using message = 'SPONSORSHIP_DISABLED';
  end if;
  if policy.used_claims >= policy.max_claims then
    raise exception using message = 'SPONSORSHIP_LIMIT_REACHED';
  end if;

  insert into public.sponsored_claim_requests (
    organization_id,
    chain_id,
    vault_address,
    beneficiary_wallet,
    amount,
    nonce,
    deadline,
    relayer_address,
    signature
  ) values (
    p_organization_id,
    p_chain_id,
    p_vault_address,
    p_beneficiary_wallet,
    p_amount,
    p_nonce,
    p_deadline,
    p_relayer_address,
    p_signature
  )
  returning * into existing;

  update public.sponsored_claim_policies
  set used_claims = used_claims + 1,
      updated_at = now()
  where organization_id = p_organization_id;

  return next existing;
  return;
exception
  when unique_violation then
    -- A concurrent retry may have won the unique vault/nonce race. Return the
    -- committed request only when every signed binding is identical.
    select * into existing
    from public.sponsored_claim_requests
    where chain_id = p_chain_id
      and vault_address = p_vault_address
      and nonce = p_nonce;
    if found
      and existing.organization_id = p_organization_id
      and existing.beneficiary_wallet = p_beneficiary_wallet
      and existing.amount = p_amount
      and existing.deadline = p_deadline
      and existing.relayer_address = p_relayer_address
      and lower(existing.signature) = lower(p_signature) then
      return next existing;
      return;
    end if;
    raise exception using message = 'CLAIM_BINDING_MISMATCH';
end;
$$;

-- Claim the processing lease once. Duplicate HTTP retries observe the existing
-- processing/submitted state and do not broadcast a second transaction.
create or replace function public.claim_sponsored_request(p_request_id uuid)
returns setof public.sponsored_claim_requests
language sql
security definer
set search_path = public
as $$
  update public.sponsored_claim_requests
  set status = 'processing',
      attempts = attempts + 1,
      processing_at = now(),
      updated_at = now()
  where id = p_request_id
    and (
      status = 'requested'
      or (status = 'failed' and tx_hash is null)
    )
  returning *;
$$;

-- The primary key on (chain_id, vault_address) is the canonical grant identity.

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.organization_grants enable row level security;
alter table public.auth_nonces enable row level security;
alter table public.sponsored_claim_policies enable row level security;
alter table public.sponsored_claim_requests enable row level security;

-- Product authorization is performed by authenticated server Route Handlers
-- using the Supabase service role. There are intentionally no anon or
-- authenticated policies and no direct browser write boundary.
revoke all on table public.organizations from public, anon, authenticated;
revoke all on table public.organization_members from public, anon, authenticated;
revoke all on table public.organization_grants from public, anon, authenticated;
revoke all on table public.auth_nonces from public, anon, authenticated;
revoke all on table public.sponsored_claim_policies from public, anon, authenticated;
revoke all on table public.sponsored_claim_requests from public, anon, authenticated;
revoke all on function public.reserve_sponsored_claim(
  uuid, integer, text, text, numeric, numeric, numeric, text, text
) from public, anon, authenticated;
revoke all on function public.claim_sponsored_request(uuid) from public, anon, authenticated;
grant execute on function public.reserve_sponsored_claim(
  uuid, integer, text, text, numeric, numeric, numeric, text, text
) to service_role;
grant execute on function public.claim_sponsored_request(uuid) to service_role;
