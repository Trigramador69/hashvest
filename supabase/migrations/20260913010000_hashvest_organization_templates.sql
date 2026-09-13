-- Organization-owned grant templates (HAS-12). Design: docs/organization-templates.md
--
-- A template is draft configuration metadata that prefills the grant wizard.
-- It is never a transaction, a permission, or a copy of vault state: it stores
-- no beneficiary, token, vault address, funded allocation, or any amount a
-- GrantVault computes. HSK remains authoritative for value and permission.

-- The reviewer default below references a member of the same organization
-- through a composite key, which needs (organization_id, id) to be unique.
-- id is already the primary key, so existing rows always satisfy this.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'organization_members_organization_id_id_key'
  ) then
    alter table public.organization_members
      add constraint organization_members_organization_id_id_key
      unique (organization_id, id);
  end if;
end
$$;

create table if not exists public.organization_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  version integer not null default 1,
  name text not null,
  description text,
  strategy smallint not null,
  schedule_unit_seconds integer,
  cliff_units integer,
  duration_units integer,
  milestones jsonb,
  allocation_suggestion text,
  default_reviewer_member_id uuid,
  created_by_wallet text not null,
  updated_by_wallet text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,

  constraint organization_templates_version_valid check (version >= 1),
  constraint organization_templates_name_valid check (
    name = btrim(name) and char_length(name) between 1 and 80
  ),
  constraint organization_templates_description_valid check (
    description is null
    or (
      description = btrim(description)
      and char_length(description) between 1 and 1000
    )
  ),

  -- Mirrors UnlockStrategy in packages/contracts/src/GrantTypes.sol.
  constraint organization_templates_strategy_valid check (strategy in (0, 1, 2)),

  -- A schedule is all three values or none of them.
  constraint organization_templates_schedule_shape check (
    num_nulls(schedule_unit_seconds, cliff_units, duration_units) in (0, 3)
  ),
  -- MILESTONE (1) has no schedule; TIME (0) and HYBRID (2) require one.
  constraint organization_templates_schedule_strategy check (
    (strategy = 1) = (duration_units is null)
  ),
  -- The wizard's schedule unit select, in seconds: minutes, hours, days.
  constraint organization_templates_schedule_unit_valid check (
    schedule_unit_seconds is null
    or schedule_unit_seconds in (60, 3600, 86400)
  ),
  constraint organization_templates_duration_valid check (
    duration_units is null or duration_units > 0
  ),
  constraint organization_templates_cliff_valid check (
    cliff_units is null
    or (cliff_units >= 0 and cliff_units <= duration_units)
  ),

  -- TIME (0) has no milestones; MILESTONE (1) and HYBRID (2) require them.
  constraint organization_templates_milestones_strategy check (
    (strategy = 0) = (milestones is null)
  ),
  -- CASE, not AND: evaluation order inside AND is not guaranteed, and
  -- jsonb_array_length raises on a non-array. Titles and percentages are
  -- validated by the server before any write (see the design document).
  constraint organization_templates_milestones_shape check (
    case
      when milestones is null then true
      when jsonb_typeof(milestones) <> 'array' then false
      else jsonb_array_length(milestones) between 1 and 20
    end
  ),

  -- A positive decimal token amount, at most a uint256 worth of digits.
  constraint organization_templates_allocation_suggestion_valid check (
    allocation_suggestion is null
    or (
      char_length(allocation_suggestion) <= 78
      and allocation_suggestion ~ '^[0-9]+(\.[0-9]+)?$'
      and allocation_suggestion !~ '^0+(\.0+)?$'
    )
  ),

  -- TIME (0) vaults record the zero address as reviewer; suggesting one would lie.
  constraint organization_templates_time_has_no_reviewer check (
    strategy <> 0 or default_reviewer_member_id is null
  ),
  -- The reviewer default must be a member of this same organization. Removing
  -- that member clears only the default, never organization_id.
  constraint organization_templates_default_reviewer_fk
    foreign key (organization_id, default_reviewer_member_id)
    references public.organization_members (organization_id, id)
    on delete set null (default_reviewer_member_id),

  constraint organization_templates_created_by_wallet_valid check (
    created_by_wallet = lower(created_by_wallet)
    and created_by_wallet ~ '^0x[0-9a-f]{40}$'
  ),
  constraint organization_templates_updated_by_wallet_valid check (
    updated_by_wallet = lower(updated_by_wallet)
    and updated_by_wallet ~ '^0x[0-9a-f]{40}$'
  )
);

comment on table public.organization_templates is
  'Draft grant configuration metadata. Never a transaction, a permission, or vault state.';
comment on column public.organization_templates.milestones is
  'Milestone titles and percentages of the allocation; never token amounts.';
comment on column public.organization_templates.allocation_suggestion is
  'Editable default for the wizard; never read from or reconciled with a vault.';
comment on column public.organization_templates.default_reviewer_member_id is
  'Presentation default only. The onchain reviewer is whatever address is submitted.';
comment on column public.organization_templates.archived_at is
  'Soft delete. Archived templates stay resolvable for grant provenance.';

-- Active names are unique per organization; archiving frees the name.
create unique index if not exists organization_templates_active_name_key
  on public.organization_templates (organization_id, lower(name))
  where archived_at is null;

-- Same posture as every other product table: the service role is used only
-- from authenticated server functions, and the browser gets nothing.
alter table public.organization_templates enable row level security;
revoke all on table public.organization_templates from public, anon, authenticated;
