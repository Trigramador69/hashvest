-- Read/unread marks for organization lifecycle notifications.
--
-- The notifications themselves are never stored. They are derived from live
-- GrantVault state and identified by the state fact they report, so the chain
-- stays authoritative and a stored row can never contradict it. The only thing
-- that is not derivable from the chain is whether a given member has already
-- seen a given fact, which is what this table holds.
--
-- A row is therefore product context, never authority: deleting every row here
-- changes what a member has seen and nothing else.

create table if not exists public.organization_notification_reads (
  organization_id uuid not null,
  member_wallet text not null,
  notification_key text not null,
  chain_id integer not null,
  vault_address text not null,
  read_at timestamptz not null default now(),
  constraint organization_notification_reads_primary_key
    primary key (organization_id, member_wallet, notification_key),
  constraint organization_notification_reads_organization_fk
    foreign key (organization_id)
    references public.organizations (id)
    on delete cascade,
  constraint organization_notification_reads_grant_fk
    foreign key (chain_id, vault_address)
    references public.organization_grants (chain_id, vault_address)
    on delete cascade,
  constraint organization_notification_reads_chain_valid
    check (chain_id = 133),
  constraint organization_notification_reads_member_valid
    check (
      member_wallet = lower(member_wallet)
      and member_wallet ~ '^0x[0-9a-f]{40}$'
    ),
  constraint organization_notification_reads_vault_valid
    check (
      vault_address = lower(vault_address)
      and vault_address ~ '^0x[0-9a-f]{40}$'
    ),
  -- The key is derived, so it is bounded in shape as well as in count: the
  -- vault address, a kind, and at most one discriminator.
  constraint organization_notification_reads_key_valid
    check (
      notification_key = btrim(notification_key)
      and char_length(notification_key) between 1 and 200
      and notification_key like vault_address || ':%'
    )
);

create index if not exists organization_notification_reads_member_idx
  on public.organization_notification_reads(organization_id, member_wallet, read_at);

alter table public.organization_notification_reads enable row level security;

-- The server verifies session membership before using the service-role client,
-- and scopes every read and write to the caller's own wallet. There is
-- intentionally no browser read/write policy.
revoke all on table public.organization_notification_reads
  from public, anon, authenticated;
