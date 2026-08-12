-- A work location keeps at least one subdivision (#77)
--
-- The promise made by the previous two migrations is that every location
-- always has something to group a report by. A trigger creates the first one,
-- and until now nothing stopped anybody from deleting it again — which is the
-- half of an invariant that gets written second and forgotten, exactly like
-- the delete policies this project has now found missing four times.
--
-- It matters more since #84 than it looks: that migration added the delete
-- policy `sites` never had, so deleting things in this corner of the schema
-- has only just started working at all.

/**
 * Refuses to leave a location with no subdivisions.
 *
 * The difficulty is `on delete cascade`: deleting a location is supposed to
 * take its subdivisions with it, and this guard has to tell that apart from
 * somebody emptying a location that is staying.
 *
 * `pg_trigger_depth()` answers it directly. It is 1 when a statement deleted
 * this row itself, and 2 or more when the delete was issued from inside another
 * trigger — which is what a cascade is, since referential integrity is
 * implemented as a trigger on `sites`.
 *
 * A note on how this got here, because the history is misleading. The first
 * version was a constraint trigger deferred to commit, checking whether the
 * location still existed. When CI refused to delete a work location, that
 * design was blamed — the theory being that a deferred trigger cannot see the
 * parent's deletion — and it was rewritten. The theory was wrong. The real
 * cause was a missing `grant delete on sites` (202608100007), which refuses at
 * the privilege layer before any trigger runs, and the deferred version was
 * very likely fine.
 *
 * This version is kept anyway, and the reason is not that the other one was
 * proven broken: it is that its behaviour can be asserted directly, in both
 * directions, without resting on when a snapshot is taken — which is precisely
 * the kind of subtlety the wrong diagnosis above came from.
 *
 * The cost of being immediate: emptying a location and refilling it inside one
 * transaction is refused, where the deferred version would have allowed it.
 * Nothing does that — the screen adds and removes one subdivision at a time.
 */
create or replace function private.assert_site_keeps_a_subdivision()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Deeper than 1 means this delete came from another trigger: the cascade
  -- from `sites`. Deleting a location takes its subdivisions along, and that
  -- is not the case this guard exists for.
  if pg_trigger_depth() > 1 then
    return old;
  end if;

  -- `id <> old.id` because this runs *before* the row goes: without it the row
  -- being deleted would count itself as the survivor, and the guard would
  -- never fire at all.
  if not exists (
    select 1 from public.site_areas
    where site_id = old.site_id and id <> old.id
  ) then
    raise exception 'A work location has to keep at least one subdivision.'
      using errcode = 'restrict_violation';
  end if;

  return old;
end;
$$;

comment on function private.assert_site_keeps_a_subdivision() is
  'Refuses to leave a location with no subdivisions (#77). Tells a cascade from `sites` apart from a direct delete with pg_trigger_depth(), which is assertable in both directions without depending on when a snapshot is taken.';

drop trigger if exists site_keeps_a_subdivision on public.site_areas;
create trigger site_keeps_a_subdivision
  before delete on public.site_areas
  for each row execute function private.assert_site_keeps_a_subdivision();
