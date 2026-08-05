-- Worker availability (#24).
--
-- Section 8 of docs/02-architecture/SCHEDULING_AND_DELEGATION.md calls this the
-- most serious gap in the scheduling design, and says to close it *before* the
-- agenda rather than after: without it, scheduling is guessing, and retrofitting
-- the checks means reworking screens already built.
--
-- Two kinds, because they answer different questions:
--
--   unavailable  the default is that people work; this is the exception
--                (holiday, sick, training, personal)
--   available    the default is that they do not; this is a casual or
--                temporary worker declaring when they can be called
--
-- When the two collide for the same person at the same moment, **unavailable
-- wins**. Someone who declared Friday mornings as workable and then went sick
-- is sick. Encoded once in private.availability_conflicts below, so no caller
-- has to rediscover the precedence.
--
-- Deliberately *not* here: approval. This records what is true about someone's
-- availability, not a request to be granted. Leave approval is a workflow with
-- its own states and notifications and belongs to the approvals module (#8);
-- folding it in here would make every absence wait on a decision before the
-- schedule could even see it.
--
-- Also not here: recurrence. "Never works Fridays" is not an exception, it is
-- the shape of someone's contract, and it belongs on employee_records. Modelling
-- it as a repeating exception turns every overlap question from a range query
-- into an expansion problem, for a case this table is the wrong home for.

create extension if not exists btree_gist with schema extensions;

create table if not exists public.worker_availability (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  company_membership_id uuid not null references public.company_memberships (id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  kind text not null check (kind in ('unavailable', 'available')),
  reason text check (reason in ('holiday', 'sick', 'training', 'personal', 'other')),
  note text,
  created_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint worker_availability_range check (ends_at > starts_at)
);

-- Two overlapping declarations of the *same* kind are not two facts, they are
-- one fact entered twice — and they would make any "is this person free?"
-- query return a different answer depending on which row it happened to read.
-- Opposite kinds may overlap; that is the collision the precedence rule exists
-- to settle.
alter table public.worker_availability
  drop constraint if exists worker_availability_no_overlap;
alter table public.worker_availability
  add constraint worker_availability_no_overlap
  exclude using gist (
    company_membership_id with =,
    kind with =,
    tstzrange(starts_at, ends_at) with &&
  );

create index if not exists worker_availability_company_window_idx
  on public.worker_availability (company_id, starts_at, ends_at);

alter table public.worker_availability enable row level security;

-- See the note in 202608010004: RLS decides which rows, a grant decides whether
-- the table is reachable at all. Left to Supabase's default privileges this
-- works on the hosted project and fails on any database built from these files.
grant select, insert, update, delete on public.worker_availability to authenticated;
grant select, insert, update, delete on public.worker_availability to service_role;

-- --- who may see and change it -------------------------------------------

-- Readable by the company. Scheduling is the whole point: a supervisor who
-- cannot see that someone is away will book them anyway. What is *not* exposed
-- is the note — that stays for the person and their managers, enforced in the
-- data layer rather than here, since RLS is per-row and not per-column.
drop policy if exists worker_availability_read on public.worker_availability;
create policy worker_availability_read on public.worker_availability
for select to authenticated
using ((select private.is_company_member(company_id)));

create or replace function private.owns_membership(p_membership_id uuid)
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

-- You declare your own; a manager records anyone's. Both are real: people book
-- their own holidays, and sick leave arrives by phone at 6am and gets entered
-- by whoever answered.
drop policy if exists worker_availability_write on public.worker_availability;
create policy worker_availability_write on public.worker_availability
for insert to authenticated
with check (
  (select private.is_company_member(company_id))
  and (
    (select private.owns_membership(company_membership_id))
    or (select private.has_company_role(company_id, array['owner', 'admin', 'administrator', 'manager']))
  )
);

drop policy if exists worker_availability_update on public.worker_availability;
create policy worker_availability_update on public.worker_availability
for update to authenticated
using (
  (select private.owns_membership(company_membership_id))
  or (select private.has_company_role(company_id, array['owner', 'admin', 'administrator', 'manager']))
)
with check (
  (select private.is_company_member(company_id))
  and (
    (select private.owns_membership(company_membership_id))
    or (select private.has_company_role(company_id, array['owner', 'admin', 'administrator', 'manager']))
  )
);

drop policy if exists worker_availability_delete on public.worker_availability;
create policy worker_availability_delete on public.worker_availability
for delete to authenticated
using (
  (select private.owns_membership(company_membership_id))
  or (select private.has_company_role(company_id, array['owner', 'admin', 'administrator', 'manager']))
);

-- --- the question the agenda will ask -------------------------------------

/**
 * Which of these people are not free in this window, and why.
 *
 * Lives in the database rather than in the app because it is the same question
 * asked from three places — the assignment form, the bulk scheduler, and any
 * later conflict report — and three implementations of a precedence rule is
 * three chances to disagree about who is actually away.
 */
create or replace function public.availability_conflicts(
  p_membership_ids uuid[],
  p_starts_at timestamptz,
  p_ends_at timestamptz
)
returns table (
  company_membership_id uuid,
  starts_at timestamptz,
  ends_at timestamptz,
  reason text
)
language sql
stable
security invoker
set search_path = ''
as $$
  select wa.company_membership_id, wa.starts_at, wa.ends_at, wa.reason
  from public.worker_availability wa
  where wa.company_membership_id = any(p_membership_ids)
    and wa.kind = 'unavailable'
    and tstzrange(wa.starts_at, wa.ends_at) && tstzrange(p_starts_at, p_ends_at)
  order by wa.starts_at
$$;

-- security invoker on purpose: the caller's own RLS decides which rows they may
-- see, so this cannot become a way to read another company's absences.

create or replace function public.touch_worker_availability()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists touch_worker_availability on public.worker_availability;
create trigger touch_worker_availability
before update on public.worker_availability
for each row execute function public.touch_worker_availability();
