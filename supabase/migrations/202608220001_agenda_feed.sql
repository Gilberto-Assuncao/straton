-- Subscribing to your own week from a phone calendar (#49, passo 2).
--
-- The decision this table encodes is in the issue: a calendar feed is a
-- convenience, never the channel a schedule *change* travels on. Google refreshes
-- a subscribed URL on its own cadence — hours in practice — so a shift moved at
-- 6am does not arrive in time. The in-app notification built in passo 1 is the
-- urgent channel; this is "my week is on my phone".
--
-- The URL is a credential. Anyone holding it reads that worker's schedule, with
-- no login, until it is revoked — a calendar client cannot present a session, so
-- there is nothing else it could be. It is therefore handled exactly like the
-- company invite token in 202608030003: 32 random bytes, only the SHA-256 digest
-- stored, and a mismatch indistinguishable from a revoked one.

create table if not exists public.agenda_feeds (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  /** Whose agenda this publishes. One membership, one company — not one user. */
  company_membership_id uuid not null references public.company_memberships (id) on delete cascade,
  /** Hex SHA-256 of the token in the URL. The token itself exists only in that URL. */
  token_digest text not null unique,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  /**
   * When a calendar client last read it.
   *
   * Not telemetry: it is the only thing that makes a leaked URL visible to the
   * person it belongs to. "Last read 4 minutes ago" while their phone is in
   * their pocket is the signal, and there is nothing else that would show it.
   */
  last_fetched_at timestamptz
);

-- One live feed per membership. A worker who regenerates gets a new row only
-- after the old one is revoked, so an old URL can never quietly keep working
-- alongside its replacement.
create unique index if not exists agenda_feeds_one_live_per_membership
  on public.agenda_feeds (company_membership_id) where revoked_at is null;

alter table public.agenda_feeds enable row level security;

-- Explicit, not inherited from Supabase's default privileges — see the note in
-- 202608010004 and the sweep in tests/rls/grants.test.ts.
grant select, insert, update on public.agenda_feeds to authenticated;
grant select, insert, update on public.agenda_feeds to service_role;

/**
 * Your own feed, and nobody else's — not even your supervisor's.
 *
 * A manager can already see the whole company's agenda in the app; what they
 * must not have is a standing, login-free URL to a colleague's movements. So
 * these policies are by membership owner only, with no role escape hatch.
 */
drop policy if exists agenda_feeds_read on public.agenda_feeds;
create policy agenda_feeds_read on public.agenda_feeds
for select to authenticated
using (
  company_membership_id in (
    select m.id from public.company_memberships m where m.user_id = (select auth.uid())
  )
);

drop policy if exists agenda_feeds_create on public.agenda_feeds;
create policy agenda_feeds_create on public.agenda_feeds
for insert to authenticated
with check (
  company_membership_id in (
    select m.id from public.company_memberships m
    where m.user_id = (select auth.uid()) and m.company_id = agenda_feeds.company_id
  )
);

-- Revoking is an update, which is why there is no delete grant: a revoked row
-- keeps the digest, so a URL that leaked cannot be resurrected by an insert
-- that happens to land on the same random bytes, and the fact that it existed
-- stays on the record.
drop policy if exists agenda_feeds_revoke on public.agenda_feeds;
create policy agenda_feeds_revoke on public.agenda_feeds
for update to authenticated
using (
  company_membership_id in (
    select m.id from public.company_memberships m where m.user_id = (select auth.uid())
  )
)
with check (
  company_membership_id in (
    select m.id from public.company_memberships m where m.user_id = (select auth.uid())
  )
);

/**
 * The feed itself: what a calendar client is allowed to know.
 *
 * Deliberately thin. Title, hours, and where to go — no instructions and no
 * notes, because those are written for people inside the platform and can carry
 * a client's access code or a remark about a colleague. Once they are in a
 * Google calendar they are outside Belgium's borders and outside our control,
 * and the person who typed them never agreed to that.
 *
 * Returns nothing at all for a token that is wrong or revoked. The two are
 * indistinguishable from outside, so guessing tells an attacker nothing.
 *
 * `security definer` because the caller has no session — a calendar client
 * cannot log in. Granted to `service_role` alone and never to `anon`: the app's
 * route is the only caller, which leaves no public endpoint to grind tokens
 * against.
 */
create or replace function public.agenda_feed_events(
  p_token text,
  p_from timestamptz,
  p_until timestamptz
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_feed_id uuid;
  v_membership_id uuid;
  v_worker text;
  v_events jsonb;
begin
  select f.id, f.company_membership_id into v_feed_id, v_membership_id
  from public.agenda_feeds f
  where f.token_digest = encode(sha256(p_token::bytea), 'hex')
    and f.revoked_at is null;

  -- NULL, not an empty object. A worker with nothing booked and a stranger with
  -- a guessed token would otherwise be the same answer, and the route has to be
  -- able to tell them apart: one is an empty calendar, the other is a 404.
  if v_feed_id is null then
    return null;
  end if;

  -- Written before the rows are gathered, so a read that fails halfway still
  -- leaves the trace. This is the whole reason the function is volatile.
  update public.agenda_feeds set last_fetched_at = now() where id = v_feed_id;

  select u.name into v_worker
  from public.company_memberships m
  join public.users u on u.id = m.user_id
  where m.id = v_membership_id;

  select coalesce(jsonb_agg(to_jsonb(feed_event) order by feed_event.starts_at), '[]'::jsonb)
  into v_events
  from (
    select a.id as assignment_id, a.title, a.starts_at, a.ends_at, a.status,
           s.name as site_name, s.address as site_address, a.updated_at
    from public.assignment_assignees aa
    join public.assignments a on a.id = aa.assignment_id
    left join public.sites s on s.id = a.site_id
    where aa.company_membership_id = v_membership_id
      and a.starts_at >= p_from
      and a.starts_at < p_until
  ) as feed_event;

  return jsonb_build_object('worker_name', v_worker, 'events', v_events);
end;
$$;

revoke all on function public.agenda_feed_events(text, timestamptz, timestamptz) from public;
revoke all on function public.agenda_feed_events(text, timestamptz, timestamptz) from anon;
revoke all on function public.agenda_feed_events(text, timestamptz, timestamptz) from authenticated;
grant execute on function public.agenda_feed_events(text, timestamptz, timestamptz) to service_role;
