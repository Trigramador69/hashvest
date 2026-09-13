-- Milestone evidence is organization product context; HSK remains authoritative.

create table if not exists public.organization_grant_milestone_evidence (
  chain_id integer not null,
  vault_address text not null,
  milestone_index integer not null,
  evidence_url text not null,
  evidence_type text not null,
  note text,
  submitted_by_wallet text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organization_grant_milestone_evidence_primary_key
    primary key (chain_id, vault_address, milestone_index),
  constraint organization_grant_milestone_evidence_grant_fk
    foreign key (chain_id, vault_address)
    references public.organization_grants (chain_id, vault_address)
    on delete cascade,
  constraint organization_grant_milestone_evidence_chain_valid
    check (chain_id = 133),
  constraint organization_grant_milestone_evidence_vault_valid
    check (
      vault_address = lower(vault_address)
      and vault_address ~ '^0x[0-9a-f]{40}$'
    ),
  constraint organization_grant_milestone_evidence_index_valid
    check (milestone_index >= 0),
  constraint organization_grant_milestone_evidence_url_valid
    check (
      evidence_url = btrim(evidence_url)
      and char_length(evidence_url) between 1 and 2048
      and evidence_url !~ '@'
      and (
        evidence_url ~ '^https://[A-Za-z0-9]'
        or (
          evidence_type = 'ipfs'
          and evidence_url ~ '^ipfs://[A-Za-z0-9]'
        )
      )
    ),
  constraint organization_grant_milestone_evidence_type_valid
    check (
      evidence_type in (
        'github_pr',
        'github_commit',
        'deployment',
        'document',
        'hsk_transaction',
        'ipfs'
      )
    ),
  constraint organization_grant_milestone_evidence_note_valid
    check (
      note is null
      or (
        note = btrim(note)
        and char_length(note) between 1 and 1000
      )
    ),
  constraint organization_grant_milestone_evidence_submitter_valid
    check (
      submitted_by_wallet = lower(submitted_by_wallet)
      and submitted_by_wallet ~ '^0x[0-9a-f]{40}$'
    )
);

create index if not exists organization_grant_milestone_evidence_grant_idx
  on public.organization_grant_milestone_evidence(chain_id, vault_address);

alter table public.organization_grant_milestone_evidence enable row level security;

-- The server verifies session membership and grant association before using the
-- service-role client. There is intentionally no browser read/write policy.
revoke all on table public.organization_grant_milestone_evidence
  from public, anon, authenticated;
