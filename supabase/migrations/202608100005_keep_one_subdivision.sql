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
 * A *deferred constraint trigger*, not a `before delete` one, and the reason
 * is `on delete cascade`. Deleting a location deletes its subdivisions, and a
 * row-by-row guard would have to work out whether it is looking at that case
 * or at somebody emptying a location that is staying — which means depending
 * on whether the parent row is already invisible to a referential-integrity
 * trigger's snapshot. That is a true fact about Postgres to bet an invariant
 * on, and the wrong bet fails closed: deleting a work location would start
 * raising "must keep at least one subdivision", which reads like nonsense.
 *
 * Deferring to commit removes the question. At commit the location is either
 * gone — nothing to protect, no error — or still there, in which case it must
 * have kept a subdivision. Intermediate states are allowed, so replacing the
 * only subdivision in one transaction still works.
 */
create or replace function private.assert_site_keeps_a_subdivision()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.sites where id = old.site_id)
     and not exists (select 1 from public.site_areas where site_id = old.site_id) then
    raise exception 'A work location has to keep at least one subdivision.'
      using errcode = 'restrict_violation';
  end if;
  return null;
end;
$$;

comment on function private.assert_site_keeps_a_subdivision() is
  'Deferred to commit so `on delete cascade` from sites is not mistaken for emptying a location that is staying (#77).';

drop trigger if exists site_keeps_a_subdivision on public.site_areas;
create constraint trigger site_keeps_a_subdivision
  after delete on public.site_areas
  deferrable initially deferred
  for each row execute function private.assert_site_keeps_a_subdivision();
