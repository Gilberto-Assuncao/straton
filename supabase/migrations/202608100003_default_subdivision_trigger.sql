-- Every new work location gets its subdivision too (#77)
--
-- Caught by the first end-to-end test ever written for this project, on its
-- first run. The previous migration backfilled a default subdivision for every
-- location that already existed and did nothing for the ones created
-- afterwards — so the promise "every location always has at least one" held for
-- exactly as long as nobody used the form.
--
-- Nothing on screen would have said so. The location saves, the page redirects,
-- and the gap only shows up later as a report that groups by nothing.
--
-- A trigger rather than application code: locations are created by the form, by
-- the seed, by migrations and by tests, and an invariant maintained in one
-- caller is an invariant that holds in one caller.

/**
 * Marks the subdivision that exists because every location needs one.
 *
 * Needed because the *name* cannot carry that meaning. The product speaks ten
 * languages and a row reading "Todo o local" is Portuguese in a German
 * company's database — the previous migration's backfill got this wrong. With a
 * flag, the screen can print "Whole location" in the reader's language, and the
 * name is free to be whatever the manager renames it to.
 */
alter table public.site_areas
  add column if not exists is_default boolean not null default false;

comment on column public.site_areas.is_default is
  'The subdivision created automatically with the location. Displayed with a translated label rather than its stored name, which is why the flag exists and the name does not encode it.';

-- The rows the backfill created, retro-marked so old and new locations behave
-- the same. Matching on the literal it used, and only where it is the only one.
update public.site_areas a
set is_default = true
where a.name = 'Todo o local'
  and not exists (select 1 from public.site_areas b where b.site_id = a.site_id and b.id <> a.id);

create or replace function private.create_default_site_area()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- `on conflict do nothing` guards the unique (site_id, name): a location
  -- created by a migration that also inserts its own subdivision must not fail
  -- on the second one.
  insert into public.site_areas (company_id, site_id, name, sort_order, is_default)
  values (new.company_id, new.id, new.name, 0, true)
  on conflict (site_id, name) do nothing;
  return new;
end;
$$;

drop trigger if exists create_default_site_area on public.sites;
create trigger create_default_site_area
  after insert on public.sites
  for each row execute function private.create_default_site_area();
