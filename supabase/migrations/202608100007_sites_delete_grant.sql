-- Deleting a work location was refused by the grant, not the policy (#77)
--
-- #84 added the delete policy `sites` never had, and stopped there. A policy
-- decides *which rows* a role may touch; a grant decides whether the role may
-- issue the statement at all — and `authenticated` has only ever had
-- `select, insert, update` on this table (202607210003). So Postgres refused
-- with "permission denied for table sites" before RLS was ever consulted, and
-- deleting a work location has never worked, in any environment, since the
-- feature existed.
--
-- This project has now found the missing half of a delete four times, always
-- the same way: written for select, insert and update, and forgotten for
-- delete. #84 found it in the policies. This is the layer underneath, and it
-- was invisible from there — a policy added to a table with no grant reads
-- like a working feature and behaves like a locked door.
--
-- Caught by CI on this branch, and only because a test tried to delete a
-- location. Nothing else in the product does yet.

grant delete on table public.sites to authenticated;
