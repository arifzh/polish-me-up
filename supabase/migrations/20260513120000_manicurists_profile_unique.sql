-- Migration: 20260513120000 - Ensure each profile maps to at most one manicurists row.
--
-- The availability page auto-creates a manicurists row for a manicurist
-- profile on first visit. Without a unique constraint a quick double-tap
-- (or a race against the customer flow's own bootstrap) could insert two
-- rows. This pins it at the database level.

alter table public.manicurists
  add constraint manicurists_profile_id_unique unique (profile_id);
