-- Swapping a shift with a colleague (#25).
--
-- Section 8 of docs/02-architecture/SCHEDULING_AND_DELEGATION.md: "the worker
-- proposes swapping an assignment with a colleague, subject to the
-- supervisor's approval".
--
-- This needs a state of its own rather than a column on the assignment. While
-- a swap is being decided the assignment has not changed status — it is still
-- sent, or accepted, or in progress. What may change is *who*, and only if the
-- swap is approved. Modelling it as an assignment status would make a pending
-- swap look like a pending job.
--
-- Two approvals in series, in this order:
--
--   proposed          the worker asked a named colleague
--   accepted_by_peer  the colleague agreed to take it
--   approved          the supervisor confirmed, and the assignment moves
--
-- The colleague goes first on purpose. Without that, anyone could hand their
-- Saturday to someone who never agreed to it, and the supervisor would be
-- approving a transfer that one side knows nothing about.

create table if not exists public.assignment_swaps (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  assignment_id uuid not null references public.assignments (id) on delete cascade,

  /** Who is giving the shift away. Must currently be on the assignment. */
  from_membership_id uuid not null references public.company_memberships (id) on delete cascade,
  /** Who is being asked to take it. */
  to_membership_id uuid not null references public.company_memberships (id) on delete cascade,

  status text not null default 'proposed'
    check (status in ('proposed', 'accepted_by_peer', 'approved', 'rejected', 'cancelled')),
  reason text,

  created_at timestamptz not null default now(),
  peer_responded_at timestamptz,
  decided_at timestamptz,
  decided_by uuid references public.users (id) on delete set null,

  constraint assignment_swaps_not_self check (from_membership_id <> to_membership_id)
);

-- One live proposal per assignment. Two open swaps on the same shift would let
-- both be approved and the second silently overwrite the first.
create unique index if not exists assignment_swaps_one_open
  on public.assignment_swaps (assignment_id)
  where status in ('proposed', 'accepted_by_peer');

create index if not exists assignment_swaps_to_idx on public.assignment_swaps (to_membership_id, status);
create index if not exists assignment_swaps_company_idx on public.assignment_swaps (company_id, status);

alter table public.assignment_swaps enable row level security;

-- Explicit, not inherited from Supabase's default privileges — see the note in
-- 202608010004 and the sweep in tests/rls/grants.test.ts.
grant select, insert, update, delete on public.assignment_swaps to authenticated;
grant select, insert, update, delete on public.assignment_swaps to service_role;

create or replace function private.owns_membership_row(p_membership_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists(
    select 1 from public.company_memberships cm
    where cm.id = p_membership_id and cm.user_id = (select auth.uid())
  )
$$;

/**
 * Readable by the company.
 *
 * A swap is a change to the schedule, and the schedule is not secret — the same
 * reasoning as assignments. What is restricted is who may *act*, below.
 */
drop policy if exists assignment_swaps_read on public.assignment_swaps;
create policy assignment_swaps_read on public.assignment_swaps
for select to authenticated
using ((select private.is_company_member(company_id)));

/**
 * Only the person giving the shift away may propose, and only for a shift they
 * are actually on. Without the second half, anyone could propose a swap for
 * work that was never theirs.
 */
drop policy if exists assignment_swaps_propose on public.assignment_swaps;
create policy assignment_swaps_propose on public.assignment_swaps
for insert to authenticated
with check (
  (select private.is_company_member(company_id))
  and (select private.owns_membership_row(from_membership_id))
  -- Table-qualified, and that is not cosmetic. Written as bare
  -- `aa.assignment_id = assignment_id`, the right-hand side resolves to `aa`'s
  -- own column rather than the row being inserted, and the comparison becomes a
  -- tautology: anyone could propose a swap for a shift that was never theirs.
  -- Verified by a negative control, which caught it. This is the same
  -- shadowing bug as migration 202608010001 — the second time in one codebase.
  and exists (
    select 1 from public.assignment_assignees aa
    where aa.assignment_id = assignment_swaps.assignment_id
      and aa.company_membership_id = assignment_swaps.from_membership_id
  )
);

-- Who may make which transition is settled by the trigger: a WITH CHECK cannot
-- see the previous row, so it cannot tell accepting apart from approving.
drop policy if exists assignment_swaps_update on public.assignment_swaps;
create policy assignment_swaps_update on public.assignment_swaps
for update to authenticated
using ((select private.is_company_member(company_id)))
with check ((select private.is_company_member(company_id)));

/**
 * The state machine, and the swap itself.
 *
 * On approval this rewrites assignment_assignees — the one moment the crew of a
 * scheduled job changes after the fact. It is done here, in the same statement
 * as the approval, so the two can never disagree: an approved swap whose
 * assignee never moved would be worse than a refused one.
 */
create or replace function public.enforce_assignment_swap()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_is_peer boolean := public.company_membership_exists(old.company_id)
    and private.owns_membership_row(old.to_membership_id);
  actor_is_proposer boolean := private.owns_membership_row(old.from_membership_id);
  actor_is_supervisor boolean := private.has_company_role(
    old.company_id, array['owner', 'admin', 'administrator', 'manager', 'supervisor']
  );
begin
  if new.assignment_id <> old.assignment_id
     or new.from_membership_id <> old.from_membership_id
     or new.to_membership_id <> old.to_membership_id then
    raise exception 'A swap cannot be re-pointed at another shift or person';
  end if;

  if new.status is distinct from old.status then
    if new.status = 'accepted_by_peer' then
      if not actor_is_peer then
        raise exception 'Only the colleague being asked can accept a swap';
      end if;
      if old.status <> 'proposed' then
        raise exception 'This swap has already been answered';
      end if;
      new.peer_responded_at := now();

    elsif new.status = 'approved' then
      if not actor_is_supervisor then
        raise exception 'Only a supervisor can approve a swap';
      end if;
      -- The colleague has to have said yes first. Approving a swap nobody
      -- agreed to is how someone finds out on the day.
      if old.status <> 'accepted_by_peer' then
        raise exception 'The colleague has not accepted this swap yet';
      end if;
      new.decided_at := now();
      new.decided_by := (select auth.uid());

      update public.assignment_assignees
      set company_membership_id = old.to_membership_id
      where assignment_id = old.assignment_id
        and company_membership_id = old.from_membership_id;

    elsif new.status = 'rejected' then
      -- Either side can say no: the colleague declining, or the supervisor
      -- refusing after they agreed.
      if not (actor_is_peer or actor_is_supervisor) then
        raise exception 'Only the colleague or a supervisor can reject a swap';
      end if;
      new.decided_at := now();
      new.decided_by := (select auth.uid());

    elsif new.status = 'cancelled' then
      if not actor_is_proposer then
        raise exception 'Only the person who proposed the swap can cancel it';
      end if;
      if old.status not in ('proposed', 'accepted_by_peer') then
        raise exception 'This swap has already been decided';
      end if;
      new.decided_at := now();

    else
      raise exception 'A swap cannot return to %', new.status;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_assignment_swap on public.assignment_swaps;
create trigger enforce_assignment_swap
before update on public.assignment_swaps
for each row execute function public.enforce_assignment_swap();
