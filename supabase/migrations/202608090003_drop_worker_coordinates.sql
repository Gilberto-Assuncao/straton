-- Stop recording where workers physically are (#61).
--
-- The instruction was: address, manual marker, never coordinates. The code did
-- the opposite. `TimeTracker` called `navigator.geolocation` on Start and both
-- clock-in actions wrote `start_latitude` / `start_longitude`; 298 of the 299
-- entries in the database carried a position. They came from the seed, but the
-- collection path was live — the first real clock-in from anyone with the
-- consent toggle on would have recorded that person's position to the metre.
--
-- A coordinate does not say "at the Le Parc site". It says where this person
-- was, at that minute. Clock in from home, from a café, from a doctor's waiting
-- room, and it is on the record. Since #55 the app already has the answer the
-- company actually needs — `site_id`, pre-filled from the agenda — which says
-- which chantier the hours belong to and nothing else.
--
-- There is a legal edge too: employee location is sensitive under the GDPR, and
-- consent from a worker to their employer is weak as a lawful basis, because
-- the relationship is not between equals.
--
-- Dropped rather than left unused. A column that still exists is a column
-- something will start filling again, and the data is worth less than the
-- liability of holding it.

alter table public.timesheet_entries
  drop column if exists start_latitude,
  drop column if exists start_longitude;

-- The consent toggle governed exactly one thing, which no longer happens.
-- Keeping a switch labelled "share my location" would be a straightforward lie
-- about what the product does.
alter table public.user_settings
  drop column if exists location_consent,
  drop column if exists location_consent_at;

-- Site coordinates stay. They are the company's own record of where a chantier
-- is — entered once, alongside its address — and they are what the live map is
-- built on now: a pin per site with the number of people clocked in there.
