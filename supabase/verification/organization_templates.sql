-- Behavioral verification for 20260913010000_hashvest_organization_templates.sql.
--
-- Run against a disposable database after all tracked migrations, for example:
--
--   docker run -d --rm --name hv-pg -e POSTGRES_PASSWORD=postgres postgres:15-alpine
--   docker exec -i hv-pg psql -U postgres -v ON_ERROR_STOP=1 \
--     -c "create role anon nologin; create role authenticated nologin;"
--   for f in supabase/migrations/*.sql supabase/verification/organization_templates.sql; do
--     docker exec -i hv-pg psql -U postgres -v ON_ERROR_STOP=1 < "$f"
--   done
--   docker stop hv-pg
--
-- Never run this against a real project: it writes and deletes rows.
-- Every assertion raises on failure; silence means every rule held.

begin;

create function pg_temp.expect_error(statement text, expected_state text)
returns void
language plpgsql
as $$
begin
  begin
    execute statement;
  exception when others then
    if sqlstate <> expected_state then
      raise exception 'expected SQLSTATE % but got % (%) for: %',
        expected_state, sqlstate, sqlerrm, statement;
    end if;
    return;
  end;
  raise exception 'expected SQLSTATE % but it succeeded: %',
    expected_state, statement;
end
$$;

create function pg_temp.template(
  strategy text,
  schedule text,
  milestones text,
  reviewer text default 'null',
  allocation text default 'null',
  name text default '''Template'''
)
returns text
language sql
as $$
  select format(
    'insert into public.organization_templates (organization_id, name, strategy,
       schedule_unit_seconds, cliff_units, duration_units, milestones,
       allocation_suggestion, default_reviewer_member_id,
       created_by_wallet, updated_by_wallet)
     values (''00000000-0000-4000-8000-00000000000a'', %s, %s, %s, %s, %s, %s,
       ''0x000000000000000000000000000000000000000a'',
       ''0x000000000000000000000000000000000000000a'')',
    name, strategy, schedule, milestones, allocation, reviewer
  )
$$;

-- Fixtures: two organizations, each with an owner and a reviewer member.
insert into public.organizations (id, name, created_by_wallet) values
  ('00000000-0000-4000-8000-00000000000a', 'Org A', '0x000000000000000000000000000000000000000a'),
  ('00000000-0000-4000-8000-00000000000b', 'Org B', '0x000000000000000000000000000000000000000b');

insert into public.organization_members (id, organization_id, wallet_address, display_name, is_owner) values
  ('00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-00000000000a', '0x000000000000000000000000000000000000000a', 'Owner A', true),
  ('00000000-0000-4000-8000-0000000000a2', '00000000-0000-4000-8000-00000000000a', '0x00000000000000000000000000000000000000a2', 'Reviewer A', false),
  ('00000000-0000-4000-8000-0000000000b2', '00000000-0000-4000-8000-00000000000b', '0x00000000000000000000000000000000000000b2', 'Reviewer B', false);

-- 1. One valid template per strategy.
do $$ begin execute pg_temp.template('0', '60, 1, 4', 'null', name => '''Time'''); end $$;
do $$ begin execute pg_temp.template('1', 'null, null, null', '''[{"title":"Ship","percentOfAllocation":100}]''', reviewer => '''00000000-0000-4000-8000-0000000000a2''', name => '''Milestone'''); end $$;
do $$ begin execute pg_temp.template('2', '86400, 30, 365', '''[{"title":"A","percentOfAllocation":40},{"title":"B","percentOfAllocation":60}]''', reviewer => '''00000000-0000-4000-8000-0000000000a2''', allocation => '''5000.50''', name => '''Hybrid'''); end $$;

do $$ begin
  if (select count(*) from public.organization_templates) <> 3 then
    raise exception 'expected three valid templates';
  end if;
end $$;

-- 2. Strategy, schedule, milestone, allocation, and reviewer rules (check_violation).
select pg_temp.expect_error(pg_temp.template('3', '60, 1, 4', 'null', name => '''S3'''), '23514');
select pg_temp.expect_error(pg_temp.template('1', '60, 1, 4', '''[{"title":"x","percentOfAllocation":100}]''', name => '''MilestoneWithSchedule'''), '23514');
select pg_temp.expect_error(pg_temp.template('0', 'null, null, null', 'null', name => '''TimeWithoutSchedule'''), '23514');
select pg_temp.expect_error(pg_temp.template('0', 'null, 1, 4', 'null', name => '''PartialSchedule'''), '23514');
select pg_temp.expect_error(pg_temp.template('0', '120, 1, 4', 'null', name => '''BadUnit'''), '23514');
select pg_temp.expect_error(pg_temp.template('0', '60, 0, 0', 'null', name => '''ZeroDuration'''), '23514');
select pg_temp.expect_error(pg_temp.template('0', '60, 5, 4', 'null', name => '''CliffTooLong'''), '23514');
select pg_temp.expect_error(pg_temp.template('0', '60, -1, 4', 'null', name => '''NegativeCliff'''), '23514');
select pg_temp.expect_error(pg_temp.template('0', '60, 1, 4', '''[{"title":"x","percentOfAllocation":100}]''', name => '''TimeWithMilestones'''), '23514');
select pg_temp.expect_error(pg_temp.template('1', 'null, null, null', 'null', name => '''MilestoneWithoutMilestones'''), '23514');
select pg_temp.expect_error(pg_temp.template('1', 'null, null, null', '''{"title":"x"}''', name => '''MilestonesNotArray'''), '23514');
select pg_temp.expect_error(pg_temp.template('1', 'null, null, null', '''[]''', name => '''NoMilestones'''), '23514');
select pg_temp.expect_error(pg_temp.template('1', 'null, null, null', quote_literal((select jsonb_agg(jsonb_build_object('title', 'm', 'percentOfAllocation', 5)) from generate_series(1, 21))::text), name => '''TooManyMilestones'''), '23514');
select pg_temp.expect_error(pg_temp.template('0', '60, 1, 4', 'null', allocation => '''0''', name => '''ZeroAllocation'''), '23514');
select pg_temp.expect_error(pg_temp.template('0', '60, 1, 4', 'null', allocation => '''0.000''', name => '''ZeroDecimalAllocation'''), '23514');
select pg_temp.expect_error(pg_temp.template('0', '60, 1, 4', 'null', allocation => '''12abc''', name => '''BadAllocation'''), '23514');
select pg_temp.expect_error(pg_temp.template('0', '60, 1, 4', 'null', reviewer => '''00000000-0000-4000-8000-0000000000a2''', name => '''TimeWithReviewer'''), '23514');
select pg_temp.expect_error(pg_temp.template('0', '60, 1, 4', 'null', name => ''' Padded '''), '23514');
select pg_temp.expect_error(pg_temp.template('0', '60, 1, 4', 'null', name => quote_literal(repeat('n', 81))), '23514');

select pg_temp.expect_error(
  $sql$update public.organization_templates set version = 0 where name = 'Time'$sql$,
  '23514'
);
select pg_temp.expect_error(
  $sql$update public.organization_templates set updated_by_wallet = '0x000000000000000000000000000000000000000A' where name = 'Time'$sql$,
  '23514'
);

-- 3. Organization isolation: a reviewer default from another organization is
--    rejected by the composite foreign key (foreign_key_violation).
select pg_temp.expect_error(
  pg_temp.template('1', 'null, null, null', '''[{"title":"x","percentOfAllocation":100}]''', reviewer => '''00000000-0000-4000-8000-0000000000b2''', name => '''CrossOrgReviewer'''),
  '23503'
);

-- 4. Active names are unique per organization, case-insensitively; archiving
--    frees the name, and another organization may reuse it.
select pg_temp.expect_error(pg_temp.template('0', '60, 1, 4', 'null', name => '''time'''), '23505');

update public.organization_templates set archived_at = now() where name = 'Time';
do $$ begin execute pg_temp.template('0', '60, 1, 4', 'null', name => '''time'''); end $$;

insert into public.organization_templates (organization_id, name, strategy, schedule_unit_seconds, cliff_units, duration_units, created_by_wallet, updated_by_wallet)
values ('00000000-0000-4000-8000-00000000000b', 'Hybrid', 0, 60, 1, 4, '0x000000000000000000000000000000000000000b', '0x000000000000000000000000000000000000000b');

-- 5. Removing the reviewer member clears only the default.
delete from public.organization_members where id = '00000000-0000-4000-8000-0000000000a2';

do $$ begin
  if exists (
    select 1 from public.organization_templates
    where default_reviewer_member_id is not null
  ) then
    raise exception 'removing a member must clear every reviewer default';
  end if;
  if (select organization_id from public.organization_templates where name = 'Milestone')
      <> '00000000-0000-4000-8000-00000000000a' then
    raise exception 'clearing the reviewer default must not touch organization_id';
  end if;
end $$;

-- 6. Deleting an organization removes its templates and nobody else's.
delete from public.organizations where id = '00000000-0000-4000-8000-00000000000a';

do $$ begin
  if exists (
    select 1 from public.organization_templates
    where organization_id = '00000000-0000-4000-8000-00000000000a'
  ) then
    raise exception 'organization delete must cascade to its templates';
  end if;
  if (select count(*) from public.organization_templates
      where organization_id = '00000000-0000-4000-8000-00000000000b') <> 1 then
    raise exception 'organization delete must not touch other organizations';
  end if;
end $$;

-- 7. Security posture: RLS on, no privileges for browser-facing roles, no policies.
do $$ begin
  if not (select relrowsecurity from pg_class where oid = 'public.organization_templates'::regclass) then
    raise exception 'row level security must be enabled';
  end if;
  if has_table_privilege('anon', 'public.organization_templates', 'select, insert, update, delete')
     or has_table_privilege('authenticated', 'public.organization_templates', 'select, insert, update, delete') then
    raise exception 'anon and authenticated must have no table privileges';
  end if;
  if exists (select 1 from pg_policies where tablename = 'organization_templates') then
    raise exception 'organization_templates must define no RLS policies';
  end if;
end $$;

rollback;

\echo 'organization_templates verification passed'
