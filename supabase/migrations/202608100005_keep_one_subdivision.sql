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
 * The whole difficulty is `on delete cascade`: deleting a location is supposed
 * to take its subdivisions with it, and this guard has to tell that apart from
 * somebody emptying a location that is staying.
 *
 * The first attempt asked the question by looking: a constraint trigger
 * deferred to commit, checking whether the location was still there. The
 * reasoning was that at commit the parent is either gone — nothing to protect
 * — or still present. It is wrong, and the CI run on this branch is what said
 * so: a deferred trigger does not see the parent's deletion the way a fresh
 * statement would, so the cascade looked exactly like somebody emptying a
 * location, and deleting a work location started refusing itself with a
 * message about subdivisions. Precisely the failing-closed the first version
 * of this comment predicted and then walked into.
 *
 * So the question is asked directly instead of inferred. `pg_trigger_depth()`
 * is 1 when a statement deleted this row itself, and 2 or more when the delete
 * was issued from inside another trigger — which is what a cascade is, since
 * referential integrity is implemented as a trigger on `sites`. No snapshot
 * semantics involved, and both directions are covered by tests rather than by
 * confidence.
 *
 * The cost of going immediate: emptying a location and refilling it inside one
 * transaction is now refused, where the deferred version would have allowed it.
 * Nothing does that — the screen adds and removes one subdivision at a time —
 * and an invariant that holds at every moment is worth more than one that holds
 * only at the end and cannot be trusted to fire correctly.
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
  'Refuses to leave a location with no subdivisions (#77). Tells a cascade from `sites` apart from a direct delete with pg_trigger_depth(), rather than by looking for the parent row — a deferred version that did the latter refused to let a work location be deleted at all.';

drop trigger if exists site_keeps_a_subdivision on public.site_areas;
create trigger site_keeps_a_subdivision
  before delete on public.site_areas
  for each row execute function private.assert_site_keeps_a_subdivision();
