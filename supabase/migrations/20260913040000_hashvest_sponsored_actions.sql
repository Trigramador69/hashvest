-- HAS-28 generalizes the HAS-24 first-claim prototype without mutating its
-- historical tables. New policies start disabled and require an explicit
-- vault allowlist, action allowlist, quota, daily limit, and HSK gas budget.

create or replace function public.is_valid_sponsorship_vault_allowlist(addresses text[])
returns boolean
language sql
immutable
set search_path = public
as $$
  select cardinality(addresses) between 1 and 100
    and not exists (
      select 1
      from unnest(addresses) as address
      where address <> lower(address)
         or address !~ '^0x[0-9a-f]{40}$'
    );
$$;

create table if not exists public.organization_sponsorship_policies (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  enabled boolean not null default false,
  allowed_actions text[] not null default array['claim']::text[],
  allowed_vaults text[] not null default '{}'::text[],
  max_actions integer not null default 0,
  used_actions integer not null default 0,
  max_actions_per_wallet_per_day integer not null default 1,
  max_gas_budget_wei numeric(78, 0) not null default 0,
  reserved_gas_wei numeric(78, 0) not null default 0,
  spent_gas_wei numeric(78, 0) not null default 0,
  updated_by_wallet text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organization_sponsorship_actions_valid check (
    cardinality(allowed_actions) between 1 and 2
    and allowed_actions <@ array['claim', 'review']::text[]
  ),
  constraint organization_sponsorship_vaults_valid check (
    not enabled or public.is_valid_sponsorship_vault_allowlist(allowed_vaults)
  ),
  constraint organization_sponsorship_max_actions_valid check (max_actions between 0 and 10000),
  constraint organization_sponsorship_used_actions_valid check (used_actions between 0 and max_actions),
  constraint organization_sponsorship_daily_limit_valid check (max_actions_per_wallet_per_day between 1 and 100),
  constraint organization_sponsorship_gas_budget_valid check (
    max_gas_budget_wei >= 0
    and reserved_gas_wei >= 0
    and spent_gas_wei >= 0
  ),
  constraint organization_sponsorship_wallet_valid check (
    updated_by_wallet is null
    or (
      updated_by_wallet = lower(updated_by_wallet)
      and updated_by_wallet ~ '^0x[0-9a-f]{40}$'
    )
  )
);

create table if not exists public.sponsored_action_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  chain_id integer not null,
  vault_address text not null,
  action_type text not null,
  actor_wallet text not null,
  claim_amount numeric(78, 0),
  milestone_index integer,
  nonce numeric(78, 0) not null,
  deadline numeric(78, 0) not null,
  relayer_address text not null,
  signature text not null,
  gas_limit numeric(78, 0) not null,
  gas_price numeric(78, 0) not null,
  estimated_gas_cost_wei numeric(78, 0) not null,
  actual_gas_cost_wei numeric(78, 0),
  gas_used numeric(78, 0),
  effective_gas_price numeric(78, 0),
  block_number numeric(78, 0),
  status text not null default 'requested',
  attempts integer not null default 0,
  processing_at timestamptz,
  tx_hash text,
  failure_code text,
  failure_message text,
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sponsored_actions_chain_valid check (chain_id = 133),
  constraint sponsored_actions_vault_valid check (
    vault_address = lower(vault_address)
    and vault_address ~ '^0x[0-9a-f]{40}$'
  ),
  constraint sponsored_actions_actor_valid check (
    actor_wallet = lower(actor_wallet)
    and actor_wallet ~ '^0x[0-9a-f]{40}$'
  ),
  constraint sponsored_actions_payload_valid check (
    (action_type = 'claim' and claim_amount > 0 and milestone_index is null)
    or (action_type = 'review' and claim_amount is null and milestone_index between 0 and 19)
  ),
  constraint sponsored_actions_nonce_valid check (nonce >= 0),
  constraint sponsored_actions_deadline_valid check (deadline > 0),
  constraint sponsored_actions_relayer_valid check (
    relayer_address = lower(relayer_address)
    and relayer_address ~ '^0x[0-9a-f]{40}$'
  ),
  constraint sponsored_actions_signature_valid check (signature ~ '^0x[0-9a-fA-F]{130}$'),
  constraint sponsored_actions_estimate_valid check (
    gas_limit > 0 and gas_price > 0
    and estimated_gas_cost_wei = gas_limit * gas_price
  ),
  constraint sponsored_actions_receipt_cost_valid check (
    actual_gas_cost_wei is null or actual_gas_cost_wei >= 0
  ),
  constraint sponsored_actions_status_valid check (
    status in ('requested', 'processing', 'submitted', 'confirmed', 'failed', 'abandoned')
  ),
  constraint sponsored_actions_attempts_valid check (attempts >= 0),
  constraint sponsored_actions_tx_hash_valid check (
    tx_hash is null or tx_hash ~ '^0x[0-9a-fA-F]{64}$'
  ),
  constraint sponsored_actions_failure_message_valid check (
    failure_message is null or char_length(failure_message) between 1 and 500
  )
);

create unique index if not exists sponsored_actions_vault_type_nonce_idx
  on public.sponsored_action_requests(chain_id, vault_address, action_type, nonce)
  where status <> 'abandoned';
create index if not exists sponsored_actions_organization_idx
  on public.sponsored_action_requests(organization_id, created_at desc);
create index if not exists sponsored_actions_daily_actor_idx
  on public.sponsored_action_requests(organization_id, actor_wallet, created_at desc);

create or replace function public.reserve_sponsored_action(
  p_organization_id uuid,
  p_chain_id integer,
  p_vault_address text,
  p_action_type text,
  p_actor_wallet text,
  p_claim_amount numeric,
  p_milestone_index integer,
  p_nonce numeric,
  p_deadline numeric,
  p_relayer_address text,
  p_signature text,
  p_gas_limit numeric,
  p_gas_price numeric,
  p_estimated_gas_cost_wei numeric
)
returns setof public.sponsored_action_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  existing public.sponsored_action_requests%rowtype;
  policy public.organization_sponsorship_policies%rowtype;
  daily_count integer;
begin
  select * into existing
  from public.sponsored_action_requests
  where chain_id = p_chain_id
    and vault_address = p_vault_address
    and action_type = p_action_type
    and nonce = p_nonce
    and status <> 'abandoned';

  if found then
    if existing.organization_id <> p_organization_id
      or existing.actor_wallet <> p_actor_wallet
      or existing.claim_amount is distinct from p_claim_amount
      or existing.milestone_index is distinct from p_milestone_index
      or existing.deadline <> p_deadline
      or existing.relayer_address <> p_relayer_address
      or lower(existing.signature) <> lower(p_signature) then
      raise exception using message = 'ACTION_BINDING_MISMATCH';
    end if;
    return next existing;
    return;
  end if;

  select * into policy
  from public.organization_sponsorship_policies
  where organization_id = p_organization_id
  for update;

  if not found or not policy.enabled then
    raise exception using message = 'SPONSORSHIP_DISABLED';
  end if;
  if not p_action_type = any(policy.allowed_actions) then
    raise exception using message = 'ACTION_NOT_ALLOWED';
  end if;
  if not p_vault_address = any(policy.allowed_vaults) then
    raise exception using message = 'VAULT_NOT_ALLOWED';
  end if;
  if policy.used_actions >= policy.max_actions then
    raise exception using message = 'ACTION_LIMIT_REACHED';
  end if;

  select count(*) into daily_count
  from public.sponsored_action_requests
  where organization_id = p_organization_id
    and actor_wallet = p_actor_wallet
    and created_at >= (date_trunc('day', now() at time zone 'UTC') at time zone 'UTC');
  if daily_count >= policy.max_actions_per_wallet_per_day then
    raise exception using message = 'DAILY_RATE_LIMIT_REACHED';
  end if;
  if policy.spent_gas_wei + policy.reserved_gas_wei + p_estimated_gas_cost_wei > policy.max_gas_budget_wei then
    raise exception using message = 'GAS_BUDGET_REACHED';
  end if;

  insert into public.sponsored_action_requests (
    organization_id, chain_id, vault_address, action_type, actor_wallet,
    claim_amount, milestone_index, nonce, deadline, relayer_address,
    signature, gas_limit, gas_price, estimated_gas_cost_wei
  ) values (
    p_organization_id, p_chain_id, p_vault_address, p_action_type, p_actor_wallet,
    p_claim_amount, p_milestone_index, p_nonce, p_deadline, p_relayer_address,
    p_signature, p_gas_limit, p_gas_price, p_estimated_gas_cost_wei
  ) returning * into existing;

  update public.organization_sponsorship_policies
  set used_actions = used_actions + 1,
      reserved_gas_wei = reserved_gas_wei + p_estimated_gas_cost_wei,
      updated_at = now()
  where organization_id = p_organization_id;

  return next existing;
  return;
exception
  when unique_violation then
    select * into existing
    from public.sponsored_action_requests
    where chain_id = p_chain_id
      and vault_address = p_vault_address
      and action_type = p_action_type
      and nonce = p_nonce
      and status <> 'abandoned';
    if found
      and existing.organization_id = p_organization_id
      and existing.actor_wallet = p_actor_wallet
      and existing.claim_amount is not distinct from p_claim_amount
      and existing.milestone_index is not distinct from p_milestone_index
      and existing.deadline = p_deadline
      and existing.relayer_address = p_relayer_address
      and lower(existing.signature) = lower(p_signature) then
      return next existing;
      return;
    end if;
    raise exception using message = 'ACTION_BINDING_MISMATCH';
end;
$$;

create or replace function public.lease_sponsored_action(p_request_id uuid)
returns setof public.sponsored_action_requests
language sql
security definer
set search_path = public
as $$
  update public.sponsored_action_requests
  set status = 'processing', attempts = attempts + 1,
      processing_at = now(), failure_code = null, failure_message = null,
      updated_at = now()
  where id = p_request_id
    and deadline > extract(epoch from now())
    and tx_hash is null
    and (
      status = 'requested'
      or status = 'failed'
      or (
        status = 'processing'
        and processing_at is not null
        and processing_at < now() - interval '2 minutes'
      )
    )
  returning *;
$$;

create or replace function public.settle_sponsored_action(
  p_request_id uuid,
  p_status text,
  p_gas_used numeric,
  p_effective_gas_price numeric,
  p_actual_gas_cost_wei numeric,
  p_block_number numeric,
  p_failure_code text,
  p_failure_message text
)
returns setof public.sponsored_action_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  request public.sponsored_action_requests%rowtype;
begin
  if p_status not in ('confirmed', 'failed') then
    raise exception using message = 'INVALID_TERMINAL_STATUS';
  end if;
  select * into request from public.sponsored_action_requests
  where id = p_request_id for update;
  if not found then return; end if;
  if request.status in ('confirmed', 'abandoned') or (request.status = 'failed' and request.tx_hash is not null) then
    return next request;
    return;
  end if;
  if request.status <> 'submitted' or request.tx_hash is null then
    raise exception using message = 'ACTION_NOT_SUBMITTED';
  end if;
  update public.organization_sponsorship_policies
  set reserved_gas_wei = greatest(0, reserved_gas_wei - request.estimated_gas_cost_wei),
      spent_gas_wei = spent_gas_wei + p_actual_gas_cost_wei,
      updated_at = now()
  where organization_id = request.organization_id;
  update public.sponsored_action_requests
  set status = p_status, gas_used = p_gas_used,
      effective_gas_price = p_effective_gas_price,
      actual_gas_cost_wei = p_actual_gas_cost_wei,
      block_number = p_block_number,
      failure_code = p_failure_code,
      failure_message = p_failure_message,
      confirmed_at = now(), updated_at = now()
  where id = p_request_id returning * into request;
  return next request;
end;
$$;

create or replace function public.expire_sponsored_actions(p_organization_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  released numeric(78, 0);
  expired_count integer;
begin
  with expired as (
    update public.sponsored_action_requests
    set status = 'abandoned', failure_code = 'intent_expired',
        failure_message = 'The signed intent expired before broadcast.', updated_at = now()
    where organization_id = p_organization_id
      and tx_hash is null
      and status in ('requested', 'processing', 'failed')
      and deadline <= extract(epoch from now())
    returning estimated_gas_cost_wei
  )
  select coalesce(sum(estimated_gas_cost_wei), 0), count(*)
  into released, expired_count from expired;
  if expired_count > 0 then
    update public.organization_sponsorship_policies
    set reserved_gas_wei = greatest(0, reserved_gas_wei - released),
        used_actions = greatest(0, used_actions - expired_count),
        updated_at = now()
    where organization_id = p_organization_id;
  end if;
  return expired_count;
end;
$$;

alter table public.organization_sponsorship_policies enable row level security;
alter table public.sponsored_action_requests enable row level security;

revoke all on function public.is_valid_sponsorship_vault_allowlist(text[]) from public, anon, authenticated;
revoke all on table public.organization_sponsorship_policies from public, anon, authenticated;
revoke all on table public.sponsored_action_requests from public, anon, authenticated;
revoke all on function public.reserve_sponsored_action(
  uuid, integer, text, text, text, numeric, integer, numeric, numeric, text, text, numeric, numeric, numeric
) from public, anon, authenticated;
revoke all on function public.lease_sponsored_action(uuid) from public, anon, authenticated;
revoke all on function public.settle_sponsored_action(
  uuid, text, numeric, numeric, numeric, numeric, text, text
) from public, anon, authenticated;
revoke all on function public.expire_sponsored_actions(uuid) from public, anon, authenticated;

grant execute on function public.reserve_sponsored_action(
  uuid, integer, text, text, text, numeric, integer, numeric, numeric, text, text, numeric, numeric, numeric
) to service_role;
grant execute on function public.lease_sponsored_action(uuid) to service_role;
grant execute on function public.settle_sponsored_action(
  uuid, text, numeric, numeric, numeric, numeric, text, text
) to service_role;
grant execute on function public.expire_sponsored_actions(uuid) to service_role;
