-- Inviting a company that has no STRATON account yet (#20).
--
-- The partners panel links two companies that are both already here. The
-- typical Belgian subcontractor is not: they have a VAT number, a phone, and no
-- software. Without this, the invite feature built for #33 works in a demo and
-- stops at the first real customer.
--
-- The token is never stored. Only its SHA-256 digest is, so a copy of this
-- table is not a set of working invitations — the same reason a password table
-- holds hashes. `sha256()` is built into Postgres 11+, so this needs no
-- extension. Comparison is on the digest, which is fixed-length and has no
-- early-exit shortcut worth worrying about here.

create table if not exists public.company_invites (
  id uuid primary key default gen_random_uuid(),
  /** Hex SHA-256 of the token that was emailed. The token itself lives only in that email. */
  token_digest text not null unique,
  source_company_id uuid not null references public.companies (id) on delete cascade,
  relationship_type public.relationship_type not null,

  -- What the inviter already knows about them, usually straight from the CBE
  -- lookup. Prefilling the acceptance form matters: a subcontractor who has to
  -- retype their own VAT number to accept an invitation often just does not.
  company_name text not null,
  registration_number text,
  vat_number text,
  city text,
  postal_code text,
  invited_email text not null,
  note text,

  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked')),
  expires_at timestamptz not null,
  created_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  accepted_company_id uuid references public.companies (id) on delete set null,

  constraint company_invites_email_shape check (invited_email like '%@%.%')
);

create index if not exists company_invites_source_idx on public.company_invites (source_company_id, status);

alter table public.company_invites enable row level security;

grant select, insert, update, delete on public.company_invites to authenticated;
grant select, insert, update, delete on public.company_invites to service_role;

-- Only the company that sent it can see or manage it. The *invitee* never
-- reads this table directly — they hold a token, and the two functions below
-- are the only way that token turns into anything.
drop policy if exists company_invites_read on public.company_invites;
create policy company_invites_read on public.company_invites
for select to authenticated
using ((select private.is_company_member(source_company_id)));

drop policy if exists company_invites_write on public.company_invites;
create policy company_invites_write on public.company_invites
for insert to authenticated
with check (
  (select private.has_company_role(source_company_id, array['owner', 'admin', 'administrator', 'manager']))
);

drop policy if exists company_invites_update on public.company_invites;
create policy company_invites_update on public.company_invites
for update to authenticated
using ((select private.has_company_role(source_company_id, array['owner', 'admin', 'administrator', 'manager'])))
with check ((select private.has_company_role(source_company_id, array['owner', 'admin', 'administrator', 'manager'])));

/**
 * What the invitee is shown before they accept.
 *
 * Deliberately thin: who invited them, under what relationship, and the company
 * details already filled in on their behalf. No ids, nothing about the
 * inviter's projects or people. A valid token is a lead someone gave out, not
 * a session.
 *
 * Returns nothing at all for a token that is wrong, spent or expired — the
 * three cases are indistinguishable from outside, so a guessed token cannot be
 * told apart from an expired one.
 */
create or replace function public.company_invite_preview(p_token text)
returns table (
  inviter_name text,
  relationship_type text,
  company_name text,
  registration_number text,
  vat_number text,
  city text,
  postal_code text,
  invited_email text,
  note text
)
language sql
stable
security definer
set search_path = ''
as $$
  select c.name, i.relationship_type::text, i.company_name, i.registration_number,
         i.vat_number, i.city, i.postal_code, i.invited_email, i.note
  from public.company_invites i
  join public.companies c on c.id = i.source_company_id
  where i.token_digest = encode(sha256(p_token::bytea), 'hex')
    and i.status = 'pending'
    and i.expires_at > now()
$$;

/**
 * Turns an accepted invitation into a company, its first owner, and the link
 * back to whoever invited them — in one transaction, because a company with no
 * owner or a relationship pointing at nothing are both worse than a failure.
 *
 * The relationship goes straight to 'active'. Accepting *is* the consent; there
 * is no second confirmation to wait for, and one would only ever be answered by
 * the same person who just clicked accept.
 */
create or replace function public.accept_company_invite(
  p_token text,
  p_company_name text default null,
  p_registration_number text default null,
  p_vat_number text default null,
  p_address_line_1 text default null,
  p_postal_code text default null,
  p_city text default null,
  p_job_title text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  invite public.company_invites%rowtype;
  new_company_id uuid;
  final_name text;
  slug_base text;
  slug_value text;
  owner_role_id uuid;
  membership_id uuid;
begin
  if actor_id is null then
    raise exception 'Authentication required';
  end if;

  -- `for update` so two clicks on the same link cannot both get through and
  -- create two companies from one invitation.
  select * into invite from public.company_invites
  where token_digest = encode(sha256(p_token::bytea), 'hex')
    and status = 'pending'
    and expires_at > now()
  for update;

  if invite.id is null then
    raise exception 'This invitation is not valid, has already been used, or has expired';
  end if;

  final_name := nullif(trim(coalesce(p_company_name, '')), '');
  if final_name is null then
    final_name := invite.company_name;
  end if;
  if char_length(final_name) not between 2 and 160 then
    raise exception 'Invalid company name';
  end if;

  slug_base := trim(both '-' from lower(regexp_replace(final_name, '[^a-zA-Z0-9]+', '-', 'g')));
  if slug_base = '' then
    raise exception 'Invalid company name';
  end if;
  slug_value := slug_base;
  if exists(select 1 from public.companies where slug = slug_value) then
    slug_value := slug_base || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
  end if;

  insert into public.companies (
    name, legal_name, display_name, slug, registration_number, vat_number, vat,
    country_code, country, default_language, timezone, currency,
    address_line_1, postal_code, city, email, status
  ) values (
    final_name, final_name, final_name, slug_value,
    nullif(trim(coalesce(p_registration_number, invite.registration_number, '')), ''),
    nullif(trim(coalesce(p_vat_number, invite.vat_number, '')), ''),
    nullif(trim(coalesce(p_vat_number, invite.vat_number, '')), ''),
    'BE', 'BE', 'en', 'Europe/Brussels', 'EUR',
    nullif(trim(coalesce(p_address_line_1, '')), ''),
    nullif(trim(coalesce(p_postal_code, invite.postal_code, '')), ''),
    nullif(trim(coalesce(p_city, invite.city, '')), ''),
    invite.invited_email,
    'active'
  ) returning id into new_company_id;

  insert into public.company_memberships (company_id, user_id, job_title, status, joined_at)
  values (new_company_id, actor_id, nullif(trim(coalesce(p_job_title, '')), ''), 'active', now())
  returning id into membership_id;

  select id into owner_role_id from public.roles where key = 'owner';
  if owner_role_id is null then
    raise exception 'The owner role is missing';
  end if;
  insert into public.membership_roles (membership_id, role_id) values (membership_id, owner_role_id);

  insert into public.company_relationships (source_company_id, target_company_id, relationship_type, status)
  values (invite.source_company_id, new_company_id, invite.relationship_type, 'active')
  on conflict (source_company_id, target_company_id) do nothing;

  update public.company_invites
  set status = 'accepted', accepted_at = now(), accepted_company_id = new_company_id
  where id = invite.id;

  return new_company_id;
end;
$$;

-- Both are reachable without a company of your own — that is the point, since
-- the invitee has none yet. What they are *not* reachable without is the token.
revoke all on function public.company_invite_preview(text) from public;
revoke all on function public.accept_company_invite(text, text, text, text, text, text, text, text) from public;
grant execute on function public.company_invite_preview(text) to authenticated;
grant execute on function public.accept_company_invite(text, text, text, text, text, text, text, text) to authenticated;
