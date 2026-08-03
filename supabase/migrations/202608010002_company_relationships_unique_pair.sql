-- One relationship row per ordered company pair.
--
-- There was no unique constraint, which meant two things were quietly broken:
--
--   * create_client_company's `on conflict do nothing` had no conflict target,
--     so adding the same client twice inserted a second relationship row.
--     Caught in testing: two calls produced one company but two links.
--
--   * the 23505 branch in requestPartnershipAction ("A relationship with this
--     company already exists") was unreachable — the duplicate insert simply
--     succeeded.
--
-- Verified no duplicates existed before adding the index.
create unique index if not exists company_relationships_pair_unique
  on public.company_relationships (source_company_id, target_company_id);

-- With a conflict target available, create_client_company now names it, so an
-- existing link keeps its type and status instead of being silently rewritten
-- by whoever adds the client next. Full function body re-applied in migration
-- 202608010001; only the on-conflict clause changed:
--
--   on conflict (source_company_id, target_company_id) do nothing
